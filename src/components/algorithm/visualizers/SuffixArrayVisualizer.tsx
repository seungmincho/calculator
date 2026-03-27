'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { buildSuffixArray, SUFFIX_ARRAY_PRESETS, type SuffixArrayStep } from '@/utils/algorithm/suffixArray'
import SuffixArrayCanvas2D from './SuffixArrayCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const SA_CODE = `// Suffix Array Construction + LCP (Kasai)
function buildSuffixArray(text) {
  const n = text.length;
  // 1. Create & sort suffix indices
  const sa = Array.from({length: n}, (_, i) => i);
  sa.sort((a, b) =>
    text.substring(a) < text.substring(b) ? -1 : 1);

  // 2. Build rank array (inverse of SA)
  const rank = new Array(n);
  for (let i = 0; i < n; i++) rank[sa[i]] = i;

  // 3. Kasai's LCP algorithm — O(n)
  const lcp = new Array(n).fill(0);
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] === 0) { k = 0; continue; }
    const j = sa[rank[i] - 1];
    while (i+k < n && j+k < n
           && text[i+k] === text[j+k]) k++;
    lcp[rank[i]] = k;
    if (k > 0) k--;
  }
  return { sa, lcp };
}

// Binary search for pattern in suffix array
function search(text, sa, pattern) {
  let lo = 0, hi = sa.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const suffix = text.substring(sa[mid],
                     sa[mid] + pattern.length);
    if (suffix < pattern) lo = mid + 1;
    else if (suffix > pattern) hi = mid - 1;
    else return sa[mid];  // found!
  }
  return -1;
}`

const CODE_LINES: Record<SuffixArrayStep['action'], number[]> = {
  'init-suffixes':   [4],
  'sort-compare':    [5, 6],
  'sort-swap':       [5, 6],
  'sort-complete':   [7],
  'lcp-compute':     [16, 17, 18],
  'lcp-complete':    [20],
  'search-start':    [25, 26],
  'search-mid':      [28, 29],
  'search-match':    [32],
  'search-narrow':   [30, 31],
  'search-found':    [32],
  'search-not-found':[34],
  'complete':        [35],
}

export default function SuffixArrayVisualizer() {
  const t = useTranslations('suffixArrayVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [text, setText] = useState(SUFFIX_ARRAY_PRESETS[0].text)
  const [pattern, setPattern] = useState(SUFFIX_ARRAY_PRESETS[0].pattern)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<ReturnType<typeof buildSuffixArray> | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = buildSuffixArray(text.toUpperCase(), pattern.toUpperCase())
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [text, pattern])

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
    setText(SUFFIX_ARRAY_PRESETS[idx].text)
    setPattern(SUFFIX_ARRAY_PRESETS[idx].pattern)
    handleReset()
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
    if (!currentStep) {
      return {
        suffixArray: [] as number[],
        lcpArray: [] as number[],
        highlightIndices: [] as number[],
        phase: 'build' as const,
        searchLo: undefined as number | undefined,
        searchHi: undefined as number | undefined,
        searchMid: undefined as number | undefined,
        matches: [] as number[],
      }
    }
    // Collect matches found up to current step
    const ms: number[] = []
    for (let i = 0; i <= currentStepIndex; i++) {
      const s = result!.steps[i]
      if (s.action === 'search-found') {
        ms.push(...s.highlightIndices)
      }
    }
    return {
      suffixArray: currentStep.suffixArray,
      lcpArray: currentStep.lcpArray,
      highlightIndices: currentStep.highlightIndices,
      phase: currentStep.phase,
      searchLo: currentStep.searchLo,
      searchHi: currentStep.searchHi,
      searchMid: currentStep.searchMid,
      matches: ms.length > 0 ? ms : (currentStep.action === 'search-found' || currentStep.action === 'complete' ? currentStep.highlightIndices : []),
    }
  }, [result, currentStepIndex, currentStep])

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
    'init-suffixes':    'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'sort-compare':     'bg-pink-50 dark:bg-pink-900/20 border-pink-300/50 dark:border-pink-700/40',
    'sort-swap':        'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'sort-complete':    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'lcp-compute':      'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300/50 dark:border-indigo-700/40',
    'lcp-complete':     'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'search-start':     'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300/50 dark:border-cyan-700/40',
    'search-mid':       'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'search-match':     'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'search-narrow':    'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'search-found':     'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
    'search-not-found': 'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'complete':         'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }

  const ACTION_BADGE: Record<string, string> = {
    'init-suffixes':    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'sort-compare':     'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400',
    'sort-swap':        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'sort-complete':    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'lcp-compute':      'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
    'lcp-complete':     'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'search-start':     'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400',
    'search-mid':       'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'search-match':     'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'search-narrow':    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'search-found':     'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'search-not-found': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'complete':         'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  const currentPhaseLabel = !currentStep ? '-' : currentStep.phase === 'build' ? t('stats.buildPhase') : currentStep.phase === 'lcp' ? t('stats.lcpPhase') : t('stats.searchPhase')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">
              {tHub('categories.string')}
            </span>
            <span className="text-xs text-gray-400">★★★</span>
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
                <SuffixArrayCanvas2D
                  text={result?.text ?? text.toUpperCase()}
                  suffixArray={canvasProps.suffixArray}
                  lcpArray={canvasProps.lcpArray}
                  highlightIndices={canvasProps.highlightIndices}
                  phase={canvasProps.phase}
                  searchLo={canvasProps.searchLo}
                  searchHi={canvasProps.searchHi}
                  searchMid={canvasProps.searchMid}
                  pattern={result?.pattern ?? pattern.toUpperCase()}
                  matches={canvasProps.matches}
                  width={680} height={400}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.phase')}: <strong className="text-blue-600 dark:text-blue-400">{currentPhaseLabel}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.saSize')}: <strong className="text-pink-600 dark:text-pink-400">{canvasProps.suffixArray.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.matches')}: <strong className="text-emerald-600 dark:text-emerald-400">{result?.matches.length ?? '-'}</strong>
              </span>
              {result && result.matches.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('position')}: <strong className="text-emerald-600 dark:text-emerald-400">{result.matches.join(', ')}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.preset')}</p>
              <div className="flex flex-wrap gap-2">
                {SUFFIX_ARRAY_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      presetIdx === i ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{p.name}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('text')}</label>
                <input type="text" value={text} maxLength={20}
                  onChange={e => { setText(e.target.value.toUpperCase()); handleReset() }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('pattern')}</label>
                <input type="text" value={pattern} maxLength={10}
                  onChange={e => { setPattern(e.target.value.toUpperCase()); handleReset() }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono text-sm" />
              </div>
            </div>

            <button onClick={runAlgorithm}
              className="w-full px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg font-medium hover:from-pink-700 hover:to-rose-700 transition-colors">
              {t('build')}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-500 bg-pink-50/50 dark:bg-pink-900/20'
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
                {activeTab === 'code' && <CodeViewer code={SA_CODE} language="javascript" highlightLines={codeHighlightLines} title="suffix-array.js" />}
                {activeTab === 'guide' && <GuideSection namespace="suffixArrayVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: SuffixArrayStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) { const c = listRef.current; const tp = (el as HTMLElement).offsetTop; const h = (el as HTMLElement).offsetHeight
      if (tp < c.scrollTop) c.scrollTop = tp; else if (tp + h > c.scrollTop + c.clientHeight) c.scrollTop = tp + h - c.clientHeight }
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
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${actionBadge[step.action] || ''}`}>
                {step.action.replace('init-', 'I:').replace('sort-', 'S:').replace('lcp-', 'L:').replace('search-', 'Q:')}
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
