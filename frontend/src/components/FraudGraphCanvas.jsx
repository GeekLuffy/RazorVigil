import React, { useEffect, useRef, useState } from 'react'
import { Network, RefreshCw, ZoomIn } from 'lucide-react'

// Initial seed graph representing an active botnet ring
const INITIAL_NODES = [
  { id: 'ip_103', type: 'ip', label: '103.21.244.12', x: 120, y: 100, cluster: 1, isFraud: true },
  { id: 'ip_185', type: 'ip', label: '185.220.101.5', x: 220, y: 70, cluster: 1, isFraud: true },
  { id: 'ip_45',  type: 'ip', label: '45.154.255.88', x: 160, y: 190, cluster: 1, isFraud: true },
  { id: 'dev_01', type: 'dev', label: 'dev_mule_x99', x: 190, y: 140, cluster: 1, isFraud: true },
  { id: 'card_1', type: 'card', label: 'BIN 522222 (Mule #1)', x: 90, y: 150, cluster: 1, isFraud: true },
  { id: 'card_2', type: 'card', label: 'BIN 522222 (Mule #2)', x: 270, y: 130, cluster: 1, isFraud: true },
  { id: 'card_3', type: 'card', label: 'BIN 411111 (Canary)', x: 230, y: 200, cluster: 1, isFraud: true, isCanary: true },
  
  // Genuine cluster
  { id: 'ip_gen', type: 'ip', label: '152.58.12.90', x: 380, y: 80, cluster: 2, isFraud: false },
  { id: 'dev_gen', type: 'dev', label: 'dev_iphone_15', x: 440, y: 130, cluster: 2, isFraud: false },
  { id: 'card_gen', type: 'card', label: 'BIN 424242 (HDFC)', x: 410, y: 190, cluster: 2, isFraud: false },
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

export default function FraudGraphCanvas({ latestTx }) {
  const canvasRef = useRef(null)
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [pulsingNode, setPulsingNode] = useState(null)

  // Reactively add incoming transactions to the graph canvas
  useEffect(() => {
    if (!latestTx) return

    const isFraud = latestTx.tier === 'high_confidence_bot' || latestTx.risk_score > 0.60
    const devId = `dev_${latestTx.transaction_id?.slice(0, 4) || 'dyn'}`
    const cardId = `c_${latestTx.transaction_id?.slice(0, 4) || 'dyn'}`

    const newNodeDev = {
      id: devId,
      type: 'dev',
      label: `${devId}`,
      x: isFraud ? 150 + (Math.random() * 80 - 40) : 400 + (Math.random() * 60 - 30),
      y: 120 + (Math.random() * 60 - 30),
      cluster: isFraud ? 1 : 2,
      isFraud,
    }

    const newNodeCard = {
      id: cardId,
      type: 'card',
      label: `BIN ${latestTx.bin6 || '------'}`,
      x: isFraud ? 170 + (Math.random() * 80 - 40) : 420 + (Math.random() * 60 - 30),
      y: 180 + (Math.random() * 50 - 25),
      cluster: isFraud ? 1 : 2,
      isFraud,
      isCanary: latestTx.is_canary,
    }

    const newEdge = { from: devId, to: cardId, isFraud }

    setNodes(prev => [...prev.slice(-14), newNodeDev, newNodeCard])
    setEdges(prev => [...prev.slice(-14), newEdge])
    setPulsingNode(newNodeCard.id)

    const timer = setTimeout(() => setPulsingNode(null), 2500)
    return () => clearTimeout(timer)
  }, [latestTx])

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    // Draw background grid lines
    ctx.strokeStyle = '#1e293b22'
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

    // Draw Cluster Boundary Highlights (Louvain Communities)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.04)'
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.ellipse(180, 140, 120, 85, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = 'rgba(16, 185, 129, 0.04)'
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)'
    ctx.beginPath()
    ctx.ellipse(420, 140, 75, 75, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    // Draw Edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      if (!fromNode || !toNode) return

      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(toNode.x, toNode.y)
      ctx.strokeStyle = edge.isFraud ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.5)'
      ctx.lineWidth = edge.isFraud ? 2 : 1.5
      ctx.stroke()
    })

    // Draw Nodes
    nodes.forEach(node => {
      const isPulsing = pulsingNode === node.id
      ctx.beginPath()
      const radius = node.type === 'dev' ? 7 : node.type === 'card' ? 6 : 5
      ctx.arc(node.x, node.y, isPulsing ? radius + 4 : radius, 0, Math.PI * 2)

      if (node.isCanary) {
        ctx.fillStyle = '#eab308' // Yellow Canary
      } else if (node.isFraud) {
        ctx.fillStyle = '#ef4444' // Red Fraud
      } else {
        ctx.fillStyle = '#10b981' // Green Safe
      }
      ctx.fill()

      if (isPulsing) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Label text
      ctx.font = '9px monospace'
      ctx.fillStyle = node.isFraud ? '#fca5a5' : '#86efac'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, node.x, node.y - 9)
    })
  }, [nodes, edges, pulsingNode])

  return (
    <div className="panel bg-slate-900/90 border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Network size={15} className="text-indigo-400" />
          <span className="text-xs uppercase tracking-widest text-slate-300 font-bold">
            Live Louvain Fraud Ring Graph
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
            Cluster #1 (Carding Ring)
          </span>
          <span className="flex items-center gap-1 text-emerald-400 ml-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Cluster #2 (Genuine Users)
          </span>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80">
        <canvas ref={canvasRef} width={520} height={230} className="w-full h-auto block" />
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          Sub-5ms Real-Time Ingestion
        </div>
      </div>
    </div>
  )
}
