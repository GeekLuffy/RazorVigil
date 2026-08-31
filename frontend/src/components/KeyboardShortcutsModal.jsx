import React, { useEffect } from 'react'
import { Command, X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { key: '1', label: 'Switch to Live SOC Gateway' },
  { key: '2', label: 'Switch to Threat Simulator & Lab' },
  { key: '3', label: 'Switch to Active Defense & WAF' },
  { key: '4', label: 'Switch to Disputes & Evidence' },
  { key: '5', label: 'Switch to Model Governance Studio' },
  { key: '6', label: 'Switch to Architecture & Specs' },
  { key: 'M', label: 'Open Live Merchant Storefront' },
  { key: 'Space', label: 'Pause / Resume Live Telemetry Stream' },
  { key: 'Esc', label: 'Close Active Drawer / Modal' },
  { key: '?', label: 'Toggle Shortcuts Help' },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Keyboard size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-sans">Keyboard Navigation Shortcuts</h3>
            <p className="text-xs text-slate-400 font-sans">Global hotkeys for high-velocity SOC navigation</p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 font-sans">
          {SHORTCUTS.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{sc.label}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono font-bold text-[11px] border border-slate-700 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-500 font-sans">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">Esc</kbd> or click outside to dismiss.
        </div>
      </div>
    </div>
  )
}
