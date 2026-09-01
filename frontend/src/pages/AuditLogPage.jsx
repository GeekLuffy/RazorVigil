import React, { useState } from 'react'
import DisputeCaseWorkspace from '../components/DisputeCaseWorkspace'
import ActiveDefenseWorkspace from '../components/ActiveDefenseWorkspace'
import { Scale, Code2 } from 'lucide-react'

export default function AuditLogPage({ copilotNotes }) {
  const [activeSubTab, setActiveSubTab] = useState('disputes')

  return (
    <div className="space-y-5">
      {/* Sub-navigation pill switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('disputes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition ${
            activeSubTab === 'disputes'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Scale size={14} className="text-indigo-400" />
          <span>Regulatory Audit &amp; Dispute Dossiers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('waf')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition ${
            activeSubTab === 'waf'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Code2 size={14} className="text-cyan-400" />
          <span>Active WAF Rules &amp; Dynamic Gating</span>
        </button>
      </div>

      {activeSubTab === 'disputes' ? (
        <DisputeCaseWorkspace />
      ) : (
        <ActiveDefenseWorkspace copilotNotes={copilotNotes} />
      )}
    </div>
  )
}
