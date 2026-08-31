"""
RazorShield Sentinel — Strict 6-Gate Policy Verification Suite.

Every candidate risk policy must pass all six independent, deterministic gates before
being considered for human approval. The gates are evaluated in a gates-first sequence.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import precision_score, recall_score

from .off_policy_eval import evaluate_off_policy
from .blast_radius import compute_blast_radius
from .coevolution import sample_adversarial_candidates

DATA_PATH = Path(__file__).resolve().parents[2] / "backend" / "dataset" / "synthetic_transactions_50k.csv"
if not DATA_PATH.exists():
    DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "transactions.csv"

FEATURE_COLS = [
    "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
    "bin_card_count", "ip_distinct_pan_count", "device_distinct_bin_count",
    "device_distinct_ip_count", "cvv_cycle_attempts", "cluster_risk_score"
]


def verify_policy_candidate(
    candidate_tree: DecisionTreeClassifier,
    feature_cols: list = None,
    candidate_name: str = "Candidate_Policy",
    data_path: Path = DATA_PATH,
    seed: int = 42
) -> dict:
    """Run full 6-gate verification on a candidate risk policy."""
    if feature_cols is None:
        feature_cols = FEATURE_COLS

    rng = np.random.default_rng(seed)

    if data_path.exists():
        df = pd.read_csv(data_path)
    else:
        from backend.dataset.generate_dataset_polars import generate_dataset
        df = generate_dataset(n_rows=10000, seed=seed).to_pandas()

    if "label" not in df.columns and "is_fraud" in df.columns:
        df["label"] = df["is_fraud"]

    available_cols = [c for c in feature_cols if c in df.columns]
    X = df[available_cols].fillna(0).values.astype(np.float32)
    y = df["label"].values.astype(int)

    # -------------------------------------------------------------
    # GATE 1: Historical Regression Gate (Prec >= 85%, Recall >= 95%)
    # -------------------------------------------------------------
    preds = candidate_tree.predict(X)
    hist_prec = float(precision_score(y, preds, zero_division=0))
    hist_rec = float(recall_score(y, preds, zero_division=0))
    gate_1_passed = bool(hist_prec >= 0.85 and hist_rec >= 0.95)
    gate_1_detail = {
        "gate_name": "Historical Regression Gate",
        "passed": gate_1_passed,
        "observed_precision": round(hist_prec, 4),
        "target_precision_floor": 0.85,
        "observed_recall": round(hist_rec, 4),
        "target_recall_floor": 0.95,
        "status_message": "Passes historical regression criteria" if gate_1_passed else "Failed minimum precision/recall floor"
    }

    # -------------------------------------------------------------
    # GATE 2: Adversarial Mutation Gate (Evasion Catch Rate >= 90%)
    # -------------------------------------------------------------
    adv_candidates = sample_adversarial_candidates(1000, rng)
    X_adv = adv_candidates[available_cols].values.astype(np.float32)
    y_adv = adv_candidates["label"].values.astype(int)
    adv_preds = candidate_tree.predict(X_adv)
    adv_rec = float(recall_score(y_adv, adv_preds, zero_division=0))
    gate_2_passed = bool(adv_rec >= 0.90)
    gate_2_detail = {
        "gate_name": "Adversarial Mutation Gate",
        "passed": gate_2_passed,
        "observed_catch_rate": round(adv_rec, 4),
        "target_catch_floor": 0.90,
        "n_adversarial_tests": 1000,
        "status_message": "Passes adversarial robustness threshold" if gate_2_passed else "Vulnerable to adversarial evasion mutations"
    }

    # -------------------------------------------------------------
    # GATE 3: Segment Fairness Gate (Max FP Multiplier <= 3.5x OR FPR <= 5%)
    # -------------------------------------------------------------
    overall_fp = float(((preds == 1) & (y == 0)).mean())
    df_temp = df.copy()
    df_temp["pred"] = preds
    df_temp["amount_band"] = pd.cut(
        df_temp["amount"],
        bins=[-1, 500, 2000, 5000, 1e9],
        labels=["Micro (<500)", "Low (500-2k)", "Mid (2k-5k)", "High (>5k)"]
    )
    
    max_multiplier = 1.0
    segment_breakdown = []
    fairness_breach = False

    for band, grp in df_temp.groupby("amount_band", observed=False):
        gen_grp = grp[grp["label"] == 0]
        if len(gen_grp) >= 20:
            seg_fp = float((gen_grp["pred"] == 1).mean())
            mult = seg_fp / max(overall_fp, 1e-4)
            max_multiplier = max(max_multiplier, mult)
            # A segment is unfair only if both multiplier > 3.5 AND absolute FPR > 5.0%
            if mult > 3.5 and seg_fp > 0.05:
                fairness_breach = True
            segment_breakdown.append({
                "segment": str(band),
                "count": len(gen_grp),
                "fp_rate": round(seg_fp, 4),
                "fp_multiplier": round(mult, 2)
            })

    gate_3_passed = not fairness_breach
    gate_3_detail = {
        "gate_name": "Segment Fairness Gate",
        "passed": gate_3_passed,
        "max_segment_fp_multiplier": round(max_multiplier, 2),
        "target_max_multiplier": 3.50,
        "segments": segment_breakdown,
        "status_message": "Fair distribution of false positives across ticket bands" if gate_3_passed else "Disparate false decline rate detected on specific customer segment"
    }

    # -------------------------------------------------------------
    # GATE 4: Off-Policy Doubly-Robust (OPE) Gate (Agreement >= 80%)
    # -------------------------------------------------------------
    ope_res = evaluate_off_policy(candidate_tree, available_cols, data_path, seed=seed)
    gate_4_passed = bool(ope_res["passed_ope_gate"])
    gate_4_detail = {
        "gate_name": "Off-Policy DR-OPE Gate",
        "passed": gate_4_passed,
        "doubly_robust_value": ope_res["value_doubly_robust"],
        "dm_dr_agreement": ope_res["dm_dr_agreement_score"],
        "target_agreement_floor": 0.80,
        "net_value_lift_rs": ope_res["net_value_lift_rs"],
        "status_message": "Consistent off-policy value lift confirmed" if gate_4_passed else "Off-policy estimator disagreement"
    }

    # -------------------------------------------------------------
    # GATE 5: Blast Radius Impact Gate (Human Attention Flips <= 15)
    # -------------------------------------------------------------
    blast_res = compute_blast_radius(candidate_tree, available_cols, data_path, seed=seed)
    gate_5_passed = bool(blast_res["passed_blast_radius_gate"])
    gate_5_detail = {
        "gate_name": "Blast Radius Review Gate",
        "passed": gate_5_passed,
        "ambiguous_flips_requiring_review": blast_res["human_attention_count"],
        "target_max_flips": 15,
        "rupees_at_stake_flagged": blast_res["flagged_rupees_at_stake"],
        "status_message": "Manageable review footprint" if gate_5_passed else "Too many ambiguous flips requiring human intervention"
    }

    # -------------------------------------------------------------
    # GATE 6: Rule Complexity & Explainability Gate (Depth <= 6)
    # -------------------------------------------------------------
    depth = int(candidate_tree.get_depth())
    n_leaves = int(candidate_tree.get_n_leaves())
    gate_6_passed = bool(depth <= 6 and n_leaves <= 40)
    gate_6_detail = {
        "gate_name": "Rule Complexity Gate",
        "passed": gate_6_passed,
        "tree_depth": depth,
        "target_max_depth": 6,
        "leaf_count": n_leaves,
        "status_message": "Interpretable policy depth" if gate_6_passed else "Rule tree too complex for SOC manual audit"
    }

    # Aggregate Evaluation
    all_gates = [gate_1_detail, gate_2_detail, gate_3_detail, gate_4_detail, gate_5_detail, gate_6_detail]
    passed_count = sum(1 for g in all_gates if g["passed"])
    all_passed = bool(passed_count == 6)

    composite_score = round(
        0.30 * hist_prec + 0.30 * hist_rec + 0.20 * adv_rec + 0.10 * ope_res["dm_dr_agreement_score"] + 0.10 * (1.0 - min(max_multiplier / 4.0, 1.0)),
        4
    )

    # NOTE: Passing all 6 gates here does NOT constitute approval. These gates are
    # evaluated on the full training dataset. The Independent Review Agent (reviewer.py)
    # must be run next — it evaluates the same 6 gates on a frozen validation slice
    # that was never seen during training, and returns RECOMMENDED_FOR_HUMAN_APPROVAL
    # or REJECTED. Only after that can a human officer sign off.
    eligibility_status = "GATES_PASSED_PENDING_INDEPENDENT_REVIEW" if all_passed else "BLOCKED_BY_GATES"

    return {
        "candidate_name": candidate_name,
        "is_approval_eligible": all_passed,
        "eligibility_status": eligibility_status,
        "next_required_step": (
            "Run backend.governance.reviewer.request_policy_review() on this candidate "
            "to obtain an independent recommendation on the frozen validation slice."
            if all_passed else "Address gate failures before submitting for independent review."
        ),
        "gates_passed_count": passed_count,
        "total_gates_count": 6,
        "composite_ranking_score": composite_score,
        "gates": all_gates,
        "summary": {
            "historical_precision": round(hist_prec, 4),
            "historical_recall": round(hist_rec, 4),
            "adversarial_catch_rate": round(adv_rec, 4),
            "off_policy_lift_rs": ope_res["net_value_lift_rs"],
            "blast_radius_flips": blast_res["human_attention_count"],
            "tree_depth": depth,
        }
    }


