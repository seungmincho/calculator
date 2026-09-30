'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { generateFibonacci, type FibMode, type FibStep } from '@/utils/algorithm/fibonacciDp'
import FibonacciDpCanvas2D from './FibonacciDpCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const NAIVE_CODE = `// Naive recursion — O(2^n)
function fib(n) {
  if (n <= 1) return n;        // base case
  return fib(n-1) + fib(n-2);  // exponential calls
}`

const MEMO_CODE = `// Memoization (top-down) — O(n)
const memo = {};
function fib(n) {
  if (n <= 1) return n;
  if (memo[n]) return memo[n]; // cached!
  memo[n] = fib(n-1) + fib(n-2);
  return memo[n];
}`

const TAB_CODE = `// Tabulation (bottom-up) — O(n)
function fib(n) {
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i-1] + dp[i-2]; // fill table
  }
  return dp[n];
}`

const CODE_MAP: Record<FibMode, string> = { naive: NAIVE_CODE, memoization: MEMO_CODE, tabulation: TAB_CODE }
const CODE_TITLE: Record<FibMode, string> = { naive: 'fib-naive.js', memoization: 'fib-memo.js', tabulation: 'fib-tab.js' }

const NAIVE_LINES: Record<FibStep['action'], number[]> = {
  call: [2], return: [3], 'memo-hit': [], 'fill-cell': [], 'use-prev': [], 'base-case': [2],
}
const MEMO_LINES: Record<FibStep['action'], number[]> = {
  call: [3], return: [6], 'memo-hit': [5], 'fill-cell': [], 'use-prev': [], 'base-case': [4],
}
const TAB_LINES: Record<FibStep['action'], number[]> = {
  call: [], return: [], 'memo-hit': [], 'fill-cell': [5], 'use-prev': [5], 'base-case': [3],
}
const LINE_MAP: Record<FibMode, Record<FibStep['action'], number[]>> = {
  naive: NAIVE_LINES, memoization: MEMO_LINES, tabulation: TAB_LINES,
}

export default function FibonacciDpVisualizer() {
  const t = useTranslations('fibonacciDpVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [n, setN] = useState(8)
  const [mode, setMode] = useState<FibMode>('naive')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof generateFibonacci> | null>(null)

  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = generateFibonacci(n, mode)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [n, mode])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setResult(null)
  }, [])

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

  // Compute visual state
  const visitedNodeIds = useMemo(() => {
    if (!result || currentStepIndex < 0) return new Set<number>()
    const set = new Set<number>()
    for (let i = 0; i <= currentStepIndex && i < result.steps.length; i++) {
      set.add(result.steps[i].nodeId)
    }
    return set
  }, [result, currentStepIndex])

  const activeNodeId = currentStepIndex >= 0 && result ? result.steps[currentStepIndex]?.nodeId ?? -1 : -1
  const currentStep = result?.steps[currentStepIndex] ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return LINE_MAP[mode][currentStep.action] ?? []
  }, [currentStep, mode])

  const modes: { key: FibMode; label: string }[] = [
    { key: 'naive', label: t('modes.naive') },
    { key: 'memoization', label: t('modes.memoization') },
    { key: 'tabulation', label: t('modes.tabulation') },
  ]

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const ACTION_STYLE: Record<string, string> = {
    call:        'bg-subtle border-line',
    return:      'bg-subtle border-line',
    'memo-hit':  'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'fill-cell': 'bg-subtle border-line',
    'use-prev':  'bg-subtle border-line',
    'base-case': 'bg-subtle border-line',
  }
  const ACTION_BADGE: Record<string, string> = {
    call:        'bg-soft text-sub',
    return:      'bg-soft text-sub',
    'memo-hit':  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'fill-cell': 'bg-soft text-sub',
    'use-prev':  'bg-soft text-sub',
    'base-case': 'bg-soft text-sub',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-soft text-sub">
              {tHub('categories.dp')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) runAlgorithm()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <FibonacciDpCanvas2D
                  mode={mode}
                  treeNodes={result?.treeNodes ?? new Map()}
                  dpTable={result?.dpTable ?? []}
                  activeNodeId={activeNodeId}
                  visitedNodeIds={visitedNodeIds}
                  width={680}
                  height={380}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-sub">
                {t('stats.calls')}: <strong className="text-cyan-600 dark:text-cyan-400">{result?.callCount ?? 0}</strong>
              </span>
              <span className="text-sub">
                {t('stats.result')}: <strong className="text-blue-600 dark:text-blue-400">{result?.finalValue ?? '-'}</strong>
              </span>
              <span className="text-sub">
                {t('stats.steps')}: <strong className="text-purple-600 dark:text-purple-400">{totalSteps}</strong>
              </span>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted mb-2">{t('controls.mode')}</p>
              <div className="flex gap-2">
                {modes.map(m => (
                  <button key={m.key} onClick={() => { setMode(m.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      mode === m.key ? 'bg-cyan-500 text-white' : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{m.label}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted mb-1 block">
                  N (0~{mode === 'naive' ? '10' : '15'})
                </label>
                <input
                  type="range" min={0} max={mode === 'naive' ? 10 : 15}
                  value={Math.min(n, mode === 'naive' ? 10 : 15)}
                  onChange={e => { setN(Number(e.target.value)); handleReset() }}
                  className="w-full accent-cyan-600"
                />
                <div className="text-center text-sm font-bold text-cyan-600 dark:text-cyan-400">fib({Math.min(n, mode === 'naive' ? 10 : 15)})</div>
              </div>
              <button onClick={runAlgorithm}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 transition-colors whitespace-nowrap">
                {t('controls.run')}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-200/80" />{t('legend.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.memoHit')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400/80" />{t('legend.baseCase')}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="flex border-b border-line">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 bg-subtle'
                        : 'text-muted hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{tab.label}</button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-sub mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-faint italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <StepsList steps={result?.steps} currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        actionStyle={ACTION_STYLE} actionBadge={ACTION_BADGE} />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer code={CODE_MAP[mode]} language="javascript"
                    highlightLines={codeHighlightLines} title={CODE_TITLE[mode]} />
                )}

                {activeTab === 'guide' && <GuideSection namespace="fibonacciDpVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: FibStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
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

  const windowStart = Math.max(0, currentIndex - 10)
  const windowEnd = Math.min(steps.length - 1, currentIndex + 20)
  const windowSteps = steps.slice(windowStart, windowEnd + 1)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && <div className="text-xs text-faint text-center py-1">... {windowStart} ...</div>}
      {windowSteps.map((step, wi) => {
        const idx = windowStart + wi
        const isCurrent = idx === currentIndex
        const isActive = idx <= currentIndex
        return (
          <div key={idx} data-active={isCurrent ? 'true' : undefined} onClick={() => onStepClick(idx)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? (actionStyle[step.action] || '') : isActive
                ? 'border-line bg-subtle' : 'border-line opacity-40'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${actionBadge[step.action] || ''}`}>{step.action}</span>
              <span className="text-sub truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {windowEnd < steps.length - 1 && <div className="text-xs text-faint text-center py-1">... {steps.length - 1 - windowEnd} ...</div>}
    </div>
  )
}
