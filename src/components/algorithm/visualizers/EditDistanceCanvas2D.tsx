'use client'
import { useRef, useEffect, useState } from 'react'

export interface EditDistanceCanvas2DProps {
  str1: string
  str2: string
  dp: number[][]
  arrows: ('diag-match' | 'diag-replace' | 'up' | 'left' | 'none')[][]
  activeRow: number
  activeCol: number
  filledCells: Set<string>
  tracebackCells: Set<string>
  matchCells: Set<string>
  replaceCells: Set<string>
  deleteCells: Set<string>
  insertCells: Set<string>
  distance: number
  width?: number
  height?: number
}

const CELL_W = 42
const CELL_H = 36
const HEADER_W = 36
const HEADER_H = 28
const PADDING = 20

const C = {
  bg:           { light: '#f8fafc', dark: '#111827' },
  text:         { light: '#1e293b', dark: '#f1f5f9' },
  textSub:      { light: '#64748b', dark: '#94a3b8' },
  cellDefault:  { fill: { light: '#f8fafc', dark: '#1f2937' }, border: { light: '#e2e8f0', dark: '#374151' } },
  cellActive:   { fill: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  cellFilled:   { fill: { light: '#ecfeff', dark: '#164e63' }, border: '#0891b2' },
  cellMatch:    { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  cellReplace:  { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  cellDelete:   { fill: { light: '#fee2e2', dark: '#450a0a' }, border: '#dc2626' },
  cellInsert:   { fill: { light: '#ede9fe', dark: '#2e1065' }, border: '#7c3aed' },
  cellTrace:    { fill: { light: '#fef3c7', dark: '#451a03' }, border: '#d97706' },
  header:       { fill: { light: '#f1f5f9', dark: '#1e293b' }, text: { light: '#475569', dark: '#94a3b8' } },
  arrow:        { light: '#94a3b8', dark: '#64748b' },
}

export default function EditDistanceCanvas2D({
  str1, str2, dp, arrows,
  activeRow, activeCol, filledCells, tracebackCells,
  matchCells, replaceCells, deleteCells, insertCells,
  distance, width = 700, height = 400,
}: EditDistanceCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const cc = (pair: { light: string; dark: string }) => isDark ? pair.dark : pair.light

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const m = str1.length
    const n = str2.length
    const cols = n + 1
    const rows = m + 1
    const totalW = PADDING * 2 + HEADER_W + cols * CELL_W
    const totalH = PADDING * 2 + HEADER_H + rows * CELL_H

    // Compute scale to fit
    const scale = Math.min(width / totalW, height / totalH, 1)
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // Center
    const offsetX = (width - totalW * scale) / 2
    const offsetY = (height - totalH * scale) / 2
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    const ox = PADDING + HEADER_W
    const oy = PADDING + HEADER_H

    // ── Column headers (str2) ──
    ctx.font = 'bold 12px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Empty corner + index 0
    ctx.fillStyle = cc(C.header.text)
    ctx.fillText('', ox + CELL_W / 2, PADDING + HEADER_H / 2)

    for (let j = 0; j <= n; j++) {
      const x = ox + j * CELL_W
      const y = PADDING
      ctx.fillStyle = cc(C.header.fill)
      ctx.fillRect(x, y, CELL_W, HEADER_H)
      ctx.fillStyle = cc(C.header.text)
      if (j === 0) {
        ctx.fillText('\u2205', x + CELL_W / 2, y + HEADER_H / 2)
      } else {
        ctx.fillText(str2[j - 1], x + CELL_W / 2, y + HEADER_H / 2)
      }
    }

    // ── Row headers (str1) ──
    for (let i = 0; i <= m; i++) {
      const x = PADDING
      const y = oy + i * CELL_H
      ctx.fillStyle = cc(C.header.fill)
      ctx.fillRect(x, y, HEADER_W, CELL_H)
      ctx.fillStyle = cc(C.header.text)
      if (i === 0) {
        ctx.fillText('\u2205', x + HEADER_W / 2, y + CELL_H / 2)
      } else {
        ctx.fillText(str1[i - 1], x + HEADER_W / 2, y + CELL_H / 2)
      }
    }

    // ── Draw cells ──
    for (let i = 0; i <= m; i++) {
      for (let j = 0; j <= n; j++) {
        const x = ox + j * CELL_W
        const y = oy + i * CELL_H
        const key = `${i}-${j}`
        const isActive = i === activeRow && j === activeCol
        const isTraceback = tracebackCells.has(key)
        const isFilled = filledCells.has(key)
        const isMatch = matchCells.has(key)
        const isReplace = replaceCells.has(key)
        const isDelete = deleteCells.has(key)
        const isInsert = insertCells.has(key)

        // Fill
        if (isActive) {
          ctx.fillStyle = C.cellActive.fill
        } else if (isMatch) {
          ctx.fillStyle = cc(C.cellMatch.fill)
        } else if (isReplace) {
          ctx.fillStyle = cc(C.cellReplace.fill)
        } else if (isDelete) {
          ctx.fillStyle = cc(C.cellDelete.fill)
        } else if (isInsert) {
          ctx.fillStyle = cc(C.cellInsert.fill)
        } else if (isTraceback) {
          ctx.fillStyle = cc(C.cellTrace.fill)
        } else if (isFilled) {
          ctx.fillStyle = cc(C.cellFilled.fill)
        } else {
          ctx.fillStyle = cc(C.cellDefault.fill)
        }
        ctx.fillRect(x, y, CELL_W, CELL_H)

        // Border
        if (isActive) {
          ctx.strokeStyle = C.cellActive.border
          ctx.lineWidth = 2
        } else if (isMatch) {
          ctx.strokeStyle = C.cellMatch.border
          ctx.lineWidth = 1.5
        } else if (isReplace) {
          ctx.strokeStyle = C.cellReplace.border
          ctx.lineWidth = 1.5
        } else if (isDelete) {
          ctx.strokeStyle = C.cellDelete.border
          ctx.lineWidth = 1.5
        } else if (isInsert) {
          ctx.strokeStyle = C.cellInsert.border
          ctx.lineWidth = 1.5
        } else if (isTraceback) {
          ctx.strokeStyle = C.cellTrace.border
          ctx.lineWidth = 1.5
        } else if (isFilled) {
          ctx.strokeStyle = C.cellFilled.border
          ctx.lineWidth = 1
        } else {
          ctx.strokeStyle = cc(C.cellDefault.border)
          ctx.lineWidth = 0.5
        }
        ctx.strokeRect(x, y, CELL_W, CELL_H)

        // Value
        if (isFilled || i === 0 || j === 0 || isActive) {
          ctx.font = 'bold 12px system-ui'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = isActive ? C.cellActive.text : cc(C.text)
          ctx.fillText(String(dp[i]?.[j] ?? ''), x + CELL_W / 2, y + CELL_H / 2)
        }

        // Arrow indicator (small)
        if (isFilled && i > 0 && j > 0 && !isActive) {
          const arrow = arrows[i]?.[j]
          ctx.font = '8px system-ui'
          ctx.fillStyle = cc(C.arrow)
          if (arrow === 'diag-match' || arrow === 'diag-replace') {
            ctx.fillText('\u2196', x + 4, y + 10) // ↖
          } else if (arrow === 'up') {
            ctx.fillText('\u2191', x + 4, y + 10) // ↑
          } else if (arrow === 'left') {
            ctx.fillText('\u2190', x + 4, y + 10) // ←
          }
        }
      }
    }

    ctx.restore()
  }, [str1, str2, dp, arrows, activeRow, activeCol, filledCells, tracebackCells, matchCells, replaceCells, deleteCells, insertCells, distance, isDark, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, touchAction: 'none' }}
      className="rounded-xl"
    />
  )
}
