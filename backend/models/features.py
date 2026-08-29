"""
Feature engineering pipeline.

Assembles the three feature families from §2 Layer 3 of the research doc:
  1. Tabular / transactional
  2. Behavioural (client-side signals sent as floats)
  3. Velocity / graph (precomputed, read from Redis cache)

Output: a fixed-length numpy array suitable for LightGBM / IsolationForest inference.

FEATURE_NAMES must be kept in sync with train.py's column ordering.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from backend.main import CheckoutRequest
    from backend.velocity.redis_velocity import VelocityFeatures

# Merchant-level constants for z-score normalisation
# In production these would come from a per-merchant stats store.
_MERCHANT_MEAN_AMOUNT = 1500.0
_MERCHANT_STD_AMOUNT = 2000.0

# ASN type encoding
_ASN_ENCODING = {
    "residential": 0,
    "mobile": 1,
    "datacenter": 2,
    "tor": 3,
    "unknown": 2,  # treat unknown as datacenter (conservative)
}

FEATURE_NAMES = [
    # Tabular
    "amount",
    "amount_zscore",
    "hour_sin",
    "hour_cos",
    "asn_type_encoded",
    "ja3_ua_mismatch",
    # Behavioural
    "keystroke_entropy",
    "mouse_jitter_score",
    "paste_event",
    "time_on_page_s",
    # Velocity / graph
    "bin_card_count",
    "bin_name_count",
    "ip_distinct_pan_count",
    "device_distinct_bin_count",
    "device_distinct_ip_count",   # rotating proxy fanout signal
    "cvv_cycle_attempts",
    "cluster_risk_score",
]

N_FEATURES = len(FEATURE_NAMES)


def build_feature_vector(
    req: "CheckoutRequest",
    vel: "VelocityFeatures",
    cluster_score: float,
) -> np.ndarray:
    """
    Assemble a (N_FEATURES,) float32 vector from a CheckoutRequest,
    its velocity features, and its precomputed cluster score.
    No NaN values — all fields have safe defaults.
    """
    # Hour of day from Unix timestamp — cyclical encoding avoids 23→0 discontinuity
    import datetime
    hour = datetime.datetime.utcfromtimestamp(req.timestamp).hour
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)

    amount_zscore = (req.amount - _MERCHANT_MEAN_AMOUNT) / max(_MERCHANT_STD_AMOUNT, 1.0)
    asn_enc = _ASN_ENCODING.get(req.asn_type.lower(), 2)

    features = [
        # Tabular
        float(req.amount),
        float(amount_zscore),
        float(hour_sin),
        float(hour_cos),
        float(asn_enc),
        float(req.ja3_ua_mismatch),
        # Behavioural
        float(req.keystroke_entropy),
        float(req.mouse_jitter_score),
        float(req.paste_event),
        float(max(0.0, req.time_on_page_s)),
        # Velocity / graph
        float(vel.bin_card_count),
        float(vel.bin_name_count),
        float(vel.ip_distinct_pan_count),
        float(vel.device_distinct_bin_count),
        float(vel.device_distinct_ip_count),   # rotating proxy fanout
        float(vel.cvv_cycle_attempts),
        float(cluster_score),
    ]

    assert len(features) == N_FEATURES, (
        f"Feature count mismatch: {len(features)} != {N_FEATURES}"
    )
    return np.array(features, dtype=np.float32)
