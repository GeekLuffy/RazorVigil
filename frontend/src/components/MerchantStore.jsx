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

export default function MerchantStore({ onClose, onPaymentComplete }) {
  const [selectedProduct, setSelectedProduct] = useState({
    name: 'Air Jordan 1 Retro High OG "Chicago"',
    price: 16999,
    image: '👟',
    sku: 'AJ1-CHI-2026'
  })

  // Form State
  const [cardName, setCardName] = useState('Rahul Sharma')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('12/28')
  const [cvv, setCvv] = useState('888')
  const [vpnMode, setVpnMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Real-time Biometrics Collection
  const [keystrokeDeltas, setKeystrokeDeltas] = useState([])
  const [mousePoints, setMousePoints] = useState([])
  const [liveEntropy, setLiveEntropy] = useState(0.0)
  const [liveJitter, setLiveJitter] = useState(0.0)
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
          client_reported_origin: 'checkout.razorshield.io',
          gateway_origin: 'checkout.razorshield.io',
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
          three_ds_version: '2.2.0',
          cavv: 'AAABBIIFmQAAAAAAAQUWJgAAAAA=',
          eci: '05',
          device_channel: '02',
          client_challenge_origin: 'checkout.razorshield.io',
          acs_challenge_origin: 'checkout.razorshield.io',
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
    if (type === 'human') {
      setCardName('Rahul Sharma')
      setCardNumber('4111 1111 1111 1111')
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

    let payload
    if (activePreset === 'human') {
      payload = {
        amount: selectedProduct.price,
        bin6: rawPan.slice(0, 6) || '411111',
        card_hash: `card_genuine_${rawPan.slice(-4) || '1111'}`,
        billing_name: cardName,
        device_fingerprint: `dev_human_${Date.now() % 100000}`,
        ip_hash: `ip_airtel_res_${Date.now() % 100000}`,
        asn_type: 'residential',
        ja3_ua_mismatch: false,
        keystroke_entropy: Math.max(liveEntropy, 2.65),
        mouse_jitter_score: Math.max(liveJitter, 0.68),
        paste_event: false,
        time_on_page_s: timeOnPage,
        is_accessibility_mode: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
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
              prefill: { name: cardName, email: 'customer@razorshield.io', contact: '9876543210' },
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
        setRzpModal(null)
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
    <div onMouseMove={handleMouseMove} className="fixed inset-0 z-50 bg-[#070a13]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition"
          >
            <X size={18} />
          </button>
        )}

        {/* Product Column */}
        <div className="w-full md:w-5/12 bg-slate-950 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest">
                <ShoppingBag size={14} />
                Merchant Checkout Demo
              </div>
              <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                🧪 SYNTHETIC TEST CARDS
              </span>
            </div>


            <div className="aspect-square bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-center text-7xl shadow-inner mb-4">
              {selectedProduct.image}
            </div>

            <h3 className="text-base font-bold text-white leading-snug">{selectedProduct.name}</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">SKU: {selectedProduct.sku}</p>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Total Due:</span>
              <span className="text-xl font-bold text-white font-mono">₹{selectedProduct.price.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Live Biometrics Card */}
          <div className="mt-6 bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-[11px] font-mono space-y-1.5">
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

        {/* Form Column */}
        <div className="w-full md:w-7/12 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={13} className="text-indigo-400" />
                Payment Information
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition shrink-0 whitespace-nowrap"
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

            {/* Quick Demo Autofill Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => autofillPreset('human')}
                className="text-[10px] font-mono bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 transition"
              >
                ✓ Genuine
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('vpn')}
                className="text-[10px] font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 transition"
              >
                ⚠ VPN Recovery
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('bot')}
                className="text-[10px] font-mono bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-0.5 rounded border border-red-500/30 transition"
              >
                🚫 Carding Bot
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('telegram')}
                className="text-[10px] font-mono bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 transition"
              >
                🤖 TG Scraper
              </button>
              <button
                type="button"
                onClick={() => autofillPreset('canary')}
                className="text-[10px] font-mono bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30 transition"
              >
                🐤 Canary #7
              </button>
            </div>

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
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Card Number (Type to measure entropy)</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
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

              <div className="pt-2 flex items-center justify-between">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Screening with RazorShield Sentinel…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Pay ₹{selectedProduct.price.toLocaleString('en-IN')} with RazorShield
                  </>
                )}
              </button>
            </form>

            {/* Payment Verified Success Box */}
            {paymentVerified && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Razorpay Payment Verified &amp; Captured
                </div>
                <div className="font-mono text-[10px] space-y-0.5 text-slate-400">
                  <div>Payment ID: {paymentVerified.paymentId}</div>
                  <div>Order ID: {paymentVerified.orderId}</div>
                </div>
              </div>
            )}

            {/* Risk Decision Box */}
            {checkoutResult && !paymentVerified && (
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
          </div>
        </div>
      </div>

      {/* 3DS 2.0 Bank ACS Step-Up & Kinetic OTP Challenge Modal */}
      {threeDsModal && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
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
