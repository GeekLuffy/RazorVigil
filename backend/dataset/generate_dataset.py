"""
Synthetic transaction dataset generator.

Produces a 5,000-row CSV with ground-truth labels following the four-segment
spec from §4.1 of the research doc:

  ~70%  Normal organic traffic          (3,500 rows)
  ~10%  Distributed slow-rate carding   (500 rows)
  ~15%  High-velocity burst attack      (750 rows)
  ~5%   Edge-case genuine traffic       (250 rows)

Run:
  python -m backend.dataset.generate_dataset
  python -m backend.dataset.generate_dataset --n 10000 --seed 99

Output: data/synthetic_transactions.csv
"""

from __future__ import annotations

import argparse
import hashlib
import math
import random
import time
import uuid
from pathlib import Path

import numpy as np
import pandas as pd
from faker import Faker

fake = Faker("en_IN")

_OUTPUT_PATH = Path(__file__).parents[2] / "data" / "synthetic_transactions.csv"

# Merchant baseline for amount z-score in features.py
_MERCHANT_MEAN_AMOUNT = 1500.0
_MERCHANT_STD_AMOUNT = 2000.0

# Luhn checksum helper
def _luhn_digit(partial: str) -> int:
    digits = [int(d) for d in partial]
    odd = digits[-1::-2]
    even = digits[-2::-2]
    total = sum(odd) + sum(
        (d * 2 - 9) if d * 2 > 9 else d * 2 for d in even
    )
    return (10 - (total % 10)) % 10


def _luhn_valid_pan(bin6: str, length: int = 16) -> str:
    """Generate a Luhn-valid synthetic PAN for a given BIN."""
    middle_len = length - len(bin6) - 1
    middle = "".join([str(random.randint(0, 9)) for _ in range(middle_len)])
    partial = bin6 + middle
    check = _luhn_digit(partial)
    return partial + str(check)


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:16]


# Realistic BIN pool (synthetic — not real issuer BINs)
_NORMAL_BINS = [
    "411111", "424242", "512345", "531234", "601100",
    "376789", "370000", "341234", "4532XX", "4916XX",
]
_ATTACK_BINS = ["522222", "533333"]  # shared by carding segments

# ASN pools
_RESIDENTIAL_ASNS = ["residential"] * 8 + ["mobile"] * 2
_DATACENTER_ASNS = ["datacenter"] * 9 + ["tor"] * 1

# JA3 hash pools (synthetic)
_HUMAN_JA3 = [_hash(f"chrome_{i}") for i in range(20)]
_BOT_JA3 = [_hash("python_requests"), _hash("httpx_default")]


def _diurnal_hour() -> int:
    """Sample an hour of day weighted toward peak shopping hours (10am–10pm IST)."""
    peak_hours = list(range(10, 22))
    off_hours = list(range(0, 10)) + [22, 23]
    if random.random() < 0.8:
        return random.choice(peak_hours)
    return random.choice(off_hours)


def _timestamp_with_hour(hour: int) -> float:
    now = time.time()
    return now - (23 - hour) * 3600 + random.uniform(-1800, 1800)


# ---------------------------------------------------------------------------
# Segment generators
# ---------------------------------------------------------------------------

def _normal_row(rng: random.Random, np_rng: np.random.Generator) -> dict:
    bin6 = rng.choice(_NORMAL_BINS).replace("X", str(rng.randint(0, 9)))
    pan = _luhn_valid_pan(bin6)
    amount = float(np.clip(np_rng.lognormal(mean=7.0, sigma=0.8), 10, 50000))
    hour = _diurnal_hour()
    device_fp = _hash(f"device_{rng.randint(1, 500)}")
    ip = _hash(f"ip_{rng.randint(1, 10000)}")
    asn = rng.choice(_RESIDENTIAL_ASNS)
    return {
        "bin6": bin6,
        "card_hash": _hash(pan),
        "pan_hash": _hash(pan + "_pan"),
        "amount": round(amount, 2),
        "billing_name": fake.name(),
        "device_fingerprint": device_fp,
        "ip_hash": ip,
        "asn_type": asn,
        "ja3_hash": rng.choice(_HUMAN_JA3),
        "ja3_ua_mismatch": False,
        "keystroke_entropy": rng.uniform(1.5, 3.5),
        "mouse_jitter_score": rng.uniform(0.35, 0.95),
        "paste_event": rng.random() < 0.25,
        "time_on_page_s": rng.uniform(15, 300),
        "timestamp": _timestamp_with_hour(hour),
        "is_fraud": 0,
        "attack_type": "normal",
    }


def _slow_rate_carding_rows(rng: random.Random, n: int) -> list[dict]:
    """
    Distributed slow-rate: 2–5 device fingerprint templates shared across
    50–100 rotating IPs, sequential PANs in shared BIN ranges.
    """
    rows = []
    bin6 = rng.choice(_ATTACK_BINS)
    device_templates = [_hash(f"bot_dev_{i}") for i in range(rng.randint(2, 5))]
    ip_pool = [_hash(f"residential_proxy_{i}") for i in range(rng.randint(50, 100))]

    base_pan_suffix = rng.randint(1000, 9000)
    for i in range(n):
        pan_suffix = str(base_pan_suffix + i).zfill(4)
        pan_body = bin6 + str(rng.randint(10000, 99999)) + pan_suffix
        pan = pan_body[: 15] + str(_luhn_digit(pan_body[:15]))
        amount = round(rng.uniform(1, 100), 2)  # micro-charge
        # ~2 min intervals per worker, staggered
        ts = time.time() - (n - i) * (rng.uniform(100, 140))
        rows.append({
            "bin6": bin6,
            "card_hash": _hash(pan),
            "pan_hash": _hash(pan + "_pan"),
            "amount": amount,
            "billing_name": fake.name(),
            "device_fingerprint": rng.choice(device_templates),
            "ip_hash": rng.choice(ip_pool),
            "asn_type": "residential",
            "ja3_hash": rng.choice(_BOT_JA3),
            "ja3_ua_mismatch": rng.random() < 0.7,
            "keystroke_entropy": rng.uniform(0.0, 0.3),
            "mouse_jitter_score": rng.uniform(0.0, 0.05),
            "paste_event": True,
            "time_on_page_s": rng.uniform(0.1, 2.0),
            "timestamp": ts,
            "is_fraud": 1,
            "attack_type": "slow_rate_carding",
        })
    return rows


def _burst_attack_rows(rng: random.Random, n: int) -> list[dict]:
    """
    High-velocity burst: 100 cards in ~8 seconds, datacenter ASN,
    single JA3, near-zero behavioral signals.
    """
    rows = []
    bin6 = rng.choice(_ATTACK_BINS)
    single_device = _hash("burst_bot_device_1")
    single_ip = _hash("datacenter_ip_burst")
    single_ja3 = _hash("python_requests")
    burst_start = time.time() - rng.uniform(60, 3600)

    for i in range(n):
        pan = _luhn_valid_pan(bin6)
        ts = burst_start + i * 0.08  # ~100 cards / 8 seconds
        rows.append({
            "bin6": bin6,
            "card_hash": _hash(pan + str(i)),
            "pan_hash": _hash(pan + "_pan"),
            "amount": round(rng.uniform(1, 50), 2),
            "billing_name": "Test User",
            "device_fingerprint": single_device,
            "ip_hash": single_ip,
            "asn_type": "datacenter",
            "ja3_hash": single_ja3,
            "ja3_ua_mismatch": True,
            "keystroke_entropy": 0.0,
            "mouse_jitter_score": 0.0,
            "paste_event": True,
            "time_on_page_s": 0.05,
            "timestamp": ts,
            "is_fraud": 1,
            "attack_type": "burst_attack",
        })
    return rows


def _adversarial_realistic_rows(rng: random.Random, np_rng: np.random.Generator, n: int) -> list[dict]:
    """
    Hard-negative stealth carding: Bots that spoof human behavioral signals
    (jittered typing entropy 1.1-1.8, realistic mouse paths, residential proxies,
    UA/JA3 matching) to evade naive biometric filters.
    """
    rows = []
    bin6 = rng.choice(_ATTACK_BINS)
    device_templates = [_hash(f"adv_bot_dev_{i}") for i in range(rng.randint(5, 10))]
    ip_pool = [_hash(f"adv_res_proxy_{i}") for i in range(rng.randint(30, 80))]

    for i in range(n):
        pan = _luhn_valid_pan(bin6)
        amount = round(float(np.clip(np_rng.lognormal(mean=6.0, sigma=0.8), 20, 1500)), 2)
        hour = _diurnal_hour()
        rows.append({
            "bin6": bin6,
            "card_hash": _hash(pan + f"_adv_{i}"),
            "pan_hash": _hash(pan + "_pan"),
            "amount": amount,
            "billing_name": fake.name(),
            "device_fingerprint": rng.choice(device_templates),
            "ip_hash": rng.choice(ip_pool),
            "asn_type": rng.choice(["residential", "mobile"]),
            "ja3_hash": rng.choice(_HUMAN_JA3),
            "ja3_ua_mismatch": False,  # mimics real browser TLS signature
            "keystroke_entropy": rng.uniform(1.1, 1.8),  # human-plausible synthetic jitter
            "mouse_jitter_score": rng.uniform(0.20, 0.48),  # interpolated mouse movements
            "paste_event": rng.random() < 0.35,
            "time_on_page_s": rng.uniform(8.0, 45.0),
            "timestamp": _timestamp_with_hour(hour),
            "is_fraud": 1,
            "attack_type": "adversarial_realistic",
        })
    return rows


def _cvv_cycling_rows(rng: random.Random, n: int) -> list[dict]:
    """
    CVV Cycling Attack: Repeated attempts with the same PAN and rotating CVVs
    from a single IP/device or small cluster.
    """
    rows = []
    bin6 = rng.choice(_ATTACK_BINS)
    target_pan = _luhn_valid_pan(bin6)
    pan_hash = _hash(target_pan + "_pan")
    device_fp = _hash("cvv_cycler_device")
    ip = _hash("cvv_cycler_ip")

    for i in range(n):
        rows.append({
            "bin6": bin6,
            "card_hash": _hash(target_pan + f"_try_{i}"),
            "pan_hash": pan_hash,  # exact same PAN
            "amount": 10.0,
            "billing_name": "Test Cycler",
            "device_fingerprint": device_fp,
            "ip_hash": ip,
            "asn_type": "datacenter",
            "ja3_hash": rng.choice(_BOT_JA3),
            "ja3_ua_mismatch": True,
            "keystroke_entropy": rng.uniform(0.0, 0.2),
            "mouse_jitter_score": rng.uniform(0.0, 0.05),
            "paste_event": True,
            "time_on_page_s": rng.uniform(0.5, 3.0),
            "timestamp": time.time() - (n - i) * 15,
            "is_fraud": 1,
            "attack_type": "cvv_cycling",
        })
    return rows


def _edge_case_genuine_rows(rng: random.Random, np_rng: np.random.Generator, n: int) -> list[dict]:
    """
    Genuine but anomalous: VPN users, travelers, OTP-retry customers.
    Single device, human behavioral signals, 1–3 attempts before success.
    """
    rows = []
    subtypes = ["vpn_user", "traveler", "otp_retry", "first_high_ticket"]
    for _ in range(n):
        subtype = rng.choice(subtypes)
        bin6 = rng.choice(_NORMAL_BINS).replace("X", str(rng.randint(0, 9)))
        pan = _luhn_valid_pan(bin6)
        device_fp = _hash(f"genuine_device_{rng.randint(1, 100)}")
        ip = _hash(f"vpn_or_foreign_ip_{rng.randint(1, 500)}")
        amount = (
            float(np.clip(np_rng.lognormal(7.5, 0.5), 500, 50000))
            if subtype == "first_high_ticket"
            else float(np.clip(np_rng.lognormal(6.5, 0.7), 50, 10000))
        )
        hour = _diurnal_hour()
        rows.append({
            "bin6": bin6,
            "card_hash": _hash(pan),
            "pan_hash": _hash(pan + "_pan"),
            "amount": round(amount, 2),
            "billing_name": fake.name(),
            "device_fingerprint": device_fp,
            "ip_hash": ip,
            "asn_type": "residential" if subtype != "vpn_user" else "datacenter",
            "ja3_hash": rng.choice(_HUMAN_JA3),
            "ja3_ua_mismatch": subtype == "vpn_user" and rng.random() < 0.3,
            "keystroke_entropy": rng.uniform(1.2, 3.8),
            "mouse_jitter_score": rng.uniform(0.3, 0.9),
            "paste_event": rng.random() < 0.4,
            "time_on_page_s": rng.uniform(20, 600),
            "timestamp": _timestamp_with_hour(hour),
            "is_fraud": 0,
            "attack_type": f"edge_genuine_{subtype}",
        })
    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def generate(n_total: int = 5000, seed: int = 42) -> pd.DataFrame:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    # Stratified target counts
    n_normal = int(n_total * 0.65)      # 3,250
    n_slow = int(n_total * 0.10)        # 500
    n_burst = int(n_total * 0.10)       # 500
    n_adv = int(n_total * 0.05)         # 250 (hard negative stealth bots)
    n_cvv = int(n_total * 0.05)         # 250 (unseen zero-day pattern)
    n_edge = n_total - n_normal - n_slow - n_burst - n_adv - n_cvv  # 250

    rows: list[dict] = []
    rows += [_normal_row(rng, np_rng) for _ in range(n_normal)]
    rows += _slow_rate_carding_rows(rng, n_slow)
    rows += _burst_attack_rows(rng, n_burst)
    rows += _adversarial_realistic_rows(rng, np_rng, n_adv)
    rows += _cvv_cycling_rows(rng, n_cvv)
    rows += _edge_case_genuine_rows(rng, np_rng, n_edge)

    df = pd.DataFrame(rows)
    # Shuffle so segments aren't contiguous
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    df.insert(0, "transaction_id", [str(uuid.uuid4()) for _ in range(len(df))])
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic transaction dataset.")
    parser.add_argument("--n", type=int, default=5000, help="Total rows (default: 5000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()

    print(f"Generating {args.n} synthetic transactions (seed={args.seed})...")
    df = generate(n_total=args.n, seed=args.seed)

    _OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(_OUTPUT_PATH, index=False)

    print(f"\nSaved to {_OUTPUT_PATH}")
    print(f"Total rows: {len(df)}")
    print("\nLabel distribution:")
    print(df["is_fraud"].value_counts().to_string())
    print("\nAttack type distribution:")
    print(df["attack_type"].value_counts().to_string())
