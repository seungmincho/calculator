'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { type BSTNode } from '@/utils/algorithm/bst'

export interface BSTCanvas2DProps {
  nodes: Map<number, BSTNode>
  root: number | null
  activeNodeId: number | null
  visitedNodeIds: Set<number>
  highlightPath: number[]
  insertedNodeId: number | null
  deletedNodeId: number | null
  width?: number
  height?: number
}

// ── Layout constants ──────────────────────────────────────────────────────────
const NODE_R = 22        // circle radius
const V_GAP = 54         // vertical gap between depth levels
const H_GAP = 8          // minimum horizontal gap between nodes
const PADDING = 40       // canvas edge padding

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg:           { light: '#f8fafc', dark: '#111827' },
  edge:         { light: '#cbd5e1', dark: '#374151' },
  edgePath:     '#f59e0b',
  nodeDefault:  { fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  nodeActive:   { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  nodeVisited:  { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  nodePath:     { fill: { light: '#fef9c3', dark: '#422006' }, border: '#f59e0b' },
  nodeInserted: { fill: '#dcfce7', border: '#16a34a' },
  nodeDeleted:  { fill: '#fee2e2', border: '#dc2626' },
  nodeFound:    { fill: '#ede9fe', border: '#7c3aed' },
  glow:         'rgba(59,130,246,0.45)',
  glowInsert:   'rgba(34,197,94,0.55)',
  glowDelete:   'rgba(239,68,68,0.55)',
  glowFound:    'rgba(124,58,237,0.55)',
  textMain:     { light: '#1e293b', dark: '#f1f5f9' },
  textSub:      { light: '#64748b', dark: '#94a3b8' },
  nullIndicator:{ light: '#e2e8f0', dark: '#374151' },
}

// ── Layout computation ────────────────────────────────────────────────────────

interface LayoutNode {
  id: number
  x: number
  y: number
}

/**
 * In-order layout: assigns x based on in-order traversal rank.
 * This preserves the BST visual property (left < parent < right).
 */
function computeLayout(
  nodes: Map<number, BSTNode>,
  root: number | null,
): Map<number, LayoutNode> {
  if (root === null || nodes.size === 0) return new Map()

  // In-order traversal to assign rank
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
    const x = PADDING + NODE_R + rank * unitW
    const y = PADDING + NODE_R + node.depth * (NODE_R * 2 + V_GAP)
    layout.set(id, { id, x, y })
  }

  return layout
}

function treeCanvasSize(
  nodes: Map<number, BSTNode>,
  root: number | null,
): { w: number; h: number } {
  if (root === null || nodes.size === 0) return { w: 400, h: 200 }

  let maxDepth = 0
  for (const node of nodes.values()) {
    if (node.depth > maxDepth) maxDepth = node.depth
  }

  const unitW = NODE_R * 2 + H_GAP
  const w = PADDING * 2 + nodes.size * unitW
  const h = PADDING * 2 + (maxDepth + 1) * (NODE_R * 2 + V_GAP)
  return { w, h }
}

// ── Canvas helper ─────────────────────────────────────────────────────────────

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  fill: string, stroke: string, lineWidth: number,
) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BSTCanvas2D({
  nodes,
  root,
  activeNodeId,
  visitedNodeIds,
  highlightPath,
  insertedNodeId,
  deletedNodeId,
  width = 700,
  height = 400,
}: BSTCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Dark mode detection
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const layout = useMemo(() => computeLayout(nodes, root), [nodes, root])
  const highlightSet = useMemo(() => new Set(highlightPath), [highlightPath])

  // Main draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w: treeW, h: treeH } = treeCanvasSize(nodes, root)
    const logicalW = Math.max(width, treeW)
    const logicalH = Math.max(height, treeH)

    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (root === null || nodes.size === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('트리가 여기에 표시됩니다', logicalW / 2, logicalH / 2)
      return
    }

    // ── 1. Edges ─────────────────────────────────────────────────────────
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

        if (isHighlighted) {
          ctx.strokeStyle = C.edgePath
          ctx.lineWidth = 2.5
        } else {
          ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
          ctx.lineWidth = 1.5
        }
        ctx.stroke()
        ctx.restore()
      }
    }

    // ── 2. Nodes ─────────────────────────────────────────────────────────
    for (const [id, node] of nodes) {
      const pos = layout.get(id)
      if (!pos) continue

      const isActive    = id === activeNodeId
      const isInserted  = id === insertedNodeId
      const isDeleted   = id === deletedNodeId
      const isOnPath    = highlightSet.has(id)
      const isVisited   = visitedNodeIds.has(id)

      let fill: string
      let border: string
      let borderWidth = 1.5
      let textColor = isDark ? C.textMain.dark : C.textMain.light
      let glowColor: string | null = null

      if (isActive) {
        fill = C.nodeActive.fill
        border = C.nodeActive.border
        borderWidth = 2.5
        textColor = C.nodeActive.text
        glowColor = C.glow
      } else if (isInserted) {
        fill = C.nodeInserted.fill
        border = C.nodeInserted.border
        borderWidth = 2.5
        glowColor = C.glowInsert
      } else if (isDeleted) {
        fill = C.nodeDeleted.fill
        border = C.nodeDeleted.border
        borderWidth = 2.5
        glowColor = C.glowDelete
      } else if (isOnPath) {
        fill = isDark ? C.nodePath.fill.dark : C.nodePath.fill.light
        border = C.nodePath.border
        borderWidth = 2
      } else if (isVisited) {
        fill = isDark ? C.nodeVisited.fill.dark : C.nodeVisited.fill.light
        border = C.nodeVisited.border
        borderWidth = 1.5
      } else {
        fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
        border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
      }

      ctx.save()

      if (glowColor) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 18
      }

      drawCircle(ctx, pos.x, pos.y, NODE_R, fill, border, borderWidth)

      ctx.shadowBlur = 0

      // Value text
      ctx.font = `bold ${node.value >= 100 ? '11' : '13'}px system-ui`
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(node.value), pos.x, pos.y)

      ctx.restore()

      // Strikethrough for deleted node
      if (isDeleted) {
        ctx.save()
        ctx.strokeStyle = C.nodeDeleted.border
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.moveTo(pos.x - NODE_R + 5, pos.y)
        ctx.lineTo(pos.x + NODE_R - 5, pos.y)
        ctx.stroke()
        ctx.restore()
      }
    }
  }, [nodes, root, layout, activeNodeId, visitedNodeIds, highlightSet, insertedNodeId, deletedNodeId, width, height, isDark])

  const { w: treeW, h: treeH } = treeCanvasSize(nodes, root)
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
