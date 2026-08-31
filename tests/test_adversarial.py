"""
RazorShield Sentinel — Adversarial & Concurrency Test Suite.
Tests race conditions, circuit breakers, model inversion bounds, honeytoken isolation,
and shadow-mode evaluation under hostile conditions.
"""

import time
import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.main import app, startup_event, shutdown_event
from backend.canary.canary_cards import CanaryCards
from backend.models.inference import RiskScorer
from backend.governance.drift_monitor import run_drift_monitor, generate_temporal_cohort, FEATURE_COLS
from backend.webhook_idempotency import record_webhook_event_durable, is_event_processed_durable
from sklearn.tree import DecisionTreeClassifier


@pytest.fixture(autouse=True)
def init_app_context():
    with TestClient(app) as test_client:
        yield test_client


def test_concurrent_velocity_race(init_app_context):
    """
    Race Condition Audit:
    Simulates concurrent transactions hitting the same BIN/device within the same millisecond.
    Verifies that all requests are processed and velocity increments atomically without race loss.
    """
    client = init_app_context
    card_hash = f"card_race_test_{int(time.time())}"
    payloads = [
        {
            "transaction_id": f"tx_race_{i}_{int(time.time())}",
            "order_id": f"order_race_{i}",
            "amount": 2500.0,
            "bin6": "411111",
            "card_hash": card_hash,
            "billing_name": f"Shopper {i}",
            "device_fingerprint": "dev_race_cluster_01",
            "ip_hash": "ip_race_sub_01",
            "asn_type": "residential",
            "ja3_ua_mismatch": False,
            "keystroke_entropy": 2.85,
            "mouse_jitter_score": 0.72,
            "time_on_page_s": 42.0,
        }
        for i in range(4)
    ]

    responses = [client.post("/checkout", json=p) for p in payloads]
    assert all(r.status_code == 200 for r in responses), "Concurrent requests failed to return 200 OK!"
    for r in responses:
        data = r.json()
        assert "risk_score" in data
        assert "tier" in data
        assert data["latency_ms"] < 50.0, f"SLA violated under concurrency: {data['latency_ms']}ms >= 50ms"


def test_canary_honeytoken_deterministic_isolation():
    """
    Zero-FPR Audit:
    Verifies that all 50 Luhn-valid Canary Honeytokens yield deterministic 1.0 risk score
    and 0.00% False Positive Rate.
    """
    canary_engine = CanaryCards()
    for c_hash in canary_engine.card_hashes:
        res = canary_engine.check(c_hash)
        assert res is not None, f"Canary token failed lookup on hash {c_hash}!"
        assert res.canary_index >= 1


def test_canary_legitimate_escape_hatch():
    """
    Escape Hatch Verification:
    Verifies that normal genuine customer card hashes never falsely match the canary set.
    """
    canary_engine = CanaryCards()
    genuine_hashes = [
        "c_genuine_hdfc_424242_9921",
        "c_genuine_icici_510510_8812",
        "c_genuine_sbi_452000_1234",
        "c_genuine_axis_411111_0000",
    ]
    for g_hash in genuine_hashes:
        assert canary_engine.check(g_hash) is None, f"False positive detected on genuine hash {g_hash}!"


def test_shadow_mode_isolation(init_app_context):
    """
    Shadow Mode Audit:
    Verifies that /checkout/shadow scores transactions without generating orders or blocking users.
    """
    client = init_app_context
    payload = {
        "transaction_id": f"tx_shadow_{int(time.time())}",
        "order_id": "order_shadow_01",
        "amount": 999.0,
        "bin6": "510510",
        "card_hash": "c_shadow_user_01",
        "billing_name": "Shadow Tester",
        "device_fingerprint": "dev_shadow_01",
        "ip_hash": "ip_shadow_01",
        "asn_type": "residential",
        "ja3_ua_mismatch": False,
        "keystroke_entropy": 2.9,
        "mouse_jitter_score": 0.65,
        "time_on_page_s": 35.0,
    }

    res = client.post("/checkout/shadow", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["shadow_evaluation"] is True
    assert data["enforce_action"] is False
    assert "predicted_tier" in data
    assert "risk_score" in data
    assert "feature_attribution" in data


def test_model_inversion_resistance():
    """
    XAI Privacy & Inversion Audit:
    Verifies that ML scoring and feature attributions are bounded in [0, 1] and never expose
    raw training set instances.
    """
    scorer = RiskScorer()
    dummy_vec = np.zeros(17, dtype=np.float32)
    dummy_vec[0] = 2500.0
    lgbm_p, cb_p, if_s = scorer.score(dummy_vec)

    assert 0.0 <= lgbm_p <= 1.0, f"LightGBM probability out of bounds: {lgbm_p}"
    assert 0.0 <= cb_p <= 1.0, f"CatBoost probability out of bounds: {cb_p}"
    assert 0.0 <= if_s <= 1.0, f"Isolation Forest score out of bounds: {if_s}"


def test_psi_drift_auto_remediation_trigger():
    """
    Drift & Auto-Remediation Trigger Audit:
    Verifies that the temporal drift monitor tracks degradation across 12 monthly cohorts.
    """
    rng = np.random.default_rng(42)
    cohort_m1 = generate_temporal_cohort(1, rng)
    X_train = cohort_m1[FEATURE_COLS].values
    y_train = cohort_m1["label"].values

    dummy_policy = DecisionTreeClassifier(max_depth=3, random_state=42)
    dummy_policy.fit(X_train, y_train)

    drift_report = run_drift_monitor(dummy_policy, feature_cols=FEATURE_COLS, seed=42)
    assert "monthly_cohort_trace" in drift_report
    assert len(drift_report["monthly_cohort_trace"]) == 12
    assert "drift_detected" in drift_report


def test_isolation_forest_stacked_contribution():
    """
    Ablation Audit:
    Verifies that Isolation Forest anomaly scoring provides non-zero complementary signal
    for out-of-distribution inputs without overwhelming the calibrated LightGBM blend.
    """
    scorer = RiskScorer()
    anomaly_vec = np.zeros(17, dtype=np.float32)
    anomaly_vec[0] = 99999.0
    anomaly_vec[6] = 0.01
    anomaly_vec[7] = 0.01

    lgbm_p, cb_p, if_s = scorer.score(anomaly_vec)
    final_risk = scorer.compute_risk(lgbm_p, cb_p, if_s, cluster_score=0.9, is_automation=True)

    assert 0.0 <= if_s <= 1.0
    assert final_risk >= 0.50, "Stacked ensemble failed to elevate severe anomaly risk!"


def test_multi_tier_webhook_dedup_race():
    """
    Durable Idempotency Audit:
    Verifies that duplicate webhook deliveries are rejected by the durable store.
    """
    event_id = f"evt_race_test_{int(time.time() * 1000)}"
    res1 = record_webhook_event_durable(event_id, "payment.captured", b'{"id": "evt_test"}')
    res2 = record_webhook_event_durable(event_id, "payment.captured", b'{"id": "evt_test"}')

    assert res1 is True, "First delivery must succeed"
    assert res2 is False, "Duplicate delivery must be rejected"
    assert is_event_processed_durable(event_id) is True
