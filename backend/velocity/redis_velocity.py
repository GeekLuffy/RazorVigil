"""
Redis sliding-window velocity counters with Rotating Proxy & Device-Fanout detection.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

import redis.asyncio as aioredis

if TYPE_CHECKING:
    from backend.main import CheckoutRequest

# Window durations in seconds
_WIN_BIN = 600      # 10 min
_WIN_IP = 900       # 15 min
_WIN_DEVICE = 1800  # 30 min
_WIN_PROXY = 300    # 5 min (Rotating proxy fanout window)
_WIN_CVV = 300      # 5 min


@dataclass
class VelocityFeatures:
    bin_card_count: int = 0
    bin_name_count: int = 0
    ip_distinct_pan_count: int = 0
    device_distinct_bin_count: int = 0
    cvv_cycle_attempts: int = 0
    device_distinct_ip_count: int = 0  # Rotating proxy indicator


class VelocityTracker:
    def __init__(self, host: str = "localhost", port: int = 6379):
        self._host = host
        self._port = port
        self.redis: aioredis.Redis

    async def connect(self):
        try:
            self.redis = aioredis.Redis(
                host=self._host,
                port=self._port,
                decode_responses=True,
            )
            await self.redis.ping()
            print(f"[VelocityTracker] Connected to Redis at {self._host}:{self._port}")
        except Exception as e:
            print(f"[VelocityTracker] Redis unavailable ({e}). Using in-memory fakeredis.")
            import fakeredis.aioredis as fakeredis_async
            self.redis = fakeredis_async.FakeRedis(decode_responses=True)
            await self.redis.ping()

    async def close(self):
        await self.redis.aclose()

    async def record_and_get_features(self, req: "CheckoutRequest") -> VelocityFeatures:
        """Combine write and read into a single Redis roundtrip pipeline."""
        now = time.time()
        pipe = self.redis.pipeline()

        # 1. Writes — track op count explicitly so reads can be offset correctly
        n_write_ops = 0

        bin_cards_key = f"vel:bin:{req.bin6}:cards"
        pipe.zadd(bin_cards_key, {req.card_hash: now})
        pipe.zremrangebyscore(bin_cards_key, 0, now - _WIN_BIN)
        pipe.expire(bin_cards_key, _WIN_BIN + 60)
        n_write_ops += 3

        if req.billing_name:
            bin_names_key = f"vel:bin:{req.bin6}:names"
            pipe.sadd(bin_names_key, req.billing_name)
            pipe.expire(bin_names_key, _WIN_BIN)
            n_write_ops += 2

        ip_cards_key = f"vel:ip:{req.ip_hash}:cards"
        pipe.zadd(ip_cards_key, {req.card_hash: now})
        pipe.zremrangebyscore(ip_cards_key, 0, now - _WIN_IP)
        pipe.expire(ip_cards_key, _WIN_IP + 60)
        n_write_ops += 3

        dev_bins_key = f"vel:device:{req.device_fingerprint}:bins"
        pipe.sadd(dev_bins_key, req.bin6)
        pipe.expire(dev_bins_key, _WIN_DEVICE)
        n_write_ops += 2

        # Rotating Proxy Tracker: Distinct IPs seen from this device in 5 min
        dev_ips_key = f"vel:device:{req.device_fingerprint}:ips"
        pipe.zadd(dev_ips_key, {req.ip_hash: now})
        pipe.zremrangebyscore(dev_ips_key, 0, now - _WIN_PROXY)
        pipe.expire(dev_ips_key, _WIN_PROXY + 60)
        n_write_ops += 3

        if req.pan_hash:
            cvv_key = f"vel:session:{req.session_id}:cvv_attempts:{req.pan_hash}"
            pipe.incr(cvv_key)
            pipe.expire(cvv_key, _WIN_CVV)
            n_write_ops += 2

        # 2. Reads — 6 ops always appended in fixed order after all writes
        pipe.zcount(bin_cards_key, now - _WIN_BIN, now)
        pipe.scard(f"vel:bin:{req.bin6}:names")
        pipe.zcount(ip_cards_key, now - _WIN_IP, now)
        pipe.scard(dev_bins_key)
        pipe.zcount(dev_ips_key, now - _WIN_PROXY, now)

        if req.pan_hash:
            pipe.get(f"vel:session:{req.session_id}:cvv_attempts:{req.pan_hash}")
        else:
            pipe.get("__nonexistent__")

        results = await pipe.execute()

        # Reads are always the last 6 results (deterministic regardless of write branch)
        r = results[n_write_ops:]
        return VelocityFeatures(
            bin_card_count=int(r[0] or 0),
            bin_name_count=int(r[1] or 0),
            ip_distinct_pan_count=int(r[2] or 0),
            device_distinct_bin_count=int(r[3] or 0),
            device_distinct_ip_count=int(r[4] or 0),
            cvv_cycle_attempts=int(r[5] or 0),
        )

    async def get_velocity_features(self, req: "CheckoutRequest") -> VelocityFeatures:
        """Read current velocity counters without writing."""
        now = time.time()
        pipe = self.redis.pipeline()

        pipe.zcount(f"vel:bin:{req.bin6}:cards", now - _WIN_BIN, now)
        pipe.scard(f"vel:bin:{req.bin6}:names")
        pipe.zcount(f"vel:ip:{req.ip_hash}:cards", now - _WIN_IP, now)
        pipe.scard(f"vel:device:{req.device_fingerprint}:bins")
        pipe.zcount(f"vel:device:{req.device_fingerprint}:ips", now - _WIN_PROXY, now)

        if req.pan_hash:
            pipe.get(f"vel:session:{req.session_id}:cvv_attempts:{req.pan_hash}")
        else:
            pipe.get("__nonexistent__")

        results = await pipe.execute()
        return VelocityFeatures(
            bin_card_count=int(results[0] or 0),
            bin_name_count=int(results[1] or 0),
            ip_distinct_pan_count=int(results[2] or 0),
            device_distinct_bin_count=int(results[3] or 0),
            device_distinct_ip_count=int(results[4] or 0),
            cvv_cycle_attempts=int(results[5] or 0),
        )
