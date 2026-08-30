"""
RazorShield Sentinel — Policy Blast Radius & Differential Inspector.

Performs transaction-level differential analysis between the baseline policy and
a proposed candidate policy, categorizing decision flips and ranking them by financial impact.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier

DATA_PATH = Path(__file__).resolve().parents[2] / "backend" / "dataset" / "synthetic_transactions_50k.csv"
if not DATA_PATH.exists():
    DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "transactions.csv"

FEATURE_COLS = [
    "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
    "bin_card_count", "ip_distinct_pan_count", "device_distinct_bin_count",
    "device_distinct_ip_count", "cvv_cycle_attempts", "cluster_risk_score"
]


def compute_blast_radius(
    candidate_tree: DecisionTreeClassifier,
    feature_cols: list = None,
    data_path: Path = DATA_PATH,
    max_audit_flips: int = 20,
    seed: int = 42
) -> dict:
    """Compute detailed blast radius differential between baseline threshold and candidate policy."""
    if feature_cols is None:
        feature_cols = FEATURE_COLS

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
    amounts = df["amount"].values.astype(np.float32) if "amount" in df.columns else np.full(len(df), 500.0)
    txn_ids = df["transaction_id"].values if "transaction_id" in df.columns else [f"TXN_{i:05d}" for i in range(len(df))]

    # Baseline Policy: Amount > 2500 OR velocity >= 10
    bin_cards = df["bin_card_count"].values if "bin_card_count" in df.columns else np.ones(len(df))
    baseline_flags = ((amounts > 2500.0) | (bin_cards >= 10)).astype(int)

    # Candidate Policy Flags
    candidate_flags = candidate_tree.predict(X)

    newly_flagged_mask = (baseline_flags == 0) & (candidate_flags == 1)
    newly_cleared_mask = (baseline_flags == 1) & (candidate_flags == 0)

    # Financial Exposure
    flagged_rupees_at_stake = float(amounts[newly_flagged_mask].sum())
    cleared_rupees_at_stake = float(amounts[newly_cleared_mask].sum())

    # Build detailed flip records
    flip_records = []
    
    # Newly Flagged (Baseline approved -> Candidate declines)
    for idx in np.where(newly_flagged_mask)[0]:
        is_true_fraud = bool(y[idx] == 1)
        impact = "DEFENSE_CATCH" if is_true_fraud else "POTENTIAL_FRICTION"
        # Genuine high-value declines represent friction that needs review
        requires_review = not is_true_fraud and amounts[idx] > 3500.0
        flip_records.append({
            "transaction_id": str(txn_ids[idx]),
            "flip_type": "NEWLY_FLAGGED",
            "is_fraud": is_true_fraud,
            "amount_rs": float(amounts[idx]),
            "impact_category": impact,
            "requires_human_attention": requires_review,
            "key_factors": {
                "amount": float(amounts[idx]),
                "cluster_risk": float(df["cluster_risk_score"].iloc[idx]) if "cluster_risk_score" in df.columns else 0.0,
                "entropy": float(df["keystroke_entropy"].iloc[idx]) if "keystroke_entropy" in df.columns else 0.0,
            }
        })

    # Newly Cleared (Baseline declined -> Candidate approves)
    for idx in np.where(newly_cleared_mask)[0]:
        is_true_fraud = bool(y[idx] == 1)
        impact = "FRAUD_LEAKAGE" if is_true_fraud else "GENUINE_RECOVERY"
        # Actual fraud cleared represents leakage that needs immediate review
        requires_review = is_true_fraud
        flip_records.append({
            "transaction_id": str(txn_ids[idx]),
            "flip_type": "NEWLY_CLEARED",
            "is_fraud": is_true_fraud,
            "amount_rs": float(amounts[idx]),
            "impact_category": impact,
            "requires_human_attention": requires_review,
            "key_factors": {
                "amount": float(amounts[idx]),
                "cluster_risk": float(df["cluster_risk_score"].iloc[idx]) if "cluster_risk_score" in df.columns else 0.0,
                "entropy": float(df["keystroke_entropy"].iloc[idx]) if "keystroke_entropy" in df.columns else 0.0,
            }
        })

    # Sort flips by monetary amount descending
    flip_records.sort(key=lambda r: -r["amount_rs"])

    human_attention_flips = [r for r in flip_records if r["requires_human_attention"]]

    return {
        "total_flips_count": len(flip_records),
        "newly_flagged_count": int(newly_flagged_mask.sum()),
        "newly_cleared_count": int(newly_cleared_mask.sum()),
        "flagged_rupees_at_stake": round(flagged_rupees_at_stake, 2),
        "cleared_rupees_at_stake": round(cleared_rupees_at_stake, 2),
        "human_attention_count": len(human_attention_flips),
        "top_flips": flip_records[:max_audit_flips],
        "passed_blast_radius_gate": bool(len(human_attention_flips) <= 15),
    }
