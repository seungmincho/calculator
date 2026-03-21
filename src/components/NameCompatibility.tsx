'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Heart, Copy, Check, Download, Share2, RefreshCw, BookOpen, ChevronDown } from 'lucide-react'

// ── Korean character decomposition constants ──
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

// ㅇ group (1 stroke) - simple/basic jamo
const IEUNG_GROUP = new Set([
  'ㄱ','ㄴ','ㅇ','ㅁ','ㅂ','ㅈ','ㄷ','ㅅ',
  'ㅐ','ㅔ','ㅣ','ㅡ','ㅏ','ㅓ','ㅗ','ㅜ'
])

// Everything else is ㅎ group (3 strokes)

function decompose(char: string): string[] {
  const code = char.charCodeAt(0) - 0xAC00
  if (code < 0 || code > 11171) return []
  const cho = Math.floor(code / 588)
  const jung = Math.floor((code % 588) / 28)
  const jong = code % 28
  const result = [CHO[cho], JUNG[jung]]
  if (jong > 0) result.push(JONG[jong])
  return result
}

function getStrokeValue(jamo: string): number {
  return IEUNG_GROUP.has(jamo) ? 1 : 3
}

function getCharStrokes(char: string): number {
  const jamos = decompose(char)
  return jamos.reduce((sum, j) => sum + getStrokeValue(j), 0)
}

function interleaveNames(name1: string, name2: string): string[] {
  const maxLen = Math.max(name1.length, name2.length)
  const result: string[] = []
  for (let i = 0; i < maxLen; i++) {
    if (i < name1.length) result.push(name1[i])
    if (i < name2.length) result.push(name2[i])
  }
  return result
}

function reduceNumbers(numbers: number[]): number[][] {
  const rows: number[][] = [numbers]
  let current = [...numbers]
  while (current.length > 2) {
    const next: number[] = []
    for (let i = 0; i < current.length - 1; i++) {
      next.push((current[i] + current[i + 1]) % 10)
    }
    rows.push(next)
    current = next
  }
  return rows
}

function isKorean(str: string): boolean {
  return /^[가-힣]+$/.test(str)
}

type Phase = 'input' | 'calculating' | 'result'

export default function NameCompatibility() {
  const t = useTranslations('nameCompatibility')
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [error, setError] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  // Animation state
  const [animStep, setAnimStep] = useState(0) // 0=interleave, 1=strokes, 2=reducing rows
  const [visibleRows, setVisibleRows] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [showResult, setShowResult] = useState(false)

  // Calculation data
  const [interleaved, setInterleaved] = useState<string[]>([])
  const [strokeNumbers, setStrokeNumbers] = useState<number[]>([])
  const [reductionRows, setReductionRows] = useState<number[][]>([])
  const [finalScore, setFinalScore] = useState(0)

  const resultCardRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── URL param sync ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const n1 = params.get('name1')
    const n2 = params.get('name2')
    if (n1 && n2 && isKorean(n1) && isKorean(n2)) {
      setName1(n1)
      setName2(n2)
    }
  }, [])

  const updateURL = useCallback((n1: string, n2: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('name1', n1)
    url.searchParams.set('name2', n2)
    window.history.replaceState({}, '', url.toString())
  }, [])

  // ── Calculate ──
  const calculate = useCallback(() => {
    setError('')
    if (!name1.trim() || !name2.trim()) {
      setError(t('inputError'))
      return
    }
    if (!isKorean(name1.trim()) || !isKorean(name2.trim())) {
      setError(t('nameError'))
      return
    }
    const n1 = name1.trim()
    const n2 = name2.trim()
    if (n1.length < 2 || n1.length > 5 || n2.length < 2 || n2.length > 5) {
      setError(t('nameError'))
      return
    }

    updateURL(n1, n2)

    const mixed = interleaveNames(n1, n2)
    const strokes = mixed.map(c => getCharStrokes(c))
    const rows = reduceNumbers(strokes)
    const lastRow = rows[rows.length - 1]
    const score = lastRow.length >= 2 ? lastRow[0] * 10 + lastRow[1] : lastRow[0]

    setInterleaved(mixed)
    setStrokeNumbers(strokes)
    setReductionRows(rows)
    setFinalScore(score)
    setPhase('calculating')
    setAnimStep(0)
    setVisibleRows(0)
    setDisplayScore(0)
    setShowResult(false)

    // Animation sequence
    setTimeout(() => setAnimStep(1), 600)
    setTimeout(() => {
      setAnimStep(2)
      // Reveal reduction rows one by one
      rows.forEach((_, idx) => {
        setTimeout(() => setVisibleRows(idx + 1), idx * 350)
      })
      // After all rows shown, show result
      setTimeout(() => {
        setPhase('result')
        setShowResult(true)
        // Animate score counter
        const duration = 1200
        const steps = 30
        const increment = score / steps
        let current = 0
        const interval = setInterval(() => {
          current += increment
          if (current >= score) {
            setDisplayScore(score)
            clearInterval(interval)
          } else {
            setDisplayScore(Math.floor(current))
          }
        }, duration / steps)
      }, rows.length * 350 + 400)
    }, 1200)
  }, [name1, name2, t, updateURL])

  // ── Result message ──
  const getResultMessage = useCallback((score: number): string => {
    if (score >= 90) return t('resultMessages.perfect')
    if (score >= 80) return t('resultMessages.great')
    if (score >= 70) return t('resultMessages.good')
    if (score >= 50) return t('resultMessages.average')
    if (score >= 30) return t('resultMessages.belowAverage')
    return t('resultMessages.low')
  }, [t])

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-red-500'
    if (score >= 80) return 'text-pink-500'
    if (score >= 70) return 'text-rose-400'
    if (score >= 50) return 'text-orange-400'
    if (score >= 30) return 'text-yellow-500'
    return 'text-gray-400'
  }

  const getScoreGradient = (score: number): string => {
    if (score >= 80) return 'from-pink-500 to-red-500'
    if (score >= 60) return 'from-orange-400 to-pink-500'
    if (score >= 40) return 'from-yellow-400 to-orange-400'
    return 'from-gray-400 to-yellow-400'
  }

  // ── Reset ──
  const reset = useCallback(() => {
    setPhase('input')
    setAnimStep(0)
    setVisibleRows(0)
    setDisplayScore(0)
    setShowResult(false)
    setError('')
  }, [])

  // ── Copy link ──
  const copyLink = useCallback(async () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('name1', name1.trim())
      url.searchParams.set('name2', name2.trim())
      await navigator.clipboard.writeText(url.toString())
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }, [name1, name2])

  // ── Save image ──
  const saveImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = 600
    const h = 400
    canvas.width = w
    canvas.height = h

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#ec4899')
    grad.addColorStop(1, '#ef4444')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(w * 0.2, h * 0.3, 80, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w * 0.8, h * 0.7, 60, 0, Math.PI * 2)
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'

    // Title
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(t('title'), w / 2, 50)

    // Names
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText(`${name1.trim()}  ${t('and')}  ${name2.trim()}`, w / 2, 120)

    // Score
    ctx.font = 'bold 80px sans-serif'
    ctx.fillText(`${finalScore}${t('score')}`, w / 2, 230)

    // Message
    ctx.font = '18px sans-serif'
    const msg = getResultMessage(finalScore)
    ctx.fillText(msg, w / 2, 290)

    // Hearts decoration
    ctx.font = '30px sans-serif'
    ctx.fillText('💕', 80, 340)
    ctx.fillText('💕', w - 80, 340)

    // Watermark
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('toolhub.ai.kr', w / 2, h - 20)

    // Download
    const link = document.createElement('a')
    link.download = `name-compatibility-${name1.trim()}-${name2.trim()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [name1, name2, finalScore, getResultMessage, t])

  // ── Share ──
  const shareResult = useCallback(async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('name1', name1.trim())
    url.searchParams.set('name2', name2.trim())
    const shareData = {
      title: t('title'),
      text: `${name1.trim()} ${t('and')} ${name2.trim()} - ${finalScore}${t('score')} ${getResultMessage(finalScore)}`,
      url: url.toString(),
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch { /* user cancelled */ }
    } else {
      await copyLink()
    }
  }, [name1, name2, finalScore, getResultMessage, t, copyLink])

  // ── Jamo display for a character ──
  const renderJamoBreakdown = (char: string) => {
    const jamos = decompose(char)
    return jamos.map((j, i) => (
      <span key={i} className={`text-xs font-mono ${IEUNG_GROUP.has(j) ? 'text-blue-500 dark:text-blue-400' : 'text-pink-500 dark:text-pink-400'}`}>
        {j}
      </span>
    ))
  }

  return (
    <div className="space-y-8">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <Heart className="w-6 h-6 text-pink-500" />
          {t('title')}
          <Heart className="w-6 h-6 text-pink-500" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Card */}
      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">

          {/* Input Phase */}
          {phase === 'input' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('name1')}
                  </label>
                  <input
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    placeholder={t('name1Placeholder')}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 text-center text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('name2')}
                  </label>
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    placeholder={t('name2Placeholder')}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 text-center text-lg"
                    onKeyDown={(e) => { if (e.key === 'Enter') calculate() }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <button
                onClick={calculate}
                className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg px-4 py-3 font-medium hover:from-pink-600 hover:to-red-600 transition-all flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                {t('startButton')}
              </button>
            </div>
          )}

          {/* Calculating / Result Phase */}
          {(phase === 'calculating' || phase === 'result') && (
            <div className="space-y-6">
              {/* Names display */}
              <div className="text-center">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {name1.trim()}
                </span>
                <span className="text-xl text-pink-500 mx-2">{t('and')}</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {name2.trim()}
                </span>
              </div>

              {/* Step 1: Interleaved characters */}
              {animStep >= 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('step1')}</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {interleaved.map((char, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center p-2 bg-pink-50 dark:bg-pink-950 rounded-lg transition-all duration-300"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{char}</span>
                        {animStep >= 1 && (
                          <div className="flex gap-0.5 mt-1">
                            {renderJamoBreakdown(char)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Stroke numbers */}
              {animStep >= 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('step2')}</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {strokeNumbers.map((num, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 flex items-center justify-center bg-pink-100 dark:bg-pink-900 rounded-full text-sm font-bold text-pink-700 dark:text-pink-300 transition-all duration-300"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Reduction rows */}
              {animStep >= 2 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('step3')}</h3>
                  <div className="space-y-1">
                    {reductionRows.map((row, rowIdx) => (
                      rowIdx > 0 && rowIdx <= visibleRows && (
                        <div key={rowIdx} className="flex flex-wrap justify-center gap-2 transition-all duration-300">
                          {row.map((num, i) => (
                            <div
                              key={i}
                              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                                rowIdx === reductionRows.length - 1
                                  ? 'bg-red-500 text-white scale-110'
                                  : 'bg-pink-50 dark:bg-pink-900 text-pink-700 dark:text-pink-300'
                              }`}
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Calculating indicator */}
              {phase === 'calculating' && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                    {t('calculating')}
                  </p>
                </div>
              )}

              {/* Result */}
              {showResult && (
                <div ref={resultCardRef} className="space-y-4">
                  <div className="text-center space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('resultTitle')}</h2>

                    {/* Score circle */}
                    <div className="relative inline-flex items-center justify-center">
                      <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getScoreGradient(finalScore)} flex items-center justify-center shadow-lg`}>
                        <div className="text-center">
                          <span className="text-4xl font-bold text-white">{displayScore}</span>
                          <span className="text-lg text-white/80">{t('score')}</span>
                        </div>
                      </div>
                      {/* Floating hearts */}
                      {finalScore >= 70 && (
                        <>
                          <Heart className="absolute -top-2 -right-2 w-6 h-6 text-pink-400 animate-bounce" fill="currentColor" />
                          <Heart className="absolute -bottom-1 -left-3 w-5 h-5 text-red-400 animate-bounce" fill="currentColor" style={{ animationDelay: '0.3s' }} />
                        </>
                      )}
                      {finalScore >= 90 && (
                        <Heart className="absolute top-0 -left-4 w-4 h-4 text-pink-300 animate-bounce" fill="currentColor" style={{ animationDelay: '0.6s' }} />
                      )}
                    </div>

                    <p className={`text-lg font-medium ${getScoreColor(finalScore)}`}>
                      {getResultMessage(finalScore)}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={shareResult}
                      className="flex items-center gap-1.5 px-4 py-2 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors text-sm font-medium"
                    >
                      <Share2 className="w-4 h-4" />
                      {t('shareButton')}
                    </button>
                    <button
                      onClick={saveImage}
                      className="flex items-center gap-1.5 px-4 py-2 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      {t('saveImageButton')}
                    </button>
                    <button
                      onClick={copyLink}
                      className="flex items-center gap-1.5 px-4 py-2 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors text-sm font-medium"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? t('linkCopied') : t('copyLinkButton')}
                    </button>
                  </div>

                  {/* Retry */}
                  <button
                    onClick={reset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('retryButton')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${guideOpen ? 'rotate-180' : ''}`} />
          </button>

          {guideOpen && (
            <div className="px-6 pb-6 space-y-4">
              {/* How it works */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t('guide.howItWorks.title')}
                </h3>
                <ol className="list-decimal list-inside space-y-1">
                  {(t.raw('guide.howItWorks.items') as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400">{item}</li>
                  ))}
                </ol>
              </div>

              {/* Tips */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t('guide.tips.title')}
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
