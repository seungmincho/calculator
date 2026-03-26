'use client'
import { useRef, useEffect, useMemo } from 'react'
import { type HashEntry, type CollisionStrategy } from '@/utils/algorithm/hashTable'

export interface HashTableCanvas2DProps {
  buckets: (HashEntry | null)[][]
  activeKey?: string
  activeHash?: number
  activeBucketIndex?: number
  probeSequence?: number[]
  strategy: CollisionStrategy
  width?: number
  height?: number
}

// ── Color palette ──────────────────────────────────────────────────────────────
const C = {
  bg:           { light: '#f8fafc', dark: '#111827' },
  bucketBg:     { light: '#f1f5f9', dark: '#1e293b' },
  bucketBorder: { light: '#cbd5e1', dark: '#374151' },
  bucketActive: { fill: '#fef3c7', border: '#d97706', dark: { fill: '#451a03', border: '#d97706' } },
  bucketProbe:  { fill: '#ede9fe', border: '#7c3aed', dark: { fill: '#2e1065', border: '#7c3aed' } },
  entryColors:  [
    { fill: '#dbeafe', border: '#3b82f6', text: '#1e40af' }, // blue
    { fill: '#d1fae5', border: '#10b981', text: '#065f46' }, // emerald
    { fill: '#fce7f3', border: '#ec4899', text: '#9d174d' }, // pink
    { fill: '#ffedd5', border: '#f97316', text: '#9a3412' }, // orange
    { fill: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' }, // violet
    { fill: '#ecfccb', border: '#84cc16', text: '#365314' }, // lime
    { fill: '#fef9c3', border: '#eab308', text: '#713f12' }, // yellow
    { fill: '#cffafe', border: '#06b6d4', text: '#164e63' }, // cyan
  ],
  hashArrow:    '#6366f1',
  collision:    '#ef4444',
  textMain:     { light: '#1e293b', dark: '#f1f5f9' },
  textSub:      { light: '#64748b', dark: '#94a3b8' },
  indexLabel:   { light: '#94a3b8', dark: '#6b7280' },
}

function isDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function col(pair: { light: string; dark: string }): string {
  return isDark() ? pair.dark : pair.light
}

// Give a deterministic color index to an entry based on its hash
function entryColor(entry: HashEntry) {
  return C.entryColors[entry.hash % C.entryColors.length]
}

export default function HashTableCanvas2D({
  buckets,
  activeKey,
  activeHash,
  activeBucketIndex,
  probeSequence = [],
  strategy,
  width = 680,
  height = 480,
}: HashTableCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dark = isDark()

  // Measure actual pixel ratio
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  const tableSize = buckets.length

  // ── Layout constants ────────────────────────────────────────────────────────
  const HEADER_H = 80       // hash function display area
  const PADDING_X = 20
  const PADDING_Y = 10
  const BUCKET_GAP = 4
  const CHAIN_NODE_H = 28
  const CHAIN_GAP = 6
  const INDEX_W = 32
  const SLOT_H = 36

  // Available width for buckets
  const availW = width - PADDING_X * 2 - INDEX_W
  const bucketW = Math.max(60, Math.floor((availW - BUCKET_GAP * (tableSize - 1)) / tableSize))

  // Compute max chain length for chaining height
  const maxChain = useMemo(() =>
    strategy === 'chaining'
      ? Math.max(1, ...buckets.map(s => Math.max(1, s.filter(e => e !== null).length)))
      : 1,
    [buckets, strategy]
  )

  const contentH = strategy === 'chaining'
    ? maxChain * CHAIN_NODE_H + (maxChain - 1) * CHAIN_GAP
    : SLOT_H

  const totalH = Math.max(height, HEADER_H + PADDING_Y + contentH + PADDING_Y + 40)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set physical size
    canvas.width = width * dpr
    canvas.height = totalH * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.fillStyle = col(C.bg)
    ctx.fillRect(0, 0, width, totalH)

    // ── Hash function header ──────────────────────────────────────────────────
    if (activeKey !== undefined && activeHash !== undefined) {
      const hasher_y = PADDING_Y + 8
      const hasher_h = 48

      // Background pill
      ctx.fillStyle = isDark() ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'
      roundRect(ctx, PADDING_X, hasher_y, width - PADDING_X * 2, hasher_h, 12)
      ctx.fill()

      ctx.strokeStyle = 'rgba(99,102,241,0.4)'
      ctx.lineWidth = 1.5
      roundRect(ctx, PADDING_X, hasher_y, width - PADDING_X * 2, hasher_h, 12)
      ctx.stroke()

      // Key box
      const keyLabel = `"${activeKey}"`
      ctx.font = 'bold 13px monospace'
      const keyW = ctx.measureText(keyLabel).width + 20
      const keyX = PADDING_X + 16
      const keyY = hasher_y + hasher_h / 2

      ctx.fillStyle = isDark() ? '#1e293b' : '#ffffff'
      roundRect(ctx, keyX, keyY - 12, keyW, 24, 6)
      ctx.fill()
      ctx.strokeStyle = C.hashArrow
      ctx.lineWidth = 1.5
      roundRect(ctx, keyX, keyY - 12, keyW, 24, 6)
      ctx.stroke()

      ctx.fillStyle = C.hashArrow
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(keyLabel, keyX + 10, keyY)

      // Arrow
      const arrowX1 = keyX + keyW + 8
      const arrowX2 = arrowX1 + 60
      ctx.strokeStyle = C.hashArrow
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(arrowX1, keyY)
      ctx.lineTo(arrowX2 - 8, keyY)
      ctx.stroke()
      ctx.setLineDash([])
      // arrowhead
      ctx.fillStyle = C.hashArrow
      ctx.beginPath()
      ctx.moveTo(arrowX2, keyY)
      ctx.lineTo(arrowX2 - 10, keyY - 5)
      ctx.lineTo(arrowX2 - 10, keyY + 5)
      ctx.closePath()
      ctx.fill()

      // hash() function label
      ctx.font = '11px monospace'
      ctx.fillStyle = isDark() ? '#a5b4fc' : '#4f46e5'
      ctx.textAlign = 'center'
      ctx.fillText('hash()', arrowX1 + 30, keyY - 14)

      // hash result box
      const resLabel = `= ${activeHash}`
      ctx.font = 'bold 15px monospace'
      const resW = ctx.measureText(resLabel).width + 20
      const resX = arrowX2 + 8

      ctx.fillStyle = C.hashArrow
      roundRect(ctx, resX, keyY - 14, resW, 28, 6)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(resLabel, resX + 10, keyY)

      // Arrow to bucket
      if (activeBucketIndex !== undefined) {
        const bucketX = PADDING_X + INDEX_W + activeBucketIndex * (bucketW + BUCKET_GAP) + bucketW / 2
        const arrowY1 = hasher_y + hasher_h
        const arrowY2 = HEADER_H + PADDING_Y - 4

        ctx.strokeStyle = C.hashArrow
        ctx.lineWidth = 2
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(resX + resW / 2, arrowY1)
        ctx.lineTo(resX + resW / 2, arrowY1 + 8)
        ctx.lineTo(bucketX, arrowY1 + 8)
        ctx.lineTo(bucketX, arrowY2)
        ctx.stroke()
        ctx.setLineDash([])
        // arrowhead
        ctx.fillStyle = C.hashArrow
        ctx.beginPath()
        ctx.moveTo(bucketX, arrowY2 + 10)
        ctx.lineTo(bucketX - 5, arrowY2)
        ctx.lineTo(bucketX + 5, arrowY2)
        ctx.closePath()
        ctx.fill()
      }
    }

    // ── Bucket row ────────────────────────────────────────────────────────────
    const bucketsY = HEADER_H + PADDING_Y

    for (let i = 0; i < tableSize; i++) {
      const bx = PADDING_X + INDEX_W + i * (bucketW + BUCKET_GAP)

      // Index label
      ctx.font = '11px sans-serif'
      ctx.fillStyle = col(C.indexLabel)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i), PADDING_X + INDEX_W / 2 + i * (bucketW + BUCKET_GAP) - INDEX_W / 2 + bucketW / 2 - (bucketW / 2 - INDEX_W / 2 + 4), bucketsY + (strategy === 'chaining' ? CHAIN_NODE_H / 2 : SLOT_H / 2))

      // Bucket background
      const isActive = activeBucketIndex === i
      const isProbe = probeSequence.includes(i)

      if (strategy === 'chaining') {
        const chain = buckets[i].filter(e => e !== null)
        const chainH = Math.max(1, chain.length) * CHAIN_NODE_H + Math.max(0, chain.length - 1) * CHAIN_GAP

        // Bucket outline
        ctx.strokeStyle = isActive
          ? C.bucketActive.border
          : isProbe
            ? C.bucketProbe.border
            : col(C.bucketBorder)
        ctx.lineWidth = isActive ? 2 : 1.5
        ctx.fillStyle = isActive
          ? isDark() ? C.bucketActive.dark.fill : C.bucketActive.fill
          : col(C.bucketBg)
        roundRect(ctx, bx, bucketsY, bucketW, chainH, 6)
        ctx.fill()
        roundRect(ctx, bx, bucketsY, bucketW, chainH, 6)
        ctx.stroke()

        // Chain nodes
        if (chain.length === 0) {
          ctx.fillStyle = col(C.indexLabel)
          ctx.font = '11px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('∅', bx + bucketW / 2, bucketsY + CHAIN_NODE_H / 2)
        } else {
          for (let j = 0; j < chain.length; j++) {
            const entry = chain[j]!
            const ey = bucketsY + j * (CHAIN_NODE_H + CHAIN_GAP)
            const ec = entryColor(entry)

            ctx.fillStyle = isDark() ? 'rgba(30,41,59,0.9)' : ec.fill
            roundRect(ctx, bx + 3, ey + 3, bucketW - 6, CHAIN_NODE_H - 6, 4)
            ctx.fill()
            ctx.strokeStyle = ec.border
            ctx.lineWidth = 1.5
            roundRect(ctx, bx + 3, ey + 3, bucketW - 6, CHAIN_NODE_H - 6, 4)
            ctx.stroke()

            ctx.fillStyle = isDark() ? ec.border : ec.text
            ctx.font = `bold ${Math.min(11, Math.floor(bucketW / 5.5))}px monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const label = entry.key.length > 5 ? entry.key.slice(0, 4) + '…' : entry.key
            ctx.fillText(label, bx + bucketW / 2, ey + CHAIN_NODE_H / 2)

            // Link arrow between nodes
            if (j < chain.length - 1) {
              const ay = ey + CHAIN_NODE_H
              ctx.strokeStyle = col(C.bucketBorder)
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(bx + bucketW / 2, ay + 1)
              ctx.lineTo(bx + bucketW / 2, ay + CHAIN_GAP - 1)
              ctx.stroke()
              // small arrowhead
              ctx.fillStyle = col(C.bucketBorder)
              ctx.beginPath()
              ctx.moveTo(bx + bucketW / 2, ay + CHAIN_GAP + 1)
              ctx.lineTo(bx + bucketW / 2 - 3, ay + CHAIN_GAP - 3)
              ctx.lineTo(bx + bucketW / 2 + 3, ay + CHAIN_GAP - 3)
              ctx.closePath()
              ctx.fill()
            }
          }
        }
      } else {
        // Open addressing — single slot
        const slot = buckets[i][0]

        ctx.strokeStyle = isActive
          ? C.bucketActive.border
          : isProbe
            ? C.bucketProbe.border
            : col(C.bucketBorder)
        ctx.lineWidth = isActive || isProbe ? 2 : 1.5
        ctx.fillStyle = isActive
          ? isDark() ? C.bucketActive.dark.fill : C.bucketActive.fill
          : isProbe
            ? isDark() ? C.bucketProbe.dark.fill : C.bucketProbe.fill
            : col(C.bucketBg)
        roundRect(ctx, bx, bucketsY, bucketW, SLOT_H, 6)
        ctx.fill()
        roundRect(ctx, bx, bucketsY, bucketW, SLOT_H, 6)
        ctx.stroke()

        if (slot) {
          const ec = entryColor(slot)
          ctx.fillStyle = isDark() ? 'rgba(30,41,59,0.9)' : ec.fill
          roundRect(ctx, bx + 3, bucketsY + 3, bucketW - 6, SLOT_H - 6, 4)
          ctx.fill()
          ctx.strokeStyle = ec.border
          ctx.lineWidth = 1.5
          roundRect(ctx, bx + 3, bucketsY + 3, bucketW - 6, SLOT_H - 6, 4)
          ctx.stroke()

          ctx.fillStyle = isDark() ? ec.border : ec.text
          ctx.font = `bold ${Math.min(11, Math.floor(bucketW / 5.5))}px monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const label = slot.key.length > 5 ? slot.key.slice(0, 4) + '…' : slot.key
          ctx.fillText(label, bx + bucketW / 2, bucketsY + SLOT_H / 2)
        } else {
          ctx.fillStyle = col(C.indexLabel)
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('∅', bx + bucketW / 2, bucketsY + SLOT_H / 2)
        }
      }

      // Probe sequence arrow for open addressing
      if (strategy !== 'chaining' && probeSequence.length > 0) {
        const probeIdx = probeSequence.indexOf(i)
        if (probeIdx >= 0) {
          const slotH = SLOT_H
          const probeY = bucketsY + slotH + 6
          ctx.fillStyle = C.bucketProbe.border
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`↑${probeIdx}`, bx + bucketW / 2, probeY)
        }
      }
    }

    // ── Index labels below buckets ────────────────────────────────────────────
    const labelY = bucketsY + (strategy === 'chaining' ? maxChain * CHAIN_NODE_H + (maxChain - 1) * CHAIN_GAP : SLOT_H) + 16
    for (let i = 0; i < tableSize; i++) {
      const bx = PADDING_X + INDEX_W + i * (bucketW + BUCKET_GAP)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = col(C.indexLabel)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i), bx + bucketW / 2, labelY)
    }

    // ── Legend (strategy label) ───────────────────────────────────────────────
    const legendY = totalH - 18
    ctx.font = '11px sans-serif'
    ctx.fillStyle = col(C.textSub)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const strategyLabels: Record<CollisionStrategy, string> = {
      chaining: '체이닝 (Separate Chaining)',
      'linear-probing': '선형 프로빙 (Linear Probing)',
      'quadratic-probing': '이차 프로빙 (Quadratic Probing)',
    }
    ctx.fillText(strategyLabels[strategy], PADDING_X, legendY)

  }, [buckets, activeKey, activeHash, activeBucketIndex, probeSequence, strategy, width, totalH, dark, dpr, tableSize, bucketW, maxChain, contentH])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: totalH, display: 'block' }}
      className="rounded-lg"
    />
  )
}

// ── Utility: roundRect ─────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
