'use client'
import { useRef, useEffect, useState } from 'react'

interface StackQueueCanvas2DProps {
  stack: number[]
  queue: number[]
  activeOp: string | null
  activeTarget: 'stack' | 'queue' | null
  activeValue: number | null
  width?: number
  height?: number
}

// Block color palette (cycles by index)
const PALETTE = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
]

function blockColor(value: number): string {
  return PALETTE[Math.abs(value) % PALETTE.length]
}

const BLOCK_W = 60
const BLOCK_H = 36
const BLOCK_GAP = 4
const FONT_SIZE = 14

export default function StackQueueCanvas2D({
  stack,
  queue,
  activeOp,
  activeTarget,
  activeValue,
  width = 680,
  height = 360,
}: StackQueueCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () =>
      setIsDark(document.documentElement.classList.contains('dark') || mq.matches)
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    const bg = isDark ? '#111827' : '#f9fafb'
    const textColor = isDark ? '#f3f4f6' : '#111827'
    const subText = isDark ? '#9ca3af' : '#6b7280'
    const divider = isDark ? '#374151' : '#e5e7eb'
    const containerBg = isDark ? '#1f2937' : '#ffffff'
    const shadowColor = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)'

    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // ── Divider ──────────────────────────────────────────────
    const midX = width / 2
    ctx.strokeStyle = divider
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(midX, 0)
    ctx.lineTo(midX, height)
    ctx.stroke()
    ctx.setLineDash([])

    // ── Section titles ────────────────────────────────────────
    ctx.font = `bold 13px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = subText
    ctx.fillText('Stack (LIFO)', midX / 2, 18)
    ctx.fillText('Queue (FIFO)', midX + midX / 2, 18)

    // ─────────────────────────────────────────────────────────
    // STACK — vertical tower, bottom-anchored
    // ─────────────────────────────────────────────────────────
    const stackPanelW = midX - 20
    const stackContainerW = BLOCK_W + 24
    const stackContainerH = height - 60
    const containerX = (stackPanelW - stackContainerW) / 2
    const containerY = 30

    // Container box (open top)
    ctx.fillStyle = containerBg
    ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
    ctx.lineWidth = 2
    // Sides + bottom only (open top)
    ctx.beginPath()
    ctx.moveTo(containerX, containerY)
    ctx.lineTo(containerX, containerY + stackContainerH)
    ctx.lineTo(containerX + stackContainerW, containerY + stackContainerH)
    ctx.lineTo(containerX + stackContainerW, containerY)
    ctx.stroke()

    // Labels
    ctx.font = `11px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = subText

    const maxVisibleStack = Math.floor(stackContainerH / (BLOCK_H + BLOCK_GAP))
    const visibleStack = stack.slice(-maxVisibleStack)

    visibleStack.forEach((val, i) => {
      const isTop = i === visibleStack.length - 1
      const isActive =
        activeTarget === 'stack' && activeValue === val && isTop

      const bx = containerX + 12
      const by =
        containerY +
        stackContainerH -
        (i + 1) * (BLOCK_H + BLOCK_GAP) -
        BLOCK_GAP

      const color = blockColor(val)

      // Shadow
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = isActive ? 12 : 4
      ctx.shadowOffsetY = 2

      // Block
      ctx.fillStyle = isActive ? color : color + 'cc'
      roundRect(ctx, bx, by, BLOCK_W, BLOCK_H, 6)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      // Glow ring for active
      if (isActive) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        roundRect(ctx, bx, by, BLOCK_W, BLOCK_H, 6)
        ctx.stroke()
      }

      // Value text
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${FONT_SIZE}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(String(val), bx + BLOCK_W / 2, by + BLOCK_H / 2 + 5)

      // TOP label arrow
      if (isTop) {
        ctx.fillStyle = '#10b981'
        ctx.font = `bold 10px sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText('▶ TOP', containerX + stackContainerW + 4, by + BLOCK_H / 2 + 4)
      }
    })

    if (stack.length === 0) {
      ctx.fillStyle = subText
      ctx.font = `12px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('비어 있음', containerX + stackContainerW / 2, containerY + stackContainerH / 2)
    }

    // LIFO arrow hint
    ctx.fillStyle = '#10b981'
    ctx.font = `bold 11px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('↑ push / pop ↑', containerX + stackContainerW / 2, containerY - 6)

    // ─────────────────────────────────────────────────────────
    // QUEUE — horizontal pipe, left=front, right=rear
    // ─────────────────────────────────────────────────────────
    const qStartX = midX + 12
    const qPanelW = midX - 20
    const pipeH = BLOCK_H + 16
    const pipeY = height / 2 - pipeH / 2
    const pipeX = qStartX + 4
    const pipeW = qPanelW - 8

    // Pipe container (open left + right)
    ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db'
    ctx.lineWidth = 2
    ctx.beginPath()
    // Top line (with gaps at ends for open pipe effect)
    ctx.moveTo(pipeX + 18, pipeY)
    ctx.lineTo(pipeX + pipeW - 18, pipeY)
    // Bottom line
    ctx.moveTo(pipeX + 18, pipeY + pipeH)
    ctx.lineTo(pipeX + pipeW - 18, pipeY + pipeH)
    ctx.stroke()

    // Front arrow (left)
    ctx.fillStyle = '#f59e0b'
    ctx.font = `bold 16px sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('⟸', pipeX, pipeY + pipeH / 2 + 6)

    // Rear arrow (right)
    ctx.fillStyle = '#3b82f6'
    ctx.font = `bold 16px sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText('⟸', pipeX + pipeW, pipeY + pipeH / 2 + 6)

    // FRONT / REAR labels
    ctx.font = `bold 10px sans-serif`
    ctx.fillStyle = '#f59e0b'
    ctx.textAlign = 'center'
    ctx.fillText('FRONT', pipeX + 10, pipeY - 6)
    ctx.fillStyle = '#3b82f6'
    ctx.fillText('REAR', pipeX + pipeW - 10, pipeY - 6)

    // Queue dequeue/enqueue labels
    ctx.font = `10px sans-serif`
    ctx.fillStyle = '#f59e0b'
    ctx.textAlign = 'center'
    ctx.fillText('dequeue ←', pipeX + 10, pipeY + pipeH + 16)
    ctx.fillStyle = '#3b82f6'
    ctx.fillText('→ enqueue', pipeX + pipeW - 10, pipeY + pipeH + 16)

    // Queue blocks — fit inside pipe
    const maxVisibleQueue = Math.floor(pipeW / (BLOCK_W + BLOCK_GAP + 2))
    const visibleQueue = queue.slice(0, maxVisibleQueue)
    const totalBlockW = visibleQueue.length * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP
    const blockStartX = pipeX + (pipeW - totalBlockW) / 2
    const blockY = pipeY + (pipeH - BLOCK_H) / 2

    visibleQueue.forEach((val, i) => {
      const isFront = i === 0
      const isRear = i === visibleQueue.length - 1
      const isActive =
        activeTarget === 'queue' &&
        activeValue === val &&
        (isFront || isRear)

      const bx = blockStartX + i * (BLOCK_W + BLOCK_GAP)
      const color = blockColor(val)

      ctx.shadowColor = shadowColor
      ctx.shadowBlur = isActive ? 12 : 4
      ctx.shadowOffsetY = 2

      ctx.fillStyle = isActive ? color : color + 'cc'
      roundRect(ctx, bx, blockY, BLOCK_W, BLOCK_H, 6)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      if (isActive) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        roundRect(ctx, bx, blockY, BLOCK_W, BLOCK_H, 6)
        ctx.stroke()
      }

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${FONT_SIZE}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(String(val), bx + BLOCK_W / 2, blockY + BLOCK_H / 2 + 5)
    })

    if (queue.length === 0) {
      ctx.fillStyle = subText
      ctx.font = `12px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('비어 있음', pipeX + pipeW / 2, pipeY + pipeH / 2 + 5)
    }

    if (queue.length > maxVisibleQueue) {
      ctx.fillStyle = subText
      ctx.font = `11px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`+${queue.length - maxVisibleQueue} more`, pipeX + pipeW / 2, pipeY + pipeH + 30)
    }

    // ── Operation label overlay ───────────────────────────────
    if (activeOp && activeTarget && activeValue !== null) {
      const opColor =
        activeOp === 'push' || activeOp === 'enqueue'
          ? '#10b981'
          : activeOp === 'peek-stack' || activeOp === 'peek-queue'
          ? '#f59e0b'
          : '#ef4444'
      const opX = activeTarget === 'stack' ? midX / 2 : midX + midX / 2
      ctx.fillStyle = opColor + 'cc'
      roundRect(ctx, opX - 55, height - 28, 110, 22, 6)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `bold 12px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${activeOp.toUpperCase()}(${activeValue})`, opX, height - 13)
    }
  }, [stack, queue, activeOp, activeTarget, activeValue, width, height, isDark])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl"
      style={{ display: 'block', maxWidth: '100%' }}
    />
  )
}

/** Helper: draw a rounded rect path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
