// Bellman-Ford shortest path algorithm
// Pure functions with step-by-step recording for visualization
// Supports negative weight edges and negative cycle detection

export interface BFNode {
  id: number
  x: number
  y: number
  label: string
}

export interface BFEdge {
  from: number
  to: number
  weight: number
}

export interface BellmanFordStep {
  action: 'init' | 'start-iteration' | 'relax' | 'no-relax' | 'update' | 'end-iteration' | 'check-negative' | 'negative-cycle' | 'done'
  iteration: number         // current iteration (1-based)
  edgeIndex: number         // edge being examined
  edge: BFEdge | null
  distances: number[]       // snapshot of distance array
  predecessors: (number | null)[]  // snapshot of predecessor array
  updatedNode: number       // node whose distance was updated (-1 if none)
  totalRelaxations: number  // count of successful relaxations this round
  description: string
}

export interface BellmanFordResult {
  steps: BellmanFordStep[]
  distances: number[]
  predecessors: (number | null)[]
  hasNegativeCycle: boolean
  negativeCycleNodes: number[]
  path: number[] | null     // shortest path from source to a specific target
}

// ---------------------------------------------------------------------------
// Core Bellman-Ford
// ---------------------------------------------------------------------------

export function bellmanFord(
  nodes: BFNode[],
  edges: BFEdge[],
  source: number,
  target?: number
): BellmanFordResult {
  const n = nodes.length
  const dist: number[] = Array(n).fill(Infinity)
  const pred: (number | null)[] = Array(n).fill(null)
  const steps: BellmanFordStep[] = []
  dist[source] = 0

  // Init
  steps.push({
    action: 'init',
    iteration: 0,
    edgeIndex: -1,
    edge: null,
    distances: [...dist],
    predecessors: [...pred],
    updatedNode: source,
    totalRelaxations: 0,
    description: 'init',
  })

  // V-1 iterations
  let anyUpdate = false
  for (let iter = 1; iter < n; iter++) {
    anyUpdate = false
    let relaxCount = 0

    steps.push({
      action: 'start-iteration',
      iteration: iter,
      edgeIndex: -1,
      edge: null,
      distances: [...dist],
      predecessors: [...pred],
      updatedNode: -1,
      totalRelaxations: 0,
      description: 'start-iteration',
    })

    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e]

      if (dist[edge.from] === Infinity) {
        steps.push({
          action: 'no-relax',
          iteration: iter,
          edgeIndex: e,
          edge,
          distances: [...dist],
          predecessors: [...pred],
          updatedNode: -1,
          totalRelaxations: relaxCount,
          description: 'no-relax',
        })
        continue
      }

      const newDist = dist[edge.from] + edge.weight

      steps.push({
        action: 'relax',
        iteration: iter,
        edgeIndex: e,
        edge,
        distances: [...dist],
        predecessors: [...pred],
        updatedNode: -1,
        totalRelaxations: relaxCount,
        description: 'relax',
      })

      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist
        pred[edge.to] = edge.from
        anyUpdate = true
        relaxCount++

        steps.push({
          action: 'update',
          iteration: iter,
          edgeIndex: e,
          edge,
          distances: [...dist],
          predecessors: [...pred],
          updatedNode: edge.to,
          totalRelaxations: relaxCount,
          description: 'update',
        })
      }
    }

    steps.push({
      action: 'end-iteration',
      iteration: iter,
      edgeIndex: -1,
      edge: null,
      distances: [...dist],
      predecessors: [...pred],
      updatedNode: -1,
      totalRelaxations: relaxCount,
      description: 'end-iteration',
    })

    // Early termination: no updates means we're done
    if (!anyUpdate) break
  }

  // Check for negative cycles (V-th iteration)
  let hasNegativeCycle = false
  const negativeCycleNodes: number[] = []

  steps.push({
    action: 'check-negative',
    iteration: n,
    edgeIndex: -1,
    edge: null,
    distances: [...dist],
    predecessors: [...pred],
    updatedNode: -1,
    totalRelaxations: 0,
    description: 'check-negative',
  })

  for (let e = 0; e < edges.length; e++) {
    const edge = edges[e]
    if (dist[edge.from] !== Infinity && dist[edge.from] + edge.weight < dist[edge.to]) {
      hasNegativeCycle = true
      if (!negativeCycleNodes.includes(edge.from)) negativeCycleNodes.push(edge.from)
      if (!negativeCycleNodes.includes(edge.to)) negativeCycleNodes.push(edge.to)
    }
  }

  if (hasNegativeCycle) {
    steps.push({
      action: 'negative-cycle',
      iteration: n,
      edgeIndex: -1,
      edge: null,
      distances: [...dist],
      predecessors: [...pred],
      updatedNode: -1,
      totalRelaxations: 0,
      description: 'negative-cycle',
    })
  } else {
    steps.push({
      action: 'done',
      iteration: n,
      edgeIndex: -1,
      edge: null,
      distances: [...dist],
      predecessors: [...pred],
      updatedNode: -1,
      totalRelaxations: 0,
      description: 'done',
    })
  }

  // Reconstruct path if target specified
  let path: number[] | null = null
  if (target !== undefined && !hasNegativeCycle && dist[target] !== Infinity) {
    path = []
    let cur: number | null = target
    while (cur !== null) {
      path.unshift(cur)
      cur = pred[cur]
    }
  }

  return { steps, distances: dist, predecessors: pred, hasNegativeCycle, negativeCycleNodes, path }
}

// ---------------------------------------------------------------------------
// Random graph generators
// ---------------------------------------------------------------------------

export function generateRandomGraph(
  nodeCount: number = 6,
  allowNegative: boolean = false
): { nodes: BFNode[]; edges: BFEdge[] } {
  const nodes: BFNode[] = []
  const padding = 60
  const width = 540
  const height = 380

  // Circle layout
  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
    const radius = Math.min(width, height) * 0.32
    const jitterX = (Math.random() - 0.5) * 30
    const jitterY = (Math.random() - 0.5) * 30
    nodes.push({
      id: i,
      x: width / 2 + Math.cos(angle) * radius + jitterX + padding / 2,
      y: height / 2 + Math.sin(angle) * radius + jitterY + padding / 2,
      label: String.fromCharCode(65 + i),
    })
  }

  const edges: BFEdge[] = []
  const edgeSet = new Set<string>()

  const addEdge = (from: number, to: number) => {
    const key = `${from}-${to}`
    if (edgeSet.has(key) || from === to) return
    edgeSet.add(key)
    let weight: number
    if (allowNegative && Math.random() < 0.2) {
      weight = -Math.floor(Math.random() * 4) - 1 // -1 to -4
    } else {
      weight = Math.floor(Math.random() * 9) + 1 // 1 to 9
    }
    edges.push({ from, to, weight })
  }

  // Ensure connectivity (spanning path)
  const shuffled = Array.from({ length: nodeCount }, (_, i) => i)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  for (let i = 1; i < nodeCount; i++) {
    addEdge(shuffled[i - 1], shuffled[i])
  }

  // Extra directed edges
  const extraCount = Math.floor(nodeCount * 0.6)
  for (let k = 0; k < extraCount; k++) {
    const a = Math.floor(Math.random() * nodeCount)
    const b = Math.floor(Math.random() * nodeCount)
    addEdge(a, b)
  }

  return { nodes, edges }
}
