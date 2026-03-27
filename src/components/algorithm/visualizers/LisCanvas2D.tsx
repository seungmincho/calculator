'use client'
import { useRef, useEffect, useState } from 'react'

export interface LisCanvas2DProps {
  arr: number[]
  dpOrTails: number[]        // dp array or tails array depending on method
  method: 'dp' | 'binary-search'
  activeIndex: number        // current element index
  compareIndex: number       // element being compared to (dp) or insert position (bs)
  lisIndices: Set<number>    // indices of LIS elements
  filledSet: Set<number>     // indices already processed
  width?: number
  height?: number
}

const BAR_GAP = 3
const PADDING = 30
const TOP_PAD = 30
const MID_GAP = 50
const BOTTOM_SECTION_H = 100

const C = {
  bg:          { light: '#f8fafc', dark: '#111827' },
  text:        { light: '#1e293b', dark: '#f1f5f9' },
  textSub:     { light: '#64748b', dark: '#94a3b8' },
  barDefault:  { light: '#e2e8f0', dark: '#374151' },
  barFilled:   { light: '#bfdbfe', dark: '#1e3a5f' },
  barActive:   { fill: '#06b6d4', text: '#ffffff' },
  barCompare:  { fill: '#f59e0b', text: '#ffffff' },
  barLis:      { light: '#86efac', dark: '#14532d', border: '#16a34a' },
  dpDefault:   { light: '#f1f5f9', dark: '#1f2937' },
  dpFilled:    { light: '#ddd6fe', dark: '#312e81' },
  dpActive:    { fill: '#8b5cf6', text: '#ffffff' },
  tailsActive: { fill: '#10b981', text: '#ffffff' },
}

export default function LisCanvas2D({
  arr, dpOrTails, method, activeIndex, compareIndex,
  lisIndices, filledSet,
  width = 700, height = 420,
}: LisCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const n = arr.length
  const maxBarW = 48
  const logicalW = Math.max(width, PADDING * 2 + n * (maxBarW + BAR_GAP))
  const logicalH = height

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    const barW = Math.min(maxBarW, (logicalW - PADDING * 2) / n - BAR_GAP)
    const startX = PADDING + (logicalW - PADDING * 2 - n * (barW + BAR_GAP)) / 2

    // Top section: sequence bars
    const topH = logicalH - MID_GAP - BOTTOM_SECTION_H - TOP_PAD
    const maxVal = Math.max(...arr, 1)

    // ── Draw sequence bars ──
    for (let i = 0; i < n; i++) {
      const x = startX + i * (barW + BAR_GAP)
      const barH = Math.max(6, (arr[i] / maxVal) * (topH - 30))
      const barY = TOP_PAD + topH - barH

      const isActive = i === activeIndex
      const isCompare = i === compareIndex && method === 'dp'
      const isLis = lisIndices.has(i)
      const isFilled = filledSet.has(i)

      let fill: string

      if (isActive) {
        fill = C.barActive.fill
      } else if (isCompare) {
        fill = C.barCompare.fill
      } else if (isLis) {
        fill = isDark ? C.barLis.dark : C.barLis.light
      } else if (isFilled) {
        fill = isDark ? C.barFilled.dark : C.barFilled.light
      } else {
        fill = isDark ? C.barDefault.dark : C.barDefault.light
      }

      if (isActive) {
        ctx.save()
        ctx.shadowColor = 'rgba(6,182,212,0.5)'
        ctx.shadowBlur = 8
      }

      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.roundRect(x, barY, barW, barH, [3, 3, 0, 0])
      ctx.fill()

      // LIS border
      if (isLis && !isActive) {
        ctx.strokeStyle = C.barLis.border
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(x, barY, barW, barH, [3, 3, 0, 0])
        ctx.stroke()
      }

      if (isActive) ctx.restore()

      // Value on top
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = isActive ? C.barActive.fill : (isDark ? C.text.dark : C.text.light)
      ctx.fillText(String(arr[i]), x + barW / 2, barY - 3)

      // Index at bottom
      ctx.font = '9px system-ui'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(`[${i}]`, x + barW / 2, TOP_PAD + topH + 4)
    }

    // ── Label for bottom section ──
    const bottomY = TOP_PAD + topH + MID_GAP
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillStyle = isDark ? C.text.dark : C.text.light
    ctx.fillText(method === 'dp' ? 'dp[]' : 'tails[]', PADDING, bottomY - 12)

    // ── Draw dp/tails array ──
    const dpLen = dpOrTails.length
    const cellW = Math.min(barW, 40)
    const cellH = 32
    const dpStartX = startX

    for (let i = 0; i < dpLen; i++) {
      const x = dpStartX + i * (cellW + BAR_GAP)
      const y = bottomY

      const isActive = (method === 'dp' && i === activeIndex) ||
                       (method === 'binary-search' && i === compareIndex)

      let cellFill: string
      if (isActive) {
        cellFill = method === 'dp' ? C.dpActive.fill : C.tailsActive.fill
      } else if (i < dpLen) {
        cellFill = isDark ? C.dpFilled.dark : C.dpFilled.light
      } else {
        cellFill = isDark ? C.dpDefault.dark : C.dpDefault.light
      }

      ctx.fillStyle = cellFill
      ctx.beginPath()
      ctx.roundRect(x, y, cellW, cellH, 4)
      ctx.fill()

      ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.roundRect(x, y, cellW, cellH, 4)
      ctx.stroke()

      // Value
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isActive ? '#ffffff' : (isDark ? C.text.dark : C.text.light)
      ctx.fillText(String(dpOrTails[i]), x + cellW / 2, y + cellH / 2)

      // Index
      ctx.font = '8px system-ui'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(String(i), x + cellW / 2, y + cellH + 3)
    }

    // Arrow from active bar to dp cell (if dp method)
    if (method === 'dp' && activeIndex >= 0 && activeIndex < n) {
      const fromX = startX + activeIndex * (barW + BAR_GAP) + barW / 2
      const fromY = TOP_PAD + topH + 18
      const toX = dpStartX + activeIndex * (cellW + BAR_GAP) + cellW / 2
      const toY = bottomY - 4

      ctx.strokeStyle = isDark ? '#60a5fa' : '#3b82f6'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [arr, dpOrTails, method, activeIndex, compareIndex, lisIndices, filledSet, width, height, isDark, logicalW, logicalH, n])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
    />
  )
}
