"""
RazorVigil Sentinel - MCP Server for Razorpay Agent Studio Integration.

Exposes 4 MCP tools callable by any Claude Agent SDK agent:
  1. check_canary_status(transaction_id)
  2. get_cluster_risk_score(device_fingerprint, ip_hash, card_hash)
  3. investigate_transaction(transaction_id)
  4. compile_dispute_evidence(transaction_id)

How to run standalone:
    python backend/mcp_server.py

Note: Wraps the live RazorVigil backend HTTP API (localhost:8000).
Set RAZORVIGIL_API_URL env var to point to a deployed backend.

SDK: mcp 2.x (MCPServer from mcp.server.mcpserver, @server.tool decorator).
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Optional

import httpx
from mcp.server.mcpserver import MCPServer

RAZORVIGIL_API_URL = os.getenv("RAZORVIGIL_API_URL", "http://localhost:8000")

# ---------------------------------------------------------------------------
# HTTP helpers — fresh AsyncClient per call (safe for stdio + async context)
# ---------------------------------------------------------------------------

async def _get(path: str, params: dict | None = None) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(base_url=RAZORVIGIL_API_URL, timeout=10.0) as client:
            r = await client.get(path, params=params or {})
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as exc:
        return {"error": str(exc), "path": path}


async def _post(path: str, body: dict) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(base_url=RAZORVIGIL_API_URL, timeout=10.0) as client:
            r = await client.post(path, json=body)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as exc:
        return {"error": str(exc), "path": path}


# ---------------------------------------------------------------------------
# Business logic (shared with demo_agent.py)
# ---------------------------------------------------------------------------

async def tool_check_canary_status(transaction_id: str) -> dict[str, Any]:
    """Check if a transaction triggered a canary honeytoken hit."""
    result = await _get("/canary/status", params={"transaction_id": transaction_id})
    if "error" in result:
        return {
            "transaction_id": transaction_id,
            "is_canary": False,
            "confidence": 0.0,
            "canary_index": None,
            "note": "Transaction not found in canary registry.",
            "status": "not_found",
        }
    return result


async def tool_get_cluster_risk_score(
    device_fingerprint: str | None = None,
    ip_hash: str | None = None,
    card_hash: str | None = None,
) -> dict[str, Any]:
    """Get Louvain graph community risk score for any entity."""
    result = await _post("/cluster/risk-score", {
        "device_fingerprint": device_fingerprint,
        "ip_hash": ip_hash,
        "card_hash": card_hash,
    })
    if "error" in result:
        return {
            "cluster_score": 0.0,
            "cluster_id": "unknown",
            "ring_size": 0,
            "note": "Cluster engine unavailable or entity not tracked.",
            "status": "unavailable",
        }
    return result


async def tool_investigate_transaction(transaction_id: str) -> dict[str, Any]:
    """Run the full 8-layer forensic investigation pipeline."""
    result = await _get(f"/investigate/{transaction_id}")
    if "error" in result:
        return {
            "transaction_id": transaction_id,
            "tier": "unknown",
            "risk_score": None,
            "explanation": f"Investigation failed: {result.get('error')}",
            "signals": {},
            "status": "error",
        }
    return result


async def tool_compile_dispute_evidence(transaction_id: str) -> dict[str, Any]:
    """
    Compile a 5-domain draft evidence dossier.
    DRAFT only - requires merchant/human review before filing.
    """
    # Step 0: Fetch real transaction data from the registry so the dossier
    # reflects the actual charge amount and forensic signals — not placeholders.
    tx_data = await _get(f"/investigate/{transaction_id}")
    real_amount = float(tx_data.get("amount", 0.0))
    real_telemetry = tx_data.get("signals", {})

    case_result = await _post("/cases/create-from-transaction", {
        "transaction_id": transaction_id,
        "amount": real_amount,
        "telemetry": real_telemetry,
    })
    if "error" in case_result:
        return {"status": "error", "transaction_id": transaction_id,
                "dossier_draft": "Evidence compilation failed."}

    case_id = case_result.get("case_id")
    if not case_id:
        return {"status": "error", "transaction_id": transaction_id,
                "dossier_draft": "Failed to create dispute case."}

    evidence = await _post(f"/cases/{case_id}/synthesize-evidence", {})
    if "error" in evidence:
        return {"status": "error", "transaction_id": transaction_id,
                "case_id": case_id,
                "dossier_draft": f"Synthesis failed: {evidence.get('error')}"}

    return {
        "transaction_id": transaction_id,
        "case_id": case_id,
        "package_id": evidence.get("package_id"),
        "claims_count": len(evidence.get("claims", [])),
        "claims": evidence.get("claims", []),
        "signal_strength": evidence.get("win_probability", 0.0),
        "recommended_action": evidence.get("recommended_action", ""),
        "dossier_draft": evidence.get("representation_letter", ""),
        "rbi_context": evidence.get("rbi_compliance_attestation", ""),
        "note": "DRAFT - requires merchant/human review before any formal filing.",
        "status": "compiled",
    }


# ---------------------------------------------------------------------------
# MCP Server setup — mcp 2.x MCPServer API
# ---------------------------------------------------------------------------

server = MCPServer(
    name="razorvigil",
    version="1.2.0",
    title="RazorVigil Sentinel",
    description=(
        "Specialist MCP sub-agent for carding ring detection, Louvain graph clustering, "
        "canary honeytoken forensics, and chargeback evidence dossier compilation. "
        "Designed for Razorpay Agent Studio delegation via MCP protocol."
    ),
)


@server.tool(
    name="check_canary_status",
    description=(
        "Check whether a transaction triggered a RazorVigil canary honeytoken hit. "
        "Canary cards are synthetic Luhn-valid PANs seeded exclusively within RazorVigil's "
        "own decoy inventory endpoints. Any hit = 1.0-confidence attacker was scanning our system. "
        "Returns is_canary, confidence, canary_index."
    ),
)
async def check_canary_status(transaction_id: str) -> str:
    result = await tool_check_canary_status(transaction_id)
    return json.dumps(result, indent=2)


@server.tool(
    name="get_cluster_risk_score",
    description=(
        "Get real-time Louvain graph community risk score for any entity (device/IP/card). "
        "Returns cluster_id, cluster_score (0.0=isolated, 1.0=core ring), ring_size."
    ),
)
async def get_cluster_risk_score(
    device_fingerprint: Optional[str] = None,
    ip_hash: Optional[str] = None,
    card_hash: Optional[str] = None,
) -> str:
    result = await tool_get_cluster_risk_score(device_fingerprint, ip_hash, card_hash)
    return json.dumps(result, indent=2)


@server.tool(
    name="investigate_transaction",
    description=(
        "Run the full 8-layer RazorVigil forensic pipeline on any transaction. "
        "Returns tier (safe/soft_risk/elevated_review/high_confidence_bot), "
        "risk_score (0-1), explanation, and all forensic signal values. "
        "Use for specialist carding/bot-abuse deep-forensic analysis."
    ),
)
async def investigate_transaction(transaction_id: str) -> str:
    result = await tool_investigate_transaction(transaction_id)
    return json.dumps(result, indent=2)


@server.tool(
    name="compile_dispute_evidence",
    description=(
        "Compile a 5-domain structured DRAFT evidence dossier: "
        "(1) Gateway HMAC proof, (2) ASN/JA3 telemetry, (3) biometric kinetics, "
        "(4) Louvain graph topology, (5) RBI Authentication Directions 2025 regulatory context. "
        "Fetches real transaction amount and forensic signals automatically. "
        "DRAFT for merchant review only — not a formally filed document. "
        "Returns package_id, claims, signal_strength, dossier_draft."
    ),
)
async def compile_dispute_evidence(transaction_id: str) -> str:
    result = await tool_compile_dispute_evidence(transaction_id)
    return json.dumps(result, indent=2)


if __name__ == "__main__":
    import asyncio
    asyncio.run(server.run_stdio_async())


