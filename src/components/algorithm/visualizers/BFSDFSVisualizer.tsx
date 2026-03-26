'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type CellType,
  type SearchResult,
  type SearchStep,
  bfs,
  dfs,
  generateMaze,
  createEmptyGrid,
} from '@/utils/algorithm/bfsDfs'
import BFSDFSCanvas2D from './BFSDFSCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'

type AlgoMode = 'bfs' | 'dfs' | 'both'
type DrawMode = 'wall' | 'erase' | 'start' | 'goal'
type TabKey = 'steps' | 'code'

const DEFAULT_ROWS = 15
const DEFAULT_COLS = 20
const DEFAULT_START: [number, number] = [1, 1]
const DEFAULT_GOAL: [number, number] = [13, 18]

const BFS_CODE = `// BFS 너비우선탐색
function bfs(grid, start, goal) {
  const queue = [start];      // FIFO 큐
  const visited = new Set();
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift();  // 앞에서 꺼냄

    if (current === goal) {
      return reconstructPath();   // 경로 발견!
    }

    for (const neighbor of getNeighbors(current)) {
      if (!visited.has(neighbor) && !isWall(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);     // 뒤에 추가
      }
    }
  }
  return null;  // 경로 없음
}`

const DFS_CODE = `// DFS 깊이우선탐색
function dfs(grid, start, goal) {
  const stack = [start];      // LIFO 스택
  const visited = new Set();

  while (stack.length > 0) {
    const current = stack.pop();   // 뒤에서 꺼냄

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === goal) {
      return reconstructPath();   // 경로 발견!
    }

    for (const neighbor of getNeighbors(current)) {
      if (!visited.has(neighbor) && !isWall(neighbor)) {
        stack.push(neighbor);     // 뒤에 추가
      }
    }
  }
  return null;  // 경로 없음
}`

function computeVisualState(steps: SearchStep[], upTo: number) {
  const visited = new Set<string>()
  const frontier = new Set<string>()
  const path = new Set<string>()
  let current: { row: number; col: number } | null = null
  let visitedCount = 0
  let frontierSize = 0
  let foundPath = false

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    const key = `${step.row},${step.col}`

    if (step.action === 'visit') {
      visited.add(key)
      frontier.delete(key)
      current = { row: step.row, col: step.col }
      visitedCount = step.visitedCount
      frontierSize = step.frontierSize
    } else if (step.action === 'enqueue') {
      if (!visited.has(key)) {
        frontier.add(key)
      }
      frontierSize = step.frontierSize
    } else if (step.action === 'path') {
      path.add(key)
      foundPath = true
    }
  }

  return { visited, frontier, path, current, visitedCount, frontierSize, foundPath }
}

export default function BFSDFSVisualizer() {
  const t = useTranslations('bfsDfsVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Grid state
  const [grid, setGrid] = useState<CellType[][]>(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS))
  const [start, setStart] = useState<[number, number]>(DEFAULT_START)
  const [goal, setGoal] = useState<[number, number]>(DEFAULT_GOAL)
  const [gridSize, setGridSize] = useState(DEFAULT_ROWS)

  // Algo state
  const [algoMode, setAlgoMode] = useState<AlgoMode>('bfs')
  const [drawMode, setDrawMode] = useState<DrawMode>('wall')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Search results (computed on play)
  const [bfsResult, setBfsResult] = useState<SearchResult | null>(null)
  const [dfsResult, setDfsResult] = useState<SearchResult | null>(null)

  const activeResult = algoMode === 'dfs' ? dfsResult : bfsResult
  const totalSteps = useMemo(() => {
    if (algoMode === 'both') {
      return Math.max(bfsResult?.steps.length ?? 0, dfsResult?.steps.length ?? 0)
    }
    return activeResult?.steps.length ?? 0
  }, [algoMode, bfsResult, dfsResult, activeResult])

  // Visual state computed from steps
  const bfsVisual = useMemo(() => {
    if (!bfsResult || currentStepIndex < 0) {
      return { visited: new Set<string>(), frontier: new Set<string>(), path: new Set<string>(), current: null, visitedCount: 0, frontierSize: 0, foundPath: false }
    }
    return computeVisualState(bfsResult.steps, currentStepIndex)
  }, [bfsResult, currentStepIndex])

  const dfsVisual = useMemo(() => {
    if (!dfsResult || currentStepIndex < 0) {
      return { visited: new Set<string>(), frontier: new Set<string>(), path: new Set<string>(), current: null, visitedCount: 0, frontierSize: 0, foundPath: false }
    }
    return computeVisualState(dfsResult.steps, currentStepIndex)
  }, [dfsResult, currentStepIndex])

  const currentVisual = algoMode === 'dfs' ? dfsVisual : bfsVisual

  // Run search
  const runSearch = useCallback(() => {
    const bfsRes = bfs(grid, start, goal)
    const dfsRes = dfs(grid, start, goal)
    setBfsResult(bfsRes)
    setDfsResult(dfsRes)
    setCurrentStepIndex(0)
  }, [grid, start, goal])

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
    setBfsResult(null)
    setDfsResult(null)
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
    if (currentStepIndex < 0) return []
    const result = algoMode === 'dfs' ? dfsResult : bfsResult
    if (!result || currentStepIndex >= result.steps.length) return []
    const step = result.steps[currentStepIndex]
    if (algoMode === 'dfs' || (algoMode === 'both')) {
      // DFS code lines
      if (step.action === 'visit') return [8]   // stack.pop()
      if (step.action === 'enqueue') return [17] // stack.push()
      if (step.action === 'path') return [13]    // return reconstructPath
    }
    // BFS code lines
    if (step.action === 'visit') return [8]      // queue.shift()
    if (step.action === 'enqueue') return [16]   // queue.push()
    if (step.action === 'path') return [11]      // return reconstructPath
    return []
  }, [currentStepIndex, algoMode, bfsResult, dfsResult])

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

  // Canvas sizing
  const canvasWidth = algoMode === 'both' ? 380 : 600
  const canvasHeight = algoMode === 'both' ? 285 : 450

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
            <span className="text-xs text-gray-400">★☆☆</span>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1">
          {(['bfs', 'dfs', 'both'] as AlgoMode[]).map(mode => (
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
            {algoMode === 'both' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                    BFS ({t('mode.bfs')})
                  </div>
                  <div className="flex justify-center">
                    <BFSDFSCanvas2D
                      grid={grid}
                      start={start}
                      goal={goal}
                      visitedCells={bfsVisual.visited}
                      frontierCells={bfsVisual.frontier}
                      pathCells={bfsVisual.path}
                      currentCell={bfsVisual.current}
                      drawMode={drawMode}
                      onGridChange={handleGridChange}
                      onStartChange={handleStartChange}
                      onGoalChange={handleGoalChange}
                      isRunning={isRunning}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                  {/* BFS stats */}
                  <div className="flex justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>{t('stats.visited')}: <strong className="text-blue-600 dark:text-blue-400">{bfsVisual.visitedCount}</strong></span>
                    {bfsResult && bfsResult.path && bfsVisual.foundPath && (
                      <span>{t('stats.pathLength')}: <strong className="text-emerald-600 dark:text-emerald-400">{bfsResult.pathLength}</strong></span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                    DFS ({t('mode.dfs')})
                  </div>
                  <div className="flex justify-center">
                    <BFSDFSCanvas2D
                      grid={grid}
                      start={start}
                      goal={goal}
                      visitedCells={dfsVisual.visited}
                      frontierCells={dfsVisual.frontier}
                      pathCells={dfsVisual.path}
                      currentCell={dfsVisual.current}
                      drawMode={drawMode}
                      onGridChange={handleGridChange}
                      onStartChange={handleStartChange}
                      onGoalChange={handleGoalChange}
                      isRunning={isRunning}
                      width={canvasWidth}
                      height={canvasHeight}
                    />
                  </div>
                  {/* DFS stats */}
                  <div className="flex justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>{t('stats.visited')}: <strong className="text-purple-600 dark:text-purple-400">{dfsVisual.visitedCount}</strong></span>
                    {dfsResult && dfsResult.path && dfsVisual.foundPath && (
                      <span>{t('stats.pathLength')}: <strong className="text-emerald-600 dark:text-emerald-400">{dfsResult.pathLength}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <BFSDFSCanvas2D
                    grid={grid}
                    start={start}
                    goal={goal}
                    visitedCells={currentVisual.visited}
                    frontierCells={currentVisual.frontier}
                    pathCells={currentVisual.path}
                    currentCell={currentVisual.current}
                    drawMode={drawMode}
                    onGridChange={handleGridChange}
                    onStartChange={handleStartChange}
                    onGoalChange={handleGoalChange}
                    isRunning={isRunning}
                    width={600}
                    height={450}
                  />
                </div>
                {/* Stats bar */}
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.visited')}: <strong className="text-blue-600 dark:text-blue-400">{currentVisual.visitedCount}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('stats.frontier')}: <strong className="text-yellow-600 dark:text-yellow-400">{currentVisual.frontierSize}</strong>
                  </span>
                  {activeResult && currentStepIndex >= activeResult.steps.length - 1 && (
                    activeResult.path ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                        {t('stats.found')} ({t('stats.pathLength')}: {activeResult.pathLength})
                      </span>
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
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-300 dark:bg-yellow-800" /> {t('grid.frontier')}</span>
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
                      {algoMode === 'dfs' ? t('stepsGuide.dfsDescription') : t('stepsGuide.bfsDescription')}
                    </p>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('stepsGuide.description')}
                      </p>
                    ) : (
                      <StepsList
                        steps={algoMode === 'dfs' ? dfsResult?.steps : bfsResult?.steps}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                        isDfs={algoMode === 'dfs'}
                        t={t}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <CodeViewer
                    code={algoMode === 'dfs' ? DFS_CODE : BFS_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title={algoMode === 'dfs' ? 'dfs.js' : 'bfs.js'}
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

// Steps list sub-component to keep the main component cleaner
function StepsList({
  steps,
  currentIndex,
  onStepClick,
  isDfs,
  t,
}: {
  steps: SearchStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  isDfs: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Only show visit steps and path steps for cleaner display
  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action === 'visit' || s.action === 'path')
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
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isPath
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : isActive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {isPath ? '→' : step.visitedCount}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {isPath
                  ? `${t('grid.path')}: (${step.row}, ${step.col})`
                  : t('stepsGuide.exploring', { x: String(step.row), y: String(step.col) })
                }
              </span>
              {!isPath && isActive && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  {isDfs
                    ? t('stepsGuide.stackSize', { size: String(step.frontierSize) })
                    : t('stepsGuide.queueSize', { size: String(step.frontierSize) })
                  }
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
