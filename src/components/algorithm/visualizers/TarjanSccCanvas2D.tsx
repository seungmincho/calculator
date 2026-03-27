'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type TSNode, type TSEdge, SCC_COLORS, SCC_COLORS_DARK } from '@/utils/algorithm/tarjanScc'

interface TarjanSccCanvas2DProps {
  nodes: TSNode[]
  edges: TSEdge[]
  disc: number[]
  low: number[]
  onStack: boolean[]
  stack: number[]
  sccIndex: number[]
  currentNode: number
  targetNode: number
  currentScc: number[]
  action: string
  isRunning?: boolean
  onNodeDrag?: (id: number, x: number, y: number) => void
  width?: number
  height?: number
}

const COLORS = {
  node: '#6b7280',
  nodeDark: '#9ca3af',
  nodeActive: '#f59e0b',
  nodeActiveDark: '#fbbf24',
  nodeOnStack: '#3b82f6',
  nodeOnStackDark: '#60a5fa',
  nodeUnvisited: '#d1d5db',
  nodeUnvisitedDark: '#4b5563',
  nodeText: '#ffffff',
  edge: '#9ca3af',
  edgeDark: '#6b7280',
  edgeExplore: '#f59e0b',
  edgeExploreDark: '#fbbf24',
  edgeBack: '#ef4444',
  edgeBackDark: '#f87171',
  edgeCross: '#6b7280',
  edgeCrossDark: '#4b5563',
}

export default function TarjanSccCanvas2D({
  nodes, edges, disc, low, onStack, stack, sccIndex,
  currentNode, targetNode, currentScc, action,
  isRunning = false, onNodeDrag,
  width = 600, height = 420,
}: TarjanSccCanvas2DProps) {
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

  const stackSet = new Set(stack)
  const currentSccSet = new Set(currentScc)

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

    // Draw edges
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) continue

      const dx = to.x - from.x
      const dy = to.y - from.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 1) continue

      const nx = dx / d
      const ny = dy / d
      const perpX = -ny * 6
      const perpY = nx * 6

      const startX = from.x + nx * 20 + perpX
      const startY = from.y + ny * 20 + perpY
      const endX = to.x - nx * 20 + perpX
      const endY = to.y - ny * 20 + perpY

      const isExploring = currentNode === edge.from && targetNode === edge.to &&
        (action === 'explore-edge' || action === 'update-lowlink')
      const isBack = currentNode === edge.from && targetNode === edge.to && action === 'back-edge'
      const isCross = currentNode === edge.from && targetNode === edge.to && action === 'cross-edge'

      // Color same-SCC edges
      const fromScc = sccIndex[edge.from]
      const toScc = sccIndex[edge.to]
      const isSameScc = fromScc >= 0 && fromScc === toScc

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)

      if (isExploring) {
        ctx.strokeStyle = isDark ? COLORS.edgeExploreDark : COLORS.edgeExplore
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
      } else if (isBack) {
        ctx.strokeStyle = isDark ? COLORS.edgeBackDark : COLORS.edgeBack
        ctx.lineWidth = 2.5
        ctx.setLineDash([4, 3])
      } else if (isCross) {
        ctx.strokeStyle = isDark ? COLORS.edgeCrossDark : COLORS.edgeCross
        ctx.lineWidth = 2
        ctx.setLineDash([2, 2])
      } else if (isSameScc) {
        const colors = isDark ? SCC_COLORS_DARK : SCC_COLORS
        ctx.strokeStyle = colors[fromScc % colors.length]
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
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
    }

    // Draw nodes
    for (const node of nodes) {
      const isCurrent = node.id === currentNode
      const isTarget = node.id === targetNode
      const isPopping = currentSccSet.has(node.id)
      const hasScc = sccIndex[node.id] >= 0
      const isOnStack = onStack[node.id]
      const isVisited = disc[node.id] >= 0

      // Glow for active/popping nodes
      if (isCurrent || isPopping) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 26, 0, Math.PI * 2)
        if (isPopping) ctx.fillStyle = isDark ? 'rgba(52,211,153,0.3)' : 'rgba(16,185,129,0.2)'
        else ctx.fillStyle = isDark ? 'rgba(251,191,36,0.3)' : 'rgba(245,158,11,0.2)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, 18, 0, Math.PI * 2)

      if (hasScc) {
        const colors = isDark ? SCC_COLORS_DARK : SCC_COLORS
        ctx.fillStyle = colors[sccIndex[node.id] % colors.length]
      } else if (isCurrent) {
        ctx.fillStyle = isDark ? COLORS.nodeActiveDark : COLORS.nodeActive
      } else if (isTarget && (action === 'explore-edge' || action === 'back-edge')) {
        ctx.fillStyle = isDark ? COLORS.edgeExploreDark : COLORS.edgeExplore
      } else if (isOnStack) {
        ctx.fillStyle = isDark ? COLORS.nodeOnStackDark : COLORS.nodeOnStack
      } else if (isVisited) {
        ctx.fillStyle = isDark ? COLORS.nodeDark : COLORS.node
      } else {
        ctx.fillStyle = isDark ? COLORS.nodeUnvisitedDark : COLORS.nodeUnvisited
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

      // disc/low badge below node
      if (disc[node.id] >= 0) {
        const text = `${disc[node.id]}/${low[node.id]}`
        const bx = node.x
        const by = node.y + 28
        ctx.font = 'bold 9px system-ui'
        const badgeW = Math.max(ctx.measureText(text).width + 8, 28)
        ctx.beginPath()
        ctx.roundRect(bx - badgeW / 2, by - 7, badgeW, 14, 4)
        ctx.fillStyle = isDark ? 'rgba(30,58,95,0.9)' : 'rgba(239,246,255,0.9)'
        ctx.fill()
        ctx.fillStyle = isDark ? '#93c5fd' : '#1d4ed8'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, bx, by)
      }
    }
  }, [nodes, edges, disc, low, onStack, stack, sccIndex, currentNode, targetNode, currentScc, action, isDark, width, height, stackSet, currentSccSet])

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
