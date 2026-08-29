"""
Recovery stub — Phase 1 mock implementation.

For soft_risk transactions: generates a mock UPI dynamic QR payload and a
tokenized WhatsApp recovery link. No real Razorpay API calls.

Real Razorpay Payment Links / UPI QR API integration is Phase 2+.

Research doc reference: §3.2 — Zero-leakage, non-bypassable recovery loop.
"""

from __future__ import annotations

import json
import time
import uuid
from typing import TYPE_CHECKING, Tuple

import redis.asyncio as aioredis
from jose import jwt

if TYPE_CHECKING:
    from backend.main import CheckoutRequest

# 5-minute inventory hold TTL (seconds)
_HOLD_TTL_S = 300

# JWT secret for signing recovery tokens (in production: use env var / KMS)
_JWT_SECRET = "razorshield-dev-secret-replace-in-prod"
_JWT_ALGO = "HS256"


class RecoveryStub:
    def __init__(self, redis_client: aioredis.Redis):
        self._redis = redis_client

    async def generate(self, req: "CheckoutRequest") -> Tuple[str, str]:
        """
        Creates a 5-minute inventory hold and returns:
          (recovery_url: str, recovery_qr: str)

        The recovery_url is a signed, single-use JWT-bearing link.
        The recovery_qr is a mock UPI intent string (real Razorpay QR in Phase 2).
        """
        token_id = str(uuid.uuid4())
        expires_at = int(time.time()) + _HOLD_TTL_S

        # Set inventory hold: hold:{order_id} → token_id, expires in 5 min
        hold_key = f"hold:{req.order_id}"
        await self._redis.setex(hold_key, _HOLD_TTL_S, token_id)

        # Build signed recovery JWT
        payload = {
            "order_id": req.order_id,
            "amount": req.amount,
            "token_id": token_id,
            "exp": expires_at,
            "iat": int(time.time()),
            "jti": token_id,           # JWT ID — single-use
        }
        signed_token = jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGO)

        # Mock recovery URL (Phase 2: real Razorpay payment link)
        recovery_url = (
            f"https://pay.razorshield.local/recover"
            f"?token={signed_token}&order={req.order_id}"
        )

        # Mock UPI dynamic QR intent string (Phase 2: real Razorpay QR API)
        upi_intent = (
            f"upi://pay?pa=razorshield@ybl"
            f"&pn=RazorShield+Recovery"
            f"&am={req.amount:.2f}"
            f"&tn=Recovery+{req.order_id[:8]}"
            f"&tr={token_id[:8]}"
            f"&cu=INR"
        )

        return recovery_url, upi_intent

    async def validate_token(self, token: str, order_id: str) -> bool:
        """
        Verify a recovery token is valid, not expired, and matches the hold.
        Used by the recovery completion endpoint (Phase 2).
        """
        try:
            payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGO])
        except Exception:
            return False

        if payload.get("order_id") != order_id:
            return False

        # Check hold still exists in Redis
        hold_key = f"hold:{order_id}"
        stored_token_id = await self._redis.get(hold_key)
        if stored_token_id != payload.get("token_id"):
            return False

        return True
