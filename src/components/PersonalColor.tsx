'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Palette,
  Copy,
  Check,
  Download,
  Share2,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

type SeasonType = 'springWarm' | 'summerCool' | 'autumnWarm' | 'winterCool'

const SEASON_KEYS: SeasonType[] = ['springWarm', 'summerCool', 'autumnWarm', 'winterCool']

const COLOR_MAP: Record<string, Record<string, string>> = {
  springWarm: {
    best: JSON.stringify({
      '#FF7F7F': 'coral',
      '#FFCBA4': 'peach',
      '#FFFFF0': 'ivory',
      '#FA8072': 'salmon',
      '#FFB347': 'lightOrange',
      '#FF69B4': 'warmPink',
    }),
    worst: JSON.stringify({
      '#1A1A1A': 'black',
      '#9CA3AF': 'coolGray',
      '#800020': 'burgundy',
      '#1E3A5F': 'navy',
    }),
  },
  summerCool: {
    best: JSON.stringify({
      '#E6E6FA': 'lavender',
      '#FF66B2': 'rosePink',
      '#87CEEB': 'skyBlue',
      '#F5F5F5': 'softWhite',
      '#89CFF0': 'babyBlue',
      '#C8A2C8': 'lilac',
    }),
    worst: JSON.stringify({
      '#FF8C00': 'orange',
      '#8B8000': 'khaki',
      '#FFD700': 'gold',
      '#FFDB58': 'mustard',
    }),
  },
  autumnWarm: {
    best: JSON.stringify({
      '#E2725B': 'terracotta',
      '#800020': 'burgundy',
      '#808000': 'olive',
      '#FFDB58': 'mustard',
      '#C19A6B': 'camel',
      '#CB4154': 'brickRed',
    }),
    worst: JSON.stringify({
      '#FFB6C1': 'pastelPink',
      '#C0C0C0': 'silver',
      '#39FF14': 'neon',
      '#6495ED': 'coolBlue',
    }),
  },
  winterCool: {
    best: JSON.stringify({
      '#FFFFFF': 'pureWhite',
      '#000000': 'black',
      '#FF0000': 'red',
      '#4169E1': 'royalBlue',
      '#50C878': 'emerald',
      '#FF69B4': 'hotPink',
    }),
    worst: JSON.stringify({
      '#D2B48C': 'beige',
      '#8B8000': 'khaki',
      '#FFFACD': 'pastelYellow',
      '#FFD700': 'gold',
    }),
  },
}

function getBestColors(season: SeasonType): Record<string, string> {
  return JSON.parse(COLOR_MAP[season].best)
}
function getWorstColors(season: SeasonType): Record<string, string> {
  return JSON.parse(COLOR_MAP[season].worst)
}

const SEASON_GRADIENTS: Record<SeasonType, string> = {
  springWarm: 'from-pink-400 to-orange-300',
  summerCool: 'from-blue-400 to-purple-300',
  autumnWarm: 'from-orange-500 to-amber-400',
  winterCool: 'from-purple-600 to-gray-800',
}

const SEASON_BG: Record<SeasonType, string> = {
  springWarm: 'from-pink-50 to-orange-50 dark:from-pink-950 dark:to-orange-950',
  summerCool: 'from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950',
  autumnWarm: 'from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950',
  winterCool: 'from-purple-50 to-gray-50 dark:from-purple-950 dark:to-gray-950',
}

const SEASON_ACCENT: Record<SeasonType, string> = {
  springWarm: 'text-pink-600 dark:text-pink-400',
  summerCool: 'text-blue-600 dark:text-blue-400',
  autumnWarm: 'text-orange-600 dark:text-orange-400',
  winterCool: 'text-purple-600 dark:text-purple-400',
}

const SEASON_BAR: Record<SeasonType, string> = {
  springWarm: 'bg-pink-400',
  summerCool: 'bg-blue-400',
  autumnWarm: 'bg-orange-400',
  winterCool: 'bg-purple-500',
}

const SEASON_RING: Record<SeasonType, string> = {
  springWarm: 'ring-pink-400',
  summerCool: 'ring-blue-400',
  autumnWarm: 'ring-orange-400',
  winterCool: 'ring-purple-500',
}

const CANVAS_GRADIENTS: Record<SeasonType, [string, string]> = {
  springWarm: ['#f9a8d4', '#fdba74'],
  summerCool: ['#93c5fd', '#c4b5fd'],
  autumnWarm: ['#f97316', '#fbbf24'],
  winterCool: ['#7c3aed', '#1f2937'],
}

type Phase = 'intro' | 'questions' | 'analyzing' | 'result'

interface Question {
  question: string
  options: string[]
}

export default function PersonalColor() {
  const t = useTranslations('personalColor')
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(12).fill(null))
  const [result, setResult] = useState<SeasonType | null>(null)
  const [scores, setScores] = useState<Record<SeasonType, number>>({
    springWarm: 0,
    summerCool: 0,
    autumnWarm: 0,
    winterCool: 0,
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const questions = t.raw('questions') as Question[]

  // Load result from URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const typeParam = params.get('type') as SeasonType | null
    if (typeParam && SEASON_KEYS.includes(typeParam)) {
      setResult(typeParam)
      // Simulate even scores with the winner boosted
      const fakeScores: Record<SeasonType, number> = {
        springWarm: 2,
        summerCool: 2,
        autumnWarm: 2,
        winterCool: 2,
      }
      fakeScores[typeParam] = 6
      setScores(fakeScores)
      setPhase('result')
    }
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const handleStart = useCallback(() => {
    setPhase('questions')
    setCurrentQ(0)
    setAnswers(Array(12).fill(null))
  }, [])

  const handleSelect = useCallback(
    (optionIdx: number) => {
      setAnswers((prev) => {
        const next = [...prev]
        next[currentQ] = optionIdx
        return next
      })
    },
    [currentQ]
  )

  const handleNext = useCallback(() => {
    if (currentQ < 11) {
      setSlideDir('left')
      setCurrentQ((p) => p + 1)
    } else {
      // Calculate scores
      const s: Record<SeasonType, number> = {
        springWarm: 0,
        summerCool: 0,
        autumnWarm: 0,
        winterCool: 0,
      }
      answers.forEach((a) => {
        if (a !== null) {
          s[SEASON_KEYS[a]] += 1
        }
      })
      setScores(s)

      // Analyzing phase
      setPhase('analyzing')
      setTimeout(() => {
        const winner = SEASON_KEYS.reduce((best, key) =>
          s[key] > s[best] ? key : best
        )
        setResult(winner)

        // Update URL
        const url = new URL(window.location.href)
        url.searchParams.set('type', winner)
        window.history.replaceState({}, '', url.toString())

        setPhase('result')
      }, 2500)
    }
  }, [currentQ, answers])

  const handlePrev = useCallback(() => {
    if (currentQ > 0) {
      setSlideDir('right')
      setCurrentQ((p) => p - 1)
    }
  }, [currentQ])

  const handleRetry = useCallback(() => {
    setPhase('intro')
    setResult(null)
    setAnswers(Array(12).fill(null))
    setCurrentQ(0)
    const url = new URL(window.location.href)
    url.searchParams.delete('type')
    window.history.replaceState({}, '', url.toString())
  }, [])

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1

  const handleSaveImage = useCallback(() => {
    if (!result) return
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 500
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background gradient
    const [c1, c2] = CANVAS_GRADIENTS[result]
    const grad = ctx.createLinearGradient(0, 0, 800, 500)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, 800, 500, 24)
    ctx.fill()

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, 0, 800, 500)

    // Emoji
    ctx.font = '64px serif'
    ctx.textAlign = 'center'
    ctx.fillText(t(`types.${result}.emoji`), 400, 100)

    // Title
    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 6
    ctx.fillText(t(`types.${result}.name`), 400, 170)

    // Description
    ctx.shadowBlur = 0
    ctx.font = '18px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    const desc = t(`types.${result}.description`)
    const words = desc.split('')
    let line = ''
    let y = 220
    for (const ch of words) {
      const testLine = line + ch
      if (ctx.measureText(testLine).width > 680) {
        ctx.fillText(line, 400, y)
        line = ch
        y += 28
      } else {
        line = testLine
      }
    }
    if (line) ctx.fillText(line, 400, y)

    // Color swatches
    const bestColors = getBestColors(result)
    const hexes = Object.keys(bestColors)
    const swatchY = y + 50
    const swatchSize = 50
    const gap = 16
    const totalWidth = hexes.length * swatchSize + (hexes.length - 1) * gap
    let startX = (800 - totalWidth) / 2

    ctx.font = 'bold 16px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(t('bestColors'), 400, swatchY - 10)

    hexes.forEach((hex, i) => {
      const x = startX + i * (swatchSize + gap)
      ctx.fillStyle = hex
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(x, swatchY + 10, swatchSize, swatchSize, 8)
      ctx.fill()
      ctx.stroke()
    })

    // Watermark
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('toolhub.ai.kr', 400, 480)

    // Download
    const link = document.createElement('a')
    link.download = `personal-color-${result}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [result, t])

  const handleShare = useCallback(async () => {
    if (!result) return
    const url = new URL(window.location.href)
    url.searchParams.set('type', result)
    const shareData = {
      title: t('title'),
      text: `${t(`types.${result}.emoji`)} ${t(`types.${result}.name`)} - ${t('title')}`,
      url: url.toString(),
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard(url.toString(), 'share')
    }
  }, [result, t, copyToClipboard])

  const handleCopyLink = useCallback(() => {
    if (!result) return
    const url = new URL(window.location.href)
    url.searchParams.set('type', result)
    copyToClipboard(url.toString(), 'link')
  }, [result, copyToClipboard])

  // ── Intro Phase ──
  if (phase === 'intro') {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg p-8 text-center text-white">
          <div className="text-5xl mb-4">
            <Palette className="inline-block w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold mb-3">{t('title')}</h1>
          <p className="text-lg text-white/90 mb-8 max-w-lg mx-auto">{t('description')}</p>

          {/* Season preview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-xl mx-auto">
            {SEASON_KEYS.map((key) => (
              <div
                key={key}
                className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center"
              >
                <div className="text-2xl mb-1">{t(`types.${key}.emoji`)}</div>
                <div className="text-sm font-medium">{t(`types.${key}.name`)}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="bg-white text-purple-600 font-bold px-8 py-4 rounded-xl text-lg hover:bg-purple-50 transition-colors shadow-lg"
          >
            <Sparkles className="inline-block w-5 h-5 mr-2 -mt-0.5" />
            {t('startButton')}
          </button>
        </div>

        {/* Guide */}
        <GuideSection t={t} guideOpen={guideOpen} setGuideOpen={setGuideOpen} />
      </div>
    )
  }

  // ── Analyzing Phase ──
  if (phase === 'analyzing') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            {/* Spinning color wheel */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
              {SEASON_KEYS.map((key, i) => {
                const colors = Object.keys(getBestColors(key))
                const angle = (i * 90) + 45
                const rad = (angle * Math.PI) / 180
                const x = 36 + Math.cos(rad) * 30
                const y = 36 + Math.sin(rad) * 30
                return (
                  <div
                    key={key}
                    className="absolute w-10 h-10 rounded-full shadow-lg"
                    style={{
                      backgroundColor: colors[0],
                      left: `${x}px`,
                      top: `${y}px`,
                    }}
                  />
                )
              })}
            </div>
          </div>
          <div className="animate-pulse">
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              {t('analyzing')}
            </p>
          </div>
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Questions Phase ──
  if (phase === 'questions') {
    const q = questions[currentQ]
    const progress = ((currentQ + 1) / 12) * 100

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {currentQ + 1} {t('questionOf')}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div
            key={currentQ}
            className={`transition-all duration-300 ${
              slideDir === 'left'
                ? 'animate-[slideInLeft_0.3s_ease-out]'
                : 'animate-[slideInRight_0.3s_ease-out]'
            }`}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {q.question}
            </h2>

            <div className="space-y-3">
              {q.options.map((option: string, idx: number) => {
                const selected = answers[currentQ] === idx
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${
                      selected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-300 dark:ring-purple-700'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    <span
                      className={`text-sm sm:text-base ${
                        selected
                          ? 'text-purple-700 dark:text-purple-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrev}
              disabled={currentQ === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('prevButton')}
            </button>
            <button
              onClick={handleNext}
              disabled={answers[currentQ] === null}
              className="flex items-center gap-1 px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {currentQ === 11 ? t('resultTitle') : t('nextButton')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Result Phase ──
  if (phase === 'result' && result) {
    const bestColors = getBestColors(result)
    const worstColors = getWorstColors(result)
    const bestColorNames = t.raw(`types.${result}.bestColors`) as string[]
    const worstColorNames = t.raw(`types.${result}.worstColors`) as string[]

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        {/* Result Header Card */}
        <div
          className={`bg-gradient-to-br ${SEASON_BG[result]} rounded-xl shadow-lg overflow-hidden`}
        >
          <div
            className={`bg-gradient-to-r ${SEASON_GRADIENTS[result]} p-6 sm:p-8 text-center text-white`}
          >
            <p className="text-sm font-medium text-white/80 mb-2">{t('resultTitle')}</p>
            <div className="text-5xl mb-3">{t(`types.${result}.emoji`)}</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">
              {t(`types.${result}.name`)}
            </h2>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed mb-6">
              {t(`types.${result}.description`)}
            </p>
            <p className={`text-center text-sm ${SEASON_ACCENT[result]} font-medium`}>
              {t(`types.${result}.characteristics`)}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('resultTitle')}
          </h3>
          <div className="space-y-3">
            {SEASON_KEYS.map((key) => {
              const pct = Math.round((scores[key] / totalScore) * 100)
              const isWinner = key === result
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span
                      className={`font-medium ${
                        isWinner
                          ? SEASON_ACCENT[key]
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {t(`types.${key}.emoji`)} {t(`types.${key}.name`)}
                    </span>
                    <span
                      className={`${
                        isWinner ? 'font-bold ' + SEASON_ACCENT[key] : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`${SEASON_BAR[key]} h-3 rounded-full transition-all duration-700 ease-out ${
                        isWinner ? 'ring-2 ' + SEASON_RING[key] : ''
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Best & Worst Colors */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Best Colors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              {t('bestColors')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(bestColors).map(([hex], i) => (
                <div key={hex} className="text-center">
                  <div
                    className="w-full aspect-square rounded-xl shadow-md border border-gray-200 dark:border-gray-600 mb-1.5"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {bestColorNames[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Colors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('worstColors')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(worstColors).map(([hex], i) => (
                <div key={hex} className="text-center">
                  <div
                    className="w-full aspect-square rounded-xl shadow-md border border-gray-200 dark:border-gray-600 mb-1.5 relative"
                    style={{ backgroundColor: hex }}
                  >
                    {/* X mark overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-red-500/60 text-3xl font-bold drop-shadow-sm">
                        ✕
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {worstColorNames[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Celebrity & Fashion Tips */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('celebrities')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {t(`types.${result}.celebrities`)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('fashionTips')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {t(`types.${result}.fashionTips`)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleSaveImage}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            {t('saveImageButton')}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium transition-all"
          >
            <Share2 className="w-4 h-4" />
            {t('shareButton')}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            {copiedId === 'link' ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                {t('linkCopied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t('copyLinkButton')}
              </>
            )}
          </button>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('retryButton')}
          </button>
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Guide */}
        <GuideSection t={t} guideOpen={guideOpen} setGuideOpen={setGuideOpen} />
      </div>
    )
  }

  return null
}

// ── Guide Section Component ──
function GuideSection({
  t,
  guideOpen,
  setGuideOpen,
}: {
  t: ReturnType<typeof useTranslations>
  guideOpen: boolean
  setGuideOpen: (v: boolean) => void
}) {
  const whatIsItems = t.raw('guide.whatIs.items') as string[]
  const tipsItems = t.raw('guide.tips.items') as string[]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <button
        onClick={() => setGuideOpen(!guideOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            guideOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {guideOpen && (
        <div className="px-6 pb-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.whatIs.title')}
            </h3>
            <ul className="space-y-2">
              {whatIsItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm"
                >
                  <span className="text-purple-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {tipsItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-sm"
                >
                  <span className="text-pink-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
