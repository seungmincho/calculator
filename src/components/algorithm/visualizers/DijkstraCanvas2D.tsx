'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type CellType } from '@/utils/algorithm/bfsDfs'

interface DijkstraCanvas2DProps {
  grid: CellType[][]
  weights: number[][]                    // weight per cell (1-5)
  start: [number, number]
  goal: [number, number]
  openCells: Map<string, number>         // key="row,col" → distance
  closedCells: Map<string, number>       // key="row,col" → distance
  pathCells: Set<string>
  currentCell: { row: number; col: number } | null
  drawMode: 'wall' | 'erase' | 'start' | 'goal'
  onGridChange: (grid: CellType[][]) => void
  onStartChange: (pos: [number, number]) => void
  onGoalChange: (pos: [number, number]) => void
  isRunning?: boolean
  showWeights?: boolean                  // toggle weight display
  showDistances?: boolean                // toggle distance display
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
  // Open set (frontier) — amber gradient: low dist = light, high dist = dark
  openLow: '#fef3c7',            // amber-100
  openHigh: '#d97706',           // amber-600
  openLowDark: '#92400e',        // amber-800
  openHighDark: '#451a03',       // amber-950 approx
  // Closed set (visited) — blue gradient: low dist = light, high dist = dark
  closedLow: '#dbeafe',          // blue-100
  closedHigh: '#1d4ed8',         // blue-700
  closedLowDark: '#1e3a5f',      // blue-900-ish
  closedHighDark: '#172554',     // blue-950
  // Weight terrain — earth tones: light beige (w=1) → dark brown (w=5)
  weightLight: '#faf5eb',        // warm white / beige (weight 1)
  weightDark: '#78350f',         // amber-900 / dark brown (weight 5)
  weightLightDark: '#292524',    // stone-900 (weight 1 in dark mode)
  weightHeavyDark: '#57534e',    // stone-600 (weight 5 in dark mode)
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

/** Normalise val into [0,1] given a range. Returns 0 when range is 0. */
function normalise(val: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.max(0, Math.min(1, (val - min) / (max - min)))
}

/** Map weight 1-5 to a t in [0,1] for terrain shading */
function weightToT(weight: number): number {
  return Math.max(0, Math.min(1, (weight - 1) / 4))
}

export default function DijkstraCanvas2D({
  grid,
  weights,
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
  showWeights = true,
  showDistances = true,
  width = 600,
  height = 450,
}: DijkstraCanvas2DProps) {
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

    // Pre-compute distance ranges for gradient normalisation
    const openDists = Array.from(openCells.values())
    const closedDists = Array.from(closedCells.values())
    const openMin = openDists.length ? Math.min(...openDists) : 0
    const openMax = openDists.length ? Math.max(...openDists) : 1
    const closedMin = closedDists.length ? Math.min(...closedDists) : 0
    const closedMax = closedDists.length ? Math.max(...closedDists) : 1

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
        const weight = weights[r]?.[c] ?? 1

        // Background color — priority: start/goal > path > current > open > closed > wall > terrain
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
          const t = normalise(openCells.get(key)!, openMin, openMax)
          fillColor = isDark
            ? lerpColor(COLORS.openLowDark, COLORS.openHighDark, t)
            : lerpColor(COLORS.openLow, COLORS.openHigh, t)
        } else if (closedCells.has(key)) {
          const t = normalise(closedCells.get(key)!, closedMin, closedMax)
          fillColor = isDark
            ? lerpColor(COLORS.closedLowDark, COLORS.closedHighDark, t)
            : lerpColor(COLORS.closedLow, COLORS.closedHigh, t)
        } else if (cellType === 'wall') {
          fillColor = isDark ? COLORS.wallDark : COLORS.wall
        } else {
          // Terrain weight shading for empty cells
          const t = weightToT(weight)
          fillColor = isDark
            ? lerpColor(COLORS.weightLightDark, COLORS.weightHeavyDark, t)
            : lerpColor(COLORS.weightLight, COLORS.weightDark, t)
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

        // Text labels: weight (corner) and/or distance (center)
        if (!isStart && !isGoal && cellType !== 'wall') {
          const showW = showWeights && cellSize >= 24
          const showD = showDistances && cellSize >= 28
          const dist = openCells.get(key) ?? closedCells.get(key)

          // Determine text color based on fill brightness
          let textColor: string
          if (isDark) {
            textColor = COLORS.textDark
          } else {
            // Estimate darkness: open/closed high-t fills are dark
            const isOpen = openCells.has(key)
            const isClosed = closedCells.has(key)
            let t = 0
            if (isOpen) t = normalise(openCells.get(key)!, openMin, openMax)
            else if (isClosed) t = normalise(closedCells.get(key)!, closedMin, closedMax)
            textColor = t > 0.5 ? '#ffffff' : COLORS.text
          }

          ctx.fillStyle = textColor

          // Weight in top-left corner
          if (showW && weight > 1) {
            const wSize = Math.max(7, Math.floor(cellSize * 0.22))
            const pad = Math.floor(cellSize * 0.1) + 1
            ctx.font = `${wSize}px system-ui`
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(String(weight), x + pad, y + pad)
          }

          // Distance centered (only when cell has been reached by the algorithm)
          if (showD && dist !== undefined && !pathCells.has(key) && !isCurrent) {
            const dSize = Math.max(8, Math.floor(cellSize * 0.30))
            ctx.font = `bold ${dSize}px system-ui`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            // Format: show integer if whole, else 1 decimal
            const label = Number.isInteger(dist) ? String(dist) : dist.toFixed(1)
            ctx.fillText(label, x + cellSize / 2, y + cellSize / 2)
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
    grid, weights, start, goal, openCells, closedCells, pathCells, currentCell,
    width, height, rows, cols, cellSize, offsetX, offsetY, isDark,
    showWeights, showDistances,
  ])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className={`rounded-xl ${
        isRunning
          ? 'cursor-default'
          : drawMode === 'wall' || drawMode === 'erase'
            ? 'cursor-crosshair'
            : 'cursor-pointer'
      }`}
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
