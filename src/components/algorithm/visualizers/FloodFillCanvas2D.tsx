'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type CellColor } from '@/utils/algorithm/floodFill'

// 8 vibrant colors for the palette
export const COLOR_PALETTE: string[] = [
  '#ef4444', // 0 red
  '#f97316', // 1 orange
  '#eab308', // 2 yellow
  '#22c55e', // 3 green
  '#06b6d4', // 4 cyan
  '#3b82f6', // 5 blue
  '#a855f7', // 6 purple
  '#ec4899', // 7 pink
]

// Darker variants for dark mode (slightly desaturated)
const COLOR_PALETTE_DARK: string[] = [
  '#dc2626', // 0
  '#ea580c', // 1
  '#ca8a04', // 2
  '#16a34a', // 3
  '#0891b2', // 4
  '#2563eb', // 5
  '#9333ea', // 6
  '#db2777', // 7
]

interface FloodFillCanvas2DProps {
  grid: CellColor[][]
  currentCell: { row: number; col: number } | null
  filledCells: Set<string>
  frontierCells: Set<string>
  newColor: number
  onCellClick?: (row: number, col: number) => void
  onColorPick?: (color: number) => void
  width?: number
  height?: number
}

export default function FloodFillCanvas2D({
  grid,
  currentCell,
  filledCells,
  frontierCells,
  newColor,
  onCellClick,
  width = 600,
  height = 450,
}: FloodFillCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)
  const animTickRef = useRef(0)

  const rows = grid.length
  const cols = grid[0]?.length || 1
  const cellSize = Math.min(Math.floor(width / cols), Math.floor(height / rows))
  const gridWidth = cellSize * cols
  const gridHeight = cellSize * rows
  const offsetX = Math.floor((width - gridWidth) / 2)
  const offsetY = Math.floor((height - gridHeight) / 2)

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const getCellFromPos = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const x = (clientX - rect.left) * scaleX - offsetX
      const y = (clientY - rect.top) * scaleY - offsetY
      const col = Math.floor(x / cellSize)
      const row = Math.floor(y / cellSize)
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null
      return [row, col]
    },
    [width, height, offsetX, offsetY, cellSize, rows, cols]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPos(e.clientX, e.clientY)
      if (!cell) return
      onCellClick?.(cell[0], cell[1])
    },
    [getCellFromPos, onCellClick]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPos(e.clientX, e.clientY)
      if (!cell) {
        setHoverCell(null)
        return
      }
      setHoverCell({ row: cell[0], col: cell[1] })
    },
    [getCellFromPos]
  )

  const handleMouseLeave = useCallback(() => setHoverCell(null), [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      const cell = getCellFromPos(touch.clientX, touch.clientY)
      if (!cell) return
      onCellClick?.(cell[0], cell[1])
    },
    [getCellFromPos, onCellClick]
  )

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

    const palette = isDark ? COLOR_PALETTE_DARK : COLOR_PALETTE

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        const key = `${r},${c}`
        const colorIdx = grid[r][c]

        // Base color
        ctx.fillStyle = palette[colorIdx] ?? palette[0]
        ctx.fillRect(x, y, cellSize, cellSize)

        // Filled cells: overlay new color with a slight brightness boost
        if (filledCells.has(key)) {
          ctx.fillStyle = palette[newColor] ?? palette[0]
          ctx.fillRect(x, y, cellSize, cellSize)

          // Subtle inner glow
          ctx.save()
          ctx.fillStyle = 'rgba(255,255,255,0.18)'
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          ctx.restore()
        }

        // Frontier cells: bright white border
        if (frontierCells.has(key)) {
          ctx.save()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(2, cellSize * 0.12)
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur = 6
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          ctx.restore()
        }

        // Grid lines
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cellSize, cellSize)
      }
    }

    // Current cell: pulsing highlight
    if (currentCell) {
      const cx = offsetX + currentCell.col * cellSize
      const cy = offsetY + currentCell.row * cellSize
      ctx.save()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(2.5, cellSize * 0.15)
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 12
      ctx.strokeRect(cx + 1.5, cy + 1.5, cellSize - 3, cellSize - 3)

      // Inner highlight dot
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      const dotSize = Math.max(3, cellSize * 0.25)
      ctx.fillRect(
        cx + cellSize / 2 - dotSize / 2,
        cy + cellSize / 2 - dotSize / 2,
        dotSize,
        dotSize
      )
      ctx.restore()
    }

    // Hover cell hint (paint bucket cursor effect)
    if (hoverCell) {
      const hx = offsetX + hoverCell.col * cellSize
      const hy = offsetY + hoverCell.row * cellSize
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(hx + 1, hy + 1, cellSize - 2, cellSize - 2)

      // Show the target new color as an overlay tint
      ctx.fillStyle = (palette[newColor] ?? palette[0]) + '55'
      ctx.fillRect(hx + 1, hy + 1, cellSize - 2, cellSize - 2)
      ctx.restore()
    }

    animTickRef.current++
  }, [
    grid, currentCell, filledCells, frontierCells, newColor, hoverCell,
    width, height, rows, cols, cellSize, offsetX, offsetY, isDark,
  ])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-cell"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    />
  )
}
