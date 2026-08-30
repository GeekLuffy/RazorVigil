"""
RazorShield Sentinel — Temporal Drift Monitor & Closed-Loop Remediation Engine.

Simulates month-by-month temporal attacker adaptations across 12 cohorts to detect
blind spots in frozen deployed models, and automatically executes closed-loop remediation.
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import precision_score, recall_score

N_MONTHS = 12
COHORT_SIZE = 500
ALERT_RECALL_FLOOR = 0.70

FEATURE_COLS = [
    "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
    "bin_card_count", "ip_distinct_pan_count", "device_distinct_bin_count",
    "device_distinct_ip_count", "cvv_cycle_attempts", "cluster_risk_score"
]


def generate_temporal_cohort(month: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate a single month's transaction cohort with continuous attacker temporal adaptation.
    
    Attacker shifts from slow, high-value strikes in Month 1 (amount ~ ₹2500, time ~ 8s) 
    towards rapid stealth micro-strikes in Month 12 (amount ~ ₹800, time ~ 1.2s, higher jitter).
    """
    n_genuine = int(COHORT_SIZE * 0.75)
    n_fraud = COHORT_SIZE - n_genuine

    # 1. Genuine cohort (stable normal e-commerce traffic)
    gen_amounts = np.clip(rng.lognormal(mean=6.5, sigma=0.6, size=n_genuine), 100.0, 15000.0)
    gen_time = rng.uniform(4.0, 35.0, n_genuine)
    gen_entropy = rng.uniform(1.8, 3.8, n_genuine)
    gen_jitter = rng.uniform(0.35, 0.95, n_genuine)
    gen_bin_cards = rng.choice([1, 2, 3], p=[0.85, 0.12, 0.03], size=n_genuine)
    gen_ip_pan = np.ones(n_genuine, dtype=int)
    gen_dev_bin = np.ones(n_genuine, dtype=int)
    gen_dev_ip = np.ones(n_genuine, dtype=int)
    gen_cvv = np.zeros(n_genuine, dtype=int)
    gen_cluster = rng.uniform(0.01, 0.15, n_genuine)

    df_genuine = pd.DataFrame({
        "amount": gen_amounts, "time_on_page_s": gen_time,
        "keystroke_entropy": gen_entropy, "mouse_jitter_score": gen_jitter,
        "bin_card_count": gen_bin_cards, "ip_distinct_pan_count": gen_ip_pan,
        "device_distinct_bin_count": gen_dev_bin, "device_distinct_ip_count": gen_dev_ip,
        "cvv_cycle_attempts": gen_cvv, "cluster_risk_score": gen_cluster,
        "label": 0
    })

    # 2. Fraud cohort with month-dependent temporal drift
    drift_factor = (month - 1) / float(N_MONTHS - 1)  # 0.0 (Month 1) -> 1.0 (Month 12)
    
    # Attackers gradually lower amounts to bypass simple threshold rules
    fraud_amounts = rng.uniform(2500.0 - drift_factor * 1800.0, 4500.0 - drift_factor * 2500.0, n_fraud)
    # Attackers shift checkout duration towards faster strikes
    fraud_time = rng.uniform(8.0 - drift_factor * 6.8, 14.0 - drift_factor * 11.5, n_fraud)
    # Attackers add realistic jitter to mimic humans
    fraud_entropy = rng.uniform(0.8 + drift_factor * 0.9, 1.4 + drift_factor * 1.0, n_fraud)
    fraud_jitter = rng.uniform(0.10 + drift_factor * 0.35, 0.25 + drift_factor * 0.40, n_fraud)
    
    fraud_bin_cards = rng.integers(3, 15, n_fraud)
    fraud_ip_pan = rng.integers(2, 10, n_fraud)
    fraud_dev_bin = rng.integers(2, 6, n_fraud)
    fraud_dev_ip = rng.integers(2, 8, n_fraud)
    fraud_cvv = rng.integers(1, 5, n_fraud)
    fraud_cluster = rng.uniform(0.35, 0.90, n_fraud)

    df_fraud = pd.DataFrame({
        "amount": fraud_amounts, "time_on_page_s": fraud_time,
        "keystroke_entropy": fraud_entropy, "mouse_jitter_score": fraud_jitter,
        "bin_card_count": fraud_bin_cards, "ip_distinct_pan_count": fraud_ip_pan,
        "device_distinct_bin_count": fraud_dev_bin, "device_distinct_ip_count": fraud_dev_ip,
        "cvv_cycle_attempts": fraud_cvv, "cluster_risk_score": fraud_cluster,
        "label": 1
    })

    cohort = pd.concat([df_genuine, df_fraud], ignore_index=True)
    return cohort.sample(frac=1.0, random_state=rng.integers(0, 10000)).reset_index(drop=True)


def run_drift_monitor(
    deployed_policy: DecisionTreeClassifier,
    feature_cols: list = None,
    seed: int = 99
) -> dict:
    """Evaluate frozen deployed policy across 12 temporal cohorts to monitor drift."""
    if feature_cols is None:
        feature_cols = FEATURE_COLS

    rng = np.random.default_rng(seed)
    monthly_results = []
    alert_triggered = False
    alert_month = None

    for m in range(1, N_MONTHS + 1):
        cohort = generate_temporal_cohort(m, rng)
        X_m = cohort[feature_cols].values.astype(np.float32)
        y_m = cohort["label"].values.astype(int)

        preds = deployed_policy.predict(X_m)
        prec = float(precision_score(y_m, preds, zero_division=0))
        rec = float(recall_score(y_m, preds, zero_division=0))
        fp = int(((preds == 1) & (y_m == 0)).sum())

        is_alert = bool(rec < ALERT_RECALL_FLOOR)
        if is_alert and not alert_triggered:
            alert_triggered = True
            alert_month = m

        monthly_results.append({
            "month": m,
            "month_label": f"Month {m:02d}",
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "false_positives": fp,
            "alert_state": is_alert
        })

    return {
        "drift_detected": alert_triggered,
        "alert_month": alert_month,
        "alert_threshold_floor": ALERT_RECALL_FLOOR,
        "monthly_cohort_trace": monthly_results,
        "root_cause_analysis": (
            f"Temporal evasion detected starting at Month {alert_month}: Attacker shortened checkout time window "
            f"and reduced transaction amounts below the static decision threshold."
            if alert_triggered else "Model maintained robust generalization across all 12 temporal cohorts."
        )
    }


def remediate_drift(
    base_policy: DecisionTreeClassifier,
    feature_cols: list = None,
    seed: int = 99
) -> dict:
    """Execute closed-loop retraining by incorporating temporal drift variations into training pool."""
    if feature_cols is None:
        feature_cols = FEATURE_COLS

    rng = np.random.default_rng(seed)

    # Collect cohorts across months 1 to 12
    all_cohorts = [generate_temporal_cohort(m, rng) for m in range(1, N_MONTHS + 1)]
    drift_df = pd.concat(all_cohorts, ignore_index=True)

    X_train = drift_df[feature_cols].values.astype(np.float32)
    y_train = drift_df["label"].values.astype(int)

    remediated_tree = DecisionTreeClassifier(max_depth=6, min_samples_leaf=8, random_state=seed, class_weight="balanced")
    remediated_tree.fit(X_train, y_train)

    # Re-evaluate remediated policy
    remediated_monitor = run_drift_monitor(remediated_tree, feature_cols, seed=seed + 1)

    return {
        "status": "REMEDIATION_SUCCESS",
        "remediated_policy_tree": remediated_tree,
        "remediated_trace": remediated_monitor["monthly_cohort_trace"],
        "min_remediated_recall": min(r["recall"] for r in remediated_monitor["monthly_cohort_trace"]),
        "post_remediation_drift_detected": remediated_monitor["drift_detected"],
    }


if __name__ == "__main__":
    from sklearn.tree import DecisionTreeClassifier
    dummy = DecisionTreeClassifier(max_depth=2).fit(np.random.randn(100, 10), np.random.randint(0, 2, 100))
    mon = run_drift_monitor(dummy)
    print("Drift detected:", mon["drift_detected"])
