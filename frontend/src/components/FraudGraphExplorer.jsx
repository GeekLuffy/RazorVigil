import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Network,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
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
  Info,
  Copy,
  Play,
  TrendingUp,
  Target,
  Crosshair,
  Sparkles,
  Compass,
  Pin,
  Share2
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
  const containerRef = useRef(null)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], clusters: [], modularity: 0.72 })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [filterCluster, setFilterCluster] = useState('ALL')
  const [threatOnly, setThreatOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [layoutMode, setLayoutMode] = useState('force') // 'force' | 'radial' | 'bipartite'
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Camera & Navigation
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  const [isInjecting, setIsInjecting] = useState(false)
  const [copiedWaf, setCopiedWaf] = useState(false)

  // Simulation Replay Timeline
  const [simPhase, setSimPhase] = useState(0) // 0: Idle, 1: Subnet Recon, 2: Card Spraying, 3: Cluster Detected, 4: Quarantined
  const [isReplaying, setIsReplaying] = useState(false)

  // In-memory physics simulation state
  const simNodesRef = useRef([])
  const animationFrameRef = useRef(null)
  const particleOffsetRef = useRef(0)

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
        const width = 850
        const height = 550
        const cx = width / 2
        const cy = height / 2

        simNodesRef.current = data.nodes.map((n, idx) => {
          const defaultRadius = n.type === 'device' || n.type === 'agent' ? 14 : 11
          const existing = existingMap.get(n.id)
          if (existing && Number.isFinite(existing.x) && Number.isFinite(existing.y)) {
            return {
              ...n,
              x: existing.x,
              y: existing.y,
              vx: existing.vx || 0,
              vy: existing.vy || 0,
              isPinned: Boolean(existing.isPinned),
              radius: existing.radius || defaultRadius,
            }
          }
          // Distribute initial positions by cluster
          const angle = (idx / Math.max(1, data.nodes.length)) * Math.PI * 2
          const clusterOffset = (n.cluster_id || 0) * 85
          const distRadius = 120 + (idx % 4) * 35 + clusterOffset
          return {
            ...n,
            x: cx + Math.cos(angle) * distRadius + (Math.random() - 0.5) * 40,
            y: cy + Math.sin(angle) * distRadius + (Math.random() - 0.5) * 40,
            vx: 0,
            vy: 0,
            isPinned: false,
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

  // Apply Structured Layout Algorithms
  const applyLayout = useCallback((mode) => {
    setLayoutMode(mode)
    const simNodes = simNodesRef.current
    const width = 850
    const height = 550
    const cx = width / 2
    const cy = height / 2

    if (mode === 'radial') {
      // Concentric Radial Centrality Layout
      simNodes.forEach((n) => {
        const isThreat = n.is_suspicious || (n.cluster_id !== 0)
        const radius = isThreat ? 130 + (n.cluster_id || 1) * 45 : 240
        const angle = ((n.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360) * (Math.PI / 180)
        n.x = cx + Math.cos(angle) * radius
        n.y = cy + Math.sin(angle) * radius
        n.vx = 0
        n.vy = 0
      })
    } else if (mode === 'bipartite') {
      // 4-Column Tiered Bipartite Entity Layout
      const columns = { ip: 120, device: 320, card: 540, agent: 720 }
      const counts = { ip: 0, device: 0, card: 0, agent: 0 }
      simNodes.forEach((n) => {
        const colKey = n.type || 'card'
        const colX = columns[colKey] || 400
        const rowIdx = counts[colKey] || 0
        counts[colKey] = (counts[colKey] || 0) + 1
        n.x = colX
        n.y = 80 + rowIdx * 45
        n.vx = 0
        n.vy = 0
      })
    }
  }, [])

  // 2. Continuous Force Simulation Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    const runPhysicsStep = () => {
      particleOffsetRef.current = (particleOffsetRef.current + 0.04) % 1.0
      const simNodes = simNodesRef.current
      if (simNodes.length === 0) return

      const edges = graphData.edges || []
      const nodeMap = new Map(simNodes.map(n => [n.id, n]))

      if (layoutMode === 'force') {
        // A. Node-Node Repulsion
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const n1 = simNodes[i]
            const n2 = simNodes[j]
            const dx = n2.x - n1.x
            const dy = n2.y - n1.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            if (dist < 190) {
              const force = (190 - dist) / dist * 0.08
              if (!n1.isPinned && n1 !== draggedNode) {
                n1.vx -= dx * force
                n1.vy -= dy * force
              }
              if (!n2.isPinned && n2 !== draggedNode) {
                n2.vx += dx * force
                n2.vy += dy * force
              }
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
            const desiredDist = 75
            const force = (dist - desiredDist) * 0.02
            if (!u.isPinned && u !== draggedNode) {
              u.vx += (dx / dist) * force
              u.vy += (dy / dist) * force
            }
            if (!v.isPinned && v !== draggedNode) {
              v.vx -= (dx / dist) * force
              v.vy -= (dy / dist) * force
            }
          }
        }

        // C. Center Gravity & Boundary Dampening
        for (const n of simNodes) {
          if (n === draggedNode || n.isPinned) continue
          n.vx += (cx - n.x) * 0.002
          n.vy += (cy - n.y) * 0.002
          n.vx *= 0.85
          n.vy *= 0.85
          n.x += n.vx
          n.y += n.vy
          n.x = Math.max(40, Math.min(width - 40, n.x))
          n.y = Math.max(40, Math.min(height - 40, n.y))
        }
      }

      // D. Render Canvas Frame
      const isLightMode = typeof document !== 'undefined' && document.body.classList.contains('light-theme')

      if (isLightMode) {
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(0, 0, width, height)
      } else {
        ctx.clearRect(0, 0, width, height)
      }

      // Cyber Grid Backdrop
      ctx.save()
      ctx.strokeStyle = isLightMode ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1
      const gridSize = 35
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.restore()

      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      // Draw Cluster Hulls / Ambient Glows
      const clusterCenters = {}
      simNodes.forEach(n => {
        if (threatOnly && n.cluster_id === 0) return
        if (!clusterCenters[n.cluster_id]) clusterCenters[n.cluster_id] = { x: 0, y: 0, count: 0 }
        clusterCenters[n.cluster_id].x += n.x
        clusterCenters[n.cluster_id].y += n.y
        clusterCenters[n.cluster_id].count += 1
      })

      Object.entries(clusterCenters).forEach(([cid, c]) => {
        const clr = CLUSTER_COLORS[Number(cid) % CLUSTER_COLORS.length]
        const avgX = c.x / c.count
        const avgY = c.y / c.count
        const gradient = ctx.createRadialGradient(avgX, avgY, 10, avgX, avgY, 130)
        gradient.addColorStop(0, clr + '26')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(avgX, avgY, 130, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw Edges with Animated Flow Particles
      edges.forEach(edge => {
        const u = nodeMap.get(edge.source)
        const v = nodeMap.get(edge.target)
        if (!u || !v) return
        if (threatOnly && (u.cluster_id === 0 || v.cluster_id === 0)) return

        const isHighlighted = selectedNode && (selectedNode.id === u.id || selectedNode.id === v.id)
        const isThreatEdge = u.is_suspicious || v.is_suspicious || (u.cluster_id !== 0 && v.cluster_id !== 0)
        const edgeColor = isThreatEdge ? '#f43f5e' : '#64748b'

        ctx.beginPath()
        ctx.moveTo(u.x, u.y)
        ctx.lineTo(v.x, v.y)
        ctx.strokeStyle = isHighlighted ? '#ec4899' : (edgeColor + (isHighlighted ? 'ff' : '44'))
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2
        ctx.stroke()

        // Animated Particle along Threat Edges
        if (isThreatEdge || isHighlighted) {
          const px = u.x + (v.x - u.x) * particleOffsetRef.current
          const py = u.y + (v.y - u.y) * particleOffsetRef.current
          ctx.beginPath()
          ctx.arc(px, py, isHighlighted ? 3 : 2, 0, Math.PI * 2)
          ctx.fillStyle = isHighlighted ? '#f472b6' : '#fb7185'
          ctx.shadowColor = '#f43f5e'
          ctx.shadowBlur = 6
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      // Draw Nodes
      simNodes.forEach(n => {
        const isSelected = selectedNode && selectedNode.id === n.id
        const isHoverMatch = searchQuery && n.label?.toLowerCase().includes(searchQuery.toLowerCase())
        const typeCfg = TYPE_COLORS[n.type] || TYPE_COLORS.device
        const clusterColor = CLUSTER_COLORS[(n.cluster_id || 0) % CLUSTER_COLORS.length]
        const nodeRadius = Math.max(10, n.radius || (n.type === 'device' || n.type === 'agent' ? 15 : 12))

        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return

        const matchesType = filterType === 'ALL' || n.type === filterType.toLowerCase()
        const matchesCluster = filterCluster === 'ALL' || n.cluster_id === Number(filterCluster)
        const matchesThreat = !threatOnly || n.cluster_id !== 0
        const isDimmed = !matchesType || !matchesCluster || !matchesThreat

        ctx.save()
        if (isDimmed) {
          ctx.globalAlpha = 0.15
        }

        // Ambient Node Aura Glow
        if (isSelected || isHoverMatch || (n.is_suspicious && !isDimmed)) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, nodeRadius + 10, 0, Math.PI * 2)
          ctx.fillStyle = isSelected ? 'rgba(236,72,153,0.45)' : (clusterColor + '40')
          ctx.fill()
        }

        // Node Circle Body
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2)
        ctx.fillStyle = n.is_quarantined ? '#334155' : typeCfg.bg
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#ffffff' : clusterColor
        ctx.lineWidth = isSelected ? 3.5 : 2
        ctx.stroke()

        // Inner Core
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeRadius * 0.38, 0, Math.PI * 2)
        ctx.fillStyle = isLightMode ? '#ffffff' : '#0b0f19'
        ctx.fill()

        // Pinned Status Pin Icon
        if (n.isPinned) {
          ctx.beginPath()
          ctx.arc(n.x + nodeRadius - 2, n.y - nodeRadius + 2, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = '#f59e0b'
          ctx.fill()
        }

        // Crisp Typography Label
        ctx.font = isSelected ? 'bold 11px JetBrains Mono, monospace' : '9.5px JetBrains Mono, monospace'
        ctx.fillStyle = isLightMode ? (isSelected ? '#0f172a' : isDimmed ? '#94a3b8' : '#1e293b') : (isSelected ? '#ffffff' : isDimmed ? '#64748b' : '#cbd5e1')
        ctx.textAlign = 'center'
        ctx.fillText((n.label || n.id).slice(0, 18), n.x, n.y + nodeRadius + 14)

        ctx.restore()
      })

      ctx.restore()
      animationFrameRef.current = requestAnimationFrame(runPhysicsStep)
    }

    animationFrameRef.current = requestAnimationFrame(runPhysicsStep)
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [graphData, zoom, pan, selectedNode, searchQuery, draggedNode, threatOnly, layoutMode, filterType, filterCluster])

  // Helper to convert mouse event to internal canvas coordinate space
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, clickX: 0, clickY: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY
    const clickX = (canvasX - pan.x) / zoom
    const clickY = (canvasY - pan.y) / zoom
    return { canvasX, canvasY, clickX, clickY }
  }

  // 3. Mouse & Wheel Interaction Handlers (Full Click & Drag Support)
  const [isHoveringNode, setIsHoveringNode] = useState(false)

  const handleMouseDown = (e) => {
    const { clickX, clickY } = getCanvasCoords(e)

    // Find clicked node with generous hit radius
    const hit = simNodesRef.current.find(n => {
      const dx = n.x - clickX
      const dy = n.y - clickY
      const nodeRadius = n.radius || 14
      return Math.sqrt(dx * dx + dy * dy) <= nodeRadius + 12
    })

    if (hit) {
      setSelectedNode(hit)
      setDraggedNode(hit)
    } else {
      setIsDragging(true)
      const { canvasX, canvasY } = getCanvasCoords(e)
      setDragStart({ x: canvasX - pan.x, y: canvasY - pan.y })
    }
  }

  const handleMouseMove = (e) => {
    const { canvasX, canvasY, clickX, clickY } = getCanvasCoords(e)

    if (draggedNode) {
      draggedNode.x = clickX
      draggedNode.y = clickY
      draggedNode.vx = 0
      draggedNode.vy = 0
    } else if (isDragging) {
      setPan({ x: canvasX - dragStart.x, y: canvasY - dragStart.y })
    } else {
      // Check if mouse is hovering over any node
      const hit = simNodesRef.current.find(n => {
        const dx = n.x - clickX
        const dy = n.y - clickY
        const nodeRadius = n.radius || 14
        return Math.sqrt(dx * dx + dy * dy) <= nodeRadius + 12
      })
      setIsHoveringNode(Boolean(hit))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedNode(null)
  }

  // Smooth Mouse Wheel Zooming around Cursor
  const handleWheel = (e) => {
    e.preventDefault()
    const { canvasX, canvasY } = getCanvasCoords(e)

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const newZoom = Math.min(3.5, Math.max(0.4, zoom * zoomFactor))

    // Zoom towards mouse position in canvas coordinates
    const newPanX = canvasX - (canvasX - pan.x) * (newZoom / zoom)
    const newPanY = canvasY - (canvasY - pan.y) * (newZoom / zoom)

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }

  // Double Click to Toggle Node Pinning
  const handleDoubleClick = (e) => {
    const { clickX, clickY } = getCanvasCoords(e)

    const hit = simNodesRef.current.find(n => {
      const dx = n.x - clickX
      const dy = n.y - clickY
      const nodeRadius = n.radius || 14
      return Math.sqrt(dx * dx + dy * dy) <= nodeRadius + 12
    })

    if (hit) {
      hit.isPinned = !hit.isPinned
      setActionNotice(hit.isPinned ? `📌 Pinned node: ${hit.label}` : `📍 Unpinned node: ${hit.label}`)
      setTimeout(() => setActionNotice(null), 2500)
    }
  }

  // 4. Focus on Specific Node / Center Camera
  const handleFocusNode = (node) => {
    setSelectedNode(node)
    const targetX = 425 - node.x * 1.35
    const targetY = 275 - node.y * 1.35
    setPan({ x: targetX, y: targetY })
    setZoom(1.35)
  }

  // Reset Camera View
  const handleResetCamera = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  // 5. Attack Injection Trigger
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

  // 6. Cluster Quarantine Trigger
  const handleQuarantineCluster = async (clusterId) => {
    try {
      const res = await fetch(`${API_BASE}/cluster/quarantine/${clusterId}`, { method: 'POST' })
      const data = await res.json()
      setActionNotice(`🚨 Quarantined Louvain Ring #${clusterId}: Isolated ${data.nodes_isolated_count} connected entities.`)
      await fetchGraphTopology()
    } catch (e) {
      console.error('Failed to quarantine cluster:', e)
    } finally {
      setTimeout(() => setActionNotice(null), 4000)
    }
  }

  // 7. Interactive Attack Progression Simulator Replay
  const handleStartAttackReplay = () => {
    setIsReplaying(true)
    setSimPhase(1)
    setActionNotice('Phase 1/4: Adversary rotates through 5 residential proxy subnets...')
    
    setTimeout(() => {
      setSimPhase(2)
      setActionNotice('Phase 2/4: Micro-auth carding burst initiated across 4 stolen PANs...')
    }, 2000)

    setTimeout(() => {
      setSimPhase(3)
      setActionNotice('Phase 3/4: Louvain algorithm detects community boundary (Modularity Q=0.89)...')
    }, 4000)

    setTimeout(() => {
      setSimPhase(4)
      setActionNotice('Phase 4/4: Layer 0 RazorVigil intervenes: Tarpit delay + 1-Click Quarantine active!')
      setIsReplaying(false)
    }, 6000)
  }

  // 8. Copy WAF Expression
  const handleCopyWaf = (wafExpression) => {
    navigator.clipboard.writeText(wafExpression)
    setCopiedWaf(true)
    setTimeout(() => setCopiedWaf(false), 2500)
  }

  // Filtered view logic
  const filteredNodes = useMemo(() => {
    return (graphData.nodes || []).filter(n => {
      if (threatOnly && n.cluster_id === 0) return false
      if (filterType !== 'ALL' && n.type !== filterType.toLowerCase()) return false
      if (filterCluster !== 'ALL' && n.cluster_id !== Number(filterCluster)) return false
      if (searchQuery && !n.label?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [graphData, filterType, filterCluster, searchQuery, threatOnly])

  // Selected Cluster Metadata
  const selectedClusterMeta = useMemo(() => {
    if (!selectedNode) return null
    return graphData.clusters?.find(c => c.cluster_id === selectedNode.cluster_id) || null
  }, [selectedNode, graphData])

  return (
    <div ref={containerRef} className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#060811] p-6 overflow-y-auto' : ''}`}>
      {/* Top Header & Metrics Command Bar */}
      <div className="panel p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-inner">
            <Network size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
              Louvain Mule Ring &amp; Fraud Graph Explorer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                NetworkX Real-Time Graph
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Heterogeneous Entity Bipartite Graph · Louvain Modularity: <span className="font-mono text-emerald-400 font-bold">{graphData.modularity}</span> · Temporal Decay Half-Life: 30m
            </p>
          </div>
        </div>

        {/* Action & Simulator Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStartAttackReplay}
            disabled={isReplaying}
            className={`text-xs font-bold font-sans flex items-center gap-1.5 py-1.5 px-3 rounded-xl border transition-all ${
              isReplaying ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse' : 'bg-indigo-600/25 border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/40 shadow-sm'
            }`}
          >
            <Play size={13} className={isReplaying ? 'animate-spin' : ''} />
            {isReplaying ? `Replaying Attack (Phase ${simPhase}/4)` : 'Replay Bot Attack'}
          </button>

          <button
            onClick={() => handleInjectRing('carding_swarm')}
            disabled={isInjecting}
            className="text-xs font-bold font-sans flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition shadow-sm"
          >
            <Flame size={13} className="text-rose-400" />
            Inject Carding Swarm
          </button>

          <button
            onClick={() => handleInjectRing('agent_ring')}
            disabled={isInjecting}
            className="text-xs font-bold font-sans flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 transition shadow-sm"
          >
            <Bot size={13} className="text-pink-400" />
            Inject Rogue Agent Ring
          </button>

          <button
            onClick={fetchGraphTopology}
            className="text-xs font-bold font-sans flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Live Graph Topology"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Action / Replay Notification Toast */}
      {actionNotice && (
        <div className="p-3 bg-indigo-950/90 border border-indigo-500/40 rounded-xl text-xs font-mono text-indigo-200 flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Visual Graph Canvas (2/3) + Forensic Inspector (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visual Graph Canvas Area */}
        <div className="lg:col-span-2 panel p-0 bg-[#070b16] border border-slate-800 rounded-2xl relative overflow-hidden flex flex-col min-h-[600px] shadow-2xl">
          {/* Canvas Filter Header & Layout Algorithm Switcher */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">Type:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="CARD">Cards (PAN)</option>
                <option value="DEVICE">Devices</option>
                <option value="IP">IP Subnets</option>
                <option value="AGENT">AI Agents</option>
              </select>

              <span className="text-slate-400 font-mono text-[11px] ml-1">Cluster:</span>
              <select
                value={filterCluster}
                onChange={e => {
                  const val = e.target.value
                  setFilterCluster(val)
                  if (val !== 'ALL') {
                    const clusterNodes = simNodesRef.current.filter(n => n.cluster_id === Number(val))
                    if (clusterNodes.length > 0) {
                      const avgX = clusterNodes.reduce((s, n) => s + n.x, 0) / clusterNodes.length
                      const avgY = clusterNodes.reduce((s, n) => s + n.y, 0) / clusterNodes.length
                      setPan({ x: 425 - avgX * 1.3, y: 275 - avgY * 1.3 })
                      setZoom(1.3)
                      setSelectedNode(clusterNodes.find(n => n.is_suspicious) || clusterNodes[0])
                    }
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Clusters</option>
                {graphData.clusters?.map(c => (
                  <option key={c.cluster_id} value={c.cluster_id}>
                    Cluster #{c.cluster_id}: {c.name.slice(0, 18)}
                  </option>
                ))}
              </select>

              {/* Layout Mode Switcher */}
              <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 ml-1">
                {[
                  { id: 'force', label: 'Force', icon: Compass },
                  { id: 'radial', label: 'Radial', icon: Target },
                  { id: 'bipartite', label: 'Tiered', icon: Layers },
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={() => applyLayout(l.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 ${
                      layoutMode === l.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                    title={`${l.label} Layout Algorithm`}
                  >
                    <l.icon size={11} />
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>

              {/* Threat Only Toggle */}
              <button
                onClick={() => setThreatOnly(!threatOnly)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 border transition ${
                  threatOnly
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert size={12} />
                {threatOnly ? 'Threats Only' : 'All Traffic'}
              </button>
            </div>

            {/* Search Input & Zoom Controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search node or IP..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-slate-200 font-mono text-xs w-36 focus:w-44 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Zoom & Reset Controls */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="px-1.5 font-mono text-[10px] text-slate-400">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(3.0, z + 0.15))}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  onClick={handleResetCamera}
                  className="p-1 text-slate-400 hover:text-white ml-1 border-l border-slate-800 transition"
                  title="Center & Reset View"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Canvas Rendering Area */}
          <div className={`relative flex-1 ${isHoveringNode ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
            <canvas
              ref={canvasRef}
              width={850}
              height={550}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              className="w-full h-full block"
            />

            {/* Floating Quick Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 p-2.5 rounded-xl text-[11px] font-mono space-y-1 z-10 shadow-lg pointer-events-none">
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

            {/* Real-Time Counts Badge */}
            <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-400 z-10 shadow-md">
              <span className="text-white font-bold">{filteredNodes.length}</span> nodes · <span className="text-white font-bold">{graphData.edges?.length || 0}</span> edges · <span className="text-emerald-400 font-bold">Q={graphData.modularity}</span>
            </div>

            {/* Navigation Tip */}
            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800/80 pointer-events-none">
              🖱️ Scroll to Zoom · Drag to Pan · DblClick to Pin
            </div>
          </div>
        </div>

        {/* Forensic Entity & Mule Ring Inspector Drawer */}
        <div className="panel p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" />
                Entity &amp; Blast Radius Inspector
              </span>
              {selectedNode && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
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
              <div className="mt-3 space-y-3 font-mono text-xs">
                {/* Node Identity Card */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                    <span>Selected Entity</span>
                    <button
                      onClick={() => handleFocusNode(selectedNode)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] font-bold"
                    >
                      <Crosshair size={11} /> Focus Node
                    </button>
                  </div>
                  <div className="font-bold text-white text-sm break-all">{selectedNode.label}</div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-900 text-slate-400">
                    <span>Type: <strong className="text-indigo-300 capitalize">{selectedNode.type}</strong></span>
                    <span>Degree: <strong className="text-amber-400">{selectedNode.degree || 1} links</strong></span>
                  </div>
                </div>

                {/* Financial Blast Radius & Risk Estimation Card */}
                {selectedClusterMeta && (
                  <div className="p-3.5 bg-rose-950/30 rounded-xl border border-rose-500/30 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] text-rose-300 font-bold uppercase">
                      <span className="flex items-center gap-1"><TrendingUp size={12} /> Blast Radius Analysis</span>
                      <span>Cluster #{selectedClusterMeta.cluster_id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="p-2 bg-slate-950/80 rounded-lg border border-rose-900/40">
                        <div className="text-[10px] text-slate-400 font-sans">At-Risk GMV</div>
                        <div className="text-sm font-bold text-rose-400">
                          ₹{selectedClusterMeta.estimated_at_risk_gmv?.toLocaleString('en-IN') || '45,000'}
                        </div>
                      </div>
                      <div className="p-2 bg-slate-950/80 rounded-lg border border-rose-900/40">
                        <div className="text-[10px] text-slate-400 font-sans">Attack Velocity</div>
                        <div className="text-sm font-bold text-amber-400">
                          {selectedClusterMeta.velocity_qps || 12.4} req/s
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Linked Cards: <strong className="text-white">{selectedClusterMeta.card_count || 1}</strong></span>
                      <span>Devices: <strong className="text-white">{selectedClusterMeta.device_count || 1}</strong></span>
                      <span>IPs: <strong className="text-white">{selectedClusterMeta.ip_count || 1}</strong></span>
                    </div>
                  </div>
                )}

                {/* Cloudflare WAF Signature Generation */}
                {selectedClusterMeta?.waf_rule && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
                      <span>Cloudflare WAF Expression</span>
                      <button
                        onClick={() => handleCopyWaf(selectedClusterMeta.waf_rule)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] font-bold"
                      >
                        <Copy size={11} /> {copiedWaf ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-300 bg-slate-900 p-2 rounded-lg font-mono break-all max-h-16 overflow-y-auto border border-slate-800/80">
                      {selectedClusterMeta.waf_rule}
                    </div>
                  </div>
                )}

                {/* Connected Entity Direct Traversal */}
                <div className="space-y-1.5">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Direct Connected Neighbors</div>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {graphData.edges
                      ?.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e, idx) => {
                        const neighborId = e.source === selectedNode.id ? e.target : e.source
                        const neighbor = graphData.nodes.find(n => n.id === neighborId)
                        return (
                          <div
                            key={idx}
                            onClick={() => neighbor && handleFocusNode(neighbor)}
                            className="p-1.5 bg-slate-950 hover:bg-slate-800/80 cursor-pointer rounded-lg border border-slate-800/80 flex items-center justify-between transition-all"
                          >
                            <span className="truncate text-slate-300 text-[11px]">{neighbor?.label || neighborId}</span>
                            <span className="text-[10px] text-slate-500 font-mono">w={e.weight || 1.0}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Click any entity on the graph canvas to inspect its community ring and blast radius.
              </div>
            )}
          </div>

          {/* Action Footer */}
          {selectedNode && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleQuarantineCluster(selectedNode.cluster_id)}
                disabled={selectedNode.is_quarantined}
                className={`w-full text-xs font-mono font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg ${
                  selectedNode.is_quarantined
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                }`}
              >
                <Lock size={14} />
                {selectedNode.is_quarantined ? 'Cluster Quarantined' : `Quarantine Entire Ring #${selectedNode.cluster_id}`}
              </button>

              <div className="text-[10px] text-slate-500 text-center font-sans">
                Quarantining forces instantaneous O(1) Redis honeypot routing for all {selectedNode.degree || 1}+ linked entities.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
