// Dynamic API & WebSocket configuration supporting local dev, Vercel, and Cloudflare Tunnel sharing

const envApi = import.meta.env?.VITE_API_BASE
const envWs = import.meta.env?.VITE_WS_URL

export const API_BASE = envApi
  ? envApi.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.location.origin)
    ? ''
    : 'http://localhost:8000'

export const WS_URL = envWs
  ? envWs
  : (typeof window !== 'undefined' && window.location.protocol === 'https:')
    ? `wss://${window.location.host}/ws`
    : (typeof window !== 'undefined' && window.location.host)
      ? `ws://${window.location.host}/ws`
      : 'ws://localhost:8000/ws'
