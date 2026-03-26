'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type Polygon, type Vec2, getWorldVertices, sub, add } from '@/utils/algorithm/geometry'
import { type SATResult } from '@/utils/algorithm/sat'

interface SATCanvas2DProps {
  polygonA: Polygon
  polygonB: Polygon
  onPolygonAChange: (p: Polygon) => void
  onPolygonBChange: (p: Polygon) => void
  currentStep: number
  satResult: SATResult | null
  width?: number
  height?: number
}

const COLORS = {
  polyA: '#3b82f6',      // blue-500
  polyAFill: 'rgba(59, 130, 246, 0.15)',
  polyB: '#f59e0b',      // amber-500
  polyBFill: 'rgba(245, 158, 11, 0.15)',
  gap: '#10b981',        // emerald-500
  overlap: '#ef4444',    // red-500
  axis: '#6b7280',       // gray-500
  grid: '#e5e7eb',       // gray-200
  gridDark: '#374151',   // gray-700
}

export default function SATCanvas2D({
  polygonA, polygonB,
  onPolygonAChange, onPolygonBChange,
  currentStep, satResult,
  width = 600, height = 450,
}: SATCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<'A' | 'B' | null>(null)
  const [dragOffset, setDragOffset] = useState<Vec2>({ x: 0, y: 0 })
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Get canvas-relative coords
  const getCanvasPos = useCallback((e: { clientX: number; clientY: number }): Vec2 => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  // Point-in-polygon test
  const pointInPolygon = useCallback((point: Vec2, polygon: Polygon): boolean => {
    const verts = getWorldVertices(polygon)
    let inside = false
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y
      const xj = verts[j].x, yj = verts[j].y
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }, [])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e.nativeEvent)
    if (pointInPolygon(pos, polygonB)) {
      setDragging('B')
      setDragOffset(sub(polygonB.position, pos))
    } else if (pointInPolygon(pos, polygonA)) {
      setDragging('A')
      setDragOffset(sub(polygonA.position, pos))
    }
  }, [polygonA, polygonB, getCanvasPos, pointInPolygon])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const pos = getCanvasPos(e.nativeEvent)
    const newPos = add(pos, dragOffset)
    if (dragging === 'A') onPolygonAChange({ ...polygonA, position: newPos })
    else onPolygonBChange({ ...polygonB, position: newPos })
  }, [dragging, dragOffset, polygonA, polygonB, onPolygonAChange, onPolygonBChange, getCanvasPos])

  const handleMouseUp = useCallback(() => setDragging(null), [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const pos = getCanvasPos(e.touches[0])
    if (pointInPolygon(pos, polygonB)) {
      setDragging('B')
      setDragOffset(sub(polygonB.position, pos))
    } else if (pointInPolygon(pos, polygonA)) {
      setDragging('A')
      setDragOffset(sub(polygonA.position, pos))
    }
  }, [polygonA, polygonB, getCanvasPos, pointInPolygon])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return
    e.preventDefault()
    const pos = getCanvasPos(e.touches[0])
    const newPos = add(pos, dragOffset)
    if (dragging === 'A') onPolygonAChange({ ...polygonA, position: newPos })
    else onPolygonBChange({ ...polygonB, position: newPos })
  }, [dragging, dragOffset, polygonA, polygonB, onPolygonAChange, onPolygonBChange, getCanvasPos])

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

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Dot grid background
    const gridColor = isDark ? COLORS.gridDark : COLORS.grid
    const gridSpacing = 20
    ctx.fillStyle = gridColor
    for (let x = 0; x < width; x += gridSpacing) {
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Current axis info
    const activeAxis = satResult?.axes[currentStep]

    // Draw axis projection line (full canvas width)
    if (activeAxis) {
      const axis = activeAxis.axis
      const centerX = width / 2
      const centerY = height / 2

      // Draw the axis line across canvas
      ctx.save()
      ctx.strokeStyle = activeAxis.isSeparating ? COLORS.gap : COLORS.overlap
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.globalAlpha = 0.5

      const len = Math.max(width, height)
      ctx.beginPath()
      ctx.moveTo(centerX - axis.x * len, centerY - axis.y * len)
      ctx.lineTo(centerX + axis.x * len, centerY + axis.y * len)
      ctx.stroke()
      ctx.restore()

      // Draw the edge that produced this axis
      ctx.save()
      ctx.strokeStyle = activeAxis.sourcePolygon === 'A' ? COLORS.polyA : COLORS.polyB
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(activeAxis.edgeStart.x, activeAxis.edgeStart.y)
      ctx.lineTo(activeAxis.edgeEnd.x, activeAxis.edgeEnd.y)
      ctx.stroke()
      ctx.restore()

      // Draw normal arrow from edge midpoint
      const midX = (activeAxis.edgeStart.x + activeAxis.edgeEnd.x) / 2
      const midY = (activeAxis.edgeStart.y + activeAxis.edgeEnd.y) / 2
      const normalLen = 30
      ctx.save()
      ctx.strokeStyle = activeAxis.isSeparating ? COLORS.gap : COLORS.overlap
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(midX, midY)
      ctx.lineTo(midX + axis.x * normalLen, midY + axis.y * normalLen)
      ctx.stroke()
      // Arrowhead
      const arrowSize = 6
      const angle = Math.atan2(axis.y, axis.x)
      ctx.beginPath()
      ctx.moveTo(midX + axis.x * normalLen, midY + axis.y * normalLen)
      ctx.lineTo(
        midX + axis.x * normalLen - arrowSize * Math.cos(angle - 0.5),
        midY + axis.y * normalLen - arrowSize * Math.sin(angle - 0.5)
      )
      ctx.moveTo(midX + axis.x * normalLen, midY + axis.y * normalLen)
      ctx.lineTo(
        midX + axis.x * normalLen - arrowSize * Math.cos(angle + 0.5),
        midY + axis.y * normalLen - arrowSize * Math.sin(angle + 0.5)
      )
      ctx.stroke()
      ctx.restore()
    }

    // Draw polygon helper
    const drawPolygon = (polygon: Polygon, strokeColor: string, fillColor: string) => {
      const verts = getWorldVertices(polygon)
      ctx.beginPath()
      ctx.moveTo(verts[0].x, verts[0].y)
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x, verts[i].y)
      }
      ctx.closePath()
      ctx.fillStyle = fillColor
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 2
      ctx.stroke()

      // Vertex dots
      ctx.fillStyle = strokeColor
      for (const v of verts) {
        ctx.beginPath()
        ctx.arc(v.x, v.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw polygons
    drawPolygon(polygonA, COLORS.polyA, COLORS.polyAFill)
    drawPolygon(polygonB, COLORS.polyB, COLORS.polyBFill)

    // Labels
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.polyA
    ctx.fillText('A', polygonA.position.x, polygonA.position.y - 5)
    ctx.fillStyle = COLORS.polyB
    ctx.fillText('B', polygonB.position.x, polygonB.position.y - 5)

    // Collision glow effect
    if (satResult && currentStep >= (satResult.axes.length - 1)) {
      ctx.save()
      if (satResult.colliding) {
        ctx.shadowColor = COLORS.overlap
        ctx.shadowBlur = 20
        const verts = getWorldVertices(polygonA)
        ctx.beginPath()
        ctx.moveTo(verts[0].x, verts[0].y)
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
        ctx.closePath()
        ctx.strokeStyle = COLORS.overlap
        ctx.lineWidth = 3
        ctx.stroke()

        const vertsB = getWorldVertices(polygonB)
        ctx.beginPath()
        ctx.moveTo(vertsB[0].x, vertsB[0].y)
        for (let i = 1; i < vertsB.length; i++) ctx.lineTo(vertsB[i].x, vertsB[i].y)
        ctx.closePath()
        ctx.stroke()
      }
      ctx.restore()
    }

  }, [polygonA, polygonB, currentStep, satResult, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setDragging(null)}
    />
  )
}
