import React, { useState } from 'react'
import ThreatLabWorkspace from '../components/ThreatLabWorkspace'
import RedTeamArmsRaceWorkspace from '../components/RedTeamArmsRaceWorkspace'
import { Flame, Swords } from 'lucide-react'

export default function AttackSimulatorPage({ onOpenStore }) {
  const [activeSubTab, setActiveSubTab] = useState('threat_lab')

  return (
    <div className="space-y-5">
      {/* Sub-navigation pill switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('threat_lab')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition ${
            activeSubTab === 'threat_lab'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Flame size={14} className="text-rose-400" />
          <span>Threat Replay Lab &amp; Test Harness</span>
        </button>

        <button
          onClick={() => setActiveSubTab('arms_race')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition ${
            activeSubTab === 'arms_race'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Swords size={14} className="text-indigo-400" />
          <span>Adversarial Arms Race Arena</span>
        </button>
      </div>

      {activeSubTab === 'threat_lab' ? (
        <ThreatLabWorkspace onTriggerStoreDemo={onOpenStore} />
      ) : (
        <RedTeamArmsRaceWorkspace />
      )}
    </div>
  )
}
