'use client'
import { useRef, useEffect, useState } from 'react'

interface BinarySearchCanvas2DProps {
  array: number[]
  low: number
  high: number
  mid: number | null
  foundIndex: number | null
  target: number
  eliminatedIndices: Set<number>
  width?: number
  height?: number
}

const COLORS = {
  blockActive: '#60a5fa',      // blue-400
  blockActiveDark: '#3b82f6',  // blue-500
  blockElim: '#9ca3af',        // gray-400
  blockElimDark: '#4b5563',    // gray-600
  midBlock: '#fbbf24',         // amber-400
  foundBlock: '#34d399',       // emerald-400
  textLight: '#374151',        // gray-700
  textDark: '#d1d5db',         // gray-300
  textElim: '#9ca3af',
  pointerLow: '#22c55e',       // green-500
  pointerHigh: '#ef4444',      // red-500
  targetBg: '#1e40af',         // blue-800
  targetText: '#bfdbfe',       // blue-100
}

const PADDING_SIDE = 20
const PADDING_TOP = 52   // space for "Target: N" label + range line
const PADDING_BOTTOM = 36 // space for L/H pointers

export default function BinarySearchCanvas2D({
  array,
  low,
  high,
  mid,
  foundIndex,
  target,
  eliminatedIndices,
  width = 640,
  height = 200,
}: BinarySearchCanvas2DProps) {
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

    const n = array.length
    if (n === 0) return

    const drawAreaWidth = width - PADDING_SIDE * 2
    const blockH = height - PADDING_TOP - PADDING_BOTTOM
    // clamp block width so values fit
    const rawBlockW = drawAreaWidth / n
    const blockW = Math.max(20, rawBlockW)
    const gap = rawBlockW < 20 ? 0 : 1

    // Center the row
    const totalRowWidth = n * blockW + (n - 1) * gap
    const startX = PADDING_SIDE + (drawAreaWidth - totalRowWidth) / 2
    const blockY = PADDING_TOP

    const showLabels = blockW >= 28

    // Draw "Target: N" pill above center
    ctx.save()
    const targetLabel = `Target: ${target}`
    ctx.font = 'bold 13px system-ui, sans-serif'
    const labelW = ctx.measureText(targetLabel).width + 16
    const labelX = width / 2 - labelW / 2
    ctx.fillStyle = isDark ? '#1e40af' : '#dbeafe'
    ctx.beginPath()
    ctx.roundRect(labelX, 6, labelW, 22, 6)
    ctx.fill()
    ctx.fillStyle = isDark ? COLORS.targetText : '#1d4ed8'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(targetLabel, width / 2, 17)
    ctx.restore()

    // Draw active range bracket
    if (low <= high && low < n && high < n) {
      const lx = startX + low * (blockW + gap)
      const rx = startX + high * (blockW + gap) + blockW
      ctx.save()
      ctx.strokeStyle = isDark ? '#60a5fa' : '#2563eb'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(lx, blockY - 4)
      ctx.lineTo(rx, blockY - 4)
      ctx.stroke()
      ctx.restore()
    }

    for (let i = 0; i < n; i++) {
      const x = startX + i * (blockW + gap)
      const value = array[i]

      const isEliminated = eliminatedIndices.has(i)
      const isMid = mid === i
      const isFound = foundIndex === i
      const isLow = low === i
      const isHigh = high === i

      // Block fill
      let fillColor: string
      let glowColor: string | null = null
      let opacity = 1

      if (isFound) {
        fillColor = COLORS.foundBlock
        glowColor = COLORS.foundBlock
      } else if (isMid) {
        fillColor = COLORS.midBlock
        glowColor = COLORS.midBlock
      } else if (isEliminated) {
        fillColor = isDark ? COLORS.blockElimDark : COLORS.blockElim
        opacity = 0.35
      } else {
        fillColor = isDark ? COLORS.blockActiveDark : COLORS.blockActive
      }

      ctx.save()
      ctx.globalAlpha = opacity
      if (glowColor) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = isMid ? 10 : 16
      }
      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(x, blockY, blockW - gap, blockH, Math.min(4, blockW / 6))
      ctx.fill()
      ctx.restore()

      // Value label inside block
      if (showLabels) {
        const fontSize = Math.min(12, Math.max(9, blockW * 0.35))
        ctx.save()
        ctx.globalAlpha = opacity
        ctx.font = `${fontSize}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (isFound || isMid) {
          ctx.fillStyle = '#1f2937' // gray-800 for contrast on bright
        } else if (isEliminated) {
          ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af'
        } else {
          ctx.fillStyle = isDark ? COLORS.textDark : COLORS.textLight
        }
        ctx.fillText(String(value), x + (blockW - gap) / 2, blockY + blockH / 2)
        ctx.restore()
      }

      // "mid" label above mid block
      if (isMid && !isFound) {
        ctx.save()
        ctx.font = 'bold 10px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = COLORS.midBlock
        ctx.fillText('mid', x + (blockW - gap) / 2, blockY - 6)
        ctx.restore()
      }

      // Pointer labels below (L / H)
      const pY = blockY + blockH + 4
      if (isLow && !isFound) {
        ctx.save()
        ctx.font = 'bold 11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = COLORS.pointerLow
        // triangle
        const cx = x + (blockW - gap) / 2
        ctx.beginPath()
        ctx.moveTo(cx, pY)
        ctx.lineTo(cx - 5, pY + 8)
        ctx.lineTo(cx + 5, pY + 8)
        ctx.closePath()
        ctx.fill()
        ctx.fillText('L', cx, pY + 9)
        ctx.restore()
      }
      if (isHigh && !isFound) {
        ctx.save()
        ctx.font = 'bold 11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = COLORS.pointerHigh
        const cx = x + (blockW - gap) / 2
        ctx.beginPath()
        ctx.moveTo(cx, pY)
        ctx.lineTo(cx - 5, pY + 8)
        ctx.lineTo(cx + 5, pY + 8)
        ctx.closePath()
        ctx.fill()
        ctx.fillText('H', cx, pY + 9)
        ctx.restore()
      }
    }
  }, [array, low, high, mid, foundIndex, target, eliminatedIndices, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
