'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  buildFenwickTree, updateFenwick, prefixSumFenwick, rangeSumFenwick,
  generateRandomArray, getOriginalArray,
  type FenwickOperation, type FenwickStep,
} from '@/utils/algorithm/fenwickTree'
import FenwickTreeCanvas2D from './FenwickTreeCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const UPDATE_CODE = `// Point update: index += delta
function update(bit, n, i, delta) {
  while (i <= n) {
    bit[i] += delta;         // add to current
    i += i & (-i);           // move to parent (add lowbit)
  }
}`

const QUERY_CODE = `// Prefix sum query: sum(1..i)
function prefixSum(bit, i) {
  let sum = 0;
  while (i > 0) {
    sum += bit[i];           // accumulate
    i -= i & (-i);           // move to next (subtract lowbit)
  }
  return sum;
}

// Range sum: sum(l..r)
function rangeSum(bit, l, r) {
  return prefixSum(bit, r) - prefixSum(bit, l - 1);
}`

const BUILD_CODE = `// Build BIT from array
function buildBIT(arr) {
  const n = arr.length;
  const bit = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    bit[i] += arr[i - 1];       // add element
    const parent = i + (i & (-i));
    if (parent <= n)
      bit[parent] += bit[i];    // propagate to parent
  }
  return bit;
}`

interface VisualState {
  activeBitIndex: number | null
  visitedBitIndices: Set<number>
  updatedBitIndices: Set<number>
  accumulator: number
  currentLowbit: number
}

function computeVisualState(steps: FenwickStep[], upTo: number): VisualState {
  const visited = new Set<number>()
  const updated = new Set<number>()
  let active: number | null = null
  let accumulator = 0
  let currentLowbit = 0

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    if (step.action === 'done') continue

    active = step.bitIndex
    currentLowbit = step.lowbit

    if (step.action === 'update-visit' || step.action === 'query-visit') {
      visited.add(step.bitIndex)
    }
    if (step.action === 'update-add') {
      updated.add(step.bitIndex)
    }
    if (step.action === 'query-add') {
      accumulator = step.accumulator
    }
    if (step.action === 'build-add') {
      visited.add(step.bitIndex)
    }
  }

  return { activeBitIndex: active, visitedBitIndices: visited, updatedBitIndices: updated, accumulator, currentLowbit }
}

export default function FenwickTreeVisualizer() {
  const t = useTranslations('fenwickTreeVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [originalArray, setOriginalArray] = useState<number[]>([3, 2, 5, 1, 7, 4, 6, 8])
  const [bit, setBit] = useState<number[]>([])
  const [n, setN] = useState(0)
  const [operation, setOperation] = useState<FenwickOperation>('update')
  const [updateIndex, setUpdateIndex] = useState(3)
  const [updateDelta, setUpdateDelta] = useState(5)
  const [queryIndex, setQueryIndex] = useState(5)
  const [rangeL, setRangeL] = useState(2)
  const [rangeR, setRangeR] = useState(6)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [answer, setAnswer] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [opResult, setOpResult] = useState<{
    steps: FenwickStep[]
    bitAfter: number[]
    answer?: number
  } | null>(null)

  const totalSteps = opResult?.steps.length ?? 0

  const displayBit = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return bit
    const step = opResult.steps[currentStepIndex]
    return step?.bitSnapshot ?? bit
  }, [opResult, currentStepIndex, bit])

  const visualState = useMemo<VisualState>(() => {
    if (!opResult || currentStepIndex < 0) {
      return { activeBitIndex: null, visitedBitIndices: new Set(), updatedBitIndices: new Set(), accumulator: 0, currentLowbit: 0 }
    }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  // Auto-build on first mount
  useEffect(() => {
    const res = buildFenwickTree(originalArray)
    setBit(res.bit)
    setN(originalArray.length)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const executeOperation = useCallback(() => {
    if (bit.length === 0) return
    let res

    if (operation === 'update') {
      res = updateFenwick(bit, n, updateIndex, updateDelta)
      setBit(res.bit)
      // Update original array
      const newArr = getOriginalArray(res.bit, n)
      setOriginalArray(newArr)
      setAnswer(null)
    } else if (operation === 'prefix-sum') {
      res = prefixSumFenwick(bit, queryIndex)
      setAnswer(res.answer ?? null)
    } else {
      res = rangeSumFenwick(bit, rangeL, rangeR)
      setAnswer(res.answer ?? null)
    }

    setOpResult({ steps: res.steps, bitAfter: res.bit, answer: res.answer })
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [bit, n, operation, updateIndex, updateDelta, queryIndex, rangeL, rangeR])

  const fillRandom = useCallback(() => {
    const arr = generateRandomArray(8)
    setOriginalArray(arr)
    const res = buildFenwickTree(arr)
    setBit(res.bit)
    setN(arr.length)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setAnswer(null)
  }, [])

  const clearAll = useCallback(() => {
    setOriginalArray([])
    setBit([])
    setN(0)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setAnswer(null)
  }, [])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) executeOperation()
    setIsPlaying(true)
  }, [currentStepIndex, executeOperation])

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

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setOpResult(null)
    setAnswer(null)
  }, [])

  const currentStep = opResult?.steps[currentStepIndex] ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (operation === 'update') {
      if (currentStep.action === 'update-visit') return [3]
      if (currentStep.action === 'update-add') return [4, 5]
      return []
    }
    if (operation === 'prefix-sum') {
      if (currentStep.action === 'query-visit') return [4]
      if (currentStep.action === 'query-add') return [5, 6]
      return []
    }
    // range-sum uses query code too
    if (currentStep.action === 'query-visit') return [4]
    if (currentStep.action === 'query-add') return [5, 6]
    return []
  }, [currentStep, operation])

  const currentCode = operation === 'update' ? UPDATE_CODE : QUERY_CODE
  const codeTitle = operation === 'update' ? 'fenwick-update.js' : 'fenwick-query.js'

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const operationList: { key: FenwickOperation; label: string }[] = [
    { key: 'update', label: t('update') },
    { key: 'prefix-sum', label: t('prefixSum') },
    { key: 'range-sum', label: t('rangeSum') },
  ]

  return (
    <div className="space-y-6">
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

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying} onPlay={handlePlay} onPause={() => setIsPlaying(false)} onReset={handleReset}
                onStepForward={() => { if (currentStepIndex < 0) executeOperation(); else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1)) }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed} onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)} totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <FenwickTreeCanvas2D
                  bit={displayBit} originalArray={originalArray} n={n}
                  activeBitIndex={visualState.activeBitIndex}
                  visitedBitIndices={visualState.visitedBitIndices}
                  updatedBitIndices={visualState.updatedBitIndices}
                  accumulator={visualState.accumulator}
                  currentLowbit={visualState.currentLowbit}
                  width={680} height={460}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('array')}: <strong className="text-blue-600 dark:text-blue-400">[{originalArray.join(', ')}]</strong>
              </span>
              {answer !== null && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('result')}: <strong className="text-emerald-600 dark:text-emerald-400">{answer}</strong>
                </span>
              )}
              {currentStep && currentStep.binaryRepr && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('binaryRepr')}: <strong className="font-mono text-purple-600 dark:text-purple-400">{currentStep.binaryRepr}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* Operation selector */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.operation')}</p>
              <div className="flex gap-2">
                {operationList.map(op => (
                  <button key={op.key} onClick={() => { setOperation(op.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      operation === op.key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{op.label}</button>
                ))}
              </div>
            </div>

            {/* Update inputs */}
            {operation === 'update' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('index')} (1~{n})</label>
                  <input type="number" min={1} max={n} value={updateIndex} onChange={e => setUpdateIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('value')}</label>
                  <input type="number" value={updateDelta} onChange={e => setUpdateDelta(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <button onClick={executeOperation}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                  {t('controls.execute')}
                </button>
              </div>
            )}

            {/* Prefix sum input */}
            {operation === 'prefix-sum' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('index')} (1~{n})</label>
                  <input type="number" min={1} max={n} value={queryIndex} onChange={e => setQueryIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <button onClick={executeOperation}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                  {t('controls.execute')}
                </button>
              </div>
            )}

            {/* Range sum inputs */}
            {operation === 'range-sum' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('from')} (1~{n})</label>
                  <input type="number" min={1} max={n} value={rangeL} onChange={e => setRangeL(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('to')} (1~{n})</label>
                  <input type="number" min={1} max={n} value={rangeR} onChange={e => setRangeR(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <button onClick={executeOperation}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                  {t('controls.execute')}
                </button>
              </div>
            )}

            {/* Random / Clear */}
            <div className="flex flex-wrap gap-2">
              <button onClick={fillRandom}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                🎲 {t('random')}
              </button>
              <button onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                🗑️ {t('clear')}
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500/80" />{t('legend.updated')}</span>
            </div>

            {/* Lowbit info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">lowbit(i) = i & (-i)</p>
              <p>{t('responsible')}: BIT[i] → arr[i - lowbit(i) + 1 .. i]</p>
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
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
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
                      <FenwickStepsList steps={opResult?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={currentCode} language="javascript" highlightLines={codeHighlightLines} title={codeTitle} />
                )}
                {activeTab === 'guide' && <GuideSection namespace="fenwickTreeVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FenwickStepsList({ steps, currentIndex, onStepClick }: {
  steps: FenwickStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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

  if (!steps || steps.length === 0) return null

  const ACTION_BADGE: Record<string, string> = {
    'build-add':    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'update-visit': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'update-add':   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'query-visit':  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'query-add':    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    done:           'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  }

  const windowStart = Math.max(0, currentIndex - 10)
  const windowEnd = Math.min(steps.length - 1, currentIndex + 20)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && <div className="text-xs text-gray-400 text-center py-1">... {windowStart} steps above ...</div>}
      {steps.slice(windowStart, windowEnd + 1).map((step, idx) => {
        const i = windowStart + idx
        const isCurrent = i === currentIndex
        return (
          <div key={i} data-active={isCurrent ? 'true' : undefined} onClick={() => onStepClick(i)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40'
                : i <= currentIndex ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[step.action] || ''}`}>{step.action}</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {windowEnd < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - windowEnd} steps below ...</div>}
    </div>
  )
}
