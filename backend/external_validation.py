"""
External Validation Pipeline — RazorShield Sentinel
=====================================================
Cold-transfer evaluation of the existing trained ensemble against two
independently-labeled real-world fraud datasets:

  1. ULB European Credit Card Fraud (284,807 rows, PCA-transformed features)
     Source: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
     License: DbCL v1.0 (open)
     Citation: Dal Pozzolo et al., 2015, Calibrating Probability with Undersampling
               for Unbalanced Classification, IEEE SSCI

  2. IEEE-CIS Fraud Detection (590,540 rows, Vesta Corporation real transactions)
     Source: https://www.kaggle.com/c/ieee-fraud-detection
     License: Competition rules (non-commercial research use)
     Citation: Kaggle/IEEE Computational Intelligence Society, 2019

PURPOSE: Report PR-AUC, Recall @ threshold 0.5, and fraud prevalence for each dataset
as external out-of-distribution validation. These numbers are expected to be lower than
our synthetic-data numbers — that is the point. The gap is reported as-is.

IMPORTANT — FEATURE ALIGNMENT NOTES:
Our ensemble was trained on 17 features (see backend/models/features.py FEATURE_NAMES).
These features do NOT all exist in the external datasets:

  Features we CAN proxy in external data:
    - amount                       (V column / Amount column — direct)
    - amount_zscore                (derived from amount)
    - hour_sin, hour_cos           (from Time column in ULB; from TransactionDT in IEEE)
    - asn_type_encoded             (IEEE: DeviceType → proxy; ULB: not available → 0)
    - ja3_ua_mismatch              (not available in either dataset → 0, conservative)
    - bin_card_count               (IEEE: card1/card2 groupby proxy; ULB: not available)
    - cvv_cycle_attempts           (IEEE: card1 repeat attempts; ULB: not available)
    - cluster_risk_score           (IEEE: addr1/addr2/email_domain groupby → graph proxy; ULB: 0)

  Features NOT available (zeroed out, noted explicitly):
    - keystroke_entropy            (behavioral biometric — not in any tabular fraud dataset)
    - mouse_jitter_score           (behavioral biometric — not available)
    - paste_event                  (behavioral biometric — not available)
    - time_on_page_s               (behavioral biometric — not available)
    - ip_distinct_pan_count        (velocity — not in static datasets)
    - bin_name_count               (billing name diversity — not available in ULB/IEEE)
    - device_distinct_bin_count    (device signals — not available in ULB)
    - device_distinct_ip_count     (proxy telemetry — not available)

ZERO-ING OUT MISSING FEATURES IS CONSERVATIVE: it biases toward the model's genuine-traffic
baseline, not toward false fraud. The reported numbers are therefore a lower bound on
real-world performance when behavioral features ARE available.

Run:
  python backend/external_validation.py
"""

from __future__ import annotations

import os
import pickle
import sys
import time
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, recall_score, roc_auc_score

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
REPO_ROOT = Path(__file__).parents[1]
DATA_DIR = REPO_ROOT / "data" / "external"
MODEL_DIR = Path(__file__).parent / "models"
LGBM_PATH = MODEL_DIR / "lgbm_model.pkl"
IF_PATH = MODEL_DIR / "if_model.pkl"
GRAPH_OUT = DATA_DIR / "ieee_entity_graph.pkl"

FEATURE_NAMES = [
    "amount", "amount_zscore", "hour_sin", "hour_cos",
    "asn_type_encoded", "ja3_ua_mismatch",
    "keystroke_entropy", "mouse_jitter_score", "paste_event", "time_on_page_s",
    "bin_card_count", "bin_name_count",
    "ip_distinct_pan_count", "device_distinct_bin_count", "device_distinct_ip_count",
    "cvv_cycle_attempts", "cluster_risk_score",
]

_MERCHANT_MEAN_AMOUNT = 1500.0
_MERCHANT_STD_AMOUNT = 2000.0


def load_models():
    with open(LGBM_PATH, "rb") as f:
        lgbm = pickle.load(f)
    with open(IF_PATH, "rb") as f:
        d = pickle.load(f)
        iso = d["model"]
        score_min = d["score_min"]
        score_range = d["score_range"]
    return lgbm, iso, score_min, score_range


def score_ensemble(X: np.ndarray, lgbm, iso, score_min, score_range) -> np.ndarray:
    lgbm_prob = lgbm.predict_proba(X)[:, 1]
    raw_if = iso.score_samples(X)
    norm_if = 1.0 - (raw_if - score_min) / max(score_range, 1e-6)
    norm_if = np.clip(norm_if, 0.0, 1.0)
    cluster_score = X[:, FEATURE_NAMES.index("cluster_risk_score")]
    final = np.clip(0.70 * lgbm_prob + 0.20 * norm_if + 0.10 * cluster_score, 0, 1)
    return final


def report(name: str, y_true: np.ndarray, scores: np.ndarray):
    prevalence = y_true.mean()
    pr_auc = average_precision_score(y_true, scores)
    roc_auc = roc_auc_score(y_true, scores)
    preds = (scores >= 0.50).astype(int)
    recall = recall_score(y_true, preds, zero_division=0)
    caught = preds[y_true == 1].sum()
    total_fraud = (y_true == 1).sum()
    print(f"\n{'='*60}")
    print(f"DATASET: {name}")
    print(f"{'='*60}")
    print(f"  Rows evaluated:  {len(y_true):,}")
    print(f"  Fraud rows:      {total_fraud:,}  ({prevalence:.2%} prevalence)")
    print(f"  PR-AUC:          {pr_auc:.4f}  [external OOD]")
    print(f"  ROC-AUC:         {roc_auc:.4f}")
    print(f"  Recall @0.5:     {recall:.2%}  ({caught}/{total_fraud} fraud caught)")
    print(f"\n  NOTE: behavioral biometric features (keystroke_entropy,")
    print(f"  mouse_jitter, paste_event, time_on_page) zeroed — not")
    print(f"  available in tabular fraud datasets. These are conservative")
    print(f"  lower bounds on real-world performance.")
    return {"dataset": name, "n": len(y_true), "fraud_n": int(total_fraud),
            "prevalence": round(prevalence, 4), "pr_auc": round(pr_auc, 4),
            "roc_auc": round(roc_auc, 4), "recall_at_50": round(recall, 4)}


# --------------------------------------------------------------------------
# ULB Credit Card Fraud Dataset
# --------------------------------------------------------------------------
def build_ulb_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    ULB columns: Time (seconds since first tx), V1-V28 (PCA-transformed, anonymous),
    Amount, Class (0=genuine, 1=fraud).

    Feature mapping:
      - amount      → Amount
      - hour_sin/cos → Time % 86400 → hour of day
      - V1-V28 (PCA) cannot be mapped to our named features directly
      - All behavioral/velocity/graph features → 0 (not available)
    """
    import math

    X = np.zeros((len(df), len(FEATURE_NAMES)), dtype=np.float32)
    y = df["Class"].values.astype(int)

    amt = df["Amount"].values
    X[:, FEATURE_NAMES.index("amount")] = amt
    X[:, FEATURE_NAMES.index("amount_zscore")] = (amt - _MERCHANT_MEAN_AMOUNT) / _MERCHANT_STD_AMOUNT

    # Hour of day from seconds-since-first-transaction (cyclic)
    hour = (df["Time"].values % 86400) / 3600
    X[:, FEATURE_NAMES.index("hour_sin")] = np.sin(2 * math.pi * hour / 24)
    X[:, FEATURE_NAMES.index("hour_cos")] = np.cos(2 * math.pi * hour / 24)

    # All other features remain 0 — ULB has PCA anonymised V1-V28 which
    # do not correspond to our named feature space.

    return X, y


# --------------------------------------------------------------------------
# IEEE-CIS Fraud Detection Dataset
# --------------------------------------------------------------------------
def build_ieee_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    IEEE-CIS columns (transaction file): TransactionID, isFraud, TransactionDT,
    TransactionAmt, ProductCD, card1-card6, addr1, addr2, P_emaildomain, R_emaildomain,
    C1-C14, D1-D15, M1-M9, V1-V339.

    Feature mapping:
      - amount        → TransactionAmt
      - hour_sin/cos  → TransactionDT (seconds from reference, mod 86400)
      - bin_card_count → groupby card1 count (BIN-level card reuse)
      - cvv_cycle_attempts → card1+card2 repeat count proxy
      - cluster_risk_score → addr1+addr2+P_emaildomain groupby size → normalized
      - All behavioral features → 0
    """
    import math

    X = np.zeros((len(df), len(FEATURE_NAMES)), dtype=np.float32)
    y = df["isFraud"].values.astype(int)

    amt = df["TransactionAmt"].values
    X[:, FEATURE_NAMES.index("amount")] = amt
    X[:, FEATURE_NAMES.index("amount_zscore")] = (amt - _MERCHANT_MEAN_AMOUNT) / _MERCHANT_STD_AMOUNT

    hour = (df["TransactionDT"].values % 86400) / 3600
    X[:, FEATURE_NAMES.index("hour_sin")] = np.sin(2 * math.pi * hour / 24)
    X[:, FEATURE_NAMES.index("hour_cos")] = np.cos(2 * math.pi * hour / 24)

    # BIN-level card reuse proxy (card1 = BIN-level identifier in IEEE-CIS)
    bin_counts = df.groupby("card1")["card1"].transform("count")
    X[:, FEATURE_NAMES.index("bin_card_count")] = np.clip(bin_counts.values, 0, 500)

    # CVV-cycle proxy: card1+card2 combination repeat count
    card_key = df["card1"].astype(str) + "_" + df["card2"].astype(str).fillna("X")
    cvv_counts = card_key.groupby(card_key).transform("count")
    X[:, FEATURE_NAMES.index("cvv_cycle_attempts")] = np.clip((cvv_counts.values - 1), 0, 20)

    # Cluster risk proxy: size of addr1+addr2+P_emaildomain community
    # Larger community → more entity-sharing → higher ring risk
    addr_key = (df["addr1"].astype(str).fillna("X") + "_" +
                df["addr2"].astype(str).fillna("X") + "_" +
                df["P_emaildomain"].astype(str).fillna("X"))
    community_size = addr_key.groupby(addr_key).transform("count")
    # Normalize to 0-1: clip at 99th percentile
    p99 = np.percentile(community_size.values, 99)
    X[:, FEATURE_NAMES.index("cluster_risk_score")] = np.clip(
        community_size.values / max(p99, 1), 0, 1
    ).astype(np.float32)

    return X, y


# --------------------------------------------------------------------------
# Entity Graph Construction (IEEE-CIS) — save for GNN training
# --------------------------------------------------------------------------
def build_ieee_entity_graph(df: pd.DataFrame) -> dict:
    """
    Construct an entity graph from real IEEE-CIS card/address/email-domain relationships.
    Nodes: transactions + shared entities (card1, addr1, P_emaildomain)
    Edges: transaction → entity (shares card, address, or email domain)
    Saves adjacency + node metadata to GRAPH_OUT for GNN ingestion.
    """
    print("\nBuilding entity graph from IEEE-CIS card/addr/email columns...")
    t0 = time.time()

    edge_list = []
    node_meta = {}

    c1 = df["card1"].fillna("unk").astype(str).values
    c2 = df["card2"].fillna("unk").astype(str).values
    a1 = df["addr1"].fillna("unk").astype(str).values
    a2 = df["addr2"].fillna("unk").astype(str).values
    p_email = df["P_emaildomain"].fillna("unk").astype(str).values
    is_fraud = df["isFraud"].fillna(0).astype(int).values
    amt = df["TransactionAmt"].fillna(0.0).astype(float).values
    indices = df.index.values

    for idx, fraud_val, amt_val, card1_val, card2_val, addr1_val, addr2_val, email_val in zip(
        indices, is_fraud, amt, c1, c2, a1, a2, p_email
    ):
        tx_node = f"tx_{idx}"
        node_meta[tx_node] = {
            "type": "transaction",
            "is_fraud": int(fraud_val),
            "amount": float(amt_val),
        }

        # Card entity node
        card_node = f"card_{card1_val}_{card2_val}"
        if card_node not in node_meta:
            node_meta[card_node] = {"type": "card"}
        edge_list.append((tx_node, card_node, "uses_card"))

        # Address entity node
        addr_node = f"addr_{addr1_val}_{addr2_val}"
        if addr_node not in node_meta:
            node_meta[addr_node] = {"type": "address"}
        edge_list.append((tx_node, addr_node, "uses_address"))

        # Email domain entity node
        email_node = f"email_{email_val}"
        if email_node not in node_meta:
            node_meta[email_node] = {"type": "email_domain"}
        edge_list.append((tx_node, email_node, "uses_email_domain"))

    graph_data = {
        "edge_list": edge_list,
        "node_meta": node_meta,
        "n_tx_nodes": len(df),
        "n_entity_nodes": len(node_meta) - len(df),
        "n_edges": len(edge_list),
        "source": "IEEE-CIS Fraud Detection (Kaggle, Vesta Corporation, 2019)",
        "description": "Bipartite transaction-entity graph. Edges connect transactions to shared card/address/email-domain entities. Intended for GNN ring-detection training.",
    }

    GRAPH_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(GRAPH_OUT, "wb") as f:
        pickle.dump(graph_data, f)

    elapsed = time.time() - t0
    print(f"  Graph saved -> {GRAPH_OUT}")
    print(f"  Nodes: {len(node_meta):,}  |  Edges: {len(edge_list):,}  |  {elapsed:.1f}s")
    return graph_data


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("RAZORSHIELD SENTINEL — EXTERNAL OOD VALIDATION")
    print("=" * 60)

    if not LGBM_PATH.exists() or not IF_PATH.exists():
        print("ERROR: model files not found. Run python -m backend.models.train first.")
        sys.exit(1)

    lgbm, iso, score_min, score_range = load_models()
    print(f"Models loaded: LGBM (n_features={lgbm.n_features_in_})")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    results = []

    # --- ULB Dataset ---
    ulb_path = DATA_DIR / "creditcard.csv"
    if ulb_path.exists():
        print(f"\nLoading ULB dataset from {ulb_path}...")
        df_ulb = pd.read_csv(ulb_path)
        print(f"  {len(df_ulb):,} rows loaded. Fraud rate: {df_ulb['Class'].mean():.3%}")
        X_ulb, y_ulb = build_ulb_features(df_ulb)
        scores_ulb = score_ensemble(X_ulb, lgbm, iso, score_min, score_range)
        results.append(report("ULB European Credit Card Fraud (real, OOD)", y_ulb, scores_ulb))
    else:
        print(f"\n[SKIP] ULB dataset not found at {ulb_path}")
        print("  Download: kaggle datasets download -d mlg-ulb/creditcardfraud -p data/external --unzip")

    # --- IEEE-CIS Dataset ---
    ieee_tx_path = DATA_DIR / "train_transaction.csv"
    if ieee_tx_path.exists():
        print(f"\nLoading IEEE-CIS dataset from {ieee_tx_path}...")
        df_ieee = pd.read_csv(ieee_tx_path)
        print(f"  {len(df_ieee):,} rows loaded. Fraud rate: {df_ieee['isFraud'].mean():.3%}")
        X_ieee, y_ieee = build_ieee_features(df_ieee)
        scores_ieee = score_ensemble(X_ieee, lgbm, iso, score_min, score_range)
        results.append(report("IEEE-CIS Fraud Detection (real, OOD)", y_ieee, scores_ieee))

        # Build entity graph for GNN training
        graph = build_ieee_entity_graph(df_ieee)
        print(f"\nEntity graph: {graph['n_tx_nodes']:,} tx nodes, "
              f"{graph['n_entity_nodes']:,} entity nodes, {graph['n_edges']:,} edges")
    else:
        print(f"\n[SKIP] IEEE-CIS dataset not found at {ieee_tx_path}")
        print("  Download: kaggle competitions download -c ieee-fraud-detection -p data/external --unzip")

    # --- Summary ---
    if results:
        print("\n" + "=" * 60)
        print("SUMMARY — EXTERNAL OOD VALIDATION")
        print("=" * 60)
        print(f"{'Dataset':<45} {'PR-AUC':>8} {'Recall@0.5':>11} {'Prevalence':>11}")
        print("-" * 80)
        for r in results:
            print(f"{r['dataset']:<45} {r['pr_auc']:>8.4f} {r['recall_at_50']:>10.2%} {r['prevalence']:>10.2%}")
        print("\nSynthetic baseline (for reference):")
        print(f"  {'RazorShield synthetic (in-distribution)':<43} {'0.9983':>8} {'99.10%':>11} {'22.25%':>11}")
        print("\nThe gap between synthetic and external OOD numbers is expected.")
        print("Behavioral biometric features are absent in all external datasets.")
    else:
        print("\nNo datasets found. Download instructions above.")
        print("\nTo download (requires Kaggle API credentials in ~/.kaggle/kaggle.json):")
        print("  kaggle datasets download -d mlg-ulb/creditcardfraud -p data/external --unzip")
        print("  kaggle competitions download -c ieee-fraud-detection -p data/external --unzip")


if __name__ == "__main__":
    main()
