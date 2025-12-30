// Omok (Gomoku) Game Rules - Shared between Online and AI modes
// Implements Renju rules: Black has forbidden moves (double-three, double-four, overline)

import { OmokGameState, OmokMove } from '@/utils/webrtc'

export const BOARD_SIZE = 19

type Board = (null | 'black' | 'white')[][]

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

// Create initial game state
export const createInitialGameState = (): OmokGameState => ({
  board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
  currentTurn: 'black',
  moveHistory: [],
  winner: null,
  lastMove: null
})

// Check for 5 in a row (winner detection)
export const checkWinner = (
  board: Board,
  lastMove: OmokMove
): 'black' | 'white' | null => {
  const { x, y, player } = lastMove

  for (const [dx, dy] of DIRECTIONS) {
    let count = 1

    // Forward direction
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i
      const ny = y + dy * i
      if (!isValidPos(nx, ny)) break
      if (board[ny][nx] !== player) break
      count++
    }

    // Backward direction
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i
      const ny = y - dy * i
      if (!isValidPos(nx, ny)) break
      if (board[ny][nx] !== player) break
      count++
    }

    if (count >= 5) return player
  }

  return null
}

// Check for open three in a specific direction
// Open three: exactly 3 consecutive stones with both ends empty
const checkOpenThree = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white',
  dx: number,
  dy: number
): boolean => {
  // Create temp board with the move
  const tempBoard = board.map(row => [...row])
  tempBoard[y][x] = player

  // Find consecutive stones in this direction
  const stones: { x: number; y: number }[] = [{ x, y }]

  // Forward search
  for (let i = 1; i <= 4; i++) {
    const nx = x + dx * i
    const ny = y + dy * i
    if (!isValidPos(nx, ny)) break
    if (tempBoard[ny][nx] === player) {
      stones.push({ x: nx, y: ny })
    } else {
      break
    }
  }

  // Backward search
  for (let i = 1; i <= 4; i++) {
    const nx = x - dx * i
    const ny = y - dy * i
    if (!isValidPos(nx, ny)) break
    if (tempBoard[ny][nx] === player) {
      stones.unshift({ x: nx, y: ny })
    } else {
      break
    }
  }

  // Must be exactly 3 consecutive stones
  if (stones.length !== 3) return false

  // Check both ends are empty
  const first = stones[0]
  const last = stones[stones.length - 1]

  const beforeX = first.x - dx
  const beforeY = first.y - dy
  const afterX = last.x + dx
  const afterY = last.y + dy

  const beforeEmpty = (
    isValidPos(beforeX, beforeY) &&
    tempBoard[beforeY][beforeX] === null
  )
  const afterEmpty = (
    isValidPos(afterX, afterY) &&
    tempBoard[afterY][afterX] === null
  )

  // Both ends must be empty for open three
  return beforeEmpty && afterEmpty
}

// Check for double-three (3-3) - forbidden move for black in Renju rules
export const checkDoubleThree = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white'
): boolean => {
  // Only applies to black (Renju rules)
  if (player !== 'black') return false

  let openThreeCount = 0

  for (const [dx, dy] of DIRECTIONS) {
    if (checkOpenThree(board, x, y, player, dx, dy)) {
      openThreeCount++
    }
  }

  // Double-three: 2 or more open threes formed
  return openThreeCount >= 2
}

// Check for open four in a specific direction
// Open four: 4 consecutive stones with at least one end empty (unstoppable threat)
const checkOpenFour = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white',
  dx: number,
  dy: number
): boolean => {
  const tempBoard = board.map(row => [...row])
  tempBoard[y][x] = player

  let count = 1
  let beforeBlocked = false
  let afterBlocked = false

  // Forward
  let nx = x + dx
  let ny = y + dy
  while (isValidPos(nx, ny) && tempBoard[ny][nx] === player) {
    count++
    nx += dx
    ny += dy
  }
  if (!isValidPos(nx, ny) || tempBoard[ny][nx] !== null) {
    afterBlocked = true
  }

  // Backward
  nx = x - dx
  ny = y - dy
  while (isValidPos(nx, ny) && tempBoard[ny][nx] === player) {
    count++
    nx -= dx
    ny -= dy
  }
  if (!isValidPos(nx, ny) || tempBoard[ny][nx] !== null) {
    beforeBlocked = true
  }

  return count === 4 && !beforeBlocked && !afterBlocked
}

// Check for double-four (4-4) - forbidden move for black in Renju rules
export const checkDoubleFour = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white'
): boolean => {
  // Only applies to black (Renju rules)
  if (player !== 'black') return false

  let fourCount = 0

  for (const [dx, dy] of DIRECTIONS) {
    // Check both open four and closed four
    const tempBoard = board.map(row => [...row])
    tempBoard[y][x] = player

    let count = 1

    // Forward
    let nx = x + dx
    let ny = y + dy
    while (isValidPos(nx, ny) && tempBoard[ny][nx] === player) {
      count++
      nx += dx
      ny += dy
    }

    // Backward
    nx = x - dx
    ny = y - dy
    while (isValidPos(nx, ny) && tempBoard[ny][nx] === player) {
      count++
      nx -= dx
      ny -= dy
    }

    if (count === 4) {
      fourCount++
    }
  }

  // Double-four: 2 or more fours formed
  return fourCount >= 2
}

// Check for overline (6 or more) - forbidden move for black in Renju rules
export const checkOverline = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white'
): boolean => {
  // Only applies to black (Renju rules)
  if (player !== 'black') return false

  const tempBoard = board.map(row => [...row])
  tempBoard[y][x] = player

  for (const [dx, dy] of DIRECTIONS) {
    let count = 1

    // Forward
    let nx = x + dx
    let ny = y + dy
    while (isValidPos(nx, ny) && tempBoard[ny][nx] === player) {
      count++
      nx += dx
      ny += dy
    }

    // Backward
    nx = x - dx
    ny = y - dy
    while (isValidPos(nx, ny) && tempBoard[ny][nx] === player) {
      count++
      nx -= dx
      ny -= dy
    }

    if (count >= 6) return true
  }

  return false
}

// Check all forbidden moves (Renju rules for black)
export const checkForbiddenMove = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white'
): { forbidden: boolean; reason: 'double-three' | 'double-four' | 'overline' | null } => {
  // Only black has forbidden moves
  if (player !== 'black') {
    return { forbidden: false, reason: null }
  }

  // Check in order of severity
  if (checkOverline(board, x, y, player)) {
    return { forbidden: true, reason: 'overline' }
  }

  if (checkDoubleFour(board, x, y, player)) {
    return { forbidden: true, reason: 'double-four' }
  }

  if (checkDoubleThree(board, x, y, player)) {
    return { forbidden: true, reason: 'double-three' }
  }

  return { forbidden: false, reason: null }
}

// Validate a move (empty cell + not forbidden)
export const isValidMove = (
  board: Board,
  x: number,
  y: number,
  player: 'black' | 'white',
  checkForbidden: boolean = true
): { valid: boolean; reason?: string } => {
  // Check bounds
  if (!isValidPos(x, y)) {
    return { valid: false, reason: 'out-of-bounds' }
  }

  // Check if cell is empty
  if (board[y][x] !== null) {
    return { valid: false, reason: 'cell-occupied' }
  }

  // Check forbidden moves (optional, for Renju rules)
  if (checkForbidden) {
    const forbidden = checkForbiddenMove(board, x, y, player)
    if (forbidden.forbidden) {
      return { valid: false, reason: forbidden.reason || 'forbidden' }
    }
  }

  return { valid: true }
}

// Apply a move to the board and return new state
export const applyMove = (
  state: OmokGameState,
  x: number,
  y: number,
  player: 'black' | 'white'
): OmokGameState => {
  const newBoard = state.board.map(row => [...row])
  newBoard[y][x] = player

  const newMove: OmokMove = {
    x,
    y,
    player,
    moveNumber: state.moveHistory.length + 1
  }

  const winner = checkWinner(newBoard, newMove)

  return {
    ...state,
    board: newBoard,
    currentTurn: player === 'black' ? 'white' : 'black',
    moveHistory: [...state.moveHistory, newMove],
    winner,
    lastMove: newMove
  }
}
