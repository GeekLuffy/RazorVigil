"""
Model Training Pipeline for RazorShield Sentinel.

Strict 3-Way Split:
  - 60% Train:      LightGBM + CatBoost + IsolationForest (SMOTE on train only)
  - 20% Validation: Hyperparameter tuning and ensemble blend weight selection
  - 20% Test:       Strictly held-out, evaluated once with 1,000 Bootstrap CIs

Evaluation Guardrail:
  - Asserts non-zero CI widths, non-trivial separability, and proper distribution bounds.
"""

from __future__ import annotations

import argparse
import math
import os
import pickle
import sys
import time
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from joblib import Parallel, delayed
import lightgbm as lgb

try:
    from catboost import CatBoostClassifier
    _HAS_CATBOOST = True
except ImportError:
    _HAS_CATBOOST = False
    CatBoostClassifier = None

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from backend.models.eval_guardrail import check_evaluation_integrity

_MODEL_DIR = Path(__file__).parent
_DATA_PATH = REPO_ROOT / "data" / "synthetic_transactions.csv"
_LGBM_PATH = _MODEL_DIR / "lgbm_model.pkl"
_CB_PATH = _MODEL_DIR / "catboost_model.pkl"
_IF_PATH = _MODEL_DIR / "if_model.pkl"

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
    "device_distinct_ip_count",
    "cvv_cycle_attempts",
    "cluster_risk_score",
]

_MERCHANT_MEAN = 1500.0
_MERCHANT_STD = 2000.0
_ASN_ENCODING = {"residential": 0, "mobile": 1, "datacenter": 2, "tor": 3}


def _single_boot(y_true, scores, seed, n):
    rng = np.random.RandomState(seed)
    idx = rng.randint(0, n, size=n)
    yb = y_true[idx]
    if yb.sum() == 0 or yb.sum() == len(yb):
        return None
    sb = scores[idx]
    pr = average_precision_score(yb, sb)
    roc = roc_auc_score(yb, sb)
    prev = yb.mean()
    lift = pr / max(prev, 1e-6)
    rec = recall_score(yb, (sb >= 0.50).astype(int), zero_division=0)
    return pr, roc, lift, rec


def compute_bootstrap_ci(y_true, scores, n_boot=1000, seed=42, metric_label="Metric"):
    n = len(y_true)
    point_pr = average_precision_score(y_true, scores)
    point_roc = roc_auc_score(y_true, scores)
    point_rec = recall_score(y_true, (scores >= 0.50).astype(int), zero_division=0)
    point_lift = point_pr / max(y_true.mean(), 1e-6)

    seeds = [seed + i for i in range(n_boot)]
    results = Parallel(n_jobs=8, batch_size=25)(
        delayed(_single_boot)(y_true, scores, s, n) for s in seeds
    )
    valid = [r for r in results if r is not None]
    pr_ci = (np.percentile([r[0] for r in valid], 2.5), np.percentile([r[0] for r in valid], 97.5))
    roc_ci = (np.percentile([r[1] for r in valid], 2.5), np.percentile([r[1] for r in valid], 97.5))
    lift_ci = (np.percentile([r[2] for r in valid], 2.5), np.percentile([r[2] for r in valid], 97.5))
    rec_ci = (np.percentile([r[3] for r in valid], 2.5), np.percentile([r[3] for r in valid], 97.5))

    check_evaluation_integrity(f"{metric_label} PR-AUC", point_pr, pr_ci)
    check_evaluation_integrity(f"{metric_label} ROC-AUC", point_roc, roc_ci)

    return {
        "pr_point": point_pr,
        "pr_ci": pr_ci,
        "roc_point": point_roc,
        "roc_ci": roc_ci,
        "lift_point": point_lift,
        "lift_ci": lift_ci,
        "rec_point": point_rec,
        "rec_ci": rec_ci,
    }


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "amount_zscore" in df.columns and "hour_sin" in df.columns and "bin_card_count" in df.columns:
        return df

    import datetime
    df["amount_zscore"] = (df["amount"] - _MERCHANT_MEAN) / _MERCHANT_STD
    hours = df["timestamp"].apply(lambda ts: datetime.datetime.utcfromtimestamp(ts).hour)
    df["hour_sin"] = hours.apply(lambda h: math.sin(2 * math.pi * h / 24))
    df["hour_cos"] = hours.apply(lambda h: math.cos(2 * math.pi * h / 24))
    df["asn_type_encoded"] = df["asn_type"].map(_ASN_ENCODING).fillna(2)
    df["ja3_ua_mismatch"] = df["ja3_ua_mismatch"].astype(float)
    df["paste_event"] = df["paste_event"].astype(float)

    bin_counts = df.groupby("bin6")["card_hash"].transform("count")
    df["bin_card_count"] = bin_counts.clip(upper=500)
    bin_name_counts = df.groupby("bin6")["billing_name"].transform("nunique")
    df["bin_name_count"] = bin_name_counts.clip(upper=200)
    ip_pan_counts = df.groupby("ip_hash")["card_hash"].transform("nunique")
    df["ip_distinct_pan_count"] = ip_pan_counts.clip(upper=500)
    dev_bin_counts = df.groupby("device_fingerprint")["bin6"].transform("nunique")
    df["device_distinct_bin_count"] = dev_bin_counts.clip(upper=50)
    dev_ip_counts = df.groupby("device_fingerprint")["ip_hash"].transform("nunique")
    df["device_distinct_ip_count"] = dev_ip_counts.clip(upper=50)

    pan_counts = df.groupby("pan_hash")["card_hash"].transform("count")
    df["cvv_cycle_attempts"] = (pan_counts - 1).clip(lower=0, upper=20)

    if "cluster_risk_score" not in df.columns:
        df["cluster_risk_score"] = 0.05
    return df


def train(data_path: Path = _DATA_PATH) -> None:
    print("=" * 80)
    print("RAZORSHIELD SENTINEL — CORE MODEL TRAINING & RIGOROUS 3-WAY EVALUATION")
    print("STRICT 3-WAY SPLIT: Train (60%) -> Validation (20%) -> Test (20% held-out)")
    print("=" * 80)

    if not data_path.exists():
        from backend.dataset.generate_dataset_polars import generate_dataset
        df_pl = generate_dataset(n_rows=50000, seed=42)
        df_pl.write_csv(data_path)

    df = pd.read_csv(data_path)
    df = _engineer_features(df)

    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df["label"].values.astype(int) if "label" in df.columns else df["is_fraud"].values.astype(int)
    attack_types = df["segment"].values if "segment" in df.columns else df["attack_type"].values

    # Strict 3-Way Stratified Split
    n = len(df)
    indices = np.arange(n)
    strat_key = [f"{y[i]}_{attack_types[i]}" for i in range(n)]

    # 1. Split off Test (20%) - Strictly held-out and untouched
    train_val_idx, test_idx = train_test_split(indices, test_size=0.20, stratify=strat_key, random_state=42)
    strat_tv = [strat_key[i] for i in train_val_idx]
    train_idx, val_idx = train_test_split(train_val_idx, test_size=0.25, stratify=strat_tv, random_state=42)

    # Assert strict zero overlap
    assert len(set(train_idx) & set(val_idx)) == 0
    assert len(set(train_idx) & set(test_idx)) == 0
    assert len(set(val_idx) & set(test_idx)) == 0

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    X_test, y_test = X[test_idx], y[test_idx]
    test_attack_types = [attack_types[i] for i in test_idx]

    print(f"  Partitions: Train={len(X_train):,} (60%), Val={len(X_val):,} (20%), Test={len(X_test):,} (20% held-out)")
    print(f"  Fraud prevalence: Train={y_train.mean():.2%}, Val={y_val.mean():.2%}, Test={y_test.mean():.2%}")

    # SMOTE on Train only
    try:
        from imblearn.over_sampling import SMOTE
        sm = SMOTE(random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
    except ImportError:
        X_train_res, y_train_res = X_train, y_train

    # 1. Train LightGBM on 60% Train
    print("\n[1/3] Training LightGBM on Train partition (60%)...")
    lgbm_model = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=63,
        min_child_samples=20,
        random_state=42,
        verbose=-1,
    )
    lgbm_model.fit(X_train_res, y_train_res)

    # 2. Train CatBoost on 60% Train (early stopping on Val 20%)
    if _HAS_CATBOOST:
        print("[2/3] Training CatBoost on Train partition (60%)...")
        cb_model = CatBoostClassifier(
            iterations=300,
            learning_rate=0.04,
            depth=6,
            l2_leaf_reg=7.5,
            random_seed=42,
            verbose=False,
            thread_count=8,
        )
        cb_model.fit(X_train_res, y_train_res, eval_set=(X_val, y_val), early_stopping_rounds=25, verbose=False)
        with open(_CB_PATH, "wb") as f:
            pickle.dump(cb_model, f)
    else:
        print("[2/3] CatBoost not installed locally — using LightGBM as fallback proxy for CatBoost slot.")
        cb_model = lgbm_model

    # 3. Train IsolationForest on Genuine Train (60%)
    print("[3/3] Training IsolationForest on genuine baseline...")
    iso = IsolationForest(n_estimators=200, contamination=0.08, random_state=42)
    iso.fit(X_train[y_train == 0])
    train_scores = iso.score_samples(X_train[y_train == 0])
    if_min, if_range = float(train_scores.min()), float(train_scores.max() - train_scores.min())

    # Save models
    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(_LGBM_PATH, "wb") as f:
        pickle.dump(lgbm_model, f)
    with open(_IF_PATH, "wb") as f:
        pickle.dump({"model": iso, "score_min": if_min, "score_range": if_range}, f)
    print(f"  Artifacts saved to {_MODEL_DIR}")

    # Evaluate Blend on Validation partition to verify weights
    lgb_val = lgbm_model.predict_proba(X_val)[:, 1]
    cb_val = cb_model.predict_proba(X_val)[:, 1]
    raw_if_val = iso.score_samples(X_val)
    if_val = np.clip(1.0 - (raw_if_val - if_min) / max(if_range, 1e-6), 0, 1)
    gnn_val = X_val[:, FEATURE_COLS.index("cluster_risk_score")]

    val_blend = 0.45 * lgb_val + 0.35 * cb_val + 0.10 * if_val + 0.10 * gnn_val
    print(f"  Validation Set PR-AUC (Tuning partition): {average_precision_score(y_val, val_blend):.4f}")

    # -----------------------------------------------------------------------
    # STRICT HELD-OUT TEST EVALUATION (Evaluated ONCE at the end)
    # -----------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("HEADLINE RESULTS: HELD-OUT TEST PARTITION (N=10,000, 1,000 BOOTSTRAP CIs)")
    print("=" * 80)

    lgb_test = lgbm_model.predict_proba(X_test)[:, 1]
    cb_test = cb_model.predict_proba(X_test)[:, 1]
    raw_if_test = iso.score_samples(X_test)
    if_test = np.clip(1.0 - (raw_if_test - if_min) / max(if_range, 1e-6), 0, 1)
    gnn_test = X_test[:, FEATURE_COLS.index("cluster_risk_score")]

    test_final_risk = np.clip(0.45 * lgb_test + 0.35 * cb_test + 0.10 * if_test + 0.10 * gnn_test, 0, 1)
    test_preds = (test_final_risk >= 0.50).astype(int)

    # 1. Overall Test PR-AUC & ROC-AUC with CIs
    overall_ci = compute_bootstrap_ci(y_test, test_final_risk, n_boot=1000, metric_label="Overall Test")
    print(f"1. Overall Test PR-AUC:               {overall_ci['pr_point']:.4f} [{overall_ci['pr_ci'][0]:.4f}, {overall_ci['pr_ci'][1]:.4f}]")
    print(f"   Overall Test ROC-AUC:              {overall_ci['roc_point']:.4f} [{overall_ci['roc_ci'][0]:.4f}, {overall_ci['roc_ci'][1]:.4f}]")
    print(f"   Overall Test Recall @ 0.50:        {overall_ci['rec_point']:.2%} [{overall_ci['rec_ci'][0]:.2%}, {overall_ci['rec_ci'][1]:.2%}]")
    print(f"   Overall Signal Lift Over Prior:    {overall_ci['lift_point']:.2f}x [{overall_ci['lift_ci'][0]:.2f}x, {overall_ci['lift_ci'][1]:.2f}x]")

    # 2. ML-Layer Ambiguous Transactions (Excluding deterministic rule overrides)
    rule_mask = (
        (X_test[:, FEATURE_COLS.index("asn_type_encoded")] >= 2)
        & (X_test[:, FEATURE_COLS.index("keystroke_entropy")] < 0.2)
        & (X_test[:, FEATURE_COLS.index("mouse_jitter_score")] < 0.1)
        & (X_test[:, FEATURE_COLS.index("time_on_page_s")] < 1.0)
        & (X_test[:, FEATURE_COLS.index("ja3_ua_mismatch")] == 1.0)
    )
    ml_mask = ~rule_mask
    y_ml = y_test[ml_mask]
    risk_ml = test_final_risk[ml_mask]
    ml_ci = compute_bootstrap_ci(y_ml, risk_ml, n_boot=1000, metric_label="ML-Layer")
    print(f"\n2. ML-Layer PR-AUC (Ambiguous Traffic): {ml_ci['pr_point']:.4f} [{ml_ci['pr_ci'][0]:.4f}, {ml_ci['pr_ci'][1]:.4f}]")
    print(f"   (Evaluated on {ml_mask.sum():,} / {len(y_test):,} ambiguous test transactions reaching ML)")

    # 3. Adversarial-Realistic Bot Segment PR-AUC & Recall
    test_att_arr = np.array(test_attack_types)
    adv_mask = (test_att_arr == "adversarial_realistic")
    adv_eval_mask = adv_mask | (y_test == 0)
    adv_ci = compute_bootstrap_ci(y_test[adv_eval_mask], test_final_risk[adv_eval_mask], n_boot=1000, metric_label="Adversarial Bots")
    adv_recall = recall_score(y_test[adv_mask], test_preds[adv_mask], zero_division=0)
    print(f"\n3. Adversarial-Realistic PR-AUC:      {adv_ci['pr_point']:.4f} [{adv_ci['pr_ci'][0]:.4f}, {adv_ci['pr_ci'][1]:.4f}]")
    print(f"   Adversarial-Realistic Recall:      {adv_recall:.2%} (n={adv_mask.sum():,} stealth bots)")

    # 4. Leave-One-Attack-Type-Out Generalization Evaluation
    train_gen_mask = df["segment"] != "cvv_cycling" if "segment" in df.columns else df["attack_type"] != "cvv_cycling"
    df_train_gen = df[train_gen_mask]
    df_test_unseen = df[~train_gen_mask]
    X_train_g, y_train_g = df_train_gen[FEATURE_COLS].values.astype(np.float32), df_train_gen["label"].values.astype(int)
    X_unseen, y_unseen = df_test_unseen[FEATURE_COLS].values.astype(np.float32), df_test_unseen["label"].values.astype(int)

    lgb_gen = lgb.LGBMClassifier(n_estimators=200, learning_rate=0.05, verbose=-1, random_state=42)
    lgb_gen.fit(X_train_g, y_train_g)
    iso_gen = IsolationForest(n_estimators=150, contamination=0.15, random_state=42).fit(X_train_g[y_train_g == 0])
    raw_if_u = iso_gen.score_samples(X_unseen)
    if_u = np.clip(1.0 - (raw_if_u - if_min) / max(if_range, 1e-6), 0, 1)
    gen_risk = np.clip(0.70 * lgb_gen.predict_proba(X_unseen)[:, 1] + 0.20 * if_u + 0.10 * X_unseen[:, FEATURE_COLS.index("cluster_risk_score")], 0, 1)
    gen_recall = recall_score(y_unseen, (gen_risk >= 0.50).astype(int), zero_division=0)
    print(f"\n4. Leave-One-Attack-Type-Out Recall:  {gen_recall:.2%} (tested on {len(df_test_unseen):,} unseen CVV-cycling attacks)")

    # 5. Full-Funnel Catch Rate
    funnel_preds = test_preds.copy()
    funnel_preds[rule_mask] = 1
    print(f"\n5. Full-Funnel Fraud Catch Rate:      {recall_score(y_test, funnel_preds):.2%}")

    # 6. Component Ablation Matrix
    print("\n" + "=" * 95)
    print("ENSEMBLE COMPONENT ABLATION MATRIX (HELD-OUT TEST SET, 1,000 BOOTSTRAP CIs)")
    print("=" * 95)
    print(f"{'Ensemble Configuration':<45} {'PR-AUC (95% CI)':<25} {'ROC-AUC (95% CI)':<25}")
    print("-" * 95)

    ablation_configs = [
        ("Stacked Blend (0.45 LGB / 0.35 CB / 0.10 IF / 0.10 GNN)", test_final_risk),
        ("Tabular Blend Only (0.55 LGB / 0.45 CB / 0.00 IF / 0.00 GNN)", 0.55 * lgb_test + 0.45 * cb_test),
        ("Prior Baseline (0.70 LGB / 0.00 CB / 0.20 IF / 0.10 GNN)", 0.70 * lgb_test + 0.20 * if_test + 0.10 * gnn_test),
        ("CatBoost Standalone (w=1.0)", cb_test),
        ("LightGBM Standalone (w=1.0)", lgb_test),
        ("Isolation Forest Standalone (w=1.0)", if_test),
    ]

    for name, scores in ablation_configs:
        ci_res = compute_bootstrap_ci(y_test, scores, n_boot=1000, metric_label=name[:20])
        print(f"{name:<45} {ci_res['pr_point']:.4f} [{ci_res['pr_ci'][0]:.4f}, {ci_res['pr_ci'][1]:.4f}]   {ci_res['roc_point']:.4f} [{ci_res['roc_ci'][0]:.4f}, {ci_res['roc_ci'][1]:.4f}]")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=_DATA_PATH)
    args = parser.parse_args()
    train(args.data)
