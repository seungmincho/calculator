'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Shuffle, SortAsc, SortDesc, Copy, Check } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

interface DrawRecord {
  numbers: number[]
  timestamp: string
  min: number
  max: number
  count: number
}

type SortMode = 'none' | 'asc' | 'desc'

const GLASS_CARD = 'bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[inset_2px_2px_10px_rgba(255,255,255,0.15),inset_-2px_-2px_10px_rgba(255,255,255,0.05)] p-6'
const GLASS_BTN = 'bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl px-4 py-2 font-medium text-gray-800 dark:text-white hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200 shadow-md active:scale-95'

export default function RandomNumberPicker() {
  const t = useTranslations('randomNumberPicker')
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(100)
  const [count, setCount] = useState(5)
  const [noDuplicates, setNoDuplicates] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('none')
  const [results, setResults] = useState<number[]>([])
  const [rollingNumbers, setRollingNumbers] = useState<number[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [history, setHistory] = useState<DrawRecord[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applySort = (nums: number[], mode: SortMode) => {
    if (mode === 'none') return nums
    return [...nums].sort((a, b) => mode === 'asc' ? a - b : b - a)
  }

  const validate = useCallback(() => {
    if (min >= max) { setError(t('rangeError')); return false }
    const range = max - min + 1
    if (noDuplicates && count > range) { setError(t('countError')); return false }
    if (count < 1 || count > 50) { setError(t('countError')); return false }
    setError('')
    return true
  }, [min, max, count, noDuplicates, t])

  const pickNumbers = useCallback((mn: number, mx: number, cnt: number, unique: boolean): number[] => {
    const pool: number[] = []
    for (let i = mn; i <= mx; i++) pool.push(i)
    if (unique) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]]
      }
      return pool.slice(0, cnt)
    }
    return Array.from({ length: cnt }, () => mn + Math.floor(Math.random() * (mx - mn + 1)))
  }, [])

  const draw = useCallback(() => {
    if (!validate()) return
    if (isDrawing) return
    setIsDrawing(true)
    setRevealed([])

    const final = applySort(pickNumbers(min, max, count, noDuplicates), sortMode)
    const range = max - min + 1

    // Rolling animation: update random numbers fast then slow down
    let tick = 0
    const totalTicks = 18
    const rolling = Array.from({ length: count }, () => min + Math.floor(Math.random() * range))
    setRollingNumbers(rolling)
    setResults([])

    const interval = setInterval(() => {
      tick++
      setRollingNumbers(Array.from({ length: count }, () => min + Math.floor(Math.random() * range)))

      if (tick >= totalTicks) {
        clearInterval(interval)
        setRollingNumbers(final)
        setResults(final)
        setIsDrawing(false)

        // Reveal one by one
        const revealedArr: boolean[] = Array(count).fill(false)
        final.forEach((_, i) => {
          animRef.current = setTimeout(() => {
            revealedArr[i] = true
            setRevealed([...revealedArr])
          }, i * 150)
        })

        // Save to history
        setHistory(prev => [{
          numbers: final,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          min,
          max,
          count
        }, ...prev.slice(0, 9)])
      }
    }, tick < 8 ? 60 : tick < 14 ? 100 : 160)
  }, [validate, isDrawing, pickNumbers, min, max, count, noDuplicates, sortMode])

  const applyPreset = (mn: number, mx: number, cnt: number) => {
    setMin(mn); setMax(mx); setCount(cnt)
    setError(''); setResults([]); setRevealed([])
  }

  const copyResult = useCallback(async () => {
    if (!results.length) return
    const text = results.join(', ')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;left:-9999px'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [results])

  const reset = () => { setResults([]); setRevealed([]); setError('') }

  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current) }, [])

  const displayNumbers = isDrawing ? rollingNumbers : results
  const cycleSortMode = () => setSortMode(m => m === 'none' ? 'asc' : m === 'asc' ? 'desc' : 'none')

  return (
    <div className="relative min-h-[600px]">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-teal-500/20 dark:from-cyan-900/30 dark:via-blue-900/20 dark:to-teal-900/30 rounded-3xl" />
      <div className="relative z-10 p-4 sm:p-6 space-y-6">

        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t('description')}</p>
        </div>

        {/* Presets */}
        <div className={GLASS_CARD}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('presets')}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => applyPreset(1, 45, 6)} className={GLASS_BTN + ' text-sm'}>
              🎱 {t('presetLotto')}
            </button>
            <button onClick={() => applyPreset(1, 999, 1)} className={GLASS_BTN + ' text-sm'}>
              🚗 {t('presetParking')}
            </button>
            <button onClick={() => applyPreset(1, 30, 1)} className={GLASS_BTN + ' text-sm'}>
              🏫 {t('presetClass')}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className={GLASS_CARD}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{t('min')}</label>
              <input
                type="number"
                value={min}
                onChange={e => { setMin(Number(e.target.value)); setError('') }}
                className="w-full px-3 py-2 bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{t('max')}</label>
              <input
                type="number"
                value={max}
                onChange={e => { setMax(Number(e.target.value)); setError('') }}
                className="w-full px-3 py-2 bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{t('count')}</label>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={e => { setCount(Number(e.target.value)); setError('') }}
                className="w-full px-3 py-2 bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>
          </div>

          {/* No duplicates + sort */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setNoDuplicates(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${noDuplicates ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${noDuplicates ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-200">{t('noDuplicates')}</span>
            </label>

            <button
              onClick={cycleSortMode}
              className={GLASS_BTN + ' flex items-center gap-1.5 text-sm'}
              title={sortMode === 'none' ? t('noSort') : sortMode === 'asc' ? t('sortAsc') : t('sortDesc')}
            >
              {sortMode === 'asc' ? <SortAsc size={15} /> : sortMode === 'desc' ? <SortDesc size={15} /> : <Shuffle size={15} />}
              {sortMode === 'none' ? t('noSort') : sortMode === 'asc' ? t('sortAsc') : t('sortDesc')}
            </button>
          </div>

          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Draw Button */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={draw}
            disabled={isDrawing}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-60 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-200 active:scale-95 text-lg"
          >
            <Shuffle size={20} className={isDrawing ? 'animate-spin' : ''} />
            {isDrawing ? t('drawing') : t('draw')}
          </button>
          {results.length > 0 && (
            <button onClick={reset} className={GLASS_BTN + ' flex items-center gap-1.5'}>
              <RotateCcw size={15} />
              {t('reset')}
            </button>
          )}
        </div>

        {/* Result Bubbles */}
        {(displayNumbers.length > 0) && (
          <div className={GLASS_CARD}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('result')}</p>
              {results.length > 0 && (
                <button onClick={copyResult} className={GLASS_BTN + ' flex items-center gap-1.5 text-xs'}>
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  {copied ? t('copied') : t('copyResult')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {displayNumbers.map((n, i) => (
                <div
                  key={i}
                  className={`
                    relative flex items-center justify-center rounded-2xl font-black
                    bg-gradient-to-br from-cyan-400/30 to-blue-500/30 dark:from-cyan-500/20 dark:to-blue-600/20
                    border border-cyan-300/50 dark:border-cyan-500/30
                    shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]
                    transition-all duration-300
                    ${isDrawing ? 'animate-pulse scale-95 opacity-70' : (revealed[i] ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}
                    ${n >= 1000 ? 'w-20 h-16 text-lg' : n >= 100 ? 'w-16 h-16 text-xl' : 'w-14 h-14 text-2xl'}
                  `}
                  style={!isDrawing && revealed[i] ? {
                    boxShadow: '0 0 20px rgba(6,182,212,0.4), inset 2px 2px 8px rgba(255,255,255,0.2)'
                  } : undefined}
                >
                  <span className="text-gray-900 dark:text-white drop-shadow-sm">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className={GLASS_CARD}>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">{t('history')}</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {history.map((rec, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-white/10 dark:bg-white/5 rounded-xl px-3 py-2">
                  <span className="text-gray-400 shrink-0 tabular-nums">{rec.timestamp}</span>
                  <span className="text-gray-400 shrink-0">[{rec.min}~{rec.max}]</span>
                  <span className="text-gray-700 dark:text-gray-200 font-semibold truncate">
                    {rec.numbers.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guide */}
        <GuideSection namespace="randomNumberPicker" />
      </div>
    </div>
  )
}
