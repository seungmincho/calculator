'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Flag, Bomb, RotateCcw } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import LeaderboardPanel from '@/components/LeaderboardPanel'
import NameInputModal from '@/components/NameInputModal'

type Difficulty = 'beginner' | 'intermediate' | 'expert'

interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMines: number
}

interface GameConfig {
  rows: number
  cols: number
  mines: number
}

const DIFFICULTIES: Record<Difficulty, GameConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
}

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-600 dark:text-blue-400',
  2: 'text-green-600 dark:text-green-400',
  3: 'text-red-600 dark:text-red-400',
  4: 'text-purple-600 dark:text-purple-400',
  5: 'text-yellow-700 dark:text-yellow-500',
  6: 'text-teal-600 dark:text-teal-400',
  7: 'text-gray-900 dark:text-gray-100',
  8: 'text-gray-600 dark:text-gray-400',
}

export default function Minesweeper() {
  const t = useTranslations('minesweeper')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [board, setBoard] = useState<Cell[][]>([])
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [flagCount, setFlagCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const [isFirstClick, setIsFirstClick] = useState(true)
  const [clickedMine, setClickedMine] = useState<[number, number] | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const config = DIFFICULTIES[difficulty]
  const leaderboard = useLeaderboard('minesweeper', difficulty)
  const [showNameModal, setShowNameModal] = useState(false)
  const gameStartTimeRef = useRef<number>(Date.now())

  const initializeBoard = useCallback((rows: number, cols: number): Cell[][] => {
    const newBoard: Cell[][] = []
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = []
      for (let c = 0; c < cols; c++) {
        row.push({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        })
      }
      newBoard.push(row)
    }
    return newBoard
  }, [])

  const placeMines = useCallback((board: Cell[][], rows: number, cols: number, mineCount: number, excludeRow: number, excludeCol: number) => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })))
    let placed = 0

    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows)
      const c = Math.floor(Math.random() * cols)

      if (!newBoard[r][c].isMine && !(r === excludeRow && c === excludeCol)) {
        newBoard[r][c].isMine = true
        placed++
      }
    }

    // Calculate neighbor mines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!newBoard[r][c].isMine) {
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue
              const nr = r + dr
              const nc = c + dc
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
                count++
              }
            }
          }
          newBoard[r][c].neighborMines = count
        }
      }
    }

    return newBoard
  }, [])

  const resetGame = useCallback(() => {
    const newBoard = initializeBoard(config.rows, config.cols)
    setBoard(newBoard)
    setGameStatus('playing')
    setFlagCount(0)
    setTimer(0)
    setIsFirstClick(true)
    setClickedMine(null)
    gameStartTimeRef.current = Date.now()
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [config.rows, config.cols, initializeBoard])

  useEffect(() => {
    resetGame()
  }, [resetGame])

  useEffect(() => {
    if (gameStatus === 'won') {
      if (leaderboard.checkQualifies(timer)) {
        setShowNameModal(true)
      }
      leaderboard.fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus])

  const handleLeaderboardSubmit = useCallback(async (name: string) => {
    const duration = Date.now() - gameStartTimeRef.current
    await leaderboard.submitScore(timer, name, duration)
    leaderboard.savePlayerName(name)
    setShowNameModal(false)
  }, [leaderboard, timer])

  useEffect(() => {
    if (gameStatus === 'playing' && !isFirstClick) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameStatus, isFirstClick])

  const floodFill = useCallback((board: Cell[][], r: number, c: number) => {
    const rows = board.length
    const cols = board[0].length
    const queue: [number, number][] = [[r, c]]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const [cr, cc] = queue.shift()!
      const key = `${cr},${cc}`

      if (visited.has(key)) continue
      visited.add(key)

      if (board[cr][cc].isFlagged || board[cr][cc].isRevealed) continue

      board[cr][cc].isRevealed = true

      if (board[cr][cc].neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const nr = cr + dr
            const nc = cc + dc
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const nKey = `${nr},${nc}`
              if (!visited.has(nKey)) {
                queue.push([nr, nc])
              }
            }
          }
        }
      }
    }
  }, [])

  const checkWin = useCallback((board: Cell[][]) => {
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (!board[r][c].isMine && !board[r][c].isRevealed) {
          return false
        }
      }
    }
    return true
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus !== 'playing') return

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => r.map(c => ({ ...c })))

      if (isFirstClick) {
        const boardWithMines = placeMines(newBoard, config.rows, config.cols, config.mines, row, col)
        setIsFirstClick(false)
        floodFill(boardWithMines, row, col)
        return boardWithMines
      }

      if (newBoard[row][col].isFlagged || newBoard[row][col].isRevealed) {
        return prevBoard
      }

      if (newBoard[row][col].isMine) {
        newBoard[row][col].isRevealed = true
        setGameStatus('lost')
        setClickedMine([row, col])
        // Reveal all mines
        for (let r = 0; r < config.rows; r++) {
          for (let c = 0; c < config.cols; c++) {
            if (newBoard[r][c].isMine) {
              newBoard[r][c].isRevealed = true
            }
          }
        }
        return newBoard
      }

      floodFill(newBoard, row, col)

      if (checkWin(newBoard)) {
        setGameStatus('won')
        // Auto-flag remaining mines
        for (let r = 0; r < config.rows; r++) {
          for (let c = 0; c < config.cols; c++) {
            if (newBoard[r][c].isMine && !newBoard[r][c].isFlagged) {
              newBoard[r][c].isFlagged = true
            }
          }
        }
        setFlagCount(config.mines)
      }

      return newBoard
    })
  }, [gameStatus, isFirstClick, placeMines, config.rows, config.cols, config.mines, floodFill, checkWin])

  const handleCellRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    if (gameStatus !== 'playing' || board[row][col].isRevealed) return

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => r.map(c => ({ ...c })))

      if (newBoard[row][col].isFlagged) {
        newBoard[row][col].isFlagged = false
        setFlagCount(prev => prev - 1)
      } else {
        newBoard[row][col].isFlagged = true
        setFlagCount(prev => prev + 1)
      }

      return newBoard
    })
  }, [gameStatus, board])

  const handleTouchStart = useCallback((row: number, col: number) => {
    isLongPressRef.current = false
    longPressRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (gameStatus === 'playing' && !board[row][col].isRevealed) {
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(r => r.map(c => ({ ...c })))

          if (newBoard[row][col].isFlagged) {
            newBoard[row][col].isFlagged = false
            setFlagCount(prev => prev - 1)
          } else {
            newBoard[row][col].isFlagged = true
            setFlagCount(prev => prev + 1)
          }

          return newBoard
        })
      }
    }, 500)
  }, [gameStatus, board])

  const handleTouchEnd = useCallback((row: number, col: number) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
    }

    if (!isLongPressRef.current) {
      handleCellClick(row, col)
    }
  }, [handleCellClick])

  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
  }, [])

  const getCellSize = useCallback(() => {
    if (difficulty === 'expert') {
      return 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-xs sm:text-sm'
    } else if (difficulty === 'intermediate') {
      return 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-sm'
    } else {
      return 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-base'
    }
  }, [difficulty])

  const renderCell = useCallback((cell: Cell, row: number, col: number) => {
    const cellSize = getCellSize()
    let content = null
    let bgColor = 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'

    if (cell.isRevealed) {
      if (cell.isMine) {
        const isClickedMine = clickedMine && clickedMine[0] === row && clickedMine[1] === col
        bgColor = isClickedMine ? 'bg-red-500' : 'bg-red-300 dark:bg-red-800'
        content = <Bomb className="w-4 h-4 sm:w-5 sm:h-5" />
      } else {
        bgColor = 'bg-gray-100 dark:bg-gray-700'
        if (cell.neighborMines > 0) {
          content = (
            <span className={`font-bold ${NUMBER_COLORS[cell.neighborMines]}`}>
              {cell.neighborMines}
            </span>
          )
        }
      }
    } else if (cell.isFlagged) {
      content = <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
    }

    return (
      <button
        key={`${row}-${col}`}
        className={`${cellSize} ${bgColor} border border-gray-400 dark:border-gray-500 flex items-center justify-center transition-colors touch-manipulation select-none`}
        onClick={() => handleCellClick(row, col)}
        onContextMenu={(e) => handleCellRightClick(e, row, col)}
        onTouchStart={() => handleTouchStart(row, col)}
        onTouchEnd={() => handleTouchEnd(row, col)}
        disabled={gameStatus !== 'playing' && !isFirstClick}
      >
        {content}
      </button>
    )
  }, [getCellSize, handleCellClick, handleCellRightClick, handleTouchStart, handleTouchEnd, gameStatus, isFirstClick, clickedMine])

  const getSmileyFace = () => {
    if (gameStatus === 'won') return '😎'
    if (gameStatus === 'lost') return '😵'
    return '🙂'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Game Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        {/* Difficulty Selector */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => changeDifficulty('beginner')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              difficulty === 'beginner'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('beginner')}
          </button>
          <button
            onClick={() => changeDifficulty('intermediate')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              difficulty === 'intermediate'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('intermediate')}
          </button>
          <button
            onClick={() => changeDifficulty('expert')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              difficulty === 'expert'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('expert')}
          </button>
        </div>

        {/* Game Status Bar */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-bold text-gray-900 dark:text-white">
              {t('mines')}: {config.mines - flagCount}
            </span>
          </div>

          <button
            onClick={resetGame}
            className="text-3xl hover:scale-110 transition-transform"
            title={t('newGame')}
          >
            {getSmileyFace()}
          </button>

          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-gray-900 dark:text-white">
              {t('time')}: {timer}s
            </span>
          </div>
        </div>

        {/* Game Status Message */}
        {gameStatus === 'won' && (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg p-4 text-center font-semibold">
            {t('youWin')}
          </div>
        )}
        {gameStatus === 'lost' && (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg p-4 text-center font-semibold">
            {t('gameOver')}
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 overflow-x-auto">
        <div className="flex justify-center">
          <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}>
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardPanel leaderboard={leaderboard} />
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleLeaderboardSubmit}
        onClose={() => setShowNameModal(false)}
        score={timer}
        formatScore={leaderboard.config.formatScore}
        defaultName={leaderboard.savedPlayerName}
      />

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('guide.title')}
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.howToPlay.title')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.howToPlay.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.tips.title')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
