'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type FWNode, type FWEdge, type FloydWarshallStep, type FloydWarshallResult,
  floydWarshall, generateRandomGraph, reconstructPath,
} from '@/utils/algorithm/floydWarshall'
import FloydWarshallCanvas2D from './FloydWarshallCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const FW_CODE = `// Floyd-Warshall All-Pairs Shortest Paths
function floydWarshall(graph, V) {
  const dist = Array(V).fill(null).map((_, i) =>
    Array(V).fill(null).map((_, j) =>
      i === j ? 0 : graph[i][j] ?? Infinity
    )
  );

  // For each intermediate vertex k
  for (let k = 0; k < V; k++) {
    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];  // Update
        }
      }
    }
  }

  // Negative cycle: diagonal < 0
  for (let i = 0; i < V; i++) {
    if (dist[i][i] < 0) return "Negative cycle!";
  }

  return dist;
}`

export default function FloydWarshallVisualizer() {
  const t = useTranslations('floydWarshallVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<FWNode[]>([])
  const [edges, setEdges] = useState<FWEdge[]>([])
  const [allowNegative, setAllowNegative] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<FloydWarshallResult | null>(null)
  const [selectedI, setSelectedI] = useState<number | null>(null)
  const [selectedJ, setSelectedJ] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const g = generateRandomGraph(5, false)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [])

  const totalSteps = result?.steps.length ?? 0

  const currentStep: FloydWarshallStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    if (nodes.length === 0) return
    const r = floydWarshall(nodes, edges)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodes, edges])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 400 / speed)
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
    setSelectedI(null)
    setSelectedJ(null)
  }, [])

  const handleNewGraph = useCallback(() => {
    handleReset()
    const g = generateRandomGraph(5, allowNegative)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset, allowNegative])

  const handleToggleNegative = useCallback((val: boolean) => {
    handleReset()
    setAllowNegative(val)
    const g = generateRandomGraph(5, val)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset])

  const handleNodeDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

  // Compute highlighted path for selected pair
  const highlightPath = useMemo(() => {
    if (selectedI === null || selectedJ === null || !currentStep) return []
    return reconstructPath(currentStep.next, selectedI, selectedJ)
  }, [selectedI, selectedJ, currentStep])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (currentStep.action === 'init') return [2, 3, 4, 5, 6]
    if (currentStep.action === 'start-k') return [10]
    if (currentStep.action === 'update') return [14]
    if (currentStep.action === 'end-k') return [10]
    if (currentStep.action === 'check-negative') return [21]
    if (currentStep.action === 'negative-cycle') return [22]
    if (currentStep.action === 'done') return [25]
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
              <FloydWarshallCanvas2D
                nodes={nodes}
                edges={edges}
                highlightPath={highlightPath}
                currentK={currentStep?.k ?? -1}
                updatedCell={currentStep?.updatedCell ?? null}
                isRunning={isRunning}
                onNodeDrag={handleNodeDrag}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('intermediateNode')}: <strong className="text-amber-600 dark:text-amber-400">
                  {currentStep && currentStep.k >= 0 ? nodes[currentStep.k]?.label ?? '-' : '-'}
                </strong> ({currentStep?.k ?? -1} / {Math.max(0, nodes.length - 1)})
              </span>
              {currentStep?.action === 'update' && currentStep.updatedCell && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('updated')}: [{nodes[currentStep.updatedCell[0]]?.label},{nodes[currentStep.updatedCell[1]]?.label}] = {currentStep.dist[currentStep.updatedCell[0]][currentStep.updatedCell[1]]}
                </span>
              )}
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.complete')}
                </span>
              )}
              {currentStep?.action === 'negative-cycle' && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                  {t('negativeCycle')}
                </span>
              )}
            </div>

            {/* Distance matrix */}
            {currentStep && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('distanceMatrix')}</th>
                      {nodes.map(n => (
                        <th key={n.id} className="px-2 py-1 text-gray-600 dark:text-gray-400 font-mono">{n.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((ni, i) => (
                      <tr key={ni.id}>
                        <td className="px-2 py-1 text-gray-600 dark:text-gray-400 font-mono font-bold">{ni.label}</td>
                        {nodes.map((nj, j) => {
                          const val = currentStep.dist[i][j]
                          const isUpdated = currentStep.updatedCell && currentStep.updatedCell[0] === i && currentStep.updatedCell[1] === j
                          const isSelected = selectedI === i && selectedJ === j
                          const isKRow = i === currentStep.k || j === currentStep.k

                          return (
                            <td
                              key={nj.id}
                              onClick={() => { setSelectedI(i); setSelectedJ(j) }}
                              className={`px-2 py-1 text-center font-mono cursor-pointer transition-colors ${
                                isUpdated ? 'bg-emerald-200 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold' :
                                isSelected ? 'bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold' :
                                isKRow ? 'bg-amber-50 dark:bg-amber-900/20' :
                                i === j ? 'bg-gray-100 dark:bg-gray-700/30' : ''
                              } ${val === Infinity ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {val === Infinity ? '\u221E' : val}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedI !== null && selectedJ !== null && (
                  <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-1">
                    {t('path')}: {highlightPath.length > 0 ? highlightPath.map(id => nodes[id]?.label).join(' → ') : '-'}
                  </p>
                )}
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
                🎲 {t('randomGraph')}
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
                {t('allowNegative')}
              </label>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('legend.k')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('legend.updated')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('legend.path')}</span>
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
                      <FWStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} nodes={nodes} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={FW_CODE} language="javascript" highlightLines={codeHighlightLines} title="floydWarshall.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="floydWarshallVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FWStepsList({ steps, currentIndex, onStepClick, t, nodes }: {
  steps: FloydWarshallStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
  nodes: FWNode[]
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action !== 'check-pair' && s.action !== 'no-update')
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

  const getLabel = (id: number) => nodes[id]?.label ?? String(id)

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, idx) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex || (
          step.originalIndex < currentIndex &&
          (displaySteps[idx + 1]?.originalIndex ?? Infinity) > currentIndex
        )

        let label = ''
        let icon = '📋'
        if (step.action === 'init') { label = t('stepsGuide.init'); icon = '📋' }
        else if (step.action === 'start-k') { label = t('stepsGuide.startK', { k: getLabel(step.k) }); icon = '🔄' }
        else if (step.action === 'update' && step.updatedCell) {
          label = t('stepsGuide.update', {
            i: getLabel(step.updatedCell[0]),
            j: getLabel(step.updatedCell[1]),
            k: getLabel(step.k),
            dist: String(step.dist[step.updatedCell[0]][step.updatedCell[1]]),
          })
          icon = '✅'
        }
        else if (step.action === 'end-k') { label = t('stepsGuide.endK', { k: getLabel(step.k) }); icon = '📊' }
        else if (step.action === 'check-negative') { label = t('stepsGuide.checkNegative'); icon = '🔍' }
        else if (step.action === 'negative-cycle') { label = t('stepsGuide.negativeCycle'); icon = '⚠️' }
        else if (step.action === 'done') { label = t('stepsGuide.done'); icon = '🏁' }

        return (
          <div
            key={idx}
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
