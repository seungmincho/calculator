// ── Types ─────────────────────────────────────────────────────────────────────

export interface BSTNode {
  id: number
  value: number
  left: number | null   // child node ID
  right: number | null
  depth: number
  x?: number  // layout position (computed by visualizer)
}

export interface BSTStep {
  action: 'compare' | 'insert' | 'found' | 'not-found' | 'go-left' | 'go-right' | 'delete-leaf' | 'delete-one-child' | 'delete-two-children' | 'successor'
  nodeId: number
  value: number
  depth: number
  comparisons: number
}

export interface BSTResult {
  nodes: Map<number, BSTNode>
  steps: BSTStep[]
  root: number | null
}

// ── Internal mutable state ────────────────────────────────────────────────────

interface MutableBST {
  nodes: Map<number, BSTNode>
  steps: BSTStep[]
  counter: { value: number }
  comparisons: { value: number }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function cloneNodes(nodes: Map<number, BSTNode>): Map<number, BSTNode> {
  const copy = new Map<number, BSTNode>()
  for (const [id, node] of nodes) {
    copy.set(id, { ...node })
  }
  return copy
}

function getHeight(nodes: Map<number, BSTNode>, id: number | null): number {
  if (id === null) return 0
  const node = nodes.get(id)
  if (!node) return 0
  return 1 + Math.max(getHeight(nodes, node.left), getHeight(nodes, node.right))
}

/** Find the in-order successor (leftmost node in right subtree). */
function findMinId(nodes: Map<number, BSTNode>, id: number): number {
  let cur = id
  while (true) {
    const node = nodes.get(cur)
    if (!node || node.left === null) return cur
    cur = node.left
  }
}

/** Update depth of all nodes in subtree rooted at id. */
function updateDepths(nodes: Map<number, BSTNode>, id: number | null, depth: number): void {
  if (id === null) return
  const node = nodes.get(id)
  if (!node) return
  node.depth = depth
  updateDepths(nodes, node.left, depth + 1)
  updateDepths(nodes, node.right, depth + 1)
}

// ── Insert ────────────────────────────────────────────────────────────────────

/**
 * Recursively insert a value. Returns the (potentially new) root id.
 * Pure in terms of returned BSTResult, but uses MutableBST internally.
 */
function insertNode(
  state: MutableBST,
  currentId: number | null,
  value: number,
  depth: number,
  parentId: number | null,
  side: 'left' | 'right' | null,
): number {
  if (currentId === null) {
    // Insert new node here
    const newId = state.counter.value++
    const newNode: BSTNode = { id: newId, value, left: null, right: null, depth }
    state.nodes.set(newId, newNode)

    // Link parent
    if (parentId !== null && side !== null) {
      const parent = state.nodes.get(parentId)!
      if (side === 'left') parent.left = newId
      else parent.right = newId
    }

    state.steps.push({
      action: 'insert',
      nodeId: newId,
      value,
      depth,
      comparisons: state.comparisons.value,
    })
    return newId
  }

  const node = state.nodes.get(currentId)!
  state.comparisons.value++

  state.steps.push({
    action: 'compare',
    nodeId: currentId,
    value,
    depth,
    comparisons: state.comparisons.value,
  })

  if (value < node.value) {
    state.steps.push({
      action: 'go-left',
      nodeId: currentId,
      value,
      depth,
      comparisons: state.comparisons.value,
    })
    insertNode(state, node.left, value, depth + 1, currentId, 'left')
  } else if (value > node.value) {
    state.steps.push({
      action: 'go-right',
      nodeId: currentId,
      value,
      depth,
      comparisons: state.comparisons.value,
    })
    insertNode(state, node.right, value, depth + 1, currentId, 'right')
  }
  // If equal, skip (no duplicates)

  return currentId
}

export function insertBST(
  nodes: Map<number, BSTNode>,
  root: number | null,
  value: number,
): BSTResult {
  const state: MutableBST = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: { value: nodes.size },
    comparisons: { value: 0 },
  }

  // Renumber counter to avoid collisions: use max id + 1
  let maxId = -1
  for (const id of state.nodes.keys()) {
    if (id > maxId) maxId = id
  }
  state.counter.value = maxId + 1

  let newRoot = root
  if (root === null) {
    const newId = state.counter.value++
    const newNode: BSTNode = { id: newId, value, left: null, right: null, depth: 0 }
    state.nodes.set(newId, newNode)
    state.steps.push({ action: 'insert', nodeId: newId, value, depth: 0, comparisons: 0 })
    newRoot = newId
  } else {
    insertNode(state, root, value, 0, null, null)
    newRoot = root
  }

  return { nodes: state.nodes, steps: state.steps, root: newRoot }
}

// ── Search ────────────────────────────────────────────────────────────────────

export function searchBST(
  nodes: Map<number, BSTNode>,
  root: number | null,
  value: number,
): { steps: BSTStep[]; found: boolean; foundNodeId: number | null } {
  const steps: BSTStep[] = []
  let comparisons = 0
  let currentId = root
  let foundNodeId: number | null = null

  while (currentId !== null) {
    const node = nodes.get(currentId)
    if (!node) break

    comparisons++
    steps.push({ action: 'compare', nodeId: currentId, value, depth: node.depth, comparisons })

    if (value === node.value) {
      steps.push({ action: 'found', nodeId: currentId, value, depth: node.depth, comparisons })
      foundNodeId = currentId
      return { steps, found: true, foundNodeId }
    } else if (value < node.value) {
      steps.push({ action: 'go-left', nodeId: currentId, value, depth: node.depth, comparisons })
      currentId = node.left
    } else {
      steps.push({ action: 'go-right', nodeId: currentId, value, depth: node.depth, comparisons })
      currentId = node.right
    }
  }

  steps.push({ action: 'not-found', nodeId: -1, value, depth: -1, comparisons })
  return { steps, found: false, foundNodeId: null }
}

// ── Delete ────────────────────────────────────────────────────────────────────

function deleteNode(
  state: MutableBST,
  currentId: number | null,
  value: number,
  parentId: number | null,
  side: 'left' | 'right' | null,
): number | null {
  if (currentId === null) {
    state.steps.push({ action: 'not-found', nodeId: -1, value, depth: -1, comparisons: state.comparisons.value })
    return null
  }

  const node = state.nodes.get(currentId)!
  state.comparisons.value++

  state.steps.push({
    action: 'compare',
    nodeId: currentId,
    value,
    depth: node.depth,
    comparisons: state.comparisons.value,
  })

  if (value < node.value) {
    state.steps.push({ action: 'go-left', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons.value })
    const newLeft = deleteNode(state, node.left, value, currentId, 'left')
    node.left = newLeft
    return currentId
  } else if (value > node.value) {
    state.steps.push({ action: 'go-right', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons.value })
    const newRight = deleteNode(state, node.right, value, currentId, 'right')
    node.right = newRight
    return currentId
  }

  // Found node to delete
  if (node.left === null && node.right === null) {
    // Case 1: leaf
    state.steps.push({ action: 'delete-leaf', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons.value })
    state.nodes.delete(currentId)
    return null
  } else if (node.left === null || node.right === null) {
    // Case 2: one child
    state.steps.push({ action: 'delete-one-child', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons.value })
    const childId = node.left !== null ? node.left : node.right!
    state.nodes.delete(currentId)
    // Update depths for child subtree
    updateDepths(state.nodes, childId, node.depth)
    return childId
  } else {
    // Case 3: two children — find in-order successor
    state.steps.push({ action: 'delete-two-children', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons.value })
    const successorId = findMinId(state.nodes, node.right)
    const successor = state.nodes.get(successorId)!
    state.steps.push({ action: 'successor', nodeId: successorId, value: successor.value, depth: successor.depth, comparisons: state.comparisons.value })

    // Replace node's value with successor's value
    node.value = successor.value
    // Delete successor from right subtree
    const newRight = deleteNode(state, node.right, successor.value, currentId, 'right')
    node.right = newRight
    return currentId
  }
}

export function deleteBST(
  nodes: Map<number, BSTNode>,
  root: number | null,
  value: number,
): BSTResult {
  const state: MutableBST = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: { value: 0 },
    comparisons: { value: 0 },
  }

  const newRoot = deleteNode(state, root, value, null, null)
  return { nodes: state.nodes, steps: state.steps, root: newRoot }
}

// ── Build ─────────────────────────────────────────────────────────────────────

export function buildBST(values: number[]): BSTResult {
  let nodes = new Map<number, BSTNode>()
  let root: number | null = null
  const allSteps: BSTStep[] = []

  for (const v of values) {
    const res = insertBST(nodes, root, v)
    nodes = res.nodes
    root = res.root
    allSteps.push(...res.steps)
  }

  return { nodes, steps: allSteps, root }
}

// ── Value generators ──────────────────────────────────────────────────────────

export function generateRandomValues(count: number, min = 1, max = 99): number[] {
  const set = new Set<number>()
  let attempts = 0
  while (set.size < count && attempts < count * 10) {
    set.add(Math.floor(Math.random() * (max - min + 1)) + min)
    attempts++
  }
  return Array.from(set)
}

export function generateSortedValues(count: number): number[] {
  // Worst case: sorted ascending → degenerate right-skewed tree
  const step = Math.floor(99 / (count + 1))
  return Array.from({ length: count }, (_, i) => (i + 1) * step).filter(v => v >= 1 && v <= 99)
}

export function generateBalancedValues(count: number): number[] {
  // Balanced insertion order: insert middle first, then recurse left/right halves
  const sorted = generateSortedValues(count)
  const result: number[] = []

  function addMiddle(arr: number[]): void {
    if (arr.length === 0) return
    const mid = Math.floor(arr.length / 2)
    result.push(arr[mid])
    addMiddle(arr.slice(0, mid))
    addMiddle(arr.slice(mid + 1))
  }

  addMiddle(sorted)
  return result
}

// ── Stats helpers ─────────────────────────────────────────────────────────────

export function getTreeHeight(nodes: Map<number, BSTNode>, root: number | null): number {
  return getHeight(nodes, root)
}

export function getNodeCount(nodes: Map<number, BSTNode>): number {
  return nodes.size
}
