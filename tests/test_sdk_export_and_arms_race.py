"""
Unit and Integration Tests for Merchant Export & Red-Team Coevolution Arms Race.
Verifies multi-language SDK generation, Cloudflare/Razorpay WAF ruleset synthesis,
and 5-round adversarial arms race convergence.
"""

from fastapi.testclient import TestClient
from backend.main import app


def test_sdk_snippets_export():
    with TestClient(app) as client:
        res = client.get("/export/sdk-snippets")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        snippets = data["snippets"]
        assert "nodejs" in snippets
        assert "python" in snippets
        assert "go" in snippets
        assert "java" in snippets
        assert "curl" in snippets

        # Verify Node.js snippet
        assert "@razorpay/razorshield-node" in snippets["nodejs"]["package"]
        assert "sentinel.evaluate" in snippets["nodejs"]["code"]

        # Verify Python snippet
        assert "razorshield-python" in snippets["python"]["package"]
        assert "sentinel.evaluate_async" in snippets["python"]["code"]


def test_waf_and_risk_rules_export():
    with TestClient(app) as client:
        res = client.get("/export/rules")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert "cloudflare_waf" in data
        assert "razorpay_risk_rules" in data
        assert "aws_waf" in data

        # Cloudflare WAF validation
        cf = data["cloudflare_waf"]
        assert "http.request.uri.path eq \"/checkout\"" in cf["expression"]
        assert cf["action"] == "managed_challenge"

        # Razorpay risk rules validation
        rzp = data["razorpay_risk_rules"]
        assert len(rzp["active_rules"]) >= 2
        assert any(r["action"] == "QUARANTINE_HONEYPOT" for r in rzp["active_rules"])


def test_five_round_adversarial_arms_race():
    with TestClient(app) as client:
        res = client.post("/adversary/arms-race")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ARMS_RACE_CONVERGED"
        assert data["total_rounds"] == 5
        assert data["overall_evasion_reduction_pct"] > 90.0
        assert len(data["rounds"]) == 5

        # Verify each of the 5 escalating tactical rounds
        r1, r2, r3, r4, r5 = data["rounds"]
        assert "Telegram" in r1["name"] or "Micro-Auth" in r1["name"]
        assert "Proxy" in r2["name"] or "Residential" in r2["name"]
        assert "Bezier" in r3["name"] or "Jitter" in r3["name"]
        assert "Agent" in r4["name"] or "Attestation" in r4["name"]
        assert "Mule" in r5["name"] or "Ring" in r5["name"] or "Louvain" in r5["defense_layer"]

        for r in data["rounds"]:
            assert "defense_layer" in r
            assert "intercept_rate_pct" in r
            assert r["intercept_rate_pct"] >= 95.0
            assert "latency_impact_ms" in r
