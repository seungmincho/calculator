'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { solveKnapsack, KNAPSACK_PRESETS, type KnapsackItem, type KnapsackStep } from '@/utils/algorithm/knapsack'
import KnapsackCanvas2D from './KnapsackCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const KNAPSACK_CODE = `// 0/1 Knapsack — O(n*W)
function knapsack(items, W) {
  const n = items.length;
  const dp = Array(n+1).fill(null)
    .map(() => Array(W+1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      if (items[i-1].weight <= w) {
        const include = dp[i-1][w - items[i-1].weight]
                      + items[i-1].value;
        const exclude = dp[i-1][w];
        dp[i][w] = Math.max(include, exclude);
      } else {
        dp[i][w] = dp[i-1][w];    // can't include
      }
    }
  }

  // Traceback: find selected items
  let w = W;
  const selected = [];
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i-1][w]) {
      selected.push(i-1);
      w -= items[i-1].weight;
    }
  }
  return { maxValue: dp[n][W], selected };
}`

const CODE_LINES: Record<KnapsackStep['action'], number[]> = {
  init:             [4, 5],
  consider:         [7, 8],
  include:          [9, 10, 11, 12],
  exclude:          [14],
  fill:             [12, 14],
  'traceback-check':[22, 23],
  'traceback-select':[24, 25],
  'traceback-skip': [22],
  done:             [19],
}

export default function KnapsackVisualizer() {
  const t = useTranslations('knapsackVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [items, setItems] = useState<KnapsackItem[]>(KNAPSACK_PRESETS[0].items)
  const [capacity, setCapacity] = useState(KNAPSACK_PRESETS[0].capacity)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof solveKnapsack> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = solveKnapsack(items, capacity)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [items, capacity])

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
    setItems(KNAPSACK_PRESETS[idx].items)
    setCapacity(KNAPSACK_PRESETS[idx].capacity)
    handleReset()
  }, [handleReset])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 400 / speed)
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
  const { filledCells, tracebackCells, selectedItemsSet, activeRow, activeCol } = useMemo(() => {
    const filled = new Set<string>()
    const trace = new Set<string>()
    const selected = new Set<number>()
    let aRow = -1, aCol = -1

    if (result && currentStepIndex >= 0) {
      for (let i = 0; i <= currentStepIndex && i < result.steps.length; i++) {
        const step = result.steps[i]
        if (step.action === 'fill') filled.add(`${step.row},${step.col}`)
        if (step.action === 'traceback-check' || step.action === 'traceback-select' || step.action === 'traceback-skip') {
          trace.add(`${step.row},${step.col}`)
        }
        if (step.action === 'traceback-select') selected.add(step.row - 1)
      }
      const cur = result.steps[currentStepIndex]
      aRow = cur.row
      aCol = cur.col
    }

    // Fill row 0 (all zeros)
    if (result) {
      for (let j = 0; j <= capacity; j++) filled.add(`0,${j}`)
    }

    return { filledCells: filled, tracebackCells: trace, selectedItemsSet: selected, activeRow: aRow, activeCol: aCol }
  }, [result, currentStepIndex, capacity])

  const currentStep = result?.steps[currentStepIndex] ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return CODE_LINES[currentStep.action] ?? []
  }, [currentStep])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const ACTION_STYLE: Record<string, string> = {
    init:             'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    consider:         'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    include:          'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    exclude:          'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    fill:             'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300/50 dark:border-cyan-700/40',
    'traceback-check':'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'traceback-select':'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'traceback-skip': 'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    done:             'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }
  const ACTION_BADGE: Record<string, string> = {
    init:             'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    consider:         'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    include:          'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    exclude:          'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    fill:             'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    'traceback-check':'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'traceback-select':'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'traceback-skip': 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    done:             'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
              {tHub('categories.dp')}
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
                <KnapsackCanvas2D
                  items={items} capacity={capacity}
                  dp={result?.dp ?? []} activeRow={activeRow} activeCol={activeCol}
                  filledCells={filledCells} tracebackCells={tracebackCells}
                  selectedItems={selectedItemsSet}
                  width={680} height={380}
                  onCellHover={(r, c) => setHoverCell({ row: r, col: c })}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.maxValue')}: <strong className="text-cyan-600 dark:text-cyan-400">{result?.maxValue ?? '-'}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.totalWeight')}: <strong className="text-blue-600 dark:text-blue-400">{result?.totalWeight ?? '-'}/{capacity}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.selected')}: <strong className="text-emerald-600 dark:text-emerald-400">
                  {result?.selectedItems.map(i => items[i]?.icon).join(' ') || '-'}
                </strong>
              </span>
              {hoverCell && result?.dp[hoverCell.row]?.[hoverCell.col] !== undefined && (
                <span className="text-gray-600 dark:text-gray-400">
                  dp[{hoverCell.row}][{hoverCell.col}] = <strong className="text-purple-600 dark:text-purple-400">{result.dp[hoverCell.row][hoverCell.col]}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.preset')}</p>
              <div className="flex gap-2">
                {KNAPSACK_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{t(`presets.${p.name}`)}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.items')}</p>
              <div className="grid grid-cols-5 gap-1">
                {items.map(item => (
                  <div key={item.id} className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-lg">{item.icon}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">w:{item.weight} v:{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  {t('controls.capacity')} ({capacity})
                </label>
                <input type="range" min={1} max={15} value={capacity}
                  onChange={e => { setCapacity(Number(e.target.value)); handleReset() }}
                  className="w-full accent-cyan-600" />
              </div>
              <button onClick={runAlgorithm}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 transition-colors whitespace-nowrap">
                {t('controls.run')}
              </button>
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
                      activeTab === tab.key ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20'
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
                {activeTab === 'code' && <CodeViewer code={KNAPSACK_CODE} language="javascript" highlightLines={codeHighlightLines} title="knapsack.js" />}
                {activeTab === 'guide' && <GuideSection namespace="knapsackVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: KnapsackStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) { const c = listRef.current; const t = (el as HTMLElement).offsetTop; const h = (el as HTMLElement).offsetHeight
      if (t < c.scrollTop) c.scrollTop = t; else if (t + h > c.scrollTop + c.clientHeight) c.scrollTop = t + h - c.clientHeight }
  }, [currentIndex])

  if (!steps || steps.length === 0) return null
  const ws = Math.max(0, currentIndex - 10)
  const we = Math.min(steps.length - 1, currentIndex + 20)
  return (
    <div ref={listRef} className="space-y-1">
      {ws > 0 && <div className="text-xs text-gray-400 text-center py-1">... {ws} ...</div>}
      {steps.slice(ws, we + 1).map((step, wi) => {
        const idx = ws + wi; const isCur = idx === currentIndex; const isAct = idx <= currentIndex
        return (
          <div key={idx} data-active={isCur ? 'true' : undefined} onClick={() => onStepClick(idx)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${isCur ? (actionStyle[step.action] || '') : isAct ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${actionBadge[step.action] || ''}`}>{step.action}</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {we < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - we} ...</div>}
    </div>
  )
}
