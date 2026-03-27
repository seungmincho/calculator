'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  buildTrie, insertWord, searchWord, autocomplete,
  DEFAULT_WORDS, type TrieNode, type TrieOperation, type TrieStep,
} from '@/utils/algorithm/trie'
import TrieCanvas2D from './TrieCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

const INSERT_CODE = `// Trie Insert — O(m), m = word length
function insert(root, word) {
  let node = root;
  for (const char of word) {
    if (!node.children[char]) {
      node.children[char] = new TrieNode();
    }
    node = node.children[char]; // traverse
  }
  node.isEnd = true;            // mark end
}`

const SEARCH_CODE = `// Trie Search — O(m)
function search(root, word) {
  let node = root;
  for (const char of word) {
    if (!node.children[char]) {
      return false;              // char not found
    }
    node = node.children[char];  // traverse
  }
  return node.isEnd;             // must be end
}`

const AUTOCOMPLETE_CODE = `// Trie Autocomplete — O(m + k)
function autocomplete(root, prefix) {
  let node = root;
  // 1. Navigate to prefix end
  for (const char of prefix) {
    if (!node.children[char]) return [];
    node = node.children[char];
  }
  // 2. DFS to collect all words
  const results = [];
  function dfs(node, path) {
    if (node.isEnd) results.push(path);
    for (const [ch, child] of node.children) {
      dfs(child, path + ch);
    }
  }
  dfs(node, prefix);
  return results;
}`

const CODE_MAP: Record<TrieOperation, string> = {
  insert: INSERT_CODE, search: SEARCH_CODE, autocomplete: AUTOCOMPLETE_CODE,
}
const CODE_TITLE: Record<TrieOperation, string> = {
  insert: 'trie-insert.js', search: 'trie-search.js', autocomplete: 'trie-autocomplete.js',
}

const INSERT_LINES: Record<TrieStep['action'], number[]> = {
  traverse: [8], create: [5, 6], 'mark-end': [10], found: [], 'not-found': [],
  'autocomplete-collect': [], 'autocomplete-done': [],
}
const SEARCH_LINES: Record<TrieStep['action'], number[]> = {
  traverse: [8], create: [], 'mark-end': [], found: [10], 'not-found': [6],
  'autocomplete-collect': [], 'autocomplete-done': [],
}
const AUTOCOMPLETE_LINES: Record<TrieStep['action'], number[]> = {
  traverse: [5, 12], create: [], 'mark-end': [], found: [], 'not-found': [5],
  'autocomplete-collect': [11], 'autocomplete-done': [15],
}
const LINE_MAP: Record<TrieOperation, Record<TrieStep['action'], number[]>> = {
  insert: INSERT_LINES, search: SEARCH_LINES, autocomplete: AUTOCOMPLETE_LINES,
}

export default function TrieVisualizer() {
  const t = useTranslations('trieVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [nodes, setNodes] = useState<Map<number, TrieNode>>(new Map())
  const [rootId, setRootId] = useState(0)
  const [operation, setOperation] = useState<TrieOperation>('insert')
  const [inputWord, setInputWord] = useState('CARD')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchFound, setSearchFound] = useState<boolean | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [opResult, setOpResult] = useState<{ steps: TrieStep[] } | null>(null)
  const totalSteps = opResult?.steps.length ?? 0

  // Build initial trie
  const buildDefault = useCallback(() => {
    const { nodes: n, rootId: r } = buildTrie(DEFAULT_WORDS)
    setNodes(n)
    setRootId(r)
    setOpResult(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setSuggestions([])
    setSearchFound(null)
  }, [])

  useEffect(() => { buildDefault() }, [buildDefault])

  const executeOperation = useCallback(() => {
    const word = inputWord.toUpperCase().trim()
    if (!word) return

    let result
    if (operation === 'insert') {
      result = insertWord(nodes, rootId, word)
      setNodes(result.nodes)
    } else if (operation === 'search') {
      result = searchWord(nodes, rootId, word)
      setSearchFound(result.found ?? false)
    } else {
      result = autocomplete(nodes, rootId, word)
      setSuggestions(result.suggestions ?? [])
    }

    setOpResult({ steps: result.steps })
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [inputWord, nodes, rootId, operation])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) executeOperation()
    setIsPlaying(true)
  }, [currentStepIndex, executeOperation])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setOpResult(null)
    setSuggestions([])
    setSearchFound(null)
  }, [])

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

  const visitedNodeIds = useMemo(() => {
    if (!opResult || currentStepIndex < 0) return new Set<number>()
    const set = new Set<number>()
    for (let i = 0; i <= currentStepIndex && i < opResult.steps.length; i++) {
      set.add(opResult.steps[i].nodeId)
    }
    return set
  }, [opResult, currentStepIndex])

  const activeNodeId = currentStepIndex >= 0 && opResult ? opResult.steps[currentStepIndex]?.nodeId ?? -1 : -1
  const currentStep = opResult?.steps[currentStepIndex] ?? null

  const codeHighlightLines = useMemo(() => {
    if (!currentStep) return []
    return LINE_MAP[operation][currentStep.action] ?? []
  }, [currentStep, operation])

  const operations: { key: TrieOperation; label: string }[] = [
    { key: 'insert', label: t('operation.insert') },
    { key: 'search', label: t('operation.search') },
    { key: 'autocomplete', label: t('operation.autocomplete') },
  ]

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const ACTION_STYLE: Record<string, string> = {
    traverse:             'bg-blue-50 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-700/40',
    create:               'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'mark-end':           'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
    found:                'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-700/40',
    'not-found':          'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
    'autocomplete-collect':'bg-amber-50 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-700/40',
    'autocomplete-done':  'bg-purple-50 dark:bg-purple-900/20 border-purple-300/50 dark:border-purple-700/40',
  }
  const ACTION_BADGE: Record<string, string> = {
    traverse:             'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    create:               'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'mark-end':           'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    found:                'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    'not-found':          'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    'autocomplete-collect':'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'autocomplete-done':  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">
              {tHub('categories.string')}
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
                isPlaying={isPlaying} onPlay={handlePlay} onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => { if (currentStepIndex < 0) executeOperation(); else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1)) }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed} onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)} totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <TrieCanvas2D
                  nodes={nodes} rootId={rootId}
                  activeNodeId={activeNodeId} visitedNodeIds={visitedNodeIds}
                  width={680} height={400}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.nodeCount')}: <strong className="text-pink-600 dark:text-pink-400">{nodes.size}</strong>
              </span>
              {searchFound !== null && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.searchResult')}: <strong className={searchFound ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {searchFound ? t('stats.found') : t('stats.notFound')}
                  </strong>
                </span>
              )}
              {suggestions.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stats.suggestions')}: <strong className="text-amber-600 dark:text-amber-400">{suggestions.join(', ')}</strong>
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
                      operation === op.key ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>{op.label}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  {operation === 'autocomplete' ? t('controls.prefix') : t('controls.word')}
                </label>
                <input type="text" value={inputWord} maxLength={10}
                  onChange={e => setInputWord(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && executeOperation()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono" />
              </div>
              <button onClick={executeOperation}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg font-medium hover:from-pink-700 hover:to-rose-700 transition-colors whitespace-nowrap">
                {t('controls.execute')}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={buildDefault}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                {t('controls.resetTrie')}
              </button>
              <div className="flex flex-wrap gap-1">
                {DEFAULT_WORDS.map(w => (
                  <span key={w} className="px-2 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{w}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-500/80" />{t('legend.active')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-200/80" />{t('legend.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400/80" />{t('legend.endNode')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-400/80" />{t('legend.root')}</span>
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
                      activeTab === tab.key ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-500 bg-pink-50/50 dark:bg-pink-900/20'
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
                      <StepsList steps={opResult?.steps} currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex} actionStyle={ACTION_STYLE} actionBadge={ACTION_BADGE} />
                    )}
                  </div>
                )}
                {activeTab === 'code' && <CodeViewer code={CODE_MAP[operation]} language="javascript" highlightLines={codeHighlightLines} title={CODE_TITLE[operation]} />}
                {activeTab === 'guide' && <GuideSection namespace="trieVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepsList({ steps, currentIndex, onStepClick, actionStyle, actionBadge }: {
  steps: TrieStep[] | undefined; currentIndex: number; onStepClick: (i: number) => void
  actionStyle: Record<string, string>; actionBadge: Record<string, string>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-active="true"]')
    if (el) { const c = listRef.current; const tp = (el as HTMLElement).offsetTop; const h = (el as HTMLElement).offsetHeight
      if (tp < c.scrollTop) c.scrollTop = tp; else if (tp + h > c.scrollTop + c.clientHeight) c.scrollTop = tp + h - c.clientHeight }
  }, [currentIndex])
  if (!steps || steps.length === 0) return null
  const ws = Math.max(0, currentIndex - 10), we = Math.min(steps.length - 1, currentIndex + 20)
  return (
    <div ref={listRef} className="space-y-1">
      {ws > 0 && <div className="text-xs text-gray-400 text-center py-1">... {ws} ...</div>}
      {steps.slice(ws, we + 1).map((step, wi) => {
        const idx = ws + wi; const isCur = idx === currentIndex; const isAct = idx <= currentIndex
        return (
          <div key={idx} data-active={isCur ? 'true' : undefined} onClick={() => onStepClick(idx)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${isCur ? (actionStyle[step.action] || '') : isAct ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${actionBadge[step.action] || ''}`}>{step.action}</span>
              <span className="text-gray-600 dark:text-gray-300 truncate">{step.description}</span>
            </div>
          </div>
        )
      })}
      {we < steps.length - 1 && <div className="text-xs text-gray-400 text-center py-1">... {steps.length - 1 - we} ...</div>}
    </div>
  )
}
