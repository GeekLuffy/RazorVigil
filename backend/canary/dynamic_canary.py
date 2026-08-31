"""
Dynamic Canary Honeytoken Rotation Engine.
Generates epoch-rotated, Luhn-valid honeypot PANs that rotate every 24 hours
to prevent adversary frequency analysis and reverse engineering.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Optional, Dict, Tuple

from backend.canary.canary_cards import _luhn_pan, _sha, _CANARY_BINS, CanaryResult, CanaryCards


class DynamicCanaryManager:
    """
    Manages both baseline static canary tokens (for persistent tracking)
    and daily rotating canary tokens (epoch-derived) with sub-millisecond lookup.
    """

    def __init__(self, rotation_interval_s: int = 86400):
        self.rotation_interval_s = rotation_interval_s
        self.static_canaries = CanaryCards()
        self._current_epoch = -1
        self._dynamic_lookup: Dict[str, Tuple[str, int]] = {}
        self._refresh_dynamic_tokens()

    def _get_epoch(self) -> int:
        return int(time.time() // self.rotation_interval_s)

    def _refresh_dynamic_tokens(self) -> None:
        epoch = self._get_epoch()
        if epoch == self._current_epoch:
            return

        self._current_epoch = epoch
        self._dynamic_lookup.clear()

        # Deterministically derive 20 fresh rotating canary cards for this 24h window
        for bin_idx, bin6 in enumerate(_CANARY_BINS):
            for n in range(4):  # 5 BINs × 4 cards = 20 rotating tokens
                seed_str = f"dyn_{epoch}_{bin_idx}_{n}"
                suffix_hash = hashlib.sha256(seed_str.encode()).hexdigest()
                suffix_digits = "".join(filter(str.isdigit, suffix_hash))[:9].ljust(9, "7")
                pan = _luhn_pan(bin6, suffix_digits)
                h = _sha(pan)
                self._dynamic_lookup[h] = (pan, 100 + len(self._dynamic_lookup) + 1)

    def check(self, card_hash: str) -> Optional[CanaryResult]:
        """
        Check card_hash against static canary seeds and dynamically rotated tokens.
        O(1) in-memory lookup adding < 0.1ms overhead.
        """
        # 1. Check primary static canary set
        static_hit = self.static_canaries.check(card_hash)
        if static_hit is not None:
            return static_hit

        # 2. Check dynamic rotating set
        self._refresh_dynamic_tokens()
        entry = self._dynamic_lookup.get(card_hash)
        if entry is None:
            return None

        pan, idx = entry
        return CanaryResult(
            card_hash=card_hash,
            bin6=pan[:6],
            pan_prefix=pan[:6] + "XX XXXX " + pan[-4:],
            canary_index=idx,
        )

    @property
    def total_armed_tokens(self) -> int:
        return len(self.static_canaries.card_hashes) + len(self._dynamic_lookup)
