import React from 'react'
import {
  TrendingUp, ShieldCheck, DollarSign, Scale, BarChart3, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Layers, Percent, CheckCircle2, Flame
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'

const ROI_BREAKDOWN = [
  { day: 'Day 1', fraudPrevented: 245000, fpCost: 2100 },
  { day: 'Day 2', fraudPrevented: 310000, fpCost: 2400 },
  { day: 'Day 3', fraudPrevented: 190000, fpCost: 1800 },
  { day: 'Day 4', fraudPrevented: 420000, fpCost: 3100 },
  { day: 'Day 5', fraudPrevented: 280000, fpCost: 2500 },
  { day: 'Day 6', fraudPrevented: 360000, fpCost: 3200 },
  { day: 'Day 7', fraudPrevented: 125500, fpCost: 3350 },
]

export default function RiskIntelligencePage() {
  const totalPrevented = 1930500
  const totalFriction = 18450
  const netProtected = totalPrevented - totalFriction
  const roiMultiplier = (netProtected / totalFriction).toFixed(1)

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="soc-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2 font-sans">
            <span>Risk Intelligence &amp; Unit Economics</span>
            <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              {roiMultiplier}x Net ROI
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Quantifiable merchant P&amp;L impact: Gross fraud loss prevented minus false-positive cart friction costs
          </p>
        </div>
      </div>

      {/* Net Protected Value Formula Hero Card */}
      <div className="soc-card soc-card-emerald rounded-2xl p-6 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-emerald-950/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <Scale size={15} />
              Merchant P&amp;L Net Protected Value Equation
            </span>
            <div className="text-2xl lg:text-3xl font-black font-mono text-white tracking-tight">
              ₹{netProtected.toLocaleString('en-IN')} <span className="text-emerald-400 text-lg font-bold">Net Saved</span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Net Value = Gross Fraud Prevented (₹19.3L) - False-Positive Friction Cost (₹18.4K)
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center font-mono">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-sans">Gross Fraud Prevented</div>
              <div className="text-base font-black text-rose-400 mt-0.5">₹19.30 Lakh</div>
              <div className="text-[9px] text-slate-500">142 Syndicates</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-sans">FP Friction Cost</div>
              <div className="text-base font-black text-amber-400 mt-0.5">₹18,450</div>
              <div className="text-[9px] text-slate-500">80 False Checks</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-emerald-500/40 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-emerald-300 uppercase font-sans">Conversion Retained</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">99.91%</div>
              <div className="text-[9px] text-slate-500">Frictionless Flow</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Mitigation Bar Chart & False Positive Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 soc-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
              <BarChart3 size={16} className="text-indigo-400" />
              7-Day Fraud Loss Mitigation vs. Friction Cost
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">₹19.3L Total Protected</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ROI_BREAKDOWN}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="fraudPrevented" fill="#10b981" name="Gross Fraud Prevented (?)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fpCost" fill="#f43f5e" name="False Positive Cost (?)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade-Off Comparison Card */}
        <div className="lg:col-span-4 soc-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans pb-3 border-b border-slate-800">
              <Percent size={16} className="text-indigo-400" />
              FPR Cost Trade-Off Matrix
            </h3>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">Normal Genuine Traffic</div>
                <div className="text-lg font-bold text-emerald-400">0.09% FPR</div>
                <div className="text-[10px] text-slate-500">Calculated on 50k transaction held-out test set</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">Edge-Case Travelers (VPNs/Roaming)</div>
                <div className="text-lg font-bold text-amber-400">10.60% Soft Challenge</div>
                <div className="text-[10px] text-slate-500">Step-up 3DS2 or Dynamic UPI QR recovery</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase">Cart Abandonment Prevention</div>
                <div className="text-lg font-bold text-indigo-300">99.2% Preserved</div>
                <div className="text-[10px] text-slate-500">Sub-12ms decision speed eliminates timeouts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
