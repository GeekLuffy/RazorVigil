import React, { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Send,
  Sparkles,
  X,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Layers,
  FileText,
  Terminal,
  Zap,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock
} from 'lucide-react'
import { API_BASE } from '../config'

export default function CopilotIncidentRoom({ isOpen, onClose, pinnedTx, onSelectTx }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `### 🤖 Threat Memory Copilot AI Initialized\n\nI am your autonomous **AI Risk Analyst Copilot** with real-time access to:\n1. **Live Transaction Telemetry** (Keystroke Shannon entropy, JA3 mismatch, Conformal uncertainty sets)\n2. **NetworkX Louvain Bipartite Graph** (Mule rings, degree centrality, $Q \\ge 0.74$)\n3. **RBI Regulatory Directives** (Authentication Mechanisms for Digital Payment Transactions, Directions 2025, effective April 1, 2026)\n\nSelect a quick prompt below or ask about any transaction ID (e.g. \`TX_...\`).`,
      citations: [
        'Reserve Bank of India (Authentication Mechanisms for Digital Payment Transactions) Directions, 2025 (effective April 1, 2026)',
        'RazorShield Layer 0 Protocol — Deterministic Honeypot and Sub-15ms Risk Gating SLA'
      ],
      actions: [],
      timestamp: new Date().toLocaleTimeString(),
    }
  ])
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedActionIdx, setCopiedActionIdx] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // When pinnedTx changes, add a notification message
  useEffect(() => {
    if (pinnedTx && isOpen) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `🔍 **Pinned Context Updated**: Now inspecting transaction \`${pinnedTx.transaction_id}\` (Amount: ₹${pinnedTx.amount?.toLocaleString('en-IN') || 0}, Tier: \`${pinnedTx.tier?.toUpperCase()}\`, Risk Score: **${pinnedTx.risk_score}**). Ask me why it was flagged or to draft an evidence note.`,
          citations: ['Live Transaction Memory Store'],
          actions: [
            {
              action_type: 'DOWNLOAD_DOSSIER',
              label: 'Export Dispute Dossier PDF',
              payload: { transaction_id: pinnedTx.transaction_id }
            }
          ],
          timestamp: new Date().toLocaleTimeString(),
        }
      ])
    }
  }, [pinnedTx, isOpen])

  const handleSendMessage = async (userPrompt) => {
    const textToSend = userPrompt || inputMsg
    if (!textToSend.trim() || loading) return

    const userMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages(prev => [...prev, userMessage])
    if (!userPrompt) setInputMsg('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          transaction_id: pinnedTx?.transaction_id || null,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const assistantMessage = {
        role: 'assistant',
        text: data.reply,
        citations: data.citations || [],
        actions: data.suggested_actions || [],
        timestamp: new Date().toLocaleTimeString(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Copilot chat error:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ **Error communicating with Threat Memory Copilot**: ${err.message}`,
          citations: [],
          actions: [],
          timestamp: new Date().toLocaleTimeString(),
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteAction = async (action, idx) => {
    if (action.action_type === 'COPY_WAF') {
      const expr = action.payload?.expression || ''
      navigator.clipboard.writeText(expr)
      setCopiedActionIdx(idx)
      setActionNotice('Copied Cloudflare WAF expression to clipboard!')
      setTimeout(() => {
        setCopiedActionIdx(null)
        setActionNotice(null)
      }, 3000)
    } else if (action.action_type === 'QUARANTINE_CLUSTER') {
      const cid = action.payload?.cluster_id ?? 1
      try {
        const res = await fetch(`${API_BASE}/cluster/quarantine/${cid}`, { method: 'POST' })
        const data = await res.json()
        setActionNotice(`🚨 Quarantined Cluster #${cid}: Isolated ${data.nodes_isolated_count} nodes in Redis.`)
      } catch {
        setActionNotice('Failed to execute cluster quarantine.')
      }
      setTimeout(() => setActionNotice(null), 4000)
    } else if (action.action_type === 'DOWNLOAD_DOSSIER') {
      const tid = action.payload?.transaction_id || 'TX_DEMO'
      setActionNotice(`📄 Initiating RBI Dispute Dossier PDF generation for ${tid}...`)
      try {
        const res = await fetch(`${API_BASE}/governance/dossier/pdf`)
        if (res.ok) {
          const blob = await res.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `RBI_Dispute_Dossier_${tid}.pdf`
          document.body.appendChild(a)
          a.click()
          a.remove()
          setActionNotice('✅ Downloaded official RBI Dispute Dossier PDF.')
        }
      } catch {
        setActionNotice('Failed to generate PDF dossier.')
      }
      setTimeout(() => setActionNotice(null), 4000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft font-sans">
      {/* Drawer Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-pink-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-pink-950/40">
            <Bot size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Threat Memory Copilot Incident Room
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                Track 02 AI Risk Manager
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive RAG over live transactions, Louvain graph clusters, and RBI regulations.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Pinned Context Banner (if available) */}
      {pinnedTx && (
        <div className="px-4 py-2 bg-indigo-950/70 border-b border-indigo-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 truncate text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Pinned TX: <strong>{pinnedTx.transaction_id}</strong> (₹{pinnedTx.amount})</span>
          </div>
          <button
            onClick={() => onSelectTx && onSelectTx(null)}
            className="text-[10px] text-indigo-400 hover:text-white underline"
          >
            Clear Pin
          </button>
        </div>
      )}

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-2.5 bg-emerald-950/90 border-b border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center justify-between animate-fadeIn">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)}>✕</button>
        </div>
      )}

      {/* Scrollable Conversation Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-mono">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Message Bubble */}
            <div
              className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-2.5 shadow-lg'
              }`}
            >
              {/* Formatted Markdown Content */}
              <div className="whitespace-pre-wrap font-sans text-xs space-y-2">
                {msg.text.split('\n').map((line, lIdx) => {
                  if (line.startsWith('### ')) {
                    return <h4 key={lIdx} className="font-bold text-white text-sm mt-1">{line.replace('### ', '')}</h4>
                  }
                  if (line.startsWith('#### ')) {
                    return <h5 key={lIdx} className="font-bold text-indigo-300 text-xs mt-1">{line.replace('#### ', '')}</h5>
                  }
                  if (line.startsWith('```')) {
                    return null // Handled in code block section
                  }
                  if (line.startsWith('- **') || line.startsWith('1. **') || line.startsWith('2. **') || line.startsWith('3. **')) {
                    return <div key={lIdx} className="pl-1 text-slate-300">{line}</div>
                  }
                  return <p key={lIdx} className="text-slate-300">{line}</p>
                })}
              </div>

              {/* Citations Section */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Legal &amp; Model Citations:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-[10px] bg-slate-950 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded-full"
                      >
                        📜 {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Section */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                  {msg.actions.map((act, actIdx) => (
                    <button
                      key={actIdx}
                      onClick={() => handleExecuteAction(act, actIdx)}
                      className={`btn text-[11px] font-mono py-1.5 px-3 flex items-center gap-1.5 rounded-lg border transition ${
                        act.action_type === 'QUARANTINE_CLUSTER'
                          ? 'bg-rose-600/30 border-rose-500/50 text-rose-300 hover:bg-rose-600/50'
                          : act.action_type === 'COPY_WAF'
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/50'
                          : 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200 hover:bg-emerald-600/50'
                      }`}
                    >
                      {act.action_type === 'QUARANTINE_CLUSTER' && <Lock size={12} />}
                      {act.action_type === 'COPY_WAF' && (copiedActionIdx === actIdx ? <Check size={12} /> : <Copy size={12} />)}
                      {act.action_type === 'DOWNLOAD_DOSSIER' && <FileText size={12} />}
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono p-3 bg-slate-900 border border-slate-800 rounded-2xl w-max">
            <RefreshCw size={14} className="animate-spin" />
            <span>Threat Memory Copilot is reasoning across live telemetry &amp; RBI rules...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick-Prompt Launcher */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1.5">
        <div className="text-[10px] text-slate-400 font-mono uppercase font-bold flex items-center gap-1">
          <Sparkles size={12} className="text-amber-400" /> Suggested Inquiries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Why was the last transaction flagged?',
            'Synthesize Cloudflare WAF rule for proxy subnet',
            'Draft RBI compliance note for dispute',
            'Explain Louvain community #1 risk factors'
          ].map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask Copilot (e.g. Why was TX_9921 flagged?)..."
          value={inputMsg}
          onChange={e => setInputMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputMsg.trim()}
          className="btn btn-primary p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
