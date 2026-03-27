// ── Types ─────────────────────────────────────────────────────────────────────

export type FibMode = 'naive' | 'memoization' | 'tabulation'

export interface FibTreeNode {
  id: number
  n: number
  value: number | null
  left: number | null   // fib(n-1)
  right: number | null  // fib(n-2)
  depth: number
  pruned: boolean       // true if memoized hit
}

export interface FibStep {
  action: 'call' | 'return' | 'memo-hit' | 'fill-cell' | 'use-prev' | 'base-case'
  nodeId: number        // tree node id or table cell index
  n: number
  value: number | null
  depth: number
  description: string
}

export interface FibResult {
  steps: FibStep[]
  treeNodes: Map<number, FibTreeNode>
  dpTable: number[]
  finalValue: number
  callCount: number
}

// ── Naive recursion ──────────────────────────────────────────────────────────

function generateNaive(targetN: number): FibResult {
  const steps: FibStep[] = []
  const treeNodes = new Map<number, FibTreeNode>()
  let nextId = 0
  let callCount = 0

  function recurse(n: number, depth: number): { id: number; value: number } {
    const id = nextId++
    callCount++

    treeNodes.set(id, { id, n, value: null, left: null, right: null, depth, pruned: false })

    steps.push({ action: 'call', nodeId: id, n, value: null, depth, description: `fib(${n})` })

    if (n <= 1) {
      treeNodes.get(id)!.value = n
      steps.push({ action: 'base-case', nodeId: id, n, value: n, depth, description: `fib(${n}) = ${n}` })
      return { id, value: n }
    }

    const left = recurse(n - 1, depth + 1)
    treeNodes.get(id)!.left = left.id

    const right = recurse(n - 2, depth + 1)
    treeNodes.get(id)!.right = right.id

    const value = left.value + right.value
    treeNodes.get(id)!.value = value

    steps.push({ action: 'return', nodeId: id, n, value, depth, description: `fib(${n}) = fib(${n - 1}) + fib(${n - 2}) = ${left.value} + ${right.value} = ${value}` })

    return { id, value }
  }

  const result = recurse(targetN, 0)
  return { steps, treeNodes, dpTable: [], finalValue: result.value, callCount }
}

// ── Memoization (top-down) ───────────────────────────────────────────────────

function generateMemoization(targetN: number): FibResult {
  const steps: FibStep[] = []
  const treeNodes = new Map<number, FibTreeNode>()
  const memo = new Map<number, number>()
  let nextId = 0
  let callCount = 0

  function recurse(n: number, depth: number): { id: number; value: number } {
    const id = nextId++
    callCount++

    treeNodes.set(id, { id, n, value: null, left: null, right: null, depth, pruned: false })

    steps.push({ action: 'call', nodeId: id, n, value: null, depth, description: `fib(${n})` })

    if (memo.has(n)) {
      const cached = memo.get(n)!
      treeNodes.get(id)!.value = cached
      treeNodes.get(id)!.pruned = true
      steps.push({ action: 'memo-hit', nodeId: id, n, value: cached, depth, description: `memo[${n}] = ${cached}` })
      return { id, value: cached }
    }

    if (n <= 1) {
      memo.set(n, n)
      treeNodes.get(id)!.value = n
      steps.push({ action: 'base-case', nodeId: id, n, value: n, depth, description: `fib(${n}) = ${n}` })
      return { id, value: n }
    }

    const left = recurse(n - 1, depth + 1)
    treeNodes.get(id)!.left = left.id

    const right = recurse(n - 2, depth + 1)
    treeNodes.get(id)!.right = right.id

    const value = left.value + right.value
    memo.set(n, value)
    treeNodes.get(id)!.value = value

    steps.push({ action: 'return', nodeId: id, n, value, depth, description: `fib(${n}) = ${left.value} + ${right.value} = ${value}` })

    return { id, value }
  }

  const result = recurse(targetN, 0)
  return { steps, treeNodes, dpTable: [], finalValue: result.value, callCount }
}

// ── Tabulation (bottom-up) ───────────────────────────────────────────────────

function generateTabulation(targetN: number): FibResult {
  const steps: FibStep[] = []
  const dpTable: number[] = new Array(targetN + 1).fill(0)

  // base cases
  dpTable[0] = 0
  steps.push({ action: 'base-case', nodeId: 0, n: 0, value: 0, depth: 0, description: 'dp[0] = 0' })

  if (targetN >= 1) {
    dpTable[1] = 1
    steps.push({ action: 'base-case', nodeId: 1, n: 1, value: 1, depth: 0, description: 'dp[1] = 1' })
  }

  for (let i = 2; i <= targetN; i++) {
    steps.push({ action: 'use-prev', nodeId: i, n: i, value: null, depth: 0, description: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}]` })

    dpTable[i] = dpTable[i - 1] + dpTable[i - 2]

    steps.push({ action: 'fill-cell', nodeId: i, n: i, value: dpTable[i], depth: 0, description: `dp[${i}] = ${dpTable[i - 1]} + ${dpTable[i - 2]} = ${dpTable[i]}` })
  }

  return { steps, treeNodes: new Map(), dpTable: [...dpTable], finalValue: dpTable[targetN] ?? 0, callCount: targetN + 1 }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function generateFibonacci(n: number, mode: FibMode): FibResult {
  const clampedN = Math.max(0, Math.min(n, 15))
  switch (mode) {
    case 'naive': return generateNaive(clampedN)
    case 'memoization': return generateMemoization(clampedN)
    case 'tabulation': return generateTabulation(clampedN)
  }
}
