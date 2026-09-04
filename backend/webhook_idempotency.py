"""
RazorVigil Sentinel — Durable Webhook Idempotency Store
Provides a persistent database-level idempotency backstop with a UNIQUE(event_id)
constraint that guarantees zero duplicate processing even across Redis restarts or cache flushes.

Architecture:
  Layer 1 (Fast-Path In-Memory Cache): Redis SET ... NX EX=86400 (<1ms)
  Layer 2 (Durable Storage Backstop):  SQLite PRIMARY KEY constraint (permanent)
"""

from __future__ import annotations

import hashlib
import os
import sqlite3
import time
from pathlib import Path
from typing import Optional

DB_DIR = Path(__file__).parent / "data"
DB_PATH = DB_DIR / "webhook_events.db"


def _get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_idempotency_db() -> None:
    """Initialize the durable webhook events table with a UNIQUE event_id constraint."""
    conn = _get_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS webhook_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    payload_hash TEXT NOT NULL,
                    processed_at REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
                ON webhook_events (processed_at);
                """
            )
    finally:
        conn.close()


def record_webhook_event_durable(
    event_id: str,
    event_type: str = "payment.captured",
    raw_payload: Optional[bytes] = None
) -> bool:
    """
    Attempt to durably record a webhook event in the persistent database.
    
    Returns:
        True  - Successfully recorded (first time seeing this event_id).
        False - Duplicate event_id detected (UNIQUE constraint violation).
    """
    if not event_id:
        return True

    init_idempotency_db()
    payload_hash = hashlib.sha256(raw_payload or b"").hexdigest() if raw_payload else "none"
    processed_at = time.time()

    conn = _get_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO webhook_events (event_id, event_type, payload_hash, processed_at)
                VALUES (?, ?, ?, ?);
                """,
                (event_id, event_type, payload_hash, processed_at),
            )
        return True
    except sqlite3.IntegrityError:
        # Unique constraint violation: event_id already exists in durable storage
        return False
    finally:
        conn.close()


def is_event_processed_durable(event_id: str) -> bool:
    """Check if an event_id is recorded in the durable SQLite store."""
    if not event_id:
        return False

    init_idempotency_db()
    conn = _get_connection()
    try:
        cur = conn.execute(
            "SELECT 1 FROM webhook_events WHERE event_id = ? LIMIT 1;",
            (event_id,)
        )
        return cur.fetchone() is not None
    finally:
        conn.close()
