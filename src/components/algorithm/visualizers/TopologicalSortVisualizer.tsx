'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type DAGNode, type DAGEdge, type TopSortStep, type TopSortResult,
  topologicalSort, generateRandomDAG,
} from '@/utils/algorithm/topologicalSort'
import TopologicalSortCanvas2D from './TopologicalSortCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const TOPSORT_CODE = `// 위상정렬 — 칸(Kahn) 알고리즘
function topologicalSort(nodes, edges) {
  const inDegree = computeInDegrees(edges);
  const queue = [];

  // 진입차수 0인 노드를 큐에 추가
  for (const node of nodes) {
    if (inDegree[node] === 0)
      queue.push(node);
  }

  const result = [];
  while (queue.length > 0) {
    const current = queue.shift(); // 큐에서 꺼냄
    result.push(current);          // 결과에 추가

    for (const neighbor of adj[current]) {
      inDegree[neighbor]--;        // 진입차수 감소
      if (inDegree[neighbor] === 0)
        queue.push(neighbor);      // 0이면 큐에 추가
    }
  }

  if (result.length !== nodes.length)
    throw "순환 감지!";             // DAG가 아님

  return result;
}`

export default function TopologicalSortVisualizer() {
  const t = useTranslations('topologicalSortVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<DAGNode[]>([])
  const [edges, setEdges] = useState<DAGEdge[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<TopSortResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const g = generateRandomDAG(7)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [])

  const totalSteps = result?.steps.length ?? 0

  const currentStep: TopSortStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    if (nodes.length === 0) return
    const r = topologicalSort(nodes, edges)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodes, edges])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(30, 400 / speed)
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

  const handleNewGraph = useCallback(() => {
    handleReset()
    const g = generateRandomDAG(7)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset])

  const handleNodeDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (currentStep.action === 'init') return [2]
    if (currentStep.action === 'enqueue') return [7, 8]
    if (currentStep.action === 'dequeue') return [13, 14]
    if (currentStep.action === 'update') return [17]
    if (currentStep.action === 'done') return [25]
    if (currentStep.action === 'cycle') return [24]
    return []
  }, [currentStep])

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

            <div className="flex justify-center">
              <TopologicalSortCanvas2D
                nodes={nodes}
                edges={edges}
                inDegrees={currentStep?.inDegrees ?? edges.reduce((deg, e) => { deg[e.to] = (deg[e.to] || 0) + 1; return deg }, Array(nodes.length).fill(0) as number[])}
                queue={currentStep?.queue ?? []}
                result={currentStep?.result ?? []}
                currentNode={currentStep?.nodeId ?? -1}
                removedEdges={new Set(currentStep?.removedEdges ?? [])}
                isRunning={isRunning}
                onNodeDrag={handleNodeDrag}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.processed')}: <strong className="text-emerald-600 dark:text-emerald-400">{currentStep?.result.length ?? 0}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.queueSize')}: <strong className="text-blue-600 dark:text-blue-400">{currentStep?.queue.length ?? 0}</strong>
              </span>
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.complete')}
                </span>
              )}
              {currentStep?.action === 'cycle' && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                  {t('stats.cycleDetected')}
                </span>
              )}
            </div>

            {/* Result order */}
            {currentStep && currentStep.result.length > 0 && (
              <div className="flex items-center gap-2 justify-center flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('stats.order')}:</span>
                {currentStep.result.map((id, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                      {String.fromCharCode(65 + id)}
                    </span>
                    {i < currentStep.result.length - 1 && <span className="text-gray-400">&rarr;</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleNewGraph}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
              >
                🎲 {t('controls.newGraph')}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-500" /> {t('legend.unprocessed')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('legend.queued')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('legend.current')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('legend.processed')}</span>
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
                      <TopSortStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={TOPSORT_CODE} language="javascript" highlightLines={codeHighlightLines} title="topologicalSort.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="topologicalSortVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TopSortStepsList({ steps, currentIndex, onStepClick, t }: {
  steps: TopSortStep[] | undefined
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
        const nodeName = step.nodeId >= 0 ? String.fromCharCode(65 + step.nodeId) : ''

        let label = ''
        let icon = '📋'
        if (step.action === 'init') { label = t('stepsGuide.init'); icon = '📋' }
        else if (step.action === 'enqueue') { label = t('stepsGuide.enqueued', { node: nodeName }); icon = '📥' }
        else if (step.action === 'dequeue') { label = t('stepsGuide.dequeued', { node: nodeName }); icon = '📤' }
        else if (step.action === 'update') { label = t('stepsGuide.updated', { node: nodeName, deg: String(step.inDegrees[step.nodeId] ?? 0) }); icon = '🔄' }
        else if (step.action === 'done') { label = t('stepsGuide.done'); icon = '🏁' }
        else if (step.action === 'cycle') { label = t('stepsGuide.cycle'); icon = '⚠️' }

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
