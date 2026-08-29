"""
RazorShield Sentinel — Anti-Checker & Anti-Carding Engine.
High-performance defense against Telegram carding bots, Browserless CDP scrapers,
curl_cffi TLS impersonation, and micro-auth enumeration.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any, Dict, Optional, Tuple

# Secret for time-bound client proof validation
_POW_SECRET = "razorshield-client-pow-seed-2026"

# Known botnet fingerprint prefixes captured from live threat intelligence
KNOWN_BOTNET_FINGERPRINTS = {
    "noXc7Zv4NmOzRNIl3zmSernrLMFEo05J0lh73kdY46cUpMIuLjBQbCwQygBbMH4t4xfrCkwWutyony5DncDTRX0e50ULyy2GMgy2LUxAwaxczwLNJYzwLXqTe7GlMxqzCo7XgsfxKEWuy6hRjefIXYKVOJ23KBn6",
}

KNOWN_BOTNET_PREFIXES = (
    "noXc7Zv4NmOz",
    "dev_mule",
    "bot_dev",
    "adv_dev",
    "dev_canary",
    "fp_dc_bot",
)

# Synthetic decoy IDs planted in merchant HTML to trap web scrapers
DECOY_PAYMENT_LINK_IDS = {
    "plink_decoy_trap_01",
    "plink_honeypot_scanner",
    "ppi_decoy_trap_item_99",
}


class AntiCheckerGuard:
    """
    Dedicated anti-carding and bot checker defense engine.
    Designed for sub-1ms synchronous execution before any payment processor API calls.
    """

    def __init__(self, enable_tarpit_poisoning: bool = True):
        self.enable_tarpit = enable_tarpit_poisoning
        self.blocked_attempts_count = 0
        self.poisoned_responses_count = 0

    def evaluate_request(
        self,
        amount: float,
        device_fingerprint: str,
        asn_type: str,
        keystroke_entropy: float,
        mouse_jitter: float,
        time_on_page_s: float,
        payment_link_id: Optional[str] = None,
        client_nonce: Optional[str] = None,
        client_nonce_ts: Optional[float] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Inspects an incoming transaction for automated checker signatures.
        
        Returns:
            (is_malicious: bool, reason: str, metadata: dict)
        """
        now = time.time()

        # 1. Decoy Honeypot Trap
        if payment_link_id and payment_link_id in DECOY_PAYMENT_LINK_IDS:
            self.blocked_attempts_count += 1
            return True, "DECOY_HONEYPOT_TRIGGERED", {
                "defense": "Decoy ID Trap",
                "detail": f"Scraped decoy payment link ID used: {payment_link_id}",
                "confidence": 1.0,
            }

        # 2. Known Botnet Device Fingerprint
        if (
            device_fingerprint in KNOWN_BOTNET_FINGERPRINTS
            or any(device_fingerprint.startswith(p) for p in KNOWN_BOTNET_PREFIXES)
        ):
            self.blocked_attempts_count += 1
            return True, "KNOWN_BOTNET_FINGERPRINT", {
                "defense": "Bot-Farm Hash Quarantine",
                "detail": f"Matched known carding tool fingerprint seed: {device_fingerprint[:14]}...",
                "confidence": 1.0,
            }

        # 3. Micro-Auth Enumeration (Telegram ₹1.00 / ₹2.00 Checker Signature)
        is_datacenter = asn_type in ("datacenter", "tor")
        zero_biometrics = keystroke_entropy < 0.1 and mouse_jitter < 0.05 and time_on_page_s < 1.0
        
        if amount <= 10.0 and (is_datacenter or zero_biometrics):
            self.blocked_attempts_count += 1
            return True, "MICRO_AUTH_ENUMERATION", {
                "defense": "Micro-Charge Velocity Sentinel",
                "detail": f"Testing minimum amount (Rs.{amount:.2f}) from automated/datacenter session",
                "confidence": 0.98,
            }

        # 4. Direct AJAX / Playwright Zero-Entropy Signature
        if zero_biometrics and is_datacenter:
            self.blocked_attempts_count += 1
            return True, "DIRECT_API_SCRIPT_DISPATCH", {
                "defense": "Biometric Integrity Filter",
                "detail": "Zero human keystroke/mouse entropy on datacenter ASN (Headless automation)",
                "confidence": 0.95,
            }

        # 5. Client Proof Nonce Validation (when enabled by merchant SDK)
        if client_nonce and client_nonce_ts:
            if not self.verify_client_proof(client_nonce, client_nonce_ts, device_fingerprint):
                self.blocked_attempts_count += 1
                return True, "INVALID_CLIENT_PROOF", {
                    "defense": "Cryptographic Nonce Verifier",
                    "detail": "Failed browser JavaScript attestation nonce (Direct Python script call)",
                    "confidence": 0.99,
                }

        return False, "CLEAN", {"defense": "None", "confidence": 0.0}

    def generate_client_proof(self, device_fingerprint: str, timestamp: float) -> str:
        """Generate a time-bound client interaction proof token."""
        msg = f"{device_fingerprint}|{int(timestamp)}"
        return hmac.new(_POW_SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()

    def verify_client_proof(self, nonce: str, timestamp: float, device_fingerprint: str) -> bool:
        """Verify time-bound client proof within a 120-second validity window."""
        if abs(time.time() - timestamp) > 120:
            return False
        expected = self.generate_client_proof(device_fingerprint, timestamp)
        return hmac.compare_digest(expected, nonce)

    def generate_poisoned_honeypot_response(self, card_hash: str) -> Dict[str, Any]:
        """
        Synthesizes a deceptive bank decline response.
        Deceives automated Telegram bots into marking live stolen cards as 'DEAD ❌' in their logs,
        poisoning the adversary's stolen database and neutralizing future attacks.
        """
        self.poisoned_responses_count += 1
        return {
            "status": "failed",
            "tier": "high_confidence_bot",
            "action": "honeypot",
            "risk_score": 0.99,
            "honeypot_poisoning": True,
            "error": {
                "code": "BAD_REQUEST_ERROR",
                "description": "Payment failed: The issuing bank declined the transaction (ERR_CARD_INVALID_STATUS).",
                "source": "issuing_bank_simulator",
                "step": "payment_authentication",
                "reason": "payment_failed",
            },
            "card_hash_masked": f"{card_hash[:6]}******{card_hash[-4:]}" if len(card_hash) >= 10 else card_hash,
            "latency_ms": 8.5,
        }
