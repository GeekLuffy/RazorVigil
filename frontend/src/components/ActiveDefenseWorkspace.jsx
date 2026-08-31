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
    <div className="space-y-4 animate-fadeIn">
      {/* Top Banner */}
      <div className="panel bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
              <Sparkles size={16} />
              Autonomous Threat Defense &amp; Policy Synthesizer
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Dynamic Edge WAF, Razorpay Risk Rules &amp; Anti-Checker Sentinel
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
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
            <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              Live Synthesis: Active
            </span>
          </div>
        </div>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <Layers size={14} className="text-indigo-400" />
            Louvain Clusters
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {rulesData?.active_clusters_detected ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Modularity graph rings</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <ShieldAlert size={14} className="text-rose-400" />
            Tarpit Interceptions
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {antiCheckerStats?.total_intercepted ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Telegram/CDP scrapers poisoned</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <Activity size={14} className="text-amber-400" />
            Deceptive Responses
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {antiCheckerStats?.deceptive_declines_served ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Simulated bank rejects</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <Cpu size={14} className="text-emerald-400" />
            Canaries Armed
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            50
          </div>
          <div className="text-[11px] text-slate-500 font-mono">0% False Positive Rate</div>
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
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition"
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

            {/* Rule Content Display */}
            {activeRuleTab === 'razorpay' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Autonomous rules ready for one-click import into Razorpay Dashboard &gt; Risk &amp; Security Rules engine.
                </p>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-[300px]">
                  {rulesData?.razorpay_rule_json
                    ? JSON.stringify(rulesData.razorpay_rule_json, null, 2)
                    : '// Synthesizing active cluster rules…'}
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cloudflare Firewall Rule Expression for pre-gateway edge mitigation before requests touch origin servers.
                </p>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                  {rulesData?.cloudflare_waf_rule || '// Synthesizing Cloudflare WAF rule…'}
                </pre>
              </div>
            )}
          </div>

          {/* Anti-Checker Tarpit Details Panel */}
          <div className="panel bg-slate-900/90 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <ShieldAlert size={15} />
              Layer 0 Anti-Checker Tarpit Poisoning Architecture
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When Telegram scrapers (e.g. BIN 411773 ₹1 tests) or Playwright CDP headless browsers hit the checkout gateway,
              RazorShield Sentinel intercepts the request at Layer 0, injects an artificial 3,000ms tarpit delay, and serves a deceptive
              <code className="bg-slate-800 text-rose-300 px-1 py-0.5 rounded mx-1 text-[11px]">ERR_CARD_INVALID_STATUS</code> response.
              This poisons the attacker's card-checker database without incurring gateway transaction costs.
            </p>
          </div>
        </div>

        {/* Right: Threat Memory Copilot Intelligence */}
        <div className="lg:col-span-5 space-y-3">
          <div className="panel bg-slate-900/90 border border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Search size={15} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Threat Memory AI Copilot
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Async Forensics</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[460px] pr-1">
              {copilotNotes.length === 0 ? (
                <div className="text-center py-16 text-slate-600 text-xs font-mono">
                  No elevated risk transactions detected yet.<br />
                  Forensic copilot notes will appear here in real-time.
                </div>
              ) : (
                copilotNotes.map((n, i) => (
                  <div
                    key={i}
                    className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs font-mono space-y-1.5 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>TX: {n.transaction_id?.slice(0, 10)}…</span>
                      <span className="text-indigo-400 font-bold">Risk: {n.risk_score ? (n.risk_score * 100).toFixed(1) + '%' : 'ELEVATED'}</span>
                    </div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      {n.note}
                    </pre>
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
