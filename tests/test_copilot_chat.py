"""
Unit and Integration Tests for Interactive Copilot Incident Room.
Verifies real-time conversational reasoning across live transactions,
NetworkX Louvain cluster topology, and RBI Sovereign Regulatory Directives.
"""

from fastapi.testclient import TestClient
from backend.main import app


def test_copilot_transaction_interrogation():
    with TestClient(app) as client:
        # Seed a suspicious transaction
        tx_res = client.post("/checkout", json={
            "transaction_id": "test_copilot_tx_9988",
            "amount": 25.0,
            "currency": "INR",
            "merchant_id": "rzp_test_merch",
            "bin6": "411111",
            "card_hash": "copilot_test_card_hash",
            "device_fingerprint": "copilot_dev_01",
            "ip_hash": "copilot_ip_01",
            "timestamp": 1700000000,
            "keystroke_entropy": 0.15,
            "mouse_jitter_score": 0.05,
            "ja3_ua_mismatch": True,
            "asn_type": "datacenter",
        })
        assert tx_res.status_code == 200

        # Interrogate copilot about this transaction
        chat_res = client.post("/copilot/chat", json={
            "message": "Why was transaction test_copilot_tx_9988 flagged?",
            "transaction_id": "test_copilot_tx_9988",
        })
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert "reply" in data
        assert "test_copilot_tx_9988" in data["reply"]
        assert any(k in data["reply"].lower() for k in ["entropy", "keystroke", "bot", "risk"])
        assert len(data["citations"]) > 0
        assert any("RBI" in c for c in data["citations"])


def test_copilot_waf_rule_synthesis():
    with TestClient(app) as client:
        chat_res = client.post("/copilot/chat", json={
            "message": "Synthesize Cloudflare WAF rule to block this proxy subnet",
        })
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert "reply" in data
        assert "http.request.uri.path" in data["reply"]
        assert len(data["suggested_actions"]) > 0
        waf_act = next((a for a in data["suggested_actions"] if a["action_type"] == "COPY_WAF"), None)
        assert waf_act is not None
        assert "expression" in waf_act["payload"]


def test_copilot_rbi_dispute_query():
    with TestClient(app) as client:
        chat_res = client.post("/copilot/chat", json={
            "message": "What are the RBI compliance regulations for chargeback dispute representation?",
        })
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert "RBI" in data["reply"]
        assert "Liability Shift" in data["reply"] or "liability" in data["reply"].lower()
        assert len(data["citations"]) >= 2


def test_copilot_louvain_cluster_query():
    with TestClient(app) as client:
        chat_res = client.post("/copilot/chat", json={
            "message": "Explain Louvain community #1 mule ring risk factors",
        })
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert "Louvain" in data["reply"] or "Modularity" in data["reply"]
        assert "Cluster" in data["reply"]
