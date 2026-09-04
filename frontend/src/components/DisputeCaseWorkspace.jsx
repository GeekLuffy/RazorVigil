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

import { API_BASE } from '../config'

const STATUS_BADGES = {
  PENDING_REVIEW: { label: 'PENDING REVIEW', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  EVIDENCE_SYNTHESIZED: { label: 'EVIDENCE READY', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  REPRESENTED_TO_RAZORPAY: { label: 'REPRESENTED', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  RECOVERED_VIA_UPI: { label: 'RECOVERED (UPI)', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
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
      setActionSuccessMsg('Evidence package synthesized successfully with 5-domain verifiable telemetry.')
    } catch (e) {
      console.error('Failed to synthesize evidence:', e)
    } finally {
      setIsSynthesizing(false)
    }
  }

  const handleRepresentCase = async () => {
    if (!selectedCaseId) return
    try {
      const res = await fetch(`${API_BASE}/cases/${selectedCaseId}/represent`, {
        method: 'POST',
      })
      const data = await res.json()
      setSelectedCase((prev) => ({
        ...prev,
        status: 'REPRESENTED_TO_RAZORPAY',
        razorpay_dispute_id: data.razorpay_dispute_id,
      }))
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === selectedCaseId
            ? { ...c, status: 'REPRESENTED_TO_RAZORPAY', razorpay_dispute_id: data.razorpay_dispute_id }
            : c
        )
      )
      setActionSuccessMsg(`Case represented to Razorpay API (ID: ${data.razorpay_dispute_id}). Status: Submitted.`)
    } catch (e) {
      console.error('Failed to represent case:', e)
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
    a.download = `RazorVigil_Evidence_Dossier_${selectedCase.case_id}.json`
    a.click()
  }

  const filteredCases =
    filterStatus === 'ALL'
      ? cases
      : cases.filter((c) => c.status === filterStatus)

  return (
    <div className="space-y-4 animate-fadeIn font-sans">
      {/* Header Banner */}
      <div className="panel-primary bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1 font-sans">
              <Scale size={16} />
              Automated Chargeback Defense &amp; Evidence Synthesizer
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Dispute Case Management &amp; Cryptographic Evidence Dossier
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
              Zero-hallucination dispute defense compiler. Assembles 5-domain verifiable telemetry claims
              (HMAC signatures, TLS JA3/JA4, kinetic biometrics, Louvain community rings, and RBI compliance context)
              into structured evidence dossiers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCases}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition font-sans"
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
                    ? 'bg-indigo-600 text-white shadow-sm'
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
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between font-sans">
            <span>Flagged Dispute Queue ({filteredCases.length})</span>
            <span className="text-[10px] font-mono text-indigo-400">HITL REVIEW</span>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="panel p-8 text-center flex flex-col items-center justify-center border-dashed border-slate-800 font-sans">
                <Scale className="w-8 h-8 text-indigo-400/60 mb-2.5" />
                <div className="text-xs font-bold text-slate-300 mb-1 font-sans">No Flagged Disputes in Queue</div>
                <p className="text-xs text-slate-500 max-w-sm mb-3 font-sans">
                  All transactions were verified in real-time. False decline recovery links prevent chargebacks before they occur.
                </p>
                <button
                  onClick={fetchCases}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold font-sans transition"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  Refresh Queue
                </button>
              </div>
            ) : (
              filteredCases.map((c) => {
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

                    <div className="text-xs text-slate-300 font-medium truncate mb-1 font-sans">
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
              })
            )}
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
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Case Overview Card */}
              <div className="panel bg-slate-900/90 border border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1">
                      Case Inspection · {selectedCase.case_id}
                    </div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                      {selectedCase.customer_name}
                      <span className="text-xs font-mono font-normal text-slate-400">
                        ({selectedCase.customer_email})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      Dispute Reason: <strong className="text-slate-200">{selectedCase.dispute_reason_code}</strong> — {selectedCase.dispute_reason_text}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-sans">Disputed Amount</div>
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

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSynthesizeEvidence}
                      disabled={isSynthesizing}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition shadow-md shadow-indigo-950/40 disabled:opacity-50 font-sans"
                    >
                      <Sparkles size={14} className={isSynthesizing ? 'animate-spin' : ''} />
                      {isSynthesizing ? 'Synthesizing...' : 'Synthesize 5-Domain Dossier'}
                    </button>

                    {selectedCase.evidence_package && (
                      <button
                        onClick={handleRepresentCase}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-md shadow-emerald-950/40 font-sans"
                      >
                        <Send size={14} />
                        Represent to Razorpay
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportJson}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition font-sans"
                    >
                      <Download size={13} />
                      Export JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Evidence Package Accordion */}
              {selectedCase.evidence_package && (
                <div className="panel-primary bg-slate-900/90 border-indigo-500/30 p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest font-sans">
                      <FileCheck2 size={16} />
                      Compiled Representation Letter
                    </div>
                    <button
                      onClick={handleCopyLetter}
                      className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition font-sans"
                    >
                      {copiedLetter ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Letter</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                    {selectedCase.evidence_package.representation_letter}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="panel p-12 text-center flex flex-col items-center justify-center border-dashed border-slate-800 font-sans">
              <FileCheck2 className="w-10 h-10 text-indigo-400/60 mb-3" />
              <div className="text-sm font-bold text-slate-300 mb-1 font-sans">Select a Dispute Case to Inspect</div>
              <p className="text-xs text-slate-500 max-w-md font-sans">
                Choose a flagged case from the left queue to view forensic telemetry, generate ISO 8583 evidence dossiers, and represent directly to Razorpay.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
