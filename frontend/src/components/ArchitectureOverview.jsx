import React from 'react'
import { Shield, Zap, TrendingUp, Cpu, Award, ArrowUpRight, CheckCircle2, XCircle, Terminal, Network, Database, Lock, Key, Scale } from 'lucide-react'
import { GENERATED_METRICS } from '../generatedMetrics'

export default function ArchitectureOverview() {
  return (
    <div className="space-y-4 animate-fadeIn font-sans">
      {/* System Architecture Banner */}
      <div className="panel-primary bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">RazorShield Sentinel — System Architecture &amp; Threat Defense</h2>
            <p className="text-xs text-slate-400 font-sans">Autonomous Real-Time Risk Engine &amp; Revenue Recovery Bridge</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-2 font-sans">
          RazorShield Sentinel operates directly on the synchronous checkout path with a <strong>strict &lt;50ms latency SLA</strong> (averaging ~10ms p99). 
          It orchestrates atomic sliding-window Redis velocity, Louvain graph community detection, and an Optuna-tuned LightGBM + Isolation Forest ensemble to block automated carding rings while dynamically routing borderline false declines to an out-of-band UPI recovery bridge.
        </p>
      </div>

      {/* Hero Headline Performance Metrics */}
      <div className="panel-primary bg-slate-900/90 border-indigo-500/30">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 font-sans">
            <TrendingUp size={15} />
            Verified Held-Out Metrics (N={GENERATED_METRICS.meta.heldOutTestCount.toLocaleString()})
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">
            1,000 BOOTSTRAP CIs
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-sans font-medium">Full-Funnel Catch Rate</div>
            <div className="text-3xl md:text-4xl font-black font-mono text-emerald-400 my-1">
              {(GENERATED_METRICS.fullFunnelCatchRate * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 font-sans">Canary + Velocity + ML</div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-sans font-medium">ML-Layer PR-AUC</div>
            <div className="text-3xl md:text-4xl font-black font-mono text-indigo-300 my-1">
              {GENERATED_METRICS.mlLayerPrAuc.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 font-sans">Ambiguous Sub-Flow ($N=9,877$)</div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-sans font-medium">Adversarial Recall</div>
            <div className="text-3xl md:text-4xl font-black font-mono text-amber-400 my-1">
              {(GENERATED_METRICS.adversarialRealisticRecall * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 font-sans">Stealth Human Bots ($N=500$)</div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-sans font-medium">Zero-Day Recall</div>
            <div className="text-3xl md:text-4xl font-black font-mono text-white my-1">
              {(GENERATED_METRICS.zeroDayRecall * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 font-sans">Unseen CVV Cycling ($N=500$)</div>
          </div>
        </div>
      </div>

      {/* Cryptographic Payment Integrity & RBI Compliance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Cryptographic Contract Card */}
        <div className="panel bg-slate-950/80 border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider font-sans">
            <Lock size={15} />
            Cryptographic Integrity &amp; Verification
          </div>
          <div className="space-y-2 text-xs text-slate-300 font-mono">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[11px] block font-sans">Payment Signature Contract:</span>
              <code className="text-emerald-400 text-[11px]">
                HMAC_SHA256(order_id + "|" + payment_id, key_secret)
              </code>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[11px] block font-sans">Side-Channel Timing Defense:</span>
              <span className="text-indigo-300 text-[11px]">
                Enforces constant-time <code className="text-indigo-400">hmac.compare_digest()</code> comparison.
              </span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[11px] block font-sans">Durable Webhook Idempotency:</span>
              <span className="text-slate-300 text-[11px]">
                Dual-layer Redis fast path + SQLite <code className="text-amber-300 font-mono">UNIQUE(event_id)</code> durability backstop.
              </span>
            </div>
          </div>
        </div>

        {/* Regulatory Compliance Card */}
        <div className="panel bg-slate-950/80 border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-bold uppercase tracking-wider font-sans">
            <Scale size={15} />
            RBI 2025/2026 Regulatory Alignment
          </div>
          <div className="space-y-2 text-xs text-slate-300 font-sans">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold block text-[11px]">RBI Directions 2025 (Effective April 1, 2026):</span>
              <span className="text-[11px] text-slate-400">
                Mandates dynamic 2FA and requires issuers/gateways to implement automated Risk-Based Authentication (RBA).
              </span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-indigo-300 font-bold block text-[11px]">Card-on-File Tokenization (CoFT):</span>
              <span className="text-[11px] text-slate-400">
                Zero cleartext PAN/CVV storage. Evaluates synthetic surrogate tokens (<code className="text-indigo-300 font-mono">card_hash</code>) natively.
              </span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-indigo-300 font-bold block text-[11px]">Passive TLS &amp; Biometric Signal Mesh:</span>
              <span className="text-[11px] text-slate-400">
                Passive JA4 client TLS ciphers + Keystroke Shannon entropy (<code className="text-indigo-300 font-mono">&gt;2.0</code>) vs machine scripts.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table vs Legacy Heuristics */}
      <div className="panel">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 font-sans">
          Architecture Comparison: RazorShield Sentinel vs. Legacy IP Filters
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Defense Layer</th>
                <th className="py-2.5 px-3 text-red-400 font-medium">Legacy IP Rate Limiters / 3DS</th>
                <th className="py-2.5 px-3 text-indigo-400 font-bold">RazorShield Sentinel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Distributed Proxy Defense</td>
                <td className="py-2.5 px-3 text-slate-400 flex items-center gap-1.5"><XCircle size={13} className="text-red-400 shrink-0" /> Easily bypassed via rotating proxy pools</td>
                <td className="py-2.5 px-3 text-emerald-300 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> Intercepted via Redis sliding windows &amp; Louvain graph clustering</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">False Decline Management</td>
                <td className="py-2.5 px-3 text-slate-400 flex items-center gap-1.5"><XCircle size={13} className="text-red-400 shrink-0" /> Blunt hard decline (customer lost)</td>
                <td className="py-2.5 px-3 text-emerald-300 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> Rescued via out-of-band single-use UPI QR links</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Zero-Day Honeytokens</td>
                <td className="py-2.5 px-3 text-slate-400 flex items-center gap-1.5"><XCircle size={13} className="text-red-400 shrink-0" /> Not supported</td>
                <td className="py-2.5 px-3 text-emerald-300 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> 50 Luhn-Valid Canary Cards (0.00% False Positive Rate)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Autonomous Agent Support</td>
                <td className="py-2.5 px-3 text-slate-400 flex items-center gap-1.5"><XCircle size={13} className="text-red-400 shrink-0" /> Blocked as automated scrapers</td>
                <td className="py-2.5 px-3 text-emerald-300 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> Verified via Google AP2 JWT attestation headers</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Decision Latency</td>
                <td className="py-2.5 px-3 text-slate-400">&gt;150ms with external rules</td>
                <td className="py-2.5 px-3 text-emerald-300 font-semibold font-mono">p50: 9.08ms | p99: 13.86ms (strict synchronous budget)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
