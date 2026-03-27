'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { type LLNode, type ListType } from '@/utils/algorithm/linkedList'

export interface LinkedListCanvas2DProps {
  nodes: Map<number, LLNode>
  head: number | null
  tail: number | null
  listType: ListType
  highlightNodes: Set<number>
  highlightEdges: Set<string>  // "from-to"
  activeNodeId: number | null
  createdNodeId: number | null
  deletedNodeId: number | null
  width?: number
  height?: number
}

const NODE_W = 60
const NODE_H = 36
const GAP = 30
const ARROW_W = 20
const PADDING = 40

const C = {
  bg:          { light: '#f8fafc', dark: '#111827' },
  nodeDefault: { fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  nodeActive:  { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  nodeCreated: { fill: '#dcfce7', border: '#16a34a' },
  nodeDeleted: { fill: '#fee2e2', border: '#dc2626' },
  nodeHighlight: { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  arrow:       { light: '#94a3b8', dark: '#4b5563' },
  arrowHL:     '#f59e0b',
  textMain:    { light: '#1e293b', dark: '#f1f5f9' },
  textSub:     { light: '#64748b', dark: '#94a3b8' },
  nullBox:     { light: '#e2e8f0', dark: '#374151' },
  headLabel:   '#3b82f6',
  tailLabel:   '#8b5cf6',
}

export default function LinkedListCanvas2D({
  nodes, head, tail, listType, highlightNodes, highlightEdges,
  activeNodeId, createdNodeId, deletedNodeId,
  width = 700, height = 150,
}: LinkedListCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Compute ordered node list from head
  const orderedIds = useMemo(() => {
    const ids: number[] = []
    let cur = head
    let safety = 0
    while (cur !== null && safety < 200) {
      ids.push(cur)
      cur = nodes.get(cur)?.next ?? null
      safety++
    }
    return ids
  }, [nodes, head])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const nodeCount = orderedIds.length
    const logicalW = Math.max(width, PADDING * 2 + nodeCount * (NODE_W + GAP) + 40)
    const logicalH = listType === 'doubly' ? Math.max(height, 180) : Math.max(height, 150)

    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (nodeCount === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Linked List will appear here', logicalW / 2, logicalH / 2)
      return
    }

    const baseY = logicalH / 2 - 5

    // Draw each node and arrows
    for (let i = 0; i < nodeCount; i++) {
      const id = orderedIds[i]
      const node = nodes.get(id)!
      const x = PADDING + i * (NODE_W + GAP)

      const isActive = id === activeNodeId
      const isCreated = id === createdNodeId
      const isDeleted = id === deletedNodeId
      const isHL = highlightNodes.has(id)

      let fill: string, border: string, textColor: string
      let borderWidth = 1.5

      if (isActive) {
        fill = C.nodeActive.fill; border = C.nodeActive.border; textColor = C.nodeActive.text; borderWidth = 2.5
      } else if (isCreated) {
        fill = C.nodeCreated.fill; border = C.nodeCreated.border; textColor = isDark ? C.textMain.dark : C.textMain.light; borderWidth = 2.5
      } else if (isDeleted) {
        fill = C.nodeDeleted.fill; border = C.nodeDeleted.border; textColor = isDark ? C.textMain.dark : C.textMain.light; borderWidth = 2.5
      } else if (isHL) {
        fill = isDark ? C.nodeHighlight.fill.dark : C.nodeHighlight.fill.light
        border = C.nodeHighlight.border; textColor = isDark ? C.textMain.dark : C.textMain.light; borderWidth = 2
      } else {
        fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
        border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
        textColor = isDark ? C.textMain.dark : C.textMain.light
      }

      // Node box
      ctx.save()
      if (isActive || isCreated) { ctx.shadowColor = 'rgba(59,130,246,0.3)'; ctx.shadowBlur = 10 }
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.roundRect(x, baseY - NODE_H / 2, NODE_W, NODE_H, 6)
      ctx.fill()
      ctx.strokeStyle = border; ctx.lineWidth = borderWidth; ctx.stroke()
      ctx.shadowBlur = 0

      // Value
      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(node.value), x + NODE_W / 2, baseY)
      ctx.restore()

      // Pointer section divider
      ctx.save()
      ctx.strokeStyle = isDark ? '#374151' : '#e2e8f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + NODE_W * 0.7, baseY - NODE_H / 2)
      ctx.lineTo(x + NODE_W * 0.7, baseY + NODE_H / 2)
      ctx.stroke()

      // Small dot for "next" pointer
      ctx.beginPath()
      ctx.arc(x + NODE_W * 0.85, baseY, 3, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af'; ctx.fill()
      ctx.restore()

      // Head / Tail labels
      if (id === head) {
        ctx.save()
        ctx.font = 'bold 10px system-ui'
        ctx.fillStyle = C.headLabel; ctx.textAlign = 'center'
        ctx.fillText('HEAD', x + NODE_W / 2, baseY - NODE_H / 2 - 8)
        ctx.restore()
      }
      if (id === tail) {
        ctx.save()
        ctx.font = 'bold 10px system-ui'
        ctx.fillStyle = C.tailLabel; ctx.textAlign = 'center'
        ctx.fillText('TAIL', x + NODE_W / 2, baseY + NODE_H / 2 + 14)
        ctx.restore()
      }

      // Strikethrough for deleted
      if (isDeleted) {
        ctx.save()
        ctx.strokeStyle = C.nodeDeleted.border; ctx.lineWidth = 2; ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.moveTo(x + 4, baseY); ctx.lineTo(x + NODE_W - 4, baseY); ctx.stroke()
        ctx.restore()
      }

      // Forward arrow to next node
      if (i < nodeCount - 1) {
        const nextId = orderedIds[i + 1]
        const edgeKey = `${id}-${nextId}`
        const isEdgeHL = highlightEdges.has(edgeKey)
        const arrowStartX = x + NODE_W
        const arrowEndX = PADDING + (i + 1) * (NODE_W + GAP)

        ctx.save()
        ctx.strokeStyle = isEdgeHL ? C.arrowHL : (isDark ? C.arrow.dark : C.arrow.light)
        ctx.lineWidth = isEdgeHL ? 2.5 : 1.5
        ctx.beginPath()
        ctx.moveTo(arrowStartX, baseY)
        ctx.lineTo(arrowEndX, baseY)
        ctx.stroke()

        // Arrowhead
        ctx.fillStyle = isEdgeHL ? C.arrowHL : (isDark ? C.arrow.dark : C.arrow.light)
        ctx.beginPath()
        ctx.moveTo(arrowEndX, baseY)
        ctx.lineTo(arrowEndX - 6, baseY - 4)
        ctx.lineTo(arrowEndX - 6, baseY + 4)
        ctx.closePath(); ctx.fill()
        ctx.restore()

        // Backward arrow for doubly linked
        if (listType === 'doubly') {
          const revKey = `${nextId}-${id}`
          const isRevHL = highlightEdges.has(revKey)
          ctx.save()
          ctx.strokeStyle = isRevHL ? C.arrowHL : (isDark ? C.arrow.dark : C.arrow.light)
          ctx.lineWidth = isRevHL ? 2 : 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(arrowEndX, baseY + 12)
          ctx.lineTo(arrowStartX, baseY + 12)
          ctx.stroke()
          // Arrowhead
          ctx.setLineDash([])
          ctx.fillStyle = isRevHL ? C.arrowHL : (isDark ? C.arrow.dark : C.arrow.light)
          ctx.beginPath()
          ctx.moveTo(arrowStartX, baseY + 12)
          ctx.lineTo(arrowStartX + 6, baseY + 8)
          ctx.lineTo(arrowStartX + 6, baseY + 16)
          ctx.closePath(); ctx.fill()
          ctx.restore()
        }
      } else {
        // NULL pointer from last node
        const nullX = x + NODE_W + 10
        ctx.save()
        ctx.strokeStyle = isDark ? C.arrow.dark : C.arrow.light
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x + NODE_W, baseY)
        ctx.lineTo(nullX + 10, baseY)
        ctx.stroke()

        ctx.font = 'bold 10px system-ui'
        ctx.fillStyle = isDark ? C.nullBox.dark : C.nullBox.light
        ctx.textAlign = 'left'
        ctx.fillText('NULL', nullX + 14, baseY + 4)
        ctx.restore()
      }
    }
  }, [nodes, head, tail, listType, orderedIds, highlightNodes, highlightEdges, activeNodeId, createdNodeId, deletedNodeId, width, height, isDark])

  const nodeCount = orderedIds.length
  const displayW = Math.max(width, PADDING * 2 + nodeCount * (NODE_W + GAP) + 40)
  const displayH = listType === 'doubly' ? Math.max(height, 180) : Math.max(height, 150)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: displayW, height: displayH }}
      className="rounded-xl"
    />
  )
}
