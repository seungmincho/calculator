'use client'
import { useRef, useEffect, useState } from 'react'

export interface SuffixArrayCanvas2DProps {
  text: string
  suffixArray: number[]
  lcpArray: number[]
  highlightIndices: number[]   // original text indices to highlight
  phase: 'build' | 'lcp' | 'search'
  searchLo?: number
  searchHi?: number
  searchMid?: number
  pattern: string
  matches: number[]
  width?: number
  height?: number
}

const CELL_W = 28
const CELL_H = 24
const PADDING = 20
const ROW_H = 26
const LABEL_W = 40
const LCP_BAR_MAX_W = 60

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  rowDefault: { fill: { light: '#ffffff', dark: '#1f2937' }, border: { light: '#e2e8f0', dark: '#374151' } },
  rowHighlight:{ fill: { light: '#fce7f3', dark: '#500724' }, border: '#ec4899' },
  rowMatch:   { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  rowSearchRange: { fill: { light: '#eff6ff', dark: '#1e3a5f' }, border: '#3b82f6' },
  rowSearchMid: { fill: { light: '#fef3c7', dark: '#78350f' }, border: '#f59e0b' },
  lcpBar:     { fill: { light: '#818cf8', dark: '#6366f1' } },
  charMatch:  { fill: { light: '#bbf7d0', dark: '#166534' } },
}

export default function SuffixArrayCanvas2D({
  text, suffixArray, lcpArray, highlightIndices, phase,
  searchLo, searchHi, searchMid, pattern, matches,
  width = 700, height = 400,
}: SuffixArrayCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1

    const n = suffixArray.length
    const maxChars = Math.min(text.length, 20)
    const suffixColW = maxChars * 10 + 20
    const lcpColW = LCP_BAR_MAX_W + 40
    const indexColW = 40

    const logicalW = Math.max(width, PADDING * 2 + LABEL_W + indexColW + suffixColW + lcpColW + 40)
    const logicalH = Math.max(height, PADDING * 2 + 30 + n * ROW_H + 10)
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    const highlightSet = new Set(highlightIndices)
    const matchSet = new Set(matches)

    // ── Header row ──
    const headerY = PADDING
    ctx.font = 'bold 10px system-ui'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light

    const col1X = PADDING + LABEL_W
    const col2X = col1X + indexColW
    const col3X = col2X + suffixColW
    const col4X = col3X + lcpColW

    ctx.textAlign = 'center'
    ctx.fillText('Rank', PADDING + LABEL_W / 2, headerY + ROW_H / 2)
    ctx.fillText('SA[i]', col1X + indexColW / 2, headerY + ROW_H / 2)
    ctx.textAlign = 'left'
    ctx.fillText('Suffix', col2X + 4, headerY + ROW_H / 2)
    ctx.fillText('LCP', col3X + 4, headerY + ROW_H / 2)

    // ── Draw each suffix row ──
    for (let rank = 0; rank < n; rank++) {
      const saIdx = suffixArray[rank]
      const suffix = text.substring(saIdx)
      const lcpVal = lcpArray[rank] || 0
      const y = headerY + ROW_H + rank * ROW_H

      const isHighlighted = highlightSet.has(saIdx)
      const isMatch = matchSet.has(saIdx)
      const inSearchRange = phase === 'search' && searchLo !== undefined && searchHi !== undefined && rank >= searchLo && rank <= searchHi
      const isMid = phase === 'search' && searchMid !== undefined && rank === searchMid

      // Row background
      let rowFill: string, rowBorder: string, lw = 0.5
      if (isMatch) {
        rowFill = isDark ? C.rowMatch.fill.dark : C.rowMatch.fill.light
        rowBorder = C.rowMatch.border; lw = 1.5
      } else if (isMid) {
        rowFill = isDark ? C.rowSearchMid.fill.dark : C.rowSearchMid.fill.light
        rowBorder = C.rowSearchMid.border; lw = 1.5
      } else if (isHighlighted) {
        rowFill = isDark ? C.rowHighlight.fill.dark : C.rowHighlight.fill.light
        rowBorder = C.rowHighlight.border; lw = 1
      } else if (inSearchRange) {
        rowFill = isDark ? C.rowSearchRange.fill.dark : C.rowSearchRange.fill.light
        rowBorder = C.rowSearchRange.border; lw = 0.5
      } else {
        rowFill = isDark ? C.rowDefault.fill.dark : C.rowDefault.fill.light
        rowBorder = isDark ? C.rowDefault.border.dark : C.rowDefault.border.light
      }

      // Full row background
      ctx.fillStyle = rowFill
      ctx.fillRect(PADDING, y, logicalW - PADDING * 2, ROW_H - 1)
      ctx.strokeStyle = rowBorder
      ctx.lineWidth = lw
      ctx.strokeRect(PADDING, y, logicalW - PADDING * 2, ROW_H - 1)

      // Rank
      ctx.font = '10px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.fillText(String(rank), PADDING + LABEL_W / 2, y + ROW_H / 2)

      // SA[i] value
      ctx.font = 'bold 11px system-ui'
      ctx.fillStyle = isDark ? C.text.dark : C.text.light
      ctx.textAlign = 'center'
      ctx.fillText(String(saIdx), col1X + indexColW / 2, y + ROW_H / 2)

      // Suffix text (character by character for highlighting)
      const displayLen = Math.min(suffix.length, maxChars)
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'

      for (let ci = 0; ci < displayLen; ci++) {
        const cx = col2X + 4 + ci * 10
        // Highlight matching prefix chars
        const isPatChar = isMatch && ci < pattern.length
        if (isPatChar) {
          ctx.fillStyle = isDark ? C.charMatch.fill.dark : C.charMatch.fill.light
          ctx.fillRect(cx - 1, y + 2, 10, ROW_H - 5)
        }
        ctx.fillStyle = isDark ? C.text.dark : C.text.light
        ctx.fillText(suffix[ci], cx, y + ROW_H / 2)
      }
      if (suffix.length > maxChars) {
        ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
        ctx.fillText('...', col2X + 4 + maxChars * 10, y + ROW_H / 2)
      }

      // LCP bar
      if (rank > 0 && lcpVal > 0) {
        const barW = Math.min(lcpVal * 8, LCP_BAR_MAX_W)
        ctx.fillStyle = isDark ? C.lcpBar.fill.dark : C.lcpBar.fill.light
        ctx.beginPath()
        ctx.roundRect(col3X + 4, y + 5, barW, ROW_H - 11, 3)
        ctx.fill()

        ctx.font = 'bold 9px system-ui'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.fillText(String(lcpVal), col3X + 8, y + ROW_H / 2)
      }
    }

    // Search range markers
    if (phase === 'search' && searchLo !== undefined && searchHi !== undefined) {
      const loY = headerY + ROW_H + searchLo * ROW_H
      const hiY = headerY + ROW_H + searchHi * ROW_H

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.strokeRect(PADDING - 2, loY - 1, logicalW - PADDING * 2 + 4, (searchHi - searchLo + 1) * ROW_H + 2)
      ctx.setLineDash([])
    }

  }, [text, suffixArray, lcpArray, highlightIndices, phase, searchLo, searchHi, searchMid, pattern, matches, width, height, isDark])

  const n = suffixArray.length
  const maxChars = Math.min(text.length, 20)
  const suffixColW = maxChars * 10 + 20
  const lcpColW = LCP_BAR_MAX_W + 40
  const indexColW = 40
  const logicalW = Math.max(width, PADDING * 2 + LABEL_W + indexColW + suffixColW + lcpColW + 40)
  const logicalH = Math.max(height, PADDING * 2 + 30 + n * ROW_H + 10)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
    />
  )
}
