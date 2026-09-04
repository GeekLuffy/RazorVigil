# RazorVigil — Technical Architecture & System Specification
**Project Version:** 2.6.0-Production (Audited Release)  
**Document Type:** Technical Architecture Dossier & System Specification  
**Audience:** Payment Security Engineers, ML Systems Auditors, and Technical Reviewers  
**Date of Record:** September 2026  
**Test Suite Verification:** 59 Passed, 2 Skipped, 0 Failed across 61 test items (`pytest` verified)  

---

## Executive Table of Contents
1. [Executive Overview & Problem Statement](#1-executive-overview--problem-statement)
2. [End-to-End System Architecture & Hot Path Pipeline](#2-end-to-end-system-architecture--hot-path-pipeline)
3. [Machine Learning Ensemble & Persistence Gating Architecture](#3-machine-learning-ensemble--persistence-gating-architecture)
4. [Mathematical Grounding: Split Conformal Risk Prediction](#4-mathematical-grounding-split-conformal-risk-prediction)
5. [Topological Graph Engine: NetworkX Louvain Bipartite Clustering](#5-topological-graph-engine-networkx-louvain-bipartite-clustering)
6. [Compute Infrastructure & Hardware Allocation (bd216server3)](#6-compute-infrastructure--hardware-allocation-bd216server3)
7. [Threat Memory Copilot RAG Engine](#7-threat-memory-copilot-rag-engine)
8. [Regulatory Compliance: RBI Master Directions & EMVCo 3DS 2.2](#8-regulatory-compliance-rbi-master-directions--emvco-3ds-22)
9. [Edge Defense, Anti-Checker & Active Canary Honeypots](#9-edge-defense-anti-checker--active-canary-honeypots)
10. [Payment Gateway & Idempotency Layer: Razorpay Integration](#10-payment-gateway--idempotency-layer-razorpay-integration)
11. [Frontend SOC Interface & Design System](#11-frontend-soc-interface--design-system)
12. [Autonomous Governance, Red-Team Simulator & Drift Monitoring](#12-autonomous-governance-red-team-simulator--drift-monitoring)
13. [Audited Benchmarks, Latency Budgets & Empirical Validation](#13-audited-benchmarks-latency-budgets--empirical-validation)
14. [Repository Topology & Component Manifest](#14-repository-topology--component-manifest)

---

## 1. Executive Overview & Problem Statement

### 1.1 The E-Commerce Risk Challenge
Modern payment infrastructure faces sophisticated, automated fraud patterns that bypass traditional rules-based defenses:
1. **Automated Card Testing & Micro-Auth Botnets**: Distributed script engines test thousands of leaked PANs via ₹1–₹2 authorization requests to validate stolen credit card batches.
2. **Rotating Residential Proxy Swarms**: Attackers route traffic across millions of residential IP addresses, completely circumventing simple IP-based velocity limits.
3. **Synthetic Kinetic Biometrics**: Headless automation frameworks (Puppeteer, Playwright) spoof basic user behavior, generating synthetic mouse movements and timing delays.
4. **Adversarial AiTM Reverse Proxies & OTP Relays**: Reverse-proxy frameworks (Evilginx, Modlishka) intercept session tokens and one-time passwords during 3DS flows in real time.
5. **The False Decline Tax**: Conventional fixed-threshold risk scoring disproportionately rejects legitimate high-value customers. The LexisNexis True Cost of Fraud Study (Asia-Pacific, 2024) found Indian organizations incur **₹4.00 in total cost for every ₹1.00 lost to actual fraud** — making false decline losses the dominant economic threat, not the fraud itself.

### 1.2 Core Architectural Principles & Technical Approach
RazorVigil is engineered as a synchronous, in-line payment defense engine operating within strict gateway latency budgets:
- **Synchronous Hot-Path Gating (<50ms SLA Budget)**: Local in-memory decisioning delivers $p50 = 9.48\text{ ms}$ and $p99 = 14.20\text{ ms}$ sequential execution (and $p99 = 29.35\text{ ms}$ under sustained 40 RPS load), running well within standard payment gateway timeout limits.
- **Distribution-Free Risk Certification**: Instead of arbitrary probability thresholds, RazorVigil employs **Split Conformal Prediction** to provide rigorous, finite-sample coverage guarantees ($1 - \alpha = 95\%$, empirical coverage 95.40% `[94.90%, 95.80%]`).
- **Separation of Synchronous Gating and Asynchronous Intelligence**: Hot-path evaluation runs locally with zero external network hops. Heavy model retraining, 100k synthetic dataset generation, and vector embeddings are offloaded asynchronously to dedicated GPU infrastructure (`bd216server3`).
- **Dynamic Disagreement Gating on Zero-Day Attacks**: Supervised gradient-boosted trees alone fail on novel attack geometries (dropping to 6.6%–9.0% recall). RazorVigil couples supervised models with an unsupervised Isolation Forest and dynamic persistence gating, raising zero-day CVV cycling recall to **76.80%** `[73.40%, 80.40%]`.
- **Soft-Risk Out-of-Band Recovery**: Edge-case genuine shoppers (e.g. travelers, VPN users) encountering risk triggers are routed to dynamic UPI QR step-up verification rather than being hard-declined, preserving checkout conversion.

### 1.3 Hackathon Track 02 Alignment Matrix (AI Risk Manager)

| Track 02 Pillar | RazorVigil Engineering Implementation | Audited Measurement (Source: `docs/metrics.json`) |
| :--- | :--- | :--- |
| **Stop Merchant Revenue Loss** | Three-tier mitigation: (1) Deterministic botnet tarpit traps, (2) Out-of-Band UPI QR recovery for edge cases, (3) 5-domain verifiable dispute evidence dossiers. | Policy value lift: **+₹266.58 / 1,000 txns** over static baseline via Doubly Robust off-policy evaluation. |
| **Held-Out Test Set Evaluation** | 3-way partition (60% Train / 20% Val / 20% Held-Out Test, $N_{\text{test}} = 10,000$) with 1,000 bootstrap resamples. | Persistence-Gated P2: **PR-AUC 0.9963** `[0.9944, 0.9979]`, **ROC-AUC 0.9986** `[0.9980, 0.9992]`. |
| **Honest Error Accounting** | Explicitly reported per-segment false positive rates and Pareto trade-off documentation. | **Normal Genuine FPR: 0.09%** `[0.00%, 0.27%]`. **Edge-Case Genuine FPR: 10.60%** (validated Pareto trade-off for 76.80% zero-day recall). |
| **Abuse-Ring Detection** | Bipartite entity graph (Cards, IPs, Devices $\times$ Transactions) with Newman-Girvan Louvain modularity and temporal edge decay ($\tau = 1800\text{s}$). | Graph Modularity **$Q = 0.8994$**, isolating coordinated syndicate subgraphs. |
| **Fraud-Spike Detection** | Redis atomic sliding-window velocity across 10s, 1m, 10m, and 1h horizons. | Micro-burst containment: captures card enumeration and distributed sweeps within $<3.0\text{ ms}$. |
| **Chargeback Evidence Automation** | 5-domain evidence synthesis: device fingerprint, biometric entropy, 3DS2 CAVV, historical whitelist, and geolocation. | Tamper-evident PDF generation with SHA-256 digital seals and RBI regulatory citations. |
| **Defensive-Only Boundary** | All simulator components feed defensive honeypot updates, synthetic canary rotation, and threshold tuning. | Purely defensive evaluation; no offensive exploitation utilities. |

---

## 2. End-to-End System Architecture & Hot Path Pipeline

### 2.1 Macro Architecture Flow

```
                      INCOMING CHECKOUT REQUEST (Hot Path: < 50ms SLA)
                                            │
                                            ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 0: Anti-Checker Tarpit Guard (<1.2ms)                        │
│               Luhn verification, micro-auth (<₹2.00) traps, poison delay              │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 1: 50 Armed Canary Honeytokens (<2.5ms)                        │
│               Synthetic cryptographic BIN traps with 0% escape FPR                    │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 2: Atomic Sliding-Window Velocity (<3.0ms)                     │
│               Redis atomic counters (10s / 1m / 10m / 1h horizons)                    │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 3: ASN & WebRTC Proxy Classifier (<3.5ms)                      │
│               TLS JA3 fingerprint mismatch, datacenter ASN, WebRTC IP leak            │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 4: Kinetic Biometric Shannon Gate (<4.0ms)                     │
│               Inter-keystroke interval entropy H(Δt) < 0.60 bits = automated script   │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 5: Persistence-Gated ML Ensemble (<8.5ms)                      │
│               Local in-memory LightGBM + CatBoost + Isolation Forest + GraphSAGE      │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 6: Zero-Trust 3DS2 & OTP Relay Defense (<2.1ms)                │
│               Ed25519 single-use nonces, CAVV verification, AiTM token rejection      │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                  LAYER 7: Temporal Louvain Modularity Cache (<4.2ms)                  │
│               Bipartite graph community partition cache lookup (Q = 0.8994)           │
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │
                   ┌────────────────────────┴────────────────────────┐
                   ▼                                                 ▼
     [SPLIT CONFORMAL CALIBRATION]                     [BAYESIAN MEL ACTION TIERING]
  Finite-Sample 95% Coverage Bound                  argmin E[Loss | Action] Optimization
  P(Y ∈ C(X)) ≥ 1 - α (α = 0.05)                    Pass vs. UPI QR Step-Up vs. Tarpit
                   │                                                 │
      ┌────────────┴────────────────────────┬────────────────────────┴────────────┐
      ▼                                     ▼                                     ▼
[TIER 1: PASS]                       [TIER 2: SOFT-RISK HOLD]              [TIER 3: TARPIT]
• Instant Authorization (<12ms)      • Dynamic Out-of-Band UPI QR          • 8-Second Poison Latency
• Frictionless 3DS Exemption         • 5-Minute Inventory Hold             • Botnet Connection Neutralized
• Clean Genuine Traffic              • Edge-Case Genuine Recovery          • IP/Device Quarantine
```

### 2.2 Synchronous Hot Path vs. Asynchronous Intelligence Plane
A foundational design requirement of RazorVigil is that **no external network call may block the live checkout authorization path**:

1. **Synchronous In-Line Hot Path**:
   - All 8 defense layers execute locally on the application host using in-memory feature pipelines, pre-loaded model weights, and Redis cache lookups.
   - Observed sequential latency: $p50 = 9.48\text{ ms}$, $p95 = 11.81\text{ ms}$, $p99 = 14.20\text{ ms}$.
   - Observed 40 RPS throughput latency: $p50 = 9.44\text{ ms}$, $p95 = 18.62\text{ ms}$, $p99 = 29.35\text{ ms}$.
   - This keeps end-to-end processing well within payment gateway SLA limits (50.0 ms).

2. **Asynchronous Deep Intelligence Plane**:
   - Offline batch model training and hyperparameter optimization over 50k–100k transaction datasets on `bd216server3`.
   - Continuous adversarial coevolution simulations and red-team arms race benchmarks.
   - Population Stability Index (PSI) drift monitoring across historical rolling windows.
   - 5-domain verifiable dispute dossier synthesis (ReportLab PDF generation with SHA-256 seals).
   - Threat Memory RAG conversational interrogation powered by Google Gemini via direct REST integration.

---

## 3. Machine Learning Ensemble & Persistence Gating Architecture

### 3.1 Model Components & Roles
The canonical model ensemble defined in `docs/metrics.json` incorporates complementary learning paradigms:

1. **LightGBM (Supervised Gradient Boosted Trees)**:
   - Optimized via Optuna for shallow tabular feature interaction (`num_leaves=31`, `learning_rate=0.045`, `max_depth=6`).
   - Evaluates in <0.50 ms on CPU.
2. **CatBoost (Categorical Interaction Tree Engine)**:
   - Trained on structured categorical interactions (`asn_type`, `ja3_ua_mismatch`, `paste_event`).
   - 2,500 symmetric decision trees with Depth = 7.
3. **Isolation Forest (Unsupervised Manomaly Gater)**:
   - Completely unguided by historical fraud labels. Evaluates average anomaly path length $s(x, n)$ normalized to $[0, 1]$.
   - Critical for identifying zero-day attack geometries that supervised trees have never encountered.
4. **Heterogeneous GraphSAGE / Louvain Structural Risk**:
   - Computes bipartite relational connectivity across card hashes, IP subnets, and device fingerprints.
   - Surfaces structural cluster risk and ring membership.

### 3.2 The Zero-Day Generalization Problem & Persistence Gating
In supervised tabular modeling, high in-distribution metrics can create a false sense of security. When evaluated against unobserved attack geometries (e.g. CVV cycling attacks absent from training data), supervised models drop precipitously:
- LightGBM alone achieves only **9.00%** zero-day recall.
- CatBoost alone achieves only **6.60%** zero-day recall.
- A standard static 4-way blend (0.45 LGB / 0.35 CB / 0.10 IF / 0.10 GNN) drops to **8.20%** recall because the 80% supervised weight dilutes the anomaly signal from the Isolation Forest.

To solve this, RazorVigil introduces **Persistence-Gated Dynamic Disagreement Routing**:

$$\text{Gate Trigger} = \mathbb{I}\left( S_{\text{IF}}(X) \ge \tau_{\text{IF}} \;\land\; P_{\text{sup}}(X) \le \tau_{\text{sup}} \;\land\; \text{Automation}(X) = \text{True} \right)$$

$$\text{Risk}_{\text{final}} = \begin{cases} \max\left( P_{\text{sup}}(X),\, S_{\text{IF}}(X) \right) & \text{if Gate Trigger is active} \\ P_{\text{ensemble}}(X) & \text{otherwise} \end{cases}$$

Where compound automation signals evaluate:
$$\text{Automation}(X) \iff (H(\Delta t) < \theta_{\text{entropy}}) \;\lor\; (\Delta t_{\text{submit}} < \theta_{\text{time}}) \;\lor\; (\text{fanout}_{\text{IP}} \ge \theta_{\text{fanout}})$$

### 3.3 Pareto Tuning on Validation Partition
The 7 gate parameters (`tau_if`, `tau_sup`, `theta_cvv`, `theta_entropy`, `theta_time_s`, `theta_bin`, `theta_fanout`) were systematically tuned across 2,187 configurations on the validation partition ($D_{\text{val}}$, $N=10,000$).

The selection rule strictly maximized zero-day CVV recall subject to $\text{FPR}_{\text{val}} \le 10.0\%$ on the edge-case genuine segment:
- **Operating Point P1**: $\text{FPR}_{\text{edge}} = 7.2\%$, Zero-Day Recall = $71.4\%$
- **Operating Point P2 (Selected & Deployed)**: $\text{FPR}_{\text{edge}} = 9.8\%$ (validation), Zero-Day Recall = $75.8\%$ (validation)
- **Held-Out Test Realization (P2)**: **76.80% Zero-Day Recall** `[73.40%, 80.40%]`, **10.60% Edge-Case Genuine FPR**.

---

## 4. Mathematical Grounding: Split Conformal Risk Prediction

### 4.1 Distribution-Free Error Control
Fixed probability thresholds (e.g. $P > 0.70$) fail under test-time distribution shifts. RazorVigil implements inductive **Split Conformal Prediction** (`backend/models/conformal_calibrator.py`), providing guaranteed finite-sample coverage:

$$P(Y \in C(X)) \ge 1 - \alpha \qquad (\alpha = 0.05 \implies 95\%\text{ certified coverage})$$

### 4.2 Non-Conformity Scoring & Quantile Calculation
Given a held-out calibration set $\mathcal{D}_{\text{cal}} = \{(X_i, Y_i)\}_{i=1}^n$ ($n = 2,000$):
1. Compute non-conformity scores evaluating anomalousness under the predictor $\hat{P}$:
   $$s_i = 1 - \hat{P}(Y = y_i \mid X_i) = \begin{cases} \hat{P}(\text{fraud} \mid X_i) & \text{if } Y_i = 0 \;(\text{genuine}) \\ 1 - \hat{P}(\text{fraud} \mid X_i) & \text{if } Y_i = 1 \;(\text{fraud}) \end{cases}$$
2. Compute the empirical calibration quantile at significance $\alpha$:
   $$\hat{q} = \text{Quantile}_{\lceil(n+1)(1-\alpha)\rceil / n}(s_1, \dots, s_n)$$

### 4.3 Prediction Set Membership & Action Routing
For any incoming transaction with predicted fraud probability $\hat{P} = \hat{P}(\text{fraud} \mid X)$:
- Label $0$ (genuine) is included if $s(X, 0) \le \hat{q} \iff \hat{P} \le \hat{q}$.
- Label $1$ (fraud) is included if $s(X, 1) \le \hat{q} \iff 1 - \hat{P} \le \hat{q} \iff \hat{P} \ge 1 - \hat{q}$.

This establishes three mutually exclusive operational tiers:

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

- **Tier 1 (Pass)**: $C(X) = \{\text{"genuine"}\}$. Safe to claim frictionless 3DS exemption under RBI §7.2. Zero checkout friction.
- **Tier 2 (Soft-Risk Hold)**: $C(X) = \{\text{"genuine"}, \text{"fraud"}\}$. Uncertain boundary region. The transaction is held for 5 minutes, and an Out-of-Band signed UPI QR code is presented to the buyer, allowing genuine users to complete payment while blocking automated bots.
- **Tier 3 (Tarpit Block)**: $C(X) = \{\text{"fraud"}\}$. Certified fraud. Connection is tarpitted with synthetic delay and recorded in the Redis quarantine ledger.

---

## 5. Topological Graph Engine: NetworkX Louvain Bipartite Clustering

### 5.1 Bipartite Entity Construction
Carding syndicates share payment infrastructure across rotating proxy nodes and virtual machines. RazorVigil maintains an in-memory bipartite dynamic graph $G = (V_E, V_T, E)$:
- **Entity Nodes $V_E$**: SHA-256 Card Token Hashes (`card_hash`), IP Subnet Hashes (`ip_hash`), and Hardware Device Fingerprints (`device_fingerprint`).
- **Transaction Nodes $V_T$**: Unique authorization events with timestamps and amounts.
- **Dynamic Edges $E$**: Formed when an entity participates in a checkout transaction.

### 5.2 Exponential Edge Decay & Modularity
To ensure transient proxy recycling does not permanently convict benign IP subnets, edges decay with a 30-minute half-life ($\tau = 1800\text{s}$):

$$W(e, \Delta t) = \max\left(0.05,\, \exp\left(-\frac{\Delta t}{1800}\right)\right)$$

The graph engine partitions communities via Louvain optimization of Newman-Girvan modularity:

$$Q = \frac{1}{2m} \sum_{i,j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$

**Measured Modularity**: In the active network topology, RazorVigil maintains **$Q = 0.8994$**, cleanly isolating distributed carding swarms into discrete topological clusters. When a single node inside a cluster triggers a canary or velocity violation, the entire connected ring's risk score escalates immediately.

---

## 6. Compute Infrastructure & Hardware Allocation (bd216server3)

### 6.1 Server Hardware Profile
- **Hostname / Endpoint**: `bd216server3` (`192.168.20.15:8888`)
- **Host Compute**: Dual-socket Intel Xeon Gold (104 execution cores)
- **Host Memory**: 503 GB DDR4 ECC Registered RAM (464 GB available headroom)
- **GPU Cluster**: **6x NVIDIA GeForce RTX 2080 Ti** (66.0 GB aggregate GDDR6 VRAM)
- **Environment**: CUDA 13.2 / NVIDIA Driver 595.71.05 / PyTorch 2.5.1+cu121

### 6.2 Workload Isolation & Hardware Mapping
To guarantee zero resource contention with concurrent cluster workloads:
- **GPUs 0–3**: General background tasks and external research jobs.
- **GPU 4 (Physical Device ID 4)**: Dedicated to RazorVigil heavy model training, hyperparameter sweeps, and synthetic dataset generation.
- **GPU 5 (Physical Device ID 5)**: Dedicated standby node for offline LLM synthesis and vector embedding indexing.

### 6.3 Architectural Clarification: GPU Throughput vs. Live Network Latency
Benchmarks conducted on `bd216server3` (CUDA:4) across 25,000 synthetic transaction tensors demonstrate:
- **Batch Evaluation Throughput**: **148,765.4 inferences/second**.
- **Single-Tensor Kernel Execution Time**: **0.007 milliseconds (7 microseconds)**.
- **Local Network Bridge Round-Trip**: **~1.4 milliseconds** over remote socket channels.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     ARCHITECTURAL LATENCY COMPARISON                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Live Hot-Path Gating (Local In-Memory Execution):                            │
│   • Local 4-Way Ensemble Inference: 4.80 ms (P50) / 7.20 ms (P99)            │
│   • Network Hop to Remote Machine:  0.00 ms (Zero Network Overhead)          │
│   • Total Sequential Pipeline:      9.48 ms (P50) / 14.20 ms (P99)           │
│                                                                              │
│ Remote GPU Inference Alternative (Hypothetical):                             │
│   • GPU Kernel Execution:           0.007 ms                                 │
│   • Remote Network Round-Trip:      1.400 ms  <-- 200x larger than kernel    │
│   • Gateway Network Penalty:       +1.400 ms added to every checkout         │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key Architectural Decision**: Live synchronous payment authorization runs **strictly local in-process / in-memory** on the application host. Network RPC calls to external GPU servers are deliberately avoided on the hot path, ensuring P99 latency remains under 15ms. `bd216server3` is leveraged exclusively for offline batch retraining, synthetic data generation, and asynchronous Copilot RAG tasks.

---

## 7. Threat Memory Copilot RAG Engine

### 7.1 Real-Time Grounding & Direct REST Pipeline
The SOC Copilot Incident Room connects directly to Google Generative Language REST endpoints (`models/gemini-3.6-flash`), avoiding high-overhead abstraction libraries.

### 7.2 Injected Multi-Domain Context
Copilot prompts assemble live, factual operational context off the critical path:
1. **Live Transaction Forensic Snapshot**: Current transaction payload, client fingerprints, and behavioral anomalies.
2. **Model Ensemble Dissection**: Individual scores from LightGBM, CatBoost, Isolation Forest, and Louvain graph cluster risk.
3. **Conformal Uncertainty Bounds**: Calibrated non-conformity interval and set membership.
4. **Graph Syndicate Topology**: Modularity score $Q$, community ID, and connected card/device counts.
5. **Threat Memory Cosine Retrieval**: 8D vector cosine similarity against historical carding archetypes:
   $$S(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2}$$
6. **Regulatory Corpus Citations**: Relevant paragraphs from the Reserve Bank of India (RBI) Master Directions 2025/2026 and EMVCo 3DS 2.2 specifications.

### 7.3 Structured Action Generation
The Copilot produces actionable, 1-click incident responses:
- `[Quarantine Syndicate Ring]`: Immediate Redis blacklist propagation across connected entities.
- `[Export Cloudflare WAF]`: Synthesizes exact firewall expressions (`http.request.uri.path eq "/checkout" and ...`).
- `[Generate RBI Dispute Pack]`: Compiles tamper-evident PDF dossiers with SHA-256 seals for bank representation.

---

## 8. Regulatory Compliance: RBI Directions & EMVCo 3DS 2.2

1. **RBI (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025** (CO.DPSS.POLC.No.S 668/02-14-015/2025-2026, effective April 1, 2026):
   - Mandates dynamic Risk-Based Authentication (RBA) evaluating behavioural analytics, device fingerprinting, transaction pattern, and geolocation for all non-card-present transactions.
   - Cross-border CNP provisions effective October 1, 2026.
   - RazorVigil dynamically routes transactions into Green (frictionless pass), Amber (step-up challenge / UPI hold), and Red (tarpit block), directly implementing the RBA mandate.
   - No unsubstantiated regulatory exemptions are claimed; all routing conforms strictly to published guidelines.

2. **Card-on-File Tokenization (CoFT)**:
   - In accordance with RBI tokenization mandates, all internal velocity counters, graph edges, and ML feature representations operate exclusively on SHA-256 surrogate tokens (`card_hash`). Cleartext PANs and CVVs are never retained or logged.

3. **EMVCo 3-D Secure 2.2 Protocol**:
   - Implements cryptographic CAVV/AAV validation and Ed25519 single-use nonces to prevent AiTM reverse proxy interception and OTP replay attacks.
   - Successful cryptographic validation enables merchant liability shift on authenticated transactions.

4. **ISO 8583 Audit Trails**:
   - Flags authorization attempts with structured 5-domain evidentiary records suitable for formal dispute representation.

---

## 9. Edge Defense, Anti-Checker & Active Canary Honeypots

### 9.1 Behavioral Biometrics
Collected client-side during form completion without collecting personally identifiable information:
- **Keystroke Inter-Arrival Shannon Entropy $H(\Delta t)$**:
  $$H(\Delta t) = -\sum_{k=1}^K p_k \log_2(p_k)$$
  Human typing exhibits measurably higher entropy than scripted replay (Joyce & Gupta 1990 lineage; HAL survey 2025). Thresholds ($H \in [2.20, 3.50]\text{ bits}$ for humans; $H < 0.60\text{ bits}$ for bots) are **internal calibration values** derived from RazorVigil's synthetic dataset, not published peer-reviewed benchmarks.
- **Mouse Jitter & Path Curvature**: Measures Bézier linearity. Pure straight-line coordinate vectors indicate headless browser automation.
- **Input Paste Detection**: Identifies automated clipboard paste events across PAN and CVV fields.

### 9.2 JA3/JA4 TLS Fingerprint vs. User-Agent Mismatch
Extracts TLS Client Hello cipher suites, extension orders, and elliptic curve identifiers. Headless Python scripts (`urllib`, `requests`, `aiohttp`) spoofing browser User-Agent strings are caught through cryptographic mismatch against standard browser TLS signatures.

### 9.3 50 Armed Dynamic Canary Honeytokens
- **Architecture**: 50 pre-seeded, Luhn-valid synthetic credit card numbers deployed exclusively in decoy honeypots and dark-web trap endpoints.
- **Escape False Positive Rate**: Strictly **0.00% FPR** on the canary layer (these cards are never issued to genuine consumers).
- **Deterministic Action**: Any authorization attempt using a Canary card instantly triggers a 7-day global quarantine across the originating IP, /24 subnet, and device fingerprint.

---

## 10. Payment Gateway & Idempotency Layer: Razorpay Integration

### 10.1 Secure Credential Architecture
In strict adherence to enterprise security hygiene, all API keys and secrets are loaded through external environment variables and never hardcoded in source files or documentation:
- **`RAZORPAY_KEY_ID`**: Configured via environment (defaults to `rzp_test_demo12345678` in sample configs).
- **`RAZORPAY_KEY_SECRET`**: Configured via environment (defaults to `razorpay_test_secret_demo` in sample configs).
- **`RAZORPAY_WEBHOOK_SECRET`**: Configured via environment for cryptographic webhook verification.
- **Order Generation**: Verified endpoint `/api/razorpay/create-order` generating live Razorpay test orders.
- **Checkout Modal**: Client opens native `window.Razorpay(options)` modal upon passing Tier 1 risk gating.

### 10.2 Webhook Idempotency & HMAC Verification
- **Cryptographic Signature Verification**: Incoming webhook payloads are verified using HMAC-SHA256:
  $$\text{Signature} = \text{HMAC-SHA256}(\text{payload}, \text{secret})$$
- **Durable SQLite Idempotency Store (`data/webhook_events.db`)**: Duplicate event IDs triggered by network retries or gateway replays are rejected by a primary-key UNIQUE constraint, ensuring idempotency across restarts.

---

## 11. Frontend SOC Interface & Design System

### 11.1 Dashboard Architecture (React 19 & Vite)
Built with React 19, Tailwind CSS, Lucide Icons, and Recharts across 9 dedicated operational views:
1. **SOC Command Center Dashboard**: Real-time threat feed, live corridors matrix, Louvain graph ring monitor, and latency SLA meters.
2. **Transaction Ledger HUD**: Real-time audit trail displaying risk tier, conformal prediction set, and ML component breakdown.
3. **Attack Simulator & Threat Lab**: Interactive attack vector injection (Distributed Carding, Velocity Swarm, Proxy Hop, Fast Typist).
4. **Active Defense WAF Workspace**: Visual rule builder with 1-click export to Cloudflare WAF, AWS WAF, and Razorpay Custom Rules.
5. **Syndicates & Graph Canvas**: Dual-layout Louvain Rings & Bipartite Flow Canvas with real-time financial blast radius estimation.
6. **Model Governance Studio**: Real-time ROC/PR curves, feature importances, ablation matrices, and PSI drift monitors.
7. **Dispute Case Workspace**: 5-domain chargeback arbitration dossier generation with ReportLab PDF export.
8. **Architecture & Regulatory Specs**: Complete system specifications and mathematical documentation.
9. **Merchant Storefront**: Live e-commerce store with real-time biometric capture and dynamic UPI QR recovery demonstration.

### 11.2 Theme Parity & Accessibility
Full WCAG AAA color contrast support across Dark Mode (`bg-[#080a11]`) and LandGuard Light Mode (`bg-[#f8fafc]`, crisp high-contrast border and typography tokens).

### 11.3 Runtime Hindi Localization (`EN / हिन्दी`)
Complete runtime localization via `HINDI_MAP` dictionary in `Sidebar.jsx`, providing instant vocabulary switching across all navigation categories and status badges without page reloads.

---

## 12. Autonomous Governance, Red-Team Simulator & Drift Monitoring

### 12.1 Population Stability Index (PSI) Drift Monitoring
Monitors incoming feature distributions against baseline calibration sets:

$$\text{PSI} = \sum_{k=1}^K (P_k - Q_k) \cdot \ln\left(\frac{P_k}{Q_k}\right)$$

- $\text{PSI} < 0.10$: Stable distribution; no action required.
- $0.10 \le \text{PSI} \le 0.25$: Moderate shift; triggers warning and increases conformal calibration frequency.
- $\text{PSI} > 0.25$: Severe drift; automatically raises alerts and queues offline retraining on `bd216server3`.

### 12.2 Continuous Red-Team Adversary Simulator
Simulates a 5-round coevolution arms race targeting decision boundaries:
1. Round 1: Naive automated carding scripts.
2. Round 2: SOCKS5 residential proxy rotation.
3. Round 3: Bézier curve mouse jitter and typing delays.
4. Round 4: Distributed low-and-slow velocity sweeps.
5. Round 5: Multi-hop coordinated mule ring attacks.

---

## 13. Audited Benchmarks, Latency Budgets & Empirical Validation

> **Data Source**: Canonical figures audited against `docs/metrics.json` (v1.0.0). Held-out test partition $N=10,000$. Bootstrap 95% Confidence Intervals (1,000 resamples).

### 13.1 Global Test Performance Comparison

| Metric | Tabular GBDT Blend (0.55 LGB / 0.45 CB) | Static 4-Way Blend | Persistence-Gated P2 ✅ (Deployed) |
| :--- | :---: | :---: | :---: |
| **PR-AUC** | **0.9997** `[0.9995, 0.9999]` | **0.9991** `[0.9983, 0.9997]` | **0.9963** `[0.9944, 0.9979]` |
| **ROC-AUC** | **0.9999** `[0.9998, 0.9999]` | **0.9996** `[0.9991, 0.9999]` | **0.9986** `[0.9980, 0.9992]` |
| **ML-Layer PR-AUC** | **0.9996** `[0.9994, 0.9998]` | **0.9984** `[0.9974, 0.9992]` | **0.9958** `[0.9938, 0.9975]` |
| **Adversarial Bot Recall** | **97.60%** `[96.20%, 98.80%]` | **97.00%** `[95.60%, 98.40%]` | **97.00%** `[95.60%, 98.40%]` |
| **Full-Funnel Catch Rate** | **99.60%** `[99.36%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` | **99.57%** `[99.33%, 99.80%]` |
| **Sequential Latency (P50)** | **9.08 ms** | **9.42 ms** | **9.48 ms** |
| **Sequential Latency (P99)** | **13.86 ms** | **14.10 ms** | **14.20 ms** |
| **40-RPS Throughput (P99)** | **28.06 ms** | **29.15 ms** | **29.35 ms** |

### 13.2 Leave-One-Attack-Out: Zero-Day CVV Cycling Recall (N=500 Held-Out, Unseen in Training)

| Model Configuration | Detection Mechanism | Zero-Day CVV Recall | 95% Bootstrap CI | Generalization Verdict |
| :--- | :--- | :---: | :---: | :--- |
| **Persistence-Gated P2 ✅** | Dynamic Disagreement Override | **76.80%** | `[73.40%, 80.40%]` | **Robust Zero-Day Defense** |
| **Isolation Forest (Standalone)** | Unsupervised Anomaly Boundary | **75.20%** | `[71.60%, 78.81%]` | Strong Anomaly Signal |
| **GNN / Cluster Risk (Standalone)** | Relational Graph Clustering | **29.80%** | `[25.60%, 33.60%]` | Partial Structural Detection |
| **LightGBM (Standalone)** | Supervised Decision Trees | **9.00%** | `[6.40%, 11.40%]` | Fails on Unseen Attack Geometry |
| **CatBoost (Standalone)** | Supervised Decision Trees | **6.60%** | `[4.60%, 8.80%]` | Fails on Unseen Attack Geometry |
| **Tabular GBDT Blend** | Weighted Supervised Average | **8.20%** | `[5.80%, 10.60%]` | Diluted by Supervised Failure |
| **Static 4-Way Stacked Blend** | Static Fixed Weights | **8.20%** | `[5.80%, 10.60%]` | Supervised Weight Dilutes IF |

### 13.3 Per-Segment Performance (Persistence-Gated P2 Deployed Config)

| Customer Segment | Sample Size ($N$) | Metric | Measured Value | Operational Routing |
| :--- | :---: | :---: | :---: | :--- |
| **Normal Genuine Shoppers** | 6,500 | FPR | **0.09%** `[0.00%, 0.27%]` | Tier 1: Instant Approval (<12ms) |
| **Edge-Case Genuine (VPN/Travelers)** | 500 | FPR | **10.60%** *(Pareto Trade-Off)* | Tier 2: Dynamic Out-of-Band UPI QR Recovery |
| **Slow Distributed Carding** | 1,000 | Recall | **100.0%** `[100.0%, 100.0%]` | Tier 3: 8s Tarpit Poison Delay |
| **Rapid Burst Script Botnets** | 1,000 | Recall | **100.0%** `[100.0%, 100.0%]` | Tier 3: 8s Tarpit Poison Delay |
| **Adversarial Realistic Bots** | 500 | Recall | **97.00%** `[95.60%, 98.40%]` | Tier 3: 8s Tarpit Poison Delay |
| **CVV Cycling (In-Domain)** | 500 | Recall | **100.0%** `[100.0%, 100.0%]` | Tier 3: 8s Tarpit Poison Delay |

> **Accounting for the 10.60% Edge-Case FPR**: The 10.60% FPR on edge-case genuine traffic is the explicit, validated cost of raising zero-day CVV recall from 8.20% to 76.80%. Rather than declining these users, RazorVigil routes them to Tier 2 Out-of-Band UPI QR verification, rescuing legitimate transactions while neutralizing automation.

### 13.4 Synchronous Latency Budget Breakdown

| Pipeline Layer | Allocated Budget | Observed Latency (P50) | Observed Latency (P99) | Execution Scope |
| :--- | :---: | :---: | :---: | :--- |
| **Layer 0: Anti-Checker & Tarpit Guard** | < 1.2 ms | 0.35 ms | 0.82 ms | Local In-Memory |
| **Layer 1: 50 Armed Dynamic Canary Honeytokens** | < 2.5 ms | 0.45 ms | 1.10 ms | Local In-Memory |
| **Layer 2: Sliding-Window Velocity (Redis Atomic)** | < 3.0 ms | 1.15 ms | 2.10 ms | Local In-Memory Cache |
| **Layer 3: WebRTC & ASN Proxy Classifier** | < 3.5 ms | 0.85 ms | 1.45 ms | Local Subnet Lookup |
| **Layer 4: Kinetic Biometric Keystroke Entropy** | < 4.0 ms | 0.90 ms | 1.60 ms | Local Math Computation |
| **Layer 5: Local Quad-Model Ensemble** | < 8.5 ms | 4.80 ms | 7.20 ms | Local In-Memory Models |
| **Layer 6: Zero-Trust 3DS2 & Conformal Calibration** | < 2.1 ms | 0.40 ms | 0.95 ms | Local Quantile Lookup |
| **Layer 7: Louvain Modularity Cache Lookup** | < 4.2 ms | 0.58 ms | 1.15 ms | Local Graph Cache |
| **End-to-End Pipeline (Sequential 100 txns)** | **< 50.0 ms** | **9.48 ms** | **14.20 ms** | **Hot Path Complete** |
| **End-to-End Pipeline (Sustained 40 RPS Load)** | **< 50.0 ms** | **9.44 ms** | **29.35 ms** | **Hot Path Under Load** |

### 13.5 Governance & Economic Validation
- **Doubly Robust Off-Policy Evaluation ($N=10,000$)**:
  - RazorVigil Policy Value: **₹194.29** vs. Static Baseline: **-₹72.29**
  - Net Economic Lift: **₹266.58 / 1,000 transactions**
  - Direct Method Agreement: **0.972**
- **Temporal Drift Stress Test (Months 01–08 Train vs. Months 09–12 Frozen Holdout)**:
  - Static baseline collapses to 0.00% recall by Month 07.
  - Multi-modal persistence policy sustains **69.64%** `[67.46%, 75.40%]` held-out fraud recall through Month 12.
  - Normal genuine FPR in frozen holdout: **0.00%** (0/1,348 false declines).
- **Automated Test Suite Execution**:
  - **59 passed, 2 skipped, 0 failed** across 61 test items in `tests/` in ~37 seconds.

---

## 14. Repository Topology & Component Manifest

```
razorvigil/
├── .env.example                          # Environment configuration template (sanitized)
├── .gitignore                            # Git exclusion rules (excluding caches, db, credentials)
├── Dockerfile                            # Production multi-stage Docker build
├── docker-compose.yml                    # Container orchestration (FastAPI + Redis)
├── requirements.txt                      # Pinned Python dependencies (torch, catboost, lightgbm, fastapi)
├── PROJECT_SENTINEL_DEEP_DOSSIER.md     # Technical Architecture & System Specification
├── PROJECT_DEEP_ANALYSIS.md             # Audited master report & reconciliation record
├── README.md                             # Public documentation & architecture index
├── SUBMISSION_KIT.md                     # Track 02 submission copy & benchmark summary
│
├── backend/
│   ├── main.py                           # FastAPI application & pipeline orchestration
│   ├── razorpay_client.py                # Razorpay payment gateway integration
│   ├── webhook_idempotency.py            # SQLite idempotent event tracking & HMAC verification
│   ├── antichecker/
│   │   ├── anti_checker_engine.py        # Carding swarm detector & burst frequency analyzer
│   │   ├── middleware.py                 # ASGI request header interception middleware
│   │   └── proxy_detector.py             # Datacenter ASN & JA3 TLS fingerprint matcher
│   ├── canary/
│   │   ├── canary_cards.py               # 50 active honeytoken card definitions & ban hooks
│   │   └── dynamic_canary.py             # Automated canary rotation & decoy generation
│   ├── copilot/
│   │   ├── copilot_chat.py               # Google Gemini REST RAG integration
│   │   ├── chargeback_evidence.py        # 5-domain dispute evidence pack compiler
│   │   └── fraud_analyst.py              # Forensic root-cause investigator
│   ├── dataset/
│   │   └── generate_dataset_polars.py    # Synthetic 50k transaction generator
│   ├── decision/
│   │   ├── otp_defense.py                # Dynamic OTP challenge router & verification
│   │   ├── three_ds_verifier.py          # EMVCo 3DS 2.2 protocol client & exemption evaluator
│   │   └── tiering.py                    # Final Green / Amber / Red policy decision logic
│   ├── governance/
│   │   ├── drift_monitor.py              # PSI & Wasserstein distribution drift monitor
│   │   ├── policy_verifier.py            # Hard safety constraint auditor & compliance verifier
│   │   └── reviewer.py                   # Automated model update reviewer
│   ├── gpu/
│   │   └── cluster_client.py             # Authenticated bridge to bd216server3 for offline tasks
│   ├── graph/
│   │   ├── cluster_engine.py             # NetworkX bipartite Louvain modularity calculator
│   │   └── temporal_graph_engine.py      # Sliding-window dynamic graph builder
│   ├── models/
│   │   ├── catboost_model.pkl            # Deployed CatBoost model weights
│   │   ├── lgbm_model.pkl                # Deployed LightGBM model weights
│   │   ├── if_model.pkl                  # Unsupervised Isolation Forest anomaly model
│   │   ├── conformal_calibrator.py       # Split Conformal non-conformity calibration engine
│   │   ├── eval_guardrail.py             # Statistical integrity & leakage audit guardrail
│   │   └── inference.py                  # Unified synchronous RiskScorer inference engine
│   └── velocity/
│       └── redis_velocity.py             # Sliding-window atomic Redis velocity counters
│
├── frontend/
│   ├── package.json                      # Frontend dependencies (React 19, Vite, Tailwind, Recharts)
│   ├── src/
│   │   ├── App.jsx                       # Application root with hash routing & theme state
│   │   ├── components/
│   │   │   ├── Sidebar.jsx               # Navigation sidebar with runtime Hindi translation
│   │   │   ├── CopilotIncidentRoom.jsx   # AI Copilot chat with rich ReactMarkdown rendering
│   │   │   ├── FraudGraphCanvas.jsx      # Force-directed Louvain ring & flow canvas
│   │   │   ├── MerchantStore.jsx         # Demo store with live Razorpay checkout & biometric capture
│   │   │   ├── ActiveDefenseWorkspace.jsx# WAF rules builder & Cloudflare export
│   │   │   ├── DisputeCaseWorkspace.jsx  # Chargeback arbitration dossier generation
│   │   │   └── ModelGovernanceStudio.jsx # Model ROC/PR curves & drift charts
│   │   └── pages/                        # 9 enterprise SOC views
│   └── vite.config.js                    # Vite configuration
│
├── docs/
│   ├── metrics.json                      # Audited single source of truth for all metrics (v1.0.0)
│   ├── README.md                         # Diataxis documentation hub & index
│   └── reference-models-and-math.md      # Detailed mathematical specifications
│
└── tests/
    ├── test_adversarial.py               # 20 adversarial attack resilience tests
    ├── test_benchmark_engine.py          # Latency & throughput stress tests
    ├── test_conformal_prediction.py      # Split Conformal mathematical coverage tests
    ├── test_copilot_chat.py              # Copilot RAG integration tests
    ├── test_governance_engine.py         # Drift & policy verification tests
    ├── test_graph_explorer.py            # NetworkX graph modularity tests
    ├── test_pipeline_integrity.py        # Metrics integrity guardrail tests
    ├── test_proxy_vpn_defense.py         # JA3 & proxy defense verification tests
    ├── test_sdk_export_and_arms_race.py  # Multi-round red-team simulation tests
    ├── test_stress_benchmarks.py         # Boundary conditions & extreme amounts tests
    └── test_webhook_idempotency.py       # Razorpay webhook HMAC & idempotency tests
```

---
**END OF TECHNICAL ARCHITECTURE & SYSTEM SPECIFICATION.**
