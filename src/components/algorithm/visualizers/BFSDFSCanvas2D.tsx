'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type CellType } from '@/utils/algorithm/bfsDfs'

interface BFSDFSCanvas2DProps {
  grid: CellType[][]
  start: [number, number]
  goal: [number, number]
  visitedCells: Set<string>
  frontierCells: Set<string>
  pathCells: Set<string>
  currentCell: { row: number; col: number } | null
  drawMode: 'wall' | 'erase' | 'start' | 'goal'
  onGridChange: (grid: CellType[][]) => void
  onStartChange: (pos: [number, number]) => void
  onGoalChange: (pos: [number, number]) => void
  isRunning?: boolean
  width?: number
  height?: number
}

const COLORS = {
  empty: '#ffffff',
  emptyDark: '#1f2937',        // gray-800
  wall: '#374151',             // gray-700
  wallDark: '#9ca3af',         // gray-400
  start: '#10b981',            // emerald-500
  goal: '#ef4444',             // red-500
  visited: '#bfdbfe',          // blue-200
  visitedDark: '#1e3a5f',      // blue-900-ish
  frontier: '#fde047',         // yellow-300
  frontierDark: '#854d0e',     // yellow-800
  path: '#34d399',             // emerald-400
  pathBorder: '#059669',       // emerald-600
  current: '#3b82f6',          // blue-500
  gridLine: '#e5e7eb',         // gray-200
  gridLineDark: '#374151',     // gray-700
  text: '#111827',             // gray-900
  textDark: '#f9fafb',         // gray-50
}

export default function BFSDFSCanvas2D({
  grid,
  start,
  goal,
  visitedCells,
  frontierCells,
  pathCells,
  currentCell,
  drawMode,
  onGridChange,
  onStartChange,
  onGoalChange,
  isRunning = false,
  width = 600,
  height = 450,
}: BFSDFSCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const animFrameRef = useRef(0)

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

  // Get grid cell from canvas coordinates
  const getCellFromPos = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const scaleX = (width) / rect.width
      const scaleY = (height) / rect.height
      const x = (clientX - rect.left) * scaleX - offsetX
      const y = (clientY - rect.top) * scaleY - offsetY
      const col = Math.floor(x / cellSize)
      const row = Math.floor(y / cellSize)
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null
      return [row, col]
    },
    [width, height, offsetX, offsetY, cellSize, rows, cols]
  )

  // Apply draw action at cell
  const applyDraw = useCallback(
    (row: number, col: number) => {
      if (isRunning) return
      if (drawMode === 'start') {
        onStartChange([row, col])
        return
      }
      if (drawMode === 'goal') {
        onGoalChange([row, col])
        return
      }
      // Don't overwrite start/goal
      if (row === start[0] && col === start[1]) return
      if (row === goal[0] && col === goal[1]) return

      const newGrid = grid.map(r => [...r])
      if (drawMode === 'wall') {
        newGrid[row][col] = 'wall'
      } else {
        newGrid[row][col] = 'empty'
      }
      onGridChange(newGrid)
    },
    [isRunning, drawMode, grid, start, goal, onGridChange, onStartChange, onGoalChange]
  )

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPos(e.clientX, e.clientY)
      if (!cell) return
      setIsDrawing(true)
      applyDraw(cell[0], cell[1])
    },
    [getCellFromPos, applyDraw]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return
      const cell = getCellFromPos(e.clientX, e.clientY)
      if (!cell) return
      applyDraw(cell[0], cell[1])
    },
    [isDrawing, getCellFromPos, applyDraw]
  )

  const handleMouseUp = useCallback(() => setIsDrawing(false), [])

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const cell = getCellFromPos(touch.clientX, touch.clientY)
      if (!cell) return
      setIsDrawing(true)
      applyDraw(cell[0], cell[1])
    },
    [getCellFromPos, applyDraw]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDrawing || e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      const cell = getCellFromPos(touch.clientX, touch.clientY)
      if (!cell) return
      applyDraw(cell[0], cell[1])
    },
    [isDrawing, getCellFromPos, applyDraw]
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

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        const key = `${r},${c}`
        const cellType = grid[r][c]

        // Background color
        let fillColor: string
        if (r === start[0] && c === start[1]) {
          fillColor = COLORS.start
        } else if (r === goal[0] && c === goal[1]) {
          fillColor = COLORS.goal
        } else if (pathCells.has(key)) {
          fillColor = COLORS.path
        } else if (currentCell && currentCell.row === r && currentCell.col === c) {
          fillColor = COLORS.current
        } else if (frontierCells.has(key)) {
          fillColor = isDark ? COLORS.frontierDark : COLORS.frontier
        } else if (visitedCells.has(key)) {
          fillColor = isDark ? COLORS.visitedDark : COLORS.visited
        } else if (cellType === 'wall') {
          fillColor = isDark ? COLORS.wallDark : COLORS.wall
        } else {
          fillColor = isDark ? COLORS.emptyDark : COLORS.empty
        }

        ctx.fillStyle = fillColor
        ctx.fillRect(x, y, cellSize, cellSize)

        // Path cells get thicker border
        if (pathCells.has(key) && !(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])) {
          ctx.strokeStyle = COLORS.pathBorder
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        }

        // Grid lines
        ctx.strokeStyle = isDark ? COLORS.gridLineDark : COLORS.gridLine
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cellSize, cellSize)
      }
    }

    // Labels for start and goal
    const labelSize = Math.max(10, Math.min(16, cellSize * 0.5))
    ctx.font = `bold ${labelSize}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'

    // Start label
    ctx.fillText(
      'S',
      offsetX + start[1] * cellSize + cellSize / 2,
      offsetY + start[0] * cellSize + cellSize / 2
    )

    // Goal label
    ctx.fillText(
      'G',
      offsetX + goal[1] * cellSize + cellSize / 2,
      offsetY + goal[0] * cellSize + cellSize / 2
    )

    // Current cell pulsing effect
    if (currentCell) {
      const cx = offsetX + currentCell.col * cellSize
      const cy = offsetY + currentCell.row * cellSize
      ctx.save()
      ctx.strokeStyle = COLORS.current
      ctx.lineWidth = 3
      ctx.shadowColor = COLORS.current
      ctx.shadowBlur = 8
      ctx.strokeRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4)
      ctx.restore()
    }

    // Cancel any pending animation frame
    cancelAnimationFrame(animFrameRef.current)
  }, [
    grid, start, goal, visitedCells, frontierCells, pathCells, currentCell,
    width, height, rows, cols, cellSize, offsetX, offsetY, isDark,
  ])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className={`rounded-xl ${isRunning ? 'cursor-default' : drawMode === 'wall' || drawMode === 'erase' ? 'cursor-crosshair' : 'cursor-pointer'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setIsDrawing(false)}
    />
  )
}
