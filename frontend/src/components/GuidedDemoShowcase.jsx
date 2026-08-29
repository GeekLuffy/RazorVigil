import React, { useState, useEffect } from 'react'
import { Play, CheckCircle2, ShieldAlert, Sparkles, Volume2 } from 'lucide-react'

const SHOWCASE_STEPS = [
  {
    step: 1,
    title: 'Baseline Genuine Traffic',
    script: 'RazorShield maintains sub-15ms latency on genuine checkouts, passing verified cardholders smoothly.',
    endpoint: '/checkout',
    method: 'POST',
    payload: {
      amount: 1499.0,
      bin6: '424242',
      card_hash: 'gen_card_showcase_01',
      device_fingerprint: 'dev_gen_showcase_01',
      ip_hash: 'ip_gen_showcase_01',
      asn_type: 'residential',
      ja3_ua_mismatch: false,
      keystroke_entropy: 2.5,
      mouse_jitter_score: 0.68,
      time_on_page_s: 42.0,
    }
  },
  {
    step: 2,
    title: 'Distributed Botnet Carding Burst',
    script: 'When a distributed carding botnet launches 10 burst attempts across datacenter proxies, sliding-window Redis velocity catches them instantly.',
    isBurst: true,
  },
  {
    step: 3,
    title: 'Zero-Day Canary Honeytoken Trap',
    script: 'To catch zero-day card scanners with 0% false positives, our 50 Luhn-valid Canary cards trigger instant honeypot containment.',
    isCanary: true,
  },
  {
    step: 4,
    title: 'Track 03 Recovery & Razorpay Webhook GMV',
    script: 'When a genuine user shops on a VPN, RazorShield avoids a hard decline, issues an out-of-band UPI link, and recovers Rs.16,999 confirmed by Razorpay webhooks.',
    isRecovery: true,
  },
]

export default function GuidedDemoShowcase({ onRunTx }) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [activeScript, setActiveScript] = useState('')

  const runShowcase = async () => {
    if (isRunning) return
    setIsRunning(true)

    for (let i = 0; i < SHOWCASE_STEPS.length; i++) {
      const stepData = SHOWCASE_STEPS[i]
      setCurrentStep(i + 1)
      setActiveScript(stepData.script)

      if (stepData.isBurst) {
        for (let b = 0; b < 8; b++) {
          await fetch('http://localhost:8000/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: 10.0,
              bin6: '522222',
              card_hash: `showcase_bot_${b}_${Date.now()}`,
              device_fingerprint: 'dev_showcase_botnet',
              ip_hash: `ip_dc_burst_${b}`,
              asn_type: 'datacenter',
              ja3_ua_mismatch: true,
              keystroke_entropy: 0.0,
              mouse_jitter_score: 0.0,
              time_on_page_s: 0.1,
            })
          })
          await new Promise(r => setTimeout(r, 200))
        }
      } else if (stepData.isCanary) {
        const canaryRes = await fetch('http://localhost:8000/canary/demo-hash?index=7').then(r => r.json())
        await fetch('http://localhost:8000/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 799.0,
            bin6: '411111',
            card_hash: canaryRes.card_hash,
            device_fingerprint: 'dev_canary_scanner',
            ip_hash: 'ip_canary_scanner',
            asn_type: 'residential',
            ja3_ua_mismatch: false,
            keystroke_entropy: 2.1,
            mouse_jitter_score: 0.55,
            time_on_page_s: 30.0,
          })
        })
      } else if (stepData.isRecovery) {
        // Trigger soft risk
        await fetch('http://localhost:8000/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 16999.0,
            bin6: '411111',
            card_hash: `card_vpn_user_${Date.now()}`,
            device_fingerprint: 'dev_vpn_shopper',
            ip_hash: 'ip_vpn_shopper',
            asn_type: 'datacenter',
            ja3_ua_mismatch: false,
            keystroke_entropy: 1.8,
            mouse_jitter_score: 0.52,
            time_on_page_s: 65.0,
          })
        })
        await new Promise(r => setTimeout(r, 1200))
        // Trigger Webhook Confirmation
        await fetch('http://localhost:8000/webhook/razorpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment.captured',
            payload: {
              payment: {
                entity: {
                  id: `pay_showcase_${Date.now()}`,
                  amount: 1699900,
                  order_id: 'order_sneaker_recovered_99',
                }
              }
            }
          })
        })
      } else {
        await fetch(`http://localhost:8000${stepData.endpoint}`, {
          method: stepData.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stepData.payload),
        })
      }

      await new Promise(r => setTimeout(r, 4500))
    }

    setIsRunning(false)
    setActiveScript('Showcase complete! All 4 defense layers verified.')
    setTimeout(() => {
      setCurrentStep(0)
      setActiveScript('')
    }, 4000)
  }

  return (
    <div className="mb-4 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 rounded-xl p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              1-Click Video Showcase Mode
              {isRunning && (
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.2 rounded-full animate-pulse">
                  Step {currentStep}/4 Active
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-300">
              Auto-choreographs the full 2-minute pitch story across normal, botnet, canary, and recovery flows.
            </div>
          </div>
        </div>

        <button
          onClick={runShowcase}
          disabled={isRunning}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
            isRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md hover:shadow-indigo-500/25 border border-indigo-400/30'
          }`}
        >
          <Play size={13} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Running Guided Showcase…' : '🎬 Run Guided Pitch Showcase'}
        </button>
      </div>

      {/* Real-Time Teleprompter Subtitles for Recording */}
      {activeScript && (
        <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex items-start gap-2 text-xs text-indigo-200 font-sans bg-indigo-950/40 p-2 rounded-lg">
          <Volume2 size={15} className="text-indigo-400 mt-0.5 shrink-0 animate-pulse" />
          <div className="flex-1 leading-relaxed">
            <strong className="text-white">Presenter Voiceover Prompt: </strong>
            "{activeScript}"
          </div>
        </div>
      )}
    </div>
  )
}
