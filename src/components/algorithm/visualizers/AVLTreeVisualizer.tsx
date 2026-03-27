'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  insertAVL, deleteAVL, buildAVL, generateRandomValues,
  getTreeHeight, getNodeCount, getRotationCount,
  type AVLNode, type AVLStep, type RotationType,
} from '@/utils/algorithm/avlTree'
import AVLTreeCanvas2D from './AVLTreeCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type OperationType = 'insert' | 'delete'

const AVL_INSERT_CODE = `function insert(node, value) {
  // 1. BST 삽입
  if (node === null) return new Node(value);
  if (value < node.value)
    node.left = insert(node.left, value);
  else if (value > node.value)
    node.right = insert(node.right, value);
  else return node;

  // 2. 높이 갱신
  node.height = 1 + max(height(left), height(right));

  // 3. 균형 인수 계산
  const bf = height(left) - height(right);

  // 4. 회전 (4가지 케이스)
  if (bf > 1 && value < left.value)   // LL
    return rotateRight(node);
  if (bf < -1 && value > right.value) // RR
    return rotateLeft(node);
  if (bf > 1 && value > left.value) { // LR
    node.left = rotateLeft(left);
    return rotateRight(node);
  }
  if (bf < -1 && value < right.value) { // RL
    node.right = rotateRight(right);
    return rotateLeft(node);
  }
  return node;
}`

const AVL_ROTATE_CODE = `// 오른쪽 회전 (LL 케이스)
function rotateRight(y) {
  const x = y.left;
  const T2 = x.right;
  x.right = y;
  y.left = T2;
  updateHeight(y);
  updateHeight(x);
  return x; // 새 루트
}

// 왼쪽 회전 (RR 케이스)
function rotateLeft(x) {
  const y = x.right;
  const T2 = y.left;
  y.left = x;
  x.right = T2;
  updateHeight(x);
  updateHeight(y);
  return y; // 새 루트
}`

interface VisualState {
  activeNodeId: number | null
  visitedNodeIds: Set<number>
  highlightPath: number[]
  insertedNodeId: number | null
  deletedNodeId: number | null
  rotatingNodeId: number | null
  rotationType: RotationType
}

function computeVisualState(steps: AVLStep[], upTo: number): VisualState {
  const visitedNodeIds = new Set<number>()
  const pathIds: number[] = []
  let activeNodeId: number | null = null
  let insertedNodeId: number | null = null
  let deletedNodeId: number | null = null
  let rotatingNodeId: number | null = null
  let rotationType: RotationType = null

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
    if (step.action === 'rotate') {
      rotatingNodeId = step.nodeId
      rotationType = step.rotation ?? null
    }
  }

  return { activeNodeId, visitedNodeIds, highlightPath: pathIds, insertedNodeId, deletedNodeId, rotatingNodeId, rotationType }
}

export default function AVLTreeVisualizer() {
  const t = useTranslations('avlTreeVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<Map<number, AVLNode>>(new Map())
  const [root, setRoot] = useState<number | null>(null)
  const [operation, setOperation] = useState<OperationType>('insert')
  const [inputValue, setInputValue] = useState('42')
  const [treeSize, setTreeSize] = useState(10)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [opResult, setOpResult] = useState<{
    steps: AVLStep[]
    nodesAfter: Map<number, AVLNode>
    rootAfter: number | null
  } | null>(null)

  const totalSteps = opResult?.steps.length ?? 0
  const isRunning = currentStepIndex >= 0

  const displayNodes = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return nodes
    return opResult.nodesAfter
  }, [opResult, currentStepIndex, nodes])

  const displayRoot = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return root
    return opResult.rootAfter
  }, [opResult, currentStepIndex, root])

  const visualState = useMemo<VisualState>(() => {
    if (!opResult || currentStepIndex < 0) {
      return { activeNodeId: null, visitedNodeIds: new Set(), highlightPath: [], insertedNodeId: null, deletedNodeId: null, rotatingNodeId: null, rotationType: null }
    }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  const executeOperation = useCallback(() => {
    const val = parseInt(inputValue, 10)
    if (isNaN(val) || val < 1 || val > 999) return

    let res
    if (operation === 'insert') {
      res = insertAVL(nodes, root, val)
    } else {
      res = deleteAVL(nodes, root, val)
    }

    setOpResult({ steps: res.steps, nodesAfter: res.nodes, rootAfter: res.root })
    setCurrentStepIndex(0)
    setIsPlaying(false)
    setNodes(res.nodes)
    setRoot(res.root)
  }, [inputValue, nodes, root, operation])

  const buildBatch = useCallback((count: number) => {
    const values = generateRandomValues(count, 1, 99)
    const res = buildAVL(values)
    setNodes(res.nodes)
    setRoot(res.root)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
  }, [])

  const clearTree = useCallback(() => {
    setNodes(new Map())
    setRoot(null)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
  }, [])

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
  }, [])

  const codeHighlightLines = useMemo(() => {
    if (!opResult || currentStepIndex < 0 || currentStepIndex >= opResult.steps.length) return []
    const step = opResult.steps[currentStepIndex]
    if (step.action === 'compare') return [4, 6]
    if (step.action === 'go-left') return [5]
    if (step.action === 'go-right') return [7]
    if (step.action === 'insert') return [3]
    if (step.action === 'update-height') return [11]
    if (step.action === 'check-balance') return [14]
    if (step.action === 'rotate') return [17, 19, 21, 24]
    return []
  }, [opResult, currentStepIndex])

  const currentStep = opResult?.steps[currentStepIndex] ?? null
  const nodeCount = getNodeCount(displayNodes)
  const treeHeight = getTreeHeight(displayNodes, displayRoot)
  const rotations = opResult ? getRotationCount(opResult.steps) : 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const operations: { key: OperationType; label: string }[] = [
    { key: 'insert', label: t('operation.insert') },
    { key: 'delete', label: t('operation.delete') },
  ]

  const [showInsertCode, setShowInsertCode] = useState(true)

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

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <AVLTreeCanvas2D
                  nodes={displayNodes}
                  root={displayRoot}
                  activeNodeId={visualState.activeNodeId}
                  visitedNodeIds={visualState.visitedNodeIds}
                  highlightPath={visualState.highlightPath}
                  insertedNodeId={visualState.insertedNodeId}
                  deletedNodeId={visualState.deletedNodeId}
                  rotatingNodeId={visualState.rotatingNodeId}
                  rotationType={visualState.rotationType}
                  width={680}
                  height={380}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.nodeCount')}: <strong className="text-blue-600 dark:text-blue-400">{nodeCount}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.treeHeight')}: <strong className="text-purple-600 dark:text-purple-400">{treeHeight}</strong>
              </span>
              {isRunning && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.rotations')}: <strong className="text-amber-600 dark:text-amber-400">{rotations}</strong>
                </span>
              )}
              {currentStep?.balanceFactor !== undefined && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.balanceFactor')}: <strong className={Math.abs(currentStep.balanceFactor) > 1 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {currentStep.balanceFactor}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
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

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.value')}</label>
                <input type="number" min={1} max={999} value={inputValue} onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeOperation()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <button onClick={executeOperation}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                {t('controls.execute')}
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('controls.treeSize')} ({treeSize})</label>
                <input type="range" min={5} max={30} value={treeSize} onChange={e => setTreeSize(Number(e.target.value))} className="flex-1 accent-blue-600" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => buildBatch(treeSize)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                  🎲 {t('controls.random')}
                </button>
                <button onClick={clearTree}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                  🗑️ {t('controls.clear')}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500/80" />{t('legend.rotating')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.inserted')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500/80" />{t('legend.deleted')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" />{t('legend.balanced')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />{t('legend.unbalanced')}</span>
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
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {([
                        ['compare', 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', t('stepsGuide.compare')],
                        ['rotate', 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400', t('stepsGuide.rotate')],
                        ['check-balance', 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', t('stepsGuide.checkBalance')],
                        ['insert', 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', t('stepsGuide.insert')],
                        ['update-height', 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400', t('stepsGuide.updateHeight')],
                      ] as [string, string, string][]).map(([key, cls, label]) => (
                        <div key={key} className={`px-2 py-1 rounded text-[10px] font-medium ${cls}`}>{label}</div>
                      ))}
                    </div>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <AVLStepsList steps={opResult?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => setShowInsertCode(true)}
                        className={`px-2 py-1 text-xs rounded ${showInsertCode ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                        {t('code.insertTitle')}
                      </button>
                      <button onClick={() => setShowInsertCode(false)}
                        className={`px-2 py-1 text-xs rounded ${!showInsertCode ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                        {t('code.rotateTitle')}
                      </button>
                    </div>
                    <CodeViewer
                      code={showInsertCode ? AVL_INSERT_CODE : AVL_ROTATE_CODE}
                      language="javascript"
                      highlightLines={showInsertCode ? codeHighlightLines : []}
                      title={showInsertCode ? 'avl-insert.js' : 'avl-rotate.js'}
                    />
                  </div>
                )}

                {activeTab === 'guide' && <GuideSection namespace="avlTreeVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AVLStepsList({ steps, currentIndex, onStepClick }: {
  steps: AVLStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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

  const ACTION_STYLE: Record<string, string> = {
    compare:       'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    'go-left':     'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'go-right':    'bg-orange-50 dark:bg-orange-900/20 border-orange-300/50 dark:border-orange-700/40',
    insert:        'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'check-balance':'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    rotate:        'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
    'update-height':'bg-sky-50 dark:bg-sky-900/20 border-sky-300/50 dark:border-sky-700/40',
    'not-found':   'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'delete-leaf': 'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'delete-one-child':'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'delete-two-children':'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    successor:     'bg-sky-50 dark:bg-sky-900/20 border-sky-300/50 dark:border-sky-700/40',
    found:         'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }

  const ACTION_BADGE: Record<string, string> = {
    compare:       'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'go-left':     'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'go-right':    'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    insert:        'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'check-balance':'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    rotate:        'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'update-height':'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
    'not-found':   'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'delete-leaf': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'delete-one-child':'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'delete-two-children':'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    successor:     'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
    found:         'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  const windowStart = Math.max(0, currentIndex - 10)
  const windowEnd = Math.min(displaySteps.length - 1, currentIndex + 20)
  const windowSteps = displaySteps.slice(windowStart, windowEnd + 1)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">... {windowStart} steps above ...</div>}
      {windowSteps.map(step => {
        const isCurrent = step.originalIndex === currentIndex
        const isActive = step.originalIndex <= currentIndex
        let label: string = step.action
        if (step.action === 'rotate' && step.rotation) label = `${step.rotation} Rotate`

        return (
          <div key={step.originalIndex} data-active={isCurrent ? 'true' : undefined} onClick={() => onStepClick(step.originalIndex)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? (ACTION_STYLE[step.action] || '') : isActive ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[step.action] || ''}`}>{label}</span>
              <span className="text-gray-600 dark:text-gray-300">
                {step.nodeId >= 0 ? `Node #${step.nodeId} (${step.value})` : `Value ${step.value}`}
              </span>
              {step.balanceFactor !== undefined && (
                <span className={`ml-auto text-[10px] font-bold ${Math.abs(step.balanceFactor) > 1 ? 'text-red-500' : 'text-emerald-500'}`}>
                  BF={step.balanceFactor}
                </span>
              )}
            </div>
          </div>
        )
      })}
      {windowEnd < displaySteps.length - 1 && <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">... {displaySteps.length - 1 - windowEnd} steps below ...</div>}
    </div>
  )
}
