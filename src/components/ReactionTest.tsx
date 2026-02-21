'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Zap, RotateCcw, Trash2, BookOpen, Timer, TrendingUp, Trophy, Users, Target, Play } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'tooEarly' | 'sessionComplete'

const MAX_ROUNDS = 5

interface Attempt {
  time: number
  timestamp: Date
}

// Percentile lookup based on human reaction time research
// Source: humanbenchmark.com data distribution (visual reaction time)
function getPercentile(ms: number): number {
  if (ms <= 150) return 99
  if (ms <= 175) return 97
  if (ms <= 190) return 95
  if (ms <= 200) return 92
  if (ms <= 210) return 88
  if (ms <= 220) return 84
  if (ms <= 230) return 78
  if (ms <= 240) return 72
  if (ms <= 250) return 65
  if (ms <= 260) return 58
  if (ms <= 270) return 52
  if (ms <= 280) return 46
  if (ms <= 290) return 40
  if (ms <= 300) return 35
  if (ms <= 320) return 28
  if (ms <= 340) return 22
  if (ms <= 360) return 17
  if (ms <= 380) return 13
  if (ms <= 400) return 10
  if (ms <= 450) return 6
  if (ms <= 500) return 3
  return 1
}

export default function ReactionTest() {
  const t = useTranslations('reactionTest')
  const [gameState, setGameState] = useState<GameState>('idle')
  const [sessionAttempts, setSessionAttempts] = useState<Attempt[]>([])
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([])
  const [currentTime, setCurrentTime] = useState<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const leaderboard = useLeaderboard('reactionTest', undefined)
  const [showNameModal, setShowNameModal] = useState(false)
  const gameStartTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const currentRound = sessionAttempts.length + 1
  const isSessionDone = sessionAttempts.length >= MAX_ROUNDS

  const getRating = useCallback((time: number): { key: string; color: string; bgColor: string } => {
    if (time < 200) return { key: 'rating.excellent', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' }
    if (time < 300) return { key: 'rating.good', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' }
    if (time < 400) return { key: 'rating.average', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' }
    if (time < 500) return { key: 'rating.slow', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' }
    return { key: 'rating.verySlow', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' }
  }, [])

  const startRound = useCallback(() => {
    setGameState('waiting')
    setCurrentTime(null)
    const delay = 2000 + Math.random() * 3000
    timeoutRef.current = setTimeout(() => {
      setGameState('ready')
      startTimeRef.current = Date.now()
    }, delay)
  }, [])

  const handleGameClick = useCallback(() => {
    if (gameState === 'idle') {
      startRound()
    } else if (gameState === 'result') {
      if (isSessionDone) {
        setGameState('sessionComplete')
      } else {
        startRound()
      }
    } else if (gameState === 'tooEarly') {
      // Do nothing, auto-recovers
    } else if (gameState === 'waiting') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setGameState('tooEarly')
      timeoutRef.current = setTimeout(() => {
        setGameState('idle')
      }, 1500)
    } else if (gameState === 'ready') {
      const reactionTime = Date.now() - (startTimeRef.current || Date.now())
      setCurrentTime(reactionTime)
      const attempt = { time: reactionTime, timestamp: new Date() }
      setSessionAttempts(prev => [...prev, attempt])
      setAllAttempts(prev => [...prev, attempt])
      setGameState('result')
    }
  }, [gameState, isSessionDone, startRound])

  const handleNewSession = useCallback(() => {
    setSessionAttempts([])
    setCurrentTime(null)
    setGameState('idle')
    gameStartTimeRef.current = Date.now()
  }, [])

  const handleClearHistory = useCallback(() => {
    setAllAttempts([])
    setSessionAttempts([])
    setCurrentTime(null)
    setGameState('idle')
  }, [])

  const sessionAverage = sessionAttempts.length > 0
    ? Math.round(sessionAttempts.reduce((sum, a) => sum + a.time, 0) / sessionAttempts.length)
    : null

  // Leaderboard: detect session complete
  useEffect(() => {
    if (gameState === 'sessionComplete' && sessionAverage !== null) {
      if (leaderboard.checkQualifies(sessionAverage)) {
        setShowNameModal(true)
      }
      leaderboard.fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState])

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    const duration = Date.now() - gameStartTimeRef.current
    await leaderboard.submitScore(sessionAverage!, name, duration)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, sessionAverage])

  const sessionBest = sessionAttempts.length > 0
    ? Math.min(...sessionAttempts.map(a => a.time))
    : null

  const allBest = allAttempts.length > 0
    ? Math.min(...allAttempts.map(a => a.time))
    : null

  const getBackgroundColor = (): string => {
    switch (gameState) {
      case 'idle':
        return 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
      case 'waiting':
        return 'bg-gradient-to-br from-red-500 to-red-600'
      case 'ready':
        return 'bg-gradient-to-br from-green-400 to-green-500'
      case 'result':
        return 'bg-gradient-to-br from-blue-500 to-indigo-600'
      case 'tooEarly':
        return 'bg-gradient-to-br from-orange-500 to-orange-600'
      case 'sessionComplete':
        return 'bg-gradient-to-br from-purple-500 to-indigo-600'
      default:
        return 'bg-gradient-to-br from-blue-500 to-indigo-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Round Progress Bar (visible during session) */}
      {sessionAttempts.length > 0 && gameState !== 'sessionComplete' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t('roundProgress', { current: Math.min(currentRound, MAX_ROUNDS), total: MAX_ROUNDS })}
            </span>
            {sessionBest && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {t('currentBest')}: {sessionBest}ms
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_ROUNDS }).map((_, i) => {
              const attempt = sessionAttempts[i]
              const isCurrent = i === sessionAttempts.length
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-3 rounded-full transition-all duration-300 ${
                      attempt
                        ? attempt.time < 200 ? 'bg-green-500' :
                          attempt.time < 300 ? 'bg-blue-500' :
                          attempt.time < 400 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        : isCurrent
                          ? 'bg-blue-300 dark:bg-blue-600 animate-pulse'
                          : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {attempt ? `${attempt.time}ms` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div
        onClick={gameState !== 'sessionComplete' ? handleGameClick : undefined}
        className={`${getBackgroundColor()} transition-all duration-200 rounded-xl shadow-lg ${gameState !== 'sessionComplete' ? 'cursor-pointer active:scale-[0.99]' : ''} min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center gap-4 p-8 select-none`}
      >
        {gameState === 'idle' && (
          <>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
            <div className="text-white text-3xl md:text-4xl font-bold text-center">
              {t('clickToStart')}
            </div>
            <div className="text-white/80 text-base md:text-lg text-center">
              {t('idleSubtext')}
            </div>
            {sessionAttempts.length === 0 && (
              <div className="text-white/60 text-sm mt-2">
                {t('roundInfo', { total: MAX_ROUNDS })}
              </div>
            )}
          </>
        )}

        {gameState === 'waiting' && (
          <>
            <div className="text-white text-4xl md:text-5xl font-bold text-center">
              {t('waiting')}
            </div>
            <div className="text-white/70 text-sm md:text-base">
              {t('waitSubtext')}
            </div>
          </>
        )}

        {gameState === 'ready' && (
          <div className="text-white text-5xl md:text-7xl font-black text-center drop-shadow-lg animate-pulse">
            {t('clickNow')}
          </div>
        )}

        {gameState === 'tooEarly' && (
          <>
            <div className="text-white text-3xl md:text-4xl font-bold text-center">
              {t('tooEarly')}
            </div>
            <div className="text-white/70 text-sm md:text-base">
              {t('tooEarlySubtext')}
            </div>
          </>
        )}

        {gameState === 'result' && currentTime && (
          <>
            <div className="text-white text-5xl md:text-7xl font-black text-center">
              {currentTime} <span className="text-3xl md:text-4xl">{t('ms')}</span>
            </div>
            <div className={`text-lg md:text-xl font-semibold px-5 py-2 rounded-full ${getRating(currentTime).bgColor}`}>
              {t(getRating(currentTime).key)}
            </div>
            <div className="text-white/80 text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              {t('percentileText', { percentile: getPercentile(currentTime) })}
            </div>
            <div className="text-white/60 text-sm mt-2">
              {isSessionDone ? t('clickForResult') : t('clickForNext', { next: currentRound })}
            </div>
          </>
        )}

        {gameState === 'sessionComplete' && sessionAverage && (
          <div className="text-center space-y-6 max-w-md">
            <div className="text-white text-2xl md:text-3xl font-bold">
              {t('sessionComplete')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                <div className="text-white/70 text-sm">{t('average')}</div>
                <div className="text-white text-3xl font-bold">{sessionAverage}<span className="text-lg ml-0.5">{t('ms')}</span></div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                <div className="text-white/70 text-sm">{t('best')}</div>
                <div className="text-white text-3xl font-bold">{sessionBest}<span className="text-lg ml-0.5">{t('ms')}</span></div>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
              <div className="text-white/70 text-sm mb-1">{t('yourRanking')}</div>
              <div className="text-white text-2xl font-bold flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                {t('topPercent', { percent: 100 - getPercentile(sessionAverage) })}
              </div>
              <div className={`inline-block mt-2 text-sm font-semibold px-4 py-1.5 rounded-full ${getRating(sessionAverage).bgColor}`}>
                {t(getRating(sessionAverage).key)}
              </div>
            </div>

            {/* Comparison bars */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left space-y-3">
              <div className="text-white/80 text-sm font-medium">{t('comparison')}</div>
              {([
                { labelKey: 'compProGamer', ms: 160, color: 'bg-green-400' },
                { labelKey: 'compAboveAvg', ms: 230, color: 'bg-blue-400' },
                { labelKey: 'compAvgAdult', ms: 280, color: 'bg-yellow-400' },
              ] as const).map(({ labelKey, ms, color }) => (
                <div key={labelKey}>
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>{t(labelKey)}</span>
                    <span>{ms}ms</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, (500 - ms) / 3.5)}%` }} />
                  </div>
                </div>
              ))}
              <div>
                <div className="flex justify-between text-xs text-white font-medium mb-1">
                  <span>{t('compYou')}</span>
                  <span>{sessionAverage}ms</span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (500 - sessionAverage) / 3.5)}%` }} />
                </div>
              </div>
            </div>

            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 mx-auto bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
              {t('newSession')}
            </button>
          </div>
        )}
      </div>

      {/* Stats Section */}
      {allAttempts.length > 0 && gameState !== 'sessionComplete' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">{t('currentRound')}</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {Math.min(currentRound, MAX_ROUNDS)}<span className="text-base text-gray-400">/{MAX_ROUNDS}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Timer className="w-4 h-4" />
              <span className="text-xs font-medium">{t('totalAttempts')}</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {allAttempts.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">{t('sessionAvg')}</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {sessionAverage ?? '-'} <span className="text-sm text-gray-400">{sessionAverage ? t('ms') : ''}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium">{t('allTimeBest')}</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              {allBest} <span className="text-sm text-gray-400">{t('ms')}</span>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      {allAttempts.length > 0 && gameState !== 'sessionComplete' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('history')}
            </h2>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              {t('clearHistory')}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...allAttempts].reverse().map((attempt, index) => {
              const rating = getRating(attempt.time)
              return (
                <div
                  key={allAttempts.length - index - 1}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      #{allAttempts.length - index}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {attempt.time} {t('ms')}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rating.bgColor}`}>
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

      {/* Leaderboard */}
      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={sessionAverage ?? 0}
        formatScore={leaderboard.config.formatScore}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

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
