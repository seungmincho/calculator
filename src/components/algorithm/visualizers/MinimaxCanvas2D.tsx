'use client'
import { useRef, useEffect, useState } from 'react'
import { type MinimaxNode } from '@/utils/algorithm/minimax'

interface MinimaxCanvas2DProps {
  nodes: Map<number, MinimaxNode>
  activeNodeId: number | null
  visitedNodeIds: Set<number>
  prunedNodeIds: Set<number>
  bestPath: number[]
  width?: number
  height?: number
}

// ── Layout constants ─────────────────────────────────────────────────────────
const NODE_W = 54
const NODE_H = 40
const H_GAP = 12   // horizontal gap between sibling slots
const V_GAP = 60   // vertical gap between depth levels
const PADDING = 36 // canvas edge padding
const LEVEL_LABEL_H = 16 // height reserved above each row for MAX/MIN label

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  bg:            { light: '#f8fafc', dark: '#111827' },
  edge:          { light: '#cbd5e1', dark: '#374151' },
  edgeBest:      '#22c55e',
  edgePruned:    '#ef4444',
  nodeMax:       { light: '#fef3c7', dark: '#451a03', border: '#d97706' },
  nodeMin:       { light: '#dbeafe', dark: '#0c1f3f', border: '#3b82f6' },
  nodeActive:    { fill: '#3b82f6', border: '#1d4ed8' },
  nodeLeafPos:   { fill: '#dcfce7', border: '#16a34a' },
  nodeLeafNeg:   { fill: '#fee2e2', border: '#dc2626' },
  nodeLeafDraw:  { fill: '#f3f4f6', border: '#6b7280' },
  nodePruned:    { light: '#e5e7eb', dark: '#1f2937', border: '#6b7280' },
  bestBorder:    '#22c55e',
  textMain:      { light: '#111827', dark: '#f9fafb' },
  textSub:       { light: '#6b7280', dark: '#9ca3af' },
  glow:          'rgba(59,130,246,0.45)',
  scissors:      '#ef4444',
}

// ── Layout computation ───────────────────────────────────────────────────────

interface LayoutNode {
  id: number
  x: number  // center-x in canvas logical pixels
  y: number  // center-y in canvas logical pixels
}

/**
 * Assigns x/y positions to every node in the tree.
 * Strategy:
 *   1. Post-order: count leaf slots in each subtree.
 *   2. Pre-order: walk subtrees left-to-right, centering each parent over children.
 */
function computeLayout(
  nodes: Map<number, MinimaxNode>,
): Map<number, LayoutNode> {
  if (nodes.size === 0) return new Map()

  const unitW = NODE_W + H_GAP

  // Step 1 — measure subtree width in leaf-slot units
  const slotWidth = new Map<number, number>()
  function measureSlots(id: number): number {
    const node = nodes.get(id)
    if (!node) return 1
    if (node.children.length === 0) {
      slotWidth.set(id, 1)
      return 1
    }
    const w = node.children.reduce((s, cid) => s + measureSlots(cid), 0)
    slotWidth.set(id, w)
    return w
  }
  measureSlots(0)

  // Step 2 — assign positions
  const layout = new Map<number, LayoutNode>()
  function assign(id: number, leftSlot: number) {
    const node = nodes.get(id)
    if (!node) return
    const sw = slotWidth.get(id) ?? 1
    const x = PADDING + (leftSlot + sw / 2) * unitW
    const y = PADDING + LEVEL_LABEL_H + node.depth * (NODE_H + V_GAP) + NODE_H / 2
    layout.set(id, { id, x, y })

    let childLeft = leftSlot
    for (const cid of node.children) {
      const cw = slotWidth.get(cid) ?? 1
      assign(cid, childLeft)
      childLeft += cw
    }
  }
  assign(0, 0)

  return layout
}

/** Canvas logical size needed to contain the whole tree. */
function treeCanvasSize(nodes: Map<number, MinimaxNode>): { w: number; h: number } {
  if (nodes.size === 0) return { w: 400, h: 200 }

  let maxDepth = 0
  let leafCount = 0
  for (const node of nodes.values()) {
    if (node.depth > maxDepth) maxDepth = node.depth
    if (node.children.length === 0) leafCount++
  }

  const unitW = NODE_W + H_GAP
  const w = PADDING * 2 + Math.max(1, leafCount) * unitW
  const h = PADDING * 2 + LEVEL_LABEL_H + (maxDepth + 1) * (NODE_H + V_GAP)
  return { w, h }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MinimaxCanvas2D({
  nodes,
  activeNodeId,
  visitedNodeIds,
  prunedNodeIds,
  bestPath,
  width = 800,
  height = 500,
}: MinimaxCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Dark mode detection via MutationObserver
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Main draw effect
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
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (nodes.size === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('게임 트리가 여기에 표시됩니다', logicalW / 2, logicalH / 2)
      return
    }

    const layout = computeLayout(nodes)
    const bestPathSet = new Set(bestPath)

    // ── 1. Depth-level MAX/MIN labels ────────────────────────────────────
    const seenDepths = new Set<number>()
    for (const node of nodes.values()) {
      if (seenDepths.has(node.depth)) continue
      seenDepths.add(node.depth)
      const isMax = node.depth % 2 === 0
      const labelY = PADDING + node.depth * (NODE_H + V_GAP) + LEVEL_LABEL_H / 2
      ctx.save()
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isMax ? C.nodeMax.border : C.nodeMin.border
      ctx.fillText(isMax ? 'MAX' : 'MIN', 6, labelY)
      ctx.restore()
    }

    // ── 2. Edges ─────────────────────────────────────────────────────────
    for (const [id, node] of nodes) {
      const pPos = layout.get(id)
      if (!pPos) continue

      for (const childId of node.children) {
        const cPos = layout.get(childId)
        if (!cPos) continue

        const childNode = nodes.get(childId)
        const isPruned = childNode?.pruned ?? prunedNodeIds.has(childId)
        const isBestEdge = bestPathSet.has(id) && bestPathSet.has(childId)

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pPos.x, pPos.y + NODE_H / 2)

        // Smooth bezier curve
        const midY = (pPos.y + NODE_H / 2 + cPos.y - NODE_H / 2) / 2
        ctx.bezierCurveTo(pPos.x, midY, cPos.x, midY, cPos.x, cPos.y - NODE_H / 2)

        if (isPruned) {
          ctx.strokeStyle = C.edgePruned
          ctx.lineWidth = 1.5
          ctx.setLineDash([5, 4])
          ctx.globalAlpha = 0.45
        } else if (isBestEdge) {
          ctx.strokeStyle = C.edgeBest
          ctx.lineWidth = 2.5
          ctx.setLineDash([])
        } else {
          ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
        }
        ctx.stroke()

        // Scissors symbol on pruned edges
        if (isPruned) {
          ctx.setLineDash([])
          ctx.globalAlpha = 0.85
          const scx = (pPos.x + cPos.x) / 2
          const scy = midY
          ctx.font = '13px system-ui'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = C.scissors
          ctx.fillText('✂', scx, scy)
        }
        ctx.restore()
      }
    }

    // ── 3. Nodes ─────────────────────────────────────────────────────────
    for (const [id, node] of nodes) {
      const pos = layout.get(id)
      if (!pos) continue

      const nx = pos.x - NODE_W / 2
      const ny = pos.y - NODE_H / 2

      const isActive   = id === activeNodeId
      const isVisited  = visitedNodeIds.has(id)
      const isPruned   = node.pruned || prunedNodeIds.has(id)
      const isOnBest   = bestPathSet.has(id)
      const isMax      = node.depth % 2 === 0

      // Derive fill / border
      let fill: string
      let border: string
      let borderWidth = 1.5

      if (isActive) {
        fill = C.nodeActive.fill
        border = C.nodeActive.border
        borderWidth = 2.5
      } else if (isPruned) {
        fill = isDark ? C.nodePruned.dark : C.nodePruned.light
        border = C.nodePruned.border
      } else if (node.isTerminal && isVisited && node.score !== null) {
        if (node.score > 0) {
          fill = C.nodeLeafPos.fill; border = C.nodeLeafPos.border
        } else if (node.score < 0) {
          fill = C.nodeLeafNeg.fill; border = C.nodeLeafNeg.border
        } else {
          fill = C.nodeLeafDraw.fill; border = C.nodeLeafDraw.border
        }
        if (isOnBest) { border = C.bestBorder; borderWidth = 2.5 }
      } else if (isMax) {
        fill = isDark ? C.nodeMax.dark : C.nodeMax.light
        border = isOnBest ? C.bestBorder : C.nodeMax.border
        if (isOnBest) borderWidth = 2.5
      } else {
        fill = isDark ? C.nodeMin.dark : C.nodeMin.light
        border = isOnBest ? C.bestBorder : C.nodeMin.border
        if (isOnBest) borderWidth = 2.5
      }

      ctx.save()

      // Glow for active node
      if (isActive) {
        ctx.shadowColor = C.glow
        ctx.shadowBlur = 20
      }

      // Opacity for pruned
      if (isPruned) ctx.globalAlpha = 0.5

      // Border dashed for pruned
      if (isPruned) ctx.setLineDash([4, 3])

      // Draw rounded rect
      ctx.fillStyle = fill
      roundRect(ctx, nx, ny, NODE_W, NODE_H, 7)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.strokeStyle = border
      ctx.lineWidth = borderWidth
      roundRect(ctx, nx, ny, NODE_W, NODE_H, 7)
      ctx.stroke()

      ctx.setLineDash([])

      // ── Score / placeholder text ─────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const scoreText =
        node.score !== null
          ? String(node.score)
          : isVisited
          ? '?'
          : ''

      if (scoreText !== '') {
        ctx.font = 'bold 14px system-ui'
        ctx.fillStyle = isActive
          ? '#ffffff'
          : isDark ? C.textMain.dark : C.textMain.light
        ctx.fillText(scoreText, pos.x, node.move !== null ? pos.y - 4 : pos.y)
      }

      // ── Move indicator (cell index played) ──────────────────────────
      if (node.move !== null && node.depth > 0) {
        ctx.font = '10px system-ui'
        ctx.fillStyle = isActive
          ? 'rgba(255,255,255,0.75)'
          : isDark ? C.textSub.dark : C.textSub.light
        ctx.fillText(`[${node.move}]`, pos.x, pos.y + 11)
      }

      ctx.restore()

      // Strikethrough on pruned nodes
      if (isPruned) {
        ctx.save()
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = C.nodePruned.border
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(nx + 7, pos.y)
        ctx.lineTo(nx + NODE_W - 7, pos.y)
        ctx.stroke()
        ctx.restore()
      }
    }

    // ── 4. Mini tic-tac-toe board for active node ─────────────────────
    if (activeNodeId !== null) {
      const activeNode = nodes.get(activeNodeId)
      const aPos = layout.get(activeNodeId)
      if (activeNode && aPos) {
        const CELL = 10
        const BOARD = CELL * 3
        const bx = aPos.x - BOARD / 2
        const by = aPos.y + NODE_H / 2 + 6

        ctx.save()

        // Board background
        ctx.fillStyle = isDark ? '#1f2937' : '#ffffff'
        ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
        ctx.lineWidth = 1
        roundRect(ctx, bx - 2, by - 2, BOARD + 4, BOARD + 4, 3)
        ctx.fill()
        ctx.stroke()

        // Cells
        for (let i = 0; i < 9; i++) {
          const col = i % 3
          const row = Math.floor(i / 3)
          const cx = bx + col * CELL
          const cy = by + row * CELL
          const cell = activeNode.board[i]

          ctx.fillStyle = isDark ? '#374151' : '#f9fafb'
          ctx.fillRect(cx, cy, CELL - 1, CELL - 1)

          if (cell === 'X') {
            ctx.strokeStyle = '#f59e0b'
            ctx.lineWidth = 1.5
            const p = 2
            ctx.beginPath()
            ctx.moveTo(cx + p, cy + p)
            ctx.lineTo(cx + CELL - 1 - p, cy + CELL - 1 - p)
            ctx.moveTo(cx + CELL - 1 - p, cy + p)
            ctx.lineTo(cx + p, cy + CELL - 1 - p)
            ctx.stroke()
          } else if (cell === 'O') {
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 1.5
            const mid = CELL / 2 - 0.5
            ctx.beginPath()
            ctx.arc(cx + mid, cy + mid, mid - 2, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        // Grid lines
        ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
        ctx.lineWidth = 0.5
        for (let i = 1; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(bx + i * CELL, by)
          ctx.lineTo(bx + i * CELL, by + BOARD)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(bx, by + i * CELL)
          ctx.lineTo(bx + BOARD, by + i * CELL)
          ctx.stroke()
        }

        ctx.restore()
      }
    }
  }, [nodes, activeNodeId, visitedNodeIds, prunedNodeIds, bestPath, width, height, isDark])

  // CSS display size tracks the logical canvas size
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
