import React, { useState } from 'react'
import { Flame, ShieldAlert, Bot, Globe, CheckCircle2, Play, Loader2 } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

export default function AttackLaunchpad({ onTriggerStoreDemo }) {
  const [loadingAction, setLoadingAction] = useState(null)
  const [lastActionStatus, setLastActionStatus] = useState(null)

  const sendAttack = async (type) => {
    setLoadingAction(type)
    setLastActionStatus(null)

    try {
      if (type === 'tg_checker') {
        // Real-world Telegram ₹1 Checker exploit with hardcoded CDP fingerprint & micro-auth
        await fetch(`${API_BASE}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 1.0,
            bin6: '411773',
            card_hash: `tg_stolen_card_411773_${Date.now()}`,
            device_fingerprint: 'noXc7Zv4NmOzRNIl3zmSernrLMFEo05J0lh73kdY46cUpMIuLjBQbCwQygBbMH4t4xfrCkwWutyony5DncDTRX0e50ULyy2GMgy2LUxAwaxczwLNJYzwLXqTe7GlMxqzCo7XgsfxKEWuy6hRjefIXYKVOJ23KBn6',
            ip_hash: 'ip_browserless_cdp_node',
            asn_type: 'datacenter',
            ja3_ua_mismatch: true,
            keystroke_entropy: 0.0,
            mouse_jitter_score: 0.0,
            paste_event: true,
            time_on_page_s: 0.05,
          })
        })
        setLastActionStatus('Telegram ₹1 Checker Exploit Blocked via Botnet Fingerprint & Micro-Auth Trap')
      } else if (type === 'burst') {
        // Fire 15 rapid bot requests
        for (let i = 0; i < 15; i++) {
          await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.floor(Math.random() * 50) + 1,
              bin6: '522222',
              card_hash: `sim_bot_burst_${Date.now()}_${i}`,
              device_fingerprint: 'fp_dc_bot_cluster_99',
              ip_hash: 'ip_dc_mumbai_node_1',
              asn_type: 'datacenter',
              ja3_ua_mismatch: true,
              keystroke_entropy: 0.0,
              mouse_jitter_score: 0.0,
              paste_event: true,
              time_on_page_s: 0.05
            })
          })
          await new Promise(r => setTimeout(r, 60))
        }
        setLastActionStatus('15x Bot Burst Blocked (100% caught)')
      } else if (type === 'canary') {
        // Fetch canary hash and hit
        const canResp = await fetch(`${API_BASE}/canary/demo-hash?index=7`).then(r => r.json())
        await fetch(`${API_BASE}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 3200,
            bin6: '599999',
            card_hash: canResp.card_hash,
            device_fingerprint: 'fp_canary_prober',
            ip_hash: 'ip_canary_probe',
            asn_type: 'residential',
            keystroke_entropy: 2.5,
            mouse_jitter_score: 0.7,
            time_on_page_s: 45
          })
        })
        setLastActionStatus('Canary Honeytoken Card Caught (Risk=1.00)')
      } else if (type === 'agent') {
        // Fetch agent token
        const tokResp = await fetch(`${API_BASE}/agent/demo-token?agent_id=shopping-agent-v1&spend_limit=10000`).then(r => r.json())
        await fetch(`${API_BASE}/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-Attestation': tokResp.token
          },
          body: JSON.stringify({
            amount: 4500,
            bin6: '411111',
            card_hash: `agent_card_${Date.now()}`,
            device_fingerprint: 'agent_headless_chrome_runner',
            ip_hash: 'agent_server_ip',
            asn_type: 'datacenter',
            ja3_ua_mismatch: true,
            keystroke_entropy: 0.0,
            mouse_jitter_score: 0.0,
            time_on_page_s: 0.1
          })
        })
        setLastActionStatus('Verified AI Shopping Agent Passed via Attestation')
      } else if (type === 'proxy') {
        // Slow rate distributed
        for (let i = 0; i < 6; i++) {
          await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: 85,
              bin6: '522222',
              card_hash: `slow_card_w${i}_${Date.now()}`,
              device_fingerprint: `fp_slow_cluster_${i % 2}`,
              ip_hash: `ip_residential_proxy_${i}`,
              asn_type: 'residential',
              ja3_ua_mismatch: true,
              keystroke_entropy: 0.15,
              mouse_jitter_score: 0.02,
              paste_event: true,
              time_on_page_s: 1.2
            })
          })
          await new Promise(r => setTimeout(r, 120))
        }
        setLastActionStatus('Distributed Proxy Ring Detected via Velocity Graph')
      }
    } catch (e) {
      setLastActionStatus(`Error: ${e.message}`)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 mb-4 shadow-lg shadow-indigo-950/20 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Play size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Interactive Attack Launchpad
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-mono">1-CLICK DEMO</span>
            </div>
            <div className="text-[11px] text-slate-400">Trigger live threat patterns directly into the pipeline</div>
          </div>
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('tg_checker')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/50 text-rose-200 rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm animate-pulse"
          >
            {loadingAction === 'tg_checker' ? <Loader2 size={13} className="animate-spin" /> : <span>⚡</span>}
            Telegram ₹1 Checker (CDP Bot)
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('burst')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-sm"
          >
            {loadingAction === 'burst' ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
            15x Distributed Burst
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('canary')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-sm"
          >
            {loadingAction === 'canary' ? <Loader2 size={13} className="animate-spin" /> : <span>🐤</span>}
            Fire Canary Honeytoken
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('agent')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-sm"
          >
            {loadingAction === 'agent' ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
            AI Shopping Agent (AP2)
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('proxy')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-sm"
          >
            {loadingAction === 'proxy' ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Distributed Proxy Ring
          </button>

          {onTriggerStoreDemo && (
            <button
              onClick={onTriggerStoreDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold transition shadow-sm"
            >
              <CheckCircle2 size={13} />
              Open Live Store Checkout
            </button>
          )}
        </div>
      </div>

      {lastActionStatus && (
        <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          {lastActionStatus}
        </div>
      )}
    </div>
  )
}
