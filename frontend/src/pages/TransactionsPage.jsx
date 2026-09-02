import React, { useState, useMemo } from 'react'
import {
  Search, Filter, Download, ChevronRight, RefreshCw,
  ShieldAlert, ShieldCheck, AlertTriangle, Bot, ArrowUpDown, Layers,
  ExternalLink, Eye, Play, Pause, Zap, CheckCircle2, Shield, ShoppingBag,
  CreditCard, MapPin, Globe, User, Radio, Cpu, Activity
} from 'lucide-react'

function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : '—' }
function fmtMs(n) { return typeof n === 'number' ? `${n.toFixed(1)}ms` : '—' }
function fmtRupees(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

export default function TransactionsPage({
  transactions = [],
  selectedTx,
  setSelectedTx,
  tierMetaFn,
  isPaused,
  setIsPaused,
  onOpenCopilot,
  isDark = true
}) {
  const [filterTier, setFilterTier] = useState('ALL')
  const [filterLayer, setFilterLayer] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [merchantFilter, setMerchantFilter] = useState('ALL')

  // Calculate Quick Stats
  const totalCount = transactions.length
  const safeCount = transactions.filter(t => t.tier === 'safe').length
  const botCount = transactions.filter(t => t.tier === 'high_confidence_bot').length
  const softRiskCount = transactions.filter(t => t.tier === 'soft_risk' || t.tier === 'elevated_review').length
  const canaryCount = transactions.filter(t => t.is_canary).length
  const agentCount = transactions.filter(t => t.is_agent).length

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Tier filter
      if (filterTier === 'CANARY') {
        if (!tx.is_canary) return false
      } else if (filterTier === 'AGENT') {
        if (!tx.is_agent) return false
      } else if (filterTier !== 'ALL') {
        if (tx.tier !== filterTier) return false
      }

      // Layer filter
      if (filterLayer !== 'ALL') {
        if (!tx.layer_triggered || !tx.layer_triggered.includes(filterLayer)) return false
      }

      // Method filter
      if (methodFilter !== 'ALL' && (tx.payment_method || 'CARD') !== methodFilter) return false

      // Merchant filter
      if (merchantFilter !== 'ALL' && tx.merchant_name !== merchantFilter) return false

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const id = (tx.transaction_id || '').toLowerCase()
        const ip = (tx.ip_address || '').toLowerCase()
        const bin = (tx.bin6 || '').toLowerCase()
        const user = (tx.user_id || '').toLowerCase()
        const cust = (tx.customer_name || '').toLowerCase()
        const city = (tx.user_city || '').toLowerCase()
        const merch = (tx.merchant_name || '').toLowerCase()
        const bank = (tx.card_bank || '').toLowerCase()
        const exp = (tx.explanation || '').toLowerCase()
        const layer = (tx.layer_triggered || '').toLowerCase()
        if (
          !id.includes(q) && !ip.includes(q) && !bin.includes(q) &&
          !user.includes(q) && !cust.includes(q) && !city.includes(q) &&
          !merch.includes(q) && !bank.includes(q) && !exp.includes(q) &&
          !layer.includes(q)
        ) return false
      }
      return true
    })
  }, [transactions, filterTier, filterLayer, methodFilter, merchantFilter, searchQuery])

  const handleExportCSV = () => {
    if (!filtered.length) return
    const headers = [
      'TransactionID', 'LatencyMs', 'Tier', 'RiskScore', 'ConformalLower', 'ConformalUpper',
      'LayerTriggered', 'Amount', 'Currency', 'Merchant', 'MCC', 'Customer', 'City',
      'BankInstrument', 'PaymentMethod', 'IP', 'ISPNetwork', 'Canary', 'Agent', 'Explanation'
    ]
    const rows = filtered.map(t => [
      t.transaction_id,
      t.latency_ms,
      t.tier,
      t.risk_score,
      t.conformal_bounds?.lower_bound || 0,
      t.conformal_bounds?.upper_bound || 0,
      `"${t.layer_triggered || 'Layer 4: Quad-Ensemble ML'}"`,
      t.amount || 0,
      t.currency || 'INR',
      `"${t.merchant_name || 'Razorpay Merchant'}"`,
      t.mcc || '',
      `"${t.customer_name || 'Customer'}"`,
      `"${t.user_city || 'India'}"`,
      `"${t.card_name || t.card_bank || 'Card'}"`,
      t.payment_method || 'CARD',
      t.ip_address || '',
      `"${t.isp_network || 'ISP'}"`,
      t.is_canary ? 'YES' : 'NO',
      t.is_agent ? 'YES' : 'NO',
      `"${(t.explanation || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `razorshield_forensic_ledger_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-5 font-sans">
      {/* ?? 1. Top Header & Metrics Bar ?? */}
      <div className="soc-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>Forensic Transaction Ledger</span>
            <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
              {filtered.length} Filtered / {totalCount} Live Stream Buffer
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Real-time immutable audit trail evaluated by Sentinel Quad-Ensemble ML, Split Conformal Calibration ($p &lt; 0.05$), and Bayesian Expected Loss matrix
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
            <span>{isPaused ? 'Resume Poisson Stream' : 'Pause Poisson Stream'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Download size={12} />
            <span>Export Forensic CSV</span>
          </button>
        </div>
      </div>

      {/* ?? 2. Quick Stat Counters Row ?? */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        <div
          onClick={() => { setFilterTier('ALL'); setFilterLayer('ALL') }}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'ALL' && filterLayer === 'ALL' ? 'border-indigo-500/50 bg-indigo-950/20' : 'hover:border-slate-700'
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
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'CANARY' ? 'border-amber-500/50 bg-amber-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-amber-300 text-[11px] font-sans flex items-center gap-1">
            Canary Traps
          </span>
          <div className="text-xl font-bold text-amber-300 mt-1">{canaryCount}</div>
        </div>

        <div
          onClick={() => setFilterTier('AGENT')}
          className={`soc-card rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
            filterTier === 'AGENT' ? 'border-indigo-500/50 bg-indigo-950/20' : 'hover:border-slate-700'
          }`}
        >
          <span className="text-indigo-300 text-[11px] font-sans flex items-center gap-1">
            AP2 Agents
          </span>
          <div className="text-xl font-bold text-indigo-300 mt-1">{agentCount}</div>
        </div>
      </div>

      {/* ?? 3. Layer & Search Command Bar ?? */}
      <div className="soc-card rounded-2xl p-4 space-y-3 text-xs">
        {/* Row 1: Layer Attribution Pills */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px] font-sans">Gating Layer:</span>
          {[
            { id: 'ALL', label: 'All Layers' },
            { id: 'Layer 1', label: 'L1: Canary Trap' },
            { id: 'Layer 2', label: 'L2: AP2 Cryptography' },
            { id: 'Layer 3', label: 'L3: Geo-Velocity' },
            { id: 'Layer 4', label: 'L4: Quad-Ensemble ML' },
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setFilterLayer(l.id)}
              className={`px-2.5 py-1 rounded-lg border transition font-bold text-[11px] ${
                filterLayer === l.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Row 2: Selects & Live Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60 font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-[11px]">Method:</span>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className={`border rounded-lg px-2.5 py-1 font-mono text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}
            >
              <option value="ALL">All Methods</option>
              <option value="CARD">Card (Tokenized)</option>
              <option value="UPI">UPI Intent Auto-Collect</option>
            </select>

            <span className="text-slate-400 text-[11px] ml-2">Merchant:</span>
            <select
              value={merchantFilter}
              onChange={e => setMerchantFilter(e.target.value)}
              className={`border rounded-lg px-2.5 py-1 font-mono text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}
            >
              <option value="ALL">All Merchants</option>
              <option value="Zomato Gold Delivery">Zomato Gold</option>
              <option value="Blinkit 10-Min Quick">Blinkit Quick</option>
              <option value="Apple Store BKC Mumbai">Apple Store BKC</option>
              <option value="Nykaa Luxe Cosmetics">Nykaa Luxe</option>
              <option value="MakeMyTrip Flights & Hotels">MakeMyTrip</option>
              <option value="BookMyShow Concerts & Movies">BookMyShow</option>
              <option value="Tata Croma Retail Tech">Tata Croma</option>
            </select>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search TxID, Merchant, Bank, City, Layer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`border rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs w-56 sm:w-72 focus:outline-none focus:border-indigo-500 transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}
            />
          </div>
        </div>
      </div>

      {/* ?? 4. Forensic Transactions Table ?? */}
      <div className="soc-card rounded-2xl p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className={`uppercase text-[10px] tracking-wider border-b transition-colors ${isDark ? 'bg-slate-950/90 text-slate-400 border-slate-800' : 'bg-slate-100/90 text-slate-600 border-slate-200'}`}>

              <tr>
                <th className="py-3.5 px-4">Latency</th>
                <th className="py-3.5 px-4">Decision Tier</th>
                <th className="py-3.5 px-4">Risk &amp; Conformal Interval</th>
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Merchant</th>
                <th className="py-3.5 px-4">Customer &amp; City</th>
                <th className="py-3.5 px-4">Amount (INR)</th>
                <th className="py-3.5 px-4">Payment Instrument</th>
                <th className="py-3.5 px-4">Gating Layer</th>
                <th className="py-3.5 px-4">Forensic Explainability</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx, idx) => {
                const meta = tierMetaFn(tx.tier)
                const isSelected = selectedTx?.transaction_id === tx.transaction_id
                const conf = tx.conformal_bounds
                return (
                  <tr
                    key={tx.transaction_id ? `${tx.transaction_id}-${idx}` : `ledger-tx-${idx}`}
                    onClick={() => setSelectedTx(tx)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? isDark ? 'bg-indigo-950/50 text-white' : 'bg-indigo-50 text-indigo-950 font-medium'
                        : isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-100/80 text-slate-700'
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
                    <td className="py-3 px-4">
                      <div className="font-bold" style={{ color: meta.color }}>
                        {fmt(tx.risk_score)}
                      </div>
                      {conf && (
                        <div className="text-[9px] text-slate-400 font-mono">
                          [{fmt(conf.lower_bound)}, {fmt(conf.upper_bound)}]
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white max-w-[140px] truncate">
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
                    <td className="py-3 px-4 font-bold text-slate-200 truncate max-w-[140px]">
                      {tx.merchant_name || 'Razorpay Merchant'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 truncate max-w-[130px]">
                      {tx.customer_name ? `${tx.customer_name} ? ${tx.user_city?.split(',')[0] || ''}` : tx.user_id || 'usr_ind'}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{fmtRupees(tx.amount)}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-[140px] truncate">
                      {tx.card_name || tx.card_bank || (tx.bin6 ? `BIN ${tx.bin6}` : tx.card_hash)}
                    </td>
                    <td className="py-3 px-4 text-indigo-300 max-w-[130px] truncate text-[11px]">
                      {tx.layer_triggered || 'Layer 4: Quad-Ensemble ML'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[210px] truncate font-sans text-[11px]">
                      {tx.explanation || 'Standard legitimate customer checkout.'}
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
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-mono text-xs">
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
