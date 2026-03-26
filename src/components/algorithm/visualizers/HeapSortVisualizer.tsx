'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  heapSort,
  type HeapSortStep,
  type HeapSortResult,
  generateRandomArray,
  generateNearlySorted,
  generateReversed,
} from '@/utils/algorithm/heapSort'
import HeapSortCanvas2D from './HeapSortCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'

type TabKey = 'steps' | 'code'

const DEFAULT_SIZE = 15

const HEAP_SORT_CODE = `// 힙정렬 (Heap Sort)
function heapSort(arr) {
  const n = arr.length;

  // 1단계: 최대 힙 구성
  for (let i = n/2 - 1; i >= 0; i--) {
    heapify(arr, n, i);              // 힙 구성
  }

  // 2단계: 정렬
  for (let i = n - 1; i > 0; i--) {
    swap(arr, 0, i);                 // 최댓값 추출
    heapify(arr, i, 0);             // 힙 복원
  }
}

function heapify(arr, size, root) {
  let largest = root;
  const left = 2 * root + 1;
  const right = 2 * root + 2;

  if (left < size && arr[left] > arr[largest])   // 비교
    largest = left;
  if (right < size && arr[right] > arr[largest]) // 비교
    largest = right;

  if (largest !== root) {
    swap(arr, root, largest);        // 스왑
    heapify(arr, size, largest);     // 재귀
  }
}`

function getHighlightLines(action: HeapSortStep['action']): number[] {
  switch (action) {
    case 'heapify-start': return [7, 14]
    case 'compare':       return [23, 25]
    case 'swap':          return [29]
    case 'extract':       return [12]
    case 'done':          return [2]
    default:              return []
  }
}

export default function HeapSortVisualizer() {
  const t = useTranslations('heapSortVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [array, setArray] = useState<number[]>(() => generateRandomArray(DEFAULT_SIZE))
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)
  const [sortResult, setSortResult] = useState<HeapSortResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalSteps = sortResult?.steps.length ?? 0

  const currentStep = useMemo<HeapSortStep | null>(() => {
    if (!sortResult || currentStepIndex < 0) return null
    return sortResult.steps[currentStepIndex] ?? null
  }, [sortResult, currentStepIndex])

  const visualArray    = currentStep?.array    ?? array
  const visualComparing = currentStep?.comparing ?? null
  const visualSwapping  = currentStep?.swapping  ?? null
  const visualSorted    = currentStep?.sorted    ?? []
  const visualHeapSize  = currentStep?.heapSize  ?? array.length

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runSort = useCallback(() => {
    const result = heapSort(array)
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

  const handleRandom      = useCallback(() => applyNewArray(generateRandomArray(arraySize)),   [arraySize, applyNewArray])
  const handleNearlySorted = useCallback(() => applyNewArray(generateNearlySorted(arraySize)), [arraySize, applyNewArray])
  const handleReversed     = useCallback(() => applyNewArray(generateReversed(arraySize)),      [arraySize, applyNewArray])

  const handleArraySizeChange = useCallback((size: number) => {
    setArraySize(size)
    applyNewArray(generateRandomArray(size))
  }, [applyNewArray])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code')  },
  ]

  const phase       = currentStep?.phase ?? null
  const comparisons = currentStep?.comparisons ?? 0
  const swaps       = currentStep?.swaps ?? 0
  const currentHeapSize = currentStep?.heapSize ?? array.length
  const isDone      = currentStep?.action === 'done'

  const phaseLabel = phase === 'build'
    ? t('stats.phaseBuild')
    : phase === 'extract'
      ? t('stats.phaseExtract')
      : '—'

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

            {/* Canvas: tree + bars */}
            <div className="flex justify-center">
              <HeapSortCanvas2D
                array={visualArray}
                comparing={visualComparing}
                swapping={visualSwapping}
                sorted={visualSorted}
                heapSize={visualHeapSize}
                width={600}
                height={420}
              />
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {phase && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.phase')}: <strong className="text-purple-600 dark:text-purple-400">{phaseLabel}</strong>
                </span>
              )}
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.comparisons')}: <strong className="text-yellow-600 dark:text-yellow-400">{comparisons}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.swaps')}: <strong className="text-red-500 dark:text-red-400">{swaps}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.heapSize')}: <strong className="text-blue-600 dark:text-blue-400">{currentHeapSize}</strong>
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
            {/* Generate buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRandom}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40"
              >
                🎲 {t('controls.random')}
              </button>
              <button
                onClick={handleNearlySorted}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40"
              >
                📈 {t('controls.nearlySorted')}
              </button>
              <button
                onClick={handleReversed}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
              >
                📉 {t('controls.reversed')}
              </button>
            </div>

            {/* Array size slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.arraySize')}</span>
              <input
                type="range"
                min={5}
                max={31}
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
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                {t('grid.comparing')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                {t('grid.swapping')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                {t('grid.sorted')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-400" />
                {t('grid.inHeap')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-400" />
                {t('grid.outsideHeap')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: explanation panel (2/5, sticky) */}
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
                    {currentStepIndex >= 0 ? (
                      <HeapStepsList
                        steps={sortResult?.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        t={t}
                      />
                    ) : null}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={HEAP_SORT_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="heapSort.js"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Steps list sub-component
function HeapStepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: HeapSortStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s =>
        s.action === 'heapify-start' ||
        s.action === 'compare' ||
        s.action === 'swap' ||
        s.action === 'extract' ||
        s.action === 'done'
      )
  }, [steps])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  let lastPhase: 'build' | 'extract' | null = null

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive  = step.originalIndex <= currentIndex
        const isCurrent =
          step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex &&
            (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        const showPhaseDivider = step.phase !== lastPhase
        if (showPhaseDivider) lastPhase = step.phase

        let icon = '🔍'
        let label = ''
        let colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'

        if (step.action === 'heapify-start') {
          icon = '🌳'
          label = t('stepsGuide.heapifyStart')
          colorClass = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
        } else if (step.action === 'compare') {
          icon = '🔍'
          const [j, k] = step.comparing ?? [0, 1]
          label = t('stepsGuide.comparing', { j: String(j), k: String(k) })
          colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
        } else if (step.action === 'swap') {
          icon = '🔄'
          const [j, k] = step.swapping ?? [0, 1]
          label = t('stepsGuide.swapped', { j: String(j), k: String(k) })
          colorClass = 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
        } else if (step.action === 'extract') {
          icon = '⬇️'
          label = t('stepsGuide.extract')
          colorClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
        } else if (step.action === 'done') {
          icon = '🎉'
          label = t('stats.done')
          colorClass = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
        }

        return (
          <div key={i}>
            {showPhaseDivider && step.action !== 'done' && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                  {step.phase === 'build' ? t('stats.phaseBuild') : t('stats.phaseExtract')}
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
                {isActive && step.action !== 'done' && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">
                    {step.comparisons}c / {step.swaps}s
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
