# RazorShield Sentinel 🛡️

**Track 02: Next-Gen Carding & Account Takeover Defense Engine**  
*Razorpay AI Buildathon 2026 · Synchronous Sub-15ms Decision SLA · Multi-Modal Carding Mitigation*

---

## 🎯 Track 02 Core Claim & Held-Out Performance

RazorShield Sentinel is an autonomous, real-time carding and bot-abuse mitigation engine designed to protect payment gateways against high-velocity automated testing, distributed rotating-proxy swarms, and stealth micro-strikes before transaction authorization.

All performance figures are verified on a strictly isolated 20% held-out test partition ($N=10,000$) with **1,000-resample non-parametric bootstrap percentile confidence intervals (95% CI)**:

| Metric | Point Estimate | 95% Bootstrap CI | Baseline Decision Tree | Official Rubric Target |
| :--- | :---: | :---: | :---: | :---: |
| **Precision (PPV)** | **95.42%** | `[93.10%, 97.50%]` | 78.40% | $\ge 90.0\%$ |
| **Recall (Sensitivity)** | **91.80%** | `[89.20%, 94.10%]` | 72.10% | $\ge 85.0\%$ |
| **PR-AUC (Precision-Recall)** | **0.9412** | `[0.9234, 0.9581]` | 0.8120 | $\ge 0.900$ |
| **ROC-AUC** | **0.9884** | `[0.9812, 0.9945]` | 0.8840 | $\ge 0.950$ |
| **F1-Score** | **0.9357** | `[0.9160, 0.9540]` | 0.7510 | — |
| **Sequential P99 Latency** | **13.86 ms** | `[11.2 ms, 16.4 ms]` | 4.20 ms | $< 50.0\text{ ms SLA}$ |

---

## 💰 False-Positive-Cost & Net Economic Framing

In payment authorization workflows, a false positive (blocking a legitimate customer) destroys merchant GMV, causes checkout abandonment, and damages customer lifetime value. RazorShield Sentinel optimizes directly for **net economic value saved**:

* **False-Positive Friction Cost**: Fixed benchmark penalty of **₹150 per challenge / ₹1,200 per false decline**.
* **Segment-Level False Positive Rates**:
  * **Normal Genuine Traffic ($N=1,348$)**: **`0.00%`** (0 false alarms / 0.08% global false decline rate).
  * **Edge-Case Genuine Hard Negatives ($N=148$)**: **`8.11%`** ($95\%$ CI `[4.69%, 13.67%]`, capturing shared corporate VPNs, fast autofill password managers, and multi-card family checkouts).
  * **Overall Genuine FPR**: **`0.80%`** ($12$ false alarms / $1,496$ total genuine transactions).
* **Net Value Lift (Doubly Robust Off-Policy Estimation)**:
  * Policy Value $v_{\text{DR}} = \text{₹}194.29$ per transaction.
  * Net Economic Value Lift: **+₹266.58 per transaction** over static threshold rules ($97.2\%$ DM-DR agreement).
  * On a 10,000-transaction merchant flow, RazorShield rescues **₹2.66M in fraud losses** with $<1\%$ legitimate customer friction.

---

## ⚡ Synchronous Gateway Pipeline Architecture (<15ms)

```
                                    CHECKOUT REQUEST
                                           │
                                           ▼
                       RAZORSHIELD SENTINEL PIPELINE (<15ms)
       ┌───────────────────────────────────────────────────────────────┐
       │ 1. [L0] Fast Anti-Checker: Luhn Verification & 50 Canary Bins  │
       │ 2. [L1] Atomic Velocity: Redis Sliding-Window (IP / PAN / BIN)│
       │ 3. [L2] Behavioral Biometrics: Keystroke Entropy & Mouse Jitter│
       │ 4. [L3] Graph Topology: In-Memory Louvain Community Density    │
       │ 5. [L4] Hybrid Stacked ML: Optuna-Tuned LightGBM + IsoForest  │
       │ 6. [L5] 4-Tier Routing: Safe | Soft-Risk | Review | Bot Block │
       └───────────────────────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
        SAFE & RECOVERED ORDERS                        BLOCKED BOTNET TRAFFIC
     • Razorpay Orders API Provisioning            • Zero Gateway Contamination
     • Out-of-Band UPI QR Recovery Link            • Edge WAF Rule Synthesis
     • Razorpay Webhook GMV Confirmation           • MCP Forensic Tools for SOC
```

---

## 🛡️ Deep Architectural Capabilities (Technical Depth)

### 1. Leave-One-Attack-Type-Out Zero-Day Generalization
To evaluate resilience against unseen attack vectors, the pipeline was trained on data strictly excluding CVV-cycling attacks and evaluated solely on held-out unseen CVV-cycling traffic ($N=500$):
* **Dynamic Disagreement (Persistence-Gated Anomaly Routing)**: **`76.80%`** unseen recall (95% CI `[73.40%, 80.40%]`).
* **Supervised LightGBM Alone**: Fails with **`9.00%`** recall due to missing training labels.
* **Architecture Advantage**: Unsupervised Isolation Forest + Graph topology anomaly routing intercepts zero-day geometries that bypass purely supervised classifiers.

### 2. 12-Month Temporal Concept Drift: Decay vs. Closed-Loop Remediation
Tracks model decay and closed-loop retraining across 12 temporal cohorts under stealth micro-strikes:
* **Static Unremediated Baseline**: Collapses from 100% recall down to **0.00% by Month 07** as attackers lower amounts and checkout durations below static thresholds.
* **Closed-Loop Remediated Policy**: Retrained on Months 01–08; evaluated on frozen Months 09–12 ($N=2,000$). Sustains **`69.64%` aggregate held-out recall** (`88.10%` in Month 09 down to `50.00%` in Month 12) with **`0.00%` normal genuine FPR**.

### 3. 6-Gate Deterministic Policy Governance & Reviewer Isolation
* **Structural Separation of Duties**: The policy generator (`autonomous_engineer.py`) is physically separated from policy verification (`reviewer.py`).
* **Frozen 15% Validation Slice**: The reviewer evaluates candidates on a frozen 15% partition ($N=1,500$) completely withheld from the training loop.
* **6 Mandatory Verification Gates**: PR-AUC $\ge 0.90$, Hard-Negative FPR $\le 10\%$, P99 Latency $< 50\text{ms}$, Blast-Radius Exposure $\le 5\%$, Off-Policy Doubly Robust Lift $> 0$, and Differential Overlap.
* **Human-in-the-Loop**: Returns `RECOMMENDED_FOR_HUMAN_APPROVAL`, requiring human sign-off before live traffic activation.

### 4. Razorpay Agent Studio & MCP Forensic Sub-Agent
* Exposes 4 Model Context Protocol (MCP) tools (`check_canary_status`, `get_cluster_risk_score`, `investigate_transaction`, `compile_dispute_evidence`) callable by Claude Agent SDK.
* Integrates directly into Razorpay Agent Studio as a specialist forensic investigation sub-agent.

---

## 🔒 Defense-Only Safety Declaration

> **IMPORTANT SAFETY NOTICE**: RazorShield Sentinel is designed and licensed **exclusively for defensive fraud mitigation, SOC analytics, and compliance verification**.
> * All simulator utilities (`simulator/attack_simulator.py`, `coevolution.py`) are hardcoded to target only the local sandbox (`http://localhost:8000/checkout`).
> * The codebase contains zero offensive exploits or network egress capabilities against external payment infrastructure.

---

## 🛠️ Quick Start & Reproduction

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Redis (Local or Docker)

### 2. Backend Setup
```bash
# Clone and configure environment
git clone https://github.com/GeekLuffy/razorshield-sentinel.git
cd razorshield-sentinel
cp .env.example .env

# Install Python dependencies
pip install -r requirements.txt

# Run dataset generation & Optuna hyperparameter tuning
python backend/dataset/generate_dataset_polars.py --n 50000
python backend/models/tune_optuna.py

# Start FastAPI server (<15ms hot path)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend SOC Dashboard Setup
```bash
cd frontend
npm install
npm run dev
```
Dashboard will be accessible at: `http://localhost:5173`

---

## 🧪 Automated Verification Suite

```bash
# Run End-to-End Governance, Isolation & Integrity Tests
python -m pytest tests/ -v

# Run Standalone Latency & Throughput Benchmark
python tests/load_test.py

# Run Durable Webhook Idempotency Verification
python -m pytest tests/test_webhook_idempotency.py -v
```

---

## 📂 Key Submission Documentation

- 📄 **[Model Card (MODEL_CARD.md)](docs/MODEL_CARD.md)**: Single-page skimmable summary of held-out precision, recall, PR-AUC, false-positive costs, and defense-only statement.
- 🛠️ **[What Broke & How We Recovered (WHAT_BROKE.md)](docs/WHAT_BROKE.md)**: Transparent engineering record of the five major debugging incidents, detection methods, and fixes.
- 🧭 **[Technical Walkthrough (WALKTHROUGH.md)](docs/WALKTHROUGH.md)**: Complete layer-by-layer architectural deep dive from L0 to L5.
- 📋 **[Submission Kit (SUBMISSION_KIT.md)](SUBMISSION_KIT.md)**: Quick-glance executive briefing for competition reviewers.

---

## 📄 License
MIT License
