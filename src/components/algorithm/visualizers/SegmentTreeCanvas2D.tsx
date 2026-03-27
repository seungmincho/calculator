'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { getTreeNodes, type TreeNodeInfo } from '@/utils/algorithm/segmentTree'

export interface SegmentTreeCanvas2DProps {
  tree: number[]
  n: number
  activeNodeIndex: number | null
  visitedNodeIndices: Set<number>
  matchedNodeIndices: Set<number>
  skippedNodeIndices: Set<number>
  updatedNodeIndices: Set<number>
  queryRangeL?: number
  queryRangeR?: number
  width?: number
  height?: number
}

const NODE_W = 56
const NODE_H = 32
const V_GAP = 38
const PADDING = 30

const C = {
  bg:          { light: '#f8fafc', dark: '#111827' },
  edge:        { light: '#cbd5e1', dark: '#374151' },
  edgeActive:  '#3b82f6',
  nodeDefault: { fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  nodeActive:  { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  nodeVisited: { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  nodeMatched: { fill: '#dcfce7', border: '#16a34a' },
  nodeSkipped: { fill: { light: '#fee2e2', dark: '#3b1010' }, border: '#ef4444' },
  nodeUpdated: { fill: '#ede9fe', border: '#7c3aed' },
  queryRange:  { fill: 'rgba(59,130,246,0.08)', border: '#3b82f6' },
  textMain:    { light: '#1e293b', dark: '#f1f5f9' },
  textSub:     { light: '#64748b', dark: '#94a3b8' },
  glow:        'rgba(59,130,246,0.45)',
  glowMatch:   'rgba(34,197,94,0.55)',
  glowUpdate:  'rgba(124,58,237,0.55)',
}

interface LayoutNode extends TreeNodeInfo { x: number; y: number }

function computeLayout(nodes: TreeNodeInfo[], maxDepth: number): Map<number, LayoutNode> {
  if (nodes.length === 0) return new Map()

  // Group by depth
  const byDepth = new Map<number, TreeNodeInfo[]>()
  for (const n of nodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, [])
    byDepth.get(n.depth)!.push(n)
  }

  // Position leaves first, then compute parent positions
  const layout = new Map<number, LayoutNode>()
  const leafNodes = nodes.filter(n => n.leftChild === null && n.rightChild === null)
  const leafGap = NODE_W + 8
  const totalLeafWidth = leafNodes.length * leafGap

  // Assign x positions to leaves
  leafNodes.forEach((leaf, i) => {
    layout.set(leaf.index, {
      ...leaf,
      x: PADDING + i * leafGap + leafGap / 2,
      y: PADDING + NODE_H / 2 + maxDepth * (NODE_H + V_GAP),
    })
  })

  // Bottom-up: parent x = average of children x
  for (let d = maxDepth - 1; d >= 0; d--) {
    const nodesAtDepth = byDepth.get(d) || []
    for (const n of nodesAtDepth) {
      if (layout.has(n.index)) continue
      const leftPos = n.leftChild ? layout.get(n.leftChild) : null
      const rightPos = n.rightChild ? layout.get(n.rightChild) : null

      let x: number
      if (leftPos && rightPos) x = (leftPos.x + rightPos.x) / 2
      else if (leftPos) x = leftPos.x
      else if (rightPos) x = rightPos.x
      else x = PADDING + totalLeafWidth / 2

      layout.set(n.index, {
        ...n,
        x,
        y: PADDING + NODE_H / 2 + d * (NODE_H + V_GAP),
      })
    }
  }

  return layout
}

function canvasSize(nodes: TreeNodeInfo[], maxDepth: number): { w: number; h: number } {
  const leafCount = nodes.filter(n => n.leftChild === null && n.rightChild === null).length
  const leafGap = NODE_W + 8
  return {
    w: PADDING * 2 + Math.max(leafCount * leafGap, 300),
    h: PADDING * 2 + (maxDepth + 1) * (NODE_H + V_GAP),
  }
}

export default function SegmentTreeCanvas2D({
  tree, n, activeNodeIndex, visitedNodeIndices, matchedNodeIndices,
  skippedNodeIndices, updatedNodeIndices, queryRangeL, queryRangeR,
  width = 700, height = 400,
}: SegmentTreeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const treeNodes = useMemo(() => getTreeNodes(tree, n), [tree, n])
  const maxDepth = useMemo(() => {
    let max = 0
    for (const nd of treeNodes) if (nd.depth > max) max = nd.depth
    return max
  }, [treeNodes])
  const layout = useMemo(() => computeLayout(treeNodes, maxDepth), [treeNodes, maxDepth])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w: treeW, h: treeH } = canvasSize(treeNodes, maxDepth)
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

    if (treeNodes.length === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Segment Tree will appear here', logicalW / 2, logicalH / 2)
      return
    }

    // Draw edges
    for (const node of treeNodes) {
      const pPos = layout.get(node.index)
      if (!pPos) continue
      for (const childIdx of [node.leftChild, node.rightChild]) {
        if (childIdx === null) continue
        const cPos = layout.get(childIdx)
        if (!cPos) continue

        const isOnPath = visitedNodeIndices.has(node.index) && visitedNodeIndices.has(childIdx)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pPos.x, pPos.y + NODE_H / 2)
        ctx.lineTo(cPos.x, cPos.y - NODE_H / 2)
        ctx.strokeStyle = isOnPath ? C.edgeActive : (isDark ? C.edge.dark : C.edge.light)
        ctx.lineWidth = isOnPath ? 2 : 1.2
        ctx.stroke()
        ctx.restore()
      }
    }

    // Draw nodes
    for (const node of treeNodes) {
      const pos = layout.get(node.index)
      if (!pos) continue

      const isActive = node.index === activeNodeIndex
      const isMatched = matchedNodeIndices.has(node.index)
      const isSkipped = skippedNodeIndices.has(node.index)
      const isUpdated = updatedNodeIndices.has(node.index)
      const isVisited = visitedNodeIndices.has(node.index)

      let fill: string, border: string, borderWidth = 1.2
      let textColor = isDark ? C.textMain.dark : C.textMain.light
      let glowColor: string | null = null

      if (isActive) {
        fill = C.nodeActive.fill; border = C.nodeActive.border
        borderWidth = 2.5; textColor = C.nodeActive.text; glowColor = C.glow
      } else if (isMatched) {
        fill = C.nodeMatched.fill; border = C.nodeMatched.border
        borderWidth = 2; glowColor = C.glowMatch
      } else if (isUpdated) {
        fill = C.nodeUpdated.fill; border = C.nodeUpdated.border
        borderWidth = 2; glowColor = C.glowUpdate
      } else if (isSkipped) {
        fill = isDark ? C.nodeSkipped.fill.dark : C.nodeSkipped.fill.light
        border = C.nodeSkipped.border; borderWidth = 1.5
      } else if (isVisited) {
        fill = isDark ? C.nodeVisited.fill.dark : C.nodeVisited.fill.light
        border = C.nodeVisited.border; borderWidth = 1.5
      } else {
        fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
        border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
      }

      const x = pos.x - NODE_W / 2
      const y = pos.y - NODE_H / 2

      ctx.save()
      if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 14 }

      // Rounded rect
      const r = 6
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + NODE_W - r, y)
      ctx.quadraticCurveTo(x + NODE_W, y, x + NODE_W, y + r)
      ctx.lineTo(x + NODE_W, y + NODE_H - r)
      ctx.quadraticCurveTo(x + NODE_W, y + NODE_H, x + NODE_W - r, y + NODE_H)
      ctx.lineTo(x + r, y + NODE_H)
      ctx.quadraticCurveTo(x, y + NODE_H, x, y + NODE_H - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.fillStyle = fill; ctx.fill()
      ctx.strokeStyle = border; ctx.lineWidth = borderWidth; ctx.stroke()
      ctx.shadowBlur = 0

      // Value
      ctx.font = `bold 12px system-ui`
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(node.value), pos.x, pos.y - 3)

      // Range label below value
      ctx.font = '9px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(`[${node.rangeL},${node.rangeR}]`, pos.x, pos.y + 10)

      ctx.restore()
    }

    // Draw query range indicator at bottom
    if (queryRangeL !== undefined && queryRangeR !== undefined) {
      const leafNodes = treeNodes.filter(nd => nd.leftChild === null && nd.rightChild === null)
      const leftLeaf = leafNodes.find(nd => nd.rangeL === queryRangeL)
      const rightLeaf = leafNodes.find(nd => nd.rangeR === queryRangeR)
      if (leftLeaf && rightLeaf) {
        const lPos = layout.get(leftLeaf.index)
        const rPos = layout.get(rightLeaf.index)
        if (lPos && rPos) {
          const qx = lPos.x - NODE_W / 2 - 4
          const qw = rPos.x + NODE_W / 2 + 4 - qx
          const qy = logicalH - 20
          ctx.save()
          ctx.fillStyle = C.queryRange.fill
          ctx.fillRect(qx, qy - 8, qw, 16)
          ctx.strokeStyle = C.queryRange.border
          ctx.lineWidth = 1.5
          ctx.strokeRect(qx, qy - 8, qw, 16)
          ctx.font = 'bold 10px system-ui'
          ctx.fillStyle = C.queryRange.border
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`Query [${queryRangeL}, ${queryRangeR}]`, qx + qw / 2, qy)
          ctx.restore()
        }
      }
    }
  }, [tree, n, treeNodes, maxDepth, layout, activeNodeIndex, visitedNodeIndices,
    matchedNodeIndices, skippedNodeIndices, updatedNodeIndices, queryRangeL, queryRangeR,
    width, height, isDark])

  const { w: treeW, h: treeH } = canvasSize(treeNodes, maxDepth)
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
