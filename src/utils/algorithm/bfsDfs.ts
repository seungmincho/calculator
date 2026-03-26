// BFS / DFS algorithm logic for 2D grid traversal
// Pure functions with step-by-step recording for visualization

export type CellType = 'empty' | 'wall' | 'start' | 'goal'

export interface SearchStep {
  row: number
  col: number
  action: 'visit' | 'enqueue' | 'dequeue' | 'path'
  frontierSize: number
  visitedCount: number
}

export interface SearchResult {
  steps: SearchStep[]
  path: { row: number; col: number }[] | null
  visitedCount: number
  pathLength: number
}

// Direction: up, right, down, left
const DIRS: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]]

export function bfs(
  grid: CellType[][],
  start: [number, number],
  goal: [number, number]
): SearchResult {
  const rows = grid.length
  const cols = grid[0].length
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))
  const parent: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )
  const queue: [number, number][] = [start]
  visited[start[0]][start[1]] = true
  const steps: SearchStep[] = []
  let visitedCount = 0

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    visitedCount++
    steps.push({
      row: r,
      col: c,
      action: 'visit',
      frontierSize: queue.length,
      visitedCount,
    })

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, start, goal)
      for (const p of path) {
        steps.push({ row: p.row, col: p.col, action: 'path', frontierSize: 0, visitedCount })
      }
      return { steps, path, visitedCount, pathLength: path.length }
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        !visited[nr][nc] &&
        grid[nr][nc] !== 'wall'
      ) {
        visited[nr][nc] = true
        parent[nr][nc] = [r, c]
        queue.push([nr, nc])
        steps.push({
          row: nr,
          col: nc,
          action: 'enqueue',
          frontierSize: queue.length,
          visitedCount,
        })
      }
    }
  }

  return { steps, path: null, visitedCount, pathLength: 0 }
}

export function dfs(
  grid: CellType[][],
  start: [number, number],
  goal: [number, number]
): SearchResult {
  const rows = grid.length
  const cols = grid[0].length
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))
  const parent: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )
  const stack: [number, number][] = [start]
  const steps: SearchStep[] = []
  let visitedCount = 0

  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    if (visited[r][c]) continue
    visited[r][c] = true
    visitedCount++
    steps.push({
      row: r,
      col: c,
      action: 'visit',
      frontierSize: stack.length,
      visitedCount,
    })

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, start, goal)
      for (const p of path) {
        steps.push({ row: p.row, col: p.col, action: 'path', frontierSize: 0, visitedCount })
      }
      return { steps, path, visitedCount, pathLength: path.length }
    }

    // Reverse direction order so up is explored first visually
    for (let i = DIRS.length - 1; i >= 0; i--) {
      const [dr, dc] = DIRS[i]
      const nr = r + dr
      const nc = c + dc
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        !visited[nr][nc] &&
        grid[nr][nc] !== 'wall'
      ) {
        // Only update parent if not yet set (first path to this cell wins)
        if (!parent[nr][nc]) {
          parent[nr][nc] = [r, c]
        }
        stack.push([nr, nc])
      }
    }
  }

  return { steps, path: null, visitedCount, pathLength: 0 }
}

function reconstructPath(
  parent: ([number, number] | null)[][],
  start: [number, number],
  goal: [number, number]
): { row: number; col: number }[] {
  const path: { row: number; col: number }[] = []
  let current: [number, number] | null = goal
  while (current && !(current[0] === start[0] && current[1] === start[1])) {
    path.unshift({ row: current[0], col: current[1] })
    current = parent[current[0]][current[1]]
  }
  path.unshift({ row: start[0], col: start[1] })
  return path
}

export function generateMaze(rows: number, cols: number): CellType[][] {
  const grid: CellType[][] = Array.from({ length: rows }, () =>
    Array(cols).fill('empty') as CellType[]
  )

  // Add random walls (30% density)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.3) {
        grid[r][c] = 'wall'
      }
    }
  }

  // Ensure start and goal are clear (and their neighbors)
  grid[1][1] = 'empty'
  grid[rows - 2][cols - 2] = 'empty'

  return grid
}

export function createEmptyGrid(rows: number, cols: number): CellType[][] {
  return Array.from({ length: rows }, () => Array(cols).fill('empty') as CellType[])
}
