// A* pathfinding algorithm for 2D grid traversal
// Pure functions with step-by-step recording for visualization

import { CellType, generateMaze, createEmptyGrid } from './bfsDfs'

export type { CellType }
export { generateMaze, createEmptyGrid }

export type HeuristicType = 'manhattan' | 'euclidean' | 'chebyshev'

export interface AStarStep {
  row: number
  col: number
  action: 'visit' | 'enqueue' | 'path' | 'update' // update = when found better path
  g: number       // cost from start
  h: number       // heuristic to goal
  f: number       // g + h
  openSetSize: number
  closedSetSize: number
}

export interface AStarResult {
  steps: AStarStep[]
  path: { row: number; col: number }[] | null
  visitedCount: number
  pathLength: number
  totalCost: number
}

// Cardinal directions: up, right, down, left
const DIRS_4: [number, number, number][] = [
  [-1, 0, 1],
  [0, 1, 1],
  [1, 0, 1],
  [0, -1, 1],
]

// 8 directions: cardinals + diagonals
const DIRS_8: [number, number, number][] = [
  [-1, 0, 1],
  [0, 1, 1],
  [1, 0, 1],
  [0, -1, 1],
  [-1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [1, 1, Math.SQRT2],
]

export function heuristicFn(
  type: HeuristicType,
  a: [number, number],
  b: [number, number]
): number {
  const dr = Math.abs(a[0] - b[0])
  const dc = Math.abs(a[1] - b[1])
  switch (type) {
    case 'manhattan':
      return dr + dc
    case 'euclidean':
      return Math.sqrt(dr * dr + dc * dc)
    case 'chebyshev':
      return Math.max(dr, dc)
  }
}

interface OpenNode {
  r: number
  c: number
  f: number
  g: number
  h: number
}

// Simple array-based min-heap priority queue sorted by f, tie-break by h
function insertOpen(open: OpenNode[], node: OpenNode): void {
  // Binary heap insert
  open.push(node)
  let i = open.length - 1
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (
      open[parent].f < node.f ||
      (open[parent].f === node.f && open[parent].h <= node.h)
    ) break
    open[i] = open[parent]
    open[parent] = node
    i = parent
  }
}

function popMin(open: OpenNode[]): OpenNode {
  const min = open[0]
  const last = open.pop()!
  if (open.length > 0) {
    open[0] = last
    // Sift down
    let i = 0
    const n = open.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      const cmp = (a: OpenNode, b: OpenNode) =>
        a.f < b.f || (a.f === b.f && a.h < b.h)
      if (l < n && cmp(open[l], open[smallest])) smallest = l
      if (r < n && cmp(open[r], open[smallest])) smallest = r
      if (smallest === i) break
      ;[open[i], open[smallest]] = [open[smallest], open[i]]
      i = smallest
    }
  }
  return min
}

export function aStar(
  grid: CellType[][],
  start: [number, number],
  goal: [number, number],
  heuristic: HeuristicType = 'manhattan',
  allowDiagonal: boolean = false
): AStarResult {
  const rows = grid.length
  const cols = grid[0].length
  const DIRS = allowDiagonal ? DIRS_8 : DIRS_4

  // g-cost grid: Infinity means not yet reached
  const gCost: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(Infinity)
  )
  const parent: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )
  const closed: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  )

  const steps: AStarStep[] = []
  let visitedCount = 0

  const startH = heuristicFn(heuristic, start, goal)
  gCost[start[0]][start[1]] = 0

  const open: OpenNode[] = []
  insertOpen(open, { r: start[0], c: start[1], g: 0, h: startH, f: startH })

  steps.push({
    row: start[0],
    col: start[1],
    action: 'enqueue',
    g: 0,
    h: startH,
    f: startH,
    openSetSize: open.length,
    closedSetSize: 0,
  })

  while (open.length > 0) {
    const current = popMin(open)
    const { r, c, g, h, f } = current

    // Skip stale entries (we may have re-inserted with better g)
    if (closed[r][c]) continue
    closed[r][c] = true
    visitedCount++

    steps.push({
      row: r,
      col: c,
      action: 'visit',
      g,
      h,
      f,
      openSetSize: open.length,
      closedSetSize: visitedCount,
    })

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, start, goal)
      const totalCost = gCost[goal[0]][goal[1]]
      for (const p of path) {
        const pg = gCost[p.row][p.col]
        const ph = heuristicFn(heuristic, [p.row, p.col], goal)
        steps.push({
          row: p.row,
          col: p.col,
          action: 'path',
          g: pg,
          h: ph,
          f: pg + ph,
          openSetSize: 0,
          closedSetSize: visitedCount,
        })
      }
      return { steps, path, visitedCount, pathLength: path.length, totalCost }
    }

    for (const [dr, dc, moveCost] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (
        nr < 0 || nr >= rows ||
        nc < 0 || nc >= cols ||
        closed[nr][nc] ||
        grid[nr][nc] === 'wall'
      ) continue

      const newG = g + moveCost
      const nh = heuristicFn(heuristic, [nr, nc], goal)
      const nf = newG + nh

      if (newG < gCost[nr][nc]) {
        const isUpdate = gCost[nr][nc] !== Infinity
        gCost[nr][nc] = newG
        parent[nr][nc] = [r, c]
        insertOpen(open, { r: nr, c: nc, g: newG, h: nh, f: nf })
        steps.push({
          row: nr,
          col: nc,
          action: isUpdate ? 'update' : 'enqueue',
          g: newG,
          h: nh,
          f: nf,
          openSetSize: open.length,
          closedSetSize: visitedCount,
        })
      }
    }
  }

  return { steps, path: null, visitedCount, pathLength: 0, totalCost: 0 }
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
