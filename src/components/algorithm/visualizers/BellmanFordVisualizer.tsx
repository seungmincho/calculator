'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type BFNode, type BFEdge, type BellmanFordStep, type BellmanFordResult,
  bellmanFord, generateRandomGraph,
} from '@/utils/algorithm/bellmanFord'
import BellmanFordCanvas2D from './BellmanFordCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const BF_CODE = `// 벨만-포드 최단경로 알고리즘
function bellmanFord(nodes, edges, source) {
  const dist = Array(nodes.length).fill(Infinity);
  dist[source] = 0;

  // V-1번 반복
  for (let i = 1; i < nodes.length; i++) {
    for (const edge of edges) {
      if (dist[edge.from] === Infinity) continue;

      const newDist = dist[edge.from] + edge.weight;
      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist;  // 거리 갱신 (이완)
      }
    }
  }

  // 음수 사이클 검출
  for (const edge of edges) {
    if (dist[edge.from] + edge.weight < dist[edge.to])
      throw "음수 사이클 발견!";
  }

  return dist;
}`

export default function BellmanFordVisualizer() {
  const t = useTranslations('bellmanFordVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<BFNode[]>([])
  const [edges, setEdges] = useState<BFEdge[]>([])
  const [source, setSource] = useState(0)
  const [allowNegative, setAllowNegative] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<BellmanFordResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const g = generateRandomGraph(6, false)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [])

  const totalSteps = result?.steps.length ?? 0

  const currentStep: BellmanFordStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    if (nodes.length === 0) return
    const r = bellmanFord(nodes, edges, source)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodes, edges, source])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 300 / speed)
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
    const g = generateRandomGraph(6, allowNegative)
    setNodes(g.nodes)
    setEdges(g.edges)
    setSource(0)
  }, [handleReset, allowNegative])

  const handleToggleNegative = useCallback((val: boolean) => {
    handleReset()
    setAllowNegative(val)
    const g = generateRandomGraph(6, val)
    setNodes(g.nodes)
    setEdges(g.edges)
    setSource(0)
  }, [handleReset])

  const handleNodeDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (currentStep.action === 'init') return [3, 4]
    if (currentStep.action === 'start-iteration') return [7]
    if (currentStep.action === 'relax') return [11]
    if (currentStep.action === 'update') return [13]
    if (currentStep.action === 'no-relax') return [9]
    if (currentStep.action === 'check-negative') return [19]
    if (currentStep.action === 'negative-cycle') return [21]
    if (currentStep.action === 'done') return [24]
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
              <BellmanFordCanvas2D
                nodes={nodes}
                edges={edges}
                distances={currentStep?.distances ?? Array(nodes.length).fill(Infinity)}
                source={source}
                currentEdge={currentStep?.edge ?? null}
                updatedNode={currentStep?.updatedNode ?? -1}
                predecessors={currentStep?.predecessors ?? Array(nodes.length).fill(null)}
                negativeCycleNodes={currentStep?.action === 'negative-cycle' ? (result?.negativeCycleNodes ?? []) : []}
                isRunning={isRunning}
                onNodeDrag={handleNodeDrag}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.iteration')}: <strong className="text-blue-600 dark:text-blue-400">{currentStep?.iteration ?? 0}</strong> / {Math.max(1, nodes.length - 1)}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.relaxations')}: <strong className="text-emerald-600 dark:text-emerald-400">{currentStep?.totalRelaxations ?? 0}</strong>
              </span>
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.complete')}
                </span>
              )}
              {currentStep?.action === 'negative-cycle' && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                  {t('stats.negativeCycle')}
                </span>
              )}
            </div>

            {/* Distance table */}
            {currentStep && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('stats.node')}</th>
                      {nodes.map(n => (
                        <th key={n.id} className={`px-2 py-1 ${n.id === source ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                          {n.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('stats.distance')}</td>
                      {currentStep.distances.map((d, i) => (
                        <td key={i} className={`px-2 py-1 text-center font-mono ${
                          d === Infinity ? 'text-gray-400' :
                          i === currentStep.updatedNode ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {d === Infinity ? '\u221E' : d}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
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

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowNegative}
                  onChange={e => handleToggleNegative(e.target.checked)}
                  disabled={isRunning}
                  className="accent-red-600"
                />
                {t('controls.allowNegative')}
              </label>

              {!isRunning && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{t('controls.source')}:</span>
                  <select
                    value={source}
                    onChange={e => { handleReset(); setSource(Number(e.target.value)) }}
                    className="px-2 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('legend.source')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('legend.updated')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('legend.checking')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> {t('legend.negative')}</span>
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
                      <BFStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} nodes={nodes} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={BF_CODE} language="javascript" highlightLines={codeHighlightLines} title="bellmanFord.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="bellmanFordVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BFStepsList({ steps, currentIndex, onStepClick, t, nodes }: {
  steps: BellmanFordStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
  nodes: BFNode[]
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    // Filter to show only key steps (not every no-relax)
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action !== 'no-relax' && s.action !== 'relax')
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

  const getNodeLabel = (id: number) => nodes.find(n => n.id === id)?.label ?? String(id)

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
        if (step.action === 'init') { label = t('stepsGuide.init'); icon = '📋' }
        else if (step.action === 'start-iteration') { label = t('stepsGuide.startIteration', { i: String(step.iteration) }); icon = '🔄' }
        else if (step.action === 'update' && step.edge) {
          label = t('stepsGuide.updated', { from: getNodeLabel(step.edge.from), to: getNodeLabel(step.edge.to), dist: String(step.distances[step.edge.to]) })
          icon = '✅'
        }
        else if (step.action === 'end-iteration') { label = t('stepsGuide.endIteration', { i: String(step.iteration), r: String(step.totalRelaxations) }); icon = '📊' }
        else if (step.action === 'check-negative') { label = t('stepsGuide.checkNegative'); icon = '🔍' }
        else if (step.action === 'negative-cycle') { label = t('stepsGuide.negativeCycle'); icon = '⚠️' }
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
            onClick={() => onStepClick(step.originalIndex)}
          >
            <span className="text-gray-700 dark:text-gray-300">{icon} {label}</span>
          </div>
        )
      })}
    </div>
  )
}
