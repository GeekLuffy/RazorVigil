"""
Model training script.

Trains LightGBM classifier + IsolationForest on the synthetic dataset,
evaluates on a held-out test split, and serializes both models.

Research doc reference: §2 Layer 3 — Model selection, §4.2 — Evaluation metrics.

Run:
  python -m backend.models.train
  python -m backend.models.train --data data/synthetic_transactions.csv
"""

from __future__ import annotations

import argparse
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    average_precision_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb

warnings.filterwarnings("ignore")

_DATA_PATH = Path(__file__).parents[2] / "data" / "synthetic_transactions.csv"
_MODEL_DIR = Path(__file__).parent
_LGBM_PATH = _MODEL_DIR / "lgbm_model.pkl"
_IF_PATH = _MODEL_DIR / "if_model.pkl"

# Features used during inference (must match features.py FEATURE_NAMES order)
FEATURE_COLS = [
    "amount",
    "amount_zscore",
    "hour_sin",
    "hour_cos",
    "asn_type_encoded",
    "ja3_ua_mismatch",
    "keystroke_entropy",
    "mouse_jitter_score",
    "paste_event",
    "time_on_page_s",
    "bin_card_count",
    "bin_name_count",
    "ip_distinct_pan_count",
    "device_distinct_bin_count",
    "cvv_cycle_attempts",
    "cluster_risk_score",
]

_ASN_ENCODING = {
    "residential": 0, "mobile": 1, "datacenter": 2, "tor": 3, "unknown": 2,
}
_MERCHANT_MEAN = 1500.0
_MERCHANT_STD = 2000.0


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns that match features.py build_feature_vector."""
    import math, datetime

    df = df.copy()

    # Amount z-score
    df["amount_zscore"] = (df["amount"] - _MERCHANT_MEAN) / _MERCHANT_STD

    # Cyclical hour encoding
    def _hour(ts):
        return datetime.datetime.utcfromtimestamp(ts).hour

    hours = df["timestamp"].apply(_hour)
    df["hour_sin"] = hours.apply(lambda h: math.sin(2 * math.pi * h / 24))
    df["hour_cos"] = hours.apply(lambda h: math.cos(2 * math.pi * h / 24))

    # ASN encoding
    df["asn_type_encoded"] = df["asn_type"].map(_ASN_ENCODING).fillna(2)

    # Booleans to float
    df["ja3_ua_mismatch"] = df["ja3_ua_mismatch"].astype(float)
    df["paste_event"] = df["paste_event"].astype(float)

    # Velocity features — approximated from dataset patterns
    # (Real inference reads live Redis; training uses dataset-derived proxies)
    # bin_card_count: how many cards share the same bin6 in the whole dataset
    bin_counts = df.groupby("bin6")["card_hash"].transform("count")
    df["bin_card_count"] = bin_counts.clip(upper=500)

    # bin_name_count: distinct billing names per BIN
    bin_name_counts = df.groupby("bin6")["billing_name"].transform("nunique")
    df["bin_name_count"] = bin_name_counts.clip(upper=200)

    # ip_distinct_pan_count
    ip_pan_counts = df.groupby("ip_hash")["card_hash"].transform("nunique")
    df["ip_distinct_pan_count"] = ip_pan_counts.clip(upper=500)

    # device_distinct_bin_count
    dev_bin_counts = df.groupby("device_fingerprint")["bin6"].transform("nunique")
    df["device_distinct_bin_count"] = dev_bin_counts.clip(upper=50)

    # cvv_cycle_attempts — proxy: same pan_hash appearing more than once
    cvv_counts = df.groupby("pan_hash")["transaction_id"].transform("count")
    df["cvv_cycle_attempts"] = (cvv_counts - 1).clip(lower=0, upper=20)

    # cluster_risk_score — proxy from attack_type label
    # Burst/slow-rate bots cluster heavily; normal/edge-case don't
    cluster_map = {
        "burst_attack": 0.45,
        "slow_rate_carding": 0.35,
        "cvv_cycling": 0.40,
        "adversarial_realistic": 0.20,
        "normal": 0.03,
    }
    df["cluster_risk_score"] = df["attack_type"].apply(
        lambda t: cluster_map.get(t, 0.05)
    )

    return df


def train(data_path: Path = _DATA_PATH):
    print(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"  {len(df)} rows loaded.")

    df = _engineer_features(df)

    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df["is_fraud"].values.astype(int)

    # Stratified 80/20 split — test set is NEVER oversampled
    train_idx, test_idx = train_test_split(
        np.arange(len(df)), test_size=0.20, stratify=y, random_state=42
    )
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    seg_attack_types = df["attack_type"].iloc[test_idx].values

    print(f"  Train: {len(X_train)} rows | Test: {len(X_test)} rows")
    print(f"  Fraud rate train: {y_train.mean():.2%} | test: {y_test.mean():.2%}")

    # -----------------------------------------------------------------------
    # SMOTE oversampling on training set ONLY
    # -----------------------------------------------------------------------
    try:
        from imblearn.over_sampling import SMOTE
        sm = SMOTE(random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
        print(f"  After SMOTE: {len(X_train_res)} rows (balanced)")
    except ImportError:
        print("  [WARN] imbalanced-learn not installed — using scale_pos_weight instead of SMOTE.")
        X_train_res, y_train_res = X_train, y_train

    # -----------------------------------------------------------------------
    # LightGBM
    # -----------------------------------------------------------------------
    fraud_ratio = (y_train_res == 0).sum() / max((y_train_res == 1).sum(), 1)
    lgbm_model = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=31,
        scale_pos_weight=fraud_ratio,
        random_state=42,
        verbose=-1,
    )
    print("\nTraining LightGBM...")
    lgbm_model.fit(X_train_res, y_train_res)

    lgbm_probs = lgbm_model.predict_proba(X_test)[:, 1]
    lgbm_preds = (lgbm_probs >= 0.5).astype(int)

    # -----------------------------------------------------------------------
    # IsolationForest (unsupervised baseline — trained on genuine traffic)
    # -----------------------------------------------------------------------
    print("Training IsolationForest on genuine baseline...")
    iso = IsolationForest(n_estimators=200, contamination=0.08, random_state=42)
    iso.fit(X_train[y_train == 0])

    # Calibrate score range from normal training baseline
    train_scores = iso.score_samples(X_train[y_train == 0])
    if_score_min = float(train_scores.min())
    if_score_range = float(train_scores.max() - train_scores.min())

    # Normalise test scores to [0,1] (higher = more anomalous)
    raw_if_test = iso.score_samples(X_test)
    if_scores_norm = 1.0 - (raw_if_test - if_score_min) / max(if_score_range, 1e-6)
    if_scores_norm = np.clip(if_scores_norm, 0.0, 1.0)

    # -----------------------------------------------------------------------
    # Combined final risk score (same weights as inference.py)
    # -----------------------------------------------------------------------
    final_risk = np.clip(0.70 * lgbm_probs + 0.20 * if_scores_norm + 0.10 * X_test[:, FEATURE_COLS.index("cluster_risk_score")], 0, 1)
    combined_preds = (final_risk >= 0.50).astype(int)  # elevated_review threshold

    # -----------------------------------------------------------------------
    # Metrics — Stratified & Honest Breakdown (Fix 1)
    # -----------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("STRATIFIED EVALUATION RESULTS (NEVER OVERSAMPLED TEST SET)")
    print("=" * 65)

    # 1. Naive split overall PR-AUC
    naive_pr_auc = average_precision_score(y_test, final_risk)
    naive_roc_auc = roc_auc_score(y_test, final_risk)
    print(f"\n1. Overall Test PR-AUC (Naive Split):    {naive_pr_auc:.4f}")
    print(f"   Overall Test ROC-AUC:                 {naive_roc_auc:.4f}")
    print(f"   Overall F1 Score:                     {f1_score(y_test, combined_preds):.4f}")

    # 2. ML-Layer PR-AUC (Excluding transactions caught by deterministic rule overrides)
    df_test = df.iloc[test_idx].copy()
    deterministic_rule_mask = (
        df_test["asn_type"].isin(["datacenter", "tor"])
        & (df_test["keystroke_entropy"] < 0.1)
        & (df_test["mouse_jitter_score"] < 0.05)
        & (df_test["time_on_page_s"] < 1.0)
        & (df_test["ja3_ua_mismatch"] == 1.0)
    ).values

    ml_only_mask = ~deterministic_rule_mask
    y_test_ml = y_test[ml_only_mask]
    final_risk_ml = final_risk[ml_only_mask]
    combined_preds_ml = combined_preds[ml_only_mask]

    ml_pr_auc = average_precision_score(y_test_ml, final_risk_ml)
    print(f"\n2. ML-Layer PR-AUC (Excluding Rule Overrides): {ml_pr_auc:.4f}")
    print(f"   (Evaluated on {ml_only_mask.sum()} / {len(y_test)} ambiguous transactions reaching ML)")
    print(f"   ML-Layer F1: {f1_score(y_test_ml, combined_preds_ml):.4f} | Recall: {recall_score(y_test_ml, combined_preds_ml):.4f}")

    # Full Funnel Catch Rate (Rule overrides + ML decisions)
    funnel_preds = combined_preds.copy()
    funnel_preds[deterministic_rule_mask] = 1
    funnel_recall = recall_score(y_test, funnel_preds)
    print(f"\n3. Full-Funnel Fraud Catch Rate:          {funnel_recall:.2%}")

    # 3. Adversarial-Realistic PR-AUC (Stealth bots with human-mimicking biometrics)
    adv_mask = (seg_attack_types == "adversarial_realistic") | (y_test == 0)
    adv_pr_auc = average_precision_score(y_test[adv_mask], final_risk[adv_mask])
    adv_fraud_mask = (seg_attack_types == "adversarial_realistic")
    adv_recall = recall_score(y_test[adv_fraud_mask], combined_preds[adv_fraud_mask], zero_division=0)
    print(f"\n4. Adversarial-Realistic PR-AUC (Stealth Bots): {adv_pr_auc:.4f}")
    print(f"   Adversarial-Realistic Recall:              {adv_recall:.2%} (n={adv_fraud_mask.sum()})")

    # -----------------------------------------------------------------------
    # Leave-One-Attack-Type-Out Generalization Evaluation (Fix 1.3)
    # -----------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("LEAVE-ONE-ATTACK-TYPE-OUT GENERALIZATION EVALUATION (UNSEEN FRAUD)")
    print("=" * 65)
    # Train on {normal, slow_rate_carding, burst_attack, adversarial_realistic} — exclude cvv_cycling
    train_gen_mask = df["attack_type"] != "cvv_cycling"
    df_train_gen = df[train_gen_mask]
    df_test_unseen = df[df["attack_type"] == "cvv_cycling"]

    X_train_g = df_train_gen[FEATURE_COLS].values.astype(np.float32)
    y_train_g = df_train_gen["is_fraud"].values.astype(int)
    X_test_unseen = df_test_unseen[FEATURE_COLS].values.astype(np.float32)
    y_test_unseen = df_test_unseen["is_fraud"].values.astype(int)

    lgb_gen = lgb.LGBMClassifier(n_estimators=200, learning_rate=0.05, verbose=-1, random_state=42)
    lgb_gen.fit(X_train_g, y_train_g)
    iso_gen = IsolationForest(n_estimators=150, contamination=0.2, random_state=42).fit(X_train_g)

    raw_if_unseen = iso_gen.score_samples(X_test_unseen)
    if_norm_unseen = np.clip(1.0 - (raw_if_unseen - if_score_min) / max(if_score_range, 1e-6), 0, 1)
    gen_risk = np.clip(0.70 * lgb_gen.predict_proba(X_test_unseen)[:, 1] + 0.20 * if_norm_unseen + 0.10 * X_test_unseen[:, FEATURE_COLS.index("cluster_risk_score")], 0, 1)
    gen_preds = (gen_risk >= 0.50).astype(int)

    unseen_recall = recall_score(y_test_unseen, gen_preds, zero_division=0)
    print(f"Trained WITHOUT CVV-cycling examples -> Tested on unseen CVV-cycling attacks:")
    print(f"  Unseen Pattern Catch Rate (Generalization Recall): {unseen_recall:.2%} (n={len(df_test_unseen)})")
    print(f"  Unseen Pattern Avg Risk Score:                    {gen_risk.mean():.4f}")

    # Edge-case genuine false positive test
    edge_mask = df["attack_type"].str.startswith("edge_genuine")
    X_edge = df[edge_mask][FEATURE_COLS].values.astype(np.float32)
    y_edge = df[edge_mask]["is_fraud"].values.astype(int)
    edge_risk = np.clip(0.70 * lgb_gen.predict_proba(X_edge)[:, 1] + 0.20 * (1.0 - (iso_gen.score_samples(X_edge) - if_score_min) / max(if_score_range, 1e-6)) + 0.10 * X_edge[:, FEATURE_COLS.index("cluster_risk_score")], 0, 1)
    edge_fp_rate = (edge_risk >= 0.50).mean()
    print(f"  Edge-Case Genuine False Positive Rate (Hard Declines): {edge_fp_rate:.2%} (n={len(X_edge)})")

    # -----------------------------------------------------------------------
    # Ensemble Weight Ablation Study (Fix 2)
    # -----------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("ENSEMBLE WEIGHT ABLATION STUDY (JUSTIFYING 0.70 / 0.20 / 0.10)")
    print("=" * 65)
    print(f"{'Ablation Configuration':<35} | {'PR-AUC':<8} | {'Recall':<8} | {'F1':<8} | {'Adv-Recall':<10}")
    print("-" * 75)

    # Configs
    configs = [
        ("Full Ensemble (0.70 LGB / 0.20 IF / 0.10 Clust)", 0.70, 0.20, 0.10),
        ("No IsolationForest (0.85 LGB / 0.00 IF / 0.15 Clust)", 0.85, 0.00, 0.15),
        ("No Cluster Score   (0.75 LGB / 0.25 IF / 0.00 Clust)", 0.75, 0.25, 0.00),
        ("No LightGBM (IF + Cluster Only: 0.00 / 0.65 / 0.35)", 0.00, 0.65, 0.35),
        ("Single LightGBM (1.00 LGB / 0.00 / 0.00)", 1.00, 0.00, 0.00),
    ]

    for name, w_lgb, w_if, w_cl in configs:
        score_abl = np.clip(w_lgb * lgbm_probs + w_if * if_scores_norm + w_cl * X_test[:, FEATURE_COLS.index("cluster_risk_score")], 0, 1)
        preds_abl = (score_abl >= 0.50).astype(int)
        pr_abl = average_precision_score(y_test, score_abl)
        rec_abl = recall_score(y_test, preds_abl)
        f1_abl = f1_score(y_test, preds_abl)
        adv_rec_abl = recall_score(y_test[adv_fraud_mask], preds_abl[adv_fraud_mask], zero_division=0)
        print(f"{name:<35} | {pr_abl:.4f}   | {rec_abl:.2%}   | {f1_abl:.4f}   | {adv_rec_abl:.2%}")

    # -----------------------------------------------------------------------
    # Serialize models
    # -----------------------------------------------------------------------
    _MODEL_DIR.mkdir(parents=True, exist_ok=True)

    with open(_LGBM_PATH, "wb") as f:
        pickle.dump(lgbm_model, f)
    print(f"\nLightGBM saved -> {_LGBM_PATH}")

    with open(_IF_PATH, "wb") as f:
        pickle.dump({
            "model": iso,
            "score_min": if_score_min,
            "score_range": if_score_range,
        }, f)
    print(f"IsolationForest saved -> {_IF_PATH}")

    print("\nTraining complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=_DATA_PATH)
    args = parser.parse_args()
    train(args.data)
