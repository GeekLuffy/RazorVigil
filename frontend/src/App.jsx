import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Shield, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2,
  ArrowRight, Search, Play, Pause, Clock, ChevronRight, Network, Bot, Package, Swords,
  Layers, Percent, Moon, Sun, UserCheck, Cpu, Server, X, Menu
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
  // ── URL Hash & Pathname Routing with Aliases ──
  const ROUTE_ALIASES = {
    ledger: 'transactions',
    transactions: 'transactions',
    graph: 'syndicates',
    syndicate: 'syndicates',
    syndicates: 'syndicates',
    intelligence: 'risk-intelligence',
    'risk-intelligence': 'risk-intelligence',
    models: 'model-evaluation',
    model: 'model-evaluation',
    'model-evaluation': 'model-evaluation',
    simulator: 'simulator',
    disputes: 'audit-log',
    dispute: 'audit-log',
    cases: 'audit-log',
    'audit-log': 'audit-log',
    architecture: 'architecture',
    dashboard: 'dashboard',
  }

  const resolveRoute = () => {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase()
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '').trim().toLowerCase()
    const candidate = hash || path
    if (ROUTE_ALIASES[candidate]) {
      return ROUTE_ALIASES[candidate]
    }
    const valid = ALL_TABS.find(t => t.id === candidate)
    return valid ? valid.id : 'dashboard'
  }

  const [activeTab, setActiveTab] = useState(resolveRoute)
  const [isDark, setIsDark] = useState(true)
  const [lang, setLang] = useState('EN')

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId)
    window.location.hash = tabId
    setIsMobileNavOpen(false)
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
    const handleNavigation = () => {
      const target = resolveRoute()
      setActiveTab(target)
    }
    window.addEventListener('hashchange', handleNavigation)
    window.addEventListener('popstate', handleNavigation)
    return () => {
      window.removeEventListener('hashchange', handleNavigation)
      window.removeEventListener('popstate', handleNavigation)
    }
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
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [copilotNotes, setCopilotNotes] = useState([])

  // Dual-Channel Real-Time Transaction Handler (WebSocket + Direct Simulation/Store Callback)
  const handleLiveTransaction = useCallback((tx) => {
    if (!tx || !tx.transaction_id) return
    setTransactions(prev => {
      const seen = new Set([tx.transaction_id])
      const filteredPrev = prev.filter(t => t && t.transaction_id && !seen.has(t.transaction_id))
      return [tx, ...filteredPrev].slice(0, MAX_FEED_ITEMS)
    })
    const tier = tx.tier || 'safe'
    setTierCounts(prev => ({
      ...prev,
      [tier]: (prev[tier] || 0) + 1
    }))
    setStats(prev => {
      const isThreat = tier === 'high_confidence_bot' || (tx.risk_score && tx.risk_score > 0.6)
      const amt = Number(tx.amount || 0)
      const incBlocked = isThreat ? (amt > 0 ? amt : 16999) : 0
      return {
        ...prev,
        total_evaluated: (prev.total_evaluated || 24891) + 1,
        total_blocked_inr: (prev.total_blocked_inr || 1930500) + incBlocked,
        p99_latency_ms: tx.latency_ms ? Number(Number(tx.latency_ms).toFixed(1)) : prev.p99_latency_ms
      }
    })
  }, [])

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
            const isTx = data.type === 'transaction' || !!data.transaction_id || !!(data.payload && data.payload.transaction_id)
            if (isTx && !isPaused) {
              const tx = data.type === 'transaction' ? (data.payload || data) : (data.payload || data)
              if (tx && tx.transaction_id) {
                handleLiveTransaction(tx)
              }
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
  }, [isPaused, handleLiveTransaction])

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
        setIsAdminOpen(false)
        setIsMobileNavOpen(false)
        setSelectedTx(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`min-h-screen flex flex-row overflow-x-hidden font-sans transition-colors duration-200 ${isDark ? 'bg-[#080a11] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* ?? Fixed Left Sidebar & Mobile Drawer ?? */}
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
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* ?? Main Workspace Scrollable Container ?? */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* ?? Top Header Bar (LandGuard Breadcrumb + Admin Profile) ?? */}
        <header className={`sticky top-0 z-20 px-3 sm:px-6 py-2.5 sm:py-3.5 backdrop-blur-md border-b flex items-center justify-between gap-2 sm:gap-4 select-none transition-colors duration-200 ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
          {/* Left: Mobile Hamburger & Active Surveillance Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className={`lg:hidden p-1.5 sm:p-2 rounded-xl border transition shrink-0 ${
                isDark ? 'border-slate-800 text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-400 font-medium hidden md:inline shrink-0">Surveillance Corridors:</span>
              <span className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Razorpay Gateway · HDFC · ICICI · SBI · UPI 2.0 (Live)
              </span>
            </div>

            <div className="flex sm:hidden items-center gap-1.5 text-xs font-bold font-mono text-emerald-400">
              <Shield size={16} />
              <span className="truncate font-extrabold">RazorVigil</span>
            </div>
          </div>

          {/* Right: Quick Tools & Admin Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Remote GPU Super-Cluster Status Button */}
            <button
              onClick={() => setIsGPUModalOpen(true)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1 sm:gap-1.5 transition ${
                isDark
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border-emerald-800/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
              title="Inspect bd216server3 GPU Super-Cluster (6x RTX 2080 Ti)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <Cpu size={12} className="shrink-0" />
              <span className="hidden xl:inline">bd216server3</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-normal">
                <span className="hidden md:inline">6x GPU · </span>66GB
              </span>
            </button>

            {/* Quick Action Buttons */}
            <button
              onClick={() => setIsBenchmarkOpen(true)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200'}`}
              title="Run SLA Stress Benchmark"
            >
              <Zap size={12} />
              <span className="hidden md:inline">Benchmark</span>
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-800' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border-cyan-200'}`}
              title="SDK & WAF Export"
            >
              <Package size={12} />
              <span className="hidden md:inline">SDK Export</span>
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
            <button
              onClick={() => setIsAdminOpen(prev => !prev)}
              className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-800 hover:opacity-80 transition text-left cursor-pointer"
              title="View SOC Lead Session & Authority"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                A
              </div>
              <div className="hidden lg:block text-left">
                <div className={`text-xs font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>Administrator</div>
                <div className="text-[10px] text-slate-400 leading-tight font-mono mt-0.5">FinTech SOC Lead</div>
              </div>
            </button>
          </div>
        </header>

        {/* ?? Main Sub-Page Workspace Content ?? */}
        <main className="flex-1 px-3.5 py-4 sm:px-6 sm:py-6 max-w-[1700px] w-full mx-auto space-y-6 overflow-x-hidden">
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
              onTransactionEvaluated={handleLiveTransaction}
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
            <AttackSimulatorPage
              onOpenStore={() => setIsStoreOpen(true)}
              onTransactionEvaluated={handleLiveTransaction}
            />
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
          onTransactionEvaluated={handleLiveTransaction}
        />
      )}

      <CopilotIncidentRoom
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        pinnedTx={selectedTx}
        onAddRule={(rule) => setCopilotNotes(prev => [...prev, rule])}
      />

      {isBenchmarkOpen && (
        <StressBenchmarkModal
          isOpen={isBenchmarkOpen}
          onClose={() => setIsBenchmarkOpen(false)}
        />
      )}

      {isExportOpen && (
        <IntegrationExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {isGuideOpen && (
        <ExecutiveGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
          onOpenStore={() => { setIsGuideOpen(false); setIsStoreOpen(true); }}
          onLaunchStore={() => { setIsGuideOpen(false); setIsStoreOpen(true); }}
          onOpenLab={() => { setIsGuideOpen(false); handleSelectTab('simulator'); }}
          onNavigateTab={(tab) => { setIsGuideOpen(false); handleSelectTab(tab || 'simulator'); }}
        />
      )}

      <GPUClusterModal
        isOpen={isGPUModalOpen}
        onClose={() => setIsGPUModalOpen(false)}
        isDark={isDark}
      />

      {/* Admin SOC Profile Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold font-mono text-sm">
                  A
                </div>
                <div>
                  <h3 className="font-bold text-sm">FinTech SOC Lead Session</h3>
                  <p className="text-xs text-slate-400 font-mono">auth_level: L3_AUTONOMOUS_ROOT</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs font-mono">
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Active Corridors Under Protection</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Razorpay Gateway', 'HDFC Core', 'ICICI 3DS', 'SBI UPI', 'Axis Instant'].map(c => (
                    <span key={c} className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`p-3 rounded-lg border grid grid-cols-2 gap-2 ${isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="text-slate-500 block text-[10px]">CONFORMAL BOUND</span>
                  <span className="font-bold text-emerald-400">q_hat = 0.00600 (95%)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CLUSTER COMPUTE</span>
                  <span className="font-bold text-cyan-400">bd216server3 (CUDA:4)</span>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px] mb-1">QUICK ACTIONS</span>
                <div className="grid grid-cols-2 gap-2 mt-1 font-sans">
                  <button
                    onClick={() => { setIsAdminOpen(false); setIsGPUModalOpen(true); }}
                    className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5"
                  >
                    <Cpu size={12} /> GPU Cluster HUD
                  </button>
                  <button
                    onClick={() => { setIsAdminOpen(false); setIsBenchmarkOpen(true); }}
                    className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition flex items-center justify-center gap-1.5"
                  >
                    <Zap size={12} /> Run Benchmark
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsAdminOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Close Session Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
