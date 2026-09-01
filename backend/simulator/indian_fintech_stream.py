import time
import random
import uuid

INDIAN_MERCHANTS = [
    {"id": "merch_zomato_01", "name": "Zomato Gold Delivery", "category": "Food & Beverage", "typical_min": 250, "typical_max": 2400},
    {"id": "merch_blinkit_02", "name": "Blinkit 10-Min Quick", "category": "Quick Commerce", "typical_min": 180, "typical_max": 1850},
    {"id": "merch_apple_bkc_03", "name": "Apple Store BKC Mumbai", "category": "Luxury Electronics", "typical_min": 49900, "typical_max": 149900},
    {"id": "merch_nykaa_04", "name": "Nykaa Luxe Cosmetics", "category": "Beauty & Fashion", "typical_min": 1499, "typical_max": 8900},
    {"id": "merch_mmt_05", "name": "MakeMyTrip Indigo Flights", "category": "Travel & Aviation", "typical_min": 3800, "typical_max": 32000},
    {"id": "merch_swiggy_06", "name": "Swiggy Instamart Express", "category": "Quick Commerce", "typical_min": 150, "typical_max": 1600},
    {"id": "merch_bms_07", "name": "BookMyShow Live Events", "category": "Entertainment", "typical_min": 450, "typical_max": 3500},
    {"id": "merch_croma_08", "name": "Tata Croma Retail", "category": "Consumer Tech", "typical_min": 4999, "typical_max": 65000},
]

INDIAN_BANKS_BINS = [
    {"bin": "453275", "bank": "HDFC Bank", "card_name": "HDFC Regalia Gold Visa", "type": "Credit"},
    {"bin": "607189", "bank": "State Bank of India", "card_name": "SBI SimplyClick RuPay", "type": "Credit/Debit"},
    {"bin": "411111", "bank": "ICICI Bank", "card_name": "ICICI Amazon Pay Visa", "type": "Credit"},
    {"bin": "512345", "bank": "Axis Bank", "card_name": "Axis Magnus Mastercard", "type": "Credit"},
    {"bin": "424242", "bank": "Kotak Mahindra Bank", "card_name": "Kotak 811 Virtual Debit", "type": "Debit"},
    {"bin": "552140", "bank": "Standard Chartered", "card_name": "StanChart Smart Card", "type": "Credit"},
    {"bin": "471638", "bank": "IndusInd Bank", "card_name": "IndusInd Legend Visa", "type": "Credit"},
]

INDIAN_CITIES_ISPS = [
    {"city": "Bengaluru, Karnataka", "isp": "ACT Fibernet (AS24309)", "ip_prefix": "103.21.244."},
    {"city": "Mumbai, Maharashtra", "isp": "Jio 5G Fiber (AS55836)", "ip_prefix": "49.36.128."},
    {"city": "Delhi NCR, Delhi", "isp": "Airtel Broadband (AS45609)", "ip_prefix": "182.73.19."},
    {"city": "Hyderabad, Telangana", "isp": "Tata Play Fiber (AS133982)", "ip_prefix": "115.112.45."},
    {"city": "Pune, Maharashtra", "isp": "Vodafone Idea 4G (AS55410)", "ip_prefix": "122.179.32."},
    {"city": "Chennai, Tamil Nadu", "isp": "Hathway Cable (AS17488)", "ip_prefix": "117.211.89."},
]

INDIAN_USERS = [
    {"name": "Aarav Sharma", "user_id": "usr_blr_aarav_91", "city": "Bengaluru", "vpa": "aarav.sharma@okhdfcbank"},
    {"name": "Pooja Patel", "user_id": "usr_mum_pooja_14", "city": "Mumbai", "vpa": "pooja.patel@oksbi"},
    {"name": "Vikram Malhotra", "user_id": "usr_del_vikram_22", "city": "Delhi", "vpa": "vmalhotra@paytm"},
    {"name": "Ananya Reddy", "user_id": "usr_hyd_ananya_08", "city": "Hyderabad", "vpa": "ananya.r@ybl"},
    {"name": "Rohan Iyer", "user_id": "usr_che_rohan_55", "city": "Chennai", "vpa": "rohan.iyer@axl"},
    {"name": "Aditi Deshmukh", "user_id": "usr_pun_aditi_33", "city": "Pune", "vpa": "aditi.desh@okicici"},
]

ATTACK_PROFILES = [
    {
        "type": "CARDING_SWARM",
        "description": "Distributed Telegram Bot testing stolen Russian dark-web card dump via rotating proxy pool.",
        "asn": "DigitalOcean Amsterdam (AS14061)",
        "ip": "185.220.101.54",
        "keystroke": 0.04,
        "mouse": 0.01,
        "bin": "522222",
        "tier": "high_confidence_bot",
        "risk": 0.945,
        "amount": 10.0,
        "is_canary": False,
        "is_agent": False
    },
    {
        "type": "CANARY_TRAP",
        "description": "CRITICAL: Scraper hit Luhn-valid Canary Honeytoken PAN (4000000000000002). Instant zero-FPR quarantine.",
        "asn": "Tor Exit Node (AS39351)",
        "ip": "45.154.255.88",
        "keystroke": 0.00,
        "mouse": 0.00,
        "bin": "400000",
        "tier": "high_confidence_bot",
        "risk": 1.000,
        "amount": 1.0,
        "is_canary": True,
        "is_agent": False
    },
    {
        "type": "GEO_VELOCITY_HOP",
        "description": "Impossible Geo-velocity: Transaction originated from London VPN 11 mins after Bandra Mumbai swipe.",
        "asn": "M247 London (AS9009)",
        "ip": "146.70.180.22",
        "keystroke": 2.12,
        "mouse": 0.58,
        "bin": "411111",
        "tier": "soft_risk",
        "risk": 0.560,
        "amount": 34990.0,
        "is_canary": False,
        "is_agent": False
    },
    {
        "type": "LOUVAIN_MULE_RING",
        "description": "Louvain Community Cluster #5: Multi-account device fingerprint cycling 14 cards across 3 mule VPAs.",
        "asn": "Linode Frankfurt (AS63949)",
        "ip": "194.26.29.13",
        "keystroke": 0.11,
        "mouse": 0.02,
        "bin": "438628",
        "tier": "high_confidence_bot",
        "risk": 0.925,
        "amount": 25.0,
        "is_canary": False,
        "is_agent": False
    },
    {
        "type": "AP2_AGENT_PURCHASE",
        "description": "Cryptographically verified Autonomous AI Agent via AP2 attestation header (RSA-4096 signature).",
        "asn": "Google Cloud Mumbai (AS396982)",
        "ip": "35.200.18.90",
        "keystroke": 0.00,
        "mouse": 0.00,
        "bin": "552140",
        "tier": "verified_agent",
        "risk": 0.065,
        "amount": 2499.0,
        "is_canary": False,
        "is_agent": True
    }
]

def generate_realistic_transaction(is_attack=False):
    t_now = time.time()
    tx_id = f"tx_rzp_{int(t_now)}_{uuid.uuid4().hex[:6]}"
    
    if is_attack or random.random() < 0.22:
        atk = random.choice(ATTACK_PROFILES)
        merch = random.choice(INDIAN_MERCHANTS)
        user = random.choice(INDIAN_USERS)
        return {
            "transaction_id": tx_id,
            "order_id": f"order_{uuid.uuid4().hex[:10]}",
            "timestamp": int(t_now),
            "amount": atk["amount"] if atk["amount"] <= 25.0 else random.randint(12000, 75000),
            "latency_ms": round(random.uniform(7.8, 14.2), 1),
            "merchant_id": merch["id"],
            "merchant_name": merch["name"],
            "merchant_category": merch["category"],
            "user_id": user["user_id"],
            "customer_name": user["name"],
            "user_city": user["city"],
            "ip_address": atk["ip"],
            "isp_network": atk["asn"],
            "bin6": atk["bin"],
            "card_hash": f"c_{uuid.uuid4().hex[:8]}",
            "card_bank": "Foreign / Stolen BIN" if atk["tier"] == "high_confidence_bot" else "HDFC Bank",
            "payment_method": "CARD",
            "tier": atk["tier"],
            "risk_score": atk["risk"],
            "is_canary": atk["is_canary"],
            "is_agent": atk["is_agent"],
            "explanation": atk["description"],
            "signals": {
                "asn_type": "datacenter" if "DigitalOcean" in atk["asn"] or "Linode" in atk["asn"] else "tor" if "Tor" in atk["asn"] else "residential",
                "ja3_mismatch": atk["tier"] == "high_confidence_bot",
                "keystroke_entropy": atk["keystroke"],
                "mouse_jitter_score": atk["mouse"],
                "cluster_risk_score": 0.88 if atk["tier"] == "high_confidence_bot" else 0.12,
            }
        }
    else:
        merch = random.choice(INDIAN_MERCHANTS)
        bank = random.choice(INDIAN_BANKS_BINS)
        loc = random.choice(INDIAN_CITIES_ISPS)
        user = random.choice(INDIAN_USERS)
        amt = random.randint(merch["typical_min"], merch["typical_max"])
        is_upi = random.random() < 0.45
        
        return {
            "transaction_id": tx_id,
            "order_id": f"order_{uuid.uuid4().hex[:10]}",
            "timestamp": int(t_now),
            "amount": amt,
            "latency_ms": round(random.uniform(5.2, 11.5), 1),
            "merchant_id": merch["id"],
            "merchant_name": merch["name"],
            "merchant_category": merch["category"],
            "user_id": user["user_id"],
            "customer_name": user["name"],
            "user_city": loc["city"],
            "ip_address": f"{loc['ip_prefix']}{random.randint(10, 240)}",
            "isp_network": loc["isp"],
            "bin6": bank["bin"],
            "card_hash": user["vpa"] if is_upi else f"c_{bank['bank'][:4].lower()}_{uuid.uuid4().hex[:6]}",
            "card_bank": bank["bank"],
            "card_name": "UPI Intent Auto-Pay" if is_upi else bank["card_name"],
            "payment_method": "UPI" if is_upi else "CARD",
            "tier": "safe",
            "risk_score": round(random.uniform(0.012, 0.095), 3),
            "is_canary": False,
            "is_agent": False,
            "explanation": f"Verified {bank['bank']} checkout on {merch['name']} in {loc['city']}. Natural kinetic typing curves.",
            "signals": {
                "asn_type": "residential",
                "ja3_mismatch": False,
                "keystroke_entropy": round(random.uniform(3.4, 4.8), 2),
                "mouse_jitter_score": round(random.uniform(0.72, 0.98), 2),
                "cluster_risk_score": 0.01,
            }
        }

def get_initial_seed_ledger(count=40):
    ledger = []
    now = time.time()
    for i in range(count):
        is_atk = (i % 4 == 0)
        tx = generate_realistic_transaction(is_attack=is_atk)
        tx["timestamp"] = int(now - (i * random.randint(15, 60)))
        ledger.append(tx)
    return ledger
