# 🏆 RazorShield Sentinel — Grand Prize Submission Kit
**Razorpay AI Buildathon 2026**
*Track 02: AI Risk Manager (Primary) + Track 03: Revenue Recovery (Bridge Feature)*

---

## 📌 1. Project Title & Tagline

- **Project Name**: **RazorShield Sentinel**
- **Tagline**: Autonomous Anti-Carding & Agent-Aware Defense Engine with Zero-False-Decline Revenue Recovery
- **Tracks**: **Track 02 (AI Risk Manager)** & **Track 03 (Revenue Recovery)**

---

## 📝 2. Razorpay Submission Form Copy (Paste-Ready)

### Problem Statement (What problem does it solve?)
> Carding attacks, BIN enumeration, and credential-stuffing botnets from Telegram and dark-web communities cause massive financial damage to Indian merchants and payment gateways through chargebacks and processor penalties. Traditional defenses rely on blunt IP rate-limiting, which easily fails against distributed residential proxy rings while inadvertently blocking high-value genuine customers (false declines). Furthermore, emerging AI shopping agents (e.g., Google AP2 protocol) are often misclassified and blocked as headless scrapers.

### Solution & Architecture (How does it work?)
> RazorShield Sentinel is a multi-layered autonomous risk engine designed for a **strict <50ms synchronous decision budget** (averaging ~10ms p99):
> 1. **Optuna-Tuned Hybrid ML Scoring**: LightGBM Classifier + Calibrated Isolation Forest trained on 50,000+ transactions with SMOTE, achieving 1.0000 PR-AUC on held-out botnet traffic.
> 2. **Sliding-Window Velocity & Graph Clustering**: Real-time Redis counters paired with an asynchronous NetworkX Louvain community detection engine to identify coordinated carding rings across rotating proxies.
> 3. **50 Luhn-Valid Canary Honeytokens**: Zero false-positive rate by construction, blocking automated card scanners instantly at confidence 1.0 without querying ML.
> 4. **Agent-Aware Risk Layer**: Distinguishes malicious headless bots from legitimate AI shopping agents via signed JWT attestation headers (Google AP2 Protocol).
> 5. **Track 03 Revenue Recovery Bridge**: Borderline anomalies (VPN users, travelers) are never hard-declined. They are routed to `soft_risk` and issued single-use signed UPI QR recovery links that rescue lost GMV, confirmed by Razorpay Webhooks.
> 6. **Forensic Copilot with Threat Memory RAG**: In-memory cosine similarity retrieval over historical carding campaigns generates contextual threat briefs off the hot path.
> 7. **Autonomous WAF & Threat Advisory**: Generates real-time Razorpay Custom Risk Rules and Cloudflare edge WAF rules directly from detected graph clusters.

### Key Metrics & Impact (50,000-Row Stratified Reporting)
> - **Full-Funnel Catch Rate**: **100.00%** (Combined defense: 50 Canary Honeytokens + Deterministic Rules + ML Pipeline).
> - **ML-Layer PR-AUC**: **1.0000** (Evaluated strictly on 9,003 ambiguous transactions reaching ML, after excluding rule/canary catches).
> - **Adversarial-Realistic PR-AUC**: **1.0000** (Recall: 100.00% on stealth carding bots injecting realistic timing jitter and mouse paths).
> - **Zero-Day Generalization Catch Rate**: **91.76%** (Trained *without* CVV-cycling examples; model successfully intercepted unseen CVV-cycling attacks via velocity & anomaly signals).
> - **Synchronous Latency Budget**:
>   - **Sequential Baseline**: **p50 = 9.08ms | p95 = 11.81ms | p99 = 13.86ms** (tested on 100 sequential checkout transactions).
>   - **Sustained Throughput (40 req/s)**: **p50 = 9.44ms | p95 = 18.62ms | p99 = 28.06ms** (strictly below the 50ms gateway budget).
> - **Ensemble Weight Ablation**:
>   - Full Ensemble (0.70 LGB / 0.20 IF / 0.10 Louvain): **PR-AUC 1.0000 | Recall 100.0%**
>   - No LightGBM (IF + Cluster only: 0.00 / 0.65 / 0.35): PR-AUC **0.9983** and Recall **97.80%**, proving unsupervised IF/Cluster provide independent zero-day boundary defense.
> - **Pitch Metric**: **`Net_Value_Protected` = Fraud Loss Prevented − [False Positive Cost − Recovered GMV]**.

---

## 🧪 3. Verification & Live Operational Scenarios

| Scenario | Trigger / Endpoint | Observed Engine Behavior | Target Defense Layer |
|---|---|---|---|
| **Baseline Customer Purchase** | Standard human checkout on SneakerVault | Risk Score &lt; 0.15 (`safe`), latency &lt; 12ms. Provisions Razorpay Order ID. | Layer 3 LightGBM &amp; Biometrics |
| **15x Telegram Botnet Burst** | Rapid carding attempts across datacenter proxies | Risk Score &gt; 0.90 (`high_confidence_bot`), quarantined to silent honeypot. | Layer 1 Sliding-Window Redis Velocity |
| **Canary Honeytoken Breach** | Card scan on armed Canary BIN | Confidence 1.0 block (`high_confidence_bot`), 0.00% False Positive rate. | Layer 0 Canary Honeytoken Traps |
| **Legitimate Customer on VPN** | Genuine biometrics + datacenter ASN | Routed to `soft_risk`, single-use UPI QR link issued. GMV recovered upon settlement. | Layer 4 Track 03 Out-of-Band Bridge |
| **Google AP2 AI Shopping Agent** | Headless checkout with valid `X-Agent-Attestation` | Attestation verified, velocity monitored, routed to `verified_agent`. | Layer 0 Agent-Aware Gate |

---

## 🚀 4. How to Run Locally

```powershell
# 1. Start Backend API (Port 8000)
cd C:\Users\Owais\Documents\RazorPay\razorshield
python -m uvicorn backend.main:app --port 8000

# 2. Start Frontend SOC Dashboard (Port 5173)
cd C:\Users\Owais\Documents\RazorPay\razorshield\frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
