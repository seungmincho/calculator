// Mancala AI - Minimax with Alpha-Beta Pruning
// Supports 3 difficulty levels: easy, normal, hard

import {
  MancalaGameState,
  MancalaBoard,
  MancalaPlayer,
  getPlayerPits,
  getPlayerStore,
  getOpponentStore,
  getOppositePit,
  makeMancalaMove
} from '@/components/MancalaBoard'

export type Difficulty = 'easy' | 'normal' | 'hard'

// Difficulty settings
const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 2,
  normal: 5,
  hard: 8
}

// Get valid moves for a player
function getValidMoves(board: MancalaBoard, player: MancalaPlayer): number[] {
  const pits = getPlayerPits(player)
  return pits.filter(pit => board[pit] > 0)
}

// Simulate a move and return new board state
function simulateMove(
  board: MancalaBoard,
  pitIndex: number,
  player: MancalaPlayer
): { board: MancalaBoard; extraTurn: boolean; captured: number } {
  const newBoard = [...board]
  let stones = newBoard[pitIndex]
  newBoard[pitIndex] = 0

  let currentIndex = pitIndex
  const opponentStore = getOpponentStore(player)

  // Distribute stones
  while (stones > 0) {
    currentIndex = (currentIndex + 1) % 14
    if (currentIndex === opponentStore) continue
    newBoard[currentIndex]++
    stones--
  }

  const playerStore = getPlayerStore(player)
  const extraTurn = currentIndex === playerStore
  let captured = 0

  // Check capture
  const playerPits = getPlayerPits(player)
  if (playerPits.includes(currentIndex) && newBoard[currentIndex] === 1 && !extraTurn) {
    const oppositePit = getOppositePit(currentIndex)
    if (newBoard[oppositePit] > 0) {
      captured = newBoard[oppositePit] + 1
      newBoard[playerStore] += captured
      newBoard[currentIndex] = 0
      newBoard[oppositePit] = 0
    }
  }

  return { board: newBoard, extraTurn, captured }
}

// Check if game is over
function isGameOver(board: MancalaBoard): boolean {
  const p1Empty = getPlayerPits('player1').every(i => board[i] === 0)
  const p2Empty = getPlayerPits('player2').every(i => board[i] === 0)
  return p1Empty || p2Empty
}

// Get final scores
function getFinalScores(board: MancalaBoard): { player1: number; player2: number } {
  let p1Score = board[6]
  let p2Score = board[13]

  // Add remaining stones
  getPlayerPits('player1').forEach(i => p1Score += board[i])
  getPlayerPits('player2').forEach(i => p2Score += board[i])

  return { player1: p1Score, player2: p2Score }
}

// Evaluate board position
function evaluateBoard(board: MancalaBoard, player: MancalaPlayer): number {
  const opponent = player === 'player1' ? 'player2' : 'player1'
  const playerStore = getPlayerStore(player)
  const opponentStore = getPlayerStore(opponent)
  const playerPits = getPlayerPits(player)
  const opponentPits = getPlayerPits(opponent)

  let score = 0

  // Store difference (most important)
  score += (board[playerStore] - board[opponentStore]) * 10

  // Stones on our side vs opponent's side
  const ourStones = playerPits.reduce((sum, i) => sum + board[i], 0)
  const theirStones = opponentPits.reduce((sum, i) => sum + board[i], 0)
  score += ourStones - theirStones

  // Bonus for moves that give extra turns
  for (const pit of playerPits) {
    const stonesInPit = board[pit]
    if (stonesInPit > 0) {
      // Calculate where last stone lands
      let landingIndex = pit + stonesInPit
      // Account for skipping opponent's store
      if (pit < 6 && landingIndex > 6) landingIndex++ // For player1
      if (pit > 6 && landingIndex > 13) landingIndex = landingIndex % 14

      // Extra turn bonus
      if (landingIndex === playerStore) {
        score += 5
      }

      // Capture opportunity bonus
      if (playerPits.includes(landingIndex) && board[landingIndex] === 0) {
        const opposite = getOppositePit(landingIndex)
        if (board[opposite] > 0) {
          score += board[opposite] * 2
        }
      }
    }
  }

  // Penalty for leaving capture opportunities for opponent
  for (const pit of opponentPits) {
    const stonesInPit = board[pit]
    if (stonesInPit > 0) {
      let landingIndex = pit + stonesInPit
      if (pit > 6 && landingIndex > 13) landingIndex = landingIndex % 14
      if (landingIndex === 6) landingIndex++ // Skip player1's store

      if (opponentPits.includes(landingIndex) && board[landingIndex] === 0) {
        const opposite = getOppositePit(landingIndex)
        if (board[opposite] > 0) {
          score -= board[opposite] * 2
        }
      }
    }
  }

  return score
}

// Minimax with Alpha-Beta Pruning
function minimax(
  board: MancalaBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: MancalaPlayer,
  currentPlayer: MancalaPlayer
): number {
  // Terminal conditions
  if (isGameOver(board)) {
    const scores = getFinalScores(board)
    const aiScore = aiPlayer === 'player1' ? scores.player1 : scores.player2
    const oppScore = aiPlayer === 'player1' ? scores.player2 : scores.player1
    return (aiScore - oppScore) * 100 + depth // Prefer faster wins
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  const validMoves = getValidMoves(board, currentPlayer)
  if (validMoves.length === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  const opponent = currentPlayer === 'player1' ? 'player2' : 'player1'

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const pit of validMoves) {
      const result = simulateMove(board, pit, currentPlayer)
      const nextPlayer = result.extraTurn ? currentPlayer : opponent
      const nextIsMaximizing = result.extraTurn ? true : false

      const evalScore = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        nextIsMaximizing,
        aiPlayer,
        nextPlayer
      )
      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const pit of validMoves) {
      const result = simulateMove(board, pit, currentPlayer)
      const nextPlayer = result.extraTurn ? currentPlayer : opponent
      const nextIsMaximizing = result.extraTurn ? false : true

      const evalScore = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        nextIsMaximizing,
        aiPlayer,
        nextPlayer
      )
      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
    return minEval
  }
}

// Get best move for AI
export function getMancalaAIMove(
  state: MancalaGameState,
  aiPlayer: MancalaPlayer,
  difficulty: Difficulty
): number | null {
  const validMoves = getValidMoves(state.board, aiPlayer)
  if (validMoves.length === 0) return null
  if (validMoves.length === 1) return validMoves[0]

  const depth = DEPTH_MAP[difficulty]

  // Easy mode: sometimes make random moves
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }

  // Quick check for extra turn moves
  const extraTurnMoves = validMoves.filter(pit => {
    const result = simulateMove(state.board, pit, aiPlayer)
    return result.extraTurn
  })

  // In easy mode, don't always take extra turns
  if (difficulty === 'easy' && extraTurnMoves.length > 0 && Math.random() > 0.5) {
    return extraTurnMoves[Math.floor(Math.random() * extraTurnMoves.length)]
  }

  // Quick check for capture opportunities
  const captureMoves = validMoves.filter(pit => {
    const result = simulateMove(state.board, pit, aiPlayer)
    return result.captured > 0
  })

  // Normal mode: prioritize extra turns and captures
  if (difficulty === 'normal') {
    if (extraTurnMoves.length > 0 && Math.random() > 0.2) {
      return extraTurnMoves[Math.floor(Math.random() * extraTurnMoves.length)]
    }
    if (captureMoves.length > 0 && Math.random() > 0.3) {
      // Pick the capture with most stones
      captureMoves.sort((a, b) => {
        const resA = simulateMove(state.board, a, aiPlayer)
        const resB = simulateMove(state.board, b, aiPlayer)
        return resB.captured - resA.captured
      })
      return captureMoves[0]
    }
  }

  // Use minimax for best move
  let bestMove = validMoves[0]
  let bestScore = -Infinity
  const opponent = aiPlayer === 'player1' ? 'player2' : 'player1'

  for (const pit of validMoves) {
    const result = simulateMove(state.board, pit, aiPlayer)
    const nextPlayer = result.extraTurn ? aiPlayer : opponent
    const nextIsMaximizing = result.extraTurn

    const score = minimax(
      result.board,
      depth - 1,
      -Infinity,
      Infinity,
      nextIsMaximizing,
      aiPlayer,
      nextPlayer
    )

    // Add slight randomness for normal mode
    const adjustedScore = difficulty === 'normal'
      ? score + (Math.random() * 10 - 5)
      : score

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore
      bestMove = pit
    }
  }

  return bestMove
}
