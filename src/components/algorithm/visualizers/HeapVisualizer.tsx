'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  heapInsert, heapExtract, heapify, generateRandomArray, isValidHeap,
  type HeapType, type HeapStep,
} from '@/utils/algorithm/heap'
import HeapCanvas2D from './HeapCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type OperationType = 'insert' | 'extract' | 'heapify'

const HEAP_INSERT_CODE = `function insert(heap, value) {
  heap.push(value);              // 배열 끝에 추가
  let i = heap.length - 1;

  // Bubble Up: 부모보다 작으면(min) 교환
  while (i > 0) {
    const parent = Math.floor((i-1) / 2);
    if (heap[i] < heap[parent]) { // min-heap
      swap(heap, i, parent);
      i = parent;
    } else break;
  }
}`

const HEAP_EXTRACT_CODE = `function extractMin(heap) {
  const min = heap[0];            // 루트 추출
  heap[0] = heap[heap.length - 1];
  heap.pop();

  // Bubble Down: 자식 중 작은 것과 교환
  let i = 0;
  while (true) {
    let smallest = i;
    const left = 2*i + 1;
    const right = 2*i + 2;
    if (left < n && heap[left] < heap[smallest])
      smallest = left;
    if (right < n && heap[right] < heap[smallest])
      smallest = right;
    if (smallest !== i) {
      swap(heap, i, smallest);
      i = smallest;
    } else break;
  }
  return min;
}`

const HEAPIFY_CODE = `// Bottom-up 힙 구성: O(n)
function buildHeap(arr) {
  for (let i = Math.floor(n/2)-1; i >= 0; i--) {
    heapifyDown(arr, i);  // 내부 노드만 처리
  }
}

function heapifyDown(arr, i) {
  let smallest = i;
  const left = 2*i + 1, right = 2*i + 2;
  if (left < n && arr[left] < arr[smallest])
    smallest = left;
  if (right < n && arr[right] < arr[smallest])
    smallest = right;
  if (smallest !== i) {
    swap(arr, i, smallest);
    heapifyDown(arr, smallest);
  }
}`

interface VisualState {
  activeIndices: number[]
  swapIndices: number[]
  comparingIndices: number[]
  doneIndex: number | null
}

function computeVisualState(steps: HeapStep[], upTo: number): VisualState {
  const step = steps[upTo]
  if (!step) return { activeIndices: [], swapIndices: [], comparingIndices: [], doneIndex: null }

  return {
    activeIndices: step.action === 'insert' || step.action === 'extract-root' || step.action === 'move-last' || step.action === 'heapify-down' ? step.indices : [],
    swapIndices: step.action === 'swap' ? step.indices : [],
    comparingIndices: step.action === 'compare' ? step.indices : [],
    doneIndex: step.action === 'done' ? (step.indices[0] ?? null) : null,
  }
}

export default function HeapVisualizer() {
  const t = useTranslations('heapVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [array, setArray] = useState<number[]>([])
  const [heapType, setHeapType] = useState<HeapType>('min')
  const [operation, setOperation] = useState<OperationType>('insert')
  const [inputValue, setInputValue] = useState('42')
  const [arraySize, setArraySize] = useState(10)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [opResult, setOpResult] = useState<{
    steps: HeapStep[]
    arrayAfter: number[]
  } | null>(null)

  const totalSteps = opResult?.steps.length ?? 0
  const isRunning = currentStepIndex >= 0

  const displayArray = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return array
    const step = opResult.steps[currentStepIndex]
    return step?.arraySnapshot ?? array
  }, [opResult, currentStepIndex, array])

  const visualState = useMemo<VisualState>(() => {
    if (!opResult || currentStepIndex < 0) return { activeIndices: [], swapIndices: [], comparingIndices: [], doneIndex: null }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  const executeOperation = useCallback(() => {
    let res
    if (operation === 'insert') {
      const val = parseInt(inputValue, 10)
      if (isNaN(val) || val < 0 || val > 999) return
      res = heapInsert(array, val, heapType)
    } else if (operation === 'extract') {
      if (array.length === 0) return
      res = heapExtract(array, heapType)
    } else {
      if (array.length === 0) return
      res = heapify(array, heapType)
    }

    setOpResult({ steps: res.steps, arrayAfter: res.array })
    setCurrentStepIndex(0)
    setIsPlaying(false)
    setArray(res.array)
  }, [inputValue, array, heapType, operation])

  const fillRandom = useCallback(() => {
    const arr = generateRandomArray(arraySize)
    setArray(arr)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
  }, [arraySize])

  const clearAll = useCallback(() => {
    setArray([])
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
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
  }, [])

  const currentStep = opResult?.steps[currentStepIndex] ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (operation === 'insert') {
      if (currentStep.action === 'insert') return [2]
      if (currentStep.action === 'compare') return [7]
      if (currentStep.action === 'swap') return [8, 9]
      return []
    }
    if (operation === 'extract') {
      if (currentStep.action === 'extract-root') return [2]
      if (currentStep.action === 'move-last') return [3, 4]
      if (currentStep.action === 'compare') return [11, 13]
      if (currentStep.action === 'swap') return [15, 16]
      return []
    }
    if (currentStep.action === 'heapify-down') return [4]
    if (currentStep.action === 'compare') return [11, 13]
    if (currentStep.action === 'swap') return [15, 16]
    return []
  }, [currentStep, operation])

  const currentCode = operation === 'insert' ? HEAP_INSERT_CODE : operation === 'extract' ? HEAP_EXTRACT_CODE : HEAPIFY_CODE
  const codeTitle = operation === 'insert' ? 'heap-insert.js' : operation === 'extract' ? 'heap-extract.js' : 'heapify.js'

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const operationList: { key: OperationType; label: string }[] = [
    { key: 'insert', label: t('operation.insert') },
    { key: 'extract', label: t('operation.extract') },
    { key: 'heapify', label: t('operation.heapify') },
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
                <HeapCanvas2D
                  array={displayArray} heapType={heapType}
                  activeIndices={visualState.activeIndices}
                  swapIndices={visualState.swapIndices}
                  comparingIndices={visualState.comparingIndices}
                  doneIndex={visualState.doneIndex}
                  width={680} height={420}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.size')}: <strong className="text-blue-600 dark:text-blue-400">{displayArray.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.valid')}: <strong className={isValidHeap(displayArray, heapType) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {isValidHeap(displayArray, heapType) ? '✓' : '✗'}
                </strong>
              </span>
              {currentStep && (
                <>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.comparisons')}: <strong className="text-amber-600 dark:text-amber-400">{currentStep.comparisons}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.swaps')}: <strong className="text-purple-600 dark:text-purple-400">{currentStep.swaps}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* Heap type toggle */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.heapType')}</p>
              <div className="flex gap-2">
                {(['min', 'max'] as HeapType[]).map(ht => (
                  <button key={ht} onClick={() => { setHeapType(ht); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      heapType === ht ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>{ht === 'min' ? t('controls.minHeap') : t('controls.maxHeap')}</button>
                ))}
              </div>
            </div>

            {/* Operation selector */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.operation')}</p>
              <div className="flex gap-2">
                {operationList.map(op => (
                  <button key={op.key} onClick={() => { setOperation(op.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      operation === op.key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>{op.label}</button>
                ))}
              </div>
            </div>

            {operation === 'insert' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.value')}</label>
                  <input type="number" min={0} max={999} value={inputValue} onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && executeOperation()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <button onClick={executeOperation}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                  {t('controls.execute')}
                </button>
              </div>
            )}

            {operation !== 'insert' && (
              <button onClick={executeOperation}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors">
                {t('controls.execute')}
              </button>
            )}

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('controls.arraySize')} ({arraySize})</label>
                <input type="range" min={3} max={20} value={arraySize} onChange={e => setArraySize(Number(e.target.value))} className="flex-1 accent-blue-600" />
              </div>
              <button onClick={fillRandom}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                🎲 {t('controls.random')}
              </button>
              <button onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                🗑️ {t('controls.clear')}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.swapping')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500/80" />{t('legend.comparing')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.done')}</span>
            </div>

            {/* Index mapping info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">{t('indexMapping.title')}</p>
              <p>{t('indexMapping.parent')}: parent(i) = floor((i-1)/2)</p>
              <p>{t('indexMapping.left')}: left(i) = 2i + 1</p>
              <p>{t('indexMapping.right')}: right(i) = 2i + 2</p>
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
                      activeTab === tab.key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400'
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
                      <HeapStepsList steps={opResult?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={currentCode} language="javascript" highlightLines={codeHighlightLines} title={codeTitle} />
                )}
                {activeTab === 'guide' && <GuideSection namespace="heapVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeapStepsList({ steps, currentIndex, onStepClick }: {
  steps: HeapStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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
    insert:        'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    compare:       'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    swap:          'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'extract-root':'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'move-last':   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    done:          'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'heapify-start':'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
    'heapify-down':'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
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
