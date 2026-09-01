from fastapi.testclient import TestClient
from backend.main import app



def test_graph_topology_structure():
    with TestClient(app) as client:
        res = client.get("/cluster/graph")
        assert res.status_code == 200
        data = res.json()
        assert "nodes" in data
        assert "edges" in data
        assert "clusters" in data
        assert "modularity" in data
        assert len(data["nodes"]) >= 10
        assert len(data["edges"]) >= 8
        assert data["modularity"] >= 0.50


def test_cluster_quarantine_action():
    with TestClient(app) as client:
        # Quarantine cluster #1 (Carding swarm)
        res = client.post("/cluster/quarantine/1")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "QUARANTINED"
        assert data["cluster_id"] == 1
        assert data["nodes_isolated_count"] > 0

        # Verify graph topology marks cluster 1 nodes as quarantined
        res_graph = client.get("/cluster/graph")
        topo = res_graph.json()
        c1_nodes = [n for n in topo["nodes"] if n["cluster_id"] == 1]
        for n in c1_nodes:
            assert n["is_quarantined"] is True


def test_cluster_attack_ring_injection():
    with TestClient(app) as client:
        res = client.post("/cluster/inject-ring?ring_type=carding_swarm")
        assert res.status_code == 200
        data = res.json()
        assert data["ring_type"] == "carding_swarm"
        assert data["nodes_injected"] >= 5
        assert data["edges_created"] >= 4

        # Verify new nodes appear in graph topology
        res_graph = client.get("/cluster/graph")
        topo = res_graph.json()
        assert any(data["anchor"] == n["id"] for n in topo["nodes"])
