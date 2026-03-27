'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  insertHead, insertTail, insertAtIndex,
  deleteHead, deleteTail, deleteAtIndex,
  searchList, reverseList, buildList, generateRandomValues, getListArray,
  type LLNode, type LLStep, type ListType,
} from '@/utils/algorithm/linkedList'
import LinkedListCanvas2D from './LinkedListCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type OperationType = 'insert-head' | 'insert-tail' | 'insert-index' | 'delete-head' | 'delete-tail' | 'delete-index' | 'search' | 'reverse'

const LL_INSERT_CODE = `// 단일 연결 리스트 삽입 (Head)
function insertHead(list, value) {
  const newNode = new Node(value);
  newNode.next = list.head;
  list.head = newNode;
  if (list.tail === null)
    list.tail = newNode;
}

// 삽입 (Tail)
function insertTail(list, value) {
  const newNode = new Node(value);
  if (list.tail !== null)
    list.tail.next = newNode;
  list.tail = newNode;
  if (list.head === null)
    list.head = newNode;
}`

const LL_DELETE_CODE = `// 삭제 (Head)
function deleteHead(list) {
  if (list.head === null) return;
  const old = list.head;
  list.head = old.next;
  if (list.head === null)
    list.tail = null;
}

// 삭제 (인덱스)
function deleteAt(list, index) {
  let prev = null, cur = list.head;
  for (let i = 0; i < index; i++) {
    prev = cur;
    cur = cur.next;
  }
  prev.next = cur.next;       // 포인터 재연결
  if (cur === list.tail)
    list.tail = prev;
}`

const LL_REVERSE_CODE = `// 리스트 뒤집기
function reverse(list) {
  let prev = null;
  let curr = list.head;
  list.tail = list.head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;  // 포인터 반전
    prev = curr;
    curr = next;
  }
  list.head = prev;
}`

interface VisualState {
  highlightNodes: Set<number>
  highlightEdges: Set<string>
  activeNodeId: number | null
  createdNodeId: number | null
  deletedNodeId: number | null
}

function computeVisualState(steps: LLStep[], upTo: number): VisualState {
  const hl = new Set<number>()
  const edges = new Set<string>()
  let active: number | null = null
  let created: number | null = null
  let deleted: number | null = null

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    for (const nid of step.highlightNodes) hl.add(nid)
    for (const [f, t] of step.highlightEdges) edges.add(`${f}-${t}`)
    if (step.action === 'traverse' || step.action === 'found') active = step.nodeId
    if (step.action === 'create') created = step.nodeId
    if (step.action === 'unlink') deleted = step.nodeId
  }

  return { highlightNodes: hl, highlightEdges: edges, activeNodeId: active, createdNodeId: created, deletedNodeId: deleted }
}

export default function LinkedListVisualizer() {
  const t = useTranslations('linkedListVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<Map<number, LLNode>>(new Map())
  const [head, setHead] = useState<number | null>(null)
  const [tail, setTail] = useState<number | null>(null)
  const [nextId, setNextId] = useState(0)
  const [listType, setListType] = useState<ListType>('singly')
  const [operation, setOperation] = useState<OperationType>('insert-head')
  const [inputValue, setInputValue] = useState('42')
  const [inputIndex, setInputIndex] = useState('0')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [opResult, setOpResult] = useState<{
    steps: LLStep[]
    nodesAfter: Map<number, LLNode>
    headAfter: number | null
    tailAfter: number | null
    nextIdAfter: number
  } | null>(null)

  const totalSteps = opResult?.steps.length ?? 0

  const displayNodes = useMemo(() => opResult && currentStepIndex >= 0 ? opResult.nodesAfter : nodes, [opResult, currentStepIndex, nodes])
  const displayHead = useMemo(() => opResult && currentStepIndex >= 0 ? opResult.headAfter : head, [opResult, currentStepIndex, head])
  const displayTail = useMemo(() => opResult && currentStepIndex >= 0 ? opResult.tailAfter : tail, [opResult, currentStepIndex, tail])

  const visualState = useMemo<VisualState>(() => {
    if (!opResult || currentStepIndex < 0) return { highlightNodes: new Set(), highlightEdges: new Set(), activeNodeId: null, createdNodeId: null, deletedNodeId: null }
    return computeVisualState(opResult.steps, currentStepIndex)
  }, [opResult, currentStepIndex])

  const executeOperation = useCallback(() => {
    const val = parseInt(inputValue, 10)
    const idx = parseInt(inputIndex, 10)
    let res: { steps: LLStep[]; head: number | null; tail: number | null; nodes: Map<number, LLNode> }
    let newNextId = nextId

    switch (operation) {
      case 'insert-head':
        if (isNaN(val)) return
        res = insertHead(nodes, head, tail, val, listType, nextId); newNextId = nextId + 1; break
      case 'insert-tail':
        if (isNaN(val)) return
        res = insertTail(nodes, head, tail, val, listType, nextId); newNextId = nextId + 1; break
      case 'insert-index':
        if (isNaN(val) || isNaN(idx)) return
        res = insertAtIndex(nodes, head, tail, val, idx, listType, nextId); newNextId = nextId + 1; break
      case 'delete-head':
        res = deleteHead(nodes, head, tail, listType); break
      case 'delete-tail':
        res = deleteTail(nodes, head, tail, listType); break
      case 'delete-index':
        if (isNaN(idx)) return
        res = deleteAtIndex(nodes, head, tail, idx, listType); break
      case 'search': {
        if (isNaN(val)) return
        const sr = searchList(nodes, head, val)
        res = { steps: sr.steps, head, tail, nodes }; break
      }
      case 'reverse':
        res = reverseList(nodes, head, tail, listType); break
      default: return
    }

    setOpResult({ steps: res.steps, nodesAfter: res.nodes, headAfter: res.head, tailAfter: res.tail, nextIdAfter: newNextId })
    setCurrentStepIndex(0)
    setIsPlaying(false)

    if (operation !== 'search') {
      setNodes(res.nodes); setHead(res.head); setTail(res.tail); setNextId(newNextId)
    }
  }, [inputValue, inputIndex, nodes, head, tail, nextId, listType, operation])

  const buildRandom = useCallback((count: number) => {
    const values = generateRandomValues(count)
    const res = buildList(values, listType)
    setNodes(res.nodes); setHead(res.head); setTail(res.tail); setNextId(res.nextId)
    setOpResult(null); setCurrentStepIndex(-1); setIsPlaying(false)
  }, [listType])

  const clearAll = useCallback(() => {
    setNodes(new Map()); setHead(null); setTail(null); setNextId(0)
    setOpResult(null); setCurrentStepIndex(-1); setIsPlaying(false)
  }, [])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) executeOperation()
    setIsPlaying(true)
  }, [currentStepIndex, executeOperation])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(50, 600 / speed)
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => { if (prev >= totalSteps - 1) { setIsPlaying(false); return prev } return prev + 1 })
      }, interval)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  const handleReset = useCallback(() => { setIsPlaying(false); setCurrentStepIndex(-1); setOpResult(null) }, [])

  const currentCode = operation === 'reverse' ? LL_REVERSE_CODE : operation.startsWith('delete') ? LL_DELETE_CODE : LL_INSERT_CODE
  const codeTitle = operation === 'reverse' ? 'linked-list-reverse.js' : operation.startsWith('delete') ? 'linked-list-delete.js' : 'linked-list-insert.js'

  const listArray = getListArray(displayNodes, displayHead)

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const needsValue = ['insert-head', 'insert-tail', 'insert-index', 'search'].includes(operation)
  const needsIndex = ['insert-index', 'delete-index'].includes(operation)

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
            <span className="text-xs text-gray-400">★☆☆</span>
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
                <LinkedListCanvas2D
                  nodes={displayNodes} head={displayHead} tail={displayTail}
                  listType={listType}
                  highlightNodes={visualState.highlightNodes}
                  highlightEdges={visualState.highlightEdges}
                  activeNodeId={visualState.activeNodeId}
                  createdNodeId={visualState.createdNodeId}
                  deletedNodeId={visualState.deletedNodeId}
                  width={680} height={listType === 'doubly' ? 180 : 150}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.length')}: <strong className="text-blue-600 dark:text-blue-400">{listArray.length}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.type')}: <strong className="text-purple-600 dark:text-purple-400">{listType === 'singly' ? t('controls.singly') : t('controls.doubly')}</strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                [{listArray.join(' → ')}]
              </span>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            {/* List type */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.listType')}</p>
              <div className="flex gap-2">
                {(['singly', 'doubly'] as ListType[]).map(lt => (
                  <button key={lt} onClick={() => { setListType(lt); clearAll() }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      listType === lt ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>{lt === 'singly' ? t('controls.singly') : t('controls.doubly')}</button>
                ))}
              </div>
            </div>

            {/* Operations */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.operation')}</p>
              <div className="grid grid-cols-4 gap-1">
                {([
                  ['insert-head', t('operation.insertHead')],
                  ['insert-tail', t('operation.insertTail')],
                  ['insert-index', t('operation.insertIndex')],
                  ['delete-head', t('operation.deleteHead')],
                  ['delete-tail', t('operation.deleteTail')],
                  ['delete-index', t('operation.deleteIndex')],
                  ['search', t('operation.search')],
                  ['reverse', t('operation.reverse')],
                ] as [OperationType, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => { setOperation(key); handleReset() }}
                    className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                      operation === key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              {needsValue && (
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.value')}</label>
                  <input type="number" min={0} max={999} value={inputValue} onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && executeOperation()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              )}
              {needsIndex && (
                <div className="w-20">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{t('controls.index')}</label>
                  <input type="number" min={0} max={99} value={inputIndex} onChange={e => setInputIndex(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              )}
              <button onClick={executeOperation}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors whitespace-nowrap">
                {t('controls.execute')}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => buildRandom(6)}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                🎲 {t('controls.random')}
              </button>
              <button onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                🗑️ {t('controls.clear')}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/80" />{t('legend.created')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500/80" />{t('legend.deleted')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400/80" />{t('legend.highlighted')}</span>
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
                      activeTab === tab.key ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400'
                    }`}>{tab.icon} {tab.label}</button>
                ))}
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('stepsGuide.description')}</p>
                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('stepsGuide.hint')}</p>
                    ) : opResult?.steps && (
                      <div className="space-y-1">
                        {opResult.steps.map((step, i) => {
                          const isCurrent = i === currentStepIndex
                          return (
                            <div key={i} data-active={isCurrent ? 'true' : undefined} onClick={() => setCurrentStepIndex(i)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50' : i <= currentStepIndex ? 'border-gray-200/50 dark:border-gray-700/50' : 'opacity-40 border-gray-200/30'
                              }`}>
                              <span className="text-gray-600 dark:text-gray-300">{step.description}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'code' && <CodeViewer code={currentCode} language="javascript" highlightLines={[]} title={codeTitle} />}
                {activeTab === 'guide' && <GuideSection namespace="linkedListVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
