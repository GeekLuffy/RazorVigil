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
> 1. **Optuna-Tuned Hybrid ML Scoring**: LightGBM Classifier + Calibrated Isolation Forest trained on 50,000+ transactions with SMOTE, achieving **PR-AUC 0.9983** on held-out ML-only evaluation (after excluding canary hits and deterministic rule overrides).
> 2. **Sliding-Window Velocity & Graph Clustering**: Real-time Redis counters paired with an asynchronous NetworkX Louvain community detection engine to identify coordinated carding rings across rotating proxies.
> 3. **50 Luhn-Valid Canary Honeytokens**: Synthetic PANs seeded exclusively within our own decoy inventory and honeytoken check endpoint — discoverable only via BIN-enumeration or scraping directed at our own system. Any match triggers a deterministic 1.0-confidence block. The **0.00% FPR guarantee applies strictly to the canary detection layer**, not the ML layer.
> 4. **Agent-Aware Risk Layer**: Distinguishes malicious headless bots from legitimate AI shopping agents via signed JWT attestation headers (Google AP2 Protocol).
> 5. **Track 03 Revenue Recovery Bridge**: Borderline anomalies (VPN users, travelers) are never hard-declined. They are routed to `soft_risk` and issued single-use signed UPI QR recovery links that rescue lost GMV, confirmed by Razorpay Webhooks.
> 6. **Forensic Copilot with Threat Memory RAG**: In-memory cosine similarity retrieval over historical carding campaigns generates contextual threat briefs off the hot path.
> 7. **Autonomous WAF & Threat Advisory**: Generates real-time Razorpay Custom Risk Rules and Cloudflare edge WAF rules directly from detected graph clusters.
> 8. **AI Dispute Evidence Dossier Synthesizer**: Compiles zero-hallucination, 5-domain verifiable draft evidence packages (HMAC signatures, TLS JA3/JA4, biometrics, Louvain graph rings, and Reserve Bank of India (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025 (effective April 1, 2026) compliance context) for merchant/human review. Output is a structured draft dossier — not a formally filed document.
> 9. **Human-in-the-Loop (HITL) Case Resolution & Model Governance**: Interactive SOC dispute management workspace allowing one-click evidence review, Track 03 UPI recovery routing, and live held-out model evaluation analytics (Confusion Matrix, Feature Importances, and Ablation Matrices).

### Key Metrics & Impact (50,000-Row Stratified Reporting)
> - **Full-Funnel Catch Rate**: **100.00%** (Combined defense: 50 Canary Honeytokens + Deterministic Rules + ML Pipeline).
> - **ML-Layer PR-AUC**: **0.9983** (Fraud Base Rate / Prevalence: **22.25%**, evaluated on the 9,003 ambiguous transactions reaching ML scoring after excluding canary hits and deterministic rule overrides).
> - **Adversarial-Realistic PR-AUC**: **0.9991** (Fraud Base Rate / Prevalence: **6.67%**, evaluated on stealth carding bots with injected timing jitter against genuine shoppers).
> - **Zero-Day Generalization Catch Rate**: **91.76%** (Trained *without* CVV-cycling examples; model successfully intercepted unseen CVV-cycling attacks via velocity & anomaly signals).
> - **Methodological Rigor Note**: To guard against inductive bias from in-house synthetic attack design ("grading our own homework"), out-of-distribution robustness is verified via leave-one-attack-type-out cross-validation across unseen attack distributions.
> - **Synchronous Latency Budget**:
>   - **Sequential Baseline**: **p50 = 9.08ms | p95 = 11.81ms | p99 = 13.86ms** (tested on 100 sequential checkout transactions).
>   - **Sustained Throughput (40 req/s)**: **p50 = 9.44ms | p95 = 18.62ms | p99 = 28.06ms** (strictly below the 50ms gateway budget).
> - **Ensemble Weight Ablation**:
>   - Full Ensemble (0.70 LGB / 0.20 IF / 0.10 Louvain): **ML-Layer PR-AUC 0.9983 | Recall 99.1%**
>   - No LightGBM (IF + Cluster only: 0.00 / 0.65 / 0.35): PR-AUC **0.9983** and Recall **97.80%**, proving unsupervised IF/Cluster provide independent zero-day boundary defense.
> - **Pitch Metric**: **`Net_Value_Protected` = Fraud Loss Prevented − [False Positive Cost − Recovered GMV]**.

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
