'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  createGrid, addRandomWalls, generateMaze, runComparison,
  type CellType, type PathStep, type PathResult,
} from '@/utils/algorithm/pathfindingCompare'
import PathfindingCompareCanvas2D from './PathfindingCompareCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'
type PlacementMode = 'wall' | 'start' | 'end' | 'erase'

const ASTAR_CODE = `// A* 알고리즘
function aStar(grid, start, end) {
  const open = new PriorityQueue();
  open.push(start, heuristic(start, end));

  while (!open.isEmpty()) {
    const current = open.pop();
    if (current === end) return path;

    for (const neighbor of getNeighbors(current)) {
      const g = gScore[current] + 1;
      const h = heuristic(neighbor, end); // Manhattan
      const f = g + h;

      if (g < gScore[neighbor]) {
        gScore[neighbor] = g;
        open.push(neighbor, f);
      }
    }
  }
}`

const DIJKSTRA_CODE = `// 다익스트라 알고리즘
function dijkstra(grid, start, end) {
  const dist = new PriorityQueue();
  dist.push(start, 0);

  while (!dist.isEmpty()) {
    const current = dist.pop();
    if (current === end) return path;

    for (const neighbor of getNeighbors(current)) {
      const newDist = distance[current] + 1;

      if (newDist < distance[neighbor]) {
        distance[neighbor] = newDist;
        dist.push(neighbor, newDist);
        // No heuristic — explores uniformly
      }
    }
  }
}`

export default function PathfindingCompareVisualizer() {
  const t = useTranslations('pathfindingCompareVisualizer')
  const tHub = useTranslations('algorithmHub')

  const [gridSize, setGridSize] = useState(20)
  const [grid, setGrid] = useState<CellType[][]>(() => {
    const g = createGrid(20, 20)
    g[1][1] = 'start'; g[18][18] = 'end'
    return g
  })
  const [start, setStart] = useState<[number, number]>([1, 1])
  const [end, setEnd] = useState<[number, number]>([18, 18])
  const [placementMode, setPlacementMode] = useState<PlacementMode>('wall')
  const [activeTab, setActiveTab] = useState<TabKey>('steps')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<PathResult | null>(null)
  const totalSteps = result?.steps.length ?? 0

  // Compute visited/enqueued sets up to current step
  const { astarVisited, dijkstraVisited, astarEnqueued, dijkstraEnqueued, astarPath, dijkstraPath } = useMemo(() => {
    const av = new Set<string>(), dv = new Set<string>()
    const ae = new Set<string>(), de = new Set<string>()

    if (result && currentStepIndex >= 0) {
      for (let i = 0; i <= currentStepIndex && i < result.steps.length; i++) {
        const step = result.steps[i]
        const key = `${step.row},${step.col}`
        if (step.row < 0) continue

        if (step.algorithm === 'astar') {
          if (step.action === 'visit') av.add(key)
          if (step.action === 'enqueue') ae.add(key)
        } else {
          if (step.action === 'visit') dv.add(key)
          if (step.action === 'enqueue') de.add(key)
        }
      }
    }

    const isDone = result && currentStepIndex >= totalSteps - 1
    return {
      astarVisited: av, dijkstraVisited: dv,
      astarEnqueued: ae, dijkstraEnqueued: de,
      astarPath: isDone ? (result?.astarPath ?? []) : [],
      dijkstraPath: isDone ? (result?.dijkstraPath ?? []) : [],
    }
  }, [result, currentStepIndex, totalSteps])

  const runSearch = useCallback(() => {
    const res = runComparison(grid, start, end)
    setResult(res)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [grid, start, end])

  const resetGrid = useCallback(() => {
    const s: [number, number] = [1, 1]
    const e: [number, number] = [gridSize - 2, gridSize - 2]
    const g = createGrid(gridSize, gridSize)
    g[s[0]][s[1]] = 'start'; g[e[0]][e[1]] = 'end'
    setGrid(g); setStart(s); setEnd(e)
    setResult(null); setCurrentStepIndex(-1); setIsPlaying(false)
  }, [gridSize])

  const randomWalls = useCallback(() => {
    const g = createGrid(gridSize, gridSize)
    const s: [number, number] = [1, 1]
    const e: [number, number] = [gridSize - 2, gridSize - 2]
    const newGrid = addRandomWalls(g, 0.3, s, e)
    setGrid(newGrid); setStart(s); setEnd(e)
    setResult(null); setCurrentStepIndex(-1); setIsPlaying(false)
  }, [gridSize])

  const makeMaze = useCallback(() => {
    const s: [number, number] = [1, 1]
    const e: [number, number] = [gridSize - 2, gridSize - 2]
    const newGrid = generateMaze(gridSize, gridSize, s, e)
    setGrid(newGrid); setStart(s); setEnd(e)
    setResult(null); setCurrentStepIndex(-1); setIsPlaying(false)
  }, [gridSize])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (result) return // don't modify during playback
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      if (placementMode === 'wall') {
        if (newGrid[row][col] === 'empty') newGrid[row][col] = 'wall'
      } else if (placementMode === 'erase') {
        if (newGrid[row][col] === 'wall') newGrid[row][col] = 'empty'
      } else if (placementMode === 'start') {
        newGrid[start[0]][start[1]] = 'empty'
        newGrid[row][col] = 'start'
        setStart([row, col])
      } else if (placementMode === 'end') {
        newGrid[end[0]][end[1]] = 'empty'
        newGrid[row][col] = 'end'
        setEnd([row, col])
      }
      return newGrid
    })
  }, [placementMode, result, start, end])

  const handleCellDrag = useCallback((row: number, col: number) => {
    if (result) return
    if (placementMode === 'wall') {
      setGrid(prev => {
        const g = prev.map(r => [...r])
        if (g[row][col] === 'empty') g[row][col] = 'wall'
        return g
      })
    } else if (placementMode === 'erase') {
      setGrid(prev => {
        const g = prev.map(r => [...r])
        if (g[row][col] === 'wall') g[row][col] = 'empty'
        return g
      })
    }
  }, [placementMode, result])

  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) runSearch()
    setIsPlaying(true)
  }, [currentStepIndex, runSearch])

  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(10, 200 / speed)
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
    setIsPlaying(false); setCurrentStepIndex(-1); setResult(null)
  }, [])

  const [showAstar, setShowAstar] = useState(true)

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code',  icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
  ]

  const placementModes: { key: PlacementMode; label: string; emoji: string }[] = [
    { key: 'wall', label: t('controls.wall'), emoji: '🧱' },
    { key: 'erase', label: t('controls.erase'), emoji: '🧹' },
    { key: 'start', label: t('controls.start'), emoji: '🟢' },
    { key: 'end', label: t('controls.end'), emoji: '🔴' },
  ]

  return (
    <div className="space-y-6">
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
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-4">
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying} onPlay={handlePlay} onPause={() => setIsPlaying(false)} onReset={handleReset}
                onStepForward={() => { if (currentStepIndex < 0) runSearch(); else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1)) }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed} onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)} totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            <div className="overflow-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <PathfindingCompareCanvas2D
                  grid={grid}
                  astarVisited={astarVisited}
                  dijkstraVisited={dijkstraVisited}
                  astarEnqueued={astarEnqueued}
                  dijkstraEnqueued={dijkstraEnqueued}
                  astarPath={astarPath}
                  dijkstraPath={dijkstraPath}
                  start={start} end={end}
                  onCellClick={handleCellClick}
                  onCellDrag={handleCellDrag}
                  placementMode={placementMode}
                  width={660} height={500}
                />
              </div>
            </div>

            {/* Comparison stats */}
            {result && currentStepIndex >= totalSteps - 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">A*</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('stats.visited')}: <strong className="text-blue-600">{result.astarVisited}</strong></p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('stats.pathLength')}: <strong className="text-blue-600">{result.astarPathLength || '-'}</strong></p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1">Dijkstra</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('stats.visited')}: <strong className="text-orange-600">{result.dijkstraVisited}</strong></p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('stats.pathLength')}: <strong className="text-orange-600">{result.dijkstraPathLength || '-'}</strong></p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(59,130,246,0.35)' }} />A* {t('legend.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(249,115,22,0.35)' }} />Dijkstra {t('legend.visited')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(139,92,246,0.4)' }} />{t('legend.both')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600" />A* {t('legend.path')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-600" />Dijkstra {t('legend.path')}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('controls.placementMode')}</p>
              <div className="flex gap-2">
                {placementModes.map(pm => (
                  <button key={pm.key} onClick={() => setPlacementMode(pm.key)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      placementMode === pm.key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>{pm.emoji} {pm.label}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('controls.gridSize')} ({gridSize}x{gridSize})</label>
              <input type="range" min={10} max={30} value={gridSize} onChange={e => { setGridSize(Number(e.target.value)); resetGrid() }} className="flex-1 accent-blue-600" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={randomWalls}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/30 transition-colors">
                🎲 {t('controls.randomWalls')}
              </button>
              <button onClick={makeMaze}
                className="px-3 py-1.5 text-xs rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/50 dark:border-purple-700/30 transition-colors">
                🏰 {t('controls.maze')}
              </button>
              <button onClick={resetGrid}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 transition-colors">
                🗑️ {t('controls.clear')}
              </button>
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
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('stepsGuide.description')}</p>

                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-xs">
                      <p className="font-bold text-blue-700 dark:text-blue-400 mb-1">A* vs Dijkstra</p>
                      <p className="text-gray-600 dark:text-gray-400">{t('stepsGuide.comparison')}</p>
                    </div>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-gray-400 italic">{t('stepsGuide.hint')}</p>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">A* ({t('stats.visited')}: {astarVisited.size})</p>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${totalSteps > 0 ? (astarVisited.size / (gridSize * gridSize)) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1">Dijkstra ({t('stats.visited')}: {dijkstraVisited.size})</p>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${totalSteps > 0 ? (dijkstraVisited.size / (gridSize * gridSize)) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => setShowAstar(true)}
                        className={`px-2 py-1 text-xs rounded ${showAstar ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>A*</button>
                      <button onClick={() => setShowAstar(false)}
                        className={`px-2 py-1 text-xs rounded ${!showAstar ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Dijkstra</button>
                    </div>
                    <CodeViewer
                      code={showAstar ? ASTAR_CODE : DIJKSTRA_CODE}
                      language="javascript"
                      highlightLines={[]}
                      title={showAstar ? 'a-star.js' : 'dijkstra.js'}
                    />
                  </div>
                )}

                {activeTab === 'guide' && <GuideSection namespace="pathfindingCompareVisualizer" defaultOpen />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
