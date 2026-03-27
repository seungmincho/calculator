// Euler Path / Circuit — Hierholzer's Algorithm
// Pure functions with step-by-step recording for visualization
// Supports both directed and undirected graphs

export interface EPNode {
  id: number
  x: number
  y: number
  label: string
}

export interface EPEdge {
  id: number
  from: number
  to: number
}

export type EulerType = 'circuit' | 'path' | 'none'

export interface EulerStep {
  action:
    | 'init'
    | 'check-degrees'
    | 'no-euler'
    | 'start-traverse'
    | 'traverse-edge'
    | 'stuck'
    | 'pop-circuit'
    | 'backtrack'
    | 'done'
  currentNode: number
  stack: number[]
  circuit: number[]
  visitedEdges: Set<number>
  currentEdgeId: number       // edge being traversed (-1 if none)
  description: string
}

export interface EulerResult {
  steps: EulerStep[]
  eulerType: EulerType
  circuit: number[]           // final Euler path/circuit (node IDs)
  oddDegreeNodes: number[]    // nodes with odd degree
  degrees: Map<number, number>
}

// ── Degree analysis ──────────────────────────────────────────────────────────

function computeDegrees(nodes: EPNode[], edges: EPEdge[], directed: boolean): Map<number, number> {
  const deg = new Map<number, number>()
  for (const n of nodes) deg.set(n.id, 0)
  if (directed) {
    // For directed, we track out-degree - in-degree in a separate function
    // Here we return out-degree for traversal
    for (const e of edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1)
    }
  } else {
    for (const e of edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1)
      deg.set(e.to, (deg.get(e.to) ?? 0) + 1)
    }
  }
  return deg
}

function getOddDegreeNodes(nodes: EPNode[], edges: EPEdge[], directed: boolean): number[] {
  if (directed) {
    const inDeg = new Map<number, number>()
    const outDeg = new Map<number, number>()
    for (const n of nodes) { inDeg.set(n.id, 0); outDeg.set(n.id, 0) }
    for (const e of edges) {
      outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1)
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1)
    }
    // For directed, "odd degree" means in-degree != out-degree
    const result: number[] = []
    for (const n of nodes) {
      if ((inDeg.get(n.id) ?? 0) !== (outDeg.get(n.id) ?? 0)) result.push(n.id)
    }
    return result
  } else {
    const deg = computeDegrees(nodes, edges, false)
    return nodes.filter(n => ((deg.get(n.id) ?? 0) % 2) !== 0).map(n => n.id)
  }
}

function determineEulerType(nodes: EPNode[], edges: EPEdge[], directed: boolean): EulerType {
  if (edges.length === 0) return 'none'

  if (directed) {
    const inDeg = new Map<number, number>()
    const outDeg = new Map<number, number>()
    for (const n of nodes) { inDeg.set(n.id, 0); outDeg.set(n.id, 0) }
    for (const e of edges) {
      outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1)
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1)
    }
    let startNodes = 0, endNodes = 0
    for (const n of nodes) {
      const diff = (outDeg.get(n.id) ?? 0) - (inDeg.get(n.id) ?? 0)
      if (diff === 0) continue
      if (diff === 1) startNodes++
      else if (diff === -1) endNodes++
      else return 'none'
    }
    if (startNodes === 0 && endNodes === 0) return 'circuit'
    if (startNodes === 1 && endNodes === 1) return 'path'
    return 'none'
  } else {
    const oddNodes = getOddDegreeNodes(nodes, edges, false)
    if (oddNodes.length === 0) return 'circuit'
    if (oddNodes.length === 2) return 'path'
    return 'none'
  }
}

function findStartNode(nodes: EPNode[], edges: EPEdge[], directed: boolean, eulerType: EulerType): number {
  if (eulerType === 'circuit') return nodes[0]?.id ?? 0

  if (directed) {
    const inDeg = new Map<number, number>()
    const outDeg = new Map<number, number>()
    for (const n of nodes) { inDeg.set(n.id, 0); outDeg.set(n.id, 0) }
    for (const e of edges) {
      outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1)
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1)
    }
    for (const n of nodes) {
      if ((outDeg.get(n.id) ?? 0) - (inDeg.get(n.id) ?? 0) === 1) return n.id
    }
  } else {
    const oddNodes = getOddDegreeNodes(nodes, edges, false)
    if (oddNodes.length >= 1) return oddNodes[0]
  }
  return nodes[0]?.id ?? 0
}

// ── Hierholzer's Algorithm ──────────────────────────────────────────────────

function makeStep(
  action: EulerStep['action'],
  currentNode: number,
  stack: number[],
  circuit: number[],
  visitedEdges: Set<number>,
  currentEdgeId: number,
  description: string,
): EulerStep {
  return {
    action,
    currentNode,
    stack: [...stack],
    circuit: [...circuit],
    visitedEdges: new Set(visitedEdges),
    currentEdgeId,
    description,
  }
}

export function findEulerPath(
  nodes: EPNode[],
  edges: EPEdge[],
  directed: boolean,
): EulerResult {
  const steps: EulerStep[] = []
  const eulerType = determineEulerType(nodes, edges, directed)
  const oddDegreeNodes = getOddDegreeNodes(nodes, edges, directed)
  const degrees = computeDegrees(nodes, edges, directed)

  steps.push(makeStep('init', -1, [], [], new Set(), -1, 'init'))
  steps.push(makeStep('check-degrees', -1, [], [], new Set(), -1, 'check-degrees'))

  if (eulerType === 'none') {
    steps.push(makeStep('no-euler', -1, [], [], new Set(), -1, 'no-euler'))
    return { steps, eulerType, circuit: [], oddDegreeNodes, degrees }
  }

  // Build adjacency list with edge IDs
  const adj = new Map<number, { to: number; edgeId: number }[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.from)!.push({ to: e.to, edgeId: e.id })
    if (!directed) {
      adj.get(e.to)!.push({ to: e.from, edgeId: e.id })
    }
  }

  // Track used edges — for undirected, an edge ID can be used once from either direction
  const edgeUsed = new Set<number>()
  // Track which index we're at for each node's adjacency list
  const adjIdx = new Map<number, number>()
  for (const n of nodes) adjIdx.set(n.id, 0)

  const startNode = findStartNode(nodes, edges, directed, eulerType)
  const stack: number[] = [startNode]
  const circuit: number[] = []

  steps.push(makeStep('start-traverse', startNode, stack, circuit, edgeUsed, -1, 'start'))

  while (stack.length > 0) {
    const v = stack[stack.length - 1]
    const neighbors = adj.get(v) ?? []
    let idx = adjIdx.get(v) ?? 0

    // Find the next unused edge
    let found = false
    while (idx < neighbors.length) {
      const { to, edgeId } = neighbors[idx]
      if (!edgeUsed.has(edgeId)) {
        edgeUsed.add(edgeId)
        adjIdx.set(v, idx + 1)
        stack.push(to)

        steps.push(makeStep('traverse-edge', to, stack, circuit, edgeUsed, edgeId, `${v}->${to}`))
        found = true
        break
      }
      idx++
      adjIdx.set(v, idx)
    }

    if (!found) {
      // No more edges from v — add to circuit
      stack.pop()
      circuit.push(v)

      if (stack.length > 0) {
        steps.push(makeStep('stuck', v, stack, circuit, edgeUsed, -1, `stuck at ${v}`))
        steps.push(makeStep('pop-circuit', v, stack, circuit, edgeUsed, -1, `pop ${v} to circuit`))
      } else {
        steps.push(makeStep('pop-circuit', v, stack, circuit, edgeUsed, -1, `pop ${v} to circuit`))
      }
    }
  }

  // Reverse circuit for correct order
  circuit.reverse()
  steps.push(makeStep('done', circuit[0] ?? -1, [], circuit, edgeUsed, -1, 'done'))

  return { steps, eulerType, circuit, oddDegreeNodes, degrees }
}

// ── Graph generators ────────────────────────────────────────────────────────

export function generateEulerGraph(
  nodeCount: number = 6,
  directed: boolean = false,
  type: 'circuit' | 'path' = 'circuit',
): { nodes: EPNode[]; edges: EPEdge[] } {
  const nodes: EPNode[] = []
  const padding = 60
  const w = 540, h = 380

  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
    const radius = Math.min(w, h) * 0.32
    const jx = (Math.random() - 0.5) * 20
    const jy = (Math.random() - 0.5) * 20
    nodes.push({
      id: i,
      x: w / 2 + Math.cos(angle) * radius + jx + padding / 2,
      y: h / 2 + Math.sin(angle) * radius + jy + padding / 2,
      label: String.fromCharCode(65 + i),
    })
  }

  const edges: EPEdge[] = []
  let edgeId = 0
  const edgeSet = new Set<string>()

  const addEdge = (from: number, to: number) => {
    const key = directed ? `${from}-${to}` : `${Math.min(from, to)}-${Math.max(from, to)}`
    if (edgeSet.has(key) || from === to) return
    edgeSet.add(key)
    edges.push({ id: edgeId++, from, to })
  }

  if (directed) {
    // Create a directed Euler circuit: cycle through all nodes, then add some extra balanced edges
    for (let i = 0; i < nodeCount; i++) {
      addEdge(i, (i + 1) % nodeCount)
    }
    // Add a few extra balanced edges (both directions)
    for (let k = 0; k < Math.floor(nodeCount / 2); k++) {
      const a = Math.floor(Math.random() * nodeCount)
      const b = (a + 2) % nodeCount
      addEdge(a, b)
      addEdge(b, a)
    }

    if (type === 'path') {
      // Remove one edge to break circuit into path
      if (edges.length > 1) {
        const last = edges.pop()!
        edgeId--
        edgeSet.delete(`${last.from}-${last.to}`)
      }
    }
  } else {
    // Undirected: make all degrees even (circuit) or exactly 2 odd (path)
    // Start with a Hamiltonian cycle
    for (let i = 0; i < nodeCount; i++) {
      addEdge(i, (i + 1) % nodeCount)
    }
    // Add chord edges to make it more interesting (keeping all degrees even)
    const chords = Math.floor(nodeCount / 2)
    for (let k = 0; k < chords; k++) {
      const a = Math.floor(Math.random() * nodeCount)
      const b = (a + 2 + Math.floor(Math.random() * (nodeCount - 3))) % nodeCount
      // To keep all degrees even, add edges in pairs or as a triangle
      const c = (b + 1) % nodeCount
      addEdge(a, b)
      addEdge(b, c)
      addEdge(c, a)
    }

    if (type === 'path') {
      // Make exactly 2 nodes with odd degree: add one more edge between two even-degree nodes
      // Simple approach: add one extra edge to create exactly 2 odd-degree vertices
      const deg = new Map<number, number>()
      for (const n of nodes) deg.set(n.id, 0)
      for (const e of edges) {
        deg.set(e.from, (deg.get(e.from) ?? 0) + 1)
        deg.set(e.to, (deg.get(e.to) ?? 0) + 1)
      }
      // Find two even-degree nodes and add an edge between them
      const evenNodes = nodes.filter(n => ((deg.get(n.id) ?? 0) % 2) === 0)
      if (evenNodes.length >= 2) {
        addEdge(evenNodes[0].id, evenNodes[1].id)
      }
    }
  }

  return { nodes, edges }
}
