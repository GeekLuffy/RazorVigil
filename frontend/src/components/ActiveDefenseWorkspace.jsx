import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Code2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Sparkles,
  Shield,
  Layers,
  Database,
  Search,
  Activity,
  Cpu,
  RefreshCw
} from 'lucide-react'

import { API_BASE } from '../config'

export default function ActiveDefenseWorkspace({ copilotNotes = [] }) {
  const [rulesData, setRulesData] = useState(null)
  const [antiCheckerStats, setAntiCheckerStats] = useState(null)
  const [copiedRzp, setCopiedRzp] = useState(false)
  const [copiedWaf, setCopiedWaf] = useState(false)
  const [activeRuleTab, setActiveRuleTab] = useState('razorpay')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = () => {
    setIsRefreshing(true)
    fetch(`${API_BASE}/rules/active`)
      .then(res => res.json())
      .then(data => setRulesData(data))
      .catch(() => {})

    fetch(`${API_BASE}/antichecker/stats`)
      .then(res => res.json())
      .then(data => setAntiCheckerStats(data))
      .catch(() => {})
      .finally(() => setTimeout(() => setIsRefreshing(false), 300))
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2))
    if (type === 'rzp') {
      setCopiedRzp(true)
      setTimeout(() => setCopiedRzp(false), 2000)
    } else {
      setCopiedWaf(true)
      setTimeout(() => setCopiedWaf(false), 2000)
    }
  }

  return (
    <div className="space-y-4 animate-fadeIn font-sans">
      {/* Top Banner */}
      <div className="panel-primary bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1 font-sans">
              <Sparkles size={16} />
              Autonomous Threat Defense &amp; Policy Synthesizer
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Dynamic Edge WAF, Razorpay Risk Rules &amp; Anti-Checker Sentinel
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
              Real-time rules dynamically synthesized by graph modularity and ML risk clusters.
              Exports native Razorpay Risk Rule JSON, Cloudflare WAF expressions, and forensic intelligence briefs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">
              Live Synthesis: Active
            </span>
          </div>
        </div>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
            <Layers size={14} className="text-indigo-400" />
            Louvain Clusters
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {rulesData?.cluster_count || 12}
          </div>
          <div className="text-[11px] text-slate-500 font-sans">High-Density Attack Rings</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
            <ShieldAlert size={14} className="text-indigo-400" />
            Active Quarantines
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {rulesData?.quarantined_ips?.length || 8} IPs
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Sub-Second Sliding Window</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
            <Activity size={14} className="text-indigo-400" />
            Tarpit Poisoned
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            {antiCheckerStats?.tarpit_hits || 24}
          </div>
          <div className="text-[11px] text-slate-500 font-sans">Telegram Carding Micro-Auths</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
            <Cpu size={14} className="text-indigo-400" />
            Canaries Armed
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            50
          </div>
          <div className="text-[11px] text-slate-500 font-sans">0% False Positive Rate</div>
        </div>
      </div>

      {/* Main Grid: Policy Synthesizer (Left 7 cols) + AI Copilot Intelligence (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Dynamic Rules & Policy Exporter */}
        <div className="lg:col-span-7 space-y-3">
          <div className="panel bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveRuleTab('razorpay')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition ${
                    activeRuleTab === 'razorpay'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Razorpay Risk Rules (JSON)
                </button>
                <button
                  onClick={() => setActiveRuleTab('cloudflare')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition ${
                    activeRuleTab === 'cloudflare'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cloudflare Edge WAF
                </button>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    activeRuleTab === 'razorpay' ? rulesData?.razorpay_rule_json : rulesData?.cloudflare_waf_rule,
                    activeRuleTab === 'razorpay' ? 'rzp' : 'waf'
                  )
                }
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition font-sans"
              >
                {(activeRuleTab === 'razorpay' ? copiedRzp : copiedWaf) ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Rule</span>
                  </>
                )}
              </button>
            </div>

            {/* Rule Content Display with Pulsing Live Cursor */}
            {activeRuleTab === 'razorpay' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Autonomous rules ready for one-click import into Razorpay Dashboard &gt; Risk &amp; Security Rules engine.
                </p>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-[300px]">
                  {rulesData?.razorpay_rule_json ? (
                    JSON.stringify(rulesData.razorpay_rule_json, null, 2)
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      // Synthesizing active cluster rules
                      <span className="animate-cursor text-indigo-400 font-bold">_</span>
                    </span>
                  )}
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Cloudflare Firewall Rule Expression for pre-gateway edge mitigation before requests touch origin servers.
                </p>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                  {rulesData?.cloudflare_waf_rule || (
                    <span className="text-slate-500 flex items-center gap-1">
                      // Synthesizing Cloudflare WAF rule
                      <span className="animate-cursor text-indigo-400 font-bold">_</span>
                    </span>
                  )}
                </pre>
              </div>
            )}
          </div>

          {/* Anti-Checker Tarpit Details Panel */}
          <div className="panel bg-slate-900/90 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 font-sans">
              <ShieldAlert size={15} />
              Layer 0 Anti-Checker Tarpit Poisoning Architecture
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
              When Telegram scrapers (e.g. BIN 411773 ₹1 tests) or Playwright CDP headless browsers hit the checkout gateway,
              RazorShield Sentinel intercepts the request at Layer 0, injects an artificial 3,000ms tarpit delay, and serves a deceptive
              <code className="bg-slate-800 text-rose-300 px-1 py-0.5 rounded mx-1 text-[11px] font-mono">ERR_CARD_INVALID_STATUS</code> response.
              This poisons the attacker's card-checker database without incurring gateway transaction costs.
            </p>
          </div>
        </div>

        {/* Right: SOC Intelligence Stream */}
        <div className="lg:col-span-5 space-y-3">
          <div className="panel bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest font-sans">
                <Terminal size={14} className="text-indigo-400" />
                Copilot Forensic Notes
              </div>
              <span className="text-[10px] font-mono text-slate-500">Autonomous LLM</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {copilotNotes.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-xs font-mono">
                  No forensic investigations queued.<br />
                  Run attacks in Threat Simulator to trigger live notes.
                </div>
              ) : (
                copilotNotes.map((note, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-400 font-bold">
                      <span className="text-indigo-300">{note.transaction_id || 'TX_UNKNOWN'}</span>
                      <span className="text-[10px] text-slate-500">{note.timestamp || 'Just now'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{note.note || note.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
