"""
Decision tiering and action routing.

Maps final_risk score → (tier, action, explanation).
Thresholds from §2 Layer 3 of the research doc.

Research doc tiers:
  0–15%   → safe              → pass
  15–50%  → soft_risk         → step_up (route to recovery)
  50–75%  → elevated_review   → step_up + manual queue flag
  >75%    → high_confidence_bot → honeypot / hard block
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Tuple

if TYPE_CHECKING:
    from backend.main import CheckoutRequest

# Tier thresholds
_T_SOFT = 0.15
_T_ELEVATED = 0.50
_T_BOT = 0.75


class DecisionEngine:
    def decide(
        self, risk_score: float, req: "CheckoutRequest"
    ) -> Tuple[str, str, str]:
        """
        Returns (tier, action, explanation).

        Rule override runs BEFORE ML threshold — catches obvious bots that the
        ML model underscores on cold start (no velocity history yet).
        Research doc §1.3: 'no single signal is robust on its own; the ensemble
        across dozens of weak signals is what's hard to spoof.'
        But some combinations are near-deterministic (datacenter + zero biometrics
        + JA3 mismatch = no plausible legitimate explanation).
        """
        # ----------------------------------------------------------------
        # Known Botnet Device Fingerprint Trap (Layer 0)
        # Catches hardcoded Playwright/CDP checker devices (e.g. noXc7Zv4NmOz...)
        # ----------------------------------------------------------------
        known_bot_prefixes = ("noXc7Zv4NmOz", "dev_mule", "bot_dev", "adv_dev", "dev_canary")
        if any(req.device_fingerprint.startswith(p) for p in known_bot_prefixes):
            return (
                "high_confidence_bot",
                "honeypot",
                (
                    f"Signature override: Known botnet device fingerprint matched "
                    f"({req.device_fingerprint[:12]}...). Quarantined to silent honeypot."
                ),
            )

        # ----------------------------------------------------------------
        # Micro-Auth Enumeration Trap (Layer 1)
        # Catches Telegram ₹1.00 checker attacks on Payment Pages
        # ----------------------------------------------------------------
        is_datacenter = req.asn_type in ("datacenter", "tor")
        zero_biometrics = (
            req.keystroke_entropy < 0.1
            and req.mouse_jitter_score < 0.05
            and req.time_on_page_s < 1.0
        )
        if req.amount <= 10.0 and (is_datacenter or zero_biometrics):
            return (
                "high_confidence_bot",
                "honeypot",
                (
                    f"Rule override: Micro-auth carding enumeration detected "
                    f"(amount=Rs.{req.amount:.2f}, zero biometrics={zero_biometrics}, "
                    f"ASN={req.asn_type}). Quarantined."
                ),
            )

        # ----------------------------------------------------------------
        # Deterministic rule override (fast path, before ML thresholds)
        # datacenter/tor + zero biometrics + JA3 mismatch = bot, always
        # ----------------------------------------------------------------
        if is_datacenter and zero_biometrics and req.ja3_ua_mismatch:
            return (
                "high_confidence_bot",
                "honeypot",
                (
                    f"Rule override: datacenter ASN={req.asn_type}, "
                    f"zero biometrics (entropy={req.keystroke_entropy:.2f}, "
                    f"jitter={req.mouse_jitter_score:.2f}), JA3/UA mismatch. "
                    f"ML score={risk_score:.2%}. Silent honeypot issued."
                ),
            )

        # ASN=datacenter + zero biometrics (no JA3 mismatch) → elevated
        if is_datacenter and zero_biometrics:
            return (
                "elevated_review",
                "step_up",
                (
                    f"Rule override: datacenter ASN + zero biometrics. "
                    f"ML score={risk_score:.2%}. Manual review flagged."
                ),
            )

        # ----------------------------------------------------------------
        # Standard ML-score thresholds
        # ----------------------------------------------------------------
        if risk_score < _T_SOFT:
            return (
                "safe",
                "pass",
                f"Risk {risk_score:.2%} -- below soft threshold, passing.",
            )

        elif risk_score < _T_ELEVATED:
            return (
                "soft_risk",
                "step_up",
                self._soft_risk_explanation(risk_score, req),
            )

        elif risk_score < _T_BOT:
            return (
                "elevated_review",
                "step_up",
                self._elevated_explanation(risk_score, req),
            )

        else:
            return (
                "high_confidence_bot",
                "honeypot",
                self._bot_explanation(risk_score, req),
            )

    # ------------------------------------------------------------------
    # Explanation builders (template-based; replaced by LLM in Phase 3)
    # ------------------------------------------------------------------

    def _soft_risk_explanation(self, score: float, req: "CheckoutRequest") -> str:
        signals = []
        if req.asn_type in ("datacenter", "tor"):
            signals.append(f"ASN={req.asn_type}")
        if req.ja3_ua_mismatch:
            signals.append("JA3/UA mismatch")
        if req.keystroke_entropy < 0.5:
            signals.append(f"low keystroke entropy ({req.keystroke_entropy:.2f})")
        if req.mouse_jitter_score < 0.1:
            signals.append("near-zero mouse jitter")
        sig_str = ", ".join(signals) if signals else "borderline velocity"
        return f"Risk {score:.2%} — soft-risk: {sig_str}. Routing to recovery flow."

    def _elevated_explanation(self, score: float, req: "CheckoutRequest") -> str:
        return (
            f"Risk {score:.2%} — elevated: multiple anomalous signals from "
            f"device {req.device_fingerprint[:8]}... Flagged for manual review queue."
        )

    def _bot_explanation(self, score: float, req: "CheckoutRequest") -> str:
        return (
            f"Risk {score:.2%} — high-confidence bot. "
            f"Silent honeypot response issued. Cluster from IP {req.ip_hash[:8]}... blocked."
        )
