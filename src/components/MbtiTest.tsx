'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Share2, Copy, Check, Download, ExternalLink, RotateCcw } from 'lucide-react'
import { testQuestions, calculateResult, mbtiProfiles, type MbtiType, type TestResult } from '@/data/mbtiData'

type Screen = 'intro' | 'test' | 'result'

export default function MbtiTest() {
  const t = useTranslations('mbtiTest')

  const [screen, setScreen] = useState<Screen>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')
  const [isAnimating, setIsAnimating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Sync result type with URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const resultParam = params.get('result') as MbtiType | null
    if (resultParam && mbtiProfiles[resultParam]) {
      const fakeAnswers: Record<number, string> = {}
      // Build plausible answers from the URL type param to reconstruct scores
      const typeChars = resultParam.split('')
      testQuestions.forEach(q => {
        if (q.axis === 'EI') fakeAnswers[q.id] = typeChars[0]
        else if (q.axis === 'SN') fakeAnswers[q.id] = typeChars[1]
        else if (q.axis === 'TF') fakeAnswers[q.id] = typeChars[2]
        else if (q.axis === 'JP') fakeAnswers[q.id] = typeChars[3]
      })
      setAnswers(fakeAnswers)
      setResult(calculateResult(fakeAnswers))
      setScreen('result')
    }
  }, [])

  const totalQuestions = testQuestions.length
  const progress = Math.round((Object.keys(answers).length / totalQuestions) * 100)

  const handleAnswer = useCallback((value: string) => {
    const questionId = testQuestions[currentQ].id
    setAnswers(prev => ({ ...prev, [questionId]: value }))

    if (currentQ < totalQuestions - 1) {
      setAnimDir('forward')
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentQ(q => q + 1)
        setIsAnimating(false)
      }, 180)
    }
  }, [currentQ, totalQuestions])

  const handlePrev = useCallback(() => {
    if (currentQ > 0) {
      setAnimDir('back')
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentQ(q => q - 1)
        setIsAnimating(false)
      }, 180)
    }
  }, [currentQ])

  const handleNext = useCallback(() => {
    if (currentQ < totalQuestions - 1) {
      setAnimDir('forward')
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentQ(q => q + 1)
        setIsAnimating(false)
      }, 180)
    }
  }, [currentQ, totalQuestions])

  const handleSeeResult = useCallback(() => {
    const calcResult = calculateResult(answers)
    setResult(calcResult)
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('result', calcResult.type)
    window.history.replaceState({}, '', url)
    setScreen('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [answers])

  const handleRetake = useCallback(() => {
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('result')
    window.history.replaceState({}, '', url)
    setScreen('intro')
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

  const handleShareX = useCallback(() => {
    if (!result) return
    const profile = mbtiProfiles[result.type]
    const text = t('shareText').replace('{type}', result.type).replace('{nickname}', profile.nickname)
    const url = `https://toolhub.ai.kr/mbti-test?result=${result.type}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
  }, [result, t])

  const handleDownloadCard = useCallback(() => {
    if (!result) return
    const profile = mbtiProfiles[result.type]
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    const W = 600
    const H = 400
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    // Background gradient
    const [c1, c2] = profile.colorGradient
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Overlay for readability
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, W, H)

    // Emoji
    ctx.font = '56px serif'
    ctx.textAlign = 'center'
    ctx.fillText(profile.emoji, W / 2, 80)

    // Type name
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(result.type, W / 2, 155)

    // Nickname
    ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText(profile.nickname + ' · ' + profile.nicknameEn, W / 2, 190)

    // Short description
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(profile.shortDesc, W / 2, 220)

    // Axis bars
    const axes: Array<{ label: string; pct: number; left: string; right: string }> = [
      { label: 'E / I', pct: result.percentages.EI, left: 'E', right: 'I' },
      { label: 'S / N', pct: result.percentages.SN, left: 'S', right: 'N' },
      { label: 'T / F', pct: result.percentages.TF, left: 'T', right: 'F' },
      { label: 'J / P', pct: result.percentages.JP, left: 'J', right: 'P' },
    ]
    const barX = 60
    const barW = W - 120
    const barH = 10
    const startY = 255

    axes.forEach((axis, i) => {
      const y = startY + i * 30

      // Left label
      ctx.font = '13px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.textAlign = 'left'
      ctx.fillText(axis.left, barX - 20, y + 8)

      // Right label
      ctx.textAlign = 'right'
      ctx.fillText(axis.right, barX + barW + 20, y + 8)

      // Background bar
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.roundRect(barX, y, barW, barH, 5)
      ctx.fill()

      // Filled bar
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.beginPath()
      ctx.roundRect(barX, y, barW * (axis.pct / 100), barH, 5)
      ctx.fill()

      // Percentage text
      ctx.font = '12px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.textAlign = 'center'
      ctx.fillText(`${axis.pct}%`, barX + barW * (axis.pct / 100) + 18, y + 8)
    })

    // Branding
    ctx.font = '13px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'center'
    ctx.fillText('toolhub.ai.kr', W / 2, H - 15)

    const link = document.createElement('a')
    link.download = `MBTI_${result.type}_result.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [result])

  const allAnswered = Object.keys(answers).length === totalQuestions
  const currentQuestion = testQuestions[currentQ]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined

  // ─── Intro Screen ───
  if (screen === 'intro') {
    const guideWhat = t.raw('guide.what.items') as string[]
    const guideHowTo = t.raw('guide.howTo.items') as string[]
    const guideAxes = t.raw('guide.axes.items') as string[]

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('description')}</p>
        </div>

        {/* Guide sections */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>

          <div className="grid sm:grid-cols-3 gap-5">
            {/* What is MBTI */}
            <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-5">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">{t('guide.what.title')}</h3>
              <ul className="space-y-2">
                {guideWhat.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-purple-700 dark:text-purple-300">
                    <span className="mt-0.5 text-purple-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How to */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('guide.howTo.title')}</h3>
              <ul className="space-y-2">
                {guideHowTo.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="mt-0.5 text-blue-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Axes */}
            <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-5">
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">{t('guide.axes.title')}</h3>
              <ul className="space-y-2">
                {guideAxes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                    <span className="mt-0.5 text-indigo-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => setScreen('test')}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl px-6 py-4 font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            {t('startTest')} →
          </button>
        </div>
      </div>
    )
  }

  // ─── Test Screen ───
  if (screen === 'test') {
    const axisLabels: Record<string, string> = {
      EI: 'E / I',
      SN: 'S / N',
      TF: 'T / F',
      JP: 'J / P',
    }

    return (
      <div className="space-y-5">
        {/* Progress header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('question')} {currentQ + 1}{t('of')}{totalQuestions}
            </span>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {t('progress')} {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">{axisLabels[currentQuestion.axis]}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {Object.keys(answers).length} / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Question card */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 transition-all duration-180 ${
            isAnimating
              ? animDir === 'forward'
                ? 'opacity-0 translate-x-4'
                : 'opacity-0 -translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
          style={{ transform: isAnimating ? undefined : 'translateX(0)', transition: 'opacity 0.18s, transform 0.18s' }}
        >
          <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-8 text-center leading-relaxed">
            {currentQuestion.question}
          </p>

          <div className="flex flex-col gap-4">
            {/* Option A */}
            <button
              onClick={() => handleAnswer(currentQuestion.optionA.value)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all duration-150 ${
                currentAnswer === currentQuestion.optionA.value
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-200'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900'
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  currentAnswer === currentQuestion.optionA.value
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-500'
                }`}>
                  {currentAnswer === currentQuestion.optionA.value && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
                {currentQuestion.optionA.text}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">VS</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            </div>

            {/* Option B */}
            <button
              onClick={() => handleAnswer(currentQuestion.optionB.value)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all duration-150 ${
                currentAnswer === currentQuestion.optionB.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900'
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  currentAnswer === currentQuestion.optionB.value
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300 dark:border-gray-500'
                }`}>
                  {currentAnswer === currentQuestion.optionB.value && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
                {currentQuestion.optionB.text}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={currentQ === 0}
            className="flex items-center gap-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('prev')}
          </button>

          <div className="flex-1" />

          {allAnswered ? (
            <button
              onClick={handleSeeResult}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
            >
              {t('seeResult')} 🎉
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentQ === totalQuestions - 1}
              className="flex items-center gap-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Question dots preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {testQuestions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  setAnimDir(i > currentQ ? 'forward' : 'back')
                  setCurrentQ(i)
                }}
                className={`w-6 h-6 rounded-full text-xs font-medium transition-all ${
                  i === currentQ
                    ? 'bg-purple-600 text-white scale-110'
                    : answers[q.id]
                    ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}
                title={`Q${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Result Screen ───
  if (screen === 'result' && result) {
    const profile = mbtiProfiles[result.type]
    const [colorFrom, colorTo] = profile.colorGradient

    const axes = [
      { axis: 'EI', left: 'E', right: 'I', leftPct: result.percentages.EI, rightPct: 100 - result.percentages.EI, dominant: result.type[0] },
      { axis: 'SN', left: 'S', right: 'N', leftPct: result.percentages.SN, rightPct: 100 - result.percentages.SN, dominant: result.type[1] },
      { axis: 'TF', left: 'T', right: 'F', leftPct: result.percentages.TF, rightPct: 100 - result.percentages.TF, dominant: result.type[2] },
      { axis: 'JP', left: 'J', right: 'P', leftPct: result.percentages.JP, rightPct: 100 - result.percentages.JP, dominant: result.type[3] },
    ]

    const shareUrl = `https://toolhub.ai.kr/mbti-test?result=${result.type}`

    return (
      <div className="space-y-5">
        {/* Type badge hero */}
        <div
          className="rounded-2xl shadow-xl p-8 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
        >
          <div className="text-6xl mb-3">{profile.emoji}</div>
          <div className="text-5xl font-bold tracking-wider mb-2">{result.type}</div>
          <div className="text-xl font-semibold opacity-90 mb-1">{profile.nickname} · {profile.nicknameEn}</div>
          <div className="text-sm opacity-75">{profile.shortDesc}</div>
          <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 text-sm">
            {t('koreanPopulation')}: {profile.koreanPercent}%
          </div>
        </div>

        {/* Axis distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">{t('typeDistribution')}</h2>
          <div className="space-y-4">
            {axes.map(({ axis, left, right, leftPct, rightPct, dominant }) => (
              <div key={axis}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-semibold ${dominant === left ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {left} {dominant === left && `${leftPct}%`}
                  </span>
                  <span className={`text-sm font-semibold ${dominant === right ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {dominant === right && `${rightPct}%`} {right}
                  </span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-l-full transition-all duration-700"
                    style={{
                      width: `${leftPct}%`,
                      background: `linear-gradient(to right, ${colorFrom}, ${colorTo})`,
                    }}
                  />
                  <div
                    className="h-full rounded-r-full"
                    style={{ width: `${rightPct}%`, background: '#e5e7eb' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traits, strengths, weaknesses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
          {/* Traits */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('personality')}</h2>
            <div className="flex flex-wrap gap-2">
              {profile.traits.map(trait => (
                <span
                  key={trait}
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Strengths & weaknesses */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">{t('strengths')}</h3>
              <ul className="space-y-1.5">
                {profile.strengths.map(s => (
                  <li key={s} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3">{t('weaknesses')}</h3>
              <ul className="space-y-1.5">
                {profile.weaknesses.map(w => (
                  <li key={w} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                    <span className="text-red-400 mt-0.5">△</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Communication & love style */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('communicationStyle')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{profile.communicationStyle}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('loveStyle')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{profile.loveStyle}</p>
          </div>
        </div>

        {/* Careers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('careers')}</h2>
          <div className="flex flex-wrap gap-2">
            {profile.careers.map(career => (
              <span
                key={career}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
              >
                {career}
              </span>
            ))}
          </div>
        </div>

        {/* Famous people */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('famousPeople')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">한국인</h3>
              <div className="flex flex-wrap gap-2">
                {profile.famousKoreans.map(p => (
                  <span key={p} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">해외</h3>
              <div className="flex flex-wrap gap-2">
                {profile.famousInternational.map(p => (
                  <span key={p} className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg text-sm">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Share section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('shareResult')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Copy link */}
            <button
              onClick={() => copyToClipboard(shareUrl, 'link')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors text-sm"
            >
              {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiedId === 'link' ? t('copied') : t('copyLink')}
            </button>

            {/* X/Twitter */}
            <button
              onClick={handleShareX}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white font-medium transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
              {t('shareX')}
            </button>

            {/* Download card */}
            <button
              onClick={handleDownloadCard}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium transition-all text-sm col-span-2 sm:col-span-1"
            >
              <Download className="w-4 h-4" />
              {t('downloadCard')}
            </button>
          </div>
        </div>

        {/* CTA: Compatibility check */}
        <div
          className="rounded-2xl p-6 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
        >
          <div className="text-2xl mb-2">💑</div>
          <p className="font-semibold mb-4 text-lg">나의 유형과 궁합이 맞는 유형은?</p>
          <a
            href={`/mbti-compatibility?type=${result.type}`}
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl px-6 py-3 font-semibold transition-all text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            {t('checkCompatibility')}
          </a>
        </div>

        {/* Retake & disclaimer */}
        <div className="space-y-4">
          <button
            onClick={handleRetake}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('retake')}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 px-4">{t('disclaimer')}</p>
        </div>

        {/* Hidden canvas for download */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  return null
}
