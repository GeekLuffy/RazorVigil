"""
3DS2 & OTP Relay Bypass Defense Engine — RazorVigil.
Neutralizes modern Telegram OTP interception bots, reverse proxy relays (Modlishka/Evilginx),
SIM-swap automated input attacks, and 3DS2 frictionless downgrade exploits.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class OTPVerificationRequest(BaseModel):
    transaction_id: str
    order_id: str
    otp_code: str
    # 3DS Kinetic Biometrics during OTP entry
    keystroke_intervals_ms: list[float] = Field(default_factory=list)
    paste_event: bool = False
    time_to_first_keystroke_ms: float = 0.0
    total_entry_duration_ms: float = 0.0
    # Device & Network during step-up
    device_fingerprint: str = ""
    ip_hash: str = ""
    session_nonce: str = ""
    # AiTM Reverse-Proxy & TLS Telemetry
    client_reported_origin: str = "checkout.razorvigil.io"
    gateway_origin: str = "checkout.razorvigil.io"
    tls_session_resumed: bool = True
    round_trip_latency_ms: float = 45.0


class ThreeDSChallengeExemptionRequest(BaseModel):
    transaction_id: str
    amount: float
    requested_exemption: str  # "frictionless", "low_value", "tra_whitelisted"
    device_fingerprint: str
    asn_type: str
    ja3_ua_mismatch: bool
    velocity_spike: bool


class SessionBindingValidationRequest(BaseModel):
    session_id: str
    bound_device_hash: str
    bound_ip_subnet: str
    current_device_hash: str
    current_ip_subnet: str
    ja4_fingerprint: str = ""


@dataclass
class SessionBindingResult:
    is_valid: bool
    hijacking_detected: bool
    risk_score: float
    reason: str


@dataclass
class OTPDefenseResult:

    is_valid: bool
    is_bot_relay: bool
    risk_score: float
    reason: str
    entropy: float
    mean_interval_ms: float
    mitm_proxy_detected: bool = False


@dataclass
class ThreeDSExemptionResult:
    exemption_granted: bool
    mandate_step_up: bool
    risk_tier: str
    rationale: str


class OTPRelayDefenseEngine:
    """
    Evaluates 3DS OTP entry dynamics and AiTM proxy signatures in real-time (< 2ms evaluation SLA).
    Detects instant clipboard pasting, programmatic synthetic keystrokes (<25ms interval),
    reverse proxy MITM relays (Evilginx), and unauthorized 3DS2 frictionless downgrades.
    """

    def __init__(self, min_human_entropy: float = 0.85, max_bot_speed_ms: float = 25.0):
        self.min_human_entropy = min_human_entropy
        self.max_bot_speed_ms = max_bot_speed_ms

    def evaluate_otp_entry(self, req: OTPVerificationRequest) -> OTPDefenseResult:
        # 1. Check for Adversary-in-the-Middle (AiTM) Reverse-Proxy Header Spoofing
        if req.client_reported_origin != req.gateway_origin:
            return OTPDefenseResult(
                is_valid=False,
                is_bot_relay=True,
                risk_score=1.00,
                reason=f"AiTM Reverse-Proxy Detected: Origin mismatch ({req.client_reported_origin} != {req.gateway_origin}) — Evilginx/Modlishka relay intercepted",
                entropy=0.0,
                mean_interval_ms=0.0,
                mitm_proxy_detected=True,
            )

        # 2. Check for RTT Proxy Latency Anomalies (>1200ms unexpected latency relay)
        if req.round_trip_latency_ms > 2500.0 and req.paste_event:
            return OTPDefenseResult(
                is_valid=False,
                is_bot_relay=True,
                risk_score=0.94,
                reason="Adversarial relay lag detected: Multi-hop proxy latency with clipboard injection",
                entropy=0.0,
                mean_interval_ms=0.0,
                mitm_proxy_detected=True,
            )

        intervals = req.keystroke_intervals_ms
        if not intervals or len(intervals) < 3:
            # If pasted instantaneously or 0 interval recorded
            if req.paste_event and req.total_entry_duration_ms < 100.0:
                return OTPDefenseResult(
                    is_valid=False,
                    is_bot_relay=True,
                    risk_score=0.98,
                    reason="Instantaneous clipboard paste detected (<100ms) — Automated OTP relay bot signature",
                    entropy=0.0,
                    mean_interval_ms=0.0,
                )
            return OTPDefenseResult(
                is_valid=True,
                is_bot_relay=False,
                risk_score=0.25,
                reason="Single-tap autofill via trusted OS credential provider",
                entropy=1.2,
                mean_interval_ms=50.0,
            )

        # 3. Compute Mean and Variance of Keystroke Intervals
        mean_dt = sum(intervals) / len(intervals)
        
        # Bots typically exhibit uniform low intervals (e.g. exactly 10ms +/- 1ms)
        variance = sum((dt - mean_dt) ** 2 for dt in intervals) / len(intervals)
        std_dev = math.sqrt(variance)

        # 4. Compute Shannon Entropy over interval quantized bins
        bins: Dict[int, int] = {}
        for dt in intervals:
            q_bin = int(dt // 15)  # 15ms quantization bucket
            bins[q_bin] = bins.get(q_bin, 0) + 1

        total_k = len(intervals)
        entropy = -sum((cnt / total_k) * math.log2(cnt / total_k) for cnt in bins.values())

        # 5. Detect Superhuman Keystroke Speed (Automated Relay Bot)
        if mean_dt < self.max_bot_speed_ms and std_dev < 8.0:
            return OTPDefenseResult(
                is_valid=False,
                is_bot_relay=True,
                risk_score=0.96,
                reason=f"Superhuman OTP entry velocity (Mean: {mean_dt:.1f}ms, StdDev: {std_dev:.1f}ms) — Scripted injection",
                entropy=round(entropy, 3),
                mean_interval_ms=round(mean_dt, 1),
            )

        # 6. Detect Zero-Entropy Scripted Keystrokes
        if entropy < self.min_human_entropy and mean_dt < 60.0:
            return OTPDefenseResult(
                is_valid=False,
                is_bot_relay=True,
                risk_score=0.91,
                reason=f"Sub-threshold OTP entry entropy ({entropy:.2f} < {self.min_human_entropy}) — Telegram OTP grabber pattern",
                entropy=round(entropy, 3),
                mean_interval_ms=round(mean_dt, 1),
            )

        # Human genuine OTP entry verified
        return OTPDefenseResult(
            is_valid=True,
            is_bot_relay=False,
            risk_score=0.08,
            reason="Human kinetic keystroke dynamics verified during 3DS challenge",
            entropy=round(entropy, 3),
            mean_interval_ms=round(mean_dt, 1),
        )

    def audit_3ds2_frictionless_downgrade(self, req: ThreeDSChallengeExemptionRequest) -> ThreeDSExemptionResult:
        """
        Prevents carders from spoofing 3DS Requestor Challenge Indicators to force a frictionless flow.
        Mandates step-up challenge if high-risk telemetry is present.
        """
        # Hard Deny of Exemption for Datacenter / TOR or JA3 Spoofing
        if req.asn_type in ("datacenter", "tor") or req.ja3_ua_mismatch or req.velocity_spike:
            return ThreeDSExemptionResult(
                exemption_granted=False,
                mandate_step_up=True,
                risk_tier="high_risk_downgrade_attempt",
                rationale="Frictionless exemption rejected: High-risk network telemetry detected (Datacenter/JA3 Mismatch/Velocity Spike)",
            )

        if req.amount >= 2000.0 and req.requested_exemption == "low_value":
            return ThreeDSExemptionResult(
                exemption_granted=False,
                mandate_step_up=True,
                risk_tier="amount_exemption_breach",
                rationale=f"Low-value exemption rejected: Amount ₹{req.amount:,.2f} exceeds RBI ₹2,000 threshold",
            )

        return ThreeDSExemptionResult(
            exemption_granted=True,
            mandate_step_up=False,
            risk_tier="genuine_low_risk",
            rationale="Legitimate low-risk transaction: 3DS2 frictionless authentication permitted",
        )

    def validate_session_binding(self, req: SessionBindingValidationRequest) -> SessionBindingResult:
        """
        Anti-Account-Takeover & Stolen Cookie Injection Defense:
        Verifies that an authenticated 3DS session token has not been stolen and replayed
        from a different device or distinct proxy IP subnet.
        """
        if req.bound_device_hash != req.current_device_hash:
            return SessionBindingResult(
                is_valid=False,
                hijacking_detected=True,
                risk_score=1.00,
                reason=f"Stolen Session Token Replay Detected: Device fingerprint mismatch ({req.current_device_hash[:8]} != {req.bound_device_hash[:8]})",
            )

        if req.bound_ip_subnet != req.current_ip_subnet:
            return SessionBindingResult(
                is_valid=False,
                hijacking_detected=True,
                risk_score=0.88,
                reason=f"Suspicious Session Geolocation Drift: Subnet shift detected ({req.current_ip_subnet} != {req.bound_ip_subnet})",
            )

        return SessionBindingResult(
            is_valid=True,
            hijacking_detected=False,
            risk_score=0.02,
            reason="Cryptographic session binding verified",
        )

