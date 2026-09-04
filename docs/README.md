# 📚 RazorVigil Documentation Hub

Welcome to the official documentation for **RazorVigil** — the autonomous real-time AI risk manager and payment defense engine engineered for sub-15ms synchronous gateway authorization.

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

### 1. 🎓 [Tutorial: Getting Started](tutorial-quickstart.md)
* **Target Audience**: New developers, evaluators, and judges.
* **Goal**: Takes you from cloning the repository to executing your first live threat evaluation in under 3 steps.

### 2. 🛠️ How-To Guides
* **[How to Integrate RazorVigil SDK (<5 Lines of Code)](howto-merchant-integration.md)**: Drop-in guides for Node.js, Python FastAPI, Go, and Java Spring Boot.
* **[How to Run Parallel Stress Benchmarks](howto-stress-benchmarks.md)**: Execute 50-worker parallel evaluations to verify $p99 < 15\text{ms}$ SLA compliance.
* **[How to Deploy Synthesized WAF & Risk Rules](howto-waf-and-rules-export.md)**: 1-Click export to Cloudflare Ruleset v2 and Razorpay Thirdwatch JSON.
* **[How to Generate RBI Dispute Representation Dossiers](howto-dispute-representation.md)**: Automated chargeback evidence generation with SHA-256 anchoring.

### 3. 📋 Reference Documentation
* **[REST & WebSocket API Reference](reference-api.md)**: Exhaustive endpoints list (`/checkout`, `/benchmark/run`, `/copilot/chat`, `/adversary/arms-race`, `/cases`, `/export/*`).
* **[Quad-Ensemble Models & Math Reference](reference-models-and-math.md)**: Mathematical formulas, loss functions, conformal quantiles, and feature schemas.

### 4. 🧠 [Explanation: Architecture & Design Decisions](explanation-architecture-and-tradeoffs.md)
* **Goal**: Deep dive into *why* RazorVigil is built this way — the synchronous vs async trade-offs, why split conformal prediction guarantees zero-false-declines, and why Louvain community graph clustering stops distributed carding swarms.

---

## 📑 Complete System Specification & Auditor Dossier
For a comprehensive end-to-end technical audit, read the **[Complete RazorVigil Deep Dossier](../PROJECT_RAZORVIGIL_DEEP_DOSSIER.md)** (560+ lines detailing hot-path latency budgets, conformal bounds, Louvain modularity proofs, and RBI compliance mappings).

---

## ⚡ Evaluator & Judge 60-Second Fast Track
1. **Verify Test Suite**: `python -m pytest tests/ -v` (59 passed in ~25s)
2. **Audit Data Leakage**: `python scripts/leakage_audit.py` (0 cross-split collisions)
3. **Inspect Ground-Truth Metrics**: [`docs/metrics.json`](metrics.json)
4. **Live Checkout Test**: `curl -X POST http://127.0.0.1:8000/checkout -H "Content-Type: application/json" -d '{"amount": 499.0, "currency": "INR", "card_hash": "c_fasttrack", "device_fingerprint": "dev_fasttrack", "keystroke_entropy": 2.85}'`

