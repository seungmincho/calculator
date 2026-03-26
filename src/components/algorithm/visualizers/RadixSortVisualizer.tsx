'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  radixSort,
  type RadixSortStep,
  type RadixSortResult,
  generateRandomArray,
  generateSameDigits,
} from '@/utils/algorithm/radixSort'
import RadixSortCanvas2D from './RadixSortCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const DEFAULT_SIZE = 14

const CODE = `// 래딕스정렬 LSD (Radix Sort — Least Significant Digit)
function radixSort(arr) {
  const max = Math.max(...arr);
  const totalDigits = Math.floor(Math.log10(max)) + 1;

  for (let d = 0; d < totalDigits; d++) {
    // 1단계: 자릿수별 버킷에 분배
    const buckets = Array.from({length: 10}, () => []);
    for (const num of arr) {
      const digit = Math.floor(num / 10**d) % 10;
      buckets[digit].push(num);    // 버킷에 넣기
    }

    // 2단계: 버킷 순서대로 수집
    arr = buckets.flat();          // 0번 버킷부터 순서대로
  }
  return arr;
}`

function getHighlightLines(action: RadixSortStep['action']): number[] {
  switch (action) {
    case 'distribute':    return [9]   // buckets[digit].push
    case 'collect':       return [13]  // arr = buckets.flat()
    case 'digit-complete': return [5]  // for loop — next digit
    case 'done':          return [15]  // return arr
    default:              return []
  }
}

export default function RadixSortVisualizer() {
  const t = useTranslations('radixSortVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [array, setArray] = useState<number[]>(() => generateRandomArray(DEFAULT_SIZE))
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)

  const [sortResult, setSortResult] = useState<RadixSortResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = sortResult?.steps.length ?? 0

  const currentStep = useMemo<RadixSortStep | null>(() => {
    if (!sortResult || currentStepIndex < 0) return null
    return sortResult.steps[currentStepIndex] ?? null
  }, [sortResult, currentStepIndex])

  const visualArray = currentStep?.array ?? array
  const visualBuckets = currentStep?.buckets ?? Array.from({ length: 10 }, () => [])
  const visualCurrentDigit = currentStep?.currentDigit ?? 0
  const visualHighlightIndex = currentStep?.highlightIndex ?? null
  const visualHighlightBucket = currentStep?.highlightBucket ?? null
  const visualHighlightDigit = currentStep?.highlightDigit ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runSort = useCallback(() => {
    const result = radixSort(array)
    setSortResult(result)
    setCurrentStepIndex(0)
  }, [array])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runSort()
    setIsPlaying(true)
  }, [currentStepIndex, runSort])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 200 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, interval)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, totalSteps])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setSortResult(null)
  }, [])

  const applyNewArray = useCallback((newArr: number[]) => {
    handleReset()
    setArray(newArr)
  }, [handleReset])

  const handleRandom = useCallback(() =>
    applyNewArray(generateRandomArray(arraySize)), [arraySize, applyNewArray])

  const handleSameDigits = useCallback(() =>
    applyNewArray(generateSameDigits(arraySize)), [arraySize, applyNewArray])

  const handleArraySizeChange = useCallback((size: number) => {
    setArraySize(size)
    applyNewArray(generateRandomArray(size))
  }, [applyNewArray])

  const isRunning = currentStepIndex >= 0
  const isDone = currentStep?.action === 'done'
  const totalDigits = sortResult?.totalDigits ?? 0

  const actionLabel = useMemo(() => {
    if (!currentStep) return ''
    switch (currentStep.action) {
      case 'distribute':     return t('stats.distribute')
      case 'collect':        return t('stats.collect')
      case 'digit-complete': return t('stats.digitComplete')
      case 'done':           return t('stats.done')
      default:               return ''
    }
  }, [currentStep, t])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
            {tHub('categories.sort')}
          </span>
          <span className="text-xs text-gray-400">★★☆</span>
        </div>
      </div>

      {/* Main split layout */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: visualization (3/5) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {/* Controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) runSort()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            {/* Canvas */}
            <div className="flex justify-center">
              <RadixSortCanvas2D
                array={visualArray}
                buckets={visualBuckets}
                currentDigit={visualCurrentDigit}
                highlightIndex={visualHighlightIndex}
                highlightBucket={visualHighlightBucket}
                highlightDigit={visualHighlightDigit}
                width={600}
                height={440}
              />
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.currentDigit')}:{' '}
                <strong className="text-purple-600 dark:text-purple-400">
                  {currentStep ? String(currentStep.currentDigit + 1) : '-'}
                </strong>
                {totalDigits > 0 && (
                  <span className="text-gray-400 ml-1">/ {totalDigits}</span>
                )}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.action')}:{' '}
                <strong className="text-blue-600 dark:text-blue-400">{actionLabel}</strong>
              </span>
              {isDone && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.done')}
                </span>
              )}
            </div>
          </div>

          {/* Array controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRandom}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40"
              >
                🎲 {t('controls.random')}
              </button>
              <button
                onClick={handleSameDigits}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
              >
                🔢 {t('controls.sameDigits')}
              </button>
            </div>

            {/* Array size slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.arraySize')}</span>
              <input
                type="range"
                min={5}
                max={24}
                value={arraySize}
                onChange={e => handleArraySizeChange(Number(e.target.value))}
                disabled={isRunning}
                className="flex-1 accent-purple-600 disabled:opacity-40"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-center tabular-nums">
                {arraySize}
              </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-400" />
                {t('legend.distributing')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-pink-400" />
                {t('legend.collecting')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-blue-400" />
                {t('legend.inBucket')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: explanation panel (2/5) */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {t('stepsGuide.description')}
                    </p>
                    {currentStepIndex >= 0 && sortResult && (
                      <RadixSortStepsList
                        steps={sortResult.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="radixSort.js"
                  />
                )}

                {activeTab === 'guide' && (
                  <GuideSection namespace="radixSortVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Steps list sub-component ───────────────────────────────────────────────
function RadixSortStepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: RadixSortStep[]
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() =>
    steps.map((step, originalIndex) => ({ ...step, originalIndex })),
    [steps]
  )

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      const container = listRef.current
      const elTop = (activeEl as HTMLElement).offsetTop
      const elH = (activeEl as HTMLElement).offsetHeight
      if (elTop < container.scrollTop) container.scrollTop = elTop
      else if (elTop + elH > container.scrollTop + container.clientHeight)
        container.scrollTop = elTop + elH - container.clientHeight
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  let lastDigit = -1

  return (
    <div ref={listRef} className="space-y-1 max-h-[55vh] overflow-y-auto">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent =
          step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex &&
            (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        // Digit pass divider
        const showDigitDivider = step.currentDigit !== lastDigit && step.action !== 'done'
        if (showDigitDivider) lastDigit = step.currentDigit

        let icon = '🔄'
        let label = ''
        let colorClass = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'

        if (step.action === 'distribute') {
          icon = '📥'
          label = t('stepsGuide.distribute', {
            idx: String(step.highlightIndex ?? ''),
            val: String(step.array[step.highlightIndex ?? 0] ?? ''),
            bucket: String(step.highlightBucket ?? ''),
          })
          colorClass = 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
        } else if (step.action === 'collect') {
          icon = '📤'
          label = t('stepsGuide.collect', {
            bucket: String(step.highlightBucket ?? ''),
            val: String(step.array[step.highlightIndex ?? 0] ?? ''),
          })
          colorClass = 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400'
        } else if (step.action === 'digit-complete') {
          icon = '✅'
          label = t('stepsGuide.digitComplete', { digit: String(step.currentDigit + 1) })
          colorClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
        } else if (step.action === 'done') {
          icon = '🎉'
          label = t('stats.done')
          colorClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
        }

        return (
          <div key={i}>
            {showDigitDivider && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                  {t('stepsGuide.digitPass', { digit: String(step.currentDigit + 1) })}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            )}

            <div
              data-active={isCurrent ? 'true' : undefined}
              className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                isCurrent
                  ? 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-900/20'
                  : isActive
                    ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                    : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
              }`}
              onClick={() => onStepClick(step.originalIndex)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorClass}`}>
                  {icon}
                </span>
                <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">
                  {label}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
