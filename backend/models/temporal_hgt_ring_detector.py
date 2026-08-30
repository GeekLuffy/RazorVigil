"""
Temporal Heterogeneous Graph Transformer (HGT) / Relational GAT with Edge Features
for Carding Ring and Attack Cluster Detection.

Trains on synthetic transaction-entity graphs with edge-conditioned relational attention
(amount, timestamp delta, hour of day) on NVIDIA RTX 2080 Ti GPU 2 (cuda:2).
"""

from __future__ import annotations

import os
import sys
import time
import pickle
from pathlib import Path
from typing import Dict, Tuple, List

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import average_precision_score, roc_auc_score
from joblib import Parallel, delayed

import torch_geometric.nn as pyg_nn
from torch_geometric.data import HeteroData

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
DATA_PATH = REPO_ROOT / "data" / "synthetic_transactions.csv"
MODEL_DIR = REPO_ROOT / "backend" / "models"


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
    return {
        "pr_point": point_pr,
        "pr_ci": (np.percentile([r[0] for r in valid], 2.5), np.percentile([r[0] for r in valid], 97.5)),
        "roc_point": point_roc,
        "roc_ci": (np.percentile([r[1] for r in valid], 2.5), np.percentile([r[1] for r in valid], 97.5)),
        "lift_point": point_lift,
        "lift_ci": (np.percentile([r[2] for r in valid], 2.5), np.percentile([r[2] for r in valid], 97.5)),
    }


class EdgeConditionedGATConv(nn.Module):
    """GATv2 convolution with linear edge feature conditioning."""
    def __init__(self, in_channels: int, out_channels: int, edge_dim: int, heads: int = 4):
        super().__init__()
        self.conv = pyg_nn.GATv2Conv(
            in_channels=in_channels,
            out_channels=out_channels // heads,
            heads=heads,
            edge_dim=edge_dim,
            concat=True,
            add_self_loops=False
        )

    def forward(self, x, edge_index, edge_attr):
        return self.conv(x, edge_index, edge_attr=edge_attr)


class TemporalHeteroGAT(nn.Module):
    """
    Heterogeneous Relational GAT with Edge Features (Amount, Time Delta, Cyclical Hour).
    """
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
        from collections import defaultdict
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
    """
    Standard Heterogeneous GraphSAGE baseline (structural adjacency without edge attributes).
    """
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
        from collections import defaultdict
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


def build_synthetic_pyg_graph(df: pd.DataFrame) -> Tuple[HeteroData, np.ndarray, np.ndarray]:
    """Construct PyG HeteroData with transaction and entity nodes + edge attributes."""
    n_tx = len(df)
    
    # 1. Map entities to unique integers
    card_map = {c: i for i, c in enumerate(df["card_hash"].unique())}
    ip_map = {ip: i for i, ip in enumerate(df["ip_address"].unique())}
    dev_map = {d: i for i, d in enumerate(df["device_id"].unique())}

    tx_nodes = np.arange(n_tx, dtype=np.int64)
    card_nodes = df["card_hash"].map(card_map).values.astype(np.int64)
    ip_nodes = df["ip_address"].map(ip_map).values.astype(np.int64)
    dev_nodes = df["device_id"].map(dev_map).values.astype(np.int64)

    # Edge features: [log(amount), time_delta, hour_sin, hour_cos]
    amt = np.log1p(df["amount"].values.astype(np.float32)).reshape(-1, 1)
    ts = df["timestamp"].values.astype(np.float32)
    ts_norm = ((ts - ts.min()) / max(ts.max() - ts.min(), 1.0)).reshape(-1, 1)
    h_sin = df["hour_sin"].values.astype(np.float32).reshape(-1, 1)
    h_cos = df["hour_cos"].values.astype(np.float32).reshape(-1, 1)
    edge_feats = np.hstack([amt, ts_norm, h_sin, h_cos])

    # Tabular node features for transactions
    from backend.models.train import FEATURE_COLS
    tx_features = df[FEATURE_COLS].values.astype(np.float32)

    data = HeteroData()
    data['transaction'].x = torch.from_numpy(tx_features)
    data['transaction'].y = torch.from_numpy(df["label"].values.astype(np.float32))

    # Entity initial embeddings (ones / learned)
    data['card'].x = torch.ones((len(card_map), 16), dtype=torch.float32)
    data['ip'].x = torch.ones((len(ip_map), 16), dtype=torch.float32)
    data['device'].x = torch.ones((len(dev_map), 16), dtype=torch.float32)

    # Forward and Reverse Edges
    t_tx = torch.from_numpy(tx_nodes)
    t_card = torch.from_numpy(card_nodes)
    t_ip = torch.from_numpy(ip_nodes)
    t_dev = torch.from_numpy(dev_nodes)
    t_edge_attr = torch.from_numpy(edge_feats)

    # uses_card
    data['transaction', 'uses_card', 'card'].edge_index = torch.stack([t_tx, t_card], dim=0)
    data['transaction', 'uses_card', 'card'].edge_attr = t_edge_attr
    data['card', 'rev_uses_card', 'transaction'].edge_index = torch.stack([t_card, t_tx], dim=0)
    data['card', 'rev_uses_card', 'transaction'].edge_attr = t_edge_attr

    # uses_ip
    data['transaction', 'uses_ip', 'ip'].edge_index = torch.stack([t_tx, t_ip], dim=0)
    data['transaction', 'uses_ip', 'ip'].edge_attr = t_edge_attr
    data['ip', 'rev_uses_ip', 'transaction'].edge_index = torch.stack([t_ip, t_tx], dim=0)
    data['ip', 'rev_uses_ip', 'transaction'].edge_attr = t_edge_attr

    # uses_device
    data['transaction', 'uses_device', 'device'].edge_index = torch.stack([t_tx, t_dev], dim=0)
    data['transaction', 'uses_device', 'device'].edge_attr = t_edge_attr
    data['device', 'rev_uses_device', 'transaction'].edge_index = torch.stack([t_dev, t_tx], dim=0)
    data['device', 'rev_uses_device', 'transaction'].edge_attr = t_edge_attr

    return data


def train_and_compare():
    print("=" * 70)
    print("TRACK A: TEMPORAL HETEROGENEOUS GRAPH TRANSFORMER (HGT) BENCHMARK")
    print("=" * 70)

    device = torch.device("cuda:2" if torch.cuda.is_available() else "cpu")
    print(f"  Target Device: {device}")

    # Load synthetic dataset
    if not DATA_PATH.exists():
        from backend.dataset.generate_dataset_polars import generate_dataset
        df_pl = generate_dataset(n_rows=50000, seed=42)
        df_pl.write_csv(DATA_PATH)
    
    from backend.models.train import _engineer_features
    df = pd.read_csv(DATA_PATH)
    df = _engineer_features(df)
    print(f"  Loaded {len(df):,} synthetic transactions.")

    # 80/20 train/test split
    n_tx = len(df)
    rng = np.random.RandomState(42)
    shuffled_idx = rng.permutation(n_tx)
    split_pt = int(0.80 * n_tx)
    train_idx = torch.tensor(shuffled_idx[:split_pt], dtype=torch.long, device=device)
    test_idx = torch.tensor(shuffled_idx[split_pt:], dtype=torch.long, device=device)

    train_mask = torch.zeros(n_tx, dtype=torch.bool, device=device)
    train_mask[train_idx] = True
    test_mask = torch.zeros(n_tx, dtype=torch.bool, device=device)
    test_mask[test_idx] = True

    print("  Building Synthetic Entity Graph with Temporal Edge Attributes...")
    data = build_synthetic_pyg_graph(df).to(device)

    in_channels_dict = {
        'transaction': data['transaction'].x.size(1),
        'card': data['card'].x.size(1),
        'ip': data['ip'].x.size(1),
        'device': data['device'].x.size(1),
    }

    # -------------------------------------------------------------
    # 1. Train Temporal HeteroGAT (with edge features)
    # -------------------------------------------------------------
    print("\n[1/2] Training Temporal HeteroGAT (Edge-Conditioned Attention)...")
    gat_model = TemporalHeteroGAT(in_channels_dict, edge_dim=4, hidden_channels=64).to(device)
    gat_opt = torch.optim.Adam(gat_model.parameters(), lr=0.005, weight_decay=1e-4)
    pos_weight = torch.tensor([3.5], device=device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    edge_attr_dict = {
        ('transaction', 'uses_card', 'card'): data['transaction', 'uses_card', 'card'].edge_attr,
        ('card', 'rev_uses_card', 'transaction'): data['card', 'rev_uses_card', 'transaction'].edge_attr,
        ('transaction', 'uses_ip', 'ip'): data['transaction', 'uses_ip', 'ip'].edge_attr,
        ('ip', 'rev_uses_ip', 'transaction'): data['ip', 'rev_uses_ip', 'transaction'].edge_attr,
        ('transaction', 'uses_device', 'device'): data['transaction', 'uses_device', 'device'].edge_attr,
        ('device', 'rev_uses_device', 'transaction'): data['device', 'rev_uses_device', 'transaction'].edge_attr,
    }

    t0 = time.time()
    for epoch in range(1, 21):
        gat_model.train()
        gat_opt.zero_grad()
        logits = gat_model(data.x_dict, data.edge_index_dict, edge_attr_dict)
        loss = criterion(logits[train_mask], data['transaction'].y[train_mask])
        loss.backward()
        gat_opt.step()

    gat_model.eval()
    with torch.no_grad():
        gat_logits = gat_model(data.x_dict, data.edge_index_dict, edge_attr_dict)
        gat_probs = torch.sigmoid(gat_logits[test_mask]).cpu().numpy()

    y_test = data['transaction'].y[test_mask].cpu().numpy()
    gat_ci = compute_bootstrap_ci(y_test, gat_probs, n_boot=1000)
    print(f"  HeteroGAT PR-AUC:  {gat_ci['pr_point']:.4f} (95% CI: [{gat_ci['pr_ci'][0]:.4f}, {gat_ci['pr_ci'][1]:.4f}])")
    print(f"  HeteroGAT ROC-AUC: {gat_ci['roc_point']:.4f} (95% CI: [{gat_ci['roc_ci'][0]:.4f}, {gat_ci['roc_ci'][1]:.4f}])")
    print(f"  HeteroGAT Lift:    {gat_ci['lift_point']:.2f}x (95% CI: [{gat_ci['lift_ci'][0]:.2f}x, {gat_ci['lift_ci'][1]:.2f}x])")

    # -------------------------------------------------------------
    # 2. Train Standard GraphSAGE Baseline (Structural Adjacency Only)
    # -------------------------------------------------------------
    print("\n[2/2] Training Baseline HeteroGraphSAGE (No Edge Features)...")
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
        sage_logits = sage_model(data.x_dict, data.edge_index_dict)
        sage_probs = torch.sigmoid(sage_logits[test_mask]).cpu().numpy()

    sage_ci = compute_bootstrap_ci(y_test, sage_probs, n_boot=1000)
    print(f"  GraphSAGE PR-AUC:  {sage_ci['pr_point']:.4f} (95% CI: [{sage_ci['pr_ci'][0]:.4f}, {sage_ci['pr_ci'][1]:.4f}])")
    print(f"  GraphSAGE ROC-AUC: {sage_ci['roc_point']:.4f} (95% CI: [{sage_ci['roc_ci'][0]:.4f}, {sage_ci['roc_ci'][1]:.4f}])")
    print(f"  GraphSAGE Lift:    {sage_ci['lift_point']:.2f}x (95% CI: [{sage_ci['lift_ci'][0]:.2f}x, {sage_ci['lift_ci'][1]:.2f}x])")

    # Statistical Comparison
    print("\n" + "=" * 70)
    print("STATISTICAL COMPARISON (SAME HELD-OUT SYNTHETIC TEST SET, N=10,000)")
    print("=" * 70)
    print(f"{'Model Architecture':<28} {'PR-AUC (95% CI)':<22} {'ROC-AUC (95% CI)':<22} {'Lift (95% CI)':<18}")
    print("-" * 90)
    print(f"{'HeteroGraphSAGE (Baseline)':<28} {sage_ci['pr_point']:.4f} [{sage_ci['pr_ci'][0]:.4f}, {sage_ci['pr_ci'][1]:.4f}]   {sage_ci['roc_point']:.4f} [{sage_ci['roc_ci'][0]:.4f}, {sage_ci['roc_ci'][1]:.4f}]   {sage_ci['lift_point']:.2f}x [{sage_ci['lift_ci'][0]:.2f}x, {sage_ci['lift_ci'][1]:.2f}x]")
    print(f"{'Temporal HeteroGAT (Edge)':<28} {gat_ci['pr_point']:.4f} [{gat_ci['pr_ci'][0]:.4f}, {gat_ci['pr_ci'][1]:.4f}]   {gat_ci['roc_point']:.4f} [{gat_ci['roc_ci'][0]:.4f}, {gat_ci['roc_ci'][1]:.4f}]   {gat_ci['lift_point']:.2f}x [{gat_ci['lift_ci'][0]:.2f}x, {gat_ci['lift_ci'][1]:.2f}x]")
    print("-" * 90)
    
    # Save winning checkpoint
    torch.save({
        "gat_state_dict": gat_model.state_dict(),
        "sage_state_dict": sage_model.state_dict(),
        "gat_metrics": gat_ci,
        "sage_metrics": sage_ci,
    }, MODEL_DIR / "temporal_hgt_ring_detector.pt")
    print(f"  Model artifacts saved to {MODEL_DIR / 'temporal_hgt_ring_detector.pt'}")


if __name__ == '__main__':
    train_and_compare()
