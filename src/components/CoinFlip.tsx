'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

type Side = 'heads' | 'tails'

export default function CoinFlip() {
  const t = useTranslations('coinFlip')
  const [result, setResult] = useState<Side | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipKey, setFlipKey] = useState(0)
  const [history, setHistory] = useState<Side[]>([])
  const [bestOfMode, setBestOfMode] = useState(false)
  const [bestOfRounds, setBestOfRounds] = useState(3)
  const [p1Wins, setP1Wins] = useState(0)
  const [p2Wins, setP2Wins] = useState(0)

  const heads = history.filter(h => h === 'heads').length
  const tails = history.filter(h => h === 'tails').length
  const total = history.length
  const headsRatio = total > 0 ? (heads / total) * 100 : 50

  const streak = (() => {
    if (history.length === 0) return { side: null, count: 0 }
    const last = history[history.length - 1]
    let count = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i] === last) count++
      else break
    }
    return { side: last, count }
  })()

  const neededWins = Math.ceil(bestOfRounds / 2)
  const gameOver = bestOfMode && (p1Wins >= neededWins || p2Wins >= neededWins)

  const flip = useCallback(() => {
    if (isFlipping || gameOver) return
    setIsFlipping(true)
    setFlipKey(k => k + 1)

    setTimeout(() => {
      const outcome: Side = Math.random() < 0.5 ? 'heads' : 'tails'
      setResult(outcome)
      setHistory(prev => [...prev.slice(-19), outcome])
      if (bestOfMode) {
        if (outcome === 'heads') setP1Wins(w => w + 1)
        else setP2Wins(w => w + 1)
      }
      setIsFlipping(false)
    }, 700)
  }, [isFlipping, gameOver, bestOfMode])

  const reset = useCallback(() => {
    setResult(null)
    setHistory([])
    setP1Wins(0)
    setP2Wins(0)
    setFlipKey(0)
    setIsFlipping(false)
  }, [])

  const coinStyle: React.CSSProperties = {
    width: 128,
    height: 128,
    borderRadius: '50%',
    margin: '0 auto',
    cursor: isFlipping || gameOver ? 'not-allowed' : 'pointer',
    transition: 'transform 0.7s ease-in-out',
    transform: isFlipping
      ? `rotateY(${result === 'tails' ? 1980 : 1800}deg)`
      : result === 'tails'
      ? 'rotateY(180deg)'
      : 'rotateY(0deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    background:
      result === 'tails'
        ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
        : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    userSelect: 'none',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Coin + Flip Button */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center gap-6">
        <div style={{ perspective: 1000 }}>
          <div
            key={flipKey}
            style={coinStyle}
            onClick={flip}
            role="button"
            aria-label={t('flipButton')}
          >
            {result === 'tails' ? t('tailsSymbol') : t('headsSymbol')}
          </div>
        </div>

        {result && !isFlipping && (
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {result === 'heads' ? t('headsLabel') : t('tailsLabel')}
          </p>
        )}
        {isFlipping && (
          <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">{t('flipping')}</p>
        )}
        {!result && !isFlipping && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('tapToFlip')}</p>
        )}

        <button
          onClick={flip}
          disabled={isFlipping || gameOver}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-8 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isFlipping ? t('flipping') : t('flipButton')}
        </button>
      </div>

      {/* Best-of-N Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{t('bestOfMode')}</span>
          <button
            onClick={() => { setBestOfMode(m => !m); reset() }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bestOfMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            role="switch"
            aria-checked={bestOfMode}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bestOfMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {bestOfMode && (
          <>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('rounds')}:</span>
              {[3, 5, 7].map(n => (
                <button
                  key={n}
                  onClick={() => { setBestOfRounds(n); reset() }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${bestOfRounds === n ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {t('bestOf')} {n}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('player1')} ({t('headsLabel')})</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{p1Wins}</p>
                <p className="text-xs text-gray-400">{t('winsLabel')}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('player2')} ({t('tailsLabel')})</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{p2Wins}</p>
                <p className="text-xs text-gray-400">{t('winsLabel')}</p>
              </div>
            </div>

            {gameOver && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {p1Wins >= neededWins ? t('player1') : t('player2')} {t('wins')}!
                </p>
                <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">
                  {p1Wins} - {p2Wins}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Statistics */}
      {total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('stats')}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('total')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{heads}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('headsLabel')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{tails}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('tailsLabel')}</p>
            </div>
          </div>

          {/* Ratio bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{t('headsLabel')} {headsRatio.toFixed(1)}%</span>
              <span>{(100 - headsRatio).toFixed(1)}% {t('tailsLabel')}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${headsRatio}%` }}
              />
            </div>
          </div>

          {streak.count >= 2 && (
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              {streak.side === 'heads' ? t('headsLabel') : t('tailsLabel')} {t('streak')} {streak.count}{t('streakUnit')}
            </p>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('history')}</h2>
          <div className="flex flex-wrap gap-2">
            {[...history].reverse().map((h, i) => (
              <span
                key={i}
                title={h === 'heads' ? t('headsLabel') : t('tailsLabel')}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: h === 'heads' ? '#f59e0b' : '#9ca3af' }}
              >
                {h === 'heads' ? 'H' : 'T'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      {total > 0 && (
        <div className="flex justify-end">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <RotateCcw size={14} />
            {t('reset')}
          </button>
        </div>
      )}

      <GuideSection namespace="coinFlip" />
    </div>
  )
}
