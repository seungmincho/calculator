'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import {
  insertRB, deleteRB, buildRB, generateRandomValues,
  getTreeHeight, getNodeCount, getBlackHeight, getRotationCount, getRecolorCount,
  type RBNode, type RBStep,
} from '@/utils/algorithm/redBlackTree'
import RedBlackTreeCanvas2D from './RedBlackTreeCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type OperationType = 'insert' | 'delete'

const RB_INSERT_CODE = `function insert(root, value) {
  // 1. BST insert (new node is RED)
  let z = new Node(value, RED);
  bstInsert(root, z);

  // 2. Fix violations
  while (z.parent?.color === RED) {
    if (z.parent === z.grandparent.left) {
      const uncle = z.grandparent.right;
      if (uncle?.color === RED) {
        // Case 1: Uncle is RED → recolor
        z.parent.color = BLACK;
        uncle.color = BLACK;
        z.grandparent.color = RED;
        z = z.grandparent;
      } else {
        if (z === z.parent.right) {
          // Case 2: z is right child → left rotate
          z = z.parent;
          rotateLeft(z);
        }
        // Case 3: z is left child → right rotate
        z.parent.color = BLACK;
        z.grandparent.color = RED;
        rotateRight(z.grandparent);
      }
    } else { /* mirror */ }
  }
  root.color = BLACK;
}`

const RB_FIXUP_CODE = `// Left Rotation
function rotateLeft(x) {
  const y = x.right;
  x.right = y.left;
  if (y.left) y.left.parent = x;
  y.parent = x.parent;
  if (!x.parent) root = y;
  else if (x === x.parent.left)
    x.parent.left = y;
  else x.parent.right = y;
  y.left = x;
  x.parent = y;
}

// Recolor: flip colors
function recolor(node) {
  node.color = node.color === RED
    ? BLACK : RED;
}`

interface VisualState {
  activeNodeId: number | null
  visitedNodeIds: Set<number>
  highlightPath: number[]
  insertedNodeId: number | null
  deletedNodeId: number | null
  rotatingNodeId: number | null
  recoloringNodeId: number | null
}

function computeVisualState(steps: RBStep[], upTo: number): VisualState {
  const visitedNodeIds = new Set<number>()
  const pathIds: number[] = []
  let activeNodeId: number | null = null
  let insertedNodeId: number | null = null
  let deletedNodeId: number | null = null
  let rotatingNodeId: number | null = null
  let recoloringNodeId: number | null = null

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
    if (step.action === 'delete-node') deletedNodeId = step.nodeId
    if (step.action === 'rotate-left' || step.action === 'rotate-right') rotatingNodeId = step.nodeId
    if (step.action === 'recolor') recoloringNodeId = step.nodeId
  }

  return { activeNodeId, visitedNodeIds, highlightPath: pathIds, insertedNodeId, deletedNodeId, rotatingNodeId, recoloringNodeId }
}

export default function RedBlackTreeVisualizer() {
  const t = useTranslations('redBlackTreeVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<Map<number, RBNode>>(new Map())
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
    steps: RBStep[]
    nodesAfter: Map<number, RBNode>
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
      return { activeNodeId: null, visitedNodeIds: new Set(), highlightPath: [], insertedNodeId: null, deletedNodeId: null, rotatingNodeId: null, recoloringNodeId: null }
    }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  const executeOperation = useCallback(() => {
    const val = parseInt(inputValue, 10)
    if (isNaN(val) || val < 1 || val > 999) return

    let res
    if (operation === 'insert') {
      res = insertRB(nodes, root, val)
    } else {
      res = deleteRB(nodes, root, val)
    }

    setOpResult({ steps: res.steps, nodesAfter: res.nodes, rootAfter: res.root })
    setCurrentStepIndex(0)
    setIsPlaying(false)
    setNodes(res.nodes)
    setRoot(res.root)
  }, [inputValue, nodes, root, operation])

  const buildBatch = useCallback((count: number) => {
    const values = generateRandomValues(count, 1, 99)
    const res = buildRB(values)
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
    if (step.action === 'compare') return [3]
    if (step.action === 'insert') return [2, 3]
    if (step.action === 'recolor') return [11, 12, 13]
    if (step.action === 'rotate-left') return [17, 18]
    if (step.action === 'rotate-right') return [21, 22]
    return []
  }, [opResult, currentStepIndex])

  const nodeCount = getNodeCount(displayNodes)
  const treeHeight = getTreeHeight(displayNodes, displayRoot)
  const blackHeight = getBlackHeight(displayNodes, displayRoot)
  const rotations = opResult ? getRotationCount(opResult.steps) : 0
  const recolors = opResult ? getRecolorCount(opResult.steps) : 0

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
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-soft text-sub">
              {tHub('categories.dataStructure')}
            </span>
            <span className="text-xs text-gray-400">★★★</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
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
                <RedBlackTreeCanvas2D
                  nodes={displayNodes}
                  root={displayRoot}
                  activeNodeId={visualState.activeNodeId}
                  visitedNodeIds={visualState.visitedNodeIds}
                  highlightPath={visualState.highlightPath}
                  insertedNodeId={visualState.insertedNodeId}
                  deletedNodeId={visualState.deletedNodeId}
                  rotatingNodeId={visualState.rotatingNodeId}
                  recoloringNodeId={visualState.recoloringNodeId}
                  width={680}
                  height={380}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-sub">
                {t('stats.nodeCount')}: <strong className="text-blue-600 dark:text-blue-400">{nodeCount}</strong>
              </span>
              <span className="text-sub">
                {t('stats.treeHeight')}: <strong className="text-purple-600 dark:text-purple-400">{treeHeight}</strong>
              </span>
              <span className="text-sub">
                {t('stats.blackHeight')}: <strong className="text-body">{blackHeight}</strong>
              </span>
              {isRunning && (
                <>
                  <span className="text-sub">
                    {t('stats.rotations')}: <strong className="text-amber-600 dark:text-amber-400">{rotations}</strong>
                  </span>
                  <span className="text-sub">
                    {t('stats.recolors')}: <strong className="text-orange-600 dark:text-orange-400">{recolors}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted mb-2">{t('controls.operation')}</p>
              <div className="flex gap-2">
                {operations.map(op => (
                  <button key={op.key} onClick={() => { setOperation(op.key); handleReset() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      operation === op.key ? 'bg-blue-500 text-white' : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{op.label}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted mb-1 block">{t('controls.value')}</label>
                <input type="number" min={1} max={999} value={inputValue} onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeOperation()}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <button onClick={executeOperation}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                {t('controls.execute')}
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-muted whitespace-nowrap">{t('controls.treeSize')} ({treeSize})</label>
                <input type="range" min={5} max={30} value={treeSize} onChange={e => setTreeSize(Number(e.target.value))} className="flex-1 accent-blue-600" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => buildBatch(treeSize)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-subtle text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-line transition-colors">
                  🎲 {t('controls.random')}
                </button>
                <button onClick={clearTree}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                  🗑️ {t('controls.clear')}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />{t('legend.red')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-800 dark:bg-gray-300" />{t('legend.black')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500/80" />{t('legend.rotating')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500/80" />{t('legend.recoloring')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.inserted')}</span>
            </div>

            {/* Rules */}
            <div className="bg-subtle rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{t('rules')}</p>
              <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-0.5 list-disc list-inside">
                <li>{t('rule1')}</li>
                <li>{t('rule2')}</li>
                <li>{t('rule3')}</li>
                <li>{t('rule4')}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="flex border-b border-line">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-subtle'
                        : 'text-muted hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>{tab.label}</button>
                ))}
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-sub mb-3">{t('stepsGuide.description')}</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {([
                        ['compare', 'bg-soft text-sub', t('stepsGuide.compare')],
                        ['insert', 'bg-soft text-sub', t('stepsGuide.insert')],
                        ['recolor', 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', t('stepsGuide.recolor')],
                        ['rotate', 'bg-soft text-sub', t('stepsGuide.rotate')],
                      ] as [string, string, string][]).map(([key, cls, label]) => (
                        <div key={key} className={`px-2 py-1 rounded text-[10px] font-medium ${cls}`}>{label}</div>
                      ))}
                    </div>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-faint italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <RBStepsList steps={opResult?.steps} currentIndex={currentStepIndex} onStepClick={setCurrentStepIndex} />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => setShowInsertCode(true)}
                        className={`px-2 py-1 text-xs rounded ${showInsertCode ? 'bg-blue-500 text-white' : 'bg-soft text-body'}`}>
                        {t('code.insertTitle')}
                      </button>
                      <button onClick={() => setShowInsertCode(false)}
                        className={`px-2 py-1 text-xs rounded ${!showInsertCode ? 'bg-blue-500 text-white' : 'bg-soft text-body'}`}>
                        {t('code.fixupTitle')}
                      </button>
                    </div>
                    <CodeViewer
                      code={showInsertCode ? RB_INSERT_CODE : RB_FIXUP_CODE}
                      language="javascript"
                      highlightLines={showInsertCode ? codeHighlightLines : []}
                      title={showInsertCode ? 'rb-insert.js' : 'rb-fixup.js'}
                    />
                  </div>
                )}

                {activeTab === 'guide' && <GuideSection namespace="redBlackTreeVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Steps List Sub-component ─────────────────────────────────────────────────

function RBStepsList({ steps, currentIndex, onStepClick }: {
  steps: RBStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
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
    compare:        'bg-subtle border-line',
    'go-left':      'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'go-right':     'bg-subtle border-line',
    insert:         'bg-subtle border-line',
    recolor:        'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'rotate-left':  'bg-subtle border-line',
    'rotate-right': 'bg-subtle border-line',
    done:           'bg-subtle border-line',
    'delete-node':  'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'not-found':    'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
  }

  const ACTION_BADGE: Record<string, string> = {
    compare:        'bg-soft text-sub',
    'go-left':      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'go-right':     'bg-soft text-sub',
    insert:         'bg-soft text-sub',
    recolor:        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'rotate-left':  'bg-soft text-sub',
    'rotate-right': 'bg-soft text-sub',
    done:           'bg-soft text-sub',
    'delete-node':  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'not-found':    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  }

  const windowStart = Math.max(0, currentIndex - 10)
  const windowEnd = Math.min(displaySteps.length - 1, currentIndex + 20)
  const windowSteps = displaySteps.slice(windowStart, windowEnd + 1)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && <div className="text-xs text-faint text-center py-1">... {windowStart} steps above ...</div>}
      {windowSteps.map(step => {
        const isCurrent = step.originalIndex === currentIndex
        const isActive = step.originalIndex <= currentIndex
        const label = step.action

        return (
          <div key={step.originalIndex} data-active={isCurrent ? 'true' : undefined} onClick={() => onStepClick(step.originalIndex)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent ? (ACTION_STYLE[step.action] || '') : isActive ? 'border-line bg-subtle' : 'border-line opacity-40'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[step.action] || ''}`}>{label}</span>
              <span className="text-sub">
                {step.nodeId >= 0 ? `Node #${step.nodeId} (${step.value})` : `Value ${step.value}`}
              </span>
            </div>
          </div>
        )
      })}
      {windowEnd < displaySteps.length - 1 && <div className="text-xs text-faint text-center py-1">... {displaySteps.length - 1 - windowEnd} steps below ...</div>}
    </div>
  )
}
