'use client'
import { useRef, useEffect, useState } from 'react'

interface RadixSortCanvas2DProps {
  array: number[]
  buckets: number[][]
  currentDigit: number
  highlightIndex: number | null
  highlightBucket: number | null
  highlightDigit: number | null
  width?: number
  height?: number
}

const COLORS = {
  barLight: '#60a5fa',          // blue-400
  barDark: '#3b82f6',           // blue-500
  highlightBar: '#fbbf24',      // amber-400
  highlightBucket: '#f472b6',   // pink-400
  sortedLight: '#34d399',       // emerald-400
  sortedDark: '#10b981',        // emerald-500
  bucketColors: [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#a16207',
  ],
  emptyLight: '#e5e7eb',
  emptyDark: '#374151',
  textLight: '#374151',
  textDark: '#d1d5db',
  labelLight: '#6b7280',
  labelDark: '#9ca3af',
  digitHighlight: '#fde68a',    // amber-200
  digitHighlightDark: '#92400e',
}

const PAD_H = 14
const PAD_TOP = 12
const BAR_GAP = 2
const DIGIT_BOX_H = 14  // height reserved for active-digit label inside bar

export default function RadixSortCanvas2D({
  array,
  buckets,
  currentDigit,
  highlightIndex,
  highlightBucket,
  highlightDigit,
  width = 600,
  height = 440,
}: RadixSortCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

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

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const drawWidth = width - PAD_H * 2
    const n = array.length

    // ── Layout: top half = array bars, bottom half = buckets ──
    const arrayAreaH = Math.floor(height * 0.42)
    const bucketsAreaH = height - arrayAreaH - PAD_TOP * 2 - 20  // 20 = label row

    // ─── Section 1: Array bars ───────────────────────────────────
    const arrayLabelY = PAD_TOP + 12
    ctx.save()
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.fillStyle = isDark ? COLORS.labelDark : COLORS.labelLight
    ctx.textAlign = 'left'
    ctx.fillText('Array', PAD_H, arrayLabelY)
    ctx.restore()

    const arrayBarAreaTop = PAD_TOP + 18  // below label
    const arrayBarAreaH = arrayAreaH - 18 - DIGIT_BOX_H

    if (n > 0) {
      const maxVal = Math.max(...array, 1)
      const barWidth = Math.max(4, (drawWidth - BAR_GAP * (n - 1)) / n)
      const totalW = barWidth * n + BAR_GAP * (n - 1)
      const startX = PAD_H + (drawWidth - totalW) / 2

      for (let i = 0; i < n; i++) {
        const val = array[i]
        const barH = Math.max(4, (val / maxVal) * arrayBarAreaH)
        const x = startX + i * (barWidth + BAR_GAP)
        const y = arrayBarAreaTop + arrayBarAreaH - barH

        // Determine color
        let fill = isDark ? COLORS.barDark : COLORS.barLight
        let glowColor: string | null = null

        if (i === highlightIndex) {
          fill = COLORS.highlightBar
          glowColor = COLORS.highlightBar
        }

        ctx.save()
        if (glowColor) {
          ctx.shadowColor = glowColor
          ctx.shadowBlur = 10
        }
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, Math.min(3, barWidth / 4))
        ctx.fill()
        ctx.restore()

        // Value above bar
        if (barWidth >= 18) {
          ctx.save()
          ctx.font = `${Math.min(10, Math.max(7, barWidth * 0.4))}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = isDark ? COLORS.textDark : COLORS.textLight
          ctx.fillText(String(val), x + barWidth / 2, y - 1)
          ctx.restore()
        }

        // Highlight the active digit in the number
        if (barWidth >= 12 && i === highlightIndex) {
          const digits = String(val).split('')
          const digitPos = digits.length - 1 - currentDigit  // position from right
          if (digitPos >= 0) {
            const digitChar = digits[digitPos]
            const boxY = arrayBarAreaTop + arrayBarAreaH + 2
            ctx.save()
            ctx.fillStyle = isDark ? COLORS.digitHighlightDark : COLORS.digitHighlight
            ctx.beginPath()
            ctx.roundRect(x, boxY, barWidth, DIGIT_BOX_H - 2, 2)
            ctx.fill()
            ctx.font = `bold ${Math.min(10, Math.max(7, barWidth * 0.4))}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#92400e'
            ctx.fillText(digitChar, x + barWidth / 2, boxY + (DIGIT_BOX_H - 2) / 2)
            ctx.restore()
          }
        }

        // Index label
        if (barWidth >= 14) {
          ctx.save()
          ctx.font = `${Math.min(9, Math.max(7, barWidth * 0.35))}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = isDark ? COLORS.labelDark : COLORS.labelLight
          ctx.fillText(String(i), x + barWidth / 2, arrayBarAreaTop + arrayBarAreaH + DIGIT_BOX_H + 1)
          ctx.restore()
        }
      }
    }

    // ─── Section 2: Buckets (0-9) ────────────────────────────────
    const bucketsTopY = arrayAreaH + PAD_TOP + 18  // 18 for "Buckets" label
    const bucketLabelY = arrayAreaH + PAD_TOP + 12

    ctx.save()
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.fillStyle = isDark ? COLORS.labelDark : COLORS.labelLight
    ctx.textAlign = 'left'
    ctx.fillText('Buckets', PAD_H, bucketLabelY)
    ctx.restore()

    const numBuckets = 10
    const bucketW = Math.floor((drawWidth - BAR_GAP * (numBuckets - 1)) / numBuckets)
    const bucketStartX = PAD_H + (drawWidth - (bucketW * numBuckets + BAR_GAP * (numBuckets - 1))) / 2

    for (let b = 0; b < numBuckets; b++) {
      const bx = bucketStartX + b * (bucketW + BAR_GAP)
      const isActive = b === highlightBucket

      // Bucket background container
      const containerH = bucketsAreaH
      ctx.save()
      ctx.fillStyle = isActive
        ? (isDark ? 'rgba(244,114,182,0.18)' : 'rgba(244,114,182,0.15)')
        : (isDark ? 'rgba(55,65,81,0.5)' : 'rgba(229,231,235,0.5)')
      ctx.strokeStyle = isActive
        ? COLORS.bucketColors[b]
        : (isDark ? 'rgba(75,85,99,0.5)' : 'rgba(209,213,219,0.5)')
      ctx.lineWidth = isActive ? 1.5 : 0.75
      ctx.beginPath()
      ctx.roundRect(bx, bucketsTopY, bucketW, containerH, 4)
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // Bucket label (digit number at bottom)
      ctx.save()
      ctx.font = `bold ${Math.min(11, Math.max(8, bucketW * 0.35))}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = COLORS.bucketColors[b]
      ctx.fillText(String(b), bx + bucketW / 2, bucketsTopY + containerH - 2)
      ctx.restore()

      // Elements in bucket (stacked from bottom, leaving room for label)
      const itemAreaH = containerH - 18
      const items = buckets[b]
      if (items.length > 0) {
        const itemH = Math.min(18, Math.floor(itemAreaH / Math.max(items.length, 1)))
        for (let j = 0; j < items.length; j++) {
          const itemY = bucketsTopY + itemAreaH - (j + 1) * itemH
          const isHighlightItem = isActive && j === items.length - 1

          ctx.save()
          if (isHighlightItem) {
            ctx.shadowColor = COLORS.bucketColors[b]
            ctx.shadowBlur = 6
          }
          ctx.fillStyle = isHighlightItem
            ? COLORS.bucketColors[b]
            : (isDark ? 'rgba(96,165,250,0.7)' : 'rgba(96,165,250,0.6)')
          ctx.beginPath()
          ctx.roundRect(bx + 2, itemY, bucketW - 4, itemH - 1, 2)
          ctx.fill()
          ctx.restore()

          // Value text inside item
          if (itemH >= 12) {
            ctx.save()
            ctx.font = `${Math.min(9, Math.max(7, itemH * 0.55))}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = isHighlightItem ? '#ffffff' : (isDark ? COLORS.textDark : COLORS.textLight)
            ctx.fillText(String(items[j]), bx + bucketW / 2, itemY + itemH / 2 - 0.5)
            ctx.restore()
          }
        }
      }
    }

  }, [array, buckets, currentDigit, highlightIndex, highlightBucket, highlightDigit, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
