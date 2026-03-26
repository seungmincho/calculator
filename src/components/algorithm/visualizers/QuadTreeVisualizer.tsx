'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  buildQuadTree,
  rangeSearch,
  type QuadTreeNode,
  type QuadTreeStep,
  type QuadTreeResult,
  type SearchResult,
  type Point,
  type Boundary,
  generateRandomPoints,
  generateClusteredPoints,
} from '@/utils/algorithm/quadTree'
import QuadTreeCanvas2D from './QuadTreeCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type VisMode = 'build' | 'search'
type TabKey = 'steps' | 'code' | 'guide'

const CANVAS_W = 560
const CANVAS_H = 420
const DEFAULT_BOUNDARY: Boundary = { x: CANVAS_W / 2, y: CANVAS_H / 2, w: CANVAS_W / 2, h: CANVAS_H / 2 }

// Canvas searchArea is top-left origin { x, y, w, h }
type CanvasSearchArea = { x: number; y: number; w: number; h: number }
const DEFAULT_POINT_COUNT = 50
const DEFAULT_CAPACITY = 4

const QUADTREE_CODE = `// 쿼드트리 삽입
function insert(node, point) {
  if (!contains(node.boundary, point)) {
    return false;                    // 범위 밖
  }

  if (node.points.length < capacity) {
    node.points.push(point);         // 삽입
    return true;
  }

  if (!node.divided) {
    subdivide(node);                 // 4분할
  }

  // 자식에 삽입 시도
  return node.ne.insert(point)
      || node.nw.insert(point)
      || node.se.insert(point)
      || node.sw.insert(point);
}`

const SEARCH_CODE = `// 쿼드트리 범위 검색
function rangeSearch(node, range) {
  const found = [];

  if (!intersects(node.boundary, range)) {
    return found;                    // 건너뛰기
  }

  for (const point of node.points) {
    if (contains(range, point)) {
      found.push(point);             // 발견!
    }
  }

  if (node.divided) {
    found.push(...rangeSearch(node.ne, range));
    found.push(...rangeSearch(node.nw, range));
    found.push(...rangeSearch(node.se, range));
    found.push(...rangeSearch(node.sw, range));
  }
  return found;
}`

// ── Visual state helpers ──────────────────────────────────────────────────────

interface VisualState {
  activeNodeIds: Set<number>
  skippedNodeIds: Set<number>
  foundPointIds: Set<number>
  insertedPointIds: Set<number>
  subdividedNodeIds: Set<number>
  currentNodeId: number | null
}

function computeVisualState(
  steps: QuadTreeStep[],
  upTo: number
): VisualState {
  const activeNodeIds = new Set<number>()
  const skippedNodeIds = new Set<number>()
  const foundPointIds = new Set<number>()
  const insertedPointIds = new Set<number>()
  const subdividedNodeIds = new Set<number>()
  let currentNodeId: number | null = null

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    if (step.action === 'insert') {
      if (step.point) insertedPointIds.add(step.point.id)
      activeNodeIds.add(step.nodeId)
      currentNodeId = step.nodeId
    } else if (step.action === 'subdivide') {
      subdividedNodeIds.add(step.nodeId)
      currentNodeId = step.nodeId
    } else if (step.action === 'search-check') {
      activeNodeIds.add(step.nodeId)
      currentNodeId = step.nodeId
    } else if (step.action === 'search-found') {
      activeNodeIds.add(step.nodeId)
      if (step.point) foundPointIds.add(step.point.id)
      currentNodeId = step.nodeId
    } else if (step.action === 'search-skip') {
      skippedNodeIds.add(step.nodeId)
    }
  }

  return { activeNodeIds, skippedNodeIds, foundPointIds, insertedPointIds, subdividedNodeIds, currentNodeId }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuadTreeVisualizer() {
  const t = useTranslations('quadTreeVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Points & tree state
  const [points, setPoints] = useState<Point[]>(() =>
    generateRandomPoints(DEFAULT_POINT_COUNT, CANVAS_W, CANVAS_H)
  )
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY)
  const [pointCount, setPointCount] = useState(DEFAULT_POINT_COUNT)
  const [mode, setMode] = useState<VisMode>('build')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Results
  const [buildResult, setBuildResult] = useState<QuadTreeResult | null>(null)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  // searchArea in canvas coords: top-left origin { x, y, w, h }
  const [searchArea, setSearchArea] = useState<CanvasSearchArea | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived
  const activeSteps: QuadTreeStep[] = useMemo(() => {
    if (mode === 'search') return searchResult?.steps ?? []
    return buildResult?.steps ?? []
  }, [mode, buildResult, searchResult])

  const totalSteps = activeSteps.length

  const visualState = useMemo(() => {
    if (currentStepIndex < 0) {
      return {
        activeNodeIds: new Set<number>(),
        skippedNodeIds: new Set<number>(),
        foundPointIds: new Set<number>(),
        insertedPointIds: new Set<number>(),
        subdividedNodeIds: new Set<number>(),
        currentNodeId: null,
      } as VisualState
    }
    return computeVisualState(activeSteps, currentStepIndex)
  }, [activeSteps, currentStepIndex])

  // Tree nodes to pass to canvas (frozen after build, updated live during search)
  const treeNodes: Map<number, QuadTreeNode> = useMemo(
    () => buildResult?.nodes ?? new Map(),
    [buildResult]
  )

  // ── Playback helpers ──────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsPlaying(false)
  }, [])

  const handleReset = useCallback(() => {
    stopPlayback()
    setCurrentStepIndex(-1)
    setSearchResult(null)
  }, [stopPlayback])

  const handleFullReset = useCallback(() => {
    handleReset()
    setBuildResult(null)
    setSearchArea(null)
  }, [handleReset])

  // Auto-play
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 150 / speed)
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, totalSteps])

  // ── Build tree ────────────────────────────────────────────────────────────

  const runBuild = useCallback(() => {
    const result = buildQuadTree(points, DEFAULT_BOUNDARY, capacity)
    setBuildResult(result)
    setSearchResult(null)
    setCurrentStepIndex(0)
  }, [points, capacity])

  const handlePlay = useCallback(() => {
    if (mode === 'build') {
      if (!buildResult || currentStepIndex < 0) {
        runBuild()
      }
    } else {
      // Search mode: need build result and search area
      const saCanvas = searchArea ?? getDefaultSearchAreaCanvas()
      if (!searchArea) setSearchArea(saCanvas)
      const saBoundary = canvasAreaToBoundary(saCanvas)

      if (!buildResult) {
        const result = buildQuadTree(points, DEFAULT_BOUNDARY, capacity)
        setBuildResult(result)
        const sr = rangeSearch(result.nodes, saBoundary)
        setSearchResult(sr)
        setCurrentStepIndex(0)
        setIsPlaying(true)
        return
      }
      if (!searchResult || currentStepIndex < 0) {
        const sr = rangeSearch(buildResult.nodes, saBoundary)
        setSearchResult(sr)
        setCurrentStepIndex(0)
      }
    }
    setIsPlaying(true)
  }, [mode, buildResult, searchResult, currentStepIndex, runBuild, points, capacity, searchArea])

  // ── Point generators ──────────────────────────────────────────────────────

  const handleGenerateRandom = useCallback(() => {
    handleFullReset()
    setPoints(generateRandomPoints(pointCount, CANVAS_W, CANVAS_H))
  }, [pointCount, handleFullReset])

  const handleGenerateClustered = useCallback(() => {
    handleFullReset()
    setPoints(generateClusteredPoints(pointCount, 5, CANVAS_W, CANVAS_H))
  }, [pointCount, handleFullReset])

  const handleClear = useCallback(() => {
    handleFullReset()
    setPoints([])
  }, [handleFullReset])

  // Click to add point (x, y are world coords from canvas)
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (buildResult) return // don't add points during playback
    setPoints(prev => [...prev, { x, y, id: prev.length }])
  }, [buildResult])

  // ── Mode switch ───────────────────────────────────────────────────────────

  const handleModeChange = useCallback((newMode: VisMode) => {
    handleReset()
    setMode(newMode)
    if (newMode === 'build') {
      setBuildResult(null)
      setSearchArea(null)
    }
  }, [handleReset])

  // ── Code highlight lines ──────────────────────────────────────────────────

  const codeHighlightLines = useMemo(() => {
    if (currentStepIndex < 0 || currentStepIndex >= activeSteps.length) return []
    const step = activeSteps[currentStepIndex]
    if (mode === 'build') {
      if (step.action === 'insert') return [8]     // node.points.push(point)
      if (step.action === 'subdivide') return [13]  // subdivide(node)
      return []
    } else {
      if (step.action === 'search-skip') return [6]   // return found (건너뛰기)
      if (step.action === 'search-check') return [5]  // intersects check
      if (step.action === 'search-found') return [10] // found.push(point)
      return []
    }
  }, [currentStepIndex, activeSteps, mode])

  const isRunning = currentStepIndex >= 0

  // Final stats
  const stats = useMemo(() => {
    if (mode === 'build' && buildResult) {
      return {
        totalNodes: buildResult.totalNodes,
        totalPoints: buildResult.totalPoints,
        maxDepth: buildResult.maxDepth,
      }
    }
    if (mode === 'search' && searchResult) {
      return {
        found: searchResult.foundPoints.length,
        checked: searchResult.nodesChecked,
        skipped: searchResult.nodesSkipped,
      }
    }
    return null
  }, [mode, buildResult, searchResult])

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🌲', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
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

        {/* Mode toggle */}
        <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1">
          {(['build', 'search'] as VisMode[]).map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                mode === m
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main split layout */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: visualization (3/5) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {/* Playback controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) handlePlay()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            {/* Canvas */}
            <div className="flex justify-center">
              <QuadTreeCanvas2D
                nodes={treeNodes}
                points={points}
                activeNodeId={visualState.currentNodeId}
                highlightedNodes={visualState.activeNodeIds}
                skippedNodes={visualState.skippedNodeIds}
                foundPoints={visualState.foundPointIds}
                searchArea={searchArea}
                insertingPoint={null}
                onCanvasClick={mode === 'build' && !isRunning ? handleCanvasClick : undefined}
                width={CANVAS_W}
                height={CANVAS_H}
              />
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {mode === 'build' && buildResult && (
                <>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.totalNodes')}: <strong className="text-emerald-600 dark:text-emerald-400">{buildResult.totalNodes}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.totalPoints')}: <strong className="text-blue-600 dark:text-blue-400">{buildResult.totalPoints}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.maxDepth')}: <strong className="text-purple-600 dark:text-purple-400">{buildResult.maxDepth}</strong>
                  </span>
                </>
              )}
              {mode === 'search' && searchResult && currentStepIndex >= 0 && (
                <>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.found')}: <strong className="text-emerald-600 dark:text-emerald-400">{searchResult.foundPoints.length}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.checked')}: <strong className="text-blue-600 dark:text-blue-400">{searchResult.nodesChecked}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.skipped')}: <strong className="text-gray-500 dark:text-gray-400">{searchResult.nodesSkipped}</strong>
                  </span>
                </>
              )}
              {mode === 'build' && !buildResult && (
                <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                  {t('stats.totalPoints')}: {points.length}
                </span>
              )}
            </div>
          </div>

          {/* Tool buttons */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            {/* Generate buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerateRandom}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40"
              >
                🎲 {t('controls.random')}
              </button>
              <button
                onClick={handleGenerateClustered}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
              >
                🫧 {t('controls.clustered')}
              </button>
              <button
                onClick={handleClear}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                🗑️ {t('controls.clear')}
              </button>
              {mode === 'search' && (
                <>
                  <div className="w-px h-6 bg-gray-300/50 dark:bg-gray-600/50 self-center" />
                  <span className="px-3 py-1.5 text-xs rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    🔍 {t('controls.drawSearch')}
                  </span>
                </>
              )}
            </div>

            {/* Sliders */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{t('controls.pointCount')}</span>
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={pointCount}
                  onChange={e => setPointCount(Number(e.target.value))}
                  disabled={isRunning}
                  className="flex-1 accent-blue-600 disabled:opacity-40"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right tabular-nums">{pointCount}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{t('controls.capacity')}</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={capacity}
                  onChange={e => { setCapacity(Number(e.target.value)); if (buildResult) handleFullReset() }}
                  disabled={isRunning}
                  className="flex-1 accent-emerald-600 disabled:opacity-40"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right tabular-nums">{capacity}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm border border-emerald-500/50 bg-transparent" />
                {t('grid.boundary')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-400" />
                {t('grid.point')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-400/30 border border-amber-500" />
                {t('grid.activeNode')}
              </span>
              {mode === 'search' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-amber-200/50 border border-amber-400 border-dashed" />
                    {t('grid.searchArea')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    {t('grid.foundPoint')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-gray-300/30 dark:bg-gray-600/30" />
                    {t('grid.skippedNode')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: explanation panel (2/5, sticky) */}
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
                        ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {t('stepsGuide.description')}
                    </p>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {mode === 'build' ? t('stepsGuide.insert') : t('stepsGuide.searchCheck')}
                      </p>
                    ) : (
                      <QuadTreeStepsList
                        steps={activeSteps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        mode={mode}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={mode === 'search' ? SEARCH_CODE : QUADTREE_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title={mode === 'search' ? 'rangeSearch.js' : 'quadTree.js'}
                  />
                )}

                {activeTab === 'guide' && (
                  <GuideSection namespace="quadTreeVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper: default search area (top-left origin, canvas coords) ─────────────

function getDefaultSearchAreaCanvas(): CanvasSearchArea {
  return {
    x: CANVAS_W / 3,
    y: CANVAS_H / 3,
    w: CANVAS_W / 3,
    h: CANVAS_H / 3,
  }
}

/** Convert top-left canvas rect to center-based Boundary for rangeSearch */
function canvasAreaToBoundary(area: CanvasSearchArea): Boundary {
  return {
    x: area.x + area.w / 2,
    y: area.y + area.h / 2,
    w: area.w / 2,
    h: area.h / 2,
  }
}

// ── Steps list sub-component ──────────────────────────────────────────────────

function QuadTreeStepsList({
  steps,
  currentIndex,
  onStepClick,
  mode,
  t,
}: {
  steps: QuadTreeStep[]
  currentIndex: number
  onStepClick: (i: number) => void
  mode: VisMode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s =>
        s.action === 'insert' ||
        s.action === 'subdivide' ||
        s.action === 'search-found' ||
        s.action === 'search-skip' ||
        s.action === 'search-check'
      )
      .slice(0, 200) // cap for large trees
  }, [steps])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      const container = listRef.current
      const elTop = (activeEl as HTMLElement).offsetTop
      const elH = (activeEl as HTMLElement).offsetHeight
      if (elTop < container.scrollTop) container.scrollTop = elTop
      else if (elTop + elH > container.scrollTop + container.clientHeight) container.scrollTop = elTop + elH - container.clientHeight
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  function actionLabel(step: QuadTreeStep): string {
    switch (step.action) {
      case 'insert':      return t('stepsGuide.insert')
      case 'subdivide':   return t('stepsGuide.subdivide')
      case 'search-check': return t('stepsGuide.searchCheck')
      case 'search-found': return t('stepsGuide.searchFound')
      case 'search-skip':  return t('stepsGuide.searchSkip')
      default:            return step.action
    }
  }

  function actionColors(action: QuadTreeStep['action']): { dot: string; border: string; bg: string } {
    switch (action) {
      case 'insert':
        return { dot: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', border: 'border-blue-200/50 dark:border-blue-700/30', bg: '' }
      case 'subdivide':
        return { dot: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400', border: 'border-purple-200/50 dark:border-purple-700/30', bg: '' }
      case 'search-check':
        return { dot: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', border: 'border-amber-200/50 dark:border-amber-700/30', bg: '' }
      case 'search-found':
        return { dot: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-700/30', bg: '' }
      case 'search-skip':
        return { dot: 'bg-gray-100 dark:bg-gray-700 text-gray-500', border: 'border-gray-200/30 dark:border-gray-700/30', bg: '' }
      default:
        return { dot: 'bg-gray-200 dark:bg-gray-700 text-gray-500', border: 'border-gray-200/30', bg: '' }
    }
  }

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex || (
          step.originalIndex < currentIndex &&
          (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex
        )
        const colors = actionColors(step.action)
        const icon =
          step.action === 'insert' ? '•' :
          step.action === 'subdivide' ? '⊞' :
          step.action === 'search-check' ? '?' :
          step.action === 'search-found' ? '✓' :
          step.action === 'search-skip' ? '✕' : '·'

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent
                ? `${colors.border} bg-white/60 dark:bg-gray-800/60 ring-1 ring-inset ring-emerald-400/30`
                : isActive
                  ? `${colors.border} bg-gray-50/30 dark:bg-gray-800/20`
                  : 'border-gray-200/20 dark:border-gray-700/20 opacity-35'
            }`}
            onClick={() => onStepClick(step.originalIndex)}
          >
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${colors.dot}`}>
                {icon}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {actionLabel(step)}
              </span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 tabular-nums">
                d{step.depth}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
