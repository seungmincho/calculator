// ── B-Tree Algorithm ────────────────────────────────────────────────────────
// Multi-way self-balancing search tree for database indexing

export interface BTreeNode {
  id: number
  keys: number[]
  children: number[]
  leaf: boolean
  depth: number
}

export type BTreeAction =
  | 'compare' | 'descend'
  | 'insert' | 'split' | 'promote'
  | 'found' | 'not-found' | 'done'
  | 'delete-key' | 'merge' | 'borrow'

export interface BTreeStep {
  action: BTreeAction
  nodeId: number
  value: number
  keyIndex?: number
  depth: number
  comparisons: number
}

export interface BTreeResult {
  nodes: Map<number, BTreeNode>
  steps: BTreeStep[]
  root: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cloneNodes(nodes: Map<number, BTreeNode>): Map<number, BTreeNode> {
  const copy = new Map<number, BTreeNode>()
  for (const [id, node] of nodes) copy.set(id, { ...node, keys: [...node.keys], children: [...node.children] })
  return copy
}

function updateDepths(nodes: Map<number, BTreeNode>, id: number | null, depth: number): void {
  if (id === null) return
  const node = nodes.get(id)
  if (!node) return
  node.depth = depth
  for (const childId of node.children) {
    updateDepths(nodes, childId, depth + 1)
  }
}

// ── Insert ───────────────────────────────────────────────────────────────────

interface MutableBT {
  nodes: Map<number, BTreeNode>
  steps: BTreeStep[]
  counter: number
  comparisons: number
  t: number // minimum degree
}

function splitChild(state: MutableBT, parentId: number, childIndex: number): void {
  const parent = state.nodes.get(parentId)!
  const yId = parent.children[childIndex]
  const y = state.nodes.get(yId)!
  const t = state.t

  // Create new node z for the right half
  const zId = state.counter++
  const z: BTreeNode = {
    id: zId,
    keys: y.keys.splice(t), // right half after median
    children: y.leaf ? [] : y.children.splice(t),
    leaf: y.leaf,
    depth: y.depth,
  }

  // Median key to promote
  const median = y.keys.pop()!

  state.nodes.set(zId, z)

  state.steps.push({ action: 'split', nodeId: yId, value: median, depth: y.depth, comparisons: state.comparisons })

  // Insert median into parent
  parent.keys.splice(childIndex, 0, median)
  parent.children.splice(childIndex + 1, 0, zId)

  state.steps.push({ action: 'promote', nodeId: parentId, value: median, depth: parent.depth, comparisons: state.comparisons })
}

function insertNonFull(state: MutableBT, nodeId: number, value: number): void {
  const node = state.nodes.get(nodeId)!
  const t = state.t
  const maxKeys = 2 * t - 1

  if (node.leaf) {
    // Find position and insert
    let i = node.keys.length - 1
    while (i >= 0 && value < node.keys[i]) {
      state.comparisons++
      state.steps.push({ action: 'compare', nodeId, value, keyIndex: i, depth: node.depth, comparisons: state.comparisons })
      i--
    }
    // Check duplicate
    if (i >= 0 && node.keys[i] === value) {
      state.steps.push({ action: 'done', nodeId, value, depth: node.depth, comparisons: state.comparisons })
      return
    }
    node.keys.splice(i + 1, 0, value)
    state.steps.push({ action: 'insert', nodeId, value, depth: node.depth, comparisons: state.comparisons })
  } else {
    // Find child to descend into
    let i = node.keys.length - 1
    while (i >= 0 && value < node.keys[i]) {
      state.comparisons++
      state.steps.push({ action: 'compare', nodeId, value, keyIndex: i, depth: node.depth, comparisons: state.comparisons })
      i--
    }
    if (i >= 0 && node.keys[i] === value) {
      state.steps.push({ action: 'done', nodeId, value, depth: node.depth, comparisons: state.comparisons })
      return
    }
    i++

    const childId = node.children[i]
    const child = state.nodes.get(childId)!
    state.steps.push({ action: 'descend', nodeId: childId, value, depth: child.depth, comparisons: state.comparisons })

    if (child.keys.length === maxKeys) {
      splitChild(state, nodeId, i)
      // After split, check which child to descend to
      if (value > node.keys[i]) {
        i++
      } else if (value === node.keys[i]) {
        state.steps.push({ action: 'done', nodeId, value, depth: node.depth, comparisons: state.comparisons })
        return
      }
    }

    insertNonFull(state, node.children[i], value)
  }
}

export function insertBTree(nodes: Map<number, BTreeNode>, root: number | null, value: number, t: number): BTreeResult {
  const state: MutableBT = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: 0,
    comparisons: 0,
    t,
  }

  let maxId = -1
  for (const id of state.nodes.keys()) if (id > maxId) maxId = id
  state.counter = maxId + 1

  const maxKeys = 2 * t - 1

  if (root === null) {
    // Empty tree
    const newId = state.counter++
    const newNode: BTreeNode = { id: newId, keys: [value], children: [], leaf: true, depth: 0 }
    state.nodes.set(newId, newNode)
    state.steps.push({ action: 'insert', nodeId: newId, value, depth: 0, comparisons: 0 })
    return { nodes: state.nodes, steps: state.steps, root: newId }
  }

  const rootNode = state.nodes.get(root)!

  if (rootNode.keys.length === maxKeys) {
    // Root is full → create new root and split
    const newRootId = state.counter++
    const newRoot: BTreeNode = { id: newRootId, keys: [], children: [root], leaf: false, depth: 0 }
    state.nodes.set(newRootId, newRoot)

    splitChild(state, newRootId, 0)
    insertNonFull(state, newRootId, value)

    updateDepths(state.nodes, newRootId, 0)
    return { nodes: state.nodes, steps: state.steps, root: newRootId }
  } else {
    insertNonFull(state, root, value)
    updateDepths(state.nodes, root, 0)
    return { nodes: state.nodes, steps: state.steps, root }
  }
}

// ── Search ───────────────────────────────────────────────────────────────────

export function searchBTree(nodes: Map<number, BTreeNode>, root: number | null, value: number): BTreeResult {
  const steps: BTreeStep[] = []
  let comparisons = 0

  let currentId = root
  while (currentId !== null) {
    const node = nodes.get(currentId)
    if (!node) break

    let i = 0
    while (i < node.keys.length && value > node.keys[i]) {
      comparisons++
      steps.push({ action: 'compare', nodeId: currentId, value, keyIndex: i, depth: node.depth, comparisons })
      i++
    }

    if (i < node.keys.length && value === node.keys[i]) {
      comparisons++
      steps.push({ action: 'compare', nodeId: currentId, value, keyIndex: i, depth: node.depth, comparisons })
      steps.push({ action: 'found', nodeId: currentId, value, keyIndex: i, depth: node.depth, comparisons })
      return { nodes, steps, root }
    }

    if (i < node.keys.length) {
      comparisons++
      steps.push({ action: 'compare', nodeId: currentId, value, keyIndex: i, depth: node.depth, comparisons })
    }

    if (node.leaf) {
      steps.push({ action: 'not-found', nodeId: currentId, value, depth: node.depth, comparisons })
      return { nodes, steps, root }
    }

    const childId = node.children[i]
    if (childId === undefined) {
      steps.push({ action: 'not-found', nodeId: currentId, value, depth: node.depth, comparisons })
      return { nodes, steps, root }
    }

    steps.push({ action: 'descend', nodeId: childId, value, depth: node.depth + 1, comparisons })
    currentId = childId
  }

  steps.push({ action: 'not-found', nodeId: -1, value, depth: -1, comparisons })
  return { nodes, steps, root }
}

// ── Delete ───────────────────────────────────────────────────────────────────

function findPredecessor(nodes: Map<number, BTreeNode>, nodeId: number): { nodeId: number; keyIndex: number } {
  let cur = nodeId
  while (true) {
    const node = nodes.get(cur)!
    if (node.leaf) return { nodeId: cur, keyIndex: node.keys.length - 1 }
    cur = node.children[node.children.length - 1]
  }
}

function deleteFromNode(state: MutableBT, nodeId: number, value: number): void {
  const node = state.nodes.get(nodeId)!
  const t = state.t

  let i = 0
  while (i < node.keys.length && value > node.keys[i]) i++

  if (i < node.keys.length && node.keys[i] === value) {
    state.steps.push({ action: 'compare', nodeId, value, keyIndex: i, depth: node.depth, comparisons: ++state.comparisons })

    if (node.leaf) {
      // Case 1: Key in leaf — just remove
      node.keys.splice(i, 1)
      state.steps.push({ action: 'delete-key', nodeId, value, depth: node.depth, comparisons: state.comparisons })
    } else {
      // Case 2/3: Key in internal node
      const leftChildId = node.children[i]
      const rightChildId = node.children[i + 1]
      const leftChild = state.nodes.get(leftChildId)!
      const rightChild = state.nodes.get(rightChildId)!

      if (leftChild.keys.length >= t) {
        // Replace with predecessor
        const pred = findPredecessor(state.nodes, leftChildId)
        const predNode = state.nodes.get(pred.nodeId)!
        const predKey = predNode.keys[pred.keyIndex]
        node.keys[i] = predKey
        deleteFromNode(state, leftChildId, predKey)
      } else if (rightChild.keys.length >= t) {
        // Replace with successor
        let succId = rightChildId
        while (!state.nodes.get(succId)!.leaf) succId = state.nodes.get(succId)!.children[0]
        const succNode = state.nodes.get(succId)!
        const succKey = succNode.keys[0]
        node.keys[i] = succKey
        deleteFromNode(state, rightChildId, succKey)
      } else {
        // Merge
        mergeChildren(state, nodeId, i)
        deleteFromNode(state, leftChildId, value)
      }
    }
  } else {
    // Key not in this node
    if (node.leaf) {
      state.steps.push({ action: 'not-found', nodeId, value, depth: node.depth, comparisons: state.comparisons })
      return
    }

    state.steps.push({ action: 'descend', nodeId: node.children[i], value, depth: node.depth + 1, comparisons: state.comparisons })

    const childId = node.children[i]
    const child = state.nodes.get(childId)!

    if (child.keys.length < t) {
      // Fill child
      fillChild(state, nodeId, i)
    }

    // After fill, child index might have changed
    if (i > node.keys.length) {
      deleteFromNode(state, node.children[i - 1], value)
    } else {
      deleteFromNode(state, node.children[i], value)
    }
  }
}

function mergeChildren(state: MutableBT, parentId: number, keyIndex: number): void {
  const parent = state.nodes.get(parentId)!
  const leftId = parent.children[keyIndex]
  const rightId = parent.children[keyIndex + 1]
  const left = state.nodes.get(leftId)!
  const right = state.nodes.get(rightId)!

  // Move key from parent to left
  left.keys.push(parent.keys[keyIndex])
  // Move all keys from right to left
  left.keys.push(...right.keys)
  left.children.push(...right.children)

  // Update children's parent references not needed (no parent pointers in B-tree)

  parent.keys.splice(keyIndex, 1)
  parent.children.splice(keyIndex + 1, 1)

  state.nodes.delete(rightId)
  state.steps.push({ action: 'merge', nodeId: leftId, value: 0, depth: left.depth, comparisons: state.comparisons })
}

function fillChild(state: MutableBT, parentId: number, childIndex: number): void {
  const parent = state.nodes.get(parentId)!
  const t = state.t

  // Try borrow from left sibling
  if (childIndex > 0) {
    const leftSibId = parent.children[childIndex - 1]
    const leftSib = state.nodes.get(leftSibId)!
    if (leftSib.keys.length >= t) {
      const child = state.nodes.get(parent.children[childIndex])!
      child.keys.unshift(parent.keys[childIndex - 1])
      parent.keys[childIndex - 1] = leftSib.keys.pop()!
      if (!leftSib.leaf) {
        child.children.unshift(leftSib.children.pop()!)
      }
      state.steps.push({ action: 'borrow', nodeId: parent.children[childIndex], value: 0, depth: child.depth, comparisons: state.comparisons })
      return
    }
  }

  // Try borrow from right sibling
  if (childIndex < parent.children.length - 1) {
    const rightSibId = parent.children[childIndex + 1]
    const rightSib = state.nodes.get(rightSibId)!
    if (rightSib.keys.length >= t) {
      const child = state.nodes.get(parent.children[childIndex])!
      child.keys.push(parent.keys[childIndex])
      parent.keys[childIndex] = rightSib.keys.shift()!
      if (!rightSib.leaf) {
        child.children.push(rightSib.children.shift()!)
      }
      state.steps.push({ action: 'borrow', nodeId: parent.children[childIndex], value: 0, depth: child.depth, comparisons: state.comparisons })
      return
    }
  }

  // Merge
  if (childIndex < parent.children.length - 1) {
    mergeChildren(state, parentId, childIndex)
  } else {
    mergeChildren(state, parentId, childIndex - 1)
  }
}

export function deleteBTree(nodes: Map<number, BTreeNode>, root: number | null, value: number, t: number): BTreeResult {
  if (root === null) {
    return { nodes, steps: [{ action: 'not-found', nodeId: -1, value, depth: -1, comparisons: 0 }], root: null }
  }

  const state: MutableBT = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: 0,
    comparisons: 0,
    t,
  }

  let maxId = -1
  for (const id of state.nodes.keys()) if (id > maxId) maxId = id
  state.counter = maxId + 1

  deleteFromNode(state, root, value)

  // Check if root has become empty
  let newRoot: number | null = root
  const rootNode = state.nodes.get(root)
  if (rootNode && rootNode.keys.length === 0 && rootNode.children.length > 0) {
    newRoot = rootNode.children[0]
    state.nodes.delete(root)
  } else if (rootNode && rootNode.keys.length === 0 && rootNode.children.length === 0) {
    state.nodes.delete(root)
    newRoot = null
  }

  if (newRoot !== null) updateDepths(state.nodes, newRoot, 0)
  state.steps.push({ action: 'done', nodeId: -1, value, depth: 0, comparisons: state.comparisons })

  return { nodes: state.nodes, steps: state.steps, root: newRoot }
}

// ── Build ────────────────────────────────────────────────────────────────────

export function buildBTree(values: number[], t: number): BTreeResult {
  let nodes = new Map<number, BTreeNode>()
  let root: number | null = null
  const allSteps: BTreeStep[] = []

  for (const v of values) {
    const res = insertBTree(nodes, root, v, t)
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

export function getTreeHeight(nodes: Map<number, BTreeNode>, root: number | null): number {
  if (root === null) return 0
  const node = nodes.get(root)
  if (!node) return 0
  if (node.leaf) return 1
  return 1 + getTreeHeight(nodes, node.children[0])
}

export function getNodeCount(nodes: Map<number, BTreeNode>): number {
  return nodes.size
}

export function getKeyCount(nodes: Map<number, BTreeNode>): number {
  let count = 0
  for (const node of nodes.values()) count += node.keys.length
  return count
}

export function getSplitCount(steps: BTreeStep[]): number {
  return steps.filter(s => s.action === 'split').length
}
