'use client'
import { useRef, useEffect, useState } from 'react'

interface ShellSortCanvas2DProps {
  array: number[]
  comparing: [number, number] | null
  swapping: [number, number] | null
  sorted: number[]
  gap: number
  activeIndices: number[]
  width?: number
  height?: number
}

const COLORS = {
  barLight: '#60a5fa',
  barDark: '#3b82f6',
  comparing: '#fbbf24',
  swapping: '#f87171',
  sortedLight: '#34d399',
  sortedDark: '#10b981',
  activeLight: '#c4b5fd',
  activeDark: '#a78bfa',
  arcColor: 'rgba(167, 139, 250, 0.4)',
  arcColorDark: 'rgba(196, 181, 253, 0.3)',
  textLight: '#374151',
  textDark: '#d1d5db',
}

const PADDING_SIDE = 20
const PADDING_TOP = 50
const PADDING_BOTTOM = 20
const BAR_GAP = 2

export default function ShellSortCanvas2D({
  array,
  comparing,
  swapping,
  sorted,
  gap,
  activeIndices,
  width = 600,
  height = 380,
}: ShellSortCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Dark mode observer
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
    const activeSet = new Set(activeIndices)

    const maxValue = Math.max(...array, 1)
    const drawWidth = width - PADDING_SIDE * 2
    const maxBarHeight = height - PADDING_TOP - PADDING_BOTTOM

    const barWidth = Math.max(4, (drawWidth - BAR_GAP * (n - 1)) / n)
    const totalWidth = barWidth * n + BAR_GAP * (n - 1)
    const startX = PADDING_SIDE + (drawWidth - totalWidth) / 2

    const showValues = barWidth >= 20

    const getBarX = (i: number) => startX + i * (barWidth + BAR_GAP) + barWidth / 2

    // Draw connecting arcs for gap-apart elements being compared
    if (comparing && gap > 1) {
      const [a, b] = comparing
      const x1 = getBarX(a)
      const x2 = getBarX(b)
      const arcHeight = 25 + Math.min(gap * 3, 40)

      ctx.save()
      ctx.strokeStyle = isDark ? COLORS.arcColorDark : COLORS.arcColor
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      const midX = (x1 + x2) / 2
      ctx.moveTo(x1, PADDING_TOP - 10)
      ctx.quadraticCurveTo(midX, PADDING_TOP - 10 - arcHeight, x2, PADDING_TOP - 10)
      ctx.stroke()

      // Gap label
      ctx.setLineDash([])
      ctx.font = '11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = isDark ? '#c4b5fd' : '#8b5cf6'
      ctx.fillText(`gap=${gap}`, midX, PADDING_TOP - 10 - arcHeight + 5)
      ctx.restore()
    }

    // Draw bars
    for (let i = 0; i < n; i++) {
      const value = array[i]
      const barHeight = Math.max(4, (value / maxValue) * maxBarHeight)
      const x = startX + i * (barWidth + BAR_GAP)
      const y = height - PADDING_BOTTOM - barHeight

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
      } else if (sortedSet.has(i)) {
        fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
      } else if (activeSet.has(i)) {
        fillColor = isDark ? COLORS.activeDark : COLORS.activeLight
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

      // Sorted indicator
      if (sortedSet.has(i) && !swappingSet.has(i) && !comparingSet.has(i)) {
        ctx.save()
        ctx.strokeStyle = isDark ? '#059669' : '#047857'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 2, y + 2)
        ctx.lineTo(x + barWidth - 2, y + 2)
        ctx.stroke()
        ctx.restore()
      }

      // Value label
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
  }, [array, comparing, swapping, sorted, gap, activeIndices, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
