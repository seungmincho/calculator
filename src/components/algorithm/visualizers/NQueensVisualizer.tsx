'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  solveNQueens,
  type NQueensStep,
  type NQueensResult,
} from '@/utils/algorithm/nQueens'
import NQueensCanvas2D from './NQueensCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const DEFAULT_N = 8

const NQUEENS_CODE = `// N-Queens — Backtracking
function solveNQueens(n) {
  const board = new Array(n).fill(-1);
  const solutions = [];

  function solve(row) {
    if (row === n) {
      solutions.push([...board]);    // solution found!
      return;
    }

    for (let col = 0; col < n; col++) {
      if (isValid(board, row, col)) {
        board[row] = col;            // place queen
        solve(row + 1);              // recurse
        board[row] = -1;             // backtrack
      }
    }
  }

  function isValid(board, row, col) {
    for (let r = 0; r < row; r++) {
      if (board[r] === col) return false;        // same column
      if (Math.abs(r-row) === Math.abs(board[r]-col))
        return false;                            // diagonal
    }
    return true;
  }

  solve(0);
  return solutions;
}`

function getHighlightLines(action: NQueensStep['action']): number[] {
  switch (action) {
    case 'place':      return [13]
    case 'conflict':   return [21, 22, 23, 24]
    case 'backtrack':  return [15]
    case 'solution':   return [6, 7]
    case 'done':       return [29]
    default:           return []
  }
}

export default function NQueensVisualizer() {
  const t = useTranslations('nQueensVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [n, setN] = useState(DEFAULT_N)
  const [result, setResult] = useState<NQueensResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = result?.steps.length ?? 0
  const currentStep = useMemo<NQueensStep | null>(() => {
    if (!result || currentStepIndex < 0) return null
    return result.steps[currentStepIndex] ?? null
  }, [result, currentStepIndex])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runAlgorithm = useCallback(() => {
    const r = solveNQueens(n, 1)
    setResult(r)
    setCurrentStepIndex(0)
  }, [n])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 200 / speed)
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

  const handleNChange = useCallback((newN: number) => {
    handleReset()
    setN(newN)
  }, [handleReset])

  const isRunning = currentStepIndex >= 0
  const isDone = currentStep?.action === 'done'
  const solutionCount = currentStep?.solutionCount ?? 0
  const attempts = currentStep?.attempts ?? 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  // Compute canvas size based on n
  const canvasSize = Math.min(420, Math.max(280, 50 * n))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
            {tHub('categories.backtracking')}
          </span>
          <span className="text-xs text-gray-400">★★☆</span>
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

            <div className="flex justify-center">
              <NQueensCanvas2D
                step={currentStep}
                n={n}
                width={canvasSize}
                height={canvasSize}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.solutions')}: <strong className="text-emerald-600 dark:text-emerald-400">{solutionCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.attempts')}: <strong className="text-yellow-600 dark:text-yellow-400">{attempts}</strong>
              </span>
              {isDone && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.done')}
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.boardSize')}</span>
              <input type="range" min={4} max={12} value={n}
                onChange={e => handleNChange(Number(e.target.value))}
                disabled={isRunning} className="flex-1 accent-rose-600 disabled:opacity-40" />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-center tabular-nums">{n} x {n}</span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-500" />{t('grid.queen')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400/50" />{t('grid.attacked')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400/50" />{t('grid.current')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/60" />{t('grid.conflict')}</span>
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
                        ? 'text-rose-600 dark:text-rose-400 border-b-2 border-rose-500 bg-rose-50/50 dark:bg-rose-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.description')}</p>
                    ) : (
                      <NQueensStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={NQUEENS_CODE} language="javascript" highlightLines={codeHighlightLines} title="nQueens.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="nQueensVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NQueensStepsList({ steps, currentIndex, onStepClick, t }: {
  steps: NQueensStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  t: (key: string) => string
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Filter to show meaningful steps (skip no-swap etc)
  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, idx) => ({ ...step, originalIndex: idx }))
      .filter(s => s.action === 'place' || s.action === 'conflict' || s.action === 'backtrack' || s.action === 'solution' || s.action === 'done')
      .slice(0, 200) // limit for performance
  }, [steps])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      const container = listRef.current
      const elTop = (activeEl as HTMLElement).offsetTop
      const elH = (activeEl as HTMLElement).offsetHeight
      if (elTop < container.scrollTop) container.scrollTop = elTop
      else if (elTop + elH > container.scrollTop + container.clientHeight) container.scrollTop = elTop + elH - container.clientHeight
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  const icons: Record<string, string> = {
    place: '👑', conflict: '❌', backtrack: '↩️', solution: '🎉', done: '✅',
  }
  const colorClasses: Record<string, string> = {
    place: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    conflict: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    backtrack: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    solution: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    done: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
  }

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex && (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)

        return (
          <div key={i} data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-900/20'
              : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
              : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`} onClick={() => onStepClick(step.originalIndex)}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorClasses[step.action] || ''}`}>
                {icons[step.action] || '•'}
              </span>
              <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
