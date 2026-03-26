'use client'
import { useRef, useEffect, useState } from 'react'

interface MergeSortCanvas2DProps {
  array: number[]
  range: [number, number] | null           // active sub-array range (subtle bg highlight)
  leftRange: [number, number] | null       // left half (teal tint)
  rightRange: [number, number] | null      // right half (orange tint)
  comparing: [number, number] | null       // indices being compared (yellow glow)
  placing: number | null                   // index being placed (blue glow)
  sorted: number[]                         // fully sorted indices (green)
  width?: number
  height?: number
}

const COLORS = {
  barLight: '#60a5fa',          // blue-400
  barDark: '#3b82f6',           // blue-500
  leftRange: '#5eead4',         // teal-300
  rightRange: '#fdba74',        // orange-300
  comparing: '#fbbf24',         // amber-400
  placing: '#818cf8',           // indigo-400
  sortedLight: '#34d399',       // emerald-400
  sortedDark: '#10b981',        // emerald-500
  textLight: '#374151',         // gray-700
  textDark: '#d1d5db',          // gray-300
  // Range background fills (semi-transparent drawn via rgba)
  leftRangeBgLight: 'rgba(94, 234, 212, 0.12)',   // teal-300 subtle
  leftRangeBgDark: 'rgba(94, 234, 212, 0.08)',
  rightRangeBgLight: 'rgba(253, 186, 116, 0.12)', // orange-300 subtle
  rightRangeBgDark: 'rgba(253, 186, 116, 0.08)',
  activeRangeBgLight: 'rgba(96, 165, 250, 0.06)', // blue-400 very subtle
  activeRangeBgDark: 'rgba(96, 165, 250, 0.05)',
}

const PADDING_SIDE = 20
const PADDING_TOP = 30
const PADDING_BOTTOM = 20
const BAR_GAP = 2

export default function MergeSortCanvas2D({
  array,
  range,
  leftRange,
  rightRange,
  comparing,
  placing,
  sorted,
  width = 600,
  height = 380,
}: MergeSortCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode via MutationObserver
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // HiDPI scaling
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    const n = array.length
    if (n === 0) return

    const sortedSet = new Set(sorted)
    const comparingSet = comparing ? new Set(comparing) : new Set<number>()

    const maxValue = Math.max(...array, 1)
    const drawWidth = width - PADDING_SIDE * 2
    const maxBarHeight = height - PADDING_TOP - PADDING_BOTTOM

    // barWidth * n + BAR_GAP * (n - 1) = drawWidth
    const barWidth = Math.max(4, (drawWidth - BAR_GAP * (n - 1)) / n)
    // Re-center: actual total width may differ slightly
    const totalWidth = barWidth * n + BAR_GAP * (n - 1)
    const startX = PADDING_SIDE + (drawWidth - totalWidth) / 2

    const showValues = barWidth >= 20

    // Helper: compute x bounds for an index range [lo, hi] inclusive
    const rangeX = (lo: number, hi: number) => {
      const x0 = startX + lo * (barWidth + BAR_GAP)
      const x1 = startX + hi * (barWidth + BAR_GAP) + barWidth
      return { x0, x1 }
    }

    // ── 1. Draw background range highlights (behind bars) ──

    // Active range (outermost, very subtle blue)
    if (range) {
      const [lo, hi] = range
      const { x0, x1 } = rangeX(lo, hi)
      ctx.save()
      ctx.fillStyle = isDark ? COLORS.activeRangeBgDark : COLORS.activeRangeBgLight
      ctx.beginPath()
      ctx.roundRect(x0 - 4, PADDING_TOP - 8, x1 - x0 + 8, maxBarHeight + 8, 6)
      ctx.fill()
      ctx.restore()
    }

    // Left range (teal)
    if (leftRange) {
      const [lo, hi] = leftRange
      const { x0, x1 } = rangeX(lo, hi)
      ctx.save()
      ctx.fillStyle = isDark ? COLORS.leftRangeBgDark : COLORS.leftRangeBgLight
      ctx.beginPath()
      ctx.roundRect(x0 - 2, PADDING_TOP - 4, x1 - x0 + 4, maxBarHeight + 4, 4)
      ctx.fill()
      // Thin border
      ctx.strokeStyle = isDark ? 'rgba(94,234,212,0.25)' : 'rgba(94,234,212,0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }

    // Right range (orange)
    if (rightRange) {
      const [lo, hi] = rightRange
      const { x0, x1 } = rangeX(lo, hi)
      ctx.save()
      ctx.fillStyle = isDark ? COLORS.rightRangeBgDark : COLORS.rightRangeBgLight
      ctx.beginPath()
      ctx.roundRect(x0 - 2, PADDING_TOP - 4, x1 - x0 + 4, maxBarHeight + 4, 4)
      ctx.fill()
      // Thin border
      ctx.strokeStyle = isDark ? 'rgba(253,186,116,0.25)' : 'rgba(253,186,116,0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }

    // ── 2. Draw bars ──
    for (let i = 0; i < n; i++) {
      const value = array[i]
      const barHeight = Math.max(4, (value / maxValue) * maxBarHeight)
      const x = startX + i * (barWidth + BAR_GAP)
      const y = height - PADDING_BOTTOM - barHeight

      // Determine color — priority: comparing > placing > sorted > leftRange > rightRange > default
      let fillColor: string
      let glowColor: string | null = null
      let glowBlur = 0

      if (comparingSet.has(i)) {
        fillColor = COLORS.comparing
        glowColor = COLORS.comparing
        glowBlur = 8
      } else if (placing === i) {
        fillColor = COLORS.placing
        glowColor = COLORS.placing
        glowBlur = 12
      } else if (sortedSet.has(i)) {
        fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
      } else if (leftRange && i >= leftRange[0] && i <= leftRange[1]) {
        fillColor = COLORS.leftRange
      } else if (rightRange && i >= rightRange[0] && i <= rightRange[1]) {
        fillColor = COLORS.rightRange
      } else {
        fillColor = isDark ? COLORS.barDark : COLORS.barLight
      }

      // Draw bar (with glow if applicable)
      ctx.save()
      if (glowColor) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = glowBlur
      }
      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, Math.min(3, barWidth / 4))
      ctx.fill()
      ctx.restore()

      // Sorted bars: subtle top indicator line
      if (sortedSet.has(i) && !comparingSet.has(i) && placing !== i) {
        ctx.save()
        ctx.strokeStyle = isDark ? '#059669' : '#047857' // emerald-600/700
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 2, y + 2)
        ctx.lineTo(x + barWidth - 2, y + 2)
        ctx.stroke()
        ctx.restore()
      }

      // Value label on top of bar
      if (showValues) {
        const fontSize = Math.min(12, Math.max(9, barWidth * 0.4))
        ctx.save()
        ctx.font = `${fontSize}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = isDark ? COLORS.textDark : COLORS.textLight
        ctx.fillText(String(value), x + barWidth / 2, y - 2)
        ctx.restore()
      }
    }
  }, [array, range, leftRange, rightRange, comparing, placing, sorted, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
