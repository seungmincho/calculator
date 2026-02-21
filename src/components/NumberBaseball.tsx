'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Target, RotateCcw, Trophy, Lightbulb, BookOpen } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'

// ── Types ──

type Difficulty = 'easy' | 'normal' | 'hard'

interface GuessResult {
  attempt: number
  guess: string
  strikes: number
  balls: number
  outs: number
}

interface GameStats {
  gamesPlayed: number
  totalAttempts: number
  bestRecord: number
  winStreak: number
  currentStreak: number
}

const DIGIT_COUNTS: Record<Difficulty, number> = {
  easy: 3,
  normal: 4,
  hard: 5,
}

const STATS_KEY = 'numberBaseballStats'

// ── Helpers ──

function generateSecret(digits: number): string {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
  // First digit cannot be 0
  const first = pool.filter((n) => n !== 0)
  const result: number[] = []
  const firstPick = first[Math.floor(Math.random() * first.length)]
  result.push(firstPick)
  const remaining = pool.filter((n) => n !== firstPick)
  while (result.length < digits) {
    const idx = Math.floor(Math.random() * remaining.length)
    result.push(remaining.splice(idx, 1)[0])
  }
  return result.join('')
}

function evaluate(secret: string, guess: string): { strikes: number; balls: number; outs: number } {
  let strikes = 0
  let balls = 0
  let outs = 0
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      strikes++
    } else if (secret.includes(guess[i])) {
      balls++
    } else {
      outs++
    }
  }
  return { strikes, balls, outs }
}

function loadStats(): GameStats {
  if (typeof window === 'undefined') {
    return { gamesPlayed: 0, totalAttempts: 0, bestRecord: 0, winStreak: 0, currentStreak: 0 }
  }
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return JSON.parse(raw) as GameStats
  } catch {
    // ignore
  }
  return { gamesPlayed: 0, totalAttempts: 0, bestRecord: 0, winStreak: 0, currentStreak: 0 }
}

function saveStats(stats: GameStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // ignore
  }
}

// ── Component ──

export default function NumberBaseball() {
  const t = useTranslations('numberBaseball')

  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [secret, setSecret] = useState<string>('')
  const [digitCount, setDigitCount] = useState<number>(4)
  const [inputs, setInputs] = useState<string[]>(['', '', '', ''])
  const [history, setHistory] = useState<GuessResult[]>([])
  const [isWon, setIsWon] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [hintText, setHintText] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<GameStats>(() => loadStats())
  const [showGuide, setShowGuide] = useState(false)

  const leaderboardDifficulty = difficulty === 'easy' ? '3digit' : difficulty === 'normal' ? '4digit' : undefined
  const leaderboard = useLeaderboard('numberBaseball', leaderboardDifficulty)
  const [showNameModal, setShowNameModal] = useState(false)
  const gameStartTimeRef = useRef<number>(Date.now())

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Start new game
  const startGame = useCallback(
    (diff: Difficulty) => {
      const count = DIGIT_COUNTS[diff]
      setDifficulty(diff)
      setDigitCount(count)
      setSecret(generateSecret(count))
      setInputs(Array(count).fill(''))
      setHistory([])
      setIsWon(false)
      setHintUsed(false)
      setHintText('')
      setError('')
      gameStartTimeRef.current = Date.now()
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    },
    []
  )

  // Initialize on mount
  useEffect(() => {
    startGame('normal')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Win detection for leaderboard
  useEffect(() => {
    if (isWon) {
      if (leaderboard.checkQualifies(history.length)) {
        setShowNameModal(true)
      }
      leaderboard.fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWon])

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    const duration = Date.now() - gameStartTimeRef.current
    await leaderboard.submitScore(history.length, name, duration)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, history.length])

  // Handle digit input
  const handleInput = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, '').slice(-1)
      setInputs((prev) => {
        const next = [...prev]
        next[index] = digit
        return next
      })
      setError('')
      if (digit && index < digitCount - 1) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 0)
      }
    },
    [digitCount]
  )

  // Handle backspace navigation
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !inputs[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
      if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputs]
  )

  // Submit guess
  const handleSubmit = useCallback(() => {
    const guess = inputs.join('')
    if (guess.length < digitCount) {
      setError(t('errorIncomplete'))
      return
    }
    // Check for duplicates
    if (new Set(guess).size !== digitCount) {
      setError(t('errorDuplicate'))
      return
    }
    // Check leading zero
    if (guess[0] === '0') {
      setError(t('errorLeadingZero'))
      return
    }

    const { strikes, balls, outs } = evaluate(secret, guess)
    const attemptNum = history.length + 1
    const result: GuessResult = { attempt: attemptNum, guess, strikes, balls, outs }
    const newHistory = [...history, result]
    setHistory(newHistory)
    setInputs(Array(digitCount).fill(''))
    setTimeout(() => inputRefs.current[0]?.focus(), 50)

    if (strikes === digitCount) {
      // Won!
      setIsWon(true)
      const newStats = { ...stats }
      newStats.gamesPlayed++
      newStats.totalAttempts += attemptNum
      newStats.currentStreak++
      if (newStats.currentStreak > newStats.winStreak) {
        newStats.winStreak = newStats.currentStreak
      }
      if (newStats.bestRecord === 0 || attemptNum < newStats.bestRecord) {
        newStats.bestRecord = attemptNum
      }
      setStats(newStats)
      saveStats(newStats)
    }
  }, [inputs, digitCount, secret, history, stats, t])

  // Hint: reveal one digit
  const handleHint = useCallback(() => {
    if (hintUsed || isWon) return
    const pos = Math.floor(Math.random() * digitCount)
    setHintText(t('hintReveal', { pos: pos + 1, digit: secret[pos] }))
    setHintUsed(true)
  }, [hintUsed, isWon, digitCount, secret, t])

  const avgAttempts =
    stats.gamesPlayed > 0 ? (stats.totalAttempts / stats.gamesPlayed).toFixed(1) : '-'

  const canHint = history.length >= 5 && !hintUsed && !isWon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
            </div>
          </div>
          {/* Difficulty selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('difficulty')}:</span>
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => startGame(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t(d)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Input + History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {isWon ? (
              <div className="text-center py-6">
                <div className="flex justify-center mb-3">
                  <Trophy className="w-12 h-12 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('gameWon')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {t('gameWonMessage', { attempts: history.length })}
                </p>
                <button
                  onClick={() => startGame(difficulty)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('newGame')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('guess')} #{history.length + 1}
                  </h2>
                  <button
                    onClick={() => startGame(difficulty)}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('newGame')}
                  </button>
                </div>

                {/* Digit inputs */}
                <div className="flex justify-center gap-3 mb-4">
                  {inputs.map((val, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleInput(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-500 dark:text-red-400 text-sm text-center mb-3">{error}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {t('submit')}
                </button>

                {/* Hint */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  {hintText ? (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" />
                      {hintText}
                    </p>
                  ) : canHint ? (
                    <button
                      onClick={handleHint}
                      className="inline-flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 border border-yellow-400 dark:border-yellow-600 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {t('hint')}
                    </button>
                  ) : !hintUsed && !isWon ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('hintAvailableAfter')}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* History table */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('history')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left pb-2 pr-4">{t('attempt')}</th>
                      <th className="text-left pb-2 pr-4">{t('guess')}</th>
                      <th className="text-center pb-2 pr-4">
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          ⚾ {t('strike')}
                        </span>
                      </th>
                      <th className="text-center pb-2 pr-4">
                        <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          ⚾ {t('ball')}
                        </span>
                      </th>
                      <th className="text-center pb-2">
                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          ⚾ {t('out')}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((row) => (
                      <tr
                        key={row.attempt}
                        className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">
                          #{row.attempt}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="font-mono font-bold text-gray-900 dark:text-white tracking-widest">
                            {row.guess}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                              row.strikes > 0
                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {row.strikes}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                              row.balls > 0
                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {row.balls}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                              row.outs > 0
                                ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {row.outs}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="space-y-6">
          {/* Game info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('gameInfo')}</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('digitCount')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{digitCount}{t('digits')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('currentAttempts')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{history.length}{t('times')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('difficultyLabel')}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{t(difficulty)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('stats.title')}</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('stats.gamesPlayed')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{stats.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('stats.avgAttempts')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{avgAttempts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('stats.bestRecord')}</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {stats.bestRecord > 0 ? stats.bestRecord : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('stats.winStreak')}</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">{stats.winStreak}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('legend')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold shrink-0">S</span>
                <span className="text-gray-600 dark:text-gray-300">{t('strikeDesc')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-bold shrink-0">B</span>
                <span className="text-gray-600 dark:text-gray-300">{t('ballDesc')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold shrink-0">O</span>
                <span className="text-gray-600 dark:text-gray-300">{t('outDesc')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={history.length}
        formatScore={leaderboard.config?.formatScore ?? ((s) => `${s}`)}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
          </div>
          <span className="text-gray-400 dark:text-gray-500 text-sm">{showGuide ? '▲' : '▼'}</span>
        </button>

        {showGuide && (
          <div className="mt-6 grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.rules.title')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('guide.rules.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.tips.title')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.example.title')}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm space-y-1">
                {(t.raw('guide.example.items') as string[]).map((item, i) => (
                  <p key={i} className="text-gray-600 dark:text-gray-300 font-mono">{item}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
