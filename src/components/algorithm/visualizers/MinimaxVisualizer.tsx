'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/algorithmHub'
import '@/lib/i18n/ns/minimaxVisualizer'
import {
  runMinimax,
  type MinimaxNode,
  type MinimaxStep,
  type MinimaxResult,
  type Board,
  type Player,
  getEmptyBoard,
  makeMove,
  checkWinner,
} from '@/utils/algorithm/minimax'
import MinimaxCanvas2D from './MinimaxCanvas2D'
import VisualizerControls from '../VisualizerControls'
import CodeViewer from '../CodeViewer'
import GuideSection from '@/components/GuideSection'

type TabKey = 'steps' | 'code' | 'guide'

// ── Pseudocode ────────────────────────────────────────────────────────────
const MINIMAX_CODE = `// Minimax + 알파-베타 가지치기
function minimax(node, depth, isMax, α, β) {
  if (isTerminal(node)) {
    return evaluate(node);       // 승/패/무 점수
  }

  if (isMax) {                   // 최대화 플레이어
    let maxEval = -∞;
    for (child of node.children) {
      const eval = minimax(child, depth+1, false, α, β);
      maxEval = Math.max(maxEval, eval);
      α = Math.max(α, eval);
      if (β <= α) break;         // 베타 컷오프
    }
    return maxEval;
  } else {                       // 최소화 플레이어
    let minEval = +∞;
    for (child of node.children) {
      const eval = minimax(child, depth+1, true, α, β);
      minEval = Math.min(minEval, eval);
      β = Math.min(β, eval);
      if (β <= α) break;         // 알파 컷오프
    }
    return minEval;
  }
}`

// Code highlight line mapping (1-indexed)
const CODE_LINES: Record<MinimaxStep['action'], number[]> = {
  expand: [9, 18],       // for (child of node.children)
  evaluate: [3],         // return evaluate(node)
  backpropagate: [11, 20], // maxEval/minEval update
  prune: [13, 22],       // break
}

// ── Preset boards ─────────────────────────────────────────────────────────
const PRESET_EMPTY: Board = getEmptyBoard()

// X center, O top-left, X top-right  (3 pieces)
const PRESET_MIDGAME: Board = [
  'O', null, 'X',
  null, 'X', null,
  null, null, null,
] as Board

// X center, O top-left, X bottom-right, O top-right, X mid-left (5 pieces, near end)
const PRESET_NEAR_END: Board = [
  'O', null, 'O',
  'X', 'X', null,
  null, 'O', 'X',
] as Board

// ── computeVisualState ────────────────────────────────────────────────────
function computeVisualState(
  steps: MinimaxStep[],
  nodes: Map<number, MinimaxNode>,
  upTo: number,
) {
  const visitedNodeIds = new Set<number>()
  const prunedNodeIds = new Set<number>()
  let activeNodeId: number | null = null

  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const step = steps[i]
    if (step.action === 'prune') {
      prunedNodeIds.add(step.nodeId)
    } else {
      visitedNodeIds.add(step.nodeId)
    }
    activeNodeId = step.nodeId
  }

  // Best path: trace root → best-scoring child at each level
  const bestPathArr: number[] = []
  if (nodes.size > 0) {
    let curId = 0
    bestPathArr.push(curId)
    while (true) {
      const curNode = nodes.get(curId)
      if (!curNode || curNode.children.length === 0) break
      const isMaximizing = curNode.depth % 2 === 0
      let bestChildId = -1
      let bestScore = isMaximizing ? -Infinity : Infinity
      for (const childId of curNode.children) {
        const child = nodes.get(childId)
        if (!child || child.pruned || child.score === null) continue
        if (isMaximizing ? child.score > bestScore : child.score < bestScore) {
          bestScore = child.score
          bestChildId = childId
        }
      }
      if (bestChildId === -1) break
      bestPathArr.push(bestChildId)
      curId = bestChildId
    }
  }

  return { visitedNodeIds, prunedNodeIds, activeNodeId, bestPath: bestPathArr }
}

// ── Helper: count pieces ──────────────────────────────────────────────────
function countPieces(board: Board): { x: number; o: number } {
  let x = 0, o = 0
  for (const cell of board) {
    if (cell === 'X') x++
    else if (cell === 'O') o++
  }
  return { x, o }
}

function nextPlayer(board: Board): Player {
  const { x, o } = countPieces(board)
  return x <= o ? 'X' : 'O'
}

// ── Step explanation generator ────────────────────────────────────────────
function getStepExplanation(
  step: MinimaxStep | null,
  node: MinimaxNode | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): { emoji: string; title: string; desc: string; color: string } {
  if (!step || !node) {
    return { emoji: '👆', title: t('explain.idleTitle'), desc: t('explain.idleDesc'), color: 'gray' }
  }

  const isMax = node.depth % 2 === 0
  const player = isMax ? 'X' : 'O'
  const role = isMax ? 'MAX' : 'MIN'
  const moveLabel = node.move !== null ? String(node.move + 1) : ''

  switch (step.action) {
    case 'expand':
      if (node.depth === 0) {
        return { emoji: '🔍', title: t('explain.expandRootTitle'), desc: t('explain.expandRootDesc', { player, role }), color: 'blue' }
      }
      return { emoji: '🔍', title: t('explain.expandTitle', { move: moveLabel }), desc: t('explain.expandDesc', { player, move: moveLabel, depth: node.depth }), color: 'blue' }

    case 'evaluate':
      if (step.score !== null && step.score > 0) {
        return { emoji: '🏆', title: t('explain.winXTitle'), desc: t('explain.winXDesc', { score: step.score }), color: 'emerald' }
      } else if (step.score !== null && step.score < 0) {
        return { emoji: '💀', title: t('explain.winOTitle'), desc: t('explain.winODesc', { score: step.score }), color: 'red' }
      }
      return { emoji: '🤝', title: t('explain.drawTitle'), desc: t('explain.drawDesc'), color: 'gray' }

    case 'backpropagate':
      if (isMax) {
        return { emoji: '⬆️', title: `MAX → ${step.score}`, desc: t('explain.backpropMaxDesc', { score: step.score ?? 0 }), color: 'amber' }
      }
      return { emoji: '⬇️', title: `MIN → ${step.score}`, desc: t('explain.backpropMinDesc', { score: step.score ?? 0 }), color: 'indigo' }

    case 'prune':
      return { emoji: '✂️', title: t('explain.pruneTitle'), desc: t('explain.pruneDesc', { alpha: step.alpha === -Infinity ? '-∞' : step.alpha, beta: step.beta === Infinity ? '+∞' : step.beta }), color: 'red' }
  }
}

// ── Main component ────────────────────────────────────────────────────────
export default function MinimaxVisualizer() {
  const t = useTranslations('minimaxVisualizer')
  const tHub = useTranslations('algorithmHub')

  // Board state (interactive before run)
  const [board, setBoard] = useState<Board>(getEmptyBoard())
  const [useAlphaBeta, setUseAlphaBeta] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('steps')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result
  const [result, setResult] = useState<MinimaxResult | null>(null)

  const isRunning = currentStepIndex >= 0
  const totalSteps = result?.steps.length ?? 0

  // Visual state
  const visualState = useMemo(() => {
    if (!result || currentStepIndex < 0) {
      return {
        visitedNodeIds: new Set<number>(),
        prunedNodeIds: new Set<number>(),
        activeNodeId: null,
        bestPath: [] as number[],
      }
    }
    return computeVisualState(result.steps, result.nodes, currentStepIndex)
  }, [result, currentStepIndex])

  // Board shown in mini board panel — active node's board during playback
  const displayBoard = useMemo<Board>(() => {
    if (!result || currentStepIndex < 0 || visualState.activeNodeId === null) {
      return board
    }
    const node = result.nodes.get(visualState.activeNodeId)
    return node ? node.board : board
  }, [result, currentStepIndex, visualState.activeNodeId, board])

  // Winning line for display board
  const { line: winLine } = useMemo(() => checkWinner(displayBoard), [displayBoard])

  // Run algorithm
  const runAlgorithm = useCallback(() => {
    const { winner } = checkWinner(board)
    if (winner) return // game already over
    const isMaximizing = nextPlayer(board) === 'X'
    const res = runMinimax(board, isMaximizing, useAlphaBeta)
    setResult(res)
    setCurrentStepIndex(0)
  }, [board, useAlphaBeta])

  // Play
  const handlePlay = useCallback(() => {
    if (currentStepIndex < 0) {
      runAlgorithm()
    }
    setIsPlaying(true)
  }, [currentStepIndex, runAlgorithm])

  // Auto-play
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      const interval = Math.max(30, 300 / speed)
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
    setResult(null)
  }, [])

  // Handle board click (interactive, before running)
  const handleCellClick = useCallback((cellIndex: number) => {
    if (isRunning) return
    if (board[cellIndex] !== null) return
    const { winner } = checkWinner(board)
    if (winner) return
    const player = nextPlayer(board)
    setBoard(makeMove(board, cellIndex, player))
  }, [board, isRunning])

  // Clear board
  const handleClearBoard = useCallback(() => {
    handleReset()
    setBoard(getEmptyBoard())
  }, [handleReset])

  // Load preset
  const handlePreset = useCallback((preset: Board) => {
    handleReset()
    setBoard([...preset] as Board)
  }, [handleReset])

  // Toggle alpha-beta
  const handleToggleAlphaBeta = useCallback(() => {
    handleReset()
    setUseAlphaBeta(prev => !prev)
  }, [handleReset])

  // Code highlight lines
  const codeHighlightLines = useMemo(() => {
    if (!result || currentStepIndex < 0 || currentStepIndex >= result.steps.length) return []
    const step = result.steps[currentStepIndex]
    return CODE_LINES[step.action] ?? []
  }, [result, currentStepIndex])

  // Current step for display
  const currentStep = result?.steps[currentStepIndex] ?? null
  const activeNode = currentStep ? result?.nodes.get(currentStep.nodeId) : null

  // Step explanation
  const explanation = useMemo(
    () => getStepExplanation(currentStep, activeNode, t),
    [currentStep, activeNode, t],
  )

  // Stats
  const prunedCount = result?.prunedNodes ?? 0
  const totalNodes = result?.totalNodes ?? 0
  const bestMove = result?.bestMove ?? -1
  const rootScore = result?.rootScore
  const hitLimit = result?.hitLimit ?? false

  // Warning: too many empty cells
  const emptyCellCount = board.filter(c => c === null).length
  const isTreeTooLarge = emptyCellCount >= 7

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'steps', icon: '🔍', label: t('tabs.steps') },
    { key: 'code', icon: '💻', label: t('tabs.code') },
    { key: 'guide', icon: '📖', label: t('tabs.guide') },
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
              {tHub('categories.gameAi')}
            </span>
            <span className="text-xs text-gray-400">★★☆</span>
          </div>
        </div>

        {/* Alpha-beta toggle */}
        <button
          onClick={handleToggleAlphaBeta}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            useAlphaBeta
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-400/30'
              : 'bg-soft text-sub border border-line'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${useAlphaBeta ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {t('controls.alphaBeta')}
        </button>
      </div>

      {/* Main split layout: 3/5 left + 2/5 right */}
      <div className="grid xl:grid-cols-5 gap-6">
        {/* ── Left column ── */}
        <div className="xl:col-span-3 space-y-4">
          {/* Tree canvas */}
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            {/* Controls */}
            <div className="flex justify-center">
              <VisualizerControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={() => setIsPlaying(false)}
                onReset={handleReset}
                onStepForward={() => {
                  if (currentStepIndex < 0) runAlgorithm()
                  else setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
                }}
                onStepBack={() => setCurrentStepIndex(prev => Math.max(prev - 1, 0))}
                speed={speed}
                onSpeedChange={setSpeed}
                currentStep={Math.max(0, currentStepIndex)}
                totalSteps={Math.max(1, totalSteps)}
              />
            </div>

            {/* Game tree canvas — horizontally scrollable */}
            <div className="overflow-x-auto rounded-xl">
              <div className="flex justify-center min-w-0">
                <MinimaxCanvas2D
                  nodes={result?.nodes ?? new Map()}
                  visitedNodeIds={visualState.visitedNodeIds}
                  prunedNodeIds={visualState.prunedNodeIds}
                  activeNodeId={visualState.activeNodeId}
                  bestPath={isRunning && currentStepIndex >= totalSteps - 1 ? visualState.bestPath : []}
                  width={700}
                  height={420}
                />
              </div>
            </div>

            {/* Stats bar */}
            {result && (
              <div className="space-y-2">
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="text-sub">
                    {t('stats.totalNodes')}: <strong className="text-blue-600 dark:text-blue-400">{totalNodes}</strong>
                  </span>
                  <span className="text-sub">
                    {t('stats.prunedNodes')}: <strong className="text-red-500 dark:text-red-400">{prunedCount}</strong>
                  </span>
                  {rootScore !== undefined && (
                    <span className="text-sub">
                      {t('stats.rootScore')}: <strong className={rootScore > 0 ? 'text-blue-600 dark:text-blue-400' : rootScore < 0 ? 'text-red-500 dark:text-red-400' : 'text-sub'}>{rootScore}</strong>
                    </span>
                  )}
                  {bestMove >= 0 && (
                    <span className="text-sub">
                      {t('stats.bestMove')}: <strong className="text-emerald-600 dark:text-emerald-400">{bestMove + 1}번</strong>
                    </span>
                  )}
                </div>
                {hitLimit && (
                  <div className="text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                    ⚠️ {t('stats.nodeLimitHit')}
                  </div>
                )}
              </div>
            )}

            {/* Warning: too many empty cells */}
            {!isRunning && isTreeTooLarge && (
              <div className="text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                💡 {t('stats.tooManyEmpty')}
              </div>
            )}
          </div>

          {/* Board + controls panel */}
          <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-6 items-start">
              {/* Mini Tic-Tac-Toe board */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">
                  {isRunning ? t('board.playerTurn') : t('board.clickToPlace')}
                </p>
                <div
                  className="grid grid-cols-3 gap-1"
                  style={{ width: 150 }}
                >
                  {displayBoard.map((cell, i) => {
                    const isWinCell = winLine?.includes(i)
                    const isEmpty = cell === null
                    const canClick = !isRunning && isEmpty && !checkWinner(board).winner
                    return (
                      <button
                        key={i}
                        onClick={() => handleCellClick(i)}
                        disabled={!canClick}
                        className={`
                          w-[46px] h-[46px] rounded-lg border-2 flex items-center justify-center text-lg font-bold
                          transition-colors select-none
                          ${isWinCell
                            ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/40'
                            : cell === 'X'
                              ? 'border-blue-400 bg-subtle text-blue-600 dark:text-blue-400'
                              : cell === 'O'
                                ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : canClick
                                  ? 'border-line bg-field hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'
                                  : 'border-line bg-subtle cursor-default opacity-60'
                          }
                        `}
                      >
                        {cell}
                      </button>
                    )
                  })}
                </div>
                {/* Next player indicator (only when interactive) */}
                {!isRunning && !checkWinner(board).winner && (
                  <div className="text-xs text-muted">
                    다음:
                    <span className={`ml-1 font-bold ${nextPlayer(board) === 'X' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {nextPlayer(board)}
                    </span>
                  </div>
                )}
                {checkWinner(board).winner && !isRunning && (
                  <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    {checkWinner(board).winner} 승!
                  </div>
                )}
              </div>

              {/* Preset & clear buttons */}
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs font-medium text-muted">프리셋 보드</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePreset(PRESET_EMPTY)}
                    disabled={isRunning}
                    className="px-3 py-1.5 text-xs rounded-lg bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
                  >
                    {t('controls.preset.empty')}
                  </button>
                  <button
                    onClick={() => handlePreset(PRESET_MIDGAME)}
                    disabled={isRunning}
                    className="px-3 py-1.5 text-xs rounded-lg bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
                  >
                    {t('controls.preset.midGame')}
                  </button>
                  <button
                    onClick={() => handlePreset(PRESET_NEAR_END)}
                    disabled={isRunning}
                    className="px-3 py-1.5 text-xs rounded-lg bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
                  >
                    {t('controls.preset.nearEnd')}
                  </button>
                  <button
                    onClick={handleClearBoard}
                    disabled={isRunning}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/50 dark:border-red-700/30 disabled:opacity-40 transition-colors"
                  >
                    {t('controls.clearBoard')}
                  </button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs text-muted pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500/80" />
                    {t('grid.maximizing')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    {t('grid.minimizing')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-gray-400/60" />
                    {t('grid.pruned')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-500/80" />
                    {t('grid.terminal')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    {t('grid.bestPath')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column (sticky) ── */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-20 space-y-4">
            {/* ── Explanation box (always visible) ── */}
            <div className={`rounded-2xl p-4 border-2 transition-colors ${
              explanation.color === 'blue' ? 'bg-primary-soft text-primary border-primary' :
              explanation.color === 'emerald' ? 'bg-primary-soft text-primary border-primary' :
              explanation.color === 'red' ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700' :
              explanation.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700' :
              explanation.color === 'indigo' ? 'bg-primary-soft text-primary border-primary' :
              'bg-subtle border-line'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{explanation.emoji}</span>
                <div className="min-w-0">
                  <div className="font-bold text-fg text-base">
                    {explanation.title}
                  </div>
                  <p className="text-sm text-sub mt-1 leading-relaxed">
                    {explanation.desc}
                  </p>
                  {currentStep && currentStep.score !== null && currentStep.action === 'backpropagate' && (
                    <div className="mt-2 text-xs font-mono text-muted bg-white/60 dark:bg-gray-800/60 rounded-lg px-2.5 py-1.5">
                      α={currentStep.alpha === -Infinity ? '-∞' : currentStep.alpha}{' '}
                      β={currentStep.beta === Infinity ? '+∞' : currentStep.beta}{' '}
                      {t('explain.scoreLabel')}: {currentStep.score}
                    </div>
                  )}
                  {isRunning && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-faint">
                      <span>{t('explain.step')} {currentStepIndex + 1} / {totalSteps}</span>
                      <div className="flex-1 h-1 bg-track rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabs panel ── */}
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-line">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-subtle'
                        : 'text-muted hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {/* Steps tab */}
                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    {/* Step type legend */}
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {(
                        [
                          ['expand', 'bg-soft text-sub', t('stepsGuide.expand')],
                          ['evaluate', 'bg-soft text-sub', t('stepsGuide.evaluate')],
                          ['backpropagate', 'bg-soft text-sub', t('stepsGuide.backpropagate')],
                          ['prune', 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', t('stepsGuide.prune')],
                        ] as [string, string, string][]
                      ).map(([key, cls, label]) => (
                        <div key={key} className={`px-2 py-1 rounded text-[10px] font-medium ${cls}`}>
                          {label}
                        </div>
                      ))}
                    </div>

                    {currentStepIndex < 0 ? (
                      <p className="text-sm text-faint italic">
                        {t('stepsGuide.description')}
                      </p>
                    ) : (
                      <MinimaxStepsList
                        steps={result?.steps}
                        nodes={result?.nodes}
                        currentIndex={currentStepIndex}
                        onStepClick={setCurrentStepIndex}
                      />
                    )}
                  </div>
                )}

                {/* Code tab */}
                {activeTab === 'code' && (
                  <CodeViewer
                    code={MINIMAX_CODE}
                    language="javascript"
                    highlightLines={codeHighlightLines}
                    title="minimax.js"
                  />
                )}

                {activeTab === 'guide' && (
                  <GuideSection namespace="minimaxVisualizer" defaultOpen />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Steps list sub-component ──────────────────────────────────────────────
function MinimaxStepsList({
  steps,
  nodes,
  currentIndex,
  onStepClick,
}: {
  steps: MinimaxStep[] | undefined
  nodes: Map<number, MinimaxNode> | undefined
  currentIndex: number
  onStepClick: (i: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const displaySteps = useMemo(() => {
    if (!steps) return []
    // Show all but limit for performance; show up to currentIndex + context
    return steps.map((step, originalIndex) => ({ ...step, originalIndex }))
  }, [steps])

  // Auto-scroll to current
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

  const ACTION_STYLES: Record<MinimaxStep['action'], string> = {
    expand: 'bg-subtle border-line',
    evaluate: 'bg-subtle border-line',
    backpropagate: 'bg-subtle border-line',
    prune: 'bg-red-50 dark:bg-red-900/20 border-red-300/50 dark:border-red-700/40',
  }

  const ACTION_BADGE: Record<MinimaxStep['action'], string> = {
    expand: 'bg-soft text-sub',
    evaluate: 'bg-soft text-sub',
    backpropagate: 'bg-soft text-sub',
    prune: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  }

  const ACTION_LABELS: Record<MinimaxStep['action'], string> = {
    expand: '탐색',
    evaluate: '평가',
    backpropagate: '선택',
    prune: '가지치기',
  }

  // Show surrounding window — compact, only ±5 around current
  const windowStart = Math.max(0, currentIndex - 5)
  const windowEnd = Math.min(displaySteps.length - 1, currentIndex + 8)
  const windowSteps = displaySteps.slice(windowStart, windowEnd + 1)

  return (
    <div ref={listRef} className="space-y-1">
      {windowStart > 0 && (
        <div className="text-xs text-faint text-center py-1">
          ... 이전 {windowStart}개 단계 ...
        </div>
      )}
      {windowSteps.map((step) => {
        const isCurrent = step.originalIndex === currentIndex
        const isActive = step.originalIndex <= currentIndex
        const node = nodes?.get(step.nodeId)
        const isMaximizing = (node?.depth ?? 0) % 2 === 0

        return (
          <div
            key={step.originalIndex}
            data-active={isCurrent ? 'true' : undefined}
            onClick={() => onStepClick(step.originalIndex)}
            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
              isCurrent
                ? ACTION_STYLES[step.action]
                : isActive
                  ? 'border-line bg-subtle'
                  : 'border-line opacity-40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[step.action]}`}>
                {ACTION_LABELS[step.action]}
              </span>
              <span className="text-sub truncate">
                {node?.move !== null && node?.move !== undefined
                  ? `${isMaximizing ? 'X' : 'O'} → ${node.move + 1}번칸`
                  : step.depth === 0
                    ? '루트'
                    : `깊이 ${step.depth}`}
              </span>
              {step.score !== null && (
                <span className={`ml-auto text-[10px] font-bold tabular-nums ${step.score > 0 ? 'text-blue-600 dark:text-blue-400' : step.score < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                  {step.score > 0 ? '+' : ''}{step.score}
                </span>
              )}
              {step.score === null && (
                <span className={`ml-auto text-[10px] font-medium ${isMaximizing ? 'text-amber-600 dark:text-amber-400' : 'text-blue-500'}`}>
                  {isMaximizing ? 'MAX' : 'MIN'}
                </span>
              )}
            </div>
          </div>
        )
      })}
      {windowEnd < displaySteps.length - 1 && (
        <div className="text-xs text-faint text-center py-1">
          ... 이후 {displaySteps.length - 1 - windowEnd}개 단계 ...
        </div>
      )}
    </div>
  )
}
