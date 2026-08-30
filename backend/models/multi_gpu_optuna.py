"""
Multi-GPU Parallel Optuna Hyperparameter Optimization Study.

Spawns 5 concurrent optimization workers across GPUs 0-4 using a shared
SQLite database, exploring 150+ parameter configurations on synthetic transactions.
Strict 3-Way Split: Train (60%) -> Validation (20%) -> Test (20% Held-out, untouched).
"""

from __future__ import annotations

import os
import sys
import json
import time
import argparse
from pathlib import Path
from multiprocessing import Process

import optuna
import numpy as np
import pandas as pd
import lightgbm as lgb
from catboost import CatBoostClassifier
from sklearn.metrics import average_precision_score
from sklearn.model_selection import train_test_split

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
DATA_PATH = REPO_ROOT / "data" / "synthetic_transactions_1m.csv"
DATA_50K = REPO_ROOT / "data" / "synthetic_transactions.csv"
MODEL_DIR = REPO_ROOT / "backend" / "models"
DB_PATH = REPO_ROOT / "data" / "optuna_study.db"


def run_worker(gpu_id: int, n_trials: int, storage_url: str, study_name: str, seed: int = 42):
    os.environ["CUDA_VISIBLE_DEVICES"] = str(gpu_id)
    print(f"[GPU {gpu_id}] Starting worker for {n_trials} trials...")

    from backend.models.train import _engineer_features, FEATURE_COLS

    data_file = DATA_PATH if DATA_PATH.exists() else DATA_50K
    df = pd.read_csv(data_file)
    df = _engineer_features(df)
    
    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df["label"].values.astype(np.int32)
    segments = df["segment"].values if "segment" in df.columns else y

    # Strict 3-Way Stratified Split: Train (60%) / Validation (20%) / Test (20%)
    n = len(df)
    indices = np.arange(n)
    strat_key = [f"{y[i]}_{segments[i]}" for i in range(n)]

    # 1. Split off Test (20%) - Strictly isolated, never seen by Optuna
    train_val_idx, test_idx = train_test_split(
        indices, test_size=0.20, stratify=strat_key, random_state=42
    )

    # 2. Split remaining 80% into Train (60%) and Validation (20%)
    strat_train_val = [strat_key[i] for i in train_val_idx]
    train_idx, val_idx = train_test_split(
        train_val_idx, test_size=0.25, stratify=strat_train_val, random_state=42
    )

    # Verify zero partition overlap
    assert len(set(train_idx) & set(val_idx)) == 0
    assert len(set(train_idx) & set(test_idx)) == 0
    assert len(set(val_idx) & set(test_idx)) == 0

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]

    study = optuna.load_study(study_name=study_name, storage=storage_url)

    def objective(trial: optuna.Trial) -> float:
        lgb_params = {
            "objective": "binary",
            "metric": "binary_logloss",
            "boosting_type": "gbdt",
            "num_leaves": trial.suggest_int("lgb_num_leaves", 20, 128),
            "learning_rate": trial.suggest_float("lgb_learning_rate", 0.02, 0.15, log=True),
            "feature_fraction": trial.suggest_float("lgb_feature_fraction", 0.6, 1.0),
            "bagging_fraction": trial.suggest_float("lgb_bagging_fraction", 0.6, 1.0),
            "bagging_freq": 1,
            "min_child_samples": trial.suggest_int("lgb_min_child_samples", 10, 100),
            "verbose": -1,
            "n_jobs": 4,
            "random_state": 42 + trial.number,
        }

        cb_depth = trial.suggest_int("cb_depth", 4, 8)
        cb_lr = trial.suggest_float("cb_learning_rate", 0.02, 0.15, log=True)
        cb_l2 = trial.suggest_float("cb_l2_leaf_reg", 1.0, 10.0)

        # Train LightGBM on Train partition (60%)
        dtrain = lgb.Dataset(X_train, label=y_train)
        dval = lgb.Dataset(X_val, label=y_val, reference=dtrain)
        gbm = lgb.train(
            lgb_params,
            dtrain,
            num_boost_round=200,
            valid_sets=[dval],
            callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)],
        )
        lgb_preds = gbm.predict(X_val, num_iteration=gbm.best_iteration)

        # Train CatBoost on Train partition (60%)
        cb = CatBoostClassifier(
            iterations=200,
            learning_rate=cb_lr,
            depth=cb_depth,
            l2_leaf_reg=cb_l2,
            loss_function='Logloss',
            eval_metric='PRAUC',
            random_seed=42 + trial.number,
            verbose=False,
            thread_count=4,
        )
        cb.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=20, verbose=False)
        cb_preds = cb.predict_proba(X_val)[:, 1]

        # Ensembling weights optimized on Validation partition (20%)
        w_lgb = trial.suggest_float("w_lgb", 0.25, 0.75)
        w_cb = 1.0 - w_lgb
        blend_scores = w_lgb * lgb_preds + w_cb * cb_preds

        pr_auc = average_precision_score(y_val, blend_scores)
        return pr_auc

    study.optimize(objective, n_trials=n_trials, catch=(Exception,))
    print(f"[GPU {gpu_id}] Finished {n_trials} trials.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gpus", type=str, default="0,1,2,3,4", help="Comma-separated GPU IDs")
    parser.add_argument("--trials-per-gpu", type=int, default=30, help="Trials per GPU worker")
    args = parser.parse_args()

    gpu_list = [int(g.strip()) for g in args.gpus.split(",") if g.strip()]
    total_trials = len(gpu_list) * args.trials_per_gpu

    print("=" * 70)
    print(f"MULTI-GPU OPTUNA STUDY ({len(gpu_list)} GPUs, {total_trials} Total Trials)")
    print("STRICT 3-WAY SPLIT: Train (60%) -> Validation (20%) -> Test (20% held-out)")
    print("=" * 70)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()  # Start fresh study for clean isolation

    storage_url = f"sqlite:///{DB_PATH.resolve()}"
    study_name = "razorshield_multi_gpu_tune"

    study = optuna.create_study(
        study_name=study_name,
        storage=storage_url,
        direction="maximize",
        load_if_exists=False,
    )

    t0 = time.time()
    processes = []
    for g in gpu_list:
        p = Process(target=run_worker, args=(g, args.trials_per_gpu, storage_url, study_name))
        p.start()
        processes.append(p)

    for p in processes:
        p.join()

    study = optuna.load_study(study_name=study_name, storage=storage_url)
    print("\n" + "=" * 70)
    print(f"OPTUNA STUDY COMPLETE in {time.time()-t0:.1f}s (Evaluated on Validation 20% Only)")
    print("=" * 70)
    print(f"Best Trial: #{study.best_trial.number}")
    print(f"Best Validation PR-AUC: {study.best_value:.5f}")
    print("Best Parameters:")
    for k, v in study.best_params.items():
        print(f"  • {k}: {v}")

    # Save best parameters
    with open(MODEL_DIR / "best_hyperparams.json", "w") as f:
        json.dump({
            "best_pr_auc_val": study.best_value,
            "best_params": study.best_params,
            "n_trials": len(study.trials),
        }, f, indent=2)
    print(f"\nBest parameters exported to {MODEL_DIR / 'best_hyperparams.json'}")


if __name__ == '__main__':
    main()
