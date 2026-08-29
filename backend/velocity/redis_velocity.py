"""
Redis sliding-window velocity counters.

Key patterns match §2 Layer 2 of the research doc verbatim:
  vel:bin:{bin6}:cards        sorted set, 10-min window
  vel:bin:{bin6}:names        set of distinct billing names, 10-min
  vel:ip:{ip_hash}:cards      sorted set, 15-min window
  vel:device:{device_fp}:bins set of distinct BINs, 30-min window
  vel:session:{session}:cvv_attempts:{pan_hash}  counter
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
_WIN_CVV = 300      # 5 min


@dataclass
class VelocityFeatures:
    bin_card_count: int = 0
    bin_name_count: int = 0
    ip_distinct_pan_count: int = 0
    device_distinct_bin_count: int = 0
    cvv_cycle_attempts: int = 0


class VelocityTracker:
    def __init__(self, host: str = "localhost", port: int = 6379):
        self._host = host
        self._port = port
        self.redis: aioredis.Redis  # set in connect()

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

    async def record_attempt(self, req: "CheckoutRequest") -> None:
        """Write all velocity signals for this transaction into Redis."""
        now = time.time()
        pipe = self.redis.pipeline()

        # vel:bin:{bin6}:cards — sorted set keyed by card_hash, scored by timestamp
        bin_cards_key = f"vel:bin:{req.bin6}:cards"
        pipe.zadd(bin_cards_key, {req.card_hash: now})
        pipe.zremrangebyscore(bin_cards_key, 0, now - _WIN_BIN)
        pipe.expire(bin_cards_key, _WIN_BIN + 60)

        # vel:bin:{bin6}:names — set of distinct billing names
        if req.billing_name:
            bin_names_key = f"vel:bin:{req.bin6}:names"
            pipe.sadd(bin_names_key, req.billing_name)
            pipe.expire(bin_names_key, _WIN_BIN)

        # vel:ip:{ip_hash}:cards — sorted set of distinct PANs from this IP
        ip_cards_key = f"vel:ip:{req.ip_hash}:cards"
        pipe.zadd(ip_cards_key, {req.card_hash: now})
        pipe.zremrangebyscore(ip_cards_key, 0, now - _WIN_IP)
        pipe.expire(ip_cards_key, _WIN_IP + 60)

        # vel:device:{device_fp}:bins — set of distinct BINs tried from this device
        dev_bins_key = f"vel:device:{req.device_fingerprint}:bins"
        pipe.sadd(dev_bins_key, req.bin6)
        pipe.expire(dev_bins_key, _WIN_DEVICE)

        # vel:session:{session}:cvv_attempts:{pan_hash} — CVV-cycling counter
        if req.pan_hash:
            cvv_key = f"vel:session:{req.session_id}:cvv_attempts:{req.pan_hash}"
            pipe.incr(cvv_key)
            pipe.expire(cvv_key, _WIN_CVV)

        await pipe.execute()

    async def record_and_get_features(self, req: "CheckoutRequest") -> VelocityFeatures:
        """Combine write and read into a single Redis roundtrip pipeline."""
        now = time.time()
        pipe = self.redis.pipeline()

        # Writes
        bin_cards_key = f"vel:bin:{req.bin6}:cards"
        pipe.zadd(bin_cards_key, {req.card_hash: now})
        pipe.zremrangebyscore(bin_cards_key, 0, now - _WIN_BIN)
        pipe.expire(bin_cards_key, _WIN_BIN + 60)

        if req.billing_name:
            bin_names_key = f"vel:bin:{req.bin6}:names"
            pipe.sadd(bin_names_key, req.billing_name)
            pipe.expire(bin_names_key, _WIN_BIN)

        ip_cards_key = f"vel:ip:{req.ip_hash}:cards"
        pipe.zadd(ip_cards_key, {req.card_hash: now})
        pipe.zremrangebyscore(ip_cards_key, 0, now - _WIN_IP)
        pipe.expire(ip_cards_key, _WIN_IP + 60)

        dev_bins_key = f"vel:device:{req.device_fingerprint}:bins"
        pipe.sadd(dev_bins_key, req.bin6)
        pipe.expire(dev_bins_key, _WIN_DEVICE)

        if req.pan_hash:
            cvv_key = f"vel:session:{req.session_id}:cvv_attempts:{req.pan_hash}"
            pipe.incr(cvv_key)
            pipe.expire(cvv_key, _WIN_CVV)

        # Reads (pipelined immediately after writes)
        pipe.zcount(bin_cards_key, now - _WIN_BIN, now)
        pipe.scard(f"vel:bin:{req.bin6}:names")
        pipe.zcount(ip_cards_key, now - _WIN_IP, now)
        pipe.scard(dev_bins_key)

        if req.pan_hash:
            pipe.get(f"vel:session:{req.session_id}:cvv_attempts:{req.pan_hash}")
        else:
            pipe.get("__nonexistent__")

        results = await pipe.execute()

        # Read results are the last 5 operations
        read_results = results[-5:]
        bin_card_count = int(read_results[0] or 0)
        bin_name_count = int(read_results[1] or 0)
        ip_distinct_pan = int(read_results[2] or 0)
        device_distinct_bin = int(read_results[3] or 0)
        cvv_count = int(read_results[4] or 0)

        return VelocityFeatures(
            bin_card_count=bin_card_count,
            bin_name_count=bin_name_count,
            ip_distinct_pan_count=ip_distinct_pan,
            device_distinct_bin_count=device_distinct_bin,
            cvv_cycle_attempts=cvv_count,
        )

    async def get_velocity_features(self, req: "CheckoutRequest") -> VelocityFeatures:
        """Read current velocity counters without writing."""
        now = time.time()
        pipe = self.redis.pipeline()

        pipe.zcount(f"vel:bin:{req.bin6}:cards", now - _WIN_BIN, now)
        pipe.scard(f"vel:bin:{req.bin6}:names")
        pipe.zcount(f"vel:ip:{req.ip_hash}:cards", now - _WIN_IP, now)
        pipe.scard(f"vel:device:{req.device_fingerprint}:bins")

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
            cvv_cycle_attempts=int(results[4] or 0),
        )
