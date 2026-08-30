"""
RazorShield Sentinel - Demo Agent for Razorpay Agent Studio Integration.

Demonstrates how Razorpay's Agent Studio (or any Claude Agent SDK agent) can
delegate specialist carding/bot-abuse investigation to RazorShield Sentinel
via MCP tool calls.

This minimal demo shows the delegation pattern:
  1. Agent receives a suspicious transaction
  2. Calls investigate_transaction (deep forensic analysis)
  3. If high risk, calls check_canary_status
  4. Calls compile_dispute_evidence for chargeback defense dossier

Usage:
    python backend/demo_agent.py --transaction-id TXN_DEMO_001
    python backend/demo_agent.py --transaction-id TXN_DEMO_001 --anthropic-key YOUR_KEY

Requirements:
    pip install anthropic mcp
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

import httpx

RAZORSHIELD_API_URL = os.getenv("RAZORSHIELD_API_URL", "http://localhost:8000")

# ---------------------------------------------------------------------------
# Simulated MCP tool calls via direct HTTP (no MCP transport needed for demo)
# In a real Agent Studio deployment these would be MCP tool calls.
# ---------------------------------------------------------------------------

async def call_check_canary_status(transaction_id: str) -> dict:
    async with httpx.AsyncClient(base_url=RAZORSHIELD_API_URL, timeout=10.0) as c:
        try:
            r = await c.get("/canary/status", params={"transaction_id": transaction_id})
            return r.json() if r.status_code == 200 else {"is_canary": False, "note": "not found"}
        except Exception as e:
            return {"is_canary": False, "error": str(e)}


async def call_investigate_transaction(transaction_id: str) -> dict:
    async with httpx.AsyncClient(base_url=RAZORSHIELD_API_URL, timeout=10.0) as c:
        try:
            r = await c.get(f"/investigate/{transaction_id}")
            return r.json() if r.status_code == 200 else {"tier": "unknown", "error": "not found"}
        except Exception as e:
            return {"tier": "unknown", "error": str(e)}


async def call_get_cluster_risk_score(device_fingerprint: str = None, ip_hash: str = None, card_hash: str = None) -> dict:
    async with httpx.AsyncClient(base_url=RAZORSHIELD_API_URL, timeout=10.0) as c:
        try:
            r = await c.post("/cluster/risk-score", json={
                "device_fingerprint": device_fingerprint,
                "ip_hash": ip_hash,
                "card_hash": card_hash,
            })
            return r.json() if r.status_code == 200 else {"cluster_score": 0.0, "note": "not found"}
        except Exception as e:
            return {"cluster_score": 0.0, "error": str(e)}


async def call_compile_dispute_evidence(transaction_id: str) -> dict:
    async with httpx.AsyncClient(base_url=RAZORSHIELD_API_URL, timeout=15.0) as c:
        try:
            # Step 0: Fetch real transaction amount and telemetry from the registry
            # so the evidence dossier reflects the actual transaction, not a placeholder.
            inv_r = await c.get(f"/investigate/{transaction_id}")
            inv_data = inv_r.json() if inv_r.status_code == 200 else {}
            real_amount = float(inv_data.get("amount", 0.0))
            real_telemetry = inv_data.get("signals", {})

            case_r = await c.post("/cases/create-from-transaction", json={
                "transaction_id": transaction_id,
                "amount": real_amount,
                "telemetry": real_telemetry,
            })
            case_id = case_r.json().get("case_id") if case_r.status_code == 200 else None
            if not case_id:
                return {"status": "error", "dossier_draft": "Case creation failed"}
            ev_r = await c.post(f"/cases/{case_id}/synthesize-evidence", json={})
            return ev_r.json() if ev_r.status_code == 200 else {"status": "error"}
        except Exception as e:
            return {"status": "error", "error": str(e)}


# ---------------------------------------------------------------------------
# Demo agent orchestration (simulates Claude Agent SDK delegation pattern)
# NOTE: Makes direct HTTP calls to the backend REST endpoints — which is
# exactly what the MCP tool implementations in mcp_server.py do internally.
# This demonstrates the delegation pattern without requiring a running MCP
# stdio transport. For the actual MCP protocol round-trip, run mcp_server.py
# and connect with a Claude Agent SDK client or Claude Desktop.
# ---------------------------------------------------------------------------

async def run_demo_agent(transaction_id: str):
    print("=" * 70)
    print("RAZORSHIELD SENTINEL — AGENT STUDIO MCP DEMO")
    print("Simulates Razorpay native agent delegating to RazorShield via MCP")
    print("(HTTP simulation — backend endpoints are the same ones MCP tools call)")
    print("=" * 70)
    print(f"\n[Agent] Received suspicious transaction for investigation: {transaction_id}")
    print("[Agent] Delegating to RazorShield Sentinel specialist sub-agent...\n")

    # Tool call 1: investigate_transaction — full 8-layer forensic pipeline
    print(f"[MCP Tool Call 1/4] investigate_transaction('{transaction_id}')")
    inv = await call_investigate_transaction(transaction_id)
    tier = inv.get("tier", "unknown")
    risk_score = inv.get("risk_score", inv.get("final_risk", "N/A"))
    explanation = inv.get("explanation", inv.get("decision", ""))
    amount = inv.get("amount", 0.0)
    signals = inv.get("signals", {})
    print(f"  -> Tier: {tier} | Risk Score: {risk_score} | Amount: INR {amount:,.2f}")
    print(f"  -> {explanation}\n")

    # Tool call 2: get_cluster_risk_score — Louvain ring membership
    device_fp = signals.get("device_fingerprint") or f"dev_{transaction_id[:8]}"
    print(f"[MCP Tool Call 2/4] get_cluster_risk_score(device_fingerprint='{device_fp}')")
    cluster = await call_get_cluster_risk_score(device_fingerprint=device_fp)
    cluster_score = cluster.get("cluster_score", 0.0)
    cluster_id = cluster.get("cluster_id", "c_0")
    ring_size = cluster.get("ring_size", 1)
    print(f"  -> Cluster: {cluster_id} | Ring Score: {cluster_score:.3f} | Ring Size: {ring_size} nodes")
    if cluster_score > 0.5:
        print(f"  -> WARNING: High community risk — device linked to a {ring_size}-node fraud ring.\n")
    else:
        print("  -> Low ring affiliation — no organized ring detected.\n")

    # Tool call 3: check_canary_status — honeytoken detection
    if tier not in ("safe",):
        print(f"[MCP Tool Call 3/4] check_canary_status('{transaction_id}')")
        canary = await call_check_canary_status(transaction_id)
        is_canary = canary.get("is_canary", False)
        confidence = canary.get("confidence", 0.0)
        print(f"  -> Canary Hit: {is_canary} | Confidence: {confidence}")
        if is_canary:
            idx = canary.get("canary_index")
            print(f"  -> Canary Index #{idx} triggered. Deterministic block. 0.00% FPR.\n")
        else:
            print("  -> No canary hit. Proceeding to evidence compilation.\n")
    else:
        print(f"[MCP Tool Call 3/4] check_canary_status — skipped (tier=safe)\n")

    # Tool call 4: compile_dispute_evidence — 5-domain forensic dossier
    print(f"[MCP Tool Call 4/4] compile_dispute_evidence('{transaction_id}')")
    print(f"  (using real amount=INR {amount:,.2f} and forensic signals from investigation)")
    evidence = await call_compile_dispute_evidence(transaction_id)
    pkg_id = evidence.get("package_id", "N/A")
    claims_count = len(evidence.get("claims", []))
    signal = evidence.get("win_probability", evidence.get("signal_strength", 0.0))
    action = evidence.get("recommended_action", "")
    dossier = evidence.get("representation_letter", evidence.get("dossier_draft", ""))

    print(f"  -> Package ID: {pkg_id}")
    print(f"  -> Claims compiled: {claims_count} verifiable forensic claims")
    print(f"  -> Evidence signal strength (heuristic): {signal:.0%}")
    print(f"  -> Recommended action: {action}")
    print()

    print("[Agent] MCP tool delegation complete. Summary:")
    print("-" * 70)
    print(f"  Transaction:      {transaction_id}")
    print(f"  Amount:           INR {amount:,.2f}")
    print(f"  Risk Tier:        {tier}")
    print(f"  Risk Score:       {risk_score}")
    print(f"  Cluster Risk:     {cluster_score:.3f} (ring: {ring_size} nodes)")
    print(f"  Evidence Package: {pkg_id} ({claims_count} claims)")
    print(f"  Signal Strength:  {signal:.0%} (heuristic — human review required)")
    print()
    print("[Agent] Returning structured evidence to Razorpay Dispute Responder...")
    print("[Agent] DRAFT dossier ready for merchant review. Not formally filed.")
    print("=" * 70)

    if dossier:
        print("\n--- DRAFT EVIDENCE DOSSIER (first 500 chars) ---")
        print(dossier[:500] + ("..." if len(dossier) > 500 else ""))
        print("-" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RazorShield Agent Studio MCP Demo")
    parser.add_argument("--transaction-id", default="TXN_DEMO_MCP_001",
                        help="Transaction ID to investigate")
    args = parser.parse_args()
    asyncio.run(run_demo_agent(args.transaction_id))
