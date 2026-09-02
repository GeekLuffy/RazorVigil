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
    <aside className={`w-64 shrink-0 h-screen sticky top-0 flex flex-col justify-between border-r backdrop-blur-xl z-30 select-none transition-colors duration-200 ${
      isDark ? 'bg-slate-950/90 border-slate-800/80 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-800 shadow-sm'
    }`}>
      {/* ?? 1. Brand Logo Header ?? */}
      <div className={`p-5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                RazorShield
              </span>
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md border ${
                isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                v2.0
              </span>
            </div>
            <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Autonomous Risk Engine
            </div>
          </div>
        </div>
      </div>

      {/* ?? 2. Navigation Categories ?? */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.category || sIdx} className="space-y-1">
            <div className={`px-3 text-[10px] font-bold font-mono tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
                        ? isDark
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm font-bold'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive
                          ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                          : isDark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-700'
                      }`} />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {item.badge && (
                        <span className={`px-1.5 py-0.2 rounded-full font-bold border ${
                          isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      <span className={`px-1 rounded text-[9px] border ${
                        isActive
                          ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
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
        <div className={`pt-2 border-t space-y-1.5 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <button
            onClick={onOpenStore}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              isDark
                ? 'text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-900 border-slate-800/60'
                : 'text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
              <span>Merchant Storefront</span>
            </div>
            <span className={`text-[10px] font-mono px-1 rounded border ${isDark ? 'text-slate-400 bg-slate-950 border-slate-800' : 'text-slate-500 bg-white border-slate-200'}`}>S</span>
          </button>

          <button
            onClick={onOpenCopilot}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition shadow-sm ${
              isDark
                ? 'text-pink-300 hover:text-white bg-pink-950/20 hover:bg-pink-950/40 border-pink-500/30'
                : 'text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 border-pink-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-pink-500 animate-pulse" />
              <span>Forensic Copilot</span>
            </div>
            <span className={`text-[10px] font-mono px-1 rounded border ${
              isDark ? 'text-pink-400 bg-pink-950/80 border-pink-500/30' : 'text-pink-700 bg-pink-100 border-pink-300'
            }`}>C</span>
          </button>
        </div>
      </div>

      {/* ?? 3. Sidebar Footer System Status & Controls ?? */}
      <div className={`p-3 border-t space-y-2.5 transition-colors ${isDark ? 'border-slate-800/60 bg-slate-950/95' : 'border-slate-200 bg-slate-50'}`}>
        {/* System Status Pill */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <div className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ML Engine &amp; Redis</div>
              <div className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>P99: 8.4ms · Active</div>
            </div>
          </div>
          <Zap size={14} className="text-emerald-500" />
        </div>

        {/* Theme & Language Controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onToggleTheme}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
            }`}
          >
            {isDark ? <Moon size={12} className="text-indigo-400" /> : <Sun size={12} className="text-amber-500" />}
            <span>{isDark ? 'Dark' : 'Light'}</span>
          </button>

          <div className={`flex items-center rounded-lg border p-0.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <button
              onClick={() => onToggleLang('EN')}
              className={`px-2 py-1 text-[10px] font-bold rounded font-mono transition ${
                lang === 'EN' ? 'bg-emerald-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onToggleLang('HI')}
              className={`px-2 py-1 text-[10px] font-bold rounded font-sans transition ${
                lang === 'HI' ? 'bg-emerald-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
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
