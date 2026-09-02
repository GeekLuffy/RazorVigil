import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Shield, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2,
  ArrowRight, Search, Play, Pause, Clock, ChevronRight, Network, Bot, Package, Swords,
  Layers, Percent, Moon, Sun, UserCheck, Cpu, Server
} from 'lucide-react'

// ?? Fixed Left Sidebar ??
import Sidebar, { NAV_SECTIONS } from './components/Sidebar'

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
import GPUClusterModal from './components/GPUClusterModal'

import { API_BASE, WS_URL } from './config'

const MAX_FEED_ITEMS = 120

// ?? Semantic Risk Tier Metadata ??
const TIER_META = {
  safe:                { label: 'SAFE',           color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '✓' },
  soft_risk:           { label: 'SOFT RISK',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '✓' },
  elevated_review:     { label: 'ELEVATED',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '✓' },
  high_confidence_bot: { label: 'BOT BLOCKED',    color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: '✓' },
  verified_agent:      { label: 'VERIFIED AGENT', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '⚡' },
}

function tierMeta(tier) {
  return TIER_META[tier] ?? { label: tier, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '✓' }
}

const ALL_TABS = [
  { id: 'dashboard',         label: 'Command Center' },
  { id: 'transactions',      label: 'Live Ledger HUD' },
  { id: 'syndicates',        label: 'Syndicate Graph' },
  { id: 'risk-intelligence', label: 'Risk Intelligence' },
  { id: 'model-evaluation',  label: 'Model Studio' },
  { id: 'simulator',         label: 'Attack Simulator' },
  { id: 'architecture',      label: 'RBI Architecture' },
  { id: 'audit-log',         label: 'Dispute Cases' },
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
    explanation: "High-velocity micro-testing burst on rotating datacenter proxy. Quarantined by Layer 0 Tarpit."
  },
  {
    transaction_id: "tx_live_98126", timestamp: Date.now() - 42000, amount: 1.0, latency_ms: 4.1,
    bin6: "400000", card_hash: "canary_pan_002", user_id: "usr_probe_77", ip_address: "45.154.255.88",
    tier: "high_confidence_bot", risk_score: 1.000, payment_method: "CARD", is_canary: true, is_agent: false,
    explanation: "CRITICAL: Triggered Luhn-valid Canary Honeytoken card. Mathematical Zero-FPR trap."
  }
]

export default function App() {
  // ?? URL Hash Routing ??
  const getInitialRoute = () => {
    const hash = window.location.hash.replace('#', '').trim()
    const valid = ALL_TABS.find(t => t.id === hash)
    return valid ? valid.id : 'dashboard'
  }

  const [activeTab, setActiveTab] = useState(getInitialRoute)
  const [isDark, setIsDark] = useState(true)
  const [lang, setLang] = useState('EN')

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId)
    window.location.hash = tabId
  }

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev
      if (next) {
        document.body.classList.remove('light-theme')
      } else {
        document.body.classList.add('light-theme')
      }
      return next
    })
  }

  // Sync back/forward browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim()
      const valid = ALL_TABS.find(t => t.id === hash)
      if (valid) setActiveTab(valid.id)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // ?? Telemetry & Ingestion Stream State ??
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

  // ?? Global Modals ??
  const [isStoreOpen, setIsStoreOpen] = useState(false)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isGPUModalOpen, setIsGPUModalOpen] = useState(false)
  const [copilotNotes, setCopilotNotes] = useState([])

  // ?? WebSocket Ingestion Stream Connection ??
  useEffect(() => {
    let ws = null
    let reconnectTimeout = null
    let isSubscribed = true

    const connect = () => {
      if (!isSubscribed) return
      try {
        ws = new WebSocket(WS_URL)
        ws.onopen = () => setWsStatus('connected')
        ws.onerror = () => { try { ws?.close() } catch (_) {} }
        ws.onclose = () => {
          setWsStatus('reconnecting')
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connect, 3000)
          }
        }
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'transaction' && !isPaused) {
              const tx = data.payload || data
              if (!tx || !tx.transaction_id) return
              setTransactions(prev => {
                const seen = new Set([tx.transaction_id])
                const filteredPrev = prev.filter(t => t && t.transaction_id && !seen.has(t.transaction_id))
                return [tx, ...filteredPrev].slice(0, MAX_FEED_ITEMS)
              })
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
          } catch (e) {}
        }
      } catch (e) {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connect, 3000)
        }
      }
    }

    connect()
    return () => {
      isSubscribed = false
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      try { ws?.close() } catch (_) {}
    }
  }, [isPaused])

  // ?? Initial Snapshot Ingestion ??
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics/summary`).catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (data.stats) setStats(prev => ({ ...prev, ...data.stats }))
        if (data.tier_counts) setTierCounts(prev => ({ ...prev, ...data.tier_counts }))
      }

      const txRes = await fetch(`${API_BASE}/api/transactions/recent`).catch(() => null)
      if (txRes && txRes.ok) {
        const txData = await txRes.json()
        if (Array.isArray(txData) && txData.length > 0) {
          setTransactions(txData)
          if (!selectedTx) setSelectedTx(txData[0])
        }
      }
    } catch (e) {}
  }, [selectedTx])

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, 10000)
    return () => clearInterval(interval)
  }, [fetchSnapshot])

  // Modal Dismissal Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'Escape') {
        setIsStoreOpen(false)
        setIsCopilotOpen(false)
        setIsGuideOpen(false)
        setIsBenchmarkOpen(false)
        setIsExportOpen(false)
        setIsGPUModalOpen(false)
        setSelectedTx(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`min-h-screen flex flex-row overflow-x-hidden font-sans transition-colors duration-200 ${isDark ? 'bg-[#080a11] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* ?? Fixed Left Sidebar (LandGuard Style) ?? */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        lang={lang}
        onToggleLang={(l) => setLang(l)}
        onOpenStore={() => setIsStoreOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        quarantinedCount={tierCounts.high_confidence_bot || 312}
      />

      {/* ?? Main Workspace Scrollable Container ?? */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* ?? Top Header Bar (LandGuard Breadcrumb + Admin Profile) ?? */}
        <header className={`sticky top-0 z-20 px-6 py-3.5 backdrop-blur-md border-b flex items-center justify-between gap-4 select-none transition-colors duration-200 ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
          {/* Left: Active Surveillance Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Surveillance Corridors:</span>
            <span className="text-white font-bold truncate">
              Razorpay Gateway · HDFC · ICICI · SBI · UPI 2.0 (Live)
            </span>
          </div>

          {/* Right: Quick Tools & Admin Avatar */}
          <div className="flex items-center gap-3">
            {/* Remote GPU Super-Cluster Status Button */}
            <button
              onClick={() => setIsGPUModalOpen(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border-emerald-800/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
              title="Inspect bd216server3 GPU Super-Cluster (6x RTX 2080 Ti)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cpu size={12} />
              <span className="hidden md:inline">bd216server3</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-normal">6x GPU · 66GB</span>
            </button>

            {/* Quick Action Buttons */}
            <button
              onClick={() => setIsBenchmarkOpen(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200'}`}
              title="Run SLA Stress Benchmark"
            >
              <Zap size={12} />
              <span className="hidden sm:inline">Benchmark</span>
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-800' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border-cyan-200'}`}
              title="SDK & WAF Export"
            >
              <Package size={12} />
              <span className="hidden sm:inline">SDK Export</span>
            </button>

            <button
              onClick={() => setIsGuideOpen(true)}
              className={`p-1.5 rounded-lg border transition ${isDark ? 'text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'}`}
              title="Guided Tour"
            >
              <Sparkles size={13} className="text-indigo-400" />
            </button>

            {/* Dark / Light Toggle in Header */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition ${isDark ? 'text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'}`}
              title="Toggle Theme"
            >
              {isDark ? <Moon size={13} className="text-indigo-400" /> : <Sun size={13} className="text-amber-400" />}
            </button>

            {/* Admin Profile Avatar (LandGuard Style) */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold font-mono text-xs">
                A
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white leading-none">Administrator</div>
                <div className="text-[10px] text-slate-400 leading-tight font-mono mt-0.5">FinTech SOC Lead</div>
              </div>
            </div>
          </div>
        </header>

        {/* ?? Main Sub-Page Workspace Content ?? */}
        <main className="flex-1 px-6 py-6 max-w-[1700px] w-full mx-auto space-y-6">
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
              isDark={isDark}
              onOpenStore={() => setIsStoreOpen(true)}
              tierMetaFn={tierMeta}
              onNavigateTab={handleSelectTab}
              isDark={isDark}
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
              isDark={isDark}
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
      </div>

      {/* ?? Global Drawers & Modals ?? */}
      {selectedTx && (
        <TransactionDetailDrawer
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
        />
      )}

      {isStoreOpen && (
        <MerchantStore
          onClose={() => setIsStoreOpen(false)}
        />
      )}

      <CopilotIncidentRoom
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        pinnedTx={selectedTx}
        onAddRule={(rule) => setCopilotNotes(prev => [...prev, rule])}
      />

      {isBenchmarkOpen && (
        <StressBenchmarkModal onClose={() => setIsBenchmarkOpen(false)} />
      )}

      {isExportOpen && (
        <IntegrationExportModal onClose={() => setIsExportOpen(false)} />
      )}

      {isGuideOpen && (
        <ExecutiveGuideModal
          onClose={() => setIsGuideOpen(false)}
          onOpenStore={() => { setIsGuideOpen(false); setIsStoreOpen(true); }}
          onOpenLab={() => { setIsGuideOpen(false); handleSelectTab('simulator'); }}
        />
      )}

      <GPUClusterModal
        isOpen={isGPUModalOpen}
        onClose={() => setIsGPUModalOpen(false)}
        isDark={isDark}
      />
    </div>
  )
}
