import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Shield, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2,
  ArrowRight, Search, Play, Pause, Clock, ChevronRight, Network, Bot, Package, Swords,
  Layers, Percent
} from 'lucide-react'

// ?? 8 Dedicated Modular Pages ??
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import RiskIntelligencePage from './pages/RiskIntelligencePage'
import ModelEvaluationPage from './pages/ModelEvaluationPage'
import SyndicatesPage from './pages/SyndicatesPage'
import AttackSimulatorPage from './pages/AttackSimulatorPage'
import ArchitecturePage from './pages/ArchitecturePage'
import AuditLogPage from './pages/AuditLogPage'

// ?? Persistent Modals & Drawers ??
import MerchantStore from './components/MerchantStore'
import TransactionDetailDrawer from './components/TransactionDetailDrawer'
import ExecutiveGuideModal from './components/ExecutiveGuideModal'
import StressBenchmarkModal from './components/StressBenchmarkModal'
import CopilotIncidentRoom from './components/CopilotIncidentRoom'
import IntegrationExportModal from './components/IntegrationExportModal'

import { API_BASE, WS_URL } from './config'

const MAX_FEED_ITEMS = 120
const MAX_CHART_POINTS = 60

// ??? Semantic Risk Tier Metadata ???????????????????????????????????????????????
const TIER_META = {
  safe:                { label: 'SAFE',           color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '?' },
  soft_risk:           { label: 'SOFT RISK',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '?' },
  elevated_review:     { label: 'ELEVATED',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '??' },
  high_confidence_bot: { label: 'BOT BLOCKED',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: '??' },
  verified_agent:      { label: 'VERIFIED AGENT', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '??' },
}

function tierMeta(tier) {
  return TIER_META[tier] ?? { label: tier, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '?' }
}

// ??? 8 Route Tabs Configuration ????????????????????????????????????????????????
const NAV_TABS = [
  { id: 'dashboard',         label: 'Dashboard',         icon: LayoutDashboard, key: '1' },
  { id: 'transactions',      label: 'Transactions',      icon: Layers,          key: '2' },
  { id: 'risk-intelligence', label: 'Risk Intelligence', icon: Percent,         key: '3' },
  { id: 'model-evaluation',  label: 'Model Evaluation',  icon: BarChart3,       key: '4' },
  { id: 'syndicates',        label: 'Syndicates Graph',  icon: Network,         key: '5' },
  { id: 'simulator',         label: 'Attack Simulator',  icon: Flame,           key: '6' },
  { id: 'architecture',      label: 'Architecture',      icon: FileText,        key: '7' },
  { id: 'audit-log',         label: 'Audit & Disputes',  icon: Scale,           key: '8' },
]

const INITIAL_SEED_TRANSACTIONS = [
  {
    transaction_id: "tx_live_98124", timestamp: Date.now() - 12000, amount: 3499.0, latency_ms: 8.4,
    bin6: "453275", card_hash: "c_hdfc_9918", user_id: "usr_mumbai_99", ip_address: "103.21.244.12",
    tier: "safe", risk_score: 0.042, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "Standard legitimate customer checkout with normal velocity and valid browser biometrics."
  },
  {
    transaction_id: "tx_live_98125", timestamp: Date.now() - 25000, amount: 15.0, latency_ms: 11.2,
    bin6: "522222", card_hash: "c_stolen_4412", user_id: "usr_bot_01", ip_address: "185.220.101.5",
    tier: "high_confidence_bot", risk_score: 0.892, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "High-velocity micro-testing burst on rotating datacenter proxy (12 requests/min). Quarantined by Layer 0 Tarpit."
  },
  {
    transaction_id: "tx_live_98126", timestamp: Date.now() - 42000, amount: 1.0, latency_ms: 4.1,
    bin6: "400000", card_hash: "canary_pan_002", user_id: "usr_probe_77", ip_address: "45.154.255.88",
    tier: "high_confidence_bot", risk_score: 1.000, payment_method: "CARD", is_canary: true, is_agent: false,
    explanation: "CRITICAL: Triggered Luhn-valid Canary Honeytoken card (4000000000000002). Mathematical Zero-FPR trap."
  },
  {
    transaction_id: "tx_live_98127", timestamp: Date.now() - 65000, amount: 28999.0, latency_ms: 9.8,
    bin6: "411111", card_hash: "c_traveler_102", user_id: "usr_roaming_44", ip_address: "146.70.180.22",
    tier: "soft_risk", risk_score: 0.540, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "Geo-velocity anomaly (Mumbai -> London in 14 mins). Triggered 3DS2 Challenge Step-Up."
  },
  {
    transaction_id: "tx_live_98128", timestamp: Date.now() - 88000, amount: 1299.0, latency_ms: 7.6,
    bin6: "552140", card_hash: "c_agent_vault_09", user_id: "usr_agent_buyer", ip_address: "35.200.18.90",
    tier: "verified_agent", risk_score: 0.081, payment_method: "CARD", is_canary: false, is_agent: true,
    explanation: "Cryptographically verified Autonomous AI Agent via AP2 attestation header (RSA-4096 signature)."
  },
  {
    transaction_id: "tx_live_98129", timestamp: Date.now() - 110000, amount: 25.0, latency_ms: 12.4,
    bin6: "438628", card_hash: "c_mule_ring_03", user_id: "usr_mule_08", ip_address: "194.26.29.13",
    tier: "high_confidence_bot", risk_score: 0.915, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "Louvain Community Cluster Ring #3 member. CVV cycling fanout across 8 distinct BINs on same device fingerprint."
  },
  {
    transaction_id: "tx_live_98130", timestamp: Date.now() - 145000, amount: 8499.0, latency_ms: 8.9,
    bin6: "607189", card_hash: "vpa_rahul_okhdfc", user_id: "usr_pune_88", ip_address: "115.112.45.9",
    tier: "safe", risk_score: 0.035, payment_method: "UPI", is_canary: false, is_agent: false,
    explanation: "Verified UPI intent checkout. Fast-path clearance under 9ms."
  },
  {
    transaction_id: "tx_live_98131", timestamp: Date.now() - 170000, amount: 10.0, latency_ms: 13.1,
    bin6: "510510", card_hash: "c_bot_tg_44", user_id: "usr_tg_scraper", ip_address: "91.240.118.42",
    tier: "high_confidence_bot", risk_score: 0.942, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "Automated headless Puppeteer runner detected. Keystroke entropy 0.08 and 0ms focus delay."
  },
  {
    transaction_id: "tx_live_98132", timestamp: Date.now() - 210000, amount: 45000.0, latency_ms: 10.2,
    bin6: "471638", card_hash: "c_luxury_992", user_id: "usr_bangalore_12", ip_address: "122.179.32.18",
    tier: "soft_risk", risk_score: 0.580, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "High-value luxury purchase outside customer 30-day baseline. Soft challenge 3DS step-up routed."
  },
  {
    transaction_id: "tx_live_98133", timestamp: Date.now() - 260000, amount: 1999.0, latency_ms: 6.8,
    bin6: "512345", card_hash: "c_sbi_master_77", user_id: "usr_delhi_33", ip_address: "182.73.19.4",
    tier: "safe", risk_score: 0.021, payment_method: "CARD", is_canary: false, is_agent: false,
    explanation: "SBI Global International Debit Card with high trust kinetic curve."
  }
]

export default function App() {
  // ?? URL Hash Routing ??????????????????????????????????????????????????????????
  const getInitialRoute = () => {
    const hash = window.location.hash.replace('#', '').trim()
    const valid = NAV_TABS.find(t => t.id === hash)
    return valid ? valid.id : 'dashboard'
  }

  const [activeTab, setActiveTab] = useState(getInitialRoute)

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId)
    window.location.hash = tabId
  }

  // Sync back/forward browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim()
      const valid = NAV_TABS.find(t => t.id === hash)
      if (valid) setActiveTab(valid.id)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // ?? Telemetry & Ingestion Stream State ?????????????????????????????????????????
  const [stats, setStats] = useState({
    total_evaluated: 24891,
    p99_latency_ms: 11.8,
    total_blocked_inr: 1930500,
    active_canaries: 50,
    normal_fpr: 0.0009,
    edge_fpr: 0.1060,
    catch_rate: 0.9957
  })

  const [tierCounts, setTierCounts] = useState({
    safe: 24100,
    soft_risk: 420,
    high_confidence_bot: 340,
    verified_agent: 31
  })

  const [transactions, setTransactions] = useState(INITIAL_SEED_TRANSACTIONS)
  const [chartData, setChartData] = useState([
    { t: '10:00', safe: 120, high_confidence_bot: 2, soft_risk: 4, avg_latency: 8.2, amount: 25000 },
    { t: '10:15', safe: 145, high_confidence_bot: 5, soft_risk: 8, avg_latency: 9.1, amount: 32000 },
    { t: '10:30', safe: 190, high_confidence_bot: 12, soft_risk: 15, avg_latency: 10.4, amount: 48000 },
    { t: '10:45', safe: 160, high_confidence_bot: 4, soft_risk: 6, avg_latency: 8.7, amount: 35000 },
    { t: '11:00', safe: 210, high_confidence_bot: 8, soft_risk: 9, avg_latency: 9.4, amount: 52000 }
  ])

  const [selectedTx, setSelectedTx] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [wsStatus, setWsStatus] = useState('connected')

  // ?? Global Modals ?????????????????????????????????????????????????????????????
  const [isStoreOpen, setIsStoreOpen] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [copilotNotes, setCopilotNotes] = useState([])

  // ?? WebSocket Ingestion Stream Connection ??????????????????????????????????????
  const wsRef = useRef(null)

  useEffect(() => {
    let ws
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => setWsStatus('connected')
        ws.onclose = () => {
          setWsStatus('disconnected')
          setTimeout(connect, 3000)
        }
        ws.onerror = () => ws.close()

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'transaction' && !isPaused) {
              const tx = data.payload || data
              setTransactions(prev => [tx, ...prev.slice(0, MAX_FEED_ITEMS)])
              setTierCounts(prev => ({
                ...prev,
                [tx.tier || 'safe']: (prev[tx.tier || 'safe'] || 0) + 1
              }))
              setStats(prev => ({
                ...prev,
                total_evaluated: (prev.total_evaluated || 24891) + 1,
                total_blocked_inr: tx.tier === 'high_confidence_bot'
                  ? (prev.total_blocked_inr || 1930500) + (tx.amount || 0)
                  : prev.total_blocked_inr
              }))
            }
          } catch (e) {
            console.error('WS Parse Error:', e)
          }
        }
      } catch (e) {
        setTimeout(connect, 4000)
      }
    }

    connect()
    return () => ws?.close()
  }, [isPaused])

  // ?? Initial Snapshot Ingestion ?????????????????????????????????????????????????
  const fetchSnapshot = useCallback(async () => {
    try {
      // 1. Fetch live metrics
      const res = await fetch(`${API_BASE}/metrics/summary`).catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (data.stats) setStats(prev => ({ ...prev, ...data.stats }))
        if (data.tier_counts) setTierCounts(prev => ({ ...prev, ...data.tier_counts }))
      }

      // 2. Fetch recent transactions buffer
      const txRes = await fetch(`${API_BASE}/api/transactions/recent`).catch(() => null)
      if (txRes && txRes.ok) {
        const txData = await txRes.json()
        if (Array.isArray(txData) && txData.length > 0) {
          setTransactions(txData)
          if (!selectedTx) setSelectedTx(txData[0])
        }
      }
    } catch (e) {
      console.warn('API Snapshot fetch fallback:', e)
    }
  }, [selectedTx])

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, 10000)
    return () => clearInterval(interval)
  }, [fetchSnapshot])

  // ?? Global Keyboard Hotkeys ????????????????????????????????????????????????????
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger hotkeys if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

      const key = e.key.toUpperCase()

      // 1 to 8: Direct route switcher
      if (e.key >= '1' && e.key <= '8') {
        const tabIdx = parseInt(e.key, 10) - 1
        if (NAV_TABS[tabIdx]) {
          handleSelectTab(NAV_TABS[tabIdx].id)
        }
      } else if (key === 'S') {
        setIsStoreOpen(prev => !prev)
      } else if (key === 'C') {
        setIsCopilotOpen(prev => !prev)
      } else if (key === 'B') {
        setIsBenchmarkOpen(prev => !prev)
      } else if (key === 'E') {
        setIsExportOpen(prev => !prev)
      } else if (e.key === '?') {
        setIsGuideOpen(prev => !prev)
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused(prev => !prev)
      } else if (e.key === 'Escape') {
        setIsStoreOpen(false)
        setIsCopilotOpen(false)
        setIsGuideOpen(false)
        setIsBenchmarkOpen(false)
        setIsExportOpen(false)
        setSelectedTx(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="aura-container min-h-screen text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* ?? Layer 1 & 2: Aura Gradient Background ?? */}
      <div className="aura-layer-1" aria-hidden="true" />
      <div className="aura-layer-2" aria-hidden="true" />

      {/* ?? Layer 3: Film-Grain Overlay ?? */}
      <div className="aura-grain" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0.181 0.608 0.061 0 0.075
                      0.181 0.608 0.061 0 0.075
                      0.181 0.608 0.061 0 0.075
                      0     0     0     1 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* ?? Page Content Container ?? */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Sticky 1-Row Glassmorphic Top Navbar */}
        <header className="sticky top-0 z-40 glass-nav px-4 lg:px-8 py-2.5 transition-all">
          <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-3">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => handleSelectTab('dashboard')}>
              <div className="p-2 bg-indigo-500/15 border border-indigo-400/30 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/40">
                <Shield size={20} className="text-indigo-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-tight font-sans">
                  RazorShield Sentinel
                </span>
                <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold hidden sm:inline">
                  Enterprise SOC v1.2
                </span>
              </div>
            </div>

            {/* Center: 8 Categorized Tab Navigation Pills */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/[0.08] shadow-inner overflow-x-auto">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                    title={`Shortcut: Press ${tab.key}`}
                  >
                    <Icon size={12} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                    <kbd className="text-[9px] font-mono opacity-50 ml-0.5 hidden 2xl:inline">{tab.key}</kbd>
                  </button>
                )
              })}
            </nav>

            {/* Right: Quick Action Hub & Status Indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsStoreOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition shadow-sm"
                title="Open Live Merchant Store (S)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Store</span>
              </button>

              <button
                onClick={() => setIsCopilotOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/40 transition shadow-sm"
                title="Open AI Copilot (C)"
              >
                <Bot size={13} className="text-pink-400 animate-pulse" />
                <span className="hidden sm:inline">AI Copilot</span>
              </button>

              {/* Quick Tools Icons */}
              <div className="flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded-lg border border-white/[0.06]">
                <button
                  onClick={() => setIsBenchmarkOpen(true)}
                  className="p-1.5 rounded-md text-amber-400 hover:bg-amber-500/15 transition"
                  title="Run SLA Stress Benchmark (B)"
                >
                  <Zap size={13} />
                </button>
                <button
                  onClick={() => setIsExportOpen(true)}
                  className="p-1.5 rounded-md text-cyan-400 hover:bg-cyan-500/15 transition"
                  title="SDK & WAF Exporter (E)"
                >
                  <Package size={13} />
                </button>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="p-1.5 rounded-md text-indigo-400 hover:bg-indigo-500/15 transition"
                  title="1-Min Guided Tour (?)"
                >
                  <Sparkles size={13} />
                </button>
              </div>

              <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-white/[0.08]">
                <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={wsStatus === 'connected' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {wsStatus === 'connected' ? 'GATEWAY LIVE' : 'RECONNECTING'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Secondary Sub-Nav */}
          <div className="flex lg:hidden overflow-x-auto gap-1 pt-2 pb-1 border-t border-slate-800/80 mt-2">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={11} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </header>

        {/* ?? Main Workspace Content Area (Renders Active Sub-Page) ?? */}
        <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && (
            <DashboardPage
              stats={stats}
              tierCounts={tierCounts}
              chartData={chartData}
              transactions={transactions}
              selectedTx={selectedTx}
              setSelectedTx={setSelectedTx}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              onOpenCopilot={(tx) => { setSelectedTx(tx); setIsCopilotOpen(true); }}
              onOpenStore={() => setIsStoreOpen(true)}
              tierMetaFn={tierMeta}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsPage
              transactions={transactions}
              selectedTx={selectedTx}
              setSelectedTx={setSelectedTx}
              tierMetaFn={tierMeta}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              onOpenCopilot={(tx) => { setSelectedTx(tx); setIsCopilotOpen(true); }}
            />
          )}

          {activeTab === 'risk-intelligence' && (
            <RiskIntelligencePage />
          )}

          {activeTab === 'model-evaluation' && (
            <ModelEvaluationPage />
          )}

          {activeTab === 'syndicates' && (
            <SyndicatesPage />
          )}

          {activeTab === 'simulator' && (
            <AttackSimulatorPage onOpenStore={() => setIsStoreOpen(true)} />
          )}

          {activeTab === 'architecture' && (
            <ArchitecturePage />
          )}

          {activeTab === 'audit-log' && (
            <AuditLogPage copilotNotes={copilotNotes} />
          )}
        </main>

        {/* ?? Persistent Modals & Drawers ?? */}
        {/* 1. Transaction Detail & Explainability Drawer */}
        {selectedTx && (
          <TransactionDetailDrawer
            tx={selectedTx}
            onClose={() => setSelectedTx(null)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        )}

        {/* 2. Interactive Merchant Storefront Modal */}
        {isStoreOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
              <button
                onClick={() => setIsStoreOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800 rounded-xl border border-slate-800 transition z-20"
              >
                ?
              </button>
              <MerchantStore />
            </div>
          </div>
        )}

        {/* 3. AI Copilot Incident Room Modal */}
        {isCopilotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
              <button
                onClick={() => setIsCopilotOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800 rounded-xl border border-slate-800 transition z-20"
              >
                ?
              </button>
              <CopilotIncidentRoom
                selectedTx={selectedTx}
                onAddRule={(rule) => setCopilotNotes(prev => [...prev, rule])}
              />
            </div>
          </div>
        )}

        {/* 4. Stress Benchmark SLA Modal */}
        {isBenchmarkOpen && (
          <StressBenchmarkModal onClose={() => setIsBenchmarkOpen(false)} />
        )}

        {/* 5. Integration SDK & WAF Export Modal */}
        {isExportOpen && (
          <IntegrationExportModal onClose={() => setIsExportOpen(false)} />
        )}

        {/* 6. 1-Minute Guided Tour Modal */}
        {isGuideOpen && (
          <ExecutiveGuideModal
            onClose={() => setIsGuideOpen(false)}
            onOpenStore={() => { setIsGuideOpen(false); setIsStoreOpen(true); }}
            onOpenLab={() => { setIsGuideOpen(false); handleSelectTab('simulator'); }}
          />
        )}
      </div>
    </div>
  )
}
