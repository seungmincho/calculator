// Kruskal's Minimum Spanning Tree algorithm
// Pure functions with step-by-step recording for visualization

export interface GraphNode {
  id: number
  x: number
  y: number
  label: string
}

export interface GraphEdge {
  from: number
  to: number
  weight: number
}

export interface KruskalStep {
  action: 'sort' | 'check' | 'add' | 'skip' | 'done'
  edgeIndex: number          // index into sorted edges
  edge: GraphEdge | null
  mstEdges: number[]         // indices of edges accepted into MST
  parent: number[]           // Union-Find parent array snapshot
  rank: number[]             // Union-Find rank array snapshot
  totalWeight: number
  description: string
}

export interface KruskalResult {
  steps: KruskalStep[]
  mstEdges: GraphEdge[]
  totalWeight: number
  edgesSorted: GraphEdge[]
}

// ---------------------------------------------------------------------------
// Union-Find (Disjoint Set Union)
// ---------------------------------------------------------------------------

function makeParent(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

function makeRank(n: number): number[] {
  return Array(n).fill(0)
}

function find(parent: number[], x: number): number {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]] // path compression (halving)
    x = parent[x]
  }
  return x
}

function union(parent: number[], rank: number[], a: number, b: number): boolean {
  const ra = find(parent, a)
  const rb = find(parent, b)
  if (ra === rb) return false // same set, would form cycle
  if (rank[ra] < rank[rb]) {
    parent[ra] = rb
  } else if (rank[ra] > rank[rb]) {
    parent[rb] = ra
  } else {
    parent[rb] = ra
    rank[ra]++
  }
  return true
}

// ---------------------------------------------------------------------------
// Core Kruskal
// ---------------------------------------------------------------------------

export function kruskal(nodes: GraphNode[], edges: GraphEdge[]): KruskalResult {
  const n = nodes.length
  const parent = makeParent(n)
  const rank = makeRank(n)
  const steps: KruskalStep[] = []
  const mstEdgeIndices: number[] = []
  let totalWeight = 0

  // Sort edges by weight
  const sorted = [...edges].sort((a, b) => a.weight - b.weight)

  steps.push({
    action: 'sort',
    edgeIndex: -1,
    edge: null,
    mstEdges: [],
    parent: [...parent],
    rank: [...rank],
    totalWeight: 0,
    description: 'sort',
  })

  for (let i = 0; i < sorted.length; i++) {
    const edge = sorted[i]

    // Check step
    steps.push({
      action: 'check',
      edgeIndex: i,
      edge,
      mstEdges: [...mstEdgeIndices],
      parent: [...parent],
      rank: [...rank],
      totalWeight,
      description: 'check',
    })

    const merged = union(parent, rank, edge.from, edge.to)

    if (merged) {
      totalWeight += edge.weight
      mstEdgeIndices.push(i)
      steps.push({
        action: 'add',
        edgeIndex: i,
        edge,
        mstEdges: [...mstEdgeIndices],
        parent: [...parent],
        rank: [...rank],
        totalWeight,
        description: 'add',
      })
    } else {
      steps.push({
        action: 'skip',
        edgeIndex: i,
        edge,
        mstEdges: [...mstEdgeIndices],
        parent: [...parent],
        rank: [...rank],
        totalWeight,
        description: 'skip',
      })
    }

    // MST complete when we have n-1 edges
    if (mstEdgeIndices.length === n - 1) break
  }

  steps.push({
    action: 'done',
    edgeIndex: -1,
    edge: null,
    mstEdges: [...mstEdgeIndices],
    parent: [...parent],
    rank: [...rank],
    totalWeight,
    description: 'done',
  })

  const mstEdges = mstEdgeIndices.map(i => sorted[i])

  return { steps, mstEdges, totalWeight, edgesSorted: sorted }
}

// ---------------------------------------------------------------------------
// Random graph generators
// ---------------------------------------------------------------------------

export function generateRandomGraph(nodeCount: number = 7): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const padding = 60
  const width = 540
  const height = 380

  // Place nodes in a circle-ish layout with some randomness
  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
    const radius = Math.min(width, height) * 0.35
    const jitterX = (Math.random() - 0.5) * 40
    const jitterY = (Math.random() - 0.5) * 40
    nodes.push({
      id: i,
      x: width / 2 + Math.cos(angle) * radius + jitterX + padding / 2,
      y: height / 2 + Math.sin(angle) * radius + jitterY + padding / 2,
      label: String.fromCharCode(65 + i), // A, B, C, ...
    })
  }

  // Generate edges: ensure connected graph, then add random extra edges
  const edges: GraphEdge[] = []
  const edgeSet = new Set<string>()

  const addEdge = (from: number, to: number) => {
    const key = from < to ? `${from}-${to}` : `${to}-${from}`
    if (edgeSet.has(key) || from === to) return
    edgeSet.add(key)
    const dx = nodes[from].x - nodes[to].x
    const dy = nodes[from].y - nodes[to].y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const weight = Math.max(1, Math.round(dist / 30))
    edges.push({ from, to, weight })
  }

  // Spanning tree to ensure connectivity
  const shuffled = Array.from({ length: nodeCount }, (_, i) => i)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  for (let i = 1; i < nodeCount; i++) {
    addEdge(shuffled[i - 1], shuffled[i])
  }

  // Extra edges (50-80% more)
  const extraCount = Math.floor(nodeCount * (0.5 + Math.random() * 0.3))
  for (let k = 0; k < extraCount; k++) {
    const a = Math.floor(Math.random() * nodeCount)
    const b = Math.floor(Math.random() * nodeCount)
    addEdge(a, b)
  }

  return { nodes, edges }
}
