'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type AABB, type AABBResult, getAABBBounds } from '@/utils/algorithm/aabb'

interface AABBCanvas2DProps {
  boxA: AABB
  boxB: AABB
  onBoxAChange: (box: AABB) => void
  onBoxBChange: (box: AABB) => void
  currentStep: number
  aabbResult: AABBResult | null
  width?: number
  height?: number
}

interface Vec2 {
  x: number
  y: number
}

const COLORS = {
  polyA: '#3b82f6',      // blue-500
  polyAFill: 'rgba(59, 130, 246, 0.15)',
  polyB: '#f59e0b',      // amber-500
  polyBFill: 'rgba(245, 158, 11, 0.15)',
  gap: '#10b981',        // emerald-500
  overlap: '#ef4444',    // red-500
  grid: '#e5e7eb',       // gray-200
  gridDark: '#374151',   // gray-700
}

const PROJ_BAR_HEIGHT = 8
const PROJ_MARGIN_BOTTOM = 30
const PROJ_MARGIN_LEFT = 20

export default function AABBCanvas2D({
  boxA, boxB,
  onBoxAChange, onBoxBChange,
  currentStep, aabbResult,
  width = 600, height = 450,
}: AABBCanvas2DProps) {
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

  // Get canvas-relative coords (accounting for DPR)
  const getCanvasPos = useCallback((e: { clientX: number; clientY: number }): Vec2 => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    }
  }, [width, height])

  // Point-in-AABB test
  const pointInAABB = useCallback((point: Vec2, box: AABB): boolean => {
    const bounds = getAABBBounds(box)
    return point.x >= bounds.minX && point.x <= bounds.maxX &&
           point.y >= bounds.minY && point.y <= bounds.maxY
  }, [])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e.nativeEvent)
    if (pointInAABB(pos, boxB)) {
      setDragging('B')
      setDragOffset({ x: boxB.x - pos.x, y: boxB.y - pos.y })
    } else if (pointInAABB(pos, boxA)) {
      setDragging('A')
      setDragOffset({ x: boxA.x - pos.x, y: boxA.y - pos.y })
    }
  }, [boxA, boxB, getCanvasPos, pointInAABB])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const pos = getCanvasPos(e.nativeEvent)
    const newX = pos.x + dragOffset.x
    const newY = pos.y + dragOffset.y
    if (dragging === 'A') onBoxAChange({ ...boxA, x: newX, y: newY })
    else onBoxBChange({ ...boxB, x: newX, y: newY })
  }, [dragging, dragOffset, boxA, boxB, onBoxAChange, onBoxBChange, getCanvasPos])

  const handleMouseUp = useCallback(() => setDragging(null), [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const pos = getCanvasPos(e.touches[0])
    if (pointInAABB(pos, boxB)) {
      setDragging('B')
      setDragOffset({ x: boxB.x - pos.x, y: boxB.y - pos.y })
    } else if (pointInAABB(pos, boxA)) {
      setDragging('A')
      setDragOffset({ x: boxA.x - pos.x, y: boxA.y - pos.y })
    }
  }, [boxA, boxB, getCanvasPos, pointInAABB])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return
    e.preventDefault()
    const pos = getCanvasPos(e.touches[0])
    const newX = pos.x + dragOffset.x
    const newY = pos.y + dragOffset.y
    if (dragging === 'A') onBoxAChange({ ...boxA, x: newX, y: newY })
    else onBoxBChange({ ...boxB, x: newX, y: newY })
  }, [dragging, dragOffset, boxA, boxB, onBoxAChange, onBoxBChange, getCanvasPos])

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

    const boundsA = getAABBBounds(boxA)
    const boundsB = getAABBBounds(boxB)

    // Draw active axis guide lines
    if (aabbResult && aabbResult.steps.length > 0) {
      const activeStep = aabbResult.steps[currentStep] ?? aabbResult.steps[aabbResult.steps.length - 1]

      if (activeStep) {
        ctx.save()
        ctx.strokeStyle = activeStep.isSeparating ? COLORS.gap : COLORS.overlap
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.globalAlpha = 0.4

        if (activeStep.axis === 'x') {
          // Horizontal guide lines at box tops/bottoms
          ctx.beginPath()
          ctx.moveTo(0, boundsA.minY)
          ctx.lineTo(width, boundsA.minY)
          ctx.moveTo(0, boundsA.maxY)
          ctx.lineTo(width, boundsA.maxY)
          ctx.moveTo(0, boundsB.minY)
          ctx.lineTo(width, boundsB.minY)
          ctx.moveTo(0, boundsB.maxY)
          ctx.lineTo(width, boundsB.maxY)
          ctx.stroke()
        } else {
          // Vertical guide lines at box lefts/rights
          ctx.beginPath()
          ctx.moveTo(boundsA.minX, 0)
          ctx.lineTo(boundsA.minX, height)
          ctx.moveTo(boundsA.maxX, 0)
          ctx.lineTo(boundsA.maxX, height)
          ctx.moveTo(boundsB.minX, 0)
          ctx.lineTo(boundsB.minX, height)
          ctx.moveTo(boundsB.maxX, 0)
          ctx.lineTo(boundsB.maxX, height)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    // Draw rectangles
    const drawBox = (box: AABB, strokeColor: string, fillColor: string) => {
      const b = getAABBBounds(box)
      ctx.fillStyle = fillColor
      ctx.fillRect(b.minX, b.minY, box.width, box.height)
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 2
      ctx.strokeRect(b.minX, b.minY, box.width, box.height)

      // Corner dots
      ctx.fillStyle = strokeColor
      const corners = [
        { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
        { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY },
      ]
      for (const c of corners) {
        ctx.beginPath()
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    drawBox(boxA, COLORS.polyA, COLORS.polyAFill)
    drawBox(boxB, COLORS.polyB, COLORS.polyBFill)

    // Labels
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = COLORS.polyA
    ctx.fillText('A', boxA.x, boxA.y)
    ctx.fillStyle = COLORS.polyB
    ctx.fillText('B', boxB.x, boxB.y)

    // ── Projection bars ──
    if (aabbResult && aabbResult.steps.length > 0) {
      // X-axis projection (bottom)
      const showX = currentStep >= 0
      if (showX) {
        const stepX = aabbResult.steps[0]
        const yBase = height - PROJ_MARGIN_BOTTOM

        // A's X range
        ctx.fillStyle = COLORS.polyA
        ctx.globalAlpha = 0.5
        ctx.fillRect(stepX.rangeA.min, yBase, stepX.rangeA.max - stepX.rangeA.min, PROJ_BAR_HEIGHT)
        ctx.globalAlpha = 1

        // B's X range
        ctx.fillStyle = COLORS.polyB
        ctx.globalAlpha = 0.5
        ctx.fillRect(stepX.rangeB.min, yBase + PROJ_BAR_HEIGHT + 2, stepX.rangeB.max - stepX.rangeB.min, PROJ_BAR_HEIGHT)
        ctx.globalAlpha = 1

        // Overlap/gap indicator
        const overlapStart = Math.max(stepX.rangeA.min, stepX.rangeB.min)
        const overlapEnd = Math.min(stepX.rangeA.max, stepX.rangeB.max)
        if (stepX.overlap > 0) {
          ctx.fillStyle = COLORS.overlap
          ctx.globalAlpha = 0.3
          ctx.fillRect(overlapStart, yBase - 2, overlapEnd - overlapStart, PROJ_BAR_HEIGHT * 2 + 6)
          ctx.globalAlpha = 1
        } else {
          // Draw gap region
          ctx.strokeStyle = COLORS.gap
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          const gapStart = Math.min(stepX.rangeA.max, stepX.rangeB.max)
          const gapEnd = Math.max(stepX.rangeA.min, stepX.rangeB.min)
          ctx.strokeRect(gapStart, yBase - 2, gapEnd - gapStart, PROJ_BAR_HEIGHT * 2 + 6)
          ctx.setLineDash([])
        }

        // X label
        ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
        ctx.font = '10px system-ui'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText('X', 4, yBase)
      }

      // Y-axis projection (left side)
      const showY = currentStep >= 1
      if (showY) {
        const stepY = aabbResult.steps[1]
        const xBase = PROJ_MARGIN_LEFT - PROJ_BAR_HEIGHT * 2 - 2

        // A's Y range
        ctx.fillStyle = COLORS.polyA
        ctx.globalAlpha = 0.5
        ctx.fillRect(xBase, stepY.rangeA.min, PROJ_BAR_HEIGHT, stepY.rangeA.max - stepY.rangeA.min)
        ctx.globalAlpha = 1

        // B's Y range
        ctx.fillStyle = COLORS.polyB
        ctx.globalAlpha = 0.5
        ctx.fillRect(xBase + PROJ_BAR_HEIGHT + 2, stepY.rangeB.min, PROJ_BAR_HEIGHT, stepY.rangeB.max - stepY.rangeB.min)
        ctx.globalAlpha = 1

        // Overlap/gap indicator
        const overlapStart = Math.max(stepY.rangeA.min, stepY.rangeB.min)
        const overlapEnd = Math.min(stepY.rangeA.max, stepY.rangeB.max)
        if (stepY.overlap > 0) {
          ctx.fillStyle = COLORS.overlap
          ctx.globalAlpha = 0.3
          ctx.fillRect(xBase - 2, overlapStart, PROJ_BAR_HEIGHT * 2 + 6, overlapEnd - overlapStart)
          ctx.globalAlpha = 1
        } else {
          ctx.strokeStyle = COLORS.gap
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          const gapStart = Math.min(stepY.rangeA.max, stepY.rangeB.max)
          const gapEnd = Math.max(stepY.rangeA.min, stepY.rangeB.min)
          ctx.strokeRect(xBase - 2, gapStart, PROJ_BAR_HEIGHT * 2 + 6, gapEnd - gapStart)
          ctx.setLineDash([])
        }

        // Y label
        ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
        ctx.font = '10px system-ui'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText('Y', xBase, stepY.rangeA.min - 4)
      }
    }

    // Collision glow effect on final step
    if (aabbResult && currentStep >= 1) {
      ctx.save()
      if (aabbResult.colliding) {
        ctx.shadowColor = COLORS.overlap
        ctx.shadowBlur = 20
        ctx.strokeStyle = COLORS.overlap
        ctx.lineWidth = 3

        const bA = getAABBBounds(boxA)
        ctx.strokeRect(bA.minX, bA.minY, boxA.width, boxA.height)

        const bB = getAABBBounds(boxB)
        ctx.strokeRect(bB.minX, bB.minY, boxB.width, boxB.height)
      }
      ctx.restore()
    }

  }, [boxA, boxB, currentStep, aabbResult, width, height, isDark])

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
