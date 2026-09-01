import React, { useState, useEffect } from 'react'
import {
  Package,
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  Shield,
  Layers,
  ExternalLink,
  X,
  FileCode,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react'
import { API_BASE } from '../config'

export default function IntegrationExportModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('sdk') // 'sdk' | 'rules'
  const [selectedLang, setSelectedLang] = useState('nodejs')
  const [sdkData, setSdkData] = useState(null)
  const [rulesData, setRulesData] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        const [resSdk, resRules] = await Promise.all([
          fetch(`${API_BASE}/export/sdk-snippets`),
          fetch(`${API_BASE}/export/rules`),
        ])
        if (resSdk.ok) {
          const s = await resSdk.json()
          setSdkData(s.snippets)
        }
        if (resRules.ok) {
          const r = await resRules.json()
          setRulesData(r)
        }
      } catch (err) {
        console.error('Failed to load export data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen])

  if (!isOpen) return null

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const handleDownloadJSON = (data, filename) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', filename)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const currentSnippet = sdkData ? sdkData[selectedLang] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Merchant Integration &amp; 1-Click WAF Export
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Turnkey Adoption
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Drop-in SDK snippets for Node.js, Python, Go, and Java, plus ready-to-deploy Cloudflare and Razorpay rules.
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

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800/80 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('sdk')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'sdk'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 size={14} />
            Drop-in SDK Snippets (&lt;5 Lines)
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe size={14} />
            Cloudflare WAF &amp; Razorpay Risk Rules JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 font-mono text-xs">
          {activeTab === 'sdk' ? (
            <div className="space-y-4">
              {/* Language Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'nodejs', label: 'Node.js / Express' },
                    { id: 'python', label: 'Python / FastAPI' },
                    { id: 'go', label: 'Go (Golang)' },
                    { id: 'java', label: 'Java Spring Boot' },
                    { id: 'curl', label: 'cURL / REST API' },
                  ].map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLang(lang.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                        selectedLang === lang.id
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <Sparkles size={12} />
                  &lt;10ms Synchronous SLA
                </div>
              </div>

              {/* Code Snippet Card */}
              {currentSnippet ? (
                <div className="space-y-3">
                  {/* Installation Command */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Terminal size={14} className="text-indigo-400" />
                      <span>{currentSnippet.package}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(currentSnippet.package, 'pkg')}
                      className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                    >
                      {copiedKey === 'pkg' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copiedKey === 'pkg' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Integration Code */}
                  <div className="relative p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
                      <span>{currentSnippet.language}</span>
                      <button
                        onClick={() => handleCopy(currentSnippet.code, 'code')}
                        className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                      >
                        {copiedKey === 'code' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedKey === 'code' ? 'Copied Code' : 'Copy Code'}
                      </button>
                    </div>

                    <pre className="text-slate-200 overflow-x-auto leading-relaxed text-xs">
                      <code>{currentSnippet.code}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">Loading code snippets...</div>
              )}
            </div>
          ) : (
            /* WAF & Ruleset Export View */
            <div className="space-y-4">
              {rulesData ? (
                <div className="space-y-4">
                  {/* Cloudflare WAF Card */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <Globe size={15} className="text-amber-400" />
                        Cloudflare WAF Expression (Layer 7 Ingress Filter)
                      </div>
                      <button
                        onClick={() => handleCopy(rulesData.cloudflare_waf?.expression, 'cf')}
                        className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                      >
                        {copiedKey === 'cf' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedKey === 'cf' ? 'Copied WAF' : 'Copy Expression'}
                      </button>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg text-indigo-300 break-all leading-relaxed">
                      {rulesData.cloudflare_waf?.expression}
                    </div>
                  </div>

                  {/* Razorpay Risk Rules JSON Card */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <Shield size={15} className="text-emerald-400" />
                        Razorpay Thirdwatch AI Risk Ruleset JSON
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(JSON.stringify(rulesData.razorpay_risk_rules, null, 2), 'rzp')}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                        >
                          {copiedKey === 'rzp' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {copiedKey === 'rzp' ? 'Copied' : 'Copy JSON'}
                        </button>
                        <button
                          onClick={() => handleDownloadJSON(rulesData.razorpay_risk_rules, 'razorpay_risk_rules.json')}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                        >
                          <Download size={12} />
                          Download .json
                        </button>
                      </div>
                    </div>

                    <pre className="p-3 bg-slate-900 rounded-lg text-slate-300 overflow-x-auto max-h-48 text-[11px]">
                      <code>{JSON.stringify(rulesData.razorpay_risk_rules, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">Loading threat ruleset data...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
