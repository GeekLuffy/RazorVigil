import React, { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Lock, ShieldCheck, QrCode, ArrowRight, RefreshCw, Smartphone, Laptop, CheckCircle2, AlertTriangle, X, CreditCard } from 'lucide-react'

import { API_BASE } from '../config'

let rzpScriptPromise = null
function loadRazorpayScript() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve(true)
  if (rzpScriptPromise) return rzpScriptPromise
  rzpScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
  return rzpScriptPromise
}

export default function MerchantStore({ onClose, onPaymentComplete, onTransactionEvaluated }) {
  const PRODUCTS = [
    {
      id: 'aj1',
      name: 'Nike Air Jordan 1 Retro High OG "Chicago"',
      price: 16999,
      icon: '👟',
      category: 'Luxury Footwear',
      sku: 'AJ1-CHI-2026',
      badge: '🔥 Bestseller',
      bgGrad: 'from-rose-500/20 to-orange-500/10'
    },
    {
      id: 'macbook',
      name: 'Apple MacBook Pro 16" M3 Max (Space Black)',
      price: 199900,
      icon: '💻',
      category: 'Flagship Electronics',
      sku: 'MBP16-M3X-2026',
      badge: '⚡ High Value Target',
      bgGrad: 'from-indigo-500/20 to-purple-500/10'
    },
    {
      id: 'sony',
      name: 'Sony WH-1000XM5 Noise Canceling Headphones',
      price: 29990,
      icon: '🎧',
      category: 'Premium Audio',
      sku: 'SONY-WH5-2026',
      badge: '✨ Fast Seller',
      bgGrad: 'from-cyan-500/20 to-blue-500/10'
    }
  ]

  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0])

  // Form State
  const [cardName, setCardName] = useState('Rahul Sharma')
  const [cardNumber, setCardNumber] = useState('4012 0000 0000 0002')
  const [expiry, setExpiry] = useState('12/28')
  const [cvv, setCvv] = useState('123')
  const [vpnMode, setVpnMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRzpNativeLoading, setIsRzpNativeLoading] = useState(false)

  // Real-time Biometrics Collection
  const [keystrokeDeltas, setKeystrokeDeltas] = useState([])
  const [mousePoints, setMousePoints] = useState([])
  const [liveEntropy, setLiveEntropy] = useState(2.65)
  const [liveJitter, setLiveJitter] = useState(0.68)
  const lastKeyTime = useRef(null)
  const pageLoadTime = useRef(Date.now())

  // Modal States
  const [checkoutResult, setCheckoutResult] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)
  const [threeDsModal, setThreeDsModal] = useState(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(null)

  // 3DS2 Interactive Bank Challenge & Kinetic OTP State
  const [otpInput, setOtpInput] = useState('')
  const [otpDeltas, setOtpDeltas] = useState([])
  const otpLastKeyTime = useRef(null)
  const [otpLiveEntropy, setOtpLiveEntropy] = useState(0.0)
  const [otpTimer, setOtpTimer] = useState(45)
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const [otpResult, setOtpResult] = useState(null)
  const [showSmsToast, setShowSmsToast] = useState(true)
  const [activePreset, setActivePreset] = useState('human')

  // Real-Time WebRTC Local IP Leak Probe
  const [webrtcLeakIp, setWebrtcLeakIp] = useState(null)
  useEffect(() => {
    try {
      const pc = new (window.RTCPeerConnection || window.webkitRTCPeerConnection)({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {})
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return
        const match = ice.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/)
        if (match) {
          setWebrtcLeakIp(match[1])
        }
      }
    } catch {
      // Ignored if browser blocks WebRTC
    }
  }, [])

  const calculateEntropy = (deltas) => {
    if (deltas.length < 3) return 2.65
    const bins = {}
    deltas.forEach(d => {
      const b = Math.floor(d / 25)
      bins[b] = (bins[b] || 0) + 1
    })
    const total = deltas.length
    let ent = 0.0
    Object.values(bins).forEach(count => {
      const p = count / total
      ent -= p * Math.log2(p)
    })
    return Math.min(3.5, Math.max(1.8, Number(ent.toFixed(2))))
  }

  const calculateJitter = (points) => {
    if (points.length < 5) return 0.68
    let totalAngleChange = 0
    for (let i = 2; i < points.length; i++) {
      const dx1 = points[i-1].x - points[i-2].x
      const dy1 = points[i-1].y - points[i-2].y
      const dx2 = points[i].x - points[i-1].x
      const dy2 = points[i].y - points[i-1].y
      const angle1 = Math.atan2(dy1, dx1)
      const angle2 = Math.atan2(dy2, dx2)
      totalAngleChange += Math.abs(angle2 - angle1)
    }
    const score = Math.min(0.95, Math.max(0.52, (totalAngleChange / (points.length * Math.PI)) * 2.2))
    return Number(score.toFixed(2))
  }

  const handleKeyDown = () => {
    const now = performance.now()
    if (lastKeyTime.current !== null) {
      const delta = now - lastKeyTime.current
      setKeystrokeDeltas(prev => {
        const next = [...prev, delta].slice(-25)
        setLiveEntropy(calculateEntropy(next))
        return next
      })
    }
    lastKeyTime.current = now
  }

  const handleMouseMove = (e) => {
    if (activePreset === 'bot' || activePreset === 'telegram' || activePreset === 'canary') return
    setMousePoints(prev => {
      const next = [...prev, { x: e.clientX, y: e.clientY }].slice(-30)
      setLiveJitter(calculateJitter(next))
      return next
    })
  }

  const [showConfig, setShowConfig] = useState(false)
  const [customKeyId, setCustomKeyId] = useState('')
  const [customKeySecret, setCustomKeySecret] = useState('')
  const [isConfigSaving, setIsConfigSaving] = useState(false)
  const [configSavedMsg, setConfigSavedMsg] = useState('')

  // 3DS2 OTP Resend Timer
  useEffect(() => {
    if (!threeDsModal || otpTimer <= 0) return
    const interval = setInterval(() => {
      setOtpTimer(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [threeDsModal, otpTimer])

  const handleOtpKeyDown = (e) => {
    if (e.key === 'Backspace') {
      setOtpDeltas([])
      otpLastKeyTime.current = null
      setOtpLiveEntropy(0.0)
      return
    }
    const now = performance.now()
    if (otpLastKeyTime.current !== null) {
      const dt = now - otpLastKeyTime.current
      setOtpDeltas(prev => {
        const next = [...prev, Math.round(dt * 10) / 10]
        setOtpLiveEntropy(calculateEntropy(next))
        return next
      })
    }
    otpLastKeyTime.current = now
  }


  const submitThreeDsOtp = async (isBotSim = false) => {
    if (!threeDsModal) return
    setOtpSubmitting(true)
    setOtpResult(null)

    const intervalsToUse = isBotSim
      ? [0.0, 0.0, 0.0, 0.0, 0.0]
      : (otpDeltas.length >= 3 ? otpDeltas : [195.2, 220.4, 180.1, 210.8, 190.3])

    try {
      // 1. Kinetic OTP Verification via Backend
      const otpRes = await fetch(`${API_BASE}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: threeDsModal.transaction_id || `tx_3ds_${Date.now()}`,
          order_id: threeDsModal.order_id,
          otp_code: isBotSim ? '482910' : (otpInput || '482910'),
          keystroke_intervals_ms: intervalsToUse,
          paste_event: isBotSim,
          time_to_first_keystroke_ms: isBotSim ? 5.0 : 380.0,
          total_entry_duration_ms: isBotSim ? 10.0 : intervalsToUse.reduce((a, b) => a + b, 0) + 380.0,
          client_reported_origin: 'checkout.razorvigil.io',
          gateway_origin: 'checkout.razorvigil.io',
        })
      }).then(r => r.json())

      if (!otpRes.is_valid || otpRes.is_bot_relay) {
        setOtpResult({
          status: 'failed',
          is_bot: true,
          reason: otpRes.reason || 'Zero kinetic keystroke entropy (H=0.00). Automated Telegram/CDP bot relay intercepted.',
          risk_score: otpRes.risk_score || 0.98,
        })
        return
      }

      // 2. Cryptographic 3DS2 CAVV/ECI Verification
      const authRes = await fetch(`${API_BASE}/3ds/verify-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: threeDsModal.transaction_id || `tx_3ds_${Date.now()}`,
          order_id: threeDsModal.order_id,
          card_number: cardNumber.replace(/\s+/g, '') || '4111111111111111',
          amount: selectedProduct.price || 0.0,
          three_ds_version: '2.2.0',
          cavv: 'AAABBIIFmQAAAAAAAQUWJgAAAAA=',
          eci: '05',
          device_channel: '02',
          client_challenge_origin: 'checkout.razorvigil.io',
          acs_challenge_origin: 'checkout.razorvigil.io',
          session_resumed: true,
          tls_handshake_latency_ms: 22.4,
          synthetic_canvas_noise: false,
        })
      }).then(r => r.json())

      // 3. Finalize Payment Capture on Backend
      await verifyPaymentOnBackend(
        threeDsModal.order_id,
        `pay_${Date.now().toString(36)}`,
        'rzp_sig_verified_3ds2_sha256'
      )

      setOtpResult({
        status: 'success',
        message: '3DS2 Step-Up Challenge Passed & Payment Captured!',
        cavv_valid: authRes.cryptographic_validity,
        latency_ms: 8.84,
      })

      setTimeout(() => {
        setThreeDsModal(null)
      }, 2400)

    } catch (e) {
      setOtpResult({ status: 'failed', reason: e.message })
    } finally {
      setOtpSubmitting(false)
    }
  }


  const handleSaveRazorpayConfig = async (e) => {
    e.preventDefault()
    setIsConfigSaving(true)
    setConfigSavedMsg('')
    try {
      const res = await fetch(`${API_BASE}/config/razorpay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: customKeyId,
          key_secret: customKeySecret
        })
      })
      const data = await res.json()
      if (data.status === 'updated') {
        setConfigSavedMsg(data.is_live_configured ? '✓ Real Razorpay SDK Active' : '✓ Simulator Mode Active')
        setTimeout(() => setConfigSavedMsg(''), 3000)
      }
    } catch {
      setConfigSavedMsg('Error updating keys')
    } finally {
      setIsConfigSaving(false)
    }
  }

  const autofillPreset = (type) => {
    setActivePreset(type)
    setPaymentVerified(null)
    setCheckoutResult(null)
    setRecoveryModal(null)
    setThreeDsModal(null)
    setRecoverySuccess(false)

    if (type === 'human') {
      setCardName('Rahul Sharma')
      setCardNumber('4012 0000 0000 0002')
      setExpiry('12/28')
      setCvv('123')
      setVpnMode(false)
      setLiveEntropy(2.65)
      setLiveJitter(0.68)
    } else if (type === 'bot') {
      setCardName('Test Bot 001')
      setCardNumber('5222 2200 1234 5678')
      setExpiry('08/29')
      setCvv('999')
      setVpnMode(true)
      setKeystrokeDeltas([])
      setMousePoints([])
      setLiveEntropy(0.0)
      setLiveJitter(0.0)
    } else if (type === 'telegram') {
      setCardName('TG Scraper')
      setCardNumber('4117 7300 0000 1111')
      setExpiry('11/27')
      setCvv('123')
      setVpnMode(true)
      setKeystrokeDeltas([])
      setMousePoints([])
      setLiveEntropy(0.0)
      setLiveJitter(0.0)
    } else if (type === 'canary') {
      setCardName('Canary Honeytoken')
      setCardNumber('5999 9900 0000 0007')
      setExpiry('05/30')
      setCvv('777')
      setVpnMode(true)
      setKeystrokeDeltas([])
      setMousePoints([])
      setLiveEntropy(0.0)
      setLiveJitter(0.0)
    } else if (type === 'vpn') {
      setCardName('Aditya Verma')
      setCardNumber('4111 1111 1111 1111')
      setExpiry('10/29')
      setCvv('456')
      setVpnMode(true)
      setLiveEntropy(2.45)
      setLiveJitter(0.62)
    }
  }

  const autofillBotData = () => autofillPreset('bot')
  const autofillHumanData = () => autofillPreset('human')

  const handleCheckout = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setCheckoutResult(null)
    setPaymentVerified(null)

    const rawPan = cardNumber.replace(/\s+/g, '')
    const timeOnPage = Math.max(12.0, (Date.now() - pageLoadTime.current) / 1000)
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata'

    let payload
    if (activePreset === 'human') {
      payload = {
        amount: selectedProduct.price,
        bin6: rawPan.slice(0, 6) || '411111',
        card_hash: `card_genuine_${rawPan.slice(-4) || '1111'}`,
        billing_name: cardName,
        device_fingerprint: `dev_human_${Date.now() % 100000}`,
        ip_hash: `ip_airtel_res_${Date.now() % 100000}`,
        asn_type: vpnMode ? 'datacenter' : 'residential',
        ja3_ua_mismatch: false,
        keystroke_entropy: Math.max(liveEntropy, 2.65),
        mouse_jitter_score: Math.max(liveJitter, 0.68),
        paste_event: false,
        time_on_page_s: timeOnPage,
        is_accessibility_mode: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        client_webrtc_ip: webrtcLeakIp || undefined,
        client_timezone: tz,
        is_vpn_simulated: vpnMode,
      }
    } else if (activePreset === 'vpn') {
      payload = {
        amount: selectedProduct.price,
        bin6: rawPan.slice(0, 6) || '411111',
        card_hash: `card_vpn_${rawPan.slice(-4) || '1111'}`,
        billing_name: cardName,
        device_fingerprint: `dev_vpn_shopper_${Date.now() % 100000}`,
        ip_hash: `ip_vpn_nord_${Date.now() % 100000}`,
        asn_type: 'datacenter',
        ja3_ua_mismatch: false,
        keystroke_entropy: 2.45,
        mouse_jitter_score: 0.62,
        paste_event: false,
        time_on_page_s: timeOnPage,
        client_webrtc_ip: webrtcLeakIp || undefined,
        client_timezone: tz,
        is_vpn_simulated: true,
      }
    } else if (activePreset === 'canary') {
      const demoHashRes = await fetch(`${API_BASE}/canary/demo-hash?index=7`).then(r => r.json()).catch(() => ({ card_hash: 'canary_7_hash' }))
      payload = {
        amount: selectedProduct.price,
        bin6: '599999',
        card_hash: demoHashRes.card_hash,
        billing_name: 'Canary Honeytoken',
        device_fingerprint: 'dev_canary_prober_01',
        ip_hash: 'ip_canary_prober_01',
        asn_type: 'datacenter',
        ja3_ua_mismatch: true,
        keystroke_entropy: 0.0,
        mouse_jitter_score: 0.0,
        paste_event: true,
        time_on_page_s: 0.5,
        client_webrtc_ip: webrtcLeakIp || undefined,
        client_timezone: tz,
        is_vpn_simulated: true,
      }
    } else if (activePreset === 'telegram') {
      payload = {
        amount: 1.0,
        bin6: '411773',
        card_hash: `card_tg_${Date.now()}`,
        billing_name: 'TG Scraper',
        device_fingerprint: 'bot_dev_tg_01',
        ip_hash: 'ip_tg_datacenter_01',
        asn_type: 'datacenter',
        ja3_ua_mismatch: true,
        keystroke_entropy: 0.0,
        mouse_jitter_score: 0.0,
        paste_event: true,
        time_on_page_s: 0.3,
        client_webrtc_ip: webrtcLeakIp || undefined,
        client_timezone: tz,
        is_vpn_simulated: true,
      }
    } else {
      payload = {
        amount: selectedProduct.price,
        bin6: rawPan.slice(0, 6) || '522222',
        card_hash: `card_bot_${Date.now()}`,
        billing_name: cardName,
        device_fingerprint: 'bot_dev_playwright_01',
        ip_hash: 'ip_botnet_cluster_01',
        asn_type: 'datacenter',
        ja3_ua_mismatch: true,
        keystroke_entropy: 0.0,
        mouse_jitter_score: 0.0,
        paste_event: true,
        time_on_page_s: 0.8,
        client_webrtc_ip: webrtcLeakIp || undefined,
        client_timezone: tz,
        is_vpn_simulated: true,
      }
    }


    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setCheckoutResult(data)

      if (onTransactionEvaluated && data.transaction_id) {
        onTransactionEvaluated({
          transaction_id: data.transaction_id,
          amount: selectedProduct.price,
          tier: data.tier || 'safe',
          risk_score: data.risk_score || 0.05,
          latency_ms: data.latency_ms || 8.2,
          explanation: data.explanation || 'Merchant Store checkout',
          timestamp: Date.now()
        })
      }

      if (data.tier === 'safe' && data.razorpay_order_id) {
        const cfg = await fetch(`${API_BASE}/config`).then(r => r.json()).catch(() => ({ razorpay_key_id: 'rzp_test_demo12345678' }))
        const keyId = cfg.razorpay_key_id || 'rzp_test_demo12345678'

        // If user provided a live key, launch Razorpay Checkout.js
        if (!keyId.startsWith('rzp_test_demo')) {
          await loadRazorpayScript()
          if (window.Razorpay) {
            const rzp = new window.Razorpay({
              key: keyId,
              amount: selectedProduct.price * 100,
              currency: 'INR',
              name: 'SneakerVault India',
              description: selectedProduct.name,
              order_id: data.razorpay_order_id,
              handler: async function (resp) {
                await verifyPaymentOnBackend(resp.razorpay_order_id || data.razorpay_order_id, resp.razorpay_payment_id, resp.razorpay_signature)
              },
              prefill: { name: cardName, email: 'customer@razorvigil.io', contact: '9876543210' },
              theme: { color: '#4f46e5' },
            })
            rzp.open()
          } else {
            // Launch 3DS2 Bank Challenge ACS Modal
            setThreeDsModal({
              order_id: data.razorpay_order_id,
              amount: selectedProduct.price,
              key_id: keyId,
              transaction_id: data.transaction_id,
              cardLast4: rawPan.slice(-4) || '1111',
              cardName: cardName || 'Rahul Sharma',
              bankName: 'HDFC Bank',
              cardBrand: 'VISA',
            })
            setOtpInput('')
            setOtpDeltas([])
            otpLastKeyTime.current = null
            setOtpLiveEntropy(0.0)
            setOtpTimer(45)
            setOtpResult(null)
            setShowSmsToast(true)
          }
        } else {
          // Open 3DS2 Bank Challenge ACS Modal
          setThreeDsModal({
            order_id: data.razorpay_order_id,
            amount: selectedProduct.price,
            key_id: keyId,
            transaction_id: data.transaction_id,
            cardLast4: rawPan.slice(-4) || '1111',
            cardName: cardName || 'Rahul Sharma',
            bankName: 'HDFC Bank',
            cardBrand: 'VISA',
          })
          setOtpInput('')
          setOtpDeltas([])
          otpLastKeyTime.current = null
          setOtpLiveEntropy(0.0)
          setOtpTimer(45)
          setOtpResult(null)
          setShowSmsToast(true)
        }
      }


      if (data.tier === 'soft_risk' && data.recovery_url) {
        setRecoveryModal(data)
      }
    } catch (err) {
      alert('Checkout error: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNativeRazorpayCheckout = async () => {
    setIsRzpNativeLoading(true)
    try {
      const cfg = await fetch(`${API_BASE}/config`).then(r => r.json()).catch(() => ({ razorpay_key_id: 'rzp_test_demo12345678' }))
      const keyId = cfg.razorpay_key_id || 'rzp_test_demo12345678'

      const rawPan = cardNumber.replace(/\s+/g, '')
      const timeOnPage = Math.max(12.0, (Date.now() - pageLoadTime.current) / 1000)
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata'

      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedProduct.price,
          bin6: rawPan.slice(0, 6) || '411111',
          card_hash: `card_rzp_native_${rawPan.slice(-4) || '1111'}`,
          billing_name: cardName,
          device_fingerprint: `dev_human_${Date.now() % 100000}`,
          ip_hash: `ip_airtel_res_${Date.now() % 100000}`,
          asn_type: vpnMode ? 'datacenter' : 'residential',
          ja3_ua_mismatch: false,
          keystroke_entropy: Math.max(liveEntropy, 2.65),
          mouse_jitter_score: Math.max(liveJitter, 0.68),
          paste_event: false,
          time_on_page_s: timeOnPage,
          client_webrtc_ip: webrtcLeakIp || undefined,
          client_timezone: tz,
          is_vpn_simulated: vpnMode,
        })
      })
      const data = await res.json()
      setCheckoutResult(data)

      if (onTransactionEvaluated && data.transaction_id) {
        onTransactionEvaluated({
          transaction_id: data.transaction_id,
          amount: selectedProduct.price,
          tier: data.tier || 'safe',
          risk_score: data.risk_score || 0.05,
          latency_ms: data.latency_ms || 8.2,
          explanation: data.explanation || 'Native Razorpay checkout evaluation',
          timestamp: Date.now()
        })
      }

      await loadRazorpayScript()
      if (window.Razorpay && !keyId.startsWith('rzp_test_demo')) {
        const rzp = new window.Razorpay({
          key: keyId,
          amount: selectedProduct.price * 100,
          currency: 'INR',
          name: 'RazorVigil Sovereign Store',
          description: selectedProduct.name,
          order_id: data.razorpay_order_id,
          handler: async function (resp) {
            await verifyPaymentOnBackend(resp.razorpay_order_id || data.razorpay_order_id, resp.razorpay_payment_id, resp.razorpay_signature)
          },
          prefill: {
            name: cardName,
            email: 'customer@razorvigil.io',
            contact: '9876543210',
          },
          theme: { color: '#4f46e5' },
        })
        rzp.open()
      } else {
        // Fallback to interactive 3DS2 Challenge Modal
        setThreeDsModal({
          order_id: data.razorpay_order_id || `order_demo_${Date.now()}`,
          amount: selectedProduct.price,
          key_id: keyId,
          transaction_id: data.transaction_id || `tx_${Date.now()}`,
          cardLast4: rawPan.slice(-4) || '4242',
          cardName: cardName || 'Rahul Sharma',
          bankName: 'HDFC Bank',
          cardBrand: 'VISA',
        })
        setOtpInput('')
        setOtpDeltas([])
        otpLastKeyTime.current = null
        setOtpLiveEntropy(0.0)
        setOtpTimer(45)
        setOtpResult(null)
        setShowSmsToast(true)
      }
    } catch (e) {
      alert('Razorpay Checkout error: ' + e.message)
    } finally {
      setIsRzpNativeLoading(false)
    }
  }

  const verifyPaymentOnBackend = async (orderId, paymentId, signature) => {
    try {
      const res = await fetch(`${API_BASE}/checkout/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature || 'local_verified_sig',
          amount: selectedProduct.price,
        })
      })
      const verifyData = await res.json()
      if (verifyData.status === 'success') {
        setPaymentVerified({ orderId, paymentId })
        if (onPaymentComplete) onPaymentComplete(selectedProduct.price)
      }
    } catch (e) {
      console.log('Verification error:', e)
    }
  }

  const handleSimulateUpiApproval = async () => {
    if (!recoveryModal) return
    setIsRecovering(true)

    const url = new URL(recoveryModal.recovery_url)
    const token = url.searchParams.get('token')
    const orderId = url.searchParams.get('order')

    try {
      const res = await fetch(`${API_BASE}/recovery/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          order_id: orderId,
          amount: selectedProduct.price
        })
      })
      const data = await res.json()
      if (data.status === 'success') {
        setRecoverySuccess(true)
        if (onPaymentComplete) onPaymentComplete(selectedProduct.price)
      }
    } catch (err) {
      alert('Recovery confirmation failed: ' + err.message)
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div onMouseMove={handleMouseMove} className="fixed inset-0 z-50 bg-[#060811]/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900/95 border border-white/[0.1] rounded-3xl w-full max-w-5xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col md:flex-row relative animate-scale-up">

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition shadow-md border border-white/[0.08]"
            title="Close Storefront"
          >
            <X size={18} />
          </button>
        )}

        {/* Product Showcase Column */}
        <div className="w-full md:w-5/12 bg-slate-950/90 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold">
                <ShoppingBag size={14} />
                Merchant Storefront
              </div>
              <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                🟢 TEST STORE
              </span>
            </div>

            {/* Product Category Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-4">
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                    selectedProduct.id === p.id
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="truncate">{p.id.toUpperCase()}</span>
                </button>
              ))}
            </div>

            {/* Product Display Card */}
            <div className={`p-5 rounded-2xl border border-slate-800 bg-gradient-to-br ${selectedProduct.bgGrad} shadow-inner mb-4 relative overflow-hidden`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                  {selectedProduct.category}
                </span>
                <span className="text-[10px] font-sans font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {selectedProduct.badge}
                </span>
              </div>

              <div className="text-6xl text-center my-4 filter drop-shadow-lg">
                {selectedProduct.icon}
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">{selectedProduct.name}</h3>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-1">
                <span>SKU: {selectedProduct.sku}</span>
                <span className="text-emerald-400 font-bold">In Stock</span>
              </div>
            </div>

            {/* Order Price Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-200">₹{(selectedProduct.price * 0.8474).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18% Integrated)</span>
                <span className="text-slate-200">₹{(selectedProduct.price * 0.1526).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Express Delivery</span>
                <span>FREE (Included)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span className="font-sans">Total Amount</span>
                <span className="font-mono text-emerald-400 font-extrabold">₹{selectedProduct.price.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Live Biometrics Gauge Card */}
          <div className="mt-4 bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-[11px] font-mono space-y-1.5">
            <div className="text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Live Biometric Signals</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Keystroke Entropy:</span>
              <span className={liveEntropy < 1.0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {liveEntropy.toFixed(2)} {liveEntropy < 1.0 ? '(Low / Bot)' : '(Human)'}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Mouse Jitter:</span>
              <span className={liveJitter < 0.2 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {liveJitter.toFixed(2)} {liveJitter < 0.2 ? '(Synthetic)' : '(Natural)'}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Network ASN:</span>
              <span className={vpnMode ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {vpnMode ? 'Datacenter / VPN' : 'Residential'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment & Holographic Card Column */}
        <div className="w-full md:w-7/12 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={13} className="text-indigo-400" />
                Payment Information &amp; 3DS2 Gateway
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition shrink-0 whitespace-nowrap"
                >
                  ⚙️ API Config
                </button>
              </div>
            </div>

            {/* Razorpay Gateway Keys Drawer */}
            {showConfig && (
              <form onSubmit={handleSaveRazorpayConfig} className="mb-3 p-3 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2 animate-fadeIn text-xs">
                <div className="text-[11px] font-bold text-indigo-300 flex items-center justify-between">
                  <span>Razorpay API Configuration (Test Mode)</span>
                  {configSavedMsg && <span className="text-emerald-400 font-mono text-[10px]">{configSavedMsg}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <input
                    type="text"
                    placeholder="Key ID (rzp_test_...)"
                    value={customKeyId}
                    onChange={e => setCustomKeyId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="password"
                    placeholder="Key Secret"
                    value={customKeySecret}
                    onChange={e => setCustomKeySecret(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">Leave empty for instant simulator mode</span>
                  <button
                    type="submit"
                    disabled={isConfigSaving}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold transition"
                  >
                    {isConfigSaving ? 'Saving…' : 'Apply Keys'}
                  </button>
                </div>
              </form>
            )}

            {/* Dynamic Holographic Bank Card Preview */}
            <div className={`relative rounded-2xl p-5 mb-4 text-white shadow-xl transition-all duration-500 overflow-hidden border ${
              activePreset === 'bot' || activePreset === 'telegram'
                ? 'bg-gradient-to-tr from-slate-950 via-rose-950/60 to-slate-900 border-rose-500/40 shadow-rose-950/30'
                : activePreset === 'vpn'
                ? 'bg-gradient-to-tr from-slate-950 via-amber-950/60 to-slate-900 border-amber-500/40 shadow-amber-950/30'
                : activePreset === 'canary'
                ? 'bg-gradient-to-tr from-slate-950 via-yellow-950/70 to-slate-900 border-yellow-500/50 shadow-yellow-950/30'
                : 'bg-gradient-to-tr from-slate-950 via-indigo-950/70 to-slate-900 border-indigo-500/40 shadow-indigo-950/40'
            }`}>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-inner border border-amber-200/50">
                    <div className="w-5 h-4 border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5 opacity-70">
                      <div className="border-r border-b border-amber-900/40" />
                      <div className="border-b border-amber-900/40" />
                      <div className="border-r border-amber-900/40" />
                      <div />
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                    {activePreset === 'canary' ? 'CANARY HONEYTOKEN' : 'RAZORVIGIL SECURE'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 uppercase tracking-wider">
                  {cardNumber.startsWith('5') ? 'Mastercard' : cardNumber.startsWith('4') ? 'VISA' : 'RuPay'}
                </span>
              </div>

              {/* Card Number Display */}
              <div className="text-lg sm:text-xl font-mono tracking-[0.22em] font-bold text-slate-100 my-2 drop-shadow">
                {cardNumber || '•••• •••• •••• ••••'}
              </div>

              {/* Card Footer Details */}
              <div className="flex items-end justify-between mt-3 text-xs font-mono relative z-10 text-slate-300">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Cardholder</div>
                  <div className="font-bold tracking-wide uppercase truncate max-w-[180px]">{cardName || 'YOUR NAME'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Expires</div>
                  <div className="font-bold tracking-wider">{expiry || 'MM/YY'}</div>
                </div>
              </div>
            </div>

            {/* Quick Demo Autofill Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => autofillPreset('human')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  activePreset === 'human'
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 font-bold'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                ✓ Genuine
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('vpn')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  activePreset === 'vpn'
                    ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-bold'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                ⚠ VPN Recovery
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('bot')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  activePreset === 'bot'
                    ? 'bg-red-500/30 text-red-200 border-red-400 font-bold'
                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                }`}
              >
                🚫 Carding Bot
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('telegram')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  activePreset === 'telegram'
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-bold'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                🤖 TG Scraper
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('canary')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  activePreset === 'canary'
                    ? 'bg-yellow-500/30 text-yellow-200 border-yellow-400 font-bold'
                    : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                }`}
              >
                🐤 Canary #7
              </button>
            </div>

            {/* Payment Flow: Show Verified Receipt when Paid, or Payment Form */}
            {paymentVerified ? (
              <div className="p-6 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl shadow-xl text-center space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white font-sans">Payment Verified &amp; Captured</h3>
                  <p className="text-xs text-emerald-400 font-mono mt-0.5">
                    Cleared by RazorVigil AI Hot Path (&lt;15ms SLA)
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs font-mono text-left space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Product:</span>
                    <span className="text-white font-bold">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Amount Paid:</span>
                    <span className="text-emerald-400 font-bold font-mono">₹{selectedProduct.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Payment ID:</span>
                    <span className="text-slate-200 font-mono text-[11px]">{paymentVerified.paymentId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Order ID:</span>
                    <span className="text-slate-200 font-mono text-[11px]">{paymentVerified.orderId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Method:</span>
                    <span className="text-slate-200 font-mono">{cardNumber.startsWith('5') ? 'Mastercard' : cardNumber.startsWith('4') ? 'VISA' : 'RuPay'} •••• {cardNumber.replace(/\s+/g, '').slice(-4) || '4242'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentVerified(null)
                    setCheckoutResult(null)
                    autofillPreset('human')
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <span>✨</span>
                  <span>Place Another Test Order</span>
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleCheckout} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Card Number (Type to measure live entropy)</label>
                    <input
                      type="text"
                      placeholder="4012 0000 0000 0002"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">Expiry</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={e => setExpiry(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={e => setCvv(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vpnMode}
                        onChange={e => setVpnMode(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>Simulate Datacenter IP / VPN Network</span>
                    </label>
                  </div>

                  {/* Dual Action Buttons: RazorVigil Direct & Razorpay Native Checkout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || isRzpNativeLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Screening Hot Path…</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} />
                          <span>Pay ₹{selectedProduct.price.toLocaleString('en-IN')} (Shield)</span>
                        </>
                      )}
                    </button>

                    {(() => {
                      const isBot = activePreset === 'bot' || activePreset === 'telegram' || activePreset === 'canary' || checkoutResult?.tier === 'high_confidence_bot'
                      return (
                        <button
                          type="button"
                          onClick={handleNativeRazorpayCheckout}
                          disabled={isSubmitting || isRzpNativeLoading || isBot}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition ${
                            isBot
                              ? 'bg-slate-900/50 text-slate-500 border border-slate-800/60 cursor-not-allowed opacity-60'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 shadow-sm'
                          }`}
                          title={isBot ? 'Direct Gateway Access Blocked for Bot / Honeypot Traffic' : 'Launch official Razorpay Test Mode checkout popup'}
                        >
                          {isRzpNativeLoading ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Opening Razorpay…</span>
                            </>
                          ) : isBot ? (
                            <>
                              <Lock size={13} className="text-rose-400" />
                              <span className="text-rose-300">Gateway Blocked (Bot)</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={14} className="text-blue-400" />
                              <span>Razorpay Test Popup</span>
                            </>
                          )}
                        </button>
                      )
                    })()}
                  </div>
                  <div className="pt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/60 mt-2">
                    <span className="text-slate-500">Test Credentials:</span>
                    <span className="text-slate-300">Card: <code className="text-indigo-300">4012...0002</code> | UPI: <code className="text-emerald-300">success@razorpay</code></span>
                  </div>
                </form>

                {/* Risk Decision Box */}
                {checkoutResult && (
                  <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans font-semibold">Risk Engine Decision:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        checkoutResult.tier === 'safe' ? 'bg-emerald-500/20 text-emerald-400' :
                        checkoutResult.tier === 'soft_risk' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {checkoutResult.tier.toUpperCase()} ({checkoutResult.risk_score ? (checkoutResult.risk_score * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">{checkoutResult.explanation}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3DS 2.0 Bank ACS Step-Up & Kinetic OTP Challenge Modal */}
      {threeDsModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            
            {/* ACS Secure Address Header */}
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <Lock size={11} />
                  TLS 1.3 SECURE
                </span>
                <span className="text-slate-500 truncate max-w-[220px]">
                  https://acs.hdfcbank.com/v2/challenge?id={threeDsModal.order_id?.slice(0, 10)}
                </span>
              </div>
              <button
                onClick={() => setThreeDsModal(null)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bank Header & Order Context */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      HDFC Bank 3DS Secure 2.2
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-bold">EMVCo 3DS2</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Razorpay Sovereign Risk Gateway</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white font-mono">₹{threeDsModal.amount.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Card: •••• {threeDsModal.cardLast4}</div>
                </div>
              </div>

              {/* Live Incoming SMS Toast */}
              {showSmsToast && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200 animate-fadeIn">
                  <span className="text-base">💬</span>
                  <div className="flex-1 text-[11px]">
                    <span className="font-bold text-white block">SMS from HDFC-BANK:</span>
                    Your 3DS2 One-Time Password is <strong className="text-amber-300 font-mono text-xs px-1 bg-amber-500/20 rounded">482910</strong> for transaction of ₹{threeDsModal.amount.toLocaleString('en-IN')} at SneakerVault India. Valid for 5 mins.
                  </div>
                </div>
              )}

              {/* OTP Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200">Enter 6-Digit SMS OTP</label>
                    <span className="text-[11px] font-mono text-slate-400">
                      Resend in <span className="text-indigo-400 font-bold">{otpTimer}s</span>
                    </span>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="482910"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={handleOtpKeyDown}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.4em] text-white focus:outline-none shadow-inner"
                  />
                </div>

                {/* Kinetic Hesitation & Shannon Entropy Indicator */}
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>⚡ Kinetic Telemetry:</span>
                    <span className={otpLiveEntropy >= 1.2 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      H = {otpLiveEntropy > 0 ? otpLiveEntropy.toFixed(2) : '2.45'}
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {otpDeltas.length > 0 ? `${otpDeltas.length} intervals captured` : 'Live delta timer active'}
                  </span>
                </div>

                {/* Result Feedback Banner */}
                {otpResult && (
                  <div className={`p-3 rounded-xl text-xs border font-mono animate-fadeIn ${
                    otpResult.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5">
                      {otpResult.status === 'success' ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-rose-400" />}
                      {otpResult.status === 'success' ? '3DS2 Verified & Payment Captured!' : '3DS2 Step-Up Intercepted'}
                    </div>
                    <div className="text-[11px] mt-1 text-slate-300">
                      {otpResult.message || otpResult.reason}
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => submitThreeDsOtp(false)}
                    disabled={otpSubmitting}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {otpSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Submit OTP &amp; Authorize Payment
                  </button>

                  <button
                    onClick={() => submitThreeDsOtp(true)}
                    disabled={otpSubmitting}
                    className="w-full py-2 bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>🤖</span>
                    Simulate Bot 0ms Script Paste (Triggers Real Intercept)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Out-of-Band UPI QR Recovery Modal */}
      {recoveryModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl mx-auto flex items-center justify-center text-amber-400">
              <QrCode size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Out-of-Band UPI QR Recovery</h3>
              <p className="text-xs text-amber-300/80 mt-1">
                Zero False Decline: VPN traffic detected. Inventory held for 5:00 minutes.
              </p>
            </div>

            {!recoverySuccess ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(recoveryModal.recovery_url || '')}`}
                    alt="UPI QR Code"
                    className="w-full h-full"
                  />
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Order: {selectedProduct.name} (₹{selectedProduct.price.toLocaleString('en-IN')})
                </div>

                <button
                  onClick={handleSimulateUpiApproval}
                  disabled={isRecovering}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  {isRecovering ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Simulate Customer Scanning UPI QR
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs space-y-2">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                <div className="font-bold">Payment Verified via Out-of-Band Recovery!</div>
                <p className="text-[11px] text-slate-400 font-mono">Rescued ₹{selectedProduct.price.toLocaleString('en-IN')} GMV</p>
                <button
                  onClick={() => {
                    setRecoveryModal(null)
                    setRecoverySuccess(false)
                  }}
                  className="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-white text-xs py-1.5 rounded-lg transition"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
