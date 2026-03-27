// N-Queens Backtracking with step-by-step recording
// Pure functions, no side effects, TypeScript strict

export interface NQueensStep {
  board: number[]           // board[row] = column of queen, -1 if empty
  n: number
  currentRow: number
  currentCol: number
  action: 'place' | 'conflict' | 'backtrack' | 'solution' | 'done'
  conflicts: [number, number][]  // [row, col] cells that conflict
  placedQueens: [number, number][] // [row, col] of all currently placed queens
  solutionCount: number
  attempts: number
  description: string
}

export interface NQueensResult {
  steps: NQueensStep[]
  solutions: number[][]     // each solution is board[row] = col
  totalAttempts: number
}

function getConflicts(board: number[], n: number, row: number, col: number): [number, number][] {
  const conflicts: [number, number][] = []

  for (let r = 0; r < row; r++) {
    const c = board[r]
    if (c < 0) continue
    // Same column
    if (c === col) conflicts.push([r, c])
    // Diagonal
    if (Math.abs(r - row) === Math.abs(c - col)) conflicts.push([r, c])
  }

  return conflicts
}

function getAttackedCells(board: number[], n: number): Set<string> {
  const attacked = new Set<string>()
  for (let r = 0; r < n; r++) {
    const c = board[r]
    if (c < 0) continue
    // Row
    for (let x = 0; x < n; x++) attacked.add(`${r},${x}`)
    // Column
    for (let y = 0; y < n; y++) attacked.add(`${y},${c}`)
    // Diagonals
    for (let d = -n; d <= n; d++) {
      if (r + d >= 0 && r + d < n && c + d >= 0 && c + d < n) attacked.add(`${r + d},${c + d}`)
      if (r + d >= 0 && r + d < n && c - d >= 0 && c - d < n) attacked.add(`${r + d},${c - d}`)
    }
  }
  return attacked
}

export function getAttackedCellsArray(board: number[], n: number): [number, number][] {
  const attacked = getAttackedCells(board, n)
  const result: [number, number][] = []
  attacked.forEach(key => {
    const [r, c] = key.split(',').map(Number)
    // Exclude cells where queens are placed
    if (board[r] !== c) result.push([r, c])
  })
  return result
}

function getPlacedQueens(board: number[]): [number, number][] {
  const queens: [number, number][] = []
  for (let r = 0; r < board.length; r++) {
    if (board[r] >= 0) queens.push([r, board[r]])
  }
  return queens
}

export function solveNQueens(n: number, maxSolutions: number = 10): NQueensResult {
  const steps: NQueensStep[] = []
  const solutions: number[][] = []
  const board = new Array(n).fill(-1)
  let attempts = 0

  function recordStep(row: number, col: number, action: NQueensStep['action'], desc: string) {
    steps.push({
      board: [...board],
      n,
      currentRow: row,
      currentCol: col,
      action,
      conflicts: action === 'conflict' ? getConflicts(board, n, row, col) : [],
      placedQueens: getPlacedQueens(board),
      solutionCount: solutions.length,
      attempts,
      description: desc,
    })
  }

  function solve(row: number): boolean {
    if (solutions.length >= maxSolutions) return true

    if (row === n) {
      solutions.push([...board])
      recordStep(row - 1, board[row - 1], 'solution', `Solution #${solutions.length} found!`)
      return solutions.length >= maxSolutions
    }

    for (let col = 0; col < n; col++) {
      attempts++
      const conflicts = getConflicts(board, n, row, col)

      if (conflicts.length > 0) {
        // Record conflict
        board[row] = col
        recordStep(row, col, 'conflict', `Queen at (${row},${col}) conflicts`)
        board[row] = -1
        continue
      }

      // Place queen
      board[row] = col
      recordStep(row, col, 'place', `Place queen at row ${row}, col ${col}`)

      if (solve(row + 1)) return true

      // Backtrack
      board[row] = -1
      recordStep(row, col, 'backtrack', `Backtrack from row ${row}`)
    }

    return false
  }

  solve(0)

  // Final done step
  steps.push({
    board: solutions.length > 0 ? [...solutions[0]] : new Array(n).fill(-1),
    n,
    currentRow: -1,
    currentCol: -1,
    action: 'done',
    conflicts: [],
    placedQueens: solutions.length > 0 ? getPlacedQueens(solutions[0]) : [],
    solutionCount: solutions.length,
    attempts,
    description: `Found ${solutions.length} solution(s) in ${attempts} attempts`,
  })

  return { steps, solutions, totalAttempts: attempts }
}
