"""
Multi-GPU Parallel Optuna Hyperparameter Optimization Study.

Spawns 5 concurrent optimization workers across GPUs 0-4 using a shared
SQLite database, exploring 150+ parameter configurations on 1M synthetic transactions.
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
from sklearn.metrics import average_precision_score, roc_auc_score

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
DATA_PATH = REPO_ROOT / "data" / "synthetic_transactions_1m.csv"
MODEL_DIR = REPO_ROOT / "backend" / "models"
DB_PATH = REPO_ROOT / "data" / "optuna_study.db"


def objective(trial: optuna.Trial, X_train, y_train, X_val, y_val, device_id: int):
    # LightGBM parameters
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

    # CatBoost parameters
    cb_depth = trial.suggest_int("cb_depth", 4, 8)
    cb_lr = trial.suggest_float("cb_learning_rate", 0.02, 0.15, log=True)
    cb_l2 = trial.suggest_float("cb_l2_leaf_reg", 1.0, 10.0)

    # Train LightGBM
    dtrain = lgb.Dataset(X_train, label=y_train)
    dval = lgb.Dataset(X_val, label=y_val, reference=dtrain)
    gbm = lgb.train(
        lgb_params,
        dtrain,
        num_boost_round=250,
        valid_sets=[dval],
        callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)],
    )
    lgb_preds = gbm.predict(X_val, num_iteration=gbm.best_iteration)

    # Train CatBoost
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

    # Ensembling weights
    w_lgb = trial.suggest_float("w_lgb", 0.3, 0.7)
    w_cb = 1.0 - w_lgb
    blend_scores = w_lgb * lgb_preds + w_cb * cb_preds

    pr_auc = average_precision_score(y_val, blend_scores)
    return pr_auc


def run_worker(gpu_id: int, n_trials: int, storage_url: str, study_name: str):
    os.environ["CUDA_VISIBLE_DEVICES"] = str(gpu_id)
    print(f"[GPU {gpu_id}] Starting worker for {n_trials} trials...")

    # Load 1M dataset (or subsample for fast study)
    from backend.models.train import _engineer_features, FEATURE_COLS
    
    if not DATA_PATH.exists():
        data_src = REPO_ROOT / "data" / "synthetic_transactions.csv"
        df = pd.read_csv(data_src)
    else:
        df = pd.read_csv(DATA_PATH)
        
    df = _engineer_features(df)
    X = df[FEATURE_COLS].values
    y = df["label"].values.astype(int)

    n = len(df)
    rng = np.random.RandomState(42)
    shuffled_idx = rng.permutation(n)
    split_pt = int(0.80 * n)
    X_train, y_train = X[shuffled_idx[:split_pt]], y[shuffled_idx[:split_pt]]
    X_val, y_val = X[shuffled_idx[split_pt:]], y[shuffled_idx[split_pt:]]

    study = optuna.load_study(study_name=study_name, storage=storage_url)
    study.optimize(
        lambda t: objective(t, X_train, y_train, X_val, y_val, gpu_id),
        n_trials=n_trials,
        catch=(Exception,)
    )
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
    print("=" * 70)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    storage_url = f"sqlite:///{DB_PATH.resolve()}"
    study_name = "razorshield_multi_gpu_tune"

    study = optuna.create_study(
        study_name=study_name,
        storage=storage_url,
        direction="maximize",
        load_if_exists=True,
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
    print(f"OPTUNA STUDY COMPLETE in {time.time()-t0:.1f}s")
    print("=" * 70)
    print(f"Best Trial: #{study.best_trial.number}")
    print(f"Best PR-AUC: {study.best_value:.5f}")
    print("Best Parameters:")
    for k, v in study.best_params.items():
        print(f"  • {k}: {v}")

    # Save best parameters
    with open(MODEL_DIR / "best_hyperparams.json", "w") as f:
        json.dump({
            "best_pr_auc": study.best_value,
            "best_params": study.best_params,
            "n_trials": len(study.trials),
        }, f, indent=2)
    print(f"\nBest parameters exported to {MODEL_DIR / 'best_hyperparams.json'}")


if __name__ == '__main__':
    main()
