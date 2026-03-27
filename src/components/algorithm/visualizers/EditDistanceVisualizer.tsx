'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { solveEditDistance, ED_PRESETS, type EDStep, type EDResult } from '@/utils/algorithm/editDistance'
import EditDistanceCanvas2D from './EditDistanceCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const ED_CODE = `// Edit Distance (Levenshtein) — O(m*n)
function editDistance(str1, str2) {
  const m = str1.length, n = str2.length;
  const dp = Array(m+1).fill(null)
    .map((_, i) => {
      const row = Array(n+1).fill(0);
      row[0] = i;  // base: delete all
      return row;
    });
  for (let j = 0; j <= n; j++) dp[0][j] = j; // base: insert all

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i-1] === str2[j-1]) {
        dp[i][j] = dp[i-1][j-1];       // match (free)
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i-1][j],                   // delete
          dp[i][j-1],                   // insert
          dp[i-1][j-1]                  // replace
        );
      }
    }
  }

  // Traceback to find operations
  let i = m, j = n;
  const ops = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && str1[i-1] === str2[j-1]) {
      ops.push('match'); i--; j--;
    } else if (i > 0 && j > 0 &&
      dp[i][j] === dp[i-1][j-1] + 1) {
      ops.push('replace'); i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i-1][j] + 1) {
      ops.push('delete'); i--;
    } else {
      ops.push('insert'); j--;
    }
  }
  return { distance: dp[m][n], ops: ops.reverse() };
}`

const CODE_LINES: Record<EDStep['action'], number[]> = {
  init:                [3, 4, 5, 9],
  'compare-match':     [13, 14],
  'compare-mismatch':  [16, 17, 18, 19],
  fill:                [14, 19],
  'traceback-start':   [24, 25],
  'traceback-match':   [27],
  'traceback-replace': [30],
  'traceback-delete':  [33],
  'traceback-insert':  [35],
  done:                [38],
}

export default function EditDistanceVisualizer() {
  const t = useTranslations('editDistanceVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [presetIdx, setPresetIdx] = useState(0)
  const [str1, setStr1] = useState(ED_PRESETS[0].str1)
  const [str2, setStr2] = useState(ED_PRESETS[0].str2)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<EDResult | null>(null)
  const totalSteps = result?.steps.length ?? 0

  const runAlgorithm = useCallback(() => {
    const res = solveEditDistance(str1.toUpperCase(), str2.toUpperCase())
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [str1, str2])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 250 / speed)
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

  const handlePreset = useCallback((idx: number) => {
    handleReset()
    setPresetIdx(idx)
    setStr1(ED_PRESETS[idx].str1)
    setStr2(ED_PRESETS[idx].str2)
  }, [handleReset])

  const currentStep: EDStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  // Build cell sets for canvas
  const { filledCells, tracebackCells, matchCells, replaceCells, deleteCells, insertCells } = useMemo(() => {
    const filled = new Set<string>()
    const trace = new Set<string>()
    const match = new Set<string>()
    const replace = new Set<string>()
    const del = new Set<string>()
    const ins = new Set<string>()

    if (!result) return { filledCells: filled, tracebackCells: trace, matchCells: match, replaceCells: replace, deleteCells: del, insertCells: ins }

    for (let i = 0; i <= currentStepIndex; i++) {
      const step = result.steps[i]
      if (step.action === 'init') {
        // Base row and column
        for (let r = 0; r <= result.str1.length; r++) filled.add(`${r}-0`)
        for (let c = 0; c <= result.str2.length; c++) filled.add(`0-${c}`)
      }
      if (step.action === 'fill' || step.action === 'compare-match' || step.action === 'compare-mismatch') {
        filled.add(`${step.row}-${step.col}`)
      }
      if (step.action === 'traceback-start' || step.action === 'traceback-match' || step.action === 'traceback-replace' || step.action === 'traceback-delete' || step.action === 'traceback-insert') {
        trace.add(`${step.row}-${step.col}`)
      }
      if (step.action === 'traceback-match') match.add(`${step.row}-${step.col}`)
      if (step.action === 'traceback-replace') replace.add(`${step.row}-${step.col}`)
      if (step.action === 'traceback-delete') del.add(`${step.row}-${step.col}`)
      if (step.action === 'traceback-insert') ins.add(`${step.row}-${step.col}`)
    }

    return { filledCells: filled, tracebackCells: trace, matchCells: match, replaceCells: replace, deleteCells: del, insertCells: ins }
  }, [result, currentStepIndex])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return CODE_LINES[currentStep.action] ?? []
  }, [currentStep])

  const isRunning = currentStepIndex >= 0
  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  // Operation colors
  const opColor: Record<string, string> = {
    match: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    replace: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    delete: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    insert: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
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

            <div className="flex justify-center overflow-x-auto">
              <EditDistanceCanvas2D
                str1={result?.str1 ?? str1.toUpperCase()}
                str2={result?.str2 ?? str2.toUpperCase()}
                dp={result?.dp ?? []}
                arrows={result?.arrows ?? []}
                activeRow={currentStep?.row ?? -1}
                activeCol={currentStep?.col ?? -1}
                filledCells={filledCells}
                tracebackCells={tracebackCells}
                matchCells={matchCells}
                replaceCells={replaceCells}
                deleteCells={deleteCells}
                insertCells={insertCells}
                distance={result?.distance ?? 0}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {result && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('result')}: <strong className="text-blue-600 dark:text-blue-400">{result.distance}</strong>
                </span>
              )}
              {currentStep && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('currentCell')}: <strong className="text-cyan-600 dark:text-cyan-400">[{currentStep.row}, {currentStep.col}]</strong>
                </span>
              )}
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('result')}: {result?.distance}
                </span>
              )}
            </div>

            {/* Operations list */}
            {currentStep?.action === 'done' && result?.operations && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('operations')}</h3>
                <div className="flex flex-wrap gap-1">
                  {result.operations.map((op, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${opColor[op.type] ?? ''}`}>
                      {op.type === 'match' && `${t('match')}: ${op.char1}`}
                      {op.type === 'replace' && `${t('replace')}: ${op.char1}\u2192${op.char2}`}
                      {op.type === 'delete' && `${t('delete')}: ${op.char1}`}
                      {op.type === 'insert' && `${t('insert')}: ${op.char2}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">{t('string1')}:</label>
                <input
                  type="text"
                  value={str1}
                  onChange={e => { handleReset(); setStr1(e.target.value) }}
                  disabled={isRunning}
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
                  maxLength={12}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">{t('string2')}:</label>
                <input
                  type="text"
                  value={str2}
                  onChange={e => { handleReset(); setStr2(e.target.value) }}
                  disabled={isRunning}
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
                  maxLength={12}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {ED_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handlePreset(i)}
                  disabled={isRunning}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    presetIdx === i && !isRunning
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-40`}
                >
                  {p.str1}/{p.str2}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-cyan-500" /> {t('currentCell')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('match')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('replace')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> {t('delete')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-500" /> {t('insert')}</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              <div className="flex border-b border-gray-200/50 dark:border-gray-700/50">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsDescription')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsDescription')}</p>
                    ) : (
                      <EDStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={ED_CODE} language="javascript" highlightLines={codeHighlightLines} title="editDistance.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="editDistanceVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EDStepsList({ steps, currentIndex, onStepClick, t }: {
  steps: EDStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    // Filter out raw 'fill' steps (keep compare + traceback + init + done)
    return steps
      .map((step, i) => ({ ...step, originalIndex: i }))
      .filter(s => s.action !== 'fill')
  }, [steps])

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

  if (displaySteps.length === 0) return null

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex || (
          step.originalIndex < currentIndex &&
          (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex
        )

        let label = ''
        let icon = '📋'
        if (step.action === 'init') { label = t('stepInit'); icon = '📋' }
        else if (step.action === 'compare-match') {
          label = t('stepMatch', { c1: step.char1 ?? '', c2: step.char2 ?? '', val: String(step.value) })
          icon = '✅'
        }
        else if (step.action === 'compare-mismatch') {
          label = t('stepMismatch', { c1: step.char1 ?? '', c2: step.char2 ?? '', val: String(step.value) })
          icon = '🔄'
        }
        else if (step.action === 'traceback-start') { label = t('stepTraceStart'); icon = '🔍' }
        else if (step.action === 'traceback-match') { label = t('stepTraceMatch', { c: step.char1 ?? '' }); icon = '✅' }
        else if (step.action === 'traceback-replace') { label = t('stepTraceReplace', { c1: step.char1 ?? '', c2: step.char2 ?? '' }); icon = '🔄' }
        else if (step.action === 'traceback-delete') { label = t('stepTraceDelete', { c: step.char1 ?? '' }); icon = '🗑️' }
        else if (step.action === 'traceback-insert') { label = t('stepTraceInsert', { c: step.char2 ?? '' }); icon = '➕' }
        else if (step.action === 'done') { label = t('stepDone', { dist: String(step.value) }); icon = '🏁' }

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
            onClick={() => onStepClick(step.originalIndex)}
          >
            <span className="text-gray-700 dark:text-gray-300">{icon} {label}</span>
          </div>
        )
      })}
    </div>
  )
}
