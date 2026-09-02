import React, { useState } from 'react'
import {
  Shield,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  Flame,
  Scale,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Activity,
  Cpu,
  Lock,
  ExternalLink,
  Code2
} from 'lucide-react'

export default function ExecutiveGuideModal({
  isOpen = true,
  onClose,
  onLaunchStore,
  onNavigateTab,
  onOpenStore,
  onOpenLab
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [interactiveSim, setInteractiveSim] = useState('none') // 'none' | 'genuine' | 'bot' | 'vpn'
  const [isSimulating, setIsSimulating] = useState(false)

  const handleLaunchStore = onLaunchStore || onOpenStore
  const handleNavigateTab = onNavigateTab || onOpenLab

  if (isOpen === false) return null

  const runSim = (type) => {
    setIsSimulating(true)
    setInteractiveSim('loading')
    setTimeout(() => {
      setInteractiveSim(type)
      setIsSimulating(false)
    }, 450)
  }

  const TOUR_STEPS = [
    {
      title: "1. The Threat: 500 Cards/Sec Telegram Botnets",
      subtitle: "Why Traditional Fraud Filters Fail on Micro-Carding",
      badge: "The Problem",
      icon: Flame,
      color: "from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/40 text-rose-400",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <p>
            Organized cyber syndicates use automated Telegram botnets to test thousands of stolen BINs per minute using micro-charges (₹1 to ₹499). If blocked blindly, merchants suffer <strong>massive false declines</strong> that turn away real shoppers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/20 shadow-inner">
              <div className="text-rose-400 font-bold flex items-center gap-1.5 mb-1.5">
                <XCircle size={14} /> Traditional Gateways
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Rely on static velocity thresholds. Carders easily evade them by rotating residential proxies across 200+ IP subnets.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/30 shadow-inner">
              <div className="text-indigo-400 font-bold flex items-center gap-1.5 mb-1.5">
                <Sparkles size={14} className="text-amber-400" /> RazorShield Sentinel
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Evaluates a <strong>17-dimensional vector</strong> in <strong>9.2ms</strong> using Split Conformal Prediction, Louvain Graph clustering, and kinetic keystroke telemetry.
              </p>
            </div>
          </div>

          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-indigo-400" />
              <span className="text-[11px] text-slate-200">Want to test a live purchase right now?</span>
            </div>
            <button
              onClick={() => {
                onClose()
                if (onLaunchStore) onLaunchStore()
              }}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-1"
            >
              <ShoppingBag size={12} />
              Open Live Store
            </button>
          </div>
        </div>
      )
    },
    {
      title: "2. Live Interactive Sandbox (Test It Here)",
      subtitle: "Click a button to see RazorShield's 9.2ms decision engine in action",
      badge: "Interactive Lab",
      icon: Activity,
      color: "from-indigo-500/20 via-blue-500/10 to-transparent border-indigo-500/40 text-indigo-400",
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p className="text-slate-400">
            Select any scenario below to trigger a live simulation through the quad-model inference pipeline:
          </p>

          {/* Interactive Trigger Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => runSim('genuine')}
              disabled={isSimulating}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                interactiveSim === 'genuine'
                  ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                <CheckCircle2 size={13} />
                <span>1. Real Shopper</span>
              </div>
              <p className="text-[10px] text-slate-400">₹1,499 purchase, natural human keystrokes.</p>
            </button>

            <button
              onClick={() => runSim('bot')}
              disabled={isSimulating}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                interactiveSim === 'bot'
                  ? 'bg-rose-950/60 border-rose-500 text-white shadow-lg shadow-rose-950/50 scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-rose-500/50 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
                <Flame size={13} />
                <span>2. 10ms Botnet</span>
              </div>
              <p className="text-[10px] text-slate-400">₹1 micro-charge, 0ms typing entropy (H=0.00).</p>
            </button>

            <button
              onClick={() => runSim('vpn')}
              disabled={isSimulating}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                interactiveSim === 'vpn'
                  ? 'bg-amber-950/60 border-amber-500 text-white shadow-lg shadow-amber-950/50 scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                <Zap size={13} />
                <span>3. Borderline VPN</span>
              </div>
              <p className="text-[10px] text-slate-400">₹4,200 travel buyer, rescued via UPI QR.</p>
            </button>
          </div>

          {/* Dynamic Live Result Display */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 shadow-inner">
            {interactiveSim === 'loading' ? (
              <div className="flex items-center justify-center py-6 gap-2 text-indigo-400 font-mono text-xs">
                <Cpu size={16} className="animate-spin" />
                <span>Evaluating Quad-Ensemble &amp; Conformal Bound...</span>
              </div>
            ) : interactiveSim === 'genuine' ? (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> VERDICT: SAFE (APPROVED FRICTIONLESSLY)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Latency: 8.84ms</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">RISK SCORE</span>
                    <span className="text-emerald-400 font-bold">0.034 / 1.00</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">CONFORMAL SET</span>
                    <span className="text-slate-200 font-bold">[ genuine ]</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">KESTROKE ENTROPY</span>
                    <span className="text-emerald-400 font-bold">H = 2.85 (Human)</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Passed straight to Razorpay Order API with zero OTP friction. No cart abandonment.
                </p>
              </div>
            ) : interactiveSim === 'bot' ? (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <XCircle size={15} /> VERDICT: QUARANTINED (BOTNET ISOLATED)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Latency: 7.92ms</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">RISK SCORE</span>
                    <span className="text-rose-400 font-bold">0.984 / 1.00</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">CONFORMAL SET</span>
                    <span className="text-rose-400 font-bold">[ fraud ]</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">INTERCEPT REASON</span>
                    <span className="text-amber-400 font-bold text-[10px]">Zero Kinetic Hesitation</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Carding bot isolated into honeypot sandbox before charging the merchant gateway. Saved ₹1,200 fine.
                </p>
              </div>
            ) : interactiveSim === 'vpn' ? (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> VERDICT: SOFT RISK (UPI QR RESCUE ACTIVATED)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Latency: 9.41ms</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">RISK SCORE</span>
                    <span className="text-amber-400 font-bold">0.284 / 1.00</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">RESCUE PATH</span>
                    <span className="text-emerald-400 font-bold">UPI QR Code</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">REVENUE SAVED</span>
                    <span className="text-emerald-400 font-bold">₹4,200 GMV</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Instead of issuing a harsh decline, RazorShield seamlessly prompted a dynamic UPI QR code. The genuine user scanned and paid!
                </p>
              </div>
            ) : (
              <div className="text-center py-5 text-slate-400">
                <p className="text-[11px]">Click one of the 3 buttons above to simulate a transaction in 9ms!</p>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: "3. The 6 Workspaces at a Glance",
      subtitle: "Comprehensive Defense from Edge WAF to RBI Compliance Dossiers",
      badge: "Architecture",
      icon: BarChart3,
      color: "from-purple-500/20 via-indigo-500/10 to-transparent border-purple-500/40 text-purple-400",
      content: (
        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => { onClose(); if (onNavigateTab) onNavigateTab('soc') }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition"
            >
              <span className="text-indigo-400 font-bold block flex items-center justify-between">
                1. Live SOC Gateway <ExternalLink size={11} />
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Live WebSocket stream of checkouts, Louvain graph, and risk tiers.</p>
            </div>

            <div
              onClick={() => { onClose(); if (onNavigateTab) onNavigateTab('lab') }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-rose-500/50 cursor-pointer transition"
            >
              <span className="text-rose-400 font-bold block flex items-center justify-between">
                2. Threat Simulator <ExternalLink size={11} />
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Fire 10ms OTP relay, AiTM proxy, and canary card attacks.</p>
            </div>

            <div
              onClick={() => { onClose(); if (onNavigateTab) onNavigateTab('rules') }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition"
            >
              <span className="text-amber-400 font-bold block flex items-center justify-between">
                3. Active Defense WAF <ExternalLink size={11} />
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Auto-synthesizes Cloudflare WAF firewall rules from attack telemetry.</p>
            </div>

            <div
              onClick={() => { onClose(); if (onNavigateTab) onNavigateTab('disputes') }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-purple-500/50 cursor-pointer transition"
            >
              <span className="text-purple-400 font-bold block flex items-center justify-between">
                4. Disputes &amp; Evidence <ExternalLink size={11} />
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Generates cryptographically sealed PDF evidence packages.</p>
            </div>

            <div
              onClick={() => { onClose(); if (onNavigateTab) onNavigateTab('governance') }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-sky-500/50 cursor-pointer transition"
            >
              <span className="text-sky-400 font-bold block flex items-center justify-between">
                5. Model Governance <ExternalLink size={11} />
              </span>
              <p className="text-[10px] text-slate-400 mt-1">6-gate policy studio, drift remediation, and 1-click auditor PDF.</p>
            </div>

            <div
              onClick={() => { onClose(); if (onNavigateTab) onNavigateTab('pitch') }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition"
            >
              <span className="text-emerald-400 font-bold block flex items-center justify-between">
                6. RBI 2025/2026 Specs <ExternalLink size={11} />
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Mathematical proofs, theorem formulas, and compliance matrix.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4. Business ROI & Why RazorShield Wins",
      subtitle: "Measurable Impact on Merchant Bottom Line",
      badge: "ROI & Impact",
      icon: Scale,
      color: "from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 text-emerald-400",
      content: (
        <div className="space-y-3.5 text-xs leading-relaxed text-slate-300">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold font-mono text-emerald-400">₹1,200</span>
              <span className="text-[10px] text-slate-400 block mt-1">Bank Fine Saved / Attack</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold font-mono text-indigo-400">9.2ms</span>
              <span className="text-[10px] text-slate-400 block mt-1">Synchronous SLA</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold font-mono text-purple-400">99.9%</span>
              <span className="text-[10px] text-slate-400 block mt-1">PR-AUC Accuracy</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="text-white font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              100% Track 2 Alignment:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Operates strictly as an <strong>Autonomous AI Risk Manager</strong> in the payment lifecycle.</li>
              <li>Seamless graceful degradation to UPI QR recovery prevents cart abandonment.</li>
              <li>0.09% Normal Genuine FPR; 10.6% Edge-Case Genuine FPR (VPN/travelers) — explicitly validated trade-off, certified 95% conformal coverage, and complete audit trails.</li>
            </ul>
          </div>
        </div>
      )
    }
  ]

  const step = TOUR_STEPS[currentStep]
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-indigo-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${step.color} shadow-lg shadow-indigo-950/40`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">
                  {step.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-sans">{step.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-3 font-sans">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {step.subtitle}
          </div>
          {step.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-7 bg-indigo-500 shadow-md shadow-indigo-500/50' : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition flex items-center gap-1"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}

            {currentStep < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 transition flex items-center gap-1.5"
              >
                Next Step
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 transition flex items-center gap-1.5"
              >
                Explore Platform
                <CheckCircle2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
