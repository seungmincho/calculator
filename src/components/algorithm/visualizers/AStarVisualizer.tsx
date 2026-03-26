'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type CellType,
  type AStarStep,
  type AStarResult,
  type HeuristicType,
  aStar,
  generateMaze,
  createEmptyGrid,
} from '@/utils/algorithm/aStar'
import {
  bfs,
  type SearchResult,
} from '@/utils/algorithm/bfsDfs'
import AStarCanvas2D from './AStarCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'

type AlgoMode = 'astar' | 'compare'
type DrawMode = 'wall' | 'erase' | 'start' | 'goal'
type TabKey = 'steps' | 'code'

const DEFAULT_ROWS = 15
const DEFAULT_COLS = 20
const DEFAULT_START: [number, number] = [1, 1]
const DEFAULT_GOAL: [number, number] = [13, 18]

const ASTAR_CODE = `// A* 경로탐색 알고리즘
function aStar(grid, start, goal, heuristic) {
  const openSet = new PriorityQueue();  // f값 기준
  openSet.add(start, f=0);
  const gScore = { start: 0 };

  while (!openSet.isEmpty()) {
    const current = openSet.poll();     // 최소 f값 노드

    if (current === goal) {
      return reconstructPath();         // 최단 경로 발견!
    }

    for (const neighbor of getNeighbors(current)) {
      const tentativeG = gScore[current] + cost(current, neighbor);

      if (tentativeG < gScore[neighbor]) {
        gScore[neighbor] = tentativeG;
        const f = tentativeG + heuristic(neighbor, goal);
        openSet.addOrUpdate(neighbor, f);
      }
    }
  }
  return null;  // 경로 없음
}`

// Maps cell key → {g, h, f}
type CostMap = Map<string, { g: number; h: number; f: number }>

interface AStarVisualState {
  openCells: CostMap
  closedCells: CostMap
  pathCells: Set<string>
  current: { row: number; col: number } | null
  visitedCount: number
  openSetSize: number
  foundPath: boolean
  totalCost: number
}

function computeAStarVisualState(
  steps: AStarStep[],
  upTo: number,
  pathLength: number,
  totalCost: number
): AStarVisualState {
  const openCells: CostMap = new Map()
  const closedCells: CostMap = new Map()
  const pathCells = new Set<string>()
  let current: { row: number; col: number } | null = null
  let visitedCount = 0
  let openSetSize = 0
  let foundPath = false
  let finalTotalCost = 0

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    const key = `${step.row},${step.col}`
    const costs = { g: step.g, h: step.h, f: step.f }

    if (step.action === 'visit') {
      closedCells.set(key, costs)
      openCells.delete(key)
      current = { row: step.row, col: step.col }
      visitedCount = step.closedSetSize
      openSetSize = step.openSetSize
    } else if (step.action === 'enqueue' || step.action === 'update') {
      if (!closedCells.has(key)) {
        openCells.set(key, costs)
      }
      openSetSize = step.openSetSize
    } else if (step.action === 'path') {
      pathCells.add(key)
      foundPath = true
      finalTotalCost = totalCost
    }
  }

  return {
    openCells,
    closedCells,
    pathCells,
    current,
    visitedCount,
    openSetSize,
    foundPath,
    totalCost: finalTotalCost,
  }
}

// Convert BFS SearchResult into a simplified visual state for compare mode
interface BfsCompareVisualState {
  visitedCells: Set<string>
  frontierCells: Set<string>
  pathCells: Set<string>
  current: { row: number; col: number } | null
  visitedCount: number
  foundPath: boolean
  pathLength: number
}

function computeBfsCompareState(
  result: SearchResult | null,
  upTo: number
): BfsCompareVisualState {
  const visitedCells = new Set<string>()
  const frontierCells = new Set<string>()
  const pathCells = new Set<string>()
  let current: { row: number; col: number } | null = null
  let visitedCount = 0
  let foundPath = false

  if (!result || upTo < 0) {
    return { visitedCells, frontierCells, pathCells, current, visitedCount, foundPath, pathLength: 0 }
  }

  for (let i = 0; i <= upTo && i < result.steps.length; i++) {
    const step = result.steps[i]
    const key = `${step.row},${step.col}`

    if (step.action === 'visit') {
      visitedCells.add(key)
      frontierCells.delete(key)
      current = { row: step.row, col: step.col }
      visitedCount = step.visitedCount
    } else if (step.action === 'enqueue') {
      if (!visitedCells.has(key)) {
        frontierCells.add(key)
      }
    } else if (step.action === 'path') {
      pathCells.add(key)
      foundPath = true
    }
  }

  return {
    visitedCells,
    frontierCells,
    pathCells,
    current,
    visitedCount,
    foundPath,
    pathLength: result.pathLength,
  }
}

export default function AStarVisualizer() {
  const t = useTranslations('aStarVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Grid state
  const [grid, setGrid] = useState<CellType[][]>(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS))
  const [start, setStart] = useState<[number, number]>(DEFAULT_START)
  const [goal, setGoal] = useState<[number, number]>(DEFAULT_GOAL)
  const [gridSize, setGridSize] = useState(DEFAULT_ROWS)

  // Algo options
  const [algoMode, setAlgoMode] = useState<AlgoMode>('astar')
  const [heuristic, setHeuristic] = useState<HeuristicType>('manhattan')
  const [allowDiagonal, setAllowDiagonal] = useState(false)
  const [showCosts, setShowCosts] = useState(false)

  // UI state
  const [drawMode, setDrawMode] = useState<DrawMode>('wall')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Results
  const [astarResult, setAstarResult] = useState<AStarResult | null>(null)
  const [bfsResult, setBfsResult] = useState<SearchResult | null>(null)

  const totalSteps = useMemo(() => {
    if (algoMode === 'compare') {
      return Math.max(astarResult?.steps.length ?? 0, bfsResult?.steps.length ?? 0)
    }
    return astarResult?.steps.length ?? 0
  }, [algoMode, astarResult, bfsResult])

  // A* visual state
  const astarVisual = useMemo((): AStarVisualState => {
    const empty: AStarVisualState = {
      openCells: new Map(),
      closedCells: new Map(),
      pathCells: new Set(),
      current: null,
      visitedCount: 0,
      openSetSize: 0,
      foundPath: false,
      totalCost: 0,
    }
    if (!astarResult || currentStepIndex < 0) return empty
    return computeAStarVisualState(
      astarResult.steps,
      currentStepIndex,
      astarResult.pathLength,
      astarResult.totalCost
    )
  }, [astarResult, currentStepIndex])

  // BFS visual state (compare mode)
  const bfsCompareVisual = useMemo((): BfsCompareVisualState => {
    return computeBfsCompareState(bfsResult, currentStepIndex)
  }, [bfsResult, currentStepIndex])

  // Run search
  const runSearch = useCallback(() => {
    const aRes = aStar(grid, start, goal, heuristic, allowDiagonal)
    setAstarResult(aRes)
    if (algoMode === 'compare') {
      const bRes = bfs(grid, start, goal)
      setBfsResult(bRes)
    }
    setCurrentStepIndex(0)
  }, [grid, start, goal, heuristic, allowDiagonal, algoMode])

  // Play
  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) {
      runSearch()
    }
    setIsPlaying(true)
  }, [currentStepIndex, runSearch])

  // Auto-play animation
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(20, 200 / speed)
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

  // Reset
  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setAstarResult(null)
    setBfsResult(null)
  }, [])

  // Clear walls
  const handleClearWalls = useCallback(() => {
    handleReset()
    setGrid(createEmptyGrid(grid.length, grid[0].length))
  }, [grid.length, grid[0]?.length, handleReset])

  // Random maze
  const handleRandomMaze = useCallback(() => {
    handleReset()
    setGrid(generateMaze(grid.length, grid[0].length))
  }, [grid.length, grid[0]?.length, handleReset])

  // Grid size change
  const handleGridSizeChange = useCallback((newRows: number) => {
    handleReset()
    const newCols = Math.round(newRows * (DEFAULT_COLS / DEFAULT_ROWS))
    setGridSize(newRows)
    setGrid(createEmptyGrid(newRows, newCols))
    setStart([1, 1])
    setGoal([newRows - 2, newCols - 2])
  }, [handleReset])

  // Grid/start/goal changes reset search
  const handleGridChange = useCallback((newGrid: CellType[][]) => {
    if (currentStepIndex >= 0) handleReset()
    setGrid(newGrid)
  }, [currentStepIndex, handleReset])

  const handleStartChange = useCallback((pos: [number, number]) => {
    if (currentStepIndex >= 0) handleReset()
    setStart(pos)
  }, [currentStepIndex, handleReset])

  const handleGoalChange = useCallback((pos: [number, number]) => {
    if (currentStepIndex >= 0) handleReset()
    setGoal(pos)
  }, [currentStepIndex, handleReset])

  // Code highlight lines
  const codeHighlightLines = useMemo(() => {
    if (!astarResult || currentStepIndex < 0 || currentStepIndex >= astarResult.steps.length) return []
    const step = astarResult.steps[currentStepIndex]
    if (step.action === 'visit') return [8]
    if (step.action === 'enqueue') return [19]
    if (step.action === 'update') return [16, 17, 19]
    if (step.action === 'path') return [11]
    return []
  }, [currentStepIndex, astarResult])

  const isRunning = currentStepIndex >= 0

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
  ]

  const drawModes: { mode: DrawMode; label: string; icon: string }[] = [
    { mode: 'wall', label: t('controls.drawWall'), icon: '🧱' },
    { mode: 'erase', label: t('controls.eraseWall'), icon: '🧹' },
    { mode: 'start', label: t('controls.setStart'), icon: '🟢' },
    { mode: 'goal', label: t('controls.setGoal'), icon: '🔴' },
  ]

  const heuristics: { type: HeuristicType; label: string }[] = [
    { type: 'manhattan', label: t('heuristic.manhattan') },
    { type: 'euclidean', label: t('heuristic.euclidean') },
    { type: 'chebyshev', label: t('heuristic.chebyshev') },
  ]

  const canvasWidth = algoMode === 'compare' ? 380 : 600
  const canvasHeight = algoMode === 'compare' ? 285 : 450

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              {tHub('categories.search')}
            </span>
            <span className="text-xs text-gray-400">★★☆</span>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1">
          {(['astar', 'compare'] as AlgoMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setAlgoMode(mode); handleReset() }}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                algoMode === mode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t(`mode.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main split layout */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* Left: visualization */}
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            {/* Heuristic + options row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Heuristic selector */}
              <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
                {heuristics.map(h => (
                  <button
                    key={h.type}
                    onClick={() => { setHeuristic(h.type); handleReset() }}
                    disabled={isRunning}
                    className={`px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-40 ${
                      heuristic === h.type
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              {/* Diagonal toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowDiagonal}
                  onChange={e => { setAllowDiagonal(e.target.checked); handleReset() }}
                  disabled={isRunning}
                  className="accent-blue-600 disabled:opacity-40"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('controls.diagonal')}</span>
              </label>
              {/* Show costs toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCosts}
                  onChange={e => setShowCosts(e.target.checked)}
                  className="accent-blue-600"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('controls.showCosts')}</span>
              </label>
            </div>

            {/* Controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) runSearch()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            {/* Canvas(es) */}
            {algoMode === 'compare' ? (
              <div className="grid grid-cols-2 gap-2">
                {/* A* side */}
                <div className="space-y-1">
                  <div className="text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                    A* ({t('mode.astar')})
                  </div>
                  <div className="flex justify-center">
                    <AStarCanvas2D
                      grid={grid}
                      start={start}
                      goal={goal}
                      openCells={astarVisual.openCells}
                      closedCells={astarVisual.closedCells}
                      pathCells={astarVisual.pathCells}
                      currentCell={astarVisual.current}
                      drawMode={drawMode}
                      onGridChange={handleGridChange}
                      onStartChange={handleStartChange}
                      onGoalChange={handleGoalChange}
                      isRunning={isRunning}
                      showCosts={showCosts}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                  <div className="flex justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>{t('stats.visited')}: <strong className="text-blue-600 dark:text-blue-400">{astarVisual.visitedCount}</strong></span>
                    {astarResult && astarVisual.foundPath && (
                      <span>{t('stats.totalCost')}: <strong className="text-emerald-600 dark:text-emerald-400">{astarResult.totalCost.toFixed(1)}</strong></span>
                    )}
                  </div>
                </div>
                {/* BFS side */}
                <div className="space-y-1">
                  <div className="text-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                    BFS (너비우선)
                  </div>
                  <div className="flex justify-center">
                    <AStarCanvas2D
                      grid={grid}
                      start={start}
                      goal={goal}
                      openCells={(() => {
                        const m: CostMap = new Map()
                        bfsCompareVisual.frontierCells.forEach(k => m.set(k, { g: 0, h: 0, f: 0 }))
                        return m
                      })()}
                      closedCells={(() => {
                        const m: CostMap = new Map()
                        bfsCompareVisual.visitedCells.forEach(k => m.set(k, { g: 0, h: 0, f: 0 }))
                        return m
                      })()}
                      pathCells={bfsCompareVisual.pathCells}
                      currentCell={bfsCompareVisual.current}
                      drawMode={drawMode}
                      onGridChange={handleGridChange}
                      onStartChange={handleStartChange}
                      onGoalChange={handleGoalChange}
                      isRunning={isRunning}
                      showCosts={false}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                  <div className="flex justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>{t('stats.visited')}: <strong className="text-purple-600 dark:text-purple-400">{bfsCompareVisual.visitedCount}</strong></span>
                    {bfsResult && bfsCompareVisual.foundPath && (
                      <span>{t('stats.pathLength')}: <strong className="text-emerald-600 dark:text-emerald-400">{bfsCompareVisual.pathLength}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <AStarCanvas2D
                    grid={grid}
                    start={start}
                    goal={goal}
                    openCells={astarVisual.openCells}
                    closedCells={astarVisual.closedCells}
                    pathCells={astarVisual.pathCells}
                    currentCell={astarVisual.current}
                    drawMode={drawMode}
                    onGridChange={handleGridChange}
                    onStartChange={handleStartChange}
                    onGoalChange={handleGoalChange}
                    isRunning={isRunning}
                    showCosts={showCosts}
                    width={600}
                    height={450}
                  />
                </div>
                {/* Stats bar */}
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.visited')}: <strong className="text-blue-600 dark:text-blue-400">{astarVisual.visitedCount}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.openSet')}: <strong className="text-yellow-600 dark:text-yellow-400">{astarVisual.openSetSize}</strong>
                  </span>
                  {astarResult && currentStepIndex >= astarResult.steps.length - 1 && (
                    astarResult.path ? (
                      <>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                          {t('stats.found')} ({t('stats.pathLength')}: {astarResult.pathLength})
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {t('stats.totalCost')}: <strong className="text-orange-600 dark:text-orange-400">{astarResult.totalCost.toFixed(1)}</strong>
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                        {t('stats.notFound')}
                      </span>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Tool buttons */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            {/* Draw mode buttons */}
            <div className="flex flex-wrap gap-2">
              {drawModes.map(dm => (
                <button
                  key={dm.mode}
                  onClick={() => setDrawMode(dm.mode)}
                  disabled={isRunning}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    drawMode === dm.mode
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-40`}
                >
                  {dm.icon} {dm.label}
                </button>
              ))}
              <div className="w-px h-6 bg-gray-300/50 dark:bg-gray-600/50 self-center" />
              <button
                onClick={handleClearWalls}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                {t('controls.clearWalls')}
              </button>
              <button
                onClick={handleRandomMaze}
                disabled={isRunning}
                className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-40"
              >
                🎲 {t('controls.randomMaze')}
              </button>
            </div>

            {/* Grid size slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('controls.gridSize')}</span>
              <input
                type="range"
                min={8}
                max={25}
                value={gridSize}
                onChange={e => handleGridSizeChange(Number(e.target.value))}
                disabled={isRunning}
                className="flex-1 accent-blue-600 disabled:opacity-40"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center tabular-nums">
                {gridSize} x {Math.round(gridSize * (DEFAULT_COLS / DEFAULT_ROWS))}
              </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('grid.start')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> {t('grid.goal')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-700 dark:bg-gray-400" /> {t('grid.wall')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900" /> {t('grid.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-300 dark:bg-yellow-800" /> {t('grid.open')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400" /> {t('grid.path')}</span>
            </div>
          </div>
        </div>

        {/* Right: explanation panel (sticky) */}
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
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {t('stepsGuide.description')}
                    </p>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('stepsGuide.exploring')}
                      </p>
                    ) : (
                      <AStarStepsList
                        steps={astarResult?.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={ASTAR_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="aStar.js"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Steps list sub-component
function AStarStepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: AStarStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Only show visit, update, and path steps for cleaner display
  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action === 'visit' || s.action === 'path' || s.action === 'update')
  }, [steps])

  // Auto-scroll to current step
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  return (
    <div ref={listRef} className="space-y-1">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent = step.originalIndex === currentIndex || (
          step.originalIndex < currentIndex &&
          (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex
        )
        const isPath = step.action === 'path'
        const isUpdate = step.action === 'update'

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent
                ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                : isPath
                  ? isActive
                    ? 'border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-700/30'
                    : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
                  : isUpdate
                    ? isActive
                      ? 'border-orange-300/50 bg-orange-50/30 dark:bg-orange-900/10 dark:border-orange-700/30'
                      : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
                    : isActive
                      ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                      : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
            onClick={() => onStepClick(step.originalIndex)}
          >
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                isPath
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : isUpdate
                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                    : isActive
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {isPath ? '→' : isUpdate ? '↑' : step.closedSetSize}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-700 dark:text-gray-300">
                  {isPath
                    ? `${t('grid.path')}: (${step.row}, ${step.col})`
                    : `(${step.row}, ${step.col})`
                  }
                </span>
                {!isPath && isActive && (
                  <div className="flex gap-2 mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                    <span>{t('stepsGuide.fCost')}: <strong className="text-purple-600 dark:text-purple-400">{step.f.toFixed(1)}</strong></span>
                    <span>{t('stepsGuide.gCost')}: <strong className="text-blue-600 dark:text-blue-400">{step.g.toFixed(1)}</strong></span>
                    <span>{t('stepsGuide.hCost')}: <strong className="text-orange-600 dark:text-orange-400">{step.h.toFixed(1)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
