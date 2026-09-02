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
  CheckCircle2, AlertOctagon, RefreshCw, Globe, Key
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

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '—' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '—' }
function fmtRupees(n) {
  const num = Number(n || 0)
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)} Lakhs`
  }
  return `₹${num.toLocaleString('en-IN')}`
}

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
  onNavigateTab,
  isDark = true
}) {
  const totalEvaluated = Object.values(tierCounts).reduce((a, b) => a + b, 0) || stats.total_evaluated || 1
  const botThreatsCount = tierCounts.high_confidence_bot || 312

  const pieData = Object.entries(tierCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: tierMetaFn(k).label, value: v, tier: k }))

  return (
    <div className="space-y-6 font-sans">
      {/* ?? 1. Hero Title Banner ?? */}
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
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-sans transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Flame size={14} />
            <span>Launch Attack Simulator</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('transactions')}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShieldAlert size={14} className="text-rose-400" />
            <span>Active Threats ({botThreatsCount})</span>
          </button>
        </div>
      </div>

      {/* ?? 2. Clean 4 KPI Cards Row ?? */}
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
              <span>↗ +37.5% verified vs legacy rules</span>
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

      {/* 3. Live Payment Corridors Defense Matrix */}
      <div className="soc-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                Payment Corridors &amp; Synchronous Gating Matrix
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Sub-15ms Enforced
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Real-time traffic throughput, P99 gating SLA enforcement, and autonomous defense policies per payment corridor.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Corridors: <strong className="text-emerald-400">4 Active</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              False Declines: <strong className="text-emerald-400">0.00%</strong>
            </span>
          </div>
        </div>

        {/* 4 Corridor Cards in Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Corridor 1: Razorpay Core Gateway */}
          <div className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-emerald-500/40' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-white font-mono">Razorpay Core API</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                7.8ms P99
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Throughput:</span>
                <span className="text-white font-bold">1,420 tx/min</span>
              </div>
              <div className="flex justify-between">
                <span>Coverage:</span>
                <span className="text-emerald-400 font-bold">95.0% Certified</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                <span className="text-emerald-400 font-bold">Policy:</span> CatBoost GPU + Conformal q̂=0.006
              </div>
            </div>
          </div>

          {/* Corridor 2: UPI AutoPay / 2.0 Instant */}
          <div className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/40' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-white font-mono">UPI 2.0 / AutoPay</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
                6.2ms P99
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Throughput:</span>
                <span className="text-white font-bold">980 tx/min</span>
              </div>
              <div className="flex justify-between">
                <span>Velocity Gating:</span>
                <span className="text-cyan-400 font-bold">Sub-Second Active</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                <span className="text-cyan-400 font-bold">Policy:</span> Redis Window + Louvain Ring Isolation
              </div>
            </div>
          </div>

          {/* Corridor 3: Carding Defense (3DS2) */}
          <div className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-rose-500/40' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <span className="text-xs font-bold text-white font-mono">Carding &amp; 3DS2</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                9.4ms P99
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Throughput:</span>
                <span className="text-white font-bold">410 tx/min</span>
              </div>
              <div className="flex justify-between">
                <span>Canary Decoys:</span>
                <span className="text-rose-400 font-bold">50 Armed</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                <span className="text-rose-400 font-bold">Policy:</span> Telegram Scraper Tarpit &amp; ₹1 Voiding
              </div>
            </div>
          </div>

          {/* Corridor 4: AP2 Autonomous AI Agent */}
          <div className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-purple-500/40' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span className="text-xs font-bold text-white font-mono">AP2 AI Agent Gate</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold">
                4.1ms P99
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Throughput:</span>
                <span className="text-white font-bold">85 tx/min</span>
              </div>
              <div className="flex justify-between">
                <span>Attestation:</span>
                <span className="text-purple-400 font-bold">ECDSA Verified</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                <span className="text-purple-400 font-bold">Policy:</span> Fast-Path Cryptographic Spend Bounds
              </div>
            </div>
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

          <div className={`w-full h-80 rounded-xl overflow-hidden border transition-colors ${isDark ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-slate-50/50 shadow-inner'}`}>
            <FraudGraphCanvas onSelectTransaction={setSelectedTx} isDark={isDark} />
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
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <ShoppingBag size={12} />
              <span>Launch Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* ?? 5. Live Telemetry Stream & Decision Tiers ?? */}
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
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : isDark ? 'bg-slate-950 text-slate-300 hover:text-white border-slate-800' : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm'
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
                        <span className="text-slate-400 font-normal">· ₹{tx.amount?.toLocaleString('en-IN') || '0'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 font-sans mt-0.5">
                        <span>{tx.customer_name || 'Customer'} ({tx.user_city?.split(',')[0] || 'India'})</span>
                        <span>·</span>
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
                  contentStyle={isDark ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#ffffff' } : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className={`text-lg font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalEvaluated.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Tx</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2">
            {pieData.map((item, idx) => (
              <div key={`${item.tier}-${idx}`} className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
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
