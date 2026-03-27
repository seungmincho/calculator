'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type GraphNode, type GraphEdge } from '@/utils/algorithm/prim'

interface PrimCanvas2DProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  visited: boolean[]
  mstEdges: GraphEdge[]
  currentEdge: GraphEdge | null
  candidateEdges: GraphEdge[]
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
  nodeVisited: '#10b981',
  nodeVisitedDark: '#34d399',
  nodeUnvisited: '#9ca3af',
  nodeUnvisitedDark: '#6b7280',
  nodeText: '#ffffff',
  edge: '#d1d5db',
  edgeDark: '#4b5563',
  edgeText: '#6b7280',
  edgeTextDark: '#9ca3af',
  mstEdge: '#10b981',
  mstEdgeDark: '#34d399',
  currentEdge: '#f59e0b',
  currentEdgeDark: '#fbbf24',
  candidateEdge: '#a78bfa',
  candidateEdgeDark: '#c4b5fd',
}

function edgeKey(e: GraphEdge): string {
  const a = Math.min(e.from, e.to)
  const b = Math.max(e.from, e.to)
  return `${a}-${b}`
}

export default function PrimCanvas2D({
  nodes, edges, visited, mstEdges, currentEdge, candidateEdges,
  isRunning = false, onNodeDrag,
  width = 600, height = 420,
}: PrimCanvas2DProps) {
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

    // Build lookup sets
    const mstSet = new Set<string>()
    for (const e of mstEdges) mstSet.add(edgeKey(e))

    const candidateSet = new Set<string>()
    for (const e of candidateEdges) candidateSet.add(edgeKey(e))

    const currentKey = currentEdge ? edgeKey(currentEdge) : null

    // Draw edges
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) continue

      const key = edgeKey(edge)
      const isMST = mstSet.has(key)
      const isCurrent = key === currentKey
      const isCandidate = candidateSet.has(key)

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)

      if (isCurrent) {
        ctx.strokeStyle = isDark ? COLORS.currentEdgeDark : COLORS.currentEdge
        ctx.lineWidth = 3.5
        ctx.setLineDash([8, 4])
      } else if (isMST) {
        ctx.strokeStyle = isDark ? COLORS.mstEdgeDark : COLORS.mstEdge
        ctx.lineWidth = 3
        ctx.setLineDash([])
      } else if (isCandidate) {
        ctx.strokeStyle = isDark ? COLORS.candidateEdgeDark : COLORS.candidateEdge
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
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

      const textWidth = ctx.measureText(String(edge.weight)).width
      ctx.fillStyle = isDark ? 'rgba(17,24,39,0.8)' : 'rgba(255,255,255,0.8)'
      ctx.fillRect(mx - textWidth / 2 - 3, my - 7, textWidth + 6, 14)

      if (isCurrent) {
        ctx.fillStyle = isDark ? COLORS.currentEdgeDark : COLORS.currentEdge
      } else if (isMST) {
        ctx.fillStyle = isDark ? COLORS.mstEdgeDark : COLORS.mstEdge
      } else if (isCandidate) {
        ctx.fillStyle = isDark ? COLORS.candidateEdgeDark : COLORS.candidateEdge
      } else {
        ctx.fillStyle = isDark ? COLORS.edgeTextDark : COLORS.edgeText
      }
      ctx.fillText(String(edge.weight), mx, my)
    }

    // Draw nodes
    for (const node of nodes) {
      const isVisited = visited[node.id]

      // Glow for current edge endpoints
      if (currentEdge && (currentEdge.from === node.id || currentEdge.to === node.id)) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 24, 0, Math.PI * 2)
        ctx.fillStyle = isDark ? 'rgba(251,191,36,0.2)' : 'rgba(245,158,11,0.2)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = isVisited
        ? (isDark ? COLORS.nodeVisitedDark : COLORS.nodeVisited)
        : (isDark ? COLORS.nodeUnvisitedDark : COLORS.nodeUnvisited)
      ctx.fill()
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = COLORS.nodeText
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)
    }
  }, [nodes, edges, visited, mstEdges, currentEdge, candidateEdges, isDark, width, height])

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
