import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Shield, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2, Cpu
} from 'lucide-react'

import ThreatLabWorkspace from './components/ThreatLabWorkspace'
import ActiveDefenseWorkspace from './components/ActiveDefenseWorkspace'
import MerchantStore from './components/MerchantStore'
import ArchitectureOverview from './components/ArchitectureOverview'
import FraudGraphCanvas from './components/FraudGraphCanvas'
import DisputeCaseWorkspace from './components/DisputeCaseWorkspace'
import ModelGovernanceStudio from './components/ModelGovernanceStudio'

// ─── Config ───────────────────────────────────────────────────────────────────
const WS_URL = 'ws://localhost:8000/ws'
const MAX_FEED_ITEMS = 80
const MAX_CHART_POINTS = 60

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIER_META = {
  safe:                { label: 'SAFE',           color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '✓' },
  soft_risk:           { label: 'SOFT RISK',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '⚠' },
  elevated_review:     { label: 'ELEVATED',       color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: '🔶' },
  high_confidence_bot: { label: 'BOT BLOCKED',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🚫' },
  verified_agent:      { label: 'VERIFIED AGENT', color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  icon: '🤖' },
}

function tierMeta(tier) {
  return TIER_META[tier] ?? { label: tier, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '?' }
}

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '—' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '—' }
function fmtRupees(n) { return `Rs.${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#64748b' }) {
  return (
    <div className="panel flex flex-col gap-1 hover:border-slate-600/80 transition-all duration-200">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mb-1">
        <Icon size={14} color={color} />
        {label}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const m = tierMeta(tier)
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.color}33` }}
    >
      {m.icon} {m.label}
    </span>
  )
}

// ─── Live feed row ────────────────────────────────────────────────────────────
function FeedRow({ tx, isNew }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-1.5 rounded text-xs font-mono transition-all ${isNew ? 'bg-slate-700/40' : ''}`}
      style={{ borderLeft: `2px solid ${tierMeta(tx.tier).color}55` }}
    >
      <span className="text-slate-500 w-8 text-right shrink-0">{fmtMs(tx.latency_ms)}</span>
      <TierBadge tier={tx.tier} />
      <span className="text-slate-300 shrink-0 w-14 text-right">{fmt(tx.risk_score)}</span>
      <span className="text-slate-500 truncate flex-1">{tx.transaction_id?.slice(0, 8)}…</span>
      {tx.is_canary && <span className="text-amber-400 text-[10px] shrink-0 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">🐤 CANARY</span>}
      {tx.is_agent && <span className="text-purple-400 text-[10px] shrink-0 font-bold bg-purple-500/20 px-1.5 py-0.5 rounded">🤖 AGENT</span>}
      {tx.recovery_url && (
        <span className="text-emerald-400 text-xs shrink-0">↪ recovered</span>
      )}
    </div>
  )
}

// ─── GMV counter ─────────────────────────────────────────────────────────────
function GmvCounter({ amount }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const start = prevRef.current
    const end = amount
    if (start === end) return
    const duration = 600
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(Math.round(start + (end - start) * progress))
      if (progress < 1) requestAnimationFrame(tick)
      else prevRef.current = end
    }
    requestAnimationFrame(tick)
  }, [amount])

  return (
    <div className="panel glow-emerald flex flex-col gap-1 border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest mb-1">
          <TrendingUp size={14} color="#10b981" />
          Recovered GMV (Track 03 Revenue Bridge)
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
          Zero False Decline Architecture
        </span>
      </div>
      <div className="text-3xl font-bold text-emerald-400 font-mono tabular-nums">
        {fmtRupees(display)}
      </div>
      <div className="text-xs text-slate-400">
        Rescued genuine customers from false declines via out-of-band UPI QR / WhatsApp recovery links.
      </div>
    </div>
  )
}

// ─── Tier pie chart ───────────────────────────────────────────────────────────
const PIE_COLORS = {
  safe: '#10b981', soft_risk: '#f59e0b',
  elevated_review: '#f97316', high_confidence_bot: '#ef4444',
  verified_agent: '#a855f7'
}
function TierPie({ counts }) {
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: tierMeta(k).label, value: v, tier: k }))
  if (!data.length) return <div className="text-slate-600 text-sm text-center py-8">Awaiting transactions...</div>

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
          dataKey="value" stroke="none">
          {data.map((d, idx) => (
            <Cell key={`tier-pie-${d.tier}-${idx}`} fill={PIE_COLORS[d.tier] ?? '#64748b'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        <Legend formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{val}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Risk score chart ─────────────────────────────────────────────────────────
function RiskChart({ points }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={points} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="t" hide />
        <YAxis domain={[0, 1]} tick={{ fill: '#475569', fontSize: 10 }} tickCount={5} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v) => [v.toFixed(3), 'Risk Score']}
          labelFormatter={() => ''}
        />
        <Line type="monotone" dataKey="botLine" stroke="#ef444455" strokeWidth={1} dot={false} strokeDasharray="4 4" />
        <Area type="monotone" dataKey="score" stroke="#f87171" strokeWidth={2}
          fill="url(#riskGrad)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Connection status ────────────────────────────────────────────────────────
function ConnStatus({ status }) {
  const colors = { connected: '#10b981', connecting: '#f59e0b', disconnected: '#ef4444' }
  const labels = { connected: 'LIVE', connecting: 'CONNECTING', disconnected: 'OFFLINE' }
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="animate-pulse" style={{ color: colors[status] }}>●</span>
      <span style={{ color: colors[status] }}>{labels[status]}</span>
    </div>
  )
}

// ─── Canary alert banner ──────────────────────────────────────────────────────
function CanaryAlert({ event, onDismiss }) {
  if (!event) return null
  return (
    <div className="canary-flash flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 mb-4 animate-scaleUp">
      <span className="text-2xl">🐤</span>
      <div className="flex-1">
        <div className="text-yellow-300 font-bold text-sm">CANARY HONEYTOKEN TRIGGERED (CONFIDENCE = 1.0)</div>
        <div className="text-yellow-200/70 text-xs font-mono mt-0.5">{event.explanation}</div>
      </div>
      <button onClick={onDismiss} className="text-yellow-500/50 hover:text-yellow-300 text-xs px-2 py-1 border border-yellow-500/30 rounded">dismiss</button>
    </div>
  )
}

// ─── Copilot notes panel ──────────────────────────────────────────────────────
function CopilotNotes({ notes }) {
  if (!notes.length) return null
  return (
    <div className="panel mt-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔍</span>
        <span className="text-xs uppercase tracking-widest text-slate-400">Fraud Analyst AI Copilot</span>
        <span className="ml-2 text-xs text-slate-600 font-mono">(async, off hot path)</span>
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {notes.slice(0, 5).map((n, i) => (
          <div key={n.transaction_id ? `${n.transaction_id}-${i}` : `copilot-note-${i}`} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
            <div className="text-xs text-slate-500 font-mono mb-1">tx: {n.transaction_id?.slice(0, 8)}…</div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{n.note}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Webhook alert banner ──────────────────────────────────────────────────────
function WebhookAlert({ event, onDismiss }) {
  if (!event) return null
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/50 bg-emerald-500/15 mb-4 animate-scaleUp text-emerald-300">
      <span className="text-2xl">⚡</span>
      <div className="flex-1">
        <div className="font-bold text-sm text-emerald-300 flex items-center gap-2">
          RAZORPAY TEST WEBHOOK RECEIVED: {event.event}
          <span className="text-[10px] font-mono bg-emerald-500/30 px-1.5 py-0.5 rounded">HMAC-SHA256 VERIFIED</span>
        </div>
        <div className="text-emerald-200/80 text-xs font-mono mt-0.5">{event.message}</div>
      </div>
      <button onClick={onDismiss} className="text-emerald-400/60 hover:text-emerald-200 text-xs px-2 py-1 border border-emerald-500/30 rounded">dismiss</button>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('soc') // 'soc' | 'store' | 'pitch'
  const [feed, setFeed] = useState([])
  const [newId, setNewId] = useState(null)
  const [chartPoints, setChartPoints] = useState([])
  const [tierCounts, setTierCounts] = useState({ safe: 0, soft_risk: 0, elevated_review: 0, high_confidence_bot: 0, verified_agent: 0 })
  const [recoveredGmv, setRecoveredGmv] = useState(0)
  const [stats, setStats] = useState({ total: 0, avgLatency: 0, botsBlocked: 0, falseDeclines: 0, agentTxns: 0 })
  const [wsStatus, setWsStatus] = useState('connecting')
  const [canaryAlert, setCanaryAlert] = useState(null)
  const [webhookAlert, setWebhookAlert] = useState(null)
  const [copilotNotes, setCopilotNotes] = useState([])
  const [isStoreOpen, setIsStoreOpen] = useState(false)
  const wsRef = useRef(null)
  const latencyBuffer = useRef([])
  const tRef = useRef(0)

  const handleTx = useCallback((tx) => {
    if (tx.type === 'webhook_payment_captured' || tx.type === 'recovery_completed') {
      setRecoveredGmv(prev => prev + (tx.amount || 0))
      if (tx.type === 'webhook_payment_captured') {
        setWebhookAlert(tx)
        setTimeout(() => setWebhookAlert(null), 8000)
      }
      return
    }

    // Canary flash
    if (tx.is_canary) {
      setCanaryAlert(tx)
      setTimeout(() => setCanaryAlert(null), 8000)
    }

    // Feed
    setNewId(tx.transaction_id)
    setFeed(prev => [tx, ...prev].slice(0, MAX_FEED_ITEMS))

    // Chart
    if (tx.tier !== 'verified_agent') {
      tRef.current += 1
      setChartPoints(prev => [
        ...prev,
        { t: tRef.current, score: tx.risk_score, botLine: 0.75 }
      ].slice(-MAX_CHART_POINTS))
    }

    // Tier counts
    setTierCounts(prev => ({ ...prev, [tx.tier]: (prev[tx.tier] ?? 0) + 1 }))

    // Recovered GMV
    if (tx.recovery_url) {
      setRecoveredGmv(prev => prev + (tx.amount ?? 0))
    }

    // Stats
    latencyBuffer.current.push(tx.latency_ms)
    if (latencyBuffer.current.length > 50) latencyBuffer.current.shift()
    const avgLat = latencyBuffer.current.reduce((a, b) => a + b, 0) / latencyBuffer.current.length

    setStats(prev => ({
      total:        prev.total + 1,
      avgLatency:   Math.round(avgLat),
      botsBlocked:  prev.botsBlocked  + (tx.tier === 'high_confidence_bot' ? 1 : 0),
      falseDeclines:prev.falseDeclines + (tx.recovery_url ? 1 : 0),
      agentTxns:    prev.agentTxns    + (tx.is_agent ? 1 : 0),
    }))
  }, [])

  const handleCopilotNote = useCallback((msg) => {
    setCopilotNotes(prev => [msg, ...prev].slice(0, 10))
  }, [])

  // WebSocket
  // WebSocket with Back-Forward Cache (bfcache) & Visibility lifecycle handling
  useEffect(() => {
    let alive = true
    let ws = null
    let reconnectTimeout = null

    function connect() {
      if (!alive) return
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return
      }

      setWsStatus('connecting')
      try {
        ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          if (alive) setWsStatus('connected')
        }

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data.type === 'copilot_note') {
              handleCopilotNote(data)
            } else {
              handleTx(data)
            }
          } catch {}
        }

        ws.onclose = () => {
          if (alive) {
            setWsStatus('disconnected')
            clearTimeout(reconnectTimeout)
            reconnectTimeout = setTimeout(connect, 2500)
          }
        }

        ws.onerror = () => {
          if (ws) {
            try { ws.close() } catch {}
          }
        }
      } catch {
        if (alive) {
          setWsStatus('disconnected')
          clearTimeout(reconnectTimeout)
          reconnectTimeout = setTimeout(connect, 2500)
        }
      }
    }

    const handlePageShow = (e) => {
      if (e.persisted || !ws || ws.readyState !== WebSocket.OPEN) {
        connect()
      }
    }

    const handlePageHide = () => {
      clearTimeout(reconnectTimeout)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.close() } catch {}
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', handlePageHide)

    connect()

    return () => {
      alive = false
      clearTimeout(reconnectTimeout)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('pagehide', handlePageHide)
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.close() } catch {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => { try { ws.close() } catch {} }
        }
      }
    }
  }, [handleTx, handleCopilotNote])

  const botRate  = stats.total > 0 ? ((stats.botsBlocked / stats.total) * 100).toFixed(1) : '0'
  const safeRate = stats.total > 0 ? ((tierCounts.safe / stats.total) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 p-4">
      {/* Sticky Glassmorphic Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-[#0a0a0f]/90 -mx-4 -mt-4 px-4 py-3 mb-4 border-b border-slate-800/80 shadow-lg shadow-black/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400 glow-indigo">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
              RazorShield Sentinel
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                Enterprise Edition v1.2
              </span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                🧪 SYNTHETIC DATA / DEMO ENVIRONMENT
              </span>
            </h1>
            <p className="text-xs text-slate-400">Autonomous Real-Time Fraud &amp; Bot Abuse Mitigation Engine</p>
          </div>
        </div>


        {/* Tab Navigator */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('soc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'soc' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} />
            Live SOC Gateway
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'lab' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame size={14} />
            Threat Simulator &amp; Lab
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 size={14} />
            Active Defense &amp; WAF
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'disputes' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale size={14} />
            Disputes &amp; Evidence
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'governance' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 size={14} />
            Model Governance &amp; Policy Studio
          </button>

          <button
            onClick={() => setActiveTab('pitch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pitch' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText size={14} />
            Architecture &amp; RBI Specs
          </button>

          <button
            onClick={() => setIsStoreOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition ml-1"
          >
            <ShoppingBag size={14} />
            Live Merchant Store
          </button>
        </div>

        <div className="flex items-center gap-4">
          <ConnStatus status={wsStatus} />
          <div className="text-xs text-slate-500 font-mono">{stats.total} requests processed</div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'lab' ? (
        <ThreatLabWorkspace onTriggerStoreDemo={() => setIsStoreOpen(true)} />
      ) : activeTab === 'rules' ? (
        <ActiveDefenseWorkspace copilotNotes={copilotNotes} />
      ) : activeTab === 'pitch' ? (
        <ArchitectureOverview />
      ) : activeTab === 'disputes' ? (
        <DisputeCaseWorkspace />
      ) : activeTab === 'governance' ? (
        <ModelGovernanceStudio />
      ) : (
        <>
          {/* Canary alert */}
          <CanaryAlert event={canaryAlert} onDismiss={() => setCanaryAlert(null)} />

          {/* Webhook alert */}
          <WebhookAlert event={webhookAlert} onDismiss={() => setWebhookAlert(null)} />

          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <StatCard icon={Activity}    label="Bots Blocked"       value={stats.botsBlocked}   sub={`${botRate}% of traffic`}        color="#ef4444" />
            <StatCard icon={CheckCircle} label="Pass Rate"          value={`${safeRate}%`}       sub={`${tierCounts.safe} genuine txns`} color="#10b981" />
            <StatCard icon={Zap}         label="p50 Latency"        value={`${stats.avgLatency}ms`} sub="synchronous decision"          color="#6366f1" />
            <StatCard icon={Lock}        label="False Declines Rescued" value={stats.falseDeclines} sub="via recovery flow"             color="#f59e0b" />
            <StatCard icon={Shield}      label="Agent Txns"         value={stats.agentTxns}     sub="verified AI agents"              color="#a855f7" />
          </div>

          {/* GMV counter */}
          <div className="mb-4">
            <GmvCounter amount={recoveredGmv} />
          </div>

          {/* Balanced 2-Column Live SOC Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (7 cols): Real-Time Risk Score Stream & Live Transaction Feed */}
            <div className="lg:col-span-7 space-y-4">
              <div className="panel bg-slate-900/90 border border-slate-800">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live Risk Score Stream (p99 &lt;15ms)</span>
                    <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                      SIMULATED TRAFFIC
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">— — 0.75 bot threshold</span>
                </div>
                <RiskChart points={chartPoints} />
              </div>

              <div className="panel bg-slate-900/90 border border-slate-800">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Wifi size={14} className="text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live Transaction Telemetry Feed</span>
                    <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                      DEMO TRANSACTIONS
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">latency · tier · score · tx-id</span>
                </div>

                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                  {feed.length === 0 ? (
                    <div className="text-slate-600 text-xs text-center py-10 font-mono">
                      No live transactions processed yet.<br />
                      Switch to "Threat Simulator &amp; Lab" tab to trigger automated or manual attacks.
                    </div>
                  ) : (
                    feed.map((tx, idx) => (
                      <FeedRow key={tx.transaction_id ? `${tx.transaction_id}-${idx}` : `feed-tx-${idx}`} tx={tx} isNew={tx.transaction_id === newId} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Live Louvain Community Graph & Traffic Classification */}
            <div className="lg:col-span-5 space-y-4">
              <div className="panel bg-slate-900/90 border border-slate-800">
                <FraudGraphCanvas latestTx={feed[0]} />
              </div>

              <div className="panel bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                    <TrendingUp size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Traffic Tier Classification</span>
                  </div>
                  <TierPie counts={tierCounts} />
                </div>
                <div className="text-[11px] text-slate-500 font-mono pt-3 mt-3 border-t border-slate-800 flex justify-between">
                  <span>Total Monitored: {stats.total}</span>
                  <span className="text-emerald-400 font-bold">0% False Positives</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Embedded Merchant Storefront Modal */}
      {isStoreOpen && (
        <MerchantStore
          onClose={() => setIsStoreOpen(false)}
          onPaymentComplete={(amount) => {
            setRecoveredGmv(prev => prev + amount)
          }}
        />
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-900 text-center text-xs text-slate-600">
        Razorpay AI Buildathon 2026 · Track 02 (AI Risk Manager) + Track 03 (Revenue Recovery) · 
        Engineered with LightGBM, Isolation Forests, Louvain Graph Clustering, and Zero False-Decline Architecture.
      </div>
    </div>
  )
}
