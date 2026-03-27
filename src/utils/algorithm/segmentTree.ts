// ── Segment Tree Algorithm ───────────────────────────────────────────────────
// Range queries (sum/min/max) and point updates in O(log n)

export type QueryType = 'sum' | 'min' | 'max'

export interface SegmentTreeStep {
  action: 'build' | 'visit' | 'merge' | 'query-visit' | 'query-match' | 'query-skip'
    | 'update-visit' | 'update-leaf' | 'update-merge' | 'done'
  nodeIndex: number        // index in tree array (1-based)
  rangeL: number           // node's range left
  rangeR: number           // node's range right
  value: number            // node's current value
  description: string
  queryL?: number          // query range left
  queryR?: number          // query range right
  treeSnapshot: number[]   // full tree state after this step
}

export interface SegmentTreeResult {
  steps: SegmentTreeStep[]
  tree: number[]
  answer?: number
}

// ── Build ────────────────────────────────────────────────────────────────────

function mergeValues(a: number, b: number, type: QueryType): number {
  if (type === 'sum') return a + b
  if (type === 'min') return Math.min(a, b)
  return Math.max(a, b)
}

function identityValue(type: QueryType): number {
  if (type === 'sum') return 0
  if (type === 'min') return Infinity
  return -Infinity
}

export function buildSegmentTree(arr: number[], type: QueryType): SegmentTreeResult {
  const n = arr.length
  if (n === 0) return { steps: [], tree: [] }

  const size = 4 * n
  const tree = new Array(size).fill(0)
  const steps: SegmentTreeStep[] = []

  function build(node: number, start: number, end: number): void {
    if (start === end) {
      tree[node] = arr[start]
      steps.push({
        action: 'build', nodeIndex: node, rangeL: start, rangeR: end,
        value: tree[node], description: `Leaf node[${node}] = arr[${start}] = ${arr[start]}`,
        treeSnapshot: [...tree],
      })
      return
    }
    const mid = Math.floor((start + end) / 2)
    build(2 * node, start, mid)
    build(2 * node + 1, mid + 1, end)

    tree[node] = mergeValues(tree[2 * node], tree[2 * node + 1], type)
    steps.push({
      action: 'merge', nodeIndex: node, rangeL: start, rangeR: end,
      value: tree[node],
      description: `Merge node[${node}] = ${type}(${tree[2 * node]}, ${tree[2 * node + 1]}) = ${tree[node]}`,
      treeSnapshot: [...tree],
    })
  }

  build(1, 0, n - 1)
  return { steps, tree }
}

// ── Query ────────────────────────────────────────────────────────────────────

export function querySegmentTree(
  tree: number[], n: number, qL: number, qR: number, type: QueryType
): SegmentTreeResult {
  const steps: SegmentTreeStep[] = []
  let answer = identityValue(type)

  function query(node: number, start: number, end: number, l: number, r: number): number {
    if (r < start || end < l) {
      steps.push({
        action: 'query-skip', nodeIndex: node, rangeL: start, rangeR: end,
        value: tree[node], description: `Skip node[${node}] [${start},${end}] — outside [${l},${r}]`,
        queryL: l, queryR: r, treeSnapshot: [...tree],
      })
      return identityValue(type)
    }
    if (l <= start && end <= r) {
      steps.push({
        action: 'query-match', nodeIndex: node, rangeL: start, rangeR: end,
        value: tree[node], description: `Match node[${node}] [${start},${end}] ⊆ [${l},${r}] → ${tree[node]}`,
        queryL: l, queryR: r, treeSnapshot: [...tree],
      })
      return tree[node]
    }

    steps.push({
      action: 'query-visit', nodeIndex: node, rangeL: start, rangeR: end,
      value: tree[node], description: `Visit node[${node}] [${start},${end}] — partial overlap with [${l},${r}]`,
      queryL: l, queryR: r, treeSnapshot: [...tree],
    })

    const mid = Math.floor((start + end) / 2)
    const leftVal = query(2 * node, start, mid, l, r)
    const rightVal = query(2 * node + 1, mid + 1, end, l, r)
    return mergeValues(leftVal, rightVal, type)
  }

  answer = query(1, 0, n - 1, qL, qR)
  steps.push({
    action: 'done', nodeIndex: 1, rangeL: 0, rangeR: n - 1,
    value: answer, description: `Result: ${type}([${qL},${qR}]) = ${answer}`,
    queryL: qL, queryR: qR, treeSnapshot: [...tree],
  })

  return { steps, tree, answer }
}

// ── Point Update ─────────────────────────────────────────────────────────────

export function updateSegmentTree(
  treeArr: number[], n: number, idx: number, newVal: number, type: QueryType
): SegmentTreeResult {
  const tree = [...treeArr]
  const steps: SegmentTreeStep[] = []

  function update(node: number, start: number, end: number, i: number, val: number): void {
    steps.push({
      action: 'update-visit', nodeIndex: node, rangeL: start, rangeR: end,
      value: tree[node], description: `Visit node[${node}] [${start},${end}] for update at index ${i}`,
      treeSnapshot: [...tree],
    })

    if (start === end) {
      tree[node] = val
      steps.push({
        action: 'update-leaf', nodeIndex: node, rangeL: start, rangeR: end,
        value: val, description: `Update leaf node[${node}]: arr[${start}] = ${val}`,
        treeSnapshot: [...tree],
      })
      return
    }

    const mid = Math.floor((start + end) / 2)
    if (i <= mid) {
      update(2 * node, start, mid, i, val)
    } else {
      update(2 * node + 1, mid + 1, end, i, val)
    }

    tree[node] = mergeValues(tree[2 * node], tree[2 * node + 1], type)
    steps.push({
      action: 'update-merge', nodeIndex: node, rangeL: start, rangeR: end,
      value: tree[node],
      description: `Update node[${node}] = ${type}(${tree[2 * node]}, ${tree[2 * node + 1]}) = ${tree[node]}`,
      treeSnapshot: [...tree],
    })
  }

  update(1, 0, n - 1, idx, newVal)
  return { steps, tree }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function generateRandomArray(size: number, min = 1, max = 50): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export function getTreeDepth(n: number): number {
  if (n <= 0) return 0
  return Math.ceil(Math.log2(n)) + 1
}

/** Get info about each tree node for rendering */
export interface TreeNodeInfo {
  index: number     // 1-based index in tree array
  rangeL: number
  rangeR: number
  value: number
  depth: number
  leftChild: number | null
  rightChild: number | null
}

export function getTreeNodes(tree: number[], n: number): TreeNodeInfo[] {
  if (n === 0 || tree.length === 0) return []
  const nodes: TreeNodeInfo[] = []

  function traverse(node: number, start: number, end: number, depth: number): void {
    if (node >= tree.length || tree[node] === undefined) return
    const leftIdx = 2 * node
    const rightIdx = 2 * node + 1
    const hasLeft = start < end && leftIdx < tree.length
    const hasRight = start < end && rightIdx < tree.length

    nodes.push({
      index: node, rangeL: start, rangeR: end, value: tree[node], depth,
      leftChild: hasLeft ? leftIdx : null,
      rightChild: hasRight ? rightIdx : null,
    })

    if (start < end) {
      const mid = Math.floor((start + end) / 2)
      traverse(leftIdx, start, mid, depth + 1)
      traverse(rightIdx, mid + 1, end, depth + 1)
    }
  }

  traverse(1, 0, n - 1, 0)
  return nodes
}
