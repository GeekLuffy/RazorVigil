import os, sys, time, json, pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import average_precision_score, roc_auc_score, f1_score
from catboost import CatBoostClassifier

# Bind to dedicated GPU 4
os.environ["CUDA_VISIBLE_DEVICES"] = "4"
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"[GPU Trainer] Active Device: {device} (Physical CUDA:4)")
if torch.cuda.is_available():
    print(f"[GPU Trainer] Device Name: {torch.cuda.get_device_name(0)}")
    print(f"[GPU Trainer] VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")

DATA_PATH = "/home/big/razorshield_gpu/synthetic_transactions_50k.csv"
OUTPUT_DIR = "/home/big/razorshield_gpu"

FEATURE_COLS = [
    "amount", "amount_zscore", "hour_sin", "hour_cos", "asn_type_encoded",
    "ja3_ua_mismatch", "keystroke_entropy", "mouse_jitter_score", "paste_event",
    "time_on_page_s", "bin_card_count", "bin_name_count", "ip_distinct_pan_count",
    "device_distinct_bin_count", "device_distinct_ip_count", "cvv_cycle_attempts",
    "cluster_risk_score"
]

df = pd.read_csv(DATA_PATH)
print(f"[GPU Trainer] Loaded dataset: {df.shape[0]} rows, {len(FEATURE_COLS)} features")

X = df[FEATURE_COLS].values.astype(np.float32)
y = df["label"].values.astype(np.float32)

# Strict 3-Way Split: 60% Train, 20% Val, 20% Held-out Test
X_tr, X_temp, y_tr, y_temp = train_test_split(X, y, test_size=0.40, random_state=42, stratify=y)
X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)

print(f"[GPU Trainer] Splits ? Train: {len(X_tr)}, Val: {len(X_val)}, Held-out Test: {len(X_test)}")

# ??? 1. TRAIN REAL CATBOOST ON GPU ???
print("\n>>> [Model 1/2] Training CatBoost Classifier on GPU 4...")
t0 = time.time()
cb = CatBoostClassifier(
    iterations=800,
    learning_rate=0.04,
    depth=6,
    eval_metric="PRAUC",
    task_type="GPU",
    random_seed=42,
    verbose=200
)
cb.fit(X_tr, y_tr, eval_set=(X_val, y_val), early_stopping_rounds=50, verbose=200)
cb_time = time.time() - t0

cb_test_preds = cb.predict_proba(X_test)[:, 1]
cb_pr_auc = float(average_precision_score(y_test, cb_test_preds))
cb_roc_auc = float(roc_auc_score(y_test, cb_test_preds))
print(f"[CatBoost GPU] Finished in {cb_time:.2f}s | Test PR-AUC: {cb_pr_auc:.5f} | Test ROC-AUC: {cb_roc_auc:.5f}")

cb_path = os.path.join(OUTPUT_DIR, "catboost_model.pkl")
with open(cb_path, "wb") as f:
    pickle.dump(cb, f)
print(f"[CatBoost GPU] Saved trained binary to: {cb_path}")

# ??? 2. TRAIN PYTORCH FT-TRANSFORMER ON GPU ???
print("\n>>> [Model 2/2] Training PyTorch FT-Transformer with FP16 on GPU 4...")

class Tokenizer(nn.Module):
    def __init__(self, n_features: int, d_token: int):
        super().__init__()
        self.weight = nn.Parameter(torch.randn(n_features, d_token) * 0.01)
        self.bias = nn.Parameter(torch.zeros(n_features, d_token))
    def forward(self, x):
        return x.unsqueeze(-1) * self.weight.unsqueeze(0) + self.bias.unsqueeze(0)

class TransformerBlock(nn.Module):
    def __init__(self, d_token: int, n_heads: int, d_ffn: int):
        super().__init__()
        self.norm1 = nn.LayerNorm(d_token)
        self.attn = nn.MultiheadAttention(d_token, n_heads, batch_first=True)
        self.norm2 = nn.LayerNorm(d_token)
        self.ffn = nn.Sequential(
            nn.Linear(d_token, d_ffn),
            nn.GELU(),
            nn.Linear(d_ffn, d_token)
        )
    def forward(self, x):
        normed = self.norm1(x)
        attn_out, _ = self.attn(normed, normed, normed)
        x = x + attn_out
        x = x + self.ffn(self.norm2(x))
        return x

class FTTransformer(nn.Module):
    def __init__(self, n_features=17, d_token=64, n_blocks=3, n_heads=4):
        super().__init__()
        self.tokenizer = Tokenizer(n_features, d_token)
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_token) * 0.02)
        self.blocks = nn.ModuleList([
            TransformerBlock(d_token, n_heads, d_token * 4) for _ in range(n_blocks)
        ])
        self.norm = nn.LayerNorm(d_token)
        self.head = nn.Linear(d_token, 1)

    def forward(self, x):
        b = x.shape[0]
        tokens = self.tokenizer(x)
        cls = self.cls_token.expand(b, -1, -1)
        x_tok = torch.cat([cls, tokens], dim=1)
        for block in self.blocks:
            x_tok = block(x_tok)
        x_norm = self.norm(x_tok[:, 0])
        logits = self.head(x_norm).squeeze(-1)
        return torch.sigmoid(logits), x_norm

ft_model = FTTransformer(n_features=17, d_token=64, n_blocks=3, n_heads=4).to(device)
criterion = nn.BCELoss()
optimizer = torch.optim.AdamW(ft_model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=20)

train_loader = DataLoader(
    TensorDataset(torch.tensor(X_tr), torch.tensor(y_tr)),
    batch_size=128, shuffle=True
)
val_tensor = torch.tensor(X_val, device=device)
test_tensor = torch.tensor(X_test, device=device)

t0_ft = time.time()
best_val_pr = 0.0
best_state = None

for epoch in range(1, 21):
    ft_model.train()
    for batch_x, batch_y in train_loader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.to(device)
        optimizer.zero_grad()
        preds, _ = ft_model(batch_x)
        loss = criterion(preds, batch_y)
        loss.backward()
        optimizer.step()
    scheduler.step()

    ft_model.eval()
    with torch.no_grad():
        val_preds, _ = ft_model(val_tensor)
        val_pr = average_precision_score(y_val, val_preds.cpu().numpy())
        if val_pr > best_val_pr:
            best_val_pr = val_pr
            best_state = {k: v.cpu() for k, v in ft_model.state_dict().items()}
    if epoch % 5 == 0 or epoch == 20:
        print(f"[FT-Transformer Epoch {epoch:02d}/20] Val PR-AUC: {val_pr:.5f}")

ft_time = time.time() - t0_ft

ft_model.load_state_dict(best_state)
ft_model.to(device)
ft_model.eval()
with torch.no_grad():
    test_preds, _ = ft_model(test_tensor)
    ft_test_pr = float(average_precision_score(y_test, test_preds.cpu().numpy()))
    ft_test_roc = float(roc_auc_score(y_test, test_preds.cpu().numpy()))

print(f"[FT-Transformer GPU] Finished in {ft_time:.2f}s | Test PR-AUC: {ft_test_pr:.5f} | Test ROC-AUC: {ft_test_roc:.5f}")

ft_path = os.path.join(OUTPUT_DIR, "ft_transformer_model.pt")
torch.save(best_state, ft_path)
print(f"[FT-Transformer GPU] Saved model state_dict to: {ft_path}")

# ??? 3. SPLIT CONFORMAL CALIBRATION ???
with torch.no_grad():
    val_probs, _ = ft_model(val_tensor)
    val_probs = val_probs.cpu().numpy()
nonconformity_scores = np.abs(y_val - val_probs)
alpha = 0.05
n_cal = len(nonconformity_scores)
k = int(np.ceil((n_cal + 1) * (1 - alpha)))
q_hat = float(np.sort(nonconformity_scores)[min(k - 1, n_cal - 1)])
print(f"[Conformal Calibration] 95% Confidence Threshold q_hat: {q_hat:.5f}")

# ??? 4. WRITE CONSOLIDATED METRICS JSON ???
results = {
    "status": "success",
    "host": "bd216server3",
    "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    "gpu_vram_gb": round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2) if torch.cuda.is_available() else 0,
    "catboost_test_pr_auc": cb_pr_auc,
    "catboost_test_roc_auc": cb_roc_auc,
    "ft_transformer_test_pr_auc": ft_test_pr,
    "ft_transformer_test_roc_auc": ft_test_roc,
    "conformal_q_hat_95": q_hat,
    "calibration_samples": n_cal,
    "test_samples": len(X_test),
    "training_time_sec": round(cb_time + ft_time, 2),
    "timestamp": time.time()
}

results_path = os.path.join(OUTPUT_DIR, "gpu_cluster_training_results.json")
with open(results_path, "w") as f:
    json.dump(results, f, indent=2)
print(f"[Results] Exported results to: {results_path}")
print("=== GPU TRAINING COMPLETED WITH 100% SUCCESS ===")
