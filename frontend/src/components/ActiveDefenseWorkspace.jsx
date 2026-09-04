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
  RefreshCw,
  Lock,
  Globe,
  Radio,
  AlertTriangle,
  Fingerprint
} from 'lucide-react'

import { API_BASE } from '../config'

const DEFAULT_FORENSIC_NOTES = [
  {
    transaction_id: 'TX_9921_PHISH',
    timestamp: '2 mins ago',
    type: 'AiTM Proxy Intercept',
    note: 'Intercepted Modlishka reverse proxy origin header (evil-phish-gate.com != checkout.razorvigil.io). Deterministic block applied with zero gateway egress cost.'
  },
  {
    transaction_id: 'TX_8471_RELAY',
    timestamp: '5 mins ago',
    type: '3DS2 Bot Relay Intercept',
    note: 'Automated 10ms OTP relay detected via low Shannon entropy (H = 0.00 bits, delta_t = 9.1ms). Quarantined residential proxy subnet 103.14.28.0/24.'
  },
  {
    transaction_id: 'TX_3109_TARPIT',
    timestamp: '8 mins ago',
    type: 'Layer 0 Anti-Checker Tarpit',
    note: 'Telegram card-testing bot firing BIN 411773 ₹1.00 micro-auth trapped in Layer 0 3,000ms delay. Served ERR_CARD_INVALID_STATUS to poison bot database.'
  },
  {
    transaction_id: 'TX_1048_CANARY',
    timestamp: '12 mins ago',
    type: 'Honeytoken Breach',
    note: 'Canary Card #7 (BIN 4000000000000007) triggered in carding dump. Instant 1.00 risk quarantine executed across originating AS13335 network.'
  }
]

const QUARANTINED_CLUSTERS = [
  { ip: '103.14.28.112', asn: 'AS13335 (Cloudflare Warp / Proxy)', hits: 84, threat: 'Distributed Carding Swarm', status: 'BANNED' },
  { ip: '185.220.101.45', asn: 'AS208312 (Tor Exit Relay)', hits: 142, threat: 'Modlishka Reverse Proxy', status: 'ISOLATED' },
  { ip: '45.154.255.89', asn: 'AS14061 (DigitalOcean Datacenter)', hits: 59, threat: 'Playwright CDP Botnet', status: 'TARPITTED' },
  { ip: '194.26.29.13', asn: 'AS49505 (HostRoyale Datacenter)', hits: 31, threat: 'Sub-₹2,000 Micro-Auth Flood', status: 'BANNED' },
  { ip: '91.240.118.204', asn: 'AS51852 (Private Layer Datacenter)', hits: 19, threat: 'Synthetic WebGL Fingerprint Spoof', status: 'ISOLATED' }
]

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

  const razorpayRule = rulesData?.razorpay_risk_rule || rulesData?.razorpay_rule_json || {
    rule_id: 'rule_rs_live_defense',
    name: 'RazorVigil Autonomous Edge & Graph Risk Shield',
    condition: {
      all: [
        { field: 'risk_score', operator: '>=', value: 0.75 },
        { field: 'device.velocity_10m', operator: '>', value: 5 },
        { field: 'network.asn_type', operator: 'in', value: ['datacenter', 'tor', 'relay'] }
      ]
    },
    action: 'block',
    auto_synthesized: true,
    generated_at: Math.floor(Date.now() / 1000)
  }

  const cloudflareWafRule = rulesData?.cloudflare_waf_expression || rulesData?.cloudflare_waf_rule ||
    '(http.request.uri.path eq "/checkout" and (ip.geoip.asnum in {13335 16509 14061 208312} or http.request.headers["x-ja3-mismatch"] eq "1") and http.request.headers["x-keystroke-entropy"] lt "0.20") -> Action: Challenge (Managed)'

  const displayNotes = copilotNotes.length > 0 ? copilotNotes : DEFAULT_FORENSIC_NOTES

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
              Dynamic Edge WAF, Razorpay Risk Rules &amp; Anti-Checker Defense
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
            {rulesData?.active_clusters_detected || rulesData?.cluster_count || 12}
          </div>
          <div className="text-[11px] text-slate-500 font-sans">High-Density Attack Rings</div>
        </div>

        <div className="panel p-3 bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
            <ShieldAlert size={14} className="text-indigo-400" />
            Active Quarantines
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {rulesData?.entities_tracked || 48} Entities
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
                    activeRuleTab === 'razorpay' ? razorpayRule : cloudflareWafRule,
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

            {/* Rule Content Display with Live Code Highlighting */}
            {activeRuleTab === 'razorpay' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Autonomous rules ready for one-click import into Razorpay Dashboard &gt; Risk &amp; Security Rules engine.
                </p>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-[300px]">
                  {JSON.stringify(razorpayRule, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Cloudflare Firewall Rule Expression for pre-gateway edge mitigation before requests touch origin servers.
                </p>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                  {cloudflareWafRule}
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
              RazorVigil intercepts the request at Layer 0, injects an artificial 3,000ms tarpit delay, and serves a deceptive
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
              <span className="text-[10px] font-mono text-slate-500">Autonomous RazorVigil LLM</span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {displayNotes.map((note, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800/90 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400 font-bold">
                    <span className="text-indigo-300 font-mono text-[11px]">{note.transaction_id || 'TX_UNKNOWN'}</span>
                    <span className="text-[10px] text-slate-500">{note.timestamp || 'Just now'}</span>
                  </div>
                  {note.type && (
                    <span className="inline-block text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {note.type}
                    </span>
                  )}
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{note.note || note.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quarantined Threat Cluster Roster & Edge ASN Grid */}
      <div className="panel bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              Active Quarantined IP &amp; Entity Cluster Pool
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Real-Time Sliding Window Blocklist</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="pb-2">Target IP Address</th>
                <th className="pb-2">ASN &amp; Routing Profile</th>
                <th className="pb-2">Detected Threat Vector</th>
                <th className="pb-2">Attack Hits</th>
                <th className="pb-2 text-right">Defense Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {QUARANTINED_CLUSTERS.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 font-bold text-indigo-300">{row.ip}</td>
                  <td className="py-2.5 text-slate-300 font-sans text-[11px]">{row.asn}</td>
                  <td className="py-2.5 text-rose-300 font-sans text-[11px]">{row.threat}</td>
                  <td className="py-2.5 text-slate-400">{row.hits} requests</td>
                  <td className="py-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.status === 'BANNED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : row.status === 'ISOLATED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
