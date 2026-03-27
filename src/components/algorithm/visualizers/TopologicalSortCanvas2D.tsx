'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type DAGNode, type DAGEdge } from '@/utils/algorithm/topologicalSort'

interface TopSortCanvas2DProps {
  nodes: DAGNode[]
  edges: DAGEdge[]
  inDegrees: number[]
  queue: number[]
  result: number[]
  currentNode: number
  removedEdges: Set<string>
  isRunning?: boolean
  onNodeDrag?: (id: number, x: number, y: number) => void
  width?: number
  height?: number
}

const COLORS = {
  node: '#6b7280',
  nodeDark: '#9ca3af',
  nodeQueued: '#3b82f6',
  nodeQueuedDark: '#60a5fa',
  nodeCurrent: '#f59e0b',
  nodeCurrentDark: '#fbbf24',
  nodeProcessed: '#10b981',
  nodeProcessedDark: '#34d399',
  nodeText: '#ffffff',
  edge: '#9ca3af',
  edgeDark: '#6b7280',
  edgeRemoved: '#d1d5db',
  edgeRemovedDark: '#374151',
  arrowActive: '#3b82f6',
  arrowActiveDark: '#60a5fa',
  inDegreeBg: '#fef3c7',
  inDegreeBgDark: '#451a03',
  inDegreeText: '#92400e',
  inDegreeTextDark: '#fbbf24',
  orderBadge: '#10b981',
  orderBadgeDark: '#059669',
  orderText: '#ffffff',
}

export default function TopologicalSortCanvas2D({
  nodes, edges, inDegrees, queue, result, currentNode,
  removedEdges, isRunning = false, onNodeDrag,
  width = 600, height = 420,
}: TopSortCanvas2DProps) {
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

    const queueSet = new Set(queue)
    const resultSet = new Set(result)

    // Draw edges with arrows
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) continue

      const key = `${edge.from}-${edge.to}`
      const isRemoved = removedEdges.has(key)

      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) continue

      const nx = dx / dist
      const ny = dy / dist
      const startX = from.x + nx * 20
      const startY = from.y + ny * 20
      const endX = to.x - nx * 20
      const endY = to.y - ny * 20

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)

      if (isRemoved) {
        ctx.strokeStyle = isDark ? COLORS.edgeRemovedDark : COLORS.edgeRemoved
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
      } else {
        ctx.strokeStyle = isDark ? COLORS.edgeDark : COLORS.edge
        ctx.lineWidth = 2
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Arrowhead
      if (!isRemoved) {
        const arrowSize = 8
        const angle = Math.atan2(endY - startY, endX - startX)
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(endX - arrowSize * Math.cos(angle - 0.4), endY - arrowSize * Math.sin(angle - 0.4))
        ctx.lineTo(endX - arrowSize * Math.cos(angle + 0.4), endY - arrowSize * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fillStyle = isDark ? COLORS.edgeDark : COLORS.edge
        ctx.fill()
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const isQueued = queueSet.has(node.id)
      const isProcessed = resultSet.has(node.id)
      const isCurrent = node.id === currentNode

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2)

      if (isCurrent) {
        ctx.fillStyle = isDark ? COLORS.nodeCurrentDark : COLORS.nodeCurrent
        // Glow
        ctx.save()
        ctx.shadowColor = isDark ? COLORS.nodeCurrentDark : COLORS.nodeCurrent
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.restore()
      } else if (isProcessed) {
        ctx.fillStyle = isDark ? COLORS.nodeProcessedDark : COLORS.nodeProcessed
        ctx.fill()
      } else if (isQueued) {
        ctx.fillStyle = isDark ? COLORS.nodeQueuedDark : COLORS.nodeQueued
        ctx.fill()
      } else {
        ctx.fillStyle = isDark ? COLORS.nodeDark : COLORS.node
        ctx.fill()
      }

      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Node label
      ctx.fillStyle = COLORS.nodeText
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)

      // In-degree badge (top-right)
      const deg = inDegrees[node.id] ?? 0
      if (!isProcessed) {
        const bx = node.x + 14
        const by = node.y - 14
        ctx.beginPath()
        ctx.arc(bx, by, 9, 0, Math.PI * 2)
        ctx.fillStyle = isDark ? COLORS.inDegreeBgDark : COLORS.inDegreeBg
        ctx.fill()
        ctx.fillStyle = isDark ? COLORS.inDegreeTextDark : COLORS.inDegreeText
        ctx.font = 'bold 10px system-ui'
        ctx.fillText(String(deg), bx, by)
      }

      // Order badge (bottom, only if processed)
      if (isProcessed) {
        const orderIdx = result.indexOf(node.id)
        if (orderIdx >= 0) {
          const bx = node.x
          const by = node.y + 28
          ctx.beginPath()
          ctx.arc(bx, by, 10, 0, Math.PI * 2)
          ctx.fillStyle = isDark ? COLORS.orderBadgeDark : COLORS.orderBadge
          ctx.fill()
          ctx.fillStyle = COLORS.orderText
          ctx.font = 'bold 10px system-ui'
          ctx.fillText(String(orderIdx + 1), bx, by)
        }
      }
    }
  }, [nodes, edges, inDegrees, queue, result, currentNode, removedEdges, isDark, width, height])

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
