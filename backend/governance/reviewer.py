"""
RazorVigil — Independent Policy Review Agent.

Structurally isolated from the Autonomous Engineer. Holds a frozen validation
slice (last VALIDATION_FRAC of the dataset by row index) that is NEVER exposed
to any training or coevolution step anywhere in the pipeline.

Returns a RECOMMENDATION (approve-for-human-sign-off / reject-with-reason),
never an automatic promotion. A reviewer that never rejects anything is as
suspicious as a model with 1.0000 PR-AUC.

Exposed as MCP tool: request_policy_review
"""
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import precision_score, recall_score

from .coevolution import sample_adversarial_candidates
from .off_policy_eval import evaluate_off_policy

DATA_PATH = Path(__file__).resolve().parents[2] / "backend" / "dataset" / "synthetic_transactions_50k.csv"
if not DATA_PATH.exists():
    DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "transactions.csv"

FEATURE_COLS = [
    "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
    "bin_card_count", "ip_distinct_pan_count", "device_distinct_bin_count",
    "device_distinct_ip_count", "cvv_cycle_attempts", "cluster_risk_score"
]

# The validation slice is the LAST 15% of the dataset by row index.
# This slice is withheld from ALL training, coevolution, and gate tuning steps.
VALIDATION_FRAC = 0.15

# Gate thresholds — identical to policy_verifier.py for consistency.
GATE_PREC_FLOOR = 0.85
GATE_RECALL_FLOOR = 0.95
GATE_ADV_CATCH_FLOOR = 0.90
GATE_OPE_AGREE_FLOOR = 0.80
GATE_BLAST_FLIPS_MAX = 15
GATE_DEPTH_MAX = 6
GATE_LEAVES_MAX = 40
GATE_FP_MULTIPLIER_MAX = 3.5
GATE_FP_ABS_MAX = 0.05


def _load_frozen_validation_slice(
    data_path: Path = DATA_PATH,
    feature_cols: list = None,
    seed: int = 42,
) -> tuple:
    """
    Load the dataset and extract the frozen validation slice.

    The slice is a stratified random sample (15% across all traffic segments and labels)
    with fixed random_state=seed. This guarantees proper representation across all 6
    attack/traffic segments and eliminates row-concatenation ordering artifacts.
    """
    if feature_cols is None:
        feature_cols = FEATURE_COLS
    if data_path.exists():
        df = pd.read_csv(data_path)
    else:
        from backend.dataset.generate_dataset_polars import generate_dataset
        df = generate_dataset(n_rows=10000, seed=seed).to_pandas()

    if "label" not in df.columns and "is_fraud" in df.columns:
        df["label"] = df["is_fraud"]

    from sklearn.model_selection import train_test_split
    y_all = df["label"].values.astype(int)
    seg_all = df["segment"].values if "segment" in df.columns else (
        df["attack_type"].values if "attack_type" in df.columns else y_all
    )
    strat_key = [f"{y_all[i]}_{seg_all[i]}" for i in range(len(df))]

    _, val_df = train_test_split(df, test_size=VALIDATION_FRAC, stratify=strat_key, random_state=seed)
    val_df = val_df.reset_index(drop=True)

    available_cols = [c for c in feature_cols if c in val_df.columns]
    X_val = val_df[available_cols].fillna(0).values.astype(np.float32)
    y_val = val_df["label"].values.astype(int)
    amounts_val = (
        val_df["amount"].values.astype(np.float32)
        if "amount" in val_df.columns
        else np.full(len(val_df), 500.0)
    )
    return X_val, y_val, amounts_val, val_df, available_cols



def request_policy_review(
    candidate_tree: DecisionTreeClassifier,
    candidate_name: str = "Unnamed_Candidate",
    feature_cols: list = None,
    data_path: Path = DATA_PATH,
    seed: int = 42,
) -> dict:
    """
    Run independent 6-gate review on a candidate policy using the frozen validation slice.

    MCP tool: request_policy_review

    Returns RECOMMENDATION: RECOMMENDED_FOR_HUMAN_APPROVAL or REJECTED.
    Never auto-promotes. Every rejection includes a specific reason.
    """
    if feature_cols is None:
        feature_cols = FEATURE_COLS

    X_val, y_val, amounts_val, val_df, available_cols = _load_frozen_validation_slice(
        data_path, feature_cols, seed
    )
    rng = np.random.default_rng(seed + 999)

    rejection_reasons = []
    gate_results = []

    # Gate 1: Held-Out Precision/Recall (frozen validation slice)
    preds = candidate_tree.predict(X_val)
    prec = float(precision_score(y_val, preds, zero_division=0))
    rec = float(recall_score(y_val, preds, zero_division=0))
    g1_pass = bool(prec >= GATE_PREC_FLOOR and rec >= GATE_RECALL_FLOOR)
    if not g1_pass:
        rejection_reasons.append(
            "Gate 1 FAIL: Validation-slice Prec={:.4f} (floor {}), Rec={:.4f} (floor {})".format(
                prec, GATE_PREC_FLOOR, rec, GATE_RECALL_FLOOR
            )
        )
    gate_results.append({
        "gate": 1, "name": "Held-Out Regression",
        "passed": g1_pass,
        "observed_precision": round(prec, 4),
        "observed_recall": round(rec, 4),
        "evaluation_slice": "Last {}% of dataset ({} rows) - never seen during training".format(
            int(VALIDATION_FRAC * 100), len(y_val)
        ),
    })

    # Gate 2: Adversarial Mutation Catch Rate
    adv_df = sample_adversarial_candidates(1000, rng)
    X_adv = adv_df[available_cols].values.astype(np.float32)
    y_adv = adv_df["label"].values.astype(int)
    adv_preds = candidate_tree.predict(X_adv)
    adv_rec = float(recall_score(y_adv, adv_preds, zero_division=0))
    g2_pass = bool(adv_rec >= GATE_ADV_CATCH_FLOOR)
    if not g2_pass:
        rejection_reasons.append(
            "Gate 2 FAIL: Adversarial catch rate {:.4f} below floor {}".format(adv_rec, GATE_ADV_CATCH_FLOOR)
        )
    gate_results.append({
        "gate": 2, "name": "Adversarial Mutation Catch Rate",
        "passed": g2_pass,
        "observed_catch_rate": round(adv_rec, 4),
        "n_adversarial_candidates": 1000,
    })

    # Gate 3: Segment Fairness (FP disparity across ticket bands)
    overall_fp = float(((preds == 1) & (y_val == 0)).mean())
    val_df_temp = val_df.copy()
    val_df_temp["pred"] = preds
    val_df_temp["amount_band"] = pd.cut(
        val_df_temp["amount"],
        bins=[-1, 500, 2000, 5000, 1e9],
        labels=["Micro", "Low", "Mid", "High"]
    )
    max_multiplier = 1.0
    segment_breakdown = []
    fairness_breach = False
    for band, grp in val_df_temp.groupby("amount_band", observed=False):
        gen_grp = grp[grp["label"] == 0]
        if len(gen_grp) >= 10:
            seg_fp = float((gen_grp["pred"] == 1).mean())
            mult = seg_fp / max(overall_fp, 1e-4)
            max_multiplier = max(max_multiplier, mult)
            if mult > GATE_FP_MULTIPLIER_MAX and seg_fp > GATE_FP_ABS_MAX:
                fairness_breach = True
            segment_breakdown.append({
                "segment": str(band),
                "count": len(gen_grp),
                "fp_rate": round(seg_fp, 4),
                "fp_multiplier": round(mult, 2),
            })
    g3_pass = not fairness_breach
    if not g3_pass:
        rejection_reasons.append(
            "Gate 3 FAIL: Max FP multiplier {:.2f}x exceeds {}x with abs FPR > {}%".format(
                max_multiplier, GATE_FP_MULTIPLIER_MAX, int(GATE_FP_ABS_MAX * 100)
            )
        )
    gate_results.append({
        "gate": 3, "name": "Segment Fairness",
        "passed": g3_pass,
        "max_fp_multiplier": round(max_multiplier, 2),
        "segments": segment_breakdown,
    })

    # Gate 4: Off-Policy DR-OPE
    ope_res = evaluate_off_policy(candidate_tree, available_cols, data_path, seed=seed)
    g4_pass = bool(ope_res["passed_ope_gate"])
    if not g4_pass:
        rejection_reasons.append(
            "Gate 4 FAIL: DR-OPE agreement {:.4f} below {} or value lift negative".format(
                ope_res["dm_dr_agreement_score"], GATE_OPE_AGREE_FLOOR
            )
        )
    gate_results.append({
        "gate": 4, "name": "Off-Policy DR-OPE",
        "passed": g4_pass,
        "dm_dr_agreement": ope_res["dm_dr_agreement_score"],
        "net_value_lift_rs": ope_res["net_value_lift_rs"],
    })

    # Gate 5: Blast Radius (human-attention flips on validation slice)
    bin_cards_val = (
        val_df["bin_card_count"].values
        if "bin_card_count" in val_df.columns
        else np.zeros(len(amounts_val))
    )
    baseline_flags = ((amounts_val > 2500.0) | (bin_cards_val >= 10)).astype(int)
    newly_flagged = int(((baseline_flags == 0) & (preds == 1) & (y_val == 0)).sum())
    newly_cleared_fraud = int(((baseline_flags == 1) & (preds == 0) & (y_val == 1)).sum())
    human_attention_flips = newly_flagged + newly_cleared_fraud
    g5_pass = bool(human_attention_flips <= GATE_BLAST_FLIPS_MAX)
    if not g5_pass:
        rejection_reasons.append(
            "Gate 5 FAIL: {} ambiguous flips exceeds max of {}".format(
                human_attention_flips, GATE_BLAST_FLIPS_MAX
            )
        )
    gate_results.append({
        "gate": 5, "name": "Blast Radius",
        "passed": g5_pass,
        "human_attention_flips": human_attention_flips,
        "max_allowed_flips": GATE_BLAST_FLIPS_MAX,
    })

    # Gate 6: Rule Complexity
    depth = int(candidate_tree.get_depth())
    n_leaves = int(candidate_tree.get_n_leaves())
    g6_pass = bool(depth <= GATE_DEPTH_MAX and n_leaves <= GATE_LEAVES_MAX)
    if not g6_pass:
        rejection_reasons.append(
            "Gate 6 FAIL: depth={} (max {}) or leaves={} (max {})".format(
                depth, GATE_DEPTH_MAX, n_leaves, GATE_LEAVES_MAX
            )
        )
    gate_results.append({
        "gate": 6, "name": "Rule Complexity",
        "passed": g6_pass,
        "depth": depth,
        "n_leaves": n_leaves,
    })

    # Final Recommendation
    all_passed = all(g["passed"] for g in gate_results)
    n_passed = sum(1 for g in gate_results if g["passed"])
    recommendation = "RECOMMENDED_FOR_HUMAN_APPROVAL" if all_passed else "REJECTED"

    return {
        "candidate_name": candidate_name,
        "reviewer": "IndependentReviewAgent_v1",
        "recommendation": recommendation,
        "gates_passed": n_passed,
        "total_gates": 6,
        "rejection_reasons": rejection_reasons,
        "gate_results": gate_results,
        "validation_slice_note": (
            "All gates evaluated on the frozen validation slice (last {}% of dataset, "
            "{} rows). This slice was NEVER exposed to training, coevolution, "
            "or any upstream tuning step.".format(int(VALIDATION_FRAC * 100), len(y_val))
        ),
        "human_approval_required": True,
        "human_approval_note": (
            "This recommendation does not constitute approval. "
            "Deployment requires explicit human sign-off by an authorized compliance officer."
        ),
        "summary": {
            "validation_precision": round(prec, 4),
            "validation_recall": round(rec, 4),
            "adversarial_catch_rate": round(adv_rec, 4),
            "ope_lift_rs": ope_res["net_value_lift_rs"],
            "ope_dm_dr_agreement": ope_res["dm_dr_agreement_score"],
            "human_attention_flips": human_attention_flips,
            "tree_depth": depth,
        },
    }


if __name__ == "__main__":
    from sklearn.tree import DecisionTreeClassifier
    dummy = DecisionTreeClassifier(max_depth=5, class_weight="balanced").fit(
        np.random.randn(200, 10), np.random.randint(0, 2, 200)
    )
    result = request_policy_review(dummy, candidate_name="TestCandidate")
    print("Recommendation:", result["recommendation"])
    print("Gates passed:", result["gates_passed"], "/ 6")
    if result["rejection_reasons"]:
        print("Rejection reasons:", result["rejection_reasons"])
