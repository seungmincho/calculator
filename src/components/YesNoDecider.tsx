'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

type AnswerKey = 'strongYes' | 'yes' | 'leanYes' | 'maybe' | 'leanNo' | 'no' | 'strongNo'

interface HistoryEntry {
  question: string
  answer: string
}

const ANSWER_COLORS: Record<AnswerKey, string> = {
  strongYes: 'text-green-400',
  yes: 'text-green-500',
  leanYes: 'text-emerald-400',
  maybe: 'text-yellow-400',
  leanNo: 'text-orange-400',
  no: 'text-red-500',
  strongNo: 'text-red-600',
}

const DOT_COLORS: Record<AnswerKey, string> = {
  strongYes: 'bg-green-400',
  yes: 'bg-green-500',
  leanYes: 'bg-emerald-400',
  maybe: 'bg-yellow-400',
  leanNo: 'bg-orange-400',
  no: 'bg-red-500',
  strongNo: 'bg-red-600',
}

function getAnswerColor(answer: string): string {
  return ANSWER_COLORS[answer as AnswerKey] ?? 'text-white'
}

function getDotColor(answer: string): string {
  return DOT_COLORS[answer as AnswerKey] ?? 'bg-gray-400'
}

function computeAnswer(mode: 'simple' | 'detailed', probability: number): string {
  const rand = Math.random() * 100
  if (mode === 'simple') {
    return rand < probability ? 'yes' : 'no'
  }
  const yesWeight = probability / 100
  if (rand < yesWeight * 30) return 'strongYes'
  if (rand < yesWeight * 70) return 'yes'
  if (rand < yesWeight * 100) return 'leanYes'
  const noBase = yesWeight * 100
  if (rand < noBase + (100 - noBase) * 0.1) return 'maybe'
  const noRand = ((rand - noBase) / (100 - noBase)) * 100
  if (noRand < 30) return 'leanNo'
  if (noRand < 70) return 'no'
  return 'strongNo'
}

export default function YesNoDecider() {
  const t = useTranslations('yesNoDecider')

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple')
  const [probability, setProbability] = useState(50)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const askQuestion = useCallback(() => {
    if (!question.trim() || isAsking) return
    setIsAsking(true)
    setAnswer(null)
    setTimeout(() => {
      const result = computeAnswer(mode, probability)
      setAnswer(result)
      setIsAsking(false)
      setHistory(prev => [{ question: question.trim(), answer: result }, ...prev].slice(0, 10))
    }, 900)
  }, [question, isAsking, mode, probability])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') askQuestion()
  }, [askQuestion])

  const resetHistory = useCallback(() => {
    setHistory([])
    setAnswer(null)
    setQuestion('')
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings')}</h2>

            {/* Mode toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('modeLabel')}
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                {(['simple', 'detailed'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      mode === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`mode.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Probability slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('probabilityLabel')}
                </label>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {probability}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={probability}
                onChange={e => setProbability(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{t('probMin')}</span>
                <span>{t('probMax')}</span>
              </div>
            </div>

            {/* Answer key for detailed mode */}
            {mode === 'detailed' && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('answerLegend')}</p>
                {(['strongYes', 'yes', 'leanYes', 'maybe', 'leanNo', 'no', 'strongNo'] as AnswerKey[]).map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[key]}`} />
                    <span className={`text-xs font-medium ${ANSWER_COLORS[key]}`}>{t(`answers.${key}`)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Orb + Question input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Question input */}
            <div className="flex gap-3 mb-8">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={askQuestion}
                disabled={!question.trim() || isAsking}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isAsking ? t('asking') : t('askButton')}
              </button>
            </div>

            {/* 8-ball orb */}
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-48 h-48 rounded-full bg-gradient-to-br from-gray-800 to-gray-950 dark:from-gray-700 dark:to-gray-900 mx-auto flex items-center justify-center shadow-2xl border-4 border-gray-700 dark:border-gray-600 select-none transition-transform duration-150 ${
                  isAsking ? 'animate-bounce' : answer ? 'scale-105' : 'scale-100'
                }`}
                style={isAsking ? { animation: 'shake 0.5s ease-in-out infinite' } : undefined}
              >
                <style>{`
                  @keyframes shake {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    15% { transform: rotate(-8deg) scale(1.05); }
                    30% { transform: rotate(8deg) scale(0.97); }
                    45% { transform: rotate(-6deg) scale(1.03); }
                    60% { transform: rotate(6deg) scale(0.98); }
                    75% { transform: rotate(-4deg) scale(1.02); }
                    90% { transform: rotate(4deg) scale(0.99); }
                  }
                `}</style>
                <div className="text-center px-4">
                  {isAsking ? (
                    <span className="text-5xl font-black text-white opacity-80">?</span>
                  ) : answer ? (
                    <span className={`text-lg font-black leading-tight ${getAnswerColor(answer)}`} style={{ textShadow: '0 0 20px currentColor' }}>
                      {t(`answers.${answer}`)}
                    </span>
                  ) : (
                    <span className="text-5xl font-black text-white opacity-30">8</span>
                  )}
                </div>
              </div>
              {answer && !isAsking && (
                <p className={`text-sm font-medium ${getAnswerColor(answer)}`}>
                  {question}
                </p>
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">{t('historyTitle')}</h2>
                <button
                  onClick={resetHistory}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('reset')}
                </button>
              </div>
              <ul className="space-y-2">
                {history.map((entry, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getDotColor(entry.answer)}`} />
                    <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{entry.question}</span>
                    <span className={`font-semibold flex-shrink-0 ${getAnswerColor(entry.answer)}`}>
                      {t(`answers.${entry.answer}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <GuideSection namespace="yesNoDecider" />
    </div>
  )
}
