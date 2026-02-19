'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Lightbulb, Undo, Eraser, Clock, BookOpen } from 'lucide-react'

type Cell = {
  value: number
  isFixed: boolean
  notes: Set<number>
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

const DIFFICULTY_CONFIG = {
  easy: 38,
  medium: 33,
  hard: 27,
  expert: 22,
}

export default function Sudoku() {
  const t = useTranslations('sudoku')

  const [board, setBoard] = useState<Cell[][]>([])
  const [solution, setSolution] = useState<number[][]>([])
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [notesMode, setNotesMode] = useState(false)
  const [history, setHistory] = useState<Cell[][][]>([])
  const [errors, setErrors] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning && !completed) {
      interval = setInterval(() => {
        setTime((t) => t + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, completed])

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Generate a complete valid Sudoku solution
  const generateSolution = useCallback((): number[][] => {
    const grid: number[][] = Array(9)
      .fill(0)
      .map(() => Array(9).fill(0))

    const isValid = (grid: number[][], row: number, col: number, num: number): boolean => {
      // Check row
      for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) return false
      }
      // Check column
      for (let x = 0; x < 9; x++) {
        if (grid[x][col] === num) return false
      }
      // Check 3x3 box
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (grid[boxRow + i][boxCol + j] === num) return false
        }
      }
      return true
    }

    const solve = (grid: number[][]): boolean => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (grid[row][col] === 0) {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
            for (const num of numbers) {
              if (isValid(grid, row, col, num)) {
                grid[row][col] = num
                if (solve(grid)) return true
                grid[row][col] = 0
              }
            }
            return false
          }
        }
      }
      return true
    }

    solve(grid)
    return grid
  }, [])

  // Generate puzzle by removing cells from solution
  const generatePuzzle = useCallback(
    (solution: number[][], difficulty: Difficulty): Cell[][] => {
      const puzzle: Cell[][] = solution.map((row) =>
        row.map((value) => ({
          value,
          isFixed: true,
          notes: new Set<number>(),
        }))
      )

      const clues = DIFFICULTY_CONFIG[difficulty]
      const cellsToRemove = 81 - clues
      const positions = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5)

      for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
        const pos = positions[i]
        const row = Math.floor(pos / 9)
        const col = pos % 9
        puzzle[row][col].value = 0
        puzzle[row][col].isFixed = false
      }

      return puzzle
    },
    []
  )

  // Start new game
  const startNewGame = useCallback(() => {
    const newSolution = generateSolution()
    const newPuzzle = generatePuzzle(newSolution, difficulty)
    setSolution(newSolution)
    setBoard(newPuzzle)
    setSelectedCell(null)
    setHistory([])
    setErrors(0)
    setHintsUsed(0)
    setCompleted(false)
    setTime(0)
    setIsRunning(true)
  }, [difficulty, generateSolution, generatePuzzle])

  // Initialize game on mount
  useEffect(() => {
    startNewGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if number is valid in position
  const isValidMove = useCallback(
    (board: Cell[][], row: number, col: number, num: number): boolean => {
      // Check row
      for (let x = 0; x < 9; x++) {
        if (x !== col && board[row][x].value === num) return false
      }
      // Check column
      for (let x = 0; x < 9; x++) {
        if (x !== row && board[x][col].value === num) return false
      }
      // Check 3x3 box
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = boxRow + i
          const c = boxCol + j
          if ((r !== row || c !== col) && board[r][c].value === num) return false
        }
      }
      return true
    },
    []
  )

  // Get conflicts for a cell
  const getConflicts = useCallback((board: Cell[][], row: number, col: number): boolean => {
    const value = board[row][col].value
    if (value === 0) return false
    return !isValidMove(board, row, col, value)
  }, [isValidMove])

  // Handle cell input
  const handleCellInput = useCallback(
    (row: number, col: number, num: number) => {
      if (completed) return
      const cell = board[row][col]
      if (cell.isFixed) return

      setHistory((prev) => [...prev, board.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })))])

      const newBoard = board.map((r, ri) =>
        r.map((c, ci) => {
          if (ri === row && ci === col) {
            if (notesMode) {
              const notes = new Set(c.notes)
              if (notes.has(num)) {
                notes.delete(num)
              } else {
                notes.add(num)
              }
              return { ...c, notes }
            } else {
              if (c.value === num) {
                return { ...c, value: 0, notes: new Set<number>() }
              }
              const valid = isValidMove(board, row, col, num)
              if (!valid) {
                setErrors((e) => e + 1)
              }
              return { ...c, value: num, notes: new Set<number>() }
            }
          }
          return { ...c }
        })
      )

      setBoard(newBoard)

      // Check completion
      const isFilled = newBoard.every((row) => row.every((cell) => cell.value !== 0))
      const isValid = newBoard.every((row, ri) =>
        row.every((cell, ci) => cell.value === 0 || !getConflicts(newBoard, ri, ci))
      )
      if (isFilled && isValid) {
        setCompleted(true)
        setIsRunning(false)
      }
    },
    [board, notesMode, completed, isValidMove, getConflicts]
  )

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || completed) return
      const [row, col] = selectedCell

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        handleCellInput(row, col, parseInt(e.key))
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault()
        if (!board[row][col].isFixed) {
          setHistory((prev) => [...prev, board.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })))])
          const newBoard = [...board]
          newBoard[row][col] = { ...newBoard[row][col], value: 0, notes: new Set() }
          setBoard(newBoard)
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        let newRow = row
        let newCol = col
        if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1)
        if (e.key === 'ArrowDown') newRow = Math.min(8, row + 1)
        if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1)
        if (e.key === 'ArrowRight') newCol = Math.min(8, col + 1)
        setSelectedCell([newRow, newCol])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, board, completed, handleCellInput])

  // Hint
  const handleHint = useCallback(() => {
    if (completed) return
    const emptyCells: [number, number][] = []
    board.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (!cell.isFixed && cell.value === 0) {
          emptyCells.push([ri, ci])
        }
      })
    })

    if (emptyCells.length === 0) return

    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    setHistory((prev) => [...prev, board.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })))])
    const newBoard = [...board]
    newBoard[row][col] = { ...newBoard[row][col], value: solution[row][col], notes: new Set() }
    setBoard(newBoard)
    setHintsUsed((h) => h + 1)
    setSelectedCell([row, col])

    // Check completion
    const isFilled = newBoard.every((row) => row.every((cell) => cell.value !== 0))
    if (isFilled) {
      setCompleted(true)
      setIsRunning(false)
    }
  }, [board, solution, completed])

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setBoard(prev)
    setHistory((h) => h.slice(0, -1))
  }, [history])

  // Erase
  const handleErase = useCallback(() => {
    if (!selectedCell || completed) return
    const [row, col] = selectedCell
    if (board[row][col].isFixed) return
    setHistory((prev) => [...prev, board.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })))])
    const newBoard = [...board]
    newBoard[row][col] = { ...newBoard[row][col], value: 0, notes: new Set() }
    setBoard(newBoard)
  }, [selectedCell, board, completed])

  // Check if cell is highlighted
  const isCellHighlighted = useCallback(
    (row: number, col: number): string => {
      if (!selectedCell) return ''
      const [selRow, selCol] = selectedCell
      const selValue = board[selRow][selCol].value

      if (row === selRow && col === selCol) return 'bg-blue-200 dark:bg-blue-700'

      const boxRow = Math.floor(row / 3) === Math.floor(selRow / 3)
      const boxCol = Math.floor(col / 3) === Math.floor(selCol / 3)

      if (row === selRow || col === selCol || (boxRow && boxCol)) {
        return 'bg-blue-50 dark:bg-blue-900/30'
      }

      if (selValue !== 0 && board[row][col].value === selValue) {
        return 'bg-blue-100 dark:bg-blue-800/50'
      }

      return ''
    },
    [selectedCell, board]
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="easy">{t('easy')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="hard">{t('hard')}</option>
              <option value="expert">{t('expert')}</option>
            </select>
            <button
              onClick={startNewGame}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 text-sm"
            >
              <Play size={16} />
              {t('newGame')}
            </button>
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Clock size={18} />
            <span className="font-mono text-lg">{formatTime(time)}</span>
          </div>
        </div>
      </div>

      {/* Game Board and Actions */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Board */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
            <div className="aspect-square w-full max-w-2xl mx-auto">
              <div
                className="grid grid-cols-9 gap-0 border-4 border-gray-900 dark:border-gray-100"
                style={{ height: '100%' }}
              >
                {board.map((row, ri) =>
                  row.map((cell, ci) => {
                    const isConflict = getConflicts(board, ri, ci)
                    const highlighted = isCellHighlighted(ri, ci)
                    const thickBorderRight = (ci + 1) % 3 === 0 && ci < 8
                    const thickBorderBottom = (ri + 1) % 3 === 0 && ri < 8

                    return (
                      <button
                        key={`${ri}-${ci}`}
                        onClick={() => setSelectedCell([ri, ci])}
                        className={`
                          aspect-square flex items-center justify-center relative
                          border border-gray-300 dark:border-gray-600
                          ${thickBorderRight ? 'border-r-4 border-r-gray-900 dark:border-r-gray-100' : ''}
                          ${thickBorderBottom ? 'border-b-4 border-b-gray-900 dark:border-b-gray-100' : ''}
                          ${highlighted}
                          ${cell.isFixed ? 'font-bold' : ''}
                          ${isConflict ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : ''}
                          hover:bg-gray-100 dark:hover:bg-gray-700
                          transition-colors text-sm sm:text-base md:text-lg
                        `}
                      >
                        {cell.value !== 0 ? (
                          <span className={cell.isFixed ? 'text-gray-900 dark:text-white' : 'text-blue-600 dark:text-blue-400'}>
                            {cell.value}
                          </span>
                        ) : (
                          cell.notes.size > 0 && (
                            <div className="grid grid-cols-3 gap-0 absolute inset-0 p-0.5 text-[8px] sm:text-[10px]">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                <span key={n} className="text-gray-400 dark:text-gray-500 text-center">
                                  {cell.notes.has(n) ? n : ''}
                                </span>
                              ))}
                            </div>
                          )
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-9 gap-2 mt-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => selectedCell && handleCellInput(selectedCell[0], selectedCell[1], num)}
                  disabled={!selectedCell || completed}
                  className="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions & Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('title')}</h3>

            <button
              onClick={() => setNotesMode(!notesMode)}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                notesMode
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('notes')}
            </button>

            <button
              onClick={handleHint}
              disabled={completed}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lightbulb size={18} />
              {t('hint')}
            </button>

            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Undo size={18} />
              {t('undo')}
            </button>

            <button
              onClick={handleErase}
              disabled={!selectedCell || completed || (selectedCell && board[selectedCell[0]][selectedCell[1]].isFixed)}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Eraser size={18} />
              {t('erase')}
            </button>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('time')}</span>
                <span className="font-mono text-gray-900 dark:text-white">{formatTime(time)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('errors')}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{errors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('hintsUsed')}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{hintsUsed}</span>
              </div>
            </div>

            {completed && (
              <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 text-center space-y-2">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{t('completed')}</p>
                <p className="text-sm text-green-700 dark:text-green-300">{t('congratulations')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('time')}: {formatTime(time)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={24} />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.howToPlay.title')}</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.howToPlay.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
