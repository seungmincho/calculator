'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  insertBST,
  searchBST,
  deleteBST,
  buildBST,
  generateRandomValues,
  generateSortedValues,
  generateBalancedValues,
  getTreeHeight,
  getNodeCount,
  type BSTNode,
  type BSTStep,
  type BSTResult,
} from '@/utils/algorithm/bst'
import BSTCanvas2D from './BSTCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type OperationType = 'insert' | 'search' | 'delete'

// ── Pseudocode ────────────────────────────────────────────────────────────────
const BST_INSERT_CODE = `// BST 삽입
function insert(root, value) {
  if (root === null) {
    return new Node(value);      // 새 노드 생성
  }

  if (value < root.value) {
    root.left = insert(root.left, value);   // 왼쪽
  } else if (value > root.value) {
    root.right = insert(root.right, value); // 오른쪽
  }
  return root;
}`

const BST_SEARCH_CODE = `// BST 탐색
function search(root, value) {
  if (root === null) {
    return null;                 // 탐색 실패
  }

  if (value === root.value) {
    return root;                 // 탐색 성공!
  }

  if (value < root.value) {
    return search(root.left, value);   // 왼쪽 탐색
  } else {
    return search(root.right, value);  // 오른쪽 탐색
  }
}`

const BST_DELETE_CODE = `// BST 삭제 (3가지 경우)
function delete(root, value) {
  if (root === null) return null;

  if (value < root.value) {
    root.left = delete(root.left, value);
  } else if (value > root.value) {
    root.right = delete(root.right, value);
  } else {
    // 경우 1: 단말 노드
    if (!root.left && !root.right) return null;

    // 경우 2: 자식 1개
    if (!root.left) return root.right;
    if (!root.right) return root.left;

    // 경우 3: 자식 2개 → 후계자(우측 최솟값)
    const successor = findMin(root.right);
    root.value = successor.value;
    root.right = delete(root.right, successor.value);
  }
  return root;
}`

// Code highlight line mapping (1-indexed, per operation)
const INSERT_CODE_LINES: Record<BSTStep['action'], number[]> = {
  compare:              [7, 9],
  'go-left':            [8],
  'go-right':           [10],
  insert:               [3],
  found:                [],
  'not-found':          [3],
  'delete-leaf':        [],
  'delete-one-child':   [],
  'delete-two-children':[],
  successor:            [],
}

const SEARCH_CODE_LINES: Record<BSTStep['action'], number[]> = {
  compare:              [7],
  'go-left':            [12],
  'go-right':           [14],
  found:                [8],
  'not-found':          [3],
  insert:               [],
  'delete-leaf':        [],
  'delete-one-child':   [],
  'delete-two-children':[],
  successor:            [],
}

const DELETE_CODE_LINES: Record<BSTStep['action'], number[]> = {
  compare:              [6, 8],
  'go-left':            [7],
  'go-right':           [9],
  'delete-leaf':        [12],
  'delete-one-child':   [15, 16],
  'delete-two-children':[19],
  successor:            [20, 21],
  found:                [],
  'not-found':          [3],
  insert:               [],
}

// ── Visual state computation ──────────────────────────────────────────────────

interface VisualState {
  activeNodeId: number | null
  visitedNodeIds: Set<number>
  highlightPath: number[]
  insertedNodeId: number | null
  deletedNodeId: number | null
}

function computeVisualState(
  steps: BSTStep[],
  upTo: number,
): VisualState {
  const visitedNodeIds = new Set<number>()
  const pathIds: number[] = []
  let activeNodeId: number | null = null
  let insertedNodeId: number | null = null
  let deletedNodeId: number | null = null

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    if (step.nodeId >= 0) {
      visitedNodeIds.add(step.nodeId)
      activeNodeId = step.nodeId
    }
    if (step.action === 'compare' || step.action === 'go-left' || step.action === 'go-right') {
      if (step.nodeId >= 0) pathIds.push(step.nodeId)
    }
    if (step.action === 'insert') insertedNodeId = step.nodeId
    if (step.action === 'delete-leaf' || step.action === 'delete-one-child' || step.action === 'delete-two-children') {
      deletedNodeId = step.nodeId
    }
  }

  return { activeNodeId, visitedNodeIds, highlightPath: pathIds, insertedNodeId, deletedNodeId }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BSTVisualizer() {
  const t = useTranslations('bstVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Tree state
  const [nodes, setNodes] = useState<Map<number, BSTNode>>(new Map())
  const [root, setRoot] = useState<number | null>(null)

  // Operation state
  const [operation, setOperation] = useState<OperationType>('insert')
  const [inputValue, setInputValue] = useState<string>('42')
  const [treeSize, setTreeSize] = useState<number>(10)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result (steps + nodes snapshot after operation)
  const [opResult, setOpResult] = useState<{
    steps: BSTStep[]
    nodesAfter: Map<number, BSTNode>
    rootAfter: number | null
  } | null>(null)

  const isRunning = currentStepIndex >= 0
  const totalSteps = opResult?.steps.length ?? 0

  // Nodes displayed depend on whether we are replaying
  const displayNodes = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return nodes
    // During playback, show the state AFTER operation (nodes are already updated)
    return opResult.nodesAfter
  }, [opResult, currentStepIndex, nodes])

  const displayRoot = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return root
    return opResult.rootAfter
  }, [opResult, currentStepIndex, root])

  // Visual state
  const visualState = useMemo<VisualState>(() => {
    if (!opResult || currentStepIndex < 0) {
      return { activeNodeId: null, visitedNodeIds: new Set(), highlightPath: [], insertedNodeId: null, deletedNodeId: null }
    }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  // Execute operation
  const executeOperation = useCallback(() => {
    const val = parseInt(inputValue, 10)
    if (isNaN(val) || val < 1 || val > 999) return

    let steps: BSTStep[] = []
    let nodesAfter: Map<number, BSTNode>
    let rootAfter: number | null

    if (operation === 'insert') {
      const res = insertBST(nodes, root, val)
      steps = res.steps
      nodesAfter = res.nodes
      rootAfter = res.root
    } else if (operation === 'search') {
      const res = searchBST(nodes, root, val)
      steps = res.steps
      nodesAfter = nodes  // search doesn't modify
      rootAfter = root
    } else {
      const res = deleteBST(nodes, root, val)
      steps = res.steps
      nodesAfter = res.nodes
      rootAfter = res.root
    }

    setOpResult({ steps, nodesAfter, rootAfter })
    setCurrentStepIndex(0)
    setIsPlaying(false)

    // For search/delete, also apply structural changes after viewing
    if (operation !== 'search') {
      setNodes(nodesAfter)
      setRoot(rootAfter)
    }
  }, [inputValue, nodes, root, operation])

  // Batch build
  const buildBatch = useCallback((type: 'random' | 'sorted' | 'balanced') => {
    const gen =
      type === 'random'   ? generateRandomValues(treeSize, 1, 99) :
      type === 'sorted'   ? generateSortedValues(treeSize) :
                            generateBalancedValues(treeSize)
    const res = buildBST(gen)
    setNodes(res.nodes)
    setRoot(res.root)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
  }, [treeSize])

  // Clear tree
  const clearTree = useCallback(() => {
    setNodes(new Map())
    setRoot(null)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
  }, [])

  // Play
  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) executeOperation()
    setIsPlaying(true)
  }, [currentStepIndex, executeOperation])

  // Auto-play
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 500 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, interval)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, totalSteps])

  // Reset playback (keep tree)
  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setOpResult(null)
  }, [])

  // Code highlight
  const codeHighlightLines = useMemo(() => {
    if (!opResult || currentStepIndex < 0 || currentStepIndex >= opResult.steps.length) return []
    const step = opResult.steps[currentStepIndex]
    const map = operation === 'insert' ? INSERT_CODE_LINES : operation === 'search' ? SEARCH_CODE_LINES : DELETE_CODE_LINES
    return map[step.action] ?? []
  }, [opResult, currentStepIndex, operation])

  const currentStep = opResult?.steps[currentStepIndex] ?? null

  // Stats
  const nodeCount = getNodeCount(nodes)
  const treeHeight = getTreeHeight(nodes, root)
  const comparisons = currentStep?.comparisons ?? 0

  const currentCode = operation === 'insert' ? BST_INSERT_CODE : operation === 'search' ? BST_SEARCH_CODE : BST_DELETE_CODE
  const codeTitle = operation === 'insert' ? 'bst-insert.js' : operation === 'search' ? 'bst-search.js' : 'bst-delete.js'

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const operations: { key: OperationType; label: string }[] = [
    { key: 'insert', label: t('operation.insert') },
    { key: 'search', label: t('operation.search') },
    { key: 'delete', label: t('operation.delete') },
  ]

  return (
    <div className="space-y-6">
      {/* Title bar */}
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

      {/* Main split layout: 3/5 left + 2/5 right */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* ── Left column ── */}
        <div className="xl:col-span-3 space-y-4">
          {/* Canvas */}
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {/* Controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) executeOperation()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            {/* Tree canvas */}
            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <BSTCanvas2D
                  nodes={displayNodes}
                  root={displayRoot}
                  activeNodeId={visualState.activeNodeId}
                  visitedNodeIds={visualState.visitedNodeIds}
                  highlightPath={visualState.highlightPath}
                  insertedNodeId={visualState.insertedNodeId}
                  deletedNodeId={visualState.deletedNodeId}
                  width={680}
                  height={380}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.nodeCount')}: <strong className="text-blue-600 dark:text-blue-400">{nodeCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.treeHeight')}: <strong className="text-purple-600 dark:text-purple-400">{treeHeight}</strong>
              </span>
              {isRunning && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.comparisons')}: <strong className="text-amber-600 dark:text-amber-400">{comparisons}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Operation + batch panel */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* Operation selector */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.operation')}</p>
              <div className="flex gap-2">
                {operations.map(op => (
                  <button
                    key={op.key}
                    onClick={() => { setOperation(op.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      operation === op.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value input + execute */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  {t('controls.value')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeOperation()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={executeOperation}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap"
              >
                {t('controls.execute')}
              </button>
            </div>

            {/* Batch build */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t('controls.treeSize')} ({treeSize})
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    value={treeSize}
                    onChange={e => setTreeSize(Number(e.target.value))}
                    className="flex-1 accent-blue-600"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => buildBatch('random')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors"
                >
                  🎲 {t('controls.random')}
                </button>
                <button
                  onClick={() => buildBatch('sorted')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/50 dark:border-amber-700/30 transition-colors"
                >
                  📈 {t('controls.sorted')}
                </button>
                <button
                  onClick={() => buildBatch('balanced')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-700/30 transition-colors"
                >
                  ⚖️ {t('controls.balanced')}
                </button>
                <button
                  onClick={clearTree}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors"
                >
                  🗑️ {t('controls.clear')}
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500/80" />
                {t('grid.active')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                {t('grid.visited')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                {t('grid.inserted')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                {t('grid.deleted')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right column (sticky) ── */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl overflow-hidden">
              {/* Tabs */}
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
                {/* Steps tab */}
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {t('stepsGuide.description')}
                    </p>

                    {/* Step legend */}
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {(
                        [
                          ['compare',              'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',     t('stepsGuide.compare')],
                          ['go-left',              'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', t('stepsGuide.goLeft')],
                          ['go-right',             'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', t('stepsGuide.goRight')],
                          ['insert',               'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', t('stepsGuide.insert')],
                          ['found',                'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400', t('stepsGuide.found')],
                          ['not-found',            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',         t('stepsGuide.notFound')],
                        ] as [string, string, string][]
                      ).map(([key, cls, label]) => (
                        <div key={key} className={`px-2 py-1 rounded text-[10px] font-medium ${cls}`}>
                          {label}
                        </div>
                      ))}
                    </div>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('stepsGuide.hint')}
                      </p>
                    ) : (
                      <BSTStepsList
                        steps={opResult?.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                      />
                    )}
                  </div>
                )}

                {/* Code tab */}
                {activeTab === 'code' && (
                  <CodeViewer
                    code={currentCode}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title={codeTitle}
                  />
                )}

                {activeTab === 'guide' && (
                  <GuideSection namespace="bstVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Steps list sub-component ──────────────────────────────────────────────────

function BSTStepsList({
  steps,
  currentIndex,
  onStepClick,
}: {
  steps: BSTStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps.map((step, originalIndex) => ({ ...step, originalIndex }))
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

  const ACTION_STYLE: Record<BSTStep['action'], string> = {
    compare:              'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'go-left':            'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'go-right':           'bg-orange-50 dark:bg-orange-900/20 border-orange-300/50 dark:border-orange-700/40',
    insert:               'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    found:                'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
    'not-found':          'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'delete-leaf':        'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'delete-one-child':   'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'delete-two-children':'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    successor:            'bg-sky-50 dark:bg-sky-900/20 border-sky-300/50 dark:border-sky-700/40',
  }

  const ACTION_BADGE: Record<BSTStep['action'], string> = {
    compare:              'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'go-left':            'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'go-right':           'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    insert:               'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    found:                'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'not-found':          'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'delete-leaf':        'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'delete-one-child':   'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'delete-two-children':'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    successor:            'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
  }

  const ACTION_LABEL: Record<BSTStep['action'], string> = {
    compare:              '비교',
    'go-left':            '← 왼쪽',
    'go-right':           '오른쪽 →',
    insert:               '삽입',
    found:                '발견',
    'not-found':          '없음',
    'delete-leaf':        '단말 삭제',
    'delete-one-child':   '단일 자식 삭제',
    'delete-two-children':'두 자식 삭제',
    successor:            '후계자',
  }

  const windowStart = Math.max(0, currentIndex - 10)
  const windowEnd = Math.min(displaySteps.length - 1, currentIndex + 20)
  const windowSteps = displaySteps.slice(windowStart, windowEnd + 1)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
          ... 이전 {windowStart}개 단계 ...
        </div>
      )}
      {windowSteps.map(step => {
        const isCurrent = step.originalIndex === currentIndex
        const isActive = step.originalIndex <= currentIndex

        return (
          <div
            key={step.originalIndex}
            data-active={isCurrent ? 'true' : undefined}
            onClick={() => onStepClick(step.originalIndex)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent
                ? ACTION_STYLE[step.action]
                : isActive
                  ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                  : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[step.action]}`}>
                {ACTION_LABEL[step.action]}
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                {step.nodeId >= 0 ? `노드 #${step.nodeId} (값: ${step.value})` : `값 ${step.value} 없음`}
              </span>
              <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                깊이 {step.depth >= 0 ? step.depth : '-'}
              </span>
            </div>
            {step.comparisons > 0 && (
              <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                비교 횟수: <strong className="text-amber-600 dark:text-amber-400">{step.comparisons}</strong>
              </div>
            )}
          </div>
        )
      })}
      {windowEnd < displaySteps.length - 1 && (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
          ... 이후 {displaySteps.length - 1 - windowEnd}개 단계 ...
        </div>
      )}
    </div>
  )
}
