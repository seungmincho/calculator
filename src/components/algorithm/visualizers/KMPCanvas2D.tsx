'use client'
import { useRef, useEffect, useState } from 'react'

export interface KMPCanvas2DProps {
  text: string
  pattern: string
  failure: number[]
  textIdx: number         // current text pointer
  patIdx: number          // current pattern pointer
  matchedRanges: { start: number; end: number }[]  // found match ranges
  phase: 'failure' | 'search'
  failureBuiltUpTo: number  // how many failure cells have been computed
  width?: number
  height?: number
}

const CELL_W = 36
const CELL_H = 36
const PADDING = 30
const ROW_GAP = 16
const LABEL_W = 60

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  cellDefault:{ fill: { light: '#f8fafc', dark: '#1f2937' }, border: { light: '#e2e8f0', dark: '#374151' } },
  cellActive: { fill: '#ec4899', border: '#be185d', text: '#ffffff' },
  cellMatch:  { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  cellCompare:{ fill: { light: '#fce7f3', dark: '#500724' }, border: '#ec4899' },
  cellMismatch:{ fill: { light: '#fee2e2', dark: '#450a0a' }, border: '#dc2626' },
  failureCell:{ fill: { light: '#f0f9ff', dark: '#0c4a6e' }, border: '#0284c7' },
  failureActive:{ fill: '#0284c7', border: '#0369a1', text: '#ffffff' },
  header:     { fill: { light: '#f1f5f9', dark: '#1e293b' }, text: { light: '#475569', dark: '#94a3b8' } },
}

export default function KMPCanvas2D({
  text, pattern, failure, textIdx, patIdx,
  matchedRanges, phase, failureBuiltUpTo,
  width = 700, height = 350,
}: KMPCanvas2DProps) {
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

    const textLen = text.length
    const patLen = pattern.length
    const logicalW = Math.max(width, PADDING * 2 + LABEL_W + Math.max(textLen, patLen) * CELL_W + 20)
    const logicalH = Math.max(height, PADDING + (CELL_H + ROW_GAP) * 4 + 60)
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    // Compute pattern alignment offset in search phase
    const patOffset = phase === 'search' ? textIdx - patIdx : 0

    // ── Row 1: Text string ──
    const row1Y = PADDING
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.fillText('Text', PADDING + LABEL_W - 8, row1Y + CELL_H / 2)

    // Matched ranges set for quick lookup
    const matchedSet = new Set<number>()
    for (const r of matchedRanges) {
      for (let k = r.start; k < r.end; k++) matchedSet.add(k)
    }

    for (let i = 0; i < textLen; i++) {
      const x = PADDING + LABEL_W + i * CELL_W
      const isTextActive = phase === 'search' && i === textIdx
      const isMatched = matchedSet.has(i)

      let fill: string, border: string, textColor: string, lw = 0.5
      if (isTextActive) {
        fill = isDark ? C.cellCompare.fill.dark : C.cellCompare.fill.light
        border = C.cellCompare.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else if (isMatched) {
        fill = isDark ? C.cellMatch.fill.dark : C.cellMatch.fill.light
        border = C.cellMatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 1.5
      } else {
        fill = isDark ? C.cellDefault.fill.dark : C.cellDefault.fill.light
        border = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
        textColor = isDark ? C.text.dark : C.text.light
      }

      ctx.fillStyle = fill
      ctx.fillRect(x, row1Y, CELL_W - 1, CELL_H)
      ctx.strokeStyle = border
      ctx.lineWidth = lw
      ctx.strokeRect(x, row1Y, CELL_W - 1, CELL_H)

      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.fillText(text[i], x + CELL_W / 2, row1Y + CELL_H / 2)

      // Index
      ctx.font = '9px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(String(i), x + CELL_W / 2, row1Y - 8)
    }

    // ── Row 2: Pattern (aligned below text during search) ──
    const row2Y = row1Y + CELL_H + ROW_GAP
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.fillText('Pattern', PADDING + LABEL_W - 8, row2Y + CELL_H / 2)

    for (let i = 0; i < patLen; i++) {
      const x = PADDING + LABEL_W + (i + patOffset) * CELL_W
      if (x < PADDING + LABEL_W - CELL_W || x > logicalW) continue

      const isPatActive = phase === 'search' && i === patIdx
      const isPatMatched = phase === 'search' && i < patIdx

      let fill: string, border: string, textColor: string, lw = 0.5
      if (isPatActive) {
        fill = C.cellActive.fill; border = C.cellActive.border; textColor = C.cellActive.text; lw = 2.5
      } else if (isPatMatched) {
        fill = isDark ? C.cellMatch.fill.dark : C.cellMatch.fill.light
        border = C.cellMatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 1.5
      } else {
        fill = isDark ? C.cellDefault.fill.dark : C.cellDefault.fill.light
        border = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
        textColor = isDark ? C.text.dark : C.text.light
      }

      if (isPatActive) {
        ctx.save()
        ctx.shadowColor = 'rgba(236,72,153,0.5)'
        ctx.shadowBlur = 10
      }

      ctx.fillStyle = fill
      ctx.fillRect(x, row2Y, CELL_W - 1, CELL_H)
      ctx.strokeStyle = border
      ctx.lineWidth = lw
      ctx.strokeRect(x, row2Y, CELL_W - 1, CELL_H)

      if (isPatActive) ctx.restore()

      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.fillText(pattern[i], x + CELL_W / 2, row2Y + CELL_H / 2)
    }

    // ── Row 3: Failure function table ──
    const row3Y = row2Y + CELL_H + ROW_GAP * 2
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'right'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.fillText('Failure', PADDING + LABEL_W - 8, row3Y + CELL_H / 2)

    // Pattern chars header
    for (let i = 0; i < patLen; i++) {
      const x = PADDING + LABEL_W + i * CELL_W
      ctx.font = '10px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.fillText(pattern[i], x + CELL_W / 2, row3Y - 8)
    }

    for (let i = 0; i < patLen; i++) {
      const x = PADDING + LABEL_W + i * CELL_W
      const isBuilt = i <= failureBuiltUpTo
      const isFailureActive = phase === 'failure' && i === failureBuiltUpTo

      let fill: string, border: string, textColor: string, lw = 0.5
      if (isFailureActive) {
        fill = C.failureActive.fill; border = C.failureActive.border; textColor = C.failureActive.text; lw = 2.5
      } else if (isBuilt) {
        fill = isDark ? C.failureCell.fill.dark : C.failureCell.fill.light
        border = C.failureCell.border; textColor = isDark ? C.text.dark : C.text.light; lw = 1
      } else {
        fill = isDark ? C.cellDefault.fill.dark : C.cellDefault.fill.light
        border = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
        textColor = isDark ? C.text.dark : C.text.light
      }

      ctx.fillStyle = fill
      ctx.fillRect(x, row3Y, CELL_W - 1, CELL_H)
      ctx.strokeStyle = border
      ctx.lineWidth = lw
      ctx.strokeRect(x, row3Y, CELL_W - 1, CELL_H)

      if (isBuilt) {
        ctx.font = 'bold 13px system-ui'
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.fillText(String(failure[i] ?? ''), x + CELL_W / 2, row3Y + CELL_H / 2)
      }
    }
  }, [text, pattern, failure, textIdx, patIdx, matchedRanges, phase, failureBuiltUpTo, width, height, isDark])

  const textLen = text.length
  const patLen = pattern.length
  const logicalW = Math.max(width, PADDING * 2 + LABEL_W + Math.max(textLen, patLen) * CELL_W + 20)
  const logicalH = Math.max(height, PADDING + (CELL_H + ROW_GAP) * 4 + 60)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
    />
  )
}
