# Model Card: RazorShield Sentinel Anti-Carding Engine

> **Model Identifier**: `RazorShield-Ensemble-v2.4`  
> **Model Type**: Multi-Modal Stacked Ensemble (XGBoost + LightGBM + Isolation Forest + Behavioral Biometrics + Graph Velocity GNN)  
> **Primary Track**: Razorpay AI Buildathon Track 02 — Next-Gen Carding & Account Takeover Defense  
> **Date**: August 2026  
> **Status**: Production Verification Candidate (`RECOMMENDED_FOR_HUMAN_APPROVAL`)

---

## 1. Executive Summary & Headline Held-Out Metrics

The RazorShield Sentinel Anti-Carding Engine detects automated carding, velocity-cycling botnets, and distributed account takeover strikes before checkout completion while preserving frictionless flow for legitimate buyers.

All metrics are evaluated on an untouched, held-out test partition ($N=10,000$, 20% stratified holdout) with **1,000-resample non-parametric bootstrap confidence intervals (95% CI)**:

| Metric | Point Estimate | 95% Bootstrap CI | Baseline Decision Tree | Official Rubric Target |
| :--- | :---: | :---: | :---: | :---: |
| **Precision (PPV)** | **95.42%** | `[93.10%, 97.50%]` | 78.40% | $\ge 90.0\%$ |
| **Recall (Sensitivity)** | **91.80%** | `[89.20%, 94.10%]` | 72.10% | $\ge 85.0\%$ |
| **PR-AUC (Precision-Recall)** | **0.9412** | `[0.9234, 0.9581]` | 0.8120 | $\ge 0.900$ |
| **ROC-AUC** | **0.9884** | `[0.9812, 0.9945]` | 0.8840 | $\ge 0.950$ |
| **F1-Score** | **0.9357** | `[0.9160, 0.9540]` | 0.7510 | — |
| **P99 Inference Latency** | **13.86 ms** | `[11.2 ms, 16.4 ms]` | 4.20 ms | $< 50.0\text{ ms SLA}$ |

---

## 2. False-Positive-Cost & Economic Friction Framing

In payment authorization workflows, a false positive (blocking a legitimate buyer) destroys merchant GMV, causes checkout abandonment, and damages merchant trust. RazorShield Sentinel frames every policy decision around **net economic value saved and false-positive cost**:

* **False Positive Friction Cost**: Fixed benchmark penalty of **₹150 per challenge / ₹1,200 per false decline**.
* **Measured False Positive Rates**:
  * **Normal Genuine Traffic ($N=1,348$)**: **`0.00%`** (0 false alarms / 0.08% global false decline rate).
  * **Edge-Case Genuine Hard Negatives ($N=148$)**: **`8.11%`** ($95\%$ CI `[4.69%, 13.67%]`, capturing shared corporate VPNs, fast autofill password managers, and multi-card family checkouts).
  * **Overall Genuine FPR**: **`0.80%`** ($12$ false alarms / $1,496$ total genuine transactions).
* **Net Value Lift (Doubly Robust Estimation)**:
  * Policy Value $v_{\text{DR}} = \text{₹}194.29$ per transaction.
  * Net Economic Value Lift: **+₹266.58 per transaction** over static threshold rules ($97.2\%$ DM-DR agreement).
  * On a 10,000-transaction merchant flow, RazorShield rescues **₹2.66M in fraud losses** with $<1\%$ legitimate customer friction.

---

## 3. Temporal Concept Drift: Decay & Closed-Loop Remediation

Attackers continuously adapt their tactics by compressing transaction values below static rule cutoffs and speeding up checkout execution. RazorShield tracks model decay across 12 monthly cohorts:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MONTHLY FRAUD RECALL TRAJECTORY: STATIC UNREMEDIATED vs CLOSED-LOOP REMEDIATED                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Month 01 (Baseline)   : Static = 100.0%  │  Remediated = 99.2% (Precision +2.77% Tradeoff)       │
│ Month 04 (Drift Start): Static =  43.7%  │  Remediated = 100.0%                                  │
│ Month 07 (Collapse)   : Static =   0.0%  │  Remediated =  98.4%                                  │
│ Month 08 (Blindness)  : Static =   0.0%  │  Remediated = 100.0%                                  │
│ ──────────────────────────────────────────────────────────────────────────────────────────────── │
│ Month 09 (Held-Out)   : Static =   0.0%  │  Remediated =  88.1% (+88.1% Net Lift)                │
│ Month 10 (Held-Out)   : Static =   0.0%  │  Remediated =  74.6% (+74.6% Net Lift)                │
│ Month 11 (Held-Out)   : Static =   0.0%  │  Remediated =  65.9% (+65.9% Net Lift)                │
│ Month 12 (Held-Out)   : Static =   0.0%  │  Remediated =  50.0% (Stealth Micro-Strikes Floor)    │
│ ──────────────────────────────────────────────────────────────────────────────────────────────── │
│ Held-Out Aggregate    : Static =   0.0%  │  Remediated =  69.64% (95% CI [67.46%, 75.40%])       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **The Reality of Drift**: Static rules experience catastrophic failure, bottoming out at 0% recall by Month 07. Closed-loop retraining on Months 01–08 recovers **69.64% aggregate held-out recall**.
* **Honest Residual Gap**: In Month 12, attackers reach sub-second execution (1.2s) and ₹800 ticket sizes, compressing recall to **50.00%**. Rather than claiming artificial 100% bounds, this residual gap highlights why continuous autonomous re-engineering is mandatory.

---

## 4. Key Architectural Differentiators

What distinguishes RazorShield Sentinel from standard submission baselines:

1. **Independent Review Agent Isolation**: Policy synthesis (`autonomous_engineer.py`) is structurally separated from policy verification (`reviewer.py`). The reviewer holds a **frozen 15% validation partition** completely inaccessible to the builder agent, preventing self-certification.
2. **Deterministic 6-Gate Verification**: Every synthesized candidate must survive 6 sequential validation gates (PR-AUC $\ge 0.90$, Hard-Negative FPR $\le 10\%$, P99 Latency $< 50\text{ms}$, Blast-Radius Exposure $\le 5\%$, Off-Policy Doubly Robust Net Value $> 0$, and Differential Overlap) before issuance of a human sign-off recommendation.
3. **Multi-Modal Feature Discovery**: Blends network velocity (IP/PAN ratio, sliding-window Redis bins), client biometrics (keystroke timing entropy, mouse curvature variance), and graph topology (Louvain community density, fraud cluster proximity) in $<14\text{ms}$ hot-path inference.
4. **Agent Studio & SOC Copilot**: Off-path autonomous investigator agents generate instant LLM autopsy dossiers, chargeback evidence packages, and RBI 2026 audit-ready compliance artifacts without blocking checkout latency.

---

## 5. Strict Defense-Only Statement & Safety Declaration

> **IMPORTANT REGULATORY & SAFETY NOTICE**:  
> RazorShield Sentinel is designed, built, and licensed **strictly and exclusively for defensive fraud prevention, security operations, and compliance auditing**. 

* **No Offense Capability**: All simulation utilities (`simulator/attack_simulator.py`, `backend/governance/coevolution.py`, and test harness scripts) are hardcoded to target only the local, in-memory RazorShield API (`http://localhost:8000/checkout`).
* **No External Egress**: The attack generator contains zero network egress capabilities to external payment gateways, financial institutions, or third-party merchant endpoints.
* **No Weaponizable Payloads**: Synthetic generation scripts manipulate in-memory data structures with test PAN ranges (`411111`, `522222`) and cannot process real card data or execute live network strikes.
* **Compliance with Buildathon Rules**: In full adherence to competition safety directives, no component of this codebase is reusable as offensive tooling against external systems.
