'use client'
import { useRef, useEffect, useState } from 'react'

interface QuickSortCanvas2DProps {
  array: number[]
  pivot: number | null
  comparing: [number, number] | null
  swapping: [number, number] | null
  partitionRange: [number, number] | null
  sorted: number[]
  width?: number
  height?: number
}

const COLORS = {
  barLight: '#60a5fa',       // blue-400
  barDark: '#3b82f6',        // blue-500
  pivot: '#a78bfa',          // violet-400
  comparing: '#fbbf24',      // amber-400
  swapping: '#f87171',       // red-400
  sortedLight: '#34d399',    // emerald-400
  sortedDark: '#10b981',     // emerald-500
  textLight: '#374151',      // gray-700
  textDark: '#d1d5db',       // gray-300
  partitionBgLight: '#ede9fe', // violet-100 (approx violet-50 is too faint)
  partitionBgDark: 'rgba(109, 40, 217, 0.15)', // violet-900/15
}

const PADDING_SIDE = 20
const PADDING_TOP = 30
const PADDING_BOTTOM = 20
const BAR_GAP = 2

export default function QuickSortCanvas2D({
  array,
  pivot,
  comparing,
  swapping,
  partitionRange,
  sorted,
  width = 600,
  height = 380,
}: QuickSortCanvas2DProps) {
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
    const swappingSet = swapping ? new Set(swapping) : new Set<number>()

    const maxValue = Math.max(...array, 1)
    const drawWidth = width - PADDING_SIDE * 2
    const maxBarHeight = height - PADDING_TOP - PADDING_BOTTOM

    const barWidth = Math.max(4, (drawWidth - BAR_GAP * (n - 1)) / n)
    const totalWidth = barWidth * n + BAR_GAP * (n - 1)
    const startX = PADDING_SIDE + (drawWidth - totalWidth) / 2

    const showValues = barWidth >= 20

    // Draw partition range background rectangle before bars
    if (partitionRange) {
      const [low, high] = partitionRange
      if (low >= 0 && high < n && low <= high) {
        const rectX = startX + low * (barWidth + BAR_GAP)
        const rectEndX = startX + high * (barWidth + BAR_GAP) + barWidth
        const rectY = PADDING_TOP
        const rectH = maxBarHeight

        ctx.save()
        ctx.fillStyle = isDark ? COLORS.partitionBgDark : COLORS.partitionBgLight
        ctx.beginPath()
        ctx.roundRect(rectX - 4, rectY, rectEndX - rectX + 8, rectH, 6)
        ctx.fill()
        ctx.restore()
      }
    }

    for (let i = 0; i < n; i++) {
      const value = array[i]
      const barHeight = Math.max(4, (value / maxValue) * maxBarHeight)
      const x = startX + i * (barWidth + BAR_GAP)
      const y = height - PADDING_BOTTOM - barHeight

      // Determine color — priority: swapping > comparing > pivot > sorted > default
      let fillColor: string
      let glowColor: string | null = null
      let glowBlur = 0

      if (swappingSet.has(i)) {
        fillColor = COLORS.swapping
        glowColor = COLORS.swapping
        glowBlur = 12
      } else if (comparingSet.has(i)) {
        fillColor = COLORS.comparing
        glowColor = COLORS.comparing
        glowBlur = 8
      } else if (i === pivot) {
        fillColor = COLORS.pivot
        glowColor = COLORS.pivot
        glowBlur = 14
      } else if (sortedSet.has(i)) {
        fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
      } else {
        fillColor = isDark ? COLORS.barDark : COLORS.barLight
      }

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
      if (sortedSet.has(i) && !swappingSet.has(i) && !comparingSet.has(i) && i !== pivot) {
        ctx.save()
        ctx.strokeStyle = isDark ? '#059669' : '#047857' // emerald-600/700
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 2, y + 2)
        ctx.lineTo(x + barWidth - 2, y + 2)
        ctx.stroke()
        ctx.restore()
      }

      // Pivot bar: small triangle/diamond indicator above bar
      if (i === pivot && !swappingSet.has(i)) {
        ctx.save()
        ctx.fillStyle = COLORS.pivot
        ctx.shadowColor = COLORS.pivot
        ctx.shadowBlur = 6
        const cx = x + barWidth / 2
        const tipY = y - 6
        const halfBase = Math.min(5, barWidth / 3)
        ctx.beginPath()
        ctx.moveTo(cx, tipY)
        ctx.lineTo(cx - halfBase, tipY - 7)
        ctx.lineTo(cx + halfBase, tipY - 7)
        ctx.closePath()
        ctx.fill()
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
        ctx.fillText(String(value), x + barWidth / 2, y - (i === pivot ? 16 : 2))
        ctx.restore()
      }
    }
  }, [array, pivot, comparing, swapping, partitionRange, sorted, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
