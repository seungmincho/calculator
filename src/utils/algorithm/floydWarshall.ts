// Floyd-Warshall all-pairs shortest paths algorithm
// Pure functions with step-by-step recording for visualization

export interface FWNode {
  id: number
  x: number
  y: number
  label: string
}

export interface FWEdge {
  from: number
  to: number
  weight: number
}

export interface FloydWarshallStep {
  action: 'init' | 'start-k' | 'check-pair' | 'update' | 'no-update' | 'end-k' | 'check-negative' | 'negative-cycle' | 'done'
  k: number           // current intermediate vertex
  i: number           // current row
  j: number           // current column
  dist: number[][]    // snapshot of distance matrix
  next: (number | null)[][] // snapshot of next matrix for path reconstruction
  updatedCell: [number, number] | null // [i, j] that was updated
  description: string
}

export interface FloydWarshallResult {
  steps: FloydWarshallStep[]
  dist: number[][]
  next: (number | null)[][]
  hasNegativeCycle: boolean
  negativeCycleNodes: number[]
}

function cloneMatrix<T>(m: T[][]): T[][] {
  return m.map(row => [...row])
}

export function floydWarshall(
  nodes: FWNode[],
  edges: FWEdge[],
): FloydWarshallResult {
  const n = nodes.length
  const INF = Infinity

  // Initialize distance matrix
  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : INF))
  )
  const next: (number | null)[][] = Array.from({ length: n }, () =>
    Array(n).fill(null)
  )

  // Fill direct edges
  for (const edge of edges) {
    if (edge.weight < dist[edge.from][edge.to]) {
      dist[edge.from][edge.to] = edge.weight
      next[edge.from][edge.to] = edge.to
    }
  }
  // Self-loops for path reconstruction
  for (let i = 0; i < n; i++) {
    next[i][i] = i
  }

  const steps: FloydWarshallStep[] = []

  // Init step
  steps.push({
    action: 'init',
    k: -1, i: -1, j: -1,
    dist: cloneMatrix(dist),
    next: cloneMatrix(next),
    updatedCell: null,
    description: 'init',
  })

  // Main triple loop
  for (let k = 0; k < n; k++) {
    steps.push({
      action: 'start-k',
      k, i: -1, j: -1,
      dist: cloneMatrix(dist),
      next: cloneMatrix(next),
      updatedCell: null,
      description: 'start-k',
    })

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] === INF || dist[k][j] === INF) continue

        const newDist = dist[i][k] + dist[k][j]

        if (newDist < dist[i][j]) {
          // Record check-pair + update as combined step to reduce step count
          dist[i][j] = newDist
          next[i][j] = next[i][k]

          steps.push({
            action: 'update',
            k, i, j,
            dist: cloneMatrix(dist),
            next: cloneMatrix(next),
            updatedCell: [i, j],
            description: 'update',
          })
        }
      }
    }

    steps.push({
      action: 'end-k',
      k, i: -1, j: -1,
      dist: cloneMatrix(dist),
      next: cloneMatrix(next),
      updatedCell: null,
      description: 'end-k',
    })
  }

  // Negative cycle detection: check diagonal
  let hasNegativeCycle = false
  const negativeCycleNodes: number[] = []

  steps.push({
    action: 'check-negative',
    k: n, i: -1, j: -1,
    dist: cloneMatrix(dist),
    next: cloneMatrix(next),
    updatedCell: null,
    description: 'check-negative',
  })

  for (let i = 0; i < n; i++) {
    if (dist[i][i] < 0) {
      hasNegativeCycle = true
      negativeCycleNodes.push(i)
    }
  }

  if (hasNegativeCycle) {
    steps.push({
      action: 'negative-cycle',
      k: n, i: -1, j: -1,
      dist: cloneMatrix(dist),
      next: cloneMatrix(next),
      updatedCell: null,
      description: 'negative-cycle',
    })
  } else {
    steps.push({
      action: 'done',
      k: n, i: -1, j: -1,
      dist: cloneMatrix(dist),
      next: cloneMatrix(next),
      updatedCell: null,
      description: 'done',
    })
  }

  return { steps, dist, next, hasNegativeCycle, negativeCycleNodes }
}

/** Reconstruct path from i to j using next matrix */
export function reconstructPath(next: (number | null)[][], i: number, j: number): number[] {
  if (next[i][j] === null) return []
  const path = [i]
  let cur = i
  while (cur !== j) {
    cur = next[cur][j]!
    if (cur === null) return []
    path.push(cur)
    if (path.length > next.length + 1) return [] // cycle guard
  }
  return path
}

// ---------------------------------------------------------------------------
// Random graph generator
// ---------------------------------------------------------------------------

export function generateRandomGraph(
  nodeCount: number = 5,
  allowNegative: boolean = false
): { nodes: FWNode[]; edges: FWEdge[] } {
  const nodes: FWNode[] = []
  const padding = 60
  const width = 540
  const height = 380

  // Circle layout
  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
    const radius = Math.min(width, height) * 0.32
    const jitterX = (Math.random() - 0.5) * 20
    const jitterY = (Math.random() - 0.5) * 20
    nodes.push({
      id: i,
      x: width / 2 + Math.cos(angle) * radius + jitterX + padding / 2,
      y: height / 2 + Math.sin(angle) * radius + jitterY + padding / 2,
      label: String.fromCharCode(65 + i),
    })
  }

  const edges: FWEdge[] = []
  const edgeSet = new Set<string>()

  const addEdge = (from: number, to: number) => {
    const key = `${from}-${to}`
    if (edgeSet.has(key) || from === to) return
    edgeSet.add(key)
    let weight: number
    if (allowNegative && Math.random() < 0.2) {
      weight = -Math.floor(Math.random() * 3) - 1
    } else {
      weight = Math.floor(Math.random() * 8) + 1
    }
    edges.push({ from, to, weight })
  }

  // Ensure connectivity
  const shuffled = Array.from({ length: nodeCount }, (_, i) => i)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  for (let i = 1; i < nodeCount; i++) {
    addEdge(shuffled[i - 1], shuffled[i])
  }

  // Extra edges for denser graph
  const extraCount = Math.floor(nodeCount * 0.8)
  for (let k = 0; k < extraCount; k++) {
    const a = Math.floor(Math.random() * nodeCount)
    const b = Math.floor(Math.random() * nodeCount)
    addEdge(a, b)
  }

  return { nodes, edges }
}
