import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  FileCheck2,
  Sparkles,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Send,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Fingerprint,
  Network,
  Activity,
  Lock,
  ArrowRight,
  Bot
} from 'lucide-react'

const API_BASE = 'http://localhost:8000'

const STATUS_BADGES = {
  PENDING_REVIEW: { label: 'PENDING REVIEW', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  EVIDENCE_SYNTHESIZED: { label: 'EVIDENCE READY', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  REPRESENTED_TO_RAZORPAY: { label: 'REPRESENTED', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  RECOVERED_VIA_UPI: { label: 'RECOVERED (UPI)', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  ACCEPTED: { label: 'ACCEPTED', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

export default function DisputeCaseWorkspace() {
  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [selectedCase, setSelectedCase] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [copiedLetter, setCopiedLetter] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null)

  const fetchCases = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/cases`)
      const data = await res.json()
      setCases(data)
      if (!selectedCaseId && data.length > 0) {
        setSelectedCaseId(data[0].case_id)
        setSelectedCase(data[0])
      } else if (selectedCaseId) {
        const updated = data.find((c) => c.case_id === selectedCaseId)
        if (updated) setSelectedCase(updated)
      }
    } catch (e) {
      console.error('Failed to fetch dispute cases:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [])

  const handleSelectCase = async (caseId) => {
    setSelectedCaseId(caseId)
    setActionSuccessMsg(null)
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}`)
      const data = await res.json()
      setSelectedCase(data)
    } catch (e) {
      console.error('Failed to fetch case detail:', e)
    }
  }

  const handleSynthesizeEvidence = async () => {
    if (!selectedCaseId) return
    setIsSynthesizing(true)
    setActionSuccessMsg(null)
    try {
      const res = await fetch(`${API_BASE}/cases/${selectedCaseId}/synthesize-evidence`, {
        method: 'POST',
      })
      const pkg = await res.json()
      setSelectedCase((prev) => ({
        ...prev,
        status: 'EVIDENCE_SYNTHESIZED',
        evidence_package: pkg,
      }))
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === selectedCaseId
            ? { ...c, status: 'EVIDENCE_SYNTHESIZED', evidence_package: pkg }
            : c
        )
      )
      setActionSuccessMsg('5-Domain Verifiable Evidence Dossier successfully synthesized!')
    } catch (e) {
      console.error('Evidence synthesis error:', e)
    } finally {
      setIsSynthesizing(false)
    }
  }

  const handleAction = async (actionType) => {
    if (!selectedCaseId) return
    try {
      const res = await fetch(`${API_BASE}/cases/${selectedCaseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          notes: `Decision '${actionType}' confirmed by SOC Risk Operations Analyst.`,
        }),
      })
      const updated = await res.json()
      setSelectedCase(updated)
      setCases((prev) => prev.map((c) => (c.case_id === selectedCaseId ? updated : c)))
      setActionSuccessMsg(`Action executed: ${actionType.replace(/_/g, ' ')}`)
    } catch (e) {
      console.error('Action error:', e)
    }
  }

  const handleCopyLetter = () => {
    if (!selectedCase?.evidence_package?.representation_letter) return
    navigator.clipboard.writeText(selectedCase.evidence_package.representation_letter)
    setCopiedLetter(true)
    setTimeout(() => setCopiedLetter(false), 2500)
  }

  const handleExportJson = () => {
    if (!selectedCase) return
    const blob = new Blob([JSON.stringify(selectedCase, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RazorShield_Evidence_Dossier_${selectedCase.case_id}.json`
    a.click()
  }

  const filteredCases =
    filterStatus === 'ALL'
      ? cases
      : cases.filter((c) => c.status === filterStatus)

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="panel bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
              <Scale size={16} />
              Track 02: AI Risk Manager · Automated Chargeback Defense &amp; Evidence Synthesizer
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Dispute Case Management &amp; Cryptographic Evidence Dossier
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Zero-hallucination dispute defense compiler. Assembles 5-domain verifiable telemetry claims
              (HMAC signatures, TLS JA3/JA4, kinetic biometrics, Louvain community rings, and RBI §4.2 compliance)
              into formal Razorpay Representation Letters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCases}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <span className="text-xs text-slate-500 font-mono mr-1">Filter Queue:</span>
          {['ALL', 'PENDING_REVIEW', 'EVIDENCE_SYNTHESIZED', 'REPRESENTED_TO_RAZORPAY', 'RECOVERED_VIA_UPI'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Grid: Cases List (Left) + Detailed Investigation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Dispute Queue */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span>Flagged Dispute Queue ({filteredCases.length})</span>
            <span className="text-[10px] font-mono text-indigo-400">HITL REVIEW</span>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredCases.map((c) => {
              const isSelected = c.case_id === selectedCaseId
              const badge = STATUS_BADGES[c.status] || STATUS_BADGES.PENDING_REVIEW
              return (
                <div
                  key={c.case_id}
                  onClick={() => handleSelectCase(c.case_id)}
                  className={`panel p-3.5 cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-indigo-500 bg-slate-800/80 shadow-md shadow-indigo-950/30'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-indigo-400" />
                      {c.case_id}
                    </span>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-medium truncate mb-1">
                    {c.dispute_reason_text}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <span className="text-emerald-400 font-bold">
                      ₹{c.amount.toLocaleString('en-IN')}
                    </span>
                    <span>Reason: Code {c.dispute_reason_code}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Case Investigation & Evidence Dossier */}
        <div className="lg:col-span-8">
          {selectedCase ? (
            <div className="space-y-3">
              {/* Action Banner Message */}
              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 size={16} className="shrink-0" />
                  {actionSuccessMsg}
                </div>
              )}

              {/* Case Overview Card */}
              <div className="panel bg-slate-900/90 border border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1">
                      Case Inspection · {selectedCase.case_id}
                    </div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedCase.customer_name}
                      <span className="text-xs font-mono font-normal text-slate-400">
                        ({selectedCase.customer_email})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Dispute Reason: <strong className="text-slate-200">{selectedCase.dispute_reason_code}</strong> — {selectedCase.dispute_reason_text}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-mono">Disputed Amount</div>
                    <div className="text-2xl font-bold font-mono text-white">
                      ₹{selectedCase.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Telemetry Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs font-mono">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">Transaction ID</div>
                    <div className="text-slate-300 font-bold truncate">{selectedCase.transaction_id}</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">Network / ASN</div>
                    <div className="text-slate-300 font-bold capitalize">
                      {selectedCase.telemetry?.asn_type || 'residential'}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">TLS / JA3 Signature</div>
                    <div className={selectedCase.telemetry?.ja3_ua_mismatch ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {selectedCase.telemetry?.ja3_ua_mismatch ? 'Bot Mismatch ❌' : 'Browser Match ✓'}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase">Kinetic Entropy</div>
                    <div className="text-slate-300 font-bold">
                      {Number(selectedCase.telemetry?.keystroke_entropy || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Synthesis Trigger Button */}
                {!selectedCase.evidence_package && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      No evidence package generated yet for this dispute case.
                    </div>
                    <button
                      disabled={isSynthesizing}
                      onClick={handleSynthesizeEvidence}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-indigo-900/30 disabled:opacity-50"
                    >
                      <Sparkles size={14} className={isSynthesizing ? 'animate-spin' : ''} />
                      {isSynthesizing ? 'Synthesizing 5-Domain Dossier…' : '⚡ Synthesize Cryptographic Evidence Dossier'}
                    </button>
                  </div>
                )}
              </div>

              {/* Synthesized Evidence Package */}
              {selectedCase.evidence_package && (
                <div className="space-y-3">
                  {/* Win Probability & RBI Attestation Header */}
                  <div className="panel bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                          Autonomous Forensic Verdict
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {selectedCase.evidence_package.recommended_action}
                        </h4>
                        <div className="text-xs text-slate-400 mt-1">
                          {selectedCase.evidence_package.summary}
                        </div>
                      </div>

                      <div className="text-center bg-slate-950 px-4 py-2.5 rounded-xl border border-indigo-500/30">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">Win Probability</div>
                        <div className="text-2xl font-bold font-mono text-emerald-400">
                          {(selectedCase.evidence_package.win_probability * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-emerald-400/90 flex items-center gap-2">
                      <Lock size={12} className="shrink-0" />
                      {selectedCase.evidence_package.rbi_compliance_attestation}
                    </div>
                  </div>

                  {/* 5-Domain Verifiable Claims List */}
                  <div className="panel bg-slate-900/90 border border-slate-800">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 size={15} className="text-indigo-400" />
                        Grounded 5-Domain Verifiable Claims ({selectedCase.evidence_package.claims.length})
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Zero-Hallucination Verified Facts
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedCase.evidence_package.claims.map((claim, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              {claim.claim_title}
                            </span>
                            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                              {claim.domain}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {claim.factual_content}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-slate-900">
                            <span>
                              Source: <strong className="text-slate-400">{claim.source_table}</strong> · Ref: {claim.source_id}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              ✓ {claim.verification_status} ({(claim.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formal Razorpay Representation Letter Preview */}
                  <div className="panel bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Scale size={15} className="text-indigo-400" />
                        Formal Razorpay Dispute Representation Letter
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyLetter}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded transition"
                        >
                          {copiedLetter ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {copiedLetter ? 'Copied' : 'Copy Text'}
                        </button>
                        <button
                          onClick={handleExportJson}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-mono rounded transition"
                        >
                          <Download size={12} />
                          Export Dossier (.JSON)
                        </button>
                      </div>
                    </div>

                    <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-52 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                      {selectedCase.evidence_package.representation_letter}
                    </pre>
                  </div>

                  {/* Human Decision Support Actions */}
                  <div className="panel bg-slate-900 border border-indigo-500/30">
                    <div className="text-xs font-bold uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                      <span>Human-in-the-Loop Decision Actions</span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        Reviewer Sign-off Required
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleAction('SUBMIT_REPRESENTATION')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <Send size={13} />
                        Submit Formal Defense to Razorpay
                      </button>

                      <button
                        onClick={() => handleAction('ROUTE_TO_UPI_RECOVERY')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <ArrowRight size={13} />
                        Route to Out-of-Band UPI Recovery (Track 03)
                      </button>

                      <button
                        onClick={() => handleAction('ACCEPT_DISPUTE')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition"
                      >
                        Accept Dispute &amp; Issue Refund
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel text-center py-16 text-slate-500">
              Select a dispute case from the queue to inspect grounded evidence and generate representation.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
