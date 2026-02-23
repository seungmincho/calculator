'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Square, ChevronDown, ChevronUp, Wind } from 'lucide-react'

interface BreathingPattern {
  id: string
  inhale: number
  hold1: number
  exhale: number
  hold2: number
}

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'idle'

const PATTERNS: BreathingPattern[] = [
  { id: '478', inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
  { id: 'box', inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
  { id: 'relaxing', inhale: 4, hold1: 2, exhale: 6, hold2: 0 },
]

function getPhaseSequence(pattern: BreathingPattern): Array<{ phase: Phase; duration: number }> {
  const seq: Array<{ phase: Phase; duration: number }> = []
  seq.push({ phase: 'inhale', duration: pattern.inhale })
  if (pattern.hold1 > 0) seq.push({ phase: 'hold1', duration: pattern.hold1 })
  seq.push({ phase: 'exhale', duration: pattern.exhale })
  if (pattern.hold2 > 0) seq.push({ phase: 'hold2', duration: pattern.hold2 })
  return seq
}

export default function BreathingExercise() {
  const t = useTranslations('breathingExercise')

  const [selectedPatternId, setSelectedPatternId] = useState<string>('478')
  const [isRunning, setIsRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(0)
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [guideOpen, setGuideOpen] = useState(false)

  const phaseIndexRef = useRef(0)
  const phaseTimeRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const selectedPattern = PATTERNS.find(p => p.id === selectedPatternId) ?? PATTERNS[0]
  const phaseSequence = getPhaseSequence(selectedPattern)

  const vibrate = useCallback((ms: number) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms)
    }
  }, [])

  const stopSession = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    intervalRef.current = null
    sessionTimerRef.current = null
    setIsRunning(false)
    setPhase('idle')
    setCountdown(0)
    phaseIndexRef.current = 0
    phaseTimeRef.current = 0
  }, [])

  const startSession = useCallback(() => {
    phaseIndexRef.current = 0
    phaseTimeRef.current = phaseSequence[0].duration
    setPhase(phaseSequence[0].phase)
    setCountdown(phaseSequence[0].duration)
    setRoundsCompleted(0)
    setTotalSeconds(0)
    setIsRunning(true)
    vibrate(100)

    intervalRef.current = setInterval(() => {
      phaseTimeRef.current -= 1

      if (phaseTimeRef.current <= 0) {
        const nextIndex = (phaseIndexRef.current + 1) % phaseSequence.length
        const isNewRound = nextIndex === 0

        phaseIndexRef.current = nextIndex
        phaseTimeRef.current = phaseSequence[nextIndex].duration
        setPhase(phaseSequence[nextIndex].phase)
        setCountdown(phaseSequence[nextIndex].duration)

        if (isNewRound) {
          setRoundsCompleted(prev => prev + 1)
        }
        vibrate(80)
      } else {
        setCountdown(phaseTimeRef.current)
      }
    }, 1000)

    sessionTimerRef.current = setInterval(() => {
      setTotalSeconds(prev => prev + 1)
    }, 1000)
  }, [phaseSequence, vibrate])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    }
  }, [])

  // Reset when pattern changes while running
  useEffect(() => {
    if (isRunning) {
      stopSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatternId])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const getPhaseLabel = (p: Phase) => {
    switch (p) {
      case 'inhale': return t('phaseInhale')
      case 'hold1': return t('phaseHold')
      case 'exhale': return t('phaseExhale')
      case 'hold2': return t('phaseHold2')
      default: return t('phaseIdle')
    }
  }

  const getPhaseColor = (p: Phase) => {
    switch (p) {
      case 'inhale': return 'text-blue-600 dark:text-blue-400'
      case 'hold1': return 'text-yellow-600 dark:text-yellow-400'
      case 'exhale': return 'text-green-600 dark:text-green-400'
      case 'hold2': return 'text-purple-600 dark:text-purple-400'
      default: return 'text-gray-500 dark:text-gray-400'
    }
  }

  const getCircleScale = (p: Phase): number => {
    switch (p) {
      case 'inhale': return 1
      case 'hold1': return 1
      case 'exhale': return 0
      case 'hold2': return 0
      default: return 0.5
    }
  }

  const getPhaseDuration = (p: Phase): number => {
    if (p === 'idle') return 1
    const found = phaseSequence.find(ps => ps.phase === p)
    return found?.duration ?? 1
  }

  // SVG animation: compute radius based on phase
  const minR = 60
  const maxR = 120
  const currentScale = getCircleScale(phase)
  const currentR = minR + (maxR - minR) * currentScale
  const phaseDur = getPhaseDuration(phase)
  const animationDuration = phaseDur > 0 ? `${phaseDur}s` : '1s'
  const targetR = isRunning ? currentR : minR + (maxR - minR) * 0.5
  const animTimingFn = phase === 'inhale' ? 'ease-in' : phase === 'exhale' ? 'ease-out' : 'linear'

  const patternDescriptions: Record<string, string> = {
    '478': `${t('inhaleLabel')} 4s · ${t('holdLabel')} 7s · ${t('exhaleLabel')} 8s`,
    'box': `${t('inhaleLabel')} 4s · ${t('holdLabel')} 4s · ${t('exhaleLabel')} 4s · ${t('holdLabel')} 4s`,
    'relaxing': `${t('inhaleLabel')} 4s · ${t('holdLabel')} 2s · ${t('exhaleLabel')} 6s`,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wind className="w-7 h-7 text-blue-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('selectPattern')}</h2>

            {PATTERNS.map(pattern => (
              <button
                key={pattern.id}
                onClick={() => setSelectedPatternId(pattern.id)}
                className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                  selectedPatternId === pattern.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {t(`pattern${pattern.id === '478' ? '478' : pattern.id === 'box' ? 'Box' : 'Relaxing'}Name`)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {patternDescriptions[pattern.id]}
                </div>
              </button>
            ))}
          </div>

          {/* Session stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('sessionStats')}</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('roundsCompleted')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{roundsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('totalTime')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatTime(totalSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Animation panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center">
            {/* SVG circle animation */}
            <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
              <svg width="280" height="280" viewBox="0 0 280 280">
                {/* Background circle */}
                <circle
                  cx="140"
                  cy="140"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  className="text-gray-100 dark:text-gray-700"
                  strokeWidth="2"
                />
                {/* Glow ring */}
                <circle
                  cx="140"
                  cy="140"
                  r={targetR}
                  fill="none"
                  stroke="currentColor"
                  className={
                    phase === 'inhale' ? 'text-blue-300 dark:text-blue-600'
                    : phase === 'exhale' ? 'text-green-300 dark:text-green-600'
                    : phase === 'hold1' ? 'text-yellow-300 dark:text-yellow-600'
                    : phase === 'hold2' ? 'text-purple-300 dark:text-purple-600'
                    : 'text-gray-200 dark:text-gray-600'
                  }
                  strokeWidth="3"
                  opacity="0.5"
                  style={{
                    transition: `r ${animationDuration} ${animTimingFn}`,
                  }}
                />
                {/* Main animated circle */}
                <circle
                  cx="140"
                  cy="140"
                  r={targetR}
                  fill="currentColor"
                  className={
                    phase === 'inhale' ? 'text-blue-200 dark:text-blue-900'
                    : phase === 'exhale' ? 'text-green-200 dark:text-green-900'
                    : phase === 'hold1' ? 'text-yellow-200 dark:text-yellow-900'
                    : phase === 'hold2' ? 'text-purple-200 dark:text-purple-900'
                    : 'text-gray-100 dark:text-gray-700'
                  }
                  style={{
                    transition: `r ${animationDuration} ${animTimingFn}`,
                  }}
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {isRunning ? (
                  <>
                    <span className={`text-2xl font-bold ${getPhaseColor(phase)}`}>
                      {getPhaseLabel(phase)}
                    </span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-white mt-1">
                      {countdown}
                    </span>
                  </>
                ) : (
                  <span className="text-lg text-gray-400 dark:text-gray-500">{t('pressStart')}</span>
                )}
              </div>
            </div>

            {/* Phase indicator bar */}
            {isRunning && (
              <div className="flex gap-2 mt-4 w-full max-w-xs justify-center">
                {phaseSequence.map((ps, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full flex-1 transition-colors ${
                      phaseIndexRef.current === idx
                        ? ps.phase === 'inhale' ? 'bg-blue-500'
                          : ps.phase === 'exhale' ? 'bg-green-500'
                          : ps.phase === 'hold1' ? 'bg-yellow-500'
                          : 'bg-purple-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    title={getPhaseLabel(ps.phase)}
                  />
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-4 mt-6">
              {!isRunning ? (
                <button
                  onClick={startSession}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-8 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  <Play className="w-5 h-5" />
                  {t('start')}
                </button>
              ) : (
                <button
                  onClick={stopSession}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-lg px-8 py-3 font-medium transition-all"
                >
                  <Square className="w-5 h-5" />
                  {t('stop')}
                </button>
              )}
            </div>

            {/* Pattern timing display */}
            <div className="mt-6 w-full">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  {t(`pattern${selectedPattern.id === '478' ? '478' : selectedPattern.id === 'box' ? 'Box' : 'Relaxing'}Name`)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full px-3 py-1">
                    {t('inhaleLabel')} {selectedPattern.inhale}s
                  </span>
                  {selectedPattern.hold1 > 0 && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full px-3 py-1">
                      {t('holdLabel')} {selectedPattern.hold1}s
                    </span>
                  )}
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full px-3 py-1">
                    {t('exhaleLabel')} {selectedPattern.exhale}s
                  </span>
                  {selectedPattern.hold2 > 0 && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full px-3 py-1">
                      {t('holdLabel')} {selectedPattern.hold2}s
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  {t(`pattern${selectedPattern.id === '478' ? '478' : selectedPattern.id === 'box' ? 'Box' : 'Relaxing'}Desc`)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setGuideOpen(o => !o)}
          aria-expanded={guideOpen}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guideTitle')}</h2>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {guideOpen && (
          <div className="mt-6 space-y-6">
            {/* Pattern explanations */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guidePatternTitle')}</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {['478', 'Box', 'Relaxing'].map(key => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {t(`pattern${key}Name`)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t(`pattern${key}Guide`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guideBenefitsTitle')}</h3>
              <ul className="space-y-2">
                {(t.raw('guideBenefitsItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guideTipsTitle')}</h3>
              <ul className="space-y-2">
                {(t.raw('guideTipsItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
