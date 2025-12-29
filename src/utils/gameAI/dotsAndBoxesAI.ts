// Dots and Boxes AI - Strategic line selection
// Supports 3 difficulty levels: easy, normal, hard

import {
  DotsAndBoxesGameState,
  LineState,
  DotsPlayer,
  makeDotsMove
} from '@/components/DotsAndBoxesBoard'

export type Difficulty = 'easy' | 'normal' | 'hard'

const GRID_SIZE = 5

interface LineMove {
  type: 'horizontal' | 'vertical'
  row: number
  col: number
}

// Get all available moves
function getAvailableMoves(state: DotsAndBoxesGameState): LineMove[] {
  const moves: LineMove[] = []

  // Horizontal lines
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 1; col++) {
      if (state.horizontalLines[row][col] === null) {
        moves.push({ type: 'horizontal', row, col })
      }
    }
  }

  // Vertical lines
  for (let row = 0; row < GRID_SIZE - 1; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (state.verticalLines[row][col] === null) {
        moves.push({ type: 'vertical', row, col })
      }
    }
  }

  return moves
}

// Count lines around a box
function countBoxLines(
  horizontalLines: LineState[][],
  verticalLines: LineState[][],
  row: number,
  col: number
): number {
  let count = 0
  if (horizontalLines[row][col] !== null) count++
  if (horizontalLines[row + 1][col] !== null) count++
  if (verticalLines[row][col] !== null) count++
  if (verticalLines[row][col + 1] !== null) count++
  return count
}

// Check how many boxes a move would complete
function checkMoveCompletions(
  state: DotsAndBoxesGameState,
  move: LineMove
): number {
  let completions = 0

  if (move.type === 'horizontal') {
    // Check box above
    if (move.row > 0) {
      const lines = countBoxLines(state.horizontalLines, state.verticalLines, move.row - 1, move.col)
      if (lines === 3) completions++
    }
    // Check box below
    if (move.row < GRID_SIZE - 1) {
      const lines = countBoxLines(state.horizontalLines, state.verticalLines, move.row, move.col)
      if (lines === 3) completions++
    }
  } else {
    // Check box to the left
    if (move.col > 0) {
      const lines = countBoxLines(state.horizontalLines, state.verticalLines, move.row, move.col - 1)
      if (lines === 3) completions++
    }
    // Check box to the right
    if (move.col < GRID_SIZE - 1) {
      const lines = countBoxLines(state.horizontalLines, state.verticalLines, move.row, move.col)
      if (lines === 3) completions++
    }
  }

  return completions
}

// Check if a move gives the opponent an opportunity
function checkMoveRisk(
  state: DotsAndBoxesGameState,
  move: LineMove
): number {
  // Simulate the move
  const newHorizontal = state.horizontalLines.map(r => [...r])
  const newVertical = state.verticalLines.map(r => [...r])

  if (move.type === 'horizontal') {
    newHorizontal[move.row][move.col] = 'player1' // Doesn't matter which player
  } else {
    newVertical[move.row][move.col] = 'player1'
  }

  let riskCount = 0

  // Check all boxes for 3-line situations (opponent opportunity)
  for (let row = 0; row < GRID_SIZE - 1; row++) {
    for (let col = 0; col < GRID_SIZE - 1; col++) {
      const lines = countBoxLines(newHorizontal, newVertical, row, col)
      if (lines === 3) riskCount++
    }
  }

  return riskCount
}

// Find chains of boxes (connected 3-line boxes)
function findChains(state: DotsAndBoxesGameState): number[][] {
  const chains: number[][] = []
  const visited = new Set<string>()

  for (let row = 0; row < GRID_SIZE - 1; row++) {
    for (let col = 0; col < GRID_SIZE - 1; col++) {
      const key = `${row},${col}`
      if (visited.has(key)) continue

      const lines = countBoxLines(state.horizontalLines, state.verticalLines, row, col)
      if (lines === 3) {
        // Found a 3-line box, trace the chain
        const chain: number[] = []
        const stack: [number, number][] = [[row, col]]

        while (stack.length > 0) {
          const [r, c] = stack.pop()!
          const k = `${r},${c}`
          if (visited.has(k)) continue
          visited.add(k)

          const l = countBoxLines(state.horizontalLines, state.verticalLines, r, c)
          if (l >= 3) {
            chain.push(r * (GRID_SIZE - 1) + c)

            // Check adjacent boxes
            const neighbors = [
              [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
            ]
            for (const [nr, nc] of neighbors) {
              if (nr >= 0 && nr < GRID_SIZE - 1 && nc >= 0 && nc < GRID_SIZE - 1) {
                if (!visited.has(`${nr},${nc}`)) {
                  stack.push([nr, nc])
                }
              }
            }
          }
        }

        if (chain.length > 0) {
          chains.push(chain)
        }
      }
    }
  }

  return chains
}

// Evaluate board state
function evaluateState(state: DotsAndBoxesGameState, aiPlayer: DotsPlayer): number {
  const opponent = aiPlayer === 'player1' ? 'player2' : 'player1'
  const aiScore = state.scores[aiPlayer]
  const oppScore = state.scores[opponent]

  let score = (aiScore - oppScore) * 100

  // Penalize leaving 3-line boxes for opponent
  let threeLineBoxes = 0
  for (let row = 0; row < GRID_SIZE - 1; row++) {
    for (let col = 0; col < GRID_SIZE - 1; col++) {
      if (state.boxes[row][col] === null) {
        const lines = countBoxLines(state.horizontalLines, state.verticalLines, row, col)
        if (lines === 3) threeLineBoxes++
      }
    }
  }

  // If it's opponent's turn, 3-line boxes are bad for us
  if (state.currentTurn === opponent) {
    score -= threeLineBoxes * 50
  } else {
    score += threeLineBoxes * 50
  }

  return score
}

// Minimax with alpha-beta
function minimax(
  state: DotsAndBoxesGameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: DotsPlayer
): { score: number; move: LineMove | null } {
  if (state.winner || depth === 0) {
    return { score: evaluateState(state, aiPlayer), move: null }
  }

  const moves = getAvailableMoves(state)
  if (moves.length === 0) {
    return { score: evaluateState(state, aiPlayer), move: null }
  }

  const currentPlayer = state.currentTurn

  // Sort moves by potential (completions first, then safe moves)
  const scoredMoves = moves.map(move => ({
    move,
    completions: checkMoveCompletions(state, move),
    risk: checkMoveRisk(state, move)
  }))

  scoredMoves.sort((a, b) => {
    if (a.completions !== b.completions) return b.completions - a.completions
    return a.risk - b.risk
  })

  let bestMove = scoredMoves[0].move
  let bestScore = isMaximizing ? -Infinity : Infinity

  for (const { move } of scoredMoves) {
    const newState = makeDotsMove(state, move.type, move.row, move.col, currentPlayer)
    if (!newState) continue

    // If completing a box, we get another turn
    const isExtraTurn = newState.currentTurn === currentPlayer && !newState.winner

    const result = minimax(
      newState,
      depth - 1,
      alpha,
      beta,
      isExtraTurn ? isMaximizing : !isMaximizing,
      aiPlayer
    )

    if (isMaximizing) {
      if (result.score > bestScore) {
        bestScore = result.score
        bestMove = move
      }
      alpha = Math.max(alpha, result.score)
    } else {
      if (result.score < bestScore) {
        bestScore = result.score
        bestMove = move
      }
      beta = Math.min(beta, result.score)
    }

    if (beta <= alpha) break
  }

  return { score: bestScore, move: bestMove }
}

// Get best move for AI
export function getDotsAndBoxesAIMove(
  state: DotsAndBoxesGameState,
  aiPlayer: DotsPlayer,
  difficulty: Difficulty
): LineMove | null {
  const moves = getAvailableMoves(state)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  // Categorize moves
  const completingMoves: LineMove[] = []
  const safeMoves: LineMove[] = []
  const riskyMoves: LineMove[] = []

  for (const move of moves) {
    const completions = checkMoveCompletions(state, move)
    const risk = checkMoveRisk(state, move)

    if (completions > 0) {
      completingMoves.push(move)
    } else if (risk === 0) {
      safeMoves.push(move)
    } else {
      riskyMoves.push(move)
    }
  }

  // Easy mode: Mostly random with basic understanding
  if (difficulty === 'easy') {
    // Always take free boxes
    if (completingMoves.length > 0 && Math.random() > 0.3) {
      return completingMoves[Math.floor(Math.random() * completingMoves.length)]
    }

    // 60% chance to make a random move
    if (Math.random() < 0.6) {
      return moves[Math.floor(Math.random() * moves.length)]
    }

    // Otherwise try to make a safe move
    if (safeMoves.length > 0) {
      return safeMoves[Math.floor(Math.random() * safeMoves.length)]
    }

    return moves[Math.floor(Math.random() * moves.length)]
  }

  // Normal mode: Basic strategy
  if (difficulty === 'normal') {
    // Always complete boxes
    if (completingMoves.length > 0) {
      return completingMoves[0]
    }

    // Prefer safe moves
    if (safeMoves.length > 0) {
      // Add some randomness
      if (Math.random() < 0.7) {
        return safeMoves[Math.floor(Math.random() * safeMoves.length)]
      }
    }

    // If no safe moves, try to give minimum boxes
    if (riskyMoves.length > 0) {
      riskyMoves.sort((a, b) => {
        return checkMoveRisk(state, a) - checkMoveRisk(state, b)
      })
      return riskyMoves[0]
    }

    return moves[0]
  }

  // Hard mode: Full minimax strategy
  // First, always complete boxes if possible
  if (completingMoves.length > 0) {
    // Find the move that leads to the best chain
    let bestCompletingMove = completingMoves[0]
    let bestChainScore = -Infinity

    for (const move of completingMoves) {
      const newState = makeDotsMove(state, move.type, move.row, move.col, aiPlayer)
      if (newState) {
        // If we get another turn, this is good
        if (newState.currentTurn === aiPlayer && !newState.winner) {
          const chainScore = newState.scores[aiPlayer] - state.scores[aiPlayer]
          if (chainScore > bestChainScore) {
            bestChainScore = chainScore
            bestCompletingMove = move
          }
        }
      }
    }

    return bestCompletingMove
  }

  // If safe moves exist, prefer them
  if (safeMoves.length > 0) {
    // Use minimax to pick the best safe move
    const depth = Math.min(4, safeMoves.length + 2)
    const result = minimax(state, depth, -Infinity, Infinity, true, aiPlayer)
    if (result.move && safeMoves.some(m => m.type === result.move!.type && m.row === result.move!.row && m.col === result.move!.col)) {
      return result.move
    }
    return safeMoves[0]
  }

  // No safe moves - sacrifice strategy
  // Give the shortest chain to minimize opponent's gain
  const chains = findChains(state)

  if (chains.length > 0) {
    // Sort chains by length
    chains.sort((a, b) => a.length - b.length)

    // Open the shortest chain
    const shortestChain = chains[0]

    // Find a move that opens this chain
    for (const move of riskyMoves) {
      const newState = makeDotsMove(state, move.type, move.row, move.col, aiPlayer)
      if (newState) {
        // Check if this move affects the shortest chain
        for (const boxIndex of shortestChain) {
          const boxRow = Math.floor(boxIndex / (GRID_SIZE - 1))
          const boxCol = boxIndex % (GRID_SIZE - 1)
          if (state.boxes[boxRow][boxCol] === null) {
            return move
          }
        }
      }
    }
  }

  // Fallback: Use minimax
  const depth = Math.min(3, moves.length)
  const result = minimax(state, depth, -Infinity, Infinity, true, aiPlayer)
  return result.move || moves[0]
}
