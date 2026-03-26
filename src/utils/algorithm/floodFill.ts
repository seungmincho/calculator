export type CellColor = number // 0-7 color index

export interface FloodFillStep {
  grid: CellColor[][]
  row: number
  col: number
  action: 'visit' | 'fill' | 'skip' | 'done'
  oldColor: number
  newColor: number
  frontierSize: number
  filledCount: number
}

export interface FloodFillResult {
  steps: FloodFillStep[]
  filledCount: number
}

function cloneGrid(grid: CellColor[][]): CellColor[][] {
  return grid.map(row => [...row])
}

export function floodFillBFS(
  grid: CellColor[][],
  startRow: number,
  startCol: number,
  newColor: number
): FloodFillResult {
  const rows = grid.length
  const cols = grid[0].length
  const oldColor = grid[startRow][startCol]
  const steps: FloodFillStep[] = []

  if (oldColor === newColor) {
    return { steps, filledCount: 0 }
  }

  const workGrid = cloneGrid(grid)
  const visited = new Set<string>()
  const queue: [number, number][] = [[startRow, startCol]]
  visited.add(`${startRow},${startCol}`)
  let filledCount = 0

  while (queue.length > 0) {
    const [r, c] = queue.shift()!

    // Visit step
    steps.push({
      grid: cloneGrid(workGrid),
      row: r,
      col: c,
      action: 'visit',
      oldColor,
      newColor,
      frontierSize: queue.length,
      filledCount,
    })

    // Fill this cell
    workGrid[r][c] = newColor
    filledCount++

    steps.push({
      grid: cloneGrid(workGrid),
      row: r,
      col: c,
      action: 'fill',
      oldColor,
      newColor,
      frontierSize: queue.length,
      filledCount,
    })

    // Check neighbors (4-directional)
    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue

      if (workGrid[nr][nc] === oldColor) {
        visited.add(key)
        queue.push([nr, nc])
      } else {
        steps.push({
          grid: cloneGrid(workGrid),
          row: nr,
          col: nc,
          action: 'skip',
          oldColor,
          newColor,
          frontierSize: queue.length,
          filledCount,
        })
      }
    }
  }

  // Done step
  steps.push({
    grid: cloneGrid(workGrid),
    row: startRow,
    col: startCol,
    action: 'done',
    oldColor,
    newColor,
    frontierSize: 0,
    filledCount,
  })

  return { steps, filledCount }
}

export function floodFillDFS(
  grid: CellColor[][],
  startRow: number,
  startCol: number,
  newColor: number
): FloodFillResult {
  const rows = grid.length
  const cols = grid[0].length
  const oldColor = grid[startRow][startCol]
  const steps: FloodFillStep[] = []

  if (oldColor === newColor) {
    return { steps, filledCount: 0 }
  }

  const workGrid = cloneGrid(grid)
  const visited = new Set<string>()
  const stack: [number, number][] = [[startRow, startCol]]
  let filledCount = 0

  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    const key = `${r},${c}`

    if (visited.has(key)) continue
    visited.add(key)

    // Visit step
    steps.push({
      grid: cloneGrid(workGrid),
      row: r,
      col: c,
      action: 'visit',
      oldColor,
      newColor,
      frontierSize: stack.length,
      filledCount,
    })

    // Fill this cell
    workGrid[r][c] = newColor
    filledCount++

    steps.push({
      grid: cloneGrid(workGrid),
      row: r,
      col: c,
      action: 'fill',
      oldColor,
      newColor,
      frontierSize: stack.length,
      filledCount,
    })

    // Push neighbors (4-directional)
    const neighbors: [number, number][] = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      const nkey = `${nr},${nc}`
      if (visited.has(nkey)) continue

      if (workGrid[nr][nc] === oldColor) {
        stack.push([nr, nc])
      } else {
        steps.push({
          grid: cloneGrid(workGrid),
          row: nr,
          col: nc,
          action: 'skip',
          oldColor,
          newColor,
          frontierSize: stack.length,
          filledCount,
        })
      }
    }
  }

  // Done step
  steps.push({
    grid: cloneGrid(workGrid),
    row: startRow,
    col: startCol,
    action: 'done',
    oldColor,
    newColor,
    frontierSize: 0,
    filledCount,
  })

  return { steps, filledCount }
}

// Seeded simple random for reproducibility
function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 4294967296
  }
}

export function createColorGrid(rows: number, cols: number): CellColor[][] {
  const grid: CellColor[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  )

  const rand = seededRand(Date.now() & 0xffff)

  // Place ~8-12 "seed" points for distinct color regions
  const numSeeds = Math.floor(rows * cols * 0.05) + 6
  const seeds: { r: number; c: number; color: CellColor }[] = []

  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      r: Math.floor(rand() * rows),
      c: Math.floor(rand() * cols),
      color: Math.floor(rand() * 6) as CellColor, // 0-5, keeping 6/7 rare
    })
  }

  // Voronoi-ish: each cell gets the color of its nearest seed
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let minDist = Infinity
      let bestColor: CellColor = 0
      for (const seed of seeds) {
        const dist = Math.sqrt((r - seed.r) ** 2 + (c - seed.c) ** 2)
        if (dist < minDist) {
          minDist = dist
          bestColor = seed.color
        }
      }
      grid[r][c] = bestColor
    }
  }

  return grid
}

export type GridPattern = 'random' | 'checkerboard' | 'islands'

export function createPatternGrid(
  rows: number,
  cols: number,
  pattern: GridPattern
): CellColor[][] {
  if (pattern === 'random') {
    return createColorGrid(rows, cols)
  }

  if (pattern === 'checkerboard') {
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ((r + c) % 2) as CellColor)
    )
  }

  // islands: scattered blobs of 4 colors on a background of color 0
  const grid: CellColor[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  )
  const rand = seededRand(42)
  const numIslands = Math.floor((rows * cols) / 20) + 3

  for (let i = 0; i < numIslands; i++) {
    const centerR = Math.floor(rand() * rows)
    const centerC = Math.floor(rand() * cols)
    const color = (Math.floor(rand() * 4) + 1) as CellColor
    const radius = Math.floor(rand() * 3) + 2

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr * dr + dc * dc <= radius * radius) {
          const r = centerR + dr
          const c = centerC + dc
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
            grid[r][c] = color
          }
        }
      }
    }
  }

  return grid
}
