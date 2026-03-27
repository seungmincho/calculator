// ── Linked List Algorithm ────────────────────────────────────────────────────

export type ListType = 'singly' | 'doubly'

export interface LLNode {
  id: number
  value: number
  next: number | null
  prev: number | null  // only for doubly linked
}

export interface LLStep {
  action: 'create' | 'traverse' | 'link' | 'unlink' | 'found' | 'not-found' | 'done' | 'reverse-step'
  nodeId: number
  value: number
  description: string
  highlightNodes: number[]   // nodes to highlight
  highlightEdges: [number, number][]  // edges to highlight [from, to]
  comparisons: number
}

export interface LLResult {
  steps: LLStep[]
  head: number | null
  tail: number | null
  nodes: Map<number, LLNode>
}

// ── Clone ────────────────────────────────────────────────────────────────────

function cloneNodes(nodes: Map<number, LLNode>): Map<number, LLNode> {
  const copy = new Map<number, LLNode>()
  for (const [id, node] of nodes) copy.set(id, { ...node })
  return copy
}

function getListLength(nodes: Map<number, LLNode>, head: number | null): number {
  let count = 0
  let cur = head
  while (cur !== null) { count++; cur = nodes.get(cur)?.next ?? null }
  return count
}

// ── Insert at Head ───────────────────────────────────────────────────────────

export function insertHead(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null,
  value: number, listType: ListType, nextId: number,
): LLResult {
  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []

  const newNode: LLNode = { id: nextId, value, next: head, prev: null }
  ns.set(nextId, newNode)

  steps.push({
    action: 'create', nodeId: nextId, value,
    description: `Create node with value ${value}`,
    highlightNodes: [nextId], highlightEdges: [], comparisons: 0,
  })

  if (head !== null) {
    if (listType === 'doubly') {
      const headNode = ns.get(head)!
      headNode.prev = nextId
    }
    steps.push({
      action: 'link', nodeId: nextId, value,
      description: `Link new node → old head (${ns.get(head)?.value})`,
      highlightNodes: [nextId, head], highlightEdges: [[nextId, head]], comparisons: 0,
    })
  }

  const newTail = tail ?? nextId

  steps.push({
    action: 'done', nodeId: nextId, value,
    description: `New head is ${value}`,
    highlightNodes: [nextId], highlightEdges: [], comparisons: 0,
  })

  return { steps, head: nextId, tail: newTail, nodes: ns }
}

// ── Insert at Tail ───────────────────────────────────────────────────────────

export function insertTail(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null,
  value: number, listType: ListType, nextId: number,
): LLResult {
  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []

  const newNode: LLNode = { id: nextId, value, next: null, prev: listType === 'doubly' ? tail : null }
  ns.set(nextId, newNode)

  steps.push({
    action: 'create', nodeId: nextId, value,
    description: `Create node with value ${value}`,
    highlightNodes: [nextId], highlightEdges: [], comparisons: 0,
  })

  if (tail !== null) {
    const tailNode = ns.get(tail)!
    tailNode.next = nextId
    steps.push({
      action: 'link', nodeId: tail, value,
      description: `Link old tail (${tailNode.value}) → new node`,
      highlightNodes: [tail, nextId], highlightEdges: [[tail, nextId]], comparisons: 0,
    })
  }

  const newHead = head ?? nextId

  steps.push({
    action: 'done', nodeId: nextId, value,
    description: `New tail is ${value}`,
    highlightNodes: [nextId], highlightEdges: [], comparisons: 0,
  })

  return { steps, head: newHead, tail: nextId, nodes: ns }
}

// ── Insert at Index ──────────────────────────────────────────────────────────

export function insertAtIndex(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null,
  value: number, index: number, listType: ListType, nextId: number,
): LLResult {
  const len = getListLength(nodes, head)
  if (index <= 0) return insertHead(nodes, head, tail, value, listType, nextId)
  if (index >= len) return insertTail(nodes, head, tail, value, listType, nextId)

  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []
  let comparisons = 0

  // Traverse to index - 1
  let cur = head
  for (let i = 0; i < index - 1 && cur !== null; i++) {
    comparisons++
    steps.push({
      action: 'traverse', nodeId: cur, value: ns.get(cur)!.value,
      description: `Traverse to index ${i}`,
      highlightNodes: [cur], highlightEdges: [], comparisons,
    })
    cur = ns.get(cur)!.next
  }

  if (cur === null) return { steps, head, tail, nodes: ns }

  const prevNode = ns.get(cur)!
  const nextNode = prevNode.next

  steps.push({
    action: 'traverse', nodeId: cur, value: prevNode.value,
    description: `Found position after node ${prevNode.value}`,
    highlightNodes: [cur], highlightEdges: [], comparisons,
  })

  const newNode: LLNode = { id: nextId, value, next: nextNode, prev: listType === 'doubly' ? cur : null }
  ns.set(nextId, newNode)

  steps.push({
    action: 'create', nodeId: nextId, value,
    description: `Create node with value ${value}`,
    highlightNodes: [nextId], highlightEdges: [], comparisons,
  })

  prevNode.next = nextId
  if (listType === 'doubly' && nextNode !== null) {
    const nn = ns.get(nextNode)!
    nn.prev = nextId
  }

  steps.push({
    action: 'link', nodeId: nextId, value,
    description: `Link: ${prevNode.value} → ${value} → ${nextNode !== null ? ns.get(nextNode)?.value : 'null'}`,
    highlightNodes: [cur, nextId, ...(nextNode !== null ? [nextNode] : [])],
    highlightEdges: [[cur, nextId], ...(nextNode !== null ? [[nextId, nextNode] as [number, number]] : [])],
    comparisons,
  })

  steps.push({
    action: 'done', nodeId: nextId, value,
    description: `Inserted ${value} at index ${index}`,
    highlightNodes: [nextId], highlightEdges: [], comparisons,
  })

  return { steps, head, tail, nodes: ns }
}

// ── Delete Head ──────────────────────────────────────────────────────────────

export function deleteHead(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null, listType: ListType,
): LLResult {
  if (head === null) return { steps: [], head: null, tail: null, nodes }

  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []

  const headNode = ns.get(head)!
  const newHead = headNode.next

  steps.push({
    action: 'unlink', nodeId: head, value: headNode.value,
    description: `Remove head node (${headNode.value})`,
    highlightNodes: [head], highlightEdges: [], comparisons: 0,
  })

  ns.delete(head)

  if (newHead !== null && listType === 'doubly') {
    ns.get(newHead)!.prev = null
  }

  const newTail = newHead === null ? null : tail

  steps.push({
    action: 'done', nodeId: newHead ?? -1, value: newHead !== null ? (ns.get(newHead)?.value ?? 0) : 0,
    description: newHead !== null ? `New head is ${ns.get(newHead)?.value}` : 'List is now empty',
    highlightNodes: newHead !== null ? [newHead] : [], highlightEdges: [], comparisons: 0,
  })

  return { steps, head: newHead, tail: newTail, nodes: ns }
}

// ── Delete Tail ──────────────────────────────────────────────────────────────

export function deleteTail(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null, listType: ListType,
): LLResult {
  if (tail === null || head === null) return { steps: [], head: null, tail: null, nodes }
  if (head === tail) return deleteHead(nodes, head, tail, listType)

  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []
  let comparisons = 0

  // Find node before tail
  if (listType === 'doubly') {
    const tailNode = ns.get(tail)!
    const prevId = tailNode.prev!
    const prevNode = ns.get(prevId)!
    prevNode.next = null

    steps.push({
      action: 'unlink', nodeId: tail, value: tailNode.value,
      description: `Remove tail node (${tailNode.value})`,
      highlightNodes: [tail], highlightEdges: [], comparisons: 0,
    })

    ns.delete(tail)

    steps.push({
      action: 'done', nodeId: prevId, value: prevNode.value,
      description: `New tail is ${prevNode.value}`,
      highlightNodes: [prevId], highlightEdges: [], comparisons: 0,
    })

    return { steps, head, tail: prevId, nodes: ns }
  }

  // Singly linked: traverse to find prev
  let cur: number | null = head
  while (cur !== null) {
    const node: LLNode = ns.get(cur)!
    if (node.next === tail) break
    comparisons++
    steps.push({
      action: 'traverse', nodeId: cur, value: node.value,
      description: `Traverse...`,
      highlightNodes: [cur], highlightEdges: [], comparisons,
    })
    cur = node.next
  }

  if (cur !== null) {
    const prevNode = ns.get(cur)!
    const tailNode = ns.get(tail)!
    prevNode.next = null

    steps.push({
      action: 'unlink', nodeId: tail, value: tailNode.value,
      description: `Remove tail node (${tailNode.value})`,
      highlightNodes: [tail], highlightEdges: [], comparisons,
    })

    ns.delete(tail)

    steps.push({
      action: 'done', nodeId: cur, value: prevNode.value,
      description: `New tail is ${prevNode.value}`,
      highlightNodes: [cur], highlightEdges: [], comparisons,
    })

    return { steps, head, tail: cur, nodes: ns }
  }

  return { steps, head, tail, nodes: ns }
}

// ── Delete at Index ──────────────────────────────────────────────────────────

export function deleteAtIndex(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null,
  index: number, listType: ListType,
): LLResult {
  if (index <= 0) return deleteHead(nodes, head, tail, listType)

  const len = getListLength(nodes, head)
  if (index >= len - 1) return deleteTail(nodes, head, tail, listType)

  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []
  let comparisons = 0

  let cur = head
  for (let i = 0; i < index - 1 && cur !== null; i++) {
    comparisons++
    steps.push({
      action: 'traverse', nodeId: cur, value: ns.get(cur)!.value,
      description: `Traverse to index ${i}`,
      highlightNodes: [cur], highlightEdges: [], comparisons,
    })
    cur = ns.get(cur)!.next
  }

  if (cur === null) return { steps, head, tail, nodes: ns }

  const prevNode = ns.get(cur)!
  const targetId = prevNode.next!
  const targetNode = ns.get(targetId)!
  const afterId = targetNode.next

  steps.push({
    action: 'unlink', nodeId: targetId, value: targetNode.value,
    description: `Remove node ${targetNode.value} at index ${index}`,
    highlightNodes: [targetId], highlightEdges: [], comparisons,
  })

  prevNode.next = afterId
  if (listType === 'doubly' && afterId !== null) {
    ns.get(afterId)!.prev = cur
  }
  ns.delete(targetId)

  steps.push({
    action: 'link', nodeId: cur, value: prevNode.value,
    description: `Re-link: ${prevNode.value} → ${afterId !== null ? ns.get(afterId)?.value : 'null'}`,
    highlightNodes: [cur, ...(afterId !== null ? [afterId] : [])],
    highlightEdges: afterId !== null ? [[cur, afterId]] : [],
    comparisons,
  })

  steps.push({
    action: 'done', nodeId: cur, value: prevNode.value,
    description: `Deleted node at index ${index}`,
    highlightNodes: [], highlightEdges: [], comparisons,
  })

  return { steps, head, tail, nodes: ns }
}

// ── Search ───────────────────────────────────────────────────────────────────

export function searchList(
  nodes: Map<number, LLNode>, head: number | null, value: number,
): { steps: LLStep[]; foundId: number | null } {
  const steps: LLStep[] = []
  let comparisons = 0
  let cur = head

  while (cur !== null) {
    const node = nodes.get(cur)!
    comparisons++
    steps.push({
      action: 'traverse', nodeId: cur, value: node.value,
      description: `Check node ${node.value}`,
      highlightNodes: [cur], highlightEdges: [], comparisons,
    })

    if (node.value === value) {
      steps.push({
        action: 'found', nodeId: cur, value: node.value,
        description: `Found ${value}!`,
        highlightNodes: [cur], highlightEdges: [], comparisons,
      })
      return { steps, foundId: cur }
    }
    cur = node.next
  }

  steps.push({
    action: 'not-found', nodeId: -1, value,
    description: `${value} not found in list`,
    highlightNodes: [], highlightEdges: [], comparisons,
  })
  return { steps, foundId: null }
}

// ── Reverse ──────────────────────────────────────────────────────────────────

export function reverseList(
  nodes: Map<number, LLNode>, head: number | null, tail: number | null, listType: ListType,
): LLResult {
  const ns = cloneNodes(nodes)
  const steps: LLStep[] = []

  let prev: number | null = null
  let cur = head
  let comparisons = 0

  while (cur !== null) {
    const node = ns.get(cur)!
    const next = node.next
    comparisons++

    node.next = prev
    if (listType === 'doubly') node.prev = next

    steps.push({
      action: 'reverse-step', nodeId: cur, value: node.value,
      description: `Reverse pointer of node ${node.value}`,
      highlightNodes: [cur, ...(prev !== null ? [prev] : [])],
      highlightEdges: prev !== null ? [[cur, prev]] : [],
      comparisons,
    })

    prev = cur
    cur = next
  }

  steps.push({
    action: 'done', nodeId: prev ?? -1, value: prev !== null ? (ns.get(prev)?.value ?? 0) : 0,
    description: 'List reversed',
    highlightNodes: prev !== null ? [prev] : [], highlightEdges: [], comparisons,
  })

  return { steps, head: prev, tail: head, nodes: ns }
}

// ── Build ────────────────────────────────────────────────────────────────────

export function buildList(values: number[], listType: ListType): {
  head: number | null; tail: number | null; nodes: Map<number, LLNode>; nextId: number
} {
  const nodes = new Map<number, LLNode>()
  if (values.length === 0) return { head: null, tail: null, nodes, nextId: 0 }

  let nextId = 0
  for (let i = 0; i < values.length; i++) {
    const node: LLNode = {
      id: nextId, value: values[i],
      next: i < values.length - 1 ? nextId + 1 : null,
      prev: listType === 'doubly' && i > 0 ? nextId - 1 : null,
    }
    nodes.set(nextId, node)
    nextId++
  }

  return { head: 0, tail: nextId - 1, nodes, nextId }
}

export function generateRandomValues(count: number, min = 1, max = 99): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export function getListArray(nodes: Map<number, LLNode>, head: number | null): number[] {
  const arr: number[] = []
  let cur = head
  let safety = 0
  while (cur !== null && safety < 1000) {
    arr.push(nodes.get(cur)!.value)
    cur = nodes.get(cur)!.next
    safety++
  }
  return arr
}
