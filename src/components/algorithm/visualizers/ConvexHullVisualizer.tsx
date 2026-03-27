'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  grahamScan,
  generateRandomPoints,
  generateCirclePoints,
  type ConvexHullStep,
  type ConvexHullResult,
  type Point,
} from '@/utils/algorithm/convexHull'
import ConvexHullCanvas2D from './ConvexHullCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const CANVAS_W = 600
const CANVAS_H = 420
const DEFAULT_POINT_COUNT = 15

const GRAHAM_SCAN_CODE = `// Graham Scan — Convex Hull
function grahamScan(points) {
  // 1. Find lowest point (pivot)
  let pivot = findLowest(points);

  // 2. Sort by polar angle from pivot
  points.sort((a, b) =>
    atan2(a.y - pivot.y, a.x - pivot.x) -
    atan2(b.y - pivot.y, b.x - pivot.x)
  );

  // 3. Process each point
  const stack = [points[0], points[1]];

  for (let i = 2; i < points.length; i++) {
    // Pop while clockwise turn
    while (stack.length >= 2 &&
           cross(stack[top-1], stack[top], points[i]) <= 0) {
      stack.pop();                    // clockwise → remove
    }
    stack.push(points[i]);            // counter-clockwise → keep
  }
  return stack;
}`

function getHighlightLines(action: ConvexHullStep['action']): number[] {
  switch (action) {
    case 'find-lowest':    return [3]
    case 'sort-angle':     return [6, 7, 8, 9]
    case 'check-turn':     return [16, 17]
    case 'pop':            return [18]
    case 'push':           return [20]
    case 'done':           return [22]
    default:               return []
  }
}

export default function ConvexHullVisualizer() {
  const t = useTranslations('convexHullVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [points, setPoints] = useState<Point[]>(() => generateRandomPoints(DEFAULT_POINT_COUNT, CANVAS_W, CANVAS_H))
  const [pointCount, setPointCount] = useState(DEFAULT_POINT_COUNT)
  const [result, setResult] = useState<ConvexHullResult | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = result?.steps.length ?? 0
  const currentStep = useMemo<ConvexHullStep | null>(() => {
    if (!result || currentStepIndex < 0) return null
    return result.steps[currentStepIndex] ?? null
  }, [result, currentStepIndex])

  const visualPoints = currentStep?.points ?? points
  const visualStack = currentStep?.stack ?? []
  const visualCurrent = currentStep?.currentIndex ?? null
  const visualComparing = currentStep?.comparing ?? null
  const visualAction = currentStep?.action ?? ''

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return getHighlightLines(currentStep.action)
  }, [currentStep])

  const runAlgorithm = useCallback(() => {
    const r = grahamScan(points)
    setResult(r)
    setCurrentStepIndex(0)
  }, [points])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

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

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setResult(null)
  }, [])

  const applyNewPoints = useCallback((newPts: Point[]) => {
    handleReset()
    setPoints(newPts)
  }, [handleReset])

  const handleRandom = useCallback(() => applyNewPoints(generateRandomPoints(pointCount, CANVAS_W, CANVAS_H)), [pointCount, applyNewPoints])
  const handleCircle = useCallback(() => applyNewPoints(generateCirclePoints(pointCount, CANVAS_W, CANVAS_H)), [pointCount, applyNewPoints])

  const handlePointCountChange = useCallback((size: number) => {
    setPointCount(size)
    applyNewPoints(generateRandomPoints(size, CANVAS_W, CANVAS_H))
  }, [applyNewPoints])

  const handleAddPoint = useCallback((x: number, y: number) => {
    if (currentStepIndex >= 0) return // don't add during animation
    setPoints(prev => [...prev, { x, y, id: prev.length }])
  }, [currentStepIndex])

  const handleDragPoint = useCallback((id: number, x: number, y: number) => {
    if (currentStepIndex >= 0) return
    setPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }, [currentStepIndex])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const hullSize = currentStep?.stack.length ?? 0
  const isDone = currentStep?.action === 'done'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
            {tHub('categories.geometry')}
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
              <ConvexHullCanvas2D
                points={visualPoints}
                stack={visualStack}
                currentIndex={visualCurrent}
                comparing={visualComparing}
                action={visualAction}
                width={CANVAS_W}
                height={CANVAS_H}
                onAddPoint={!isRunning ? handleAddPoint : undefined}
                onDragPoint={!isRunning ? handleDragPoint : undefined}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.points')}: <strong className="text-indigo-600 dark:text-indigo-400">{points.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.hullVertices')}: <strong className="text-emerald-600 dark:text-emerald-400">{hullSize}</strong>
              </span>
              {isDone && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.done')}
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button onClick={handleRandom} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40">
                🎲 {t('controls.random')}
              </button>
              <button onClick={handleCircle} disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40">
                ⭕ {t('controls.circle')}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{t('controls.pointCount')}</span>
              <input type="range" min={5} max={50} value={pointCount}
                onChange={e => handlePointCountChange(Number(e.target.value))}
                disabled={isRunning} className="flex-1 accent-indigo-600 disabled:opacity-40" />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-center tabular-nums">{pointCount}</span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" />{t('grid.pivot')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400" />{t('grid.stack')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400" />{t('grid.current')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400" />{t('grid.comparing')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400" />{t('grid.hullEdge')}</span>
            </div>

            {!isRunning && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('controls.clickToAdd')}</p>
            )}
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
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
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
                      <StepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={GRAHAM_SCAN_CODE} language="javascript" highlightLines={codeHighlightLines} title="grahamScan.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="convexHullVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, t }: {
  steps: ConvexHullStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  t: (key: string) => string
}) {
  const listRef = useRef<HTMLDivElement>(null)

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

  if (!steps || steps.length === 0) return null

  const icons: Record<string, string> = {
    'find-lowest': '📍', 'sort-angle': '🔄', 'push': '➕', 'pop': '➖', 'check-turn': '🔍', 'done': '🎉',
  }

  const colorClasses: Record<string, string> = {
    'find-lowest': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    'sort-angle': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'push': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'pop': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'check-turn': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
    'done': 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  }

  return (
    <div ref={listRef} className="space-y-1">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={i} data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-900/20'
              : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
              : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`} onClick={() => onStepClick(i)}>
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
