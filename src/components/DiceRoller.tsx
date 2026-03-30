'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Plus, Minus } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

const DICE_SIDES = [4, 6, 8, 10, 12, 20]

const D6_DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

function D6Face({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = D6_DOTS[value] ?? []
  return (
    <div
      className={`w-16 h-16 bg-white dark:bg-gray-700 rounded-lg shadow-md relative border-2 border-gray-200 dark:border-gray-600 ${rolling ? 'animate-dice-roll' : ''}`}
      style={{ minWidth: '4rem' }}
    >
      <div className="absolute inset-1 grid"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}>
        {Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3)
          const col = i % 3
          const hasDot = dots.some(([r, c]) => r === row && c === col)
          return (
            <div key={i} className="flex items-center justify-center">
              {hasDot && (
                <span className="w-2.5 h-2.5 rounded-full bg-gray-800 dark:bg-gray-100 block" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DieFace({ value, sides, rolling }: { value: number; sides: number; rolling: boolean }) {
  if (sides === 6) return <D6Face value={value} rolling={rolling} />
  return (
    <div
      className={`w-16 h-16 bg-white dark:bg-gray-700 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center ${rolling ? 'animate-dice-roll' : ''}`}
      style={{ minWidth: '4rem' }}
    >
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 leading-none">D{sides}</span>
      <span className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</span>
    </div>
  )
}

export default function DiceRoller() {
  const t = useTranslations('diceRoller')
  const [diceCount, setDiceCount] = useState(2)
  const [sides, setSides] = useState(6)
  const [results, setResults] = useState<number[]>([])
  const [isRolling, setIsRolling] = useState(false)
  const [modifier, setModifier] = useState(0)
  const [history, setHistory] = useState<{ results: number[]; sides: number; sum: number; modifier: number }[]>([])

  const roll = useCallback(() => {
    if (isRolling) return
    setIsRolling(true)
    setTimeout(() => {
      const rolled = Array.from({ length: diceCount }, () => Math.floor(Math.random() * sides) + 1)
      setResults(rolled)
      const rawSum = rolled.reduce((a, b) => a + b, 0)
      setHistory(prev => [{ results: rolled, sides, sum: rawSum + modifier, modifier }, ...prev].slice(0, 10))
      setIsRolling(false)
    }, 600)
  }, [isRolling, diceCount, sides, modifier])

  const reset = useCallback(() => {
    setResults([])
    setHistory([])
    setModifier(0)
    setDiceCount(2)
    setSides(6)
  }, [])

  const rawSum = results.reduce((a, b) => a + b, 0)
  const total = rawSum + modifier
  const max = results.length ? Math.max(...results) : 0
  const min = results.length ? Math.min(...results) : 0
  const avg = results.length ? (rawSum / results.length).toFixed(1) : '0'

  return (
    <>
      <style>{`
        @keyframes diceRoll {
          0% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-15deg) scale(1.1); }
          40% { transform: rotate(15deg) scale(0.95); }
          60% { transform: rotate(-10deg) scale(1.05); }
          80% { transform: rotate(8deg) scale(0.98); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .animate-dice-roll { animation: diceRoll 0.6s ease-in-out; }
      `}</style>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
              {/* Dice count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('diceCount')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiceCount(c => Math.max(1, c - 1))}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-xl font-bold text-gray-900 dark:text-white">{diceCount}</span>
                  <button
                    onClick={() => setDiceCount(c => Math.min(10, c + 1))}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sides selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('diceSides')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DICE_SIDES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSides(s)}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                        sides === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      D{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('modifier')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModifier(m => m - 1)}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className={`w-10 text-center text-xl font-bold ${modifier >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                    {modifier >= 0 ? '+' : ''}{modifier}
                  </span>
                  <button
                    onClick={() => setModifier(m => m + 1)}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roll button */}
              <button
                onClick={roll}
                disabled={isRolling}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-lg"
              >
                {isRolling ? t('rolling') : t('rollButton')} {diceCount}D{sides}
              </button>

              <button
                onClick={reset}
                className="w-full py-2 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dice faces */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{t('diceResults')}</h2>
              {results.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-500 text-sm">
                  {t('noRollYet')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {results.map((v, i) => (
                    <DieFace key={i} value={v} sides={sides} rolling={false} />
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('total'), value: total, highlight: true },
                  { label: t('max'), value: max },
                  { label: t('min'), value: min },
                  { label: t('average'), value: avg },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={`rounded-xl p-4 text-center ${highlight ? 'bg-blue-50 dark:bg-blue-950' : 'bg-gray-50 dark:bg-gray-700'}`}>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
                    <div className={`text-2xl font-bold ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {value}
                    </div>
                    {highlight && modifier !== 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {rawSum} {modifier >= 0 ? '+' : ''}{modifier}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('history')}</h2>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <span className="w-5 text-xs text-gray-400">#{i + 1}</span>
                        <span className="font-medium text-gray-600 dark:text-gray-300">{h.results.length}D{h.sides}</span>
                        <span>[{h.results.join(', ')}]</span>
                        {h.modifier !== 0 && (
                          <span className={h.modifier > 0 ? 'text-blue-500' : 'text-red-500'}>
                            {h.modifier > 0 ? '+' : ''}{h.modifier}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{t('total')}: {h.sum}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <GuideSection namespace="diceRoller" />
      </div>
    </>
  )
}
