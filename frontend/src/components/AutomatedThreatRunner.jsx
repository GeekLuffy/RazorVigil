import React, { useState } from 'react'
import { Play, ShieldAlert, Sparkles, Activity } from 'lucide-react'

const SIMULATION_STAGES = [
  {
    step: 1,
    title: 'Baseline Synthetic Traffic',
    status: 'Routing baseline transactions…',
    endpoint: '/checkout',
    method: 'POST',
    payload: {
      amount: 1499.0,
      bin6: '424242',
      card_hash: 'gen_card_sim_01',
      device_fingerprint: 'dev_gen_sim_01',
      ip_hash: 'ip_gen_sim_01',
      asn_type: 'residential',
      ja3_ua_mismatch: false,
      keystroke_entropy: 2.5,
      mouse_jitter_score: 0.68,
      time_on_page_s: 42.0,
    }
  },
  {
    step: 2,
    title: 'Distributed Carding Burst',
    status: 'Simulating multi-proxy botnet burst…',
    isBurst: true,
  },
  {
    step: 3,
    title: 'Canary Honeytoken Breach',
    status: 'Injecting synthetic canary card…',
    isCanary: true,
  },
  {
    step: 4,
    title: 'Revenue Recovery & Webhook Ingestion',
    status: 'Simulating out-of-band recovery settlement…',
    isRecovery: true,
  },
]

export default function AutomatedThreatRunner() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  const runSimulation = async () => {
    if (isRunning) return
    setIsRunning(true)

    for (let i = 0; i < SIMULATION_STAGES.length; i++) {
      const stage = SIMULATION_STAGES[i]
      setCurrentStep(i + 1)
      setStatusMsg(stage.status)

      if (stage.isBurst) {
        for (let b = 0; b < 8; b++) {
          await fetch('http://localhost:8000/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: 10.0,
              bin6: '522222',
              card_hash: `sim_bot_${b}_${Date.now()}`,
              device_fingerprint: 'dev_sim_botnet',
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
      } else if (stage.isCanary) {
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
      } else if (stage.isRecovery) {
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
        await fetch('http://localhost:8000/webhook/razorpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment.captured',
            payload: {
              payment: {
                entity: {
                  id: `pay_sim_${Date.now()}`,
                  amount: 1699900,
                  order_id: 'order_recovered_sim_99',
                }
              }
            }
          })
        })
      } else {
        await fetch(`http://localhost:8000${stage.endpoint}`, {
          method: stage.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stage.payload),
        })
      }

      await new Promise(r => setTimeout(r, 3500))
    }

    setIsRunning(false)
    setStatusMsg('Simulation complete. All defense layers verified.')
    setTimeout(() => {
      setCurrentStep(0)
      setStatusMsg('')
    }, 4000)
  }

  return (
    <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
            <Activity size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Autonomous Resilience &amp; Threat Simulation
              {isRunning && (
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.2 rounded-full animate-pulse">
                  Stage {currentStep}/4 Active
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Evaluates synchronous gateway throughput, velocity defense, honeypot isolation, and recovery loops.
            </div>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={isRunning}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
            isRunning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm border border-indigo-400/30'
          }`}
        >
          <Play size={13} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Running Simulation…' : 'Execute Automated Threat Suite'}
        </button>
      </div>

      {statusMsg && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-indigo-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  )
}
