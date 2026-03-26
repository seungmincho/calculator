'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type CellType } from '@/utils/algorithm/bfsDfs'

interface AStarCanvas2DProps {
  grid: CellType[][]
  start: [number, number]
  goal: [number, number]
  openCells: Map<string, { f: number; g: number; h: number }>   // key="row,col"
  closedCells: Map<string, { f: number; g: number; h: number }>
  pathCells: Set<string>
  currentCell: { row: number; col: number } | null
  drawMode: 'wall' | 'erase' | 'start' | 'goal'
  onGridChange: (grid: CellType[][]) => void
  onStartChange: (pos: [number, number]) => void
  onGoalChange: (pos: [number, number]) => void
  isRunning?: boolean
  showCosts?: boolean  // toggle f/g/h display
  width?: number
  height?: number
}

const COLORS = {
  empty: '#ffffff',
  emptyDark: '#1f2937',          // gray-800
  wall: '#374151',               // gray-700
  wallDark: '#9ca3af',           // gray-400
  start: '#10b981',              // emerald-500
  goal: '#ef4444',               // red-500
  path: '#34d399',               // emerald-400
  pathBorder: '#059669',         // emerald-600
  current: '#3b82f6',            // blue-500
  currentGlow: '#93c5fd',        // blue-300
  gridLine: '#e5e7eb',           // gray-200
  gridLineDark: '#374151',       // gray-700
  text: '#111827',               // gray-900
  textDark: '#f9fafb',           // gray-50
  // Open set (frontier) — amber gradient: low f = light amber, high f = dark amber
  openLow: '#fef3c7',            // amber-100
  openHigh: '#d97706',           // amber-600
  openLowDark: '#92400e',        // amber-800
  openHighDark: '#451a03',       // amber-950 approx
  // Closed set (visited) — blue gradient: low f = light blue, high f = dark blue
  closedLow: '#dbeafe',          // blue-100
  closedHigh: '#1d4ed8',         // blue-700
  closedLowDark: '#1e3a5f',      // blue-900-ish
  closedHighDark: '#172554',     // blue-950
}

/** Linearly interpolate between two hex colors by t in [0,1] */
function lerpColor(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = parse(hex1)
  const [r2, g2, b2] = parse(hex2)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

/** Normalise a cost value into [0,1] given a range. Returns 0 when range is 0. */
function normalise(val: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.max(0, Math.min(1, (val - min) / (max - min)))
}

export default function AStarCanvas2D({
  grid,
  start,
  goal,
  openCells,
  closedCells,
  pathCells,
  currentCell,
  drawMode,
  onGridChange,
  onStartChange,
  onGoalChange,
  isRunning = false,
  showCosts = true,
  width = 600,
  height = 450,
}: AStarCanvas2DProps) {
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

    // Pre-compute f-value ranges for gradient normalisation
    const openFValues = Array.from(openCells.values()).map(v => v.f)
    const closedFValues = Array.from(closedCells.values()).map(v => v.f)
    const openFMin = openFValues.length ? Math.min(...openFValues) : 0
    const openFMax = openFValues.length ? Math.max(...openFValues) : 1
    const closedFMin = closedFValues.length ? Math.min(...closedFValues) : 0
    const closedFMax = closedFValues.length ? Math.max(...closedFValues) : 1

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        const key = `${r},${c}`
        const cellType = grid[r][c]
        const isStart = r === start[0] && c === start[1]
        const isGoal = r === goal[0] && c === goal[1]
        const isCurrent = !!(currentCell && currentCell.row === r && currentCell.col === c)

        // Background color
        let fillColor: string
        if (isStart) {
          fillColor = COLORS.start
        } else if (isGoal) {
          fillColor = COLORS.goal
        } else if (pathCells.has(key)) {
          fillColor = COLORS.path
        } else if (isCurrent) {
          fillColor = COLORS.current
        } else if (openCells.has(key)) {
          const t = normalise(openCells.get(key)!.f, openFMin, openFMax)
          fillColor = isDark
            ? lerpColor(COLORS.openLowDark, COLORS.openHighDark, t)
            : lerpColor(COLORS.openLow, COLORS.openHigh, t)
        } else if (closedCells.has(key)) {
          const t = normalise(closedCells.get(key)!.f, closedFMin, closedFMax)
          fillColor = isDark
            ? lerpColor(COLORS.closedLowDark, COLORS.closedHighDark, t)
            : lerpColor(COLORS.closedLow, COLORS.closedHigh, t)
        } else if (cellType === 'wall') {
          fillColor = isDark ? COLORS.wallDark : COLORS.wall
        } else {
          fillColor = isDark ? COLORS.emptyDark : COLORS.empty
        }

        ctx.fillStyle = fillColor
        ctx.fillRect(x, y, cellSize, cellSize)

        // Path cells get thicker border
        if (pathCells.has(key) && !isStart && !isGoal) {
          ctx.strokeStyle = COLORS.pathBorder
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        }

        // Grid lines
        ctx.strokeStyle = isDark ? COLORS.gridLineDark : COLORS.gridLine
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cellSize, cellSize)

        // Cost labels
        if (showCosts && !isStart && !isGoal && !pathCells.has(key) && !isCurrent) {
          const costEntry = openCells.get(key) ?? closedCells.get(key)
          if (costEntry) {
            // Choose text color based on background brightness
            const isOpenCell = openCells.has(key)
            const isClosedCell = closedCells.has(key)
            // Light backgrounds (low gradient t in light mode / high gradient t in dark mode)
            // Use white on dark fills, dark on light fills
            let textColor: string
            if (isDark) {
              textColor = COLORS.textDark
            } else {
              const t = isOpenCell
                ? normalise(costEntry.f, openFMin, openFMax)
                : isClosedCell
                  ? normalise(costEntry.f, closedFMin, closedFMax)
                  : 0
              // Darker fills (t > 0.5) → white text; lighter fills → dark text
              textColor = t > 0.5 ? '#ffffff' : COLORS.text
            }

            ctx.fillStyle = textColor
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            if (cellSize >= 40) {
              // Show g (top-left), h (top-right), f (center)
              const smallSize = Math.max(7, Math.floor(cellSize * 0.22))
              const fSize = Math.max(9, Math.floor(cellSize * 0.28))
              const pad = Math.floor(cellSize * 0.12)

              // g — top left
              ctx.font = `${smallSize}px system-ui`
              ctx.textAlign = 'left'
              ctx.textBaseline = 'top'
              ctx.fillText(String(costEntry.g), x + pad, y + pad)

              // h — top right
              ctx.textAlign = 'right'
              ctx.fillText(String(costEntry.h), x + cellSize - pad, y + pad)

              // f — center
              ctx.font = `bold ${fSize}px system-ui`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(String(costEntry.f), x + cellSize / 2, y + cellSize / 2)
            } else if (cellSize >= 28) {
              // Show only f centered
              const fSize = Math.max(8, Math.floor(cellSize * 0.32))
              ctx.font = `bold ${fSize}px system-ui`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(String(costEntry.f), x + cellSize / 2, y + cellSize / 2)
            }
            // cellSize < 28: no text — too small
          }
        }
      }
    }

    // Labels for start and goal
    const labelSize = Math.max(10, Math.min(16, cellSize * 0.5))
    ctx.font = `bold ${labelSize}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'

    ctx.fillText(
      'S',
      offsetX + start[1] * cellSize + cellSize / 2,
      offsetY + start[0] * cellSize + cellSize / 2
    )

    ctx.fillText(
      'G',
      offsetX + goal[1] * cellSize + cellSize / 2,
      offsetY + goal[0] * cellSize + cellSize / 2
    )

    // Current cell glow effect
    if (currentCell) {
      const cx = offsetX + currentCell.col * cellSize
      const cy = offsetY + currentCell.row * cellSize
      ctx.save()
      ctx.strokeStyle = COLORS.currentGlow
      ctx.lineWidth = 3
      ctx.shadowColor = COLORS.currentGlow
      ctx.shadowBlur = 10
      ctx.strokeRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4)
      ctx.restore()
    }

    cancelAnimationFrame(animFrameRef.current)
  }, [
    grid, start, goal, openCells, closedCells, pathCells, currentCell,
    width, height, rows, cols, cellSize, offsetX, offsetY, isDark, showCosts,
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
