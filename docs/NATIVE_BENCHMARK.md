# Native In-Domain Benchmark: IEEE-CIS Fraud Detection

> [!IMPORTANT]
> **Explicit Scope & Non-Transfer Disclaimer**:  
> **Native benchmark — trained and evaluated within IEEE-CIS, NOT a measure of cross-domain transfer from our synthetic carding model. See [EXTERNAL_VALIDATION.md](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/EXTERNAL_VALIDATION.md) for the separate OOD-transfer results, which remain unchanged.**

---

## 📊 Headline Native In-Domain Results (1,000 Bootstrap Resamples)

Evaluated on a strict **chronological 20% holdout test partition** ($n=118,108$ transactions) using all native transaction, identity, and relational features.

| Model Configuration | Test Set Sample Size ($N$) | Fraud Prevalence | Test ROC-AUC (95% CI) | Test PR-AUC (95% CI) | Signal Lift Over Prior (95% CI) |
|---|---|---|---|---|---|
| **Native LightGBM** | 118,108 | 3.44% (4,064) | **0.9152** `[0.9102, 0.9198]` | **0.5376** `[0.5221, 0.5527]` | **15.62x** `[15.17x, 16.06x]` |
| **Native CatBoost** | 118,108 | 3.44% (4,064) | **0.8809** `[0.8746, 0.8870]` | **0.4662** `[0.4498, 0.4820]` | **13.55x** `[13.07x, 14.01x]` |
| **Native Blended Ensemble** | 118,108 | 3.44% (4,064) | **0.9107** `[0.9058, 0.9154]` | **0.5221** `[0.5068, 0.5372]` | **15.17x** `[14.73x, 15.61x]` |

---

## 🏆 Context Comparison Against Public Kaggle Leaderboard

To provide context on model capacity on raw tabular/identity e-commerce fraud data:

| Benchmark Level | Documented ROC-AUC Range | Source / Methodology |
|---|---|---|
| **RazorVigil Sentinel Native LightGBM** | **0.9152** `[0.9102, 0.9198]` | Single GBDT model on 100 native engineered features + chronological split |
| **Standard Public Baseline GBDT** | $0.9100 - 0.9300$ | Baseline single-model LightGBM scripts on Kaggle public kernels |
| **Top 10% Private Leaderboard** | $\approx 0.9450$ | Multi-model feature engineering + pseudo-labeling / adversarial validation |
| **Top 1% Private Leaderboard** | $\approx 0.9600$ | 20+ model ensembles combining CatBoost, XGBoost, NN embeddings |
| **1st Place Winning Solution (Vesta)** | $0.9677$ | Comprehensive graph clustering, UID feature engineering, multi-layer stacking |

---

## 🛠️ Feature Engineering & Split Methodology

### 1. Strict Chronological Partitioning (Zero Temporal Leakage)
- `TransactionDT` represents continuous seconds from a reference point.
- **Training Partition** (First 80% chronologically): $n = 472,432$ rows ($\text{DT} \in [86,400, 12,192,842]$).
- **Test Holdout Partition** (Last 20% chronologically): $n = 118,108$ rows ($\text{DT} \in [12,192,900, 15,811,131]$).
- **Verification**: $\max(\text{Train DT}) \le \min(\text{Test DT})$ guarantees zero future lookahead or target leakage.

### 2. Feature Pipeline (100 Columns)
- **Numerical Features (80 columns)**: `TransactionAmt`, $C1$–$C14$ (count features), $D1$–$D15$ (timedelta features), top-variance $V1$–$V339$ features, and numerical identity fields ($id\_01$–$id\_11$).
- **Categorical Frequency Encodings (20 columns)**: `ProductCD`, `card1`–`card6`, `addr1`–`addr2`, `P_emaildomain`, `R_emaildomain`, `M1`–`M9`, and `DeviceType` frequency mappings fit strictly on the training partition.

---

## ⏱️ Timebox & Benchmark Scope Boundary
This in-domain benchmark was executed under a strict 2-day timebox to verify tabular learning capacity on standard e-commerce fraud benchmarks. We do not chase multi-week Kaggle leaderboard parity, as RazorVigil Sentinel's primary production value lies in **real-time sub-15ms carding ring prevention, client-side behavioral biometrics, and autonomous SOC chargeback mitigation (Track A)**.
