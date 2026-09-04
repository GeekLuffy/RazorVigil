"""
RazorVigil — Autonomous Feature Discovery Engine.

Computes candidate behavioral and structural features using strictly pre-decision 
information, followed by non-parametric RandomForestClassifier importance screening.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "transactions.csv"
if not DATA_PATH.exists():
    DATA_PATH = Path(__file__).resolve().parents[2] / "backend" / "dataset" / "synthetic_transactions_50k.csv"

BASE_FEATURE_COLS = [
    "amount", "time_on_page_s", "keystroke_entropy", "mouse_jitter_score",
    "paste_event", "ja3_ua_mismatch", "bin_card_count", "bin_name_count",
    "ip_distinct_pan_count", "device_distinct_bin_count", "device_distinct_ip_count",
    "cvv_cycle_attempts", "cluster_risk_score"
]

CANDIDATE_FEATURE_DESCRIPTIONS = {
    "amount_velocity": "Monetary speed ratio (amount / time_on_page_s) — detects rapid checkout automation",
    "ring_density": "Combined device + IP fanout cardinality — isolates coordinated carding rings",
    "burst_ratio": "Card attempt rate relative to session duration — isolates automated card testing bots",
    "dual_sharing_signal": "Binary flag for concurrent multi-card device and IP overlap",
    "biometric_bot_score": "Composite heuristic combining low keystroke entropy and sub-human mouse jitter",
    "tls_proxy_risk": "Compound signal coupling TLS JA4 spoofing with rotating proxy IP usage",
}

DISCOVERY_THRESHOLD = 0.015


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute candidate engineered features from base transaction properties."""
    df = df.copy()
    safe_time = df["time_on_page_s"].clip(lower=0.5) if "time_on_page_s" in df.columns else pd.Series(1.0, index=df.index)
    
    # 1. Amount velocity
    amount_col = df["amount"] if "amount" in df.columns else pd.Series(100.0, index=df.index)
    df["amount_velocity"] = amount_col / safe_time
    
    # 2. Ring density
    dev_pan = df["device_distinct_pan_count"] if "device_distinct_pan_count" in df.columns else pd.Series(1, index=df.index)
    ip_pan = df["ip_distinct_pan_count"] if "ip_distinct_pan_count" in df.columns else pd.Series(1, index=df.index)
    df["ring_density"] = dev_pan + ip_pan
    
    # 3. Burst ratio
    bin_cards = df["bin_card_count"] if "bin_card_count" in df.columns else pd.Series(1, index=df.index)
    df["burst_ratio"] = bin_cards / safe_time
    
    # 4. Dual sharing signal
    df["dual_sharing_signal"] = ((dev_pan > 1) & (ip_pan > 1)).astype(float)
    
    # 5. Biometric bot score
    entropy = df["keystroke_entropy"] if "keystroke_entropy" in df.columns else pd.Series(2.0, index=df.index)
    jitter = df["mouse_jitter_score"] if "mouse_jitter_score" in df.columns else pd.Series(0.5, index=df.index)
    df["biometric_bot_score"] = ((entropy < 1.0) & (jitter < 0.25)).astype(float)
    
    # 6. TLS Proxy risk
    mismatch = df["ja3_ua_mismatch"].astype(float) if "ja3_ua_mismatch" in df.columns else pd.Series(0.0, index=df.index)
    dev_ip = df["device_distinct_ip_count"] if "device_distinct_ip_count" in df.columns else pd.Series(1, index=df.index)
    df["tls_proxy_risk"] = mismatch * (dev_ip > 2).astype(float)
    
    return df


def discover_features(data_path: Path = DATA_PATH) -> dict:
    """Run automated importance screening over engineered candidate features."""
    if not data_path.exists():
        from backend.dataset.generate_dataset_polars import generate_dataset
        df_pl = generate_dataset(n_rows=10000, seed=42)
        df_pl.write_csv(data_path)

    df = pd.read_csv(data_path)
    if "label" not in df.columns and "is_fraud" in df.columns:
        df["label"] = df["is_fraud"]

    df = add_engineered_features(df)
    candidate_cols = list(CANDIDATE_FEATURE_DESCRIPTIONS.keys())
    
    available_base = [c for c in BASE_FEATURE_COLS if c in df.columns]
    all_eval_cols = available_base + candidate_cols

    X = df[all_eval_cols].fillna(0).values.astype(np.float32)
    y = df["label"].values.astype(int)

    rf = RandomForestClassifier(n_estimators=150, max_depth=6, random_state=42, class_weight="balanced")
    rf.fit(X, y)
    importances = dict(zip(all_eval_cols, rf.feature_importances_.tolist()))

    accepted = [c for c in candidate_cols if importances.get(c, 0.0) >= DISCOVERY_THRESHOLD]

    return {
        "candidates_tested": [
            {
                "feature": c,
                "description": CANDIDATE_FEATURE_DESCRIPTIONS[c],
                "importance": round(importances.get(c, 0.0), 4),
                "accepted": c in accepted,
            }
            for c in candidate_cols
        ],
        "base_feature_importances": {c: round(importances.get(c, 0.0), 4) for c in available_base},
        "accepted_features": accepted,
        "screening_method": f"RandomForestClassifier(n_estimators=150, max_depth=6), threshold >= {DISCOVERY_THRESHOLD}",
    }
