'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { solveLCS, LCS_PRESETS, type LCSStep } from '@/utils/algorithm/lcs'
import LCSCanvas2D from './LCSCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const LCS_CODE = `// LCS (Longest Common Subsequence) — O(m*n)
function lcs(str1, str2) {
  const m = str1.length, n = str2.length;
  const dp = Array(m+1).fill(null)
    .map(() => Array(n+1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i-1] === str2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;  // match!
      } else {
        dp[i][j] = Math.max(          // mismatch
          dp[i-1][j], dp[i][j-1]
        );
      }
    }
  }

  // Traceback to find LCS string
  let i = m, j = n;
  const result = [];
  while (i > 0 && j > 0) {
    if (str1[i-1] === str2[j-1]) {
      result.push(str1[i-1]);         // matched char
      i--; j--;
    } else if (dp[i-1][j] >= dp[i][j-1]) {
      i--;                            // go up
    } else {
      j--;                            // go left
    }
  }
  return result.reverse().join('');
}`

const CODE_LINES: Record<LCSStep['action'], number[]> = {
  init:               [4, 5],
  'compare-match':    [9, 10],
  'compare-mismatch': [12, 13],
  fill:               [10, 13],
  'traceback-start':  [20, 21],
  'traceback-match':  [23, 24],
  'traceback-up':     [26],
  'traceback-left':   [28],
  done:               [30],
}

export default function LCSVisualizer() {
  const t = useTranslations('lcsVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [str1, setStr1] = useState(LCS_PRESETS[0].str1)
  const [str2, setStr2] = useState(LCS_PRESETS[0].str2)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof solveLCS> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = solveLCS(str1.toUpperCase(), str2.toUpperCase())
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [str1, str2])

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
    setStr1(LCS_PRESETS[idx].str1)
    setStr2(LCS_PRESETS[idx].str2)
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

  const { filledCells, tracebackCells, matchedCells, activeRow, activeCol } = useMemo(() => {
    const filled = new Set<string>()
    const trace = new Set<string>()
    const matched = new Set<string>()
    let aRow = -1, aCol = -1

    if (result && currentStepIndex >= 0) {
      // Row 0 and col 0 are always filled (zeros)
      for (let i = 0; i <= (result.str1.length); i++) filled.add(`${i},0`)
      for (let j = 0; j <= (result.str2.length); j++) filled.add(`0,${j}`)

      for (let i = 0; i <= currentStepIndex && i < result.steps.length; i++) {
        const step = result.steps[i]
        if (step.action === 'fill') filled.add(`${step.row},${step.col}`)
        if (step.action === 'traceback-start' || step.action === 'traceback-up' || step.action === 'traceback-left') {
          trace.add(`${step.row},${step.col}`)
        }
        if (step.action === 'traceback-match') {
          matched.add(`${step.row},${step.col}`)
          trace.add(`${step.row},${step.col}`)
        }
      }
      const cur = result.steps[currentStepIndex]
      aRow = cur.row
      aCol = cur.col
    }
    return { filledCells: filled, tracebackCells: trace, matchedCells: matched, activeRow: aRow, activeCol: aCol }
  }, [result, currentStepIndex])

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
    init:               'bg-gray-50 dark:bg-gray-900/20 border-gray-300/50 dark:border-gray-700/40',
    'compare-match':    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'compare-mismatch': 'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    fill:               'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300/50 dark:border-cyan-700/40',
    'traceback-start':  'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'traceback-match':  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'traceback-up':     'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'traceback-left':   'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
    done:               'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }
  const ACTION_BADGE: Record<string, string> = {
    init:               'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400',
    'compare-match':    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'compare-mismatch': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    fill:               'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    'traceback-start':  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'traceback-match':  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'traceback-up':     'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'traceback-left':   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    done:               'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
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
                <LCSCanvas2D
                  str1={result?.str1 ?? str1.toUpperCase()} str2={result?.str2 ?? str2.toUpperCase()}
                  dp={result?.dp ?? []} arrows={result?.arrows ?? []}
                  activeRow={activeRow} activeCol={activeCol}
                  filledCells={filledCells} tracebackCells={tracebackCells} matchedCells={matchedCells}
                  lcsString={result?.lcsString ?? ''} width={680} height={380}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.lcsLength')}: <strong className="text-cyan-600 dark:text-cyan-400">{result?.lcsString.length ?? '-'}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.lcsString')}: <strong className="text-emerald-600 dark:text-emerald-400">{result?.lcsString || '-'}</strong>
              </span>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.preset')}</p>
              <div className="flex flex-wrap gap-2">
                {LCS_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{p.str1} / {p.str2}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.str1')}</label>
                <input type="text" value={str1} maxLength={10}
                  onChange={e => { setStr1(e.target.value.toUpperCase()); handleReset() }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.str2')}</label>
                <input type="text" value={str2} maxLength={10}
                  onChange={e => { setStr2(e.target.value.toUpperCase()); handleReset() }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono" />
              </div>
            </div>

            <button onClick={runAlgorithm}
              className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-700 hover:to-blue-700 transition-colors">
              {t('controls.run')}
            </button>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.match')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500/80" />{t('legend.filled')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.traceback')}</span>
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
                {activeTab === 'code' && <CodeViewer code={LCS_CODE} language="javascript" highlightLines={codeHighlightLines} title="lcs.js" />}
                {activeTab === 'guide' && <GuideSection namespace="lcsVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: LCSStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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
