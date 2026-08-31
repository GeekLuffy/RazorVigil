from fastapi.testclient import TestClient
from backend.main import app
from backend.antichecker.proxy_detector import proxy_detector


def test_datacenter_subnet_detection():
    # DigitalOcean node
    res = proxy_detector.inspect_request(
        client_ip="159.203.42.11",
        headers={},
        declared_asn="residential",
    )
    assert res.is_vpn_or_proxy is True
    assert res.detected_asn_type == "datacenter"
    assert res.confidence >= 0.90


def test_tor_exit_node_detection():
    # Known Tor exit subnet
    res = proxy_detector.inspect_request(
        client_ip="185.220.101.55",
        headers={},
        declared_asn="residential",
    )
    assert res.is_vpn_or_proxy is True
    assert res.detected_asn_type == "tor"
    assert res.confidence == 1.0


def test_proxy_chaining_via_headers():
    res = proxy_detector.inspect_request(
        client_ip="103.21.244.2",
        headers={
            "x-forwarded-for": "103.21.244.2, 104.28.1.1, 159.203.1.1",
            "via": "1.1 squid-proxy.internal",
        },
        declared_asn="residential",
    )
    assert res.is_vpn_or_proxy is True
    assert res.proxy_hops_count == 3
    assert any("Proxy chain detected" in r for r in res.reasons)


def test_webrtc_leakage_detection():
    res = proxy_detector.inspect_request(
        client_ip="104.28.14.9",
        headers={},
        declared_asn="residential",
        client_webrtc_ip="49.37.152.88",  # Indian residential ISP leaked via WebRTC
    )
    assert res.is_vpn_or_proxy is True
    assert res.webrtc_leak_detected is True


def test_checkout_vpn_soft_risk_routing():
    with TestClient(app) as client:
        payload = {
            "amount": 16999.0,
            "bin6": "411111",
            "card_hash": "card_test_vpn_human",
            "device_fingerprint": "dev_test_shopper_vpn",
            "ip_hash": "ip_nordvpn_mumbai_node",
            "asn_type": "residential",
            "raw_client_ip": "159.203.42.11",  # DigitalOcean / NordVPN node
            "keystroke_entropy": 2.65,
            "mouse_jitter_score": 0.68,
            "time_on_page_s": 25.0,
            "is_vpn_simulated": True,
        }
        res = client.post("/checkout", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "soft_risk"
        assert data["action"] == "step_up"
        assert data["recovery_url"] is not None

