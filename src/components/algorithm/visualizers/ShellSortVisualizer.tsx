'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  shellSort,
  generateRandomArray,
  generateNearlySorted,
  generateReversed,
  type ShellSortStep,
  type ShellSortResult,
  type GapSequence,
} from '@/utils/algorithm/shellSort'
import ShellSortCanvas2D from './ShellSortCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const DEFAULT_SIZE = 20

const SHELL_SORT_CODE = `// Shell Sort
function shellSort(arr, gaps) {
  for (const gap of gaps) {        // for each gap
    for (let i = gap; i < n; i++) {
      let j = i;

      while (j >= gap &&
             arr[j - gap] > arr[j]) {
        // Compare elements gap-apart
        swap(arr, j - gap, j);     // swap
        j -= gap;                  // move back by gap
      }
    }
  }
  // When gap = 1, this is insertion sort
  return arr;
}`

function getHighlightLines(action: ShellSortStep['action']): number[] {
  switch (action) {
    case 'set-gap':       return [3]
    case 'compare':       return [7, 8]
    case 'swap':          return [10]
    case 'no-swap':       return [7, 8]
    case 'gap-complete':  return [3]
    case 'done':          return [15]
    default:              return []
  }
}

export default function ShellSortVisualizer() {
  const t = useTranslations('shellSortVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [array, setArray] = useState<number[]>(() => generateRandomArray(DEFAULT_SIZE))
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE)
  const [gapType, setGapType] = useState<GapSequence>('shell')
  const [result, setResult] = useState<ShellSortResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = result?.steps.length ?? 0
  const currentStep = useMemo<ShellSortStep | null>(() => {
    if (!result || currentStepIndex < 0) return null
    return result.steps[currentStepIndex] ?? null
  }, [result, currentStepIndex])

  const visualArray = currentStep?.array ?? array
  const visualComparing = currentStep?.comparing ?? null
  const visualSwapping = currentStep?.swapping ?? null
  const visualSorted = currentStep?.sorted ?? []
  const visualGap = currentStep?.gap ?? 1
  const visualActive = currentStep?.activeIndices ?? []

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runSort = useCallback(() => {
    const r = shellSort(array, gapType)
    setResult(r)
    setCurrentStepIndex(0)
  }, [array, gapType])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runSort()
    setIsPlaying(true)
  }, [currentStepIndex, runSort])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 200 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setResult(null)
  }, [])

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

  const handleGapTypeChange = useCallback((type: GapSequence) => {
    handleReset()
    setGapType(type)
  }, [handleReset])

  const isRunning = currentStepIndex >= 0
  const comparisons = currentStep?.comparisons ?? 0
  const swaps = currentStep?.swaps ?? 0
  const isDone = currentStep?.action === 'done'

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  return (
    <div className="space-y-6">
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

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
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

            <div className="flex justify-center">
              <ShellSortCanvas2D
                array={visualArray}
                comparing={visualComparing}
                swapping={visualSwapping}
                sorted={visualSorted}
                gap={visualGap}
                activeIndices={visualActive}
                width={600}
                height={380}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.gap')}: <strong className="text-purple-600 dark:text-purple-400">{visualGap}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.comparisons')}: <strong className="text-yellow-600 dark:text-yellow-400">{comparisons}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.swaps')}: <strong className="text-red-500 dark:text-red-400">{swaps}</strong>
              </span>
              {result?.gapSequence && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.gapSequence')}: <strong className="text-indigo-500 dark:text-indigo-400">[{result.gapSequence.join(', ')}]</strong>
                </span>
              )}
              {isDone && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.done')}
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={handleRandom} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40">
                🎲 {t('controls.random')}
              </button>
              <button onClick={handleNearlySorted} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40">
                📈 {t('controls.nearlySorted')}
              </button>
              <button onClick={handleReversed} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 disabled:opacity-40">
                📉 {t('controls.reversed')}
              </button>
            </div>

            {/* Gap sequence selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.gapSequence')}</span>
              <div className="flex gap-1">
                {(['shell', 'knuth', 'hibbard'] as const).map(type => (
                  <button key={type} onClick={() => handleGapTypeChange(type)} disabled={isRunning}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-40 ${
                      gapType === type
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    {t(`controls.gap_${type}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.arraySize')}</span>
              <input type="range" min={5} max={50} value={arraySize}
                onChange={e => handleArraySizeChange(Number(e.target.value))}
                disabled={isRunning} className="flex-1 accent-purple-600 disabled:opacity-40" />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-center tabular-nums">{arraySize}</span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400" />{t('grid.comparing')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400" />{t('grid.swapping')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400" />{t('grid.gapGroup')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400" />{t('grid.sorted')}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.description')}</p>
                    ) : (
                      <ShellSortStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={SHELL_SORT_CODE} language="javascript" highlightLines={codeHighlightLines} title="shellSort.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="shellSortVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShellSortStepsList({ steps, currentIndex, onStepClick, t }: {
  steps: ShellSortStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, idx) => ({ ...step, originalIndex: idx }))
      .filter(s => s.action === 'set-gap' || s.action === 'compare' || s.action === 'swap' || s.action === 'gap-complete' || s.action === 'done')
      .slice(0, 300)
  }, [steps])

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

  const icons: Record<string, string> = {
    'set-gap': '📏', compare: '🔍', swap: '🔄', 'no-swap': '✓', 'gap-complete': '✅', done: '🎉',
  }
  const colorClasses: Record<string, string> = {
    'set-gap': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    compare: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
    swap: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'gap-complete': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    done: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  let lastGap = -1

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex && (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        const showGapDivider = step.gap !== lastGap && step.action === 'set-gap'
        if (step.action === 'set-gap') lastGap = step.gap

        let label = ''
        if (step.action === 'set-gap') label = t('stepsGuide.setGap', { gap: String(step.gap) })
        else if (step.action === 'compare' && step.comparing) label = t('stepsGuide.comparing', { j: String(step.comparing[0]), k: String(step.comparing[1]) })
        else if (step.action === 'swap' && step.swapping) label = t('stepsGuide.swapped', { j: String(step.swapping[0]), k: String(step.swapping[1]) })
        else if (step.action === 'gap-complete') label = t('stepsGuide.gapComplete', { gap: String(step.gap) })
        else if (step.action === 'done') label = t('stats.done')

        return (
          <div key={i}>
            {showGapDivider && i > 0 && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                  gap = {step.gap}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            )}
            <div data-active={isCurrent ? 'true' : undefined}
              className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                isCurrent ? 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-900/20'
                : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
              }`} onClick={() => onStepClick(step.originalIndex)}>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorClasses[step.action] || ''}`}>
                  {icons[step.action] || '•'}
                </span>
                <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{label}</span>
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
