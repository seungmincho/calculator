// ── Red-Black Tree Algorithm ────────────────────────────────────────────────
// Self-balancing BST with red/black color rules and rotations

export type NodeColor = 'red' | 'black'

export interface RBNode {
  id: number
  value: number
  color: NodeColor
  left: number | null
  right: number | null
  parent: number | null
  depth: number
}

export type RBAction =
  | 'compare' | 'go-left' | 'go-right'
  | 'insert' | 'recolor' | 'rotate-left' | 'rotate-right'
  | 'fixup' | 'done'
  | 'delete-node' | 'not-found'

export interface RBStep {
  action: RBAction
  nodeId: number
  value: number
  depth: number
  comparisons: number
  description?: string
}

export interface RBResult {
  nodes: Map<number, RBNode>
  steps: RBStep[]
  root: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cloneNodes(nodes: Map<number, RBNode>): Map<number, RBNode> {
  const copy = new Map<number, RBNode>()
  for (const [id, node] of nodes) copy.set(id, { ...node })
  return copy
}

function getColor(nodes: Map<number, RBNode>, id: number | null): NodeColor {
  if (id === null) return 'black' // NIL nodes are black
  return nodes.get(id)?.color ?? 'black'
}

function updateDepths(nodes: Map<number, RBNode>, id: number | null, depth: number): void {
  if (id === null) return
  const node = nodes.get(id)
  if (!node) return
  node.depth = depth
  updateDepths(nodes, node.left, depth + 1)
  updateDepths(nodes, node.right, depth + 1)
}

// ── Rotations ────────────────────────────────────────────────────────────────

function rotateLeft(nodes: Map<number, RBNode>, xId: number, root: number | null): number | null {
  const x = nodes.get(xId)!
  const yId = x.right!
  const y = nodes.get(yId)!

  // x's right = y's left
  x.right = y.left
  if (y.left !== null) {
    const yl = nodes.get(y.left)!
    yl.parent = xId
  }

  // y's parent = x's parent
  y.parent = x.parent
  if (x.parent === null) {
    root = yId
  } else {
    const p = nodes.get(x.parent)!
    if (p.left === xId) p.left = yId
    else p.right = yId
  }

  y.left = xId
  x.parent = yId

  return root
}

function rotateRight(nodes: Map<number, RBNode>, yId: number, root: number | null): number | null {
  const y = nodes.get(yId)!
  const xId = y.left!
  const x = nodes.get(xId)!

  y.left = x.right
  if (x.right !== null) {
    const xr = nodes.get(x.right)!
    xr.parent = yId
  }

  x.parent = y.parent
  if (y.parent === null) {
    root = xId
  } else {
    const p = nodes.get(y.parent)!
    if (p.left === yId) p.left = xId
    else p.right = xId
  }

  x.right = yId
  y.parent = xId

  return root
}

// ── Insert ───────────────────────────────────────────────────────────────────

interface MutableRB {
  nodes: Map<number, RBNode>
  steps: RBStep[]
  counter: number
  comparisons: number
  root: number | null
}

function insertFixup(state: MutableRB, zId: number): void {
  let z = state.nodes.get(zId)!

  while (z.parent !== null && getColor(state.nodes, z.parent) === 'red') {
    const parent = state.nodes.get(z.parent)!
    const grandparent = parent.parent !== null ? state.nodes.get(parent.parent)! : null
    if (!grandparent || parent.parent === null) break

    const gpId = parent.parent

    if (parent.id === grandparent.left) {
      // Parent is left child
      const uncleId = grandparent.right
      const uncleColor = getColor(state.nodes, uncleId)

      if (uncleColor === 'red') {
        // Case 1: Uncle is red → recolor
        parent.color = 'black'
        if (uncleId !== null) {
          const uncle = state.nodes.get(uncleId)!
          uncle.color = 'black'
        }
        grandparent.color = 'red'
        state.steps.push({ action: 'recolor', nodeId: gpId, value: z.value, depth: grandparent.depth, comparisons: state.comparisons })
        // Move z up to grandparent
        z = grandparent
      } else {
        // Case 2: z is right child → left rotate parent
        if (z.id === parent.right) {
          state.steps.push({ action: 'rotate-left', nodeId: parent.id, value: z.value, depth: parent.depth, comparisons: state.comparisons })
          state.root = rotateLeft(state.nodes, parent.id, state.root)
          // Now z is the parent
          z = parent
          // Re-fetch after rotation
          const newParent = state.nodes.get(z.parent!)
          if (!newParent) break
        }

        // Case 3: z is left child → right rotate grandparent
        const p = state.nodes.get(z.parent!)!
        const gp = state.nodes.get(p.parent!)!
        p.color = 'black'
        gp.color = 'red'
        state.steps.push({ action: 'recolor', nodeId: p.id, value: z.value, depth: p.depth, comparisons: state.comparisons })
        state.steps.push({ action: 'rotate-right', nodeId: gp.id, value: z.value, depth: gp.depth, comparisons: state.comparisons })
        state.root = rotateRight(state.nodes, gp.id, state.root)
      }
    } else {
      // Parent is right child (mirror)
      const uncleId = grandparent.left
      const uncleColor = getColor(state.nodes, uncleId)

      if (uncleColor === 'red') {
        parent.color = 'black'
        if (uncleId !== null) {
          const uncle = state.nodes.get(uncleId)!
          uncle.color = 'black'
        }
        grandparent.color = 'red'
        state.steps.push({ action: 'recolor', nodeId: gpId, value: z.value, depth: grandparent.depth, comparisons: state.comparisons })
        z = grandparent
      } else {
        if (z.id === parent.left) {
          state.steps.push({ action: 'rotate-right', nodeId: parent.id, value: z.value, depth: parent.depth, comparisons: state.comparisons })
          state.root = rotateRight(state.nodes, parent.id, state.root)
          z = parent
          const newParent = state.nodes.get(z.parent!)
          if (!newParent) break
        }

        const p = state.nodes.get(z.parent!)!
        const gp = state.nodes.get(p.parent!)!
        p.color = 'black'
        gp.color = 'red'
        state.steps.push({ action: 'recolor', nodeId: p.id, value: z.value, depth: p.depth, comparisons: state.comparisons })
        state.steps.push({ action: 'rotate-left', nodeId: gp.id, value: z.value, depth: gp.depth, comparisons: state.comparisons })
        state.root = rotateLeft(state.nodes, gp.id, state.root)
      }
    }
  }

  // Ensure root is black
  if (state.root !== null) {
    const rootNode = state.nodes.get(state.root)!
    if (rootNode.color !== 'black') {
      rootNode.color = 'black'
      state.steps.push({ action: 'recolor', nodeId: state.root, value: rootNode.value, depth: 0, comparisons: state.comparisons })
    }
  }
}

export function insertRB(nodes: Map<number, RBNode>, root: number | null, value: number): RBResult {
  const state: MutableRB = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: 0,
    comparisons: 0,
    root,
  }

  let maxId = -1
  for (const id of state.nodes.keys()) if (id > maxId) maxId = id
  state.counter = maxId + 1

  // Standard BST insert
  let parentId: number | null = null
  let currentId = state.root

  while (currentId !== null) {
    const node = state.nodes.get(currentId)!
    state.comparisons++
    state.steps.push({ action: 'compare', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })

    parentId = currentId
    if (value < node.value) {
      state.steps.push({ action: 'go-left', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
      currentId = node.left
    } else if (value > node.value) {
      state.steps.push({ action: 'go-right', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
      currentId = node.right
    } else {
      // Duplicate — do nothing
      state.steps.push({ action: 'done', nodeId: currentId, value, depth: node.depth, comparisons: state.comparisons })
      updateDepths(state.nodes, state.root, 0)
      return { nodes: state.nodes, steps: state.steps, root: state.root }
    }
  }

  const newId = state.counter++
  const depth = parentId !== null ? (state.nodes.get(parentId)?.depth ?? 0) + 1 : 0
  const newNode: RBNode = {
    id: newId, value, color: 'red',
    left: null, right: null, parent: parentId, depth,
  }
  state.nodes.set(newId, newNode)

  if (parentId === null) {
    state.root = newId
  } else {
    const parent = state.nodes.get(parentId)!
    if (value < parent.value) parent.left = newId
    else parent.right = newId
  }

  state.steps.push({ action: 'insert', nodeId: newId, value, depth, comparisons: state.comparisons })

  // Fixup
  insertFixup(state, newId)
  state.steps.push({ action: 'done', nodeId: newId, value, depth: 0, comparisons: state.comparisons })

  updateDepths(state.nodes, state.root, 0)
  return { nodes: state.nodes, steps: state.steps, root: state.root }
}

// ── Delete ───────────────────────────────────────────────────────────────────

function transplant(state: MutableRB, uId: number, vId: number | null): void {
  const u = state.nodes.get(uId)!
  if (u.parent === null) {
    state.root = vId
  } else {
    const parent = state.nodes.get(u.parent)!
    if (parent.left === uId) parent.left = vId
    else parent.right = vId
  }
  if (vId !== null) {
    const v = state.nodes.get(vId)!
    v.parent = u.parent
  }
}

function treeMinimum(nodes: Map<number, RBNode>, id: number): number {
  let cur = id
  while (true) {
    const node = nodes.get(cur)!
    if (node.left === null) return cur
    cur = node.left
  }
}

function deleteFixup(state: MutableRB, xId: number | null, xParentId: number | null): void {
  while (xId !== state.root && getColor(state.nodes, xId) === 'black') {
    if (xParentId === null) break
    const parent = state.nodes.get(xParentId)
    if (!parent) break

    if (xId === parent.left) {
      let siblingId = parent.right
      if (siblingId === null) break
      let sibling = state.nodes.get(siblingId)!

      // Case 1: sibling is red
      if (sibling.color === 'red') {
        sibling.color = 'black'
        parent.color = 'red'
        state.steps.push({ action: 'rotate-left', nodeId: xParentId, value: 0, depth: parent.depth, comparisons: state.comparisons })
        state.root = rotateLeft(state.nodes, xParentId, state.root)
        siblingId = parent.right
        if (siblingId === null) break
        sibling = state.nodes.get(siblingId)!
      }

      const slColor = getColor(state.nodes, sibling.left)
      const srColor = getColor(state.nodes, sibling.right)

      if (slColor === 'black' && srColor === 'black') {
        // Case 2: both children black
        sibling.color = 'red'
        state.steps.push({ action: 'recolor', nodeId: siblingId, value: 0, depth: sibling.depth, comparisons: state.comparisons })
        xId = xParentId
        xParentId = parent.parent
      } else {
        if (srColor === 'black') {
          // Case 3: left child is red
          if (sibling.left !== null) state.nodes.get(sibling.left)!.color = 'black'
          sibling.color = 'red'
          state.steps.push({ action: 'rotate-right', nodeId: siblingId, value: 0, depth: sibling.depth, comparisons: state.comparisons })
          state.root = rotateRight(state.nodes, siblingId, state.root)
          siblingId = parent.right
          if (siblingId === null) break
          sibling = state.nodes.get(siblingId)!
        }

        // Case 4: right child is red
        sibling.color = parent.color
        parent.color = 'black'
        if (sibling.right !== null) state.nodes.get(sibling.right)!.color = 'black'
        state.steps.push({ action: 'rotate-left', nodeId: xParentId, value: 0, depth: parent.depth, comparisons: state.comparisons })
        state.root = rotateLeft(state.nodes, xParentId, state.root)
        xId = state.root
        break
      }
    } else {
      // Mirror
      let siblingId = parent.left
      if (siblingId === null) break
      let sibling = state.nodes.get(siblingId)!

      if (sibling.color === 'red') {
        sibling.color = 'black'
        parent.color = 'red'
        state.steps.push({ action: 'rotate-right', nodeId: xParentId, value: 0, depth: parent.depth, comparisons: state.comparisons })
        state.root = rotateRight(state.nodes, xParentId, state.root)
        siblingId = parent.left
        if (siblingId === null) break
        sibling = state.nodes.get(siblingId)!
      }

      const slColor = getColor(state.nodes, sibling.left)
      const srColor = getColor(state.nodes, sibling.right)

      if (slColor === 'black' && srColor === 'black') {
        sibling.color = 'red'
        state.steps.push({ action: 'recolor', nodeId: siblingId, value: 0, depth: sibling.depth, comparisons: state.comparisons })
        xId = xParentId
        xParentId = parent.parent
      } else {
        if (slColor === 'black') {
          if (sibling.right !== null) state.nodes.get(sibling.right)!.color = 'black'
          sibling.color = 'red'
          state.steps.push({ action: 'rotate-left', nodeId: siblingId, value: 0, depth: sibling.depth, comparisons: state.comparisons })
          state.root = rotateLeft(state.nodes, siblingId, state.root)
          siblingId = parent.left
          if (siblingId === null) break
          sibling = state.nodes.get(siblingId)!
        }

        sibling.color = parent.color
        parent.color = 'black'
        if (sibling.left !== null) state.nodes.get(sibling.left)!.color = 'black'
        state.steps.push({ action: 'rotate-right', nodeId: xParentId, value: 0, depth: parent.depth, comparisons: state.comparisons })
        state.root = rotateRight(state.nodes, xParentId, state.root)
        xId = state.root
        break
      }
    }
  }

  if (xId !== null) {
    const x = state.nodes.get(xId)
    if (x) x.color = 'black'
  }
}

export function deleteRB(nodes: Map<number, RBNode>, root: number | null, value: number): RBResult {
  const state: MutableRB = {
    nodes: cloneNodes(nodes),
    steps: [],
    counter: 0,
    comparisons: 0,
    root,
  }

  // Find node
  let zId: number | null = state.root
  while (zId !== null) {
    const node = state.nodes.get(zId)!
    state.comparisons++
    state.steps.push({ action: 'compare', nodeId: zId, value, depth: node.depth, comparisons: state.comparisons })

    if (value < node.value) {
      state.steps.push({ action: 'go-left', nodeId: zId, value, depth: node.depth, comparisons: state.comparisons })
      zId = node.left
    } else if (value > node.value) {
      state.steps.push({ action: 'go-right', nodeId: zId, value, depth: node.depth, comparisons: state.comparisons })
      zId = node.right
    } else {
      break
    }
  }

  if (zId === null) {
    state.steps.push({ action: 'not-found', nodeId: -1, value, depth: -1, comparisons: state.comparisons })
    return { nodes: state.nodes, steps: state.steps, root: state.root }
  }

  const z = state.nodes.get(zId)!
  state.steps.push({ action: 'delete-node', nodeId: zId, value, depth: z.depth, comparisons: state.comparisons })

  let yId = zId
  let yOriginalColor = z.color
  let xId: number | null
  let xParentId: number | null

  if (z.left === null) {
    xId = z.right
    xParentId = z.parent
    transplant(state, zId, z.right)
  } else if (z.right === null) {
    xId = z.left
    xParentId = z.parent
    transplant(state, zId, z.left)
  } else {
    yId = treeMinimum(state.nodes, z.right)
    const y = state.nodes.get(yId)!
    yOriginalColor = y.color
    xId = y.right
    xParentId = yId

    if (y.parent === zId) {
      if (xId !== null) state.nodes.get(xId)!.parent = yId
    } else {
      xParentId = y.parent
      transplant(state, yId, y.right)
      y.right = z.right
      if (z.right !== null) state.nodes.get(z.right)!.parent = yId
    }

    transplant(state, zId, yId)
    y.left = z.left
    if (z.left !== null) state.nodes.get(z.left)!.parent = yId
    y.color = z.color
  }

  state.nodes.delete(zId)

  if (yOriginalColor === 'black') {
    deleteFixup(state, xId, xParentId)
  }

  state.steps.push({ action: 'done', nodeId: -1, value, depth: 0, comparisons: state.comparisons })

  if (state.root !== null) updateDepths(state.nodes, state.root, 0)
  return { nodes: state.nodes, steps: state.steps, root: state.root }
}

// ── Build ────────────────────────────────────────────────────────────────────

export function buildRB(values: number[]): RBResult {
  let nodes = new Map<number, RBNode>()
  let root: number | null = null
  const allSteps: RBStep[] = []

  for (const v of values) {
    const res = insertRB(nodes, root, v)
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

export function getTreeHeight(nodes: Map<number, RBNode>, root: number | null): number {
  if (root === null) return 0
  const node = nodes.get(root)
  if (!node) return 0
  return 1 + Math.max(getTreeHeight(nodes, node.left), getTreeHeight(nodes, node.right))
}

export function getNodeCount(nodes: Map<number, RBNode>): number {
  return nodes.size
}

export function getBlackHeight(nodes: Map<number, RBNode>, root: number | null): number {
  if (root === null) return 1 // NIL counts as 1 black
  const node = nodes.get(root)
  if (!node) return 1
  const leftBH = getBlackHeight(nodes, node.left)
  return leftBH + (node.color === 'black' ? 1 : 0)
}

export function getRotationCount(steps: RBStep[]): number {
  return steps.filter(s => s.action === 'rotate-left' || s.action === 'rotate-right').length
}

export function getRecolorCount(steps: RBStep[]): number {
  return steps.filter(s => s.action === 'recolor').length
}
