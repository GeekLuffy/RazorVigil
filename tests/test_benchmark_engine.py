"""
Unit and Integration Tests for Live In-App Stress Benchmark & SLA Verification Engine.
"""

from fastapi.testclient import TestClient
from backend.main import app


def test_benchmark_run_mixed_profile():
    with TestClient(app) as client:
        res = client.post("/benchmark/run", json={
            "concurrency": 10,
            "total_requests": 25,
            "profile": "mixed",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "COMPLETED"
        assert data["total_requests"] == 25
        assert data["throughput_qps"] > 0
        assert data["wall_time_seconds"] > 0

        # Verify SLA structure
        assert "sla" in data
        assert "actual_p99_ms" in data["sla"]
        assert "passed" in data["sla"]
        assert data["sla"]["target_p99_ms"] == 15.0

        # Verify percentile monotonicity
        pcts = data["percentiles"]
        assert pcts["p50"] <= pcts["p95"]
        assert pcts["p95"] <= pcts["p99"]
        assert pcts["min"] <= pcts["max"]

        # Verify Histogram
        assert "histogram" in data
        hist_sum = sum(b["count"] for b in data["histogram"])
        assert hist_sum == 25

        # Verify CDF
        assert "cdf" in data
        assert len(data["cdf"]) > 10
        prev_lat = 0.0
        for pt in data["cdf"]:
            assert pt["latency_ms"] >= prev_lat
            prev_lat = pt["latency_ms"]

        # Verify System & Conformal Metrics
        assert data["conformal_empirical_coverage_pct"] >= 80.0
        assert data["system_metrics"]["process_memory_rss_mb"] > 10.0


def test_benchmark_run_attack_heavy_profile():
    with TestClient(app) as client:
        res = client.post("/benchmark/run", json={
            "concurrency": 15,
            "total_requests": 20,
            "profile": "attack_heavy",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["total_requests"] == 20
        assert data["profile"] == "attack_heavy"
        assert "tier_breakdown" in data
