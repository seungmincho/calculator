'use client'
import { useRef, useEffect, useState } from 'react'

interface BloomFilterCanvas2DProps {
  bits: boolean[]
  m: number
  k: number
  highlightPositions: number[]   // positions currently being hashed/checked
  highlightColor: 'insert' | 'check' | 'none'
  insertedItems: string[]
  width?: number
  height?: number
}

const COLORS = {
  bg: '#ffffff',
  bgDark: '#111827',
  bitOff: '#e5e7eb',
  bitOffDark: '#374151',
  bitOn: '#3b82f6',
  bitOnDark: '#60a5fa',
  bitStroke: '#d1d5db',
  bitStrokeDark: '#4b5563',
  hashInsert: '#10b981',
  hashInsertDark: '#34d399',
  hashCheck: '#f59e0b',
  hashCheckDark: '#fbbf24',
  text: '#374151',
  textDark: '#d1d5db',
  labelText: '#6b7280',
  labelTextDark: '#9ca3af',
  indexText: '#9ca3af',
  indexTextDark: '#6b7280',
}

export default function BloomFilterCanvas2D({
  bits, m, k, highlightPositions, highlightColor,
  insertedItems,
  width = 600, height = 360,
}: BloomFilterCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
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

    const highlightSet = new Set(highlightPositions)

    // Calculate grid layout for bit array
    const padding = 20
    const availableWidth = width - 2 * padding
    const maxCols = Math.min(m, Math.ceil(Math.sqrt(m * 2.5)))
    const cols = Math.min(maxCols, m)
    const rows = Math.ceil(m / cols)
    const cellSize = Math.min(
      (availableWidth) / cols,
      (height - 100) / rows,
      28
    )
    const gap = Math.max(1, cellSize * 0.1)
    const actualCellSize = cellSize - gap

    const gridWidth = cols * cellSize
    const gridHeight = rows * cellSize
    const startX = (width - gridWidth) / 2
    const startY = 40

    // Title
    ctx.font = 'bold 13px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? COLORS.textDark : COLORS.text
    const setBits = bits.filter(b => b).length
    ctx.fillText(`Bit Array [${m}]  —  ${setBits}/${m} set`, width / 2, 18)

    // Draw bit cells
    for (let i = 0; i < m; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * cellSize
      const y = startY + row * cellSize

      const isHighlighted = highlightSet.has(i)
      const isSet = bits[i]

      // Cell background
      if (isHighlighted) {
        // Glow
        ctx.beginPath()
        ctx.roundRect(x - 2, y - 2, actualCellSize + 4, actualCellSize + 4, 4)
        const glowColor = highlightColor === 'insert'
          ? (isDark ? 'rgba(52,211,153,0.3)' : 'rgba(16,185,129,0.3)')
          : (isDark ? 'rgba(251,191,36,0.3)' : 'rgba(245,158,11,0.3)')
        ctx.fillStyle = glowColor
        ctx.fill()
      }

      ctx.beginPath()
      ctx.roundRect(x, y, actualCellSize, actualCellSize, 3)

      if (isHighlighted) {
        ctx.fillStyle = highlightColor === 'insert'
          ? (isDark ? COLORS.hashInsertDark : COLORS.hashInsert)
          : (isDark ? COLORS.hashCheckDark : COLORS.hashCheck)
      } else if (isSet) {
        ctx.fillStyle = isDark ? COLORS.bitOnDark : COLORS.bitOn
      } else {
        ctx.fillStyle = isDark ? COLORS.bitOffDark : COLORS.bitOff
      }
      ctx.fill()

      ctx.strokeStyle = isDark ? COLORS.bitStrokeDark : COLORS.bitStroke
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Bit value text
      if (actualCellSize >= 14) {
        ctx.font = `bold ${Math.min(11, actualCellSize * 0.5)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isSet || isHighlighted ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280')
        ctx.fillText(isSet ? '1' : '0', x + actualCellSize / 2, y + actualCellSize / 2)
      }

      // Index label for every 8th or highlighted
      if (actualCellSize >= 16 && (i % 8 === 0 || isHighlighted)) {
        ctx.font = `${Math.max(7, actualCellSize * 0.3)}px system-ui`
        ctx.textAlign = 'center'
        ctx.fillStyle = isDark ? COLORS.indexTextDark : COLORS.indexText
        ctx.fillText(String(i), x + actualCellSize / 2, y - 4)
      }
    }

    // Stats bar at bottom
    const statsY = startY + gridHeight + 20
    if (statsY < height - 20) {
      // Fill rate bar
      const barX = padding
      const barW = width - 2 * padding
      const barH = 12
      const fillRate = setBits / m

      ctx.fillStyle = isDark ? '#1f2937' : '#f3f4f6'
      ctx.beginPath()
      ctx.roundRect(barX, statsY, barW, barH, 6)
      ctx.fill()

      if (fillRate > 0) {
        const gradient = ctx.createLinearGradient(barX, 0, barX + barW * fillRate, 0)
        gradient.addColorStop(0, isDark ? '#3b82f6' : '#3b82f6')
        gradient.addColorStop(1, fillRate > 0.5 ? (isDark ? '#ef4444' : '#ef4444') : (isDark ? '#60a5fa' : '#60a5fa'))
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(barX, statsY, barW * fillRate, barH, 6)
        ctx.fill()
      }

      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillStyle = isDark ? COLORS.labelTextDark : COLORS.labelText
      ctx.fillText(`${(fillRate * 100).toFixed(1)}%`, width / 2, statsY + barH + 14)

      // Inserted items list
      if (insertedItems.length > 0 && statsY + barH + 30 < height) {
        ctx.font = '10px system-ui'
        ctx.textAlign = 'left'
        ctx.fillStyle = isDark ? COLORS.labelTextDark : COLORS.labelText
        const itemsText = insertedItems.slice(-8).join(', ') + (insertedItems.length > 8 ? '...' : '')
        ctx.fillText(`Inserted: ${itemsText}`, padding, statsY + barH + 30)
      }
    }
  }, [bits, m, k, highlightPositions, highlightColor, insertedItems, isDark, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl"
    />
  )
}
