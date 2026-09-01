# 📋 REST & WebSocket API Reference

Complete technical specification for all RazorShield Sentinel HTTP and WebSocket endpoints.

**Base URL**: `http://127.0.0.1:8000`  
**Frontend Proxy**: All endpoints are also accessible via Vite at `http://localhost:5173/`

---

## 1. Synchronous Checkout & Risk Gating

### `POST /checkout`
Evaluates an incoming payment transaction through the full 8-layer quad-ensemble pipeline in $<15\text{ms}$.

#### Request Body (`application/json`):
| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `transaction_id` | `string` | No | Auto-generated | Unique transaction identifier |
| `amount` | `float` | Yes | - | Transaction amount in currency units |
| `currency` | `string` | No | `"INR"` | ISO currency code |
| `merchant_id` | `string` | No | `"default_merch"` | Razorpay merchant account ID |
| `bin6` | `string` | No | `"411111"` | First 6 digits of PAN |
| `card_hash` | `string` | Yes | - | SHA-256 token of card number |
| `device_fingerprint`| `string` | Yes | - | Canvas/WebGL device token |
| `ip_hash` | `string` | No | Auto | Client IP address hash |
| `timestamp` | `int` | No | `time.time()` | Epoch timestamp |
| `keystroke_entropy`| `float` | No | `2.50` | Shannon entropy of typing intervals |
| `mouse_jitter_score`| `float` | No | `0.50` | Mouse cursor jitter variance |
| `ja3_ua_mismatch` | `bool` | No | `false` | TLS JA3 vs User-Agent mismatch flag |
| `asn_type` | `string` | No | `"residential"` | ASN classification (`residential`, `datacenter`, `tor`) |

#### Response (`application/json`):
```json
{
  "transaction_id": "tx_live_8831",
  "decision": "allow",
  "tier": "safe",
  "risk_score": 0.042,
  "conformal_set": ["genuine"],
  "latency_ms": 11.2,
  "timestamp": 1700000000.0
}
```

---

## 2. Threat Memory Copilot AI (Track 02)

### `POST /copilot/chat`
Interactive RAG conversational endpoint over live transaction store, Louvain graph topology, and RBI Master Directions.

#### Request Body:
```json
{
  "message": "Why was transaction tx_live_8831 flagged?",
  "transaction_id": "tx_live_8831"
}
```

#### Response:
```json
{
  "reply": "### 🔍 Deep Forensic Reasoning for `tx_live_8831`...",
  "citations": [
    "RBI (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025 (effective April 1, 2026)",
    "EMVCo 3-D Secure Protocol Specification v2.2.0"
  ],
  "suggested_actions": [
    {
      "action_type": "COPY_WAF",
      "label": "Copy Cloudflare WAF Expression",
      "payload": { "expression": "..." }
    }
  ],
  "suggested_prompts": ["Synthesize WAF rule", "Explain cluster #1"]
}
```

---

## 3. Live Stress Benchmarking

### `POST /benchmark/run`
Executes parallel stress test evaluations against the live backend risk pipeline.

#### Request Body:
```json
{
  "total_requests": 300,
  "concurrency": 50,
  "traffic_profile": "mixed"
}
```

#### Response:
```json
{
  "total_requests": 300,
  "concurrency": 50,
  "elapsed_total_seconds": 3.535,
  "throughput_qps": 84.8,
  "latency_percentiles_ms": {
    "p50": 10.83,
    "p95": 13.58,
    "p99": 14.30
  },
  "sla_passed": true,
  "sla_compliance_pct": 99.67
}
```

---

## 4. Red-Team Coevolution & Arms Race

### `POST /adversary/arms-race` & `GET /adversary/arms-race`
Runs 5-round adversarial arms race between Red-Team adversary and RazorShield defense grid.

---

## 5. Merchant Export & SDK Snippets

### `GET /export/sdk-snippets`
Returns 5-line drop-in code snippets for Node.js, Python, Go, Java, and cURL.

### `GET /export/rules`
Returns Cloudflare WAF, Razorpay Risk Rules JSON, and AWS WAF definitions.

---

## 6. Real-Time WebSocket Feed

### `WS /ws`
Bidirectional WebSocket stream pushing real-time transaction evaluations, canary triggers, and graph partition updates at 60 FPS.
