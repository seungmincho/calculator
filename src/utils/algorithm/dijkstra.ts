// Dijkstra shortest path algorithm for weighted 2D grid traversal
// Pure functions with step-by-step recording for visualization
// Key difference from A*: no heuristic — priority is g-cost (distance from start) only

import { CellType, generateMaze, createEmptyGrid } from './bfsDfs'

export type { CellType }
export { generateMaze, createEmptyGrid }

export type WeightType = 'uniform' | 'random' | 'terrain'

export interface DijkstraStep {
  row: number
  col: number
  action: 'visit' | 'enqueue' | 'update' | 'path'
  distance: number      // g-cost (distance from start)
  openSetSize: number
  closedSetSize: number
}

export interface DijkstraResult {
  steps: DijkstraStep[]
  path: { row: number; col: number }[] | null
  visitedCount: number
  pathLength: number
  totalCost: number
  distances: number[][]  // final distance grid for visualization
}

// Cardinal directions: [dr, dc, baseCost]
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

// ---------------------------------------------------------------------------
// Binary min-heap priority queue sorted by distance (g-cost only, no heuristic)
// ---------------------------------------------------------------------------

interface HeapNode {
  r: number
  c: number
  dist: number
}

function heapInsert(heap: HeapNode[], node: HeapNode): void {
  heap.push(node)
  let i = heap.length - 1
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (heap[parent].dist <= node.dist) break
    heap[i] = heap[parent]
    heap[parent] = node
    i = parent
  }
}

function heapPop(heap: HeapNode[]): HeapNode {
  const min = heap[0]
  const last = heap.pop()!
  if (heap.length > 0) {
    heap[0] = last
    let i = 0
    const n = heap.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && heap[l].dist < heap[smallest].dist) smallest = l
      if (r < n && heap[r].dist < heap[smallest].dist) smallest = r
      if (smallest === i) break
      ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
      i = smallest
    }
  }
  return min
}

// ---------------------------------------------------------------------------
// Core Dijkstra
// ---------------------------------------------------------------------------

export function dijkstra(
  grid: CellType[][],
  weights: number[][],
  start: [number, number],
  goal: [number, number],
  allowDiagonal: boolean = false
): DijkstraResult {
  const rows = grid.length
  const cols = grid[0].length
  const DIRS = allowDiagonal ? DIRS_8 : DIRS_4

  // Distance grid — Infinity means not yet reached
  const distances: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(Infinity)
  )
  const parent: ([number, number] | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  )
  const closed: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  )

  const steps: DijkstraStep[] = []
  let visitedCount = 0

  distances[start[0]][start[1]] = 0
  const heap: HeapNode[] = []
  heapInsert(heap, { r: start[0], c: start[1], dist: 0 })

  steps.push({
    row: start[0],
    col: start[1],
    action: 'enqueue',
    distance: 0,
    openSetSize: heap.length,
    closedSetSize: 0,
  })

  while (heap.length > 0) {
    const { r, c, dist } = heapPop(heap)

    // Skip stale entries (re-inserted with better distance)
    if (closed[r][c]) continue
    closed[r][c] = true
    visitedCount++

    steps.push({
      row: r,
      col: c,
      action: 'visit',
      distance: dist,
      openSetSize: heap.length,
      closedSetSize: visitedCount,
    })

    if (r === goal[0] && c === goal[1]) {
      const path = reconstructPath(parent, start, goal)
      const totalCost = distances[goal[0]][goal[1]]
      for (const p of path) {
        steps.push({
          row: p.row,
          col: p.col,
          action: 'path',
          distance: distances[p.row][p.col],
          openSetSize: 0,
          closedSetSize: visitedCount,
        })
      }
      return { steps, path, visitedCount, pathLength: path.length, totalCost, distances }
    }

    for (const [dr, dc, baseCost] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (
        nr < 0 || nr >= rows ||
        nc < 0 || nc >= cols ||
        closed[nr][nc] ||
        grid[nr][nc] === 'wall'
      ) continue

      // Movement cost: cell weight * directional cost (sqrt(2) for diagonal)
      const moveCost = weights[nr][nc] * baseCost
      const newDist = dist + moveCost

      if (newDist < distances[nr][nc]) {
        const isUpdate = distances[nr][nc] !== Infinity
        distances[nr][nc] = newDist
        parent[nr][nc] = [r, c]
        heapInsert(heap, { r: nr, c: nc, dist: newDist })
        steps.push({
          row: nr,
          col: nc,
          action: isUpdate ? 'update' : 'enqueue',
          distance: newDist,
          openSetSize: heap.length,
          closedSetSize: visitedCount,
        })
      }
    }
  }

  return { steps, path: null, visitedCount, pathLength: 0, totalCost: 0, distances }
}

// ---------------------------------------------------------------------------
// Weight grid generators
// ---------------------------------------------------------------------------

export function generateWeights(
  rows: number,
  cols: number,
  type: WeightType
): number[][] {
  switch (type) {
    case 'uniform':
      return Array.from({ length: rows }, () => Array(cols).fill(1))

    case 'random':
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Math.floor(Math.random() * 5) + 1)
      )

    case 'terrain': {
      // Simple terrain via random cost patches (zones of high/low cost)
      // Start with all weight 1, then paint several random circular patches
      const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1))

      const patchCount = Math.floor((rows * cols) / 20)
      for (let p = 0; p < patchCount; p++) {
        const cr = Math.floor(Math.random() * rows)
        const cc = Math.floor(Math.random() * cols)
        const radius = 1 + Math.floor(Math.random() * Math.min(rows, cols) * 0.15)
        // High-cost terrain (mountains/water): weight 4-5
        // Low-cost terrain (plains/roads): weight 1
        const weight = Math.random() < 0.6
          ? 4 + Math.floor(Math.random() * 2)  // high cost: 4 or 5
          : 1                                    // low cost: 1

        for (let r = Math.max(0, cr - radius); r <= Math.min(rows - 1, cr + radius); r++) {
          for (let c = Math.max(0, cc - radius); c <= Math.min(cols - 1, cc + radius); c++) {
            const dr = r - cr
            const dc = c - cc
            if (dr * dr + dc * dc <= radius * radius) {
              grid[r][c] = weight
            }
          }
        }
      }

      // Add a few road-like horizontal/vertical corridors of weight 1
      const roadCount = Math.max(1, Math.floor(Math.min(rows, cols) / 6))
      for (let i = 0; i < roadCount; i++) {
        if (Math.random() < 0.5) {
          // Horizontal road
          const row = Math.floor(Math.random() * rows)
          for (let c = 0; c < cols; c++) grid[row][c] = 1
        } else {
          // Vertical road
          const col = Math.floor(Math.random() * cols)
          for (let r = 0; r < rows; r++) grid[r][col] = 1
        }
      }

      return grid
    }
  }
}

// ---------------------------------------------------------------------------
// Path reconstruction (same pattern as A*)
// ---------------------------------------------------------------------------

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
