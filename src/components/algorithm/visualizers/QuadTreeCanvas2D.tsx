'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type QuadTreeNode, type Point, type Boundary } from '@/utils/algorithm/quadTree'

interface QuadTreeCanvas2DProps {
  nodes: Map<number, QuadTreeNode>
  points: Point[]
  activeNodeId: number | null
  highlightedNodes: Set<number>
  skippedNodes: Set<number>
  foundPoints: Set<number>
  /** top-left origin rectangle: x, y are top-left corner, w/h are full dimensions */
  searchArea: { x: number; y: number; w: number; h: number } | null
  insertingPoint: Point | null
  width?: number
  height?: number
  onCanvasClick?: (x: number, y: number) => void
}

// ── Color palette ─────────────────────────────────────────────────────────────

const C = {
  // Boundary lines
  boundary:         '#d1d5db',   // gray-300
  boundaryDark:     '#4b5563',   // gray-600
  boundaryWidth:    0.8,

  // Active node
  activeStroke:     '#3b82f6',   // blue-500
  activeFill:       'rgba(59,130,246,0.07)',
  activeWidth:      2.5,

  // Highlighted (search-check) node
  highlightFill:    'rgba(251,191,36,0.18)',  // amber-400 tint
  highlightStroke:  '#f59e0b',               // amber-500

  // Skipped node
  skippedFill:      'rgba(239,68,68,0.08)',   // red-500 tint
  skippedStroke:    '#ef4444',               // red-500

  // Search area rectangle
  searchFill:       'rgba(16,185,129,0.12)', // emerald-500 tint
  searchStroke:     '#10b981',              // emerald-500

  // Points
  pointDefault:     '#3b82f6',   // blue-500
  pointFound:       '#10b981',   // emerald-500
  pointInserting:   '#fbbf24',   // amber-400

  // Background
  bg:               '#f9fafb',   // gray-50
  bgDark:           '#111827',   // gray-900
} as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuadTreeCanvas2D({
  nodes,
  points,
  activeNodeId,
  highlightedNodes,
  skippedNodes,
  foundPoints,
  searchArea,
  insertingPoint,
  width = 600,
  height = 500,
  onCanvasClick,
}: QuadTreeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // ── Dark mode observer ────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // ── Coordinate mapping helpers ────────────────────────────────────────────
  // The QuadTree root boundary is center-origin (x,y = center, w/h = half-extents).
  // We map that space to the full canvas area with padding.

  const PADDING = 20

  /** Convert QuadTree world-space → canvas pixel (memoised per size/root) */
  const toCanvas = useCallback(
    (wx: number, wy: number, rootBoundary: Boundary): { px: number; py: number } => {
      const minX = rootBoundary.x - rootBoundary.w
      const maxX = rootBoundary.x + rootBoundary.w
      const minY = rootBoundary.y - rootBoundary.h
      const maxY = rootBoundary.y + rootBoundary.h
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1
      const drawW = width - PADDING * 2
      const drawH = height - PADDING * 2
      return {
        px: PADDING + ((wx - minX) / rangeX) * drawW,
        py: PADDING + ((wy - minY) / rangeY) * drawH,
      }
    },
    [width, height]
  )

  /** Convert canvas pixel → QuadTree world-space */
  const toWorld = useCallback(
    (px: number, py: number, rootBoundary: Boundary): { wx: number; wy: number } => {
      const minX = rootBoundary.x - rootBoundary.w
      const maxX = rootBoundary.x + rootBoundary.w
      const minY = rootBoundary.y - rootBoundary.h
      const maxY = rootBoundary.y + rootBoundary.h
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1
      const drawW = width - PADDING * 2
      const drawH = height - PADDING * 2
      return {
        wx: minX + ((px - PADDING) / drawW) * rangeX,
        wy: minY + ((py - PADDING) / drawH) * rangeY,
      }
    },
    [width, height]
  )

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onCanvasClick) return
      const canvas = canvasRef.current
      if (!canvas) return
      const root = nodes.get(0)
      if (!root) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const px = (e.clientX - rect.left) * scaleX
      const py = (e.clientY - rect.top) * scaleY
      const { wx, wy } = toWorld(px, py, root.boundary)
      onCanvasClick(wx, wy)
    },
    [onCanvasClick, nodes, width, height, toWorld]
  )

  // ── Draw ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = isDark ? C.bgDark : C.bg
    ctx.fillRect(0, 0, width, height)

    const root = nodes.get(0)
    if (!root) return

    const rb = root.boundary

    // ── Helper: draw a boundary rect in world-space ──────────────────────
    function drawBoundary(b: Boundary, strokeStyle: string, lineWidth: number, fillStyle?: string) {
      if (!ctx) return
      const tl = toCanvas(b.x - b.w, b.y - b.h, rb)
      const br = toCanvas(b.x + b.w, b.y + b.h, rb)
      const w2 = br.px - tl.px
      const h2 = br.py - tl.py

      if (fillStyle) {
        ctx.fillStyle = fillStyle
        ctx.fillRect(tl.px, tl.py, w2, h2)
      }
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth = lineWidth
      ctx.strokeRect(tl.px, tl.py, w2, h2)
    }

    // ── Recursive boundary drawing pass ──────────────────────────────────
    function drawNode(nodeId: number) {
      if (!ctx) return
      const node = nodes.get(nodeId)
      if (!node) return

      const isActive      = nodeId === activeNodeId
      const isHighlighted = highlightedNodes.has(nodeId)
      const isSkipped     = skippedNodes.has(nodeId)

      if (isActive) {
        drawBoundary(node.boundary, C.activeStroke, C.activeWidth, C.activeFill)
      } else if (isHighlighted) {
        drawBoundary(node.boundary, C.highlightStroke, 1.5, C.highlightFill)
      } else if (isSkipped) {
        // Dashed red boundary for skipped nodes
        ctx.save()
        ctx.setLineDash([4, 3])
        drawBoundary(node.boundary, C.skippedStroke, 1, C.skippedFill)
        ctx.setLineDash([])
        ctx.restore()
      } else {
        // Default thin gray boundary
        const boundaryColor = isDark ? C.boundaryDark : C.boundary
        drawBoundary(node.boundary, boundaryColor, C.boundaryWidth)
      }

      // Recurse into children
      if (node.divided) {
        const { ne, nw, se, sw } = node.children
        const childIds = [ne, nw, se, sw].filter((id): id is number => id !== null)
        for (const cid of childIds) {
          drawNode(cid)
        }
      }
    }

    drawNode(0)

    // ── Search area rectangle (top-left origin: x, y, w, h) ──────────────
    if (searchArea) {
      // searchArea uses top-left + full dimensions; convert to canvas pixels directly
      const tl = toCanvas(searchArea.x, searchArea.y, rb)
      const br = toCanvas(searchArea.x + searchArea.w, searchArea.y + searchArea.h, rb)
      ctx.save()
      ctx.fillStyle = C.searchFill
      ctx.fillRect(tl.px, tl.py, br.px - tl.px, br.py - tl.py)
      ctx.strokeStyle = C.searchStroke
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 3])
      ctx.strokeRect(tl.px, tl.py, br.px - tl.px, br.py - tl.py)
      ctx.setLineDash([])
      ctx.restore()
    }

    // ── Points ────────────────────────────────────────────────────────────
    for (const pt of points) {
      const { px, py } = toCanvas(pt.x, pt.y, rb)
      const isFound     = foundPoints.has(pt.id)
      const isInserting = insertingPoint?.id === pt.id

      let radius = 5
      let color: string = C.pointDefault

      if (isFound) {
        radius = 7
        color  = C.pointFound
      } else if (isInserting) {
        radius = 7
        color  = C.pointInserting
      }

      // Glow for found/inserting
      if (isFound || isInserting) {
        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur  = 10
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.restore()

        // Outer ring
        ctx.beginPath()
        ctx.arc(px, py, radius + 3, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth   = 1.5
        ctx.globalAlpha = 0.4
        ctx.stroke()
        ctx.globalAlpha = 1
      } else {
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        // White border
        ctx.strokeStyle = isDark ? '#374151' : '#ffffff'
        ctx.lineWidth   = 1
        ctx.stroke()
      }
    }

    // ── Inserting point (if not yet in points array) ──────────────────────
    if (insertingPoint && !points.find(p => p.id === insertingPoint.id)) {
      const { px, py } = toCanvas(insertingPoint.x, insertingPoint.y, rb)
      ctx.save()
      ctx.shadowColor = C.pointInserting
      ctx.shadowBlur  = 14
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      ctx.fillStyle = C.pointInserting
      ctx.fill()
      ctx.restore()

      // Pulse ring
      ctx.beginPath()
      ctx.arc(px, py, 10, 0, Math.PI * 2)
      ctx.strokeStyle = C.pointInserting
      ctx.lineWidth   = 1.5
      ctx.globalAlpha = 0.35
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [
    nodes, points, activeNodeId, highlightedNodes, skippedNodes,
    foundPoints, searchArea, insertingPoint,
    width, height, isDark, toCanvas,
  ])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className={`rounded-xl ${onCanvasClick ? 'cursor-crosshair' : 'cursor-default'}`}
      onClick={handleClick}
    />
  )
}
