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

| Metric | Point Estimate | 95% Bootstrap CI | Description |
|---|---|---|---|
| **Overall Test PR-AUC** | **0.9985** | `[0.9976, 0.9992]` | 4-Way Stacked Blend on held-out test split (Lift: **3.33x**) |
| **Overall Test ROC-AUC** | **0.9993** | `[0.9988, 0.9997]` | Global ranking discrimination on held-out test partition |
| **ML-Layer PR-AUC** | **0.9984** | `[0.9974, 0.9992]` | Ambiguous traffic reaching ML (n=9,877 / 10,000, rules excluded) |
| **Adversarial-Realistic PR-AUC** | **0.9637** | `[0.9381, 0.9832]` | Stealth human-mimicking bot segment (Recall: **97.20%**, n=500) |
| **Full-Funnel Fraud Catch Rate** | **99.53%** | `[99.30%, 99.77%]` | Multi-layer defense (Canary Traps + Velocity + 4-Way Stacked ML) |
| **Sequential Latency (p50 / p99)** | **9.08ms / 13.86ms** | — | 4x faster than the 50ms gateway SLA |
| **Sustained 40 RPS Latency (p99)** | **28.06ms** | — | Sub-30ms performance under concurrent load |

### Stacked Ensemble Component Ablation (Held-Out Test Partition)
- **Stacked 4-Way Blend (0.45 LGB / 0.35 CB / 0.10 IF / 0.10 GNN)**: PR-AUC **0.9985** `[0.9976, 0.9992]`, ROC-AUC **0.9993** `[0.9988, 0.9997]`
- **Tabular GBDT Blend (0.55 LGB / 0.45 CB)**: PR-AUC **0.9997** `[0.9996, 0.9999]`, ROC-AUC **0.9999** `[0.9998, 0.9999]`
- **Isolation Forest Standalone (Unsupervised)**: PR-AUC **0.9387** `[0.9328, 0.9445]`, ROC-AUC **0.9722** `[0.9694, 0.9748]`
- **Graph Neural Network (HeteroGraphSAGE)**: PR-AUC **0.8556** `[0.8449, 0.8654]`, ROC-AUC **0.8764** `[0.8673, 0.8847]`

> **Methodological Rigor & Guardrails**:
> 1. **Strict 3-Way Split**: Model training occurs on 60% Train; hyperparameter tuning (Optuna) and ensemble blend-weight selection occur exclusively on 20% Validation; final reporting occurs strictly on 20% Held-Out Test (never touched during tuning).
> 2. **Automated Pipeline Integrity Guardrail**: The evaluation harness automatically executes `check_evaluation_integrity()`, raising warnings if bootstrap CI widths are degenerate (<0.001) or if point estimates touch unverified 1.0000s, preventing synthetic feature separability leakage.
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
