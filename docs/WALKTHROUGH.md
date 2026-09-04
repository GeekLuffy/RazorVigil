# 🏆 RazorVigil Sentinel — Hackathon Walkthrough & System Architecture
**Razorpay AI Buildathon 2026**
*Track 02 (AI Risk Manager) + Track 03 (Revenue Recovery)*

---

## 🌟 Executive Overview
**RazorVigil Sentinel** is an autonomous anti-carding and bot abuse defense engine built to solve high-velocity Telegram carding rings, distributed residential proxy attacks, and zero-day BIN enumeration—all operating within a strict **<50ms synchronous decision budget** (averaging ~12ms p99).

Unlike traditional fraud systems that degrade merchant revenue through blunt false declines, RazorVigil bridges into a **Track 03 Zero-False-Decline Recovery Loop**: borderline genuine anomalies (e.g. travelers, VPN users) are issued out-of-band single-use signed UPI QR recovery links that rescue up to 55%+ of otherwise lost GMV.

---

## 🛠️ Complete System Architecture & Razorpay Gateway Integration

```
                                    CLIENT-SIDE CHECKOUT
                           (SneakerVault / Razorpay Magic Checkout)
                                            │
                    Captures 16 Signals: ASN, JA3, Keystroke Entropy,
                    Mouse Tremor Variance, Device & IP Fingerprints
                                            │
                                            ▼
                           RAZORVIGIL SENTINEL PIPELINE (<50ms)
       ┌──────────────────────────────────────────────────────────────────────────┐
       │ 1. [L0] Agent-Aware Gate: Check X-Agent-Attestation (AP2 Protocol)       │
       │    └── Valid Token + Clean Velocity → tier: verified_agent (<3ms path)   │
       │                                                                          │
       │ 2. [L0] Honeytoken Canary Check: 50 Luhn-valid synthetic cards           │
       │    └── Match → tier: high_confidence_bot (Risk=1.00, confidence=1.0)     │
       │                                                                          │
       │ 3. [L1 & L2] Redis Sliding-Window Velocity + In-Memory Louvain Graph     │
       │    └── Computes BIN card counts, IP distinct PANs, cluster risk score    │
       │                                                                          │
       │ 4. [L3] Hybrid ML Scorer: LightGBM Classifier + Calibrated Isolation     │
       │    └── ML-Layer PR-AUC: 0.9983 | Zero-Day Generalization Recall: 91.76%  │
       │                                                                          │
       │ 5. [L4] Decision Tiering & Razorpay API Routing:                         │
       │    ├── safe (0–15%)          ──▶ Creates real Razorpay Order (API)       │
       │    ├── soft_risk (15–50%)    ──▶ Creates Razorpay Payment Link (API)     │
       │    ├── elevated_review       ──▶ Step-up + Async LLM Copilot note       │
       │    └── high_confidence_bot   ──▶ LOCAL HONEYPOT (NEVER calls Razorpay!)  │
       └──────────────────────────────────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          LIVE SOC DASHBOARD (WebSockets)            RAZORPAY TEST WEBHOOKS
     • Real-time AreaChart risk stream           • POST /webhook/razorpay
     • Animated Recovered GMV counter            • HMAC-SHA256 Signature Verification
     • 1-Click Detection Test Harness (Sandbox) • payment.captured → Live GMV update
     • Autonomous WAF & Risk Rules Exporter
```

---

## 🔒 Razorpay Gateway Isolation (Zero Bot Contamination)
- **Safe & Agent Transactions**: Automatically provision a test-mode order via Razorpay's `/v1/orders` API.
- **Recovered Soft-Risk Transactions**: Dispatched via Razorpay Payment Links API (`/v1/payment_links`) and single-use signed UPI QR links.
- **High-Confidence Bots & Canary Triggered**: **Strictly quarantined at RazorVigil's local edge**. Blocked transactions **never touch or leak to the Razorpay API**, saving merchants gateway processing overhead and preventing automated card enumeration from reaching payment processors.
- **Webhook Ingestion**: Real-time webhook listener at `POST /webhook/razorpay` verifies `X-Razorpay-Signature` via HMAC-SHA256 and updates the dashboard GMV counter dynamically upon successful settlement.

> **⚠️ Pre-Gateway Boundary Guarantee**: The tarpit-poisoning and deceptive-decline response (Layer 0 `AntiCheckerGuard`) operates **exclusively within RazorVigil Sentinel's own pre-gateway screening layer**. These synthetic delay and decline responses are synthesized locally, fire *before* any real Razorpay API call is made, and are **never attributed to or originating from Razorpay's actual API or payment infrastructure**. Real Razorpay API calls (`/v1/orders`, `/v1/payment_links`) are only made for `safe` and `soft_risk` tiers that have already cleared all pre-screening layers.


---

## 🚀 Live Demo Guide for Judges

### 1. Start the API Server
```powershell
cd C:\Users\Owais\Documents\RazorPay\razorvigil
python -m uvicorn backend.main:app --port 8000
```

### 2. Start the Frontend Dashboard
```powershell
cd C:\Users\Owais\Documents\RazorPay\razorvigil\frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Interactive Demos Available Directly in the Web UI:
1. **🔥 15x Telegram Bot Burst**: Fires 15 rapid card attempts; watch the risk chart spike red and 100% of bots get blocked at ~10ms latency.
2. **🐤 Fire Canary Honeytoken**: Uses one of 50 internal honeytokens; watch the yellow Canary alert banner flash on screen with confidence 1.0.
3. **🤖 AI Shopping Agent (AP2)**: Simulates headless agent traffic with signed JWT attestation; watch it get classified as `verified_agent`.
4. **🛍️ Live Merchant Store ("SneakerVault")**: Click the green button to open the store:
   - Type manually: see human keystroke entropy (>1.5) and mouse jitter (>0.4) pass cleanly.
   - Toggle **"Simulate VPN"**: triggers `soft_risk` and opens the Razorpay UPI QR modal. Click **"Simulate Customer Scanning UPI QR"** and watch the **Recovered GMV counter** tick up live on the dashboard!
5. **📜 Autonomous Threat Advisory & WAF Rules**: View and copy generated Razorpay Risk Rule JSON and Cloudflare WAF expressions generated from live cluster detections.
6. **📊 Pitch Deck Tab**: View the executive comparison table and the `Net_Value_Protected` pitch formula.

---

## 🏆 Summary of Key Innovations

| Feature | Technical Implementation | Judge Impact |
|---|---|---|
| **Agent Studio MCP Integration** | 4 MCP tools (check_canary_status, get_cluster_risk_score, investigate_transaction, compile_dispute_evidence) exposed via Anthropic MCP SDK | Plugs into Razorpay's own Agent Studio — specialist sub-agent, not a competing engine |
| **Multi-Layer Ensemble** | LightGBM + Isolation Forest + Redis Sliding-Window Velocity + NetworkX Louvain Graph | Solves both fast bot bursts and slow distributed proxy rings. |
| **50 Canary Cards** | Luhn-valid synthetic PANs seeded exclusively in our own honeytoken check endpoint | Deterministic 1.0-confidence block for any BIN-enumeration or scraping of our own inventory. **0.00% FPR applies to this layer only.** |
| **Agent-Aware Risk Layer** | JWT attestation validator with spend limits | First fraud engine ready for agentic AI shopping (Google AP2). |
| **Zero False Decline Loop** | Signed, single-use, amount-bound JWT recovery links | Rescues genuine GMV and proves dual-track synergy (Track 02 + 03). |
| **Autonomous WAF Generation** | Dynamic rule synthesis from Louvain graph clusters | Proactive merchant-level defense ready for production deployment. |

---

## 🤖 Razorpay Agent Studio MCP Integration

RazorVigil Sentinel is positioned as a **specialist sub-agent** for [Razorpay Agent Studio](https://razorpay.com/agent-studio) (launched March 12, 2026 at FTX'26, built on Anthropic's Claude Agent SDK). Rather than competing with Razorpay's native fraud and dispute agents, it plugs into the same MCP tooling layer.

### MCP Server (`backend/mcp_server.py`)

```bash
# Install MCP dependencies
pip install mcp anthropic

# Run the MCP server (stdio transport — standard for local MCP tools)
python backend/mcp_server.py

# Point RAZORVIGIL_API_URL to a deployed backend if needed
RAZORVIGIL_API_URL=https://your-deployed-backend.com python backend/mcp_server.py
```

### Demo Agent (`backend/demo_agent.py`)

```bash
# Run the demo agent (simulates Agent Studio delegation pattern)
python backend/demo_agent.py --transaction-id TXN_DEMO_001
```

The demo agent simulates the full delegation chain:
1. `investigate_transaction` — full 8-layer forensic pipeline
2. `check_canary_status` — honeytoken detection (if elevated risk)
3. `compile_dispute_evidence` — 5-domain draft dossier for Dispute Responder

### Tool Schema Summary

| MCP Tool | Purpose | Returns |
|---|---|---|
| `check_canary_status` | Instant honeytoken hit detection | `is_canary`, `confidence`, `canary_index` |
| `get_cluster_risk_score` | Louvain graph ring membership score | `cluster_score`, `cluster_id`, `ring_size` |
| `investigate_transaction` | Full 8-layer forensic investigation | `tier`, `risk_score`, `explanation`, `signals` |
| `compile_dispute_evidence` | 5-domain draft evidence dossier | `claims`, `signal_strength`, `dossier_draft` |
