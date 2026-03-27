'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type GraphNode, type GraphEdge, type PrimStep, type PrimResult,
  prim, generateRandomGraph,
} from '@/utils/algorithm/prim'
import PrimCanvas2D from './PrimCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const PRIM_CODE = `// 프림 최소 신장 트리 알고리즘
function prim(nodes, edges, start) {
  const visited = new Set();
  const mst = [];
  const pq = new MinHeap();   // 우선순위 큐

  visited.add(start);          // 시작 정점 방문
  addEdges(pq, start);         // 인접 간선 추가

  while (pq.size > 0 && mst.length < n-1) {
    const edge = pq.extractMin();  // 최소 가중치 간선

    if (visited.has(edge.to)) {
      continue;                // 이미 방문 → 스킵
    }

    visited.add(edge.to);     // 정점 방문
    mst.push(edge);           // MST에 추가
    addEdges(pq, edge.to);    // 새 간선 추가
  }
  return mst;
}`

const CODE_LINES: Record<string, number[]> = {
  start: [6, 7],
  'add-edges': [7, 18],
  extract: [10],
  'add-to-mst': [16, 17],
  'skip-visited': [12, 13],
  done: [20],
}

export default function PrimVisualizer() {
  const t = useTranslations('primVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [startNodeId, setStartNodeId] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<PrimResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize with random graph
  useEffect(() => {
    const g = generateRandomGraph(7)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [])

  const totalSteps = result?.steps.length ?? 0

  const currentStep: PrimStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    if (nodes.length === 0) return
    const r = prim(nodes, edges, startNodeId)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodes, edges, startNodeId])

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
    const g = generateRandomGraph(7)
    setNodes(g.nodes)
    setEdges(g.edges)
    setStartNodeId(0)
  }, [handleReset])

  const handleNodeDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Title */}
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

      {/* Main layout */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: visualization */}
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
              <PrimCanvas2D
                nodes={nodes}
                edges={edges}
                visited={currentStep?.visited ?? Array(nodes.length).fill(false)}
                mstEdges={currentStep?.mstEdges ?? []}
                currentEdge={currentStep?.edge ?? null}
                candidateEdges={currentStep?.candidateEdges ?? []}
                isRunning={isRunning}
                onNodeDrag={handleNodeDrag}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.mstEdges')}: <strong className="text-emerald-600 dark:text-emerald-400">{currentStep?.mstEdges.length ?? 0}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.totalWeight')}: <strong className="text-blue-600 dark:text-blue-400">{currentStep?.totalWeight ?? 0}</strong>
              </span>
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.complete')}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleNewGraph}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
              >
                🎲 {t('controls.newGraph')}
              </button>

              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                {t('startNode')}:
                <select
                  value={startNodeId}
                  onChange={e => setStartNodeId(Number(e.target.value))}
                  disabled={isRunning}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('legend.mst')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('legend.checking')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-violet-400" /> {t('legend.candidate')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-400" /> {t('legend.unvisited')}</span>
            </div>
          </div>
        </div>

        {/* Right: panel */}
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
                      <PrimStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} nodes={nodes} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={PRIM_CODE} language="javascript" highlightLines={codeHighlightLines} title="prim.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="primVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrimStepsList({ steps, currentIndex, onStepClick, t, nodes }: {
  steps: PrimStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
  nodes: GraphNode[]
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

  const nodeLabel = (id: number) => nodes.find(n => n.id === id)?.label ?? String(id)

  return (
    <div ref={listRef} className="space-y-1">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex
        const isCurrent = i === currentIndex

        let label = ''
        let icon = '🔍'

        switch (step.action) {
          case 'start':
            label = t('stepsGuide.start', { node: nodeLabel(step.vertex) })
            icon = '🏁'
            break
          case 'add-edges':
            label = t('stepsGuide.addEdges', { node: nodeLabel(step.vertex) })
            icon = '📤'
            break
          case 'extract':
            if (step.edge) {
              label = t('stepsGuide.extract', { from: nodeLabel(step.edge.from), to: nodeLabel(step.edge.to), w: String(step.edge.weight) })
            }
            icon = '🔍'
            break
          case 'add-to-mst':
            if (step.edge) {
              label = t('stepsGuide.addToMst', { from: nodeLabel(step.edge.from), to: nodeLabel(step.edge.to), node: nodeLabel(step.vertex) })
            }
            icon = '✅'
            break
          case 'skip-visited':
            if (step.edge) {
              label = t('stepsGuide.skipVisited', { from: nodeLabel(step.edge.from), to: nodeLabel(step.edge.to), node: nodeLabel(step.vertex) })
            }
            icon = '⏭️'
            break
          case 'done':
            label = t('stepsGuide.done', { w: String(step.totalWeight) })
            icon = '🏁'
            break
        }

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
