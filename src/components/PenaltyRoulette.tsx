'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Plus, X, Sparkles, Zap } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

const CATEGORY_PRESETS: Record<string, { label: string; items: string[] }> = {
  company: {
    label: '회식',
    items: ['원샷', '노래 한곡', '셀카 찍기', '옆사람 칭찬', '춤추기', '개인기', '폭탄주 만들기', '사투리로 말하기'],
  },
  mt: {
    label: 'MT/여행',
    items: ['진실게임', '물 떠오기', '앞사람 업기', '꽃게춤', '모노드라마', '삼행시', '성대모사', '전화로 고백'],
  },
  couple: {
    label: '커플',
    items: ['뽀뽀', '안아주기', '칭찬 10초', '노래 불러주기', '소원 들어주기', '셀카', '편지쓰기', '간식 사주기'],
  },
  light: {
    label: '가벼운',
    items: ['하이파이브', '박수 10초', '만세', '윙크', '스쿼트 5회', '눈감고 한바퀴', '양팔벌려 10초', '제자리뛰기'],
  },
}

const WHEEL_COLORS = [
  '#f97316', '#fb923c', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899',
]

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
}

export default function PenaltyRoulette() {
  const t = useTranslations('penaltyRoulette')

  const [category, setCategory] = useState<string>('light')
  const [customItems, setCustomItems] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [activeItems, setActiveItems] = useState<string[]>(CATEGORY_PRESETS.light.items)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [showResult, setShowResult] = useState(false)

  const wheelRef = useRef<HTMLDivElement>(null)
  const particleIdRef = useRef(0)
  const animFrameRef = useRef<number | null>(null)

  // When category changes, update active items
  useEffect(() => {
    if (category === 'custom') {
      setActiveItems(customItems.length ? customItems : CATEGORY_PRESETS.light.items)
    } else {
      setActiveItems(CATEGORY_PRESETS[category]?.items ?? [])
    }
    setResult(null)
    setShowResult(false)
  }, [category, customItems])

  const spawnParticles = useCallback(() => {
    const colors = ['#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
    const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: particleIdRef.current++,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 40,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 4 + 2),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      life: 1,
    }))
    setParticles(newParticles)

    let frame = 0
    const animate = () => {
      frame++
      setParticles(prev =>
        prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 0.02 }))
          .filter(p => p.life > 0)
      )
      if (frame < 80) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const spin = useCallback(() => {
    if (spinning || activeItems.length === 0) return
    setSpinning(true)
    setResult(null)
    setShowResult(false)

    const itemCount = activeItems.length
    const winnerIndex = Math.floor(Math.random() * itemCount)
    const segmentDeg = 360 / itemCount
    // pointer is at top (270deg from right = -90deg). We want winnerIndex segment to land at top.
    const targetAngle = 360 * 5 + (360 - winnerIndex * segmentDeg - segmentDeg / 2)
    const newRotation = rotation + targetAngle

    setRotation(newRotation)

    setTimeout(() => {
      setResult(activeItems[winnerIndex])
      setHistory(prev => [activeItems[winnerIndex], ...prev].slice(0, 10))
      setSpinning(false)
      setShowResult(true)
      spawnParticles()
    }, 4200)
  }, [spinning, activeItems, rotation, spawnParticles])

  const addCustomItem = useCallback(() => {
    const trimmed = customInput.trim()
    if (!trimmed || customItems.includes(trimmed)) return
    setCustomItems(prev => [...prev, trimmed])
    setCustomInput('')
    if (category === 'custom') {
      setActiveItems(prev => [...prev, trimmed])
    }
  }, [customInput, customItems, category])

  const removeCustomItem = useCallback((item: string) => {
    setCustomItems(prev => prev.filter(i => i !== item))
  }, [])

  const resetAll = useCallback(() => {
    setResult(null)
    setShowResult(false)
    setHistory([])
    setRotation(0)
  }, [])

  const itemCount = activeItems.length
  const segmentDeg = itemCount > 0 ? 360 / itemCount : 360

  return (
    <div className="relative min-h-[600px]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/20 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-red-900/30 rounded-3xl" />

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-20">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life,
              transform: `rotate(${p.x * 10}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        {/* Category selector */}
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: 'inset 2px 2px 10px rgba(255,255,255,0.15), inset -2px -2px 10px rgba(255,255,255,0.05)',
          }}
        >
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{t('category')}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_PRESETS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  category === key
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                    : 'bg-white/20 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setCategory('custom')}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                category === 'custom'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                  : 'bg-white/20 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/20'
              }`}
            >
              {t('custom')}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Roulette Wheel */}
          <div className="flex flex-col items-center gap-4">
            {/* Pointer */}
            <div className="relative w-full flex justify-center">
              <div
                className="absolute top-0 z-10 w-0 h-0"
                style={{
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '24px solid #f97316',
                  filter: 'drop-shadow(0 2px 4px rgba(249,115,22,0.6))',
                  marginTop: '-2px',
                }}
              />
            </div>

            {/* Wheel */}
            <div className="relative" style={{ width: 260, height: 260 }}>
              {/* Outer ring glow */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #f97316, #facc15, #22c55e, #06b6d4, #8b5cf6, #ec4899, #f97316)',
                  padding: 4,
                  borderRadius: '50%',
                  filter: spinning ? 'blur(2px)' : 'none',
                  transition: 'filter 0.3s',
                }}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900" />
              </div>

              {/* Spinning wheel */}
              <div
                ref={wheelRef}
                className="absolute inset-1 rounded-full overflow-hidden"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {itemCount === 0 ? (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-4">{t('addItem')}</span>
                  </div>
                ) : (
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {activeItems.map((item, i) => {
                      const startAngle = (i * segmentDeg - 90) * (Math.PI / 180)
                      const endAngle = ((i + 1) * segmentDeg - 90) * (Math.PI / 180)
                      const x1 = 100 + 98 * Math.cos(startAngle)
                      const y1 = 100 + 98 * Math.sin(startAngle)
                      const x2 = 100 + 98 * Math.cos(endAngle)
                      const y2 = 100 + 98 * Math.sin(endAngle)
                      const largeArc = segmentDeg > 180 ? 1 : 0
                      const midAngle = ((i + 0.5) * segmentDeg - 90) * (Math.PI / 180)
                      const textX = 100 + 60 * Math.cos(midAngle)
                      const textY = 100 + 60 * Math.sin(midAngle)
                      const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
                      return (
                        <g key={i}>
                          <path
                            d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={color}
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={itemCount <= 4 ? 11 : itemCount <= 6 ? 9 : 7}
                            fontWeight="bold"
                            transform={`rotate(${(i + 0.5) * segmentDeg}, ${textX}, ${textY})`}
                          >
                            {item.length > 6 ? item.slice(0, 6) + '…' : item}
                          </text>
                        </g>
                      )
                    })}
                    {/* Center circle */}
                    <circle cx="100" cy="100" r="14" fill="white" stroke="#e5e7eb" strokeWidth="2" />
                    <circle cx="100" cy="100" r="8" fill="#f97316" />
                  </svg>
                )}
              </div>
            </div>

            {/* Spin button */}
            <button
              onClick={spin}
              disabled={spinning || activeItems.length < 2}
              className={`w-full max-w-[260px] py-3 rounded-2xl font-bold text-white text-lg transition-all duration-200 ${
                spinning || activeItems.length < 2
                  ? 'opacity-50 cursor-not-allowed bg-gray-400'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95'
              }`}
            >
              {spinning ? (
                <span className="flex items-center justify-center gap-2">
                  <RotateCcw className="w-5 h-5 animate-spin" />
                  {t('spinning')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('spin')}
                </span>
              )}
            </button>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Result display */}
            <div
              className="p-4 rounded-2xl min-h-[100px] flex flex-col items-center justify-center text-center"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: 'inset 2px 2px 10px rgba(255,255,255,0.15), inset -2px -2px 10px rgba(255,255,255,0.05)',
              }}
            >
              {showResult && result ? (
                <div
                  className="animate-bounce"
                  style={{ animationIterationCount: 3 }}
                >
                  <p className="text-xs text-orange-500 font-semibold uppercase tracking-widest mb-1">{t('penaltyIs')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{result}</p>
                  <button
                    onClick={spin}
                    disabled={spinning}
                    className="mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-1 mx-auto transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t('reroll')}
                  </button>
                </div>
              ) : (
                <div className="text-gray-400 dark:text-gray-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('ready')}</p>
                </div>
              )}
            </div>

            {/* Custom item manager (show for custom tab) */}
            {category === 'custom' && (
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'inset 2px 2px 10px rgba(255,255,255,0.15), inset -2px -2px 10px rgba(255,255,255,0.05)',
                }}
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('addCustom')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                    placeholder={t('placeholder')}
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={addCustomItem}
                    className="p-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {customItems.map(item => (
                    <span
                      key={item}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 dark:bg-white/10 text-sm text-gray-800 dark:text-gray-200"
                    >
                      {item}
                      <button
                        onClick={() => removeCustomItem(item)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {customItems.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('addItem')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Active items preview (for presets) */}
            {category !== 'custom' && (
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'inset 2px 2px 10px rgba(255,255,255,0.15), inset -2px -2px 10px rgba(255,255,255,0.05)',
                }}
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('result')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeItems.map((item, i) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 rounded-lg text-xs font-medium text-white"
                      style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'inset 2px 2px 10px rgba(255,255,255,0.15), inset -2px -2px 10px rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('history')}</p>
                  <button
                    onClick={resetAll}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    {t('reset')}
                  </button>
                </div>
                <ol className="space-y-1">
                  {history.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }}>
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Guide */}
        <GuideSection namespace="penaltyRoulette" />
      </div>
    </div>
  )
}
