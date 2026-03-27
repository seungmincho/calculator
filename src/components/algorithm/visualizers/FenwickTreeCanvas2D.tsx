'use client'
import { useRef, useEffect, useState, useMemo } from 'react'
import { responsibleRange, toBinary, lowbit } from '@/utils/algorithm/fenwickTree'

export interface FenwickTreeCanvas2DProps {
  bit: number[]              // 1-based BIT array
  originalArray: number[]    // 0-based original array
  n: number
  activeBitIndex: number | null
  visitedBitIndices: Set<number>
  updatedBitIndices: Set<number>
  accumulator: number
  currentLowbit: number
  width?: number
  height?: number
}

const BAR_W = 44
const BAR_GAP = 6
const MAX_BAR_H = 120
const PADDING = 30
const SECTION_GAP = 30
const ORIG_BAR_H = 60
const BINARY_ROW_H = 24
const RANGE_ROW_H = 20

const C = {
  bg:          { light: '#f8fafc', dark: '#111827' },
  barDefault:  { fill: { light: '#e2e8f0', dark: '#334155' }, border: { light: '#94a3b8', dark: '#475569' } },
  barActive:   { fill: '#3b82f6', border: '#1d4ed8' },
  barVisited:  { fill: { light: '#fef3c7', dark: '#78350f' }, border: '#d97706' },
  barUpdated:  { fill: '#ede9fe', border: '#7c3aed' },
  origBar:     { fill: { light: '#dbeafe', dark: '#1e3a5f' }, border: { light: '#60a5fa', dark: '#2563eb' } },
  rangeLine:   '#10b981',
  rangeActive: '#3b82f6',
  textMain:    { light: '#1e293b', dark: '#f1f5f9' },
  textSub:     { light: '#64748b', dark: '#94a3b8' },
  glow:        'rgba(59,130,246,0.45)',
  glowUpdate:  'rgba(124,58,237,0.55)',
  accumBg:     { light: '#ecfdf5', dark: '#064e3b' },
  accumText:   '#10b981',
}

export default function FenwickTreeCanvas2D({
  bit, originalArray, n, activeBitIndex, visitedBitIndices,
  updatedBitIndices, accumulator, currentLowbit,
  width = 700, height = 500,
}: FenwickTreeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const maxBitVal = useMemo(() => {
    let max = 1
    for (let i = 1; i <= n; i++) if (Math.abs(bit[i]) > max) max = Math.abs(bit[i])
    return max
  }, [bit, n])

  const maxOrigVal = useMemo(() => {
    let max = 1
    for (const v of originalArray) if (Math.abs(v) > max) max = Math.abs(v)
    return max
  }, [originalArray])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const totalW = PADDING * 2 + n * (BAR_W + BAR_GAP)
    const totalH = PADDING + ORIG_BAR_H + SECTION_GAP + MAX_BAR_H + SECTION_GAP + BINARY_ROW_H + RANGE_ROW_H + PADDING + 40
    const logicalW = Math.max(width, totalW)
    const logicalH = Math.max(height, totalH)

    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (n === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Fenwick Tree will appear here', logicalW / 2, logicalH / 2)
      return
    }

    const startX = PADDING
    let curY = PADDING

    // ── Section 1: Original array bars ──
    ctx.save()
    ctx.font = 'bold 11px system-ui'
    ctx.fillStyle = isDark ? C.textMain.dark : C.textMain.light
    ctx.textAlign = 'left'
    ctx.fillText('Original Array', startX, curY + 10)
    ctx.restore()
    curY += 18

    for (let i = 0; i < n; i++) {
      const x = startX + i * (BAR_W + BAR_GAP)
      const v = originalArray[i] ?? 0
      const barH = Math.max(4, (Math.abs(v) / maxOrigVal) * ORIG_BAR_H)
      const y = curY + ORIG_BAR_H - barH

      ctx.save()
      ctx.fillStyle = isDark ? C.origBar.fill.dark : C.origBar.fill.light
      ctx.fillRect(x, y, BAR_W, barH)
      ctx.strokeStyle = isDark ? C.origBar.border.dark : C.origBar.border.light
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, BAR_W, barH)

      // Value label
      ctx.font = 'bold 10px system-ui'
      ctx.fillStyle = isDark ? C.textMain.dark : C.textMain.light
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(String(v), x + BAR_W / 2, y - 2)

      // Index label
      ctx.font = '9px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textBaseline = 'top'
      ctx.fillText(String(i), x + BAR_W / 2, curY + ORIG_BAR_H + 2)
      ctx.restore()
    }

    curY += ORIG_BAR_H + SECTION_GAP

    // ── Section 2: BIT array bars ──
    ctx.save()
    ctx.font = 'bold 11px system-ui'
    ctx.fillStyle = isDark ? C.textMain.dark : C.textMain.light
    ctx.textAlign = 'left'
    ctx.fillText('BIT Array', startX, curY - 6)
    ctx.restore()

    const bitBarBaseY = curY + MAX_BAR_H

    for (let i = 1; i <= n; i++) {
      const x = startX + (i - 1) * (BAR_W + BAR_GAP)
      const v = bit[i] ?? 0
      const barH = Math.max(4, (Math.abs(v) / maxBitVal) * MAX_BAR_H)
      const y = bitBarBaseY - barH

      const isActive = i === activeBitIndex
      const isVisited = visitedBitIndices.has(i)
      const isUpdated = updatedBitIndices.has(i)

      let fill: string, border: string
      let glowColor: string | null = null

      if (isActive) {
        fill = C.barActive.fill; border = C.barActive.border; glowColor = C.glow
      } else if (isUpdated) {
        fill = C.barUpdated.fill; border = C.barUpdated.border; glowColor = C.glowUpdate
      } else if (isVisited) {
        fill = isDark ? C.barVisited.fill.dark : C.barVisited.fill.light; border = C.barVisited.border
      } else {
        fill = isDark ? C.barDefault.fill.dark : C.barDefault.fill.light
        border = isDark ? C.barDefault.border.dark : C.barDefault.border.light
      }

      ctx.save()
      if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 12 }
      ctx.fillStyle = fill
      ctx.fillRect(x, y, BAR_W, barH)
      ctx.shadowBlur = 0
      ctx.strokeStyle = border
      ctx.lineWidth = isActive || isUpdated ? 2 : 1
      ctx.strokeRect(x, y, BAR_W, barH)

      // Value label
      ctx.font = `bold ${isActive ? '12' : '10'}px system-ui`
      ctx.fillStyle = isActive ? '#ffffff' : (isDark ? C.textMain.dark : C.textMain.light)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(String(v), x + BAR_W / 2, y - 2)

      // Index label (1-based)
      ctx.font = '9px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textBaseline = 'top'
      ctx.fillText(String(i), x + BAR_W / 2, bitBarBaseY + 2)
      ctx.restore()

      // Responsible range bracket
      const [rl, rr] = responsibleRange(i)
      const rangeY = bitBarBaseY + 16
      const rangeStartX = startX + (rl - 1) * (BAR_W + BAR_GAP)
      const rangeEndX = startX + (rr - 1) * (BAR_W + BAR_GAP) + BAR_W
      const rangeColor = isActive ? C.rangeActive : C.rangeLine

      ctx.save()
      ctx.strokeStyle = rangeColor
      ctx.lineWidth = isActive ? 2 : 1
      ctx.globalAlpha = isActive ? 1 : 0.4
      ctx.beginPath()
      ctx.moveTo(rangeStartX, rangeY)
      ctx.lineTo(rangeStartX, rangeY + RANGE_ROW_H / 2)
      ctx.lineTo(rangeEndX, rangeY + RANGE_ROW_H / 2)
      ctx.lineTo(rangeEndX, rangeY)
      ctx.stroke()
      ctx.restore()
    }

    curY = bitBarBaseY + 16 + RANGE_ROW_H + 8

    // ── Section 3: Binary representation row ──
    for (let i = 1; i <= n; i++) {
      const x = startX + (i - 1) * (BAR_W + BAR_GAP)
      const isActive = i === activeBitIndex
      const binStr = toBinary(i, Math.ceil(Math.log2(n + 1)))
      const lb = lowbit(i)

      ctx.save()
      ctx.font = `${isActive ? 'bold ' : ''}9px monospace`
      ctx.fillStyle = isActive ? C.barActive.fill : (isDark ? C.textSub.dark : C.textSub.light)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(binStr, x + BAR_W / 2, curY)

      if (isActive && currentLowbit > 0) {
        ctx.font = 'bold 8px system-ui'
        ctx.fillStyle = '#ef4444'
        ctx.fillText(`lb=${lb}`, x + BAR_W / 2, curY + 12)
      }
      ctx.restore()
    }

    // ── Accumulator display ──
    if (accumulator > 0 || activeBitIndex !== null) {
      const accX = logicalW - PADDING - 100
      const accY = PADDING
      ctx.save()
      ctx.fillStyle = isDark ? C.accumBg.dark : C.accumBg.light
      ctx.beginPath()
      ctx.roundRect(accX, accY, 90, 36, 8)
      ctx.fill()
      ctx.strokeStyle = C.accumText
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.font = 'bold 10px system-ui'
      ctx.fillStyle = C.accumText
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Sum = ${accumulator}`, accX + 45, accY + 18)
      ctx.restore()
    }
  }, [bit, originalArray, n, maxBitVal, maxOrigVal, activeBitIndex, visitedBitIndices,
    updatedBitIndices, accumulator, currentLowbit, width, height, isDark])

  const totalW = PADDING * 2 + n * (BAR_W + BAR_GAP)
  const displayW = Math.max(width, totalW)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: displayW, height }}
      className="rounded-xl"
    />
  )
}
