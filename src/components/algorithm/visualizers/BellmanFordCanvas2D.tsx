'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type BFNode, type BFEdge } from '@/utils/algorithm/bellmanFord'

interface BellmanFordCanvas2DProps {
  nodes: BFNode[]
  edges: BFEdge[]
  distances: number[]
  source: number
  currentEdge: BFEdge | null
  updatedNode: number
  predecessors: (number | null)[]
  negativeCycleNodes: number[]
  isRunning?: boolean
  onNodeDrag?: (id: number, x: number, y: number) => void
  width?: number
  height?: number
}

const COLORS = {
  node: '#6b7280',
  nodeDark: '#9ca3af',
  nodeSource: '#3b82f6',
  nodeSourceDark: '#60a5fa',
  nodeUpdated: '#10b981',
  nodeUpdatedDark: '#34d399',
  nodeNegCycle: '#ef4444',
  nodeNegCycleDark: '#f87171',
  nodeText: '#ffffff',
  edge: '#9ca3af',
  edgeDark: '#6b7280',
  edgeNeg: '#ef4444',
  edgeNegDark: '#f87171',
  edgeCurrent: '#f59e0b',
  edgeCurrentDark: '#fbbf24',
  edgePath: '#10b981',
  edgePathDark: '#34d399',
  distBg: '#eff6ff',
  distBgDark: '#1e3a5f',
  distText: '#1d4ed8',
  distTextDark: '#93c5fd',
  inf: '#9ca3af',
}

export default function BellmanFordCanvas2D({
  nodes, edges, distances, source, currentEdge, updatedNode,
  predecessors, negativeCycleNodes, isRunning = false, onNodeDrag,
  width = 600, height = 420,
}: BellmanFordCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [draggingNode, setDraggingNode] = useState<number | null>(null)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const getNodeFromPos = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (clientX - rect.left) * (width / rect.width)
    const my = (clientY - rect.top) * (height / rect.height)
    for (const node of nodes) {
      const dx = mx - node.x
      const dy = my - node.y
      if (dx * dx + dy * dy < 400) return node.id
    }
    return null
  }, [nodes, width, height])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isRunning) return
    const id = getNodeFromPos(e.clientX, e.clientY)
    if (id !== null) setDraggingNode(id)
  }, [isRunning, getNodeFromPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode === null || !onNodeDrag) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    onNodeDrag(draggingNode, (e.clientX - rect.left) * (width / rect.width), (e.clientY - rect.top) * (height / rect.height))
  }, [draggingNode, onNodeDrag, width, height])

  const handleMouseUp = useCallback(() => setDraggingNode(null), [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRunning || e.touches.length !== 1) return
    const id = getNodeFromPos(e.touches[0].clientX, e.touches[0].clientY)
    if (id !== null) setDraggingNode(id)
  }, [isRunning, getNodeFromPos])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggingNode === null || !onNodeDrag || e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    onNodeDrag(draggingNode, (t.clientX - rect.left) * (width / rect.width), (t.clientY - rect.top) * (height / rect.height))
  }, [draggingNode, onNodeDrag, width, height])

  // Build path edges set from predecessors
  const pathEdges = new Set<string>()
  for (let i = 0; i < nodes.length; i++) {
    if (predecessors[i] !== null) {
      pathEdges.add(`${predecessors[i]}-${i}`)
    }
  }

  const negCycleSet = new Set(negativeCycleNodes)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    // Draw edges with arrows
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) continue

      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) continue

      const nx = dx / dist
      const ny = dy / dist

      // Offset for directed edges (curve slightly for bidirectional)
      const perpX = -ny * 6
      const perpY = nx * 6

      const startX = from.x + nx * 20 + perpX
      const startY = from.y + ny * 20 + perpY
      const endX = to.x - nx * 20 + perpX
      const endY = to.y - ny * 20 + perpY

      const isCurrent = currentEdge && currentEdge.from === edge.from && currentEdge.to === edge.to
      const isPath = pathEdges.has(`${edge.from}-${edge.to}`)
      const isNeg = edge.weight < 0

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)

      if (isCurrent) {
        ctx.strokeStyle = isDark ? COLORS.edgeCurrentDark : COLORS.edgeCurrent
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
      } else if (isPath) {
        ctx.strokeStyle = isDark ? COLORS.edgePathDark : COLORS.edgePath
        ctx.lineWidth = 2.5
        ctx.setLineDash([])
      } else if (isNeg) {
        ctx.strokeStyle = isDark ? COLORS.edgeNegDark : COLORS.edgeNeg
        ctx.lineWidth = 2
        ctx.setLineDash([])
      } else {
        ctx.strokeStyle = isDark ? COLORS.edgeDark : COLORS.edge
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Arrow
      const arrowSize = 7
      const angle = Math.atan2(endY - startY, endX - startX)
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(endX - arrowSize * Math.cos(angle - 0.4), endY - arrowSize * Math.sin(angle - 0.4))
      ctx.lineTo(endX - arrowSize * Math.cos(angle + 0.4), endY - arrowSize * Math.sin(angle + 0.4))
      ctx.closePath()
      if (isCurrent) ctx.fillStyle = isDark ? COLORS.edgeCurrentDark : COLORS.edgeCurrent
      else if (isPath) ctx.fillStyle = isDark ? COLORS.edgePathDark : COLORS.edgePath
      else if (isNeg) ctx.fillStyle = isDark ? COLORS.edgeNegDark : COLORS.edgeNeg
      else ctx.fillStyle = isDark ? COLORS.edgeDark : COLORS.edge
      ctx.fill()

      // Weight label
      const mx = (startX + endX) / 2
      const my = (startY + endY) / 2
      ctx.font = `bold 11px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const wText = String(edge.weight)
      const tw = ctx.measureText(wText).width
      ctx.fillStyle = isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.85)'
      ctx.fillRect(mx - tw / 2 - 3, my - 7, tw + 6, 14)
      ctx.fillStyle = isNeg ? (isDark ? COLORS.edgeNegDark : COLORS.edgeNeg) : (isDark ? '#d1d5db' : '#374151')
      ctx.fillText(wText, mx, my)
    }

    // Draw nodes
    for (const node of nodes) {
      const isSource = node.id === source
      const isUpdated = node.id === updatedNode
      const isNegCycle = negCycleSet.has(node.id)

      // Glow
      if (isUpdated || isNegCycle) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 26, 0, Math.PI * 2)
        ctx.fillStyle = isNegCycle
          ? (isDark ? 'rgba(248,113,113,0.25)' : 'rgba(239,68,68,0.15)')
          : (isDark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.15)')
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2)

      if (isNegCycle) {
        ctx.fillStyle = isDark ? COLORS.nodeNegCycleDark : COLORS.nodeNegCycle
      } else if (isSource) {
        ctx.fillStyle = isDark ? COLORS.nodeSourceDark : COLORS.nodeSource
      } else if (isUpdated) {
        ctx.fillStyle = isDark ? COLORS.nodeUpdatedDark : COLORS.nodeUpdated
      } else {
        ctx.fillStyle = isDark ? COLORS.nodeDark : COLORS.node
      }
      ctx.fill()
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Node label
      ctx.fillStyle = COLORS.nodeText
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)

      // Distance badge below node
      const dist = distances[node.id]
      const distStr = dist === Infinity ? '\u221E' : String(dist)
      const bx = node.x
      const by = node.y + 28
      ctx.font = 'bold 10px system-ui'
      const badgeW = Math.max(ctx.measureText(distStr).width + 8, 22)
      ctx.beginPath()
      const r = 5
      ctx.roundRect(bx - badgeW / 2, by - 8, badgeW, 16, r)
      ctx.fillStyle = isDark ? COLORS.distBgDark : COLORS.distBg
      ctx.fill()
      ctx.fillStyle = dist === Infinity ? COLORS.inf : (isDark ? COLORS.distTextDark : COLORS.distText)
      ctx.fillText(distStr, bx, by)
    }
  }, [nodes, edges, distances, source, currentEdge, updatedNode, predecessors, negativeCycleNodes, isDark, width, height, pathEdges, negCycleSet])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className={`rounded-xl ${isRunning ? 'cursor-default' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setDraggingNode(null)}
    />
  )
}
