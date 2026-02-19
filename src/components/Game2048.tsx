'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Trophy } from 'lucide-react'

type Tile = {
  id: number
  value: number
  position: { row: number; col: number }
  isNew?: boolean
  isMerged?: boolean
}

type Direction = 'up' | 'down' | 'left' | 'right'

const GRID_SIZE = 4
const TILE_COLORS: Record<number, string> = {
  2: 'bg-[#eee4da] text-gray-900',
  4: 'bg-[#ede0c8] text-gray-900',
  8: 'bg-[#f2b179] text-white',
  16: 'bg-[#f59563] text-white',
  32: 'bg-[#f67c5f] text-white',
  64: 'bg-[#f65e3b] text-white',
  128: 'bg-[#edcf72] text-white',
  256: 'bg-[#edcc61] text-white',
  512: 'bg-[#edc850] text-white',
  1024: 'bg-[#edc53f] text-white',
  2048: 'bg-[#edc22e] text-white',
}

export default function Game2048() {
  const t = useTranslations('game2048')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [keepPlayingAfterWin, setKeepPlayingAfterWin] = useState(false)
  const [previousState, setPreviousState] = useState<{
    tiles: Tile[]
    score: number
  } | null>(null)

  const tileIdCounter = useRef(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Load best score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('game2048_best')
    if (saved) {
      setBestScore(parseInt(saved, 10))
    }
  }, [])

  // Save best score to localStorage
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score)
      localStorage.setItem('game2048_best', score.toString())
    }
  }, [score, bestScore])

  // Initialize game
  const initializeGame = useCallback(() => {
    tileIdCounter.current = 0
    const newTiles: Tile[] = []
    addRandomTile(newTiles)
    addRandomTile(newTiles)
    setTiles(newTiles)
    setScore(0)
    setGameOver(false)
    setWon(false)
    setKeepPlayingAfterWin(false)
    setPreviousState(null)
  }, [])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  // Add random tile (2 or 4)
  const addRandomTile = (currentTiles: Tile[]) => {
    const emptyCells = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!currentTiles.find(t => t.position.row === row && t.position.col === col)) {
          emptyCells.push({ row, col })
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      const newTile: Tile = {
        id: tileIdCounter.current++,
        value: Math.random() < 0.9 ? 2 : 4,
        position: randomCell,
        isNew: true,
      }
      currentTiles.push(newTile)
    }
  }

  // Move tiles in a direction
  const moveTiles = useCallback((direction: Direction) => {
    if (gameOver || (won && !keepPlayingAfterWin)) return

    // Save current state for undo
    setPreviousState({ tiles: [...tiles], score })

    const newTiles = [...tiles].map(t => ({ ...t, isNew: false, isMerged: false }))
    let moved = false
    let addedScore = 0

    const getLine = (lineIndex: number): Tile[] => {
      switch (direction) {
        case 'left':
        case 'right':
          return newTiles.filter(t => t.position.row === lineIndex)
        case 'up':
        case 'down':
          return newTiles.filter(t => t.position.col === lineIndex)
      }
    }

    const setLinePosition = (tile: Tile, lineIndex: number, position: number) => {
      switch (direction) {
        case 'left':
        case 'right':
          tile.position = { row: lineIndex, col: position }
          break
        case 'up':
        case 'down':
          tile.position = { row: position, col: lineIndex }
          break
      }
    }

    const shouldReverse = direction === 'right' || direction === 'down'
    const step = shouldReverse ? -1 : 1

    for (let i = 0; i < GRID_SIZE; i++) {
      const line = getLine(i)
      if (line.length === 0) continue

      // Sort tiles in the line (leading edge first)
      line.sort((a, b) => {
        const aPos = direction === 'left' || direction === 'right' ? a.position.col : a.position.row
        const bPos = direction === 'left' || direction === 'right' ? b.position.col : b.position.row
        return shouldReverse ? bPos - aPos : aPos - bPos
      })

      let targetPos = shouldReverse ? GRID_SIZE - 1 : 0
      let lastPlacedTile: Tile | null = null
      let lastWasMerge = false

      for (let j = 0; j < line.length; j++) {
        const currentTile = line[j]
        const currentPos = direction === 'left' || direction === 'right' ? currentTile.position.col : currentTile.position.row

        if (lastPlacedTile && lastPlacedTile.value === currentTile.value && !lastWasMerge) {
          // Merge with last placed tile
          const tileIndex = newTiles.findIndex(t => t.id === currentTile.id)
          lastPlacedTile.value *= 2
          lastPlacedTile.isMerged = true
          newTiles.splice(tileIndex, 1)

          addedScore += lastPlacedTile.value
          lastWasMerge = true

          if (lastPlacedTile.value === 2048 && !won) {
            setWon(true)
          }

          moved = true
          continue
        }

        // Move tile to target position
        if (currentPos !== targetPos) {
          setLinePosition(currentTile, i, targetPos)
          moved = true
        }

        lastPlacedTile = currentTile
        lastWasMerge = false
        targetPos += step
      }
    }

    if (moved) {
      addRandomTile(newTiles)
      setTiles(newTiles)
      setScore(prev => prev + addedScore)

      // Check for game over
      setTimeout(() => {
        if (isGameOver(newTiles)) {
          setGameOver(true)
        }
      }, 300)
    } else {
      setPreviousState(null)
    }
  }, [tiles, score, gameOver, won, keepPlayingAfterWin])

  // Check if game is over
  const isGameOver = (currentTiles: Tile[]): boolean => {
    // Check if there are any empty cells
    if (currentTiles.length < GRID_SIZE * GRID_SIZE) return false

    // Check if any adjacent tiles can merge
    for (const tile of currentTiles) {
      const { row, col } = tile.position
      const neighbors = [
        currentTiles.find(t => t.position.row === row - 1 && t.position.col === col),
        currentTiles.find(t => t.position.row === row + 1 && t.position.col === col),
        currentTiles.find(t => t.position.row === row && t.position.col === col - 1),
        currentTiles.find(t => t.position.row === row && t.position.col === col + 1),
      ]

      if (neighbors.some(n => n && n.value === tile.value)) {
        return false
      }
    }

    return true
  }

  // Undo last move
  const handleUndo = useCallback(() => {
    if (previousState) {
      setTiles(previousState.tiles)
      setScore(previousState.score)
      setPreviousState(null)
      setGameOver(false)
    }
  }, [previousState])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const directionMap: Record<string, Direction> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        }
        moveTiles(directionMap[e.key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveTiles])

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y
    const minSwipeDistance = 30

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        moveTiles(deltaX > 0 ? 'right' : 'left')
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        moveTiles(deltaY > 0 ? 'down' : 'up')
      }
    }

    touchStartRef.current = null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Game Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-xl mx-auto">
        {/* Score and Controls */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="bg-[#bbada0] rounded-lg px-4 py-2 min-w-[100px]">
              <div className="text-xs text-[#eee4da] uppercase font-semibold">{t('score')}</div>
              <div className="text-2xl font-bold text-white">{score}</div>
            </div>
            <div className="bg-[#bbada0] rounded-lg px-4 py-2 min-w-[100px]">
              <div className="text-xs text-[#eee4da] uppercase font-semibold flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {t('bestScore')}
              </div>
              <div className="text-2xl font-bold text-white">{bestScore}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={!previousState}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('undo')}
            </button>
            <button
              onClick={initializeGame}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              {t('newGame')}
            </button>
          </div>
        </div>

        {/* Game Grid */}
        <div className="relative">
          <div
            ref={gridRef}
            className="bg-[#bbada0] rounded-lg p-2 sm:p-3 aspect-square max-w-[500px] mx-auto relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Grid background */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 h-full">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div key={i} className="bg-[#cdc1b4] rounded-lg"></div>
              ))}
            </div>

            {/* Tiles */}
            <div className="absolute inset-0 p-2 sm:p-3">
              {tiles.map(tile => {
                const tileColor = TILE_COLORS[tile.value] || 'bg-gray-900 text-white'
                const cellSize = 'calc((100% - 0.75rem) / 4)' // 4 cells with 3 gaps of 0.5rem
                const cellSizeSm = 'calc((100% - 1.5rem) / 4)' // 4 cells with 3 gaps of 0.75rem

                return (
                  <div
                    key={tile.id}
                    className={`absolute rounded-lg flex items-center justify-center font-bold transition-all duration-200 ${tileColor} ${
                      tile.isNew ? 'scale-0 animate-[scale_200ms_ease-out_forwards]' : ''
                    } ${tile.isMerged ? 'scale-110' : 'scale-100'}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      left: `calc(${tile.position.col} * (${cellSize} + 0.5rem) + 0.5rem)`,
                      top: `calc(${tile.position.row} * (${cellSize} + 0.5rem) + 0.5rem)`,
                      fontSize: tile.value >= 1024 ? '1.5rem' : tile.value >= 128 ? '1.75rem' : '2rem',
                    }}
                  >
                    {tile.value}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Game Over Overlay */}
          {(gameOver || (won && !keepPlayingAfterWin)) && (
            <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {gameOver ? t('gameOver') : t('youWin')}
                </h2>
                <div className="flex gap-3 justify-center">
                  {won && !gameOver && (
                    <button
                      onClick={() => setKeepPlayingAfterWin(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                      {t('keepPlaying')}
                    </button>
                  )}
                  <button
                    onClick={initializeGame}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-colors"
                  >
                    {t('tryAgain')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile hint */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          {typeof window !== 'undefined' && 'ontouchstart' in window
            ? '스와이프로 타일을 움직이세요'
            : '방향키로 타일을 움직이세요'}
        </p>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* How to Play */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howToPlay.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howToPlay.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
