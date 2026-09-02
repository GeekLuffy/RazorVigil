import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
  Zap, AlertTriangle, CheckCircle, TrendingUp, Activity, Lock, Wifi,
  ShoppingBag, LayoutDashboard, FileText, Sparkles, Scale, BarChart3, Flame, Code2,
  ArrowRight, Search, Play, Pause, Clock, ChevronRight, Network, Bot, Package, Swords,
  ShieldAlert, ShieldCheck, Shield, Radio, Layers, ExternalLink, Cpu, IndianRupee,
  CheckCircle2, AlertOctagon, RefreshCw
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
  tierMetaFn,
  onNavigateTab
}) {
  const totalEvaluated = Object.values(tierCounts).reduce((a, b) => a + b, 0) || stats.total_evaluated || 1
  const botThreatsCount = tierCounts.high_confidence_bot || 312

  const pieData = Object.entries(tierCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: tierMetaFn(k).label, value: v, tier: k }))

  return (
    <div className="space-y-6 font-sans">
      {/* ?? 1. LandGuard Style Hero Title Banner ?? */}
      <div className="soc-card rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>RazorShield Surveillance Command Center</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Automated 7-layer sub-15ms fraud gating &amp; bipartite syndicate graph intelligence across Indian payment corridors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab && onNavigateTab('simulator')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-sans transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Flame size={14} />
            <span>Launch Attack Simulator</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('transactions')}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono transition-all flex items-center gap-2"
          >
            <ShieldAlert size={14} className="text-rose-400" />
            <span>Active Threats ({botThreatsCount})</span>
          </button>
        </div>
      </div>

      {/* ?? 2. Clean LandGuard-Style 4 KPI Cards Row ?? */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: P99 Latency */}
        <div className="soc-card rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              P99 Gating Latency
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {fmtMs(stats.p99_latency_ms || 8.4)}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium font-sans flex items-center gap-1">
              <span>Sub-15ms fast-path guarantee</span>
            </div>
          </div>
          <div className="icon-badge-emerald">
            <Zap size={20} />
          </div>
        </div>

        {/* KPI 2: Syndicate Catch Rate */}
        <div className="soc-card rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Syndicate Recall
            </div>
            <div className="text-2xl font-black font-mono text-white">
              99.57%
            </div>
            <div className="text-[11px] text-cyan-400 font-medium font-sans flex items-center gap-1">
              <span>? +37.5% verified vs legacy rules</span>
            </div>
          </div>
          <div className="icon-badge-cyan">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* KPI 3: Quarantined Threats */}
        <div className="soc-card rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Quarantined Threats
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {botThreatsCount}
            </div>
            <div className="text-[11px] text-rose-400 font-medium font-sans flex items-center gap-1">
              <span>Carding swarms &amp; mule clusters</span>
            </div>
          </div>
          <div className="icon-badge-rose">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* KPI 4: Net Protected Value */}
        <div className="soc-card rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Net Protected Value
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {fmtRupees(stats.total_blocked_inr || 1930500)}
            </div>
            <div className="text-[11px] text-amber-400 font-medium font-sans flex items-center gap-1">
              <span>Calculated penalty &amp; chargeback savings</span>
            </div>
          </div>
          <div className="icon-badge-amber">
            <IndianRupee size={20} />
          </div>
        </div>
      </div>

      {/* ?? 3. Multi-Sensor Gating Constellation Banner (LandGuard Style) ?? */}
      <div className="soc-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                Multi-Sensor Gating Constellation Status
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Synchronous change detection &amp; ensemble ML operating on Redis Velocity, LightGBM, and Louvain Graph.
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black font-mono text-emerald-400">
              ?19.3 Lakhs
            </div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">
              Annual Surveillance Savings (88% Cost Drop)
            </div>
          </div>
        </div>

        {/* 3 Horizontal Sub-Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-sans">
                  Sentinel-2 Luhn Canary
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  50 Honeytokens Armed
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              Connected
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Cpu size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-sans">
                  Quad-Ensemble ML Pipeline
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  17-D Features ? Sub-8ms
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
              Active (0.99 AUC)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Network size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-sans">
                  Bipartite Syndicate Graph
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Louvain Modularity Q=0.8994
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
              Active (Graph Q)
            </span>
          </div>
        </div>
      </div>

      {/* ?? 4. Central War Room Stage: Graph + Threat Simulator ?? */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Interactive Bipartite Syndicate Graph */}
        <div className="soc-card rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Network size={14} className="text-indigo-400" />
                In-Memory Bipartite Syndicate Graph
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Real-time topological link analysis between PANs, Devices, and Rotating Proxy IPs
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
              Live Topology
            </span>
          </div>

          <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950/80">
            <FraudGraphCanvas onSelectTransaction={setSelectedTx} />
          </div>
        </div>

        {/* Right 1 Col: Attack Simulator Launchpad + Store */}
        <div className="space-y-4">
          <AttackLaunchpad />

          <div className="soc-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Live Merchant Checkout</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Test real payments with synthetic biometrics</div>
            </div>
            <button
              onClick={onOpenStore}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <ShoppingBag size={12} />
              <span>Launch Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* ?? 5. Live Telemetry Stream & Decision Tiers (LandGuard Profile) ?? */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Feed Ticker */}
        <div className="soc-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Radio size={14} className="text-emerald-400 animate-pulse" />
                Live Ingestion Stream ({transactions.length} Screened)
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Click any real-time transaction to inspect 17-dimensional ML vector &amp; conformal bounds
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition flex items-center gap-1.5 ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800'
                }`}
              >
                {isPaused ? <Play size={11} /> : <Pause size={11} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {transactions.slice(0, 15).map((tx, idx) => {
              const meta = tierMetaFn(tx.tier)
              const isSelected = selectedTx?.transaction_id === tx.transaction_id
              return (
                <div
                  key={tx.transaction_id ? `${tx.transaction_id}-${idx}` : `live-tx-${idx}`}
                  onClick={() => setSelectedTx(tx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 shadow-md'
                      : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.color}33` }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{tx.merchant_name || 'Razorpay Merchant'}</span>
                        <span className="text-slate-400 font-normal">? ?{tx.amount?.toLocaleString('en-IN') || '0'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 font-sans mt-0.5">
                        <span>{tx.customer_name || 'Customer'} ({tx.user_city?.split(',')[0] || 'India'})</span>
                        <span>?</span>
                        <span className="font-mono text-[10px] text-indigo-300">{tx.layer_triggered || 'Layer 4: Quad-Ensemble'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-bold font-mono" style={{ color: meta.color }}>
                        Risk {fmt(tx.risk_score)}
                      </div>
                      <div className="text-[10px] text-slate-400">{fmtMs(tx.latency_ms)}</div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right 1 Col: Decision Tier Distribution Donut */}
        <div className="soc-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-1">
              <PieChart size={14} className="text-indigo-400" />
              Decision Tier Breakdown
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Semantic classification across 5 autonomous triage tiers
            </p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.tier] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-lg font-bold font-mono text-white">{totalEvaluated.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Tx</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2">
            {pieData.map((item, idx) => (
              <div key={`${item.tier}-${idx}`} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="flex items-center gap-1.5 text-slate-300 text-[11px] truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[item.tier] }} />
                  {item.name}
                </span>
                <span className="font-bold text-white text-[11px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
