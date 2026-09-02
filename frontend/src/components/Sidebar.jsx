import React from 'react'
import {
  Shield, LayoutDashboard, Layers, Activity, BarChart3,
  Network, Flame, FileText, Scale, Moon, Sun,
  Radio, CheckCircle2, ShoppingBag, Bot, Zap, Cpu
} from 'lucide-react'

export const NAV_SECTIONS = [
  {
    category: 'SURVEILLANCE & DEFENSE',
    items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, key: '1' },
      { id: 'transactions', label: 'Live Ledger HUD', icon: Layers, key: '2' },
      { id: 'syndicates', label: 'Syndicate Graph', icon: Network, key: '3' },
    ]
  },
  {
    category: 'INTELLIGENCE & MODELS',
    items: [
      { id: 'risk-intelligence', label: 'Risk Intelligence', icon: Activity, key: '4' },
      { id: 'model-evaluation', label: 'Model Studio', icon: BarChart3, key: '5' },
      { id: 'simulator', label: 'Attack Simulator', icon: Flame, key: '6' },
    ]
  },
  {
    category: 'GOVERNANCE & AUDIT',
    items: [
      { id: 'audit-log', label: 'Dispute Cases', icon: Scale, key: '7', badge: '18' },
      { id: 'architecture', label: 'RBI Architecture', icon: FileText, key: '8' },
    ]
  }
]

export default function Sidebar({
  activeTab,
  onSelectTab,
  isDark,
  onToggleTheme,
  lang,
  onToggleLang,
  onOpenStore,
  onOpenCopilot,
  quarantinedCount = 312
}) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col justify-between border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl z-30 select-none">
      {/* ?? 1. Brand Logo Header ?? */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">RazorShield</span>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                v2.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Autonomous Risk Engine
            </div>
          </div>
        </div>
      </div>

      {/* ?? 2. Navigation Categories ?? */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.category || sIdx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
              {section.category}
            </div>
            <div className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          {item.badge}
                        </span>
                      )}
                      <span className={`px-1 rounded text-[9px] border ${isActive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                        {item.key}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Quick Launch Short-actions */}
        <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
          <button
            onClick={onOpenStore}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 transition"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
              <span>Merchant Storefront</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 rounded border border-slate-800">S</span>
          </button>

          <button
            onClick={onOpenCopilot}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-pink-300 hover:text-white bg-pink-950/20 hover:bg-pink-950/40 border border-pink-500/30 transition shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>Forensic Copilot</span>
            </div>
            <span className="text-[10px] font-mono text-pink-400 bg-pink-950/80 px-1 rounded border border-pink-500/30">C</span>
          </button>
        </div>
      </div>

      {/* ?? 3. Sidebar Footer System Status & Controls ?? */}
      <div className="p-3 border-t border-slate-800/60 space-y-2.5 bg-slate-950/95">
        {/* System Status Pill */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-[11px] font-bold text-slate-200">ML Engine &amp; Redis</div>
              <div className="text-[9px] text-slate-400 font-mono">P99: 8.4ms · Active</div>
            </div>
          </div>
          <Zap size={14} className="text-emerald-400" />
        </div>

        {/* Theme & Language Controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onToggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-medium transition"
          >
            {isDark ? <Moon size={12} className="text-indigo-400" /> : <Sun size={12} className="text-amber-400" />}
            <span>{isDark ? 'Dark' : 'Light'}</span>
          </button>

          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => onToggleLang('EN')}
              className={`px-2 py-1 text-[10px] font-bold rounded font-mono transition ${
                lang === 'EN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onToggleLang('HI')}
              className={`px-2 py-1 text-[10px] font-bold rounded font-sans transition ${
                lang === 'HI' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
