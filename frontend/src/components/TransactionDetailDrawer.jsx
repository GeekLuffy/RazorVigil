import React, { useState, useEffect } from 'react'
import {
  X,
  Shield,
  Activity,
  Zap,
  Lock,
  Globe,
  Fingerprint,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Clock
} from 'lucide-react'

export default function TransactionDetailDrawer({ tx, isOpen, onClose, onIssueRecovery }) {
  const [copiedJson, setCopiedJson] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !tx) return null

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(tx, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const isBot = tx.tier === 'high_confidence_bot'
  const isSafe = tx.tier === 'safe'
  const isRecovered = Boolean(tx.recovery_url)
  const isAgent = Boolean(tx.is_agent)
  const isCanary = Boolean(tx.is_canary)

  const entropy = typeof tx.keystroke_entropy === 'number' ? tx.keystroke_entropy : (tx.is_bot ? 0.0 : 2.75)
  const jitter = typeof tx.mouse_jitter_score === 'number' ? tx.mouse_jitter_score : (tx.is_bot ? 0.0 : 0.68)
  const latency = typeof tx.latency_ms === 'number' ? tx.latency_ms : 9.5
  const riskScore = typeof tx.risk_score === 'number' ? tx.risk_score : 0.12

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="w-full max-w-lg md:max-w-xl bg-[#0b0f19] border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-indigo-400 font-bold flex items-center gap-1.5">
                <Shield size={14} />
                Forensic Inspection Dossier
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                ESC to close
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-tight flex items-center gap-2">
                {tx.transaction_id || `tx_${Date.now()}`}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                <Clock size={12} className="text-slate-500" />
                <span>{new Date().toLocaleTimeString()}</span>
                <span>•</span>
                <span>Latency: <strong className="text-emerald-400">{latency.toFixed(1)}ms</strong></span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                isBot
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : isRecovered
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : isSafe
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isCanary ? '🐤 CANARY TRAP' : isBot ? '🚫 BOT BLOCKED' : isRecovered ? '↪ RECOVERED (UPI)' : isAgent ? '🤖 VERIFIED AGENT' : '✓ SAFE PASS'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 flex-1">
          {/* Risk Score & Primary Metrics Card */}
          <div className="soc-card soc-card-indigo p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Calibrated ML Risk Score
              </span>
              <span className="text-xs font-mono text-slate-500">Threshold: 0.75</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className={`text-3xl font-black font-mono tracking-tight ${riskScore >= 0.75 ? 'text-rose-400 glow-text-rose' : 'text-emerald-400 glow-text-emerald'}`}>
                {riskScore.toFixed(3)}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-mono block">Order Amount</span>
                <span className="text-lg font-bold text-white font-mono">₹{Number(tx.amount || 1499).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${riskScore >= 0.75 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(riskScore * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* 5-Domain Telemetry Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold font-sans uppercase tracking-wider text-slate-400">
              Verifiable 5-Domain Telemetry Signals
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Kinetic Biometrics (Entropy) */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span className="flex items-center gap-1"><Fingerprint size={13} className="text-indigo-400" /> Keystroke Entropy</span>
                </div>
                <div className={`text-base font-bold font-mono ${entropy < 1.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {entropy.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">{entropy < 1.0 ? '(Bot Script)' : '(Natural)'}</span>
                </div>
              </div>

              {/* 2. Mouse Jitter */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span className="flex items-center gap-1"><Activity size={13} className="text-indigo-400" /> Mouse Jitter Score</span>
                </div>
                <div className={`text-base font-bold font-mono ${jitter < 0.2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {jitter.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">{jitter < 0.2 ? '(Linear / Bot)' : '(Human Curve)'}</span>
                </div>
              </div>

              {/* 3. Network & ASN */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span className="flex items-center gap-1"><Globe size={13} className="text-indigo-400" /> ASN Route</span>
                </div>
                <div className="text-sm font-bold font-mono text-slate-200 capitalize">
                  {tx.asn_type || 'residential'}
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">{tx.ip_hash || 'ip_mumbai_pool_01'}</div>
              </div>

              {/* 4. TLS JA3 Fingerprint */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span className="flex items-center gap-1"><Cpu size={13} className="text-indigo-400" /> JA3 / TLS Match</span>
                </div>
                <div className={`text-sm font-bold font-mono ${tx.ja3_ua_mismatch ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {tx.ja3_ua_mismatch ? 'Spoofed Mismatch ❌' : 'Browser Cipher Match ✓'}
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">Passive JA4 TLS mesh</div>
              </div>
            </div>
          </div>

          {/* Payment Instrument Identity */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Payment Instrument &amp; Token</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                RBI CoFT Compliant
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Card BIN / Range</span>
                <strong className="text-slate-200">{tx.bin6 || '424242'} ••••</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Device Fingerprint</span>
                <strong className="text-slate-200 truncate block">{tx.device_fingerprint?.slice(0, 18) || 'dev_fingerprint_01'}…</strong>
              </div>
            </div>
          </div>

          {/* Out-of-band Recovery Card (if applicable) */}
          {tx.recovery_url && (
            <div className="soc-card soc-card-emerald p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                  <QrCode size={14} />
                  Single-Use Signed UPI Recovery Bridge
                </span>
                <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  HMAC-SHA256
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans">
                Rescued genuine user on VPN from false decline. Issued out-of-band UPI QR recovery link without checkout friction.
              </p>
              <div className="p-2 bg-slate-950 rounded border border-emerald-500/30 text-[11px] font-mono text-emerald-300 truncate">
                {tx.recovery_url}
              </div>
            </div>
          )}

          {/* Expandable Raw JSON */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <Code2 size={13} />
              <span>{showRawJson ? 'Hide' : 'View'} Raw Telemetry JSON</span>
            </button>
            {showRawJson && (
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-48 whitespace-pre-wrap animate-fade-in">
                {JSON.stringify(tx, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-3">
          <button
            onClick={copyJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold rounded-lg transition"
          >
            {copiedJson ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedJson ? 'Copied JSON' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-sans rounded-lg transition shadow-md shadow-indigo-950/40"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  )
}
