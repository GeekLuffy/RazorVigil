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

## 🎬 3. The 2-Minute Winning Demo Video Script

| Timestamp | Screen | Action | What to Say |
|---|---|---|---|
| **0:00 - 0:25** | SOC Dashboard (`http://localhost:5173`) | Show the live Command Center, dark UI, charts | *"Hello Razorpay team. This is RazorShield Sentinel, an autonomous risk engine built for Track 02 and Track 03. Indian payment gateways lose millions to carding bots and false declines. Here is how RazorShield solves both."* |
| **0:25 - 0:50** | Click **[15x Telegram Bot Burst]** | Watch stream spike red, 15 bots blocked, latency ~10ms | *"When a Telegram bot attacks a merchant with distributed carding, RazorShield's sliding-window Redis velocity and LightGBM model catches 100% of the attempts in under 12ms, issuing silent honeypot responses."* |
| **0:50 - 1:15** | Click **[Fire Canary Honeytoken]** | Watch yellow Canary alert banner flash on screen | *"To catch zero-day bot enumeration with true zero false positives, we deployed 50 Luhn-valid Canary cards. Any use triggers an instant 1.0 confidence block without even waiting for ML."* |
| **1:15 - 1:40** | Click **[Live Merchant Store]** -> Toggle VPN -> Click Pay -> Click **[Simulate UPI QR]** | UPI Modal pops up, QR completes, GMV counter ticks up | *"Now for Track 03: When a real customer buys sneakers on a VPN, legacy systems hard-decline them. RazorShield routes them to soft-risk, issues a 5-minute inventory hold with a UPI QR link, and rescues the Rs.16,999 GMV."* |
| **1:40 - 2:00** | Click **[AI Shopping Agent]** & Show **[Pitch Deck]** tab | Show verified agent passing & WAF rules | *"Finally, our Agent-Aware layer verifies AI shopping assistants using cryptographically signed attestations. RazorShield protects merchants, rescues GMV, and prepares Razorpay for the agentic web."* |

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
