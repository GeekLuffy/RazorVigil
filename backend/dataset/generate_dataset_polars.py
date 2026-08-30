"""
Realistic Synthetic Transaction Dataset Generator with Realistic E-Commerce Feature Overlap.

Models real-world noise, password managers, autofill, family/office shared IPs,
and stealth bot mimicry with genuine distribution overlap across all features.
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

import numpy as np
import polars as pl


def generate_dataset(n_rows: int = 50000, seed: int = 42) -> pl.DataFrame:
    rng = np.random.default_rng(seed)
    t0 = time.perf_counter()

    n_normal = int(n_rows * 0.60)
    n_edge_gen = int(n_rows * 0.05)
    n_slow = int(n_rows * 0.10)
    n_burst = int(n_rows * 0.10)
    n_adv = int(n_rows * 0.05)
    n_cvv = int(n_rows * 0.05)
    n_rem = n_rows - (n_normal + n_edge_gen + n_slow + n_burst + n_adv + n_cvv)
    n_normal += n_rem

    print(f"[Dataset] Generating {n_rows:,} rows with realistic noisy e-commerce distributions...")

    # -------------------------------------------------------------------------
    # 1. Normal Genuine Transactions (60%, Label = 0)
    # -------------------------------------------------------------------------
    amount_normal = rng.gamma(shape=2.5, scale=600.0, size=n_normal) + 50.0
    hour_normal = rng.integers(0, 24, size=n_normal)
    asn_normal = rng.choice([0, 1, 2], size=n_normal, p=[0.70, 0.25, 0.05])  # 5% office/datacenter VPN
    ja3_mismatch_normal = rng.choice([0.0, 1.0], size=n_normal, p=[0.94, 0.06])  # 6% browser extensions
    entropy_normal = rng.normal(loc=2.1, scale=0.45, size=n_normal).clip(0.8, 3.8)  # autofill/fast typists overlap
    jitter_normal = rng.normal(loc=0.55, scale=0.18, size=n_normal).clip(0.15, 0.95)
    paste_normal = rng.choice([0.0, 1.0], size=n_normal, p=[0.75, 0.25])  # 25% paste PAN from clipboard
    time_page_normal = rng.exponential(scale=28.0, size=n_normal) + 3.0  # 3s to 120s+
    bin_cards_normal = rng.integers(1, 10, size=n_normal)  # popular BIN sharing
    bin_names_normal = rng.integers(1, 8, size=n_normal)
    ip_pans_normal = rng.integers(1, 4, size=n_normal)  # office/family shared IP
    dev_bins_normal = rng.integers(1, 3, size=n_normal)
    dev_ips_normal = rng.integers(1, 3, size=n_normal)
    cvv_normal = rng.choice([0, 1, 2], size=n_normal, p=[0.92, 0.06, 0.02])  # human typo retries
    cluster_normal = rng.beta(a=1.5, b=4.5, size=n_normal).clip(0.02, 0.50)
    label_normal = np.zeros(n_normal, dtype=np.int32)
    segment_normal = ["normal"] * n_normal

    # -------------------------------------------------------------------------
    # 2. Edge-Case Anomalous Genuine (5%, Label = 0) - Hard Negatives
    # -------------------------------------------------------------------------
    amount_edge_gen = rng.gamma(shape=3.0, scale=900.0, size=n_edge_gen) + 150.0
    hour_edge_gen = rng.integers(0, 24, size=n_edge_gen)
    asn_edge_gen = rng.choice([0, 2, 3], size=n_edge_gen, p=[0.20, 0.75, 0.05])  # corporate VPN / iCloud Relay
    ja3_mismatch_edge_gen = rng.choice([0.0, 1.0], size=n_edge_gen, p=[0.70, 0.30])
    entropy_edge_gen = rng.normal(loc=1.8, scale=0.45, size=n_edge_gen).clip(0.7, 3.2)
    jitter_edge_gen = rng.normal(loc=0.48, scale=0.20, size=n_edge_gen).clip(0.12, 0.85)
    paste_edge_gen = rng.choice([0.0, 1.0], size=n_edge_gen, p=[0.55, 0.45])  # 45% password manager paste
    time_page_edge_gen = rng.uniform(4.0, 90.0, size=n_edge_gen)
    bin_cards_edge_gen = rng.integers(3, 14, size=n_edge_gen)
    bin_names_edge_gen = rng.integers(2, 10, size=n_edge_gen)
    ip_pans_edge_gen = rng.integers(2, 8, size=n_edge_gen)  # shared VPN egress
    dev_bins_edge_gen = rng.integers(1, 4, size=n_edge_gen)
    dev_ips_edge_gen = rng.integers(2, 8, size=n_edge_gen)
    cvv_edge_gen = rng.choice([0, 1, 2, 3], size=n_edge_gen, p=[0.75, 0.15, 0.07, 0.03])
    cluster_edge_gen = rng.beta(a=2.2, b=3.2, size=n_edge_gen).clip(0.15, 0.65)
    label_edge_gen = np.zeros(n_edge_gen, dtype=np.int32)
    segment_edge_gen = ["edge_genuine"] * n_edge_gen

    # -------------------------------------------------------------------------
    # 3. Distributed Slow-Carding (10%, Label = 1)
    # -------------------------------------------------------------------------
    amount_slow = rng.uniform(40.0, 650.0, size=n_slow)
    hour_slow = rng.integers(0, 24, size=n_slow)
    asn_slow = rng.choice([0, 1, 2], size=n_slow, p=[0.50, 0.20, 0.30])  # residential proxy botnets
    ja3_mismatch_slow = rng.choice([0.0, 1.0], size=n_slow, p=[0.45, 0.55])
    entropy_slow = rng.normal(loc=1.3, scale=0.35, size=n_slow).clip(0.5, 2.2)  # overlaps fast humans
    jitter_slow = rng.normal(loc=0.30, scale=0.12, size=n_slow).clip(0.08, 0.55)
    paste_slow = rng.choice([0.0, 1.0], size=n_slow, p=[0.35, 0.65])
    time_page_slow = rng.uniform(2.5, 25.0, size=n_slow)
    bin_cards_slow = rng.integers(5, 22, size=n_slow)
    bin_names_slow = rng.integers(4, 16, size=n_slow)
    ip_pans_slow = rng.integers(2, 10, size=n_slow)
    dev_bins_slow = rng.integers(2, 7, size=n_slow)
    dev_ips_slow = rng.integers(3, 14, size=n_slow)
    cvv_slow = rng.integers(0, 3, size=n_slow)
    cluster_slow = rng.beta(a=3.0, b=2.2, size=n_slow).clip(0.25, 0.80)
    label_slow = np.ones(n_slow, dtype=np.int32)
    segment_slow = ["slow_carding"] * n_slow

    # -------------------------------------------------------------------------
    # 4. Rapid Burst Carding (10%, Label = 1)
    # -------------------------------------------------------------------------
    amount_burst = rng.choice([1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0], size=n_burst)
    hour_burst = rng.integers(0, 24, size=n_burst)
    asn_burst = rng.choice([2, 3, 0], size=n_burst, p=[0.80, 0.15, 0.05])
    ja3_mismatch_burst = rng.choice([0.0, 1.0], size=n_burst, p=[0.10, 0.90])
    entropy_burst = rng.uniform(0.0, 0.35, size=n_burst)
    jitter_burst = rng.uniform(0.0, 0.15, size=n_burst)
    paste_burst = rng.choice([0.0, 1.0], size=n_burst, p=[0.05, 0.95])
    time_page_burst = rng.uniform(0.05, 2.5, size=n_burst)
    bin_cards_burst = rng.integers(15, 75, size=n_burst)
    bin_names_burst = rng.integers(10, 55, size=n_burst)
    ip_pans_burst = rng.integers(6, 35, size=n_burst)
    dev_bins_burst = rng.integers(4, 20, size=n_burst)
    dev_ips_burst = rng.integers(1, 5, size=n_burst)
    cvv_burst = rng.integers(0, 4, size=n_burst)
    cluster_burst = rng.uniform(0.60, 0.95, size=n_burst)
    label_burst = np.ones(n_burst, dtype=np.int32)
    segment_burst = ["burst"] * n_burst

    # -------------------------------------------------------------------------
    # 5. Adversarial-Realistic Stealth Bots (5%, Label = 1) - High Overlap
    # -------------------------------------------------------------------------
    amount_adv = rng.gamma(shape=2.5, scale=500.0, size=n_adv) + 80.0  # ₹150 - ₹1800
    hour_adv = rng.integers(6, 24, size=n_adv)
    asn_adv = rng.choice([0, 1, 2], size=n_adv, p=[0.60, 0.30, 0.10])  # 90% residential/mobile
    ja3_mismatch_adv = rng.choice([0.0, 1.0], size=n_adv, p=[0.85, 0.15])  # 85% matching Chrome JA3
    entropy_adv = rng.normal(loc=1.65, scale=0.30, size=n_adv).clip(0.9, 2.5)  # heavy overlap with human
    jitter_adv = rng.normal(loc=0.42, scale=0.10, size=n_adv).clip(0.18, 0.65)  # human-like curves
    paste_adv = rng.choice([0.0, 1.0], size=n_adv, p=[0.65, 0.35])
    time_page_adv = rng.normal(loc=20.0, scale=8.0, size=n_adv).clip(5.0, 55.0)
    bin_cards_adv = rng.integers(3, 16, size=n_adv)
    bin_names_adv = rng.integers(2, 12, size=n_adv)
    ip_pans_adv = rng.integers(2, 7, size=n_adv)
    dev_bins_adv = rng.integers(1, 5, size=n_adv)
    dev_ips_adv = rng.integers(2, 9, size=n_adv)
    cvv_adv = rng.choice([0, 1, 2], size=n_adv, p=[0.80, 0.15, 0.05])
    cluster_adv = rng.beta(a=2.2, b=2.8, size=n_adv).clip(0.18, 0.70)
    label_adv = np.ones(n_adv, dtype=np.int32)
    segment_adv = ["adversarial_realistic"] * n_adv

    # -------------------------------------------------------------------------
    # 6. CVV-Cycling Attacks (5%, Label = 1)
    # -------------------------------------------------------------------------
    amount_cvv = rng.uniform(400.0, 3500.0, size=n_cvv)
    hour_cvv = rng.integers(0, 24, size=n_cvv)
    asn_cvv = rng.choice([0, 2], size=n_cvv, p=[0.40, 0.60])
    ja3_mismatch_cvv = rng.choice([0.0, 1.0], size=n_cvv, p=[0.65, 0.35])
    entropy_cvv = rng.normal(loc=1.7, scale=0.35, size=n_cvv).clip(0.8, 2.8)
    jitter_cvv = rng.normal(loc=0.45, scale=0.15, size=n_cvv).clip(0.15, 0.75)
    paste_cvv = rng.choice([0.0, 1.0], size=n_cvv, p=[0.50, 0.50])
    time_page_cvv = rng.uniform(6.0, 45.0, size=n_cvv)
    bin_cards_cvv = rng.integers(1, 5, size=n_cvv)
    bin_names_cvv = rng.integers(1, 4, size=n_cvv)
    ip_pans_cvv = rng.integers(1, 4, size=n_cvv)
    dev_bins_cvv = rng.integers(1, 3, size=n_cvv)
    dev_ips_cvv = rng.integers(1, 4, size=n_cvv)
    cvv_attempts_cvv = rng.integers(3, 11, size=n_cvv)
    cluster_cvv = rng.beta(a=1.8, b=3.0, size=n_cvv).clip(0.12, 0.62)
    label_cvv = np.ones(n_cvv, dtype=np.int32)
    segment_cvv = ["cvv_cycling"] * n_cvv

    # Concatenate all arrays
    amounts = np.concatenate([amount_normal, amount_edge_gen, amount_slow, amount_burst, amount_adv, amount_cvv])
    hours = np.concatenate([hour_normal, hour_edge_gen, hour_slow, hour_burst, hour_adv, hour_cvv])
    asns = np.concatenate([asn_normal, asn_edge_gen, asn_slow, asn_burst, asn_adv, asn_cvv])
    ja3s = np.concatenate([ja3_mismatch_normal, ja3_mismatch_edge_gen, ja3_mismatch_slow, ja3_mismatch_burst, ja3_mismatch_adv, ja3_mismatch_cvv])
    entropies = np.concatenate([entropy_normal, entropy_edge_gen, entropy_slow, entropy_burst, entropy_adv, entropy_cvv])
    jitters = np.concatenate([jitter_normal, jitter_edge_gen, jitter_slow, jitter_burst, jitter_adv, jitter_cvv])
    pastes = np.concatenate([paste_normal, paste_edge_gen, paste_slow, paste_burst, paste_adv, paste_cvv])
    times_on_page = np.concatenate([time_page_normal, time_page_edge_gen, time_page_slow, time_page_burst, time_page_adv, time_page_cvv])
    bin_cards = np.concatenate([bin_cards_normal, bin_cards_edge_gen, bin_cards_slow, bin_cards_burst, bin_cards_adv, bin_cards_cvv])
    bin_names = np.concatenate([bin_names_normal, bin_names_edge_gen, bin_names_slow, bin_names_burst, bin_names_adv, bin_names_cvv])
    ip_pans = np.concatenate([ip_pans_normal, ip_pans_edge_gen, ip_pans_slow, ip_pans_burst, ip_pans_adv, ip_pans_cvv])
    dev_bins = np.concatenate([dev_bins_normal, dev_bins_edge_gen, dev_bins_slow, dev_bins_burst, dev_bins_adv, dev_bins_cvv])
    dev_ips = np.concatenate([dev_ips_normal, dev_ips_edge_gen, dev_ips_slow, dev_ips_burst, dev_ips_adv, dev_ips_cvv])
    cvv_attempts = np.concatenate([cvv_normal, cvv_edge_gen, cvv_slow, cvv_burst, cvv_adv, cvv_attempts_cvv])
    clusters = np.concatenate([cluster_normal, cluster_edge_gen, cluster_slow, cluster_burst, cluster_adv, cluster_cvv])
    labels = np.concatenate([label_normal, label_edge_gen, label_slow, label_burst, label_adv, label_cvv])
    segments = segment_normal + segment_edge_gen + segment_slow + segment_burst + segment_adv + segment_cvv

    # Derived cyclical time and z-score features
    hour_sin = np.sin(2 * np.pi * hours / 24.0).astype(np.float32)
    hour_cos = np.cos(2 * np.pi * hours / 24.0).astype(np.float32)
    mean_amt, std_amt = 1500.0, 2000.0
    amount_zscore = ((amounts - mean_amt) / std_amt).astype(np.float32)

    shuffle_idx = rng.permutation(n_rows)
    base_ts = 1700000000.0 + np.arange(n_rows, dtype=np.float64) * 5.0
    
    n_unique_cards = max(n_rows // 6, 1000)
    n_unique_ips = max(n_rows // 12, 500)
    n_unique_devs = max(n_rows // 15, 400)
    
    card_pool = [f"card_{i:06d}" for i in range(n_unique_cards)]
    ip_pool = [f"192.168.{(i//256)%256}.{i%256}" for i in range(n_unique_ips)]
    dev_pool = [f"dev_{i:05d}" for i in range(n_unique_devs)]
    
    card_hashes = rng.choice(card_pool, size=n_rows)
    ip_addrs = rng.choice(ip_pool, size=n_rows)
    device_ids = rng.choice(dev_pool, size=n_rows)

    df = pl.DataFrame({
        "timestamp": base_ts[shuffle_idx],
        "card_hash": card_hashes[shuffle_idx],
        "ip_address": ip_addrs[shuffle_idx],
        "device_id": device_ids[shuffle_idx],
        "amount": amounts[shuffle_idx].astype(np.float32),
        "amount_zscore": amount_zscore[shuffle_idx],
        "hour_sin": hour_sin[shuffle_idx],
        "hour_cos": hour_cos[shuffle_idx],
        "asn_type_encoded": asns[shuffle_idx].astype(np.float32),
        "ja3_ua_mismatch": ja3s[shuffle_idx].astype(np.float32),
        "keystroke_entropy": entropies[shuffle_idx].astype(np.float32),
        "mouse_jitter_score": jitters[shuffle_idx].astype(np.float32),
        "paste_event": pastes[shuffle_idx].astype(np.float32),
        "time_on_page_s": times_on_page[shuffle_idx].astype(np.float32),
        "bin_card_count": bin_cards[shuffle_idx].astype(np.float32),
        "bin_name_count": bin_names[shuffle_idx].astype(np.float32),
        "ip_distinct_pan_count": ip_pans[shuffle_idx].astype(np.float32),
        "device_distinct_bin_count": dev_bins[shuffle_idx].astype(np.float32),
        "device_distinct_ip_count": dev_ips[shuffle_idx].astype(np.float32),
        "cvv_cycle_attempts": cvv_attempts[shuffle_idx].astype(np.float32),
        "cluster_risk_score": clusters[shuffle_idx].astype(np.float32),
        "label": labels[shuffle_idx].astype(np.int32),
        "segment": np.array(segments)[shuffle_idx],
    })

    elapsed = time.perf_counter() - t0
    print(f"[Dataset] Completed in {elapsed:.3f}s. DataFrame Shape: {df.shape}")
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50000, help="Number of rows to generate")
    parser.add_argument("--out", type=str, default="", help="Output CSV path")
    args = parser.parse_args()

    data_dir = Path(__file__).parents[2] / "data"
    data_dir.mkdir(exist_ok=True, parents=True)

    df = generate_dataset(n_rows=args.n)

    if args.out:
        out_csv = Path(args.out)
        out_csv.parent.mkdir(exist_ok=True, parents=True)
        df.write_csv(out_csv)
        print(f"[Dataset] Saved custom CSV -> {out_csv} ({os.path.getsize(out_csv) / 1024 / 1024:.2f} MB)")
    else:
        parquet_path = data_dir / "synthetic_transactions.parquet"
        csv_path = data_dir / "synthetic_transactions.csv"

        df.write_parquet(parquet_path)
        df.write_csv(csv_path)

        print(f"[Dataset] Saved Parquet -> {parquet_path} ({os.path.getsize(parquet_path) / 1024 / 1024:.2f} MB)")
        print(f"[Dataset] Saved CSV     -> {csv_path} ({os.path.getsize(csv_path) / 1024 / 1024:.2f} MB)")
