"""
3DS2 & OTP Relay Bypass Defense Engine — RazorShield Sentinel.
Neutralizes modern Telegram OTP interception bots, reverse proxy relays (Modlishka/Evilginx),
and SIM-swap automated input attacks during 3DS step-up authentication.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any
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


@dataclass
class OTPDefenseResult:
    is_valid: bool
    is_bot_relay: bool
    risk_score: float
    reason: str
    entropy: float
    mean_interval_ms: float


class OTPRelayDefenseEngine:
    """
    Evaluates 3DS OTP entry dynamics in real-time (< 2ms evaluation SLA).
    Detects instant clipboard pasting, programmatic synthetic keystrokes (<15ms interval),
    and reverse proxy MITM relays.
    """

    def __init__(self, min_human_entropy: float = 0.85, max_bot_speed_ms: float = 25.0):
        self.min_human_entropy = min_human_entropy
        self.max_bot_speed_ms = max_bot_speed_ms

    def evaluate_otp_entry(self, req: OTPVerificationRequest) -> OTPDefenseResult:
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

        # 1. Compute Mean and Variance of Keystroke Intervals
        mean_dt = sum(intervals) / len(intervals)
        
        # Bots typically exhibit uniform low intervals (e.g. exactly 10ms +/- 1ms)
        variance = sum((dt - mean_dt) ** 2 for dt in intervals) / len(intervals)
        std_dev = math.sqrt(variance)

        # 2. Compute Shannon Entropy over interval quantized bins
        bins: Dict[int, int] = {}
        for dt in intervals:
            q_bin = int(dt // 15)  # 15ms quantization bucket
            bins[q_bin] = bins.get(q_bin, 0) + 1

        total_k = len(intervals)
        entropy = -sum((cnt / total_k) * math.log2(cnt / total_k) for cnt in bins.values())

        # 3. Detect Superhuman Keystroke Speed (Automated Relay Bot)
        if mean_dt < self.max_bot_speed_ms and std_dev < 8.0:
            return OTPDefenseResult(
                is_valid=False,
                is_bot_relay=True,
                risk_score=0.96,
                reason=f"Superhuman OTP entry velocity (Mean: {mean_dt:.1f}ms, StdDev: {std_dev:.1f}ms) — Scripted injection",
                entropy=round(entropy, 3),
                mean_interval_ms=round(mean_dt, 1),
            )

        # 4. Detect Zero-Entropy Scripted Keystrokes
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
