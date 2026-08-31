"""
RazorShield Sentinel — Doubly-Robust Off-Policy Evaluation (OPE) Engine.

Evaluates candidate risk policies against historical logged decision datasets using
the Doubly-Robust (DR) estimator (Dudík, Langford & Li 2011), combining Direct Method (DM)
reward regression with Inverse Propensity Weighting (IPW).
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier

DATA_PATH = Path(__file__).resolve().parents[2] / "backend" / "dataset" / "synthetic_transactions_50k.csv"
if not DATA_PATH.exists():
    DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "transactions.csv"

FEATURE_COLS = [
    "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
    "bin_card_count", "ip_distinct_pan_count", "device_distinct_bin_count",
    "device_distinct_ip_count", "cvv_cycle_attempts", "cluster_risk_score"
]

FP_FRICTION_COST = 150.0  # ₹150 estimated cost per false decline
AMOUNT_LOGISTIC_SCALE = 2000.0


def compute_logging_propensity(amount: np.ndarray, threshold: float = 2500.0) -> np.ndarray:
    """
    Smoothed logistic enforcement curve representing historical logging behavior.

    METHODOLOGY NOTE: This is a CONSTRUCTED synthetic logging policy, not a propensity
    model fit to real historical logging decisions. It models the assumption that high-amount
    transactions (> ₹2500) were historically more likely to be manually reviewed. The logistic
    shape is a modeling choice. Positivity concern: at very low amounts, propensity approaches
    0.02, giving IPW weights up to ~50x. These extreme weights are clipped but represent a
    positivity violation for the low-amount stratum.
    """
    z = (amount - threshold) / AMOUNT_LOGISTIC_SCALE
    return np.clip(1.0 / (1.0 + np.exp(-z)), 0.02, 0.98)


def evaluate_off_policy(
    policy_tree: DecisionTreeClassifier,
    feature_cols: list = None,
    data_path: Path = DATA_PATH,
    seed: int = 42
) -> dict:
    """
    Run Doubly-Robust Off-Policy Evaluation comparing target policy vs baseline logging.

    Returns estimated value lift under stated assumptions — not a proof of real-world
    performance. All numbers should be interpreted as estimates under the assumptions
    documented in the methodology_notes field of the return value.
    """
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
    amounts = df["amount"].values.astype(np.float32) if "amount" in df.columns else np.full(len(df), 500.0)

    # 1. Simulate historical logged decisions and propensity
    propensity = compute_logging_propensity(amounts, threshold=2500.0)
    logged_actions = (rng.uniform(0, 1, size=len(df)) < propensity).astype(int)

    # True reward under action:
    # Action 1 (Decline/Block): If fraud -> +amount (loss prevented); if genuine -> -FP_FRICTION_COST
    # Action 0 (Approve/Pass): If fraud -> -amount (chargeback loss); if genuine -> 0
    reward_if_block = np.where(y == 1, amounts, -FP_FRICTION_COST)
    reward_if_pass = np.where(y == 1, -amounts, 0.0)
    logged_rewards = np.where(logged_actions == 1, reward_if_block, reward_if_pass)

    # 2. Direct Method outcome models q_hat(x, a=1) and q_hat(x, a=0)
    q1_model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=seed)
    q0_model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=seed)

    mask_a1 = (logged_actions == 1)
    mask_a0 = (logged_actions == 0)

    if mask_a1.sum() > 20 and mask_a0.sum() > 20:
        q1_model.fit(X[mask_a1], logged_rewards[mask_a1])
        q0_model.fit(X[mask_a0], logged_rewards[mask_a0])
        q1_hat = q1_model.predict(X)
        q0_hat = q0_model.predict(X)
    else:
        q1_hat = reward_if_block
        q0_hat = reward_if_pass

    # 3. Target policy actions
    target_actions = policy_tree.predict(X)

    # 4. Direct Method (DM) Value
    v_dm = float(np.mean(np.where(target_actions == 1, q1_hat, q0_hat)))

    # 5. Inverse Propensity Weighting (IPW) Value
    match_mask = (logged_actions == target_actions)
    prob_logged_action = np.where(logged_actions == 1, propensity, 1.0 - propensity)
    ipw_weights = match_mask.astype(float) / np.clip(prob_logged_action, 0.02, 1.0)
    v_ipw = float(np.mean(ipw_weights * logged_rewards))

    # 6. Doubly-Robust (DR) Estimator
    q_target = np.where(target_actions == 1, q1_hat, q0_hat)
    q_logged = np.where(logged_actions == 1, q1_hat, q0_hat)
    dr_residuals = ipw_weights * (logged_rewards - q_logged)
    v_dr = float(np.mean(q_target + dr_residuals))

    # 7. Oracle Ground-Truth Value (for verification)
    v_oracle = float(np.mean(np.where(target_actions == 1, reward_if_block, reward_if_pass)))

    # Baseline Logging Policy Value
    v_baseline_logged = float(np.mean(logged_rewards))

    # dm_dr_agreement is a relative agreement score (not a statistical test):
    # 1 - |v_dr - v_dm| / max(|v_dr|, 1). Higher = more consistent between estimators.
    dm_dr_agreement = max(0.0, 1.0 - abs(v_dr - v_dm) / max(abs(v_dr), 1.0))

    # Maximum IPW weight (positivity check — values >> 10 indicate potential violations)
    max_ipw_weight = float(ipw_weights.max())
    positivity_concern = bool(max_ipw_weight > 20.0)

    methodology_notes = {
        "logging_policy": (
            "SYNTHETIC: The logging propensity is a constructed logistic curve sigmoid((amount - 2500) / 2000). "
            "It is NOT fit to real historical logging decisions. It models the assumption that high-value "
            "transactions were historically more likely to be manually reviewed."
        ),
        "data": (
            "The DM outcome models (q1, q0) are fit on logged-action subsets of the same synthetic dataset "
            "used for candidate model training. Results should be treated as indicative estimates, not "
            "as independent out-of-sample validation."
        ),
        "dm_dr_agreement_definition": (
            "dm_dr_agreement = 1 - |v_DR - v_DM| / max(|v_DR|, 1). "
            "This is a relative consistency score between two estimators, NOT a statistical hypothesis test. "
            "A value >= 0.80 indicates the two estimators are within 20% of each other in relative terms."
        ),
        "positivity": (
            "Propensity is clipped to [0.02, 0.98]. At very low amounts, effective IPW weights approach 50x. "
            f"Max observed IPW weight: {max_ipw_weight:.1f}x. "
            + ("POSITIVITY CONCERN: Weights > 20x detected — OPE estimates for low-amount stratum may be unreliable. "
               if positivity_concern else "No severe positivity violation detected (max weight <= 20x).")
        ),
        "interpretation": (
            "All value estimates (v_DR, v_DM, net lift) are point estimates under the stated synthetic "
            "logging-policy assumption. They are not proofs of real-world value. Interpret as: "
            "'Under the modeled logging behavior, the candidate policy is estimated to produce a "
            "value lift of +Rs.X per transaction.'"
        ),
    }

    return {
        "value_doubly_robust": round(v_dr, 2),
        "value_direct_method": round(v_dm, 2),
        "value_inverse_propensity": round(v_ipw, 2),
        "value_oracle_true": round(v_oracle, 2),
        "baseline_logged_value": round(v_baseline_logged, 2),
        "net_value_lift_rs": round(v_dr - v_baseline_logged, 2),
        "dm_dr_agreement_score": round(dm_dr_agreement, 4),
        "max_ipw_weight": round(max_ipw_weight, 2),
        "positivity_concern": positivity_concern,
        "passed_ope_gate": bool(dm_dr_agreement >= 0.80 and v_dr > v_baseline_logged),
        "methodology_notes": methodology_notes,
    }


if __name__ == "__main__":
    from sklearn.tree import DecisionTreeClassifier
    dummy_tree = DecisionTreeClassifier(max_depth=4).fit(np.random.randn(200, 10), np.random.randint(0, 2, 200))
    res = evaluate_off_policy(dummy_tree)
    print("Off-Policy Eval:", {k: v for k, v in res.items() if k != "methodology_notes"})
    print("Positivity concern:", res["positivity_concern"])
    print("Max IPW weight:", res["max_ipw_weight"])

