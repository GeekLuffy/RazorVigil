# Known Limitations & Roadmap

> Included here as an honest accounting of what is built, what is architecturally described
> but not implemented, and what would be required to take this from an internship submission
> to a production-grade deployment.

---

## What Is Fully Built and Verified

| Component | Status |
|-----------|--------|
| 6-layer fraud detection pipeline (L0–L4) | ✅ Running, latency-benchmarked |
| Canary honeytoken system (50 PANs, 0% FPR) | ✅ Mathematical construction verified |
| Louvain community graph clustering | ✅ Real-time, Redis-backed |
| LightGBM + IsolationForest ensemble | ✅ Trained, calibrated, 17-feature aligned |
| Out-of-band UPI QR recovery | ✅ Razorpay test-mode payment links working |
| MCP server (4 tools, mcp 2.x SDK) | ✅ Protocol round-trip verified via `mcp_verify.py` |
| Chargeback evidence dossier engine | ✅ 5-domain, amount-grounded |
| Webhook deduplication (payload `id` key) | ✅ Idempotency tested |
| Anti-checker tarpit / BIN probe poisoning | ✅ Running, poisoned-response count tracked |

---

## What Is Not Built (Honest Gaps)

### 1. Real Federated Cross-Merchant Fraud Sharing

**What the architecture describes**: A federated privacy-preserving consortium where multiple
merchants share anonymised fraud signals (hashed PANs, device fingerprints, velocity patterns)
using differential privacy or SMPC so that a carding ring blocked at Merchant A is immediately
flagged at Merchant B — without either merchant seeing the other's raw transaction data.

**What is actually implemented**: The RazorShield backend is a single-tenant service. There is
no inter-merchant communication layer, no federated learning protocol, no differential privacy
budget management, and no consortium governance model. The architecture section describes this
as a future direction with reference to Flower FL / OpenFL patterns.

**What production would require**: A shared Redis cluster (or Bloom filter consortium) with
hashed entity identifiers, a governance contract covering data residency (RBI data localisation
requirements apply), and a cryptographic anonymisation layer. This is a 3–6 month engineering
effort with significant legal/compliance overhead.

---

### 2. Reinforcement Learning / Bandit Friction Policy

**What the architecture describes**: An online bandit (e.g., LinUCB or contextual Thompson
Sampling) that dynamically selects the cheapest sufficient friction level — silent pass, soft
QR step-up, OTP, full block — to minimise friction cost while maintaining a target false
negative rate, learning from user completion rates in real time.

**What is actually implemented**: The decision tiering (`backend/decision/tiering.py`) uses a
fixed static threshold table. Tiers (safe / soft_risk / elevated_review / high_confidence_bot)
are determined by comparing `final_risk` against four hardcoded cut-points. There is no online
learning, no completion-rate feedback loop, and no regret-minimising exploration strategy.

**What production would require**: A reward signal pipeline (transaction completion → label),
a contextual feature store, an online learning backend (Vowpal Wabbit or a lightweight custom
bandit), and A/B infrastructure to safely introduce exploration without degrading merchant CVR.

---

### 3. External / Out-of-Distribution Validation

**Current state**: All published metrics (PR-AUC 0.9983, adversarial 0.9991, 91.76%
zero-day generalization) are evaluated on held-out test splits of our own 50,000-row synthetic
dataset. The synthetic data was generated with domain knowledge of the same attack patterns the
model was trained to detect, creating inductive bias even under leave-one-attack-type-out
cross-validation.

**Planned for external validation**: Cold-transfer evaluation of the existing trained ensemble
against the IEEE-CIS Fraud Detection dataset (real card transaction fraud, 590K rows) and the
ULB European credit card dataset (real anonymised transactions, 284K rows). These numbers are
expected to be meaningfully lower than the synthetic-data numbers — that is the point of the
exercise, and the gap will be reported as-is without papering over it.

**Note on behavioral biometrics**: Our strongest signal features (keystroke entropy,
mouse jitter score, time-on-page, JA3/UA mismatch) do not exist in either external dataset.
External validation will necessarily use only the transactional and velocity-proxy features,
which is a real limitation of the comparison.

---

### 4. MCP stdio Transport Is Verified But Not Agent-Studio-Registered

**What is verified**: `backend/mcp_server.py` starts cleanly, advertises 4 tools over the
MCP stdio protocol, and responds to `investigate_transaction` and `check_canary_status`
tool calls. This is confirmed by `backend/mcp_verify.py` (committed to repo).

**What is not done**: The server has not been registered with a live Razorpay Agent Studio
workspace. Razorpay Agent Studio launched March 12 2026 (FTX'26) — the MCP registration
flow requires a live Agent Studio tenant, which we do not have access to for a test submission.
The positioning is correct (MCP protocol, same Claude Agent SDK stack) but the end-to-end
`Razorpay Agent → RazorShield sub-agent` delegation has not been run on live Agent Studio
infrastructure, only simulated via `demo_agent.py`.

---

### 5. Latency Benchmarks Are Single-Machine / No-Concurrency Baseline

**What is measured**: Sequential p50/p99 (9.08ms / 13.86ms) and 40 req/s sustained p99
(28.06ms) on local hardware (RTX 2080 Ti machine, Redis local).

**What this doesn't capture**: Cold-start latency after a Redis flush, latency under real
network I/O to a remote Redis cluster, ML model serialisation/deserialisation on first request
after a pod restart, or the Razorpay API call latency in the `safe` tier path (which adds
~200–400ms but is off the hot decision path in practice since it's fire-and-forget).

---

## Roadmap (If This Becomes a Real System)

| Priority | Item | Effort |
|----------|------|--------|
| P0 | External dataset validation (IEEE-CIS, ULB) | 1–2 days |
| P0 | Real PAN tokenisation (not raw `card_hash`) | 1 week |
| P1 | Federated merchant signal sharing (Bloom filter MVP) | 6–8 weeks |
| P1 | Online bandit friction policy (LinUCB, VW) | 4–6 weeks |
| P1 | GNN ring detection (GraphSAGE on real entity graph) | 3–4 weeks |
| P2 | Agent Studio live registration + delegation test | 1–2 days (access required) |
| P2 | Production Redis cluster + persistent velocity windows | 2–3 weeks |
| P3 | Differential privacy for federated signals | 3–6 months |
