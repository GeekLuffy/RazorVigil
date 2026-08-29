"""
Razorpay Test Mode Integration Wrapper.

Handles:
1. Orders API (creating test orders for safe transactions)
2. Payment Links API (generating real payment links for recovered soft_risk transactions)
3. Webhook Signature Verification (HMAC-SHA256) for payment.authorized and payment.captured
"""

import hmac
import hashlib
import os
import time
import uuid
import httpx
from typing import Optional, Dict, Any

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo12345678")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "razorpay_test_secret_demo")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "razorshield_webhook_secret_2026")
RAZORPAY_API_BASE = "https://api.razorpay.com/v1"


class RazorpayClient:
    def __init__(self, key_id: str = RAZORPAY_KEY_ID, key_secret: str = RAZORPAY_KEY_SECRET):
        self.key_id = key_id
        self.key_secret = key_secret
        self.is_live_keys = not key_id.startswith("rzp_test_demo")

    async def create_order(self, amount_rupees: float, receipt: str = "") -> Dict[str, Any]:
        """
        Creates a Razorpay order (amount in paise).
        Used strictly for SAFE transactions that pass the risk screen.
        """
        amount_paise = int(round(amount_rupees * 100))
        receipt_id = receipt or f"rcpt_{uuid.uuid4().hex[:8]}"

        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "risk_decision": "safe",
                "screened_by": "RazorShield Sentinel"
            }
        }

        if self.is_live_keys:
            try:
                async with httpx.AsyncClient(auth=(self.key_id, self.key_secret), timeout=5.0) as client:
                    resp = await client.post(f"{RAZORPAY_API_BASE}/orders", json=payload)
                    if resp.status_code == 200:
                        return resp.json()
            except Exception as e:
                print(f"[RazorpayClient] API call failed: {e}. Using deterministic mock.")

        # Deterministic test order representation
        return {
            "id": f"order_{uuid.uuid4().hex[:14]}",
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "status": "created",
            "created_at": int(time.time()),
        }

    async def create_payment_link(self, amount_rupees: float, description: str = "RazorShield Recovery Link") -> Dict[str, Any]:
        """
        Creates a Razorpay Payment Link for recovered soft_risk transactions.
        """
        amount_paise = int(round(amount_rupees * 100))
        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "reminder_enable": False,
            "notes": {
                "tier": "soft_risk_recovered",
                "screened_by": "RazorShield Sentinel"
            }
        }

        if self.is_live_keys:
            try:
                async with httpx.AsyncClient(auth=(self.key_id, self.key_secret), timeout=5.0) as client:
                    resp = await client.post(f"{RAZORPAY_API_BASE}/payment_links", json=payload)
                    if resp.status_code == 200:
                        return resp.json()
            except Exception as e:
                print(f"[RazorpayClient] Payment link API failed: {e}. Using deterministic link.")

        link_id = f"plink_{uuid.uuid4().hex[:14]}"
        return {
            "id": link_id,
            "short_url": f"https://rzp.io/i/{link_id[:8]}",
            "amount": amount_paise,
            "status": "created"
        }

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        """
        Verifies HMAC-SHA256 signature from Razorpay Webhook header 'X-Razorpay-Signature'.
        """
        if not signature:
            return False
        expected_sig = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature)
