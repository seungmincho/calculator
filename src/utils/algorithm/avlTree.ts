// ── AVL Tree Algorithm ───────────────────────────────────────────────────────
// Self-balancing BST with LL/RR/LR/RL rotations

export interface AVLNode {
  id: number
  value: number
  left: number | null
  right: number | null
  height: number
  balanceFactor: number
  depth: number
}

export type RotationType = 'LL' | 'RR' | 'LR' | 'RL' | null

export interface AVLStep {
  action: 'compare' | 'go-left' | 'go-right' | 'insert' | 'found' | 'not-found'
    | 'check-balance' | 'rotate' | 'update-height' | 'delete-leaf' | 'delete-one-child'
    | 'delete-two-children' | 'successor'
  nodeId: number
  value: number
  depth: number
  comparisons: number
  rotation?: RotationType
  balanceFactor?: number
  oldHeight?: number
  newHeight?: number
}

export interface AVLResult {
  nodes: Map<number, AVLNode>
  steps: AVLStep[]
  root: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cloneNodes(nodes: Map<number, AVLNode>): Map<number, AVLNode> {
  const copy = new Map<number, AVLNode>()
  for (const [id, node] of nodes) copy.set(id, { ...node })
  return copy
}

function nodeHeight(nodes: Map<number, AVLNode>, id: number | null): number {
  if (id === null) return 0
  return nodes.get(id)?.height ?? 0
}

function updateNodeHeight(nodes: Map<number, AVLNode>, id: number): void {
  const node = nodes.get(id)
  if (!node) return
  node.height = 1 + Math.max(nodeHeight(nodes, node.left), nodeHeight(nodes, node.right))
  node.balanceFactor = nodeHeight(nodes, node.left) - nodeHeight(nodes, node.right)
}

function updateDepths(nodes: Map<number, AVLNode>, id: number | null, depth: number): void {
  if (id === null) return
  const node = nodes.get(id)
  if (!node) return
  node.depth = depth
  updateDepths(nodes, node.left, depth + 1)
  updateDepths(nodes, node.right, depth + 1)
}

// ── Rotations ────────────────────────────────────────────────────────────────

function rotateRight(nodes: Map<number, AVLNode>, yId: number): number {
  const y = nodes.get(yId)!
  const xId = y.left!
  const x = nodes.get(xId)!
  const t2 = x.right

  x.right = yId
  y.left = t2

  updateNodeHeight(nodes, yId)
  updateNodeHeight(nodes, xId)

  return xId
}

function rotateLeft(nodes: Map<number, AVLNode>, xId: number): number {
  const x = nodes.get(xId)!
  const yId = x.right!
  const y = nodes.get(yId)!
  const t2 = y.left

  y.left = xId
  x.right = t2

  updateNodeHeight(nodes, xId)
  updateNodeHeight(nodes, yId)

  return yId
}

// ── Insert ───────────────────────────────────────────────────────────────────

interface MutableAVL {
  nodes: Map<number, AVLNode>
  steps: AVLStep[]
  counter: number
  comparisons: number
}

function insertNode(state: MutableAVL, currentId: number | null, value: number, depth: number): number {
  if (currentId === null) {
    const newId = state.counter++
    const newNode: AVLNode = {
      id: newId, value, left: null, right: null,
      height: 1, balanceFactor: 0, depth,
    }
    state.nodes.set(newId, newNode)
    state.steps.push({ action: 'insert', nodeId: newId, value, depth, comparisons: state.comparisons })
    return newId
  }

  const node = state.nodes.get(currentId)!
  state.comparisons++
  state.steps.push({ action: 'compare', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })

  if (value < node.value) {
    state.steps.push({ action: 'go-left', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
    node.left = insertNode(state, node.left, value, depth + 1)
  } else if (value > node.value) {
    state.steps.push({ action: 'go-right', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
    node.right = insertNode(state, node.right, value, depth + 1)
  } else {
    return currentId // duplicate
  }

  // Update height
  const oldH = node.height
  updateNodeHeight(state.nodes, currentId)
  state.steps.push({
    action: 'update-height', nodeId: currentId, value, depth: node.depth,
    comparisons: state.comparisons, oldHeight: oldH, newHeight: node.height,
  })

  // Check balance
  const bf = node.balanceFactor
  state.steps.push({
    action: 'check-balance', nodeId: currentId, value, depth: node.depth,
    comparisons: state.comparisons, balanceFactor: bf,
  })

  // LL
  if (bf > 1 && value < (state.nodes.get(node.left!)?.value ?? 0)) {
    state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'LL' })
    const newRoot = rotateRight(state.nodes, currentId)
    updateDepths(state.nodes, newRoot, depth)
    return newRoot
  }
  // RR
  if (bf < -1 && value > (state.nodes.get(node.right!)?.value ?? 0)) {
    state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'RR' })
    const newRoot = rotateLeft(state.nodes, currentId)
    updateDepths(state.nodes, newRoot, depth)
    return newRoot
  }
  // LR
  if (bf > 1 && value > (state.nodes.get(node.left!)?.value ?? 0)) {
    state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'LR' })
    node.left = rotateLeft(state.nodes, node.left!)
    const newRoot = rotateRight(state.nodes, currentId)
    updateDepths(state.nodes, newRoot, depth)
    return newRoot
  }
  // RL
  if (bf < -1 && value < (state.nodes.get(node.right!)?.value ?? 0)) {
    state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'RL' })
    node.right = rotateRight(state.nodes, node.right!)
    const newRoot = rotateLeft(state.nodes, currentId)
    updateDepths(state.nodes, newRoot, depth)
    return newRoot
  }

  return currentId
}

export function insertAVL(nodes: Map<number, AVLNode>, root: number | null, value: number): AVLResult {
  const state: MutableAVL = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: 0,
    comparisons: 0,
  }

  let maxId = -1
  for (const id of state.nodes.keys()) if (id > maxId) maxId = id
  state.counter = maxId + 1

  const newRoot = insertNode(state, root, value, 0)
  updateDepths(state.nodes, newRoot, 0)
  return { nodes: state.nodes, steps: state.steps, root: newRoot }
}

// ── Delete ───────────────────────────────────────────────────────────────────

function findMinId(nodes: Map<number, AVLNode>, id: number): number {
  let cur = id
  while (true) {
    const node = nodes.get(cur)
    if (!node || node.left === null) return cur
    cur = node.left
  }
}

function deleteNode(state: MutableAVL, currentId: number | null, value: number, depth: number): number | null {
  if (currentId === null) {
    state.steps.push({ action: 'not-found', nodeId: -1, value, depth: -1, comparisons: state.comparisons })
    return null
  }

  const node = state.nodes.get(currentId)!
  state.comparisons++
  state.steps.push({ action: 'compare', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })

  if (value < node.value) {
    state.steps.push({ action: 'go-left', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
    node.left = deleteNode(state, node.left, value, depth + 1)
  } else if (value > node.value) {
    state.steps.push({ action: 'go-right', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
    node.right = deleteNode(state, node.right, value, depth + 1)
  } else {
    // Found
    if (node.left === null && node.right === null) {
      state.steps.push({ action: 'delete-leaf', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
      state.nodes.delete(currentId)
      return null
    } else if (node.left === null || node.right === null) {
      state.steps.push({ action: 'delete-one-child', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
      const childId = node.left ?? node.right!
      state.nodes.delete(currentId)
      return childId
    } else {
      state.steps.push({ action: 'delete-two-children', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
      const succId = findMinId(state.nodes, node.right)
      const succ = state.nodes.get(succId)!
      state.steps.push({ action: 'successor', nodeId: succId, value: succ.value, depth: succ.depth, comparisons: state.comparisons })
      node.value = succ.value
      node.right = deleteNode(state, node.right, succ.value, depth + 1)
    }
  }

  // Update height & check balance
  updateNodeHeight(state.nodes, currentId)
  const bf = node.balanceFactor

  state.steps.push({
    action: 'check-balance', nodeId: currentId, value, depth: node.depth,
    comparisons: state.comparisons, balanceFactor: bf,
  })

  if (bf > 1) {
    const leftBf = state.nodes.get(node.left!)?.balanceFactor ?? 0
    if (leftBf >= 0) {
      state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'LL' })
      return rotateRight(state.nodes, currentId)
    } else {
      state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'LR' })
      node.left = rotateLeft(state.nodes, node.left!)
      return rotateRight(state.nodes, currentId)
    }
  }

  if (bf < -1) {
    const rightBf = state.nodes.get(node.right!)?.balanceFactor ?? 0
    if (rightBf <= 0) {
      state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'RR' })
      return rotateLeft(state.nodes, currentId)
    } else {
      state.steps.push({ action: 'rotate', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons, rotation: 'RL' })
      node.right = rotateRight(state.nodes, node.right!)
      return rotateLeft(state.nodes, currentId)
    }
  }

  return currentId
}

export function deleteAVL(nodes: Map<number, AVLNode>, root: number | null, value: number): AVLResult {
  const state: MutableAVL = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: 0,
    comparisons: 0,
  }
  const newRoot = deleteNode(state, root, value, 0)
  if (newRoot !== null) updateDepths(state.nodes, newRoot, 0)
  return { nodes: state.nodes, steps: state.steps, root: newRoot }
}

// ── Build ────────────────────────────────────────────────────────────────────

export function buildAVL(values: number[]): AVLResult {
  let nodes = new Map<number, AVLNode>()
  let root: number | null = null
  const allSteps: AVLStep[] = []

  for (const v of values) {
    const res = insertAVL(nodes, root, v)
    nodes = res.nodes
    root = res.root
    allSteps.push(...res.steps)
  }

  return { nodes, steps: allSteps, root }
}

export function generateRandomValues(count: number, min = 1, max = 99): number[] {
  const set = new Set<number>()
  let attempts = 0
  while (set.size < count && attempts < count * 10) {
    set.add(Math.floor(Math.random() * (max - min + 1)) + min)
    attempts++
  }
  return Array.from(set)
}

export function getTreeHeight(nodes: Map<number, AVLNode>, root: number | null): number {
  return nodeHeight(nodes, root)
}

export function getNodeCount(nodes: Map<number, AVLNode>): number {
  return nodes.size
}

export function getRotationCount(steps: AVLStep[]): number {
  return steps.filter(s => s.action === 'rotate').length
}
