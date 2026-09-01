import React, { useState, useMemo } from 'react'
import {
  Search, Filter, Download, ChevronRight, RefreshCw,
  ShieldAlert, ShieldCheck, AlertTriangle, Bot, ArrowUpDown, Layers,
  ExternalLink, Eye, Play, Pause, Zap, CheckCircle2, Shield
} from 'lucide-react'

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '?' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '?' }

export default function TransactionsPage({
  transactions = [],
  selectedTx,
  setSelectedTx,
  tierMetaFn,
  isPaused,
  setIsPaused,
  onOpenCopilot
}) {
  const [filterTier, setFilterTier] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [sortField, setSortField] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')

  // Calculate Quick Stats
  const totalCount = transactions.length
  const safeCount = transactions.filter(t => t.tier === 'safe').length
  const botCount = transactions.filter(t => t.tier === 'high_confidence_bot').length
  const softRiskCount = transactions.filter(t => t.tier === 'soft_risk' || t.tier === 'elevated_review').length
  const canaryCount = transactions.filter(t => t.is_canary).length

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterTier === 'CANARY') {
        if (!tx.is_canary) return false
      } else if (filterTier !== 'ALL') {
        if (tx.tier !== filterTier) return false
      }

      if (methodFilter !== 'ALL' && (tx.payment_method || 'CARD') !== methodFilter) return false

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const id = (tx.transaction_id || '').toLowerCase()
        const ip = (tx.ip_address || '').toLowerCase()
        const bin = (tx.bin6 || '').toLowerCase()
        const user = (tx.user_id || '').toLowerCase()
        const exp = (tx.explanation || '').toLowerCase()
        if (!id.includes(q) && !ip.includes(q) && !bin.includes(q) && !user.includes(q) && !exp.includes(q)) return false
      }
      return true
    })
  }, [transactions, filterTier, methodFilter, searchQuery])

  const handleExportCSV = () => {
    if (!filtered.length) return
    const headers = ['TransactionID', 'LatencyMs', 'Tier', 'RiskScore', 'Amount', 'PaymentMethod', 'BIN', 'IP', 'Canary', 'Agent', 'Explanation']
    const rows = filtered.map(t => [
      t.transaction_id,
      t.latency_ms,
      t.tier,
      t.risk_score,
      t.amount || 0,
      t.payment_method || 'CARD',
      t.bin6 || '',
      t.ip_address || '',
      t.is_canary ? 'YES' : 'NO',
      t.is_agent ? 'YES' : 'NO',
      `"${(t.explanation || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `razorshield_transactions_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-5 font-sans">
      {/* ?? 1. Top Header & Metrics Bar ?? */}
      <div className="soc-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2 font-sans">
            <span>Forensic Transaction Ledger</span>
            <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
              {filtered.length} Displayed / {totalCount} Total
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Real-time immutable audit trail of payment checkouts evaluated by the 7-Layer Sentinel AI Hot Path
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 font-bold ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            <span>{isPaused ? 'Resume Live Stream' : 'Pause Live Stream'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ?? 2. Quick Stat Counters Row ?? */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
        <div
          onClick={() => setFilterTier('ALL')}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'ALL' ? 'border-indigo-500/50 bg-indigo-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-slate-400 text-[11px] font-sans">Total Evaluated</span>
          <div className="text-xl font-bold text-white mt-1">{totalCount}</div>
        </div>

        <div
          onClick={() => setFilterTier('safe')}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'safe' ? 'border-emerald-500/50 bg-emerald-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-emerald-400 text-[11px] font-sans flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Safe Pass
          </span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{safeCount}</div>
        </div>

        <div
          onClick={() => setFilterTier('high_confidence_bot')}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'high_confidence_bot' ? 'border-rose-500/50 bg-rose-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-rose-400 text-[11px] font-sans flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Bot Blocked
          </span>
          <div className="text-xl font-bold text-rose-400 mt-1">{botCount}</div>
        </div>

        <div
          onClick={() => setFilterTier('soft_risk')}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'soft_risk' ? 'border-amber-500/50 bg-amber-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-amber-400 text-[11px] font-sans flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Soft Risk (3DS)
          </span>
          <div className="text-xl font-bold text-amber-400 mt-1">{softRiskCount}</div>
        </div>

        <div
          onClick={() => setFilterTier('CANARY')}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between col-span-2 sm:col-span-1 ${
            filterTier === 'CANARY' ? 'border-amber-500/50 bg-amber-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-amber-300 text-[11px] font-sans flex items-center gap-1">
            ?? Canary Honeytoken
          </span>
          <div className="text-xl font-bold text-amber-300 mt-1">{canaryCount}</div>
        </div>
      </div>

      {/* ?? 3. Filter & Search Command Bar ?? */}
      <div className="soc-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px]">Filter:</span>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'safe', label: 'Safe' },
            { id: 'soft_risk', label: 'Soft Risk' },
            { id: 'high_confidence_bot', label: 'Bot Blocked' },
            { id: 'CANARY', label: '?? Canary' },
          ].map(t => {
            const active = filterTier === t.id
            return (
              <button
                key={t.id}
                onClick={() => setFilterTier(t.id)}
                className={`px-2.5 py-1 rounded-lg border transition font-bold text-[11px] ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            )
          })}

          <span className="text-slate-400 text-[11px] ml-2">Method:</span>
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Methods</option>
            <option value="CARD">Card (Tokenized)</option>
            <option value="UPI">UPI VPA</option>
            <option value="NETBANKING">NetBanking</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search TxID, IP, BIN, User, Reason..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 font-mono text-xs w-56 sm:w-72 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* ?? 4. Forensic Transactions Table ?? */}
      <div className="soc-card rounded-2xl p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Latency</th>
                <th className="py-3.5 px-4">Decision Tier</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Instrument / BIN</th>
                <th className="py-3.5 px-4">Network &amp; IP</th>
                <th className="py-3.5 px-4">Forensic Reason</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx, idx) => {
                const meta = tierMetaFn(tx.tier)
                const isSelected = selectedTx?.transaction_id === tx.transaction_id
                return (
                  <tr
                    key={tx.transaction_id || idx}
                    onClick={() => setSelectedTx(tx)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-950/50 text-white'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-400">{fmtMs(tx.latency_ms)}</td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                        style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.color}33` }}
                      >
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold" style={{ color: meta.color }}>
                      {fmt(tx.risk_score)}
                    </td>
                    <td className="py-3 px-4 font-bold text-white max-w-[160px] truncate">
                      {tx.transaction_id}
                      {tx.is_canary && (
                        <span className="ml-1.5 text-amber-400 text-[9px] bg-amber-500/20 px-1 py-0.5 rounded border border-amber-500/30">
                          CANARY
                        </span>
                      )}
                      {tx.is_agent && (
                        <span className="ml-1.5 text-indigo-300 text-[9px] bg-indigo-500/20 px-1 py-0.5 rounded border border-indigo-500/30">
                          AP2
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">?{tx.amount?.toLocaleString('en-IN') || '?'}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {tx.bin6 ? `BIN ${tx.bin6}` : tx.card_hash ? tx.card_hash : tx.upi_vpa || 'Tokenized'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{tx.ip_address || '103.21.244.x'}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-[240px] truncate font-sans text-[11px]">
                      {tx.explanation || 'Verified transaction.'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTx(tx)
                          if (onOpenCopilot) onOpenCopilot(tx)
                        }}
                        className="px-2 py-1 bg-slate-900 hover:bg-pink-500/20 text-slate-400 hover:text-pink-300 rounded-lg border border-slate-800 hover:border-pink-500/30 transition inline-flex items-center gap-1 text-[10px]"
                        title="Interrogate in Copilot"
                      >
                        <Bot size={11} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No transactions matched the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
