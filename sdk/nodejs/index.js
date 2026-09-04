/**
 * Official Node.js / TypeScript SDK for RazorShield Sentinel payment defense.
 */

export class RazorShieldSentinel {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.RAZORSHIELD_API_KEY
    this.baseUrl = (config.baseUrl || 'http://127.0.0.1:8000').replace(/\/$/, '')
    this.timeout = config.timeout || 15
  }

  async evaluate(payload) {
    try {
      const res = await fetch(`${this.baseUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      // Sub-15ms fail-safe fallback to prevent checkout friction
      return {
        transaction_id: payload.transaction_id || 'fallback_tx',
        decision: 'allow',
        tier: 'safe',
        risk_score: 0.0,
        conformal_set: ['genuine']
      }
    }
  }
}

export class RazorVigil extends RazorShieldSentinel {}
export default RazorVigil

