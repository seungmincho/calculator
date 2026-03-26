'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  runOperations,
  generateDemoOperations,
  type StackQueueStep,
  type StackQueueResult,
} from '@/utils/algorithm/stackQueue'
import StackQueueCanvas2D from './StackQueueCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const STACK_CODE = `// 스택(Stack) — LIFO: Last In, First Out
class Stack {
  constructor() {
    this.items = [];
  }

  // 요소를 스택 상단에 추가 — O(1)
  push(value) {
    this.items.push(value);
  }

  // 스택 상단에서 요소 제거 & 반환 — O(1)
  pop() {
    if (this.isEmpty()) return undefined;
    return this.items.pop();   // 마지막 원소 제거
  }

  // 상단 요소 확인 (제거하지 않음) — O(1)
  peek() {
    return this.items[this.items.length - 1];
  }

  isEmpty() { return this.items.length === 0; }
  size()    { return this.items.length; }
}

// 사용 예시 (DFS, 괄호 검사, undo 기능)
const stack = new Stack();
stack.push(10);   // [10]
stack.push(20);   // [10, 20]
stack.push(30);   // [10, 20, 30]
stack.pop();      // → 30  (마지막이 먼저!)
stack.peek();     // → 20  (제거 없이 확인)`

const QUEUE_CODE = `// 큐(Queue) — FIFO: First In, First Out
class Queue {
  constructor() {
    this.items = [];
  }

  // 요소를 큐 후단(Rear)에 추가 — O(1)
  enqueue(value) {
    this.items.push(value);
  }

  // 큐 전단(Front)에서 요소 제거 & 반환 — O(n) *
  // * 최적화: 연결 리스트나 양방향 덱(Deque) 사용 시 O(1)
  dequeue() {
    if (this.isEmpty()) return undefined;
    return this.items.shift();  // 첫 번째 원소 제거
  }

  // 전단 요소 확인 (제거하지 않음) — O(1)
  peek() {
    return this.items[0];
  }

  isEmpty() { return this.items.length === 0; }
  size()    { return this.items.length; }
}

// 사용 예시 (BFS, 프린터 대기열, 이벤트 루프)
const queue = new Queue();
queue.enqueue(10);  // [10]
queue.enqueue(20);  // [10, 20]
queue.enqueue(30);  // [10, 20, 30]
queue.dequeue();    // → 10  (처음이 먼저!)
queue.peek();       // → 20  (제거 없이 확인)`

export default function StackQueueVisualizer() {
  const t = useTranslations('stackQueueVisualizer')
  const tHub = useTranslations('algorithmHub')

  // ── Manual operation UI state ──────────────────────────────
  const [inputValue, setInputValue] = useState<string>('42')
  const [stack, setStack] = useState<number[]>([])
  const [queue, setQueue] = useState<number[]>([])
  const [lastOp, setLastOp] = useState<string>('')
  const [activeOp, setActiveOp] = useState<string | null>(null)
  const [activeTarget, setActiveTarget] = useState<'stack' | 'queue' | null>(null)
  const [activeValue, setActiveValue] = useState<number | null>(null)
  const activeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Demo / playback state ──────────────────────────────────
  const [demoResult, setDemoResult] = useState<StackQueueResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  const totalSteps = demoResult?.steps.length ?? 0

  // ── Highlight active op briefly ────────────────────────────
  const flashOp = useCallback(
    (op: string, target: 'stack' | 'queue', value: number | null) => {
      setActiveOp(op)
      setActiveTarget(target)
      setActiveValue(value)
      if (activeTimeout.current) clearTimeout(activeTimeout.current)
      activeTimeout.current = setTimeout(() => {
        setActiveOp(null)
        setActiveTarget(null)
        setActiveValue(null)
      }, 800)
    },
    []
  )

  // ── Manual operations ──────────────────────────────────────
  const getNum = useCallback((): number | null => {
    const n = parseInt(inputValue, 10)
    return isNaN(n) ? null : Math.max(-999, Math.min(9999, n))
  }, [inputValue])

  const handlePush = useCallback(() => {
    const n = getNum()
    if (n === null) return
    setStack(prev => [...prev, n])
    setLastOp(`Push ${n} → 스택 (LIFO)`)
    flashOp('push', 'stack', n)
  }, [getNum, flashOp])

  const handlePop = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) {
        setLastOp('Pop → 스택이 비어 있음')
        return prev
      }
      const val = prev[prev.length - 1]
      setLastOp(`Pop ${val} ← 스택 상단 (LIFO)`)
      flashOp('pop', 'stack', val)
      return prev.slice(0, -1)
    })
  }, [flashOp])

  const handleEnqueue = useCallback(() => {
    const n = getNum()
    if (n === null) return
    setQueue(prev => [...prev, n])
    setLastOp(`Enqueue ${n} → 큐 후단 (FIFO)`)
    flashOp('enqueue', 'queue', n)
  }, [getNum, flashOp])

  const handleDequeue = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        setLastOp('Dequeue → 큐가 비어 있음')
        return prev
      }
      const val = prev[0]
      setLastOp(`Dequeue ${val} ← 큐 전단 (FIFO)`)
      flashOp('dequeue', 'queue', val)
      return prev.slice(1)
    })
  }, [flashOp])

  // ── Demo mode ──────────────────────────────────────────────
  const handleRunDemo = useCallback(() => {
    const result = runOperations(generateDemoOperations())
    setDemoResult(result)
    setCurrentStepIndex(0)
    setIsPlaying(false)
    // apply first step
    const first = result.steps[0]
    setStack(first.stack)
    setQueue(first.queue)
    setLastOp(first.description)
    flashOp(first.action, first.target, first.value)
  }, [flashOp])

  const applyStep = useCallback(
    (steps: StackQueueStep[], idx: number) => {
      if (idx < 0 || idx >= steps.length) return
      const step = steps[idx]
      setStack(step.stack)
      setQueue(step.queue)
      setLastOp(step.description)
      flashOp(step.action, step.target, step.value)
    },
    [flashOp]
  )

  // Auto-play
  useEffect(() => {
    if (isPlaying && demoResult && totalSteps > 0) {
      const interval = Math.max(200, 1000 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false)
            return prev
          }
          const next = prev + 1
          applyStep(demoResult.steps, next)
          return next
        })
      }, interval)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, totalSteps, demoResult, applyStep])

  const handlePlay = useCallback(() => {
    if (!demoResult) {
      handleRunDemo()
      setTimeout(() => setIsPlaying(true), 100)
    } else {
      setIsPlaying(true)
    }
  }, [demoResult, handleRunDemo])

  const handlePause = useCallback(() => setIsPlaying(false), [])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setDemoResult(null)
    setStack([])
    setQueue([])
    setLastOp('')
  }, [])

  const handleStepForward = useCallback(() => {
    if (!demoResult) {
      handleRunDemo()
      return
    }
    const next = Math.min(currentStepIndex + 1, totalSteps - 1)
    setCurrentStepIndex(next)
    applyStep(demoResult.steps, next)
  }, [demoResult, currentStepIndex, totalSteps, applyStep, handleRunDemo])

  const handleStepBack = useCallback(() => {
    if (!demoResult) return
    const prev = Math.max(currentStepIndex - 1, 0)
    setCurrentStepIndex(prev)
    applyStep(demoResult.steps, prev)
  }, [demoResult, currentStepIndex, applyStep])

  const isDemoMode = demoResult !== null

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const currentStep = isDemoMode && demoResult
    ? demoResult.steps[Math.max(0, currentStepIndex)]
    : null

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {t('chip')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
      </div>

      {/* Main 3/5 + 2/5 split */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: canvas + controls */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">

            {/* Manual operation panel */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePush() }}
                  placeholder="값 입력"
                  disabled={isDemoMode}
                  className="w-24 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                />
                <button
                  onClick={handlePush}
                  disabled={isDemoMode}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 transition-colors"
                  title="Push"
                >
                  Push (Stack)
                </button>
                <button
                  onClick={handlePop}
                  disabled={isDemoMode || stack.length === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors"
                  title="Pop"
                >
                  Pop (Stack)
                </button>
                <button
                  onClick={handleEnqueue}
                  disabled={isDemoMode}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 transition-colors"
                  title="Enqueue"
                >
                  Enqueue (Queue)
                </button>
                <button
                  onClick={handleDequeue}
                  disabled={isDemoMode || queue.length === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 transition-colors"
                  title="Dequeue"
                >
                  Dequeue (Queue)
                </button>
              </div>

              {/* Demo button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={isDemoMode ? handleReset : handleRunDemo}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isDemoMode
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                  }`}
                >
                  {isDemoMode ? t('resetDemo') : t('runDemo')}
                </button>
                {isDemoMode && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('demoMode')}
                  </span>
                )}
              </div>

              {/* Playback controls (demo mode only) */}
              {isDemoMode && (
                <div className="flex justify-center">
                  <VisualizerControls
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onReset={handleReset}
                    onStepForward={handleStepForward}
                    onStepBack={handleStepBack}
                    speed={speed}
                    onSpeedChange={setSpeed}
                    currentStep={Math.max(0, currentStepIndex)}
                    totalSteps={Math.max(1, totalSteps)}
                  />
                </div>
              )}
            </div>

            {/* Canvas */}
            <div className="flex justify-center overflow-x-auto">
              <StackQueueCanvas2D
                stack={stack}
                queue={queue}
                activeOp={activeOp}
                activeTarget={activeTarget}
                activeValue={activeValue}
                width={660}
                height={340}
              />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap justify-center gap-4 pt-1 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.stackSize')}</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stack.length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.queueSize')}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{queue.length}</div>
              </div>
              {lastOp && (
                <div className="text-center min-w-0 flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.lastOp')}</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{lastOp}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: tabs panel */}
        <div className="xl:col-span-2">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Steps tab */}
              {activeTab === 'steps' && (
                <div className="space-y-4">
                  {/* Step description */}
                  {currentStep ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        {t('steps.step')} {currentStepIndex + 1} / {totalSteps}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {currentStep.description}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-mono ${
                          currentStep.target === 'stack'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                        }`}>
                          {currentStep.action.toUpperCase()}
                        </span>
                        {currentStep.value !== null && (
                          <span className="px-2 py-0.5 text-xs rounded-full font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            value = {currentStep.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                      {t('steps.hint')}
                    </div>
                  )}

                  {/* LIFO vs FIFO explanation */}
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                        Stack — LIFO
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('steps.lifoDesc')}
                      </div>
                      <div className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                        push(10) push(20) push(30) → pop() = <strong className="text-emerald-600 dark:text-emerald-400">30</strong>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">
                        Queue — FIFO
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('steps.fifoDesc')}
                      </div>
                      <div className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                        enqueue(10) enqueue(20) enqueue(30) → dequeue() = <strong className="text-blue-600 dark:text-blue-400">10</strong>
                      </div>
                    </div>
                  </div>

                  {/* Complexity */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl space-y-1">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      {t('steps.complexity')}
                    </div>
                    <div className="grid grid-cols-3 text-xs text-center gap-1">
                      <div className="text-gray-400">{t('steps.operation')}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Stack</div>
                      <div className="text-blue-600 dark:text-blue-400 font-semibold">Queue</div>

                      <div className="text-gray-500 dark:text-gray-400">push/enqueue</div>
                      <div className="font-mono text-gray-700 dark:text-gray-300">O(1)</div>
                      <div className="font-mono text-gray-700 dark:text-gray-300">O(1)</div>

                      <div className="text-gray-500 dark:text-gray-400">pop/dequeue</div>
                      <div className="font-mono text-gray-700 dark:text-gray-300">O(1)</div>
                      <div className="font-mono text-gray-700 dark:text-gray-300">O(1)*</div>

                      <div className="text-gray-500 dark:text-gray-400">peek</div>
                      <div className="font-mono text-gray-700 dark:text-gray-300">O(1)</div>
                      <div className="font-mono text-gray-700 dark:text-gray-300">O(1)</div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">* 연결 리스트 기반 구현 시</div>
                  </div>

                  {/* Use cases */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      {t('steps.useCases')}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Stack:</span>{' '}
                        {t('steps.stackUses')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Queue:</span>{' '}
                        {t('steps.queueUses')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Code tab */}
              {activeTab === 'code' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-1">
                      Stack 구현
                    </div>
                    <CodeViewer code={STACK_CODE} language="javascript" highlightLines={[]} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-1">
                      Queue 구현
                    </div>
                    <CodeViewer code={QUEUE_CODE} language="javascript" highlightLines={[]} />
                  </div>
                </div>
              )}

              {/* Guide tab */}
              {activeTab === 'guide' && (
                <div className="-m-4">
                  <GuideSection namespace="stackQueueVisualizer" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
