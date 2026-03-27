// Prim's Minimum Spanning Tree algorithm
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

export type PrimStepAction =
  | 'start'           // select start vertex
  | 'add-edges'       // add adjacent edges to priority queue
  | 'extract'         // extract min edge from PQ
  | 'add-to-mst'      // add edge to MST
  | 'skip-visited'    // skip edge (vertex already visited)
  | 'done'

export interface PrimStep {
  action: PrimStepAction
  edge: GraphEdge | null
  vertex: number                 // relevant vertex
  visited: boolean[]             // snapshot of visited array
  mstEdges: GraphEdge[]          // snapshot of MST edges
  candidateEdges: GraphEdge[]    // snapshot of priority queue
  totalWeight: number
  description: string
}

export interface PrimResult {
  steps: PrimStep[]
  mstEdges: GraphEdge[]
  totalWeight: number
}

// ---------------------------------------------------------------------------
// Priority Queue (min-heap by edge weight)
// ---------------------------------------------------------------------------

class MinHeap {
  private heap: GraphEdge[] = []

  get size() { return this.heap.length }
  get items() { return [...this.heap] }

  push(edge: GraphEdge) {
    this.heap.push(edge)
    this.bubbleUp(this.heap.length - 1)
  }

  pop(): GraphEdge | null {
    if (this.heap.length === 0) return null
    const min = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.sinkDown(0)
    }
    return min
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.heap[parent].weight <= this.heap[i].weight) break
      ;[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]]
      i = parent
    }
  }

  private sinkDown(i: number) {
    const n = this.heap.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this.heap[l].weight < this.heap[smallest].weight) smallest = l
      if (r < n && this.heap[r].weight < this.heap[smallest].weight) smallest = r
      if (smallest === i) break
      ;[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]]
      i = smallest
    }
  }
}

// ---------------------------------------------------------------------------
// Build adjacency list
// ---------------------------------------------------------------------------

function buildAdj(nodes: GraphNode[], edges: GraphEdge[]): Map<number, GraphEdge[]> {
  const adj = new Map<number, GraphEdge[]>()
  for (const node of nodes) adj.set(node.id, [])
  for (const e of edges) {
    adj.get(e.from)!.push(e)
    adj.get(e.to)!.push({ from: e.to, to: e.from, weight: e.weight })
  }
  return adj
}

// ---------------------------------------------------------------------------
// Core Prim
// ---------------------------------------------------------------------------

export function prim(nodes: GraphNode[], edges: GraphEdge[], startId: number = 0): PrimResult {
  const n = nodes.length
  const adj = buildAdj(nodes, edges)
  const visited = Array(n).fill(false)
  const mstEdges: GraphEdge[] = []
  const steps: PrimStep[] = []
  const pq = new MinHeap()
  let totalWeight = 0

  // Start step
  visited[startId] = true
  steps.push({
    action: 'start',
    edge: null,
    vertex: startId,
    visited: [...visited],
    mstEdges: [],
    candidateEdges: [],
    totalWeight: 0,
    description: 'start',
  })

  // Add edges from start vertex
  const startEdges = adj.get(startId) || []
  for (const e of startEdges) {
    pq.push(e)
  }
  steps.push({
    action: 'add-edges',
    edge: null,
    vertex: startId,
    visited: [...visited],
    mstEdges: [...mstEdges],
    candidateEdges: pq.items,
    totalWeight: 0,
    description: 'add-edges',
  })

  while (pq.size > 0 && mstEdges.length < n - 1) {
    const minEdge = pq.pop()!
    const target = minEdge.to

    // Extract step
    steps.push({
      action: 'extract',
      edge: minEdge,
      vertex: target,
      visited: [...visited],
      mstEdges: [...mstEdges],
      candidateEdges: pq.items,
      totalWeight,
      description: 'extract',
    })

    if (visited[target]) {
      // Skip — already visited
      steps.push({
        action: 'skip-visited',
        edge: minEdge,
        vertex: target,
        visited: [...visited],
        mstEdges: [...mstEdges],
        candidateEdges: pq.items,
        totalWeight,
        description: 'skip-visited',
      })
      continue
    }

    // Add to MST
    visited[target] = true
    // Normalize edge direction for display (use original edge)
    const normalizedEdge: GraphEdge = {
      from: Math.min(minEdge.from, minEdge.to),
      to: Math.max(minEdge.from, minEdge.to),
      weight: minEdge.weight,
    }
    mstEdges.push(normalizedEdge)
    totalWeight += minEdge.weight

    steps.push({
      action: 'add-to-mst',
      edge: normalizedEdge,
      vertex: target,
      visited: [...visited],
      mstEdges: [...mstEdges],
      candidateEdges: pq.items,
      totalWeight,
      description: 'add-to-mst',
    })

    // Add new edges from the newly visited vertex
    const newEdges = adj.get(target) || []
    for (const e of newEdges) {
      if (!visited[e.to]) {
        pq.push(e)
      }
    }

    steps.push({
      action: 'add-edges',
      edge: null,
      vertex: target,
      visited: [...visited],
      mstEdges: [...mstEdges],
      candidateEdges: pq.items,
      totalWeight,
      description: 'add-edges',
    })
  }

  // Done step
  steps.push({
    action: 'done',
    edge: null,
    vertex: -1,
    visited: [...visited],
    mstEdges: [...mstEdges],
    candidateEdges: [],
    totalWeight,
    description: 'done',
  })

  return { steps, mstEdges, totalWeight }
}

// ---------------------------------------------------------------------------
// Random graph generator (same structure as Kruskal)
// ---------------------------------------------------------------------------

export function generateRandomGraph(nodeCount: number = 7): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const padding = 60
  const width = 540
  const height = 380

  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
    const radius = Math.min(width, height) * 0.35
    const jitterX = (Math.random() - 0.5) * 40
    const jitterY = (Math.random() - 0.5) * 40
    nodes.push({
      id: i,
      x: width / 2 + Math.cos(angle) * radius + jitterX + padding / 2,
      y: height / 2 + Math.sin(angle) * radius + jitterY + padding / 2,
      label: String.fromCharCode(65 + i),
    })
  }

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

  // Spanning tree for connectivity
  const shuffled = Array.from({ length: nodeCount }, (_, i) => i)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  for (let i = 1; i < nodeCount; i++) {
    addEdge(shuffled[i - 1], shuffled[i])
  }

  // Extra edges
  const extraCount = Math.floor(nodeCount * (0.5 + Math.random() * 0.3))
  for (let k = 0; k < extraCount; k++) {
    const a = Math.floor(Math.random() * nodeCount)
    const b = Math.floor(Math.random() * nodeCount)
    addEdge(a, b)
  }

  return { nodes, edges }
}
