'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type GraphNode, type GraphEdge } from '@/utils/algorithm/kruskal'

interface KruskalCanvas2DProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  sortedEdges: GraphEdge[]
  mstEdgeIndices: number[]      // indices into sortedEdges that are in MST
  currentEdgeIndex: number      // edge currently being examined (-1 = none)
  skippedEdges: Set<number>     // indices of skipped edges
  parent: number[]              // Union-Find parent array
  isRunning?: boolean
  onNodeDrag?: (id: number, x: number, y: number) => void
  width?: number
  height?: number
}

const COLORS = {
  bg: '#ffffff',
  bgDark: '#111827',
  node: '#3b82f6',
  nodeDark: '#60a5fa',
  nodeStroke: '#1d4ed8',
  nodeStrokeDark: '#93c5fd',
  nodeText: '#ffffff',
  edge: '#d1d5db',
  edgeDark: '#4b5563',
  edgeText: '#6b7280',
  edgeTextDark: '#9ca3af',
  mstEdge: '#10b981',
  mstEdgeDark: '#34d399',
  currentEdge: '#f59e0b',
  currentEdgeDark: '#fbbf24',
  skippedEdge: '#ef4444',
  skippedEdgeDark: '#f87171',
  groupColors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
}

function findRoot(parent: number[], x: number): number {
  while (parent[x] !== x) x = parent[x]
  return x
}

export default function KruskalCanvas2D({
  nodes, edges, sortedEdges, mstEdgeIndices, currentEdgeIndex,
  skippedEdges, parent, isRunning = false, onNodeDrag,
  width = 600, height = 420,
}: KruskalCanvas2DProps) {
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
    const sx = width / rect.width
    const sy = height / rect.height
    const mx = (clientX - rect.left) * sx
    const my = (clientY - rect.top) * sy
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
    const x = (e.clientX - rect.left) * (width / rect.width)
    const y = (e.clientY - rect.top) * (height / rect.height)
    onNodeDrag(draggingNode, x, y)
  }, [draggingNode, onNodeDrag, width, height])

  const handleMouseUp = useCallback(() => setDraggingNode(null), [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRunning || e.touches.length !== 1) return
    const t = e.touches[0]
    const id = getNodeFromPos(t.clientX, t.clientY)
    if (id !== null) setDraggingNode(id)
  }, [isRunning, getNodeFromPos])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggingNode === null || !onNodeDrag || e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (t.clientX - rect.left) * (width / rect.width)
    const y = (t.clientY - rect.top) * (height / rect.height)
    onNodeDrag(draggingNode, x, y)
  }, [draggingNode, onNodeDrag, width, height])

  // Draw
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

    // Build set of MST edge keys for quick lookup
    const mstSet = new Set<string>()
    for (const idx of mstEdgeIndices) {
      const e = sortedEdges[idx]
      if (e) {
        mstSet.add(`${e.from}-${e.to}`)
        mstSet.add(`${e.to}-${e.from}`)
      }
    }

    // Current edge
    const currentEdge = currentEdgeIndex >= 0 ? sortedEdges[currentEdgeIndex] : null

    // Draw edges
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) continue

      const key = `${edge.from}-${edge.to}`
      const keyRev = `${edge.to}-${edge.from}`
      const isMST = mstSet.has(key)
      const isCurrent = currentEdge && (
        (currentEdge.from === edge.from && currentEdge.to === edge.to) ||
        (currentEdge.from === edge.to && currentEdge.to === edge.from)
      )

      // Check if this edge was skipped
      let isSkipped = false
      for (const si of Array.from(skippedEdges)) {
        const se = sortedEdges[si]
        if (se && ((se.from === edge.from && se.to === edge.to) || (se.from === edge.to && se.to === edge.from))) {
          isSkipped = true
          break
        }
      }

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)

      if (isCurrent) {
        ctx.strokeStyle = isDark ? COLORS.currentEdgeDark : COLORS.currentEdge
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
      } else if (isMST) {
        ctx.strokeStyle = isDark ? COLORS.mstEdgeDark : COLORS.mstEdge
        ctx.lineWidth = 3
        ctx.setLineDash([])
      } else if (isSkipped) {
        ctx.strokeStyle = isDark ? COLORS.skippedEdgeDark : COLORS.skippedEdge
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
      } else {
        ctx.strokeStyle = isDark ? COLORS.edgeDark : COLORS.edge
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
      }

      ctx.stroke()
      ctx.setLineDash([])

      // Weight label
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2
      const fontSize = isMST || isCurrent ? 12 : 10
      ctx.font = `bold ${fontSize}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Background for readability
      const textWidth = ctx.measureText(String(edge.weight)).width
      ctx.fillStyle = isDark ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.8)'
      ctx.fillRect(mx - textWidth / 2 - 3, my - 7, textWidth + 6, 14)

      if (isCurrent) {
        ctx.fillStyle = isDark ? COLORS.currentEdgeDark : COLORS.currentEdge
      } else if (isMST) {
        ctx.fillStyle = isDark ? COLORS.mstEdgeDark : COLORS.mstEdge
      } else if (isSkipped) {
        ctx.fillStyle = isDark ? COLORS.skippedEdgeDark : COLORS.skippedEdge
      } else {
        ctx.fillStyle = isDark ? COLORS.edgeTextDark : COLORS.edgeText
      }
      ctx.fillText(String(edge.weight), mx, my)
    }

    // Determine group colors from Union-Find
    const groupMap = new Map<number, number>()
    let groupIdx = 0
    for (let i = 0; i < nodes.length; i++) {
      const root = findRoot(parent, i)
      if (!groupMap.has(root)) {
        groupMap.set(root, groupIdx++)
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const root = findRoot(parent, node.id)
      const gIdx = groupMap.get(root) ?? 0
      const color = COLORS.groupColors[gIdx % COLORS.groupColors.length]

      // Glow for current edge endpoints
      if (currentEdge && (currentEdge.from === node.id || currentEdge.to === node.id)) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 24, 0, Math.PI * 2)
        ctx.fillStyle = isDark ? 'rgba(251,191,36,0.2)' : 'rgba(245,158,11,0.2)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)
    }
  }, [nodes, edges, sortedEdges, mstEdgeIndices, currentEdgeIndex, skippedEdges, parent, isDark, width, height])

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
