// Dynamic API & WebSocket configuration supporting local dev, Vercel, and Cloudflare Tunnel sharing

const NORTHFLANK_BACKEND = 'https://p01--razorvigil-backend--jt5p6ms2vgxh.code.run'
const NORTHFLANK_WS = 'wss://p01--razorvigil-backend--jt5p6ms2vgxh.code.run/ws'

const envApi = import.meta.env?.VITE_API_BASE
const envWs = import.meta.env?.VITE_WS_URL

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
)

export const API_BASE = envApi
  ? envApi.replace(/\/$/, '')
  : isLocalhost
    ? 'http://localhost:8000'
    : NORTHFLANK_BACKEND

export const WS_URL = envWs
  ? envWs
  : isLocalhost
    ? 'ws://localhost:8000/ws'
    : NORTHFLANK_WS
