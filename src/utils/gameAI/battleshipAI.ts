// Battleship AI - Hunting/Targeting Strategy
// Supports 3 difficulty levels: easy, normal, hard

import {
  BattleshipBoard,
  BattleshipGameState,
  Ship,
  randomPlaceAllShips
} from '@/components/BattleshipBoard'

export type Difficulty = 'easy' | 'normal' | 'hard'

interface HuntTarget {
  row: number
  col: number
  priority: number
}

// AI state for maintaining hunt mode
interface AIState {
  mode: 'hunt' | 'target'
  targetStack: { row: number; col: number }[]
  lastHit: { row: number; col: number } | null
  hitDirection: 'horizontal' | 'vertical' | null
  checkerboardPhase: boolean
}

// Create initial AI state
export function createBattleshipAIState(): AIState {
  return {
    mode: 'hunt',
    targetStack: [],
    lastHit: null,
    hitDirection: null,
    checkerboardPhase: true
  }
}

// Get all valid attack positions
function getValidAttacks(board: BattleshipBoard): { row: number; col: number }[] {
  const valid: { row: number; col: number }[] = []
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board[row][col] === 'empty') {
        valid.push({ row, col })
      }
    }
  }
  return valid
}

// Check if position is valid and not attacked
function isValidTarget(board: BattleshipBoard, row: number, col: number): boolean {
  return row >= 0 && row < 10 && col >= 0 && col < 10 && board[row][col] === 'empty'
}

// Get adjacent cells for targeting
function getAdjacentCells(row: number, col: number): { row: number; col: number }[] {
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 }
  ]
}

// Calculate probability for each cell based on remaining ships
function calculateProbabilityMap(
  attackBoard: BattleshipBoard,
  remainingShips: number[]
): number[][] {
  const probMap: number[][] = Array(10).fill(null).map(() => Array(10).fill(0))

  for (const shipSize of remainingShips) {
    // Horizontal placements
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col <= 10 - shipSize; col++) {
        let canPlace = true
        for (let i = 0; i < shipSize; i++) {
          if (attackBoard[row][col + i] !== 'empty') {
            canPlace = false
            break
          }
        }
        if (canPlace) {
          for (let i = 0; i < shipSize; i++) {
            probMap[row][col + i]++
          }
        }
      }
    }

    // Vertical placements
    for (let row = 0; row <= 10 - shipSize; row++) {
      for (let col = 0; col < 10; col++) {
        let canPlace = true
        for (let i = 0; i < shipSize; i++) {
          if (attackBoard[row + i][col] !== 'empty') {
            canPlace = false
            break
          }
        }
        if (canPlace) {
          for (let i = 0; i < shipSize; i++) {
            probMap[row + i][col]++
          }
        }
      }
    }
  }

  return probMap
}

// Get remaining ship sizes from game state
function getRemainingShipSizes(ships: Ship[]): number[] {
  return ships.filter(s => !s.sunk).map(s => s.size)
}

// Easy AI: Random attacks with occasional smart moves
function getEasyMove(
  attackBoard: BattleshipBoard,
  aiState: AIState
): { row: number; col: number } {
  const validMoves = getValidAttacks(attackBoard)

  // 30% chance of targeting after a hit
  if (aiState.lastHit && aiState.targetStack.length > 0 && Math.random() < 0.3) {
    const target = aiState.targetStack.find(t => isValidTarget(attackBoard, t.row, t.col))
    if (target) {
      return target
    }
  }

  // Random attack
  return validMoves[Math.floor(Math.random() * validMoves.length)]
}

// Normal AI: Basic hunt/target with some probability consideration
function getNormalMove(
  attackBoard: BattleshipBoard,
  aiState: AIState,
  opponentShips: Ship[]
): { row: number; col: number } {
  // Target mode: attack around known hits
  if (aiState.mode === 'target' && aiState.targetStack.length > 0) {
    const target = aiState.targetStack.find(t => isValidTarget(attackBoard, t.row, t.col))
    if (target) {
      return target
    }
    // No valid targets, fall through to hunt mode
  }

  // Hunt mode with checkerboard pattern
  const validMoves = getValidAttacks(attackBoard)
  const remainingShips = getRemainingShipSizes(opponentShips)

  // Use checkerboard pattern for efficiency
  const checkerboardMoves = validMoves.filter(
    m => (m.row + m.col) % 2 === (aiState.checkerboardPhase ? 0 : 1)
  )

  const movesToConsider = checkerboardMoves.length > 0 ? checkerboardMoves : validMoves

  // 80% chance to use probability map
  if (Math.random() < 0.8 && remainingShips.length > 0) {
    const probMap = calculateProbabilityMap(attackBoard, remainingShips)
    let bestMove = movesToConsider[0]
    let bestProb = 0

    for (const move of movesToConsider) {
      if (probMap[move.row][move.col] > bestProb) {
        bestProb = probMap[move.row][move.col]
        bestMove = move
      }
    }

    return bestMove
  }

  // Random from valid moves
  return movesToConsider[Math.floor(Math.random() * movesToConsider.length)]
}

// Find unsunk hit cells on the board (hits that belong to ships not yet sunk)
function getUnsunkHits(attackBoard: BattleshipBoard): { row: number; col: number }[] {
  const hits: { row: number; col: number }[] = []
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (attackBoard[row][col] === 'hit') {
        hits.push({ row, col })
      }
    }
  }
  return hits
}

// Enhanced probability map that boosts cells adjacent to unsunk hits
function calculateEnhancedProbabilityMap(
  attackBoard: BattleshipBoard,
  remainingShips: number[]
): number[][] {
  const probMap = calculateProbabilityMap(attackBoard, remainingShips)
  const unsunkHits = getUnsunkHits(attackBoard)

  // Boost probability near unsunk hits (these cells are more likely to have ship segments)
  for (const hit of unsunkHits) {
    for (const adj of getAdjacentCells(hit.row, hit.col)) {
      if (isValidTarget(attackBoard, adj.row, adj.col)) {
        probMap[adj.row][adj.col] *= 3
      }
    }
  }

  return probMap
}

// Hard AI: Full probability-based strategy with advanced targeting
function getHardMove(
  attackBoard: BattleshipBoard,
  aiState: AIState,
  opponentShips: Ship[]
): { row: number; col: number } {
  const remainingShips = getRemainingShipSizes(opponentShips)

  // Target mode with direction following
  if (aiState.mode === 'target' && aiState.targetStack.length > 0) {
    // Prioritize following the hit direction
    if (aiState.hitDirection && aiState.lastHit) {
      const directionalTargets = aiState.hitDirection === 'horizontal'
        ? aiState.targetStack.filter(t => t.row === aiState.lastHit!.row)
        : aiState.targetStack.filter(t => t.col === aiState.lastHit!.col)

      const target = directionalTargets.find(t => isValidTarget(attackBoard, t.row, t.col))
      if (target) {
        return target
      }
    }

    const target = aiState.targetStack.find(t => isValidTarget(attackBoard, t.row, t.col))
    if (target) {
      return target
    }

    // No valid targets in stack, but check for other unsunk hits
    const unsunkHits = getUnsunkHits(attackBoard)
    if (unsunkHits.length > 0) {
      // Re-target around unsunk hits
      for (const hit of unsunkHits) {
        for (const adj of getAdjacentCells(hit.row, hit.col)) {
          if (isValidTarget(attackBoard, adj.row, adj.col)) {
            return adj
          }
        }
      }
    }

    // No valid targets, fall through to hunt mode
  }

  // Hunt mode with enhanced probability map
  const probMap = calculateEnhancedProbabilityMap(attackBoard, remainingShips)
  const validMoves = getValidAttacks(attackBoard)

  // Apply parity-based search: for ships of size N, only need to check every Nth cell
  const smallestShip = Math.min(...remainingShips)
  const parityMoves = validMoves.filter(
    m => (m.row + m.col) % smallestShip === 0
  )
  const movesToConsider = parityMoves.length > 0 ? parityMoves : validMoves

  let bestMove = movesToConsider[0]
  let bestScore = -1

  for (const move of movesToConsider) {
    let score = probMap[move.row][move.col]

    // Center preference (ships more likely in center)
    const centerDist = Math.abs(move.row - 4.5) + Math.abs(move.col - 4.5)
    score *= 1 + (9 - centerDist) * 0.02

    // Edge avoidance (ships less likely at edges)
    if (move.row === 0 || move.row === 9 || move.col === 0 || move.col === 9) {
      score *= 0.85
    }

    // Corner avoidance
    if ((move.row === 0 || move.row === 9) && (move.col === 0 || move.col === 9)) {
      score *= 0.7
    }

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

// Update AI state after an attack result
export function updateBattleshipAIState(
  aiState: AIState,
  row: number,
  col: number,
  result: 'hit' | 'miss' | 'sunk',
  attackBoard: BattleshipBoard
): AIState {
  const newState = { ...aiState, targetStack: [...aiState.targetStack] }

  if (result === 'hit') {
    newState.mode = 'target'

    // Determine direction if we had a previous hit
    if (newState.lastHit) {
      if (row === newState.lastHit.row) {
        newState.hitDirection = 'horizontal'
      } else if (col === newState.lastHit.col) {
        newState.hitDirection = 'vertical'
      }
    }

    newState.lastHit = { row, col }

    // Add adjacent cells to target stack
    const adjacents = getAdjacentCells(row, col)
    for (const adj of adjacents) {
      if (isValidTarget(attackBoard, adj.row, adj.col)) {
        // Don't add duplicates
        if (!newState.targetStack.some(t => t.row === adj.row && t.col === adj.col)) {
          newState.targetStack.push(adj)
        }
      }
    }

    // Prioritize targets in the known direction
    if (newState.hitDirection) {
      newState.targetStack.sort((a, b) => {
        const aInDir = newState.hitDirection === 'horizontal'
          ? a.row === row ? 1 : 0
          : a.col === col ? 1 : 0
        const bInDir = newState.hitDirection === 'horizontal'
          ? b.row === row ? 1 : 0
          : b.col === col ? 1 : 0
        return bInDir - aInDir
      })
    }
  } else if (result === 'sunk') {
    // Ship sunk - check if there are other unsunk hits to continue targeting
    const unsunkHits = getUnsunkHits(attackBoard)
    if (unsunkHits.length > 0) {
      // Switch to targeting the next unsunk hit
      newState.mode = 'target'
      newState.lastHit = unsunkHits[0]
      newState.hitDirection = null
      newState.targetStack = []
      for (const hit of unsunkHits) {
        for (const adj of getAdjacentCells(hit.row, hit.col)) {
          if (isValidTarget(attackBoard, adj.row, adj.col)) {
            if (!newState.targetStack.some(t => t.row === adj.row && t.col === adj.col)) {
              newState.targetStack.push(adj)
            }
          }
        }
      }
    } else {
      // No more unsunk hits, go back to hunt mode
      newState.mode = 'hunt'
      newState.targetStack = []
      newState.lastHit = null
      newState.hitDirection = null
    }
    // Switch checkerboard phase
    newState.checkerboardPhase = !newState.checkerboardPhase
  } else if (result === 'miss') {
    // Remove from stack if present
    newState.targetStack = newState.targetStack.filter(
      t => !(t.row === row && t.col === col)
    )

    // If miss while targeting, might need to switch direction
    if (newState.mode === 'target' && newState.targetStack.length === 0) {
      newState.mode = 'hunt'
      newState.hitDirection = null
    }
  }

  return newState
}

// Main AI move function
export function getBattleshipAIMove(
  state: BattleshipGameState,
  aiPlayer: 'player1' | 'player2',
  difficulty: Difficulty,
  aiState: AIState
): { row: number; col: number } {
  const attackBoard = aiPlayer === 'player1' ? state.player1Attacks : state.player2Attacks
  const opponentShips = aiPlayer === 'player1' ? state.player2Ships : state.player1Ships

  switch (difficulty) {
    case 'easy':
      return getEasyMove(attackBoard, aiState)
    case 'normal':
      return getNormalMove(attackBoard, aiState, opponentShips)
    case 'hard':
      return getHardMove(attackBoard, aiState, opponentShips)
  }
}

// AI ship placement
export function placeBattleshipAIShips(): { board: BattleshipBoard; ships: Ship[] } {
  return randomPlaceAllShips()
}
