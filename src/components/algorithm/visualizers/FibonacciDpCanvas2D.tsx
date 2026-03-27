'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { type FibTreeNode, type FibMode } from '@/utils/algorithm/fibonacciDp'

export interface FibonacciDpCanvas2DProps {
  mode: FibMode
  treeNodes: Map<number, FibTreeNode>
  dpTable: number[]
  activeNodeId: number         // current step nodeId
  visitedNodeIds: Set<number>
  width?: number
  height?: number
}

const NODE_R = 16
const V_GAP = 40
const H_GAP = 6
const PADDING = 30
const CELL_W = 50
const CELL_H = 40

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  nodeDefault:{ fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  nodeActive: { fill: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  nodeVisited:{ fill: { light: '#cffafe', dark: '#164e63' }, border: '#0891b2' },
  nodePruned: { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  nodeBase:   { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  edge:       { light: '#cbd5e1', dark: '#374151' },
  cellDefault:{ fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  cellActive: { fill: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  cellFilled: { fill: { light: '#cffafe', dark: '#164e63' }, border: '#0891b2' },
}

function computeTreeLayout(nodes: Map<number, FibTreeNode>): Map<number, { x: number; y: number }> {
  if (nodes.size === 0) return new Map()

  const layout = new Map<number, { x: number; y: number }>()
  const widths = new Map<number, number>()

  function calcWidth(id: number): number {
    const node = nodes.get(id)
    if (!node) return 1
    let w = 0
    if (node.left !== null) w += calcWidth(node.left)
    if (node.right !== null) w += calcWidth(node.right)
    w = Math.max(w, 1)
    widths.set(id, w)
    return w
  }

  // Find root (id=0)
  calcWidth(0)

  function assign(id: number, x: number, y: number): void {
    const node = nodes.get(id)
    if (!node) return
    layout.set(id, { x, y })

    const totalW = widths.get(id) ?? 1
    const leftW = node.left !== null ? (widths.get(node.left) ?? 1) : 0
    const unitW = (NODE_R * 2 + H_GAP)

    if (node.left !== null) {
      assign(node.left, x - (totalW - leftW) * unitW / 2, y + V_GAP + NODE_R * 2)
    }
    if (node.right !== null) {
      const rightShift = leftW > 0 ? leftW : 0
      assign(node.right, x + (totalW - rightShift) * unitW / 2, y + V_GAP + NODE_R * 2)
    }
  }

  const totalWidth = (widths.get(0) ?? 1) * (NODE_R * 2 + H_GAP)
  assign(0, PADDING + totalWidth / 2, PADDING + NODE_R)

  return layout
}

export default function FibonacciDpCanvas2D({
  mode, treeNodes, dpTable, activeNodeId, visitedNodeIds,
  width = 700, height = 400,
}: FibonacciDpCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const treeLayout = useMemo(() => computeTreeLayout(treeNodes), [treeNodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1

    if (mode === 'tabulation') {
      // ── Tabulation: draw DP table ──
      const cols = dpTable.length
      const logicalW = Math.max(width, PADDING * 2 + cols * CELL_W)
      const logicalH = Math.max(200, PADDING * 2 + CELL_H * 3)
      canvas.width = logicalW * dpr
      canvas.height = logicalH * dpr
      canvas.style.width = `${logicalW}px`
      canvas.style.height = `${logicalH}px`
      ctx.scale(dpr, dpr)

      ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
      ctx.fillRect(0, 0, logicalW, logicalH)

      // Header row (index)
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < cols; i++) {
        const x = PADDING + i * CELL_W
        const y = PADDING

        ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
        ctx.fillText(`n=${i}`, x + CELL_W / 2, y + CELL_H / 2)
      }

      // Value row
      for (let i = 0; i < cols; i++) {
        const x = PADDING + i * CELL_W
        const y = PADDING + CELL_H

        const isActive = activeNodeId === i
        const isVisited = visitedNodeIds.has(i)

        let fill: string, border: string, textColor: string
        if (isActive) {
          fill = C.cellActive.fill; border = C.cellActive.border; textColor = C.cellActive.text
        } else if (isVisited) {
          fill = isDark ? C.cellFilled.fill.dark : C.cellFilled.fill.light
          border = C.cellFilled.border
          textColor = isDark ? C.text.dark : C.text.light
        } else {
          fill = isDark ? C.cellDefault.fill.dark : C.cellDefault.fill.light
          border = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
          textColor = isDark ? C.text.dark : C.text.light
        }

        ctx.fillStyle = fill
        ctx.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2)
        ctx.strokeStyle = border
        ctx.lineWidth = isActive ? 2.5 : 1
        ctx.strokeRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2)

        if (isVisited || isActive) {
          ctx.font = 'bold 14px system-ui'
          ctx.fillStyle = textColor
          ctx.fillText(String(dpTable[i] ?? ''), x + CELL_W / 2, y + CELL_H / 2)
        }
      }

      // Arrow indicators for use-prev
      ctx.font = '10px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText('dp[i] = dp[i-1] + dp[i-2]', logicalW / 2, PADDING + CELL_H * 2 + 20)

    } else {
      // ── Tree mode (naive / memoization) ──
      if (treeNodes.size === 0) {
        const logicalW = width
        const logicalH = height
        canvas.width = logicalW * dpr
        canvas.height = logicalH * dpr
        canvas.style.width = `${logicalW}px`
        canvas.style.height = `${logicalH}px`
        ctx.scale(dpr, dpr)
        ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
        ctx.fillRect(0, 0, logicalW, logicalH)
        ctx.font = '14px system-ui'
        ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Start to see the call tree', logicalW / 2, logicalH / 2)
        return
      }

      // Compute bounds from layout
      let minX = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const pos of treeLayout.values()) {
        if (pos.x - NODE_R < minX) minX = pos.x - NODE_R
        if (pos.x + NODE_R > maxX) maxX = pos.x + NODE_R
        if (pos.y + NODE_R > maxY) maxY = pos.y + NODE_R
      }

      const logicalW = Math.max(width, maxX + PADDING)
      const logicalH = Math.max(height, maxY + PADDING)
      canvas.width = logicalW * dpr
      canvas.height = logicalH * dpr
      canvas.style.width = `${logicalW}px`
      canvas.style.height = `${logicalH}px`
      ctx.scale(dpr, dpr)

      ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
      ctx.fillRect(0, 0, logicalW, logicalH)

      // Draw edges
      for (const [id, node] of treeNodes) {
        const pPos = treeLayout.get(id)
        if (!pPos) continue
        for (const childId of [node.left, node.right]) {
          if (childId === null) continue
          const cPos = treeLayout.get(childId)
          if (!cPos) continue
          ctx.beginPath()
          ctx.moveTo(pPos.x, pPos.y + NODE_R)
          ctx.lineTo(cPos.x, cPos.y - NODE_R)
          ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const [id, node] of treeNodes) {
        const pos = treeLayout.get(id)
        if (!pos) continue

        const isActive = id === activeNodeId
        const isVisited = visitedNodeIds.has(id)
        const isPruned = node.pruned
        const isBase = (node.n <= 1 && node.value !== null)

        let fill: string, border: string, textColor: string

        if (isActive) {
          fill = C.nodeActive.fill; border = C.nodeActive.border; textColor = C.nodeActive.text
        } else if (isPruned) {
          fill = isDark ? C.nodePruned.fill.dark : C.nodePruned.fill.light
          border = C.nodePruned.border; textColor = isDark ? C.text.dark : C.text.light
        } else if (isBase && isVisited) {
          fill = isDark ? C.nodeBase.fill.dark : C.nodeBase.fill.light
          border = C.nodeBase.border; textColor = isDark ? C.text.dark : C.text.light
        } else if (isVisited) {
          fill = isDark ? C.nodeVisited.fill.dark : C.nodeVisited.fill.light
          border = C.nodeVisited.border; textColor = isDark ? C.text.dark : C.text.light
        } else {
          fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
          border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
          textColor = isDark ? C.text.dark : C.text.light
        }

        if (isActive) {
          ctx.save()
          ctx.shadowColor = 'rgba(6,182,212,0.5)'
          ctx.shadowBlur = 14
        }

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.strokeStyle = border
        ctx.lineWidth = isActive ? 2.5 : 1.5
        ctx.stroke()

        if (isActive) ctx.restore()

        // Label: f(n)
        ctx.font = 'bold 11px system-ui'
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`f(${node.n})`, pos.x, pos.y - 2)

        // Value below if computed
        if (node.value !== null && isVisited) {
          ctx.font = '9px system-ui'
          ctx.fillStyle = textColor
          ctx.fillText(`=${node.value}`, pos.x, pos.y + 10)
        }

        // Pruned indicator
        if (isPruned) {
          ctx.font = '8px system-ui'
          ctx.fillStyle = C.nodePruned.border
          ctx.fillText('memo', pos.x, pos.y + NODE_R + 10)
        }
      }
    }
  }, [mode, treeNodes, dpTable, activeNodeId, visitedNodeIds, width, height, isDark, treeLayout])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl"
    />
  )
}
