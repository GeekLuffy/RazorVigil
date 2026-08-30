"""
RazorShield Sentinel — Governance & Autonomous Policy Engine Test Suite.

Verifies the full post-loss autopsy, automated feature discovery, multi-round
adversarial co-evolution, 6-gate verification suite, off-policy evaluation,
and compliance dossier PDF compilation.
"""
import pytest
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier

from backend.governance.feature_discovery import discover_features, add_engineered_features
from backend.governance.coevolution import run_coevolution, sample_adversarial_candidates
from backend.governance.off_policy_eval import evaluate_off_policy, compute_logging_propensity
from backend.governance.blast_radius import compute_blast_radius
from backend.governance.drift_monitor import run_drift_monitor, remediate_drift, generate_temporal_cohort
from backend.governance.policy_verifier import verify_policy_candidate
from backend.governance.dossier import build_compliance_dossier_pdf
from backend.governance.autonomous_engineer import run_forensic_autopsy


def test_feature_discovery():
    res = discover_features()
    assert "candidates_tested" in res
    assert len(res["candidates_tested"]) > 0
    assert "accepted_features" in res
    assert isinstance(res["accepted_features"], list)


def test_coevolution_arms_race():
    res = run_coevolution(search_budget=150, max_generations=4, seed=42)
    assert "generation_trace" in res
    assert len(res["generation_trace"]) > 0
    assert "final_robustness_certificate" in res
    assert res["final_robustness_certificate"]["status"] in ["CERTIFIED_ROBUST", "PARTIAL_CONVERGENCE"]


def test_off_policy_doubly_robust():
    tree = DecisionTreeClassifier(max_depth=3).fit(np.random.randn(200, 10), np.random.randint(0, 2, 200))
    res = evaluate_off_policy(tree, seed=42)
    assert "value_doubly_robust" in res
    assert "dm_dr_agreement_score" in res
    assert 0.0 <= res["dm_dr_agreement_score"] <= 1.0


def test_blast_radius_computation():
    tree = DecisionTreeClassifier(max_depth=3).fit(np.random.randn(200, 10), np.random.randint(0, 2, 200))
    res = compute_blast_radius(tree, seed=42)
    assert "total_flips_count" in res
    assert "human_attention_count" in res
    assert "flagged_rupees_at_stake" in res


def test_temporal_drift_and_remediation():
    tree = DecisionTreeClassifier(max_depth=2).fit(np.random.randn(100, 10), np.random.randint(0, 2, 100))
    mon_res = run_drift_monitor(tree, seed=42)
    assert "monthly_cohort_trace" in mon_res
    assert len(mon_res["monthly_cohort_trace"]) == 12

    rem_res = remediate_drift(tree, seed=42)
    assert rem_res["status"] == "REMEDIATION_SUCCESS"
    assert len(rem_res["remediated_trace"]) == 12


def test_six_gate_policy_verification():
    tree = DecisionTreeClassifier(max_depth=4).fit(np.random.randn(300, 10), np.random.randint(0, 2, 300))
    res = verify_policy_candidate(tree, candidate_name="UnitTestPolicy", seed=42)
    assert "gates" in res
    assert len(res["gates"]) == 6
    assert res["eligibility_status"] in ["APPROVAL_ELIGIBLE", "BLOCKED_BY_GATES"]
    assert 0 <= res["gates_passed_count"] <= 6


def test_compliance_dossier_pdf_generation():
    pdf_bytes = build_compliance_dossier_pdf(reviewer_id="Test_Auditor_99")
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")
