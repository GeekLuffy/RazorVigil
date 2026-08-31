"""
Unit test for RazorShield Sentinel durable webhook idempotency store.
Verifies that duplicate webhook event IDs are rejected by the SQLite UNIQUE constraint
even if the fast-path in-memory cache is bypassed or restarted.
"""

import uuid
import pytest
from backend.webhook_idempotency import record_webhook_event_durable, is_event_processed_durable


def test_durable_webhook_idempotency():
    test_event_id = f"evt_test_{uuid.uuid4().hex}"
    
    # First delivery: must succeed
    first_res = record_webhook_event_durable(
        event_id=test_event_id,
        event_type="payment.captured",
        raw_payload=b'{"id": "evt_test", "event": "payment.captured"}'
    )
    assert first_res is True, "First webhook delivery must be accepted"
    assert is_event_processed_durable(test_event_id) is True, "Event must be recorded in durable store"

    # Second delivery (replay / retry): must be rejected by UNIQUE constraint
    second_res = record_webhook_event_durable(
        event_id=test_event_id,
        event_type="payment.captured",
        raw_payload=b'{"id": "evt_test", "event": "payment.captured"}'
    )
    assert second_res is False, "Duplicate webhook event_id must trigger UNIQUE constraint rejection"
