import React, { useState } from 'react'
import {
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Download,
  Play,
  RotateCcw,
  Clock,
  Cpu,
  Database,
  BarChart2,
  TrendingDown,
  X,
  Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ReferenceLine,
  Cell
} from 'recharts'
import { API_BASE } from '../config'

export default function StressBenchmarkModal({ isOpen, onClose }) {
  const [concurrency, setConcurrency] = useState(50)
  const [totalRequests, setTotalRequests] = useState(300)
  const [profile, setProfile] = useState('mixed')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [benchmarkResult, setBenchmarkResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  if (!isOpen) return null

  const handleRunBenchmark = async () => {
    setRunning(true)
    setErrorMsg(null)
    setProgress(15)

    const progressTimer = setInterval(() => {
      setProgress(p => Math.min(p + 15, 90))
    }, 200)

    try {
      const res = await fetch(`${API_BASE}/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concurrency,
          total_requests: totalRequests,
          profile,
        }),
      })

      if (!res.ok) {
        throw new Error(`Benchmark failed with HTTP ${res.status}`)
      }

      const data = await res.json()
      setProgress(100)
      setBenchmarkResult(data)
    } catch (err) {
      console.error('Benchmark execution error:', err)
      setErrorMsg(err.message || 'Failed to complete stress benchmark.')
    } finally {
      clearInterval(progressTimer)
      setRunning(false)
    }
  }

  const handleExportJSON = () => {
    if (!benchmarkResult) return
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(benchmarkResult, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `razorshield_sla_benchmark_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                Live In-App Stress Benchmark &amp; SLA Verification Gauge
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Target: &lt;15ms p99 SLA
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Executes parallel asynchronous checkout evaluations through the full 8-layer quad-ensemble pipeline.
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

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 font-sans">
          {/* Controls Bar */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              {/* Requests Selector */}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Total Requests</span>
                <select
                  value={totalRequests}
                  onChange={e => setTotalRequests(Number(e.target.value))}
                  disabled={running}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={100}>100 Requests</option>
                  <option value={300}>300 Requests</option>
                  <option value={500}>500 Requests</option>
                  <option value={1000}>1,000 Requests</option>
                </select>
              </div>

              {/* Concurrency Selector */}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Concurrency (Workers)</span>
                <select
                  value={concurrency}
                  onChange={e => setConcurrency(Number(e.target.value))}
                  disabled={running}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={10}>10 Concurrent</option>
                  <option value={25}>25 Concurrent</option>
                  <option value={50}>50 Concurrent</option>
                  <option value={100}>100 Concurrent</option>
                </select>
              </div>

              {/* Profile Selector */}
              <div>
                <span className="text-slate-400 block text-[10px] uppercase mb-1">Traffic Profile</span>
                <select
                  value={profile}
                  onChange={e => setProfile(e.target.value)}
                  disabled={running}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value="mixed">Mixed (80% Safe, 20% Bot)</option>
                  <option value="attack_heavy">Adversarial Burst (100% Attacks)</option>
                  <option value="clean_shoppers">Clean Shoppers (100% Genuine)</option>
                </select>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunBenchmark}
              disabled={running}
              className={`btn font-bold font-mono text-xs py-2 px-5 flex items-center gap-2 ${
                running
                  ? 'bg-amber-600 text-white cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/40'
              }`}
            >
              {running ? (
                <>
                  <Activity size={15} className="animate-spin" />
                  Running ({progress}%)...
                </>
              ) : (
                <>
                  <Play size={15} />
                  Run Live Benchmark
                </>
              )}
            </button>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)}>✕</button>
            </div>
          )}

          {/* Benchmark Results */}
          {benchmarkResult && (
            <div className="space-y-5 animate-fadeIn">
              {/* SLA Verification Hero Card */}
              <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/40 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${
                    benchmarkResult.sla.passed
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  }`}>
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      SLA Performance Verdict
                    </div>
                    <div className="text-xl font-bold text-white font-sans flex items-center gap-2">
                      {benchmarkResult.sla.passed ? 'SLA VERIFIED (<15ms p99)' : 'SLA THRESHOLD BREACH'}
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {benchmarkResult.sla.compliance_pct}% within SLA
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Evaluated {benchmarkResult.total_requests} checkouts in {benchmarkResult.wall_time_seconds}s · Effective Throughput: <span className="text-emerald-400 font-bold">{benchmarkResult.throughput_qps} QPS</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportJSON}
                  className="btn btn-secondary text-xs font-mono flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Download size={13} />
                  Export Audit JSON
                </button>
              </div>

              {/* 6 Key SRE Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">p50 Latency</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{benchmarkResult.percentiles.p50} ms</div>
                  <div className="text-[10px] text-slate-500">Median Response</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">p95 Latency</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{benchmarkResult.percentiles.p95} ms</div>
                  <div className="text-[10px] text-slate-500">95th Percentile</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">p99 Latency</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{benchmarkResult.percentiles.p99} ms</div>
                  <div className="text-[10px] text-slate-500">&lt;15ms Target</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Throughput</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono mt-1">{benchmarkResult.throughput_qps}</div>
                  <div className="text-[10px] text-slate-500">Req / Second</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Memory RSS</div>
                  <div className="text-lg font-bold text-indigo-400 font-mono mt-1">{benchmarkResult.system_metrics.process_memory_rss_mb} MB</div>
                  <div className="text-[10px] text-slate-500">Process Footprint</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Conformal Coverage</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-1">{benchmarkResult.conformal_empirical_coverage_pct}%</div>
                  <div className="text-[10px] text-slate-500">&ge;95% Target</div>
                </div>
              </div>

              {/* 2 Charts Grid: Latency Histogram (Left) & CDF Curve (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Latency Distribution Histogram */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <BarChart2 size={14} className="text-indigo-400" />
                        Synchronous Latency Histogram
                      </h4>
                      <p className="text-[11px] text-slate-400">Distribution of evaluated checkouts across latency buckets</p>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={benchmarkResult.histogram} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="range"
                          stroke="#64748b"
                          tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                          formatter={(value) => [`${value} requests`, 'Count']}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {benchmarkResult.histogram.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.is_breach ? '#f43f5e' : index < 4 ? '#10b981' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Cumulative Distribution Function (CDF) */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <TrendingDown size={14} className="text-emerald-400" />
                        Cumulative Distribution Function (CDF)
                      </h4>
                      <p className="text-[11px] text-slate-400">Percentile vs Latency curve confirming zero long-tail spikes</p>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={benchmarkResult.cdf} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                        <defs>
                          <linearGradient id="cdfGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="percentile"
                          stroke="#64748b"
                          tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                          unit="%"
                        />
                        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit="ms" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                          formatter={(value) => [`${value} ms`, 'Latency']}
                          labelFormatter={(label) => `Percentile: ${label}%`}
                        />
                        <ReferenceLine y={15} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '15ms SLA', fill: '#f43f5e', fontSize: 10 }} />
                        <Area type="monotone" dataKey="latency_ms" stroke="#10b981" strokeWidth={2} fill="url(#cdfGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Initial State Prompt */}
          {!benchmarkResult && !running && (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
              <Sparkles size={32} className="text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-white font-sans">Ready to Run Live SLA Stress Benchmark</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Click <strong>"Run Live Benchmark"</strong> to execute 300 real parallel checkout evaluations across all 8 layers and generate real-time p50/p95/p99 histograms and CDF SLA verification curves.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
