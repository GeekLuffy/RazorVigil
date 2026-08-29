import React, { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Lock, ShieldCheck, QrCode, ArrowRight, RefreshCw, Smartphone, Laptop, CheckCircle2, AlertTriangle, X, CreditCard } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

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
  const [rzpModal, setRzpModal] = useState(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(null)

  const calculateEntropy = (deltas) => {
    if (deltas.length < 3) return 2.1
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
    return Math.min(3.5, Math.max(0.0, Number(ent.toFixed(2))))
  }

  const calculateJitter = (points) => {
    if (points.length < 5) return 0.65
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
    const score = Math.min(1.0, (totalAngleChange / (points.length * Math.PI)) * 1.5)
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

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then(r => r.json())
      .then(d => {
        if (d.razorpay_key_id && !d.razorpay_key_id.startsWith('rzp_test_demo')) {
          setCustomKeyId(d.razorpay_key_id)
        }
      })
      .catch(() => {})
  }, [])

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
      setLiveEntropy(0.0)
      setLiveJitter(0.0)
    } else if (type === 'canary') {
      setCardName('Canary Honeytoken')
      setCardNumber('5999 9900 0000 0007')
      setExpiry('05/30')
      setCvv('777')
      setVpnMode(true)
      setLiveEntropy(0.0)
      setLiveJitter(0.0)
    } else if (type === 'vpn') {
      setCardName('Aditya Verma')
      setCardNumber('4242 4242 4242 4242')
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
    const timeOnPage = Math.max(0.5, (Date.now() - pageLoadTime.current) / 1000)

    const payload = {
      amount: selectedProduct.price,
      bin6: rawPan.slice(0, 6) || '424242',
      card_hash: `card_${rawPan.slice(-4) || '4242'}_${Date.now()}`,
      billing_name: cardName,
      device_fingerprint: 'dev_shopper_x1',
      ip_hash: vpnMode ? 'ip_vpn_datacenter_01' : 'ip_airtel_residential_01',
      asn_type: vpnMode ? 'datacenter' : 'residential',
      ja3_ua_mismatch: false,
      keystroke_entropy: liveEntropy,
      mouse_jitter_score: liveJitter,
      paste_event: liveEntropy === 0.0,
      time_on_page_s: timeOnPage
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
        if (!keyId.startsWith('rzp_test_demo') && window.Razorpay) {
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
          // Open native test modal
          setRzpModal({
            order_id: data.razorpay_order_id,
            amount: selectedProduct.price,
            key_id: keyId,
          })
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
    <div onMouseMove={handleMouseMove} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
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
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">
              <ShoppingBag size={14} />
              Merchant Checkout Demo
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
                  className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
                >
                  ⚙️ Gateway Keys
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

      {/* Native Razorpay Test Modal Overlay */}
      {rzpModal && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mx-auto flex items-center justify-center text-indigo-400">
              <CreditCard size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Razorpay Standard Checkout</h3>
              <p className="text-xs text-slate-400 mt-1">Order #{rzpModal.order_id.slice(0, 12)}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Amount:</span>
                <span className="text-white font-bold">₹{rzpModal.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Key ID:</span>
                <span className="text-indigo-400 truncate max-w-[200px]">{rzpModal.key_id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Gateway Status:</span>
                <span className="text-emerald-400 font-bold">Passed Risk Filter (&lt;12ms)</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRzpModal(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => verifyPaymentOnBackend(rzpModal.order_id, `pay_${Date.now().toString(36)}`, 'local_verified_sig')}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
              >
                Approve Test Payment
              </button>
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
