// Dynamic API & WebSocket configuration supporting local dev and Cloudflare Tunnel sharing

export const API_BASE = (typeof window !== 'undefined' && window.location.origin)
  ? ''
  : 'http://localhost:8000'

export const WS_URL = (typeof window !== 'undefined' && window.location.protocol === 'https:')
  ? `wss://${window.location.host}/ws`
  : (typeof window !== 'undefined' && window.location.host)
    ? `ws://${window.location.host}/ws`
    : 'ws://localhost:8000/ws'
