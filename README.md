# RazorShield Sentinel 🛡️

**Autonomous Real-Time Risk & Fraud Intelligence Engine**
*Built for the Razorpay Ecosystem · Sub-50ms Synchronous SLA · Adaptive Defense*

---

## 📌 Executive Overview

**RazorShield Sentinel** is an autonomous risk mitigation and fraud intelligence shield designed for payment gateways and high-volume digital merchants. It delivers sub-15ms decisioning to neutralize carding botnets, credential enumeration, and distributed proxy attacks while recovering legitimate revenue from false declines via automated out-of-band checkout recovery.

```
                                    CHECKOUT REQUEST
                                           │
                                           ▼
                       RAZORSHIELD SENTINEL PIPELINE (<50ms)
       ┌───────────────────────────────────────────────────────────────┐
       │ 1. [L0] Agent-Aware Gate: Cryptographic AP2 JWT Attestation   │
       │ 2. [L0] Honeytoken Traps: 50 Luhn-Valid Canary Cards (0% FP) │
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
     • Razorpay Webhook GMV Confirmation           • Async Forensic Threat RAG
```

---

## ⚡ Core Capabilities & Differentiators

1. **50 Luhn-Valid Canary Honeytokens**:
   - Programmatically deployed synthetic payment instruments that are never issued to real cardholders.
   - Any authorization attempt immediately triggers an instant 1.0 confidence block without ML latency, yielding a **0.00% False Positive Rate**.

2. **Agent-Aware Risk Protocol (Google AP2 Compatible)**:
   - Evaluates cryptographic JWT attestations (`X-Agent-Attestation`) issued to autonomous shopping agents.
   - Bypasses human biometric checks (e.g., mouse jitter, typing entropy) while enforcing strict sliding-window replay velocity to block stolen credentials.

3. **Track 03 Autonomous Revenue Recovery Loop**:
   - Borderline transactions (VPN users, mobile network handoffs) are classified as `soft_risk` rather than hard declined.
   - Generates a single-use signed payment link with an inventory hold, confirmed via live Razorpay Webhooks (`payment.captured`).

4. **Autonomous Threat Advisory & Edge WAF Synthesizer**:
   - Dynamically synthesizes Cloudflare WAF firewall expressions and Razorpay Risk Rules directly from active Louvain graph clusters.

5. **Forensic Copilot with Threat Memory RAG**:
   - Executes off-hot-path cosine similarity retrieval over historical carding campaigns to provide structured intelligence briefs to SOC analysts.

---

## 📊 Benchmark & Evaluation Results

Evaluated on a stratified 50,000-transaction testbed generated using Polars:

| Metric | Score | Description |
|---|---|---|
| **Full-Funnel Catch Rate** | **100.00%** | Comprehensive multi-layer defense |
| **ML-Layer PR-AUC** | **1.0000** | Evaluated on ambiguous rows reaching ML layer |
| **Adversarial Recall** | **100.00%** | Catch rate on human-mimicking stealth bots |
| **Zero-Day Generalization**| **91.76%** | Tested against unseen CVV-cycling attacks |
| **Edge-Case False Declines** | **0.00%** | Zero false positives on genuine high-ticket purchases |
| **Sequential Latency (p50 / p99)** | **9.08ms / 13.86ms** | 4x faster than the 50ms gateway SLA |
| **Sustained 40 RPS Latency (p99)** | **28.06ms** | Sub-30ms performance under concurrent load |

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
├── backend/
│   ├── main.py                  # FastAPI application & route definitions
│   ├── agent/                   # Cryptographic agent attestation validator
│   ├── canary/                  # Luhn-valid canary honeytoken traps
│   ├── copilot/                 # Forensic Copilot with Threat Memory RAG
│   ├── decision/                # Risk score thresholding and tiering
│   ├── graph/                   # Redis-backed Louvain community cluster engine
│   ├── models/                  # Optuna tuning, LightGBM, Isolation Forest, feature pipelines
│   ├── razorpay_client.py       # Razorpay Orders, Links, and Webhook verification
│   ├── recovery/                # Out-of-band recovery link generator
│   └── velocity/                # Atomic sliding-window Redis velocity tracker
├── frontend/                    # React 18 + Tailwind + Recharts SOC Dashboard
├── simulator/                   # Attack & Adversarial mutation generators
└── tests/                       # Automated test suites and load benchmarks
```

---

## 📄 License
MIT License
