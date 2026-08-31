"""
RazorShield Sentinel — Autonomous Policy Engineer Orchestrator.

Executes the complete post-loss autopsy -> feature discovery -> hypothesis synthesis ->
adversarial co-evolution -> 6-gate verification cycle, stopping at the human approval boundary.
"""
from pathlib import Path
import json
import time
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier

from .feature_discovery import discover_features, add_engineered_features
from .coevolution import run_coevolution
from .policy_verifier import verify_policy_candidate
from .drift_monitor import run_drift_monitor, remediate_drift
from .reviewer import request_policy_review

DATA_PATH = Path(__file__).resolve().parents[2] / "backend" / "dataset" / "synthetic_transactions_50k.csv"
if not DATA_PATH.exists():
    DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "transactions.csv"

RESULTS_PATH = Path(__file__).resolve().parents[2] / "docs" / "governance_run_results.json"


def run_forensic_autopsy(df: pd.DataFrame) -> dict:
    """Analyze historical chargebacks and isolate why baseline controls were evaded."""
    if "label" not in df.columns and "is_fraud" in df.columns:
        df["label"] = df["is_fraud"]

    fraud_df = df[df["label"] == 1]
    
    total_loss_rs = float(fraud_df["amount"].sum()) if "amount" in fraud_df.columns else 0.0
    total_fraud_count = len(fraud_df)
    
    # Identify missed chargebacks under simple amount > 2500 rule
    amount_col = fraud_df["amount"] if "amount" in fraud_df.columns else pd.Series(100.0, index=fraud_df.index)
    evaded_mask = (amount_col <= 2500.0)
    evaded_df = fraud_df[evaded_mask]
    evaded_loss_rs = float(evaded_df["amount"].sum()) if len(evaded_df) > 0 else 0.0

    # Key evasion mechanisms
    mechanisms = []
    if "time_on_page_s" in evaded_df.columns and (evaded_df["time_on_page_s"] < 2.0).mean() > 0.3:
        mechanisms.append("Automated Sub-2s Checkout Velocity (Bypassed static review queues)")
    if "cvv_cycle_attempts" in evaded_df.columns and (evaded_df["cvv_cycle_attempts"] >= 1).mean() > 0.2:
        mechanisms.append("Distributed CVV Guessing Fanout across rotating IP proxies")
    if "cluster_risk_score" in evaded_df.columns and (evaded_df["cluster_risk_score"] > 0.3).mean() > 0.4:
        mechanisms.append("Coordinated Multi-Account Carding Entity Rings")

    return {
        "total_chargeback_loss_rs": round(total_loss_rs, 2),
        "total_fraud_incidents": total_fraud_count,
        "baseline_evasion_count": int(evaded_mask.sum()),
        "baseline_evaded_loss_rs": round(evaded_loss_rs, 2),
        "primary_evasion_mechanisms": mechanisms,
        "failure_diagnosis": (
            f"Baseline static threshold (amount > ₹2,500) allowed {len(evaded_df):,} low-value transactions "
            f"(₹{evaded_loss_rs:,.2f} loss) to clear without inspection due to lack of behavioral memory."
        )
    }


def run_autonomous_policy_engineer(
    data_path: Path = DATA_PATH,
    seed: int = 42
) -> dict:
    """Run end-to-end autonomous policy engineering loop."""
    start_time = time.time()

    if data_path.exists():
        df = pd.read_csv(data_path)
    else:
        from backend.dataset.generate_dataset_polars import generate_dataset
        df = generate_dataset(n_rows=10000, seed=seed).to_pandas()

    if "label" not in df.columns and "is_fraud" in df.columns:
        df["label"] = df["is_fraud"]

    df_eng = add_engineered_features(df)

    # Strict isolation: carve out 85% training partition for engineer.
    # The remaining 15% validation slice is withheld and evaluated only by reviewer.py.
    from sklearn.model_selection import train_test_split
    y_all = df_eng["label"].values.astype(int)
    seg_all = df_eng["segment"].values if "segment" in df_eng.columns else (
        df_eng["attack_type"].values if "attack_type" in df_eng.columns else y_all
    )
    strat_key = [f"{y_all[i]}_{seg_all[i]}" for i in range(len(df_eng))]
    train_df_eng, _ = train_test_split(df_eng, test_size=0.15, stratify=strat_key, random_state=seed)
    train_df_eng = train_df_eng.reset_index(drop=True)

    # 1. Forensic Loss Autopsy
    autopsy_summary = run_forensic_autopsy(train_df_eng)

    # 2. Automated Feature Discovery
    discovery_res = discover_features(data_path)

    # 3. Hypothesis Generation (Define candidate feature subsets)
    candidates = [
        {
            "name": "VelocityBurstDefense",
            "description": "Rapid checkout rate and transaction burst defense",
            "features": ["amount", "amount_velocity", "time_on_page_s", "burst_ratio", "bin_card_count"]
        },
        {
            "name": "GraphEntityDefense",
            "description": "Relational entity ring and multi-card proxy fanout defense",
            "features": ["cluster_risk_score", "ring_density", "ip_distinct_pan_count", "device_distinct_bin_count", "device_distinct_ip_count"]
        },
        {
            "name": "BiometricZeroDayDefense",
            "description": "Shannon keystroke entropy and sub-human mouse jitter defense",
            "features": ["keystroke_entropy", "mouse_jitter_score", "biometric_bot_score", "cvv_cycle_attempts", "cluster_risk_score"]
        },
        {
            "name": "ComprehensiveMultiModal",
            "description": "Full multi-modal feature set encompassing tabular, biometrics, velocity, and graph rings",
            "features": [
                "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
                "bin_card_count", "ip_distinct_pan_count", "device_distinct_bin_count",
                "device_distinct_ip_count", "cvv_cycle_attempts", "cluster_risk_score",
                "ring_density", "burst_ratio"
            ]
        }
    ]

    # 4. Train, Harden, and Verify Each Candidate
    verified_candidates = []
    winning_candidate = None
    best_score = -1.0
    coevo_res_map: dict = {}  # Maps candidate name -> hardened DecisionTreeClassifier

    y_train = train_df_eng["label"].values.astype(int)

    for cand in candidates:
        available_feats = [f for f in cand["features"] if f in train_df_eng.columns]
        X_train = train_df_eng[available_feats].fillna(0).values.astype(np.float32)

        # Train initial policy tree

        base_tree = DecisionTreeClassifier(max_depth=5, min_samples_leaf=10, random_state=seed, class_weight="balanced")
        base_tree.fit(X_train, y_train)

        # Run adversarial co-evolution arms race
        coevo_res = run_coevolution(
            search_budget=300,
            max_generations=8,
            feature_cols=available_feats,
            seed=seed
        )
        hardened_tree = coevo_res["hardened_policy_tree"]
        coevo_res_map[cand["name"]] = hardened_tree  # Retain for Independent Review pass

        # Run Strict 6-Gate Verification Suite (on training data — not final approval)
        verification = verify_policy_candidate(
            candidate_tree=hardened_tree,
            feature_cols=available_feats,
            candidate_name=cand["name"],
            data_path=data_path,
            seed=seed
        )

        cand_package = {
            "name": cand["name"],
            "description": cand["description"],
            "features_used": available_feats,
            "coevolution_trace": coevo_res["generation_trace"],
            "robustness_certificate": coevo_res["final_robustness_certificate"],
            "verification": verification,
        }
        verified_candidates.append(cand_package)

        if verification["is_approval_eligible"] and verification["composite_ranking_score"] > best_score:
            best_score = verification["composite_ranking_score"]
            winning_candidate = cand_package


    # If no candidate cleared all 6 gates, report NO_GATES_CLEARED
    # The Autonomous Engineer does NOT promote any candidate to APPROVAL_ELIGIBLE.
    # The Independent Review Agent (reviewer.py) must be run separately on the
    # winning candidate to obtain a formal RECOMMENDATION on a frozen validation slice.
    has_winner = winning_candidate is not None
    status = "PENDING_INDEPENDENT_REVIEW" if has_winner else "NO_GATES_CLEARED"

    # Run Independent Review on the winning candidate (if one exists).
    # This is a separate, isolated evaluation on the frozen validation slice.
    independent_review = None
    if has_winner:
        winning_tree = coevo_res_map.get(winning_candidate["name"])
        if winning_tree is not None:
            independent_review = request_policy_review(
                candidate_tree=winning_tree,
                candidate_name=winning_candidate["name"],
                feature_cols=winning_candidate["features_used"],
                data_path=data_path,
                seed=seed,
            )

    elapsed_time = round(time.time() - start_time, 2)

    output = {
        "execution_time_seconds": elapsed_time,
        "status": status,
        "winning_candidate": winning_candidate["name"] if winning_candidate else None,
        "winning_package": winning_candidate,
        "independent_review": independent_review,
        "all_candidates": verified_candidates,
        "autopsy": autopsy_summary,
        "feature_discovery": discovery_res,
    }

    # Persist results
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        clean_output = json.loads(json.dumps(output, default=lambda o: str(o)))
        json.dump(clean_output, f, indent=2)

    return output


if __name__ == "__main__":
    res = run_autonomous_policy_engineer()
    print(f"Autonomous Engineer completed in {res['execution_time_seconds']}s")
    print("Status:", res["status"])
    print("Winning candidate:", res["winning_candidate"])
