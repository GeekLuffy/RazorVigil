# 🛡️ 3DS2 & OTP-Relay Bypass Defense Architecture

> **Comprehensive Threat Model, Attack Mechanics & Sovereign Defense Specification for RazorShield Sentinel (Razorpay Track 2).**

---

## 🧐 Part 1: Is 3DS / OTP Bypassing Possible in the Real World?

**Yes.** While 3D Secure 2 (3DS2) and 2-Factor OTP provide cryptographic guarantees between the bank and the authenticated consumer, **modern cybercrime networks do not attempt to "break" the underlying cryptography (AES/RSA/SHA)**. Instead, they exploit architectural handoffs, session tokens, human behavioral vectors, and reverse-proxy networks.

In 2024–2026, real-world carding networks (e.g. Telegram carding swarms, Genesis Market successors) employ **4 primary bypass vectors**:

```
                               ┌─────────────────────────────────────────────────────────┐
                               │           REAL-WORLD 3DS2 / OTP ATTACK VECTORS          │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
            ┌──────────────────────────┬────────────────────┴───────────────┬──────────────────────────┐
            ▼                          ▼                                    ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐            ┌───────────────────────┐  ┌───────────────────────┐
│  1. AiTM Reverse-     │  │  2. Telegram OTP      │            │  3. Frictionless      │  │  4. SIM-Swap & SS7    │
│     Proxy Phishing    │  │     Interception Bots │            │     Downgrade Attack  │  │     Telco Relay       │
│     (Evilginx)        │  │     (Automated Voice) │            │     (Indicator Spoof) │  │     (SMS Intercept)   │
└───────────────────────┘  └───────────────────────┘            └───────────────────────┘  └───────────────────────┘
```

### Attack Vector 1: Adversary-in-the-Middle (AiTM) Reverse Proxies
- **Tools Used**: `Evilginx3`, `Modlishka`, `Muraena`.
- **How It Works**: The attacker hosts a phishing site that acts as a real-time transparent reverse proxy. When the victim enters their OTP on the fake page, the proxy forwards it to the genuine bank 3DS ACS server within milliseconds. Once authenticated, the proxy intercepts the session token (`3DS ACS Cookie`) and executes the fraudulent card capture.
- **Why Traditional Gateways Fail**: Traditional gateways only check if the OTP was valid. Since the victim typed the real OTP, the gateway flags it as a legitimate payment.

### Attack Vector 2: Telegram Automated OTP Grabber Bots
- **Tools Used**: Telegram bots (OTPP, SMSBuster, CallRelay).
- **How It Works**: The carder triggers a card payment on a merchant checkout. The bank sends an OTP SMS to the victim. Concurrently, the Telegram bot calls the victim using a spoofed bank caller ID, claiming "suspicious transaction detected, press 1 and enter code to cancel." When the victim inputs the code into the IVR, the bot programmatically types the OTP into the gateway via headless Playwright/Puppeteer.
- **Bot Signature**: The OTP is entered in $<50\text{ms}$ with uniform keypress intervals ($\Delta t \approx 10\text{ms}$).

### Attack Vector 3: 3DS2 Frictionless Downgrade Manipulation
- **How It Works**: Under EMVCo 3DS 2.2 specifications, merchants can request "Frictionless Authentication" (no OTP challenge) for low-value transactions ($<\text{₹2,000}$) or low Transaction Risk Analysis (TRA) scores. Carders forge `ThreeDSRequestorChallengeInd = 01` (No challenge requested) and manipulate transaction payload metadata to evade ACS step-up.

---

## 🛡️ Part 2: How RazorShield Sentinel Neutralizes These Attacks

RazorShield Sentinel deploys a **Multi-Stage Kinetic & Cryptographic Defense Engine** ([`backend/decision/otp_defense.py`](file:///c:/Users/Owais/Documents/RazorPay/razorshield/backend/decision/otp_defense.py)) operating with a sub-2ms evaluation SLA.

```
Incoming 3DS Step-Up Request
       │
       ▼
[Stage 1: AiTM Origin & RTT Proxy Audit] ──► Mismatched Origin or Latency Lag (>2.5s)? ──► Hard Block (1.00 Risk)
       │ (Pass)
       ▼
[Stage 2: 3DS2 Exemption Legitimacy Audit] ──► High-Risk ASN / JA3 Spoofed Exemption? ──► Deny Frictionless / Mandate Step-Up
       │ (Pass)
       ▼
[Stage 3: Kinetic Shannon Entropy & Cadence] ──► Mean Δt < 25ms or Entropy < 0.85? ──► Neutralize Bot Relay (0.96 Risk)
       │ (Pass)
       ▼
[Stage 4: Cryptographic Device-Bound Token] ──► SHA256(device_fingerprint : ip_hash) Match? ──► Capture Authorized
```

---

## 📐 Mathematical Formulation of Kinetic OTP Verification

When a user inputs a 6-digit OTP, the client captures the inter-arrival delta array:
$$\Delta T = [\Delta t_1, \Delta t_2, \dots, \Delta t_5]$$

1. **Inter-Arrival Mean and Standard Deviation**:
   $$\mu_{\Delta t} = \frac{1}{K-1} \sum_{i=1}^{K-1} \Delta t_i, \quad \sigma_{\Delta t} = \sqrt{\frac{1}{K-1} \sum_{i=1}^{K-1} (\Delta t_i - \mu_{\Delta t})^2}$$
   - **Automated Bot Signature**: $\mu_{\Delta t} < 25.0\text{ ms} \land \sigma_{\Delta t} < 8.0\text{ ms}$ (Superhuman velocity).

2. **Shannon Entropy over Quantized Bins ($15\text{ms}$ Buckets)**:
   $$H(\Delta T) = - \sum_{b \in B} p(b) \log_2 p(b)$$
   - **Human Baseline**: $H(\Delta T) \ge 0.85\text{ bits}$ (Natural cognitive variance between keypresses).
   - **Scripted / OTP Grabber Pattern**: $H(\Delta T) < 0.50\text{ bits}$ (Deterministic keystroke injection).

---

## 📊 Verification Matrix

| Attack Scenario | Competitor Defense | RazorShield Sentinel Defense | Status |
|---|---|---|:---:|
| **Telegram ₹1 Carding Checker** | Passes (Micro-Auth) | **Layer 0 Tarpit + Device Prefix Trap** | 🛡️ Neutralized |
| **Evilginx Reverse Proxy AiTM** | Passes (Real OTP) | **Origin Mismatch & Session Nonce Verification** | 🛡️ Neutralized |
| **Automated OTP Relay Bot** | Passes (Valid Code) | **Kinetic Cadence & Shannon Entropy Interception** | 🛡️ Neutralized |
| **3DS2 Frictionless Downgrade** | Blindly Exempted | **High-Risk Network Telemetry Exemption Reject** | 🛡️ Neutralized |
| **Screen Reader / Switch Access** | Falsely Blocked | **Assistive Kinetic Adaptive Normalization** | ✅ Inclusivity Protected |

All test cases are codified and verified in [`tests/test_adversarial.py`](file:///c:/Users/Owais/Documents/RazorPay/razorshield/tests/test_adversarial.py).
