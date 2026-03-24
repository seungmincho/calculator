'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Eye,
} from 'lucide-react'

interface DecisionToolsProps {
  initialTab?: 'roulette' | 'order'
}

const WHEEL_COLORS = [
  '#EF4444', // red
  '#3B82F6', // blue
  '#22C55E', // green
  '#F97316', // orange
  '#A855F7', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F59E0B', // amber
]

const PRESETS = {
  점심메뉴: ['짜장면', '짬뽕', '냉면', '비빔밥', '삼겹살', '라멘', '초밥', '피자'],
  벌칙: ['노래 한 곡', '춤 한 번', '커피 사기', '청소당번', '발표하기', '간식 사기'],
  순서: ['1번', '2번', '3번', '4번', '5번', '6번'],
}

const DEFAULT_PARTICIPANTS = ['참가자 1', '참가자 2', '참가자 3', '참가자 4']

// confetti colours
const CONFETTI_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899']

interface Confetti {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  alpha: number
}

export default function DecisionTools({ initialTab = 'roulette' }: DecisionToolsProps) {
  const searchParams = useSearchParams()

  // -- shared participants state --
  const getInitialRouletteItems = () => {
    const param = searchParams?.get('roulette')
    if (param) {
      const items = param.split(',').map(s => s.trim()).filter(Boolean)
      if (items.length >= 2) return items.slice(0, 12)
    }
    return DEFAULT_PARTICIPANTS
  }
  const getInitialOrderItems = () => {
    const param = searchParams?.get('order')
    if (param) {
      const items = param.split(',').map(s => s.trim()).filter(Boolean)
      if (items.length >= 2) return items
    }
    return DEFAULT_PARTICIPANTS
  }

  const [activeTab, setActiveTab] = useState<'roulette' | 'order'>(initialTab)

  // ─── Roulette state ───────────────────────────────────────────────────────
  const [rouletteItems, setRouletteItems] = useState<string[]>(getInitialRouletteItems)
  const [newRouletteItem, setNewRouletteItem] = useState('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [spinResult, setSpinResult] = useState<string | null>(null)
  const [spinHistory, setSpinHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [rouletteCopied, setRouletteCopied] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const velocityRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const confettiRef = useRef<Confetti[]>([])
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null)
  const confettiRafRef = useRef<number | null>(null)

  // ─── Order Picker state ──────────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState<string[]>(getInitialOrderItems)
  const [newOrderItem, setNewOrderItem] = useState('')
  const [orderResult, setOrderResult] = useState<string[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [isShuffling, setIsShuffling] = useState(false)
  const [orderCopied, setOrderCopied] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)

  // ─── URL sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('roulette', rouletteItems.join(','))
    window.history.replaceState({}, '', url)
  }, [rouletteItems])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('order', orderItems.join(','))
    window.history.replaceState({}, '', url)
  }, [orderItems])

  // ─── Draw roulette wheel ─────────────────────────────────────────────────
  const drawWheel = useCallback((angle: number, items: string[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const radius = cx - 4

    ctx.clearRect(0, 0, size, size)

    const sliceAngle = (2 * Math.PI) / items.length

    items.forEach((item, i) => {
      const startAngle = angle + i * sliceAngle
      const endAngle = startAngle + sliceAngle

      // slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // label
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(10, Math.min(16, Math.floor(radius / items.length * 1.4)))}px sans-serif`
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 3

      const maxLen = 12
      const label = item.length > maxLen ? item.slice(0, maxLen - 1) + '…' : item
      ctx.fillText(label, radius - 12, 5)
      ctx.restore()
    })

    // center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [])

  useEffect(() => {
    drawWheel(currentAngle, rouletteItems)
  }, [currentAngle, rouletteItems, drawWheel])

  // ─── Spin logic ───────────────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (isSpinning || rouletteItems.length < 2) return

    // clear confetti
    if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current)
    confettiRef.current = []
    const confettiCanvas = confettiCanvasRef.current
    if (confettiCanvas) {
      const ctx = confettiCanvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
    }

    setIsSpinning(true)
    setSpinResult(null)

    const minRotations = 3
    const minVelocity = 15
    const maxVelocity = 25
    velocityRef.current = minVelocity + Math.random() * (maxVelocity - minVelocity)

    // ensure at least minRotations full spins
    const targetExtraAngle = (minRotations + Math.random()) * 2 * Math.PI
    let accumulatedAngle = 0
    let hasMinRotations = false

    const friction = 0.98

    const animate = () => {
      velocityRef.current *= friction
      accumulatedAngle += velocityRef.current * (1 / 60)
      angleRef.current += velocityRef.current * (1 / 60)
      setCurrentAngle(angleRef.current)

      if (accumulatedAngle >= targetExtraAngle) hasMinRotations = true

      if (hasMinRotations && velocityRef.current < 0.05) {
        // determine result: pointer is at top (angle = -PI/2 from canvas)
        // The item under the top is determined by normalizing the angle
        const sliceAngle = (2 * Math.PI) / rouletteItems.length
        // top of canvas is at -PI/2; find which segment contains that angle
        const normalizedAngle = ((angleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        // pointer at top = -PI/2 => in wheel coords that's 3PI/2 from 0
        const pointerAngle = ((3 * Math.PI) / 2 - normalizedAngle + 2 * Math.PI) % (2 * Math.PI)
        const index = Math.floor(pointerAngle / sliceAngle) % rouletteItems.length
        const result = rouletteItems[index]

        setSpinResult(result)
        setSpinHistory(prev => [result, ...prev].slice(0, 20))
        setIsSpinning(false)

        // launch confetti
        launchConfetti()
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [isSpinning, rouletteItems])

  const launchConfetti = () => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    const particles: Confetti[] = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 40,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 12 - 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      alpha: 1,
    }))
    confettiRef.current = particles

    const animateConfetti = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      confettiRef.current.forEach(p => {
        p.vy += 0.4
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.alpha -= 0.015
        if (p.alpha > 0) {
          alive = true
          ctx.save()
          ctx.globalAlpha = p.alpha
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          ctx.restore()
        }
      })

      if (alive) confettiRafRef.current = requestAnimationFrame(animateConfetti)
    }
    confettiRafRef.current = requestAnimationFrame(animateConfetti)
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current)
    }
  }, [])

  // ─── Roulette item management ─────────────────────────────────────────────
  const addRouletteItem = () => {
    const trimmed = newRouletteItem.trim()
    if (!trimmed || rouletteItems.length >= 12) return
    setRouletteItems(prev => [...prev, trimmed])
    setNewRouletteItem('')
  }

  const removeRouletteItem = (index: number) => {
    if (rouletteItems.length <= 2) return
    setRouletteItems(prev => prev.filter((_, i) => i !== index))
  }

  const applyPreset = (key: keyof typeof PRESETS) => {
    setRouletteItems(PRESETS[key].slice(0, 12))
  }

  const copyRouletteResult = async () => {
    if (!spinResult) return
    try {
      await navigator.clipboard.writeText(spinResult)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = spinResult
      ta.style.position = 'fixed'
      ta.style.left = '-999999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setRouletteCopied(true)
    setTimeout(() => setRouletteCopied(false), 2000)
  }

  // ─── Order Picker logic ───────────────────────────────────────────────────
  const addOrderItem = () => {
    const trimmed = newOrderItem.trim()
    if (!trimmed) return
    setOrderItems(prev => [...prev, trimmed])
    setNewOrderItem('')
  }

  const removeOrderItem = (index: number) => {
    if (orderItems.length <= 2) return
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  const startOrder = useCallback(async () => {
    if (isShuffling || isRevealing || orderItems.length < 2) return
    setIsShuffling(true)
    setOrderResult([])
    setRevealedCount(0)

    await new Promise(r => setTimeout(r, 400))

    const shuffled = [...orderItems].sort(() => Math.random() - 0.5)
    setOrderResult(shuffled)
    setIsShuffling(false)
    setIsRevealing(true)

    for (let i = 1; i <= shuffled.length; i++) {
      await new Promise(r => setTimeout(r, 500))
      setRevealedCount(i)
    }
    setIsRevealing(false)
  }, [isShuffling, isRevealing, orderItems])

  const revealAll = useCallback(() => {
    if (orderResult.length === 0) return
    setRevealedCount(orderResult.length)
    setIsRevealing(false)
  }, [orderResult])

  const resetOrder = () => {
    setOrderResult([])
    setRevealedCount(0)
    setIsRevealing(false)
    setIsShuffling(false)
  }

  const copyOrderResult = async () => {
    if (orderResult.length === 0) return
    const text = orderResult.map((name, i) => `${i + 1}위: ${name}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-999999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setOrderCopied(true)
    setTimeout(() => setOrderCopied(false), 2000)
  }

  const rankColor = (rank: number) => {
    if (rank === 0) return 'from-yellow-400 to-amber-500'  // gold
    if (rank === 1) return 'from-gray-300 to-gray-400'     // silver
    if (rank === 2) return 'from-amber-600 to-amber-700'   // bronze
    return 'from-blue-500 to-indigo-600'
  }

  const rankLabel = (rank: number) => {
    if (rank === 0) return '1위 🥇'
    if (rank === 1) return '2위 🥈'
    if (rank === 2) return '3위 🥉'
    return `${rank + 1}위`
  }

  // ─── Canvas responsive size ───────────────────────────────────────────────
  const [canvasSize, setCanvasSize] = useState(300)
  const wheelContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      if (wheelContainerRef.current) {
        const w = wheelContainerRef.current.clientWidth
        setCanvasSize(Math.max(280, Math.min(380, w - 8)))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">결정 도구</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          돌림판과 순서뽑기로 공정하게 결정하세요
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {(['roulette', 'order'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab === 'roulette' ? '🎡 돌림판' : '🎴 순서뽑기'}
          </button>
        ))}
      </div>

      {/* ═══ ROULETTE TAB ═══════════════════════════════════════════════════ */}
      {activeTab === 'roulette' && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: items + presets */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">항목 설정</h2>
                <span className="text-xs text-gray-400">{rouletteItems.length}/12</span>
              </div>

              {/* Preset buttons */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">프리셋</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    >
                      {key === '점심메뉴' ? '🍱 점심메뉴' : key === '벌칙' ? '😈 벌칙' : '📋 순서'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item list */}
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {rouletteItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                    />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item}
                    </span>
                    <button
                      onClick={() => removeRouletteItem(i)}
                      disabled={rouletteItems.length <= 2}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRouletteItem}
                  onChange={e => setNewRouletteItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRouletteItem()}
                  placeholder="항목 추가..."
                  maxLength={20}
                  disabled={rouletteItems.length >= 12}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={addRouletteItem}
                  disabled={rouletteItems.length >= 12 || !newRouletteItem.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* History */}
            {spinHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span>뽑기 기록 ({spinHistory.length})</span>
                  {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showHistory && (
                  <ul className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                    {spinHistory.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right: wheel + result */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              {/* Wheel container */}
              <div ref={wheelContainerRef} className="relative flex flex-col items-center gap-4">
                {/* Pointer arrow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: '10px solid transparent',
                      borderRight: '10px solid transparent',
                      borderTop: '20px solid #1e293b',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    }}
                  />
                </div>

                {/* Relative wrapper for confetti overlay */}
                <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
                  <canvas
                    ref={canvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    className="rounded-full shadow-xl"
                  />
                  <canvas
                    ref={confettiCanvasRef}
                    width={canvasSize}
                    height={canvasSize}
                    className="absolute inset-0 pointer-events-none"
                  />
                </div>

                {/* Spin button */}
                <button
                  onClick={spin}
                  disabled={isSpinning || rouletteItems.length < 2}
                  className="w-full max-w-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-3 font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                >
                  {isSpinning ? '돌아가는 중...' : '🎡 돌리기!'}
                </button>
              </div>
            </div>

            {/* Result card */}
            {spinResult && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl shadow-lg p-5 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">결과</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{spinResult}</p>
                  <button
                    onClick={copyRouletteResult}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    {rouletteCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {rouletteCopied ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ORDER PICKER TAB ════════════════════════════════════════════════ */}
      {activeTab === 'order' && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: participants */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">참가자 목록</h2>

              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {orderItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item}
                    </span>
                    <button
                      onClick={() => removeOrderItem(i)}
                      disabled={orderItems.length <= 2}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Add participant */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOrderItem}
                  onChange={e => setNewOrderItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOrderItem()}
                  placeholder="참가자 추가..."
                  maxLength={20}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addOrderItem}
                  disabled={!newOrderItem.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={startOrder}
                  disabled={isShuffling || isRevealing || orderItems.length < 2}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow active:scale-95"
                >
                  <Shuffle size={18} />
                  {isShuffling ? '섞는 중...' : '뽑기!'}
                </button>
                {orderResult.length > 0 && (
                  <button
                    onClick={resetOrder}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="초기화"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: result cards */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  순서 결과
                  {isRevealing && (
                    <span className="ml-2 text-sm text-gray-400">
                      {revealedCount}/{orderResult.length}
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  {isRevealing && revealedCount < orderResult.length && (
                    <button
                      onClick={revealAll}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Eye size={14} />
                      전체 공개
                    </button>
                  )}
                  {orderResult.length > 0 && revealedCount === orderResult.length && (
                    <button
                      onClick={copyOrderResult}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {orderCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {orderCopied ? '복사됨' : '결과 복사'}
                    </button>
                  )}
                </div>
              </div>

              {orderResult.length === 0 && !isShuffling && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <Shuffle size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">왼쪽에서 뽑기를 시작하세요</p>
                </div>
              )}

              {isShuffling && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-4xl animate-bounce mb-3">🎴</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">섞는 중...</p>
                </div>
              )}

              {!isShuffling && orderResult.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {orderResult.map((name, i) => {
                    const revealed = i < revealedCount
                    return (
                      <div
                        key={i}
                        className={`relative rounded-xl overflow-hidden transition-all duration-500 ${
                          revealed ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                        }`}
                        style={{ minHeight: 96 }}
                      >
                        {revealed ? (
                          <div
                            className={`flex flex-col items-center justify-center h-full p-3 bg-gradient-to-br ${rankColor(i)} text-white`}
                            style={{ minHeight: 96 }}
                          >
                            <span className="text-xs font-bold opacity-90 mb-1">{rankLabel(i)}</span>
                            <span className="text-base font-bold text-center break-words leading-tight">
                              {name}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center h-full p-3 bg-gray-200 dark:bg-gray-700"
                            style={{ minHeight: 96 }}
                          >
                            <span className="text-3xl text-gray-400 dark:text-gray-500">?</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
