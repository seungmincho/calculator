'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { type KnapsackItem } from '@/utils/algorithm/knapsack'

export interface KnapsackCanvas2DProps {
  items: KnapsackItem[]
  capacity: number
  dp: number[][]
  activeRow: number
  activeCol: number
  filledCells: Set<string>      // "row,col" keys
  tracebackCells: Set<string>
  selectedItems: Set<number>    // item indices
  width?: number
  height?: number
  onCellHover?: (row: number, col: number) => void
}

const CELL_W = 44
const CELL_H = 36
const HEADER_W = 80
const HEADER_H = 28
const PADDING = 20

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  cellDefault:{ fill: { light: '#f8fafc', dark: '#1f2937' }, border: { light: '#e2e8f0', dark: '#374151' } },
  cellActive: { fill: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  cellFilled: { fill: { light: '#ecfeff', dark: '#164e63' }, border: '#0891b2' },
  cellTrace:  { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  cellSelected:{ fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  header:     { fill: { light: '#f1f5f9', dark: '#1e293b' }, text: { light: '#475569', dark: '#94a3b8' } },
}

export default function KnapsackCanvas2D({
  items, capacity, dp, activeRow, activeCol,
  filledCells, tracebackCells, selectedItems,
  width = 700, height = 400, onCellHover,
}: KnapsackCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const rows = items.length + 1
  const cols = capacity + 1
  const logicalW = Math.max(width, PADDING * 2 + HEADER_W + cols * CELL_W)
  const logicalH = Math.max(height, PADDING * 2 + HEADER_H + rows * CELL_H + 60)

  // Mouse hover
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

    // Background
    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    // Column headers (capacity 0..W)
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let j = 0; j < cols; j++) {
      const x = PADDING + HEADER_W + j * CELL_W
      const y = PADDING
      ctx.fillStyle = isDark ? C.header.fill.dark : C.header.fill.light
      ctx.fillRect(x, y, CELL_W, HEADER_H)
      ctx.strokeStyle = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, CELL_W, HEADER_H)
      ctx.fillStyle = isDark ? C.header.text.dark : C.header.text.light
      ctx.fillText(`w=${j}`, x + CELL_W / 2, y + HEADER_H / 2)
    }

    // Row headers (items)
    for (let i = 0; i < rows; i++) {
      const x = PADDING
      const y = PADDING + HEADER_H + i * CELL_H
      const isSelected = i > 0 && selectedItems.has(i - 1)

      ctx.fillStyle = isSelected
        ? (isDark ? C.cellSelected.fill.dark : C.cellSelected.fill.light)
        : (isDark ? C.header.fill.dark : C.header.fill.light)
      ctx.fillRect(x, y, HEADER_W, CELL_H)
      ctx.strokeStyle = isSelected ? C.cellSelected.border : (isDark ? C.cellDefault.border.dark : C.cellDefault.border.light)
      ctx.lineWidth = isSelected ? 2 : 0.5
      ctx.strokeRect(x, y, HEADER_W, CELL_H)

      ctx.fillStyle = isDark ? C.header.text.dark : C.header.text.light
      ctx.font = '12px system-ui'
      if (i === 0) {
        ctx.fillText('-', x + HEADER_W / 2, y + CELL_H / 2)
      } else {
        const item = items[i - 1]
        ctx.fillText(`${item.icon} w${item.weight}/v${item.value}`, x + HEADER_W / 2, y + CELL_H / 2)
      }
    }

    // DP cells
    ctx.font = 'bold 12px system-ui'
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = PADDING + HEADER_W + j * CELL_W
        const y = PADDING + HEADER_H + i * CELL_H
        const key = `${i},${j}`
        const isActive = i === activeRow && j === activeCol
        const isTrace = tracebackCells.has(key)
        const isFilled = filledCells.has(key)

        let fill: string, border: string, textColor: string, lw = 0.5

        if (isActive) {
          fill = C.cellActive.fill; border = C.cellActive.border; textColor = C.cellActive.text; lw = 2.5
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
        if (dp[i] && dp[i][j] !== undefined && (isFilled || isActive || isTrace)) {
          ctx.fillStyle = textColor
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(dp[i][j]), x + CELL_W / 2, y + CELL_H / 2)
        }
      }
    }

    // Selected items summary
    if (selectedItems.size > 0) {
      const summaryY = PADDING + HEADER_H + rows * CELL_H + 15
      ctx.font = 'bold 13px system-ui'
      ctx.fillStyle = isDark ? C.text.dark : C.text.light
      ctx.textAlign = 'left'
      let sx = PADDING
      for (const idx of selectedItems) {
        const item = items[idx]
        if (item) {
          ctx.fillText(`${item.icon}`, sx, summaryY)
          sx += 30
        }
      }
    }
  }, [items, capacity, dp, activeRow, activeCol, filledCells, tracebackCells, selectedItems, width, height, isDark, rows, cols, logicalW, logicalH])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
      onMouseMove={handleMouseMove}
    />
  )
}
