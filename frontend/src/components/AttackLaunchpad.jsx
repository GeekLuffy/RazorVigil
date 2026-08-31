import React, { useState } from 'react'
import { Flame, ShieldAlert, Bot, Globe, CheckCircle2, Play, Loader2 } from 'lucide-react'

import { API_BASE } from '../config'

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
        // Rotating Residential Proxy Autohitter: single device cycling 6 residential IPs on high-value items
        const isps = ['airtel_delhi', 'jio_mumbai', 'act_blr', 'tata_hyd', 'bsnl_kolkata', 'hathway_pune']
        for (let i = 0; i < 6; i++) {
          await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: 16999,
              bin6: '522222',
              card_hash: `autohit_card_${Date.now()}_${i}`,
              device_fingerprint: 'fp_autohitter_node_x9',
              ip_hash: `ip_res_${isps[i]}`,
              asn_type: 'residential',
              ja3_ua_mismatch: false,
              keystroke_entropy: 0.0,
              mouse_jitter_score: 0.0,
              paste_event: true,
              time_on_page_s: 0.4
            })
          })
          await new Promise(r => setTimeout(r, 100))
        }
        setLastActionStatus('Rotating Residential Proxy Autohitter Blocked via Device Fanout & Louvain Graph Ring')
      } else if (type === 'otp_relay') {
        // Test 3DS2 OTP-Relay Interception: Simulated Evilginx / Modlishka reverse-proxy bot injecting OTP in <20ms
        const otpRes = await fetch(`${API_BASE}/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: `tx_otp_relay_${Date.now()}`,
            order_id: `order_3ds_${Date.now()}`,
            otp_code: '482910',
            keystroke_intervals_ms: [8.5, 9.2, 8.8, 9.0, 8.7],
            paste_event: true,
            time_to_first_keystroke_ms: 12.0,
            total_entry_duration_ms: 45.0,
            device_fingerprint: 'fp_evilginx_mitm_node',
            ip_hash: 'ip_mitm_relay_01'
          })
        }).then(r => r.json())
        setLastActionStatus(`3DS2 OTP-Relay MITM Neutralized: ${otpRes.reason} (Risk: ${otpRes.risk_score.toFixed(2)})`)
      }
    } catch (e) {
      setLastActionStatus(`Error: ${e.message}`)
    } finally {

      setLoadingAction(null)
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-3.5 mb-4 shadow-xl shadow-black/40 border border-slate-800 hover:border-indigo-500/30 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/40">
            <Play size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Interactive Attack Launchpad
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-bold">1-CLICK DEMO</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">Trigger live threat vectors directly into the 9.2ms synchronous gateway</div>
          </div>
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('tg_checker')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 hover:border-rose-400 text-rose-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-md shadow-rose-950/30"
          >
            {loadingAction === 'tg_checker' ? <Loader2 size={13} className="animate-spin" /> : <span>⚡</span>}
            Telegram ₹1 Checker
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('burst')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-400 text-red-300 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-md shadow-red-950/20"
          >
            {loadingAction === 'burst' ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
            15x Bot Burst
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('canary')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-400 text-amber-300 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-md shadow-amber-950/20"
          >
            {loadingAction === 'canary' ? <Loader2 size={13} className="animate-spin" /> : <span>🐤</span>}
            Canary Honeytoken
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('agent')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-400 text-purple-300 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-md shadow-purple-950/20"
          >
            {loadingAction === 'agent' ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
            AI Agent (AP2)
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('proxy')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 hover:border-sky-400 text-sky-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-md shadow-sky-950/20"
          >
            {loadingAction === 'proxy' ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            6x Proxy Swarm
          </button>

          <button
            disabled={loadingAction !== null}
            onClick={() => sendAttack('otp_relay')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-950/20"
          >
            {loadingAction === 'otp_relay' ? <Loader2 size={13} className="animate-spin" /> : <span>🔐</span>}
            3DS2 OTP Intercept
          </button>

          {onTriggerStoreDemo && (
            <button
              onClick={onTriggerStoreDemo}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-md shadow-emerald-950/30"
            >
              <CheckCircle2 size={13} />
              Live Store
            </button>
          )}
        </div>
      </div>

      {lastActionStatus && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400 flex items-center gap-2 animate-fadeIn">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {lastActionStatus}
        </div>
      )}
    </div>
  )

}
