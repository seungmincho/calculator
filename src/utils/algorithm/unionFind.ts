// Union-Find (Disjoint Set Union) data structure visualization
// Pure functions with step-by-step recording

export interface UFNode {
  id: number
  label: string
}

export interface UFStep {
  action: 'init' | 'union' | 'find-start' | 'find-step' | 'find-done' | 'compress' | 'done'
  nodeA: number
  nodeB: number
  parent: number[]          // snapshot of parent array
  rank: number[]            // snapshot of rank array
  highlightNodes: number[]  // nodes being examined
  highlightEdge: [number, number] | null  // edge being processed
  description: string
}

export interface UFResult {
  steps: UFStep[]
  parent: number[]
  rank: number[]
  components: number        // number of distinct sets at end
}

export interface UFOperation {
  type: 'union' | 'find'
  a: number
  b: number   // only used for union
}

// ---------------------------------------------------------------------------
// Core Union-Find with step recording
// ---------------------------------------------------------------------------

export function runUnionFind(nodeCount: number, operations: UFOperation[]): UFResult {
  const parent = Array.from({ length: nodeCount }, (_, i) => i)
  const rank = Array(nodeCount).fill(0)
  const steps: UFStep[] = []

  // Init
  steps.push({
    action: 'init',
    nodeA: -1,
    nodeB: -1,
    parent: [...parent],
    rank: [...rank],
    highlightNodes: [],
    highlightEdge: null,
    description: 'init',
  })

  for (const op of operations) {
    if (op.type === 'union') {
      // Find root of A with path recording
      const pathA: number[] = []
      let rootA = op.a
      while (parent[rootA] !== rootA) {
        pathA.push(rootA)
        rootA = parent[rootA]
      }
      pathA.push(rootA)

      steps.push({
        action: 'find-start',
        nodeA: op.a,
        nodeB: op.b,
        parent: [...parent],
        rank: [...rank],
        highlightNodes: pathA,
        highlightEdge: null,
        description: 'find-start',
      })

      // Find root of B
      const pathB: number[] = []
      let rootB = op.b
      while (parent[rootB] !== rootB) {
        pathB.push(rootB)
        rootB = parent[rootB]
      }
      pathB.push(rootB)

      steps.push({
        action: 'find-step',
        nodeA: op.a,
        nodeB: op.b,
        parent: [...parent],
        rank: [...rank],
        highlightNodes: [...pathA, ...pathB],
        highlightEdge: null,
        description: 'find-step',
      })

      if (rootA === rootB) {
        // Already same set
        steps.push({
          action: 'find-done',
          nodeA: op.a,
          nodeB: op.b,
          parent: [...parent],
          rank: [...rank],
          highlightNodes: [rootA],
          highlightEdge: [op.a, op.b],
          description: 'same-set',
        })
        continue
      }

      // Union by rank
      if (rank[rootA] < rank[rootB]) {
        parent[rootA] = rootB
      } else if (rank[rootA] > rank[rootB]) {
        parent[rootB] = rootA
      } else {
        parent[rootB] = rootA
        rank[rootA]++
      }

      steps.push({
        action: 'union',
        nodeA: op.a,
        nodeB: op.b,
        parent: [...parent],
        rank: [...rank],
        highlightNodes: [rootA, rootB],
        highlightEdge: [rootA, rootB],
        description: 'union',
      })

      // Path compression for A's path
      for (const node of pathA) {
        if (node !== rootA && node !== rootB) {
          const newRoot = parent[rootA] === rootA ? rootA : rootB
          if (parent[node] !== newRoot) {
            parent[node] = newRoot
            steps.push({
              action: 'compress',
              nodeA: node,
              nodeB: newRoot,
              parent: [...parent],
              rank: [...rank],
              highlightNodes: [node, newRoot],
              highlightEdge: [node, newRoot],
              description: 'compress',
            })
          }
        }
      }

      // Path compression for B's path
      for (const node of pathB) {
        if (node !== rootA && node !== rootB) {
          const newRoot = parent[rootB] === rootB ? rootB : rootA
          if (parent[node] !== newRoot) {
            parent[node] = newRoot
            steps.push({
              action: 'compress',
              nodeA: node,
              nodeB: newRoot,
              parent: [...parent],
              rank: [...rank],
              highlightNodes: [node, newRoot],
              highlightEdge: [node, newRoot],
              description: 'compress',
            })
          }
        }
      }
    } else {
      // Find operation
      const path: number[] = []
      let current = op.a
      while (parent[current] !== current) {
        path.push(current)
        current = parent[current]
      }
      path.push(current) // root

      steps.push({
        action: 'find-start',
        nodeA: op.a,
        nodeB: -1,
        parent: [...parent],
        rank: [...rank],
        highlightNodes: path,
        highlightEdge: null,
        description: 'find-only',
      })

      // Path compression
      const root = current
      for (const node of path) {
        if (node !== root && parent[node] !== root) {
          parent[node] = root
          steps.push({
            action: 'compress',
            nodeA: node,
            nodeB: root,
            parent: [...parent],
            rank: [...rank],
            highlightNodes: [node, root],
            highlightEdge: [node, root],
            description: 'compress',
          })
        }
      }

      steps.push({
        action: 'find-done',
        nodeA: op.a,
        nodeB: root,
        parent: [...parent],
        rank: [...rank],
        highlightNodes: [root],
        highlightEdge: null,
        description: 'find-done',
      })
    }
  }

  // Count components
  const roots = new Set<number>()
  for (let i = 0; i < nodeCount; i++) {
    let r = i
    while (parent[r] !== r) r = parent[r]
    roots.add(r)
  }

  steps.push({
    action: 'done',
    nodeA: -1,
    nodeB: -1,
    parent: [...parent],
    rank: [...rank],
    highlightNodes: [],
    highlightEdge: null,
    description: 'done',
  })

  return { steps, parent: [...parent], rank: [...rank], components: roots.size }
}

// ---------------------------------------------------------------------------
// Generate random operations for demo
// ---------------------------------------------------------------------------

export function generateRandomOperations(nodeCount: number = 8): UFOperation[] {
  const ops: UFOperation[] = []
  // Generate union operations to merge some sets
  const unionCount = Math.floor(nodeCount * 0.7)
  for (let i = 0; i < unionCount; i++) {
    const a = Math.floor(Math.random() * nodeCount)
    let b = Math.floor(Math.random() * nodeCount)
    while (b === a) b = Math.floor(Math.random() * nodeCount)
    ops.push({ type: 'union', a, b })
  }
  // Add a few find operations
  const findCount = Math.max(2, Math.floor(nodeCount * 0.3))
  for (let i = 0; i < findCount; i++) {
    ops.push({ type: 'find', a: Math.floor(Math.random() * nodeCount), b: -1 })
  }
  return ops
}
