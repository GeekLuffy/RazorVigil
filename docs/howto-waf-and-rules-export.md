# 🛡️ How to Export & Deploy Synthesized WAF and Razorpay Rules

RazorVigil Sentinel automatically generates perimeter edge firewall rules from live botnet swarm detections. This guide explains how to export and deploy these rules to **Cloudflare WAF** and **Razorpay Thirdwatch AI**.

---

## 📋 1. Exporting via the SOC Dashboard

1. Navigate to **`http://localhost:5173/`**.
2. In the top navbar, click **"📦 SDK & Export"**.
3. Select the tab: **"Cloudflare WAF & Razorpay Risk Rules JSON"**.
4. Click **"Copy Expression"** for Cloudflare or **"Download .json"** for Razorpay.

---

## 🌐 2. Deploying to Cloudflare Ruleset Engine v2

### Step 1: Obtain the Auto-Synthesized Expression
Fetch the latest active cluster rule:
```bash
curl http://localhost:8000/export/rules
```

### Generated Expression:
```cloudflare
(http.request.uri.path eq "/checkout" and (ip.src in {103.21.244.12 185.220.101.5 45.154.255.88} or http.request.headers["x-ja3-mismatch"] eq "1") and http.request.headers["x-keystroke-entropy"] lt "0.20")
```

### Step 2: Apply via Cloudflare API / Dashboard
1. Open your Cloudflare Dashboard $\rightarrow$ **Security** $\rightarrow$ **WAF** $\rightarrow$ **Custom Rules**.
2. Click **Create Rule** and switch to the **Edit expression** builder.
3. Paste the expression above.
4. Set action to **Managed Challenge (Interactive Tarpit)**.

---

## ⚡ 3. Deploying to Razorpay Thirdwatch AI

### Step 1: Download `razorpay_risk_rules.json`
From the export endpoint, download the active risk rule definition:
```json
{
  "rule_id": "RS_RULE_01_AUTOMATION_TRAP",
  "name": "Zero-Entropy DOM Injection Quarantine",
  "conditions": [
    { "field": "network.asn_type", "operator": "in", "value": ["datacenter", "tor"] },
    { "field": "device.keystroke_entropy", "operator": "<", "value": 0.60 },
    { "field": "ml.risk_score", "operator": ">=", "value": 0.75 }
  ],
  "action": "QUARANTINE_HONEYPOT",
  "risk_tier": "HIGH_CONFIDENCE_BOT"
}
```

### Step 2: Upload to Razorpay Merchant Dashboard
1. Open your Razorpay Merchant Dashboard $\rightarrow$ **Risk & Security** $\rightarrow$ **Custom Rules**.
2. Upload the `.json` file to activate autonomous honeypot tarpitting immediately.

---

## 🔗 Related Documentation
- **[How to Integrate SDKs](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-merchant-integration.md)**
- **[REST API Reference](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/reference-api.md)**
