# 🎓 Tutorial: Getting Started with RazorVigil

This tutorial walks you through setting up **RazorVigil** locally, starting both the backend ML risk engine and the SOC Command Center frontend, and executing your first live threat evaluation in **under 3 minutes**.

---

## 📋 What You'll Need

- **Python 3.10+** (tested on Python 3.11)
- **Node.js 18+** & **npm**
- **Git**

---

## 🚀 Step 1: Install Dependencies

Clone the repository and install the backend and frontend requirements:

```bash
# 1. Clone the repository
git clone https://github.com/GeekLuffy/razorvigil.git
cd razorvigil

# 2. Install Python backend dependencies
pip install -r requirements.txt

# 3. Install React frontend dependencies
cd frontend
npm install
cd ..
```

---

## ⚡ Step 2: Start the Development Servers

Open two terminal tabs to run the FastAPI backend and Vite frontend:

### Terminal 1 (Backend ML Gateway):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
*Expected Output*:
```
[VelocityTracker] Connected to Redis / In-Memory Mock at localhost:6379
[Warmup] ML inference pipelines pre-warmed in memory.
[CanaryCards] 50 honeytokens armed and ready.
INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Terminal 2 (SOC Command Center Frontend):
```bash
cd frontend
npm run dev
```
*Expected Output*:
```
  VITE v8.2.2  ready in 250 ms

  ➜  Local:   http://localhost:5173/
```

Now open **`http://localhost:5173/`** in your web browser.

---

## 🎯 Step 3: Run Your First Threat Evaluation

Let's fire a test carding transaction with robotic keystroke entropy ($H = 0.05$) to see the real-time synchronous gating in action:

```bash
curl -X POST http://localhost:8000/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "tx_demo_tutorial_01",
    "amount": 25.0,
    "currency": "INR",
    "merchant_id": "rzp_merch_01",
    "bin6": "411111",
    "card_hash": "c_tutorial_hash_01",
    "device_fingerprint": "dev_bot_01",
    "ip_hash": "ip_103_21_244_12",
    "timestamp": 1700000000,
    "keystroke_entropy": 0.05,
    "mouse_jitter_score": 0.02,
    "ja3_ua_mismatch": true,
    "asn_type": "datacenter"
  }'
```

### 🔍 What Just Happened:
1. **Synchronous Latency**: The backend evaluated the request through the full 8-layer quad-ensemble pipeline in **$<14\text{ms}$**.
2. **Deterministic Tarpit Intercept**: Because `keystroke_entropy < 0.60` and `asn_type == "datacenter"`, the engine classified the transaction as **`high_confidence_bot`**.
3. **Live UI WebSocket Update**: Look at your browser at `http://localhost:5173/`. You will see `tx_demo_tutorial_01` instantly flash red in the live transaction feed and link to the **Louvain Mule Ring Graph Explorer**.

---

## 🏆 What You Built & Explored

You now have a fully operational local instance of RazorVigil with:
- **8-Layer Risk Pipeline**: LightGBM + CatBoost + Isolation Forest + GraphSAGE (persistence-gated P2 ensemble).
- **Real-Time SOC Command Center**: Live WebSocket streaming at 60 FPS.
- **Threat Memory Copilot RAG**: Ready to interrogate in the chat drawer.

---

## 📚 Next Steps & Deep Dives

* **[Integrate into Your Merchant App (<5 Lines of Code)](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-merchant-integration.md)**
* **[Run Parallel SLA Stress Benchmarks](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-stress-benchmarks.md)**
* **[Explore the Full REST API Reference](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/reference-api.md)**
