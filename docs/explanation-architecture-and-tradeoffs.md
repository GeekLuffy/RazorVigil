# 🧠 Architecture Design Decisions & Trade-Offs

This document explains **why** RazorVigil Sentinel is designed the way it is — the fundamental engineering trade-offs, security philosophy, and operational guarantees.

---

## 1. Why Sub-15ms Synchronous Gateway SLA?

### The Problem:
Most modern anti-fraud systems rely on asynchronous graph queries and bulky deep learning pipelines that take $200–800\text{ms}$. In e-commerce checkout, every $100\text{ms}$ of latency causes a measurable **$1\%$ drop in checkout conversion rate**.

### The RazorVigil Solution:
RazorVigil splits fraud defense into two strict execution planes:
1. **Synchronous Hot Path ($<15\text{ms}$)**:
   * Micro-auth validation and Luhn checking.
   * In-memory Redis sliding-window velocity.
   * Fast C++ GBDT scoring (LightGBM/CatBoost) + cached FT-Transformer embeddings.
   * Split Conformal decision gating.
2. **Asynchronous Deep Intelligence (Background Tasks)**:
   * Louvain graph community partitioning.
   * Automated Red-Team coevolution retraining.
   * Threat Memory RAG conversational indexing.
   * ReportLab PDF dispute evidence generation.

---

## 2. Why Split Conformal Prediction Instead of Fixed Thresholds?

### The Problem:
Traditional fraud engines use arbitrary risk score cutoffs (e.g., `"score > 0.70 => block"`). These fixed cutoffs fail under covariate shift and produce catastrophic false declines on high-ticket genuine shoppers.

### The RazorVigil Solution:
Split Conformal Prediction provides **distribution-free mathematical error coverage guarantees**:
* If the model is uncertain, it outputs prediction set `["genuine", "fraud"]` rather than guessing.
* Uncertain transactions are automatically routed to a **Dynamic Out-of-Band UPI QR step-up** (5-minute hold) rather than being falsely rejected.
* Normal Genuine FPR: **0.09%** `[0.00%, 0.27%]` (N=6,500). Edge-Case Genuine FPR (VPN/travelers): **10.6%** at persistence-gated P2 — an explicitly validated trade-off for maximum zero-day CVV recall.

---

## 3. Why Layer 0 Tarpit Poisoning?

### The Problem:
When automated carding botnets receive immediate HTTP 403 / 400 responses, they instantly cycle to the next card or proxy IP within milliseconds, testing thousands of stolen cards per minute.

### The RazorVigil Solution:
Layer 0 intercepts high-confidence botnets deterministically and returns a **synthetic 8-second delay response** (`tarpit_delay_sec: 8`):
* Starves the attacker's concurrent worker threads.
* Imposes severe computational cost on the botnet without placing any load on the merchant database.
* Renders automated enumeration economically infeasible for the adversary.

---

## 4. Why Exponential Temporal Graph Decay in Louvain Communities?

### The Problem:
Static bipartite graphs accumulate stale relationships over months. If an IP address was once used by a botnet but later reassigned to a legitimate mobile carrier user, static graphs produce permanent false positives.

### The RazorVigil Solution:
Graph edge weights decay exponentially with a **30-minute half-life ($\tau = 1800\text{s}$)**:
$$W(e, \Delta t) = \max\left(0.05, \exp\left(-\frac{\Delta t}{1800}\right)\right)$$
This ensures community detection reflects active syndicates while dynamically pruning historical noise.

---

## 5. Summary of Architectural Trade-offs

| Design Choice | What We Gained | What We Traded Off |
| :--- | :--- | :--- |
| **In-Memory Pre-Warmed Models** | Sub-15ms gating speed | ~380MB server memory footprint |
| **Split Conformal Sets** | Certified 95% statistical coverage | Requires 2,000-sample calibration set |
| **Deterministic Layer 0 Tarpits** | Starves botnet concurrency | Requires edge reverse-proxy coordination |
| **Persistence-Gated P2 Config** | 76.8% zero-day CVV recall (vs 8.2% baseline) | 10.6% Edge-Case Genuine FPR (VPN/travelers) |

