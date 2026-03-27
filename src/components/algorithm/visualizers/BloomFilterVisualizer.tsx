'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type BloomFilterState,
  type BloomStep,
  createBloomFilter,
  bloomInsert,
  bloomCheck,
  getBloomStats,
  getHashPositions,
} from '@/utils/algorithm/bloomFilter'
import BloomFilterCanvas2D from './BloomFilterCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

// ── Pseudocode ────────────────────────────────────────────────────────────
const BLOOM_CODE = `// Bloom Filter
class BloomFilter {
  bits = new BitArray(m);   // m-bit array
  k;                        // number of hash functions

  insert(element) {
    for (i = 0; i < k; i++) {
      pos = hash_i(element) % m;
      bits[pos] = 1;         // set bit
    }
  }

  check(element) {
    for (i = 0; i < k; i++) {
      pos = hash_i(element) % m;
      if (bits[pos] === 0)
        return "definitely not"; // false negative impossible
    }
    return "possibly in set";   // may be false positive
  }
}`

const CODE_LINES: Record<string, number[]> = {
  hash: [7, 14],
  'set-bit': [8],
  'insert-done': [5, 6, 7, 8, 9, 10],
  'check-bit': [15, 16],
  'check-negative': [17],
  'check-positive': [19],
  'check-false-positive': [19],
}

export default function BloomFilterVisualizer() {
  const t = useTranslations('bloomFilterVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [m, setM] = useState(32)
  const [k, setK] = useState(3)
  const [filter, setFilter] = useState<BloomFilterState>(() => createBloomFilter(32, 3))
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [steps, setSteps] = useState<BloomStep[]>([])
  const [insertValue, setInsertValue] = useState('')
  const [checkValue, setCheckValue] = useState('')
  const [lastResult, setLastResult] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = steps.length
  const currentStep: BloomStep | null = useMemo(() => {
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) return null
    return steps[currentStepIndex]
  }, [steps, currentStepIndex])

  // Step playback
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(30, 500 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const handleInsert = useCallback(() => {
    const val = insertValue.trim()
    if (!val) return
    setIsPlaying(false)
    const result = bloomInsert(filter, val)
    setFilter(prev => ({
      ...prev,
      bits: result.finalBits,
      insertedItems: [...prev.insertedItems, val],
    }))
    setSteps(result.steps)
    setCurrentStepIndex(0)
    setIsPlaying(true)
    setInsertValue('')
    setLastResult(null)
  }, [filter, insertValue])

  const handleCheck = useCallback(() => {
    const val = checkValue.trim()
    if (!val) return
    setIsPlaying(false)
    const result = bloomCheck(filter, val)
    setSteps(result.steps)
    setCurrentStepIndex(0)
    setIsPlaying(true)
    setCheckValue('')
    if (result.isFalsePositive) {
      setLastResult(t('falsePositive'))
    } else if (result.found) {
      setLastResult(filter.insertedItems.includes(val) ? t('definitelyIn') : t('probablyIn'))
    } else {
      setLastResult(t('definitelyNot'))
    }
  }, [filter, checkValue, t])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setSteps([])
    setFilter(createBloomFilter(m, k))
    setLastResult(null)
  }, [m, k])

  const handleNewFilter = useCallback(() => {
    handleReset()
  }, [handleReset])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0 && steps.length === 0) return
    setIsPlaying(true)
  }, [currentStepIndex, steps.length])

  // Canvas props
  const highlightPositions = useMemo(() => {
    if (!currentStep) return []
    if (currentStep.action === 'hash' || currentStep.action === 'set-bit' || currentStep.action === 'check-bit') {
      return [currentStep.bitPosition]
    }
    if (currentStep.action === 'insert-done' || currentStep.action === 'check-positive' || currentStep.action === 'check-false-positive') {
      return getHashPositions(currentStep.value, k, m)
    }
    return []
  }, [currentStep, k, m])

  const highlightColor = useMemo(() => {
    if (!currentStep) return 'none' as const
    if (currentStep.action.startsWith('check') || currentStep.action === 'hash' && steps.some(s => s.action.startsWith('check'))) {
      // If this is part of a check operation
      const isCheckOp = steps.some(s => s.action === 'check-bit' || s.action === 'check-positive' || s.action === 'check-negative' || s.action === 'check-false-positive')
      if (isCheckOp && (currentStep.action === 'hash' || currentStep.action.startsWith('check'))) return 'check' as const
    }
    if (currentStep.action === 'hash' || currentStep.action === 'set-bit' || currentStep.action === 'insert-done') return 'insert' as const
    return 'check' as const
  }, [currentStep, steps])

  const stats = useMemo(() => getBloomStats(filter), [filter])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return CODE_LINES[currentStep.action] ?? []
  }, [currentStep])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {tHub('categories.dataStructure')}
            </span>
            <span className="text-xs text-gray-400">★★☆</span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: visualization */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {steps.length > 0 && (
              <div className="flex justify-center">
                <VisualizerControls
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onPause={() => setIsPlaying(false)}
                  onReset={() => { setCurrentStepIndex(-1); setSteps([]); setIsPlaying(false) }}
                  onStepForward={() => setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))}
                  onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  currentStep={Math.max(0, currentStepIndex)}
                  totalSteps={Math.max(1, totalSteps)}
                />
              </div>
            )}

            <div className="flex justify-center">
              <BloomFilterCanvas2D
                bits={currentStep?.bits ?? filter.bits}
                m={m}
                k={k}
                highlightPositions={highlightPositions}
                highlightColor={highlightColor}
                insertedItems={currentStep?.insertedItems ?? filter.insertedItems}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.insertedCount')}: <strong className="text-blue-600 dark:text-blue-400">{stats.insertedCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.fillRate')}: <strong className="text-blue-600 dark:text-blue-400">{(stats.fillRate * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.fpRate')}: <strong className="text-amber-600 dark:text-amber-400">{(stats.fpRate * 100).toFixed(2)}%</strong>
              </span>
              {lastResult && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  lastResult === t('falsePositive')
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : lastResult === t('definitelyNot')
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {lastResult}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            {/* Settings */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                {t('bitSize')}:
                <select
                  value={m}
                  onChange={e => { setM(Number(e.target.value)); handleReset() }}
                  disabled={filter.insertedItems.length > 0}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                >
                  {[16, 32, 64, 128].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                {t('hashFunctions')}:
                <select
                  value={k}
                  onChange={e => { setK(Number(e.target.value)); handleReset() }}
                  disabled={filter.insertedItems.length > 0}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                >
                  {[2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            </div>

            {/* Insert/Check inputs */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={insertValue}
                  onChange={e => setInsertValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInsert()}
                  placeholder={t('insertValue')}
                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-28"
                />
                <button
                  onClick={handleInsert}
                  disabled={!insertValue.trim()}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40"
                >
                  {t('insert')}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={checkValue}
                  onChange={e => setCheckValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheck()}
                  placeholder={t('checkValue')}
                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-28"
                />
                <button
                  onClick={handleCheck}
                  disabled={!checkValue.trim()}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-40"
                >
                  {t('check')}
                </button>
              </div>
              <button
                onClick={handleNewFilter}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              >
                {t('controls.newFilter')}
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('legend.bitSet')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" /> {t('legend.bitUnset')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('legend.hashTarget')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('check')}</span>
            </div>
          </div>
        </div>

        {/* Right: panel */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.idle')}</p>
                    ) : (
                      <BloomStepsList steps={steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} k={k} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={BLOOM_CODE} language="javascript" highlightLines={codeHighlightLines} title="bloomFilter.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="bloomFilterVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BloomStepsList({ steps, currentIndex, onStepClick, t, k }: {
  steps: BloomStep[]
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
  k: number
}) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) {
      const container = listRef.current
      const elTop = (el as HTMLElement).offsetTop
      const elH = (el as HTMLElement).offsetHeight
      if (elTop < container.scrollTop) container.scrollTop = elTop
      else if (elTop + elH > container.scrollTop + container.clientHeight) container.scrollTop = elTop + elH - container.clientHeight
    }
  }, [currentIndex])

  if (steps.length === 0) return null

  return (
    <div ref={listRef} className="space-y-1">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex
        const isCurrent = i === currentIndex

        let label = ''
        let icon = '🔍'

        switch (step.action) {
          case 'hash':
            label = t('stepsGuide.hashing', { k: String(step.hashIndex + 1), val: step.value, pos: String(step.bitPosition) })
            icon = '#️⃣'
            break
          case 'set-bit':
            label = t('stepsGuide.setBit', { pos: String(step.bitPosition) })
            icon = '✏️'
            break
          case 'insert-done':
            label = t('stepsGuide.insertDone', { val: step.value, k: String(k) })
            icon = '✅'
            break
          case 'check-bit':
            label = t('stepsGuide.checkBit', { pos: String(step.bitPosition), state: step.bitState ?? '?' })
            icon = '🔎'
            break
          case 'check-positive':
            label = t('stepsGuide.checkPositive', { val: step.value })
            icon = '✅'
            break
          case 'check-negative':
            label = t('stepsGuide.checkNegative', { val: step.value, pos: String(step.bitPosition) })
            icon = '❌'
            break
          case 'check-false-positive':
            label = t('stepsGuide.checkFalsePositive', { val: step.value })
            icon = '⚠️'
            break
        }

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
            onClick={() => onStepClick(i)}
          >
            <span className="text-gray-700 dark:text-gray-300">{icon} {label}</span>
          </div>
        )
      })}
    </div>
  )
}
