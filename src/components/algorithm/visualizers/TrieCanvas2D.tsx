'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { type TrieNode } from '@/utils/algorithm/trie'

export interface TrieCanvas2DProps {
  nodes: Map<number, TrieNode>
  rootId: number
  activeNodeId: number
  visitedNodeIds: Set<number>
  width?: number
  height?: number
}

const NODE_R = 18
const V_GAP = 50
const H_MIN_GAP = 10
const PADDING = 40

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  nodeDefault:{ fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  nodeActive: { fill: '#ec4899', border: '#be185d', text: '#ffffff' },
  nodeVisited:{ fill: { light: '#fce7f3', dark: '#500724' }, border: '#ec4899' },
  nodeEnd:    { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  nodeRoot:   { fill: { light: '#e0e7ff', dark: '#1e1b4b' }, border: '#6366f1' },
  edge:       { light: '#cbd5e1', dark: '#374151' },
  edgeActive: '#ec4899',
  edgeLabel:  { light: '#475569', dark: '#94a3b8' },
}

interface LayoutPos { x: number; y: number }

function computeLayout(nodes: Map<number, TrieNode>, rootId: number): Map<number, LayoutPos> {
  const layout = new Map<number, LayoutPos>()
  if (nodes.size === 0) return layout

  // Compute subtree widths
  const widths = new Map<number, number>()

  function calcWidth(id: number): number {
    const node = nodes.get(id)
    if (!node || node.children.size === 0) {
      widths.set(id, 1)
      return 1
    }
    let w = 0
    const sortedChildren = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [, childId] of sortedChildren) {
      w += calcWidth(childId)
    }
    w = Math.max(w, 1)
    widths.set(id, w)
    return w
  }

  calcWidth(rootId)

  const unitW = NODE_R * 2 + H_MIN_GAP

  function assign(id: number, left: number, y: number): void {
    const node = nodes.get(id)
    if (!node) return
    const w = widths.get(id) ?? 1
    const x = left + (w * unitW) / 2
    layout.set(id, { x, y })

    const sortedChildren = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    let childLeft = left
    for (const [, childId] of sortedChildren) {
      const childW = widths.get(childId) ?? 1
      assign(childId, childLeft, y + V_GAP + NODE_R * 2)
      childLeft += childW * unitW
    }
  }

  assign(rootId, PADDING, PADDING + NODE_R)

  return layout
}

export default function TrieCanvas2D({
  nodes, rootId, activeNodeId, visitedNodeIds,
  width = 700, height = 400,
}: TrieCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const layout = useMemo(() => computeLayout(nodes, rootId), [nodes, rootId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1

    // Compute bounds
    let maxX = width, maxY = height
    for (const pos of layout.values()) {
      if (pos.x + NODE_R + PADDING > maxX) maxX = pos.x + NODE_R + PADDING
      if (pos.y + NODE_R + PADDING > maxY) maxY = pos.y + NODE_R + PADDING
    }

    const logicalW = maxX
    const logicalH = maxY
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (nodes.size === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Insert words to build the trie', logicalW / 2, logicalH / 2)
      return
    }

    // Draw edges with character labels
    for (const [id, node] of nodes) {
      const pPos = layout.get(id)
      if (!pPos) continue

      const sortedChildren = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      for (const [char, childId] of sortedChildren) {
        const cPos = layout.get(childId)
        if (!cPos) continue

        const isEdgeActive = (activeNodeId === childId || visitedNodeIds.has(childId)) && visitedNodeIds.has(id)

        ctx.beginPath()
        ctx.moveTo(pPos.x, pPos.y + NODE_R)
        ctx.lineTo(cPos.x, cPos.y - NODE_R)
        ctx.strokeStyle = isEdgeActive ? C.edgeActive : (isDark ? C.edge.dark : C.edge.light)
        ctx.lineWidth = isEdgeActive ? 2 : 1
        ctx.stroke()

        // Edge label
        const midX = (pPos.x + cPos.x) / 2
        const midY = (pPos.y + NODE_R + cPos.y - NODE_R) / 2
        ctx.font = 'bold 12px system-ui'
        ctx.fillStyle = isEdgeActive ? C.edgeActive : (isDark ? C.edgeLabel.dark : C.edgeLabel.light)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Background for label
        const labelW = ctx.measureText(char).width + 8
        ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
        ctx.fillRect(midX - labelW / 2, midY - 8, labelW, 16)
        ctx.fillStyle = isEdgeActive ? C.edgeActive : (isDark ? C.edgeLabel.dark : C.edgeLabel.light)
        ctx.fillText(char, midX, midY)
      }
    }

    // Draw nodes
    for (const [id, node] of nodes) {
      const pos = layout.get(id)
      if (!pos) continue

      const isActive = id === activeNodeId
      const isVisited = visitedNodeIds.has(id)
      const isRoot = id === rootId
      const isEnd = node.isEnd

      let fill: string, border: string, textColor: string, lw = 1.5

      if (isActive) {
        fill = C.nodeActive.fill; border = C.nodeActive.border; textColor = C.nodeActive.text; lw = 2.5
      } else if (isEnd && isVisited) {
        fill = isDark ? C.nodeEnd.fill.dark : C.nodeEnd.fill.light
        border = C.nodeEnd.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else if (isVisited) {
        fill = isDark ? C.nodeVisited.fill.dark : C.nodeVisited.fill.light
        border = C.nodeVisited.border; textColor = isDark ? C.text.dark : C.text.light
      } else if (isRoot) {
        fill = isDark ? C.nodeRoot.fill.dark : C.nodeRoot.fill.light
        border = C.nodeRoot.border; textColor = isDark ? C.text.dark : C.text.light
      } else if (isEnd) {
        fill = isDark ? C.nodeEnd.fill.dark : C.nodeEnd.fill.light
        border = C.nodeEnd.border; textColor = isDark ? C.text.dark : C.text.light
      } else {
        fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
        border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
        textColor = isDark ? C.text.dark : C.text.light
      }

      if (isActive) {
        ctx.save()
        ctx.shadowColor = 'rgba(236,72,153,0.5)'
        ctx.shadowBlur = 14
      }

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = border
      ctx.lineWidth = lw
      ctx.stroke()

      if (isActive) ctx.restore()

      // Double circle for end nodes
      if (isEnd) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, NODE_R - 4, 0, Math.PI * 2)
        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Node label
      ctx.font = isRoot ? 'bold 11px system-ui' : '11px system-ui'
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(isRoot ? 'root' : (node.char || ''), pos.x, pos.y)

      // Word label below end nodes
      if (isEnd && node.word) {
        ctx.font = '9px system-ui'
        ctx.fillStyle = C.nodeEnd.border
        ctx.fillText(node.word, pos.x, pos.y + NODE_R + 12)
      }
    }
  }, [nodes, rootId, layout, activeNodeId, visitedNodeIds, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl"
    />
  )
}
