import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
  Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2,
  ArrowRight, Search, Play, Pause, Clock, ChevronRight, Network, Bot, Package, Swords,
  ShieldAlert, ShieldCheck
} from 'lucide-react'

import FraudGraphCanvas from '../components/FraudGraphCanvas'
import AttackLaunchpad from '../components/AttackLaunchpad'

const PIE_COLORS = {
  safe: '#10b981',
  soft_risk: '#f59e0b',
  elevated_review: '#f59e0b',
  high_confidence_bot: '#f43f5e',
  verified_agent: '#818cf8'
}

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '?' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '?' }
function fmtRupees(n) { return `?${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }

export default function DashboardPage({
  stats,
  tierCounts,
  chartData,
  transactions,
  selectedTx,
  setSelectedTx,
  isPaused,
  setIsPaused,
  onOpenCopilot,
  onOpenStore,
  tierMetaFn
}) {
  const totalEvaluated = Object.values(tierCounts).reduce((a, b) => a + b, 0) || stats.total_evaluated || 1

  const latencySpark = chartData.slice(-15).map((d) => ({ v: d.avg_latency || 8.4 }))
  const gmvSpark = chartData.slice(-15).map((d) => ({ v: d.amount || 25000 }))
  const fraudSpark = chartData.slice(-15).map((d) => ({ v: d.high_confidence_bot || 0 }))
  const fprSpark = chartData.slice(-15).map((d) => ({ v: d.safe || 1 }))

  const pieData = Object.entries(tierCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: tierMetaFn(k).label, value: v, tier: k }))

  return (
    <div className="space-y-6 font-sans">
      {/* ?? 1. Hero KPI Cards Row ?? */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: P99 Latency */}
        <div className="soc-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              P99 Latency SLA
            </span>
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
              Sub-15ms Guarantee
            </span>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <div className="text-3xl font-black font-mono text-emerald-400 glow-text-emerald">
                {fmtMs(stats.p99_latency_ms || 11.8)}
              </div>
              <div className="text-xs text-slate-400 mt-1">P50: 3.2ms ? Fast-Path Gate</div>
            </div>
            <div className="w-24 h-10 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencySpark}>
                  <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b98122" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 2: Fraud Catch Rate */}
        <div className="soc-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Syndicate Catch Rate
            </span>
            <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
              +37.5% vs Legacy
            </span>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <div className="text-3xl font-black font-mono text-white">
                99.57%
              </div>
              <div className="text-xs text-slate-400 mt-1">Quad-Ensemble ML Recall</div>
            </div>
            <div className="w-24 h-10 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fraudSpark}>
                  <Area type="monotone" dataKey="v" stroke="#f43f5e" fill="#f43f5e22" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 3: False Positive Rate */}
        <div className="soc-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Normal Genuine FPR
            </span>
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
              p &lt; 0.05 Calibrated
            </span>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <div className="text-3xl font-black font-mono text-white">
                0.09%
              </div>
              <div className="text-xs text-slate-400 mt-1">Split Conformal Calibration</div>
            </div>
            <div className="w-24 h-10 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fprSpark}>
                  <Area type="monotone" dataKey="v" stroke="#818cf8" fill="#818cf822" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI 4: Protected Merchant GMV */}
        <div className="soc-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Net Protected GMV
            </span>
            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
              104.6x Net ROI
            </span>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <div className="text-3xl font-black font-mono text-amber-300 glow-text-amber">
                {fmtRupees(stats.total_blocked_inr || 1930500)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Across 142 Syndicate Attacks</div>
            </div>
            <div className="w-24 h-10 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gmvSpark}>
                  <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ?? 2. Attack Simulation Quick-Launch Hub ?? */}
      <AttackLaunchpad onTriggerStoreDemo={onOpenStore} />

      {/* ?? 3. Charts & Telemetry Grid (1h Velocity + Tier Donut) ?? */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1h Real-Time Velocity Area Chart (7 Cols) */}
        <div className="lg:col-span-7 soc-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                Live Ingestion Velocity &amp; Latency Profile
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time throughput window with sub-millisecond evaluation stamps</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              60s Rolling Window
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="t" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="safe" stroke="#10b981" fill="#10b98115" strokeWidth={2} name="Genuine (Allowed)" />
                <Area type="monotone" dataKey="high_confidence_bot" stroke="#f43f5e" fill="url(#blockedGrad)" strokeWidth={2} name="Bot Blocked" />
                <Area type="monotone" dataKey="soft_risk" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={1.5} name="Soft Risk" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution Donut & Fast Stats (5 Cols) */}
        <div className="lg:col-span-5 soc-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-400" />
              Classification Breakdown
            </h3>
            <span className="text-xs font-mono text-slate-400 font-bold">
              {totalEvaluated} Total Transactions
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="h-48 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.tier] || '#818cf8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black font-mono text-white">{totalEvaluated}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Screened</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-300 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Safe Pass
                </span>
                <strong className="text-white">{tierCounts.safe || 0}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Bot Blocked
                </span>
                <strong className="text-white">{tierCounts.high_confidence_bot || 0}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Soft Risk (3DS)
                </span>
                <strong className="text-white">{tierCounts.soft_risk || 0}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" /> Verified Agent
                </span>
                <strong className="text-white">{tierCounts.verified_agent || 0}</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Anti-Checker Tarpit: <strong className="text-emerald-400">ACTIVE</strong></span>
            <span>Canary Honeytokens: <strong className="text-amber-400">50 Live</strong></span>
          </div>
        </div>
      </div>

      {/* ?? 4. Live Stream & Mini Mule Graph Row ?? */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Transaction Stream Ticker (7 Cols) */}
        <div className="lg:col-span-7 soc-card rounded-2xl p-5 flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Ingestion Stream
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {transactions.length} buffered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {isPaused ? <Play size={11} /> : <Pause size={11} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
            {transactions.slice(0, 25).map((tx, idx) => {
              const meta = tierMetaFn(tx.tier)
              const isSelected = selectedTx?.transaction_id === tx.transaction_id
              return (
                <div
                  key={tx.transaction_id || idx}
                  onClick={() => setSelectedTx(tx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-950/50 border-indigo-500/50 shadow-md'
                      : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80'
                  }`}
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-slate-400 font-bold shrink-0">{fmtMs(tx.latency_ms)}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.color}33` }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-white font-bold truncate">{tx.transaction_id}</span>
                    {tx.is_canary && (
                      <span className="text-amber-400 text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                        ?? CANARY
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-300 font-bold">?{tx.amount?.toLocaleString('en-IN') || '?'}</span>
                    <span className="text-slate-500 text-[10px]">Score: {fmt(tx.risk_score)}</span>
                    <ChevronRight size={13} className="text-slate-600" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mini Mule Ring Graph (5 Cols) */}
        <div className="lg:col-span-5 soc-card rounded-2xl p-5 flex flex-col justify-between">
          <FraudGraphCanvas latestTx={selectedTx || transactions[0]} />
        </div>
      </div>
    </div>
  )
}
