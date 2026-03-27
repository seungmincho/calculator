'use client'
import { useRef, useEffect, useState } from 'react'
import type { HuffmanNode } from '@/utils/algorithm/huffmanCoding'

export interface HuffmanCodingCanvas2DProps {
  tree: HuffmanNode | null
  highlightNodes: number[]
  codeTable: Record<string, string>
  freqMap: Record<string, number>
  encodedSoFar: string
  width?: number
  height?: number
}

const C = {
  bg:        { light: '#f8fafc', dark: '#111827' },
  text:      { light: '#1e293b', dark: '#f1f5f9' },
  textSub:   { light: '#64748b', dark: '#94a3b8' },
  node:      { fill: { light: '#dbeafe', dark: '#1e3a5f' }, border: { light: '#93c5fd', dark: '#3b82f6' } },
  leaf:      { fill: { light: '#dcfce7', dark: '#14532d' }, border: '#16a34a' },
  highlight: { fill: '#f59e0b', border: '#d97706', text: '#ffffff' },
  edge:      { light: '#94a3b8', dark: '#4b5563' },
  label0:    '#3b82f6',
  label1:    '#ef4444',
}

interface LayoutNode {
  node: HuffmanNode
  x: number
  y: number
  children: LayoutNode[]
}

function layoutTree(node: HuffmanNode | null, depth: number, xMin: number, xMax: number): LayoutNode | null {
  if (!node) return null
  const x = (xMin + xMax) / 2
  const y = 30 + depth * 60
  const children: LayoutNode[] = []
  if (node.left) {
    const lc = layoutTree(node.left, depth + 1, xMin, x)
    if (lc) children.push(lc)
  }
  if (node.right) {
    const rc = layoutTree(node.right, depth + 1, x, xMax)
    if (rc) children.push(rc)
  }
  return { node, x, y, children }
}

function getTreeDepth(node: HuffmanNode | null): number {
  if (!node) return 0
  return 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right))
}

function drawNode(ctx: CanvasRenderingContext2D, ln: LayoutNode, highlightSet: Set<number>, isDark: boolean) {
  const isLeaf = ln.node.char !== null
  const isHighlight = highlightSet.has(ln.node.id)
  const r = isLeaf ? 18 : 14

  // Draw edges first
  for (let i = 0; i < ln.children.length; i++) {
    const child = ln.children[i]
    ctx.beginPath()
    ctx.moveTo(ln.x, ln.y)
    ctx.lineTo(child.x, child.y)
    ctx.strokeStyle = isDark ? C.edge.dark : C.edge.light
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Edge label: 0 for left, 1 for right
    const mx = (ln.x + child.x) / 2
    const my = (ln.y + child.y) / 2
    const isLeft = i === 0 && ln.children.length > 1
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isLeft ? C.label0 : C.label1
    const offsetX = isLeft ? -8 : 8
    ctx.fillText(isLeft ? '0' : '1', mx + offsetX, my - 6)
  }

  // Draw children recursively
  for (const child of ln.children) {
    drawNode(ctx, child, highlightSet, isDark)
  }

  // Draw node circle
  let fill: string, border: string, textColor: string
  if (isHighlight) {
    fill = C.highlight.fill; border = C.highlight.border; textColor = C.highlight.text
  } else if (isLeaf) {
    fill = isDark ? C.leaf.fill.dark : C.leaf.fill.light
    border = C.leaf.border
    textColor = isDark ? C.text.dark : C.text.light
  } else {
    fill = isDark ? C.node.fill.dark : C.node.fill.light
    border = isDark ? C.node.border.dark : C.node.border.light
    textColor = isDark ? C.text.dark : C.text.light
  }

  if (isHighlight) {
    ctx.save()
    ctx.shadowColor = 'rgba(245,158,11,0.5)'
    ctx.shadowBlur = 10
  }

  ctx.beginPath()
  ctx.arc(ln.x, ln.y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = isHighlight ? 2.5 : 1.5
  ctx.stroke()

  if (isHighlight) ctx.restore()

  // Node text
  ctx.font = isLeaf ? 'bold 12px system-ui' : '10px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textColor

  if (isLeaf) {
    ctx.fillText(`${ln.node.char}`, ln.x, ln.y - 4)
    ctx.font = '9px system-ui'
    ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
    ctx.fillText(`${ln.node.freq}`, ln.x, ln.y + 8)
  } else {
    ctx.fillText(`${ln.node.freq}`, ln.x, ln.y)
  }
}

export default function HuffmanCodingCanvas2D({
  tree, highlightNodes, codeTable, freqMap, encodedSoFar,
  width = 700, height = 420,
}: HuffmanCodingCanvas2DProps) {
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

    const depth = tree ? getTreeDepth(tree) : 0
    const treeAreaH = Math.max(200, depth * 60 + 80)
    const tableH = Object.keys(codeTable).length > 0 ? 120 : 0
    const encodedH = encodedSoFar.length > 0 ? 50 : 0
    const logicalH = Math.max(height, treeAreaH + tableH + encodedH + 20)
    const logicalW = Math.max(width, 500)

    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    canvas.style.width = `${logicalW}px`
    canvas.style.height = `${logicalH}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? C.bg.dark : C.bg.light
    ctx.fillRect(0, 0, logicalW, logicalH)

    const highlightSet = new Set(highlightNodes)

    // Draw tree
    if (tree) {
      const layout = layoutTree(tree, 0, 20, logicalW - 20)
      if (layout) drawNode(ctx, layout, highlightSet, isDark)
    } else if (Object.keys(freqMap).length > 0) {
      // Draw frequency bars when no tree yet
      const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1])
      const maxFreq = entries[0][1]
      const barW = Math.min(40, (logicalW - 60) / entries.length - 4)
      const startX = (logicalW - entries.length * (barW + 4)) / 2

      for (let i = 0; i < entries.length; i++) {
        const [ch, freq] = entries[i]
        const x = startX + i * (barW + 4)
        const barH = (freq / maxFreq) * 120
        const y = 160 - barH

        ctx.fillStyle = isDark ? '#3b82f6' : '#60a5fa'
        ctx.beginPath()
        ctx.roundRect(x, y, barW, barH, 3)
        ctx.fill()

        ctx.font = 'bold 12px system-ui'
        ctx.textAlign = 'center'
        ctx.fillStyle = isDark ? C.text.dark : C.text.light
        ctx.fillText(`'${ch}'`, x + barW / 2, 175)
        ctx.font = '10px system-ui'
        ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
        ctx.fillText(String(freq), x + barW / 2, y - 6)
      }
    }

    // Draw code table below tree
    if (Object.keys(codeTable).length > 0) {
      const tableY = treeAreaH + 10
      const entries = Object.entries(codeTable).sort((a, b) => a[1].length - b[1].length)
      const colW = Math.min(100, (logicalW - 40) / entries.length)
      const startX = (logicalW - entries.length * colW) / 2

      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText('Code Table', logicalW / 2, tableY)

      for (let i = 0; i < entries.length; i++) {
        const [ch, code] = entries[i]
        const x = startX + i * colW + colW / 2

        // Char
        ctx.font = 'bold 14px system-ui'
        ctx.fillStyle = isDark ? C.text.dark : C.text.light
        ctx.fillText(`'${ch}'`, x, tableY + 22)

        // Code
        ctx.font = '11px monospace'
        ctx.fillStyle = '#3b82f6'
        ctx.fillText(code, x, tableY + 40)

        // Bits count
        ctx.font = '9px system-ui'
        ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
        ctx.fillText(`${code.length}b`, x, tableY + 54)
      }
    }

    // Draw encoded string preview
    if (encodedSoFar.length > 0) {
      const encY = treeAreaH + tableH + 10
      ctx.font = '9px monospace'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.textAlign = 'left'
      const preview = encodedSoFar.length > 80 ? encodedSoFar.slice(0, 80) + '...' : encodedSoFar
      ctx.fillText(`Encoded: ${preview}`, 20, encY + 12)
      ctx.fillText(`${encodedSoFar.length} bits`, 20, encY + 26)
    }
  }, [tree, highlightNodes, codeTable, freqMap, encodedSoFar, width, height, isDark])

  const depth = tree ? getTreeDepth(tree) : 0
  const treeAreaH = Math.max(200, depth * 60 + 80)
  const tableH = Object.keys(codeTable).length > 0 ? 120 : 0
  const encodedH = encodedSoFar.length > 0 ? 50 : 0
  const logicalH = Math.max(height, treeAreaH + tableH + encodedH + 20)
  const logicalW = Math.max(width, 500)

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
    />
  )
}
