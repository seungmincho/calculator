'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  mergeSort,
  type MergeSortStep,
  type MergeSortResult,
  generateRandomArray,
  generateNearlySorted,
  generateReversed,
} from '@/utils/algorithm/mergeSort'
import MergeSortCanvas2D from './MergeSortCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'

type TabKey = 'steps' | 'code'

const DEFAULT_SIZE = 20

const MERGE_SORT_CODE = `// 병합정렬 (Merge Sort)
function mergeSort(arr, left, right) {
  if (left >= right) return;

  const mid = Math.floor((left + right) / 2);
  mergeSort(arr, left, mid);        // 왼쪽 분할
  mergeSort(arr, mid + 1, right);   // 오른쪽 분할
  merge(arr, left, mid, right);     // 병합
}

function merge(arr, left, mid, right) {
  const temp = [];
  let i = left, j = mid + 1;

  while (i <= mid && j <= right) {
    if (arr[i] <= arr[j]) {         // 비교
      temp.push(arr[i++]);          // 왼쪽 선택
    } else {
      temp.push(arr[j++]);          // 오른쪽 선택
    }
  }
  // 나머지 복사
  while (i <= mid) temp.push(arr[i++]);
  while (j <= right) temp.push(arr[j++]);

  // 원본에 복사
  for (let k = 0; k < temp.length; k++) {
    arr[left + k] = temp[k];        // 배치
  }
}`

// Map step action → highlighted line numbers (1-indexed)
function getHighlightLines(action: MergeSortStep['action']): number[] {
  switch (action) {
    case 'split':         return [5]   // const mid = Math.floor(...)
    case 'compare':       return [16]  // if (arr[i] <= arr[j])
    case 'merge-place':   return [27]  // arr[left + k] = temp[k]
    case 'merge-complete': return [8]  // merge(arr, left, mid, right)
    case 'done':          return [3]   // if (left >= right) return
    default:              return []
  }
}

export default function MergeSortVisualizer() {
  const t = useTranslations('mergeSortVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Array state
  const [array, setArray] = useState<number[]>(() => generateRandomArray(DEFAULT_SIZE))
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)

  // Sort result (computed when play starts)
  const [sortResult, setSortResult] = useState<MergeSortResult | null>(null)

  // Playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Panel tab
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = sortResult?.steps.length ?? 0

  // Current visual state from step
  const currentStep = useMemo<MergeSortStep | null>(() => {
    if (!sortResult || currentStepIndex < 0) return null
    return sortResult.steps[currentStepIndex] ?? null
  }, [sortResult, currentStepIndex])

  // Visual values derived from current step (or initial array)
  const visualArray = currentStep?.array ?? array
  const visualComparing = currentStep?.comparing ?? null
  const visualPlacing = currentStep?.placing ?? null
  const visualSorted = currentStep?.sorted ?? []
  const visualRange = currentStep?.range ?? null
  const visualLeftRange = currentStep?.leftRange ?? null
  const visualRightRange = currentStep?.rightRange ?? null

  // Code highlight
  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  // Run sort
  const runSort = useCallback(() => {
    const result = mergeSort(array)
    setSortResult(result)
    setCurrentStepIndex(0)
  }, [array])

  // Play handler
  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) {
      runSort()
    }
    setIsPlaying(true)
  }, [currentStepIndex, runSort])

  // Auto-play interval
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

  // Reset
  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setSortResult(null)
  }, [])

  // Generate new array (also resets)
  const applyNewArray = useCallback((newArr: number[]) => {
    handleReset()
    setArray(newArr)
  }, [handleReset])

  const handleRandom = useCallback(() => applyNewArray(generateRandomArray(arraySize)), [arraySize, applyNewArray])
  const handleNearlySorted = useCallback(() => applyNewArray(generateNearlySorted(arraySize)), [arraySize, applyNewArray])
  const handleReversed = useCallback(() => applyNewArray(generateReversed(arraySize)), [arraySize, applyNewArray])

  const handleArraySizeChange = useCallback((size: number) => {
    setArraySize(size)
    applyNewArray(generateRandomArray(size))
  }, [applyNewArray])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
  ]

  // Stats
  const recursionDepth = currentStep?.depth ?? 0
  const comparisons = currentStep?.comparisons ?? 0
  const merges = currentStep?.merges ?? 0
  const isDone = currentStep?.action === 'done'

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
              <MergeSortCanvas2D
                array={visualArray}
                range={visualRange}
                comparing={visualComparing}
                placing={visualPlacing}
                sorted={visualSorted}
                leftRange={visualLeftRange}
                rightRange={visualRightRange}
                width={600}
                height={360}
              />
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.depth')}: <strong className="text-purple-600 dark:text-purple-400">{recursionDepth}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.comparisons')}: <strong className="text-yellow-600 dark:text-yellow-400">{comparisons}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.merges')}: <strong className="text-teal-600 dark:text-teal-400">{merges}</strong>
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
                max={50}
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
                <span className="w-3 h-3 rounded-sm bg-teal-400" />
                {t('grid.leftHalf')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-orange-400" />
                {t('grid.rightHalf')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-yellow-400" />
                {t('grid.comparing')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-indigo-400" />
                {t('grid.placing')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-emerald-400" />
                {t('grid.sorted')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-blue-400" />
                {t('grid.default')}
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
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('stepsGuide.description')}
                      </p>
                    ) : (
                      <MergeSortStepsList
                        steps={sortResult?.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={MERGE_SORT_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="mergeSort.js"
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
function MergeSortStepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: MergeSortStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Filter to show only meaningful steps
  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s =>
        s.action === 'split' ||
        s.action === 'compare' ||
        s.action === 'merge-place' ||
        s.action === 'merge-complete' ||
        s.action === 'done'
      )
  }, [steps])

  // Auto-scroll to current step
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  let lastRenderedDepth = -1

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent =
          step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex &&
            (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        // Render depth divider when a new split starts at a new depth
        const showDepthDivider =
          step.action === 'split' && step.depth !== lastRenderedDepth
        if (step.action === 'split') {
          lastRenderedDepth = step.depth
        }

        // Determine which side was picked during compare (left or right)
        // We infer from whether comparing[0] is in leftRange
        const leftIdx = step.comparing ? step.comparing[0] : null
        const isLeftPick =
          step.action === 'compare' &&
          step.leftRange !== null &&
          leftIdx !== null &&
          leftIdx >= step.leftRange[0] &&
          leftIdx <= step.leftRange[1]

        // Build step label
        let icon = '🔍'
        let label = ''
        let colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'

        if (step.action === 'split') {
          icon = '✂️'
          label = t('stepsGuide.split', {
            left: String(step.range[0]),
            right: String(step.range[1]),
          })
          colorClass = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
        } else if (step.action === 'compare') {
          icon = '🔍'
          const [j, k] = step.comparing ?? [0, 1]
          label = t('stepsGuide.comparing', { j: String(j), k: String(k) })
          colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
        } else if (step.action === 'merge-place') {
          icon = isLeftPick ? '⬅️' : '➡️'
          label = t('stepsGuide.mergePlace', { idx: String(step.placing ?? '') })
          colorClass = isLeftPick
            ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400'
            : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
        } else if (step.action === 'merge-complete') {
          icon = '✅'
          label = t('stepsGuide.mergeComplete', {
            left: String(step.range[0]),
            right: String(step.range[1]),
          })
          colorClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
        } else if (step.action === 'done') {
          icon = '🎉'
          label = t('stats.done')
          colorClass = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
        }

        return (
          <div key={i}>
            {/* Depth divider on new split */}
            {showDepthDivider && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                  {t('stats.depth')} {step.depth}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">
                  [{step.range[0]}–{step.range[1]}]
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
                    {step.comparisons}c / {step.merges}m
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
