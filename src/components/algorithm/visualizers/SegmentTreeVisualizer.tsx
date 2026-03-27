'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  buildSegmentTree, querySegmentTree, updateSegmentTree, generateRandomArray,
  type QueryType, type SegmentTreeStep,
} from '@/utils/algorithm/segmentTree'
import SegmentTreeCanvas2D from './SegmentTreeCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type OperationType = 'build' | 'query' | 'update'

const BUILD_CODE = `function build(node, start, end) {
  if (start === end) {
    tree[node] = arr[start];    // leaf
    return;
  }
  const mid = (start + end) >> 1;
  build(2*node, start, mid);     // left child
  build(2*node+1, mid+1, end);   // right child
  tree[node] = tree[2*node] + tree[2*node+1]; // merge
}`

const QUERY_CODE = `function query(node, start, end, l, r) {
  if (r < start || end < l)     // no overlap
    return 0;
  if (l <= start && end <= r)   // full overlap
    return tree[node];
  const mid = (start + end) >> 1;
  return query(2*node, start, mid, l, r)
       + query(2*node+1, mid+1, end, l, r);
}`

const UPDATE_CODE = `function update(node, start, end, idx, val) {
  if (start === end) {
    tree[node] = val;           // leaf update
    return;
  }
  const mid = (start + end) >> 1;
  if (idx <= mid)
    update(2*node, start, mid, idx, val);
  else
    update(2*node+1, mid+1, end, idx, val);
  tree[node] = tree[2*node] + tree[2*node+1]; // merge
}`

interface VisualState {
  activeNodeIndex: number | null
  visitedNodeIndices: Set<number>
  matchedNodeIndices: Set<number>
  skippedNodeIndices: Set<number>
  updatedNodeIndices: Set<number>
  queryL?: number
  queryR?: number
}

function computeVisualState(steps: SegmentTreeStep[], upTo: number): VisualState {
  const visited = new Set<number>()
  const matched = new Set<number>()
  const skipped = new Set<number>()
  const updated = new Set<number>()
  let active: number | null = null
  let qL: number | undefined
  let qR: number | undefined

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    active = step.nodeIndex

    if (step.action === 'build' || step.action === 'merge') {
      visited.add(step.nodeIndex)
    } else if (step.action === 'query-visit') {
      visited.add(step.nodeIndex)
    } else if (step.action === 'query-match') {
      matched.add(step.nodeIndex)
    } else if (step.action === 'query-skip') {
      skipped.add(step.nodeIndex)
    } else if (step.action === 'update-visit' || step.action === 'update-merge') {
      visited.add(step.nodeIndex)
    } else if (step.action === 'update-leaf') {
      updated.add(step.nodeIndex)
    }

    if (step.queryL !== undefined) qL = step.queryL
    if (step.queryR !== undefined) qR = step.queryR
  }

  return { activeNodeIndex: active, visitedNodeIndices: visited, matchedNodeIndices: matched, skippedNodeIndices: skipped, updatedNodeIndices: updated, queryL: qL, queryR: qR }
}

export default function SegmentTreeVisualizer() {
  const t = useTranslations('segmentTreeVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [array, setArray] = useState<number[]>([5, 8, 6, 3, 2, 7, 4, 1])
  const [arrayInput, setArrayInput] = useState('5, 8, 6, 3, 2, 7, 4, 1')
  const [tree, setTree] = useState<number[]>([])
  const [queryType, setQueryType] = useState<QueryType>('sum')
  const [operation, setOperation] = useState<OperationType>('build')
  const [queryL, setQueryL] = useState(1)
  const [queryR, setQueryR] = useState(4)
  const [updateIdx, setUpdateIdx] = useState(0)
  const [updateVal, setUpdateVal] = useState(10)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [answer, setAnswer] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [opResult, setOpResult] = useState<{
    steps: SegmentTreeStep[]
    treeAfter: number[]
    answer?: number
  } | null>(null)

  const totalSteps = opResult?.steps.length ?? 0

  const displayTree = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return tree
    const step = opResult.steps[currentStepIndex]
    return step?.treeSnapshot ?? tree
  }, [opResult, currentStepIndex, tree])

  const visualState = useMemo<VisualState>(() => {
    if (!opResult || currentStepIndex < 0) {
      return { activeNodeIndex: null, visitedNodeIndices: new Set(), matchedNodeIndices: new Set(), skippedNodeIndices: new Set(), updatedNodeIndices: new Set() }
    }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  const executeOperation = useCallback(() => {
    let res
    if (operation === 'build') {
      res = buildSegmentTree(array, queryType)
      setTree(res.tree)
      setAnswer(null)
    } else if (operation === 'query') {
      if (tree.length === 0) return
      res = querySegmentTree(tree, array.length, queryL, queryR, queryType)
      setAnswer(res.answer ?? null)
    } else {
      if (tree.length === 0) return
      res = updateSegmentTree(tree, array.length, updateIdx, updateVal, queryType)
      setTree(res.tree)
      // Update the original array as well
      const newArr = [...array]
      newArr[updateIdx] = updateVal
      setArray(newArr)
      setArrayInput(newArr.join(', '))
      setAnswer(null)
    }

    setOpResult({ steps: res.steps, treeAfter: res.tree, answer: res.answer })
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [array, tree, queryType, operation, queryL, queryR, updateIdx, updateVal])

  const fillRandom = useCallback(() => {
    const size = 8
    const arr = generateRandomArray(size)
    setArray(arr)
    setArrayInput(arr.join(', '))
    setTree([])
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setAnswer(null)
  }, [])

  const parseAndSetArray = useCallback(() => {
    const parsed = arrayInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    if (parsed.length > 0 && parsed.length <= 16) {
      setArray(parsed)
      setTree([])
      setOpResult(null)
      setCurrentStepIndex(-1)
      setAnswer(null)
    }
  }, [arrayInput])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) executeOperation()
    setIsPlaying(true)
  }, [currentStepIndex, executeOperation])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 500 / speed)
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
    setOpResult(null)
    setAnswer(null)
  }, [])

  const currentStep = opResult?.steps[currentStepIndex] ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    if (operation === 'build') {
      if (currentStep.action === 'build') return [3]
      if (currentStep.action === 'merge') return [8]
      return []
    }
    if (operation === 'query') {
      if (currentStep.action === 'query-skip') return [3]
      if (currentStep.action === 'query-match') return [5]
      if (currentStep.action === 'query-visit') return [7, 8]
      return []
    }
    if (currentStep.action === 'update-leaf') return [3]
    if (currentStep.action === 'update-visit') return [6, 8]
    if (currentStep.action === 'update-merge') return [9]
    return []
  }, [currentStep, operation])

  const currentCode = operation === 'build' ? BUILD_CODE : operation === 'query' ? QUERY_CODE : UPDATE_CODE
  const codeTitle = operation === 'build' ? 'segment-tree-build.js' : operation === 'query' ? 'segment-tree-query.js' : 'segment-tree-update.js'

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const operations: { key: OperationType; label: string }[] = [
    { key: 'build', label: t('build') },
    { key: 'query', label: t('query') },
    { key: 'update', label: t('update') },
  ]

  const queryTypes: { key: QueryType; label: string }[] = [
    { key: 'sum', label: t('sum') },
    { key: 'min', label: t('min') },
    { key: 'max', label: t('max') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {tHub('categories.dataStructure')}
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
                isPlaying={isPlaying} onPlay={handlePlay} onPause={() => setIsPlaying(false)} onReset={handleReset}
                onStepForward={() => { if (currentStepIndex < 0) executeOperation(); else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1)) }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed} onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)} totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <SegmentTreeCanvas2D
                  tree={displayTree} n={array.length}
                  activeNodeIndex={visualState.activeNodeIndex}
                  visitedNodeIndices={visualState.visitedNodeIndices}
                  matchedNodeIndices={visualState.matchedNodeIndices}
                  skippedNodeIndices={visualState.skippedNodeIndices}
                  updatedNodeIndices={visualState.updatedNodeIndices}
                  queryRangeL={visualState.queryL}
                  queryRangeR={visualState.queryR}
                  width={680} height={380}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('array')}: <strong className="text-blue-600 dark:text-blue-400">[{array.join(', ')}]</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('queryType')}: <strong className="text-purple-600 dark:text-purple-400">{queryType}</strong>
              </span>
              {answer !== null && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('result')}: <strong className="text-emerald-600 dark:text-emerald-400">{answer}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* Operation selector */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.operation')}</p>
              <div className="flex gap-2">
                {operations.map(op => (
                  <button key={op.key} onClick={() => { setOperation(op.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      operation === op.key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{op.label}</button>
                ))}
              </div>
            </div>

            {/* Query type */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('queryType')}</p>
              <div className="flex gap-2">
                {queryTypes.map(qt => (
                  <button key={qt.key} onClick={() => { setQueryType(qt.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      queryType === qt.key ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>{qt.label}</button>
                ))}
              </div>
            </div>

            {/* Array input */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('array')}</label>
              <div className="flex gap-2">
                <input type="text" value={arrayInput} onChange={e => setArrayInput(e.target.value)}
                  onBlur={parseAndSetArray} onKeyDown={e => e.key === 'Enter' && parseAndSetArray()}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="5, 8, 6, 3, 2, 7, 4, 1" />
                <button onClick={fillRandom}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors whitespace-nowrap">
                  🎲 {t('random')}
                </button>
              </div>
            </div>

            {/* Query range inputs */}
            {operation === 'query' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('queryRange')} L</label>
                  <input type="number" min={0} max={array.length - 1} value={queryL} onChange={e => setQueryL(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('queryRange')} R</label>
                  <input type="number" min={0} max={array.length - 1} value={queryR} onChange={e => setQueryR(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <button onClick={executeOperation}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                  {t('controls.execute')}
                </button>
              </div>
            )}

            {/* Update inputs */}
            {operation === 'update' && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('updateIndex')}</label>
                  <input type="number" min={0} max={array.length - 1} value={updateIdx} onChange={e => setUpdateIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('updateValue')}</label>
                  <input type="number" value={updateVal} onChange={e => setUpdateVal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <button onClick={executeOperation}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                  {t('controls.execute')}
                </button>
              </div>
            )}

            {/* Build button */}
            {operation === 'build' && (
              <button onClick={executeOperation}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors">
                {t('build')}
              </button>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.matched')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400/80" />{t('legend.skipped')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500/80" />{t('legend.updated')}</span>
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
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{tab.icon} {tab.label}</button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <SegTreeStepsList steps={opResult?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && (
                  <CodeViewer code={currentCode} language="javascript" highlightLines={codeHighlightLines} title={codeTitle} />
                )}
                {activeTab === 'guide' && <GuideSection namespace="segmentTreeVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SegTreeStepsList({ steps, currentIndex, onStepClick }: {
  steps: SegmentTreeStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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

  const ACTION_BADGE: Record<string, string> = {
    build:          'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    merge:          'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'query-visit':  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'query-match':  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'query-skip':   'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'update-visit': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'update-leaf':  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'update-merge': 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
    done:           'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    visit:          'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  }

  const windowStart = Math.max(0, currentIndex - 10)
  const windowEnd = Math.min(steps.length - 1, currentIndex + 20)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && <div className="text-xs text-gray-400 text-center py-1">... {windowStart} steps above ...</div>}
      {steps.slice(windowStart, windowEnd + 1).map((step, idx) => {
        const i = windowStart + idx
        const isCurrent = i === currentIndex
        return (
          <div key={i} data-active={isCurrent ? 'true' : undefined} onClick={() => onStepClick(i)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40'
                : i <= currentIndex ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[step.action] || ''}`}>{step.action}</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {windowEnd < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - windowEnd} steps below ...</div>}
    </div>
  )
}
