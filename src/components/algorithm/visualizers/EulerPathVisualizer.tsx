'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type EPNode, type EPEdge, type EulerStep, type EulerResult,
  findEulerPath, generateEulerGraph,
} from '@/utils/algorithm/eulerPath'
import EulerPathCanvas2D from './EulerPathCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const EULER_CODE = `// Hierholzer's Algorithm — Euler Path/Circuit
function hierholzer(adj, start) {
  const stack = [start];
  const circuit = [];
  const edgeUsed = new Set();

  while (stack.length > 0) {
    const v = stack[stack.length - 1];
    const edge = findUnusedEdge(adj, v, edgeUsed);

    if (edge) {
      edgeUsed.add(edge.id);       // mark edge used
      stack.push(edge.to);          // push neighbor
    } else {
      stack.pop();                  // no unused edge
      circuit.push(v);             // add to circuit
    }
  }

  return circuit.reverse();        // correct order
}

// Euler existence check (undirected):
//   0 odd-degree vertices → Euler Circuit
//   2 odd-degree vertices → Euler Path
//   otherwise → No Euler path`

const CODE_LINES: Record<EulerStep['action'], number[]> = {
  'init':            [2, 3, 4],
  'check-degrees':   [22, 23, 24],
  'no-euler':        [25],
  'start-traverse':  [6],
  'traverse-edge':   [10, 11],
  'stuck':           [13],
  'pop-circuit':     [14],
  'backtrack':       [6],
  'done':            [18],
}

export default function EulerPathVisualizer() {
  const t = useTranslations('eulerPathVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<EPNode[]>([])
  const [edges, setEdges] = useState<EPEdge[]>([])
  const [directed, setDirected] = useState(false)
  const [graphType, setGraphType] = useState<'circuit' | 'path'>('circuit')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<EulerResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const g = generateEulerGraph(6, false, 'circuit')
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [])

  const totalSteps = result?.steps.length ?? 0

  const currentStep: EulerStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    if (nodes.length === 0) return
    const r = findEulerPath(nodes, edges, directed)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodes, edges, directed])

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
  }, [])

  const handleNewGraph = useCallback(() => {
    handleReset()
    const g = generateEulerGraph(6, directed, graphType)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset, directed, graphType])

  const handleToggleDirected = useCallback((val: boolean) => {
    handleReset()
    setDirected(val)
    const g = generateEulerGraph(6, val, graphType)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset, graphType])

  const handleChangeType = useCallback((val: 'circuit' | 'path') => {
    handleReset()
    setGraphType(val)
    const g = generateEulerGraph(6, directed, val)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset, directed])

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

  // Euler type display
  const eulerType = result?.eulerType
  const oddDegreeNodes = result?.oddDegreeNodes ?? []

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
              <EulerPathCanvas2D
                nodes={nodes}
                edges={edges}
                directed={directed}
                currentNode={currentStep?.currentNode ?? -1}
                visitedEdges={currentStep?.visitedEdges ?? new Set()}
                currentEdgeId={currentStep?.currentEdgeId ?? -1}
                circuit={currentStep?.action === 'done' ? (result?.circuit ?? []) : []}
                oddDegreeNodes={oddDegreeNodes}
                isRunning={isRunning}
                onNodeDrag={handleNodeDrag}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('nodeCount')}: <strong className="text-blue-600 dark:text-blue-400">{nodes.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('edgeCount')}: <strong className="text-emerald-600 dark:text-emerald-400">{edges.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('visited')}: <strong className="text-purple-600 dark:text-purple-400">{currentStep?.visitedEdges.size ?? 0}</strong>
              </span>
              {eulerType && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  eulerType === 'circuit' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                  eulerType === 'path' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {t('eulerType')}: {eulerType === 'circuit' ? t('circuit') : eulerType === 'path' ? t('path') : t('none')}
                </span>
              )}
              {oddDegreeNodes.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400 text-xs">
                  {t('oddDegree')}: {oddDegreeNodes.length}
                </span>
              )}
            </div>

            {/* Circuit result */}
            {currentStep?.action === 'done' && result?.circuit && result.circuit.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {result.circuit.map(id => nodes.find(n => n.id === id)?.label ?? id).join(' → ')}
                </span>
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
                  checked={directed}
                  onChange={e => handleToggleDirected(e.target.checked)}
                  disabled={isRunning}
                  className="accent-blue-600"
                />
                {t('directed')}
              </label>

              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{t('eulerType')}:</span>
                <select
                  value={graphType}
                  onChange={e => handleChangeType(e.target.value as 'circuit' | 'path')}
                  disabled={isRunning}
                  className="px-2 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                >
                  <option value="circuit">{t('circuit')}</option>
                  <option value="path">{t('path')}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('currentEdge')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('oddDegree')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" /> {t('remaining')}</span>
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
                      <EulerStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} nodes={nodes} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={EULER_CODE} language="javascript" highlightLines={codeHighlightLines} title="hierholzer.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="eulerPathVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EulerStepsList({ steps, currentIndex, onStepClick, t, nodes }: {
  steps: EulerStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
  nodes: EPNode[]
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps.map((step, i) => ({ ...step, originalIndex: i }))
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

  const getLabel = (n: number) => nodes.find(nd => nd.id === n)?.label ?? String(n)

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex

        let label = ''
        let icon = '📋'
        if (step.action === 'init') { label = t('stepInit'); icon = '📋' }
        else if (step.action === 'check-degrees') { label = t('stepCheckDegrees'); icon = '🔢' }
        else if (step.action === 'no-euler') { label = t('stepNoEuler'); icon = '❌' }
        else if (step.action === 'start-traverse') { label = t('stepStart', { node: getLabel(step.currentNode) }); icon = '🚀' }
        else if (step.action === 'traverse-edge') {
          const parts = step.description.split('->')
          label = t('stepTraverse', { from: parts[0] ?? '?', to: parts[1] ?? '?' })
          icon = '➡️'
        }
        else if (step.action === 'stuck') { label = t('stepStuck', { node: getLabel(step.currentNode) }); icon = '🛑' }
        else if (step.action === 'pop-circuit') { label = t('stepPop', { node: getLabel(step.currentNode) }); icon = '📤' }
        else if (step.action === 'done') { label = t('stepDone'); icon = '🏁' }

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
