# RazorShield Sentinel — Demo Runbook

> **Submission: Razorpay AI Builder Internship 2026 | Tracks 02 + 03**
> Rehearse this at least once end-to-end before the live demo.

---

## Pre-Demo Setup Checklist (T-10 min)

Run these in order. Everything below assumes your working directory is the repo root.

```powershell
# 1. Verify Redis is up
redis-cli ping   # expected: PONG

# 2. Start backend
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 3. Start frontend
cd frontend; npm run dev   # port 5173

# 4. Confirm health
curl http://localhost:8000/health
# expected: {"status":"ok","canary_count":50,"razorpay_test_mode":true}

# 5. Warm the cluster engine (first request seeds Redis state)
curl -s -X POST http://localhost:8000/checkout -H "Content-Type: application/json" `
  -d "{\"amount\":999,\"bin6\":\"411111\",\"card_hash\":\"warmup\",\"device_fingerprint\":\"dev_warm\",\"ip_hash\":\"ip_warm\"}"

# 6. Verify MCP server starts cleanly (spot check, then Ctrl-C)
python backend/mcp_server.py
# expected first line: (no error, waits for stdio input)
```

**Browser tabs to have open before starting:**
- `http://localhost:5173` — SOC Dashboard
- `http://localhost:5173` — keep a second tab on the Dispute Case Workspace panel
- GitHub repo (for code reference if asked)

---

## Live Demo Sequence (~8 minutes total)

### 0:00 — Opening framing (30 sec, no clicks)

> "Razorpay's live transaction stack processes ~12,000 UPI + card transactions per second at
> peak. A Telegram carding ring needs only 3 minutes and 50 PANs to enumerate a BIN range
> and extract valid card details worth lakhs. RazorShield Sentinel is a 6-layer autonomous
> engine that identifies, quarantines, and builds evidence against those rings in real time —
> sitting behind your checkout endpoint as a drop-in sub-50ms decision layer."

---

### 0:30 — Attack simulation (2 min)

**Click "Start Attack Simulation" on the dashboard.**

Point out while it runs:
1. **Layer 0 — Anti-Checker Guard fires immediately**: first wave of BIN probe traffic gets tarpitted (poisoned inventory responses).
2. **Layer 0.5 — Canary card hit**: one of the synthetic PANs in the probe is a honeytoken — deterministic 1.0-confidence block, 0% FPR by construction.
3. **Layer 1/2 — Velocity + Graph**: burst velocity spikes, Louvain clustering shows devices grouping into a community with `cluster_risk_score > 0.7`.
4. **Layer 3 — ML scoring**: LightGBM ensemble scores the residual ambiguous traffic at `risk_score ~0.74` (elevated review).

Expected console output to reference:
```
Tier: elevated_review | Risk Score: 0.742
Canary Hit: False | Confidence: 0.0
Cluster: ring_size=12 nodes | Ring Score: 0.86
```

---

### 2:30 — False decline recovery (2 min)

> "But the hardest UX problem in fraud detection isn't catching bots — it's not blocking
> legitimate customers who look suspicious to a naive model. Here's the out-of-band recovery."

**Switch to the Soft Risk / UPI Recovery tab.**

- Show the QR code generated for a `soft_risk` transaction.
- Explain: "This transaction failed the ML threshold but we're not blocking it — we're routing
  it to a UPI payment link. Genuine customers complete it. Bots don't. That's the revenue
  recovery story: zero lost GMV for false positives."
- Show the `razorpay_payment_link` field in the JSON response.

---

### 4:30 — MCP Agent Studio delegation (2.5 min)

> "Now — what makes this different from any fraud API — it's native to Razorpay's own agent
> architecture. We implement the same MCP protocol that Agent Studio is built on. Any Razorpay
> native agent can delegate to us as a specialist sub-agent."

**Run the demo agent in a terminal:**
```powershell
python -m backend.demo_agent --transaction-id TXN_DEMO_001
```

Walk through each tool call as it prints:
1. `investigate_transaction` → tier + risk score
2. `get_cluster_risk_score` → ring membership
3. `check_canary_status` → honeytoken check
4. `compile_dispute_evidence` → 7-claim dossier, INR 4,999 amount grounded

> "Notice the evidence dossier is amount-grounded — ₹4,999 — not a placeholder. It fetches
> real forensic signals from the transaction registry and builds a 5-domain structured dossier
> ready for human review."

**Show the dispute case workspace in the browser.**

---

### 7:00 — Closing metrics (1 min)

> "To close on numbers — and these are honest numbers, not best-case:
> - ML-Layer PR-AUC: 0.9983 at 22.25% fraud prevalence (ambiguous traffic only)
> - Zero-day generalization: 91.76% catch rate on unseen CVV-cycling, leave-one-attack-type-out
> - Latency: 9.08ms p50, 13.86ms p99 — 3.6x faster than the 50ms gateway budget
> - Full-funnel catch rate: 100% — because the canary layer catches what the ML layer misses"

---

## Fallback Plans ("If X breaks, do Y")

### If Redis is down

**Symptom**: Backend startup throws `ConnectionRefusedError` or `/health` returns 500.

**Fallback**:
```powershell
# Option A: restart Redis (if installed as service)
net start Redis

# Option B: fakeredis (already wired in velocity_tracker as fallback)
# Set env var and restart backend:
$env:FAKEREDIS=1; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**What to say**: "Redis is the velocity-tracking store — the system degrades gracefully to
in-process fakeredis, which is what we use in CI. Velocity counters reset per-process rather
than persisting cross-restart, but the pipeline decision logic is identical."

---

### If the LLM Copilot / investigation note is unreachable

**Symptom**: The "Copilot Note" section in the dashboard is empty or shows an error.

**Fallback**: The backend already has a template fallback in `fraud_analyst.py` — a hardcoded
investigation narrative is returned if the LLM call times out. This is by design.

**What to say**: "The fraud analyst copilot is off the hot path — it's dispatched async after
the decision is already made. A timeout here never blocks a transaction. The evidence dossier
from the MCP layer doesn't depend on it."

---

### If the MCP demo agent hangs or crashes

**Symptom**: `python -m backend.demo_agent` exits with a connection error.

**Quick check**:
```powershell
curl http://localhost:8000/health   # confirm backend is still up
```

**Fallback**: Switch to the direct API demo instead.
```powershell
# Show the raw investigate endpoint
curl http://localhost:8000/investigate/TXN_DEMO_001

# Show the MCP server advertises its 4 tools (visual proof)
python backend/mcp_verify.py
```

**What to say**: "The MCP protocol layer is verified — we have a round-trip test that confirms
the server initializes, advertises all 4 tools, and responds to `investigate_transaction` over
stdio. The delegation chain is the same whether called from the demo script or a live Agent
Studio orchestration."

---

### If live Razorpay test-mode API call times out

**Symptom**: `/checkout` response takes >5 seconds or returns a Razorpay gateway error.

**Fallback**: The RazorpayClient already wraps all calls in a `try/except` with graceful
degradation — the transaction proceeds without a `razorpay_order_id` and the risk decision
still runs in full.

**What to say**: "The Razorpay API integration is the revenue-recovery layer — generating
payment links for soft-risk transactions. The core fraud detection pipeline doesn't block on
it. In a production integration this would use async retry with exponential backoff."

---

### If the frontend fails to load

**Symptom**: Vite dev server crashes or `localhost:5173` is blank.

```powershell
cd frontend; npm install; npm run dev
```

**Fallback**: Demo the REST API directly from the terminal + show the GitHub repo on screen.
The backend CLI demo (`demo_agent.py`) is fully self-contained and doesn't need the frontend.

---

## Emergency: Full Demo From Terminal Only (no browser)

If everything UI-side fails, this sequence tells the complete story:

```powershell
# 1. Health check
curl http://localhost:8000/health

# 2. Normal transaction (passes)
curl -X POST http://localhost:8000/checkout -H "Content-Type: application/json" `
  -d "{\"amount\":1500,\"bin6\":\"411111\",\"card_hash\":\"legit_user\",\"device_fingerprint\":\"dev_human\",\"ip_hash\":\"ip_home\",\"keystroke_entropy\":2.1,\"mouse_jitter_score\":0.6}"

# 3. Canary hit (bot caught deterministically)
curl -X POST http://localhost:8000/checkout -H "Content-Type: application/json" `
  -d "{\"amount\":1,\"bin6\":\"400000\",\"card_hash\":\"canary_00_hash\",\"device_fingerprint\":\"dev_bot\",\"ip_hash\":\"ip_dc\"}"

# 4. Full MCP delegation chain
python -m backend.demo_agent --transaction-id TXN_DEMO_001

# 5. MCP protocol verification
python backend/mcp_verify.py
```
