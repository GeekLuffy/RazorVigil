"""
Agent-Aware Risk Layer.

Adds a third traffic class beyond human | bot:
  verified_agent — a legitimate AI shopping agent with a cryptographically
                   signed mandate from a real user.

Research ref (WowFactors addendum §2):
  - Experian 2026 Fraud Forecast: agentic AI = top emerging fraud threat
  - arXiv:2601.22569: Red-teaming Google's Agent Payments Protocol (AP2)
  - Money 20/20 2026: "legitimate AI agent looks structurally like a bot"

The pitch line: "Every fraud system today detects bots. We built the one that
also knows the difference between a bot and your next customer's AI shopping
assistant."

Implementation:
  - Checkout request includes optional header X-Agent-Attestation: <signed JWT>
  - JWT payload: { user_id, agent_id, merchant_id, spend_limit, iat, exp }
  - Verified → traffic class: verified_agent, separate decision path
  - Unverified / missing → falls through to normal bot pipeline (no regression)

For demo: we generate valid attestation tokens ourselves (mock AP2).
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Optional

from jose import jwt, JWTError

# Signing key for demo (in production: asymmetric key pair / KMS)
_AGENT_SECRET  = os.getenv("AGENT_ATTESTATION_SECRET", "razorshield-agent-demo-secret")
_AGENT_ALGO    = "HS256"
_AGENT_ISSUER  = "razorshield-agent-registry"


@dataclass
class AgentAttestation:
    agent_id:    str
    user_id:     str
    merchant_id: str
    spend_limit: float
    expires_at:  int


class AgentAttestationValidator:
    """
    Validates X-Agent-Attestation JWT headers.
    Enforces strict signature verification, reject alg:none, and tracks failure rates.
    """

    def __init__(self, redis_client=None):
        self._redis = redis_client
        self._local_fails: dict[str, list[float]] = {}

    def validate(self, token: str, client_ip: str = "") -> tuple[Optional[AgentAttestation], Optional[str]]:
        """
        Returns (AgentAttestation, error_message).
        Strictly rejects 'none' algorithm and unapproved algorithms.
        """
        if not token:
            return None, "Missing token"

        try:
            # Explicitly inspect unverified header to ensure no alg confusion
            header = jwt.get_unverified_header(token)
            if header.get("alg") != _AGENT_ALGO:
                self._record_failure(client_ip)
                return None, f"Algorithm confusion attempt: {header.get('alg')} not allowed"

            payload = jwt.decode(
                token,
                _AGENT_SECRET,
                algorithms=[_AGENT_ALGO],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "require": ["exp", "agent_id", "user_id", "spend_limit"]
                }
            )

            # Verify issuer
            if payload.get("iss") != _AGENT_ISSUER:
                self._record_failure(client_ip)
                return None, "Invalid token issuer"

            return AgentAttestation(
                agent_id    = payload["agent_id"],
                user_id     = payload["user_id"],
                merchant_id = payload.get("merchant_id", ""),
                spend_limit = float(payload["spend_limit"]),
                expires_at  = int(payload["exp"]),
            ), None

        except JWTError as e:
            self._record_failure(client_ip)
            return None, f"JWT verification failed: {e}"

    def _record_failure(self, client_id: str):
        if not client_id:
            return
        now = time.time()
        fails = self._local_fails.setdefault(client_id, [])
        fails.append(now)
        # Keep only last 10 minutes
        self._local_fails[client_id] = [t for t in fails if now - t < 600]

    def is_rate_limited(self, client_id: str) -> bool:
        """Returns True if there have been >3 forged/failed attestation attempts in 10 minutes."""
        if not client_id:
            return False
        now = time.time()
        recent = [t for t in self._local_fails.get(client_id, []) if now - t < 600]
        return len(recent) >= 3

    def check_spend_limit(self, attestation: AgentAttestation, amount: float) -> bool:
        """Returns True if transaction amount is within the agent's authorized spend limit."""
        return amount <= attestation.spend_limit


def generate_demo_token(
    agent_id: str = "shopping-agent-v1",
    user_id: str = "user_razorpay_demo",
    merchant_id: str = "merchant_demo_001",
    spend_limit: float = 10000.0,
    ttl_seconds: int = 3600,
) -> str:
    """
    Generate a valid agent attestation token for demo/testing.

    In production this would be issued by an agent registry after
    the user explicitly authorizes the agent to spend on their behalf.
    """
    now = int(time.time())
    payload = {
        "agent_id":    agent_id,
        "user_id":     user_id,
        "merchant_id": merchant_id,
        "spend_limit": spend_limit,
        "iat": now,
        "exp": now + ttl_seconds,
        "iss": _AGENT_ISSUER,
    }
    return jwt.encode(payload, _AGENT_SECRET, algorithm=_AGENT_ALGO)
