// Tarjan's Strongly Connected Components algorithm
// Pure functions with step-by-step recording for visualization

export interface TSNode {
  id: number
  x: number
  y: number
  label: string
}

export interface TSEdge {
  from: number
  to: number
}

export interface TarjanStep {
  action: 'init' | 'visit' | 'explore-edge' | 'update-lowlink' | 'back-edge' | 'cross-edge' | 'scc-root' | 'pop-scc' | 'done'
  nodeId: number
  targetId: number          // for edge steps
  disc: number[]            // discovery time snapshot
  low: number[]             // low-link snapshot
  onStack: boolean[]        // on-stack snapshot
  stack: number[]           // stack snapshot
  sccGroups: number[][]     // SCCs found so far
  sccIndex: number[]        // scc assignment per node (-1 = unassigned)
  currentScc: number[]      // nodes being popped in current SCC extraction
  description: string
}

export interface TarjanResult {
  steps: TarjanStep[]
  sccGroups: number[][]     // list of SCCs
  sccIndex: number[]        // scc assignment per node
}

export function tarjanScc(nodes: TSNode[], edges: TSEdge[]): TarjanResult {
  const n = nodes.length
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (const e of edges) {
    adj[e.from].push(e.to)
  }

  const disc: number[] = Array(n).fill(-1)
  const low: number[] = Array(n).fill(-1)
  const onStack: boolean[] = Array(n).fill(false)
  const stack: number[] = []
  const sccGroups: number[][] = []
  const sccIndex: number[] = Array(n).fill(-1)
  let timer = 0

  const steps: TarjanStep[] = []

  const snap = (action: TarjanStep['action'], nodeId: number, targetId: number, currentScc: number[] = [], desc: string): void => {
    steps.push({
      action,
      nodeId,
      targetId,
      disc: [...disc],
      low: [...low],
      onStack: [...onStack],
      stack: [...stack],
      sccGroups: sccGroups.map(g => [...g]),
      sccIndex: [...sccIndex],
      currentScc: [...currentScc],
      description: desc,
    })
  }

  // Init
  snap('init', -1, -1, [], 'init')

  function dfs(u: number) {
    disc[u] = low[u] = timer++
    stack.push(u)
    onStack[u] = true

    snap('visit', u, -1, [], 'visit')

    for (const v of adj[u]) {
      if (disc[v] === -1) {
        // Tree edge
        snap('explore-edge', u, v, [], 'explore-edge')
        dfs(v)
        // After returning, update low-link
        low[u] = Math.min(low[u], low[v])
        snap('update-lowlink', u, v, [], 'update-lowlink')
      } else if (onStack[v]) {
        // Back edge to ancestor in stack
        low[u] = Math.min(low[u], disc[v])
        snap('back-edge', u, v, [], 'back-edge')
      } else {
        // Cross edge to already processed node
        snap('cross-edge', u, v, [], 'cross-edge')
      }
    }

    // If u is root of SCC
    if (low[u] === disc[u]) {
      snap('scc-root', u, -1, [], 'scc-root')

      const scc: number[] = []
      let w = -1
      while (w !== u) {
        w = stack.pop()!
        onStack[w] = false
        scc.push(w)
        sccIndex[w] = sccGroups.length
      }
      sccGroups.push(scc)

      snap('pop-scc', u, -1, scc, 'pop-scc')
    }
  }

  // Run DFS for all unvisited nodes
  for (let i = 0; i < n; i++) {
    if (disc[i] === -1) {
      dfs(i)
    }
  }

  snap('done', -1, -1, [], 'done')

  return { steps, sccGroups, sccIndex }
}

// ---------------------------------------------------------------------------
// SCC color palette (for up to ~12 distinct SCCs)
// ---------------------------------------------------------------------------

export const SCC_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
]

export const SCC_COLORS_DARK = [
  '#60a5fa', // blue
  '#f87171', // red
  '#34d399', // emerald
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#818cf8', // indigo
  '#a3e635', // lime
  '#fb7185', // rose
]

// ---------------------------------------------------------------------------
// Random directed graph generator (with guaranteed SCCs)
// ---------------------------------------------------------------------------

export function generateRandomGraph(nodeCount: number = 8): { nodes: TSNode[]; edges: TSEdge[] } {
  const nodes: TSNode[] = []
  const padding = 60
  const width = 540
  const height = 380

  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
    const radius = Math.min(width, height) * 0.32
    const jitterX = (Math.random() - 0.5) * 25
    const jitterY = (Math.random() - 0.5) * 25
    nodes.push({
      id: i,
      x: width / 2 + Math.cos(angle) * radius + jitterX + padding / 2,
      y: height / 2 + Math.sin(angle) * radius + jitterY + padding / 2,
      label: String.fromCharCode(65 + i),
    })
  }

  const edges: TSEdge[] = []
  const edgeSet = new Set<string>()

  const addEdge = (from: number, to: number) => {
    const key = `${from}-${to}`
    if (edgeSet.has(key) || from === to) return
    edgeSet.add(key)
    edges.push({ from, to })
  }

  // Create 2-3 cycles to guarantee SCCs
  const groups: number[][] = []
  const groupSize = Math.max(2, Math.floor(nodeCount / 3))
  const ids = Array.from({ length: nodeCount }, (_, i) => i)
  // Shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }

  let idx = 0
  while (idx < nodeCount) {
    const end = Math.min(idx + groupSize, nodeCount)
    groups.push(ids.slice(idx, end))
    idx = end
  }

  // Create cycles within groups (SCCs)
  for (const group of groups) {
    if (group.length >= 2) {
      for (let i = 0; i < group.length; i++) {
        addEdge(group[i], group[(i + 1) % group.length])
      }
    }
  }

  // Add some cross-group edges (not forming cycles between groups)
  for (let i = 0; i < groups.length - 1; i++) {
    const from = groups[i][Math.floor(Math.random() * groups[i].length)]
    const to = groups[i + 1][Math.floor(Math.random() * groups[i + 1].length)]
    addEdge(from, to)
  }

  // Add random extra edges
  const extraCount = Math.floor(nodeCount * 0.3)
  for (let k = 0; k < extraCount; k++) {
    const a = Math.floor(Math.random() * nodeCount)
    const b = Math.floor(Math.random() * nodeCount)
    addEdge(a, b)
  }

  return { nodes, edges }
}
