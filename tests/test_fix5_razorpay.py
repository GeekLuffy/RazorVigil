"""
Test Fix 5 — Real Razorpay Test Mode Integration.

Verifies:
1. SAFE tx creates real/mock Razorpay order_id.
2. SOFT_RISK tx creates real/mock Razorpay payment_link.
3. BOT tx strictly NEVER calls Razorpay API (order_id is None).
4. Webhook listener verifies signature and processes payment.captured.
"""

import hmac
import hashlib
import json
import time
import httpx

API_BASE = "http://localhost:8000"
WEBHOOK_SECRET = "razorvigil_webhook_secret_2026"


def main():
    print("\n" + "=" * 65)
    print("TESTING FIX 5 — RAZORPAY TEST MODE INTEGRATION")
    print("=" * 65 + "\n")

    with httpx.Client(base_url=API_BASE, timeout=10.0) as client:
        # 1. Safe Transaction Test
        print("1. Safe Transaction Test:")
        safe_req = {
            "amount": 1200.0,
            "bin6": "424242",
            "card_hash": f"card_genuine_safe_{time.time()}",
            "device_fingerprint": f"dev_safe_{time.time()}",
            "ip_hash": f"ip_safe_{time.time()}",
            "asn_type": "residential",
            "ja3_ua_mismatch": False,
            "keystroke_entropy": 2.5,
            "mouse_jitter_score": 0.70,
            "time_on_page_s": 45.0,
        }
        res_safe = client.post("/checkout", json=safe_req).json()
        print(f"   Tier: {res_safe['tier']} | Action: {res_safe['action']} | Risk: {res_safe['risk_score']}")
        print(f"   Razorpay Order ID: {res_safe.get('razorpay_order_id')}")
        assert res_safe.get("razorpay_order_id") is not None, "Expected razorpay_order_id for safe tx!"
        print("   [PASSED] Safe transaction successfully created Razorpay Order.\n")

        # 2. Soft Risk Transaction Test
        print("2. Soft Risk Transaction (Recovery Link) Test:")
        soft_req = {
            "amount": 7499.0,
            "bin6": "411111",
            "card_hash": "card_vpn_user_02",
            "device_fingerprint": "dev_vpn_02",
            "ip_hash": "ip_vpn_02",
            "asn_type": "datacenter",  # VPN
            "ja3_ua_mismatch": False,
            "keystroke_entropy": 1.8,
            "mouse_jitter_score": 0.5,
            "time_on_page_s": 90.0,
        }
        res_soft = client.post("/checkout", json=soft_req).json()
        print(f"   Tier: {res_soft['tier']} | Action: {res_soft['action']}")
        print(f"   Razorpay Payment Link: {res_soft.get('razorpay_payment_link')}")
        print(f"   Internal Recovery URL: {res_soft.get('recovery_url')[:60]}...")
        assert res_soft.get("razorpay_payment_link") is not None, "Expected razorpay_payment_link for soft_risk tx!"
        print("   [PASSED] Soft Risk transaction created Razorpay Payment Link.\n")

        # 3. High Confidence Bot Assertion (Must NOT call Razorpay)
        print("3. High Confidence Bot Isolation Test:")
        bot_req = {
            "amount": 10.0,
            "bin6": "522222",
            "card_hash": "card_bot_attacker_99",
            "device_fingerprint": "dev_bot_cluster_99",
            "ip_hash": "ip_dc_bot_99",
            "asn_type": "datacenter",
            "ja3_ua_mismatch": True,
            "keystroke_entropy": 0.0,
            "mouse_jitter_score": 0.0,
            "time_on_page_s": 0.05,
        }
        res_bot = client.post("/checkout", json=bot_req).json()
        print(f"   Tier: {res_bot['tier']} | Action: {res_bot['action']}")
        print(f"   Razorpay Order ID: {res_bot.get('razorpay_order_id')}")
        print(f"   Razorpay Payment Link: {res_bot.get('razorpay_payment_link')}")
        assert res_bot.get("razorpay_order_id") is None, "Bot must NEVER get a Razorpay Order ID!"
        assert res_bot.get("razorpay_payment_link") is None, "Bot must NEVER get a Razorpay Payment Link!"
        print("   [PASSED] Bot transaction was blocked locally and NEVER contacted Razorpay API.\n")

        # 4. Razorpay Webhook Signature & Capture Test
        print("4. Real Razorpay Webhook Simulation (payment.captured):")
        webhook_event = {
            "entity": "event",
            "account_id": "acc_demo_rzp",
            "event": "payment.captured",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test_capture_98765",
                        "entity": "payment",
                        "amount": 749900,  # paise = Rs.7,499
                        "currency": "INR",
                        "status": "captured",
                        "order_id": "order_test_recovery_12345",
                        "method": "upi",
                    }
                }
            },
            "created_at": 1788008888
        }
        raw_body = json.dumps(webhook_event).encode("utf-8")
        signature = hmac.new(
            WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        wh_resp = client.post(
            "/webhook/razorpay",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": signature
            }
        ).json()
        print(f"   Webhook Response: {wh_resp}")
        assert wh_resp.get("status") == "processed", "Webhook processing failed!"
        assert wh_resp.get("amount_recovered") == 7499.0, "Amount mismatch in webhook!"
        print("   [PASSED] Razorpay Webhook verified with HMAC-SHA256 and recovered Rs.7,499 GMV.\n")

    print("=" * 65)
    print("ALL FIX 5 TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    main()
