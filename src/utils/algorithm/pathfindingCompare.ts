// ── Pathfinding Compare (A* vs Dijkstra) ────────────────────────────────────

export type CellType = 'empty' | 'wall' | 'start' | 'end'
export type AlgorithmType = 'astar' | 'dijkstra'

export interface Cell {
  row: number
  col: number
  type: CellType
}

export interface PathStep {
  algorithm: AlgorithmType
  action: 'visit' | 'enqueue' | 'found' | 'no-path'
  row: number
  col: number
  fCost?: number
  gCost?: number
  hCost?: number
}

export interface PathResult {
  steps: PathStep[]
  astarPath: [number, number][]
  dijkstraPath: [number, number][]
  astarVisited: number
  dijkstraVisited: number
  astarPathLength: number
  dijkstraPathLength: number
}

// ── Grid ─────────────────────────────────────────────────────────────────────

export function createGrid(rows: number, cols: number): CellType[][] {
  return Array.from({ length: rows }, () => Array(cols).fill('empty') as CellType[])
}

export function addRandomWalls(grid: CellType[][], density: number, start: [number, number], end: [number, number]): CellType[][] {
  const newGrid = grid.map(row => [...row])
  for (let r = 0; r < newGrid.length; r++) {
    for (let c = 0; c < newGrid[0].length; c++) {
      if (r === start[0] && c === start[1]) continue
      if (r === end[0] && c === end[1]) continue
      if (Math.random() < density) {
        newGrid[r][c] = 'wall'
      }
    }
  }
  newGrid[start[0]][start[1]] = 'start'
  newGrid[end[0]][end[1]] = 'end'
  return newGrid
}

export function generateMaze(rows: number, cols: number, start: [number, number], end: [number, number]): CellType[][] {
  const grid: CellType[][] = Array.from({ length: rows }, () => Array(cols).fill('wall') as CellType[])

  // DFS maze generation
  const visited = new Set<string>()

  function carve(r: number, c: number): void {
    visited.add(`${r},${c}`)
    grid[r][c] = 'empty'

    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]]
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[dirs[i], dirs[j]] = [dirs[j], dirs[i]]
    }

    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`)) {
        grid[r + dr / 2][c + dc / 2] = 'empty'
        carve(nr, nc)
      }
    }
  }

  // Start carving from top-left area
  const sr = start[0] % 2 === 0 ? start[0] : start[0] - 1
  const sc = start[1] % 2 === 0 ? start[1] : start[1] - 1
  carve(Math.max(0, sr), Math.max(0, sc))

  grid[start[0]][start[1]] = 'start'
  grid[end[0]][end[1]] = 'end'

  // Ensure end is reachable - clear neighbors
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nr = end[0] + dr, nc = end[1] + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 'wall') {
      grid[nr][nc] = 'empty'
    }
  }

  return grid
}

// ── Heuristic ────────────────────────────────────────────────────────────────

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

// ── A* ───────────────────────────────────────────────────────────────────────

interface QueueEntry {
  row: number
  col: number
  f: number
  g: number
}

function runAStar(
  grid: CellType[][], start: [number, number], end: [number, number],
): { steps: PathStep[]; path: [number, number][]; visited: number } {
  const rows = grid.length, cols = grid[0].length
  const steps: PathStep[] = []

  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const cameFrom = Array.from({ length: rows }, () => Array(cols).fill(null) as ([number, number] | null)[])

  gScore[start[0]][start[1]] = 0
  fScore[start[0]][start[1]] = manhattan(start[0], start[1], end[0], end[1])

  // Simple priority queue using sorted array
  const open: QueueEntry[] = [{ row: start[0], col: start[1], f: fScore[start[0]][start[1]], g: 0 }]
  const closedSet = new Set<string>()
  let visitedCount = 0

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!
    const { row, col } = current
    const key = `${row},${col}`

    if (closedSet.has(key)) continue
    closedSet.add(key)
    visitedCount++

    steps.push({
      algorithm: 'astar', action: 'visit', row, col,
      fCost: fScore[row][col], gCost: gScore[row][col],
      hCost: manhattan(row, col, end[0], end[1]),
    })

    if (row === end[0] && col === end[1]) {
      steps.push({ algorithm: 'astar', action: 'found', row, col })
      // Reconstruct path
      const path: [number, number][] = []
      let cr = row, cc = col
      while (cr !== start[0] || cc !== start[1]) {
        path.unshift([cr, cc])
        const prev = cameFrom[cr][cc]
        if (!prev) break
        ;[cr, cc] = prev
      }
      path.unshift(start)
      return { steps, path, visited: visitedCount }
    }

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === 'wall') continue
      if (closedSet.has(`${nr},${nc}`)) continue

      const tentG = gScore[row][col] + 1
      if (tentG < gScore[nr][nc]) {
        cameFrom[nr][nc] = [row, col]
        gScore[nr][nc] = tentG
        fScore[nr][nc] = tentG + manhattan(nr, nc, end[0], end[1])

        steps.push({
          algorithm: 'astar', action: 'enqueue', row: nr, col: nc,
          fCost: fScore[nr][nc], gCost: tentG,
          hCost: manhattan(nr, nc, end[0], end[1]),
        })

        open.push({ row: nr, col: nc, f: fScore[nr][nc], g: tentG })
      }
    }
  }

  steps.push({ algorithm: 'astar', action: 'no-path', row: -1, col: -1 })
  return { steps, path: [], visited: visitedCount }
}

// ── Dijkstra ─────────────────────────────────────────────────────────────────

function runDijkstra(
  grid: CellType[][], start: [number, number], end: [number, number],
): { steps: PathStep[]; path: [number, number][]; visited: number } {
  const rows = grid.length, cols = grid[0].length
  const steps: PathStep[] = []

  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const cameFrom = Array.from({ length: rows }, () => Array(cols).fill(null) as ([number, number] | null)[])

  dist[start[0]][start[1]] = 0

  const open: { row: number; col: number; d: number }[] = [{ row: start[0], col: start[1], d: 0 }]
  const closedSet = new Set<string>()
  let visitedCount = 0

  while (open.length > 0) {
    open.sort((a, b) => a.d - b.d)
    const current = open.shift()!
    const { row, col } = current
    const key = `${row},${col}`

    if (closedSet.has(key)) continue
    closedSet.add(key)
    visitedCount++

    steps.push({
      algorithm: 'dijkstra', action: 'visit', row, col,
      gCost: dist[row][col],
    })

    if (row === end[0] && col === end[1]) {
      steps.push({ algorithm: 'dijkstra', action: 'found', row, col })
      const path: [number, number][] = []
      let cr = row, cc = col
      while (cr !== start[0] || cc !== start[1]) {
        path.unshift([cr, cc])
        const prev = cameFrom[cr][cc]
        if (!prev) break
        ;[cr, cc] = prev
      }
      path.unshift(start)
      return { steps, path, visited: visitedCount }
    }

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === 'wall') continue
      if (closedSet.has(`${nr},${nc}`)) continue

      const tentD = dist[row][col] + 1
      if (tentD < dist[nr][nc]) {
        cameFrom[nr][nc] = [row, col]
        dist[nr][nc] = tentD

        steps.push({
          algorithm: 'dijkstra', action: 'enqueue', row: nr, col: nc,
          gCost: tentD,
        })

        open.push({ row: nr, col: nc, d: tentD })
      }
    }
  }

  steps.push({ algorithm: 'dijkstra', action: 'no-path', row: -1, col: -1 })
  return { steps, path: [], visited: visitedCount }
}

// ── Interleaved comparison ───────────────────────────────────────────────────

export function runComparison(
  grid: CellType[][], start: [number, number], end: [number, number],
): PathResult {
  const astar = runAStar(grid, start, end)
  const dijkstra = runDijkstra(grid, start, end)

  // Interleave steps: alternate between A* and Dijkstra
  const steps: PathStep[] = []
  let ai = 0, di = 0

  while (ai < astar.steps.length || di < dijkstra.steps.length) {
    if (ai < astar.steps.length) steps.push(astar.steps[ai++])
    if (di < dijkstra.steps.length) steps.push(dijkstra.steps[di++])
  }

  return {
    steps,
    astarPath: astar.path,
    dijkstraPath: dijkstra.path,
    astarVisited: astar.visited,
    dijkstraVisited: dijkstra.visited,
    astarPathLength: astar.path.length,
    dijkstraPathLength: dijkstra.path.length,
  }
}
