# 📚 RazorVigil Sentinel Documentation Hub

Welcome to the official documentation for **RazorVigil Sentinel** — the autonomous real-time AI risk manager and payment defense engine engineered for sub-15ms synchronous gateway authorization.

This documentation is organized according to the **Diataxis Framework** into four distinct quadrants based on your needs:

---

## 🧭 Diataxis Documentation Map

```
                    PRACTICAL GOALS
                          ▲
                          │
          TUTORIALS       │       HOW-TO GUIDES
     (Learning-oriented)  │    (Task-oriented)
                          │
  [Getting Started]       │   [SDK Integration]
  docs/tutorial-quickstart.md │   docs/howto-merchant-integration.md
                          │   [WAF & Rules Export]
                          │   docs/howto-waf-and-rules-export.md
                          │   [SLA Stress Benchmark]
                          │   docs/howto-stress-benchmarks.md
                          │   [RBI Dispute Defense]
                          │   docs/howto-dispute-representation.md
                          │
◄─────────────────────────┼─────────────────────────►
                          │
      EXPLANATIONS        │        REFERENCE
  (Understanding-oriented)│  (Information-oriented)
                          │
  [Architecture & Math]   │   [Complete REST API]
  docs/explanation-architecture-and-tradeoffs.md │ docs/reference-api.md
                          │   [Model & Math Specs]
                          │   docs/reference-models-and-math.md
                          │
                          ▼
                  THEORETICAL KNOWLEDGE
```

---

## 📖 Quadrants Overview

### 1. 🎓 [Tutorial: Getting Started](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/tutorial-quickstart.md)
* **Target Audience**: New developers, evaluators, and judges.
* **Goal**: Takes you from cloning the repository to executing your first live threat evaluation in under 3 steps.

### 2. 🛠️ How-To Guides
* **[How to Integrate RazorVigil SDK (<5 Lines of Code)](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-merchant-integration.md)**: Drop-in guides for Node.js, Python FastAPI, Go, and Java Spring Boot.
* **[How to Run Parallel Stress Benchmarks](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-stress-benchmarks.md)**: Execute 50-worker parallel evaluations to verify $p99 < 15\text{ms}$ SLA compliance.
* **[How to Deploy Synthesized WAF & Risk Rules](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-waf-and-rules-export.md)**: 1-Click export to Cloudflare Ruleset v2 and Razorpay Thirdwatch JSON.
* **[How to Generate RBI Dispute Representation Dossiers](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/howto-dispute-representation.md)**: Automated chargeback evidence generation with SHA-256 anchoring.

### 3. 📋 Reference Documentation
* **[REST & WebSocket API Reference](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/reference-api.md)**: Exhaustive endpoints list (`/checkout`, `/benchmark/run`, `/copilot/chat`, `/adversary/arms-race`, `/cases`, `/export/*`).
* **[Quad-Ensemble Models & Math Reference](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/reference-models-and-math.md)**: Mathematical formulas, loss functions, conformal quantiles, and feature schemas.

### 4. 🧠 [Explanation: Architecture & Design Decisions](file:///c:/Users/Owais/Documents/RazorPay/razorvigil/docs/explanation-architecture-and-tradeoffs.md)
* **Goal**: Deep dive into *why* RazorVigil is built this way — the synchronous vs async trade-offs, why split conformal prediction guarantees zero-false-declines, and why Louvain community graph clustering stops distributed carding swarms.
