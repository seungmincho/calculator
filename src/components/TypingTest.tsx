'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Keyboard, Play, RotateCcw, Square, Trophy, Clock, BookOpen, Trash2 } from 'lucide-react'

type Language = 'korean' | 'english'
type Difficulty = 'easy' | 'medium' | 'hard'
type Duration = 30 | 60 | 120 | 300

interface TestResult {
  wpm: number
  cpm: number
  accuracy: number
  correct: number
  wrong: number
  total: number
}

interface HistoryEntry {
  id: string
  date: string
  language: Language
  difficulty: Difficulty
  duration: Duration
  wpm: number
  cpm: number
  accuracy: number
}

const SAMPLE_TEXTS = {
  korean: {
    easy: [
      "하늘은 맑고 바람은 시원합니다.",
      "오늘은 좋은 하루가 될 것입니다.",
      "봄이 오면 꽃이 피고 새가 노래합니다.",
      "맛있는 음식을 먹으면 행복합니다.",
      "운동을 하면 건강해집니다."
    ],
    medium: [
      "대한민국은 아시아 대륙의 동쪽에 위치한 나라로, 반도 국가입니다.",
      "인공지능 기술의 발전은 우리 생활에 많은 변화를 가져오고 있습니다."
    ],
    hard: [
      "양자 컴퓨팅은 기존의 이진 비트 대신 큐비트를 활용하여 병렬 연산을 수행하는 차세대 컴퓨팅 패러다임입니다.",
      "블록체인 기술은 분산 원장 시스템을 기반으로 하여 데이터의 무결성과 투명성을 보장하는 혁신적인 기술입니다."
    ]
  },
  english: {
    easy: [
      "The quick brown fox jumps over the lazy dog.",
      "Today is a beautiful day to learn something new.",
      "Practice makes perfect in everything you do."
    ],
    medium: [
      "The development of technology has significantly changed the way we communicate and interact with each other in our daily lives.",
      "Climate change is one of the most pressing issues facing our planet today requiring immediate global action."
    ],
    hard: [
      "Quantum computing leverages the principles of quantum mechanics including superposition and entanglement to perform computations that would be practically impossible for classical computers.",
      "Artificial intelligence and machine learning algorithms are revolutionizing industries from healthcare to finance by processing vast amounts of data and identifying patterns invisible to human analysis."
    ]
  }
}

export default function TypingTest() {
  const t = useTranslations('typingTest')

  const [language, setLanguage] = useState<Language>('korean')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [duration, setDuration] = useState<Duration>(60)
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(duration)
  const [currentText, setCurrentText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [charStatuses, setCharStatuses] = useState<('correct' | 'wrong' | 'pending')[]>([])
  const [results, setResults] = useState<TestResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showResults, setShowResults] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('typingTestHistory')
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((entry: HistoryEntry) => {
    const newHistory = [entry, ...history].slice(0, 50) // Keep last 50
    setHistory(newHistory)
    try {
      localStorage.setItem('typingTestHistory', JSON.stringify(newHistory))
    } catch {
      // Ignore errors
    }
  }, [history])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem('typingTestHistory')
    } catch {
      // Ignore errors
    }
  }, [])

  // Get random text
  const getRandomText = useCallback(() => {
    const texts = SAMPLE_TEXTS[language][difficulty]
    return texts[Math.floor(Math.random() * texts.length)]
  }, [language, difficulty])

  // Initialize test
  const initializeTest = useCallback(() => {
    const text = getRandomText()
    setCurrentText(text)
    setUserInput('')
    setCharStatuses(new Array(text.length).fill('pending'))
    setTimeLeft(duration)
    setResults(null)
    setShowResults(false)
  }, [getRandomText, duration])

  // Start test
  const startTest = useCallback(() => {
    initializeTest()
    setIsRunning(true)
    inputRef.current?.focus()
  }, [initializeTest])

  // Stop test
  const stopTest = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Calculate results
  const calculateResults = useCallback(() => {
    const correct = charStatuses.filter(s => s === 'correct').length
    const wrong = charStatuses.filter(s => s === 'wrong').length
    const total = correct + wrong
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    const timeElapsed = (duration - timeLeft) / 60 // minutes
    const cpm = timeElapsed > 0 ? Math.round(correct / timeElapsed) : 0
    const wpm = language === 'korean'
      ? Math.round(cpm / 2) // Korean: ~2 chars per word
      : Math.round(cpm / 5) // English: ~5 chars per word

    const result: TestResult = {
      wpm,
      cpm,
      accuracy: Math.round(accuracy * 10) / 10,
      correct,
      wrong,
      total
    }

    setResults(result)
    setShowResults(true)

    // Save to history
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      language,
      difficulty,
      duration,
      wpm: result.wpm,
      cpm: result.cpm,
      accuracy: result.accuracy
    }
    saveHistory(entry)

    stopTest()
  }, [charStatuses, timeLeft, duration, language, difficulty, saveHistory, stopTest])

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            calculateResults()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      calculateResults()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, calculateResults])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isRunning) return

    const value = e.target.value
    setUserInput(value)

    const newStatuses = currentText.split('').map((char, idx) => {
      if (idx >= value.length) return 'pending'
      return value[idx] === char ? 'correct' : 'wrong'
    })
    setCharStatuses(newStatuses)

    // Auto-complete if typed entire text correctly
    if (value.length === currentText.length && newStatuses.every(s => s === 'correct')) {
      calculateResults()
    }
  }, [isRunning, currentText, calculateResults])

  // Restart test
  const restartTest = useCallback(() => {
    stopTest()
    initializeTest()
  }, [stopTest, initializeTest])

  // Calculate current live stats
  const currentStats = useCallback(() => {
    const correct = charStatuses.filter(s => s === 'correct').length
    const wrong = charStatuses.filter(s => s === 'wrong').length
    const total = correct + wrong
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    const timeElapsed = (duration - timeLeft) / 60
    const cpm = timeElapsed > 0 ? Math.round(correct / timeElapsed) : 0
    const wpm = language === 'korean' ? Math.round(cpm / 2) : Math.round(cpm / 5)

    return { wpm, cpm, accuracy: Math.round(accuracy * 10) / 10 }
  }, [charStatuses, timeLeft, duration, language])

  // Get speed rating
  const getSpeedRating = (wpm: number): { label: string; color: string } => {
    if (language === 'korean') {
      if (wpm >= 200) return { label: t('excellent'), color: 'bg-gradient-to-r from-purple-600 to-pink-600' }
      if (wpm >= 150) return { label: t('fast'), color: 'bg-gradient-to-r from-blue-600 to-indigo-600' }
      if (wpm >= 100) return { label: t('average'), color: 'bg-gradient-to-r from-green-600 to-teal-600' }
      return { label: t('slow'), color: 'bg-gradient-to-r from-orange-600 to-red-600' }
    } else {
      if (wpm >= 80) return { label: t('excellent'), color: 'bg-gradient-to-r from-purple-600 to-pink-600' }
      if (wpm >= 60) return { label: t('fast'), color: 'bg-gradient-to-r from-blue-600 to-indigo-600' }
      if (wpm >= 40) return { label: t('average'), color: 'bg-gradient-to-r from-green-600 to-teal-600' }
      return { label: t('slow'), color: 'bg-gradient-to-r from-orange-600 to-red-600' }
    }
  }

  // History stats
  const historyStats = useCallback(() => {
    if (history.length === 0) return null
    const bestWpm = Math.max(...history.map(h => h.wpm))
    const avgWpm = Math.round(history.reduce((sum, h) => sum + h.wpm, 0) / history.length)
    const totalTests = history.length
    return { bestWpm, avgWpm, totalTests }
  }, [history])

  const stats = historyStats()
  const liveStats = currentStats()

  // Initialize on mount
  useEffect(() => {
    initializeTest()
  }, []) // Only run once on mount

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Keyboard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              언어
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLanguage('korean')
                  if (!isRunning) initializeTest()
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  language === 'korean'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isRunning}
              >
                {t('language.korean')}
              </button>
              <button
                onClick={() => {
                  setLanguage('english')
                  if (!isRunning) initializeTest()
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  language === 'english'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isRunning}
              >
                {t('language.english')}
              </button>
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('difficulty.title')}
            </label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
                <button
                  key={level}
                  onClick={() => {
                    setDifficulty(level)
                    if (!isRunning) initializeTest()
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    difficulty === level
                      ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  disabled={isRunning}
                >
                  {t(`difficulty.${level}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('duration.title')}
            </label>
            <div className="flex gap-2">
              {([30, 60, 120, 300] as Duration[]).map(dur => (
                <button
                  key={dur}
                  onClick={() => {
                    setDuration(dur)
                    if (!isRunning) {
                      setTimeLeft(dur)
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    duration === dur
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  disabled={isRunning}
                >
                  {dur >= 60 ? `${dur / 60}분` : `${dur}초`}
                </button>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 pt-2">
            {!isRunning ? (
              <button
                onClick={startTest}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Play className="w-5 h-5" />
                {t('start')}
              </button>
            ) : (
              <button
                onClick={stopTest}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg px-6 py-3 font-medium hover:from-red-700 hover:to-orange-700 transition-all"
              >
                <Square className="w-5 h-5" />
                {t('stop')}
              </button>
            )}
            <button
              onClick={restartTest}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              {t('restart')}
            </button>
          </div>
        </div>
      </div>

      {/* Typing Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {/* Timer and Live Stats */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('wpm')}</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{liveStats.wpm}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('cpm')}</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{liveStats.cpm}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('accuracy')}</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{liveStats.accuracy}%</div>
            </div>
          </div>
        </div>

        {/* Display Text */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-4">
          <div className="font-mono text-lg leading-relaxed whitespace-pre-wrap break-words">
            {currentText.split('').map((char, idx) => {
              const status = charStatuses[idx]
              const isCursor = idx === userInput.length

              return (
                <span
                  key={idx}
                  className={`relative ${
                    status === 'correct'
                      ? 'text-green-600 dark:text-green-400'
                      : status === 'wrong'
                      ? 'text-red-600 dark:text-red-400 underline decoration-2 decoration-red-600'
                      : 'text-gray-400 dark:text-gray-600'
                  } ${isCursor ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                >
                  {char}
                </span>
              )
            })}
          </div>
        </div>

        {/* Input Textarea */}
        <div>
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={handleInputChange}
            disabled={!isRunning}
            placeholder={isRunning ? "텍스트를 입력하세요" : "시작 버튼을 눌러주세요"}
            className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Results Modal */}
      {showResults && results && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8 border-2 border-blue-300 dark:border-blue-700">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('result')}
            </h2>
            <div className="inline-block mt-2">
              <span className={`${getSpeedRating(results.wpm).color} text-white px-6 py-2 rounded-full text-lg font-semibold`}>
                {getSpeedRating(results.wpm).label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('wpm')}</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{results.wpm}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('cpm')}</div>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{results.cpm}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('accuracy')}</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{results.accuracy}%</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">총 입력</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {results.correct} / {results.total}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                정확 / 총
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowResults(false)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            닫기
          </button>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('history')}
            </h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('clearHistory')}
            </button>
          </div>

          {/* Summary Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('bestRecord')}</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.bestWpm}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">{t('averageSpeed')}</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.avgWpm}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 text-center">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">{t('totalTests')}</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalTests}</div>
              </div>
            </div>
          )}

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    날짜
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    언어
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    난이도
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('wpm')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('cpm')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('accuracy')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {new Date(entry.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {t(`language.${entry.language}`)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {t(`difficulty.${entry.difficulty}`)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                      {entry.wpm}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-indigo-600 dark:text-indigo-400">
                      {entry.cpm}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                      {entry.accuracy}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.speed.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.speed.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 mt-1">•</span>
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
