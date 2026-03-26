'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  countingSort,
  type CountingSortStep,
  type CountingSortResult,
  generateRandomArray,
  generateWithDuplicates,
} from '@/utils/algorithm/countingSort'
import CountingSortCanvas2D from './CountingSortCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const DEFAULT_SIZE = 16

const CODE = `// 카운팅정렬 (Counting Sort)
function countingSort(arr) {
  const max = Math.max(...arr);
  const count = new Array(max + 1).fill(0);
  const output = new Array(arr.length);

  // 1단계: 빈도 세기
  for (const val of arr) {
    count[val]++;                 // 카운트 증가
  }

  // 2단계: 누적합
  for (let i = 1; i <= max; i++) {
    count[i] += count[i - 1];    // 누적
  }

  // 3단계: 출력 배열 구성
  for (let i = arr.length - 1; i >= 0; i--) {
    output[count[arr[i]] - 1] = arr[i];  // 배치
    count[arr[i]]--;
  }
  return output;
}`

function getHighlightLines(action: CountingSortStep['action']): number[] {
  switch (action) {
    case 'count':       return [9]   // count[val]++
    case 'accumulate':  return [14]  // count[i] += count[i-1]
    case 'place':       return [19]  // output[...] = arr[i]
    case 'done':        return [22]  // return output
    default:            return []
  }
}

export default function CountingSortVisualizer() {
  const t = useTranslations('countingSortVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [array, setArray] = useState<number[]>(() => generateRandomArray(DEFAULT_SIZE))
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)

  const [sortResult, setSortResult] = useState<CountingSortResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = sortResult?.steps.length ?? 0

  const currentStep = useMemo<CountingSortStep | null>(() => {
    if (!sortResult || currentStepIndex < 0) return null
    return sortResult.steps[currentStepIndex] ?? null
  }, [sortResult, currentStepIndex])

  const visualArray = currentStep?.array ?? array
  const visualCountArray = currentStep?.countArray ?? []
  const visualOutputArray = currentStep?.outputArray ?? new Array(array.length).fill(-1)
  const visualHighlightInput = currentStep?.highlightInput ?? null
  const visualHighlightCount = currentStep?.highlightCount ?? null
  const visualHighlightOutput = currentStep?.highlightOutput ?? null
  const visualSorted = currentStep?.sorted ?? []

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runSort = useCallback(() => {
    const result = countingSort(array)
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

  const handleDuplicates = useCallback(() =>
    applyNewArray(generateWithDuplicates(arraySize)), [arraySize, applyNewArray])

  const handleArraySizeChange = useCallback((size: number) => {
    setArraySize(size)
    applyNewArray(generateRandomArray(size))
  }, [applyNewArray])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const phaseLabel = useMemo(() => {
    if (!currentStep) return ''
    if (currentStep.action === 'done') return t('stats.done')
    switch (currentStep.phase) {
      case 'counting':      return t('stats.phaseCounting')
      case 'accumulating':  return t('stats.phaseAccumulating')
      case 'placing':       return t('stats.phasePlacing')
      default:              return ''
    }
  }, [currentStep, t])

  const maxValue = sortResult?.maxValue ?? (array.length > 0 ? Math.max(...array) : 0)
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
              <CountingSortCanvas2D
                array={visualArray}
                countArray={visualCountArray}
                outputArray={visualOutputArray}
                highlightInput={visualHighlightInput}
                highlightCount={visualHighlightCount}
                highlightOutput={visualHighlightOutput}
                sorted={visualSorted}
                width={600}
                height={420}
              />
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.phase')}:{' '}
                <strong className="text-purple-600 dark:text-purple-400">{phaseLabel}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.maxValue')}:{' '}
                <strong className="text-blue-600 dark:text-blue-400">{maxValue}</strong>
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
                onClick={handleDuplicates}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
              >
                🔁 {t('controls.duplicates')}
              </button>
            </div>

            {/* Array size slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.arraySize')}</span>
              <input
                type="range"
                min={5}
                max={30}
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
                <span className="w-3 h-3 rounded-sm bg-yellow-400" />
                {t('grid.input')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-400" />
                {t('grid.count')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-violet-400" />
                {t('grid.output')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-blue-400" />
                {t('grid.active')}
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
                    {currentStepIndex >= 0 && sortResult && (
                      <CountingSortStepsList
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
                    title="countingSort.js"
                  />
                )}

                {activeTab === 'guide' && (
                  <GuideSection namespace="countingSortVisualizer" defaultOpen />
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
function CountingSortStepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: CountingSortStep[]
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

  // Auto-scroll to current step
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

  let lastPhase = ''

  return (
    <div ref={listRef} className="space-y-1 max-h-[55vh] overflow-y-auto">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent =
          step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex &&
            (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        // Phase divider
        const showPhaseDivider = step.phase !== lastPhase && step.action !== 'done'
        if (showPhaseDivider) lastPhase = step.phase

        let icon = '📊'
        let label = ''
        let colorClass = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'

        if (step.action === 'count') {
          icon = '🔢'
          label = t('stepsGuide.count', {
            idx: String(step.highlightInput ?? ''),
            val: String(step.highlightCount ?? ''),
          })
          colorClass = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
        } else if (step.action === 'accumulate') {
          icon = '➕'
          label = t('stepsGuide.accumulate', { idx: String(step.highlightCount ?? '') })
          colorClass = 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
        } else if (step.action === 'place') {
          icon = '📍'
          label = t('stepsGuide.place', {
            val: String(step.highlightCount ?? ''),
            pos: String(step.highlightOutput ?? ''),
          })
          colorClass = 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400'
        } else if (step.action === 'done') {
          icon = '🎉'
          label = t('stats.done')
          colorClass = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
        }

        return (
          <div key={i}>
            {showPhaseDivider && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                  {step.phase === 'counting'
                    ? t('stats.phaseCounting')
                    : step.phase === 'accumulating'
                      ? t('stats.phaseAccumulating')
                      : t('stats.phasePlacing')}
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
