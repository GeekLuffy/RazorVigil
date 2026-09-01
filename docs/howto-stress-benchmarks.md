# ⚡ How to Run Live Parallel Stress Benchmarks

This guide shows how to run high-concurrency stress benchmarks against RazorShield Sentinel to mathematically prove sub-15ms synchronous SLA compliance ($p99 < 15.0\text{ms}$).

---

## 🎯 What You'll Accomplish
- Run 200–1,000 parallel checkout evaluations under 10–100 concurrent workers.
- Generate exact percentile metrics ($p50, p90, p95, p99, p99.9$).
- View real-time Latency Histogram and Cumulative Distribution Function (CDF) curves.

---

## 🚀 Option A: Run via the In-App SOC Dashboard (1-Click)

1. Open **`http://localhost:5173/`** in your browser.
2. In the top navbar, click the **"⚡ SLA Benchmark"** button.
3. Configure your benchmark parameters:
   * **Concurrency**: `50 Workers`
   * **Total Requests**: `300 Requests`
   * **Traffic Profile**: `Mixed Live Traffic (80% Clean, 20% Attack Swarm)`
4. Click **"⚡ Run 300x Parallel Benchmark"**.
5. Observe the live animated progress bar, Recharts Latency Histogram, and SRE metric cards.
6. Click **"Download Audit JSON"** to export compliance records.

---

## 💻 Option B: Run via Terminal CLI / REST API

You can execute the benchmark programmatically using `curl` or Python:

```bash
curl -X POST http://localhost:8000/benchmark/run \
  -H "Content-Type: application/json" \
  -d '{
    "total_requests": 300,
    "concurrency": 50,
    "traffic_profile": "mixed"
  }'
```

### Sample Output Response:
```json
{
  "total_requests": 300,
  "concurrency": 50,
  "elapsed_total_seconds": 3.535,
  "throughput_qps": 84.8,
  "latency_percentiles_ms": {
    "p50": 10.83,
    "p90": 12.91,
    "p95": 13.58,
    "p99": 14.30,
    "p99_9": 14.82,
    "min": 7.42,
    "max": 14.91,
    "mean": 10.95
  },
  "sla_threshold_ms": 15.0,
  "sla_passed": true,
  "sla_compliance_pct": 99.67,
  "conformal_certified_coverage_pct": 100.0
}
```

---

## 🔍 Verification & Interpretation
- **Monotonicity Guarantee**: Ensure $p50 \le p95 \le p99 < 15.0\text{ms}$.
- **Zero Latency Spikes**: The Cumulative Distribution Function (CDF) should reach $100\%$ before the $15.0\text{ms}$ vertical threshold.

---

## 🔗 Related Documentation
- **[Model & Math Architecture Reference](file:///c:/Users/Owais/Documents/RazorPay/razorshield/docs/reference-models-and-math.md)**
- **[Architectural Design Explanations](file:///c:/Users/Owais/Documents/RazorPay/razorshield/docs/explanation-architecture-and-tradeoffs.md)**
