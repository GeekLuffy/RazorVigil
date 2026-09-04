"""
RazorVigil Sentinel — Attack Simulator
Phase 2: Live demo script for the 5-minute pitch.

Three modes (all hit the live /checkout API):

  --mode burst     100 rapid card attempts in a tight window (high-confidence bot demo)
  --mode slow      Distributed slow-rate carding across rotating IPs (velocity demo)
  --mode genuine   A single genuine-but-anomalous VPN customer who gets recovered (Track 3 demo)

Usage:
  python -m simulator.attack_simulator --mode burst
  python -m simulator.attack_simulator --mode slow --workers 10 --duration 60
  python -m simulator.attack_simulator --mode genuine

Each request result is printed live with color coding:
  GREEN  = safe (genuine customer passed)
  YELLOW = soft_risk (step-up / recovery triggered)
  RED    = elevated_review or high_confidence_bot (bot caught)

The script is designed to be rehearsed before the pitch — run it 3 times
before going live to make sure timings look right on the dashboard.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import random
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Literal

import httpx

# Force UTF-8 output on Windows (avoids cp1252 encode errors)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# DEFENSE-ONLY SAFETY DECLARATION & LOCAL ENDPOINT GUARDRAILS
# ---------------------------------------------------------------------------
# RazorVigil Sentinel attack simulators are designed and hardcoded STRICTLY
# for local defensive evaluation, live pitching, and automated test pipelines.
# In compliance with the Razorpay AI Buildathon safety rules, this tool CANNOT
# target external endpoints or live payment gateways.
# ---------------------------------------------------------------------------

API_BASE = "http://localhost:8000"
CHECKOUT_URL = f"{API_BASE}/checkout"

# Strict safety assertion: prohibit external egress
import urllib.parse
_parsed = urllib.parse.urlparse(CHECKOUT_URL)
if _parsed.hostname not in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
    raise RuntimeError(
        f"SAFETY GUARDRAIL TRIGGERED: Attack simulator is restricted to local defensive endpoints only. "
        f"Attempted host '{_parsed.hostname}' is prohibited."
    )

# ANSI colors (work in Windows Terminal / PowerShell 7)
_GREEN  = "\033[92m"
_YELLOW = "\033[93m"
_RED    = "\033[91m"
_CYAN   = "\033[96m"
_BOLD   = "\033[1m"
_RESET  = "\033[0m"
_DIM    = "\033[2m"

ATTACK_BINS = ["522222", "533333"]
NORMAL_BINS = ["411111", "424242", "512345"]



def _h(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()[:16]


def _tier_color(tier: str) -> str:
    if tier == "safe":
        return _GREEN
    if tier == "soft_risk":
        return _YELLOW
    return _RED


def _tier_icon(tier: str) -> str:
    return {"safe": "✓", "soft_risk": "⚠", "elevated_review": "🔶", "high_confidence_bot": "🚫"}.get(tier, "?")


def _print_result(seq: int, tier: str, score: float, latency: float, note: str = "") -> None:
    color = _tier_color(tier)
    icon  = _tier_icon(tier)
    print(
        f"{_DIM}[{seq:>4}]{_RESET} "
        f"{color}{_BOLD}{icon} {tier:<22}{_RESET} "
        f"risk={score:.3f}  {latency:>6.1f}ms  "
        f"{_DIM}{note}{_RESET}"
    )


# ---------------------------------------------------------------------------
# Request builders
# ---------------------------------------------------------------------------

def _burst_payload(i: int) -> dict:
    """Single burst-attack card attempt — datacenter ASN, no behavioral signals."""
    bin6 = random.choice(ATTACK_BINS)
    return {
        "transaction_id": str(uuid.uuid4()),
        "order_id":       str(uuid.uuid4()),
        "amount":         round(random.uniform(1, 50), 2),
        "bin6":           bin6,
        "card_hash":      _h(f"burst_card_{i}_{time.time()}"),
        "billing_name":   "Test User",
        "device_fingerprint": _h("burst_bot_device_sim"),
        "ip_hash":        _h("datacenter_ip_sim"),
        "asn_type":       "datacenter",
        "ja3_hash":       _h("python_httpx_default"),
        "ja3_ua_mismatch": True,
        "keystroke_entropy":  0.0,
        "mouse_jitter_score": 0.0,
        "paste_event":    True,
        "time_on_page_s": 0.05,
        "session_id":     _h("burst_session_sim"),
    }


def _slow_rate_payload(i: int, worker_id: int, ip_pool: list[str], device_pool: list[str]) -> dict:
    """Slow-rate distributed carding — residential proxies, shared device templates."""
    bin6 = "522222"
    return {
        "transaction_id": str(uuid.uuid4()),
        "order_id":       str(uuid.uuid4()),
        "amount":         round(random.uniform(1, 100), 2),
        "bin6":           bin6,
        "card_hash":      _h(f"slow_card_w{worker_id}_{i}"),
        "billing_name":   f"User {random.randint(1000, 9999)}",
        "device_fingerprint": random.choice(device_pool),
        "ip_hash":        random.choice(ip_pool),
        "asn_type":       "residential",
        "ja3_hash":       _h("requests_slow"),
        "ja3_ua_mismatch": random.random() < 0.6,
        "keystroke_entropy":  round(random.uniform(0.0, 0.25), 3),
        "mouse_jitter_score": round(random.uniform(0.0, 0.04), 3),
        "paste_event":    True,
        "time_on_page_s": round(random.uniform(0.2, 2.0), 2),
        "session_id":     _h(f"slow_session_w{worker_id}"),
    }


def _genuine_vpn_payload() -> dict:
    """A real customer using a VPN — should trigger soft_risk + recovery flow."""
    return {
        "transaction_id": str(uuid.uuid4()),
        "order_id":       str(uuid.uuid4()),
        "amount":         7499.0,
        "bin6":           "411111",
        "card_hash":      _h("genuine_customer_vpn_123"),
        "billing_name":   "Arjun Sharma",
        "device_fingerprint": _h("genuine_single_device_vpn"),
        "ip_hash":        _h("vpn_server_mumbai"),
        "asn_type":       "datacenter",   # VPN exit node looks like datacenter
        "ja3_hash":       _h("chrome_real_browser"),
        "ja3_ua_mismatch": False,
        "keystroke_entropy":  2.1,        # real human typing
        "mouse_jitter_score": 0.52,       # real human mouse
        "paste_event":    True,           # password manager autofill (normal)
        "time_on_page_s": 87.0,           # spent 87s browsing before checkout
        "session_id":     _h("genuine_session_vpn"),
        "pan_hash":       _h("genuine_pan_vpn"),
    }


# ---------------------------------------------------------------------------
# Attack mode runners
# ---------------------------------------------------------------------------

async def run_burst(n: int = 80, target_rps: float = 30.0) -> None:
    """
    Fire n card attempts rapidly — simulates a carding script's burst pattern.
    target_rps controls pacing (default 30/s to stay stable on localhost).
    """
    print(f"\n{_RED}{_BOLD}=== BURST ATTACK SIMULATION ==={_RESET}")
    print(f"{_RED}  {n} cards | target {target_rps:.0f} req/s | datacenter ASN | zero behavioral signals{_RESET}\n")

    delay = 1.0 / target_rps
    caught = 0
    start = time.time()

    async with httpx.AsyncClient(timeout=10.0) as client:
        for i in range(n):
            t0 = time.perf_counter()
            try:
                resp = await client.post(CHECKOUT_URL, json=_burst_payload(i))
                data = resp.json()
                tier    = data.get("tier", "error")
                score   = data.get("risk_score", 0.0)
                latency = data.get("latency_ms", (time.perf_counter() - t0) * 1000)
                if tier in ("high_confidence_bot", "elevated_review"):
                    caught += 1
                _print_result(i + 1, tier, score, latency, f"BIN=522222 card#{i}")
            except Exception as e:
                print(f"  [{i+1:>4}] ERROR: {e}")
            await asyncio.sleep(delay)

    elapsed = time.time() - start
    actual_rps = n / elapsed
    print(f"\n{_BOLD}Burst complete:{_RESET} {n} attempts in {elapsed:.1f}s ({actual_rps:.1f} req/s)")
    print(f"{_RED if caught > 0 else _GREEN}Caught (elevated+bot tier): {caught}/{n} ({caught/n:.0%}){_RESET}")


async def _slow_worker(
    worker_id: int,
    n_attempts: int,
    interval_s: float,
    ip_pool: list[str],
    device_pool: list[str],
    results: list[dict],
    client: httpx.AsyncClient,
) -> None:
    """One slow-rate worker — fires one attempt every interval_s seconds."""
    for i in range(n_attempts):
        t0 = time.perf_counter()
        try:
            payload = _slow_rate_payload(i, worker_id, ip_pool, device_pool)
            resp = await client.post(CHECKOUT_URL, json=payload)
            data = resp.json()
            tier    = data.get("tier", "error")
            score   = data.get("risk_score", 0.0)
            latency = data.get("latency_ms", (time.perf_counter() - t0) * 1000)
            results.append({"tier": tier, "score": score})
            _print_result(
                worker_id * 100 + i,
                tier, score, latency,
                f"worker={worker_id} ip={payload['ip_hash'][:8]}"
            )
        except Exception as e:
            print(f"  [w{worker_id}] ERROR: {e}")
        await asyncio.sleep(interval_s + random.uniform(-0.5, 0.5))


async def run_slow(n_workers: int = 8, attempts_per_worker: int = 5, interval_s: float = 3.0) -> None:
    """
    Distributed slow-rate attack:
    Multiple workers each firing one attempt every ~interval_s seconds
    from rotating residential IPs and shared device fingerprint templates.
    This is the pattern that defeats naive IP-rate-limiters.
    """
    print(f"\n{_YELLOW}{_BOLD}=== SLOW-RATE DISTRIBUTED ATTACK ==={_RESET}")
    print(f"{_YELLOW}  {n_workers} workers x {attempts_per_worker} attempts | interval={interval_s}s | residential proxies{_RESET}")
    print(f"{_YELLOW}  Total: {n_workers * attempts_per_worker} attempts across {n_workers} rotating IPs{_RESET}\n")

    # Build pools
    ip_pool     = [_h(f"residential_proxy_{i}") for i in range(n_workers * 3)]
    device_pool = [_h(f"bot_device_template_{i}") for i in range(3)]   # shared device templates

    results: list[dict] = []
    start = time.time()

    async with httpx.AsyncClient(timeout=10.0) as client:
        workers = [
            _slow_worker(wid, attempts_per_worker, interval_s, ip_pool, device_pool, results, client)
            for wid in range(n_workers)
        ]
        # Stagger worker starts slightly (simulates real distributed botnet)
        async def _staggered(coro, delay: float):
            await asyncio.sleep(delay)
            await coro

        tasks = [asyncio.create_task(_staggered(w, i * 0.4)) for i, w in enumerate(workers)]
        await asyncio.gather(*tasks)

    elapsed = time.time() - start
    caught  = sum(1 for r in results if r["tier"] in ("high_confidence_bot", "elevated_review"))
    print(f"\n{_BOLD}Slow-rate complete:{_RESET} {len(results)} attempts in {elapsed:.1f}s")
    print(f"Caught by system: {caught}/{len(results)} ({caught/max(len(results),1):.0%})")
    print(f"{_DIM}(Naive IP rate-limiter would catch 0 -- each IP only made {attempts_per_worker} attempts){_RESET}")


async def run_genuine() -> None:
    """
    Send a single genuine-but-anomalous transaction (VPN customer).
    Should get soft_risk → recovery_url returned.
    This is the 'Track 3 rescue moment' in the demo.
    """
    print(f"\n{_GREEN}{_BOLD}=== GENUINE CUSTOMER (VPN) - RECOVERY DEMO ==={_RESET}")
    print(f"{_GREEN}  Real customer | VPN (datacenter ASN) | human behavioral signals | Rs.7,499 purchase{_RESET}\n")

    payload = _genuine_vpn_payload()

    async with httpx.AsyncClient(timeout=10.0) as client:
        t0 = time.perf_counter()
        resp = await client.post(CHECKOUT_URL, json=payload)
        latency = (time.perf_counter() - t0) * 1000
        data = resp.json()

    tier         = data.get("tier", "error")
    score        = data.get("risk_score", 0.0)
    recovery_url = data.get("recovery_url")
    recovery_qr  = data.get("recovery_qr")
    explanation  = data.get("explanation", "")

    _print_result(1, tier, score, latency, "Arjun Sharma | VPN | Rs.7,499")
    print(f"\n  Explanation : {explanation}")

    if recovery_url:
        print(f"\n{_GREEN}{_BOLD}  Recovery triggered!{_RESET}")
        print(f"  Recovery URL: {recovery_url[:80]}...")
        print(f"  UPI QR      : {recovery_qr}")
        print(f"\n{_GREEN}  Rs.7,499 GMV rescued -- customer can complete payment via UPI{_RESET}")
    else:
        print(f"\n{_YELLOW}  No recovery URL (tier was {tier}) -- check threshold tuning{_RESET}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main(mode: str, burst_n: int, burst_rps: float, slow_workers: int,
               slow_attempts: int, slow_interval: float) -> None:
    print(f"\n{_CYAN}{_BOLD}RazorVigil Sentinel — Attack Simulator{_RESET}")
    print(f"{_DIM}API: {API_BASE}{_RESET}")

    # Verify API is reachable
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{API_BASE}/health")
            r.raise_for_status()
        print(f"{_GREEN}API reachable — {r.json()}{_RESET}\n")
    except Exception as e:
        print(f"{_RED}ERROR: Cannot reach {API_BASE} — is the server running?{_RESET}")
        print(f"  Start with: uvicorn backend.main:app --port 8000")
        return

    if mode == "burst":
        await run_burst(n=burst_n, target_rps=burst_rps)
    elif mode == "slow":
        await run_slow(n_workers=slow_workers, attempts_per_worker=slow_attempts, interval_s=slow_interval)
    elif mode == "genuine":
        await run_genuine()
    elif mode == "canary":
        await run_canary()
    elif mode == "agent":
        await run_agent()
    elif mode == "all":
        # Full pitch demo sequence — run this before going live
        print(f"{_BOLD}=== FULL DEMO SEQUENCE ==={_RESET}\n")
        print("Act 1: Burst attack...")
        await run_burst(n=15, target_rps=8.0)
        await asyncio.sleep(1.5)
        print("\nAct 2: Canary card triggered...")
        await run_canary()
        await asyncio.sleep(1.5)
        print("\nAct 3: Genuine customer recovery...")
        await run_genuine()
        await asyncio.sleep(1.5)
        print("\nAct 4: Verified AI agent passes...")
        await run_agent()


async def run_canary() -> None:
    """Fire a canary honeytoken card. Instant confidence=1.0 block."""
    print(f"\n{_YELLOW}{_BOLD}=== CANARY CARD DEMO ==={_RESET}")
    print(f"{_YELLOW}  Fetching a real honeytoken hash from the server...{_RESET}\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Get a real canary hash from the server
        r = await client.get(f"{API_BASE}/canary/demo-hash?index=7")
        canary_hash = r.json()["card_hash"]

        t0 = time.perf_counter()
        body = {
            "amount": 2500,
            "bin6": "599999",
            "card_hash": canary_hash,
            "device_fingerprint": _h("canary_demo_device"),
            "ip_hash": _h("canary_demo_ip"),
            "asn_type": "residential",  # even residential ASN gets caught
            "keystroke_entropy": 2.5,   # even perfect human signals get caught
            "mouse_jitter_score": 0.7,
            "time_on_page_s": 60.0,
        }
        resp = await client.post(CHECKOUT_URL, json=body)
        latency = (time.perf_counter() - t0) * 1000
        data = resp.json()

    tier       = data.get("tier", "error")
    score      = data.get("risk_score", 0.0)
    is_canary  = data.get("is_canary", False)
    explanation = data.get("explanation", "")

    _print_result(1, tier, score, latency, "Canary card hit")
    print(f"\n  is_canary : {is_canary}")
    print(f"  Score     : {score} (always 1.0 -- no ML, zero false-positive rate)")
    print(f"  Note      : {explanation[:100]}...")
    print(f"\n{_RED}  Honeytoken hit -- confidence=1.0 regardless of any other signal.{_RESET}")
    print(f"{_DIM}  (This card was never issued to a real customer -- any use = fraud){_RESET}")


async def run_agent() -> None:
    """Demonstrate agent-aware routing: same bot signals, different outcomes with/without attestation."""
    print(f"\n{_CYAN}{_BOLD}=== AGENT-AWARE RISK LAYER DEMO ==={_RESET}")
    print(f"{_CYAN}  Same signals: datacenter ASN, zero biometrics, JA3 mismatch{_RESET}")
    print(f"{_CYAN}  Test A: with valid X-Agent-Attestation  ->  verified_agent")
    print(f"  Test B: same request, no token           ->  high_confidence_bot{_RESET}\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Get demo token
        tok_resp = await client.get(f"{API_BASE}/agent/demo-token?agent_id=shopping-agent-v1&spend_limit=10000")
        token = tok_resp.json()["token"]

        payload = {
            "amount": 3499,
            "bin6": "411111",
            "card_hash": _h("agent_demo_card"),
            "device_fingerprint": _h("agent_demo_device"),
            "ip_hash": _h("agent_demo_ip"),
            "asn_type": "datacenter",
            "ja3_ua_mismatch": True,
            "keystroke_entropy": 0.0,
            "mouse_jitter_score": 0.0,
            "time_on_page_s": 0.1,
        }

        # Test A: with attestation
        t0 = time.perf_counter()
        resp_a = await client.post(CHECKOUT_URL, json=payload,
                                   headers={"X-Agent-Attestation": token})
        latency_a = (time.perf_counter() - t0) * 1000
        data_a = resp_a.json()

        # Test B: without attestation
        t0 = time.perf_counter()
        resp_b = await client.post(CHECKOUT_URL, json=payload)
        latency_b = (time.perf_counter() - t0) * 1000
        data_b = resp_b.json()

    print(f"  Test A (with token) :", end=" ")
    _print_result(1, data_a["tier"], data_a["risk_score"], latency_a,
                  f"agent_id={data_a.get('agent_id', 'n/a')}")
    print(f"  Test B (no token)   :", end=" ")
    _print_result(2, data_b["tier"], data_b["risk_score"], latency_b, "no attestation")
    print(f"\n{_CYAN}  Same device, same signals -- different verdicts.{_RESET}")
    print(f"{_DIM}  That's the Agent-Aware Risk Layer.{_RESET}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RazorVigil Sentinel -- Attack Simulator (demo script)"
    )
    parser.add_argument(
        "--mode", choices=["burst", "slow", "genuine", "canary", "agent", "all"],
        default="all",
        help="Demo mode (default: all -- runs full pitch sequence)"
    )
    parser.add_argument("--burst-n",       type=int,   default=80,   help="Burst card count")
    parser.add_argument("--burst-rps",     type=float, default=30.0, help="Burst req/s")
    parser.add_argument("--slow-workers",  type=int,   default=8,    help="Slow-rate workers")
    parser.add_argument("--slow-attempts", type=int,   default=5,    help="Attempts per worker")
    parser.add_argument("--slow-interval", type=float, default=3.0,  help="Seconds between attempts")
    args = parser.parse_args()

    asyncio.run(main(
        mode=args.mode,
        burst_n=args.burst_n,
        burst_rps=args.burst_rps,
        slow_workers=args.slow_workers,
        slow_attempts=args.slow_attempts,
        slow_interval=args.slow_interval,
    ))

