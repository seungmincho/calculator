'use client'
import { useRef, useEffect, useState } from 'react'
import type { NQueensStep } from '@/utils/algorithm/nQueens'
import { getAttackedCellsArray } from '@/utils/algorithm/nQueens'

interface NQueensCanvas2DProps {
  step: NQueensStep | null
  n: number
  width?: number
  height?: number
}

const COLORS = {
  lightSquare: '#f3f4f6',
  darkSquare: '#d1d5db',
  lightSquareDark: '#374151',
  darkSquareDark: '#4b5563',
  queen: '#7c3aed',
  queenDark: '#a78bfa',
  conflict: 'rgba(239, 68, 68, 0.35)',
  conflictQueen: '#ef4444',
  attacked: 'rgba(239, 68, 68, 0.12)',
  attackedDark: 'rgba(239, 68, 68, 0.2)',
  current: 'rgba(251, 191, 36, 0.4)',
  solution: 'rgba(52, 211, 153, 0.25)',
  text: '#374151',
  textDark: '#d1d5db',
}

export default function NQueensCanvas2D({
  step,
  n,
  width = 420,
  height = 420,
}: NQueensCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Dark mode observer
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

    const margin = 25
    const boardSize = Math.min(width, height) - margin * 2
    const cellSize = boardSize / n
    const offsetX = (width - boardSize) / 2
    const offsetY = (height - boardSize) / 2

    const board = step?.board ?? new Array(n).fill(-1)

    // Compute attacked cells for visual overlay
    const attackedCells = step ? getAttackedCellsArray(board, n) : []
    const attackedSet = new Set(attackedCells.map(([r, c]) => `${r},${c}`))

    // Conflict cells
    const conflictSet = new Set(
      (step?.conflicts ?? []).map(([r, c]) => `${r},${c}`)
    )

    // Draw board
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = offsetX + col * cellSize
        const y = offsetY + row * cellSize

        // Base color (checkerboard)
        const isLight = (row + col) % 2 === 0
        ctx.fillStyle = isDark
          ? (isLight ? COLORS.lightSquareDark : COLORS.darkSquareDark)
          : (isLight ? COLORS.lightSquare : COLORS.darkSquare)
        ctx.fillRect(x, y, cellSize, cellSize)

        // Attacked overlay (red tint)
        if (attackedSet.has(`${row},${col}`)) {
          ctx.fillStyle = isDark ? COLORS.attackedDark : COLORS.attacked
          ctx.fillRect(x, y, cellSize, cellSize)
        }

        // Conflict cell highlight
        if (conflictSet.has(`${row},${col}`)) {
          ctx.fillStyle = COLORS.conflict
          ctx.fillRect(x, y, cellSize, cellSize)
        }

        // Current cell being tried
        if (step && row === step.currentRow && col === step.currentCol && step.action !== 'done') {
          ctx.fillStyle = COLORS.current
          ctx.fillRect(x, y, cellSize, cellSize)
        }

        // Solution glow
        if (step?.action === 'solution') {
          ctx.fillStyle = COLORS.solution
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }
    }

    // Board border
    ctx.strokeStyle = isDark ? '#6b7280' : '#9ca3af'
    ctx.lineWidth = 1.5
    ctx.strokeRect(offsetX, offsetY, boardSize, boardSize)

    // Grid lines
    ctx.strokeStyle = isDark ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.4)'
    ctx.lineWidth = 0.5
    for (let i = 1; i < n; i++) {
      ctx.beginPath()
      ctx.moveTo(offsetX + i * cellSize, offsetY)
      ctx.lineTo(offsetX + i * cellSize, offsetY + boardSize)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY + i * cellSize)
      ctx.lineTo(offsetX + boardSize, offsetY + i * cellSize)
      ctx.stroke()
    }

    // Draw queens
    const fontSize = Math.max(12, Math.min(cellSize * 0.55, 30))
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let row = 0; row < n; row++) {
      const col = board[row]
      if (col < 0) continue

      const cx = offsetX + col * cellSize + cellSize / 2
      const cy = offsetY + row * cellSize + cellSize / 2

      // Is this queen in conflict?
      const isConflictQueen = step?.action === 'conflict' && row === step.currentRow && col === step.currentCol

      // Queen background circle
      ctx.save()
      if (isConflictQueen) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 12
      } else {
        ctx.fillStyle = isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.15)'
        ctx.shadowColor = isDark ? COLORS.queenDark : COLORS.queen
        ctx.shadowBlur = 8
      }
      ctx.beginPath()
      ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Queen emoji
      ctx.fillText('♛', cx, cy + 1)
    }

    // Row/col labels
    ctx.save()
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < n; i++) {
      // Column labels
      ctx.fillText(String(i), offsetX + i * cellSize + cellSize / 2, offsetY - 10)
      // Row labels
      ctx.fillText(String(i), offsetX - 12, offsetY + i * cellSize + cellSize / 2)
    }
    ctx.restore()
  }, [step, n, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl"
    />
  )
}
