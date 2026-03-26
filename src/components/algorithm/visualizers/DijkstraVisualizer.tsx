'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type CellType,
  type DijkstraStep,
  type DijkstraResult,
  type WeightType,
  dijkstra,
  generateWeights,
  generateMaze,
  createEmptyGrid,
} from '@/utils/algorithm/dijkstra'
import { aStar, type AStarResult } from '@/utils/algorithm/aStar'
import DijkstraCanvas2D from './DijkstraCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'

type VisualizerMode = 'dijkstra' | 'compare'
type DrawMode = 'wall' | 'erase' | 'start' | 'goal'
type TabKey = 'steps' | 'code'

const DEFAULT_ROWS = 15
const DEFAULT_COLS = 20
const DEFAULT_START: [number, number] = [1, 1]
const DEFAULT_GOAL: [number, number] = [13, 18]

const DIJKSTRA_CODE = `// 다익스트라 최단경로 알고리즘
function dijkstra(grid, start, goal) {
  const dist = new Map();         // 거리 테이블
  const pq = new PriorityQueue(); // 거리 기준
  dist.set(start, 0);
  pq.add(start, 0);

  while (!pq.isEmpty()) {
    const current = pq.poll();    // 최소 거리 노드

    if (current === goal) {
      return reconstructPath();   // 최단 경로 발견!
    }

    for (const neighbor of getNeighbors(current)) {
      const newDist = dist[current] + weight(neighbor);

      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        pq.addOrUpdate(neighbor, newDist);
      }
    }
  }
  return null;  // 경로 없음
}`

// openCells: Map<"row,col", distance>, closedCells: Map<"row,col", distance>
interface VisualState {
  openCells: Map<string, number>
  closedCells: Map<string, number>
  pathCells: Set<string>
  currentCell: { row: number; col: number } | null
  visitedCount: number
  openSetSize: number
  foundPath: boolean
}

function computeVisualState(steps: DijkstraStep[], upTo: number): VisualState {
  const openCells = new Map<string, number>()
  const closedCells = new Map<string, number>()
  const pathCells = new Set<string>()
  let currentCell: { row: number; col: number } | null = null
  let visitedCount = 0
  let openSetSize = 0
  let foundPath = false

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    const key = `${step.row},${step.col}`

    if (step.action === 'visit') {
      closedCells.set(key, step.distance)
      openCells.delete(key)
      currentCell = { row: step.row, col: step.col }
      visitedCount = step.closedSetSize
      openSetSize = step.openSetSize
    } else if (step.action === 'enqueue' || step.action === 'update') {
      if (!closedCells.has(key)) {
        openCells.set(key, step.distance)
      }
      openSetSize = step.openSetSize
    } else if (step.action === 'path') {
      pathCells.add(key)
      foundPath = true
    }
  }

  return { openCells, closedCells, pathCells, currentCell, visitedCount, openSetSize, foundPath }
}

// Convert A* result steps into the same open/closed Map format for comparison
function computeAStarVisualState(
  astarResult: AStarResult | null,
  upTo: number
): VisualState {
  const openCells = new Map<string, number>()
  const closedCells = new Map<string, number>()
  const pathCells = new Set<string>()
  let currentCell: { row: number; col: number } | null = null
  let visitedCount = 0
  let openSetSize = 0
  let foundPath = false

  if (!astarResult) return { openCells, closedCells, pathCells, currentCell, visitedCount, openSetSize, foundPath }

  for (let i = 0; i <= upTo && i < astarResult.steps.length; i++) {
    const step = astarResult.steps[i]
    const key = `${step.row},${step.col}`

    if (step.action === 'visit') {
      // Use g as distance proxy
      closedCells.set(key, step.g)
      openCells.delete(key)
      currentCell = { row: step.row, col: step.col }
      visitedCount = step.closedSetSize
      openSetSize = step.openSetSize
    } else if (step.action === 'enqueue' || step.action === 'update') {
      if (!closedCells.has(key)) {
        openCells.set(key, step.g)
      }
      openSetSize = step.openSetSize
    } else if (step.action === 'path') {
      pathCells.add(key)
      foundPath = true
    }
  }

  return { openCells, closedCells, pathCells, currentCell, visitedCount, openSetSize, foundPath }
}

const EMPTY_VISUAL: VisualState = {
  openCells: new Map(),
  closedCells: new Map(),
  pathCells: new Set(),
  currentCell: null,
  visitedCount: 0,
  openSetSize: 0,
  foundPath: false,
}

export default function DijkstraVisualizer() {
  const t = useTranslations('dijkstraVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Grid state
  const [grid, setGrid] = useState<CellType[][]>(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS))
  const [start, setStart] = useState<[number, number]>(DEFAULT_START)
  const [goal, setGoal] = useState<[number, number]>(DEFAULT_GOAL)
  const [gridSize, setGridSize] = useState(DEFAULT_ROWS)

  // Weight state
  const [weightType, setWeightType] = useState<WeightType>('uniform')
  const [weights, setWeights] = useState<number[][]>(() =>
    generateWeights(DEFAULT_ROWS, DEFAULT_COLS, 'uniform')
  )

  // Feature toggles
  const [allowDiagonal, setAllowDiagonal] = useState(false)
  const [showWeights, setShowWeights] = useState(true)
  const [showDistances, setShowDistances] = useState(false)

  // Mode and UI
  const [vizMode, setVizMode] = useState<VisualizerMode>('dijkstra')
  const [drawMode, setDrawMode] = useState<DrawMode>('wall')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Algorithm results
  const [dijkstraResult, setDijkstraResult] = useState<DijkstraResult | null>(null)
  const [astarResult, setAStarResult] = useState<AStarResult | null>(null)

  const totalSteps = useMemo(() => {
    if (vizMode === 'compare') {
      return Math.max(
        dijkstraResult?.steps.length ?? 0,
        astarResult?.steps.length ?? 0
      )
    }
    return dijkstraResult?.steps.length ?? 0
  }, [vizMode, dijkstraResult, astarResult])

  // Compute visual states
  const dijkstraVisual = useMemo(() => {
    if (!dijkstraResult || currentStepIndex < 0) return EMPTY_VISUAL
    return computeVisualState(dijkstraResult.steps, currentStepIndex)
  }, [dijkstraResult, currentStepIndex])

  const astarVisual = useMemo(() => {
    if (!astarResult || currentStepIndex < 0) return EMPTY_VISUAL
    return computeAStarVisualState(astarResult, currentStepIndex)
  }, [astarResult, currentStepIndex])

  // Run algorithms
  const runSearch = useCallback(() => {
    const dResult = dijkstra(grid, weights, start, goal, allowDiagonal)
    setDijkstraResult(dResult)

    if (vizMode === 'compare') {
      // For A* comparison, use uniform weights (A* doesn't support weights)
      const aResult = aStar(grid, start, goal, 'manhattan', allowDiagonal)
      setAStarResult(aResult)
    }

    setCurrentStepIndex(0)
  }, [grid, weights, start, goal, allowDiagonal, vizMode])

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
    setDijkstraResult(null)
    setAStarResult(null)
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
    setWeights(generateWeights(newRows, newCols, weightType))
    setStart([1, 1])
    setGoal([newRows - 2, newCols - 2])
  }, [handleReset, weightType])

  // Weight type change
  const handleWeightTypeChange = useCallback((type: WeightType) => {
    handleReset()
    setWeightType(type)
    setWeights(generateWeights(grid.length, grid[0].length, type))
  }, [handleReset, grid.length, grid[0]?.length])

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
    if (currentStepIndex < 0 || !dijkstraResult) return []
    if (currentStepIndex >= dijkstraResult.steps.length) return []
    const step = dijkstraResult.steps[currentStepIndex]
    if (step.action === 'visit') return [9]       // pq.poll()
    if (step.action === 'enqueue') return [20]    // pq.addOrUpdate()
    if (step.action === 'update') return [18, 19, 20]
    if (step.action === 'path') return [12]       // reconstructPath()
    return []
  }, [currentStepIndex, dijkstraResult])

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

  const weightTypes: { type: WeightType; label: string; icon: string }[] = [
    { type: 'uniform', label: t('weight.uniform'), icon: '⬜' },
    { type: 'random', label: t('weight.random'), icon: '🎲' },
    { type: 'terrain', label: t('weight.terrain'), icon: '🗺️' },
  ]

  const canvasWidth = vizMode === 'compare' ? 370 : 600
  const canvasHeight = vizMode === 'compare' ? 278 : 450

  // Final stats (at end of animation)
  const isFinished = dijkstraResult !== null && currentStepIndex >= dijkstraResult.steps.length - 1

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
          {(['dijkstra', 'compare'] as VisualizerMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setVizMode(mode); handleReset() }}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                vizMode === mode
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
            {vizMode === 'compare' ? (
              <div className="grid grid-cols-2 gap-2">
                {/* Dijkstra side */}
                <div className="space-y-1">
                  <div className="text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Dijkstra
                  </div>
                  <div className="flex justify-center">
                    <DijkstraCanvas2D
                      grid={grid}
                      weights={weights}
                      start={start}
                      goal={goal}
                      openCells={dijkstraVisual.openCells}
                      closedCells={dijkstraVisual.closedCells}
                      pathCells={dijkstraVisual.pathCells}
                      currentCell={dijkstraVisual.currentCell}
                      drawMode={drawMode}
                      onGridChange={handleGridChange}
                      onStartChange={handleStartChange}
                      onGoalChange={handleGoalChange}
                      isRunning={isRunning}
                      showWeights={showWeights && weightType !== 'uniform'}
                      showDistances={showDistances}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                  <div className="flex justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>
                      {t('stats.visited')}: <strong className="text-blue-600 dark:text-blue-400">{dijkstraVisual.visitedCount}</strong>
                    </span>
                    {dijkstraResult?.path && dijkstraVisual.foundPath && (
                      <span>
                        {t('stats.totalCost')}: <strong className="text-emerald-600 dark:text-emerald-400">{dijkstraResult.totalCost.toFixed(1)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* A* side */}
                <div className="space-y-1">
                  <div className="text-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                    A* (Manhattan)
                  </div>
                  <div className="flex justify-center">
                    <DijkstraCanvas2D
                      grid={grid}
                      weights={generateWeights(grid.length, grid[0].length, 'uniform')}
                      start={start}
                      goal={goal}
                      openCells={astarVisual.openCells}
                      closedCells={astarVisual.closedCells}
                      pathCells={astarVisual.pathCells}
                      currentCell={astarVisual.currentCell}
                      drawMode={drawMode}
                      onGridChange={handleGridChange}
                      onStartChange={handleStartChange}
                      onGoalChange={handleGoalChange}
                      isRunning={isRunning}
                      showWeights={false}
                      showDistances={false}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                  <div className="flex justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>
                      {t('stats.visited')}: <strong className="text-purple-600 dark:text-purple-400">{astarVisual.visitedCount}</strong>
                    </span>
                    {astarResult?.path && astarVisual.foundPath && (
                      <span>
                        {t('stats.pathLength')}: <strong className="text-emerald-600 dark:text-emerald-400">{astarResult.pathLength}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <DijkstraCanvas2D
                    grid={grid}
                    weights={weights}
                    start={start}
                    goal={goal}
                    openCells={dijkstraVisual.openCells}
                    closedCells={dijkstraVisual.closedCells}
                    pathCells={dijkstraVisual.pathCells}
                    currentCell={dijkstraVisual.currentCell}
                    drawMode={drawMode}
                    onGridChange={handleGridChange}
                    onStartChange={handleStartChange}
                    onGoalChange={handleGoalChange}
                    isRunning={isRunning}
                    showWeights={showWeights && weightType !== 'uniform'}
                    showDistances={showDistances}
                    width={600}
                    height={450}
                  />
                </div>

                {/* Stats bar */}
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.visited')}: <strong className="text-blue-600 dark:text-blue-400">{dijkstraVisual.visitedCount}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.openSet')}: <strong className="text-orange-600 dark:text-orange-400">{dijkstraVisual.openSetSize}</strong>
                  </span>
                  {dijkstraResult && isFinished && (
                    dijkstraResult.path ? (
                      <>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('stats.pathLength')}: <strong className="text-emerald-600 dark:text-emerald-400">{dijkstraResult.pathLength}</strong>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('stats.totalCost')}: <strong className="text-emerald-600 dark:text-emerald-400">{dijkstraResult.totalCost.toFixed(2)}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                          {t('stats.found')}
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

            {/* Weight type selector */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('weight.title')}</span>
              <div className="flex flex-wrap gap-2">
                {weightTypes.map(wt => (
                  <button
                    key={wt.type}
                    onClick={() => handleWeightTypeChange(wt.type)}
                    disabled={isRunning}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      weightType === wt.type
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } disabled:opacity-40`}
                  >
                    {wt.icon} {wt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowDiagonal}
                  onChange={e => { if (!isRunning) { handleReset(); setAllowDiagonal(e.target.checked) } }}
                  className="accent-blue-600"
                />
                {t('controls.diagonal')}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showWeights}
                  onChange={e => setShowWeights(e.target.checked)}
                  className="accent-blue-600"
                />
                {t('controls.showWeights')}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDistances}
                  onChange={e => setShowDistances(e.target.checked)}
                  className="accent-blue-600"
                />
                {t('controls.showDistances')}
              </label>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> {t('grid.start')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> {t('grid.goal')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-700 dark:bg-gray-400" /> {t('grid.wall')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900" /> {t('grid.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-800" /> {t('grid.open')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400" /> {t('grid.path')}</span>
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
                      {vizMode === 'compare'
                        ? t('stepsGuide.dijkstraDescription')
                        : t('stepsGuide.description')
                      }
                    </p>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('stepsGuide.description')}
                      </p>
                    ) : (
                      <StepsList
                        steps={dijkstraResult?.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={DIJKSTRA_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="dijkstra.js"
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
function StepsList({
  steps,
  currentIndex,
  onStepClick,
  t,
}: {
  steps: DijkstraStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Show visit, update, and path steps for cleaner display
  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action === 'visit' || s.action === 'update' || s.action === 'path')
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
                  : isActive
                    ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                    : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
            onClick={() => onStepClick(step.originalIndex)}
          >
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                isPath
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : isUpdate
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                    : isActive
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {isPath ? '→' : isUpdate ? '↻' : step.closedSetSize}
              </span>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {isPath
                  ? `${t('grid.path')}: (${step.row}, ${step.col})`
                  : isUpdate
                    ? t('stepsGuide.updated', { x: String(step.row), y: String(step.col) })
                    : t('stepsGuide.exploring', { x: String(step.row), y: String(step.col) })
                }
              </span>
              {!isPath && isActive && (
                <span className="ml-auto flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 tabular-nums">
                  {t('stepsGuide.distance', { dist: step.distance.toFixed(1) })}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
