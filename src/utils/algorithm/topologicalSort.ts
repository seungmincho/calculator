// Topological Sort (Kahn's BFS-based algorithm)
// Pure functions with step-by-step recording for visualization

export interface DAGNode {
  id: number
  x: number
  y: number
  label: string
}

export interface DAGEdge {
  from: number
  to: number
}

export interface TopSortStep {
  action: 'init' | 'enqueue' | 'dequeue' | 'update' | 'done' | 'cycle'
  nodeId: number
  inDegrees: number[]       // snapshot of in-degree array
  queue: number[]           // current queue snapshot
  result: number[]          // current topological order
  removedEdges: string[]    // "from-to" keys of edges already processed
  description: string
}

export interface TopSortResult {
  steps: TopSortStep[]
  order: number[] | null    // null if cycle detected
  hasCycle: boolean
}

// ---------------------------------------------------------------------------
// Core Kahn's Algorithm
// ---------------------------------------------------------------------------

export function topologicalSort(nodes: DAGNode[], edges: DAGEdge[]): TopSortResult {
  const n = nodes.length
  const adj: number[][] = Array.from({ length: n }, () => [])
  const inDegree: number[] = Array(n).fill(0)
  const steps: TopSortStep[] = []
  const result: number[] = []
  const removedEdges: Set<string> = new Set()

  // Build adjacency list and compute in-degrees
  for (const e of edges) {
    adj[e.from].push(e.to)
    inDegree[e.to]++
  }

  // Init step
  steps.push({
    action: 'init',
    nodeId: -1,
    inDegrees: [...inDegree],
    queue: [],
    result: [],
    removedEdges: [],
    description: 'init',
  })

  // Enqueue all nodes with in-degree 0
  const queue: number[] = []
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) {
      queue.push(i)
      steps.push({
        action: 'enqueue',
        nodeId: i,
        inDegrees: [...inDegree],
        queue: [...queue],
        result: [...result],
        removedEdges: [...removedEdges],
        description: 'enqueue',
      })
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!

    // Dequeue step
    result.push(node)
    steps.push({
      action: 'dequeue',
      nodeId: node,
      inDegrees: [...inDegree],
      queue: [...queue],
      result: [...result],
      removedEdges: [...removedEdges],
      description: 'dequeue',
    })

    // Process all neighbors
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--
      removedEdges.add(`${node}-${neighbor}`)

      steps.push({
        action: 'update',
        nodeId: neighbor,
        inDegrees: [...inDegree],
        queue: [...queue],
        result: [...result],
        removedEdges: [...removedEdges],
        description: 'update',
      })

      if (inDegree[neighbor] === 0) {
        queue.push(neighbor)
        steps.push({
          action: 'enqueue',
          nodeId: neighbor,
          inDegrees: [...inDegree],
          queue: [...queue],
          result: [...result],
          removedEdges: [...removedEdges],
          description: 'enqueue',
        })
      }
    }
  }

  const hasCycle = result.length !== n

  if (hasCycle) {
    steps.push({
      action: 'cycle',
      nodeId: -1,
      inDegrees: [...inDegree],
      queue: [],
      result: [...result],
      removedEdges: [...removedEdges],
      description: 'cycle',
    })
  } else {
    steps.push({
      action: 'done',
      nodeId: -1,
      inDegrees: [...inDegree],
      queue: [],
      result: [...result],
      removedEdges: [...removedEdges],
      description: 'done',
    })
  }

  return { steps, order: hasCycle ? null : result, hasCycle }
}

// ---------------------------------------------------------------------------
// Random DAG generator
// ---------------------------------------------------------------------------

export function generateRandomDAG(nodeCount: number = 7): { nodes: DAGNode[]; edges: DAGEdge[] } {
  const nodes: DAGNode[] = []
  const width = 540
  const height = 380
  const padding = 60

  // Lay out nodes in layers (left-to-right) to visualize DAG flow
  const layers = Math.max(3, Math.ceil(nodeCount / 2))
  const nodesPerLayer: number[][] = []

  // Distribute nodes across layers
  let remaining = nodeCount
  for (let l = 0; l < layers && remaining > 0; l++) {
    const count = l === layers - 1 ? remaining : Math.max(1, Math.floor(Math.random() * 3) + 1)
    const actualCount = Math.min(count, remaining)
    nodesPerLayer.push([])
    for (let j = 0; j < actualCount; j++) {
      nodesPerLayer[l].push(nodeCount - remaining)
      remaining--
    }
  }

  // Position nodes
  const actualLayers = nodesPerLayer.length
  for (let l = 0; l < actualLayers; l++) {
    const layerNodes = nodesPerLayer[l]
    const x = padding + (l / (actualLayers - 1 || 1)) * (width - padding * 2)
    for (let j = 0; j < layerNodes.length; j++) {
      const y = padding + ((j + 1) / (layerNodes.length + 1)) * (height - padding * 2)
      nodes.push({
        id: layerNodes[j],
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 15,
        label: String.fromCharCode(65 + layerNodes[j]),
      })
    }
  }

  // Generate edges: only forward edges (from earlier layers to later layers)
  const edges: DAGEdge[] = []
  const edgeSet = new Set<string>()

  for (let l = 0; l < actualLayers - 1; l++) {
    for (const from of nodesPerLayer[l]) {
      // At least one forward edge
      const nextLayer = l + 1 + Math.floor(Math.random() * Math.min(2, actualLayers - l - 1))
      if (nextLayer < actualLayers) {
        const targets = nodesPerLayer[nextLayer]
        const to = targets[Math.floor(Math.random() * targets.length)]
        const key = `${from}-${to}`
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push({ from, to })
        }
      }

      // Extra random forward edge
      if (Math.random() < 0.4) {
        for (let fl = l + 1; fl < actualLayers; fl++) {
          if (Math.random() < 0.5) {
            const to = nodesPerLayer[fl][Math.floor(Math.random() * nodesPerLayer[fl].length)]
            const key = `${from}-${to}`
            if (!edgeSet.has(key)) {
              edgeSet.add(key)
              edges.push({ from, to })
            }
            break
          }
        }
      }
    }
  }

  return { nodes, edges }
}
