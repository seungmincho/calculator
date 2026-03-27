'use client'
import { useRef, useEffect, useState } from 'react'

export interface CoinChangeCanvas2DProps {
  dp: number[]
  amount: number
  coins: number[]
  activeAmount: number        // current amount being computed
  activeCoin?: number         // current coin being tried
  filledSet: Set<number>      // amounts already computed
  selectedCoins: number[]     // backtracked coins
  backtrackAmount: number     // current backtrack position (-1 = none)
  width?: number
  height?: number
}

const BAR_GAP = 2
const PADDING = 30
const BOTTOM_PAD = 60
const TOP_PAD = 30
const INF = 1e9

const C = {
  bg:         { light: '#f8fafc', dark: '#111827' },
  text:       { light: '#1e293b', dark: '#f1f5f9' },
  textSub:    { light: '#64748b', dark: '#94a3b8' },
  barDefault: { light: '#e2e8f0', dark: '#374151' },
  barFilled:  { light: '#a5f3fc', dark: '#164e63' },
  barActive:  { fill: '#06b6d4', text: '#ffffff' },
  barUpdate:  { light: '#86efac', dark: '#14532d' },
  barBacktrack: { light: '#fef3c7', dark: '#451a03' },
  barInf:     { light: '#fecaca', dark: '#450a0a' },
  coinBg:     { light: '#fef9c3', dark: '#422006' },
  coinText:   { light: '#854d0e', dark: '#fbbf24' },
}

export default function CoinChangeCanvas2D({
  dp, amount, coins, activeAmount, activeCoin,
  filledSet, selectedCoins, backtrackAmount,
  width = 700, height = 360,
}: CoinChangeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  const barCount = amount + 1
  const maxBarW = 40
  const logicalW = Math.max(width, PADDING * 2 + barCount * (maxBarW + BAR_GAP))
  const logicalH = height

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

    const chartH = logicalH - TOP_PAD - BOTTOM_PAD
    const barW = Math.min(maxBarW, (logicalW - PADDING * 2) / barCount - BAR_GAP)
    const startX = PADDING + (logicalW - PADDING * 2 - barCount * (barW + BAR_GAP)) / 2

    // Find max dp value (ignoring INF) for scaling
    let maxVal = 1
    for (let i = 0; i <= amount; i++) {
      if (dp[i] !== undefined && dp[i] < INF && dp[i] > maxVal) maxVal = dp[i]
    }

    // Backtrack set
    const backtrackSet = new Set<number>()
    if (selectedCoins.length > 0) {
      let rem = amount
      for (const coin of selectedCoins) {
        backtrackSet.add(rem)
        rem -= coin
      }
      backtrackSet.add(0)
    }

    // Draw bars
    for (let i = 0; i <= amount; i++) {
      const x = startX + i * (barW + BAR_GAP)
      const val = dp[i] !== undefined ? dp[i] : INF
      const isInf = val >= INF
      const isFilled = filledSet.has(i)
      const isActive = i === activeAmount
      const isBacktrack = backtrackSet.has(i) && backtrackAmount >= 0

      // Bar height
      const barH = isInf ? 4 : Math.max(4, (val / maxVal) * (chartH - 20))
      const barY = TOP_PAD + chartH - barH

      // Color
      let fill: string
      if (isActive) {
        fill = C.barActive.fill
      } else if (isBacktrack) {
        fill = isDark ? C.barBacktrack.dark : C.barBacktrack.light
      } else if (isInf && isFilled) {
        fill = isDark ? C.barInf.dark : C.barInf.light
      } else if (isFilled) {
        fill = isDark ? C.barFilled.dark : C.barFilled.light
      } else {
        fill = isDark ? C.barDefault.dark : C.barDefault.light
      }

      // Glow for active
      if (isActive) {
        ctx.save()
        ctx.shadowColor = 'rgba(6,182,212,0.5)'
        ctx.shadowBlur = 8
      }

      // Draw bar
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.roundRect(x, barY, barW, barH, [3, 3, 0, 0])
      ctx.fill()

      if (isActive) ctx.restore()

      // Value on top
      if (isFilled || isActive) {
        ctx.font = 'bold 10px system-ui'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = isActive ? C.barActive.fill : (isDark ? C.text.dark : C.text.light)
        ctx.fillText(isInf ? 'INF' : String(val), x + barW / 2, barY - 3)
      }

      // Amount label at bottom
      ctx.font = '9px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isDark ? C.textSub.dark : C.textSub.light
      ctx.fillText(String(i), x + barW / 2, TOP_PAD + chartH + 4)
    }

    // Draw active coin indicator
    if (activeCoin !== undefined && activeAmount >= 0) {
      const coinY = logicalH - 25
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'left'
      ctx.fillStyle = isDark ? C.coinText.dark : C.coinText.light
      ctx.fillText(`coin: ${activeCoin}`, PADDING, coinY)
    }

    // Draw selected coins at bottom
    if (selectedCoins.length > 0) {
      const coinsY = logicalH - 25
      let cx = logicalW / 2 - (selectedCoins.length * 30) / 2
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const coin of selectedCoins) {
        // Coin circle
        ctx.fillStyle = isDark ? C.coinBg.dark : C.coinBg.light
        ctx.beginPath()
        ctx.arc(cx + 12, coinsY, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = isDark ? C.coinText.dark : C.coinText.light
        ctx.fillText(String(coin), cx + 12, coinsY)
        cx += 28
      }
    }
  }, [dp, amount, coins, activeAmount, activeCoin, filledSet, selectedCoins, backtrackAmount, width, height, isDark, logicalW, logicalH])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: logicalW, height: logicalH }}
      className="rounded-xl"
    />
  )
}
