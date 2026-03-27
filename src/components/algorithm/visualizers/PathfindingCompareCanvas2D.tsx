'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type CellType } from '@/utils/algorithm/pathfindingCompare'

export interface PathfindingCompareCanvas2DProps {
  grid: CellType[][]
  astarVisited: Set<string>
  dijkstraVisited: Set<string>
  astarEnqueued: Set<string>
  dijkstraEnqueued: Set<string>
  astarPath: [number, number][]
  dijkstraPath: [number, number][]
  start: [number, number]
  end: [number, number]
  onCellClick: (row: number, col: number) => void
  onCellDrag: (row: number, col: number) => void
  placementMode: 'wall' | 'start' | 'end' | 'erase'
  width?: number
  height?: number
}

const C = {
  bg:              { light: '#f8fafc', dark: '#111827' },
  empty:           { light: '#ffffff', dark: '#1e293b' },
  wall:            { light: '#334155', dark: '#64748b' },
  start:           '#22c55e',
  end:             '#ef4444',
  astarVisited:    'rgba(59,130,246,0.35)',
  dijkstraVisited: 'rgba(249,115,22,0.35)',
  astarEnqueued:   'rgba(59,130,246,0.15)',
  dijkstraEnqueued:'rgba(249,115,22,0.15)',
  astarPath:       '#2563eb',
  dijkstraPath:    '#ea580c',
  bothVisited:     'rgba(139,92,246,0.4)',
  grid:            { light: '#e2e8f0', dark: '#374151' },
}

export default function PathfindingCompareCanvas2D({
  grid, astarVisited, dijkstraVisited, astarEnqueued, dijkstraEnqueued,
  astarPath, dijkstraPath, start, end,
  onCellClick, onCellDrag, placementMode,
  width = 700, height = 500,
}: PathfindingCompareCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const rows = grid.length
  const cols = grid[0]?.length || 0
  const cellSize = Math.min(Math.floor((width - 20) / cols), Math.floor((height - 20) / rows), 30)
  const gridW = cellSize * cols
  const gridH = cellSize * rows
  const offsetX = (width - gridW) / 2
  const offsetY = (height - gridH) / 2

  const astarPathSet = new Set(astarPath.map(([r, c]) => `${r},${c}`))
  const dijkstraPathSet = new Set(dijkstraPath.map(([r, c]) => `${r},${c}`))

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

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize
        const y = offsetY + r * cellSize
        const key = `${r},${c}`
        const cell = grid[r][c]

        // Base color
        if (cell === 'wall') {
          ctx.fillStyle = isDark ? C.wall.dark : C.wall.light
        } else {
          ctx.fillStyle = isDark ? C.empty.dark : C.empty.light
        }
        ctx.fillRect(x, y, cellSize, cellSize)

        if (cell === 'wall') continue

        // Enqueued (frontier)
        const aE = astarEnqueued.has(key)
        const dE = dijkstraEnqueued.has(key)
        if (aE && dE) {
          // Both enqueued - split
          ctx.fillStyle = C.astarEnqueued
          ctx.fillRect(x, y, cellSize / 2, cellSize)
          ctx.fillStyle = C.dijkstraEnqueued
          ctx.fillRect(x + cellSize / 2, y, cellSize / 2, cellSize)
        } else if (aE) {
          ctx.fillStyle = C.astarEnqueued
          ctx.fillRect(x, y, cellSize, cellSize)
        } else if (dE) {
          ctx.fillStyle = C.dijkstraEnqueued
          ctx.fillRect(x, y, cellSize, cellSize)
        }

        // Visited
        const aV = astarVisited.has(key)
        const dV = dijkstraVisited.has(key)
        if (aV && dV) {
          ctx.fillStyle = C.bothVisited
          ctx.fillRect(x, y, cellSize, cellSize)
        } else if (aV) {
          ctx.fillStyle = C.astarVisited
          ctx.fillRect(x, y, cellSize, cellSize)
        } else if (dV) {
          ctx.fillStyle = C.dijkstraVisited
          ctx.fillRect(x, y, cellSize, cellSize)
        }

        // Paths
        const aP = astarPathSet.has(key)
        const dP = dijkstraPathSet.has(key)
        if (aP && dP) {
          // Both paths - diagonal split
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.lineTo(x, y + cellSize); ctx.closePath()
          ctx.fillStyle = C.astarPath; ctx.globalAlpha = 0.7; ctx.fill()
          ctx.beginPath()
          ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.lineTo(x, y + cellSize); ctx.closePath()
          ctx.fillStyle = C.dijkstraPath; ctx.fill()
          ctx.restore()
        } else if (aP) {
          ctx.save(); ctx.globalAlpha = 0.7
          ctx.fillStyle = C.astarPath; ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
          ctx.restore()
        } else if (dP) {
          ctx.save(); ctx.globalAlpha = 0.7
          ctx.fillStyle = C.dijkstraPath; ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
          ctx.restore()
        }

        // Start / End
        if (r === start[0] && c === start[1]) {
          ctx.fillStyle = C.start
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
          ctx.font = `bold ${cellSize * 0.5}px system-ui`
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('S', x + cellSize / 2, y + cellSize / 2)
        }
        if (r === end[0] && c === end[1]) {
          ctx.fillStyle = C.end
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
          ctx.font = `bold ${cellSize * 0.5}px system-ui`
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('E', x + cellSize / 2, y + cellSize / 2)
        }

        // Grid line
        ctx.strokeStyle = isDark ? C.grid.dark : C.grid.light
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cellSize, cellSize)
      }
    }
  }, [grid, astarVisited, dijkstraVisited, astarEnqueued, dijkstraEnqueued,
      astarPathSet, dijkstraPathSet, start, end, rows, cols, cellSize, offsetX, offsetY,
      width, height, isDark])

  const getCellFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent): [number, number] | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left - offsetX
    const y = clientY - rect.top - offsetY
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null
    return [row, col]
  }, [offsetX, offsetY, cellSize, rows, cols])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    const cell = getCellFromEvent(e)
    if (cell) onCellClick(cell[0], cell[1])
  }, [getCellFromEvent, onCellClick])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const cell = getCellFromEvent(e)
    if (cell) onCellDrag(cell[0], cell[1])
  }, [getCellFromEvent, onCellDrag])

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    const cell = getCellFromEvent(e)
    if (cell) onCellClick(cell[0], cell[1])
  }, [getCellFromEvent, onCellClick])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const cell = getCellFromEvent(e)
    if (cell) onCellDrag(cell[0], cell[1])
  }, [getCellFromEvent, onCellDrag])

  const handleTouchEnd = useCallback(() => { isDraggingRef.current = false }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  )
}
