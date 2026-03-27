'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type UFStep, type UFResult, type UFOperation,
  runUnionFind, generateRandomOperations,
} from '@/utils/algorithm/unionFind'
import UnionFindCanvas2D from './UnionFindCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const UF_CODE = `// 유니온-파인드 (서로소 집합)
class UnionFind {
  constructor(n) {
    this.parent = Array.from({length: n}, (_, i) => i);
    this.rank = Array(n).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x)
      this.parent[x] = this.find(this.parent[x]); // 경로 압축
    return this.parent[x];
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false; // 이미 같은 집합

    // 랭크 기준 합치기
    if (this.rank[rootA] < this.rank[rootB])
      this.parent[rootA] = rootB;
    else if (this.rank[rootA] > this.rank[rootB])
      this.parent[rootB] = rootA;
    else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
    return true;
  }
}`

const DEFAULT_NODE_COUNT = 8

export default function UnionFindVisualizer() {
  const t = useTranslations('unionFindVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodeCount, setNodeCount] = useState(DEFAULT_NODE_COUNT)
  const [operations, setOperations] = useState<UFOperation[]>(() => generateRandomOperations(DEFAULT_NODE_COUNT))
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<UFResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSteps = result?.steps.length ?? 0

  const currentStep: UFStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    const r = runUnionFind(nodeCount, operations)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodeCount, operations])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(30, 500 / speed)
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

  const handleNewOperations = useCallback(() => {
    handleReset()
    setOperations(generateRandomOperations(nodeCount))
  }, [handleReset, nodeCount])

  const handleNodeCountChange = useCallback((n: number) => {
    handleReset()
    setNodeCount(n)
    setOperations(generateRandomOperations(n))
  }, [handleReset])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (currentStep.action === 'init') return [3, 4]
    if (currentStep.action === 'find-start' || currentStep.action === 'find-step') return [8, 9, 10]
    if (currentStep.action === 'find-done') return [11]
    if (currentStep.action === 'union') return [20, 21, 22, 23, 24]
    if (currentStep.action === 'compress') return [9, 10]
    return []
  }, [currentStep])

  // Count components from current state
  const componentCount = useMemo(() => {
    if (!currentStep) return nodeCount
    const roots = new Set<number>()
    const p = currentStep.parent
    for (let i = 0; i < p.length; i++) {
      let r = i
      while (p[r] !== r) r = p[r]
      roots.add(r)
    }
    return roots.size
  }, [currentStep, nodeCount])

  const isRunning = currentStepIndex >= 0
  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
              {tHub('categories.graph')}
            </span>
            <span className="text-xs text-gray-400">★☆☆</span>
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

            <div className="flex justify-center">
              <UnionFindCanvas2D
                nodeCount={nodeCount}
                parent={currentStep?.parent ?? Array.from({ length: nodeCount }, (_, i) => i)}
                rank={currentStep?.rank ?? Array(nodeCount).fill(0)}
                highlightNodes={currentStep?.highlightNodes ?? []}
                highlightEdge={currentStep?.highlightEdge ?? null}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.components')}: <strong className="text-blue-600 dark:text-blue-400">{componentCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.nodes')}: <strong className="text-gray-700 dark:text-gray-300">{nodeCount}</strong>
              </span>
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.complete')}
                </span>
              )}
            </div>

            {/* Operations list */}
            <div className="flex flex-wrap gap-1 justify-center">
              {operations.map((op, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {op.type === 'union' ? `U(${op.a},${op.b})` : `F(${op.a})`}
                </span>
              ))}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleNewOperations}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
              >
                🎲 {t('controls.newOperations')}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('controls.nodeCount')}</span>
              <input
                type="range" min={4} max={12} value={nodeCount}
                onChange={e => handleNodeCountChange(Number(e.target.value))}
                disabled={isRunning}
                className="flex-1 accent-blue-600 disabled:opacity-40"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-center tabular-nums">{nodeCount}</span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-amber-500" /> {t('legend.root')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400/30" /> {t('legend.highlighted')}</span>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.description')}</p>
                    ) : (
                      <UFStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={UF_CODE} language="javascript" highlightLines={codeHighlightLines} title="unionFind.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="unionFindVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UFStepsList({ steps, currentIndex, onStepClick, t }: {
  steps: UFStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
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

  return (
    <div ref={listRef} className="space-y-1">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex
        const isCurrent = i === currentIndex

        let label = ''
        let icon = '📋'
        if (step.action === 'init') { label = t('stepsGuide.init'); icon = '📋' }
        else if (step.action === 'find-start') {
          if (step.nodeB === -1) { label = t('stepsGuide.findOnly', { node: String(step.nodeA) }); icon = '🔍' }
          else { label = t('stepsGuide.findRoots', { a: String(step.nodeA), b: String(step.nodeB) }); icon = '🔍' }
        }
        else if (step.action === 'find-step') { label = t('stepsGuide.findStep', { a: String(step.nodeA), b: String(step.nodeB) }); icon = '🔎' }
        else if (step.action === 'find-done') {
          if (step.description === 'same-set') { label = t('stepsGuide.sameSet', { a: String(step.nodeA), b: String(step.nodeB) }); icon = '🔗' }
          else { label = t('stepsGuide.findDone', { node: String(step.nodeA), root: String(step.nodeB) }); icon = '✅' }
        }
        else if (step.action === 'union') { label = t('stepsGuide.union', { a: String(step.nodeA), b: String(step.nodeB) }); icon = '🔗' }
        else if (step.action === 'compress') { label = t('stepsGuide.compress', { node: String(step.nodeA), root: String(step.nodeB) }); icon = '⚡' }
        else if (step.action === 'done') { label = t('stepsGuide.done'); icon = '🏁' }

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
            onClick={() => onStepClick(i)}
          >
            <span className="text-gray-700 dark:text-gray-300">{icon} {label}</span>
          </div>
        )
      })}
    </div>
  )
}
