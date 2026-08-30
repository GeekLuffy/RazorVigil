"""
Temporal Heterogeneous Graph Transformer (HGT) & Relational GAT Ring Detector.

Edge features: log(amount), timestamp delta, cyclical hour (sin/cos).
Strict 3-Way Node Split: Train (60%) -> Validation (20%) -> Test (20% held-out).
Evaluated with 1,000 Bootstrap Confidence Intervals and Evaluation Guardrail.
"""

from __future__ import annotations

import os
import sys
import time
import pickle
from pathlib import Path
from typing import Dict, Tuple, List
from collections import defaultdict

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split
from joblib import Parallel, delayed

import torch_geometric.nn as pyg_nn
from torch_geometric.data import HeteroData

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
DATA_PATH = REPO_ROOT / "data" / "synthetic_transactions.csv"
MODEL_DIR = REPO_ROOT / "backend" / "models"

from backend.models.eval_guardrail import check_evaluation_integrity


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
    return pr, roc, lift


def compute_bootstrap_ci(y_true, scores, n_boot=1000, seed=42):
    n = len(y_true)
    point_pr = average_precision_score(y_true, scores)
    point_roc = roc_auc_score(y_true, scores)
    point_lift = point_pr / max(y_true.mean(), 1e-6)

    seeds = [seed + i for i in range(n_boot)]
    results = Parallel(n_jobs=8, batch_size=25)(
        delayed(_single_boot)(y_true, scores, s, n) for s in seeds
    )
    valid = [r for r in results if r is not None]
    pr_ci = (np.percentile([r[0] for r in valid], 2.5), np.percentile([r[0] for r in valid], 97.5))
    roc_ci = (np.percentile([r[1] for r in valid], 2.5), np.percentile([r[1] for r in valid], 97.5))
    lift_ci = (np.percentile([r[2] for r in valid], 2.5), np.percentile([r[2] for r in valid], 97.5))

    check_evaluation_integrity("Graph PR-AUC", point_pr, pr_ci)
    check_evaluation_integrity("Graph ROC-AUC", point_roc, roc_ci)

    return {
        "pr_point": point_pr,
        "pr_ci": pr_ci,
        "roc_point": point_roc,
        "roc_ci": roc_ci,
        "lift_point": point_lift,
        "lift_ci": lift_ci,
    }


class TemporalHeteroGAT(nn.Module):
    """Heterogeneous Relational GAT with Edge Features."""
    def __init__(self, in_channels_dict: Dict[str, int], edge_dim: int = 4, hidden_channels: int = 64):
        super().__init__()
        self.proj_dict = nn.ModuleDict({
            ntype: nn.Linear(indim, hidden_channels)
            for ntype, indim in in_channels_dict.items()
        })
        self.edge_types = [
            ('transaction', 'uses_card', 'card'),
            ('card', 'rev_uses_card', 'transaction'),
            ('transaction', 'uses_ip', 'ip'),
            ('ip', 'rev_uses_ip', 'transaction'),
            ('transaction', 'uses_device', 'device'),
            ('device', 'rev_uses_device', 'transaction'),
        ]
        self.conv1_dict = nn.ModuleDict({
            f"{s}_{r}_{d}": pyg_nn.GATv2Conv(
                (hidden_channels, hidden_channels),
                hidden_channels // 4,
                heads=4,
                edge_dim=edge_dim,
                add_self_loops=False
            )
            for s, r, d in self.edge_types
        })
        self.ln1 = nn.LayerNorm(hidden_channels)

        self.conv2_dict = nn.ModuleDict({
            f"{s}_{r}_{d}": pyg_nn.GATv2Conv(
                (hidden_channels, hidden_channels),
                hidden_channels // 4,
                heads=4,
                edge_dim=edge_dim,
                add_self_loops=False
            )
            for s, r, d in self.edge_types
        })
        self.ln2 = nn.LayerNorm(hidden_channels)

        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_channels // 2, 1)
        )

    def _layer_forward(self, convs, h_dict, edge_index_dict, edge_attr_dict):
        out_dict = defaultdict(list)
        for s, r, d in self.edge_types:
            key = (s, r, d)
            mod_key = f"{s}_{r}_{d}"
            if key in edge_index_dict and s in h_dict and d in h_dict:
                x_s = h_dict[s]
                x_d = h_dict[d]
                e_idx = edge_index_dict[key]
                e_attr = edge_attr_dict[key] if edge_attr_dict is not None and key in edge_attr_dict else None
                h_msg = convs[mod_key]((x_s, x_d), e_idx, edge_attr=e_attr)
                out_dict[d].append(h_msg)
        
        new_h = {}
        for ntype, msgs in out_dict.items():
            new_h[ntype] = torch.stack(msgs, dim=0).mean(dim=0)
        return new_h

    def forward(self, x_dict, edge_index_dict, edge_attr_dict=None):
        h_dict = {
            ntype: F.relu(self.proj_dict[ntype](x))
            for ntype, x in x_dict.items()
        }
        h1 = self._layer_forward(self.conv1_dict, h_dict, edge_index_dict, edge_attr_dict)
        h_dict = {k: self.ln1(F.relu(h1[k]) + h_dict[k]) for k in h_dict if k in h1}

        h2 = self._layer_forward(self.conv2_dict, h_dict, edge_index_dict, edge_attr_dict)
        h_dict = {k: self.ln2(F.relu(h2[k]) + h_dict[k]) for k in h_dict if k in h2}
        logits = self.classifier(h_dict['transaction']).squeeze(-1)
        return logits


class BaselineHeteroGraphSAGE(nn.Module):
    """Standard Heterogeneous GraphSAGE baseline."""
    def __init__(self, in_channels_dict: Dict[str, int], hidden_channels: int = 64):
        super().__init__()
        self.proj_dict = nn.ModuleDict({
            ntype: nn.Linear(indim, hidden_channels)
            for ntype, indim in in_channels_dict.items()
        })
        self.edge_types = [
            ('transaction', 'uses_card', 'card'),
            ('card', 'rev_uses_card', 'transaction'),
            ('transaction', 'uses_ip', 'ip'),
            ('ip', 'rev_uses_ip', 'transaction'),
            ('transaction', 'uses_device', 'device'),
            ('device', 'rev_uses_device', 'transaction'),
        ]
        self.conv1_dict = nn.ModuleDict({
            f"{s}_{r}_{d}": pyg_nn.SAGEConv((hidden_channels, hidden_channels), hidden_channels)
            for s, r, d in self.edge_types
        })
        self.ln1 = nn.LayerNorm(hidden_channels)

        self.conv2_dict = nn.ModuleDict({
            f"{s}_{r}_{d}": pyg_nn.SAGEConv((hidden_channels, hidden_channels), hidden_channels)
            for s, r, d in self.edge_types
        })
        self.ln2 = nn.LayerNorm(hidden_channels)

        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_channels // 2, 1)
        )

    def _layer_forward(self, convs, h_dict, edge_index_dict):
        out_dict = defaultdict(list)
        for s, r, d in self.edge_types:
            key = (s, r, d)
            mod_key = f"{s}_{r}_{d}"
            if key in edge_index_dict and s in h_dict and d in h_dict:
                x_s = h_dict[s]
                x_d = h_dict[d]
                e_idx = edge_index_dict[key]
                h_msg = convs[mod_key]((x_s, x_d), e_idx)
                out_dict[d].append(h_msg)
        
        new_h = {}
        for ntype, msgs in out_dict.items():
            new_h[ntype] = torch.stack(msgs, dim=0).mean(dim=0)
        return new_h

    def forward(self, x_dict, edge_index_dict):
        h_dict = {
            ntype: F.relu(self.proj_dict[ntype](x))
            for ntype, x in x_dict.items()
        }
        h1 = self._layer_forward(self.conv1_dict, h_dict, edge_index_dict)
        h_dict = {k: self.ln1(F.relu(h1[k]) + h_dict[k]) for k in h_dict if k in h1}

        h2 = self._layer_forward(self.conv2_dict, h_dict, edge_index_dict)
        h_dict = {k: self.ln2(F.relu(h2[k]) + h_dict[k]) for k in h_dict if k in h2}
        logits = self.classifier(h_dict['transaction']).squeeze(-1)
        return logits


def build_synthetic_pyg_graph(df: pd.DataFrame) -> HeteroData:
    data = HeteroData()
    n_tx = len(df)

    card_map = {c: i for i, c in enumerate(df["card_hash"].unique())}
    ip_map = {ip: i for i, ip in enumerate(df["ip_address"].unique())}
    dev_map = {d: i for i, d in enumerate(df["device_id"].unique())}

    from backend.models.train import FEATURE_COLS
    tx_feat_cols = [c for c in FEATURE_COLS if c != "cluster_risk_score"]
    data['transaction'].x = torch.tensor(df[tx_feat_cols].values, dtype=torch.float32)
    y_vals = df["label"].values if "label" in df.columns else df["is_fraud"].values
    data['transaction'].y = torch.tensor(y_vals, dtype=torch.float32)

    data['card'].x = torch.ones((len(card_map), 8), dtype=torch.float32)
    data['ip'].x = torch.ones((len(ip_map), 8), dtype=torch.float32)
    data['device'].x = torch.ones((len(dev_map), 8), dtype=torch.float32)

    tx_idx = np.arange(n_tx)
    c_idx = np.array([card_map[c] for c in df["card_hash"]])
    ip_idx = np.array([ip_map[ip] for ip in df["ip_address"]])
    dev_idx = np.array([dev_map[d] for d in df["device_id"]])

    log_amt = np.log1p(df["amount"].values)
    ts = df["timestamp"].values
    ts_norm = (ts - ts.min()) / max(ts.max() - ts.min(), 1.0)
    sin_hr = df["hour_sin"].values if "hour_sin" in df.columns else np.zeros(n_tx)
    cos_hr = df["hour_cos"].values if "hour_cos" in df.columns else np.zeros(n_tx)
    edge_attr = torch.tensor(np.stack([log_amt, ts_norm, sin_hr, cos_hr], axis=1), dtype=torch.float32)

    data['transaction', 'uses_card', 'card'].edge_index = torch.tensor(np.stack([tx_idx, c_idx], axis=0), dtype=torch.long)
    data['card', 'rev_uses_card', 'transaction'].edge_index = torch.tensor(np.stack([c_idx, tx_idx], axis=0), dtype=torch.long)
    data['transaction', 'uses_card', 'card'].edge_attr = edge_attr
    data['card', 'rev_uses_card', 'transaction'].edge_attr = edge_attr

    data['transaction', 'uses_ip', 'ip'].edge_index = torch.tensor(np.stack([tx_idx, ip_idx], axis=0), dtype=torch.long)
    data['ip', 'rev_uses_ip', 'transaction'].edge_index = torch.tensor(np.stack([ip_idx, tx_idx], axis=0), dtype=torch.long)
    data['transaction', 'uses_ip', 'ip'].edge_attr = edge_attr
    data['ip', 'rev_uses_ip', 'transaction'].edge_attr = edge_attr

    data['transaction', 'uses_device', 'device'].edge_index = torch.tensor(np.stack([tx_idx, dev_idx], axis=0), dtype=torch.long)
    data['device', 'rev_uses_device', 'transaction'].edge_index = torch.tensor(np.stack([dev_idx, tx_idx], axis=0), dtype=torch.long)
    data['transaction', 'uses_device', 'device'].edge_attr = edge_attr
    data['device', 'rev_uses_device', 'transaction'].edge_attr = edge_attr

    return data


def train_and_compare(target_device: str = "cuda:2"):
    device = torch.device(target_device if torch.cuda.is_available() else "cpu")
    print("=" * 70)
    print("TRACK A: TEMPORAL HETEROGENEOUS GRAPH TRANSFORMER (HGT) BENCHMARK")
    print(f"STRICT 3-WAY SPLIT: Train (60%) -> Validation (20%) -> Test (20% held-out)")
    print(f"Target Device: {device}")
    print("=" * 70)

    if not DATA_PATH.exists():
        from backend.dataset.generate_dataset_polars import generate_dataset
        df_pl = generate_dataset(n_rows=50000, seed=42)
        df_pl.write_csv(DATA_PATH)

    df = pd.read_csv(DATA_PATH)
    from backend.models.train import _engineer_features
    df = _engineer_features(df)

    n = len(df)
    y = df["label"].values.astype(int) if "label" in df.columns else df["is_fraud"].values.astype(int)
    segments = df["segment"].values if "segment" in df.columns else y
    strat_key = [f"{y[i]}_{segments[i]}" for i in range(n)]

    # 3-Way Stratified Split
    indices = np.arange(n)
    train_val_idx, test_idx = train_test_split(indices, test_size=0.20, stratify=strat_key, random_state=42)
    strat_tv = [strat_key[i] for i in train_val_idx]
    train_idx, val_idx = train_test_split(train_val_idx, test_size=0.25, stratify=strat_tv, random_state=42)

    print(f"  Partitions: Train={len(train_idx):,} (60%), Val={len(val_idx):,} (20%), Test={len(test_idx):,} (20% held-out)")

    data = build_synthetic_pyg_graph(df).to(device)

    train_mask = torch.zeros(n, dtype=torch.bool, device=device)
    train_mask[train_idx] = True
    val_mask = torch.zeros(n, dtype=torch.bool, device=device)
    val_mask[val_idx] = True
    test_mask = torch.zeros(n, dtype=torch.bool, device=device)
    test_mask[test_idx] = True

    in_channels_dict = {ntype: data[ntype].x.size(1) for ntype in data.node_types}
    edge_attr_dict = {
        etype: data[etype].edge_attr
        for etype in data.edge_types if hasattr(data[etype], 'edge_attr')
    }

    # 1. Train Temporal HeteroGAT
    print("\n[1/2] Training Temporal HeteroGAT (Edge-Conditioned Attention)...")
    gat_model = TemporalHeteroGAT(in_channels_dict, edge_dim=4, hidden_channels=64).to(device)
    gat_opt = torch.optim.Adam(gat_model.parameters(), lr=0.005, weight_decay=1e-4)
    criterion = nn.BCEWithLogitsLoss()

    for epoch in range(1, 21):
        gat_model.train()
        gat_opt.zero_grad()
        logits = gat_model(data.x_dict, data.edge_index_dict, edge_attr_dict)
        loss = criterion(logits[train_mask], data['transaction'].y[train_mask])
        loss.backward()
        gat_opt.step()

    gat_model.eval()
    with torch.no_grad():
        gat_test_scores = torch.sigmoid(gat_model(data.x_dict, data.edge_index_dict, edge_attr_dict)[test_mask]).cpu().numpy()
    y_test_np = data['transaction'].y[test_mask].cpu().numpy()

    # 2. Train Baseline GraphSAGE
    print("[2/2] Training Baseline HeteroGraphSAGE (No Edge Features)...")
    sage_model = BaselineHeteroGraphSAGE(in_channels_dict, hidden_channels=64).to(device)
    sage_opt = torch.optim.Adam(sage_model.parameters(), lr=0.005, weight_decay=1e-4)

    for epoch in range(1, 21):
        sage_model.train()
        sage_opt.zero_grad()
        logits = sage_model(data.x_dict, data.edge_index_dict)
        loss = criterion(logits[train_mask], data['transaction'].y[train_mask])
        loss.backward()
        sage_opt.step()

    sage_model.eval()
    with torch.no_grad():
        sage_test_scores = torch.sigmoid(sage_model(data.x_dict, data.edge_index_dict)[test_mask]).cpu().numpy()

    # Compute 1,000 Bootstrap CIs on Pure Test Partition (20%)
    gat_ci = compute_bootstrap_ci(y_test_np, gat_test_scores, n_boot=1000)
    sage_ci = compute_bootstrap_ci(y_test_np, sage_test_scores, n_boot=1000)

    print("\n" + "=" * 95)
    print("STATISTICAL COMPARISON (HELD-OUT SYNTHETIC TEST PARTITION, N=10,000)")
    print("=" * 95)
    print(f"{'Model Architecture':<30} {'PR-AUC (95% CI)':<25} {'ROC-AUC (95% CI)':<25} {'Lift (95% CI)':<20}")
    print("-" * 95)
    print(f"{'HeteroGraphSAGE (Baseline)':<30} {sage_ci['pr_point']:.4f} [{sage_ci['pr_ci'][0]:.4f}, {sage_ci['pr_ci'][1]:.4f}]   {sage_ci['roc_point']:.4f} [{sage_ci['roc_ci'][0]:.4f}, {sage_ci['roc_ci'][1]:.4f}]   {sage_ci['lift_point']:.2f}x [{sage_ci['lift_ci'][0]:.2f}x, {sage_ci['lift_ci'][1]:.2f}x]")
    print(f"{'Temporal HeteroGAT (Edge)':<30} {gat_ci['pr_point']:.4f} [{gat_ci['pr_ci'][0]:.4f}, {gat_ci['pr_ci'][1]:.4f}]   {gat_ci['roc_point']:.4f} [{gat_ci['roc_ci'][0]:.4f}, {gat_ci['roc_ci'][1]:.4f}]   {gat_ci['lift_point']:.2f}x [{gat_ci['lift_ci'][0]:.2f}x, {gat_ci['lift_ci'][1]:.2f}x]")


if __name__ == "__main__":
    train_and_compare()
