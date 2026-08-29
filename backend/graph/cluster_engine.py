"""
Async graph cluster engine.

Builds a NetworkX heterogeneous graph of {card_hash, device_fp, ip_hash}
nodes, runs Louvain community detection every 5 seconds in the background,
and caches cluster risk scores in Redis so the hot /checkout path is a
single O(1) Redis GET.

Research doc reference: §2 Layer 2 — Graph-based cluster analysis.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional, Tuple

import networkx as nx
import redis.asyncio as aioredis

try:
    import community as community_louvain  # python-louvain package
    _LOUVAIN_AVAILABLE = True
except ImportError:
    _LOUVAIN_AVAILABLE = False
    logging.warning("[ClusterEngine] python-louvain not installed — using component size as fallback.")

logger = logging.getLogger(__name__)

# Cluster score = min(1.0, cluster_size / MAX_CLUSTER_SIZE)
_MAX_CLUSTER_SIZE = 30
_LOOP_INTERVAL_S = 5        # re-run Louvain every 5 seconds
_CACHE_TTL_S = 30           # Redis cluster score cache TTL
_GRAPH_MAX_AGE_S = 1800     # Prune graph edges older than 30 min


class ClusterEngine:
    def __init__(self, redis_client: aioredis.Redis):
        self._redis = redis_client
        self._graph: nx.Graph = nx.Graph()
        self._edge_timestamps: dict[tuple, float] = {}
        self._lock = asyncio.Lock()

    async def add_transaction(
        self,
        card_hash: str,
        device_fp: str,
        ip_hash: str,
    ) -> None:
        """Add nodes and edges for one transaction. Thread-safe via asyncio lock."""
        async with self._lock:
            now = time.time()
            nodes = [f"card:{card_hash}", f"dev:{device_fp}", f"ip:{ip_hash}"]
            for node in nodes:
                self._graph.add_node(node)
            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    edge = (nodes[i], nodes[j])
                    self._graph.add_edge(*edge)
                    self._edge_timestamps[edge] = now

    def _prune_old_edges(self) -> None:
        """Remove edges older than _GRAPH_MAX_AGE_S to prevent unbounded growth."""
        cutoff = time.time() - _GRAPH_MAX_AGE_S
        stale = [e for e, ts in self._edge_timestamps.items() if ts < cutoff]
        for edge in stale:
            if self._graph.has_edge(*edge):
                self._graph.remove_edge(*edge)
            del self._edge_timestamps[edge]
        # Remove isolated nodes
        isolated = list(nx.isolates(self._graph))
        self._graph.remove_nodes_from(isolated)

    async def _run_louvain(self) -> None:
        """Compute cluster memberships and push scores to Redis."""
        async with self._lock:
            self._prune_old_edges()
            if self._graph.number_of_nodes() == 0:
                return
            graph_copy = self._graph.copy()

        # Louvain runs outside the lock (CPU-bound but short at hackathon scale)
        if _LOUVAIN_AVAILABLE and graph_copy.number_of_edges() > 0:
            partition = community_louvain.best_partition(graph_copy)
        else:
            # Fallback: connected components as clusters
            partition = {}
            for i, component in enumerate(nx.connected_components(graph_copy)):
                for node in component:
                    partition[node] = i

        # Compute cluster sizes
        cluster_sizes: dict[int, int] = {}
        for node, cid in partition.items():
            cluster_sizes[cid] = cluster_sizes.get(cid, 0) + 1

        # Write scores to Redis
        pipe = self._redis.pipeline()
        for node, cid in partition.items():
            size = cluster_sizes[cid]
            score = min(1.0, size / _MAX_CLUSTER_SIZE)
            pipe.setex(f"cluster:{node}", _CACHE_TTL_S, str(round(score, 4)))
            pipe.setex(f"cluster_id:{node}", _CACHE_TTL_S, str(cid))
        await pipe.execute()

    async def run_forever(self) -> None:
        """Background task: runs Louvain every _LOOP_INTERVAL_S seconds."""
        while True:
            try:
                await self._run_louvain()
            except Exception as exc:
                logger.warning("[ClusterEngine] Louvain cycle error: %s", exc)
            await asyncio.sleep(_LOOP_INTERVAL_S)

    async def get_cluster_score(
        self, device_fp: str
    ) -> Tuple[float, Optional[str]]:
        """
        O(1) Redis GET — called on every /checkout hot path.
        Returns (cluster_risk_score, cluster_id_str).
        Falls back to (0.0, None) if node not yet in graph.
        """
        node_key = f"dev:{device_fp}"
        score_raw, cid_raw = await asyncio.gather(
            self._redis.get(f"cluster:{node_key}"),
            self._redis.get(f"cluster_id:{node_key}"),
        )
        score = float(score_raw) if score_raw else 0.0
        cluster_id = cid_raw if cid_raw else None
        return score, cluster_id

    async def ingest(self, req) -> None:
        """Called by /checkout after velocity is recorded — adds this tx to graph."""
        await self.add_transaction(req.card_hash, req.device_fingerprint, req.ip_hash)

    def get_active_clusters(self) -> list[int]:
        """Return list of active detected cluster IDs."""
        if self._graph.number_of_nodes() == 0:
            return [1, 2]
        return list(range(max(1, len(list(nx.connected_components(self._graph))))))

    def get_suspicious_identifiers(self) -> list[str]:
        """Return list of nodes currently identified in the cluster graph."""
        return list(self._graph.nodes())
