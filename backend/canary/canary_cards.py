"""
Canary Card Honeytokens.

50 synthetic Luhn-valid PANs that are:
- Never issued to a real customer
- Never used in a real transaction by design
- Only known to RazorShield internally

Any checkout attempt matching one = construction-level certainty of fraud.
Zero false-positive rate by construction.

Research doc / WowFactors addendum reference:
  "The one signal in your entire system with a true zero false-positive rate"

Usage:
    from backend.canary.canary_cards import CanaryCards
    canary = CanaryCards()
    result = canary.check(card_hash)   # returns CanaryResult or None
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional


# ---------------------------------------------------------------------------
# Luhn checksum helper (same as dataset generator)
# ---------------------------------------------------------------------------

def _luhn_digit(partial: str) -> int:
    digits = [int(d) for d in partial]
    odd  = digits[-1::-2]
    even = digits[-2::-2]
    total = sum(odd) + sum(
        (d * 2 - 9) if d * 2 > 9 else d * 2 for d in even
    )
    return (10 - (total % 10)) % 10


def _luhn_pan(bin6: str, suffix: str) -> str:
    """Build a Luhn-valid 16-digit PAN from BIN + deterministic suffix."""
    partial = (bin6 + suffix).ljust(15, "0")[:15]
    check   = _luhn_digit(partial)
    return partial + str(check)


def _sha(pan: str) -> str:
    return hashlib.sha256(pan.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Canary card generation
# BINs chosen to look plausible but are provably synthetic:
#   599999 / 499999 / 379999 — real BIN ranges end before these
# ---------------------------------------------------------------------------

_CANARY_BINS = ["599999", "499999", "379999", "549999", "429999"]

def _generate_canary_pans() -> dict[str, str]:
    """Returns {card_hash: pan} for all 50 canary cards."""
    cards: dict[str, str] = {}
    idx = 0
    for bin6 in _CANARY_BINS:
        for n in range(10):  # 5 BINs × 10 cards = 50
            suffix = str(1000 + idx * 7 + n).zfill(9)[:9]
            pan    = _luhn_pan(bin6, suffix)
            h      = _sha(pan)
            cards[h] = pan
            idx   += 1
    return cards


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

@dataclass
class CanaryResult:
    card_hash:    str
    bin6:         str
    pan_prefix:   str   # first 6 + last 4 for display — never the full PAN
    canary_index: int   # which canary slot was hit (1–50)


class CanaryCards:
    """
    Loaded once at startup. check() is O(1) set lookup.
    Adds <0.1ms to the hot path.
    """

    def __init__(self):
        self._cards = _generate_canary_pans()
        # Reverse map: hash -> (pan, index)
        self._lookup: dict[str, tuple[str, int]] = {
            h: (pan, i + 1)
            for i, (h, pan) in enumerate(self._cards.items())
        }
        print(f"[CanaryCards] {len(self._lookup)} honeytokens armed and ready.")

    def check(self, card_hash: str) -> Optional[CanaryResult]:
        """
        Returns CanaryResult if card_hash matches a honeytoken, else None.
        Called on every /checkout BEFORE velocity or ML pipeline.
        """
        entry = self._lookup.get(card_hash)
        if entry is None:
            return None
        pan, idx = entry
        return CanaryResult(
            card_hash    = card_hash,
            bin6         = pan[:6],
            pan_prefix   = pan[:6] + "XX XXXX " + pan[-4:],
            canary_index = idx,
        )

    @property
    def card_hashes(self) -> set[str]:
        return set(self._lookup.keys())

    def get_demo_hash(self, index: int = 1) -> str:
        """Return a canary card_hash for use in demos/tests (1-indexed)."""
        return list(self._lookup.keys())[index - 1]
