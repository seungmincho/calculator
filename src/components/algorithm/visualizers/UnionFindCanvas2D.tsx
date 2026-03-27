'use client'
import { useRef, useEffect, useState } from 'react'

interface UnionFindCanvas2DProps {
  nodeCount: number
  parent: number[]
  rank: number[]
  highlightNodes: number[]
  highlightEdge: [number, number] | null
  width?: number
  height?: number
}

const GROUP_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function findRoot(parent: number[], x: number): number {
  while (parent[x] !== x) x = parent[x]
  return x
}

interface TreeLayout {
  x: number
  y: number
  children: number[]
}

function computeTreeLayout(
  parent: number[],
  n: number,
  width: number,
  height: number
): TreeLayout[] {
  const layout: TreeLayout[] = Array.from({ length: n }, () => ({ x: 0, y: 0, children: [] }))

  // Build children lists
  const roots: number[] = []
  for (let i = 0; i < n; i++) {
    if (parent[i] === i) {
      roots.push(i)
    } else {
      layout[parent[i]].children.push(i)
    }
  }

  // Compute subtree sizes for positioning
  const subtreeSize = Array(n).fill(1)
  const computeSize = (node: number): number => {
    let size = 1
    for (const child of layout[node].children) {
      size += computeSize(child)
    }
    subtreeSize[node] = size
    return size
  }
  for (const r of roots) computeSize(r)

  // Layout each tree
  const padding = 40
  const usableWidth = width - padding * 2
  const totalSize = roots.reduce((sum, r) => sum + subtreeSize[r], 0)
  const gap = roots.length > 1 ? 20 : 0
  const totalGap = gap * (roots.length - 1)

  let offsetX = padding

  for (const root of roots) {
    const treeWidth = ((subtreeSize[root] / totalSize) * (usableWidth - totalGap))

    const layoutTree = (node: number, left: number, right: number, depth: number) => {
      const mid = (left + right) / 2
      layout[node].x = mid
      layout[node].y = padding + depth * 60

      const children = layout[node].children
      if (children.length === 0) return

      const childTotal = children.reduce((s, c) => s + subtreeSize[c], 0)
      let childLeft = left
      for (const child of children) {
        const childWidth = (subtreeSize[child] / childTotal) * (right - left)
        layoutTree(child, childLeft, childLeft + childWidth, depth + 1)
        childLeft += childWidth
      }
    }

    layoutTree(root, offsetX, offsetX + treeWidth, 0)
    offsetX += treeWidth + gap
  }

  return layout
}

export default function UnionFindCanvas2D({
  nodeCount, parent, rank, highlightNodes, highlightEdge,
  width = 600, height = 420,
}: UnionFindCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

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

    const layout = computeTreeLayout(parent, nodeCount, width, height)
    const highlightSet = new Set(highlightNodes)

    // Determine group colors
    const groupMap = new Map<number, number>()
    let gIdx = 0
    for (let i = 0; i < nodeCount; i++) {
      const root = findRoot(parent, i)
      if (!groupMap.has(root)) groupMap.set(root, gIdx++)
    }

    // Draw edges (parent links)
    for (let i = 0; i < nodeCount; i++) {
      if (parent[i] === i) continue

      const child = layout[i]
      const par = layout[parent[i]]

      const isHighlightEdge = highlightEdge &&
        ((highlightEdge[0] === i && highlightEdge[1] === parent[i]) ||
         (highlightEdge[1] === i && highlightEdge[0] === parent[i]))

      ctx.beginPath()
      ctx.moveTo(child.x, child.y - 16)
      ctx.lineTo(par.x, par.y + 16)

      if (isHighlightEdge) {
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 3
      } else {
        ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
        ctx.lineWidth = 2
      }
      ctx.stroke()

      // Arrow pointing up to parent
      const dx = par.x - child.x
      const dy = (par.y + 16) - (child.y - 16)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const nx = dx / dist
        const ny = dy / dist
        const ax = par.x - nx * 16
        const ay = par.y + 16 - ny * 16
        ctx.beginPath()
        ctx.moveTo(par.x - nx * 2, par.y + 16 - ny * 2)
        ctx.lineTo(ax - 5 * ny, ay + 5 * nx)
        ctx.lineTo(ax + 5 * ny, ay - 5 * nx)
        ctx.closePath()
        ctx.fillStyle = isHighlightEdge ? '#f59e0b' : (isDark ? '#4b5563' : '#d1d5db')
        ctx.fill()
      }
    }

    // Draw nodes
    for (let i = 0; i < nodeCount; i++) {
      const pos = layout[i]
      const root = findRoot(parent, i)
      const color = GROUP_COLORS[(groupMap.get(root) ?? 0) % GROUP_COLORS.length]
      const isHighlighted = highlightSet.has(i)
      const isRoot = parent[i] === i

      // Glow for highlighted nodes
      if (isHighlighted) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2)
        ctx.fillStyle = isDark ? 'rgba(251,191,36,0.2)' : 'rgba(245,158,11,0.15)'
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      if (isRoot) {
        ctx.strokeStyle = isDark ? '#fbbf24' : '#f59e0b'
        ctx.lineWidth = 3
      } else {
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
        ctx.lineWidth = 2
      }
      ctx.stroke()

      // Node label
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i), pos.x, pos.y)

      // Rank badge for roots
      if (isRoot && rank[i] > 0) {
        const bx = pos.x + 14
        const by = pos.y - 14
        ctx.beginPath()
        ctx.arc(bx, by, 8, 0, Math.PI * 2)
        ctx.fillStyle = isDark ? '#374151' : '#f3f4f6'
        ctx.fill()
        ctx.fillStyle = isDark ? '#d1d5db' : '#374151'
        ctx.font = 'bold 9px system-ui'
        ctx.fillText(`r${rank[i]}`, bx, by)
      }
    }
  }, [nodeCount, parent, rank, highlightNodes, highlightEdge, isDark, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-default"
    />
  )
}
