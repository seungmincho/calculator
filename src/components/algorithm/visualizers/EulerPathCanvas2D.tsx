'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type EPNode, type EPEdge } from '@/utils/algorithm/eulerPath'

interface EulerPathCanvas2DProps {
  nodes: EPNode[]
  edges: EPEdge[]
  directed: boolean
  currentNode: number
  visitedEdges: Set<number>
  currentEdgeId: number
  circuit: number[]
  oddDegreeNodes: number[]
  isRunning?: boolean
  onNodeDrag?: (id: number, x: number, y: number) => void
  width?: number
  height?: number
}

const COLORS = {
  node:           { light: '#6b7280', dark: '#9ca3af' },
  nodeActive:     { light: '#3b82f6', dark: '#60a5fa' },
  nodeOdd:        { light: '#f59e0b', dark: '#fbbf24' },
  nodeCircuit:    { light: '#10b981', dark: '#34d399' },
  nodeText:       '#ffffff',
  edge:           { light: '#d1d5db', dark: '#4b5563' },
  edgeVisited:    { light: '#10b981', dark: '#34d399' },
  edgeCurrent:    { light: '#3b82f6', dark: '#60a5fa' },
  circuitLabel:   { light: '#7c3aed', dark: '#a78bfa' },
}

export default function EulerPathCanvas2D({
  nodes, edges, directed, currentNode, visitedEdges, currentEdgeId,
  circuit, oddDegreeNodes, isRunning = false, onNodeDrag,
  width = 600, height = 420,
}: EulerPathCanvas2DProps) {
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

  const c = (pair: { light: string; dark: string }) => isDark ? pair.dark : pair.light

  const getNodeFromPos = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (clientX - rect.left) * (width / rect.width)
    const my = (clientY - rect.top) * (height / rect.height)
    for (const node of nodes) {
      const dx = mx - node.x, dy = my - node.y
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

  const oddSet = new Set(oddDegreeNodes)
  const circuitSet = new Set(circuit)

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

    // ── Draw edges ──
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) continue

      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) continue

      const nx = dx / dist, ny = dy / dist

      // Offset for directed (prevent overlap of bidirectional)
      const perpX = directed ? -ny * 6 : 0
      const perpY = directed ? nx * 6 : 0

      const startX = from.x + nx * 20 + perpX
      const startY = from.y + ny * 20 + perpY
      const endX = to.x - nx * 20 + perpX
      const endY = to.y - ny * 20 + perpY

      const isCurrent = edge.id === currentEdgeId
      const isVisited = visitedEdges.has(edge.id)

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)

      if (isCurrent) {
        ctx.strokeStyle = c(COLORS.edgeCurrent)
        ctx.lineWidth = 3.5
        ctx.setLineDash([8, 4])
      } else if (isVisited) {
        ctx.strokeStyle = c(COLORS.edgeVisited)
        ctx.lineWidth = 2.5
        ctx.setLineDash([])
      } else {
        ctx.strokeStyle = c(COLORS.edge)
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Arrow for directed
      if (directed) {
        const arrowSize = 7
        const angle = Math.atan2(endY - startY, endX - startX)
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(endX - arrowSize * Math.cos(angle - 0.4), endY - arrowSize * Math.sin(angle - 0.4))
        ctx.lineTo(endX - arrowSize * Math.cos(angle + 0.4), endY - arrowSize * Math.sin(angle + 0.4))
        ctx.closePath()
        if (isCurrent) ctx.fillStyle = c(COLORS.edgeCurrent)
        else if (isVisited) ctx.fillStyle = c(COLORS.edgeVisited)
        else ctx.fillStyle = c(COLORS.edge)
        ctx.fill()
      }

      // Edge ID label (small, subtle)
      const mx = (startX + endX) / 2
      const my = (startY + endY) / 2
      ctx.font = '9px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'
      ctx.fillText(`e${edge.id}`, mx, my - 8)
    }

    // ── Draw nodes ──
    for (const node of nodes) {
      const isActive = node.id === currentNode
      const isOdd = oddSet.has(node.id)
      const inCircuit = circuitSet.has(node.id) && circuit.length > 0

      // Glow
      if (isActive) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 26, 0, Math.PI * 2)
        ctx.fillStyle = isDark ? 'rgba(96,165,250,0.25)' : 'rgba(59,130,246,0.15)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2)

      if (isActive) ctx.fillStyle = c(COLORS.nodeActive)
      else if (isOdd) ctx.fillStyle = c(COLORS.nodeOdd)
      else if (inCircuit) ctx.fillStyle = c(COLORS.nodeCircuit)
      else ctx.fillStyle = c(COLORS.node)

      ctx.fill()
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.fillStyle = COLORS.nodeText
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)
    }

    // ── Draw circuit order badges ──
    if (circuit.length > 0) {
      for (let i = 0; i < circuit.length; i++) {
        const node = nodes.find(n => n.id === circuit[i])
        if (!node) continue
        const bx = node.x + 14
        const by = node.y - 14
        ctx.font = 'bold 9px system-ui'
        const text = String(i + 1)
        const tw = ctx.measureText(text).width
        ctx.beginPath()
        ctx.arc(bx, by, Math.max(tw / 2 + 3, 8), 0, Math.PI * 2)
        ctx.fillStyle = c(COLORS.circuitLabel)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, bx, by)
      }
    }
  }, [nodes, edges, directed, currentNode, visitedEdges, currentEdgeId, circuit, oddDegreeNodes, isDark, width, height, oddSet, circuitSet])

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
