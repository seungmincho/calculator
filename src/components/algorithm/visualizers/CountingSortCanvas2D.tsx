'use client'
import { useRef, useEffect, useState } from 'react'

interface CountingSortCanvas2DProps {
  array: number[]
  countArray: number[]
  outputArray: number[]
  highlightInput: number | null
  highlightCount: number | null
  highlightOutput: number | null
  sorted: number[]
  width?: number
  height?: number
}

const COLORS = {
  barLight: '#60a5fa',        // blue-400
  barDark: '#3b82f6',         // blue-500
  highlightInput: '#fbbf24',  // amber-400
  highlightCount: '#f87171',  // red-400
  highlightOutput: '#a78bfa', // violet-400
  sortedLight: '#34d399',     // emerald-400
  sortedDark: '#10b981',      // emerald-500
  emptyLight: '#e5e7eb',      // gray-200
  emptyDark: '#374151',       // gray-700
  textLight: '#374151',       // gray-700
  textDark: '#d1d5db',        // gray-300
  labelLight: '#6b7280',      // gray-500
  labelDark: '#9ca3af',       // gray-400
}

const PAD_SIDE = 12
const PAD_TOP = 16
const PAD_BOTTOM = 8
const BAR_GAP = 2
const ROW_GAP = 24          // gap between each of the 3 sections
const LABEL_HEIGHT = 16     // space for row title

export default function CountingSortCanvas2D({
  array,
  countArray,
  outputArray,
  highlightInput,
  highlightCount,
  highlightOutput,
  sorted,
  width = 600,
  height = 420,
}: CountingSortCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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

    const drawWidth = width - PAD_SIDE * 2
    // 3 rows + labels: divide remaining height equally
    const totalRowGaps = ROW_GAP * 2
    const totalLabelHeight = LABEL_HEIGHT * 3
    const rowHeight = Math.floor(
      (height - PAD_TOP - PAD_BOTTOM - totalRowGaps - totalLabelHeight) / 3
    )

    // Row Y positions (top of bar area, after label)
    const rowY = [
      PAD_TOP + LABEL_HEIGHT,
      PAD_TOP + LABEL_HEIGHT + rowHeight + ROW_GAP + LABEL_HEIGHT,
      PAD_TOP + LABEL_HEIGHT + rowHeight + ROW_GAP + LABEL_HEIGHT + rowHeight + ROW_GAP + LABEL_HEIGHT,
    ]
    const rowLabels = ['Input', 'Count', 'Output']

    // Datasets
    const datasets = [
      { data: array, n: array.length },
      { data: countArray, n: countArray.length },
      { data: outputArray, n: outputArray.length },
    ]

    const sortedSet = new Set(sorted)
    const isDone = sorted.length > 0

    for (let row = 0; row < 3; row++) {
      const { data, n } = datasets[row]
      if (n === 0) continue

      const labelY = rowY[row] - LABEL_HEIGHT + 12
      // Draw row label
      ctx.save()
      ctx.font = `bold 11px system-ui, sans-serif`
      ctx.fillStyle = isDark ? COLORS.labelDark : COLORS.labelLight
      ctx.textAlign = 'left'
      ctx.fillText(rowLabels[row], PAD_SIDE, labelY)
      ctx.restore()

      const maxVal = Math.max(...data.filter(v => v >= 0), 1)
      const barWidth = Math.max(4, (drawWidth - BAR_GAP * (n - 1)) / n)
      const totalWidthActual = barWidth * n + BAR_GAP * (n - 1)
      const startX = PAD_SIDE + (drawWidth - totalWidthActual) / 2

      const showValues = barWidth >= 14

      for (let i = 0; i < n; i++) {
        const value = data[i]
        const isEmpty = value < 0 || value === 0
        const barHeight = isEmpty
          ? 4
          : Math.max(4, (value / maxVal) * rowHeight)
        const x = startX + i * (barWidth + BAR_GAP)
        const y = rowY[row] + rowHeight - barHeight

        // Determine color
        let fillColor: string
        let glowColor: string | null = null
        let glowBlur = 0

        if (isDone && row === 2) {
          // Output row after done — show sorted color
          fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
        } else if (row === 0 && i === highlightInput) {
          fillColor = COLORS.highlightInput
          glowColor = COLORS.highlightInput
          glowBlur = 10
        } else if (row === 1 && i === highlightCount) {
          fillColor = COLORS.highlightCount
          glowColor = COLORS.highlightCount
          glowBlur = 10
        } else if (row === 2 && i === highlightOutput) {
          fillColor = COLORS.highlightOutput
          glowColor = COLORS.highlightOutput
          glowBlur = 10
        } else if (isDone && row === 2 && sortedSet.has(value)) {
          fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
        } else if (value < 0) {
          fillColor = isDark ? COLORS.emptyDark : COLORS.emptyLight
        } else {
          fillColor = isDark ? COLORS.barDark : COLORS.barLight
        }

        // Draw bar
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

        // Value label above bar
        if (showValues && value >= 0) {
          const fontSize = Math.min(11, Math.max(8, barWidth * 0.45))
          ctx.save()
          ctx.font = `${fontSize}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = isDark ? COLORS.textDark : COLORS.textLight
          ctx.fillText(String(value), x + barWidth / 2, y - 1)
          ctx.restore()
        }

        // Index label below bar (only if wide enough)
        if (showValues) {
          const fontSize = Math.min(9, Math.max(7, barWidth * 0.35))
          ctx.save()
          ctx.font = `${fontSize}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = isDark ? COLORS.labelDark : COLORS.labelLight
          ctx.fillText(String(i), x + barWidth / 2, rowY[row] + rowHeight + 2)
          ctx.restore()
        }
      }
    }
  }, [array, countArray, outputArray, highlightInput, highlightCount, highlightOutput, sorted, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
