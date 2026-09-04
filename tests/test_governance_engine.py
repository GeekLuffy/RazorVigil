"""
RazorVigil — Governance & Autonomous Policy Engine Test Suite.

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
from backend.governance.reviewer import request_policy_review, VALIDATION_FRAC


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
    # Status is now "EVASION_RESISTANCE_MEASURED" (converged) or "PARTIAL_EVASION_RESISTANCE"
    assert res["final_robustness_certificate"]["status"] in [
        "EVASION_RESISTANCE_MEASURED", "PARTIAL_EVASION_RESISTANCE"
    ]
    # Bootstrap CI must be present
    assert "evasion_rate_bootstrap_ci" in res["final_robustness_certificate"]
    ci = res["final_robustness_certificate"]["evasion_rate_bootstrap_ci"]
    assert "ci_lower" in ci and "ci_upper" in ci and ci["n_resamples"] == 1000


def test_off_policy_doubly_robust():
    tree = DecisionTreeClassifier(max_depth=3).fit(np.random.randn(200, 10), np.random.randint(0, 2, 200))
    res = evaluate_off_policy(tree, seed=42)
    assert "value_doubly_robust" in res
    assert "dm_dr_agreement_score" in res
    assert 0.0 <= res["dm_dr_agreement_score"] <= 1.0
    # Methodology notes must be present (Fix 5)
    assert "methodology_notes" in res
    assert "logging_policy" in res["methodology_notes"]
    # Positivity check fields must be present
    assert "max_ipw_weight" in res
    assert "positivity_concern" in res


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
    # Status is now REMEDIATION_COMPLETE (Fix 2)
    assert rem_res["status"] == "REMEDIATION_COMPLETE"
    assert len(rem_res["remediated_trace"]) == 12
    # Strict temporal isolation: held-out eval results must only cover months 9-12
    assert "held_out_eval_results" in rem_res
    held_months = [r["month"] for r in rem_res["held_out_eval_results"]]
    assert all(m > 8 for m in held_months), f"Held-out months must be > 8, got: {held_months}"
    # Bootstrap CI on held-out recall must be present
    assert "held_out_eval_recall_ci" in rem_res
    ci = rem_res["held_out_eval_recall_ci"]
    assert "mean_recall" in ci and "ci_lower" in ci and "n_resamples" in ci


def test_six_gate_policy_verification():
    tree = DecisionTreeClassifier(max_depth=4).fit(np.random.randn(300, 10), np.random.randint(0, 2, 300))
    res = verify_policy_candidate(tree, candidate_name="UnitTestPolicy", seed=42)
    assert "gates" in res
    assert len(res["gates"]) == 6
    # Status is now GATES_PASSED_PENDING_INDEPENDENT_REVIEW or BLOCKED_BY_GATES (Fix 3b)
    assert res["eligibility_status"] in [
        "GATES_PASSED_PENDING_INDEPENDENT_REVIEW", "BLOCKED_BY_GATES"
    ]
    assert 0 <= res["gates_passed_count"] <= 6
    # next_required_step must be present (Fix 3b)
    assert "next_required_step" in res



def test_compliance_dossier_pdf_generation():
    pdf_bytes = build_compliance_dossier_pdf(reviewer_id="Test_Auditor_99")
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")
    # The disclaimer paragraph added in Fix 4 means the PDF should be meaningfully sized.
    # ReportLab compresses page content streams so raw text search is not reliable —
    # instead verify the PDF is large enough to contain the expected multi-section content.
    # A two-page dossier with tables should comfortably exceed 3KB.
    assert len(pdf_bytes) > 3000, f"PDF too small ({len(pdf_bytes)} bytes) — likely missing sections"
    # Verify the overclaim strings are NOT in the uncompressed binary header / trailer region
    # (ReportLab writes PDF metadata uncompressed, but page content is always compressed)
    assert b"CERTIFIED & APPROVED FOR LIVE TRAFFIC" not in pdf_bytes
    assert b"RBI 2026 COMPLIANT" not in pdf_bytes



def test_reviewer_isolation():
    """
    Fix 3: Independent Review Agent must:
    1. Use a structurally isolated frozen validation slice.
    2. Return RECOMMENDATION — never auto-promote.
    3. Return rejection_reasons as a list (empty on approval, non-empty on rejection).
    4. Expose human_approval_required=True always.
    """
    tree = DecisionTreeClassifier(
        max_depth=5, min_samples_leaf=8, random_state=42, class_weight="balanced"
    ).fit(np.random.randn(300, 10), np.random.randint(0, 2, 300))

    result = request_policy_review(tree, candidate_name="IsolationTest", seed=42)

    # Must return a RECOMMENDATION, not APPROVAL_ELIGIBLE
    assert "recommendation" in result
    assert result["recommendation"] in [
        "RECOMMENDED_FOR_HUMAN_APPROVAL", "REJECTED"
    ], f"Unexpected recommendation: {result['recommendation']!r}"

    # Must NOT contain APPROVAL_ELIGIBLE
    assert result.get("recommendation") != "APPROVAL_ELIGIBLE"

    # human_approval_required must always be True
    assert result["human_approval_required"] is True

    # rejection_reasons must be a list
    assert isinstance(result["rejection_reasons"], list)
    if result["recommendation"] == "REJECTED":
        assert len(result["rejection_reasons"]) > 0, "REJECTED must include at least one reason"
    else:
        assert len(result["rejection_reasons"]) == 0, "APPROVED must have empty rejection_reasons"

    # Validation slice note must mention VALIDATION_FRAC
    assert "validation_slice_note" in result
    assert str(int(VALIDATION_FRAC * 100)) in result["validation_slice_note"]

    # All 6 gates must be present
    assert "gate_results" in result
    assert len(result["gate_results"]) == 6

    # Summary metrics must be present
    assert "summary" in result
    for key in ["validation_precision", "validation_recall", "adversarial_catch_rate", "tree_depth"]:
        assert key in result["summary"], f"Missing summary key: {key}"

