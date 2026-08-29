import React, { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Lock, ShieldCheck, QrCode, ArrowRight, RefreshCw, Smartphone, Laptop, CheckCircle2, AlertTriangle, X } from 'lucide-react'

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

  // Recovery Modal State
  const [checkoutResult, setCheckoutResult] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState(false)

  // Calculate Shannon Entropy of delta-t intervals
  const calculateEntropy = (deltas) => {
    if (deltas.length < 3) return 2.1
    // Bucket deltas into 20ms bins
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

  // Calculate Mouse Jitter Score
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

  const handleKeyDown = (e) => {
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

  const autofillBotData = () => {
    setCardName('Test Bot 001')
    setCardNumber('5222 2200 1234 5678')
    setExpiry('08/29')
    setCvv('999')
    setVpnMode(true)
    setKeystrokeDeltas([])
    setMousePoints([])
    setLiveEntropy(0.0)
    setLiveJitter(0.0)
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setCheckoutResult(null)

    const timeOnPage = (Date.now() - pageLoadTime.current) / 1000
    const bin6 = cardNumber.replace(/\s+/g, '').slice(0, 6) || '411111'
    const cardHash = `card_hash_${cardNumber.replace(/\s+/g, '') || '4111111111111111'}`

    const payload = {
      amount: selectedProduct.price,
      bin6: bin6,
      card_hash: cardHash,
      billing_name: cardName,
      device_fingerprint: 'browser_demo_device_client',
      ip_hash: vpnMode ? 'ip_vpn_exit_node_mumbai' : 'ip_residential_airtel_user',
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

      if (data.tier === 'soft_risk' && data.recovery_url) {
        // Trigger out-of-band recovery modal
        setRecoveryModal(data)
      }
    } catch (err) {
      alert('Checkout error: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSimulateUpiApproval = async () => {
    if (!recoveryModal) return
    setIsRecovering(true)

    // Extract token from recovery URL
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

        {/* Left: Product & Store Context */}
        <div className="md:w-5/12 bg-slate-950 p-6 border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                SV
              </div>
              <div>
                <div className="text-white font-bold text-sm tracking-wide">SneakerVault India</div>
                <div className="text-slate-500 text-xs">Powered by Razorpay Magic Checkout</div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-4">
              <div className="text-4xl mb-2 text-center">{selectedProduct.image}</div>
              <div className="text-sm font-semibold text-white">{selectedProduct.name}</div>
              <div className="text-xs text-slate-400 mb-2">SKU: {selectedProduct.sku}</div>
              <div className="text-lg font-bold text-emerald-400">Rs.{selectedProduct.price.toLocaleString('en-IN')}</div>
            </div>

            {/* Live Client Biometrics Inspector */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs">
              <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Laptop size={13} />
                Client-Side Signal Stream
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Keystroke Entropy</div>
                  <div className={`text-sm font-bold ${liveEntropy > 1.2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {liveEntropy.toFixed(2)} <span className="text-[9px] font-normal text-slate-500">(human: &gt;1.5)</span>
                  </div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Mouse Jitter</div>
                  <div className={`text-sm font-bold ${liveJitter > 0.3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {liveJitter.toFixed(2)} <span className="text-[9px] font-normal text-slate-500">(human: &gt;0.4)</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 italic">
                * Real JS listeners measuring inter-keydown intervals &amp; cursor micro-tremors in your browser.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Lock size={12} /> 256-bit TLS</span>
            <span>RazorShield Protected</span>
          </div>
        </div>

        {/* Right: Razorpay Checkout Form */}
        <div className="md:w-7/12 p-6 bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-indigo-400" size={18} />
                Razorpay Secure Checkout
              </div>
              <button
                type="button"
                onClick={autofillBotData}
                className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500/20 transition"
              >
                ⚡ Autofill as Bot (Zero Entropy)
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name on Card</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Card Number (Type or Paste)</label>
                <input
                  type="text"
                  placeholder="4111 2222 3333 4444"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Simulation Toggles */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={vpnMode}
                    onChange={(e) => setVpnMode(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0"
                  />
                  <span>Simulate VPN Exit Node (Datacenter ASN with Human Typing)</span>
                </label>
                <div className="text-[10px] text-slate-500 ml-5">
                  Triggers <strong>soft_risk</strong> tier to test the UPI Recovery Flow.
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Analyzing 16 Signals (sub-15ms)...
                  </>
                ) : (
                  <>
                    Pay Rs.{selectedProduct.price.toLocaleString('en-IN')}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Immediate Decision Feedback */}
          {checkoutResult && (
            <div className={`mt-4 p-3 rounded-xl border text-xs font-mono animate-fadeIn ${
              checkoutResult.tier === 'safe'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : checkoutResult.tier === 'soft_risk'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <div className="font-bold uppercase tracking-wider flex items-center justify-between mb-1">
                <span>Decision: {checkoutResult.tier} ({checkoutResult.action})</span>
                <span>Latency: {checkoutResult.latency_ms}ms</span>
              </div>
              <div className="text-[11px] opacity-90">{checkoutResult.explanation}</div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Razorpay UPI QR Recovery Modal (Track 03) */}
      {recoveryModal && !recoverySuccess && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Out-of-Band Security Recovery</h3>
            <p className="text-xs text-slate-400 mb-4">
              VPN/Proxy detected. Instead of failing your transaction, RazorShield has locked your inventory for 5 minutes.
            </p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
              <div className="w-44 h-44 bg-slate-100 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center p-2">
                <QrCode size={130} className="text-slate-900" />
                <div className="text-[10px] font-bold text-slate-800 font-mono mt-1">Scan via any UPI App</div>
              </div>
            </div>

            <div className="text-xs text-emerald-400 font-mono font-bold mb-4">
              Amount Locked: Rs.{selectedProduct.price.toLocaleString('en-IN')}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSimulateUpiApproval}
                disabled={isRecovering}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
              >
                {isRecovering ? <RefreshCw size={16} className="animate-spin" /> : <Smartphone size={16} />}
                Simulate Customer Scanning UPI QR
              </button>

              <button
                onClick={() => setRecoveryModal(null)}
                className="w-full text-xs text-slate-400 hover:text-white py-1.5"
              >
                Cancel and close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Success Confirmation */}
      {recoverySuccess && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">GMV Rescued Successfully!</h3>
            <p className="text-xs text-slate-400 mb-4">
              Track 03 Recovery Loop complete. Transaction was verified via UPI out-of-band and order confirmed.
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs font-mono text-emerald-300 mb-4">
              +Rs.{selectedProduct.price.toLocaleString('en-IN')} added to Recovered GMV
            </div>
            <button
              onClick={() => {
                setRecoveryModal(null)
                setRecoverySuccess(false)
                if (onClose) onClose()
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition"
            >
              Return to SOC Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
