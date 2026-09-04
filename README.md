<div align="center">

# 🛡️ RazorVigil

### Autonomous Real-Time AI Risk Manager & Payment Defense Engine

[![Razorpay AI Buildathon 2026](https://img.shields.io/badge/Razorpay-AI%20Buildathon%202026-0b2fee?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com)
[![Track 02 · AI Risk Manager](https://img.shields.io/badge/Track%2002-AI%20Risk%20Manager-6366f1?style=for-the-badge)](https://razorpay.com)
[![Tests](https://img.shields.io/badge/Tests-59%20Passed-22c55e?style=for-the-badge&logo=pytest&logoColor=white)](#-quick-start)
[![P99 Latency](https://img.shields.io/badge/P99%20Latency-14.20ms-f59e0b?style=for-the-badge)](#-key-verified-benchmarks)
[![License MIT](https://img.shields.io/badge/License-MIT-94a3b8?style=for-the-badge)](LICENSE)

> Defends the live payment authorization path against automated card-testing botnets, distributed proxy swarms, AiTM reverse proxies, and Telegram OTP relays — **synchronously, in under 15 ms**, with mathematically certified fraud detection guarantees.

**[📖 Docs](docs/README.md)** · **[📑 Complete Project Dossier](PROJECT_RAZORVIGIL_DEEP_DOSSIER.md)** · **[🚀 Quick Start](#-quick-start)** · **[📊 Benchmarks](#-key-verified-benchmarks)** · **[🏗️ Architecture](#-defense-architecture)** · **[🔬 Math](#-mathematical-foundations)**

</div>

---

## 🎯 The Problem: Telegram Carding Syndicates & Gateway Abuse

Modern payment infrastructure in India is under active attack from organized **Telegram carding communities** using automated scripts to exploit merchant gateways:

1. **Telegram ₹1–₹2 Micro-Auth Checkers**: Underground carding rings deploy automated Python/Node.js bots (e.g., CC Checker scripts, headless Playwright runners) that hammer checkout endpoints with thousands of ₹1.00–₹2.00 authorizations per minute to filter leaked BIN dumps into "Live" vs "Die" cards before conducting large fraudulent purchases.
2. **Rotating Residential Proxy Swarms ($5–$15/GB)**: Carders route each check through millions of residential IPs, rendering traditional IP rate-limiting and simple velocity counters completely useless.
3. **The Newcastle Distributed Guessing Attack**: Attackers exploit the lack of cross-merchant velocity correlation to guess CVV and expiration dates in seconds across multiple checkout sites (Ali et al., *IEEE Security & Privacy*).
4. **The ₹4:1 False Decline Tax**: When merchants react by turning on blunt fraud filters, they destroy their own business. For every ₹1 lost to actual fraud, merchants lose **₹4 in legitimate revenue from false declines** (Forrester / LexisNexis APAC 2024). High-value travelers, corporate VPN users, and new devices get falsely blocked.
5. **The Visa VAMP 2026 Denominator Trap**: Under the Visa Acquirer Monitoring Program (effective April 1, 2025, with excessive threshold tightened to **1.5% from April 1, 2026**), dropping good customers shrinks the valid sales denominator while the fraud numerator remains constant. Over-blocking literally pushes merchants into \$8/transaction fines with zero grace period.
6. **RBI 2025/2026 Regulatory Mandate**: RBI Master Directions (CO.DPSS.POLC.No.S 668/02-14-015/2025-2026, effective April 1, 2026) mandate dynamic Risk-Based Authentication (RBA) assessing behavioral telemetry, device risk, and velocity—rendering static rule engines non-compliant.

---

## 🛡️ The Solution: RazorVigil Autonomous Defense & Recovery Gateway

RazorVigil sits directly on the live checkout authorization path, executing an **8-layer synchronous defense grid in under 15 ms**:

- **Tier 1 (Instant Pass · <12ms)**: Certified clean transactions approve with zero checkout friction.
- **Tier 2 (Soft-Risk UPI QR Step-Up · 0% False Decline Loss)**: Ambiguous transactions (conformal set = `{"genuine", "fraud"}`) are **not declined**. Instead, RazorVigil dynamically steps down to an Out-of-Band UPI QR. Automated carding bots cannot scan Indian UPI apps; legitimate humans scan and pay in 5 seconds. This recovers borderline revenue and preserves the merchant's Visa VAMP denominator.
- **Tier 3 (Anti-Checker Tarpit & Poison)**: High-confidence botnets (Telegram carding, proxy swarms) are trapped at Layer 0 with synthetic 3,000ms latency delays and poisoned status codes (`ERR_CARD_INVALID_STATUS`). This breaks the bot's multithreaded workers and poisons the attacker's BIN database without consuming payment gateway authorization fees.

Simultaneously, an **asynchronous intelligence plane** runs Louvain bipartite graph partitioning ($Q = 0.8994$), adversarial coevolution simulation, and automated RBI-compliant dispute evidence packaging in the background — without adding a single millisecond to the live checkout latency budget.

---

> [!IMPORTANT]
> **Track 02 Compliance: Strictly Defense-Only Architecture**  
> RazorVigil is engineered **strictly as a merchant payment defense system**. It contains **zero offensive capabilities**, zero exploit tools, and zero automated attack scripts against external targets. All test harnesses (such as the Detection Test Harness and Red-Team Arms Race Lab) operate **exclusively within an internal local sandbox** to replay synthetic mock traffic against RazorVigil's own defensive gates for benchmark verification.

---

## 📊 Key Verified Benchmarks

> Source: [`docs/metrics.json`](docs/metrics.json) v1.0.0 · Held-out test N = 10,000 · Bootstrap 95% CI (1,000 resamples)
>
> ⚠️ **Dataset Context**: Metrics are evaluated on a synthetic dataset (30% fraud prevalence, entity-disjoint partition). Synthetic data is structurally easier to separate than production data — high PR-AUC is expected by design. Real-world benchmarks on entity-disjoint production datasets (IEEE-CIS, 6,381-team Kaggle) top out at AUC-ROC ~0.94 and PR-AUC ~0.89. The **76.8% zero-day CVV recall** gain is our most robust metric — evaluated under leave-one-attack-type-out, the hardest generalization test.

| Metric | Tabular GBDT Blend | Static 4-Way Blend | **Persistence-Gated P2** ✅ |
| :--- | :---: | :---: | :---: |
| **Held-Out Test PR-AUC** | 0.9997 `[0.9995, 0.9999]` | 0.9991 `[0.9983, 0.9997]` | **0.9963** `[0.9944, 0.9979]` |
| **Held-Out Test ROC-AUC** | 0.9999 `[0.9998, 0.9999]` | 0.9996 `[0.9991, 0.9999]` | **0.9986** `[0.9980, 0.9992]` |
| **Full-Funnel Fraud Catch Rate** | 99.60% `[99.36%, 99.80%]` | 99.57% `[99.33%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` |
| **Adversarial Bot Recall** | 97.60% `[96.20%, 98.80%]` | 97.00% `[95.60%, 98.40%]` | **97.00%** `[95.60%, 98.40%]` |
| **Zero-Day CVV Cycling Recall** | 8.20% *(supervised failure)* | 8.20% *(supervised failure)* | **76.80%** `[73.40%, 80.40%]` |
| **Split Conformal Coverage (α=0.05)** | — | — | **95.40%** `[94.90%, 95.80%]` |
| **Normal Genuine FPR** | 0.00% | 0.00% | **0.09%** `[0.00%, 0.27%]` |
| **Edge-Case Genuine FPR (VPN/travelers)** | 6.00% | 5.60% | **10.60%** *(validated trade-off)* |
| **Sequential P99 Latency** | 13.86 ms | 14.10 ms | **14.20 ms** |

> The **10.60% Edge-Case FPR** at P2 is the explicit price of 76.8% zero-day CVV recall — a hard-won Pareto trade-off tuned across 2,187 configurations on the validation partition.

---

## 🏗️ Defense Architecture

```
                            INCOMING CHECKOUT AUTHORIZATION (Hot Path: < 50ms SLA)
                                                      │
                                                      ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │  LAYER 0: Anti-Checker Tarpit           │ Deterministic Luhn & Micro-Auth (₹1-₹2) Traps        (<1.2ms)│
 │  LAYER 1: 50 Armed Canary Honeytokens   │ Cryptographic Synthetic BIN Traps (0% Escape FPR)    (<2.5ms)│
 │  LAYER 2: Sliding-Window Velocity       │ Redis Atomic Multi-Horizon (10s / 1m / 10m / 1h)     (<3.0ms)│
 │  LAYER 3: ASN & WebRTC Classifier       │ TLS JA3 Fingerprint Mismatch & Datacenter Subnets    (<3.5ms)│
 │  LAYER 4: Kinetic Biometric Gate        │ Keystroke Inter-Arrival Shannon Entropy H(Δt)        (<4.0ms)│
 │  LAYER 5: Quad-Ensemble ML Scoring      │ LightGBM + CatBoost + Isolation Forest + GraphSAGE   (<8.5ms)│
 │  LAYER 6: Zero-Trust 3DS2 Defense       │ Ed25519 Token Nonces & Cryptographic CAVV            (<2.1ms)│
 │  LAYER 7: Temporal Louvain Modularity   │ Dynamic Graph Community Partitioning (Q=0.8994)      (<4.2ms)│
 └────────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                      │
                      ┌───────────────────────────────┴───────────────────────────────┐
                      ▼                                                               ▼
        [SPLIT CONFORMAL CALIBRATION]                                    [BAYESIAN MEL ACTION TIERING]
    Distribution-Free 95% Coverage Bound                              argmin E[Loss | Action] Optimization
    P(Y ∈ C(X)) ≥ 1 - α (α = 0.05)                                    Pass vs. UPI Hold vs. Tarpit Block
                      │                                                               │
         ┌────────────┴───────────────────────────────┬───────────────────────────────┴────────────┐
         ▼                                            ▼                                            ▼
   [TIER 1: PASS]                           [TIER 2: SOFT-RISK HOLD]                     [TIER 3: BLOCKED]
  • Instant Approval (< 12ms)              • Dynamic Out-of-Band UPI QR                 • 8-Second Poison Latency
  • Clean Genuine Traffic                  • 5-Minute Inventory Reservation             • Telegram Botnet Intercept
```

### 🧠 Asynchronous Deep Intelligence Plane (Background)

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │            ASYNCHRONOUS DEEP INTELLIGENCE ENGINE             │
                    ├──────────────────────────────────────────────────────────────┤
                    │ • NetworkX Louvain Mule Ring Graph Explorer (Q = 0.8994)     │
                    │ • Threat Memory Copilot RAG (8D Cosine Similarity)           │
                    │ • Autonomous Red-Team Adversary Coevolution Simulator        │
                    │ • 5-Domain Verifiable Dispute Evidence PDF (ReportLab Engine)│
                    │ • PSI Temporal Drift Monitor & Doubly Robust Policy Engine   │
                    └──────────────────────────────────────────────────────────────┘
```

---

### 📐 Split Conformal Decision Routing

```
                      ┌──────────────────────────────────────────────┐
                      │    ML GATING ENSEMBLE RISK SCORE: P(Fraud)   │
                      └──────────────────────┬───────────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
               ▼                             ▼                             ▼
       [ P < 1 - q̂ ]               [ 1 - q̂ ≤ P ≤ q̂ ]                 [ P > q̂ ]
     Certified Genuine             Uncertain Prediction             Certified Fraud
    Set: {"genuine"}              Set: {"genuine", "fraud"}         Set: {"fraud"}
               │                             │                             │
               ▼                             ▼                             ▼
     ┌──────────────────┐          ┌───────────────────┐         ┌───────────────────┐
     │ TIER 1: APPROVAL │          │  TIER 2: UPI QR   │         │ TIER 3: TARPIT    │
     │ Instant Checkout │          │ Step-Up Recovery  │         │ 8s Poison Delay   │
     └──────────────────┘          └───────────────────┘         └───────────────────┘
```

---


### Zero-Day CVV Cycling — Generalization Benchmark (N = 500 Held-Out)

| Defense Component | Detection Mechanism | Zero-Day CVV Recall | 95% Confidence Interval | Generalization Status |
| :--- | :--- | :---: | :---: | :---: |
| **Persistence-Gated P2** ✅ | Dynamic Disagreement Gate | `████████████████░░░░` **76.80%** | `[73.40%, 80.40%]` | **State-of-the-Art** |
| **Isolation Forest (Standalone)** | Unsupervised Anomaly Boundary | `███████████████░░░░░` **75.20%** | `[71.60%, 78.80%]` | **Robust** |
| **Heterogeneous GraphSAGE** | Entity Relational Clustering | `██████░░░░░░░░░░░░░░` **29.80%** | `[25.60%, 33.60%]` | Partial |
| **LightGBM (Standalone)** | Supervised Tree Partitioning | `██░░░░░░░░░░░░░░░░░░` **9.00%** | `[6.40%, 11.40%]` | Fails on unseen geometry |
| **Tabular GBDT Blend** | Supervised Weighted Average | `██░░░░░░░░░░░░░░░░░░` **8.20%** | `[5.80%, 10.60%]` | Fails on unseen geometry |
| **CatBoost (Standalone)** | Supervised Tree Partitioning | `█░░░░░░░░░░░░░░░░░░░` **6.60%** | `[4.60%, 8.80%]` | Fails on unseen geometry |

---

## 🔬 Mathematical Foundations

### 1. Split Conformal Prediction *(Distribution-Free Guarantee)*

$$
P(Y \in C(X)) \ge 1 - \alpha \qquad (\alpha = 0.05 \implies 95\%\text{ certified coverage})
$$

Non-conformity scores $s_i = 1 - \hat{P}(Y = y_i \mid X_i)$ over calibration set $n = 2{,}000$:

$$
\hat{q} = \text{Quantile}_{\lceil(n+1)(1-\alpha)\rceil/n}(s_1,\dots,s_n)
$$

---

### 2. Kinetic Keystroke Shannon Entropy *(Keystroke Dynamics Literature)*

$$
H(\Delta t) = -\sum_{k=1}^{K} p_k \log_2(p_k)
$$

Human typing exhibits cognitive variation with measurably higher entropy than scripted replay (Joyce & Gupta 1990 lineage; HAL survey 2025). Specific thresholds ($H \in [2.20, 3.50]\text{ bits}$ for humans; $H < 0.60\text{ bits}$ for bots) are **internal calibration values** derived from RazorVigil's synthetic dataset — not published peer-reviewed figures.

---

### 3. Temporal Louvain Graph Modularity *(30-min Exponential Decay)*

$$
W(e, \Delta t) = \max\left(0.05, e^{-\Delta t / 1800}\right) \qquad Q = 0.8994
$$

---

### 4. Bayesian Minimum Expected Loss *(MEL Action Optimizer)*

$$
a^* = \arg\min_{a \in \{\text{Pass}, \text{Hold}, \text{Block}\}} \mathbb{E}[\text{Loss} \mid a]
$$

---

### 5. Off-Policy Doubly Robust Policy Evaluation

$$
\hat{V}_{\text{DR}}(\pi) = \frac{1}{N}\sum_{i=1}^{N}\left[\hat{Q}(x_i,\pi(x_i)) + \frac{\mathbb{I}(a_i = \pi(x_i))}{p(a_i \mid x_i)}\left(r_i - \hat{Q}(x_i,a_i)\right)\right]
$$

- Policy value: **₹194.29** vs. static baseline **−₹72.29**
- Net economic lift: **₹266.58 per 1,000 transactions**

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ · Node.js 18+ · npm

```bash
# 1. Clone
git clone https://github.com/GeekLuffy/razorvigil.git
cd razorvigil

# 2. Backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# 3. Frontend (in a new terminal)
cd frontend && npm install && npm run dev

# 4. Open
#    SOC Command Center  ->  http://localhost:5173/
#    OpenAPI / Swagger   ->  http://127.0.0.1:8000/docs
```

### ⚡ Verification Suite (Audit in 60 Seconds)

```bash
# 1. Run the full automated test suite (59 passed in ~25s)
python -m pytest tests/ -v

# 2. Verify zero-leakage entity-disjoint data split (0 hash collisions across Train / Val / Test)
python scripts/leakage_audit.py

# 3. Test a live synchronous evaluation (<15ms decision)
curl -X POST http://127.0.0.1:8000/checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 499.0, "currency": "INR", "card_hash": "c_audit_01", "device_fingerprint": "dev_audit_01", "keystroke_entropy": 2.85}'

# 4. Inspect canonical ground-truth benchmarks
cat docs/metrics.json
```

---

## ✨ Feature Highlights

| Feature | Description |
| :--- | :--- |
| **⚡ SLA Stress Benchmark** | 50-worker parallel load, real-time latency histogram, CDF with 15ms line, 1-click JSON export |
| **💬 Threat Memory Copilot** | RAG chatbot over live telemetry, Louvain graph, and RBI directions — generates WAF rules and dispute PDFs on demand |
| **📦 Multi-Language SDK Export** | Drop-in clients in Node.js, Python, Go, and Java under `GeekLuffy/razorvigil` |
| **⚔️ Red-Team Arms Race Lab** | 5-round adversarial coevolution simulator — Telegram scripts → proxy swarms → biometric spoofing → mule rings |
| **🕸️ Fraud Graph Explorer** | 2D/3D force-directed Louvain canvas, financial blast-radius card, 1-click ring quarantine |
| **⚖️ Dispute Evidence Studio** | 5-domain SHA-256 sealed PDF dossiers, RBI liability-shift ready |
| **🛍️ Live Merchant Store** | Real checkout capturing keystroke entropy and mouse jitter from the browser |

---

## 📖 Documentation

Full documentation follows the [Diataxis framework](https://diataxis.fr):

| Quadrant | Document | Purpose |
| :--- | :--- | :--- |
| 🎓 | [Getting Started Tutorial](docs/tutorial-quickstart.md) | Zero → live defense in 3 steps |
| 🛠️ | [SDK Integration Guide](docs/howto-merchant-integration.md) | Drop-in in 4 languages, < 5 lines |
| 🛠️ | [Stress Benchmark How-To](docs/howto-stress-benchmarks.md) | Verify SLA under 50 concurrent workers |
| 🛠️ | [WAF & Rules Export](docs/howto-waf-and-rules-export.md) | Deploy to Cloudflare and Razorpay Thirdwatch |
| 🛠️ | [Dispute Defense How-To](docs/howto-dispute-representation.md) | RBI-compliant chargeback evidence |
| 📋 | [REST & WebSocket API Reference](docs/reference-api.md) | Every endpoint, schema, and status code |
| 📋 | [Models & Math Reference](docs/reference-models-and-math.md) | Formulas, ensemble specs, feature schemas |
| 🧠 | [Architecture & Trade-Offs](docs/explanation-architecture-and-tradeoffs.md) | Why it's built this way |

---

## ⚖️ Regulatory Compliance

- **RBI (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025** (CO.DPSS.POLC.No.S 668/02-14-015/2025-2026, effective April 1, 2026) — mandates dynamic Risk-Based Authentication evaluating behavioral analytics, device fingerprinting, transaction history, and geolocation. RBA engines are a regulatory obligation, not a nice-to-have.
- **Card-on-File Tokenization (CoFT)** — zero cleartext PAN/CVV since October 1, 2022. All features operate on SHA-256 surrogate tokens (`card_hash`).
- **EMVCo 3DS 2.2** — cryptographic CAVV/AAV verification enables full issuer liability shift on proven authentic transactions.
- **ISO 8583 Audit Trails** — 5-domain evidentiary packages with SHA-256 seals for every flagged authorization.
- **Visa Acquirer Monitoring Program (VAMP)** (effective April 1, 2025, Excessive threshold tightened to 1.5% from April 1, 2026) — $8/transaction fine with no warning tier. Critically, VAMP's denominator structure means over-blocking is now mathematically self-defeating: declining legitimate transactions shrinks the TC05 denominator while the fraud numerator stays constant, pushing the ratio up. RazorVigil's three-tier soft-hold architecture is the correct response to this incentive structure.

---

## 📚 References

1. Huang et al. — *Uncertainty Quantification over Graphs with Conformalized GNNs (CF-GNN)*, NeurIPS 2023.
2. Lin & Goyal et al. — *Focal Loss for Dense Object Detection*, IEEE TNNLS 2022.
3. Dou et al. — *Enhancing GNNs for Fraud Detection via Dual-Stage Neighbor Selection (Care-GNN)*, ACM SIGKDD 2020.
4. Ali et al. (Newcastle University) — *Does the Online Card Payment Landscape Unwittingly Facilitate Card-Not-Present Fraud?*, **IEEE Security & Privacy, 2017** — primary academic source for distributed CVV guessing attack.
5. Dal Pozzolo et al. — *Learned Lessons in Credit Card Fraud Detection from a Practitioner Perspective*, Expert Systems with Applications 41(10), 2014 — concept drift & delayed supervision.
6. Reserve Bank of India — *Authentication Mechanisms for Digital Payment Transactions Directions, 2025* (CO.DPSS.POLC.No.S 668/02-14-015/2025-2026), September 25, 2025. Effective April 1, 2026.
7. LexisNexis Risk Solutions / Forrester Consulting — *True Cost of Fraud Study, Asia-Pacific*, 2024 — ₹4.00 total cost per ₹1 fraud for Indian enterprises.
8. "Data Leakage and Deceptive Performance: A Critical Examination of Credit Card Fraud Detection Methodologies" — arXiv:2506.02703, June 2025.
9. Häkli et al. (University of Cambridge) — *Measuring Cybercrime on Telegram: Ecosystems, Trust, and Market Dynamics*, 2025 — empirical taxonomy of Telegram carding channels, checker botnets, and credential-broker supply chains.
10. Han et al. — *Evaluating Cyber Deception: A Comprehensive Survey*, IEEE/arXiv:2104.03594, 2021 — foundational theory for asymmetric computational costs, deceptive latency tarpits, and response code oracle collapsing.
11. Thinkst Applied Research — *Credit Card Canarytokens*, Dec 2024 — industrial precedent for 0.00% FPR synthetic card honeypots deployed in decoy checkout forms.
12. "Scalable Bipartite Graph Clustering for Enterprise Fraud Rings" — arXiv:2512.19061, Dec 2025 — hard/soft link graph transformation for sub-second Louvain community detection across 25M accounts.

---

<div align="center">

Built for the **Razorpay AI Buildathon 2026 · Track 02: AI Risk Manager**

[GeekLuffy](https://github.com/GeekLuffy) · [razorvigil](https://github.com/GeekLuffy/razorvigil)

</div>
