// Omok (Gomoku) AI - Pattern-based with Minimax for hard mode
// Supports 3 difficulty levels: easy, normal, hard

import { OmokGameState, OmokMove } from '@/utils/webrtc'

export type Difficulty = 'easy' | 'normal' | 'hard'

const BOARD_SIZE = 19

// Difficulty settings
const SEARCH_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3
}

// Pattern scores - higher is better
const PATTERNS = {
  FIVE: 100000,        // 5 in a row - win
  OPEN_FOUR: 50000,    // _XXXX_ - unstoppable
  FOUR: 10000,         // XXXX with one end blocked
  OPEN_THREE: 5000,    // _XXX_ - threatens open four
  THREE: 1000,         // XXX with one end blocked
  OPEN_TWO: 500,       // _XX_ - potential threat
  TWO: 100,            // XX with one end blocked
}

type Board = (null | 'black' | 'white')[][]

// Directions for checking patterns
const DIRECTIONS = [
  [1, 0],   // horizontal
  [0, 1],   // vertical
  [1, 1],   // diagonal ↘
  [1, -1]   // diagonal ↗
]

// Check if position is valid
function isValidPos(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE
}

// Count consecutive stones in a direction (strict - no gaps)
function countDirectionStrict(
  board: Board,
  x: number,
  y: number,
  dx: number,
  dy: number,
  player: 'black' | 'white'
): { count: number; blocked: boolean } {
  let count = 0
  let blocked = false
  let nx = x + dx
  let ny = y + dy

  while (isValidPos(nx, ny) && board[ny][nx] === player) {
    count++
    nx += dx
    ny += dy
  }

  // Check if end is blocked
  if (!isValidPos(nx, ny) || (board[ny][nx] !== null && board[ny][nx] !== player)) {
    blocked = true
  }

  return { count, blocked }
}

// Count stones with one gap allowed (for threat detection)
function countDirectionWithGap(
  board: Board,
  x: number,
  y: number,
  dx: number,
  dy: number,
  player: 'black' | 'white'
): { count: number; blocked: boolean; gapPos: { x: number; y: number } | null } {
  let count = 0
  let blocked = false
  let gapPos: { x: number; y: number } | null = null
  let nx = x + dx
  let ny = y + dy

  while (isValidPos(nx, ny)) {
    if (board[ny][nx] === player) {
      count++
      nx += dx
      ny += dy
    } else if (board[ny][nx] === null && !gapPos) {
      // Check for gap pattern (X_XX)
      const nextX = nx + dx
      const nextY = ny + dy
      if (isValidPos(nextX, nextY) && board[nextY][nextX] === player) {
        gapPos = { x: nx, y: ny }
        nx = nextX
        ny = nextY
        count++
      } else {
        break
      }
    } else {
      if (board[ny][nx] !== null) blocked = true
      break
    }
  }

  if (!isValidPos(nx, ny)) blocked = true

  return { count, blocked, gapPos }
}

// Evaluate a line through a position (strict consecutive)
function evaluateLine(
  board: Board,
  x: number,
  y: number,
  dx: number,
  dy: number,
  player: 'black' | 'white'
): number {
  const forward = countDirectionStrict(board, x, y, dx, dy, player)
  const backward = countDirectionStrict(board, x, y, -dx, -dy, player)

  const total = forward.count + backward.count + 1
  const bothBlocked = forward.blocked && backward.blocked
  const oneBlocked = forward.blocked || backward.blocked

  if (total >= 5) return PATTERNS.FIVE
  if (total === 4) {
    if (!oneBlocked) return PATTERNS.OPEN_FOUR
    if (!bothBlocked) return PATTERNS.FOUR
  }
  if (total === 3) {
    if (!oneBlocked) return PATTERNS.OPEN_THREE
    if (!bothBlocked) return PATTERNS.THREE
  }
  if (total === 2) {
    if (!oneBlocked) return PATTERNS.OPEN_TWO
    if (!bothBlocked) return PATTERNS.TWO
  }

  return 0
}

// Evaluate position for a player
function evaluatePosition(
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white'
): number {
  let score = 0

  for (const [dx, dy] of DIRECTIONS) {
    score += evaluateLine(board, x, y, dx, dy, player)
  }

  // Bonus for center positions
  const centerX = Math.floor(BOARD_SIZE / 2)
  const centerY = Math.floor(BOARD_SIZE / 2)
  const distFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY)
  score += Math.max(0, 20 - distFromCenter)

  return score
}

// Find all empty positions near existing stones
function getCandidateMoves(board: Board): { x: number; y: number }[] {
  const candidates: Set<string> = new Set()
  const range = 2

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) {
        // Add all empty positions within range
        for (let dy = -range; dy <= range; dy++) {
          for (let dx = -range; dx <= range; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (isValidPos(nx, ny) && board[ny][nx] === null) {
              candidates.add(`${nx},${ny}`)
            }
          }
        }
      }
    }
  }

  // If no candidates (empty board), return center
  if (candidates.size === 0) {
    const center = Math.floor(BOARD_SIZE / 2)
    return [{ x: center, y: center }]
  }

  return Array.from(candidates).map(s => {
    const [x, y] = s.split(',').map(Number)
    return { x, y }
  })
}

// Check for immediate win or block
function findWinningMove(
  board: Board,
  player: 'black' | 'white'
): { x: number; y: number } | null {
  const candidates = getCandidateMoves(board)

  for (const { x, y } of candidates) {
    // Temporarily place stone
    board[y][x] = player

    // Check for 5 in a row
    for (const [dx, dy] of DIRECTIONS) {
      let count = 1

      // Forward
      let nx = x + dx
      let ny = y + dy
      while (isValidPos(nx, ny) && board[ny][nx] === player) {
        count++
        nx += dx
        ny += dy
      }

      // Backward
      nx = x - dx
      ny = y - dy
      while (isValidPos(nx, ny) && board[ny][nx] === player) {
        count++
        nx -= dx
        ny -= dy
      }

      if (count >= 5) {
        board[y][x] = null
        return { x, y }
      }
    }

    board[y][x] = null
  }

  return null
}

// Find move that creates open four or double threats
function findThreatMove(
  board: Board,
  player: 'black' | 'white'
): { x: number; y: number } | null {
  const candidates = getCandidateMoves(board)
  let bestMove: { x: number; y: number } | null = null
  let bestScore = 0

  for (const { x, y } of candidates) {
    board[y][x] = player
    const score = evaluatePosition(board, x, y, player)
    board[y][x] = null

    if (score >= PATTERNS.OPEN_FOUR && score > bestScore) {
      bestScore = score
      bestMove = { x, y }
    }
  }

  return bestMove
}

// Find gap threats: patterns like X_XXX, XX_XX, XXX_X that could become 5
function findGapThreatMove(
  board: Board,
  player: 'black' | 'white'
): { x: number; y: number } | null {
  const gapMoves: { x: number; y: number; score: number }[] = []

  // Scan entire board for gap patterns
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== player) continue

      // Check each direction from this stone
      for (const [dx, dy] of DIRECTIONS) {
        const forwardGap = countDirectionWithGap(board, x, y, dx, dy, player)
        const backwardStrict = countDirectionStrict(board, x, y, -dx, -dy, player)

        const total = forwardGap.count + backwardStrict.count + 1

        // If there's a gap and total stones would be 4 or more, filling the gap is critical
        if (forwardGap.gapPos && total >= 4) {
          const gapX = forwardGap.gapPos.x
          const gapY = forwardGap.gapPos.y
          // Verify gap is empty
          if (board[gapY][gapX] === null) {
            gapMoves.push({ x: gapX, y: gapY, score: total * 1000 })
          }
        }
      }
    }
  }

  if (gapMoves.length > 0) {
    // Return the most critical gap move
    gapMoves.sort((a, b) => b.score - a.score)
    return { x: gapMoves[0].x, y: gapMoves[0].y }
  }

  return null
}

// Find open three threats that need immediate blocking
function findOpenThreeBlock(
  board: Board,
  player: 'black' | 'white'
): { x: number; y: number } | null {
  const candidates = getCandidateMoves(board)
  const blockMoves: { x: number; y: number; score: number }[] = []

  for (const { x, y } of candidates) {
    // Check if placing here would block an open three
    board[y][x] = player

    // Check all directions for this position
    let maxScore = 0
    for (const [dx, dy] of DIRECTIONS) {
      const forward = countDirectionStrict(board, x, y, dx, dy, player)
      const backward = countDirectionStrict(board, x, y, -dx, -dy, player)
      const total = forward.count + backward.count + 1
      const bothBlocked = forward.blocked && backward.blocked
      const oneBlocked = forward.blocked || backward.blocked

      // Open three or four detection
      if (total === 3 && !oneBlocked) {
        maxScore = Math.max(maxScore, PATTERNS.OPEN_THREE)
      } else if (total === 4 && !bothBlocked) {
        maxScore = Math.max(maxScore, PATTERNS.FOUR)
      } else if (total === 4 && !oneBlocked) {
        maxScore = Math.max(maxScore, PATTERNS.OPEN_FOUR)
      }
    }

    board[y][x] = null

    if (maxScore >= PATTERNS.OPEN_THREE) {
      blockMoves.push({ x, y, score: maxScore })
    }
  }

  if (blockMoves.length > 0) {
    blockMoves.sort((a, b) => b.score - a.score)
    return { x: blockMoves[0].x, y: blockMoves[0].y }
  }

  return null
}

// Simple minimax for deeper search
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: 'black' | 'white'
): { score: number; move: { x: number; y: number } | null } {
  const opponent = aiPlayer === 'black' ? 'white' : 'black'

  if (depth === 0) {
    // Evaluate board for AI
    let score = 0
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (board[y][x] === aiPlayer) {
          score += evaluatePosition(board, x, y, aiPlayer)
        } else if (board[y][x] === opponent) {
          score -= evaluatePosition(board, x, y, opponent)
        }
      }
    }
    return { score, move: null }
  }

  const candidates = getCandidateMoves(board)
  if (candidates.length === 0) {
    return { score: 0, move: null }
  }

  // Sort candidates by heuristic score for better pruning
  const currentPlayer = isMaximizing ? aiPlayer : opponent
  const sortedCandidates = candidates
    .map(move => {
      board[move.y][move.x] = currentPlayer
      const score = evaluatePosition(board, move.x, move.y, currentPlayer)
      board[move.y][move.x] = null
      return { move, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15) // Limit candidates for performance
    .map(c => c.move)

  let bestMove = sortedCandidates[0]

  if (isMaximizing) {
    let maxEval = -Infinity

    for (const move of sortedCandidates) {
      board[move.y][move.x] = aiPlayer

      // Check for win
      const winMove = findWinningMove(board, aiPlayer)
      if (winMove && winMove.x === move.x && winMove.y === move.y) {
        board[move.y][move.x] = null
        return { score: PATTERNS.FIVE, move }
      }

      const result = minimax(board, depth - 1, alpha, beta, false, aiPlayer)
      board[move.y][move.x] = null

      if (result.score > maxEval) {
        maxEval = result.score
        bestMove = move
      }
      alpha = Math.max(alpha, result.score)
      if (beta <= alpha) break
    }

    return { score: maxEval, move: bestMove }
  } else {
    let minEval = Infinity

    for (const move of sortedCandidates) {
      board[move.y][move.x] = opponent

      // Check for opponent win
      const winMove = findWinningMove(board, opponent)
      if (winMove && winMove.x === move.x && winMove.y === move.y) {
        board[move.y][move.x] = null
        return { score: -PATTERNS.FIVE, move }
      }

      const result = minimax(board, depth - 1, alpha, beta, true, aiPlayer)
      board[move.y][move.x] = null

      if (result.score < minEval) {
        minEval = result.score
        bestMove = move
      }
      beta = Math.min(beta, result.score)
      if (beta <= alpha) break
    }

    return { score: minEval, move: bestMove }
  }
}

// Get best move for AI
export function getOmokAIMove(
  state: OmokGameState,
  aiPlayer: 'black' | 'white',
  difficulty: Difficulty
): { x: number; y: number } | null {
  const board = state.board.map(row => [...row]) // Deep copy
  const opponent = aiPlayer === 'black' ? 'white' : 'black'

  // Easy mode: sometimes make random moves
  if (difficulty === 'easy' && Math.random() < 0.3) {
    const candidates = getCandidateMoves(board)
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
  }

  // 1. Check for immediate win (5 in a row)
  const winMove = findWinningMove(board, aiPlayer)
  if (winMove) return winMove

  // 2. Block opponent's immediate win
  const blockMove = findWinningMove(board, opponent)
  if (blockMove) return blockMove

  // 3. Check for gap threats (X_XXX patterns that become 5)
  // AI's gap threat - can win by filling gap
  const aiGapThreat = findGapThreatMove(board, aiPlayer)
  if (aiGapThreat) return aiGapThreat

  // Block opponent's gap threat
  const opponentGapThreat = findGapThreatMove(board, opponent)
  if (opponentGapThreat) return opponentGapThreat

  // 4. Check for threat moves (open four, etc.)
  if (difficulty !== 'easy') {
    const threatMove = findThreatMove(board, aiPlayer)
    if (threatMove) return threatMove

    // Block opponent's threat (open four)
    const blockThreat = findThreatMove(board, opponent)
    if (blockThreat) return blockThreat

    // 5. Block opponent's open three (prevents open four)
    const blockOpenThree = findOpenThreeBlock(board, opponent)
    if (blockOpenThree) return blockOpenThree
  }

  // 6. Use minimax for best move
  const depth = SEARCH_DEPTH[difficulty]
  const result = minimax(board, depth, -Infinity, Infinity, true, aiPlayer)

  if (result.move) return result.move

  // Fallback: random from candidates
  const candidates = getCandidateMoves(board)
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // Very first move - go to center
  const center = Math.floor(BOARD_SIZE / 2)
  return { x: center, y: center }
}
