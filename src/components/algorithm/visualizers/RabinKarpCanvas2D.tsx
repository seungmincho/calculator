'use client'
import { useRef, useEffect, useState } from 'react'

export interface RabinKarpCanvas2DProps {
  text: string
  pattern: string
  windowStart: number
  windowEnd: number
  textHash: number
  patternHash: number
  matches: number[]
  action: string
  falsePositives: number
  width?: number
  height?: number
}

const CELL_W = 36
const CELL_H = 36
const PADDING = 30
const ROW_GAP = 16
const LABEL_W = 80

const C = {
  bg:          { light: '#f8fafc', dark: '#111827' },
  text:        { light: '#1e293b', dark: '#f1f5f9' },
  textSub:     { light: '#64748b', dark: '#94a3b8' },
  cellDefault: { fill: { light: '#f8fafc', dark: '#1f2937' }, border: { light: '#e2e8f0', dark: '#374151' } },
  cellWindow:  { fill: { light: '#fef3c7', dark: '#78350f' }, border: '#f59e0b' },
  cellMatch:   { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  cellCompare: { fill: { light: '#fce7f3', dark: '#500724' }, border: '#ec4899' },
  cellMismatch:{ fill: { light: '#fee2e2', dark: '#450a0a' }, border: '#dc2626' },
  cellFalse:   { fill: { light: '#fef9c3', dark: '#713f12' }, border: '#eab308' },
  hashBox:     { fill: { light: '#eff6ff', dark: '#1e3a5f' }, border: { light: '#93c5fd', dark: '#3b82f6' } },
  hashMatch:   { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  hashMismatch:{ fill: { light: '#fee2e2', dark: '#450a0a' }, border: '#ef4444' },
}

export default function RabinKarpCanvas2D({
  text, pattern, windowStart, windowEnd, textHash, patternHash,
  matches, action, falsePositives,
  width = 700, height = 350,
}: RabinKarpCanvas2DProps) {
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
    const logicalH = Math.max(height, PADDING + (CELL_H + ROW_GAP) * 5 + 80)
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    const matchSet = new Set(matches)
    const isHashMatchAction = action === 'hash-match' || action === 'verify-start' || action === 'verify-match' || action === 'found'
    const isVerifyMismatch = action === 'verify-mismatch'
    const isFound = action === 'found'

    // ── Row 1: Text string ──
    const row1Y = PADDING
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.fillText('Text', PADDING + LABEL_W - 8, row1Y + CELL_H / 2)

    for (let i = 0; i < textLen; i++) {
      const x = PADDING + LABEL_W + i * CELL_W
      const inWindow = i >= windowStart && i <= windowEnd
      const isMatched = matchSet.has(i) || (isFound && i >= windowStart && i <= windowEnd)

      // Check if i is in any match range
      const inMatchRange = matches.some(m => i >= m && i < m + patLen)

      let fill: string, border: string, textColor: string, lw = 0.5
      if (isFound && inWindow) {
        fill = isDark ? C.cellMatch.fill.dark : C.cellMatch.fill.light
        border = C.cellMatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else if (isVerifyMismatch && inWindow) {
        fill = isDark ? C.cellFalse.fill.dark : C.cellFalse.fill.light
        border = C.cellFalse.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else if (inWindow) {
        fill = isDark ? C.cellWindow.fill.dark : C.cellWindow.fill.light
        border = C.cellWindow.border; textColor = isDark ? C.text.dark : C.text.light; lw = 1.5
      } else if (inMatchRange) {
        fill = isDark ? C.cellMatch.fill.dark : C.cellMatch.fill.light
        border = C.cellMatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 1
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

    // ── Row 2: Pattern (aligned below text at windowStart) ──
    const row2Y = row1Y + CELL_H + ROW_GAP
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.fillText('Pattern', PADDING + LABEL_W - 8, row2Y + CELL_H / 2)

    for (let i = 0; i < patLen; i++) {
      const x = PADDING + LABEL_W + (windowStart + i) * CELL_W

      let fill: string, border: string, textColor: string, lw = 0.5
      if (isFound) {
        fill = isDark ? C.cellMatch.fill.dark : C.cellMatch.fill.light
        border = C.cellMatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else if (isHashMatchAction) {
        fill = isDark ? C.cellCompare.fill.dark : C.cellCompare.fill.light
        border = C.cellCompare.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else if (isVerifyMismatch) {
        fill = isDark ? C.cellMismatch.fill.dark : C.cellMismatch.fill.light
        border = C.cellMismatch.border; textColor = isDark ? C.text.dark : C.text.light; lw = 2
      } else {
        fill = isDark ? C.cellDefault.fill.dark : C.cellDefault.fill.light
        border = isDark ? C.cellDefault.border.dark : C.cellDefault.border.light
        textColor = isDark ? C.text.dark : C.text.light
      }

      ctx.fillStyle = fill
      ctx.fillRect(x, row2Y, CELL_W - 1, CELL_H)
      ctx.strokeStyle = border
      ctx.lineWidth = lw
      ctx.strokeRect(x, row2Y, CELL_W - 1, CELL_H)

      ctx.font = 'bold 14px system-ui'
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.fillText(pattern[i], x + CELL_W / 2, row2Y + CELL_H / 2)
    }

    // ── Row 3: Hash comparison box ──
    const row3Y = row2Y + CELL_H + ROW_GAP * 2
    const boxW = 160
    const boxH = 50
    const gap = 40

    // Text hash box
    const thx = PADDING + LABEL_W
    const hashesMatch = textHash === patternHash
    const thFill = hashesMatch
      ? (isDark ? C.hashMatch.fill.dark : C.hashMatch.fill.light)
      : (isDark ? C.hashBox.fill.dark : C.hashBox.fill.light)
    const thBorder = hashesMatch ? C.hashMatch.border : (isDark ? C.hashBox.border.dark : C.hashBox.border.light)

    ctx.fillStyle = thFill
    ctx.beginPath()
    ctx.roundRect(thx, row3Y, boxW, boxH, 8)
    ctx.fill()
    ctx.strokeStyle = thBorder
    ctx.lineWidth = hashesMatch ? 2 : 1
    ctx.stroke()

    ctx.font = '10px system-ui'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.textAlign = 'center'
    ctx.fillText('Text Hash', thx + boxW / 2, row3Y + 14)
    ctx.font = 'bold 18px system-ui'
    ctx.fillStyle = isDark ? C.text.dark : C.text.light
    ctx.fillText(String(textHash), thx + boxW / 2, row3Y + 36)

    // Equals/not-equals
    const eqX = thx + boxW + gap / 2
    ctx.font = 'bold 20px system-ui'
    ctx.fillStyle = hashesMatch ? '#16a34a' : '#ef4444'
    ctx.textAlign = 'center'
    ctx.fillText(hashesMatch ? '=' : '≠', eqX, row3Y + boxH / 2 + 2)

    // Pattern hash box
    const phx = thx + boxW + gap
    const phFill = hashesMatch
      ? (isDark ? C.hashMatch.fill.dark : C.hashMatch.fill.light)
      : (isDark ? C.hashBox.fill.dark : C.hashBox.fill.light)
    const phBorder = hashesMatch ? C.hashMatch.border : (isDark ? C.hashBox.border.dark : C.hashBox.border.light)

    ctx.fillStyle = phFill
    ctx.beginPath()
    ctx.roundRect(phx, row3Y, boxW, boxH, 8)
    ctx.fill()
    ctx.strokeStyle = phBorder
    ctx.lineWidth = hashesMatch ? 2 : 1
    ctx.stroke()

    ctx.font = '10px system-ui'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.textAlign = 'center'
    ctx.fillText('Pattern Hash', phx + boxW / 2, row3Y + 14)
    ctx.font = 'bold 18px system-ui'
    ctx.fillStyle = isDark ? C.text.dark : C.text.light
    ctx.fillText(String(patternHash), phx + boxW / 2, row3Y + 36)

    // ── Row 4: Rolling hash formula ──
    const row4Y = row3Y + boxH + ROW_GAP
    ctx.font = '11px system-ui'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.textAlign = 'left'
    ctx.fillText(`hash = Σ char[i] × base^(m-1-i) mod ${patternHash > 0 ? 'mod' : ''}`, PADDING + LABEL_W, row4Y + 12)

    if (falsePositives > 0) {
      ctx.font = 'bold 11px system-ui'
      ctx.fillStyle = '#eab308'
      ctx.fillText(`⚠ False positives: ${falsePositives}`, PADDING + LABEL_W + 300, row4Y + 12)
    }

  }, [text, pattern, windowStart, windowEnd, textHash, patternHash, matches, action, falsePositives, width, height, isDark])

  const textLen = text.length
  const patLen = pattern.length
  const logicalW = Math.max(width, PADDING * 2 + LABEL_W + Math.max(textLen, patLen) * CELL_W + 20)
  const logicalH = Math.max(height, PADDING + (CELL_H + ROW_GAP) * 5 + 80)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
    />
  )
}
