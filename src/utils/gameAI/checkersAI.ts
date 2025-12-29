// Checkers AI - Minimax with Alpha-Beta Pruning
// Supports 3 difficulty levels: easy, normal, hard

import {
  CheckersGameState,
  CheckersBoard,
  CheckersPiece,
  getAllValidMoves,
  getValidMovesForPiece,
  countPieces
} from '@/components/CheckersBoard'

export type Difficulty = 'easy' | 'normal' | 'hard'

const BOARD_SIZE = 8

// Difficulty settings
const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 2,
  normal: 4,
  hard: 6
}

// Piece values
const PIECE_VALUE = 100
const KING_VALUE = 175
const BACK_ROW_BONUS = 10
const CENTER_CONTROL_BONUS = 5
const MOBILITY_BONUS = 2

// Evaluate board position
function evaluateBoard(
  board: CheckersBoard,
  player: 'red' | 'black'
): number {
  const opponent = player === 'red' ? 'black' : 'red'
  let score = 0

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (!piece) continue

      const baseValue = piece.isKing ? KING_VALUE : PIECE_VALUE
      const isPlayer = piece.color === player

      // Piece value
      if (isPlayer) {
        score += baseValue
      } else {
        score -= baseValue
      }

      // Position bonuses
      if (!piece.isKing) {
        // Back row protection (for non-kings)
        if ((piece.color === 'red' && row === 7) || (piece.color === 'black' && row === 0)) {
          score += isPlayer ? BACK_ROW_BONUS : -BACK_ROW_BONUS
        }

        // Advancement bonus (closer to becoming king)
        const advancement = piece.color === 'red' ? (7 - row) : row
        score += (isPlayer ? advancement : -advancement) * 3
      }

      // Center control
      if (col >= 2 && col <= 5 && row >= 2 && row <= 5) {
        score += isPlayer ? CENTER_CONTROL_BONUS : -CENTER_CONTROL_BONUS
      }
    }
  }

  // Mobility bonus
  const playerMoves = getAllValidMoves(board, player)
  const opponentMoves = getAllValidMoves(board, opponent)

  const playerMobility = playerMoves.reduce((sum, m) => sum + m.moves.length, 0)
  const opponentMobility = opponentMoves.reduce((sum, m) => sum + m.moves.length, 0)

  score += (playerMobility - opponentMobility) * MOBILITY_BONUS

  return score
}

// Apply a move to the board
function applyMove(
  board: CheckersBoard,
  from: { row: number; col: number },
  to: { row: number; col: number },
  captures?: { row: number; col: number }[]
): CheckersBoard {
  const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null))
  const piece = newBoard[from.row][from.col]

  if (!piece) return newBoard

  // Move piece
  newBoard[to.row][to.col] = { ...piece }
  newBoard[from.row][from.col] = null

  // Apply captures
  if (captures) {
    for (const cap of captures) {
      newBoard[cap.row][cap.col] = null
    }
  }

  // Check for king promotion
  if (!piece.isKing) {
    if ((piece.color === 'red' && to.row === 0) || (piece.color === 'black' && to.row === 7)) {
      newBoard[to.row][to.col]!.isKing = true
    }
  }

  return newBoard
}

// Get all possible moves including multi-captures
function getAllMovesWithMultiCaptures(
  board: CheckersBoard,
  player: 'red' | 'black'
): {
  from: { row: number; col: number }
  to: { row: number; col: number }
  captures?: { row: number; col: number }[]
  finalBoard: CheckersBoard
}[] {
  const allMoves = getAllValidMoves(board, player)
  const expandedMoves: {
    from: { row: number; col: number }
    to: { row: number; col: number }
    captures?: { row: number; col: number }[]
    finalBoard: CheckersBoard
  }[] = []

  for (const pieceMove of allMoves) {
    for (const move of pieceMove.moves) {
      const newBoard = applyMove(board, pieceMove.from, move, move.captures)

      // Check for multi-capture
      if (move.captures && move.captures.length > 0) {
        const piece = newBoard[move.row][move.col]
        // Don't allow multi-capture if piece just became a king
        const wasKing = board[pieceMove.from.row][pieceMove.from.col]?.isKing
        const isKingNow = piece?.isKing

        if (!(wasKing === false && isKingNow === true)) {
          const moreMoves = getValidMovesForPiece(newBoard, move.row, move.col)
          const moreCaptures = moreMoves.filter(m => m.captures && m.captures.length > 0)

          if (moreCaptures.length > 0) {
            // Recursively expand multi-captures
            for (const nextMove of moreCaptures) {
              const allCaptures = [...(move.captures || []), ...(nextMove.captures || [])]
              const finalBoard = applyMove(newBoard, { row: move.row, col: move.col }, nextMove, nextMove.captures)

              expandedMoves.push({
                from: pieceMove.from,
                to: nextMove,
                captures: allCaptures,
                finalBoard
              })
            }
            continue
          }
        }
      }

      expandedMoves.push({
        from: pieceMove.from,
        to: move,
        captures: move.captures,
        finalBoard: newBoard
      })
    }
  }

  return expandedMoves
}

// Minimax with Alpha-Beta Pruning
function minimax(
  board: CheckersBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: 'red' | 'black',
  currentPlayer: 'red' | 'black'
): number {
  const opponent = currentPlayer === 'red' ? 'black' : 'red'
  const { red, black } = countPieces(board)

  // Terminal conditions
  if (red === 0) return aiPlayer === 'black' ? 10000 + depth : -10000 - depth
  if (black === 0) return aiPlayer === 'red' ? 10000 + depth : -10000 - depth

  const moves = getAllMovesWithMultiCaptures(board, currentPlayer)
  if (moves.length === 0) {
    return isMaximizing ? -10000 - depth : 10000 + depth
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of moves) {
      const evalScore = minimax(move.finalBoard, depth - 1, alpha, beta, false, aiPlayer, opponent)
      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of moves) {
      const evalScore = minimax(move.finalBoard, depth - 1, alpha, beta, true, aiPlayer, opponent)
      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
    return minEval
  }
}

// Get best move for AI
export function getCheckersAIMove(
  state: CheckersGameState,
  aiPlayer: 'red' | 'black',
  difficulty: Difficulty
): { from: { row: number; col: number }; to: { row: number; col: number } } | null {
  const moves = getAllMovesWithMultiCaptures(state.board, aiPlayer)
  if (moves.length === 0) return null
  if (moves.length === 1) return { from: moves[0].from, to: moves[0].to }

  const depth = DEPTH_MAP[difficulty]

  // Easy mode: sometimes make random moves
  if (difficulty === 'easy' && Math.random() < 0.35) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)]
    return { from: randomMove.from, to: randomMove.to }
  }

  // Prioritize captures
  const captureMoves = moves.filter(m => m.captures && m.captures.length > 0)
  if (captureMoves.length > 0) {
    // In easy/normal mode, pick based on number of captures
    if (difficulty !== 'hard') {
      // Sort by number of captures (more is better)
      captureMoves.sort((a, b) => (b.captures?.length || 0) - (a.captures?.length || 0))
      // Add some randomness in normal mode
      if (difficulty === 'normal' && Math.random() < 0.3 && captureMoves.length > 1) {
        return { from: captureMoves[1].from, to: captureMoves[1].to }
      }
      return { from: captureMoves[0].from, to: captureMoves[0].to }
    }
  }

  // Use minimax for best move
  let bestMove = moves[0]
  let bestScore = -Infinity
  const opponent = aiPlayer === 'red' ? 'black' : 'red'

  for (const move of moves) {
    const score = minimax(move.finalBoard, depth - 1, -Infinity, Infinity, false, aiPlayer, opponent)

    // Add slight randomness for normal mode
    const adjustedScore = difficulty === 'normal'
      ? score + (Math.random() * 20 - 10)
      : score

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore
      bestMove = move
    }
  }

  return { from: bestMove.from, to: bestMove.to }
}
