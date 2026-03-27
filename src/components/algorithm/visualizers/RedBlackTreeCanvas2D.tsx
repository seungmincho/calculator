'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { type RBNode } from '@/utils/algorithm/redBlackTree'

export interface RedBlackTreeCanvas2DProps {
  nodes: Map<number, RBNode>
  root: number | null
  activeNodeId: number | null
  visitedNodeIds: Set<number>
  highlightPath: number[]
  insertedNodeId: number | null
  deletedNodeId: number | null
  rotatingNodeId: number | null
  recoloringNodeId: number | null
  width?: number
  height?: number
}

const NODE_R = 22
const V_GAP = 58
const H_GAP = 8
const PADDING = 40

const C = {
  bg:           { light: '#f8fafc', dark: '#111827' },
  edge:         { light: '#cbd5e1', dark: '#374151' },
  edgePath:     '#f59e0b',
  redNode:      { fill: '#fca5a5', border: '#dc2626', fillDark: '#7f1d1d', borderDark: '#ef4444' },
  blackNode:    { fill: '#334155', border: '#1e293b', fillDark: '#0f172a', borderDark: '#475569' },
  nodeActive:   { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  nodeInserted: { fill: '#dcfce7', border: '#16a34a' },
  nodeDeleted:  { fill: '#fee2e2', border: '#dc2626' },
  nodeRotate:   { fill: '#ede9fe', border: '#7c3aed' },
  nodeRecolor:  { fill: '#fef3c7', border: '#d97706' },
  glow:         'rgba(59,130,246,0.45)',
  glowInsert:   'rgba(34,197,94,0.55)',
  glowDelete:   'rgba(239,68,68,0.55)',
  glowRotate:   'rgba(124,58,237,0.55)',
  glowRecolor:  'rgba(217,119,6,0.55)',
  textWhite:    '#ffffff',
  textLight:    '#f1f5f9',
  textMain:     { light: '#1e293b', dark: '#f1f5f9' },
  textSub:      { light: '#64748b', dark: '#94a3b8' },
}

interface LayoutNode { id: number; x: number; y: number }

function computeLayout(nodes: Map<number, RBNode>, root: number | null): Map<number, LayoutNode> {
  if (root === null || nodes.size === 0) return new Map()

  const order: number[] = []
  function inOrder(id: number | null): void {
    if (id === null) return
    const node = nodes.get(id)
    if (!node) return
    inOrder(node.left)
    order.push(id)
    inOrder(node.right)
  }
  inOrder(root)

  const rankMap = new Map<number, number>()
  order.forEach((id, i) => rankMap.set(id, i))

  const unitW = NODE_R * 2 + H_GAP
  const layout = new Map<number, LayoutNode>()

  for (const [id, node] of nodes) {
    const rank = rankMap.get(id) ?? 0
    layout.set(id, {
      id,
      x: PADDING + NODE_R + rank * unitW,
      y: PADDING + NODE_R + node.depth * (NODE_R * 2 + V_GAP),
    })
  }

  return layout
}

function treeCanvasSize(nodes: Map<number, RBNode>): { w: number; h: number } {
  if (nodes.size === 0) return { w: 400, h: 200 }
  let maxDepth = 0
  for (const node of nodes.values()) if (node.depth > maxDepth) maxDepth = node.depth
  const unitW = NODE_R * 2 + H_GAP
  return {
    w: PADDING * 2 + nodes.size * unitW,
    h: PADDING * 2 + (maxDepth + 1) * (NODE_R * 2 + V_GAP),
  }
}

export default function RedBlackTreeCanvas2D({
  nodes, root, activeNodeId, visitedNodeIds, highlightPath,
  insertedNodeId, deletedNodeId, rotatingNodeId, recoloringNodeId,
  width = 700, height = 400,
}: RedBlackTreeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const layout = useMemo(() => computeLayout(nodes, root), [nodes, root])
  const highlightSet = useMemo(() => new Set(highlightPath), [highlightPath])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w: treeW, h: treeH } = treeCanvasSize(nodes)
    const logicalW = Math.max(width, treeW)
    const logicalH = Math.max(height, treeH)

    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (root === null || nodes.size === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Red-Black Tree will appear here', logicalW / 2, logicalH / 2)
      return
    }

    // Edges
    for (const [id, node] of nodes) {
      const pPos = layout.get(id)
      if (!pPos) continue
      for (const childId of [node.left, node.right]) {
        if (childId === null) continue
        const cPos = layout.get(childId)
        if (!cPos) continue
        const isHighlighted = highlightSet.has(id) && highlightSet.has(childId)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pPos.x, pPos.y + NODE_R)
        const midY = (pPos.y + NODE_R + cPos.y - NODE_R) / 2
        ctx.bezierCurveTo(pPos.x, midY, cPos.x, midY, cPos.x, cPos.y - NODE_R)
        ctx.strokeStyle = isHighlighted ? C.edgePath : (isDark ? C.edge.dark : C.edge.light)
        ctx.lineWidth = isHighlighted ? 2.5 : 1.5
        ctx.stroke()
        ctx.restore()
      }
    }

    // Nodes
    for (const [id, node] of nodes) {
      const pos = layout.get(id)
      if (!pos) continue

      const isActive = id === activeNodeId
      const isInserted = id === insertedNodeId
      const isDeleted = id === deletedNodeId
      const isRotating = id === rotatingNodeId
      const isRecoloring = id === recoloringNodeId
      const isOnPath = highlightSet.has(id)

      let fill: string, border: string, borderWidth = 1.5
      let textColor = C.textWhite
      let glowColor: string | null = null

      if (isActive) {
        fill = C.nodeActive.fill; border = C.nodeActive.border
        borderWidth = 2.5; textColor = C.nodeActive.text; glowColor = C.glow
      } else if (isRotating) {
        fill = C.nodeRotate.fill; border = C.nodeRotate.border
        borderWidth = 2.5; glowColor = C.glowRotate; textColor = isDark ? C.textLight : '#1e293b'
      } else if (isRecoloring) {
        fill = C.nodeRecolor.fill; border = C.nodeRecolor.border
        borderWidth = 2.5; glowColor = C.glowRecolor; textColor = '#1e293b'
      } else if (isInserted) {
        fill = C.nodeInserted.fill; border = C.nodeInserted.border
        borderWidth = 2.5; glowColor = C.glowInsert; textColor = '#1e293b'
      } else if (isDeleted) {
        fill = C.nodeDeleted.fill; border = C.nodeDeleted.border
        borderWidth = 2.5; glowColor = C.glowDelete; textColor = '#1e293b'
      } else if (isOnPath) {
        fill = isDark ? '#422006' : '#fef9c3'; border = '#f59e0b'; borderWidth = 2; textColor = isDark ? C.textLight : '#1e293b'
      } else if (node.color === 'red') {
        fill = isDark ? C.redNode.fillDark : C.redNode.fill
        border = isDark ? C.redNode.borderDark : C.redNode.border
        textColor = C.textWhite
      } else {
        fill = isDark ? C.blackNode.fillDark : C.blackNode.fill
        border = isDark ? C.blackNode.borderDark : C.blackNode.border
        textColor = C.textWhite
      }

      ctx.save()
      if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 18 }
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()
      ctx.strokeStyle = border; ctx.lineWidth = borderWidth; ctx.stroke()
      ctx.shadowBlur = 0

      // Value text
      ctx.font = `bold ${node.value >= 100 ? '11' : '13'}px system-ui`
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(node.value), pos.x, pos.y)
      ctx.restore()

      // Color badge (R/B) above-right
      if (!isActive && !isInserted && !isDeleted && !isRotating && !isRecoloring) {
        const badgeX = pos.x + NODE_R + 2
        const badgeY = pos.y - NODE_R + 2
        ctx.save()
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, 8, 0, Math.PI * 2)
        ctx.fillStyle = node.color === 'red' ? '#dc2626' : '#1e293b'
        ctx.fill()
        ctx.font = 'bold 9px system-ui'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.color === 'red' ? 'R' : 'B', badgeX, badgeY)
        ctx.restore()
      }

      // Strikethrough for deleted
      if (isDeleted) {
        ctx.save()
        ctx.strokeStyle = C.nodeDeleted.border; ctx.lineWidth = 2; ctx.globalAlpha = 0.8
        ctx.beginPath(); ctx.moveTo(pos.x - NODE_R + 5, pos.y); ctx.lineTo(pos.x + NODE_R - 5, pos.y); ctx.stroke()
        ctx.restore()
      }
    }
  }, [nodes, root, layout, activeNodeId, visitedNodeIds, highlightSet, insertedNodeId, deletedNodeId, rotatingNodeId, recoloringNodeId, width, height, isDark])

  const { w: treeW, h: treeH } = treeCanvasSize(nodes)
  const displayW = Math.max(width, treeW)
  const displayH = Math.max(height, treeH)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: displayW, height: displayH }}
      className="rounded-xl"
    />
  )
}
