/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
          subtle: 'rgba(99, 102, 241, 0.12)',
          border: 'rgba(99, 102, 241, 0.3)',
        },
        risk: {
          red: {
            DEFAULT: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
            subtle: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.3)',
          },
          amber: {
            DEFAULT: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
            subtle: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.3)',
          },
          green: {
            DEFAULT: '#10b981',
            light: '#34d399',
            dark: '#059669',
            subtle: 'rgba(16, 185, 129, 0.12)',
            border: 'rgba(16, 185, 129, 0.3)',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
