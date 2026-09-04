# 🛡️ RazorVigil Sentinel — Comprehensive Deep-Analysis Master Report
### Autonomous Real-Time AI Risk Manager & Payment Defense Engine
**Razorpay AI Buildathon 2026 · Track 02: AI Risk Manager**
*Document Generated for Deep Project Audit, Regulatory Review & Executive Evaluation*

> [!CAUTION]
> **AUDIT NOTICE — READ BEFORE CITING ANY FIGURES IN THIS DOCUMENT**
>
> Every metric in this document has been verified against:
> - `docs/metrics.json` (canonical single source of truth, v1.0.0, last updated 2026-08-31)
> - Actual `pytest tests/ --collect-only` output (61 collected, 59 pass, 2 skipped standalone load tests)
>
> Any earlier version of this document contained several unverified claims (a fabricated "Heterogeneous Neural Hybrid" model with 0.9999 metrics never run through the canonical pipeline, a "0.00% false declines" claim that contradicts validated FPR, invented "Official Gateway Rubric" thresholds, and a wrong RBI citation). Those claims have been **removed and corrected below**. Do not use the prior version.

---

## 📑 Table of Contents
1. [Executive Summary & Core Mission](#1-executive-summary--core-mission)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [The 8-Layer Defense Grid & Synchronous SLA](#3-the-8-layer-defense-grid--synchronous-sla)
4. [The Actual ML Model Ensemble (as in docs/metrics.json)](#4-the-actual-ml-model-ensemble-as-in-docsmetricsjson)
5. [Mathematical & Statistical Formulations](#5-mathematical--statistical-formulations)
6. [Empirical Model Accuracy & Benchmark Metrics (Canonical)](#6-empirical-model-accuracy--benchmark-metrics-canonical)
7. [Comprehensive Feature Matrix (All Built Capabilities)](#7-comprehensive-feature-matrix-all-built-capabilities)
8. [Actual Test Suite (59 pass / 2 skipped)](#8-actual-test-suite-59-pass--2-skipped)
9. [Regulatory Compliance (RBI 2025 & EMVCo 3DS 2.2)](#9-regulatory-compliance-rbi-2025--emvco-3ds-22)
10. [Multi-Language Drop-in SDK Specifications](#10-multi-language-drop-in-sdk-specifications)
11. [Repository Topology & File Inventory](#11-repository-topology--file-inventory)

---

## 1. Executive Summary & Core Mission

### The Industry Challenge:
Modern e-commerce checkout is besieged by distributed automation:
- **Telegram ₹1 Micro-Auth Card Checkers**: Multi-threaded botnets testing thousands of leaked PANs per minute.
- **Fast-Flux Rotating Residential Proxy Swarms**: Bypassing traditional IP-based rate limiting via millions of hijacked residential nodes.
- **Kinetic Biometric Spoofing**: Synthetic mouse Bezier curves and randomized delays designed to evade basic heuristics.
- **AiTM Reverse Proxies & OTP Relays (Evilginx/Modlishka)**: Intercepting session cookies and 2FA credentials in real-time.
- **False Declines on Edge-Case Genuine Shoppers**: The persistence-gated configuration validated a **10.6% Edge-Case Genuine FPR** (VPN/traveler segment) — a real, hard-won trade-off, not zero.

### The RazorVigil Sentinel Solution:
**RazorVigil Sentinel** is an enterprise-grade autonomous AI Risk Manager that operates **synchronously on the live checkout path** ($p50 = 9.08\text{ms}, p99 = 13.86\text{ms}$ sequential). It deploys a **4-way stacked ML ensemble** (LightGBM + CatBoost + Isolation Forest + GraphSAGE) with **persistence-gating** and **Split Conformal Calibration** to deliver **99.57–99.60% full-funnel fraud catch rate** with independently audited Bootstrap 95% CIs.

---

## 2. End-to-End System Architecture

```
                  ┌─────────────────────────────────────────────────────────────────┐
                  │          SYNCHRONOUS RISK GATING HOT PATH (<50ms SLA)           │
                  │                                                                   │
CHECKOUT REQUEST  │  Layer 0: Deterministic Anti-Checker & Tarpit Trap (<1.2ms)     │
─────────────────►│  Layer 1: Armed 50 Canary Honeytokens (<2.5ms)                  │
                  │  Layer 2: Sliding-Window Atomic Velocity (<3.0ms)               │
                  │  Layer 3: Device-Bound WebRTC & ASN Classifier (<3.5ms)         │
                  │  Layer 4: Kinetic Biometric Shannon Entropy Gate (<4.0ms)       │
                  │  Layer 5: 4-Way Stacked ML Ensemble (<8.5ms)                    │
                  │  Layer 6: Zero-Trust 3DS2 & OTP Relay Defense (<2.1ms)          │
                  │  Layer 7: NetworkX Louvain Graph Cluster Engine (<4.2ms)        │
                  └───────────────────────┬─────────────────────────────────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                               ▼                                ▼
    Tier 1: Genuine                Tier 2: Soft-Risk               Tier 3: Bot
    Instant Approval           Dynamic UPI QR Hold (5-min)    8-sec Tarpit Poison

                      ASYNCHRONOUS DEEP INTELLIGENCE PLANE
                      ──────────────────────────────────────
                      • NetworkX Louvain Mule Ring Graph (Q=0.8994)
                      • Threat Memory Copilot RAG (8D Cosine Similarity)
                      • Red-Team Adversarial Coevolution Simulator
                      • 5-Domain Dispute Evidence PDF (ReportLab)
                      • PSI Drift Monitor & Doubly Robust Policy Eval
```

---

## 3. The 8-Layer Defense Grid & Synchronous SLA

| Layer | Defense Engine | Typical SLA | Mechanism |
| :--- | :--- | :---: | :--- |
| **L0** | Anti-Checker & Tarpit Sentinel | $< 1.2\text{ ms}$ | Luhn check, micro-auth detection (<₹2.00). Returns 8-second synthetic delay to botnet. |
| **L1** | 50 Armed Dynamic Canary Honeytokens | $< 2.5\text{ ms}$ | Cryptographic BIN honeytokens with verified 0% FPR escape hatch. |
| **L2** | Atomic Sliding-Window Velocity | $< 3.0\text{ ms}$ | In-memory Redis windows (10s/1m/10m/1h). Catches card enumeration, CVV cycling (>1 retry). |
| **L3** | WebRTC & ASN Proxy Classifier | $< 3.5\text{ ms}$ | TLS JA3 vs User-Agent mismatch + WebRTC internal IP leak. Catches datacenter/Tor proxies. |
| **L4** | Kinetic Biometric Entropy Gate | $< 4.0\text{ ms}$ | Shannon entropy $H(\Delta t)$ over typing intervals. Bots: $H < 0.60\text{ bits}$. |
| **L5** | 4-Way Stacked ML Ensemble | $< 8.5\text{ ms}$ | LightGBM + CatBoost + Isolation Forest + GraphSAGE, persistence-gated. |
| **L6** | Zero-Trust 3DS2 & OTP Relay Defense | $< 2.1\text{ ms}$ | Ed25519 single-use nonce + CAVV validation. Rejects AiTM/forged tokens. |
| **L7** | NetworkX Louvain Graph Engine | $< 4.2\text{ ms}$ | Bipartite graph partitioning, exponential edge decay ($\tau=1800\text{s}$), $Q=0.8994$. |

---

## 4. The Actual ML Model Ensemble (as in docs/metrics.json)

The canonical `docs/metrics.json` (v1.0.0) defines these evaluated model configurations. There is **no "FT-Transformer" or "Heterogeneous Neural Hybrid"** in the canonical pipeline — those names appeared in an earlier version of this document and were not backed by a run through `eval_guardrail.py`.

### Evaluated Configurations (source: `docs/metrics.json`):

**1. Tabular GBDT Blend (0.55 LGB / 0.45 CB)**
- LightGBM + CatBoost weighted blend.
- Sequential latency: $p50 = 9.08\text{ms}$, $p99 = 13.86\text{ms}$.

**2. Static 4-Way Blend (0.45 LGB / 0.35 CB / 0.10 IF / 0.10 GraphSAGE)**
- Includes Isolation Forest and Heterogeneous GraphSAGE.
- Sequential latency: $p50 = 9.42\text{ms}$, $p99 = 14.10\text{ms}$.

**3. Persistence-Gated 4-Way Blend — Selected Operating Point P2** ✅ **(Canonical deployed config)**
- Dynamic disagreement gate on top of the 4-way blend.
- Selected by Pareto tuning: maximize CVV zero-day recall subject to Edge-Case Genuine FPR ≤ 10.0% on validation.
- Selected parameters: `τ_IF=0.45, τ_sup=0.40, θ_cvv=3.0, θ_entropy=0.60, θ_time=1.5s, θ_BIN=4.0, θ_fanout_IP=8.0, θ_fanout_PAN=8.0`.
- Sequential latency: $p50 = 9.48\text{ms}$, $p99 = 14.20\text{ms}$.

**4. Isolation Forest Standalone (Unsupervised — evaluated independently)**
- PR-AUC: 0.9387 `[0.9328, 0.9445]`, ROC-AUC: 0.9722 `[0.9694, 0.9748]`.

**5. Heterogeneous GraphSAGE Standalone (Structural — evaluated independently)**
- PR-AUC: 0.8556 `[0.8449, 0.8654]`, ROC-AUC: 0.8764 `[0.8673, 0.8847]`.

---

## 5. Mathematical & Statistical Formulations

### A. Split Conformal Prediction Intervals (Distribution-Free)
$$P(Y \in C(X)) \ge 1 - \alpha \quad (\alpha = 0.05 \implies 95\% \text{ certified coverage})$$

Non-conformity scores $s_i = 1 - \hat{P}(Y = y_i \mid X_i)$ over calibration set $n = 2{,}000$:
$$\hat{q} = \text{Quantile}_{\lceil(n+1)(1-\alpha)\rceil / n}(s_1, \dots, s_n)$$

Certified prediction sets $C(X)$:
- Clean: $\hat{P}(\text{fraud}) < 1 - \hat{q} \implies C(X) = \{\text{"genuine"}\}$
- Fraud: $\hat{P}(\text{fraud}) > \hat{q} \implies C(X) = \{\text{"fraud"}\}$
- Uncertain: $1 - \hat{q} \le \hat{P}(\text{fraud}) \le \hat{q} \implies C(X) = \{\text{"genuine", "fraud"}\}$ → routes to UPI QR step-up

### B. Kinetic Keystroke Shannon Entropy
$$H(\Delta t) = -\sum_{k=1}^K p_k \log_2(p_k)$$
- Human baseline: $H \in [2.20, 3.50]\text{ bits}$.
- Robotic CDP/Puppeteer: $H < 0.60\text{ bits}$ ($>5.9\sigma$ anomaly).

### C. Temporal Louvain Graph Modularity
Bipartite edge weights decay with a 30-minute half-life ($\tau = 1800\text{s}$):
$$W(e, \Delta t) = \max\!\left(0.05,\, \exp\!\left(-\frac{\Delta t}{1800}\right)\right)$$
$$Q = \frac{1}{2m} \sum_{i,j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j) = 0.8994$$

### D. Bayesian Minimum Expected Loss (MEL) Action Tiering
$$a^* = \arg\min_{a \in \{\text{Pass, UPI-Hold, Honeypot}\}} \mathbb{E}[\text{Loss} \mid a]$$

### E. Off-Policy Doubly Robust Policy Value (source: `docs/metrics.json → governance_off_policy_eval`)
$$\hat{V}_{\text{DR}}(\pi) = \frac{1}{N} \sum_{i=1}^N \left[ \hat{Q}(x_i, \pi(x_i)) + \frac{\mathbb{I}(a_i = \pi(x_i))}{p(a_i \mid x_i)} \left( r_i - \hat{Q}(x_i, a_i) \right) \right]$$
- Policy value: **₹194.29** vs static baseline **–₹72.29** (net lift: **₹266.58/1k txns**).
- Direct method agreement: 0.972. IPW clip: 20×. Sensitivity stable across 5×/20×/uncapped.

---

## 6. Empirical Model Accuracy & Benchmark Metrics (Canonical)

**Source: `docs/metrics.json` v1.0.0. Held-out test partition N=10,000. Bootstrap 95% CI (1,000 resamples).**

> [!IMPORTANT]
> The "FT-Transformer / Heterogeneous Neural Hybrid" column and the "Official Gateway Rubric" column that appeared in an earlier version of this document have been **removed**. Neither has a verifiable source: the FT-Transformer was not run through `eval_guardrail.py`; the "Gateway Rubric" thresholds have no citable origin.

### Global Test Performance

| Metric | Tabular GBDT Blend (0.55LGB+0.45CB) | Static 4-Way Blend | Persistence-Gated P2 ✅ (Deployed) |
| :--- | :---: | :---: | :---: |
| **PR-AUC** | **0.9997** `[0.9995, 0.9999]` | **0.9991** `[0.9983, 0.9997]` | **0.9963** `[0.9944, 0.9979]` |
| **ROC-AUC** | **0.9999** `[0.9998, 0.9999]` | **0.9996** `[0.9991, 0.9999]` | **0.9986** `[0.9980, 0.9992]` |
| **ML-Layer PR-AUC** | **0.9996** `[0.9994, 0.9998]` | **0.9984** `[0.9974, 0.9992]` | **0.9958** `[0.9938, 0.9975]` |
| **Adversarial Bot Recall** | **97.60%** `[96.2%, 98.8%]` | **97.00%** `[95.6%, 98.4%]` | **97.00%** `[95.6%, 98.4%]` |
| **Full-Funnel Catch Rate** | **99.60%** `[99.36%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` |
| **Seq. $p50$** | **9.08 ms** | **9.42 ms** | **9.48 ms** |
| **Seq. $p99$** | **13.86 ms** | **14.10 ms** | **14.20 ms** |
| **40-RPS $p99$** | **28.06 ms** | **29.15 ms** | **29.35 ms** |

### Leave-One-Attack-Out: CVV Cycling Zero-Day Recall (N=500 held-out, never seen in training)

| Component | Zero-Day Recall | 95% CI | Mechanism |
| :--- | :---: | :---: | :--- |
| **Persistence-Gated P2** | **76.8%** | `[73.4%, 80.4%]` | Dynamic Disagreement + Compound Automation Gate |
| **Isolation Forest Standalone** | **75.2%** | `[71.6%, 78.8%]` | Unsupervised Anomaly (no labels required) |
| **GNN/Cluster Standalone** | **29.8%** | `[25.6%, 33.6%]` | Relational Entity Graph Clustering |
| **LightGBM Standalone** | **9.0%** | `[6.4%, 11.4%]` | Supervised (fails on unseen attack geometry) |
| **CatBoost Standalone** | **6.6%** | `[4.6%, 8.8%]` | Supervised (fails on unseen attack geometry) |
| **Tabular GBDT Blend** | **8.2%** | `[5.8%, 10.6%]` | Supervised Blend (fails on unseen geometry) |

### Per-Segment Performance (Persistence-Gated P2 — Deployed Config)

| Segment | N (test) | FPR / Recall |
| :--- | :---: | :--- |
| **Normal Genuine** | 6,500 | FPR = **0.09%** `[0.00%, 0.27%]` |
| **Edge-Case Genuine (VPN/Travelers)** | 500 | FPR = **10.6%** — *validated trade-off, not 0%* |
| **Slow Distributed Carding** | 1,000 | Recall = **100%** `[100%, 100%]` |
| **Rapid Burst Script Botnets** | 1,000 | Recall = **100%** `[100%, 100%]` |
| **Adversarial Realistic Bots** | 500 | Recall = **97.0%** `[95.6%, 98.4%]` |
| **CVV Cycling (In-Domain)** | 500 | Recall = **100%** `[100%, 100%]` |

### Governance Temporal Drift Test (Out-of-Window Generalization)

| Measurement | Value |
| :--- | :--- |
| Training window | Months 01–08 (N=4,000) |
| Held-out window | Months 09–12 (N=2,000, frozen) |
| Static baseline collapse | Month 07 → 0.00% recall |
| Remediated aggregate recall | **69.6%** `[67.5%, 75.4%]` |
| Normal genuine FPR (held-out) | **0.0%** (0/1,348 false positives) |
| Edge-case genuine FPR (held-out) | **8.1%** `[3.8%, 12.4%]` (N=148, small-N caveat) |

### Governance Reviewer Validation (Frozen 15% Stratified Slice, N=1,500)

| Gate | Result |
| :--- | :--- |
| Precision | 95.53% |
| Recall | 99.78% |
| FPR (Normal Genuine) | 0.00% |
| FPR (Edge-Case Genuine) | 6.00% |
| Six-Gate Policy | **6/6 PASSED** |
| Promotion Verdict | `RECOMMENDED_FOR_HUMAN_APPROVAL` |

---

## 7. Comprehensive Feature Matrix (All Built Capabilities)

### 1. ⚡ Live In-App Stress Benchmark & SLA Verification Gauge
- Runs 200–1,000 live parallel checkout evaluations under 10–100 concurrent workers.
- High-precision timing using `time.perf_counter_ns()` measuring pure synchronous ML gating.
- Renders real-time Recharts Latency Histogram and CDF curve with a $15\text{ms}$ SLA vertical line.
- 1-Click JSON export of SRE compliance records.

### 2. 💬 Interactive Threat Memory Copilot Incident Room (Track 02 AI Risk Manager)
- Interactive slide-out drawer connected to live transaction memory, Louvain graph topology, and RBI Master Directions.
- 8D Vector Cosine Similarity Search: $S = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$ matching against historical carding archetypes.
- Actionable 1-click triggers: `[Quarantine Entire Ring]`, `[Copy Cloudflare WAF]`, `[Download Dispute PDF]`.
- Citations from RBI and EMVCo legal documentation surfaced inline.

### 3. 📦 1-Click Merchant Export & Multi-Language SDK Snippets
- Drop-in SDK snippets for Node.js (`@geekluffy/razorvigil`), Python (`razorvigil_sentinel`), Go (`github.com/GeekLuffy/razorvigil/sdk/go`), and Java (`com.github.geekluffy:razorvigil`).
- 1-Click export to Cloudflare WAF Expression, Razorpay Risk Rules JSON, and AWS WAF Rule Groups.

### 4. 🤖 Autonomous Red-Team Adversary Simulator (5-Round Arms Race)
- Interactive 5-round coevolution arms race: Telegram script → SOCKS5 swarm → Bezier biometrics → Agent replay → Mule ring.
- Evasion reduction measured and reported with Bootstrap 95% CI certification.

### 5. 🕸️ Louvain Mule Ring & Fraud Graph Explorer
- 2D/3D Force-Directed Bipartite Graph Canvas (Card, IP, Device, Agent entities).
- Real-time Financial Blast Radius card calculating at-risk GMV (₹) and QPS.
- Interactive "Replay Bot Swarm Attack" automated simulator.

### 6. ⚖️ 5-Domain Verifiable Dispute Evidence & Governance Studio
- Automated evidence synthesis: Device Print, Biometric Entropy, 3DS2 CAVV, Historical Whitelist, Geolocation.
- ReportLab PDF dossiers with SHA-256 tamper-evident seals.

### 7. 🛍️ Live Merchant Storefront & Kinetic Biometric Capture
- Interactive e-commerce checkout capturing client-side keystroke timing intervals ($\Delta t$) and mouse jitter.
- Demonstrates live dynamic recovery via Out-of-Band UPI QR step-up on soft-risk transactions.

### 8. 50 Armed Dynamic Canary Honeytokens
- Cryptographic BIN honeytoken cards with zero FPR escape hatch on legitimate retry patterns.

---

## 8. Actual Test Suite (59 pass / 2 skipped)

Verified by running `pytest tests/ --collect-only` and `pytest tests/ -v` on 2026-09-01.

```
61 collected (59 pass, 2 skipped — load_test.py standalone performance tests)

tests/test_adversarial.py          (20 tests) — velocity race, canary, shadow mode,
                                                model inversion, PSI drift, webhook dedup,
                                                HMAC tamper, 3DS2 OTP relay, AiTM, CAVV,
                                                sub-₹2000 micro-auth, accessibility guard
tests/test_benchmark_engine.py     ( 2 tests) — mixed profile, attack-heavy profile
tests/test_conformal_prediction.py ( 5 tests) — calibration guarantee, monotonicity,
                                                FT-Transformer forward pass (unit test only),
                                                temporal graph edge decay, focal loss
tests/test_copilot_chat.py         ( 4 tests) — transaction interrogation, WAF synthesis,
                                                RBI dispute query, Louvain cluster query
tests/test_governance_engine.py    ( 8 tests) — feature discovery, coevolution arms race,
                                                off-policy doubly robust, blast radius,
                                                temporal drift, six-gate policy,
                                                compliance dossier PDF, reviewer isolation
tests/test_graph_explorer.py       ( 3 tests) — topology structure, quarantine action,
                                                attack ring injection
tests/test_pipeline_integrity.py   ( 3 tests) — guardrail catches perfect point estimate,
                                                guardrail catches degenerate CI width,
                                                guardrail passes valid realistic metrics
tests/test_proxy_vpn_defense.py    ( 5 tests) — datacenter subnet, Tor exit node,
                                                proxy chaining headers, WebRTC leak,
                                                VPN soft-risk routing
tests/test_sdk_export_and_arms_race.py (3 tests) — SDK snippets export (GeekLuffy packages),
                                                WAF + risk rules export, 5-round arms race
tests/test_stress_benchmarks.py    ( 5 tests) — conformal significance boundaries,
                                                Bayesian loss singularity & extreme amounts,
                                                OTP keystroke boundary delays,
                                                canary exhaustion & ID coverage,
                                                concurrent 3DS anti-bypass evaluations
tests/test_webhook_idempotency.py  ( 1 test)  — durable webhook idempotency

Total: 59 passed, 2 skipped, 48 warnings in ~22.56s
```

> [!NOTE]
> `test_conformal_prediction.py::test_ft_transformer_forward_pass` tests the FT-Transformer **module's forward pass in isolation**. It does not constitute a full eval-pipeline run of the FT-Transformer against the held-out test set. The model's global performance metrics have NOT been entered into `docs/metrics.json` and must not be cited externally until that run completes and passes `eval_guardrail.py`.

---

## 9. Regulatory Compliance (RBI 2025 & EMVCo 3DS 2.2)

1. **Reserve Bank of India (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025 (effective April 1, 2026)**:
   - Mandates dynamic Risk-Based Authentication (RBA) for digital payment transactions.
   - No invented "frictionless exemption for sub-15ms checkouts" clause is claimed here — that phrase does not appear in the regulatory text and has been removed from this document.

2. **Card-on-File Tokenization (CoFT)**:
   - All velocity windows, graph networks, and ML features operate on SHA-256 surrogate tokens (`card_hash`). Zero cleartext PAN/CVV retention.

3. **EMVCo 3DS 2.2 Protocol and Core Specification**:
   - Cryptographic CAVV/AAV verification enables liability shift to issuing banks on successful authentication.

4. **ISO 8583 Audit Trails**:
   - 5-domain evidentiary packages generated per flagged authorization, with SHA-256 digital seals.

---

## 10. Multi-Language Drop-in SDK Specifications

All packages hosted under `github.com/GeekLuffy/razorvigil`. Starter source implementations exist in `sdk/`.

| Language | Install | Integration |
| :--- | :--- | :--- |
| **Go** | `go get github.com/GeekLuffy/razorvigil/sdk/go` | `shield.Evaluate(ctx, payload)` |
| **Node.js** | `npm install @geekluffy/razorvigil` | `sentinel.evaluate(req.body)` |
| **Python** | `pip install git+https://github.com/GeekLuffy/razorvigil.git#subdirectory=sdk/python` | `await sentinel.evaluate_async(payload)` |
| **Java** | `com.github.geekluffy:razorvigil:1.0.0` | `sentinel.evaluate(payload)` |

---

## 11. Repository Topology & File Inventory

```
razorvigil/
├── backend/
│   ├── main.py                       # Unified FastAPI server (30+ REST & WebSocket endpoints)
│   ├── razorpay_client.py            # Mock Razorpay API Gateway client
│   ├── agent/attestation.py          # Autonomous AI Agent Ed25519 token attestation
│   ├── antichecker/                  # Layer 0 anti-checker & proxy/VPN subnet classifiers
│   ├── canary/canary_cards.py        # 50 armed dynamic honeytoken cards
│   ├── copilot/                      # Threat Memory Copilot RAG & chargeback evidence
│   ├── dataset/                      # Synthetic 50k transaction generator (Polars/Numpy)
│   ├── decision/                     # Tiering, Bayesian loss, OTP defense & 3DS2 verifier
│   ├── governance/                   # Coevolution arms race, PSI drift & doubly robust eval
│   ├── graph/cluster_engine.py       # NetworkX Louvain community modularity engine
│   ├── models/                       # LightGBM, CatBoost, Isolation Forest & Split Conformal
│   ├── recovery/recovery_stub.py     # Dynamic Out-of-Band UPI QR recovery engine
│   └── velocity/redis_velocity.py    # In-memory Redis sliding-window atomic velocity tracker
├── frontend/
│   └── src/
│       ├── App.jsx                   # Master SOC Dashboard orchestrator & tab controller
│       └── components/
│           ├── StressBenchmarkModal.jsx        # Live SLA parallel stress benchmark modal
│           ├── CopilotIncidentRoom.jsx          # Track 02 AI Risk Manager conversational drawer
│           ├── IntegrationExportModal.jsx       # Multi-language SDK & WAF export modal
│           ├── RedTeamArmsRaceWorkspace.jsx     # 5-round adversarial coevolution arms race
│           ├── FraudGraphCanvas.jsx             # 2D/3D Force-directed Louvain graph canvas
│           ├── FraudGraphExplorer.jsx           # Mule ring attack simulator & blast radius
│           ├── ThreatLabWorkspace.jsx           # Threat simulator lab & attack payload injector
│           ├── ActiveDefenseWorkspace.jsx       # Cloudflare WAF & active defense rules engine
│           ├── DisputeCaseWorkspace.jsx         # 5-domain chargeback evidence & PDF generator
│           ├── ModelGovernanceStudio.jsx        # PSI drift, 6-gate policy & doubly robust
│           ├── ArchitectureOverview.jsx         # Architecture, math formulas & RBI specs
│           ├── MerchantStore.jsx               # Live e-commerce store with biometric capture
│           └── ExecutiveGuideModal.jsx          # 1-minute guided interactive tour for evaluators
├── sdk/                              # Starter SDK source (Go, Node.js, Python)
├── docs/
│   ├── metrics.json                  # CANONICAL single source of truth for all metrics (v1.0.0)
│   ├── README.md                     # Diataxis documentation hub & navigation index
│   ├── tutorial-quickstart.md        # Tutorial: setup to first live evaluation (<3 steps)
│   ├── howto-merchant-integration.md # How-To: drop-in SDK (<5 lines) in 4 languages
│   ├── howto-stress-benchmarks.md    # How-To: parallel SLA benchmark execution
│   ├── howto-waf-and-rules-export.md # How-To: Cloudflare WAF & Razorpay rules export
│   ├── howto-dispute-representation.md # How-To: RBI dispute dossier generation
│   ├── reference-api.md              # Reference: complete REST & WebSocket API spec
│   ├── reference-models-and-math.md  # Reference: model specs & mathematical formulations
│   └── explanation-architecture-and-tradeoffs.md # Explanation: design decisions & trade-offs
├── tests/                            # 61 collected (59 pass, 2 skipped)
└── requirements.txt                  # Python backend dependencies
```

---

## Audit Trail for This Document

| Claim | Source Checked | Status |
| :--- | :--- | :--- |
| 59 tests pass | `pytest tests/ --collect-only` + `pytest tests/ -v` on 2026-09-01 | ✅ Verified |
| PR-AUC / ROC-AUC / Catch Rate figures | `docs/metrics.json` keys `global_test_metrics` | ✅ Verified |
| CVV cycling recall (76.8%) | `docs/metrics.json` key `leave_one_attack_type_out` | ✅ Verified |
| Edge-Case Genuine FPR = 10.6% | `docs/metrics.json` key `per_segment_performance[edge_genuine].persistence_gated_fpr` | ✅ Verified |
| Latency p50/p99 | `docs/metrics.json` key `latency_budget.sequential_100_tx` | ✅ Verified |
| Doubly Robust policy value (₹194.29) | `docs/metrics.json` key `governance_off_policy_eval` | ✅ Verified |
| "FT-Transformer" global metrics | `docs/metrics.json` | ❌ NOT PRESENT — removed from this document |
| "Official Gateway Rubric" thresholds | No verifiable source | ❌ Removed from this document |
| "0.00% false declines" | Contradicted by `per_segment_performance[edge_genuine]` | ❌ Corrected to 10.6% Edge FPR |
| RBI citation text | Corrected to match established citation format | ✅ Fixed |
| "frictionless exemption" clause | No regulatory text source exists | ❌ Removed |

*This document is a local audit artifact. Do not merge into README.md, MODEL_CARD.md, or SUBMISSION_KIT.md without a senior review of all claims. The canonical metric source is always `docs/metrics.json`.*
