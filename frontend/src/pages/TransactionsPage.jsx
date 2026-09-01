import React, { useState, useMemo } from 'react'
import {
  Search, Filter, Download, ChevronRight, RefreshCw,
  ShieldAlert, ShieldCheck, AlertTriangle, Bot, ArrowUpDown, Layers,
  ExternalLink, Eye, Play, Pause
} from 'lucide-react'

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '?' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '?' }

export default function TransactionsPage({
  transactions,
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

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterTier !== 'ALL' && tx.tier !== filterTier) return false
      if (methodFilter !== 'ALL' && (tx.payment_method || 'CARD') !== methodFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const id = (tx.transaction_id || '').toLowerCase()
        const ip = (tx.ip_address || '').toLowerCase()
        const bin = (tx.bin6 || '').toLowerCase()
        const user = (tx.user_id || '').toLowerCase()
        if (!id.includes(q) && !ip.includes(q) && !bin.includes(q) && !user.includes(q)) return false
      }
      return true
    })
  }, [transactions, filterTier, methodFilter, searchQuery])

  const handleExportCSV = () => {
    if (!filtered.length) return
    const headers = ['TransactionID', 'LatencyMs', 'Tier', 'RiskScore', 'Amount', 'BIN', 'IP', 'Canary', 'Agent']
    const rows = filtered.map(t => [
      t.transaction_id,
      t.latency_ms,
      t.tier,
      t.risk_score,
      t.amount || 0,
      t.bin6 || '',
      t.ip_address || '',
      t.is_canary ? 'YES' : 'NO',
      t.is_agent ? 'YES' : 'NO'
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
      {/* Top Header & Metrics Bar */}
      <div className="soc-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2 font-sans">
            <span>Forensic Transaction Ledger</span>
            <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
              {filtered.length} Evaluated
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Full audit log of incoming payment transactions screened by the 7-Layer Sentinel AI Hot Path
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
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
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

      {/* Filter & Search Command Bar */}
      <div className="soc-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px]">Decision:</span>
          {['ALL', 'safe', 'soft_risk', 'high_confidence_bot'].map(t => {
            const label = t === 'ALL' ? 'ALL' : t === 'safe' ? 'Safe' : t === 'soft_risk' ? 'Soft Risk' : 'Bot Blocked'
            const active = filterTier === t
            return (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={`px-2.5 py-1 rounded-lg border transition font-bold text-[11px] ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
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
            placeholder="Search TxID, IP, BIN, User..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 font-mono text-xs w-48 sm:w-64 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Forensic Table */}
      <div className="soc-card rounded-2xl p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Decision Tier</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Card BIN / Instrument</th>
                <th className="py-3 px-4">Network / IP</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.slice(0, 100).map((tx, idx) => {
                const meta = tierMetaFn(tx.tier)
                const isSelected = selectedTx?.transaction_id === tx.transaction_id
                return (
                  <tr
                    key={tx.transaction_id || idx}
                    onClick={() => setSelectedTx(tx)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-950/40 text-white'
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
                    <td className="py-3 px-4 font-bold text-white max-w-[180px] truncate">
                      {tx.transaction_id}
                      {tx.is_canary && (
                        <span className="ml-1.5 text-amber-400 text-[9px] bg-amber-500/20 px-1 py-0.5 rounded border border-amber-500/30">
                          CANARY
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">?{tx.amount?.toLocaleString('en-IN') || '?'}</td>
                    <td className="py-3 px-4 text-slate-400">{tx.bin6 ? `BIN ${tx.bin6}` : tx.upi_vpa || 'Tokenized'}</td>
                    <td className="py-3 px-4 text-slate-400">{tx.ip_address || '103.21.244.x'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTx(tx)
                          if (onOpenCopilot) onOpenCopilot(tx)
                        }}
                        className="p-1 hover:bg-pink-500/20 text-slate-400 hover:text-pink-300 rounded border border-transparent hover:border-pink-500/30 transition inline-flex items-center gap-1 text-[10px]"
                        title="Interrogate in Copilot"
                      >
                        <Bot size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs">
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
