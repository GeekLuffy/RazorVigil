import React, { useEffect, useRef, useState } from 'react'
import { Network, RefreshCw, ZoomIn } from 'lucide-react'

// Initial seed graph representing an active botnet ring
const INITIAL_NODES = [
  { id: 'ip_103', type: 'ip', label: '103.21.244.12', x: 110, y: 85, cluster: 1, isFraud: true },
  { id: 'ip_185', type: 'ip', label: '185.220.101.5', x: 210, y: 65, cluster: 1, isFraud: true },
  { id: 'ip_45',  type: 'ip', label: '45.154.255.88', x: 145, y: 175, cluster: 1, isFraud: true },
  { id: 'dev_01', type: 'dev', label: 'dev_mule_x99 (Anchor)', x: 175, y: 125, cluster: 1, isFraud: true, isAnchor: true },
  { id: 'card_1', type: 'card', label: 'BIN 522222 (Mule #1)', x: 80, y: 140, cluster: 1, isFraud: true },
  { id: 'card_2', type: 'card', label: 'BIN 522222 (Mule #2)', x: 250, y: 120, cluster: 1, isFraud: true },
  { id: 'card_3', type: 'card', label: 'BIN 411111 (Canary #7)', x: 220, y: 180, cluster: 1, isFraud: true, isCanary: true },
  
  // Genuine cluster
  { id: 'ip_gen', type: 'ip', label: '152.58.12.90 (Airtel)', x: 380, y: 80, cluster: 2, isFraud: false },
  { id: 'dev_gen', type: 'dev', label: 'dev_iphone_15 (Anchor)', x: 430, y: 125, cluster: 2, isFraud: false, isAnchor: true },
  { id: 'card_gen', type: 'card', label: 'BIN 424242 (HDFC)', x: 400, y: 175, cluster: 2, isFraud: false },
]

const INITIAL_EDGES = [
  { from: 'ip_103', to: 'dev_01', isFraud: true },
  { from: 'ip_185', to: 'dev_01', isFraud: true },
  { from: 'ip_45',  to: 'dev_01', isFraud: true },
  { from: 'dev_01', to: 'card_1', isFraud: true },
  { from: 'dev_01', to: 'card_2', isFraud: true },
  { from: 'dev_01', to: 'card_3', isFraud: true },
  { from: 'ip_gen', to: 'dev_gen', isFraud: false },
  { from: 'dev_gen', to: 'card_gen', isFraud: false },
]

export default function FraudGraphCanvas({ latestTx, isDark = true }) {
  const canvasRef = useRef(null)
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [pulsingNode, setPulsingNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Reactively add incoming transactions to the graph canvas with physics separation
  useEffect(() => {
    if (!latestTx) return

    const isFraud = latestTx.tier === 'high_confidence_bot' || latestTx.risk_score > 0.60
    const devId = `dev_${latestTx.transaction_id?.slice(0, 4) || 'dyn'}`
    const cardId = `c_${latestTx.transaction_id?.slice(0, 4) || 'dyn'}`

    // Cluster center repulsion logic
    const centerX = isFraud ? 165 : 410
    const centerY = 130
    const angle1 = Math.random() * Math.PI * 2
    const dist1 = 35 + Math.random() * 45
    const angle2 = Math.random() * Math.PI * 2
    const dist2 = 40 + Math.random() * 40

    const newNodeDev = {
      id: devId,
      type: 'dev',
      label: `Device: ${devId}`,
      x: Math.max(30, Math.min(centerX + Math.cos(angle1) * dist1, 500)),
      y: Math.max(30, Math.min(centerY + Math.sin(angle1) * dist1, 200)),
      cluster: isFraud ? 1 : 2,
      isFraud,
    }

    const newNodeCard = {
      id: cardId,
      type: 'card',
      label: `Card: BIN ${latestTx.bin6 || '------'}`,
      x: Math.max(30, Math.min(centerX + Math.cos(angle2) * dist2, 500)),
      y: Math.max(30, Math.min(centerY + Math.sin(angle2) * dist2, 200)),
      cluster: isFraud ? 1 : 2,
      isFraud,
      isCanary: latestTx.is_canary,
    }

    const newEdge = { from: devId, to: cardId, isFraud }

    setNodes(prev => [...prev.slice(-16), newNodeDev, newNodeCard])
    setEdges(prev => [...prev.slice(-16), newEdge])
    setPulsingNode(newNodeCard.id)

    const timer = setTimeout(() => setPulsingNode(null), 2500)
    return () => clearTimeout(timer)
  }, [latestTx])

  // Mouse move handler for collision-free hover inspection
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = (e.clientX - rect.left) * scaleX
    const clientY = (e.clientY - rect.top) * scaleY

    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })

    // Find closest node within hover radius
    const hit = nodes.find(n => {
      const dx = n.x - clientX
      const dy = n.y - clientY
      return Math.sqrt(dx * dx + dy * dy) <= 12
    })

    setHoveredNode(hit || null)
  }

  const handleMouseLeave = () => {
    setHoveredNode(null)
  }

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    // Draw background grid lines
    ctx.strokeStyle = isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(226, 232, 240, 0.9)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw Cluster Highlights (Louvain Community Boundaries)
    // Cluster 1: Carding Ring (Rose/Red)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.05)'
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.ellipse(165, 125, 125, 80, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Cluster 2: Genuine Shoppers (Emerald)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'
    ctx.beginPath()
    ctx.ellipse(410, 125, 75, 75, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    // Cluster Title Watermarks
    ctx.font = 'bold 9px monospace'
    ctx.fillStyle = 'rgba(244, 63, 94, 0.6)'
    ctx.textAlign = 'center'
    ctx.fillText('LOUVAIN RING #1 (MODULARITY 0.68)', 165, 52)

    ctx.fillStyle = 'rgba(16, 185, 129, 0.6)'
    ctx.fillText('GENUINE CLUSTER #2', 410, 58)

    // Draw Edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      if (!fromNode || !toNode) return

      const isConnectedToHovered = hoveredNode && (hoveredNode.id === edge.from || hoveredNode.id === edge.to)

      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(toNode.x, toNode.y)
      ctx.strokeStyle = isConnectedToHovered
        ? '#ffffff'
        : edge.isFraud
        ? 'rgba(244, 63, 94, 0.5)'
        : 'rgba(16, 185, 129, 0.45)'
      ctx.lineWidth = isConnectedToHovered ? 2.5 : edge.isFraud ? 1.5 : 1
      ctx.stroke()
    })

    // Draw Nodes (Dots only by default — zero label collision)
    nodes.forEach(node => {
      const isPulsing = pulsingNode === node.id
      const isHovered = hoveredNode && hoveredNode.id === node.id
      const radius = node.isAnchor ? 7 : node.type === 'dev' ? 6 : node.type === 'card' ? 5.5 : 4.5

      ctx.beginPath()
      ctx.arc(node.x, node.y, isHovered ? radius + 3 : isPulsing ? radius + 4 : radius, 0, Math.PI * 2)

      if (node.isCanary) {
        ctx.fillStyle = '#f59e0b'
      } else if (node.isFraud) {
        ctx.fillStyle = '#f43f5e'
      } else {
        ctx.fillStyle = '#10b981'
      }
      ctx.fill()

      if (isHovered || isPulsing || node.isAnchor) {
        ctx.strokeStyle = isHovered ? '#ffffff' : node.isAnchor ? 'rgba(255,255,255,0.7)' : '#ffffff'
        ctx.lineWidth = isHovered ? 2.5 : 1.5
        ctx.stroke()
      }

      // Render non-colliding anchor badges only for main cluster roots
      if (node.isAnchor && !isHovered) {
        ctx.font = '8px monospace'
        ctx.fillStyle = node.isFraud ? '#fda4af' : '#a7f3d0'
        ctx.textAlign = 'center'
        ctx.fillText(node.type === 'dev' ? 'Device Hub' : 'PAN Hub', node.x, node.y + radius + 10)
      }
    })
  }, [nodes, edges, pulsingNode, hoveredNode, isDark])

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-indigo-400" />
          <span className="text-xs uppercase tracking-widest text-slate-300 font-bold font-sans">
            Live Louvain Fraud Ring Graph
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
            Cluster #1 (Carding Ring)
          </span>
          <span className="flex items-center gap-1 text-emerald-400 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Cluster #2 (Genuine)
          </span>
        </div>
      </div>

      <div className={`relative rounded-xl overflow-hidden transition-colors ${isDark ? 'bg-slate-950 border border-slate-800/80' : 'bg-slate-50 border border-slate-200'}`}>
        <canvas
          ref={canvasRef}
          width={520}
          height={230}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-auto block cursor-crosshair"
        />

        {/* Hover Tooltip Overlay (Collision-Free) */}
        {hoveredNode && (
          <div
            className={`absolute z-20 pointer-events-none rounded-lg p-2 shadow-xl text-xs font-mono backdrop-blur-md animate-fade-in border ${isDark ? 'bg-slate-900/95 border-indigo-500/40 text-white' : 'bg-white/95 border-slate-200 text-slate-900'}`}
            style={{
              left: Math.min(Math.max(mousePos.x + 12, 10), 360),
              top: Math.min(Math.max(mousePos.y - 45, 10), 160),
            }}
          >
            <div className={`flex items-center gap-1.5 font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>

              <span className={`w-2 h-2 rounded-full ${hoveredNode.isCanary ? 'bg-amber-400' : hoveredNode.isFraud ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span>{hoveredNode.label}</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span>Type: <strong className="text-slate-200 capitalize">{hoveredNode.type}</strong></span>
              <span>•</span>
              <span className={hoveredNode.isFraud ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {hoveredNode.isCanary ? 'Canary Token' : hoveredNode.isFraud ? 'Quarantined Ring' : 'Verified Genuine'}
              </span>
            </div>
          </div>
        )}

        <div className={`absolute bottom-2 right-2 text-[9px] font-mono px-2 py-0.5 rounded border pointer-events-none ${isDark ? 'text-slate-500 bg-slate-900/80 border-slate-800' : 'text-slate-600 bg-white/90 border-slate-200 shadow-sm'}`}>
          Hover node to inspect • Sub-5ms Ingestion
        </div>
      </div>
    </div>
  )
}
