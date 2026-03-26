'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type CellColor,
  type FloodFillStep,
  type GridPattern,
  floodFillBFS,
  floodFillDFS,
  createPatternGrid,
} from '@/utils/algorithm/floodFill'
import FloodFillCanvas2D, { COLOR_PALETTE } from './FloodFillCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type AlgoMode = 'bfs' | 'dfs'
type TabKey = 'steps' | 'code' | 'guide'

const DEFAULT_ROWS = 15
const DEFAULT_COLS = 20
const DEFAULT_NEW_COLOR = 5 // blue

const FLOOD_BFS_CODE = `// 플러드필 BFS (너비우선)
function floodFillBFS(grid, row, col, newColor) {
  const oldColor = grid[row][col];
  if (oldColor === newColor) return;

  const queue = [[row, col]];   // FIFO 큐
  const visited = new Set();
  visited.add(\`\${row},\${col}\`);

  while (queue.length > 0) {
    const [r, c] = queue.shift();  // 앞에서 꺼냄

    grid[r][c] = newColor;         // 색 채우기

    // 4방향 이웃 확인
    for (const [nr, nc] of neighbors(r, c)) {
      if (visited.has(key) || grid[nr][nc] !== oldColor)
        continue;
      visited.add(key);
      queue.push([nr, nc]);        // 큐에 추가
    }
  }
}`

const FLOOD_DFS_CODE = `// 플러드필 DFS (깊이우선)
function floodFillDFS(grid, row, col, newColor) {
  const oldColor = grid[row][col];
  if (oldColor === newColor) return;

  const stack = [[row, col]];   // LIFO 스택
  const visited = new Set();

  while (stack.length > 0) {
    const [r, c] = stack.pop();  // 뒤에서 꺼냄

    if (visited.has(key)) continue;
    visited.add(key);
    grid[r][c] = newColor;       // 색 채우기

    // 4방향 이웃 확인
    for (const [nr, nc] of neighbors(r, c)) {
      if (!visited.has(key) && grid[nr][nc] === oldColor)
        stack.push([nr, nc]);    // 스택에 추가
    }
  }
}`

function computeVisualState(steps: FloodFillStep[], upTo: number) {
  const filledCells = new Set<string>()
  const frontierCells = new Set<string>()
  let currentCell: { row: number; col: number } | null = null
  let filledCount = 0
  let frontierSize = 0
  let currentGrid: CellColor[][] | null = null

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    const key = `${step.row},${step.col}`

    currentGrid = step.grid
    filledCount = step.filledCount
    frontierSize = step.frontierSize

    if (step.action === 'visit') {
      currentCell = { row: step.row, col: step.col }
      frontierCells.delete(key)
    } else if (step.action === 'fill') {
      filledCells.add(key)
      currentCell = { row: step.row, col: step.col }
    } else if (step.action === 'skip') {
      // neighbor that was different color — briefly show nothing special
    } else if (step.action === 'done') {
      currentCell = null
      frontierCells.clear()
    }
  }

  // Rebuild frontier from current step
  if (upTo >= 0 && upTo < steps.length) {
    const step = steps[upTo]
    frontierSize = step.frontierSize
  }

  return { filledCells, frontierCells, currentCell, filledCount, frontierSize, currentGrid }
}

export default function FloodFillVisualizer() {
  const t = useTranslations('floodFillVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [grid, setGrid] = useState<CellColor[][]>(() =>
    createPatternGrid(DEFAULT_ROWS, DEFAULT_COLS, 'random')
  )
  const [gridSize, setGridSize] = useState(DEFAULT_ROWS)
  const [pattern, setPattern] = useState<GridPattern>('random')
  const [algoMode, setAlgoMode] = useState<AlgoMode>('bfs')
  const [selectedColor, setSelectedColor] = useState<number>(DEFAULT_NEW_COLOR)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Playback
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fill result
  const [fillResult, setFillResult] = useState<{ steps: FloodFillStep[]; filledCount: number } | null>(null)

  const totalSteps = fillResult?.steps.length ?? 0

  // Visual state
  const visual = useMemo(() => {
    if (!fillResult || currentStepIndex < 0) {
      return {
        filledCells: new Set<string>(),
        frontierCells: new Set<string>(),
        currentCell: null,
        filledCount: 0,
        frontierSize: 0,
        currentGrid: null,
      }
    }
    return computeVisualState(fillResult.steps, currentStepIndex)
  }, [fillResult, currentStepIndex])

  const displayGrid = visual.currentGrid ?? grid

  // Run fill
  const runFill = useCallback(
    (row: number, col: number, targetColor: number) => {
      const fn = algoMode === 'dfs' ? floodFillDFS : floodFillBFS
      const result = fn(grid, row, col, targetColor)
      setFillResult(result)
      setCurrentStepIndex(0)
      setIsPlaying(false)
    },
    [grid, algoMode]
  )

  // Click on canvas to start fill
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      // If already running, reset first
      setIsPlaying(false)
      setFillResult(null)
      setCurrentStepIndex(-1)
      // Small delay to let state reset, then run
      setTimeout(() => {
        runFill(row, col, selectedColor)
      }, 0)
    },
    [runFill, selectedColor]
  )

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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, totalSteps])

  // Play button
  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) return // need a click first
    setIsPlaying(true)
  }, [currentStepIndex])

  // Reset
  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setFillResult(null)
  }, [])

  // Regenerate grid
  const handleNewGrid = useCallback(
    (newPattern: GridPattern, size?: number) => {
      handleReset()
      const rows = size ?? gridSize
      const cols = Math.round(rows * (DEFAULT_COLS / DEFAULT_ROWS))
      setPattern(newPattern)
      setGrid(createPatternGrid(rows, cols, newPattern))
    },
    [gridSize, handleReset]
  )

  // Grid size change
  const handleGridSizeChange = useCallback(
    (newSize: number) => {
      handleReset()
      const cols = Math.round(newSize * (DEFAULT_COLS / DEFAULT_ROWS))
      setGridSize(newSize)
      setGrid(createPatternGrid(newSize, cols, pattern))
    },
    [pattern, handleReset]
  )

  // Mode change
  const handleModeChange = useCallback(
    (mode: AlgoMode) => {
      setAlgoMode(mode)
      handleReset()
    },
    [handleReset]
  )

  // Code highlight lines based on step action
  const codeHighlightLines = useMemo(() => {
    if (currentStepIndex < 0 || !fillResult) return []
    if (currentStepIndex >= fillResult.steps.length) return []
    const step = fillResult.steps[currentStepIndex]
    if (algoMode === 'bfs') {
      if (step.action === 'visit') return [10, 11]
      if (step.action === 'fill') return [12]
      if (step.action === 'skip') return [15, 16]
      if (step.action === 'done') return [18]
    } else {
      if (step.action === 'visit') return [10, 11, 12]
      if (step.action === 'fill') return [13]
      if (step.action === 'skip') return [16, 17]
      if (step.action === 'done') return [19]
    }
    return []
  }, [currentStepIndex, fillResult, algoMode])

  const isRunning = currentStepIndex >= 0
  const isDone =
    isRunning && fillResult !== null && currentStepIndex >= fillResult.steps.length - 1

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const patterns: { key: GridPattern; label: string; icon: string }[] = [
    { key: 'random', label: t('grid.random'), icon: '🎲' },
    { key: 'checkerboard', label: t('grid.checkerboard'), icon: '♟' },
    { key: 'islands', label: t('grid.islands'), icon: '🏝' },
  ]

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
          {(['bfs', 'dfs'] as AlgoMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
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
                  setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() =>
                  setCurrentStepIndex(prev => Math.max(prev - 1, 0))
                }
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            {/* Canvas */}
            <div className="flex justify-center">
              <FloodFillCanvas2D
                grid={displayGrid}
                currentCell={visual.currentCell}
                filledCells={visual.filledCells}
                frontierCells={visual.frontierCells}
                newColor={selectedColor}
                onCellClick={handleCellClick}
                width={600}
                height={450}
              />
            </div>

            {/* Hint */}
            {!isRunning && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 italic">
                {t('controls.clickHint')}
              </p>
            )}

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('stats.filled')}:{' '}
                <strong className="text-blue-600 dark:text-blue-400">
                  {visual.filledCount}
                </strong>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {algoMode === 'bfs' ? t('stats.queue') : t('stats.stack')}:{' '}
                <strong className="text-yellow-600 dark:text-yellow-400">
                  {visual.frontierSize}
                </strong>
              </span>
              {isDone && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {t('stats.done')} ({visual.filledCount} {t('stats.cells')})
                </span>
              )}
            </div>
          </div>

          {/* Tool buttons */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-3">
            {/* Color palette */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('controls.fillColor')}
              </span>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((hex, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColor(idx)}
                    title={`Color ${idx}`}
                    style={{ backgroundColor: hex }}
                    className={`w-8 h-8 rounded-full transition-all ${
                      selectedColor === idx
                        ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110 shadow-lg'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Grid pattern buttons */}
            <div className="flex flex-wrap gap-2">
              {patterns.map(p => (
                <button
                  key={p.key}
                  onClick={() => handleNewGrid(p.key)}
                  disabled={isRunning && isPlaying}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    pattern === p.key && !isRunning
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-40`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            {/* Grid size slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('controls.gridSize')}
              </span>
              <input
                type="range"
                min={8}
                max={25}
                value={gridSize}
                onChange={e => handleGridSizeChange(Number(e.target.value))}
                disabled={isRunning && isPlaying}
                className="flex-1 accent-blue-600 disabled:opacity-40"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center tabular-nums">
                {gridSize} x {Math.round(gridSize * (DEFAULT_COLS / DEFAULT_ROWS))}
              </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm border-2 border-white shadow-sm" style={{ backgroundColor: COLOR_PALETTE[selectedColor] }} />
                {t('grid.newColor')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm border-2 border-white" />
                {t('grid.frontier')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm ring-2 ring-white" style={{ backgroundColor: COLOR_PALETTE[selectedColor] }} />
                {t('grid.current')}
              </span>
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
                      {algoMode === 'dfs'
                        ? t('stepsGuide.dfsDescription')
                        : t('stepsGuide.bfsDescription')}
                    </p>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('stepsGuide.hint')}
                      </p>
                    ) : (
                      <StepsList
                        steps={fillResult?.steps}
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
                    code={algoMode === 'dfs' ? FLOOD_DFS_CODE : FLOOD_BFS_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title={algoMode === 'dfs' ? 'floodFillDFS.js' : 'floodFillBFS.js'}
                  />
                )}

                {activeTab === 'guide' && (
                  <GuideSection namespace="floodFillVisualizer" defaultOpen />
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
  isDfs,
  t,
}: {
  steps: FloodFillStep[] | undefined
  currentIndex: number
  onStepClick: (i: number) => void
  isDfs: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, string | number>) => any
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    return steps
      .map((step, originalIndex) => ({ ...step, originalIndex }))
      .filter(s => s.action === 'visit' || s.action === 'fill' || s.action === 'done')
  }, [steps])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      const container = listRef.current
      const elTop = (activeEl as HTMLElement).offsetTop
      const elH = (activeEl as HTMLElement).offsetHeight
      if (elTop < container.scrollTop) container.scrollTop = elTop
      else if (elTop + elH > container.scrollTop + container.clientHeight)
        container.scrollTop = elTop + elH - container.clientHeight
    }
  }, [currentIndex])

  if (displaySteps.length === 0) return null

  return (
    <div ref={listRef} className="space-y-1 max-h-96 overflow-y-auto">
      {displaySteps.map((step, i) => {
        const isActive = step.originalIndex <= currentIndex
        const isCurrent =
          step.originalIndex === currentIndex ||
          (step.originalIndex < currentIndex &&
            (displaySteps[i + 1]?.originalIndex ?? Infinity) > currentIndex)
        const isDone = step.action === 'done'
        const isFill = step.action === 'fill'

        const actionColor = isDone
          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
          : isFill
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'

        return (
          <div
            key={i}
            data-active={isCurrent ? 'true' : undefined}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent
                ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20'
                : isActive
                  ? 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30'
                  : 'border-gray-200/30 dark:border-gray-700/30 opacity-40'
            }`}
            onClick={() => onStepClick(step.originalIndex)}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${actionColor}`}
              >
                {isDone ? '✓' : isFill ? '🎨' : step.filledCount + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {isDone
                  ? t('stepsGuide.doneLabel', { count: String(step.filledCount) })
                  : isFill
                    ? t('stepsGuide.fillLabel', {
                        x: String(step.row),
                        y: String(step.col),
                      })
                    : t('stepsGuide.visitLabel', {
                        x: String(step.row),
                        y: String(step.col),
                      })}
              </span>
              {!isDone && isActive && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  {isDfs
                    ? t('stepsGuide.stackSize', { size: String(step.frontierSize) })
                    : t('stepsGuide.queueSize', { size: String(step.frontierSize) })}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
