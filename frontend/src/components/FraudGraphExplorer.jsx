import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Network,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Bot,
  CreditCard,
  Smartphone,
  Globe,
  Flame,
  Lock,
  Layers,
  Search,
  ExternalLink,
  CheckCircle2,
  Info
} from 'lucide-react'

import { API_BASE } from '../config'

// Semantic colors per node type
const TYPE_COLORS = {
  card: { bg: '#f59e0b', glow: 'rgba(245,158,11,0.4)', icon: CreditCard, label: 'Payment Card (PAN/BIN)' },
  device: { bg: '#818cf8', glow: 'rgba(129,140,248,0.4)', icon: Smartphone, label: 'Device Fingerprint' },
  ip: { bg: '#06b6d4', glow: 'rgba(6,182,212,0.4)', icon: Globe, label: 'IP / Network Subnet' },
  agent: { bg: '#ec4899', glow: 'rgba(236,72,153,0.4)', icon: Bot, label: 'Autonomous AI Agent' },
}

// Cluster community palette
const CLUSTER_COLORS = [
  '#10b981', // 0: Genuine
  '#f43f5e', // 1: Carding Swarm
  '#a855f7', // 2: Compromised Agent
  '#eab308', // 3: Proxy Farm
  '#3b82f6', // 4: Multi-hop
]

export default function FraudGraphExplorer() {
  const canvasRef = useRef(null)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], clusters: [], modularity: 0.72 })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [filterCluster, setFilterCluster] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  const [isInjecting, setIsInjecting] = useState(false)

  // In-memory physics simulation state
  const simNodesRef = useRef([])
  const animationFrameRef = useRef(null)

  // 1. Fetch live topology from backend
  const fetchGraphTopology = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/cluster/graph`)
      if (!res.ok) return
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (err) {
        console.warn('Non-JSON response from /cluster/graph:', err)
        return
      }
      if (data && Array.isArray(data.nodes)) {
        setGraphData(data)


        // Initialize / preserve physics node positions
        const existingMap = new Map(simNodesRef.current.map(n => [n.id, n]))
        const width = 800
        const height = 500
        const cx = width / 2
        const cy = height / 2

        simNodesRef.current = data.nodes.map((n, idx) => {
          const defaultRadius = n.type === 'device' || n.type === 'agent' ? 14 : 10
          const existing = existingMap.get(n.id)
          if (existing) {
            return {
              ...n,
              x: Number.isFinite(existing.x) ? existing.x : cx + (Math.random() - 0.5) * 100,
              y: Number.isFinite(existing.y) ? existing.y : cy + (Math.random() - 0.5) * 100,
              vx: Number.isFinite(existing.vx) ? existing.vx : 0,
              vy: Number.isFinite(existing.vy) ? existing.vy : 0,
              radius: existing.radius || defaultRadius,
            }
          }
          // Distribute initial positions by cluster
          const angle = (idx / Math.max(1, data.nodes.length)) * Math.PI * 2
          const clusterOffset = (n.cluster_id || 0) * 80
          const distRadius = 100 + (idx % 4) * 35 + clusterOffset
          return {
            ...n,
            x: cx + Math.cos(angle) * distRadius + (Math.random() - 0.5) * 40,
            y: cy + Math.sin(angle) * distRadius + (Math.random() - 0.5) * 40,
            vx: 0,
            vy: 0,
            radius: defaultRadius,
          }
        })

        setSelectedNode(prev => {
          if (prev) {
            return data.nodes.find(n => n.id === prev.id) || prev
          }
          return data.nodes.find(n => n.is_suspicious) || data.nodes[0] || null
        })
      }
    } catch (e) {
      console.error('Failed to fetch graph topology:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGraphTopology()
    const interval = setInterval(fetchGraphTopology, 8000)
    return () => clearInterval(interval)
  }, [fetchGraphTopology])

  // 2. Continuous Force Simulation Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    const runPhysicsStep = () => {
      const simNodes = simNodesRef.current
      if (simNodes.length === 0) return

      const edges = graphData.edges || []
      const nodeMap = new Map(simNodes.map(n => [n.id, n]))

      // A. Node-Node Repulsion
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const n1 = simNodes[i]
          const n2 = simNodes[j]
          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.08
            n1.vx -= dx * force
            n1.vy -= dy * force
            n2.vx += dx * force
            n2.vy += dy * force
          }
        }
      }

      // B. Edge Spring Attraction
      for (const edge of edges) {
        const u = nodeMap.get(edge.source)
        const v = nodeMap.get(edge.target)
        if (u && v) {
          const dx = v.x - u.x
          const dy = v.y - u.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const desiredDist = 70
          const force = (dist - desiredDist) * 0.02
          u.vx += (dx / dist) * force
          u.vy += (dy / dist) * force
          v.vx -= (dx / dist) * force
          v.vy -= (dy / dist) * force
        }
      }

      // C. Center Gravity & Boundary Dampening
      for (const n of simNodes) {
        if (n === draggedNode) continue // skip manual dragged node
        n.vx += (cx - n.x) * 0.002
        n.vy += (cy - n.y) * 0.002
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
        n.x = Math.max(30, Math.min(width - 30, n.x))
        n.y = Math.max(30, Math.min(height - 30, n.y))
      }

      // D. Render Canvas Frame
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      // Draw Cluster Hulls / Ambient Glows
      const clusterCenters = {}
      simNodes.forEach(n => {
        if (!clusterCenters[n.cluster_id]) clusterCenters[n.cluster_id] = { x: 0, y: 0, count: 0 }
        clusterCenters[n.cluster_id].x += n.x
        clusterCenters[n.cluster_id].y += n.y
        clusterCenters[n.cluster_id].count += 1
      })

      Object.entries(clusterCenters).forEach(([cid, c]) => {
        const clr = CLUSTER_COLORS[Number(cid) % CLUSTER_COLORS.length]
        const avgX = c.x / c.count
        const avgY = c.y / c.count
        const gradient = ctx.createRadialGradient(avgX, avgY, 10, avgX, avgY, 120)
        gradient.addColorStop(0, clr + '22')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(avgX, avgY, 120, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw Edges
      edges.forEach(edge => {
        const u = nodeMap.get(edge.source)
        const v = nodeMap.get(edge.target)
        if (!u || !v) return

        const isHighlighted = selectedNode && (selectedNode.id === u.id || selectedNode.id === v.id)
        const edgeColor = u.is_suspicious || v.is_suspicious ? '#f43f5e' : '#64748b'

        ctx.beginPath()
        ctx.moveTo(u.x, u.y)
        ctx.lineTo(v.x, v.y)
        ctx.strokeStyle = isHighlighted ? '#ec4899' : (edgeColor + (isHighlighted ? 'ff' : '44'))
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2
        ctx.stroke()
      })

      // Draw Nodes
      simNodes.forEach(n => {
        const isSelected = selectedNode && selectedNode.id === n.id
        const isHoverMatch = searchQuery && n.label?.toLowerCase().includes(searchQuery.toLowerCase())
        const typeCfg = TYPE_COLORS[n.type] || TYPE_COLORS.device
        const clusterColor = CLUSTER_COLORS[(n.cluster_id || 0) % CLUSTER_COLORS.length]
        const nodeRadius = Math.max(8, n.radius || (n.type === 'device' || n.type === 'agent' ? 14 : 10))

        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return

        // Node Glow
        if (isSelected || isHoverMatch || n.is_suspicious) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, nodeRadius + 8, 0, Math.PI * 2)
          ctx.fillStyle = isSelected ? 'rgba(236,72,153,0.35)' : (clusterColor + '33')
          ctx.fill()
        }

        // Node Circle Body
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2)
        ctx.fillStyle = n.is_quarantined ? '#334155' : typeCfg.bg
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#ffffff' : clusterColor
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.stroke()

        // Inner Dot or Icon Indicator
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeRadius * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = '#0f172a'
        ctx.fill()

        // Text Label
        ctx.font = isSelected ? 'bold 11px JetBrains Mono, monospace' : '9px JetBrains Mono, monospace'
        ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1'
        ctx.textAlign = 'center'
        ctx.fillText((n.label || n.id).slice(0, 16), n.x, n.y + nodeRadius + 12)
      })

      ctx.restore()
      animationFrameRef.current = requestAnimationFrame(runPhysicsStep)
    }


    animationFrameRef.current = requestAnimationFrame(runPhysicsStep)
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [graphData, zoom, pan, selectedNode, searchQuery, draggedNode])

  // 3. Mouse Interaction Handlers
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = (e.clientX - rect.left - pan.x) / zoom
    const clickY = (e.clientY - rect.top - pan.y) / zoom

    // Find clicked node
    const hit = simNodesRef.current.find(n => {
      const dx = n.x - clickX
      const dy = n.y - clickY
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4
    })

    if (hit) {
      setSelectedNode(hit)
      setDraggedNode(hit)
    } else {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (draggedNode) {
      const rect = canvas.getBoundingClientRect()
      draggedNode.x = (e.clientX - rect.left - pan.x) / zoom
      draggedNode.y = (e.clientY - rect.top - pan.y) / zoom
    } else if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedNode(null)
  }

  // 4. Attack Injection Trigger
  const handleInjectRing = async (ringType) => {
    setIsInjecting(true)
    try {
      const res = await fetch(`${API_BASE}/cluster/inject-ring?ring_type=${ringType}`, { method: 'POST' })
      const data = await res.json()
      setActionNotice(`⚡ Adversarial ring injected: ${data.anchor}. Louvain modularity updated.`)
      await fetchGraphTopology()
    } catch (e) {
      console.error('Failed to inject ring:', e)
    } finally {
      setIsInjecting(false)
      setTimeout(() => setActionNotice(null), 4000)
    }
  }

  // 5. Cluster Quarantine Trigger
  const handleQuarantineCluster = async (clusterId) => {
    try {
      const res = await fetch(`${API_BASE}/cluster/quarantine/${clusterId}`, { method: 'POST' })
      const data = await res.json()
      setActionNotice(`🚨 Quarantined Louvain Ring #${clusterId}: Isolated ${data.nodes_isolated_count} connected nodes.`)
      await fetchGraphTopology()
    } catch (e) {
      console.error('Failed to quarantine cluster:', e)
    } finally {
      setTimeout(() => setActionNotice(null), 4000)
    }
  }

  // Filtered view logic
  const filteredNodes = useMemo(() => {
    return (graphData.nodes || []).filter(n => {
      if (filterType !== 'ALL' && n.type !== filterType.toLowerCase()) return false
      if (filterCluster !== 'ALL' && n.cluster_id !== Number(filterCluster)) return false
      if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [graphData, filterType, filterCluster, searchQuery])

  return (
    <div className="space-y-4">
      {/* Top Header & Metrics Bar */}
      <div className="panel p-4 bg-slate-900/90 border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
            <Network size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
              Louvain Mule Ring &amp; Fraud Graph Explorer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                NetworkX Real-Time Graph
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Heterogeneous Entity Bipartite Graph · Louvain Modularity: <span className="font-mono text-emerald-400 font-bold">{graphData.modularity}</span> · Temporal Decay Half-Life: 30m
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleInjectRing('carding_swarm')}
            disabled={isInjecting}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
          >
            <Flame size={13} className="text-rose-400" />
            Inject Carding Swarm
          </button>

          <button
            onClick={() => handleInjectRing('agent_ring')}
            disabled={isInjecting}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 border-pink-500/30 text-pink-300 hover:bg-pink-500/10"
          >
            <Bot size={13} className="text-pink-400" />
            Inject Rogue Agent Ring
          </button>

          <button
            onClick={fetchGraphTopology}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-xs font-mono text-indigo-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Graph Canvas (2/3) + Forensic Inspector (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visual Graph Canvas Area */}
        <div className="lg:col-span-2 panel p-0 bg-[#080d1a] border-slate-800 rounded-xl relative overflow-hidden flex flex-col min-h-[560px]">
          {/* Canvas Filter Header */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">Type:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              >
                <option value="ALL">All Types</option>
                <option value="CARD">Cards (PAN)</option>
                <option value="DEVICE">Devices</option>
                <option value="IP">IP Subnets</option>
                <option value="AGENT">AI Agents</option>
              </select>

              <span className="text-slate-400 font-mono text-[11px] ml-2">Cluster:</span>
              <select
                value={filterCluster}
                onChange={e => setFilterCluster(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              >
                <option value="ALL">All Clusters</option>
                {graphData.clusters?.map(c => (
                  <option key={c.cluster_id} value={c.cluster_id}>
                    Cluster #{c.cluster_id}: {c.name.slice(0, 18)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search node or IP..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-slate-200 font-mono text-xs w-40 focus:w-48 transition-all"
                />
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
                <button
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="px-1 font-mono text-[10px] text-slate-400">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(2.0, z + 0.15))}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => { setZoom(1.0); setPan({ x: 0, y: 0 }) }}
                  className="p-1 text-slate-400 hover:text-white ml-1 border-l border-slate-800"
                  title="Reset View"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Rendering Area */}
          <div className="relative flex-1 cursor-grab active:cursor-grabbing bg-radial-grid">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-full block"
            />

            {/* Floating Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 p-2.5 rounded-lg text-[11px] font-mono space-y-1 z-10 shadow-lg pointer-events-none">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Entity Legend</div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Card Hash (PAN/BIN)
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" /> Device Fingerprint
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> IP / ASN Subnet
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" /> Autonomous AI Agent
              </div>
            </div>

            {/* Total Counts Tag */}
            <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 z-10">
              <span className="text-white font-bold">{filteredNodes.length}</span> nodes · <span className="text-white font-bold">{graphData.edges?.length || 0}</span> edges
            </div>
          </div>
        </div>

        {/* Forensic Node & Mule Ring Inspector Drawer */}
        <div className="panel p-4 bg-slate-900/90 border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" />
                Entity Inspector
              </span>
              {selectedNode && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  selectedNode.is_quarantined
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : selectedNode.is_suspicious
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {selectedNode.is_quarantined ? 'QUARANTINED' : selectedNode.is_suspicious ? 'HIGH RISK ENTITY' : 'NORMAL'}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="mt-4 space-y-4 font-mono text-xs">
                {/* Node Identity Card */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-slate-400 text-[10px] uppercase">Selected Entity</div>
                  <div className="font-bold text-white text-sm break-all">{selectedNode.label}</div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900 text-slate-400">
                    <span>Type: <strong className="text-indigo-300 capitalize">{selectedNode.type}</strong></span>
                    <span>Degree Centrality: <strong className="text-amber-400">{selectedNode.degree} links</strong></span>
                  </div>
                </div>

                {/* Community Ring Assignment */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Louvain Partition</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      Cluster #{selectedNode.cluster_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-sans">
                    {graphData.clusters?.find(c => c.cluster_id === selectedNode.cluster_id)?.name || `Community Ring #${selectedNode.cluster_id}`}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Risk Impact:</span>
                    <span className="text-rose-400 font-bold font-mono">{(selectedNode.risk_score * 100).toFixed(0)}% Ensemble Weight</span>
                  </div>
                </div>

                {/* Connected Entity Traversal */}
                <div className="space-y-1.5">
                  <div className="text-slate-400 text-[10px] uppercase">Direct Graph Neighbors</div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {graphData.edges
                      ?.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e, idx) => {
                        const neighborId = e.source === selectedNode.id ? e.target : e.source
                        const neighbor = graphData.nodes.find(n => n.id === neighborId)
                        return (
                          <div
                            key={idx}
                            onClick={() => neighbor && setSelectedNode(neighbor)}
                            className="p-2 bg-slate-950 hover:bg-slate-800/80 cursor-pointer rounded border border-slate-800/80 flex items-center justify-between transition-all"
                          >
                            <span className="truncate text-slate-300 text-[11px]">{neighbor?.label || neighborId}</span>
                            <span className="text-[10px] text-slate-500 font-mono">w={e.weight}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Click any node on the graph canvas to inspect its community ring relationships.
              </div>
            )}
          </div>

          {/* Action Footer */}
          {selectedNode && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleQuarantineCluster(selectedNode.cluster_id)}
                disabled={selectedNode.is_quarantined}
                className={`w-full btn text-xs font-mono font-bold py-2 flex items-center justify-center gap-2 ${
                  selectedNode.is_quarantined
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50'
                }`}
              >
                <Lock size={14} />
                {selectedNode.is_quarantined ? 'Cluster Quarantined' : `Quarantine Entire Ring #${selectedNode.cluster_id}`}
              </button>

              <div className="text-[10px] text-slate-500 text-center font-sans">
                Quarantining forces instantaneous O(1) Redis honeypot routing for all {selectedNode.degree}+ linked entities.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
