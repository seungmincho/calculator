'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Zap, RotateCcw, Trash2, BookOpen, Timer, TrendingUp } from 'lucide-react'

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'tooEarly'

interface Attempt {
  time: number
  timestamp: Date
}

export default function ReactionTest() {
  const t = useTranslations('reactionTest')
  const [gameState, setGameState] = useState<GameState>('idle')
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [currentTime, setCurrentTime] = useState<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getRating = useCallback((time: number): { key: string; color: string } => {
    if (time < 200) return { key: 'rating.excellent', color: 'text-green-600 dark:text-green-400' }
    if (time < 300) return { key: 'rating.good', color: 'text-blue-600 dark:text-blue-400' }
    if (time < 400) return { key: 'rating.average', color: 'text-yellow-600 dark:text-yellow-400' }
    if (time < 500) return { key: 'rating.slow', color: 'text-orange-600 dark:text-orange-400' }
    return { key: 'rating.verySlow', color: 'text-red-600 dark:text-red-400' }
  }, [])

  const handleGameClick = useCallback(() => {
    if (gameState === 'idle' || gameState === 'result' || gameState === 'tooEarly') {
      // Start new round
      setGameState('waiting')
      setCurrentTime(null)

      // Random delay between 2-5 seconds
      const delay = 2000 + Math.random() * 3000
      timeoutRef.current = setTimeout(() => {
        setGameState('ready')
        startTimeRef.current = Date.now()
      }, delay)
    } else if (gameState === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setGameState('tooEarly')
      setTimeout(() => setGameState('idle'), 2000)
    } else if (gameState === 'ready') {
      // Successful click
      const reactionTime = Date.now() - (startTimeRef.current || Date.now())
      setCurrentTime(reactionTime)
      setAttempts(prev => [...prev, { time: reactionTime, timestamp: new Date() }])
      setGameState('result')
    }
  }, [gameState])

  const handleTryAgain = useCallback(() => {
    setGameState('idle')
    setCurrentTime(null)
  }, [])

  const handleClearHistory = useCallback(() => {
    setAttempts([])
    setCurrentTime(null)
    setGameState('idle')
  }, [])

  const average = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.time, 0) / attempts.length)
    : null

  const best = attempts.length > 0
    ? Math.min(...attempts.map(a => a.time))
    : null

  const getBackgroundColor = (): string => {
    switch (gameState) {
      case 'idle':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'waiting':
        return 'bg-red-500'
      case 'ready':
        return 'bg-green-500'
      case 'result':
        return 'bg-blue-600'
      case 'tooEarly':
        return 'bg-orange-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getMainText = (): string => {
    switch (gameState) {
      case 'idle':
        return t('instruction')
      case 'waiting':
        return t('waiting')
      case 'ready':
        return t('clickNow')
      case 'result':
        return currentTime ? `${currentTime} ${t('ms')}` : ''
      case 'tooEarly':
        return t('tooEarly')
      default:
        return ''
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Game Area */}
      <div
        onClick={handleGameClick}
        className={`${getBackgroundColor()} transition-colors duration-200 rounded-xl shadow-lg cursor-pointer min-h-[400px] flex flex-col items-center justify-center gap-4 p-8`}
      >
        <div className="text-white text-4xl md:text-5xl font-bold text-center">
          {getMainText()}
        </div>
        {gameState === 'result' && currentTime && (
          <div className={`text-white text-xl md:text-2xl font-medium ${getRating(currentTime).color} bg-white dark:bg-gray-800 px-6 py-3 rounded-lg`}>
            {t(getRating(currentTime).key)}
          </div>
        )}
        {gameState === 'result' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTryAgain()
            }}
            className="mt-4 flex items-center gap-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            {t('tryAgain')}
          </button>
        )}
      </div>

      {/* Stats Section */}
      {attempts.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Timer className="w-5 h-5" />
              <span className="text-sm font-medium">{t('attempts')}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {attempts.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">{t('average')}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {average} <span className="text-lg text-gray-500 dark:text-gray-400">{t('ms')}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium">{t('best')}</span>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {best} <span className="text-lg text-gray-500 dark:text-gray-400">{t('ms')}</span>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      {attempts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('history')}
            </h2>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('clearHistory')}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...attempts].reverse().map((attempt, index) => {
              const rating = getRating(attempt.time)
              return (
                <div
                  key={attempts.length - index - 1}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      #{attempts.length - index}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {attempt.time} {t('ms')}
                    </span>
                    <span className={`text-sm font-medium ${rating.color}`}>
                      {t(rating.key)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {attempt.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* How to Play */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rating Standards */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.standards.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.standards.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
