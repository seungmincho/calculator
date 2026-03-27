'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  solveFixedWindow, solveVariableWindow,
  generateRandomArray, SW_PRESETS,
  type SlidingWindowStep, type SlidingWindowMode, type SlidingWindowResult,
} from '@/utils/algorithm/slidingWindow'
import SlidingWindowCanvas2D from './SlidingWindowCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const FIXED_CODE = `// Fixed-size Sliding Window — O(n)
// Find max sum subarray of size k
function maxSumWindow(arr, k) {
  let sum = 0;
  for (let i = 0; i < k; i++)
    sum += arr[i];            // initial window

  let maxSum = sum;
  let bestStart = 0;

  for (let i = k; i < arr.length; i++) {
    sum -= arr[i - k];        // remove left
    sum += arr[i];             // add right
    if (sum > maxSum) {
      maxSum = sum;            // update best
      bestStart = i - k + 1;
    }
  }
  return { maxSum, bestStart };
}`

const VARIABLE_CODE = `// Variable-size Sliding Window — O(n)
// Find min length subarray with sum >= target
function minLenWindow(arr, target) {
  let left = 0, sum = 0;
  let minLen = Infinity;

  for (let right = 0; right < arr.length; right++) {
    sum += arr[right];          // expand right

    while (sum >= target) {
      minLen = Math.min(minLen,
        right - left + 1);     // update best
      sum -= arr[left];         // shrink left
      left++;
    }
  }
  return minLen === Infinity ? -1 : minLen;
}`

const FIXED_CODE_LINES: Record<SlidingWindowStep['action'], number[]> = {
  'init':        [4, 5, 6],
  'slide':       [11, 12],
  'expand':      [12],
  'shrink':      [11],
  'update-best': [14, 15],
  'complete':    [18],
}

const VARIABLE_CODE_LINES: Record<SlidingWindowStep['action'], number[]> = {
  'init':        [4, 5],
  'expand':      [8],
  'shrink':      [13, 14],
  'slide':       [8],
  'update-best': [11, 12],
  'complete':    [16],
}

export default function SlidingWindowVisualizer() {
  const t = useTranslations('slidingWindowVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [mode, setMode] = useState<SlidingWindowMode>('fixed')
  const [presetIdx, setPresetIdx] = useState(0)
  const [array, setArray] = useState(SW_PRESETS[0].array)
  const [windowSize, setWindowSize] = useState(SW_PRESETS[0].windowSize)
  const [target, setTarget] = useState(SW_PRESETS[0].target)
  const [arrayInput, setArrayInput] = useState(SW_PRESETS[0].array.join(', '))

  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<SlidingWindowResult | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = mode === 'fixed'
      ? solveFixedWindow(array, windowSize)
      : solveVariableWindow(array, target)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [array, windowSize, target, mode])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setResult(null)
  }, [])

  const selectPreset = useCallback((idx: number) => {
    setPresetIdx(idx)
    const p = SW_PRESETS[idx]
    setArray(p.array)
    setArrayInput(p.array.join(', '))
    setWindowSize(p.windowSize)
    setTarget(p.target)
    handleReset()
  }, [handleReset])

  const handleRandomize = useCallback(() => {
    const arr = generateRandomArray(12, 15)
    setArray(arr)
    setArrayInput(arr.join(', '))
    handleReset()
  }, [handleReset])

  const handleArrayChange = useCallback((value: string) => {
    setArrayInput(value)
    const nums = value.split(/[,\s]+/).filter(Boolean).map(Number).filter(n => !isNaN(n) && n > 0)
    if (nums.length > 0) {
      setArray(nums)
      handleReset()
    }
  }, [handleReset])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 500 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const currentStep = result?.steps[currentStepIndex] ?? null

  const canvasProps = useMemo(() => {
    return {
      array,
      left: currentStep?.left ?? -1,
      right: currentStep?.right ?? -1,
      bestLeft: currentStep?.bestLeft ?? -1,
      bestRight: currentStep?.bestRight ?? -1,
      currentSum: currentStep?.currentSum ?? 0,
      bestValue: currentStep?.bestValue ?? 0,
      mode,
    }
  }, [currentStep, array, mode])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    const lines = mode === 'fixed' ? FIXED_CODE_LINES : VARIABLE_CODE_LINES
    return lines[currentStep.action] ?? []
  }, [currentStep, mode])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const ACTION_STYLE: Record<string, string> = {
    'init':        'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    'expand':      'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'shrink':      'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'slide':       'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300/50 dark:border-cyan-700/40',
    'update-best': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'complete':    'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }
  const ACTION_BADGE: Record<string, string> = {
    'init':        'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    'expand':      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'shrink':      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'slide':       'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    'update-best': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'complete':    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
              {tHub('categories.technique')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying} onPlay={handlePlay} onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => { if (currentStepIndex < 0) runAlgorithm(); else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1)) }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed} onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)} totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <SlidingWindowCanvas2D
                  {...canvasProps}
                  width={680} height={320}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('currentSum')}: <strong className="text-blue-600 dark:text-blue-400">{currentStep?.currentSum ?? '-'}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('bestResult')}: <strong className="text-emerald-600 dark:text-emerald-400">
                  {currentStep ? (
                    mode === 'fixed'
                      ? `${t('maxSum')}=${currentStep.bestValue}`
                      : (currentStep.bestValue === -1 ? '-' : `${t('minLength')}=${currentStep.bestValue}`)
                  ) : '-'}
                </strong>
              </span>
              {currentStep && currentStep.left >= 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('currentWindow')}: <strong>[{currentStep.left}..{currentStep.right}]</strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('mode')}</p>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button onClick={() => { setMode('fixed'); handleReset() }}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    mode === 'fixed' ? 'bg-sky-500 text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}>{t('fixedWindow')}</button>
                <button onClick={() => { setMode('variable'); handleReset() }}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    mode === 'variable' ? 'bg-sky-500 text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}>{t('variableWindow')}</button>
              </div>
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('tabs.steps')}</p>
              <div className="flex flex-wrap gap-2">
                {SW_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-sky-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{p.name}</button>
                ))}
                <button onClick={handleRandomize}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {t('random')}
                </button>
              </div>
            </div>

            {/* Array input */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('array')}</label>
              <input type="text" value={arrayInput}
                onChange={e => handleArrayChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono text-sm"
                placeholder="2, 1, 5, 1, 3, 2" />
            </div>

            {/* Window size / Target */}
            <div className="grid grid-cols-2 gap-2">
              {mode === 'fixed' ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('windowSize')} (k)</label>
                  <input type="number" value={windowSize} min={1} max={array.length}
                    onChange={e => { setWindowSize(Number(e.target.value)); handleReset() }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('target')}</label>
                  <input type="number" value={target} min={1}
                    onChange={e => { setTarget(Number(e.target.value)); handleReset() }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm" />
                </div>
              )}
              <div className="flex items-end">
                <button onClick={runAlgorithm}
                  className="w-full px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg font-medium hover:from-sky-700 hover:to-blue-700 transition-colors">
                  {t('run')}
                </button>
              </div>
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
                      activeTab === tab.key ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-500 bg-sky-50/50 dark:bg-sky-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{tab.icon} {tab.label}</button>
                ))}
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <StepsList steps={result?.steps} currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex} actionStyle={ACTION_STYLE} actionBadge={ACTION_BADGE} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer
                    code={mode === 'fixed' ? FIXED_CODE : VARIABLE_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title={mode === 'fixed' ? 'fixedWindow.js' : 'variableWindow.js'}
                  />
                )}
                {activeTab === 'guide' && <GuideSection namespace="slidingWindowVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: SlidingWindowStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) {
      const c = listRef.current
      const tp = (el as HTMLElement).offsetTop
      const h = (el as HTMLElement).offsetHeight
      if (tp < c.scrollTop) c.scrollTop = tp
      else if (tp + h > c.scrollTop + c.clientHeight) c.scrollTop = tp + h - c.clientHeight
    }
  }, [currentIndex])
  if (!steps || steps.length === 0) return null
  const ws = Math.max(0, currentIndex - 10)
  const we = Math.min(steps.length - 1, currentIndex + 20)
  return (
    <div ref={listRef} className="space-y-1">
      {ws > 0 && <div className="text-xs text-gray-400 text-center py-1">... {ws} ...</div>}
      {steps.slice(ws, we + 1).map((step, wi) => {
        const idx = ws + wi
        const isCur = idx === currentIndex
        const isAct = idx <= currentIndex
        return (
          <div key={idx} data-active={isCur ? 'true' : undefined} onClick={() => onStepClick(idx)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${isCur ? (actionStyle[step.action] || '') : isAct ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${actionBadge[step.action] || ''}`}>
                {step.action}
              </span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {we < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - we} ...</div>}
    </div>
  )
}
