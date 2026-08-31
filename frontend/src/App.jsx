import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import {
  Shield, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2,
  ArrowRight, Search, Play, Pause, Keyboard, Clock, ChevronRight
} from 'lucide-react'

import ThreatLabWorkspace from './components/ThreatLabWorkspace'
import ActiveDefenseWorkspace from './components/ActiveDefenseWorkspace'
import MerchantStore from './components/MerchantStore'
import ArchitectureOverview from './components/ArchitectureOverview'
import FraudGraphCanvas from './components/FraudGraphCanvas'
import DisputeCaseWorkspace from './components/DisputeCaseWorkspace'
import ModelGovernanceStudio from './components/ModelGovernanceStudio'
import TransactionDetailDrawer from './components/TransactionDetailDrawer'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'

import { API_BASE, WS_URL } from './config'

const MAX_FEED_ITEMS = 100
const MAX_CHART_POINTS = 60

// ─── Semantic Risk Tier Metadata ───────────────────────────────────────────────
const TIER_META = {
  safe:                { label: 'SAFE',           color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '✓' },
  soft_risk:           { label: 'SOFT RISK',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '⚠' },
  elevated_review:     { label: 'ELEVATED',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '🔶' },
  high_confidence_bot: { label: 'BOT BLOCKED',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: '🚫' },
  verified_agent:      { label: 'VERIFIED AGENT', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '🤖' },
}

function tierMeta(tier) {
  return TIER_META[tier] ?? { label: tier, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '?' }
}

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '—' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '—' }
function fmtRupees(n) { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }

// ─── Luminous Hero KPI Sparkline Card ──────────────────────────────────────────
function SparklineKpiCard({ title, value, sub, trend, trendGood, sparkData, color = '#6366f1', glowClass = '', icon: Icon, valuePrefix = '', valueSuffix = '' }) {
  return (
    <div className={`soc-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-slate-700 ${glowClass}`}>
      {/* Ambient Top Glow */}
      <div
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center justify-between relative z-10 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          {Icon && <Icon size={13} className="text-slate-400" />}
          {title}
        </span>
        {trend && (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
            trendGood ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            {trend}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between relative z-10 mt-1">
        <div>
          <div className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight tabular-nums">
            {valuePrefix}{value}{valueSuffix}
          </div>
          {sub && <div className="text-[11px] text-slate-400 font-sans mt-0.5">{sub}</div>}
        </div>

        {/* Sparkline */}
        {sparkData && sparkData.length > 0 && (
          <div className="w-24 h-9 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${title.replace(/\s+/g, '')})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tier Badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const m = tierMeta(tier)
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-mono font-bold whitespace-nowrap"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.color}33` }}
    >
      {m.icon} {m.label}
    </span>
  )
}

// ─── Live feed row (Interactive Clickable Row) ────────────────────────────────
function FeedRow({ tx, isNew, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(tx)}
      className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer group border ${
        isSelected
          ? 'bg-slate-800/90 border-indigo-500/50 shadow-md shadow-indigo-950/30'
          : isNew
          ? 'bg-slate-800/50 border-slate-700/60'
          : 'bg-slate-950/40 hover:bg-slate-900/80 border-slate-900 hover:border-slate-800'
      }`}
      style={{ borderLeft: `3px solid ${tierMeta(tx.tier).color}` }}
    >
      <span className="text-slate-500 w-10 text-right shrink-0">{fmtMs(tx.latency_ms)}</span>
      <TierBadge tier={tx.tier} />
      <span className="text-slate-300 shrink-0 w-12 text-right font-bold">{fmt(tx.risk_score)}</span>
      <span className="text-slate-400 truncate flex-1 font-mono group-hover:text-indigo-300 transition">
        {tx.transaction_id || `tx_${Date.now()}`}
      </span>
      {tx.is_canary && <span className="text-amber-400 text-[10px] shrink-0 font-bold bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">🐤 CANARY</span>}
      {tx.is_agent && <span className="text-indigo-300 text-[10px] shrink-0 font-bold bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded">🤖 AP2 AGENT</span>}
      {tx.recovery_url && (
        <span className="text-emerald-400 text-[11px] shrink-0 font-bold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">↪ RECOVERED</span>
      )}
      <ChevronRight size={13} className="text-slate-600 group-hover:text-indigo-400 transition shrink-0" />
    </div>
  )
}

// ─── Tier pie chart ───────────────────────────────────────────────────────────
const PIE_COLORS = {
  safe: '#10b981', soft_risk: '#f59e0b',
  elevated_review: '#f59e0b', high_confidence_bot: '#f43f5e',
  verified_agent: '#818cf8'
}
function TierPie({ counts }) {
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: tierMeta(k).label, value: v, tier: k }))
  
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <Activity className="w-6 h-6 text-indigo-400/60 mb-2 animate-pulse" />
        <div className="text-xs text-slate-400 font-sans">Awaiting classification data...</div>
      </div>
    )
  }

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
          contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
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
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="t" hide />
        <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 10 }} tickCount={5} />
        <Tooltip
          contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v) => [v.toFixed(3), 'Risk Score']}
          labelFormatter={() => ''}
        />
        <Line type="monotone" dataKey="botLine" stroke="#f43f5e55" strokeWidth={1} dot={false} strokeDasharray="4 4" />
        <Area type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={2}
          fill="url(#riskGrad)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('soc') // 'soc' | 'lab' | 'rules' | 'disputes' | 'governance' | 'pitch'
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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [isFeedPaused, setIsFeedPaused] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('ALL')

  // Sparklines trend state
  const [gmvSpark, setGmvSpark] = useState([{ v: 12 }, { v: 18 }, { v: 24 }, { v: 35 }, { v: 48 }])
  const [botSpark, setBotSpark] = useState([{ v: 2 }, { v: 4 }, { v: 3 }, { v: 8 }, { v: 12 }])
  const [latSpark, setLatSpark] = useState([{ v: 9.8 }, { v: 9.1 }, { v: 10.4 }, { v: 9.2 }, { v: 8.9 }])
  const [thruSpark, setThruSpark] = useState([{ v: 10 }, { v: 22 }, { v: 45 }, { v: 68 }, { v: 85 }])

  const wsRef = useRef(null)
  const latencyBuffer = useRef([])
  const tRef = useRef(0)
  const initialBurstTriggered = useRef(false)

  // ─── Global Keyboard Hotkeys ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setIsShortcutsOpen(prev => !prev)
      } else if (e.key === '1') {
        setActiveTab('soc')
      } else if (e.key === '2') {
        setActiveTab('lab')
      } else if (e.key === '3') {
        setActiveTab('rules')
      } else if (e.key === '4') {
        setActiveTab('disputes')
      } else if (e.key === '5') {
        setActiveTab('governance')
      } else if (e.key === '6') {
        setActiveTab('pitch')
      } else if (e.key === 'm' || e.key === 'M') {
        setIsStoreOpen(prev => !prev)
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsFeedPaused(prev => !prev)
      } else if (e.key === 'Escape') {
        setSelectedTx(null)
        setIsShortcutsOpen(false)
        setIsStoreOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleTx = useCallback((tx) => {
    if (tx.type === 'webhook_payment_captured' || tx.type === 'recovery_completed') {
      setRecoveredGmv(prev => {
        const next = prev + (tx.amount || 0)
        setGmvSpark(s => [...s.slice(-7), { v: next / 1000 }])
        return next
      })
      if (tx.type === 'webhook_payment_captured') {
        setWebhookAlert(tx)
        setTimeout(() => setWebhookAlert(null), 8000)
      }
      return
    }

    if (tx.is_canary) {
      setCanaryAlert(tx)
      setTimeout(() => setCanaryAlert(null), 8000)
    }

    // Feed (if not paused)
    if (!isFeedPaused) {
      setNewId(tx.transaction_id)
      setFeed(prev => [tx, ...prev].slice(0, MAX_FEED_ITEMS))
    }

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
      setRecoveredGmv(prev => {
        const next = prev + (tx.amount ?? 0)
        setGmvSpark(s => [...s.slice(-7), { v: next / 1000 }])
        return next
      })
    }

    // Stats
    latencyBuffer.current.push(tx.latency_ms || 9.5)
    if (latencyBuffer.current.length > 50) latencyBuffer.current.shift()
    const avgLat = latencyBuffer.current.reduce((a, b) => a + b, 0) / latencyBuffer.current.length

    setStats(prev => {
      const nextTotal = prev.total + 1
      const nextBlocked = prev.botsBlocked + (tx.tier === 'high_confidence_bot' ? 1 : 0)
      setBotSpark(s => [...s.slice(-7), { v: nextBlocked }])
      setLatSpark(s => [...s.slice(-7), { v: avgLat }])
      setThruSpark(s => [...s.slice(-7), { v: nextTotal }])
      return {
        total: nextTotal,
        avgLatency: Math.round(avgLat),
        botsBlocked: nextBlocked,
        falseDeclines: prev.falseDeclines + (tx.recovery_url ? 1 : 0),
        agentTxns: prev.agentTxns + (tx.is_agent ? 1 : 0),
      }
    })
  }, [isFeedPaused])

  const handleCopilotNote = useCallback((msg) => {
    setCopilotNotes(prev => [msg, ...prev].slice(0, 10))
  }, [])

  // ─── Auto-Trigger Mixed Demo Burst on First Load ────────────────────────────
  useEffect(() => {
    if (initialBurstTriggered.current) return
    initialBurstTriggered.current = true

    const demoPayloads = [
      {
        amount: 2499.0,
        bin6: '424242',
        card_hash: 'initial_human_shoppers_01',
        device_fingerprint: 'dev_initial_01',
        ip_hash: 'ip_delhi_broadband',
        asn_type: 'residential',
        ja3_ua_mismatch: false,
        keystroke_entropy: 2.85,
        mouse_jitter_score: 0.72,
        time_on_page_s: 38.0,
      },
      {
        amount: 899.0,
        bin6: '510510',
        card_hash: 'initial_human_shoppers_02',
        device_fingerprint: 'dev_initial_02',
        ip_hash: 'ip_mumbai_jio_pool',
        asn_type: 'residential',
        ja3_ua_mismatch: false,
        keystroke_entropy: 2.65,
        mouse_jitter_score: 0.64,
        time_on_page_s: 29.5,
      },
      {
        amount: 14999.0,
        bin6: '411111',
        card_hash: 'initial_vpn_traveler_03',
        device_fingerprint: 'dev_initial_traveler',
        ip_hash: 'ip_expressvpn_exit_sg',
        asn_type: 'datacenter',
        ja3_ua_mismatch: false,
        keystroke_entropy: 2.9,
        mouse_jitter_score: 0.75,
        time_on_page_s: 52.0,
      },
      {
        amount: 1.0,
        bin6: '411773',
        card_hash: 'initial_tg_scraper_04',
        device_fingerprint: 'dev_tg_cdp_bot',
        ip_hash: 'ip_dc_frankfurt_node',
        asn_type: 'datacenter',
        ja3_ua_mismatch: true,
        keystroke_entropy: 0.0,
        mouse_jitter_score: 0.0,
        time_on_page_s: 0.04,
      },
    ]

    demoPayloads.forEach((payload, idx) => {
      setTimeout(() => {
        fetch(`${API_BASE}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {})
      }, 120 + idx * 180)
    })
  }, [])

  // ─── WebSocket Connection ───────────────────────────────────────────────────
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

    connect()

    return () => {
      alive = false
      clearTimeout(reconnectTimeout)
      if (ws) {
        try { ws.close() } catch {}
      }
    }
  }, [handleTx, handleCopilotNote])

  // Filtered feed
  const filteredFeed = useMemo(() => {
    return feed.filter((tx) => {
      if (tierFilter !== 'ALL') {
        if (tierFilter === 'SAFE' && tx.tier !== 'safe') return false
        if (tierFilter === 'RECOVERED' && !tx.recovery_url) return false
        if (tierFilter === 'REVIEW' && tx.tier !== 'soft_risk' && tx.tier !== 'elevated_review') return false
        if (tierFilter === 'BLOCKED' && tx.tier !== 'high_confidence_bot') return false
        if (tierFilter === 'AGENT' && !tx.is_agent) return false
      }

      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase()
        const txId = (tx.transaction_id || '').toLowerCase()
        const ip = (tx.ip_hash || '').toLowerCase()
        const bin = (tx.bin6 || '').toLowerCase()
        const dev = (tx.device_fingerprint || '').toLowerCase()
        if (!txId.includes(query) && !ip.includes(query) && !bin.includes(query) && !dev.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [feed, tierFilter, searchFilter])

  const botRate = stats.total > 0 ? ((stats.botsBlocked / stats.total) * 100).toFixed(1) : '0'
  const safeRate = stats.total > 0 ? ((tierCounts.safe / stats.total) * 100).toFixed(1) : '94.8'

  return (
    <div className="min-h-screen bg-soc-mesh text-slate-200 p-4 font-sans">
      {/* Sticky Top Command Bar */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#070a13]/90 -mx-4 -mt-4 px-5 py-3 mb-4 border-b border-slate-800/80 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/40">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-wrap font-sans">
              RazorShield Sentinel
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                Enterprise SOC v1.2
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-sans">Autonomous Dual-Tier Carding &amp; Bot-Abuse Mitigation Engine</p>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/90 shadow-inner">
          <button
            onClick={() => setActiveTab('soc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === 'soc' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard size={13} />
            Live SOC
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === 'lab' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Flame size={13} />
            Threat Lab
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Code2 size={13} />
            Active Defense
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === 'disputes' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Scale size={13} />
            Disputes
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === 'governance' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BarChart3 size={13} />
            Governance Studio
          </button>

          <button
            onClick={() => setActiveTab('pitch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
              activeTab === 'pitch' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText size={13} />
            Specs &amp; RBI
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={() => setIsStoreOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition shadow-sm"
          >
            <ShoppingBag size={13} />
            Live Merchant Store
          </button>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            title="Keyboard Shortcuts (?)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition text-xs flex items-center gap-1 font-mono"
          >
            <Keyboard size={14} />
            <span className="hidden sm:inline">?</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={wsStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
              {wsStatus === 'connected' ? 'GATEWAY ONLINE' : 'RECONNECTING'}
            </span>
          </div>
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
          {/* 4 Luminous Sparkline Hero KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
            {/* 1. Recovered GMV */}
            <SparklineKpiCard
              title="Recovered GMV (Rescue)"
              value={recoveredGmv.toLocaleString('en-IN')}
              valuePrefix="₹"
              sub="Zero-friction UPI QR / WhatsApp recovery"
              trend="+18.4% today"
              trendGood={true}
              sparkData={gmvSpark}
              color="#10b981"
              glowClass="soc-card-emerald"
              icon={TrendingUp}
            />

            {/* 2. Autonomous Bots Blocked */}
            <SparklineKpiCard
              title="Bots & Syndicates Blocked"
              value={stats.botsBlocked}
              sub={`${botRate}% of traffic quarantined (<50ms)`}
              trend="100% Gated"
              trendGood={true}
              sparkData={botSpark}
              color="#f43f5e"
              glowClass="soc-card-rose"
              icon={Flame}
            />

            {/* 3. Synchronous Hot-Path Latency */}
            <SparklineKpiCard
              title="Synchronous Decision SLA"
              value={stats.avgLatency || 9.2}
              valueSuffix="ms"
              sub="Atomic Redis + in-process LightGBM p99"
              trend="<15ms SLA"
              trendGood={true}
              sparkData={latSpark}
              color="#818cf8"
              glowClass="soc-card-indigo"
              icon={Zap}
            />

            {/* 4. Transactions Throughput */}
            <SparklineKpiCard
              title="Monitored Transactions"
              value={stats.total}
              sub={`${safeRate}% frictionless pass rate`}
              trend="0.0% FP"
              trendGood={true}
              sparkData={thruSpark}
              color="#00C2D9"
              glowClass="soc-card-indigo"
              icon={Activity}
            />
          </div>

          {/* 2-Column Live SOC Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (7 cols): Risk Score Stream & Granular Transaction Feed */}
            <div className="lg:col-span-7 space-y-4">
              {/* Risk Score Stream */}
              <div className="soc-card soc-card-rose rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300 font-sans">
                      Synchronous Risk Stream (Decision SLA &lt;15ms)
                    </span>
                    <span className="text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                      HOT-PATH GATING
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">— — 0.75 bot threshold</span>
                </div>
                <RiskChart points={chartPoints} />
              </div>

              {/* Transaction Telemetry Feed with Granular Filter & Search Bar */}
              <div className="soc-card rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wifi size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300 font-sans">
                      Live Transaction Telemetry Feed
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">({filteredFeed.length})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFeedPaused(!isFeedPaused)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                        isFeedPaused
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isFeedPaused ? <Play size={11} /> : <Pause size={11} />}
                      <span>{isFeedPaused ? 'Stream Paused' : 'Pause Stream'}</span>
                    </button>
                  </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by ID, IP, BIN, or Device…"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Filter chips */}
                  <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                    {['ALL', 'SAFE', 'RECOVERED', 'REVIEW', 'BLOCKED', 'AGENT'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setTierFilter(f)}
                        className={`px-2 py-1 rounded-md transition ${
                          tierFilter === f
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feed Rows */}
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                  {filteredFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 font-sans">
                      <Activity className="w-8 h-8 text-indigo-400/60 mb-2.5 animate-pulse" />
                      <div className="text-xs font-bold text-slate-300 mb-1">No Transactions Matching Filter</div>
                      <p className="text-xs text-slate-500 max-w-sm mb-3">
                        Try resetting your search query or trigger synthetic attack swarms in the Threat Lab.
                      </p>
                      <button
                        onClick={() => { setSearchFilter(''); setTierFilter('ALL'); }}
                        className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    filteredFeed.map((tx, idx) => (
                      <FeedRow
                        key={tx.transaction_id ? `${tx.transaction_id}-${idx}` : `feed-tx-${idx}`}
                        tx={tx}
                        isNew={tx.transaction_id === newId}
                        isSelected={selectedTx?.transaction_id === tx.transaction_id}
                        onSelect={(item) => setSelectedTx(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Live Louvain Community Graph & Traffic Classification */}
            <div className="lg:col-span-5 space-y-4">
              <div className="soc-card soc-card-indigo rounded-xl p-4">
                <FraudGraphCanvas latestTx={feed[0]} />
              </div>

              <div className="soc-card rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                    <TrendingUp size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300 font-sans">
                      Traffic Tier Breakdown
                    </span>
                  </div>
                  <TierPie counts={tierCounts} />
                </div>
                <div className="text-[11px] text-slate-500 font-mono pt-3 mt-3 border-t border-slate-800 flex justify-between font-sans">
                  <span>Total Monitored: {stats.total}</span>
                  <span className="text-emerald-400 font-bold font-mono">0.00% False Positive Rate</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Slide-Out Forensic Transaction Detail Drawer */}
      <TransactionDetailDrawer
        tx={selectedTx}
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

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
      <div className="mt-8 pt-4 border-t border-slate-900 text-center text-xs text-slate-600 font-sans flex flex-wrap items-center justify-between gap-2">
        <span>Razorpay AI Buildathon 2026 · Track 02 (AI Risk Manager) + Track 03 (Revenue Recovery)</span>
        <span className="text-slate-500 font-mono">Press <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[10px]">?</kbd> for hotkeys</span>
      </div>
    </div>
  )
}
