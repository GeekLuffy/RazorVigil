"""
Temporal Dynamic Entity Graph Engine for RazorVigil Sentinel.

Constructs 5-minute rolling time-sliced graph snapshots (G_t0, G_t1, ...)
from synthetic and real transaction streams, capturing dynamic carding ring
formation, rapid PAN cycling bursts, and rotating proxy velocity over time.
"""

from __future__ import annotations

import time
from typing import Dict, List, Tuple, Any, Optional
from collections import defaultdict, deque
import numpy as np
import pandas as pd


class TemporalGraphEngine:
    """
    Manages rolling temporal entity graphs and dynamic graph metrics.
    
    Window: e.g. 300 seconds (5 minutes).
    Entities: Card, IP, Device, Address, Email.
    """

    def __init__(self, window_seconds: float = 300.0, long_window_seconds: float = 1800.0):
        self.window_sec = window_seconds
        self.long_window_sec = long_window_seconds
        
        # Slices: entity -> deque of (timestamp, other_entity)
        self.card_to_ips: Dict[str, deque] = defaultdict(deque)
        self.card_to_devices: Dict[str, deque] = defaultdict(deque)
        self.device_to_cards: Dict[str, deque] = defaultdict(deque)
        self.ip_to_cards: Dict[str, deque] = defaultdict(deque)
        self.community_history: Dict[str, deque] = defaultdict(deque)

    def _purge_old(self, d: deque, current_ts: float, max_age: float):
        while d and current_ts - d[0][0] > max_age:
            d.popleft()

    def process_transaction(
        self,
        timestamp: float,
        card_hash: str,
        ip: str,
        device_id: str,
        amount: float,
        community_id: Optional[str] = None,
    ) -> Dict[str, float]:
        """
        Ingests a transaction event, updates temporal state, and computes
        dynamic temporal graph metrics.
        """
        # Purge past window events
        self._purge_old(self.device_to_cards[device_id], timestamp, self.window_sec)
        self._purge_old(self.ip_to_cards[ip], timestamp, self.window_sec)
        self._purge_old(self.card_to_devices[card_hash], timestamp, self.window_sec)
        self._purge_old(self.card_to_ips[card_hash], timestamp, self.window_sec)

        # 1. Device-to-cards in last 5 min (Burst carding signal)
        dev_cards = set(c for _, c in self.device_to_cards[device_id])
        dev_card_burst = len(dev_cards)

        # 2. IP-to-cards in last 5 min (Distributed velocity proxy signal)
        ip_cards = set(c for _, c in self.ip_to_cards[ip])
        ip_card_burst = len(ip_cards)

        # 3. Temporal PAN rotation velocity (Cards added per minute on device)
        device_events_count = len(self.device_to_cards[device_id])
        degree_velocity_5m = device_events_count / (self.window_sec / 60.0)

        # 4. Long-window community expansion (over 30 min)
        if community_id:
            comm_key = str(community_id)
            self._purge_old(self.community_history[comm_key], timestamp, self.long_window_sec)
            comm_expansion_velocity = len(self.community_history[comm_key]) / (self.long_window_sec / 60.0)
            self.community_history[comm_key].append((timestamp, card_hash))
        else:
            comm_expansion_velocity = 0.0

        # Append current event
        self.device_to_cards[device_id].append((timestamp, card_hash))
        self.ip_to_cards[ip].append((timestamp, card_hash))
        self.card_to_devices[card_hash].append((timestamp, device_id))
        self.card_to_ips[card_hash].append((timestamp, ip))

        return {
            "temporal_device_card_burst_5m": float(dev_card_burst),
            "temporal_ip_card_burst_5m": float(ip_card_burst),
            "temporal_degree_velocity_per_min": float(degree_velocity_5m),
            "temporal_community_expansion_velocity": float(comm_expansion_velocity),
        }

    def compute_dataframe_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Batch processes a chronologically sorted DataFrame to append
        temporal dynamic graph metrics to every transaction row.
        """
        df = df.sort_values("timestamp").reset_index(drop=True)
        n = len(df)
        
        dev_burst = np.zeros(n, dtype=np.float32)
        ip_burst = np.zeros(n, dtype=np.float32)
        deg_vel = np.zeros(n, dtype=np.float32)
        comm_vel = np.zeros(n, dtype=np.float32)

        has_comm = "community_id" in df.columns
        card_col = "card_hash" if "card_hash" in df.columns else ("card1" if "card1" in df.columns else "card")
        ip_col = "ip" if "ip" in df.columns else ("addr1" if "addr1" in df.columns else "ip_address")
        dev_col = "device_id" if "device_id" in df.columns else ("DeviceInfo" if "DeviceInfo" in df.columns else "device")

        for i, row in enumerate(df.itertuples()):
            ts = float(getattr(row, "timestamp", getattr(row, "TransactionDT", i * 10.0)))
            c = str(getattr(row, card_col, f"card_{i}"))
            ip = str(getattr(row, ip_col, f"ip_{i}"))
            dev = str(getattr(row, dev_col, f"dev_{i}"))
            comm = str(getattr(row, "community_id", "0")) if has_comm else None

            metrics = self.process_transaction(ts, c, ip, dev, 0.0, comm)
            dev_burst[i] = metrics["temporal_device_card_burst_5m"]
            ip_burst[i] = metrics["temporal_ip_card_burst_5m"]
            deg_vel[i] = metrics["temporal_degree_velocity_per_min"]
            comm_vel[i] = metrics["temporal_community_expansion_velocity"]

        df["temporal_device_card_burst_5m"] = dev_burst
        df["temporal_ip_card_burst_5m"] = ip_burst
        df["temporal_degree_velocity_per_min"] = deg_vel
        df["temporal_community_expansion_velocity"] = comm_vel
        return df
