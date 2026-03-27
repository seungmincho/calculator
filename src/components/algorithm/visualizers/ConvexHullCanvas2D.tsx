'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import type { Point } from '@/utils/algorithm/convexHull'

interface ConvexHullCanvas2DProps {
  points: Point[]
  stack: number[]
  currentIndex: number | null
  comparing: [number, number, number] | null
  action: string
  width?: number
  height?: number
  onAddPoint?: (x: number, y: number) => void
  onDragPoint?: (id: number, x: number, y: number) => void
}

const COLORS = {
  point: '#60a5fa',
  pointDark: '#3b82f6',
  hullEdge: '#34d399',
  hullEdgeDark: '#10b981',
  current: '#fbbf24',
  comparing: '#f87171',
  stackPoint: '#a78bfa',
  text: '#374151',
  textDark: '#d1d5db',
  pivotColor: '#f97316',
}

export default function ConvexHullCanvas2D({
  points,
  stack,
  currentIndex,
  comparing,
  action,
  width = 600,
  height = 420,
  onAddPoint,
  onDragPoint,
}: ConvexHullCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)

  // Dark mode observer
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    }
  }, [width, height])

  const findNearestPoint = useCallback((x: number, y: number): number | null => {
    let nearest: number | null = null
    let minDist = 15
    for (const p of points) {
      const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
      if (d < minDist) { minDist = d; nearest = p.id }
    }
    return nearest
  }, [points])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e)
    if (!coords) return
    const nearest = findNearestPoint(coords.x, coords.y)
    if (nearest !== null) {
      setDragging(nearest)
    }
  }, [getCanvasCoords, findNearestPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging === null || !onDragPoint) return
    const coords = getCanvasCoords(e)
    if (coords) onDragPoint(dragging, coords.x, coords.y)
  }, [dragging, getCanvasCoords, onDragPoint])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragging !== null) {
      setDragging(null)
      return
    }
    if (!onAddPoint) return
    const coords = getCanvasCoords(e)
    if (coords) onAddPoint(coords.x, coords.y)
  }, [dragging, getCanvasCoords, onAddPoint])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const coords = getCanvasCoords(e)
    if (!coords) return
    const nearest = findNearestPoint(coords.x, coords.y)
    if (nearest !== null) setDragging(nearest)
  }, [getCanvasCoords, findNearestPoint])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragging === null || !onDragPoint) return
    const coords = getCanvasCoords(e)
    if (coords) onDragPoint(dragging, coords.x, coords.y)
  }, [dragging, getCanvasCoords, onDragPoint])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (dragging !== null) {
      setDragging(null)
      return
    }
    if (!onAddPoint) return
    const coords = getCanvasCoords(e)
    if (coords) onAddPoint(coords.x, coords.y)
  }, [dragging, getCanvasCoords, onAddPoint])

  // Draw
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

    if (points.length === 0) return

    const stackSet = new Set(stack)
    const currentSet = currentIndex !== null ? new Set([currentIndex]) : new Set<number>()
    const comparingSet = comparing ? new Set(comparing) : new Set<number>()

    // Draw hull edges
    if (stack.length >= 2) {
      ctx.save()
      ctx.strokeStyle = isDark ? COLORS.hullEdgeDark : COLORS.hullEdge
      ctx.lineWidth = 2.5
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(points[stack[0]].x, points[stack[0]].y)
      for (let i = 1; i < stack.length; i++) {
        ctx.lineTo(points[stack[i]].x, points[stack[i]].y)
      }
      if (action === 'done') {
        ctx.closePath()
      }
      ctx.stroke()

      // Fill hull polygon with transparency
      if (action === 'done') {
        ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(52, 211, 153, 0.1)'
        ctx.fill()
      }
      ctx.restore()
    }

    // Draw line from stack top to current point being checked
    if (currentIndex !== null && stack.length > 0) {
      const topIdx = stack[stack.length - 1]
      ctx.save()
      ctx.strokeStyle = COLORS.current
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(points[topIdx].x, points[topIdx].y)
      ctx.lineTo(points[currentIndex].x, points[currentIndex].y)
      ctx.stroke()
      ctx.restore()
    }

    // Draw comparing triangle
    if (comparing) {
      const [a, b, c] = comparing
      ctx.save()
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(points[a].x, points[a].y)
      ctx.lineTo(points[b].x, points[b].y)
      ctx.lineTo(points[c].x, points[c].y)
      ctx.closePath()
      ctx.stroke()
      ctx.fillStyle = 'rgba(248, 113, 113, 0.08)'
      ctx.fill()
      ctx.restore()
    }

    // Draw points
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      let fillColor = isDark ? COLORS.pointDark : COLORS.point
      let radius = 5
      let glow = false

      if (i === 0 && action !== 'done') {
        fillColor = COLORS.pivotColor
        radius = 7
        glow = true
      } else if (comparingSet.has(i)) {
        fillColor = COLORS.comparing
        radius = 6
        glow = true
      } else if (currentSet.has(i)) {
        fillColor = COLORS.current
        radius = 6
        glow = true
      } else if (stackSet.has(i)) {
        fillColor = COLORS.stackPoint
        radius = 6
      }

      ctx.save()
      if (glow) {
        ctx.shadowColor = fillColor
        ctx.shadowBlur = 10
      }
      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Label
      ctx.save()
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = isDark ? COLORS.textDark : COLORS.text
      ctx.fillText(String(i), p.x, p.y - radius - 2)
      ctx.restore()
    }
  }, [points, stack, currentIndex, comparing, action, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  )
}
