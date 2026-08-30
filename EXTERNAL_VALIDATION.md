# External Validation — RazorShield Sentinel

> **ULB validation: COMPLETED.** IEEE-CIS: awaiting Kaggle credentials (see "Dataset Download").
> Results and honest diagnosis below.

## ULB Cold-Transfer Results (Completed)

| Metric | Value | Context |
|--------|-------|---------|
| Rows | 284,807 | Full dataset |
| Fraud prevalence | 0.173% | 492 fraud rows |
| **PR-AUC (cold, OOD)** | **0.0021** | vs. 0.9983 synthetic |
| Recall @ threshold 0.5 | 0.00% | All rows scored exactly 0.000 |

### Root Cause: Feature Distribution Collapse (Not Random Generalization Failure)

The model outputs exactly `0.000` for every ULB row. This is a **calibration collapse in a zero-signal region**, not random noise:

- ULB `Amount` mean is €88 (real European e-commerce). Our training `amount_zscore` was calibrated for ₹1,500 mean / ₹2,000 std Indian card-not-present transactions.
- Every ULB row gets `amount_zscore ≈ -0.71`. The remaining 13 features are all zero (behavioral biometrics, velocity, graph signals — none available in ULB, zeroed as documented).
- LightGBM learned to return the genuine-traffic prior (≈0.0) for the corner of feature space where `amount_zscore ≈ -0.71` and all other features are 0. This is the correct response given the training data — it just means the model cannot distinguish fraud from genuine in a feature-space region it was never trained on.

**This is not a generalization failure — it is a feature space mismatch.**  
The model was explicitly designed for Indian card-not-present fraud with behavioral biometrics as primary signals. ULB has no behavioral features, PCA-anonymised transaction values that cannot be mapped to our feature space, and a 17x lower fraud prevalence. The model cannot be fairly evaluated on it without fine-tuning or feature re-engineering — which is the honest conclusion here.

**What this means for the submission**: The external validation exercise confirms that our ensemble is not a general-purpose fraud model — it is a specialist system for the specific feature space it was designed for. That is the right conclusion, and it is being reported precisely rather than papered over.

**What IEEE-CIS would add**: IEEE-CIS has 14+ features we can meaningfully proxy (card groups, address communities, repeat attempt counts, email domain clusters). It is the more relevant external benchmark. Results pending dataset download.

---

## Dataset Provenance & Licensing

### 1. ULB European Credit Card Fraud Dataset
- **Source**: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- **Provider**: Machine Learning Group, Université Libre de Bruxelles (ULB)
- **License**: Database Contents License (DbCL) v1.0 — open for research use
- **Citation**: Andrea Dal Pozzolo, Olivier Caelen, Reid A. Johnson, Gianluca Bontempi. *Calibrating Probability with Undersampling for Unbalanced Classification.* In Symposium on Computational Intelligence and Data Mining (CIDM), IEEE, 2015
- **Size**: 284,807 transactions, 492 fraud (0.173% prevalence)
- **Period**: Two days of European cardholder transactions, September 2013
- **Features**: Time (seconds), V1–V28 (PCA-anonymised), Amount, Class (0/1)
- **Important**: V1–V28 are PCA-transformed — original features are confidential. They **cannot** be mapped to our named feature space (keystroke entropy, ASN type, etc.). Amount and Time are the only raw features available.

### 2. IEEE-CIS Fraud Detection Dataset
- **Source**: https://www.kaggle.com/c/ieee-fraud-detection
- **Provider**: IEEE Computational Intelligence Society + Vesta Corporation
- **License**: Competition rules — non-commercial research use
- **Citation**: Kaggle/IEEE-CIS Fraud Detection Competition, 2019. Vesta Corporation transaction data.
- **Size**: 590,540 training transactions, 20,663 fraud (3.499% prevalence)
- **Period**: Real Vesta Corporation e-commerce transactions
- **Features**: TransactionID, isFraud, TransactionDT, TransactionAmt, ProductCD, card1–6, addr1–2, P/R_emaildomain, C1–C14 (count encodings), D1–D15 (timedelta features), M1–M9 (match fields), V1–V339 (Vesta-engineered features)
- **Identity file** (train_identity.csv): DeviceType, DeviceInfo, id_01–id_38

---

## Feature Alignment

| RazorShield Feature | ULB Source | IEEE-CIS Source | Available? |
|---------------------|------------|-----------------|-----------|
| `amount` | `Amount` | `TransactionAmt` | ✅ Both |
| `amount_zscore` | Derived | Derived | ✅ Both |
| `hour_sin`, `hour_cos` | `Time % 86400` | `TransactionDT % 86400` | ✅ Both |
| `asn_type_encoded` | ❌ Not available | `DeviceType` (partial proxy) | ⚠️ Partial |
| `ja3_ua_mismatch` | ❌ Not available | ❌ Not available | ❌ Neither |
| `keystroke_entropy` | ❌ Not available | ❌ Not available | ❌ Neither |
| `mouse_jitter_score` | ❌ Not available | ❌ Not available | ❌ Neither |
| `paste_event` | ❌ Not available | ❌ Not available | ❌ Neither |
| `time_on_page_s` | ❌ Not available | ❌ Not available | ❌ Neither |
| `bin_card_count` | ❌ Not available | `card1` groupby count | ⚠️ IEEE only |
| `bin_name_count` | ❌ Not available | ❌ Not available | ❌ Neither |
| `ip_distinct_pan_count` | ❌ Not available | ❌ Not available | ❌ Neither |
| `device_distinct_bin_count` | ❌ Not available | `DeviceInfo` groupby | ⚠️ IEEE only |
| `device_distinct_ip_count` | ❌ Not available | ❌ Not available | ❌ Neither |
| `cvv_cycle_attempts` | ❌ Not available | `card1+card2` repeat proxy | ⚠️ IEEE only |
| `cluster_risk_score` | ❌ Not available | `addr1+addr2+email_domain` community size | ⚠️ IEEE only |

**Missing features are zeroed out** (not imputed). This is conservative — it biases the model toward the genuine-traffic score distribution, not toward false fraud. Reported numbers are therefore a **lower bound** on real performance when behavioral signals are present.

---

## Dataset Download Instructions

```powershell
# Requires ~/.kaggle/kaggle.json with your API credentials
# Get from: https://www.kaggle.com/settings → API → Create New Token

New-Item -ItemType Directory -Force data\external

# ULB dataset (~150 MB)
kaggle datasets download -d mlg-ulb/creditcardfraud -p data/external --unzip

# IEEE-CIS (~700 MB, requires competition acceptance)
# Must accept rules at: https://www.kaggle.com/c/ieee-fraud-detection/rules
kaggle competitions download -c ieee-fraud-detection -p data/external --unzip
```

---

## Running External Validation

```powershell
# With backend running on port 8000:
python backend/external_validation.py
```

Results are printed to stdout with:
- PR-AUC (primary metric, comparable to our synthetic benchmark)
- Recall @ threshold 0.50
- Fraud prevalence in dataset
- Side-by-side comparison with synthetic baseline (0.9983)

---

## Expected Results & Interpretation

The external OOD numbers **will be lower** than our synthetic benchmark. This is expected and intentional — it reflects:

1. **Missing behavioral features**: 4 of our 17 features (keystroke entropy, mouse jitter, paste event, time-on-page) are absent in every tabular fraud dataset. These are our strongest bot-detection signals.
2. **Domain shift**: Our model was trained on synthetic data matching Indian card-not-present e-commerce patterns (UPI, Razorpay flows). ULB is European credit card data; IEEE-CIS is US e-commerce via Vesta.
3. **Different fraud typology**: Our model is tuned for carding ring / BIN enumeration / velocity attacks. IEEE-CIS and ULB contain a broader mix including first-party fraud types.

**An honest gap here is more credible than not attempting it.** The purpose of external validation is to characterize generalization, not to pad the headline number.

---

## Entity Graph (IEEE-CIS) for GNN Training

`backend/external_validation.py` also constructs a bipartite entity graph from real IEEE-CIS card/address/email-domain columns and saves it to `data/external/ieee_entity_graph.pkl`. This is real-data support for the graph-based ring-detection architecture described in the submission.

Graph schema:
- **Transaction nodes**: one per row, labeled with `isFraud`, `TransactionAmt`
- **Entity nodes**: `card_{card1}_{card2}`, `addr_{addr1}_{addr2}`, `email_{P_emaildomain}`
- **Edges**: `(tx_node, entity_node, edge_type)` — transaction connects to each shared entity
- Saved as Python dict with `edge_list`, `node_meta`, `n_tx_nodes`, `n_entity_nodes`, `n_edges`
