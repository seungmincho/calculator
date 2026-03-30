'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Play, Shuffle } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

interface Lot {
  id: number
  isWin: boolean
  revealed: boolean
  shaking: boolean
}

function generateLots(total: number, wins: number): Lot[] {
  const arr: boolean[] = [
    ...Array(wins).fill(true),
    ...Array(total - wins).fill(false),
  ]
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.map((isWin, idx) => ({ id: idx, isWin, revealed: false, shaking: false }))
}

export default function LotteryDraw() {
  const t = useTranslations('lotteryDraw')

  const [totalCount, setTotalCount] = useState(10)
  const [winCount, setWinCount] = useState(3)
  const [lots, setLots] = useState<Lot[]>([])
  const [isSetup, setIsSetup] = useState(true)
  const [mode, setMode] = useState<'oneByOne' | 'allAtOnce'>('oneByOne')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [revealOrder, setRevealOrder] = useState<number[]>([]) // lot ids in reveal order

  const remainingLots = lots.filter((l) => !l.revealed).length
  const remainingWins = lots.filter((l) => !l.revealed && l.isWin).length
  const revealedWins = lots.filter((l) => l.revealed && l.isWin).length

  const handleStart = useCallback(() => {
    const parsed = participantInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    setParticipants(parsed)
    setLots(generateLots(totalCount, winCount))
    setRevealOrder([])
    setIsSetup(false)
  }, [totalCount, winCount, participantInput])

  const revealLot = useCallback(
    (id: number) => {
      if (mode !== 'oneByOne') return
      setLots((prev) => {
        const lot = prev[id]
        if (lot.revealed) return prev
        const next = prev.map((l) =>
          l.id === id ? { ...l, revealed: true, shaking: !l.isWin } : l
        )
        return next
      })
      setRevealOrder((prev) => [...prev, id])
      // Clear shake after animation
      setTimeout(() => {
        setLots((prev) =>
          prev.map((l) => (l.id === id ? { ...l, shaking: false } : l))
        )
      }, 500)
    },
    [mode]
  )

  const revealAll = useCallback(() => {
    const order = lots.map((l) => l.id)
    setRevealOrder(order)
    setLots((prev) => prev.map((l) => ({ ...l, revealed: true, shaking: false })))
  }, [lots])

  const handleReset = useCallback(() => {
    setLots(generateLots(totalCount, winCount))
    setRevealOrder([])
  }, [totalCount, winCount])

  const handleBackToSetup = useCallback(() => {
    setIsSetup(true)
    setLots([])
    setRevealOrder([])
  }, [])

  // Confetti burst effect for winners (CSS-only approach via keyframe class)
  useEffect(() => {
    if (lots.length === 0) return
  }, [lots])

  if (isSetup) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6 max-w-lg mx-auto">
          {/* Total count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('totalCount')} <span className="text-gray-400">({totalCount})</span>
            </label>
            <input
              type="range"
              min={3}
              max={20}
              value={totalCount}
              onChange={(e) => {
                const v = Number(e.target.value)
                setTotalCount(v)
                if (winCount >= v) setWinCount(v - 1)
              }}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>3</span><span>20</span>
            </div>
          </div>

          {/* Win count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('winCount')} <span className="text-gray-400">({winCount})</span>
            </label>
            <input
              type="range"
              min={1}
              max={totalCount - 1}
              value={winCount}
              onChange={(e) => setWinCount(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span><span>{totalCount - 1}</span>
            </div>
          </div>

          {/* Draw mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('drawMode')}
            </label>
            <div className="flex gap-3">
              {(['oneByOne', 'allAtOnce'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t(`mode.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Participant names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('participants')} <span className="text-gray-400 text-xs">{t('participantsOptional')}</span>
            </label>
            <textarea
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              placeholder={t('participantsPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{t('participantsHint')}</p>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-4 py-3 font-medium hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-2"
          >
            <Play size={18} />
            {t('startDraw')}
          </button>
        </div>

        <GuideSection namespace="lotteryDraw" />
      </div>
    )
  }

  // Drawing phase
  const allRevealed = remainingLots === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm flex items-center gap-1"
          >
            <Shuffle size={15} />
            {t('reshuffle')}
          </button>
          <button
            onClick={handleBackToSetup}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm flex items-center gap-1"
          >
            <RotateCcw size={15} />
            {t('backToSetup')}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {t('remaining')}: <strong className="text-gray-900 dark:text-white">{remainingLots}</strong>
          </span>
          <span className="text-yellow-600 dark:text-yellow-400">
            {t('remainingWins')}: <strong>{remainingWins}</strong>
          </span>
          <span className="text-green-600 dark:text-green-400">
            {t('revealedWins')}: <strong>{revealedWins}</strong>
          </span>
        </div>
        {mode === 'allAtOnce' && !allRevealed && (
          <button
            onClick={revealAll}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:from-indigo-700 hover:to-purple-700"
          >
            {t('revealAll')}
          </button>
        )}
      </div>

      {/* Lot cards grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {lots.map((lot) => {
          const participantName = participants[lot.id] ?? null
          return (
            <button
              key={lot.id}
              onClick={() => revealLot(lot.id)}
              disabled={lot.revealed || mode === 'allAtOnce'}
              className={`
                w-full aspect-square rounded-xl flex flex-col items-center justify-center
                text-white font-bold text-xl transition-all duration-500 select-none
                ${lot.shaking ? 'animate-shake' : ''}
                ${
                  !lot.revealed
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 cursor-pointer hover:scale-105 hover:shadow-lg'
                    : lot.isWin
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 scale-105 shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-default'
                }
              `}
              style={{
                perspective: '600px',
              }}
              aria-label={lot.revealed ? (lot.isWin ? t('win') : t('lose')) : t('unrevealed')}
            >
              {!lot.revealed ? (
                <>
                  <span className="text-2xl">?</span>
                  {participantName && (
                    <span className="text-xs mt-1 opacity-80 truncate max-w-full px-1">{participantName}</span>
                  )}
                </>
              ) : lot.isWin ? (
                <>
                  <span className="text-2xl">🎉</span>
                  <span className="text-xs mt-1">{t('win')}</span>
                  {participantName && (
                    <span className="text-xs opacity-90 truncate max-w-full px-1">{participantName}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-2xl">💨</span>
                  <span className="text-xs mt-1 text-gray-500 dark:text-gray-400">{t('lose')}</span>
                  {participantName && (
                    <span className="text-xs text-gray-400 truncate max-w-full px-1">{participantName}</span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Results summary after all revealed */}
      {allRevealed && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('results')}</h2>
          <div className="space-y-2">
            {revealOrder.map((lotId, orderIdx) => {
              const lot = lots[lotId]
              const name = participants[lotId]
              return (
                <div
                  key={lotId}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                    lot.isWin
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium w-6 text-center text-gray-400">{orderIdx + 1}</span>
                  <span className="text-base">{lot.isWin ? '🎉' : '💨'}</span>
                  <span className="text-sm">
                    {name ? `${name}: ` : `${t('lot')} ${lotId + 1}: `}
                    <strong>{lot.isWin ? t('win') : t('lose')}</strong>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px) rotate(-2deg); }
          40% { transform: translateX(6px) rotate(2deg); }
          60% { transform: translateX(-4px) rotate(-1deg); }
          80% { transform: translateX(4px) rotate(1deg); }
        }
        .animate-shake { animation: shake 0.45s ease; }
      `}</style>

      <GuideSection namespace="lotteryDraw" />
    </div>
  )
}
