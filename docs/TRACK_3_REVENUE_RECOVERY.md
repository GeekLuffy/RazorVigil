# 💸 RazorVigil Sentinel — Track 3: Revenue Recovery & Chargeback Automation

## 1. Executive Summary
Traditional fraud systems operate with a blunt binary hammer: **Approve or Hard Block**.
- A false decline on an innocent customer destroys **15% to 40% of merchant margin** and inflicts permanent Customer Lifetime Value (LTV) churn.
- A missed fraud attack inflicts full **GMV loss + ₹1,200 payment network chargeback fines**.

**RazorVigil Sentinel Track 3 Engine** introduces:
1. **Bayesian Minimum Expected Loss (MEL) Routing**: Mathematical trade-off matrix between Gross Margin, Customer LTV, and Chargeback Fine.
2. **Out-of-Band UPI QR Recovery Bridge**: Soft-risk transactions ($0.15 \le \text{Risk} \le 0.75$) are instantly converted into cryptographically signed UPI QR recovery links, rescuing legitimate revenue while deflecting card fraud.
3. **5-Domain Verifiable Dispute Evidence Package**: Eliminates manual chargeback representation by autonomously compiling forensic proofs for Razorpay dispute representments.

---

## 2. Bayesian Minimum Expected Loss (MEL) Optimization

For every evaluated authorization, RazorVigil computes expected financial rupee loss across all three actions:

$$\mathbb{E}[\text{Loss} \mid \text{Pass}] = P(\text{Fraud}) \times (\text{Amount} + \text{Chargeback Fine})$$

$$\mathbb{E}[\text{Loss} \mid \text{Recovery}] = P(\text{Genuine}) \times (0.15 \times \text{Gross Margin})$$

$$\mathbb{E}[\text{Loss} \mid \text{Hard Block}] = P(\text{Genuine}) \times (\text{Gross Margin} + \text{Customer LTV Loss})$$

$$\text{Optimal Action} = \arg\min_{a \in \{\text{Pass}, \text{Recovery}, \text{Hard Block}\}} \mathbb{E}[\text{Loss} \mid a]$$

---

## 3. 5-Domain Verifiable Chargeback Evidence Synthesizer

When a chargeback case is filed, RazorVigil synthesizes a deterministic, non-hallucinatory ISO 8583 evidence dossier:

| Domain | Cryptographic Evidence Signals |
|---|---|
| **1. Device & Network** | Canvas hash, WebGL renderer, TLS JA3/JA4 fingerprint, ISP routing ASN |
| **2. Kinetic Biometrics** | Shannon entropy $H$, millisecond keystroke intervals $\Delta t$, mouse bezier curve |
| **3. Community Graph** | Louvain modularity score, distinct PAN fanout count, node degree |
| **4. Honeytoken Audit** | Canary card collision check (0.00% False Positive Rate proof) |
| **5. RBI SCA Attestation** | 3DS2 Directory Server XID, cryptographic CAVV signature, HMAC verification |

---

## 4. API & Integration Reference

- `POST /checkout` — Synchronous hot-path decision with MEL routing.
- `POST /recovery/link` — Cryptographically generates out-of-band UPI QR recovery payload.
- `POST /cases/{case_id}/evidence` — Synthesizes 5-domain chargeback representation package.
- `GET /api/governance/dossier/pdf` — Generates formal auditor-ready PDF compliance readiness dossier.
