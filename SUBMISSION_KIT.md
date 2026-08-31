# 🏆 RazorShield Sentinel — Grand Prize Submission Kit
**Razorpay AI Buildathon 2026**
*Track 02: AI Risk Manager (Primary) + Track 03: Revenue Recovery (Bridge Feature)*

---

## 📌 1. Project Title & Tagline

- **Project Name**: **RazorShield Sentinel**
- **Tagline**: Specialist Carding & Bot-Abuse Sub-Agent for Razorpay Agent Studio — Exposed via MCP, Built on the Same Claude Agent SDK Stack
- **Tracks**: **Track 02 (AI Risk Manager)** & **Track 03 (Revenue Recovery)**

---

## 📝 2. Razorpay Submission Form Copy (Paste-Ready)

### Problem Statement (What problem does it solve?)
> Carding attacks, BIN enumeration, and credential-stuffing botnets from Telegram and underground communities cause massive financial damage to Indian merchants and payment gateways through chargebacks and processor penalties. Traditional defenses rely on blunt IP rate-limiting, which easily fails against distributed residential proxy rings while inadvertently blocking high-value genuine customers (false declines). Furthermore, emerging AI shopping agents (e.g., Google AP2 protocol) are often misclassified and blocked as headless scrapers.

### Solution & Architecture (How does it work?)
> RazorShield Sentinel is a multi-layered autonomous risk engine designed for a **strict <50ms synchronous decision budget** (averaging ~10ms p99):
> 1. **4-Way Stacked Ensemble Scoring**: LightGBM + CatBoost + Calibrated Isolation Forest + Graph Neural Network trained on a strict 3-way split (60% Train / 20% Val / 20% Held-Out Test), achieving **PR-AUC 0.9985 `[0.9976, 0.9992]`** and **ROC-AUC 0.9993 `[0.9988, 0.9997]`** with 1,000 bootstrap resamples on the held-out test partition.
> 2. **Sliding-Window Velocity & Graph Clustering**: Real-time Redis counters paired with an asynchronous NetworkX Louvain / PyG HeteroGraphSAGE community detection engine to identify coordinated carding rings across rotating proxies.
> 3. **50 Luhn-Valid Canary Honeytokens**: Synthetic PANs seeded exclusively within our own decoy inventory and honeytoken check endpoint — discoverable only via BIN-enumeration or scraping directed at our own system. Any match triggers a deterministic 1.0-confidence block. The **0.00% FPR guarantee applies strictly to the canary detection layer**, not the ML layer.
> 4. **Agent-Aware Risk Layer**: Distinguishes malicious headless bots from legitimate AI shopping agents via signed JWT attestation headers (Google AP2 Protocol).
> 5. **Track 03 Revenue Recovery Bridge**: Borderline anomalies (VPN users, travelers) are never hard-declined. They are routed to `soft_risk` and issued single-use signed UPI QR recovery links that rescue lost GMV, confirmed by Razorpay Webhooks.
> 6. **Forensic Copilot with Threat Memory RAG**: In-memory cosine similarity retrieval over historical carding campaigns generates contextual threat briefs off the hot path.
> 7. **Autonomous WAF & Threat Advisory**: Generates real-time Razorpay Custom Risk Rules and Cloudflare edge WAF rules directly from detected graph clusters.
> 8. **AI Dispute Evidence Dossier Synthesizer**: Compiles zero-hallucination, 5-domain verifiable draft evidence packages (HMAC signatures, TLS JA3/JA4, biometrics, Louvain graph rings, and Reserve Bank of India (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025 (effective April 1, 2026) compliance context) for merchant/human review. Output is a structured draft dossier — not a formally filed document.
> 9. **Human-in-the-Loop (HITL) Case Resolution & Model Governance**: Interactive SOC dispute management workspace allowing one-click evidence review, Track 03 UPI recovery routing, and live held-out model evaluation analytics (Confusion Matrix, Feature Importances, and Ablation Matrices).

### Key Metrics & Impact (Strict 3-Way Held-Out Test Reporting, N=10,000, 1,000 Bootstrap CIs)
<!-- METRICS_SUMMARY:START -->
> - **Overall Test PR-AUC**: **0.9997** `[0.9995, 0.9999]` (Tabular GBDT Blend) | **0.9991** `[0.9983, 0.9997]` (4-Way Stacked Blend) (Signal Lift: **3.33x**, Prevalence: 30.00%).
> - **Overall Test ROC-AUC**: **0.9999** `[0.9998, 0.9999]` (Tabular GBDT Blend) | **0.9996** `[0.9991, 0.9999]` (4-Way Stacked Blend).
> - **ML-Layer PR-AUC**: **0.9996** `[0.9994, 0.9998]` (Evaluated on the 9,877 ambiguous transactions reaching ML scoring after excluding deterministic rule overrides).
> - **Adversarial-Realistic Catch Rate**: **97.60%** `[96.20%, 98.80%]` (Recall on stealth human-mimicking bot segment, n=500).
> - **Full-Funnel Fraud Catch Rate**: **99.60%** `[99.36%, 99.80%]` (Multi-layer defense: 50 Canary Honeytokens + Sliding-Window Velocity + ML).
> - **Leave-One-Attack-Type-Out Zero-Day Generalization (CVV-Cycling (Unobserved during training, N=500 held-out)):**
>   - **Dynamic Disagreement (Persistence-Gated P2)**: **76.80%** `[73.40%, 80.40%]` *(Compound Automation & Anomaly Bypass Gate)*
>   - **Isolation Forest Standalone (Unsupervised)**: **75.20%** `[71.60%, 78.81%]` *(Unsupervised Anomaly Boundary (No labels required))*
>   - **GNN / Cluster Risk Standalone (Structural)**: **29.80%** `[25.60%, 33.60%]` *(Relational Entity Graph Clustering)*
>   - **LightGBM Standalone (Supervised)**: **9.00%** `[6.40%, 11.40%]` *(Supervised Trees (Fails on unseen attack geometry))*
>   - **CatBoost Standalone (Supervised)**: **6.60%** `[4.60%, 8.80%]` *(Supervised Trees (Fails on unseen attack geometry))*
>   - **Tabular GBDT Blend (0.55 LGB / 0.45 CB)**: **8.20%** `[5.80%, 10.60%]` *(Supervised Tabular Blend)*
>   - **Static 4-Way Stacked Blend (0.45/0.35/0.10/0.10)**: **8.20%** `[5.80%, 10.60%]` *(Static Blend (0.80 supervised weight dilutes IF))*
> - **7-Parameter Validation Sweep & Pareto Frontier**: All seven gate parameters (tau_if=0.45, tau_sup=0.40, theta_cvv=3.0, theta_entropy=0.60, theta_time=1.5s, theta_bin=4.0, theta_fanout=(8.0, 8.0)) were tuned jointly across 2,187 configurations on the 20% validation partition ($D_{\text{val}}$) via a Pareto frontier sweep (maximizing zero-day recall subject to $\text{FPR}_{\text{val}} \le 10\%$). On the untouched test set, this achieves **10.60% Edge-Case Genuine FPR** (down from 80.8%) and **76.80% Zero-Day Recall**.
> - **Wilcoxon-Mann-Whitney Exact Mathematical Proof**: Verified that global ROC-AUC 0.999864 $\approx 0.9999$ is the exact closed-form expectation across stratified positive/negative pairs (77.38% clean-vs-clean with $\text{AUC}=1.0$, 5.95% clean-vs-hard with $\text{AUC}=0.9998$, 15.48% ambig-vs-clean with $\text{AUC}=0.9999$, and 1.19% ambig-vs-hard with $\text{AUC}=0.9910$).
> - **Reconciliation with Earlier 91.76% Claim**: The earlier 91.76% figure is confirmed to have shared the exact same root cause as the synthetic feature separability bug (disjoint interval ranges in non-target features in early synthetic iterations). In realistic noisy e-commerce distributions, supervised models drop to 6.60%–9.00% on unobserved attack geometries. The unsupervised Isolation Forest provides the genuine zero-day mechanism (75.20% recall), and persistence-gated dynamic disagreement routing prevents supervised dilution (76.80% recall). The earlier 91.76% figure is formally **superseded**.
> - **Synchronous Latency Budget**:
>   - **Sequential Baseline**: **p50 = 9.08ms | p95 = 11.81ms | p99 = 13.86ms** (tested on 100 sequential checkout transactions).
>   - **Sustained Throughput (40 req/s)**: **p50 = 9.44ms | p95 = 18.62ms | p99 = 28.06ms** (strictly below the 50ms gateway budget).
> - **Ensemble Component Ablation Matrix**:
>   - Tabular GBDT Blend (0.55 LGB / 0.45 CB): **PR-AUC 0.9997 `[0.9995, 0.9999]` | ROC-AUC 0.9999 `[0.9998, 0.9999]`**
>   - Stacked 4-Way Blend (0.45 LGB / 0.35 CB / 0.10 IF / 0.10 GNN): **PR-AUC 0.9991 `[0.9983, 0.9997]` | ROC-AUC 0.9996 `[0.9991, 0.9999]`**
>   - Persistence-Gated P2 Blend: **PR-AUC 0.9963 `[0.9944, 0.9979]` | ROC-AUC 0.9986 `[0.9980, 0.9992]`**
>   - Isolation Forest Standalone (Unsupervised): **PR-AUC 0.9387 `[0.9328, 0.9445]` | ROC-AUC 0.9722 `[0.9694, 0.9748]`**
>   - HeteroGraphSAGE Graph Standalone: **PR-AUC 0.8556 `[0.8449, 0.8654]` | ROC-AUC 0.8764 `[0.8673, 0.8847]`**
> - **Pitch Metric**: **`Net_Value_Protected` = Fraud Loss Prevented − [False Positive Cost − Recovered GMV]**.
<!-- METRICS_SUMMARY:END -->

---

## 🤖 3. Razorpay Agent Studio Integration (MCP Sub-Agent Positioning)

**Positioning**: RazorShield Sentinel is **not** an alternative to Razorpay's native Agent Studio (launched March 12, 2026 at FTX'26) — Razorpay already ships a native transaction-monitoring fraud agent and a Dispute Responder agent. RazorShield is the **specialist carding/bot-abuse sub-agent** that Razorpay's own agents can delegate to for deep-forensic investigation — exposed using the same MCP protocol and Claude Agent SDK stack that Agent Studio is built on.

### MCP Tool Schema (4 Tools)
```python
# Tool 1: Instant canary-hit detection
check_canary_status(transaction_id: str) -> {"is_canary": bool, "confidence": float, "canary_index": int | None}

# Tool 2: Cluster-risk score from live Louvain graph
get_cluster_risk_score(device_fingerprint: str | None, ip_hash: str | None, card_hash: str | None) -> {"cluster_score": float, "cluster_id": str, "ring_size": int}

# Tool 3: Full 8-layer pipeline investigation
investigate_transaction(transaction_id: str) -> {"tier": str, "risk_score": float, "explanation": str, "signals": dict}

# Tool 4: 5-domain draft evidence dossier (feeds Razorpay's Dispute Responder)
compile_dispute_evidence(transaction_id: str) -> {"package_id": str, "claims": list, "signal_strength": float, "dossier_draft": str}
```

### How It Plugs Into Agent Studio
> A judge-facing 1-sentence pitch: "We're not competing with what Razorpay just shipped — we're building the specialist carding/bot-abuse sub-agent that Razorpay's own Agent Studio can delegate to, exposed the same way Razorpay exposes its own agents: via MCP on the Claude Agent SDK."

| Integration Point | What It Enables |
|---|---|
| `investigate_transaction` | Razorpay's native fraud agent delegates deep-forensic carding investigation to us |
| `compile_dispute_evidence` | Our 5-domain dossier feeds Razorpay's own Dispute Responder with richer evidence |
| `check_canary_status` | Instant zero-latency honeytoken check any agent can call |
| `get_cluster_risk_score` | Real-time Louvain graph risk score for any entity hash |

---

## 🧪 4. Verification & Live Operational Scenarios

| Scenario | Trigger / Endpoint | Observed Engine Behavior | Target Defense Layer |
|---|---|---|---|
| **Baseline Customer Purchase** | Standard human checkout on SneakerVault | Risk Score &lt; 0.15 (`safe`), latency &lt; 12ms. Provisions Razorpay Order ID. | Layer 3 LightGBM &amp; Biometrics |
| **15x Telegram Botnet Burst** | Rapid carding attempts across datacenter proxies | Risk Score &gt; 0.90 (`high_confidence_bot`), quarantined to silent honeypot. | Layer 1 Sliding-Window Redis Velocity |
| **Canary Honeytoken Breach** | Card scan on armed Canary BIN | Confidence 1.0 block (`high_confidence_bot`), 0.00% False Positive rate on canary layer. | Layer 0 Canary Honeytoken Traps |
| **Legitimate Customer on VPN** | Genuine biometrics + datacenter ASN | Routed to `soft_risk`, single-use UPI QR link issued. GMV recovered upon settlement. | Layer 4 Track 03 Out-of-Band Bridge |
| **Google AP2 AI Shopping Agent** | Headless checkout with valid `X-Agent-Attestation` | Attestation verified, velocity monitored, routed to `verified_agent`. | Layer 0 Agent-Aware Gate |
| **MCP Agent Delegation Demo** | Claude Agent SDK agent calls `investigate_transaction` → `compile_dispute_evidence` | Full forensic pipeline + draft evidence dossier returned as structured JSON | Agent Studio MCP Integration |

---

## 🚀 5. How to Run Locally

```powershell
# 1. Start Backend API (Port 8000)
cd C:\Users\Owais\Documents\RazorPay\razorshield
python -m uvicorn backend.main:app --port 8000

# 2. Start Frontend SOC Dashboard (Port 5173)
cd C:\Users\Owais\Documents\RazorPay\razorshield\frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📚 Deep Dives & Verification Reports

- 🧭 **[Technical Walkthrough](docs/WALKTHROUGH.md)** — Architectural details, layer descriptions, and system flow.
- 🔬 **[External Validation Benchmark](docs/EXTERNAL_VALIDATION.md)** — Cold-transfer validation on real-world datasets (ULB & IEEE-CIS).
- 🗺️ **[Production Roadmap & Scope](docs/ROADMAP_AND_LIMITATIONS.md)** — Engineering boundaries, multi-tenant scaling, and future federated defenses.
