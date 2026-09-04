# Model Card: RazorVigil Anti-Carding Engine

> **Model Identifier**: `RazorVigil-Ensemble-v2.4`  
> **Model Type**: Multi-Modal Persistence-Gated Stacked Ensemble (LightGBM + CatBoost + Isolation Forest + Graph Topology)  
> **Target Track**: Razorpay AI Buildathon Track 02 — Next-Gen Carding & Bot-Abuse Defense  
> **Status**: Production Verification Candidate (`RECOMMENDED_FOR_HUMAN_APPROVAL`)  
> **Canonical Source**: Generated directly from `docs/metrics.json` via `scripts/generate_docs.py`.

---

## 1. Track A Core Detection Benchmark (Held-Out Test Set, $N=10,000$)

**Evaluation Provenance**: Evaluated on the strictly held-out 20% test partition ($N=10,000$) from the primary 50,000-transaction dataset (`data/synthetic_transactions.csv`), partitioned via stratified 60% Train / 20% Validation / 20% Test split. All intervals are **1,000-resample non-parametric bootstrap percentile confidence intervals (95% CI)**:

| Evaluation Metric | Tabular GBDT Blend (LGB+CB) | Persistence-Gated 4-Way (P2) | Evaluation Partition | Official Rubric SLA |
| :--- | :---: | :---: | :---: | :---: |
| **Overall Test PR-AUC** | **0.9997** `[0.9995, 0.9999]` | **0.9963** `[0.9944, 0.9979]` | Track A Test Holdout ($N=10,000$) | $\ge 0.900$ |
| **Overall Test ROC-AUC** | **0.9999** `[0.9998, 0.9999]` | **0.9986** `[0.9980, 0.9992]` | Track A Test Holdout ($N=10,000$) | $\ge 0.950$ |
| **ML-Layer PR-AUC** | **0.9996** `[0.9994, 0.9998]` | **0.9958** `[0.9938, 0.9975]` | Ambiguous Sub-flow ($N=9,877$) | — |
| **Adversarial-Realistic Recall** | **97.60%** `[96.20%, 98.80%]` | **97.00%** `[95.60%, 98.40%]` | Stealth Human Bots ($N=500$) | $\ge 85.0\%$ |
| **Full-Funnel Fraud Catch Rate** | **99.60%** `[99.36%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` | All Fraud Segments ($N=3,000$) | $\ge 95.0\%$ |
| **Sequential Latency (p50 / p99)** | **9.08ms / 13.86ms** | **9.48ms / 14.20ms** | 100 Sequential Transactions | $< 50\text{ms SLA}$ |
| **Sustained 40 RPS Latency (p99)** | **28.06ms** | **29.35ms** | Concurrent Load Benchmark | $< 50\text{ms SLA}$ |

---

## 2. Zero-Day Generalization: Leave-One-Attack-Type-Out ($N=500$ Held-Out)

**Evaluation Provenance**: Models were trained on a partition strictly excluding all CVV-cycling attacks ($N=28,500$ Train) and evaluated solely on held-out unobserved CVV-cycling traffic ($N=500$):

| Defense Component | Unseen Zero-Day Recall | 95% Bootstrap CI | Failure Mode / Mechanism |
| :--- | :---: | :---: | :--- |
| **Dynamic Disagreement (Persistence-Gated P2)** | **76.80%** | `[73.40%, 80.40%]` | Compound Automation & Anomaly Bypass Gate |
| **Isolation Forest Standalone (Unsupervised)** | **75.20%** | `[71.60%, 78.81%]` | Unsupervised Anomaly Boundary (No labels required) |
| **GNN / Cluster Risk Standalone (Structural)** | **29.80%** | `[25.60%, 33.60%]` | Relational Entity Graph Clustering |
| **LightGBM Standalone (Supervised)** | **9.00%** | `[6.40%, 11.40%]` | Supervised failure on unobserved attack geometry |

---

## 3. False-Positive-Cost & Segment Breakdown (Track A Held-Out, $N=10,000$)

**Evaluation Provenance**: Evaluated across all 6 distinct traffic segments in the Track A test holdout ($N=10,000$):

| Segment Name | Segment Size | True Base Rate | Tabular Blend FPR / Rec | Persistence-Gated P2 FPR / Rec | Routing & Mitigation Strategy |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Normal Genuine** | 6,500 | 0.0% | FPR: **0.00%** | FPR: **0.09%** | Frictionless Instant Authorization |
| **Edge-Case Genuine (VPN/Travelers)** | 500 | 0.0% | FPR: **6.00%** | FPR: **10.60%** | Soft-Risk Out-of-Band UPI QR Recovery |
| **Slow Distributed Carding** | 1,000 | 100.0% | Recall: **100.00%** | Recall: **100.00%** | Instant Botnet Drop & IP Isolation |
| **Rapid Burst Script Botnets** | 1,000 | 100.0% | Recall: **100.00%** | Recall: **100.00%** | Rate-Limit Quarantine & Edge WAF Synthesis |
| **Adversarial Realistic Bots** | 500 | 100.0% | Recall: **97.60%** | Recall: **97.00%** | Biometric Entropy Anomaly Interception |
| **CVV Cycling (In-Domain)** | 500 | 100.0% | Recall: **100.00%** | Recall: **100.00%** | Multi-Card Replay Velocity Trap |

* **Economic Friction Framing**: Fixed benchmark penalty of **₹150 per challenge / ₹1,200 per false decline**. RazorVigil confines false positive friction to edge cases (10.60%), recovering legitimate GMV via single-use signed payment links.

---

## 4. Governance Temporal Concept Drift: 12-Month Adaptation Tracker

**Evaluation Provenance**: Evaluated on strictly held-out temporal cohorts (**Months 09–12, $N=2,000$**, generated after training on Months 01–08 with separate RNG seeds and never seen during tuning):

| Monthly Cohort | Static Baseline Recall | Remediated Policy Recall | Normal Genuine FPR ($N=337$/mo) | Edge-Case Genuine FPR ($N=37$/mo) | 95% Wilson CI (Edge FPR) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Month 09 (Held-Out)** | 0.00% | **88.10%** | 0.00% | 16.22% (6 FP / 37) | `[7.68%, 31.06%]` |
| **Month 10 (Held-Out)** | 0.00% | **74.60%** | 0.00% | 5.41% (2 FP / 37) | `[1.49%, 17.89%]` |
| **Month 11 (Held-Out)** | 0.00% | **65.87%** | 0.00% | 5.41% (2 FP / 37) | `[1.49%, 17.89%]` |
| **Month 12 (Held-Out)** | 0.00% | **50.00%** | 0.00% | 5.41% (2 FP / 37) | `[1.49%, 17.89%]` |
| **Held-Out Aggregate (M09–M12)** | **0.00%** | **69.64%** `[67.46%, 75.40%]` | **0.00%** (0 / 1,348) | **8.11%** (12 / 148) | **`[3.78%, 12.43%]`** |

* **Month 01 Result**: Remediated recall (99.21%) is slightly below the static baseline (100.00%) due to a deliberate precision/recall tradeoff: multi-modal thresholds trade 1 edge fraud case (-0.79% recall) for +2.77% precision gain (95.42% vs 92.65%), reducing false alarms on genuine buyers.
* **Small-N Hard Negative Caveat**: Each month has N=38 edge-case genuine transactions (7.5% of 500); month-level FPR variations reflect small-N binomial variance. The aggregate held-out statistic (N=148, 95% CI [3.78%, 12.43%]) is the canonical reference.
* **Static Collapse vs Remediated Recovery**: Static rules bottom out at 0% recall by Month 07 under stealth micro-strikes. Closed-loop remediation sustains a **69.64% aggregate held-out recall arc** with a 50.00% floor in Month 12.

---

## 5. Governance Off-Policy Doubly Robust Evaluation & Reviewer Isolation

| Governance Component | Evaluated Partition | Metric / Result | Governance Gate Outcome |
| :--- | :---: | :---: | :--- |
| **Off-Policy Doubly Robust Evaluation** | Governance Cohort ($N=10,000$) | Policy Value: **₹194.29** / Net Lift: **+₹266.58** | Passed Gate 5 (DM-DR Agreement: 97.20%) |
| **Independent Reviewer Validation** | Frozen 15% Stratified Slice ($N=1,500$) | Precision: **95.53%** / Recall: **99.78%** | **RECOMMENDED_FOR_HUMAN_APPROVAL** (Human sign-off required) |

---

## 6. Key Architectural Differentiators

1. **Independent Review Agent Isolation**: Structural separation of duties prevents builder agents from approving policies on their own training data.
2. **Deterministic 6-Gate Verification**: Mandatory evaluation across PR-AUC, Latency, Hard-Negative FPR, Blast-Radius, OPE Lift, and Differential Overlap.
3. **Multi-Modal Feature Discovery**: Blends network velocity (Redis sliding windows), client biometrics (keystroke entropy, mouse jitter), and graph clustering in $<14\text{ms}$ hot-path inference.
4. **Agent Studio MCP Integration**: Exposes 4 Model Context Protocol tools for autonomous forensic investigation and dispute evidence assembly.

---

## 7. Strict Defense-Only Safety Declaration

> **IMPORTANT REGULATORY & SAFETY NOTICE**: RazorVigil is designed, built, and licensed **strictly and exclusively for defensive fraud prevention, security operations, and compliance auditing**.
> * All simulation scripts (`simulator/attack_simulator.py`, `backend/governance/coevolution.py`) are hardcoded to target only the local sandbox (`http://localhost:8000/checkout`).
> * The codebase contains zero network egress capabilities to external payment endpoints and zero weaponizable payloads.
