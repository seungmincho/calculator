'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  binarySearch,
  generateSortedArray,
  generateTarget,
  type BinarySearchStep,
  type BinarySearchResult,
} from '@/utils/algorithm/binarySearch'
import BinarySearchCanvas2D from './BinarySearchCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'

type TabKey = 'steps' | 'code'

const DEFAULT_SIZE = 30

const BINARY_SEARCH_CODE = `// 이진탐색 (Binary Search)
function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (arr[mid] === target) {
      return mid;              // 찾았다!
    } else if (arr[mid] < target) {
      low = mid + 1;           // 오른쪽 탐색
    } else {
      high = mid - 1;          // 왼쪽 탐색
    }
  }
  return -1;  // 못 찾음
}`

function getHighlightLines(action: BinarySearchStep['action']): number[] {
  switch (action) {
    case 'compare':   return [9]
    case 'found':     return [10]
    case 'go-right':  return [12]
    case 'go-left':   return [14]
    case 'not-found': return [18]
    default:          return []
  }
}

// Compute eliminated indices: everything outside [low, high]
function computeEliminatedIndices(
  array: number[],
  low: number,
  high: number,
  action: BinarySearchStep['action']
): Set<number> {
  const set = new Set<number>()
  // After not-found, everything is eliminated
  if (action === 'not-found') {
    for (let i = 0; i < array.length; i++) set.add(i)
    return set
  }
  for (let i = 0; i < array.length; i++) {
    if (i < low || i > high) set.add(i)
  }
  return set
}

export default function BinarySearchVisualizer() {
  const t = useTranslations('binarySearchVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Array & target state
  const [array, setArray] = useState<number[]>(() => generateSortedArray(DEFAULT_SIZE))
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)
  const [target, setTarget] = useState<number>(() => 0)
  const [targetInput, setTargetInput] = useState<string>('')

  // Initialise target after array is ready (client-only)
  useEffect(() => {
    const arr = generateSortedArray(DEFAULT_SIZE)
    const { target: t0 } = generateTarget(arr)
    setArray(arr)
    setTarget(t0)
    setTargetInput(String(t0))
  }, [])

  // Search result
  const [searchResult, setSearchResult] = useState<BinarySearchResult | null>(null)

  // Playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Panel tab
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = searchResult?.steps.length ?? 0

  const currentStep = useMemo<BinarySearchStep | null>(() => {
    if (!searchResult || currentStepIndex < 0) return null
    return searchResult.steps[currentStepIndex] ?? null
  }, [searchResult, currentStepIndex])

  // Visual state derived from current step
  const visualArray = array
  const visualLow = currentStep?.low ?? 0
  const visualHigh = currentStep?.high ?? array.length - 1
  const visualMid = currentStep != null ? currentStep.mid : null
  const visualFoundIndex =
    currentStep?.action === 'found' ? currentStep.mid : (searchResult?.foundIndex ?? null)

  const eliminatedIndices = useMemo(() => {
    if (!currentStep) return new Set<number>()
    return computeEliminatedIndices(array, currentStep.low, currentStep.high, currentStep.action)
  }, [currentStep, array])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  // Run search
  const runSearch = useCallback((arr: number[], tgt: number) => {
    const result = binarySearch(arr, tgt)
    setSearchResult(result)
    setCurrentStepIndex(0)
  }, [])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) {
      runSearch(array, target)
    }
    setIsPlaying(true)
  }, [currentStepIndex, runSearch, array, target])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(80, 400 / speed)
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
    setSearchResult(null)
  }, [])

  const applyNewArray = useCallback((arr: number[], tgt?: number) => {
    handleReset()
    setArray(arr)
    const newTarget = tgt ?? target
    setTarget(newTarget)
    setTargetInput(String(newTarget))
  }, [handleReset, target])

  const handleGenerate = useCallback(() => {
    const arr = generateSortedArray(arraySize)
    const { target: t0 } = generateTarget(arr)
    applyNewArray(arr, t0)
  }, [arraySize, applyNewArray])

  const handleRandomTarget = useCallback(() => {
    const { target: t0 } = generateTarget(array)
    handleReset()
    setTarget(t0)
    setTargetInput(String(t0))
  }, [array, handleReset])

  const handleTargetChange = useCallback((val: string) => {
    setTargetInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num)) {
      handleReset()
      setTarget(num)
    }
  }, [handleReset])

  const handleArraySizeChange = useCallback((size: number) => {
    setArraySize(size)
    const arr = generateSortedArray(size)
    const { target: t0 } = generateTarget(arr)
    applyNewArray(arr, t0)
  }, [applyNewArray])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
  ]

  // Stats
  const comparisons = currentStep?.comparisons ?? 0
  const remainingRange = currentStep
    ? Math.max(0, currentStep.high - currentStep.low + 1)
    : array.length
  const eliminatedCount = currentStep?.eliminated ?? 0
  const isDone =
    currentStep?.action === 'found' || currentStep?.action === 'not-found'

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            {tHub('categories.search')}
          </span>
          <span className="text-xs text-gray-400">★☆☆</span>
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
                  if (currentStepIndex < 0) runSearch(array, target)
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
            <div className="flex justify-center overflow-x-auto">
              <BinarySearchCanvas2D
                array={visualArray}
                low={visualLow}
                high={visualHigh}
                mid={isRunning ? visualMid : null}
                foundIndex={isRunning ? visualFoundIndex : null}
                target={target}
                eliminatedIndices={eliminatedIndices}
                width={580}
                height={200}
              />
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.comparisons')}: <strong className="text-yellow-600 dark:text-yellow-400">{comparisons}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.remaining')}: <strong className="text-blue-600 dark:text-blue-400">{remainingRange}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.eliminated')}: <strong className="text-gray-500 dark:text-gray-400">{eliminatedCount}</strong>
              </span>
              {isDone && currentStep?.action === 'found' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.found')}
                </span>
              )}
              {isDone && currentStep?.action === 'not-found' && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                  {t('stats.notFound')}
                </span>
              )}
            </div>
          </div>

          {/* Array + target controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            {/* Generate + target row */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={handleGenerate}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40"
              >
                🔄 {t('controls.generate')}
              </button>

              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{t('controls.target')}:</span>
              <input
                type="number"
                value={targetInput}
                onChange={e => handleTargetChange(e.target.value)}
                disabled={isRunning}
                className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              />
              <button
                onClick={handleRandomTarget}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-40"
              >
                🎲 {t('controls.randomTarget')}
              </button>
            </div>

            {/* Array size slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.arraySize')}</span>
              <input
                type="range"
                min={10}
                max={100}
                value={arraySize}
                onChange={e => handleArraySizeChange(Number(e.target.value))}
                disabled={isRunning}
                className="flex-1 accent-blue-600 disabled:opacity-40"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-center tabular-nums">
                {arraySize}
              </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-blue-400" />
                {t('grid.active')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-400" />
                {t('grid.mid')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-gray-400 opacity-40" />
                {t('grid.eliminated')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-emerald-400" />
                {t('grid.found')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ background: '#22c55e' }} />
                {t('grid.low')} (L)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm" style={{ background: '#ef4444' }} />
                {t('grid.high')} (H)
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {t('stepsGuide.description')}
                    </p>
                    {currentStepIndex >= 0 && searchResult && (
                      <BinarySearchStepsList
                        steps={searchResult.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={BINARY_SEARCH_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="binarySearch.js"
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
function BinarySearchStepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: BinarySearchStep[]
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
      else if (elTop + elH > container.scrollTop + container.clientHeight) container.scrollTop = elTop + elH - container.clientHeight
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent =
          step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex &&
            (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        let icon = '🔍'
        let label = ''
        let colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'

        switch (step.action) {
          case 'compare':
            icon = '🔍'
            label = t('stepsGuide.comparing', {
              mid: step.mid,
              val: step.array[step.mid] ?? 0,
              target: step.target,
            })
            colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
            break
          case 'found':
            icon = '✅'
            label = t('stepsGuide.found', { idx: step.mid, val: step.array[step.mid] ?? 0 })
            colorClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
            break
          case 'go-left':
            icon = '⬅️'
            label = t('stepsGuide.goLeft', { high: step.mid - 1 })
            colorClass = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
            break
          case 'go-right':
            icon = '➡️'
            label = t('stepsGuide.goRight', { low: step.mid + 1 })
            colorClass = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
            break
          case 'not-found':
            icon = '❌'
            label = t('stepsGuide.notFound', { target: step.target })
            colorClass = 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
            break
        }

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent
                ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
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
              {isActive && step.action !== 'found' && step.action !== 'not-found' && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">
                  #{step.comparisons}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
