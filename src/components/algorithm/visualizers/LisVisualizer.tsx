'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { solveLisDP, solveLisBinarySearch, LIS_PRESETS, type LisStep, type LisMethod } from '@/utils/algorithm/lis'
import LisCanvas2D from './LisCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const LIS_DP_CODE = `// LIS — O(n²) DP
function lis_dp(arr) {
  const n = arr.length;
  const dp = Array(n).fill(1);  // dp[i] = LIS ending at i
  const parent = Array(n).fill(-1);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;      // extend LIS
        parent[i] = j;           // record predecessor
      }
    }
  }

  // Find max and backtrack
  let maxIdx = dp.indexOf(Math.max(...dp));
  const lis = [];
  while (maxIdx !== -1) {
    lis.push(arr[maxIdx]);
    maxIdx = parent[maxIdx];
  }
  return lis.reverse();
}`

const LIS_BS_CODE = `// LIS — O(n log n) Binary Search
function lis_bs(arr) {
  const tails = [];       // tails[i] = smallest tail of LIS of length i+1
  const indices = [];
  const parent = Array(arr.length).fill(-1);

  for (let i = 0; i < arr.length; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {               // lower_bound
      const mid = (lo + hi) >> 1;
      if (tails[mid] < arr[i]) lo = mid + 1;
      else hi = mid;
    }

    if (lo === tails.length) {
      if (tails.length > 0) parent[i] = indices[lo - 1];
      tails.push(arr[i]);           // extend
      indices.push(i);
    } else {
      if (lo > 0) parent[i] = indices[lo - 1];
      tails[lo] = arr[i];           // replace
      indices[lo] = i;
    }
  }
  return tails.length;  // LIS length
}`

const CODE_LINES_DP: Record<string, number[]> = {
  init:        [3, 4],
  compare:     [8, 9],
  'update-dp': [10, 11],
  'fill-dp':   [10],
  backtrack:   [17, 18, 19],
  done:        [21],
}

const CODE_LINES_BS: Record<string, number[]> = {
  init:         [3, 4, 5],
  'bs-search':  [8, 9, 10, 11, 12],
  'bs-append':  [15, 16, 17],
  'bs-replace': [19, 20, 21],
  backtrack:    [],
  done:         [24],
}

export default function LisVisualizer() {
  const t = useTranslations('lisVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [arrInput, setArrInput] = useState(LIS_PRESETS[0].arr.join(', '))
  const [method, setMethod] = useState<LisMethod>('dp')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof solveLisDP> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const parsed = arrInput.split(/[,\s]+/).map(Number).filter(n => Number.isFinite(n))
    if (parsed.length < 2) return
    const res = method === 'dp' ? solveLisDP(parsed) : solveLisBinarySearch(parsed)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [arrInput, method])

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
    setArrInput(LIS_PRESETS[idx].arr.join(', '))
    handleReset()
  }, [handleReset])

  const generateRandom = useCallback(() => {
    const len = 8 + Math.floor(Math.random() * 5)
    const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 50) + 1)
    setArrInput(arr.join(', '))
    setPresetIdx(-1)
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

  const { filledSet, lisIndicesSet, activeIndex, compareIndex, currentDpOrTails } = useMemo(() => {
    const filled = new Set<number>()
    const lisSet = new Set<number>()
    let aIdx = -1, cIdx = -1
    let dpOrTails: number[] = []

    if (result && currentStepIndex >= 0) {
      for (let i = 0; i <= currentStepIndex && i < result.steps.length; i++) {
        const step = result.steps[i]
        if (step.action === 'fill-dp' || step.action === 'bs-append' || step.action === 'bs-replace') {
          filled.add(step.index)
        }
        if (step.action === 'done' || step.action === 'backtrack') {
          if (step.lisIndices) step.lisIndices.forEach(idx => lisSet.add(idx))
        }
        dpOrTails = step.dpOrTails
      }
      const cur = result.steps[currentStepIndex]
      aIdx = cur.index
      cIdx = cur.compareIndex ?? (cur.insertPos ?? -1)
      dpOrTails = cur.dpOrTails
    }

    return { filledSet: filled, lisIndicesSet: lisSet, activeIndex: aIdx, compareIndex: cIdx, currentDpOrTails: dpOrTails }
  }, [result, currentStepIndex])

  const currentStep = result?.steps[currentStepIndex] ?? null
  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    const lines = method === 'dp' ? CODE_LINES_DP : CODE_LINES_BS
    return lines[currentStep.action] ?? []
  }, [currentStep, method])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const ACTION_STYLE: Record<string, string> = {
    init:         'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    compare:      'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'update-dp':  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'fill-dp':    'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300/50 dark:border-cyan-700/40',
    'bs-search':  'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'bs-append':  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'bs-replace': 'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    backtrack:    'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
    done:         'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }
  const ACTION_BADGE: Record<string, string> = {
    init:         'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    compare:      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'update-dp':  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'fill-dp':    'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    'bs-search':  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'bs-append':  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'bs-replace': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    backtrack:    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    done:         'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
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
                <LisCanvas2D
                  arr={result?.arr ?? arrInput.split(/[,\s]+/).map(Number).filter(n => Number.isFinite(n))}
                  dpOrTails={currentDpOrTails}
                  method={method}
                  activeIndex={activeIndex}
                  compareIndex={compareIndex}
                  lisIndices={lisIndicesSet}
                  filledSet={filledSet}
                  width={680} height={400}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('length')}: <strong className="text-cyan-600 dark:text-cyan-400">{result?.lisLength ?? '-'}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('subsequence')}: <strong className="text-emerald-600 dark:text-emerald-400">
                  {result ? `[${result.lisValues.join(', ')}]` : '-'}
                </strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('method')}: <strong className="text-purple-600 dark:text-purple-400">
                  {method === 'dp' ? t('dpMethod') : t('binarySearchMethod')}
                </strong>
              </span>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.preset')}</p>
              <div className="flex flex-wrap gap-2">
                {LIS_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{t(`presets.${p.name}`)}</button>
                ))}
                <button onClick={generateRandom}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  {t('random')}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('sequence')}</label>
              <input type="text" value={arrInput}
                onChange={e => { setArrInput(e.target.value); handleReset() }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono text-sm"
                placeholder="10, 9, 2, 5, 3, 7, 101, 18" />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('method')}</p>
              <div className="flex gap-2">
                <button onClick={() => { setMethod('dp'); handleReset() }}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    method === 'dp' ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>{t('dpMethod')}</button>
                <button onClick={() => { setMethod('binary-search'); handleReset() }}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    method === 'binary-search' ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>{t('binarySearchMethod')}</button>
              </div>
            </div>

            <button onClick={runAlgorithm}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 transition-colors">
              {t('run')}
            </button>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.compare')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.lis')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400/80" />{t('legend.dpTails')}</span>
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
                {activeTab === 'code' && <CodeViewer code={method === 'dp' ? LIS_DP_CODE : LIS_BS_CODE} language="javascript" highlightLines={codeHighlightLines} title={method === 'dp' ? 'lis_dp.js' : 'lis_bs.js'} />}
                {activeTab === 'guide' && <GuideSection namespace="lisVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: LisStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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
  const ws = Math.max(0, currentIndex - 10), we = Math.min(steps.length - 1, currentIndex + 20)
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
