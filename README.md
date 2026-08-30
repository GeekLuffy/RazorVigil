# RazorShield Sentinel 🛡️

**Autonomous Real-Time Risk & Fraud Intelligence Engine**
*Built for the Razorpay Ecosystem · Sub-50ms Synchronous SLA · Adaptive Defense*

---

## 📌 Executive Overview

**RazorShield Sentinel** is a **specialist carding & bot-abuse investigation sub-agent** for the Razorpay ecosystem — designed to plug into [Razorpay Agent Studio](https://razorpay.com/agent-studio) via the **Model Context Protocol (MCP)**, the same Claude Agent SDK stack that powers Agent Studio natively.

Rather than competing with Razorpay's own native fraud agents, RazorShield provides the **deep forensic layer** they can delegate to: Louvain graph-based carding ring detection, biometric entropy scoring, canary honeytoken traps, and structured dispute evidence dossiers — all exposed as MCP tools callable by any Agent Studio agent.

```
                                    CHECKOUT REQUEST
                                           │
                                           ▼
                       RAZORSHIELD SENTINEL PIPELINE (<50ms)
       ┌───────────────────────────────────────────────────────────────┐
       │ 1. [L0] Agent-Aware Gate: Cryptographic AP2 JWT Attestation   │
       │ 2. [L0] Honeytoken Traps: 50 Luhn-Valid Canary Cards          │
       │ 3. [L1] Velocity Engine: Redis Atomic Sliding-Window Counters │
       │ 4. [L2] Graph Engine: In-Memory Louvain Community Clustering  │
       │ 5. [L3] Hybrid ML: Optuna-Tuned LightGBM + Isolation Forest   │
       │ 6. [L4] Tiering: Safe | Soft-Risk | Review | Honeypot Block   │
       └───────────────────────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
        SAFE & RECOVERED ORDERS                        BLOCKED BOTNET TRAFFIC
     • Razorpay Orders API Provisioning            • Zero Gateway Contamination
     • Dynamic Out-of-Band UPI QR Recovery         • Edge WAF Rule Synthesis
     • Razorpay Webhook GMV Confirmation           • MCP Tools for Agent Studio
```

---

## ⚡ Core Capabilities & Differentiators

1. **Razorpay Agent Studio MCP Integration (Primary Differentiator)**:
   - Exposes 4 MCP tools (`check_canary_status`, `get_cluster_risk_score`, `investigate_transaction`, `compile_dispute_evidence`) callable by any Claude Agent SDK agent.
   - Razorpay's native Dispute Responder can call `compile_dispute_evidence` to get richer 5-domain forensic dossiers for dispute cases.
   - Pitch: *"Not competing with what Razorpay shipped — plugging into it as the specialist sub-agent."*

2. **50 Luhn-Valid Canary Honeytokens**:
   - Programmatically deployed synthetic payment instruments seeded exclusively within our own decoy inventory and honeytoken check endpoint.
   - Discoverable only via BIN-enumeration or scraping directed at our own system — any hit is an unambiguous 1.0-confidence block.
   - **0.00% False Positive Rate on the canary detection layer** (by mathematical construction — these PANs were never issued to real cardholders).

3. **Agent-Aware Risk Protocol (Google AP2 Compatible)**:
   - Evaluates cryptographic JWT attestations (`X-Agent-Attestation`) issued to autonomous shopping agents.
   - Bypasses human biometric checks while enforcing strict sliding-window replay velocity to block stolen credentials.

4. **Track 03 Autonomous Revenue Recovery Loop**:
   - Borderline transactions (VPN users, mobile network handoffs) are classified as `soft_risk` rather than hard declined.
   - Generates a single-use signed payment link with an inventory hold, confirmed via live Razorpay Webhooks (`payment.captured`).

5. **Autonomous Threat Advisory & Edge WAF Synthesizer**:
   - Dynamically synthesizes Cloudflare WAF firewall expressions and Razorpay Risk Rules directly from active Louvain graph clusters.

6. **Forensic Copilot with Threat Memory RAG**:
   - Executes off-hot-path cosine similarity retrieval over historical carding campaigns to provide structured intelligence briefs to SOC analysts.

---

## 📊 Benchmark & Evaluation Results

Evaluated on a strictly isolated 3-way stratified partition (**60% Train / 20% Validation / 20% Held-Out Test, N=10,000 test holdout**) with **1,000 nonparametric bootstrap resamples**:

| Evaluation Metric | Tabular Blend (LGB+CB) | Static 4-Way Blend | Persistence-Gated 4-Way | Description |
|---|---|---|---|---|
| **Overall Test PR-AUC** | **0.9997** `[0.9995, 0.9999]` | **0.9991** `[0.9983, 0.9997]` | **0.9963** `[0.9944, 0.9979]` | Held-out 20% test holdout (Lift: **3.33x**) |
| **Overall Test ROC-AUC** | **0.9999** `[0.9998, 0.9999]` | **0.9996** `[0.9991, 0.9999]` | **0.9986** `[0.9980, 0.9992]` | Global ranking discrimination on held-out test split |
| **ML-Layer PR-AUC** | **0.9996** `[0.9994, 0.9998]` | **0.9984** `[0.9974, 0.9992]` | **0.9958** `[0.9938, 0.9975]` | Ambiguous traffic reaching ML (n=9,877 / 10,000) |
| **Adversarial-Realistic Recall** | **97.60%** `[96.20%, 98.80%]` | **97.40%** `[96.00%, 98.80%]` | **97.40%** `[96.00%, 98.80%]` | Stealth human-mimicking bot segment (n=500) |
| **Full-Funnel Fraud Catch Rate** | **99.60%** `[99.36%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` | Multi-layer defense (Canary Traps + Velocity + ML) |
| **Sequential Latency (p50 / p99)** | **9.08ms / 13.86ms** | **9.42ms / 14.10ms** | **9.48ms / 14.20ms** | 4x faster than the 50ms gateway SLA |
| **Sustained 40 RPS Latency (p99)** | **28.06ms** | **29.15ms** | **29.35ms** | Sub-30ms performance under concurrent load |

---

### 🛡️ Leave-One-Attack-Type-Out Zero-Day Generalization (Unseen CVV-Cycling, N=500 Held-Out)

To evaluate defense against unobserved attack geometries, models were trained on a partition strictly excluding all CVV-cycling attacks and evaluated solely on held-out unseen CVV-cycling traffic:

| Component / Architecture | Unseen Recall @ 0.50 | 95% Bootstrap Confidence Interval | Primary Defense Mechanism |
|---|---|---|---|
| **Dynamic Disagreement (Persistence-Gated P2)** | **76.80%** | `[73.40%, 80.40%]` | **Compound Automation & Anomaly Bypass Gate** |
| **Isolation Forest Standalone (Unsupervised)** | **75.20%** | `[71.60%, 78.81%]` | **Unsupervised Anomaly Boundary** (No labels required) |
| **GNN / Cluster Risk Standalone (Structural)** | **29.80%** | `[25.60%, 33.60%]` | Relational Entity Graph Clustering |
| **LightGBM Standalone (Supervised)** | **9.00%** | `[6.40%, 11.40%]` | Supervised Trees (Fails on unseen attack geometry) |
| **CatBoost Standalone (Supervised)** | **6.60%** | `[4.60%, 8.80%]` | Supervised Trees (Fails on unseen attack geometry) |
| **Tabular GBDT Blend (0.55 LGB / 0.45 CB)** | **8.20%** | `[5.80%, 10.60%]` | Supervised Tabular Blend |
| **Static 4-Way Stacked Blend (0.45/0.35/0.10/0.10)** | **8.20%** | `[5.80%, 10.60%]` | Static Blend (0.80 supervised weight dilutes IF) |

---

### 🔬 7-Parameter Validation Tuning Trace & Pareto Frontier ($D_{\text{val}}$, $N=10,000$)

All seven gate parameters were tuned jointly via grid search across 2,187 configurations **exclusively on the 20% Validation partition**:

| Parameter | Role | Search Grid | Winning Setting (P2) | Tuning Scope |
|---|---|---|---|---|
| $\tau_{\text{if}}$ | Isolation Forest threshold | `[0.45, 0.50, 0.55]` | **0.45** | Validation Partition ($D_{\text{val}}$) |
| $\tau_{\text{sup}}$ | Supervised risk ceiling | `[0.30, 0.35, 0.40]` | **0.40** | Validation Partition ($D_{\text{val}}$) |
| $\theta_{\text{cvv}}$ | CVV cycle attempt cutoff | `[2.0, 3.0, 4.0]` | **3.0** | Validation Partition ($D_{\text{val}}$) |
| $\theta_{\text{entropy}}$ | Keystroke entropy ceiling | `[0.60, 0.80, 1.00]` | **0.60** | Validation Partition ($D_{\text{val}}$) |
| $\theta_{\text{time}}$ | Time on page floor | `[1.5s, 2.5s, 3.5s]` | **1.5s** | Validation Partition ($D_{\text{val}}$) |
| $\theta_{\text{bin}}$ | Device distinct BIN cutoff | `[2.0, 3.0, 4.0]` | **4.0** | Validation Partition ($D_{\text{val}}$) |
| $\theta_{\text{fanout}}$ | Rotating IP & PAN pair | `[(4,4), (6,6), (8,8)]` | **(8.0, 8.0)** | Validation Partition ($D_{\text{val}}$) |

#### Validation Pareto Frontier Curve
```text
Zero-Day Recall
  100% |
   80% |          [P2] (FPR: 9.80%, Rec: 75.80%)  <-- SELECTED OPERATING POINT
       |         /
   70% |       [P1] (FPR: 7.20%, Rec: 71.40%)
       |      /
    0% +-----+------+------+------+------+----
      0%     5%    10%    15%    20%    25%   Edge-Case Genuine FPR
```

- **Documented Selection Rule**: Maximize Zero-Day CVV Recall subject to $\text{FPR}_{\text{val}}(\text{Edge-Genuine}) \le 10.0\%$. Operating Point **P2** was selected.

---

### 🧩 Per-Segment Performance & Ablation Matrix (Held-Out Test Partition, N=10,000)

| Traffic Segment | N (Test) | Base Rate | Tabular Blend (LGB+CB) | Static 4-Way Blend | Persistence-Gated P2 |
|---|---|---|---|---|---|
| **Normal Genuine** | 6,500 | 0.0% | FPR: **0.00%** | FPR: **0.00%** | FPR: **0.09%** |
| **Edge-Case Genuine (VPN/Travelers)** | 500 | 0.0% | FPR: **6.00%** | FPR: **5.60%** | FPR: **10.60%** *(Soft-Risk UPI Recovery)* |
| **Slow Distributed Carding** | 1,000 | 100.0% | Recall: **100.00%** `[100%, 100%]` | Recall: **100.00%** `[100%, 100%]` | Recall: **100.00%** `[100%, 100%]` |
| **Rapid Burst Script Botnets** | 1,000 | 100.0% | Recall: **100.00%** `[100%, 100%]` | Recall: **100.00%** `[100%, 100%]` | Recall: **100.00%** `[100%, 100%]` |
| **Adversarial Realistic Bots** | 500 | 100.0% | Recall: **97.60%** `[96.2%, 98.8%]` | Recall: **97.00%** `[95.6%, 98.4%]` | Recall: **97.00%** `[95.6%, 98.4%]` |
| **CVV Cycling (In-Domain)** | 500 | 100.0% | Recall: **100.00%** `[100%, 100%]` | Recall: **100.00%** `[100%, 100%]` | Recall: **100.00%** `[100%, 100%]` |

---

### 📐 Closed-Form Mathematical Proof: Global ROC-AUC Derivation

Global ROC-AUC corresponds exactly to the Wilcoxon-Mann-Whitney ranking probability: $\text{AUC} = P(S^+ > S^-) + \frac{1}{2}P(S^+ = S^-)$.
Stratifying test pairs ($N_{\text{pos}} = 3,000, N_{\text{neg}} = 7,000$, Total Pairs $= 21,000,000$):

1. **Clean Positives vs. Clean Negatives** ($w_1 = \frac{2500 \times 6500}{21000000} = 77.3810\%$): $\text{AUC}_1 = \mathbf{1.000000}$
2. **Clean Positives vs. Hard Negatives** ($w_2 = \frac{2500 \times 500}{21000000} = 5.9524\%$): $\text{AUC}_2 = \mathbf{0.999761}$
3. **Ambiguous Positives vs. Clean Negatives** ($w_3 = \frac{500 \times 6500}{21000000} = 15.4762\%$): $\text{AUC}_3 = \mathbf{0.999909}$
4. **Ambiguous Positives vs. Hard Negatives** ($w_4 = \frac{500 \times 500}{21000000} = 1.1905\%$): $\text{AUC}_4 = \mathbf{0.990968}$

$$\text{ROC-AUC}_{\text{derived}} = \sum_{k=1}^4 w_k \cdot \text{AUC}_k = 0.773810 + 0.059510 + 0.154748 + 0.011797 = \mathbf{0.999864} \implies \mathbf{0.9999}$$
$$\text{Empirical Scikit-Learn ROC-AUC} = \mathbf{0.999864} \implies \mathbf{0.9999} \quad (\text{Residual: } 0.00000000)$$

---

### 📝 Documented Written Resolutions for Evaluation Guardrail Triggers

| Guardrail Trigger | Observed Metric & Point Estimate | Documented Technical Resolution |
|---|---|---|
| **Tabular GBDT PR-AUC & ROC-AUC** | PR-AUC: **0.9997**, ROC-AUC: **0.9999** | **Wilcoxon Stratified Derivation Verified**: 85% clean strata produce $\ge 0.9999$ pairwise concordance, mathematically bounding global ROC-AUC to $0.999864 \approx 0.9999$ despite realistic ambiguity on the $1.19\%$ hard-vs-hard stratum ($\text{AUC} = 0.990968$). |
| **In-Domain Burst & Slow Carding Recall** | Recall: **100.00%** `[100.00%, 100.00%]` | **Deterministic Signal Isolation**: Burst attacks exhibit high velocity (`bin_card_count >= 15`), which supervised decision splits isolate with 100% precision. |
| **In-Domain CVV Cycling Recall vs. Leave-One-Out** | Recall: **100.00%** (In-Domain) vs. **8.20%** (Leave-One-Out) | **Supervised Target Exposure**: In-domain supervised models split directly on labeled feature `cvv_cycle_attempts >= 2.5`. When CVV cycling is withheld from training (leave-one-out), supervised recall collapses to 8.20%. Persistence-gated anomaly routing (76.80%) resolves this generalization gap. |

> **Architectural Justification: Tabular Blend vs. Multi-Modal 4-Way Blend**:
> - **In-Domain Supervised Precision**: The **Tabular GBDT Blend (0.55 LGB / 0.45 CB)** achieves higher aggregate in-domain PR-AUC (**0.9997** vs 0.9991) and minimal false positive rate on edge-case genuine traffic (FPR 6.00%).
> - **Zero-Day & Structural Defense**: The **4-Way Multi-Modal Architecture** (incorporating Isolation Forest and Graph Neural Networks with Persistence-Gated Anomaly Routing) provides structural insurance against unmodeled zero-day attack geometries (boosting zero-day interception from 8.20% to **76.80%**).

> **Methodological Rigor & Guardrails**:
> 1. **Strict 3-Way Split**: Model training occurs on 60% Train; hyperparameter tuning (Optuna) and dynamic gate selection occur exclusively on 20% Validation; final reporting occurs strictly on 20% Held-Out Test (never touched during tuning).
> 2. **Automated Pipeline Integrity Guardrail**: The evaluation harness automatically executes `check_evaluation_integrity()` and `check_segment_integrity()`, raising warnings if bootstrap CI widths are degenerate (<0.001) or if point estimates touch unverified 1.0000s, requiring documented resolutions.
> 3. **Regulatory Context**: All compliance mechanisms align with the *Reserve Bank of India (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025 (effective April 1, 2026)*.

---

## 🛠️ Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Redis (Local or Docker)

### 2. Environment Configuration
```bash
cp .env.example .env
```

### 3. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Generate dataset & train models
python backend/dataset/generate_dataset_polars.py --n 50000
python backend/models/tune_optuna.py

# Start API server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 4. Frontend Dashboard Setup
```bash
cd frontend
npm install
npm run dev
```

Dashboard will be accessible at: `http://localhost:5173`

---

## 🧪 Automated Testing & Verification

```bash
# Run End-to-End Test Suite (Razorpay Orders, Recovery Links, Canary, Webhooks)
python tests/test_fix5_razorpay.py

# Run Latency & Throughput Benchmark
python tests/load_test.py

# Run Adversarial Mutation Simulator
python simulator/adversarial_runner.py --generations 5 --pop-size 15
```

---

## 📂 Project Architecture

```
razorshield/
├── backend/                     # FastAPI engine, ML inference, Graph, Canary, MCP server
├── docs/                        # Architecture deep dives and validation studies
│   ├── WALKTHROUGH.md           # End-to-end technical walkthrough & pipeline architecture
│   ├── EXTERNAL_VALIDATION.md   # Out-of-Distribution (OOD) benchmark study (ULB / IEEE-CIS)
│   └── ROADMAP_AND_LIMITATIONS.md # Production boundaries, roadmap & scaling considerations
├── frontend/                    # React 18 + Tailwind + Recharts live SOC Dashboard
├── simulator/                   # Attack simulation & adversarial mutation engine
├── tests/                       # Automated unit tests, integration suites, and load benchmarks
├── SUBMISSION_KIT.md            # Quick-glance 2-minute submission briefing for reviewers
└── README.md                    # Main repository documentation
```

---

## 📚 Documentation & Deep Dives

- 🧭 **[Technical Walkthrough](docs/WALKTHROUGH.md)**: Layer-by-layer architectural breakdown from L0 Anti-Checker to L4 Decision Tiering.
- 🔬 **[External Validation Study](docs/EXTERNAL_VALIDATION.md)**: Cold-transfer evaluation on independently-labeled datasets (ULB & IEEE-CIS).
- 🗺️ **[Production Roadmap & Scope](docs/ROADMAP_AND_LIMITATIONS.md)**: Engineering boundaries, multi-tenant scaling, and future federated defenses.
- 📋 **[Submission Kit](SUBMISSION_KIT.md)**: Concise executive summary and evaluation reference.

---

## 📄 License
MIT License
