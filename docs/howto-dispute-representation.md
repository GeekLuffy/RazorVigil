# ⚖️ How to Generate RBI 2025/2026 Dispute Representation Packages

When a cardholder files a fraudulent chargeback (e.g. Reason Code `4837` / `10.4`), merchants must provide verifiable cryptographic and behavioral evidence to win representment. This guide shows how to generate and export **RBI Sovereign-Compliant Evidence Dossiers** with SHA-256 anchoring in RazorShield Sentinel.

---

## 📋 Prerequisites
- A flagged or disputed transaction ID (e.g. `tx_demo_01` or `CASE_RBI_2026_01`).

---

## 🚀 1. Reviewing & Representing via the Dashboard

1. Navigate to **`http://localhost:5173/`**.
2. Click the **"Disputes & Evidence"** tab in the top navigation bar.
3. Select an active dispute case from the queue.
4. Review the 5 evidence domains:
   * **Domain 1**: Device Fingerprint & WebGL Canvas Hash.
   * **Domain 2**: Kinetic Keystroke Shannon Entropy ($H > 2.50\text{ bits}$).
   * **Domain 3**: EMVCo 3DS 2.2 Cryptographic CAVV/AAV Signature.
   * **Domain 4**: Prior Successful Transaction History (12-month whitelist).
   * **Domain 5**: Geolocation & Residential ISP Verification.
5. Click **"Submit Representation"** to trigger bank liability shift.
6. Click **"Download Evidence PDF"** to export the official ReportLab dossier.

---

## 💻 2. Generating Dispute Evidence via REST API

### Step 1: Query Case Evidence
```bash
curl http://localhost:8000/cases
```

### Step 2: Download Compliance Dossier PDF
```bash
curl -o RBI_Dispute_Dossier_TX9988.pdf http://localhost:8000/governance/dossier/pdf
```

### Step 3: Verify SHA-256 Cryptographic Evidence Seal
Each PDF includes a tamper-evident SHA-256 signature calculated across all 5 behavioral telemetry domains:
```bash
sha256sum RBI_Dispute_Dossier_TX9988.pdf
```

---

## 📜 Regulatory Stance: Liability Shift Guarantee
Under **RBI Master Direction 2025/2026 (§7.2)** and **EMVCo 3DS 2.2**:
- When verifiable cryptographic CAVV tokens and positive behavioral biometrics are proven, **100% of chargeback financial liability shifts from the Merchant to the Issuing Bank**.

---

## 🔗 Related Documentation
- **[REST API Reference](file:///c:/Users/Owais/Documents/RazorPay/razorshield/docs/reference-api.md)**
- **[Architectural Design Explanations](file:///c:/Users/Owais/Documents/RazorPay/razorshield/docs/explanation-architecture-and-tradeoffs.md)**
