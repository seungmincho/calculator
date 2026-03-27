'use client'
import { useRef, useEffect, useState } from 'react'
import { type HeapType, parentIndex, leftChildIndex, rightChildIndex, getTreeDepth } from '@/utils/algorithm/heap'

export interface HeapCanvas2DProps {
  array: number[]
  heapType: HeapType
  activeIndices: number[]       // currently active
  swapIndices: number[]         // being swapped
  comparingIndices: number[]    // being compared
  doneIndex: number | null      // settled
  width?: number
  height?: number
}

const NODE_R = 20
const V_GAP = 50
const PADDING = 30
const ARRAY_H = 50
const GAP_BETWEEN = 20

const C = {
  bg:           { light: '#f8fafc', dark: '#111827' },
  edge:         { light: '#cbd5e1', dark: '#374151' },
  nodeDefault:  { fill: { light: '#f1f5f9', dark: '#1e293b' }, border: { light: '#94a3b8', dark: '#475569' } },
  nodeActive:   { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  nodeSwap:     { fill: '#fbbf24', border: '#d97706', text: '#1e293b' },
  nodeCompare:  { fill: '#a78bfa', border: '#7c3aed', text: '#ffffff' },
  nodeDone:     { fill: '#34d399', border: '#059669', text: '#ffffff' },
  textMain:     { light: '#1e293b', dark: '#f1f5f9' },
  textSub:      { light: '#64748b', dark: '#94a3b8' },
  indexMapping: '#3b82f6',
}

interface TreePos { x: number; y: number }

function computeTreePositions(arrayLength: number, canvasWidth: number): TreePos[] {
  if (arrayLength === 0) return []
  const depth = getTreeDepth(arrayLength)
  const positions: TreePos[] = []
  const treeWidth = canvasWidth - PADDING * 2

  for (let i = 0; i < arrayLength; i++) {
    const level = Math.floor(Math.log2(i + 1))
    const posInLevel = i - (Math.pow(2, level) - 1)
    const nodesInLevel = Math.min(Math.pow(2, level), arrayLength - (Math.pow(2, level) - 1))
    const levelWidth = treeWidth / Math.pow(2, level)
    const x = PADDING + levelWidth * posInLevel + levelWidth / 2
    const y = PADDING + NODE_R + level * (NODE_R * 2 + V_GAP)
    positions.push({ x, y })
  }

  return positions
}

export default function HeapCanvas2D({
  array, heapType, activeIndices, swapIndices, comparingIndices, doneIndex,
  width = 700, height = 500,
}: HeapCanvas2DProps) {
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

    const depth = getTreeDepth(array.length)
    const treeH = depth * (NODE_R * 2 + V_GAP) + PADDING * 2
    const logicalH = treeH + GAP_BETWEEN + ARRAY_H + PADDING
    const logicalW = width

    const dpr = window.devicePixelRatio || 1
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    if (array.length === 0) {
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Heap will appear here', logicalW / 2, logicalH / 2)
      return
    }

    const activeSet = new Set(activeIndices)
    const swapSet = new Set(swapIndices)
    const compareSet = new Set(comparingIndices)
    const positions = computeTreePositions(array.length, logicalW)

    // ── Tree edges ──
    for (let i = 0; i < array.length; i++) {
      const l = leftChildIndex(i), r = rightChildIndex(i)
      for (const ci of [l, r]) {
        if (ci >= array.length) continue
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(positions[i].x, positions[i].y + NODE_R)
        ctx.lineTo(positions[ci].x, positions[ci].y - NODE_R)
        ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.restore()
      }
    }

    // ── Tree nodes ──
    for (let i = 0; i < array.length; i++) {
      const pos = positions[i]
      const isActive = activeSet.has(i)
      const isSwap = swapSet.has(i)
      const isCompare = compareSet.has(i)
      const isDone = i === doneIndex

      let fill: string, border: string, textColor: string

      if (isSwap) {
        fill = C.nodeSwap.fill; border = C.nodeSwap.border; textColor = C.nodeSwap.text
      } else if (isCompare) {
        fill = C.nodeCompare.fill; border = C.nodeCompare.border; textColor = C.nodeCompare.text
      } else if (isActive) {
        fill = C.nodeActive.fill; border = C.nodeActive.border; textColor = C.nodeActive.text
      } else if (isDone) {
        fill = C.nodeDone.fill; border = C.nodeDone.border; textColor = C.nodeDone.text
      } else {
        fill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light
        border = isDark ? C.nodeDefault.border.dark : C.nodeDefault.border.light
        textColor = isDark ? C.textMain.dark : C.textMain.light
      }

      ctx.save()
      if (isSwap || isCompare) { ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 10 }
      ctx.beginPath(); ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()
      ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke()
      ctx.shadowBlur = 0

      ctx.font = `bold 13px system-ui`
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(array[i]), pos.x, pos.y)
      ctx.restore()

      // Index label
      ctx.save()
      ctx.font = '9px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'center'
      ctx.fillText(`[${i}]`, pos.x, pos.y + NODE_R + 10)
      ctx.restore()
    }

    // ── Array representation below ──
    const arrayY = treeH + GAP_BETWEEN
    const cellW = Math.min(40, (logicalW - PADDING * 2) / array.length)
    const startX = (logicalW - cellW * array.length) / 2

    // Label
    ctx.save()
    ctx.font = 'bold 11px system-ui'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.textAlign = 'left'
    ctx.fillText('Array:', PADDING, arrayY + ARRAY_H / 2)
    ctx.restore()

    for (let i = 0; i < array.length; i++) {
      const x = startX + i * cellW

      const isActive = activeSet.has(i)
      const isSwap = swapSet.has(i)
      const isCompare = compareSet.has(i)

      let bgFill: string
      if (isSwap) bgFill = C.nodeSwap.fill
      else if (isCompare) bgFill = C.nodeCompare.fill
      else if (isActive) bgFill = C.nodeActive.fill
      else bgFill = isDark ? C.nodeDefault.fill.dark : C.nodeDefault.fill.light

      ctx.save()
      ctx.fillStyle = bgFill
      ctx.fillRect(x, arrayY, cellW - 1, ARRAY_H - 15)
      ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
      ctx.lineWidth = 1
      ctx.strokeRect(x, arrayY, cellW - 1, ARRAY_H - 15)

      // Value
      const txtColor = (isSwap || isCompare || isActive) ? '#ffffff' : (isDark ? C.textMain.dark : C.textMain.light)
      ctx.font = 'bold 11px system-ui'
      ctx.fillStyle = txtColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(array[i]), x + (cellW - 1) / 2, arrayY + (ARRAY_H - 15) / 2)

      // Index
      ctx.font = '8px system-ui'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(String(i), x + (cellW - 1) / 2, arrayY + ARRAY_H - 5)
      ctx.restore()
    }

  }, [array, heapType, activeIndices, swapIndices, comparingIndices, doneIndex, width, height, isDark])

  const depth = getTreeDepth(array.length)
  const treeH = depth * (NODE_R * 2 + V_GAP) + PADDING * 2
  const totalH = Math.max(height, treeH + GAP_BETWEEN + ARRAY_H + PADDING)

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: totalH }}
      className="rounded-xl"
    />
  )
}
