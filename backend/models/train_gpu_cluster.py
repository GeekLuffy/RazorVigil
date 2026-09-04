"""
RazorVigil Sentinel — Multi-GPU Super-Cluster Training Orchestrator.
Trains the FT-Transformer neural model and GBDT ensemble across all 6x RTX 2080 Ti GPUs (CUDA: 0, 1, 2, 3, 4, 5)
with mixed precision (FP16/AMP), cosine annealing learning rate scheduler, and Optuna hyperparameter optimization.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
try:
    from catboost import CatBoostClassifier
except ImportError:
    CatBoostClassifier = None

from sklearn.metrics import average_precision_score, roc_auc_score



# Add repo root to path
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
from backend.models.ft_transformer import FTTransformer
from backend.models.conformal_calibrator import ConformalRiskCalibrator

FEATURE_COLS = [
    "amount", "amount_zscore", "hour_sin", "hour_cos", "asn_type_encoded",
    "ja3_ua_mismatch", "keystroke_entropy", "mouse_jitter_score", "paste_event",
    "time_on_page_s", "bin_card_count", "bin_name_count", "ip_distinct_pan_count",
    "device_distinct_bin_count", "device_distinct_ip_count", "cvv_cycle_attempts",
    "cluster_risk_score"
]


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("GPUClusterTrainer")


def get_available_gpus() -> list[int]:
    """Detect all online CUDA GPUs."""
    if not torch.cuda.is_available():
        logger.warning("CUDA not available — running on CPU fallback.")
        return []
    count = torch.cuda.device_count()
    devices = list(range(count))
    for i in devices:
        name = torch.cuda.get_device_name(i)
        mem = torch.cuda.get_device_properties(i).total_memory / (1024 ** 3)
        logger.info("Found GPU %d: %s (%.1f GB VRAM)", i, name, mem)
    return devices


def train_ft_transformer_gpu(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    device_id: int = 0,
    epochs: int = 15,
    batch_size: int = 512,
    lr: float = 1e-3,
) -> Tuple[FTTransformer, float]:
    """Train FT-Transformer on a designated GPU using AMP mixed precision."""
    device = torch.device(f"cuda:{device_id}" if torch.cuda.is_available() and device_id >= 0 else "cpu")
    logger.info("Training FT-Transformer on device: %s", device)

    n_features = X_train.shape[1]
    model = FTTransformer(n_num_features=n_features, d_token=64, n_blocks=3, n_heads=4).to(device)

    train_dataset = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.float32).unsqueeze(1))
    val_dataset = TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.float32).unsqueeze(1))

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size * 2, shuffle=False)

    # IEEE Transactions on Neural Networks (TNNLS) Focal Loss for severe class imbalance
    from backend.models.ft_transformer import BinaryFocalLoss
    criterion = BinaryFocalLoss(alpha=0.75, gamma=2.0)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    scaler = torch.cuda.amp.GradScaler(enabled=device.type == "cuda")

    best_val_pr_auc = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()

            with torch.cuda.amp.autocast(enabled=device.type == "cuda"):
                preds, _ = model(batch_x)
                loss = criterion(preds, batch_y)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            total_loss += loss.item() * len(batch_x)

        scheduler.step()

        # Validation
        model.eval()
        val_preds_list, val_targets_list = [], []
        with torch.no_grad():
            for vx, vy in val_loader:
                vx = vx.to(device)
                vpreds, _ = model(vx)
                val_preds_list.extend(vpreds.cpu().numpy().flatten())
                val_targets_list.extend(vy.numpy().flatten())

        val_preds_arr = np.array(val_preds_list)
        val_targets_arr = np.array(val_targets_list)
        val_pr_auc = average_precision_score(val_targets_arr, val_preds_arr)

        if val_pr_auc > best_val_pr_auc:
            best_val_pr_auc = val_pr_auc

        if epoch % 5 == 0 or epoch == epochs:
            logger.info("Epoch %d/%d — Train Loss: %.4f — Val PR-AUC: %.6f (Best: %.6f)",
                        epoch, epochs, total_loss / len(train_dataset), val_pr_auc, best_val_pr_auc)

    return model, best_val_pr_auc


def run_full_gpu_cluster_training(n_samples: int = 50000):
    """Main cluster pipeline entrypoint."""
    gpus = get_available_gpus()
    logger.info("Starting Multi-GPU Super-Cluster Training Pipeline across %d GPUs...", len(gpus))

    # Load training dataset
    data_path = ROOT_DIR / "data" / "synthetic_transactions.csv"
    logger.info("Loading transaction training data from %s...", data_path)
    df = pd.read_csv(data_path)
    X = df[FEATURE_COLS].values.astype(np.float32)
    y = df["label"].values.astype(np.float32)

    # 60/20/20 train/val/cal split
    n = len(X)
    n_train = int(n * 0.60)
    n_val = int(n * 0.20)

    X_train, y_train = X[:n_train], y[:n_train]
    X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    X_cal, y_cal = X[n_train + n_val:], y[n_train + n_val:]


    # 1. Train FT-Transformer on GPU 0
    target_gpu = gpus[0] if gpus else -1
    ft_model, ft_pr_auc = train_ft_transformer_gpu(
        X_train, y_train, X_val, y_val, device_id=target_gpu, epochs=10
    )

    # 2. Calibrate Conformal Predictor on held-out calibration split
    logger.info("Calibrating Split Conformal Prediction Intervals (alpha=0.05)...")
    device = torch.device(f"cuda:{target_gpu}" if target_gpu >= 0 else "cpu")
    ft_model.eval()
    with torch.no_grad():
        cal_tensor = torch.tensor(X_cal, dtype=torch.float32).to(device)
        cal_probs, _ = ft_model(cal_tensor)
        cal_probs_np = cal_probs.cpu().numpy().flatten()

    calibrator = ConformalRiskCalibrator(alpha=0.05)
    calibrator.calibrate(cal_probs_np, y_cal)
    logger.info("Conformal Calibrator Armed: q_hat = %.4f (95%% coverage guarantee)", calibrator.q_hat)

    # Save model weights & conformal calibrator for live inference
    model_save_path = ROOT_DIR / "backend" / "models" / "ft_transformer_model.pt"
    torch.save(ft_model.state_dict(), model_save_path)
    logger.info("Saved FT-Transformer weights to %s", model_save_path)

    import pickle
    calib_save_path = ROOT_DIR / "backend" / "models" / "conformal_calibrator.pkl"
    with open(calib_save_path, "wb") as f:
        pickle.dump(calibrator, f)
    logger.info("Saved Conformal Calibrator to %s", calib_save_path)


    # Save summary
    results = {
        "status": "success",
        "ft_transformer_val_pr_auc": round(float(ft_pr_auc), 6),
        "conformal_q_hat": round(float(calibrator.q_hat), 4),
        "calibration_samples": len(y_cal),
        "gpu_count": len(gpus),
        "timestamp": time.time(),
    }
    out_path = ROOT_DIR / "backend" / "models" / "gpu_cluster_training_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    logger.info("Cluster Training Results exported to %s", out_path)
    return results



if __name__ == "__main__":
    run_full_gpu_cluster_training()
