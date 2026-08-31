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
  Play
} from 'lucide-react'

const TOUR_STEPS = [
  {
    title: "1. What is RazorShield Sentinel?",
    subtitle: "Plain-English Overview for Executives & Evaluators",
    icon: Shield,
    color: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-400",
    content: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-300">
        <p>
          Every second, automated carding botnets test stolen credit cards on merchant stores using micro-transactions (₹1 to ₹499). Traditional payment gateways often fail to detect them or issue blunt false declines that drive away legitimate shoppers.
        </p>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="text-white font-bold flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            How RazorShield Solves This in &lt;10ms:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong className="text-emerald-400">Real Shoppers:</strong> Approved instantly in ~9 milliseconds with zero checkout friction.</li>
            <li><strong className="text-rose-400">Bots &amp; Carders:</strong> Blocked deterministically before they touch your payment gateway.</li>
            <li><strong className="text-amber-400">Borderline / VPN Users:</strong> Rescued via dynamic UPI QR code instead of getting falsely rejected.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    title: "2. The 3DS2 & OTP Anti-Bypass Defense",
    subtitle: "Neutralizing Modern Telegram Scrapers & Reverse Proxies",
    icon: Flame,
    color: "from-rose-500/20 to-amber-500/10 border-rose-500/30 text-rose-400",
    content: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-300">
        <p>
          Hackers use automated Telegram scripts and reverse proxies (Evilginx) to relay OTPs in under 10 milliseconds or forge bank verification tokens (CAVV).
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-rose-400 font-bold block mb-1">🤖 10ms Bot Relay</span>
            <p className="text-[11px] text-slate-400">
              Robots enter OTPs with 0ms keystroke hesitation (Entropy H = 0.00). RazorShield halts them on the spot.
            </p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">👤 Human Typing Cadence</span>
            <p className="text-[11px] text-slate-400">
              Real humans have natural typing jitter (Entropy H &gt; 1.20) and pass verification seamlessly.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "3. How to Navigate the 6 Workspaces",
    subtitle: "Everything You Can Click and Test Live",
    icon: BarChart3,
    color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
    content: (
      <div className="space-y-2 text-xs text-slate-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-indigo-400 font-bold block">1. Live SOC Gateway</span>
            <span className="text-[11px] text-slate-400">Watch live payment traffic stream in real-time.</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-rose-400 font-bold block">2. Threat Simulator</span>
            <span className="text-[11px] text-slate-400">Trigger 1-click carding bot simulations.</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block">3. Live Merchant Store</span>
            <span className="text-[11px] text-slate-400">Test a real checkout with Razorpay test cards.</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-amber-400 font-bold block">4. Active Defense WAF</span>
            <span className="text-[11px] text-slate-400">Auto-generated Cloudflare Edge firewall rules.</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-purple-400 font-bold block">5. Disputes &amp; Evidence</span>
            <span className="text-[11px] text-slate-400">Cryptographic 5-domain chargeback proof letters.</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-sky-400 font-bold block">6. Model Governance</span>
            <span className="text-[11px] text-slate-400">95% Conformal uncertainty &amp; 1-click auditor PDF.</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "4. Net Business ROI & Impact",
    subtitle: "Why Merchants & Razorpay Save Millions",
    icon: Scale,
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
    content: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-300">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-2xl font-bold font-mono text-emerald-400">₹1,200</span>
            <span className="text-[10px] text-slate-400 block mt-1">Fine Saved Per Attack</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-2xl font-bold font-mono text-indigo-400">9.08ms</span>
            <span className="text-[10px] text-slate-400 block mt-1">Average Response Time</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-2xl font-bold font-mono text-purple-400">99.7%</span>
            <span className="text-[10px] text-slate-400 block mt-1">Fraud Catch Rate</span>
          </div>
        </div>
        <p className="text-slate-400 text-center text-[11px]">
          By combining deep mathematical certainty (Split Conformal Prediction) with sovereign zero-trust 3DS checks, RazorShield Sentinel protects revenue without adding human review lag.
        </p>
      </div>
    )
  }
]

export default function ExecutiveGuideModal({ isOpen, onClose, onLaunchStore, onLaunchAttack }) {
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b101d] border border-indigo-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${step.color}`}>
              <Icon size={22} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                Guided Executive Tour • Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
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
        <div className="p-5 overflow-y-auto space-y-4 font-sans">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {step.subtitle}
          </div>
          {step.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition flex items-center gap-1"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}

            {currentStep < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition flex items-center gap-1.5"
              >
                Next Step
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition flex items-center gap-1.5"
              >
                Start Exploring Platform
                <CheckCircle2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
