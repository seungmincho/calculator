// Connect4 AI - Minimax with Alpha-Beta Pruning
// Supports 3 difficulty levels: easy, normal, hard

import { Connect4GameState, Connect4Board, getDropRow, makeConnect4Move, checkWinner } from '@/components/Connect4Board'

export type Difficulty = 'easy' | 'normal' | 'hard'

const ROWS = 6
const COLS = 7

// Difficulty settings
const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 6
}

// Position value weights for heuristic evaluation
const POSITION_WEIGHTS = [
  [3, 4, 5, 7, 5, 4, 3],
  [4, 6, 8, 10, 8, 6, 4],
  [5, 8, 11, 13, 11, 8, 5],
  [5, 8, 11, 13, 11, 8, 5],
  [4, 6, 8, 10, 8, 6, 4],
  [3, 4, 5, 7, 5, 4, 3]
]

// Evaluate a window of 4 cells
function evaluateWindow(
  window: (string | null)[],
  player: 'red' | 'yellow',
  opponent: 'red' | 'yellow'
): number {
  let score = 0
  const playerCount = window.filter(c => c === player).length
  const opponentCount = window.filter(c => c === opponent).length
  const emptyCount = window.filter(c => c === null).length

  if (playerCount === 4) {
    score += 100000
  } else if (playerCount === 3 && emptyCount === 1) {
    score += 50
  } else if (playerCount === 2 && emptyCount === 2) {
    score += 10
  }

  if (opponentCount === 3 && emptyCount === 1) {
    score -= 80 // Prioritize blocking
  } else if (opponentCount === 2 && emptyCount === 2) {
    score -= 8
  }

  return score
}

// Evaluate the entire board
function evaluateBoard(
  board: Connect4Board,
  player: 'red' | 'yellow'
): number {
  const opponent = player === 'red' ? 'yellow' : 'red'
  let score = 0

  // Position-based scoring
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === player) {
        score += POSITION_WEIGHTS[row][col]
      } else if (board[row][col] === opponent) {
        score -= POSITION_WEIGHTS[row][col]
      }
    }
  }

  // Horizontal windows
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window = [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]]
      score += evaluateWindow(window, player, opponent)
    }
  }

  // Vertical windows
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      const window = [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]]
      score += evaluateWindow(window, player, opponent)
    }
  }

  // Diagonal (↘) windows
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window = [board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]]
      score += evaluateWindow(window, player, opponent)
    }
  }

  // Diagonal (↗) windows
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window = [board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]]
      score += evaluateWindow(window, player, opponent)
    }
  }

  return score
}

// Get valid columns (not full)
function getValidColumns(board: Connect4Board): number[] {
  const validCols: number[] = []
  for (let col = 0; col < COLS; col++) {
    if (getDropRow(board, col) !== -1) {
      validCols.push(col)
    }
  }
  return validCols
}

// Check if game is over
function isTerminalNode(board: Connect4Board, lastMove: { row: number; col: number; player: 'red' | 'yellow' } | null): boolean {
  if (!lastMove) return false
  const { winner } = checkWinner(board, lastMove)
  if (winner) return true
  return getValidColumns(board).length === 0
}

// Minimax with Alpha-Beta Pruning
function minimax(
  board: Connect4Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: 'red' | 'yellow',
  lastMove: { row: number; col: number; player: 'red' | 'yellow' } | null
): number {
  const opponent = aiPlayer === 'red' ? 'yellow' : 'red'

  // Check terminal state
  if (lastMove) {
    const { winner } = checkWinner(board, lastMove)
    if (winner === aiPlayer) return 1000000 + depth
    if (winner === opponent) return -1000000 - depth
  }

  if (depth === 0 || getValidColumns(board).length === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  const validCols = getValidColumns(board)

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const col of validCols) {
      const row = getDropRow(board, col)
      const newBoard = board.map(r => [...r])
      newBoard[row][col] = aiPlayer
      const move = { row, col, player: aiPlayer }
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer, move)
      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const col of validCols) {
      const row = getDropRow(board, col)
      const newBoard = board.map(r => [...r])
      newBoard[row][col] = opponent
      const move: { row: number; col: number; player: 'red' | 'yellow' } = { row, col, player: opponent }
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer, move)
      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
    return minEval
  }
}

// Get best move for AI
export function getConnect4AIMove(
  state: Connect4GameState,
  aiPlayer: 'red' | 'yellow',
  difficulty: Difficulty
): number {
  const validCols = getValidColumns(state.board)
  if (validCols.length === 0) return -1
  if (validCols.length === 1) return validCols[0]

  const depth = DEPTH_MAP[difficulty]
  const opponent = aiPlayer === 'red' ? 'yellow' : 'red'

  // Easy mode: sometimes make random moves
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return validCols[Math.floor(Math.random() * validCols.length)]
  }

  // Check for immediate win
  for (const col of validCols) {
    const row = getDropRow(state.board, col)
    const newBoard = state.board.map(r => [...r])
    newBoard[row][col] = aiPlayer
    const { winner } = checkWinner(newBoard, { row, col, player: aiPlayer })
    if (winner === aiPlayer) return col
  }

  // Check for immediate block (opponent's win)
  for (const col of validCols) {
    const row = getDropRow(state.board, col)
    const newBoard = state.board.map(r => [...r])
    newBoard[row][col] = opponent
    const { winner } = checkWinner(newBoard, { row, col, player: opponent })
    if (winner === opponent) return col
  }

  // Use minimax for best move
  let bestCol = validCols[Math.floor(validCols.length / 2)] // Default to center-ish
  let bestScore = -Infinity

  // Order columns by center preference for better pruning
  const orderedCols = [...validCols].sort((a, b) =>
    Math.abs(a - 3) - Math.abs(b - 3)
  )

  for (const col of orderedCols) {
    const row = getDropRow(state.board, col)
    const newBoard = state.board.map(r => [...r])
    newBoard[row][col] = aiPlayer
    const move = { row, col, player: aiPlayer }

    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiPlayer, move)

    // Add slight randomness for normal mode
    const adjustedScore = difficulty === 'normal'
      ? score + (Math.random() * 5 - 2.5)
      : score

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore
      bestCol = col
    }
  }

  return bestCol
}
