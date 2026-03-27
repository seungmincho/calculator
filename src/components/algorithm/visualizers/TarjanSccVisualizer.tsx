'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type TSNode, type TSEdge, type TarjanStep, type TarjanResult,
  tarjanScc, generateRandomGraph,
} from '@/utils/algorithm/tarjanScc'
import TarjanSccCanvas2D from './TarjanSccCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const TARJAN_CODE = `// Tarjan's SCC Algorithm
function tarjanSCC(graph, V) {
  const disc = Array(V).fill(-1);
  const low  = Array(V).fill(-1);
  const onStack = Array(V).fill(false);
  const stack = [];
  let timer = 0;
  const sccs = [];

  function dfs(u) {
    disc[u] = low[u] = timer++;
    stack.push(u);
    onStack[u] = true;

    for (const v of graph[u]) {
      if (disc[v] === -1) {
        dfs(v);                         // Tree edge
        low[u] = Math.min(low[u], low[v]);
      } else if (onStack[v]) {
        low[u] = Math.min(low[u], disc[v]); // Back edge
      }
    }

    // u is SCC root
    if (low[u] === disc[u]) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack[w] = false;
        scc.push(w);
      } while (w !== u);
      sccs.push(scc);
    }
  }

  for (let i = 0; i < V; i++)
    if (disc[i] === -1) dfs(i);

  return sccs;
}`

export default function TarjanSccVisualizer() {
  const t = useTranslations('tarjanSccVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<TSNode[]>([])
  const [edges, setEdges] = useState<TSEdge[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [result, setResult] = useState<TarjanResult | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const g = generateRandomGraph(8)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [])

  const totalSteps = result?.steps.length ?? 0

  const currentStep: TarjanStep | null = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return null
    return result.steps[currentStepIndex]
  }, [result, currentStepIndex])

  const runAlgorithm = useCallback(() => {
    if (nodes.length === 0) return
    const r = tarjanScc(nodes, edges)
    setResult(r)
    setCurrentStepIndex(0)
  }, [nodes, edges])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runAlgorithm()
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 350 / speed)
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
    const g = generateRandomGraph(8)
    setNodes(g.nodes)
    setEdges(g.edges)
  }, [handleReset])

  const handleNodeDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (currentStep.action === 'init') return [2, 3, 4, 5, 6, 7]
    if (currentStep.action === 'visit') return [11, 12, 13]
    if (currentStep.action === 'explore-edge') return [16]
    if (currentStep.action === 'update-lowlink') return [18]
    if (currentStep.action === 'back-edge') return [20]
    if (currentStep.action === 'cross-edge') return [15]
    if (currentStep.action === 'scc-root') return [25]
    if (currentStep.action === 'pop-scc') return [27, 28, 29, 30, 31]
    if (currentStep.action === 'done') return [36, 37]
    return []
  }, [currentStep])

  const isRunning = currentStepIndex >= 0
  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const sccCount = currentStep?.sccGroups.length ?? 0

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
            <span className="text-xs text-gray-400">★★★</span>
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
              <TarjanSccCanvas2D
                nodes={nodes}
                edges={edges}
                disc={currentStep?.disc ?? Array(nodes.length).fill(-1)}
                low={currentStep?.low ?? Array(nodes.length).fill(-1)}
                onStack={currentStep?.onStack ?? Array(nodes.length).fill(false)}
                stack={currentStep?.stack ?? []}
                sccIndex={currentStep?.sccIndex ?? Array(nodes.length).fill(-1)}
                currentNode={currentStep?.nodeId ?? -1}
                targetNode={currentStep?.targetId ?? -1}
                currentScc={currentStep?.currentScc ?? []}
                action={currentStep?.action ?? ''}
                isRunning={isRunning}
                onNodeDrag={handleNodeDrag}
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('sccCount')}: <strong className="text-emerald-600 dark:text-emerald-400">{sccCount}</strong>
              </span>
              {currentStep?.nodeId !== undefined && currentStep.nodeId >= 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('currentStep')}: <strong className="text-amber-600 dark:text-amber-400">{nodes[currentStep.nodeId]?.label ?? '-'}</strong>
                  {currentStep.disc[currentStep.nodeId] >= 0 && (
                    <span className="text-xs ml-1">
                      (d={currentStep.disc[currentStep.nodeId]}, l={currentStep.low[currentStep.nodeId]})
                    </span>
                  )}
                </span>
              )}
              {currentStep?.action === 'done' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.complete')}
                </span>
              )}
            </div>

            {/* DFS Stack display */}
            {currentStep && currentStep.stack.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 justify-center">
                <span className="font-medium">{t('dfsStack')}:</span>
                <div className="flex gap-1">
                  {currentStep.stack.map((id, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono">
                      {nodes[id]?.label ?? id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SCC groups display */}
            {currentStep && currentStep.sccGroups.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">{t('sccFound')}:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentStep.sccGroups.map((scc, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                      style={{ backgroundColor: `hsl(${idx * 60 + 210}, 60%, 50%)` }}
                    >
                      {'{' + scc.map(id => nodes[id]?.label ?? id).join(', ') + '}'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Node info table */}
            {currentStep && currentStep.action !== 'init' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('stats.node')}</th>
                      {nodes.map(n => (
                        <th key={n.id} className={`px-2 py-1 ${n.id === currentStep.nodeId ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                          {n.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('discoveryTime')}</td>
                      {currentStep.disc.map((d, i) => (
                        <td key={i} className={`px-2 py-1 text-center font-mono ${d < 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {d < 0 ? '-' : d}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('lowLink')}</td>
                      {currentStep.low.map((l, i) => (
                        <td key={i} className={`px-2 py-1 text-center font-mono ${l < 0 ? 'text-gray-400' : currentStep.disc[i] === l ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                          {l < 0 ? '-' : l}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-2 py-1 text-gray-500 dark:text-gray-400">{t('onStack')}</td>
                      {currentStep.onStack.map((s, i) => (
                        <td key={i} className={`px-2 py-1 text-center ${s ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                          {s ? '✓' : ''}
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
                🎲 {t('randomGraph')}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('legend.current')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('legend.onStack')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" /> {t('legend.unvisited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('legend.scc')}</span>
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
                      <TSStepsList steps={result?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} t={t} nodes={nodes} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={TARJAN_CODE} language="javascript" highlightLines={codeHighlightLines} title="tarjanScc.js" />
                )}
                {activeTab === 'guide' && (
                  <GuideSection namespace="tarjanSccVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TSStepsList({ steps, currentIndex, onStepClick, t, nodes }: {
  steps: TarjanStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
  nodes: TSNode[]
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action !== 'cross-edge') // Hide cross-edge for cleaner display
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
        else if (step.action === 'visit') { label = t('stepsGuide.visit', { node: getLabel(step.nodeId), d: String(step.disc[step.nodeId]) }); icon = '👁️' }
        else if (step.action === 'explore-edge') { label = t('stepsGuide.exploreEdge', { from: getLabel(step.nodeId), to: getLabel(step.targetId) }); icon = '🔍' }
        else if (step.action === 'update-lowlink') { label = t('stepsGuide.updateLowlink', { node: getLabel(step.nodeId), low: String(step.low[step.nodeId]) }); icon = '🔄' }
        else if (step.action === 'back-edge') { label = t('stepsGuide.backEdge', { from: getLabel(step.nodeId), to: getLabel(step.targetId) }); icon = '↩️' }
        else if (step.action === 'scc-root') { label = t('stepsGuide.sccRoot', { node: getLabel(step.nodeId) }); icon = '⭐' }
        else if (step.action === 'pop-scc') {
          label = t('stepsGuide.popScc', { nodes: step.currentScc.map(id => getLabel(id)).join(', ') })
          icon = '🎯'
        }
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
