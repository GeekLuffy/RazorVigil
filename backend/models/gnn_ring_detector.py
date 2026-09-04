"""
Heterogeneous Graph Neural Network (Hetero-GraphSAGE) for Carding Ring Detection.
GPU-Accelerated PyTorch / PyTorch Geometric Architecture for RazorVigil.

Graph Schema:
  - Node types: 'transaction', 'card', 'address', 'email'
  - Edge types:
      ('transaction', 'uses_card', 'card')
      ('card', 'rev_uses_card', 'transaction')
      ('transaction', 'uses_address', 'address')
      ('address', 'rev_uses_address', 'transaction')
      ('transaction', 'uses_email', 'email')
      ('email', 'rev_uses_email', 'transaction')

Loss: Focal Loss / Scaled Binary Cross Entropy for high class-imbalance (3.5% fraud).
Hardware Target: Multi-GPU (NVIDIA RTX 2080 Ti / CUDA).
"""

import os
import time
import pickle
import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import average_precision_score, roc_auc_score, f1_score

try:
    import torch_geometric.nn as pyg_nn
    from torch_geometric.data import HeteroData
    from torch_geometric.loader import NeighborLoader
    PYG_AVAILABLE = True
except ImportError:
    PYG_AVAILABLE = False


class HeteroGraphSAGE(nn.Module):
    """
    2-Layer Relational GraphSAGE for Bipartite Transaction-Entity Networks.
    Learns 64-dimensional structural ring representations.
    """
    def __init__(self, in_channels_dict: dict, hidden_channels: int = 64, out_channels: int = 1):
        super().__init__()
        
        # 1. Project raw node features to uniform hidden dimension
        self.proj_dict = nn.ModuleDict({
            node_type: nn.Linear(in_dim, hidden_channels)
            for node_type, in_dim in in_channels_dict.items()
        })
        
        # 2. Relational Conv Layer 1
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
        
        # 3. Relational Conv Layer 2
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
        
        # 4. Classification Head for Transaction Nodes
        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_channels // 2, out_channels)
        )

    def forward(self, x_dict, edge_index_dict):
        # Initial projection
        h_dict = {
            node_type: F.relu(self.proj_dict[node_type](x))
            for node_type, x in x_dict.items()
        }
        
        # Layer 1
        h1_dict = self.conv1(h_dict, edge_index_dict)
        h_dict = {
            node_type: self.ln1(F.relu(h1_dict[node_type]) + h_dict[node_type])
            for node_type in h_dict if node_type in h1_dict
        }
        
        # Layer 2
        h2_dict = self.conv2(h_dict, edge_index_dict)
        h_dict = {
            node_type: self.ln2(F.relu(h2_dict[node_type]) + h_dict[node_type])
            for node_type in h_dict if node_type in h2_dict
        }
        
        # Classify transaction nodes
        tx_emb = h_dict['transaction']
        logits = self.classifier(tx_emb).squeeze(-1)
        return logits, tx_emb


def build_pyg_hetero_data(graph_pkl_path: Path) -> HeteroData:
    """Load serialized graph pickle and construct PyTorch Geometric HeteroData object."""
    print(f"Loading raw graph pickle from {graph_pkl_path}...")
    with open(graph_pkl_path, 'rb') as f:
        graph = pickle.load(f)
    
    edge_list = graph['edge_list']
    node_meta = graph['node_meta']
    
    print(f"Constructing HeteroData: {len(node_meta):,} nodes, {len(edge_list):,} edges...")
    
    # Node index mapping
    tx_map = {}
    card_map = {}
    addr_map = {}
    email_map = {}
    
    tx_features = []
    tx_labels = []
    
    for name, meta in node_meta.items():
        ntype = meta['type']
        if ntype == 'transaction':
            idx = len(tx_map)
            tx_map[name] = idx
            tx_features.append([meta.get('amount', 0.0), np.log1p(max(0.0, meta.get('amount', 0.0)))])
            tx_labels.append(meta.get('is_fraud', 0))
        elif ntype == 'card':
            card_map[name] = len(card_map)
        elif ntype == 'address':
            addr_map[name] = len(addr_map)
        elif ntype == 'email_domain':
            email_map[name] = len(email_map)
            
    data = HeteroData()
    data['transaction'].x = torch.tensor(tx_features, dtype=torch.float32)
    data['transaction'].y = torch.tensor(tx_labels, dtype=torch.float32)
    
    # Entity initial embeddings (learnable or degree-based)
    data['card'].x = torch.ones((len(card_map), 2), dtype=torch.float32)
    data['address'].x = torch.ones((len(addr_map), 2), dtype=torch.float32)
    data['email'].x = torch.ones((len(email_map), 2), dtype=torch.float32)
    
    # Build edges
    tx_card_src, tx_card_dst = [], []
    tx_addr_src, tx_addr_dst = [], []
    tx_email_src, tx_email_dst = [], []
    
    for src, dst, rel in edge_list:
        if rel == 'uses_card' and src in tx_map and dst in card_map:
            tx_card_src.append(tx_map[src])
            tx_card_dst.append(card_map[dst])
        elif rel == 'uses_address' and src in tx_map and dst in addr_map:
            tx_addr_src.append(tx_map[src])
            tx_addr_dst.append(addr_map[dst])
        elif rel == 'uses_email_domain' and src in tx_map and dst in email_map:
            tx_email_src.append(tx_map[src])
            tx_email_dst.append(email_map[dst])
            
    data['transaction', 'uses_card', 'card'].edge_index = torch.tensor([tx_card_src, tx_card_dst], dtype=torch.long)
    data['card', 'rev_uses_card', 'transaction'].edge_index = torch.tensor([tx_card_dst, tx_card_src], dtype=torch.long)
    
    data['transaction', 'uses_address', 'address'].edge_index = torch.tensor([tx_addr_src, tx_addr_dst], dtype=torch.long)
    data['address', 'rev_uses_address', 'transaction'].edge_index = torch.tensor([tx_addr_dst, tx_addr_src], dtype=torch.long)
    
    data['transaction', 'uses_email', 'email'].edge_index = torch.tensor([tx_email_src, tx_email_dst], dtype=torch.long)
    data['email', 'rev_uses_email', 'transaction'].edge_index = torch.tensor([tx_email_dst, tx_email_src], dtype=torch.long)
    
    return data


def train_gnn(epochs: int = 15, lr: float = 0.005, gpu_id: int = 0):
    if not PYG_AVAILABLE:
        print("ERROR: torch_geometric not installed.")
        return
        
    device = torch.device(f"cuda:{gpu_id}" if torch.cuda.is_available() else "cpu")
    print(f"\n=======================================================")
    print(f"RAZORVIGIL GNN RING DETECTOR TRAINING (GPU: {device})")
    print(f"=======================================================")
    
    graph_path = Path("data/external/ieee_entity_graph.pkl")
    if not graph_path.exists():
        print(f"Graph file not found at {graph_path}. Run external_validation.py first.")
        return
        
    data = build_pyg_hetero_data(graph_path).to(device)
    
    num_tx = data['transaction'].x.size(0)
    train_mask = torch.rand(num_tx, device=device) < 0.80
    test_mask = ~train_mask
    
    in_channels_dict = {
        'transaction': data['transaction'].x.size(1),
        'card': data['card'].x.size(1),
        'address': data['address'].x.size(1),
        'email': data['email'].x.size(1),
    }
    
    model = HeteroGraphSAGE(in_channels_dict, hidden_channels=64).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    
    # Class imbalance weighting (3.5% fraud -> ~27x positive weight)
    pos_weight = torch.tensor([27.0], device=device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    
    print(f"Starting GNN Training for {epochs} epochs on {num_tx:,} transactions...")
    t0 = time.time()
    
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        
        logits, _ = model(data.x_dict, data.edge_index_dict)
        loss = criterion(logits[train_mask], data['transaction'].y[train_mask])
        
        loss.backward()
        optimizer.step()
        
        # Evaluate
        model.eval()
        with torch.no_grad():
            eval_logits, _ = model(data.x_dict, data.edge_index_dict)
            probs = torch.sigmoid(eval_logits[test_mask]).cpu().numpy()
            y_test = data['transaction'].y[test_mask].cpu().numpy()
            
            pr_auc = average_precision_score(y_test, probs)
            roc_auc = roc_auc_score(y_test, probs)
            
        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {loss.item():.4f} | Test PR-AUC: {pr_auc:.4f} | Test ROC-AUC: {roc_auc:.4f}")
        
    total_time = time.time() - t0
    print(f"\nGNN Training Completed in {total_time:.2f}s!")
    
    out_dir = Path("backend/models")
    out_dir.mkdir(parents=True, exist_ok=True)
    save_path = out_dir / "gnn_ring_detector.pt"
    torch.save(model.state_dict(), save_path)
    print(f"Model weights saved -> {save_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=15)
    parser.add_argument('--gpu', type=int, default=3)
    args = parser.parse_args()
    train_gnn(epochs=args.epochs, gpu_id=args.gpu)
