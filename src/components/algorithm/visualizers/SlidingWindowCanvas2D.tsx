'use client'
import { useRef, useEffect, useState } from 'react'

export interface SlidingWindowCanvas2DProps {
  array: number[]
  left: number
  right: number
  bestLeft: number
  bestRight: number
  currentSum: number
  bestValue: number
  mode: 'fixed' | 'variable'
  width?: number
  height?: number
}

const PADDING_SIDE = 30
const PADDING_TOP = 50
const PADDING_BOTTOM = 40
const BAR_GAP = 3

const C = {
  bg:          { light: '#f8fafc', dark: '#111827' },
  text:        { light: '#1e293b', dark: '#f1f5f9' },
  textSub:     { light: '#64748b', dark: '#94a3b8' },
  bar:         { light: '#93c5fd', dark: '#3b82f6' },
  barInWindow: { light: '#60a5fa', dark: '#2563eb' },
  barBest:     { light: '#34d399', dark: '#10b981' },
  windowBg:    { light: 'rgba(59,130,246,0.08)', dark: 'rgba(59,130,246,0.15)' },
  windowBorder:'#3b82f6',
  bestBorder:  '#10b981',
  pointer:     { left: '#ef4444', right: '#3b82f6' },
}

export default function SlidingWindowCanvas2D({
  array, left, right, bestLeft, bestRight,
  currentSum, bestValue, mode,
  width = 700, height = 350,
}: SlidingWindowCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, width, height)

    const n = array.length
    if (n === 0) return

    const maxValue = Math.max(...array, 1)
    const drawWidth = width - PADDING_SIDE * 2
    const maxBarHeight = height - PADDING_TOP - PADDING_BOTTOM - 30

    const barWidth = Math.max(8, (drawWidth - BAR_GAP * (n - 1)) / n)
    const totalWidth = barWidth * n + BAR_GAP * (n - 1)
    const startX = PADDING_SIDE + (drawWidth - totalWidth) / 2

    const barBottom = height - PADDING_BOTTOM

    // Determine sets
    const inWindow = new Set<number>()
    if (left >= 0 && right >= 0 && left <= right) {
      for (let i = left; i <= right && i < n; i++) inWindow.add(i)
    }
    const inBest = new Set<number>()
    if (bestLeft >= 0 && bestRight >= 0) {
      for (let i = bestLeft; i <= bestRight && i < n; i++) inBest.add(i)
    }

    // Draw best window background (if different from current)
    if (bestLeft >= 0 && bestRight >= 0) {
      const bx0 = startX + bestLeft * (barWidth + BAR_GAP) - 4
      const bx1 = startX + bestRight * (barWidth + BAR_GAP) + barWidth + 4
      ctx.fillStyle = isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)'
      ctx.beginPath()
      ctx.roundRect(bx0, PADDING_TOP - 10, bx1 - bx0, barBottom - PADDING_TOP + 20, 6)
      ctx.fill()
      ctx.strokeStyle = C.bestBorder
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw current window overlay
    if (left >= 0 && right >= 0 && left <= right) {
      const wx0 = startX + left * (barWidth + BAR_GAP) - 3
      const wx1 = startX + right * (barWidth + BAR_GAP) + barWidth + 3
      ctx.fillStyle = isDark ? C.windowBg.dark : C.windowBg.light
      ctx.beginPath()
      ctx.roundRect(wx0, PADDING_TOP - 6, wx1 - wx0, barBottom - PADDING_TOP + 16, 6)
      ctx.fill()
      ctx.strokeStyle = C.windowBorder
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw bars
    for (let i = 0; i < n; i++) {
      const value = array[i]
      const barH = Math.max(4, (value / maxValue) * maxBarHeight)
      const x = startX + i * (barWidth + BAR_GAP)
      const y = barBottom - barH

      let fillColor: string
      if (inWindow.has(i)) {
        fillColor = isDark ? C.barInWindow.dark : C.barInWindow.light
      } else if (inBest.has(i)) {
        fillColor = isDark ? C.barBest.dark : C.barBest.light
      } else {
        fillColor = isDark ? C.bar.dark : C.bar.light
      }

      // Glow for window items
      if (inWindow.has(i)) {
        ctx.save()
        ctx.shadowColor = 'rgba(59,130,246,0.4)'
        ctx.shadowBlur = 8
      }

      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, Math.min(3, barWidth / 4))
      ctx.fill()

      if (inWindow.has(i)) ctx.restore()

      // Value on top
      if (barWidth >= 16) {
        const fontSize = Math.min(12, Math.max(9, barWidth * 0.35))
        ctx.font = `bold ${fontSize}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = isDark ? C.text.dark : C.text.light
        ctx.fillText(String(value), x + barWidth / 2, y - 3)
      }

      // Index below
      ctx.font = '9px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(String(i), x + barWidth / 2, barBottom + 4)
    }

    // Draw left/right pointers
    if (left >= 0 && left < n) {
      const lx = startX + left * (barWidth + BAR_GAP) + barWidth / 2
      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillStyle = C.pointer.left
      ctx.fillText('L', lx, barBottom + 18)
      // Arrow
      ctx.beginPath()
      ctx.moveTo(lx, barBottom + 14)
      ctx.lineTo(lx - 4, barBottom + 10)
      ctx.lineTo(lx + 4, barBottom + 10)
      ctx.closePath()
      ctx.fill()
    }
    if (right >= 0 && right < n) {
      const rx = startX + right * (barWidth + BAR_GAP) + barWidth / 2
      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillStyle = C.pointer.right
      ctx.fillText('R', rx, barBottom + 18)
      ctx.beginPath()
      ctx.moveTo(rx, barBottom + 14)
      ctx.lineTo(rx - 4, barBottom + 10)
      ctx.lineTo(rx + 4, barBottom + 10)
      ctx.closePath()
      ctx.fill()
    }

    // Draw stats at top
    ctx.font = '11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light

    const sumLabel = `sum=${currentSum}`
    const bestLabel = mode === 'fixed'
      ? `max sum=${bestValue}`
      : (bestValue === -1 ? 'no valid window' : `min len=${bestValue}`)
    ctx.fillText(sumLabel, PADDING_SIDE, 20)
    ctx.fillStyle = '#10b981'
    ctx.fillText(bestLabel, PADDING_SIDE + 100, 20)

    if (left >= 0 && right >= 0) {
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(`window=[${left}..${right}]`, PADDING_SIDE + 260, 20)
    }
  }, [array, left, right, bestLeft, bestRight, currentSum, bestValue, mode, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
