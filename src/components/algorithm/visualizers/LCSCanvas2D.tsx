'use client'
import { useRef, useEffect, useState, useCallback } from 'react'

export interface LCSCanvas2DProps {
  str1: string
  str2: string
  dp: number[][]
  arrows: ('diag' | 'up' | 'left' | 'none')[][]
  activeRow: number
  activeCol: number
  filledCells: Set<string>
  tracebackCells: Set<string>
  matchedCells: Set<string>     // traceback match cells
  lcsString: string
  width?: number
  height?: number
  onCellHover?: (row: number, col: number) => void
}

const CELL_W = 42
const CELL_H = 36
const HEADER_W = 36
const HEADER_H = 28
const PADDING = 20

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  cellDefault:{ fill: { light: '#f8fafc', dark: '#1f2937' }, border: { light: '#e2e8f0', dark: '#374151' } },
  cellActive: { fill: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  cellFilled: { fill: { light: '#ecfeff', dark: '#164e63' }, border: '#0891b2' },
  cellMatch:  { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  cellTrace:  { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  header:     { fill: { light: '#f1f5f9', dark: '#1e293b' }, text: { light: '#475569', dark: '#94a3b8' } },
  arrow:      { light: '#94a3b8', dark: '#64748b' },
}

export default function LCSCanvas2D({
  str1, str2, dp, arrows,
  activeRow, activeCol, filledCells, tracebackCells, matchedCells,
  lcsString,
  width = 700, height = 400, onCellHover,
}: LCSCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const rows = str1.length + 1
  const cols = str2.length + 1
  const logicalW = Math.max(width, PADDING * 2 + HEADER_W + cols * CELL_W + HEADER_W)
  const logicalH = Math.max(height, PADDING * 2 + HEADER_H + rows * CELL_H + 50)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellHover) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const col = Math.floor((mx - PADDING - HEADER_W) / CELL_W)
    const row = Math.floor((my - PADDING - HEADER_H) / CELL_H)
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      onCellHover(row, col)
    }
  }, [onCellHover, rows, cols])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    // Column headers (str2 chars)
    ctx.font = 'bold 12px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Empty corner
    ctx.fillStyle = isDark ? C.header.fill.dark : C.header.fill.light
    ctx.fillRect(PADDING, PADDING, HEADER_W, HEADER_H)

    for (let j = 0; j < cols; j++) {
      const x = PADDING + HEADER_W + j * CELL_W
      const y = PADDING
      ctx.fillStyle = isDark ? C.header.fill.dark : C.header.fill.light
      ctx.fillRect(x, y, CELL_W, HEADER_H)
      ctx.strokeStyle = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, CELL_W, HEADER_H)
      ctx.fillStyle = isDark ? C.header.text.dark : C.header.text.light
      ctx.fillText(j === 0 ? '-' : str2[j - 1], x + CELL_W / 2, y + HEADER_H / 2)
    }

    // Row headers (str1 chars)
    for (let i = 0; i < rows; i++) {
      const x = PADDING
      const y = PADDING + HEADER_H + i * CELL_H
      ctx.fillStyle = isDark ? C.header.fill.dark : C.header.fill.light
      ctx.fillRect(x, y, HEADER_W, CELL_H)
      ctx.strokeStyle = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, HEADER_W, CELL_H)
      ctx.fillStyle = isDark ? C.header.text.dark : C.header.text.light
      ctx.font = 'bold 12px system-ui'
      ctx.fillText(i === 0 ? '-' : str1[i - 1], x + HEADER_W / 2, y + CELL_H / 2)
    }

    // DP cells
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = PADDING + HEADER_W + j * CELL_W
        const y = PADDING + HEADER_H + i * CELL_H
        const key = `${i},${j}`
        const isActive = i === activeRow && j === activeCol
        const isMatch = matchedCells.has(key)
        const isTrace = tracebackCells.has(key)
        const isFilled = filledCells.has(key)

        let fill: string, border: string, textColor: string, lw = 0.5

        if (isActive) {
          fill = C.cellActive.fill; border = C.cellActive.border; textColor = C.cellActive.text; lw = 2.5
        } else if (isMatch) {
          fill = isDark ? C.cellMatch.fill.dark : C.cellMatch.fill.light
          border = C.cellMatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
        } else if (isTrace) {
          fill = isDark ? C.cellTrace.fill.dark : C.cellTrace.fill.light
          border = C.cellTrace.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
        } else if (isFilled) {
          fill = isDark ? C.cellFilled.fill.dark : C.cellFilled.fill.light
          border = C.cellFilled.border; textColor = isDark ? C.text.dark : C.text.light; lw = 1
        } else {
          fill = isDark ? C.cellDefault.fill.dark : C.cellDefault.fill.light
          border = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
          textColor = isDark ? C.text.dark : C.text.light
        }

        if (isActive) {
          ctx.save()
          ctx.shadowColor = 'rgba(6,182,212,0.5)'
          ctx.shadowBlur = 10
        }

        ctx.fillStyle = fill
        ctx.fillRect(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1)
        ctx.strokeStyle = border
        ctx.lineWidth = lw
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1)

        if (isActive) ctx.restore()

        // Value
        if (dp[i] && dp[i][j] !== undefined && (isFilled || isActive || isTrace || isMatch || i === 0 || j === 0)) {
          ctx.font = 'bold 12px system-ui'
          ctx.fillStyle = textColor
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(dp[i][j]), x + CELL_W / 2, y + CELL_H / 2)
        }

        // Arrow indicator
        if (arrows[i] && arrows[i][j] !== 'none' && (isFilled || isTrace || isMatch)) {
          const arrow = arrows[i][j]
          ctx.font = '10px system-ui'
          ctx.fillStyle = isDark ? C.arrow.dark : C.arrow.light
          const ax = x + 4
          const ay = y + 4
          if (arrow === 'diag') ctx.fillText('\u2196', ax, ay + 8)
          else if (arrow === 'up') ctx.fillText('\u2191', ax + 2, ay + 8)
          else if (arrow === 'left') ctx.fillText('\u2190', ax, ay + 8)
        }
      }
    }

    // LCS result string at bottom
    if (lcsString) {
      const resultY = PADDING + HEADER_H + rows * CELL_H + 20
      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = isDark ? C.text.dark : C.text.light
      ctx.textAlign = 'left'
      ctx.fillText(`LCS: "${lcsString}" (length: ${lcsString.length})`, PADDING, resultY)
    }
  }, [str1, str2, dp, arrows, activeRow, activeCol, filledCells, tracebackCells, matchedCells, lcsString, width, height, isDark, rows, cols, logicalW, logicalH])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
      onMouseMove={handleMouseMove}
    />
  )
}
