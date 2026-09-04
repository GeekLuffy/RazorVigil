import os
import sys
import time
import json
import pickle
import subprocess
from typing import List, Dict, Any, Optional

import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Bind to dedicated GPU 4
os.environ["CUDA_VISIBLE_DEVICES"] = "4"
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

app = FastAPI(title="RazorVigil GPU Inference Daemon", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = "/home/big/razorvigil_gpu"
CB_PATH = os.path.join(MODELS_DIR, "catboost_model.pkl")
FT_PATH = os.path.join(MODELS_DIR, "ft_transformer_model.pt")

# Architecture matching FTTransformer
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

# Global models
catboost_model = None
ft_model = None
conformal_q_hat = 0.02489

def load_models():
    global catboost_model, ft_model, conformal_q_hat
    if os.path.exists(CB_PATH):
        with open(CB_PATH, "rb") as f:
            catboost_model = pickle.load(f)
        print(f"[GPU Daemon] Loaded CatBoost from {CB_PATH}")
    else:
        print(f"[GPU Daemon] Warning: {CB_PATH} not found")

    if os.path.exists(FT_PATH):
        try:
            m = FTTransformer(n_features=17, d_token=64, n_blocks=3, n_heads=4)
            st = torch.load(FT_PATH, map_location=device)
            m.load_state_dict(st)
            m.to(device)
            m.eval()
            ft_model = m
            print(f"[GPU Daemon] Loaded FT-Transformer onto {device}")
        except Exception as e:
            print(f"[GPU Daemon] Failed to load FT-Transformer: {e}")

load_models()

class PredictRequest(BaseModel):
    features: List[float]

class BatchPredictRequest(BaseModel):
    batch: List[List[float]]

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "online",
        "host": "bd216server3",
        "device": str(device),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "catboost_ready": catboost_model is not None,
        "ft_transformer_ready": ft_model is not None,
        "version": "2.0.0"
    }

@app.get("/gpu/metrics")
def get_gpu_metrics():
    """Reads real-time hardware telemetry across all 6 RTX 2080 Ti GPUs and system resources."""
    gpus_data = []
    try:
        # Query nvidia-smi with CSV output for precision
        cmd = [
            "nvidia-smi",
            "--query-gpu=index,name,temperature.gpu,fan.speed,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,power.draw",
            "--format=csv,noheader,nounits"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
        for line in res.stdout.strip().split("\n"):
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 10:
                gpus_data.append({
                    "index": int(parts[0]),
                    "name": parts[1],
                    "temp_c": int(parts[2]) if parts[2] != "[Not Supported]" else 0,
                    "fan_pct": int(parts[3]) if parts[3] != "[Not Supported]" else 0,
                    "util_pct": int(parts[4]) if parts[4] != "[Not Supported]" else 0,
                    "mem_util_pct": int(parts[5]) if parts[5] != "[Not Supported]" else 0,
                    "mem_total_mb": int(parts[6]),
                    "mem_used_mb": int(parts[7]),
                    "mem_free_mb": int(parts[8]),
                    "power_w": float(parts[9]) if parts[9] != "[Not Supported]" else 0.0
                })
    except Exception as e:
        print("nvidia-smi query error:", e)

    # Read system memory
    mem_info = {"total_gb": 503.0, "used_gb": 38.0, "free_gb": 465.0}
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
        vals = {}
        for l in lines:
            parts = l.split(":")
            if len(parts) == 2:
                vals[parts[0].strip()] = int(parts[1].replace("kB", "").strip())
        tot = vals.get("MemTotal", 0) / (1024 * 1024)
        free = vals.get("MemAvailable", 0) / (1024 * 1024)
        mem_info = {
            "total_gb": round(tot, 1),
            "free_gb": round(free, 1),
            "used_gb": round(tot - free, 1)
        }
    except Exception as e:
        pass

    # Read CPU load
    cpu_load = [0.0, 0.0, 0.0]
    try:
        cpu_load = [round(x, 2) for x in os.getloadavg()]
    except:
        pass

    return {
        "status": "healthy",
        "host": "bd216server3",
        "timestamp": time.time(),
        "total_gpus": len(gpus_data),
        "gpus": gpus_data,
        "system": {
            "cpu_cores": 104,
            "load_avg": cpu_load,
            "memory": mem_info
        }
    }

@app.post("/gpu/predict")
def predict(req: PredictRequest):
    """Real sub-millisecond GPU inference."""
    t0 = time.perf_counter()
    vec = np.array(req.features, dtype=np.float32).reshape(1, -1)
    
    cb_prob = 0.5
    if catboost_model is not None:
        try:
            cb_prob = float(catboost_model.predict_proba(vec)[0][1])
        except Exception as e:
            pass

    ft_prob = 0.5
    if ft_model is not None:
        try:
            with torch.no_grad():
                x_t = torch.tensor(vec, device=device)
                pred, _ = ft_model(x_t)
                ft_prob = float(pred.item())
        except Exception as e:
            pass

    latency_ms = (time.perf_counter() - t0) * 1000.0

    return {
        "catboost_prob": round(cb_prob, 5),
        "ft_transformer_prob": round(ft_prob, 5),
        "conformal_q_hat": conformal_q_hat,
        "device": str(device),
        "latency_ms": round(latency_ms, 3)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8889, log_level="warning")
