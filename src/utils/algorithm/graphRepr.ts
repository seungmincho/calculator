// ── Graph Representation Algorithm ───────────────────────────────────────────
// Interactive graph with adjacency matrix and adjacency list views

export interface GraphNode {
  id: number
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  from: number
  to: number
  weight: number
}

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  directed: boolean
  weighted: boolean
}

// ── Adjacency Matrix ─────────────────────────────────────────────────────────

export function toAdjacencyMatrix(state: GraphState): (number | null)[][] {
  const n = state.nodes.length
  const matrix: (number | null)[][] = Array.from({ length: n }, () =>
    Array(n).fill(null) as (number | null)[]
  )

  for (const edge of state.edges) {
    const fi = state.nodes.findIndex(n => n.id === edge.from)
    const ti = state.nodes.findIndex(n => n.id === edge.to)
    if (fi < 0 || ti < 0) continue

    matrix[fi][ti] = state.weighted ? edge.weight : 1
    if (!state.directed) {
      matrix[ti][fi] = state.weighted ? edge.weight : 1
    }
  }

  return matrix
}

// ── Adjacency List ───────────────────────────────────────────────────────────

export interface AdjListEntry {
  nodeId: number
  label: string
  neighbors: { nodeId: number; label: string; weight: number }[]
}

export function toAdjacencyList(state: GraphState): AdjListEntry[] {
  const list: AdjListEntry[] = state.nodes.map(node => ({
    nodeId: node.id,
    label: node.label,
    neighbors: [],
  }))

  const nodeMap = new Map(state.nodes.map(n => [n.id, n]))

  for (const edge of state.edges) {
    const fromEntry = list.find(e => e.nodeId === edge.from)
    const toNode = nodeMap.get(edge.to)
    if (fromEntry && toNode) {
      fromEntry.neighbors.push({
        nodeId: edge.to,
        label: toNode.label,
        weight: edge.weight,
      })
    }

    if (!state.directed) {
      const toEntry = list.find(e => e.nodeId === edge.to)
      const fromNode = nodeMap.get(edge.from)
      if (toEntry && fromNode) {
        toEntry.neighbors.push({
          nodeId: edge.from,
          label: fromNode.label,
          weight: edge.weight,
        })
      }
    }
  }

  return list
}

// ── Graph Operations ─────────────────────────────────────────────────────────

export function addNode(state: GraphState, x: number, y: number): GraphState {
  const maxId = state.nodes.reduce((max, n) => Math.max(max, n.id), -1)
  const newId = maxId + 1
  const label = String(newId)

  return {
    ...state,
    nodes: [...state.nodes, { id: newId, label, x, y }],
  }
}

export function removeNode(state: GraphState, nodeId: number): GraphState {
  return {
    ...state,
    nodes: state.nodes.filter(n => n.id !== nodeId),
    edges: state.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
  }
}

export function addEdge(state: GraphState, from: number, to: number, weight = 1): GraphState {
  if (from === to) return state

  // Check if edge exists
  const exists = state.edges.some(e =>
    (e.from === from && e.to === to) ||
    (!state.directed && e.from === to && e.to === from)
  )
  if (exists) return state

  return {
    ...state,
    edges: [...state.edges, { from, to, weight }],
  }
}

export function removeEdge(state: GraphState, from: number, to: number): GraphState {
  return {
    ...state,
    edges: state.edges.filter(e => {
      if (e.from === from && e.to === to) return false
      if (!state.directed && e.from === to && e.to === from) return false
      return true
    }),
  }
}

export function updateNodePosition(state: GraphState, nodeId: number, x: number, y: number): GraphState {
  return {
    ...state,
    nodes: state.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n),
  }
}

export function toggleDirected(state: GraphState): GraphState {
  // When switching to directed, remove duplicate edges
  if (!state.directed) {
    // Undirected → directed: keep all edges as-is
    return { ...state, directed: true }
  }
  // Directed → undirected: remove reverse duplicates
  const seen = new Set<string>()
  const edges = state.edges.filter(e => {
    const key = [Math.min(e.from, e.to), Math.max(e.from, e.to)].join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { ...state, directed: false, edges }
}

export function toggleWeighted(state: GraphState): GraphState {
  if (state.weighted) {
    // Reset all weights to 1
    return {
      ...state,
      weighted: false,
      edges: state.edges.map(e => ({ ...e, weight: 1 })),
    }
  }
  // Assign random weights
  return {
    ...state,
    weighted: true,
    edges: state.edges.map(e => ({ ...e, weight: Math.floor(Math.random() * 9) + 1 })),
  }
}

export function updateEdgeWeight(state: GraphState, from: number, to: number, weight: number): GraphState {
  return {
    ...state,
    edges: state.edges.map(e => {
      if (e.from === from && e.to === to) return { ...e, weight }
      if (!state.directed && e.from === to && e.to === from) return { ...e, weight }
      return e
    }),
  }
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getGraphStats(state: GraphState): {
  nodeCount: number
  edgeCount: number
  density: number
  avgDegree: number
} {
  const n = state.nodes.length
  const e = state.edges.length
  const maxEdges = state.directed ? n * (n - 1) : n * (n - 1) / 2
  const density = maxEdges > 0 ? e / maxEdges : 0
  const totalDegree = state.directed ? e : e * 2
  const avgDegree = n > 0 ? totalDegree / n : 0

  return {
    nodeCount: n,
    edgeCount: e,
    density: Math.round(density * 100) / 100,
    avgDegree: Math.round(avgDegree * 100) / 100,
  }
}

// ── Preset Graphs ────────────────────────────────────────────────────────────

export function createEmptyGraph(): GraphState {
  return { nodes: [], edges: [], directed: false, weighted: false }
}

export function createSampleGraph(): GraphState {
  const cx = 300, cy = 200, r = 120
  const nodeCount = 6
  const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: i,
    label: String(i),
    x: cx + r * Math.cos((2 * Math.PI * i) / nodeCount - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / nodeCount - Math.PI / 2),
  }))

  const edges: GraphEdge[] = [
    { from: 0, to: 1, weight: 1 },
    { from: 0, to: 2, weight: 1 },
    { from: 1, to: 3, weight: 1 },
    { from: 2, to: 3, weight: 1 },
    { from: 3, to: 4, weight: 1 },
    { from: 4, to: 5, weight: 1 },
    { from: 5, to: 0, weight: 1 },
  ]

  return { nodes, edges, directed: false, weighted: false }
}

export function createCompleteGraph(n: number): GraphState {
  const cx = 300, cy = 200, r = 120
  const nodes: GraphNode[] = Array.from({ length: n }, (_, i) => ({
    id: i,
    label: String(i),
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }))

  const edges: GraphEdge[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edges.push({ from: i, to: j, weight: 1 })
    }
  }

  return { nodes, edges, directed: false, weighted: false }
}
