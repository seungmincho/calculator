'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Share2, Trophy, Clock, Grid3X3, Calendar, Sparkles } from 'lucide-react'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

// ── Types ──
type CellState = 0 | 1 | 2 // 0=empty, 1=filled, 2=marked-X
type GridSize = 5 | 10 | 15

interface PuzzleStats {
  gamesPlayed: number
  bestTimes: Record<GridSize, number | null>
}

// ── Seeded PRNG (mulberry32) ──
function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Puzzle generation ──
function generatePuzzle(size: GridSize, seed: number): boolean[][] {
  const rng = mulberry32(seed)
  const grid: boolean[][] = []

  // Density varies by size for nicer patterns
  const density = size === 5 ? 0.55 : size === 10 ? 0.45 : 0.4

  for (let r = 0; r < size; r++) {
    const row: boolean[] = []
    for (let c = 0; c < size; c++) {
      row.push(rng() < density)
    }
    grid.push(row)
  }

  // Ensure at least one filled cell per row and column
  for (let r = 0; r < size; r++) {
    if (!grid[r].some(v => v)) {
      grid[r][Math.floor(rng() * size)] = true
    }
  }
  for (let c = 0; c < size; c++) {
    if (!grid.some(row => row[c])) {
      grid[Math.floor(rng() * size)][c] = true
    }
  }

  return grid
}

function computeClues(line: boolean[]): number[] {
  const clues: number[] = []
  let count = 0
  for (const cell of line) {
    if (cell) {
      count++
    } else if (count > 0) {
      clues.push(count)
      count = 0
    }
  }
  if (count > 0) clues.push(count)
  return clues.length > 0 ? clues : [0]
}

function getRowClues(solution: boolean[][]): number[][] {
  return solution.map(row => computeClues(row))
}

function getColClues(solution: boolean[][]): number[][] {
  const size = solution.length
  const clues: number[][] = []
  for (let c = 0; c < (solution[0]?.length ?? 0); c++) {
    const col: boolean[] = []
    for (let r = 0; r < size; r++) {
      col.push(solution[r][c])
    }
    clues.push(computeClues(col))
  }
  return clues
}

// ── Stats helpers ──
function loadStats(): PuzzleStats {
  if (typeof window === 'undefined') return { gamesPlayed: 0, bestTimes: { 5: null, 10: null, 15: null } }
  try {
    const raw = localStorage.getItem('picross-stats')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { gamesPlayed: 0, bestTimes: { 5: null, 10: null, 15: null } }
}

function saveStats(stats: PuzzleStats) {
  try {
    localStorage.setItem('picross-stats', JSON.stringify(stats))
  } catch { /* ignore */ }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Component ──
export default function Picross() {
  const t = useTranslations('picross')

  const [gridSize, setGridSize] = useState<GridSize>(5)
  const [isDaily, setIsDaily] = useState(true)
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 86400000))
  const [playerGrid, setPlayerGrid] = useState<CellState[][]>([])
  const [timer, setTimer] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [stats, setStats] = useState<PuzzleStats>(loadStats)
  const [showConfetti, setShowConfetti] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const winRecordedRef = useRef(false)

  // Current puzzle
  const solution = useMemo(() => generatePuzzle(gridSize, seed), [gridSize, seed])
  const rowClues = useMemo(() => getRowClues(solution), [solution])
  const colClues = useMemo(() => getColClues(solution), [solution])
  const maxRowClueLen = useMemo(() => Math.max(...rowClues.map(c => c.length)), [rowClues])
  const maxColClueLen = useMemo(() => Math.max(...colClues.map(c => c.length)), [colClues])

  // Initialize player grid
  const initGrid = useCallback((size: GridSize) => {
    setPlayerGrid(Array.from({ length: size }, () => Array(size).fill(0) as CellState[]))
    setTimer(0)
    setIsPlaying(false)
    setHasStarted(false)
    setGameWon(false)
    setMistakes(0)
    setShowConfetti(false)
    winRecordedRef.current = false
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    initGrid(gridSize)
  }, [gridSize, seed, initGrid])

  // Timer
  useEffect(() => {
    if (isPlaying && !gameWon) {
      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, gameWon])

  // Win check
  const checkWin = useCallback((grid: CellState[][]) => {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isFilled = grid[r][c] === 1
        if (isFilled !== solution[r][c]) return false
      }
    }
    return true
  }, [gridSize, solution])

  const handleWin = useCallback(() => {
    setGameWon(true)
    setIsPlaying(false)
    setShowConfetti(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 }
    const best = newStats.bestTimes[gridSize]
    if (best === null || timer < best) {
      newStats.bestTimes[gridSize] = timer
    }
    setStats(newStats)
    saveStats(newStats)

    if (!winRecordedRef.current) {
      winRecordedRef.current = true
      const difficulty = gridSize === 5 ? 'easy' : gridSize === 10 ? 'normal' : 'hard'
      recordGameResult({ gameType: 'picross', result: 'win', difficulty, moves: 0 })
    }
  }, [stats, gridSize, timer, recordGameResult])

  // Cell interaction
  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameWon) return
    if (!hasStarted) {
      setHasStarted(true)
      setIsPlaying(true)
    }
    setPlayerGrid(prev => {
      const next = prev.map(row => [...row])
      // Left click: empty -> filled, filled -> empty
      if (next[r][c] === 0) {
        next[r][c] = 1
        // Check for mistake
        if (!solution[r][c]) {
          setMistakes(m => m + 1)
        }
      } else if (next[r][c] === 1) {
        next[r][c] = 0
      } else {
        // marked X -> empty
        next[r][c] = 0
      }
      // Check win after filling
      if (checkWin(next)) {
        setTimeout(() => handleWin(), 100)
      }
      return next
    })
  }, [gameWon, hasStarted, solution, checkWin, handleWin])

  const handleCellRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (gameWon) return
    if (!hasStarted) {
      setHasStarted(true)
      setIsPlaying(true)
    }
    setPlayerGrid(prev => {
      const next = prev.map(row => [...row])
      if (next[r][c] === 0) {
        next[r][c] = 2
      } else if (next[r][c] === 2) {
        next[r][c] = 0
      } else {
        // filled -> marked X
        next[r][c] = 2
      }
      return next
    })
  }, [gameWon, hasStarted])

  // Long press for mobile (mark X)
  const handleTouchStart = useCallback((r: number, c: number) => {
    longPressFiredRef.current = false
    longPressRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      handleCellRightClick({ preventDefault: () => {} } as React.MouseEvent, r, c)
    }, 400)
  }, [handleCellRightClick])

  const handleTouchEnd = useCallback((r: number, c: number) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
    if (!longPressFiredRef.current) {
      handleCellClick(r, c)
    }
  }, [handleCellClick])

  const handleTouchMove = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  // New puzzle
  const newDailyPuzzle = useCallback(() => {
    const daySeed = Math.floor(Date.now() / 86400000)
    setSeed(daySeed)
    setIsDaily(true)
  }, [])

  const newRandomPuzzle = useCallback(() => {
    setSeed(Math.floor(Math.random() * 999999999))
    setIsDaily(false)
  }, [])

  const changeSize = useCallback((size: GridSize) => {
    setGridSize(size)
    if (isDaily) {
      setSeed(Math.floor(Date.now() / 86400000) + size)
    } else {
      setSeed(Math.floor(Math.random() * 999999999))
    }
  }, [isDaily])

  // Share result
  const shareResult = useCallback(async () => {
    if (!gameWon) return
    const emojiGrid = solution.map(row =>
      row.map(cell => cell ? '\u2B1B' : '\u2B1C').join('')
    ).join('\n')
    const text = `${t('shareTitle')} ${gridSize}\u00D7${gridSize} \u23F1\uFE0F ${formatTime(timer)}\n${emojiGrid}\ntoolhub.ai.kr/picross`

    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        setCopiedShare(true)
        setTimeout(() => setCopiedShare(false), 2000)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopiedShare(true)
        setTimeout(() => setCopiedShare(false), 2000)
      }
    } catch {
      /* ignore */
    }
  }, [gameWon, solution, gridSize, timer, t])

  // Check if row/col clues are satisfied
  const isRowComplete = useCallback((rowIdx: number) => {
    const playerRow = playerGrid[rowIdx]
    if (!playerRow) return false
    const playerClue = computeClues(playerRow.map(c => c === 1))
    const targetClue = rowClues[rowIdx]
    return JSON.stringify(playerClue) === JSON.stringify(targetClue)
  }, [playerGrid, rowClues])

  const isColComplete = useCallback((colIdx: number) => {
    const col = playerGrid.map(row => row[colIdx] === 1)
    const playerClue = computeClues(col)
    const targetClue = colClues[colIdx]
    return JSON.stringify(playerClue) === JSON.stringify(targetClue)
  }, [playerGrid, colClues])

  // Cell size based on grid
  const cellSize = gridSize === 5 ? 'w-10 h-10 sm:w-12 sm:h-12' : gridSize === 10 ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-6 sm:h-6'
  const fontSize = gridSize === 5 ? 'text-sm sm:text-base' : gridSize === 10 ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'
  const clueFontSize = gridSize === 5 ? 'text-sm' : gridSize === 10 ? 'text-xs' : 'text-[10px]'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t('title')}
            {isDaily && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                <Calendar className="w-3 h-3" />
                {t('dailyBadge')}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg">{formatTime(timer)}</span>
          </div>
          {mistakes > 0 && (
            <span className="text-sm text-red-500 dark:text-red-400">
              {t('mistakes')}: {mistakes}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Size selector */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow p-1">
          {([5, 10, 15] as GridSize[]).map(size => (
            <button
              key={size}
              onClick={() => changeSize(size)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                gridSize === size
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {size}x{size}
              <span className="ml-1 text-xs opacity-70">
                {size === 5 ? t('easy') : size === 10 ? t('medium') : t('hard')}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={newDailyPuzzle}
          className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {t('dailyPuzzle')}
        </button>

        <button
          onClick={newRandomPuzzle}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('newPuzzle')}
        </button>

        <button
          onClick={() => initGrid(gridSize)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          {t('reset')}
        </button>
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
        {t('helpClick')} &middot; {t('helpRightClick')}
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 overflow-x-auto">
        <div className="inline-block">
          {/* Column clues + grid */}
          <div className="flex">
            {/* Top-left spacer */}
            <div style={{ minWidth: `${maxRowClueLen * (gridSize <= 5 ? 24 : gridSize <= 10 ? 18 : 14)}px` }} />

            {/* Column clues */}
            <div className="flex">
              {colClues.map((clue, ci) => (
                <div
                  key={ci}
                  className={`${cellSize} flex flex-col items-center justify-end ${clueFontSize} ${
                    isColComplete(ci) ? 'text-green-500 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  style={{ minHeight: `${maxColClueLen * (gridSize <= 5 ? 20 : gridSize <= 10 ? 16 : 13)}px` }}
                >
                  {clue.map((n, i) => (
                    <span key={i} className="leading-tight">{n}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {playerGrid.map((row, ri) => (
            <div key={ri} className="flex">
              {/* Row clue */}
              <div
                className={`flex items-center justify-end gap-1 pr-2 ${clueFontSize} ${
                  isRowComplete(ri) ? 'text-green-500 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                }`}
                style={{ minWidth: `${maxRowClueLen * (gridSize <= 5 ? 24 : gridSize <= 10 ? 18 : 14)}px` }}
              >
                {rowClues[ri].map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </div>

              {/* Cells */}
              {row.map((cell, ci) => {
                const borderRight = (ci + 1) % 5 === 0 && ci < gridSize - 1 ? 'border-r-2 border-r-gray-400 dark:border-r-gray-500' : ''
                const borderBottom = (ri + 1) % 5 === 0 && ri < gridSize - 1 ? 'border-b-2 border-b-gray-400 dark:border-b-gray-500' : ''

                return (
                  <button
                    key={ci}
                    className={`${cellSize} ${fontSize} border border-gray-200 dark:border-gray-600 ${borderRight} ${borderBottom} flex items-center justify-center select-none transition-colors ${
                      cell === 1
                        ? gameWon
                          ? 'bg-blue-500 dark:bg-blue-600'
                          : solution[ri][ci]
                            ? 'bg-blue-700 dark:bg-blue-500'
                            : 'bg-red-400 dark:bg-red-600'
                        : cell === 2
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                    } ${gameWon ? 'cursor-default' : 'cursor-pointer'}`}
                    onClick={() => handleCellClick(ri, ci)}
                    onContextMenu={(e) => handleCellRightClick(e, ri, ci)}
                    onTouchStart={(e) => { e.preventDefault(); handleTouchStart(ri, ci) }}
                    onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(ri, ci) }}
                    onTouchMove={handleTouchMove}
                    style={{ touchAction: 'none' }}
                    disabled={gameWon}
                    aria-label={`${t('cell')} ${ri + 1},${ci + 1}`}
                  >
                    {cell === 2 && (
                      <span className="font-bold text-gray-400 dark:text-gray-500">&times;</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Win message */}
      {gameWon && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
          {showConfetti && (
            <div className="text-4xl mb-2">
              <Sparkles className="w-10 h-10 text-yellow-500 mx-auto" />
            </div>
          )}
          <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
            {t('winTitle')}
          </h2>
          <p className="text-green-700 dark:text-green-300">
            {t('winMessage', { size: `${gridSize}x${gridSize}`, time: formatTime(timer) })}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={shareResult}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {copiedShare ? t('copied') : t('share')}
            </button>
            <button
              onClick={newRandomPuzzle}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('playAgain')}
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {t('statsTitle')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.gamesPlayed}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('statsPlayed')}</div>
          </div>
          {([5, 10, 15] as GridSize[]).map(size => (
            <div key={size} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.bestTimes[size] !== null ? formatTime(stats.bestTimes[size]!) : '-'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('statsBest', { size: `${size}x${size}` })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <GameAchievements
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
      />

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Grid3X3 className="w-5 h-5" />
          {t('guideTitle')}
        </h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('guideRulesTitle')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('guideRulesItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('guideTipsTitle')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('guideTipsItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('guideControlsTitle')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('guideControlsItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />
    </div>
  )
}
