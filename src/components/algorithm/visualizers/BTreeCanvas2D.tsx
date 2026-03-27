'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { type BTreeNode } from '@/utils/algorithm/bTree'

export interface BTreeCanvas2DProps {
  nodes: Map<number, BTreeNode>
  root: number | null
  activeNodeId: number | null
  activeKeyIndex: number | null
  visitedNodeIds: Set<number>
  foundNodeId: number | null
  foundKeyIndex: number | null
  splittingNodeId: number | null
  promotingNodeId: number | null
  width?: number
  height?: number
}

const KEY_W = 36
const KEY_H = 30
const KEY_GAP = 2
const V_GAP = 50
const H_GAP = 20
const PADDING = 40

const C = {
  bg:            { light: '#f8fafc', dark: '#111827' },
  edge:          { light: '#cbd5e1', dark: '#374151' },
  edgePath:      '#f59e0b',
  nodeBg:        { light: '#f1f5f9', dark: '#1e293b' },
  nodeBorder:    { light: '#94a3b8', dark: '#475569' },
  keyDefault:    { fill: { light: '#e2e8f0', dark: '#334155' }, border: { light: '#94a3b8', dark: '#475569' } },
  keyActive:     { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  keyFound:      { fill: '#10b981', border: '#059669', text: '#ffffff' },
  keySplitting:  { fill: '#f59e0b', border: '#d97706', text: '#ffffff' },
  keyPromoting:  { fill: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
  keyVisited:    { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  glow:          'rgba(59,130,246,0.45)',
  glowFound:     'rgba(16,185,129,0.55)',
  glowSplit:     'rgba(245,158,11,0.55)',
  textMain:      { light: '#1e293b', dark: '#f1f5f9' },
  textSub:       { light: '#64748b', dark: '#94a3b8' },
}

interface LayoutNode {
  id: number
  x: number
  y: number
  w: number
  h: number
}

function computeLayout(nodes: Map<number, BTreeNode>, root: number | null): Map<number, LayoutNode> {
  if (root === null || nodes.size === 0) return new Map()

  const layout = new Map<number, LayoutNode>()

  // Calculate width for each node
  function getNodeWidth(id: number): number {
    const node = nodes.get(id)
    if (!node) return 0
    return Math.max(1, node.keys.length) * (KEY_W + KEY_GAP) + KEY_GAP
  }

  // Calculate subtree width
  function getSubtreeWidth(id: number): number {
    const node = nodes.get(id)
    if (!node) return getNodeWidth(id)

    const nodeW = getNodeWidth(id)
    if (node.leaf || node.children.length === 0) return nodeW

    let childrenWidth = 0
    for (const childId of node.children) {
      childrenWidth += getSubtreeWidth(childId) + H_GAP
    }
    childrenWidth -= H_GAP // remove last gap

    return Math.max(nodeW, childrenWidth)
  }

  // Position nodes
  function positionNode(id: number, cx: number, depth: number): void {
    const node = nodes.get(id)
    if (!node) return

    const nw = getNodeWidth(id)
    const x = cx - nw / 2
    const y = PADDING + depth * (KEY_H + V_GAP)

    layout.set(id, { id, x, y, w: nw, h: KEY_H })

    if (!node.leaf && node.children.length > 0) {
      const subtreeWidths = node.children.map(cId => getSubtreeWidth(cId))
      const totalW = subtreeWidths.reduce((a, b) => a + b, 0) + (node.children.length - 1) * H_GAP
      let startX = cx - totalW / 2

      for (let i = 0; i < node.children.length; i++) {
        const childCx = startX + subtreeWidths[i] / 2
        positionNode(node.children[i], childCx, depth + 1)
        startX += subtreeWidths[i] + H_GAP
      }
    }
  }

  const subtreeW = getSubtreeWidth(root)
  positionNode(root, PADDING + subtreeW / 2, 0)

  return layout
}

function treeCanvasSize(nodes: Map<number, BTreeNode>, layout: Map<number, LayoutNode>): { w: number; h: number } {
  if (nodes.size === 0 || layout.size === 0) return { w: 400, h: 200 }

  let maxX = 0, maxY = 0
  for (const l of layout.values()) {
    if (l.x + l.w > maxX) maxX = l.x + l.w
    if (l.y + l.h > maxY) maxY = l.y + l.h
  }

  return { w: maxX + PADDING * 2, h: maxY + PADDING * 2 }
}

export default function BTreeCanvas2D({
  nodes, root, activeNodeId, activeKeyIndex, visitedNodeIds,
  foundNodeId, foundKeyIndex, splittingNodeId, promotingNodeId,
  width = 700, height = 400,
}: BTreeCanvas2DProps) {
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w: treeW, h: treeH } = treeCanvasSize(nodes, layout)
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
      ctx.fillText('B-Tree will appear here', logicalW / 2, logicalH / 2)
      return
    }

    // Draw edges
    for (const [id, node] of nodes) {
      const pLayout = layout.get(id)
      if (!pLayout || node.leaf) continue

      for (let i = 0; i < node.children.length; i++) {
        const childId = node.children[i]
        const cLayout = layout.get(childId)
        if (!cLayout) continue

        // Parent connection point: between keys
        let px: number
        if (i === 0) {
          px = pLayout.x + KEY_GAP / 2
        } else if (i >= node.keys.length) {
          px = pLayout.x + pLayout.w - KEY_GAP / 2
        } else {
          px = pLayout.x + KEY_GAP + i * (KEY_W + KEY_GAP)
        }
        const py = pLayout.y + KEY_H

        const cx = cLayout.x + cLayout.w / 2
        const cy = cLayout.y

        const isHighlighted = visitedNodeIds.has(id) && visitedNodeIds.has(childId)

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(cx, cy)
        ctx.strokeStyle = isHighlighted ? C.edgePath : (isDark ? C.edge.dark : C.edge.light)
        ctx.lineWidth = isHighlighted ? 2.5 : 1.5
        ctx.stroke()
        ctx.restore()
      }
    }

    // Draw nodes
    for (const [id, node] of nodes) {
      const nLayout = layout.get(id)
      if (!nLayout) continue

      const isActive = id === activeNodeId
      const isSplitting = id === splittingNodeId
      const isPromoting = id === promotingNodeId
      const isFound = id === foundNodeId
      const isVisited = visitedNodeIds.has(id)

      // Node background rectangle
      ctx.save()
      if (isSplitting) { ctx.shadowColor = C.glowSplit; ctx.shadowBlur = 14 }
      else if (isFound) { ctx.shadowColor = C.glowFound; ctx.shadowBlur = 14 }
      else if (isActive) { ctx.shadowColor = C.glow; ctx.shadowBlur = 14 }

      ctx.beginPath()
      const r = 6
      ctx.roundRect(nLayout.x, nLayout.y, nLayout.w, KEY_H, r)
      ctx.fillStyle = isDark ? C.nodeBg.dark : C.nodeBg.light
      ctx.fill()
      ctx.strokeStyle = isDark ? C.nodeBorder.dark : C.nodeBorder.light
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()

      // Draw individual keys
      for (let ki = 0; ki < node.keys.length; ki++) {
        const kx = nLayout.x + KEY_GAP + ki * (KEY_W + KEY_GAP)
        const ky = nLayout.y

        const isActiveKey = isActive && activeKeyIndex === ki
        const isFoundKey = isFound && foundKeyIndex === ki

        let fill: string, border: string, textColor: string

        if (isFoundKey) {
          fill = C.keyFound.fill; border = C.keyFound.border; textColor = C.keyFound.text
        } else if (isActiveKey) {
          fill = C.keyActive.fill; border = C.keyActive.border; textColor = C.keyActive.text
        } else if (isSplitting) {
          fill = C.keySplitting.fill; border = C.keySplitting.border; textColor = C.keySplitting.text
        } else if (isPromoting) {
          fill = C.keyPromoting.fill; border = C.keyPromoting.border; textColor = C.keyPromoting.text
        } else if (isVisited) {
          fill = isDark ? C.keyVisited.fill.dark : C.keyVisited.fill.light
          border = C.keyVisited.border
          textColor = isDark ? C.textMain.dark : C.textMain.light
        } else {
          fill = isDark ? C.keyDefault.fill.dark : C.keyDefault.fill.light
          border = isDark ? C.keyDefault.border.dark : C.keyDefault.border.light
          textColor = isDark ? C.textMain.dark : C.textMain.light
        }

        ctx.save()
        ctx.beginPath()
        ctx.roundRect(kx, ky + 2, KEY_W, KEY_H - 4, 4)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.strokeStyle = border
        ctx.lineWidth = (isActiveKey || isFoundKey) ? 2 : 1
        ctx.stroke()

        ctx.font = `bold ${node.keys[ki] >= 100 ? '10' : '12'}px system-ui`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(node.keys[ki]), kx + KEY_W / 2, ky + KEY_H / 2)
        ctx.restore()
      }
    }
  }, [nodes, root, layout, activeNodeId, activeKeyIndex, visitedNodeIds, foundNodeId, foundKeyIndex, splittingNodeId, promotingNodeId, width, height, isDark])

  const { w: treeW, h: treeH } = treeCanvasSize(nodes, layout)
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
