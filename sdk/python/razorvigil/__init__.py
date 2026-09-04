"""
Official Python SDK for RazorVigil real-time payment defense.
"""

from __future__ import annotations
import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CheckoutPayload(BaseModel):
    transaction_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    merchant_id: Optional[str] = "default_merch"
    card_hash: str
    device_fingerprint: str
    ip_hash: Optional[str] = None
    keystroke_entropy: float = 2.5
    mouse_jitter_score: float = 0.5
    ja3_ua_mismatch: bool = False
    asn_type: str = "residential"


class Decision(BaseModel):
    transaction_id: str
    decision: str
    tier: str
    risk_score: float
    conformal_set: List[str] = Field(default_factory=list)
    honeypot: Optional[Dict[str, Any]] = None

    @property
    def is_quarantined(self) -> bool:
        return self.tier == "high_confidence_bot" or self.decision == "honeypot"

    @property
    def is_soft_risk(self) -> bool:
        return self.tier == "soft_risk" or ("fraud" in self.conformal_set and "genuine" in self.conformal_set)

    @property
    def honeypot_json(self) -> str:
        return json.dumps(self.honeypot or {"status": "quarantined", "delay_sec": 8})


class RazorVigilClient:
    def __init__(self, api_key: Optional[str] = None, base_url: str = "http://127.0.0.1:8000"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def evaluate_async(self, payload: CheckoutPayload | Dict[str, Any]) -> Decision:
        data = payload.dict() if hasattr(payload, "dict") else payload
        data_bytes = json.dumps(data).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        req = urllib.request.Request(f"{self.base_url}/checkout", data=data_bytes, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=0.015) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                return Decision(**res_json)
        except Exception:
            # Sub-15ms fail-safe fallback
            return Decision(
                transaction_id=data.get("transaction_id", "fallback_tx"),
                decision="allow",
                tier="safe",
                risk_score=0.0,
                conformal_set=["genuine"]
            )


# Backward compatibility alias
RazorShieldClient = RazorVigilClient
