import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/checkout': { target: 'http://localhost:8000', changeOrigin: true },
      '/model': { target: 'http://localhost:8000', changeOrigin: true },
      '/canary': { target: 'http://localhost:8000', changeOrigin: true },
      '/recovery': { target: 'http://localhost:8000', changeOrigin: true },
      '/config': { target: 'http://localhost:8000', changeOrigin: true },
      '/webhook': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/otp': { target: 'http://localhost:8000', changeOrigin: true },
      '/3ds': { target: 'http://localhost:8000', changeOrigin: true },
      '/agent': { target: 'http://localhost:8000', changeOrigin: true },
      '/decision': { target: 'http://localhost:8000', changeOrigin: true },
      '/cases': { target: 'http://localhost:8000', changeOrigin: true },
      '/governance': { target: 'http://localhost:8000', changeOrigin: true },
      '/rules': { target: 'http://localhost:8000', changeOrigin: true },
      '/antichecker': { target: 'http://localhost:8000', changeOrigin: true },
      '/metrics': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true, changeOrigin: true },
    },

  },
})
