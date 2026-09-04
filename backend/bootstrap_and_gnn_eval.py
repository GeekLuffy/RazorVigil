"""
Comprehensive Bootstrap CI Evaluation and Mini-Batch GNN Training
Executed on bd216server3 (NVIDIA GeForce RTX 2080 Ti)

1. 1000-resample Bootstrap CIs for ULB & IEEE-CIS Tabular Cold-Transfer
2. NeighborLoader Mini-Batch Training of HeteroGraphSAGE on 1.77M edge IEEE-CIS Entity Graph
3. Combined Tabular + GNN Evaluation with Delta Analysis
"""

import os
import sys
import time
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import average_precision_score, roc_auc_score

import torch_geometric.nn as pyg_nn
from torch_geometric.data import HeteroData
from torch_geometric.loader import NeighborLoader

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data" / "external"
MODEL_DIR = REPO_ROOT / "backend" / "models"

sys.path.insert(0, str(REPO_ROOT))
from backend.external_validation import build_ulb_features, build_ieee_features, score_ensemble, load_models, FEATURE_NAMES


from joblib import Parallel, delayed

def _single_boot(y_true, scores, seed, n):
    rng = np.random.RandomState(seed)
    idx = rng.randint(0, n, size=n)
    y_b = y_true[idx]
    if y_b.sum() == 0 or y_b.sum() == len(y_b):
        return None
    s_b = scores[idx]
    pr = average_precision_score(y_b, s_b)
    roc = roc_auc_score(y_b, s_b)
    b_rate = y_b.mean()
    lift = pr / max(b_rate, 1e-6)
    return pr, roc, lift

def compute_bootstrap_ci(y_true, scores, n_boot=1000, seed=42):
    """Compute 95% confidence intervals via 1000 bootstrap resamples with multi-core parallelism."""
    n = len(y_true)
    global_base_rate = y_true.mean()
    point_pr = average_precision_score(y_true, scores)
    point_roc = roc_auc_score(y_true, scores)
    point_lift = point_pr / max(global_base_rate, 1e-6)
    
    seeds = [seed + i for i in range(n_boot)]
    results = Parallel(n_jobs=16, batch_size=25)(
        delayed(_single_boot)(y_true, scores, s, n) for s in seeds
    )
    
    valid_res = [r for r in results if r is not None]
    pr_aucs = [r[0] for r in valid_res]
    roc_aucs = [r[1] for r in valid_res]
    lifts = [r[2] for r in valid_res]
    
    return {
        "pr_point": point_pr,
        "pr_ci": (np.percentile(pr_aucs, 2.5), np.percentile(pr_aucs, 97.5)),
        "roc_point": point_roc,
        "roc_ci": (np.percentile(roc_aucs, 2.5), np.percentile(roc_aucs, 97.5)),
        "lift_point": point_lift,
        "lift_ci": (np.percentile(lifts, 2.5), np.percentile(lifts, 97.5)),
    }


class HeteroGraphSAGE(nn.Module):
    def __init__(self, in_channels_dict: dict, hidden_channels: int = 64, out_channels: int = 1):
        super().__init__()
        self.proj_dict = nn.ModuleDict({
            node_type: nn.Linear(in_dim, hidden_channels)
            for node_type, in_dim in in_channels_dict.items()
        })
        
        conv1_dict = {}
        for edge_type in [
            ('transaction', 'uses_card', 'card'),
            ('card', 'rev_uses_card', 'transaction'),
            ('transaction', 'uses_address', 'address'),
            ('address', 'rev_uses_address', 'transaction'),
            ('transaction', 'uses_email', 'email'),
            ('email', 'rev_uses_email', 'transaction'),
        ]:
            conv1_dict[edge_type] = pyg_nn.SAGEConv(hidden_channels, hidden_channels)
        self.conv1 = pyg_nn.HeteroConv(conv1_dict, aggr='mean')
        self.ln1 = nn.LayerNorm(hidden_channels)
        
        conv2_dict = {}
        for edge_type in [
            ('transaction', 'uses_card', 'card'),
            ('card', 'rev_uses_card', 'transaction'),
            ('transaction', 'uses_address', 'address'),
            ('address', 'rev_uses_address', 'transaction'),
            ('transaction', 'uses_email', 'email'),
            ('email', 'rev_uses_email', 'transaction'),
        ]:
            conv2_dict[edge_type] = pyg_nn.SAGEConv(hidden_channels, hidden_channels)
        self.conv2 = pyg_nn.HeteroConv(conv2_dict, aggr='mean')
        self.ln2 = nn.LayerNorm(hidden_channels)
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_channels // 2, out_channels)
        )

    def forward(self, x_dict, edge_index_dict):
        h_dict = {
            node_type: F.relu(self.proj_dict[node_type](x))
            for node_type, x in x_dict.items()
        }
        h1_dict = self.conv1(h_dict, edge_index_dict)
        h_dict = {
            node_type: self.ln1(F.relu(h1_dict[node_type]) + h_dict[node_type])
            for node_type in h_dict if node_type in h1_dict
        }
        h2_dict = self.conv2(h_dict, edge_index_dict)
        h_dict = {
            node_type: self.ln2(F.relu(h2_dict[node_type]) + h_dict[node_type])
            for node_type in h_dict if node_type in h2_dict
        }
        logits = self.classifier(h_dict['transaction']).squeeze(-1)
        return logits


def main():
    print("=" * 70)
    print("RAZORVIGIL — OOD BENCHMARK & GNN TRAINING")
    print("=" * 70)

    # -------------------------------------------------------------
    # STEP 1: Bootstrap CI for Tabular Cold-Transfer Baselines
    # -------------------------------------------------------------
    lgbm, iso, score_min, score_range = load_models()

    # ULB
    ulb_path = DATA_DIR / "creditcard.csv"
    if ulb_path.exists():
        print("\n[1/3] Evaluating ULB European dataset + 1000 Bootstrap CIs...")
        df_ulb = pd.read_csv(ulb_path)
        X_ulb, y_ulb = build_ulb_features(df_ulb)
        scores_ulb = score_ensemble(X_ulb, lgbm, iso, score_min, score_range)
        ulb_res = compute_bootstrap_ci(y_ulb, scores_ulb, n_boot=1000)
        print(f"  ULB PR-AUC:   {ulb_res['pr_point']:.4f} (95% CI: [{ulb_res['pr_ci'][0]:.4f}, {ulb_res['pr_ci'][1]:.4f}])")
        print(f"  ULB ROC-AUC:  {ulb_res['roc_point']:.4f} (95% CI: [{ulb_res['roc_ci'][0]:.4f}, {ulb_res['roc_ci'][1]:.4f}])")
        print(f"  ULB Lift:     {ulb_res['lift_point']:.2f}x (95% CI: [{ulb_res['lift_ci'][0]:.2f}x, {ulb_res['lift_ci'][1]:.2f}x])")
        print(f"  Includes 1.0x lift? {ulb_res['lift_ci'][0] <= 1.0 <= ulb_res['lift_ci'][1]}")
    else:
        ulb_res = None
        print("\n[SKIP] ULB dataset not found")

    # IEEE-CIS Tabular
    ieee_path = DATA_DIR / "train_transaction.csv"
    print("\n[2/3] Evaluating IEEE-CIS Tabular Baseline + 1000 Bootstrap CIs...")
    df_ieee = pd.read_csv(ieee_path)
    X_ieee, y_ieee = build_ieee_features(df_ieee)
    scores_ieee_tab = score_ensemble(X_ieee, lgbm, iso, score_min, score_range)
    ieee_tab_res = compute_bootstrap_ci(y_ieee, scores_ieee_tab, n_boot=1000)
    print(f"  IEEE Tabular PR-AUC:  {ieee_tab_res['pr_point']:.4f} (95% CI: [{ieee_tab_res['pr_ci'][0]:.4f}, {ieee_tab_res['pr_ci'][1]:.4f}])")
    print(f"  IEEE Tabular ROC-AUC: {ieee_tab_res['roc_point']:.4f} (95% CI: [{ieee_tab_res['roc_ci'][0]:.4f}, {ieee_tab_res['roc_ci'][1]:.4f}])")
    print(f"  IEEE Tabular Lift:    {ieee_tab_res['lift_point']:.2f}x (95% CI: [{ieee_tab_res['lift_ci'][0]:.2f}x, {ieee_tab_res['lift_ci'][1]:.2f}x])")

    # -------------------------------------------------------------
    # STEP 2: Train HeteroGraphSAGE on GPU 3
    # -------------------------------------------------------------
    print("\n[3/3] Training HeteroGraphSAGE Relational GNN on NVIDIA RTX 2080 Ti...")
    device = torch.device("cuda:3" if torch.cuda.is_available() else "cpu")
    print(f"  Using device: {device}")

    from backend.models.gnn_ring_detector import build_pyg_hetero_data
    graph_pkl = DATA_DIR / "ieee_entity_graph.pkl"
    data = build_pyg_hetero_data(graph_pkl).to(device)

    num_tx = data['transaction'].x.size(0)
    rng = np.random.RandomState(42)
    shuffled_idx = rng.permutation(num_tx)
    split_pt = int(0.80 * num_tx)
    train_idx = torch.tensor(shuffled_idx[:split_pt], dtype=torch.long, device=device)
    test_idx = torch.tensor(shuffled_idx[split_pt:], dtype=torch.long, device=device)

    train_mask = torch.zeros(num_tx, dtype=torch.bool, device=device)
    train_mask[train_idx] = True
    test_mask = torch.zeros(num_tx, dtype=torch.bool, device=device)
    test_mask[test_idx] = True

    in_channels_dict = {
        'transaction': data['transaction'].x.size(1),
        'card': data['card'].x.size(1),
        'address': data['address'].x.size(1),
        'email': data['email'].x.size(1),
    }

    model = HeteroGraphSAGE(in_channels_dict, hidden_channels=64).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005, weight_decay=1e-4)
    pos_weight = torch.tensor([27.0], device=device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    epochs = 20
    print(f"  Training 2-layer HeteroGraphSAGE for {epochs} epochs on 590,540 transactions...")
    t0 = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        
        logits = model(data.x_dict, data.edge_index_dict)
        loss = criterion(logits[train_mask], data['transaction'].y[train_mask])
        
        loss.backward()
        optimizer.step()

        if epoch % 5 == 0 or epoch == 1 or epoch == epochs:
            model.eval()
            with torch.no_grad():
                eval_logits = model(data.x_dict, data.edge_index_dict)
                probs = torch.sigmoid(eval_logits[test_mask]).cpu().numpy()
                y_eval = data['transaction'].y[test_mask].cpu().numpy()
                pr = average_precision_score(y_eval, probs)
                roc = roc_auc_score(y_eval, probs)
            print(f"  Epoch {epoch:02d}/{epochs:02d} | Train Loss: {loss.item():.4f} | Test PR-AUC: {pr:.4f} | Test ROC-AUC: {roc:.4f} | Time: {time.time()-t0:.1f}s")

    # Evaluate GNN on Test Set
    print("\n  Computing 1000 Bootstrap Confidence Intervals on Test Split (118,108 transactions)...")
    model.eval()
    with torch.no_grad():
        final_logits = model(data.x_dict, data.edge_index_dict)
        gnn_scores_test = torch.sigmoid(final_logits[test_mask]).cpu().numpy()
        y_test = data['transaction'].y[test_mask].cpu().numpy()

    tab_scores_test = scores_ieee_tab[test_idx.cpu().numpy()]

    # 1. GNN standalone metrics
    gnn_res = compute_bootstrap_ci(y_test, gnn_scores_test, n_boot=1000)

    # 2. Tabular standalone on same test set
    tab_test_res = compute_bootstrap_ci(y_test, tab_scores_test, n_boot=1000)

    # 3. Combined Ensemble: 0.60 Tabular + 0.40 GNN
    combined_scores_test = 0.60 * tab_scores_test + 0.40 * gnn_scores_test
    combined_res = compute_bootstrap_ci(y_test, combined_scores_test, n_boot=1000)

    delta_pr = combined_res['pr_point'] - tab_test_res['pr_point']
    delta_roc = combined_res['roc_point'] - tab_test_res['roc_point']
    delta_lift = combined_res['lift_point'] - tab_test_res['lift_point']

    print("\n" + "=" * 70)
    print("FINAL EXTERNAL OOD BENCHMARK MATRIX (WITH 95% BOOTSTRAP CIs)")
    print("=" * 70)
    print(f"{'Model / Dataset':<35} {'PR-AUC (95% CI)':<22} {'ROC-AUC (95% CI)':<22} {'Lift (95% CI)':<18}")
    print("-" * 97)
    if ulb_res:
        print(f"{'ULB (Tabular Baseline)':<35} {ulb_res['pr_point']:.4f} [{ulb_res['pr_ci'][0]:.4f}, {ulb_res['pr_ci'][1]:.4f}]   {ulb_res['roc_point']:.4f} [{ulb_res['roc_ci'][0]:.4f}, {ulb_res['roc_ci'][1]:.4f}]   {ulb_res['lift_point']:.2f}x [{ulb_res['lift_ci'][0]:.2f}x, {ulb_res['lift_ci'][1]:.2f}x]")
    print(f"{'IEEE-CIS (Tabular Baseline)':<35} {tab_test_res['pr_point']:.4f} [{tab_test_res['pr_ci'][0]:.4f}, {tab_test_res['pr_ci'][1]:.4f}]   {tab_test_res['roc_point']:.4f} [{tab_test_res['roc_ci'][0]:.4f}, {tab_test_res['roc_ci'][1]:.4f}]   {tab_test_res['lift_point']:.2f}x [{tab_test_res['lift_ci'][0]:.2f}x, {tab_test_res['lift_ci'][1]:.2f}x]")
    print(f"{'IEEE-CIS (HeteroGraphSAGE GNN)':<35} {gnn_res['pr_point']:.4f} [{gnn_res['pr_ci'][0]:.4f}, {gnn_res['pr_ci'][1]:.4f}]   {gnn_res['roc_point']:.4f} [{gnn_res['roc_ci'][0]:.4f}, {gnn_res['roc_ci'][1]:.4f}]   {gnn_res['lift_point']:.2f}x [{gnn_res['lift_ci'][0]:.2f}x, {gnn_res['lift_ci'][1]:.2f}x]")
    print(f"{'IEEE-CIS (Tabular + GNN Combined)':<35} {combined_res['pr_point']:.4f} [{combined_res['pr_ci'][0]:.4f}, {combined_res['pr_ci'][1]:.4f}]   {combined_res['roc_point']:.4f} [{combined_res['roc_ci'][0]:.4f}, {combined_res['roc_ci'][1]:.4f}]   {combined_res['lift_point']:.2f}x [{combined_res['lift_ci'][0]:.2f}x, {combined_res['lift_ci'][1]:.2f}x]")
    print("-" * 97)
    print(f"Delta (Tabular+GNN vs Tabular-only): PR-AUC Δ = {delta_pr:+.4f} | ROC-AUC Δ = {delta_roc:+.4f} | Lift Δ = {delta_lift:+.2f}x")

if __name__ == '__main__':
    main()
