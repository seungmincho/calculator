'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type GraphState, type GraphNode, toAdjacencyMatrix, toAdjacencyList } from '@/utils/algorithm/graphRepr'

export interface GraphReprCanvas2DProps {
  state: GraphState
  selectedNode: number | null
  hoveredNode: number | null
  onNodeClick: (nodeId: number | null) => void
  onNodeDrag: (nodeId: number, x: number, y: number) => void
  onAddNodeAt: (x: number, y: number) => void
  width?: number
  height?: number
}

const NODE_R = 22
const C = {
  bg:           { light: '#f8fafc', dark: '#111827' },
  nodeDefault:  { fill: { light: '#e2e8f0', dark: '#334155' }, border: { light: '#64748b', dark: '#64748b' } },
  nodeSelected: { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  nodeHovered:  { fill: { light: '#dbeafe', dark: '#1e3a5f' }, border: '#3b82f6' },
  edge:         { light: '#94a3b8', dark: '#4b5563' },
  edgeWeight:   { light: '#1e293b', dark: '#e2e8f0' },
  textMain:     { light: '#1e293b', dark: '#f1f5f9' },
  textSub:      { light: '#64748b', dark: '#94a3b8' },
  arrow:        { light: '#64748b', dark: '#94a3b8' },
}

export default function GraphReprCanvas2D({
  state, selectedNode, hoveredNode, onNodeClick, onNodeDrag, onAddNodeAt,
  width = 600, height = 400,
}: GraphReprCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)
  const draggingRef = useRef<number | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, width, height)

    if (state.nodes.length === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Click to add nodes', width / 2, height / 2)
      return
    }

    const nodeMap = new Map(state.nodes.map(n => [n.id, n]))

    // Edges
    for (const edge of state.edges) {
      const from = nodeMap.get(edge.from)
      const to = nodeMap.get(edge.to)
      if (!from || !to) continue

      ctx.save()
      ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()

      // Arrowhead for directed
      if (state.directed) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x)
        const tipX = to.x - NODE_R * Math.cos(angle)
        const tipY = to.y - NODE_R * Math.sin(angle)
        ctx.fillStyle = isDark ? C.arrow.dark : C.arrow.light
        ctx.beginPath()
        ctx.moveTo(tipX, tipY)
        ctx.lineTo(tipX - 10 * Math.cos(angle - 0.3), tipY - 10 * Math.sin(angle - 0.3))
        ctx.lineTo(tipX - 10 * Math.cos(angle + 0.3), tipY - 10 * Math.sin(angle + 0.3))
        ctx.closePath(); ctx.fill()
      }

      // Weight label
      if (state.weighted) {
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2
        ctx.font = 'bold 11px system-ui'
        ctx.fillStyle = isDark ? C.edgeWeight.dark : C.edgeWeight.light
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

        // Background for weight
        const tw = ctx.measureText(String(edge.weight)).width + 6
        ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
        ctx.fillRect(mx - tw / 2, my - 8, tw, 16)
        ctx.fillStyle = isDark ? C.edgeWeight.dark : C.edgeWeight.light
        ctx.fillText(String(edge.weight), mx, my)
      }

      ctx.restore()
    }

    // Nodes
    for (const node of state.nodes) {
      const isSelected = node.id === selectedNode
      const isHovered = node.id === hoveredNode

      let fill: string, border: string, textColor: string

      if (isSelected) {
        fill = C.nodeSelected.fill; border = C.nodeSelected.border; textColor = C.nodeSelected.text
      } else if (isHovered) {
        fill = isDark ? C.nodeHovered.fill.dark : C.nodeHovered.fill.light
        border = C.nodeHovered.border; textColor = isDark ? C.textMain.dark : C.textMain.light
      } else {
        fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
        border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
        textColor = isDark ? C.textMain.dark : C.textMain.light
      }

      ctx.save()
      if (isSelected) { ctx.shadowColor = 'rgba(59,130,246,0.4)'; ctx.shadowBlur = 12 }
      ctx.beginPath(); ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()
      ctx.strokeStyle = border; ctx.lineWidth = isSelected ? 3 : 2; ctx.stroke()
      ctx.shadowBlur = 0

      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)
      ctx.restore()
    }

  }, [state, selectedNode, hoveredNode, width, height, isDark])

  // Mouse handlers
  const getNodeAt = useCallback((x: number, y: number): number | null => {
    for (let i = state.nodes.length - 1; i >= 0; i--) {
      const n = state.nodes[i]
      const dx = x - n.x, dy = y - n.y
      if (dx * dx + dy * dy <= NODE_R * NODE_R) return n.id
    }
    return null
  }, [state.nodes])

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)
    const nodeId = getNodeAt(x, y)
    if (nodeId !== null) {
      draggingRef.current = nodeId
      dragStartRef.current = { x, y }
    }
  }, [getCanvasCoords, getNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)
    if (draggingRef.current !== null) {
      onNodeDrag(draggingRef.current, x, y)
    }
  }, [getCanvasCoords, onNodeDrag])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e)
    if (draggingRef.current !== null && dragStartRef.current) {
      const dx = x - dragStartRef.current.x
      const dy = y - dragStartRef.current.y
      if (dx * dx + dy * dy < 25) {
        // Click, not drag
        onNodeClick(draggingRef.current)
      }
    } else {
      const nodeId = getNodeAt(x, y)
      if (nodeId === null) {
        onAddNodeAt(x, y)
      }
    }
    draggingRef.current = null
    dragStartRef.current = null
  }, [getCanvasCoords, getNodeAt, onNodeClick, onAddNodeAt])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getCanvasCoords(e)
    const nodeId = getNodeAt(x, y)
    if (nodeId !== null) {
      draggingRef.current = nodeId
      dragStartRef.current = { x, y }
    }
  }, [getCanvasCoords, getNodeAt])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (draggingRef.current !== null) {
      const { x, y } = getCanvasCoords(e)
      onNodeDrag(draggingRef.current, x, y)
    }
  }, [getCanvasCoords, onNodeDrag])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (draggingRef.current !== null && dragStartRef.current) {
      onNodeClick(draggingRef.current)
    }
    draggingRef.current = null
    dragStartRef.current = null
  }, [onNodeClick])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  )
}
