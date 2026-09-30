'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import {
  hashTableInsert,
  hashTableSearch,
  generateEntries,
  simpleHash,
  type CollisionStrategy,
  type HashEntry,
  type HashTableStep,
} from '@/utils/algorithm/hashTable'
import HashTableCanvas2D from './HashTableCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

// ── Pseudocode ────────────────────────────────────────────────────────────────
const HASH_INSERT_CODE = `// 해시테이블 삽입
function insert(table, key, value) {
  const hash = simpleHash(key);       // 해시 계산
  const index = hash % table.size;    // 버킷 인덱스

  if (strategy === 'chaining') {
    // 체이닝: 리스트에 바로 추가
    table[index].push({ key, value });

  } else {
    // 오픈 어드레싱: 빈 슬롯 탐색
    let i = 0;
    while (table[probe(index, i)] !== null) {
      i++;  // 충돌! 다음 슬롯 탐색
    }
    table[probe(index, i)] = { key, value };
  }
}

// 선형 프로빙: probe(h, i) = (h + i) % size
// 이차 프로빙: probe(h, i) = (h + i²) % size

function simpleHash(key) {
  let h = 0;
  for (const ch of key) {
    h = (h + ch.charCodeAt(0)) % size;
  }
  return h;
}`

const HASH_SEARCH_CODE = `// 해시테이블 탐색
function search(table, key) {
  const hash = simpleHash(key);
  const index = hash % table.size;

  if (strategy === 'chaining') {
    // 체이닝: 해당 버킷의 리스트 순차 탐색
    for (const entry of table[index]) {
      if (entry.key === key) return entry.value;
    }
    return null;  // 없음

  } else {
    // 오픈 어드레싱: 프로브 시퀀스 따라가기
    let i = 0;
    while (table[probe(index, i)] !== null) {
      if (table[probe(index, i)].key === key) {
        return table[probe(index, i)].value;
      }
      i++;
    }
    return null;  // 빈 슬롯 만나면 종료
  }
}`

// ── Empty buckets factory ─────────────────────────────────────────────────────
function createEmpty(size: number): (HashEntry | null)[][] {
  return Array.from({ length: size }, () => [null])
}

export default function HashTableVisualizer() {
  const t = useTranslations('hashTableVisualizer')
  const tHub = useTranslations('algorithmHub')

  // ── State ─────────────────────────────────────────────────────────────────
  const [strategy, setStrategy] = useState<CollisionStrategy>('chaining')
  const [tableSize, setTableSize] = useState(10)
  const [keyInput, setKeyInput] = useState('')
  const [valueInput, setValueInput] = useState('')
  const [operationMode, setOperationMode] = useState<'insert' | 'search'>('insert')

  const [steps, setSteps] = useState<HashTableStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Persistent table state between operations
  const [persistentBuckets, setPersistentBuckets] = useState<(HashEntry | null)[][]>(() => createEmpty(10))

  // Stats
  const [insertedCount, setInsertedCount] = useState(0)
  const [collisionCount, setCollisionCount] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Current display state (step snapshot) ────────────────────────────────
  const currentStepData = steps[currentStep] ?? null

  // Derive buckets to display: use step snapshot if steps exist, else persistent
  const displayBuckets = currentStepData ? currentStepData.buckets : persistentBuckets

  // Probe sequence for canvas (open addressing only)
  const probeSequence = useMemo(() => {
    if (!currentStepData || strategy === 'chaining') return []
    // Collect all probeSequence buckets up to current step
    return steps
      .slice(0, currentStep + 1)
      .filter(s => s.action === 'probe' || s.action === 'collision')
      .map(s => s.bucketIndex)
  }, [steps, currentStep, strategy, currentStepData])

  // ── Auto-play ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000 / speed)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, steps.length])

  // ── Reset step when strategy/tableSize changes ────────────────────────────
  useEffect(() => {
    setSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
    setPersistentBuckets(createEmpty(tableSize))
    setInsertedCount(0)
    setCollisionCount(0)
  }, [strategy, tableSize])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleInsert = useCallback(() => {
    const key = keyInput.trim()
    if (!key) return
    const value = parseInt(valueInput) || Math.floor(Math.random() * 100) + 1

    const result = hashTableInsert([{ key, value }], tableSize, strategy)
    setSteps(result.steps)
    setCurrentStep(0)
    setIsPlaying(false)

    // Apply final bucket state to persistent
    if (result.steps.length > 0) {
      const finalBuckets = result.steps[result.steps.length - 1].buckets
      setPersistentBuckets(finalBuckets)
      // Count inserted items and collisions
      setInsertedCount(prev => prev + 1)
      const collisions = result.steps.filter(s => s.action === 'collision').length
      setCollisionCount(prev => prev + collisions)
    }

    setKeyInput('')
    setValueInput('')
  }, [keyInput, valueInput, tableSize, strategy])

  const handleSearch = useCallback(() => {
    const key = keyInput.trim()
    if (!key) return

    const result = hashTableSearch(persistentBuckets, key, strategy)
    setSteps(result.steps)
    setCurrentStep(0)
    setIsPlaying(false)
    setOperationMode('search')
    setKeyInput('')
  }, [keyInput, persistentBuckets, strategy])

  const handleBatchInsert = useCallback(() => {
    const count = Math.min(Math.floor(tableSize * 0.7), 8)
    const entries = generateEntries(count)

    const result = hashTableInsert(entries, tableSize, strategy)
    setSteps(result.steps)
    setCurrentStep(0)
    setIsPlaying(false)

    if (result.steps.length > 0) {
      const finalBuckets = result.steps[result.steps.length - 1].buckets
      setPersistentBuckets(finalBuckets)
      setInsertedCount(entries.length)
      const collisions = result.steps.filter(s => s.action === 'collision').length
      setCollisionCount(collisions)
    }
  }, [tableSize, strategy])

  const handleReset = useCallback(() => {
    setSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
    setPersistentBuckets(createEmpty(tableSize))
    setInsertedCount(0)
    setCollisionCount(0)
    setKeyInput('')
    setValueInput('')
  }, [tableSize])

  // ── Step info ─────────────────────────────────────────────────────────────
  const stepItems = useMemo(() =>
    steps.map((s, i) => ({
      action: s.action,
      message: s.message,
      index: i,
    })),
    [steps]
  )

  // ── Load factor ───────────────────────────────────────────────────────────
  const loadFactor = useMemo(() => {
    const occupied = strategy === 'chaining'
      ? persistentBuckets.reduce((sum, slot) => sum + slot.filter(e => e !== null).length, 0)
      : persistentBuckets.filter(slot => slot[0] !== null).length
    return occupied / tableSize
  }, [persistentBuckets, tableSize, strategy])

  // ── Code viewer ───────────────────────────────────────────────────────────
  const activeCode = operationMode === 'search' ? HASH_SEARCH_CODE : HASH_INSERT_CODE

  const codeHighlightLines = useMemo(() => {
    if (!currentStepData) return []
    switch (currentStepData.action) {
      case 'hash':    return [3, 4, 23, 24, 25, 26]
      case 'insert':  return strategy === 'chaining' ? [7, 8] : [13, 14, 16]
      case 'collision': return [12, 13]
      case 'probe':   return [13, 14]
      default:        return []
    }
  }, [currentStepData, strategy])

  // ── Action color helper ───────────────────────────────────────────────────
  const actionColor: Record<string, string> = {
    hash:       'bg-soft text-sub',
    insert:     'bg-soft text-sub',
    collision:  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    probe:      'bg-soft text-sub',
    found:      'bg-soft text-sub',
    'not-found':'bg-gray-100 dark:bg-gray-700/60 text-sub',
    resize:     'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  }

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  // ── Strategy selector labels ───────────────────────────────────────────────
  const strategyOptions: { value: CollisionStrategy; label: string; description: string }[] = [
    { value: 'chaining',          label: t('strategy.chaining'),         description: t('strategy.chainingDesc') },
    { value: 'linear-probing',    label: t('strategy.linearProbing'),     description: t('strategy.linearProbingDesc') },
    { value: 'quadratic-probing', label: t('strategy.quadraticProbing'),  description: t('strategy.quadraticProbingDesc') },
  ]

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-soft text-sub">
              {tHub('categories.dataStructure')}
            </span>
            <span className="text-xs text-gray-400">★★☆</span>
          </div>
        </div>
      </div>

      {/* ═══ 3/5 + 2/5 layout ═══ */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* ── 좌측: 시각화 (3/5) ── */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            {/* Controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={() => steps.length > 0 && setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))}
                onStepBack={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={currentStep}
                totalSteps={Math.max(1, steps.length)}
              />
            </div>

            {/* Canvas */}
            <div className="flex justify-center overflow-x-auto">
              <HashTableCanvas2D
                buckets={displayBuckets}
                activeKey={currentStepData?.key}
                activeHash={currentStepData?.hash}
                activeBucketIndex={currentStepData?.bucketIndex}
                probeSequence={probeSequence}
                strategy={strategy}
                width={620}
                height={340}
              />
            </div>

            {/* Current action badge */}
            {currentStepData && (
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${actionColor[currentStepData.action] ?? actionColor.hash}`}>
                <span className="mr-2">
                  {currentStepData.action === 'hash'       ? '#️⃣' :
                   currentStepData.action === 'insert'     ? '✅' :
                   currentStepData.action === 'collision'  ? '⚡' :
                   currentStepData.action === 'probe'      ? '🔎' :
                   currentStepData.action === 'found'      ? '🎯' :
                   currentStepData.action === 'not-found'  ? '❌' : '⚠️'}
                </span>
                {currentStepData.message}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface border border-line rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-fg">{insertedCount}</div>
              <div className="text-xs text-muted">{t('stats.insertedCount')}</div>
            </div>
            <div className="bg-surface border border-line rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{collisionCount}</div>
              <div className="text-xs text-muted">{t('stats.collisionCount')}</div>
            </div>
            <div className="bg-surface border border-line rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{(loadFactor * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted">{t('stats.loadFactor')}</div>
            </div>
          </div>

          {/* Parameters (접이식) */}
          <details className="bg-surface border border-line rounded-xl overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-body hover:bg-white/30 dark:hover:bg-gray-700/30">
              ⚙️ {t('params.title')}
            </summary>
            <div className="px-4 pb-4 space-y-3">
              {/* Table size */}
              <label className="flex items-center gap-2 text-xs text-sub">
                {t('params.tableSize')}
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={tableSize}
                  onChange={e => setTableSize(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <span className="w-8 text-center font-mono">{tableSize}</span>
              </label>
            </div>
          </details>
        </div>

        {/* ── 우측: 설명 패널 (2/5) ── */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            {/* Strategy selector */}
            <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-body">{t('strategySelector.title')}</h3>
              <div className="space-y-2">
                {strategyOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStrategy(opt.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      strategy === opt.value
                        ? 'bg-primary-soft text-primary border-primary'
                        : 'bg-white/50 dark:bg-gray-700/30 border-line hover:bg-white/80 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`text-sm font-medium ${strategy === opt.value ? 'text-sub' : 'text-body'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input controls */}
            <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-body">{t('input.title')}</h3>

              {/* Key + value */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleInsert() }}
                  placeholder={t('input.keyPlaceholder')}
                  className="flex-1 px-3 py-2 text-sm border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  maxLength={12}
                />
                <input
                  type="number"
                  value={valueInput}
                  onChange={e => setValueInput(e.target.value)}
                  placeholder={t('input.valuePlaceholder')}
                  className="w-20 px-3 py-2 text-sm border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Insert / Search buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setOperationMode('insert'); handleInsert() }}
                  disabled={!keyInput.trim()}
                  className="flex-1 py-2 text-sm font-medium bg-primary hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-all"
                >
                  {t('input.insertButton')}
                </button>
                <button
                  onClick={() => { setOperationMode('search'); handleSearch() }}
                  disabled={!keyInput.trim()}
                  className="flex-1 py-2 text-sm font-medium bg-primary hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-all"
                >
                  {t('input.searchButton')}
                </button>
              </div>

              {/* Batch insert */}
              <button
                onClick={handleBatchInsert}
                className="w-full py-2 text-sm font-medium bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg transition-colors"
              >
                🎲 {t('input.batchInsert')}
              </button>
            </div>

            {/* Tabs: Steps / Code / Guide */}
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              {/* Tab headers */}
              <div className="flex border-b border-line">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-white/80 dark:bg-gray-800/80 text-fg border-b-2 border-emerald-500'
                        : 'text-muted hover:bg-white/40 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Steps tab */}
              {activeTab === 'steps' && (
                <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                  {steps.length === 0 ? (
                    <p className="text-sm text-muted text-center py-4">
                      {t('stepsGuide.hint')}
                    </p>
                  ) : (
                    stepItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentStep(idx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                          idx === currentStep
                            ? 'bg-primary-soft text-primary border border-primary'
                            : idx < currentStep
                              ? 'bg-gray-50 dark:bg-gray-700/30 opacity-60'
                              : 'bg-white/40 dark:bg-gray-700/20'
                        }`}
                      >
                        <span className={`inline-block w-5 h-5 text-center leading-5 rounded-full text-white text-xs mr-2 ${
                          item.action === 'hash'      ? 'bg-indigo-500' :
                          item.action === 'insert'    ? 'bg-green-500' :
                          item.action === 'collision' ? 'bg-red-500' :
                          item.action === 'probe'     ? 'bg-violet-500' :
                          item.action === 'found'     ? 'bg-emerald-500' :
                          'bg-gray-400'
                        }`}>{idx + 1}</span>
                        <span className="text-body">{item.message}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Code tab */}
              {activeTab === 'code' && (
                <div className="p-4">
                  <CodeViewer
                    code={activeCode}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title={operationMode === 'search' ? 'hash-search.js' : 'hash-insert.js'}
                  />
                </div>
              )}

              {/* Guide tab */}
              {activeTab === 'guide' && (
                <div className="p-4">
                  <GuideSection namespace="hashTableVisualizer" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
