// Othello AI - Minimax with Alpha-Beta Pruning
// Supports 3 difficulty levels: easy, normal, hard

import {
  OthelloGameState,
  OthelloBoard,
  getValidMoves,
  getFlippableStones,
  countStones
} from '@/components/OthelloBoard'

export type Difficulty = 'easy' | 'normal' | 'hard'

const BOARD_SIZE = 8

// Difficulty settings - depth for minimax
const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 5
}

// Position value weights - corners and edges are valuable
const POSITION_WEIGHTS = [
  [100, -20, 10,  5,  5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [ 10,  -2,  1,  1,  1,  1,  -2,  10],
  [  5,  -2,  1,  0,  0,  1,  -2,   5],
  [  5,  -2,  1,  0,  0,  1,  -2,   5],
  [ 10,  -2,  1,  1,  1,  1,  -2,  10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10,  5,  5, 10, -20, 100]
]

// Evaluate the board state
function evaluateBoard(
  board: OthelloBoard,
  player: 'black' | 'white'
): number {
  const opponent = player === 'black' ? 'white' : 'black'
  const { black, white } = countStones(board)

  let score = 0

  // Piece count (important in endgame)
  const totalPieces = black + white
  const pieceWeight = totalPieces > 54 ? 10 : 1 // Weight piece count heavily in endgame

  if (player === 'black') {
    score += (black - white) * pieceWeight
  } else {
    score += (white - black) * pieceWeight
  }

  // Position-based scoring
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === player) {
        score += POSITION_WEIGHTS[y][x]
      } else if (board[y][x] === opponent) {
        score -= POSITION_WEIGHTS[y][x]
      }
    }
  }

  // Mobility (number of valid moves)
  const playerMoves = getValidMoves(board, player).length
  const opponentMoves = getValidMoves(board, opponent).length
  score += (playerMoves - opponentMoves) * 5

  // Corner control bonus
  const corners = [[0, 0], [0, 7], [7, 0], [7, 7]]
  for (const [y, x] of corners) {
    if (board[y][x] === player) score += 50
    else if (board[y][x] === opponent) score -= 50
  }

  return score
}

// Make a move on a board copy
function makeTestMove(
  board: OthelloBoard,
  x: number,
  y: number,
  player: 'black' | 'white'
): OthelloBoard | null {
  const flipped = getFlippableStones(board, x, y, player)
  if (flipped.length === 0) return null

  const newBoard = board.map(row => [...row])
  newBoard[y][x] = player

  for (const pos of flipped) {
    newBoard[pos.y][pos.x] = player
  }

  return newBoard
}

// Check if game is over
function isGameOver(board: OthelloBoard): boolean {
  const blackMoves = getValidMoves(board, 'black')
  const whiteMoves = getValidMoves(board, 'white')
  return blackMoves.length === 0 && whiteMoves.length === 0
}

// Minimax with Alpha-Beta Pruning
function minimax(
  board: OthelloBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: 'black' | 'white',
  currentPlayer: 'black' | 'white'
): number {
  const opponent = currentPlayer === 'black' ? 'white' : 'black'

  // Terminal conditions
  if (depth === 0 || isGameOver(board)) {
    return evaluateBoard(board, aiPlayer)
  }

  const validMoves = getValidMoves(board, currentPlayer)

  // If no valid moves, pass to opponent
  if (validMoves.length === 0) {
    return minimax(board, depth - 1, alpha, beta, !isMaximizing, aiPlayer, opponent)
  }

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of validMoves) {
      const newBoard = makeTestMove(board, move.x, move.y, currentPlayer)
      if (!newBoard) continue

      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer, opponent)
      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of validMoves) {
      const newBoard = makeTestMove(board, move.x, move.y, currentPlayer)
      if (!newBoard) continue

      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer, opponent)
      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
    return minEval
  }
}

// Get best move for AI
export function getOthelloAIMove(
  state: OthelloGameState,
  aiPlayer: 'black' | 'white',
  difficulty: Difficulty
): { x: number; y: number } | null {
  const validMoves = state.validMoves
  if (validMoves.length === 0) return null
  if (validMoves.length === 1) return validMoves[0]

  const depth = DEPTH_MAP[difficulty]

  // Easy mode: sometimes make random moves
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }

  // Prioritize corners if available
  const corners = [[0, 0], [0, 7], [7, 0], [7, 7]]
  for (const [cy, cx] of corners) {
    const cornerMove = validMoves.find(m => m.x === cx && m.y === cy)
    if (cornerMove) {
      // Always take corner in hard mode, usually in normal mode
      if (difficulty === 'hard' || Math.random() < 0.8) {
        return cornerMove
      }
    }
  }

  // Use minimax for best move
  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    const newBoard = makeTestMove(state.board, move.x, move.y, aiPlayer)
    if (!newBoard) continue

    const opponent = aiPlayer === 'black' ? 'white' : 'black'
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiPlayer, opponent)

    // Add slight randomness for normal mode
    const adjustedScore = difficulty === 'normal'
      ? score + (Math.random() * 10 - 5)
      : score

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore
      bestMove = move
    }
  }

  return bestMove
}
