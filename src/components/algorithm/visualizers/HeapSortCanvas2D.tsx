'use client'
import { useRef, useEffect, useState } from 'react'

interface HeapSortCanvas2DProps {
  array: number[]
  comparing: [number, number] | null
  swapping: [number, number] | null
  sorted: number[]
  heapSize: number
  width?: number
  height?: number
}

const COLORS = {
  // Node / bar states
  comparing:    '#fbbf24',  // amber-400
  swapping:     '#f87171',  // red-400
  sortedLight:  '#34d399',  // emerald-400
  sortedDark:   '#10b981',  // emerald-500
  inHeapLight:  '#60a5fa',  // blue-400
  inHeapDark:   '#3b82f6',  // blue-500
  outsideLight: '#9ca3af',  // gray-400
  outsideDark:  '#6b7280',  // gray-500

  edgeLight:    '#d1d5db',  // gray-300
  edgeDark:     '#4b5563',  // gray-600

  textLight:    '#374151',  // gray-700
  textDark:     '#f3f4f6',  // gray-100
  textOnColor:  '#ffffff',
}

const TREE_FRACTION = 0.55  // top 55% for tree
const BAR_GAP = 2
const PADDING_SIDE = 14
const PADDING_BOTTOM_BAR = 16
const NODE_RADIUS = 20
const TREE_TOP_PAD = 28

export default function HeapSortCanvas2D({
  array,
  comparing,
  swapping,
  sorted,
  heapSize,
  width = 600,
  height = 420,
}: HeapSortCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

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

    const n = array.length
    if (n === 0) return

    const sortedSet = new Set(sorted)
    const comparingSet = comparing ? new Set(comparing) : new Set<number>()
    const swappingSet = swapping ? new Set(swapping) : new Set<number>()

    const treeHeight = Math.floor(height * TREE_FRACTION)
    const barAreaHeight = height - treeHeight

    // ── Tree section ──────────────────────────────────────────────────────────
    const maxLevel = n > 0 ? Math.floor(Math.log2(n)) : 0
    const levelsCount = maxLevel + 1
    const levelHeight = (treeHeight - TREE_TOP_PAD - NODE_RADIUS) / Math.max(1, levelsCount - 1 + 0.5)

    // Compute (x, y) for each node index
    const nodePos: { x: number; y: number }[] = new Array(n)

    for (let idx = 0; idx < n; idx++) {
      const level = Math.floor(Math.log2(idx + 1))
      const nodesAtLevel = Math.pow(2, level)
      const posInLevel = idx - (nodesAtLevel - 1)  // 0-based position within level
      const x = PADDING_SIDE + (posInLevel + 0.5) * ((width - PADDING_SIDE * 2) / nodesAtLevel)
      const y = TREE_TOP_PAD + level * levelHeight
      nodePos[idx] = { x, y }
    }

    // Draw edges first (so nodes appear on top)
    for (let idx = 1; idx < n; idx++) {
      const parent = Math.floor((idx - 1) / 2)
      const { x: x1, y: y1 } = nodePos[parent]
      const { x: x2, y: y2 } = nodePos[idx]

      // Fade edge if child is outside heap
      const childOutside = idx >= heapSize && !sortedSet.has(idx)
      ctx.save()
      ctx.strokeStyle = isDark ? COLORS.edgeDark : COLORS.edgeLight
      ctx.lineWidth = 1.5
      ctx.globalAlpha = childOutside ? 0.3 : 1
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.restore()
    }

    // Draw nodes
    for (let idx = 0; idx < n; idx++) {
      const value = array[idx]
      const { x, y } = nodePos[idx]

      const isComparing = comparingSet.has(idx)
      const isSwapping = swappingSet.has(idx)
      const isSorted = sortedSet.has(idx)
      const inHeap = idx < heapSize

      let fillColor: string
      let glowColor: string | null = null

      if (isSwapping) {
        fillColor = COLORS.swapping
        glowColor = COLORS.swapping
      } else if (isComparing) {
        fillColor = COLORS.comparing
        glowColor = COLORS.comparing
      } else if (isSorted) {
        fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
      } else if (inHeap) {
        fillColor = isDark ? COLORS.inHeapDark : COLORS.inHeapLight
      } else {
        fillColor = isDark ? COLORS.outsideDark : COLORS.outsideLight
      }

      const isOutside = !inHeap && !isSorted
      const nodeAlpha = isOutside ? 0.4 : 1

      ctx.save()
      ctx.globalAlpha = nodeAlpha

      if (glowColor) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 14
      }

      // Circle
      ctx.beginPath()
      ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = fillColor
      ctx.fill()

      // Border
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.restore()

      // Value text
      ctx.save()
      ctx.globalAlpha = nodeAlpha
      const fontSize = value >= 100 ? 10 : 12
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = COLORS.textOnColor
      ctx.fillText(String(value), x, y)
      ctx.restore()
    }

    // ── Bar chart section ─────────────────────────────────────────────────────
    const barAreaY = treeHeight
    const maxValue = Math.max(...array, 1)
    const drawWidth = width - PADDING_SIDE * 2
    const maxBarHeight = barAreaHeight - PADDING_BOTTOM_BAR - 8
    const barWidth = Math.max(4, (drawWidth - BAR_GAP * (n - 1)) / n)
    const totalWidthBars = barWidth * n + BAR_GAP * (n - 1)
    const startX = PADDING_SIDE + (drawWidth - totalWidthBars) / 2
    const showValues = barWidth >= 18

    for (let i = 0; i < n; i++) {
      const value = array[i]
      const barHeight = Math.max(4, (value / maxValue) * maxBarHeight)
      const bx = startX + i * (barWidth + BAR_GAP)
      const by = barAreaY + (barAreaHeight - PADDING_BOTTOM_BAR) - barHeight

      let fillColor: string
      let glowColor: string | null = null
      let glowBlur = 0

      if (swappingSet.has(i)) {
        fillColor = COLORS.swapping
        glowColor = COLORS.swapping
        glowBlur = 10
      } else if (comparingSet.has(i)) {
        fillColor = COLORS.comparing
        glowColor = COLORS.comparing
        glowBlur = 7
      } else if (sortedSet.has(i)) {
        fillColor = isDark ? COLORS.sortedDark : COLORS.sortedLight
      } else if (i < heapSize) {
        fillColor = isDark ? COLORS.inHeapDark : COLORS.inHeapLight
      } else {
        fillColor = isDark ? COLORS.outsideDark : COLORS.outsideLight
      }

      const isOutsideBar = i >= heapSize && !sortedSet.has(i) && !swappingSet.has(i) && !comparingSet.has(i)

      ctx.save()
      ctx.globalAlpha = isOutsideBar ? 0.45 : 1

      if (glowColor) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = glowBlur
      }

      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(bx, by, barWidth, barHeight, Math.min(3, barWidth / 4))
      ctx.fill()
      ctx.restore()

      // Top line indicator for sorted bars
      if (sortedSet.has(i) && !swappingSet.has(i) && !comparingSet.has(i)) {
        ctx.save()
        ctx.strokeStyle = isDark ? '#059669' : '#047857'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bx + 2, by + 2)
        ctx.lineTo(bx + barWidth - 2, by + 2)
        ctx.stroke()
        ctx.restore()
      }

      if (showValues) {
        const fontSize = Math.min(11, Math.max(8, barWidth * 0.38))
        ctx.save()
        ctx.globalAlpha = isOutsideBar ? 0.45 : 1
        ctx.font = `${fontSize}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = isDark ? COLORS.textDark : COLORS.textLight
        ctx.fillText(String(value), bx + barWidth / 2, by - 1)
        ctx.restore()
      }
    }

    // Divider line between tree and bars
    ctx.save()
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(PADDING_SIDE, treeHeight)
    ctx.lineTo(width - PADDING_SIDE, treeHeight)
    ctx.stroke()
    ctx.restore()
  }, [array, comparing, swapping, sorted, heapSize, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-xl"
    />
  )
}
