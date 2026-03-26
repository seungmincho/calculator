export interface Point {
  x: number
  y: number
  id: number
}

export interface Boundary {
  x: number // center x
  y: number // center y
  w: number // half-width
  h: number // half-height
}

export interface QuadTreeNode {
  id: number
  boundary: Boundary
  points: Point[]
  capacity: number
  divided: boolean
  children: { ne: number | null; nw: number | null; se: number | null; sw: number | null }
  depth: number
}

export interface QuadTreeStep {
  action: 'insert' | 'subdivide' | 'search-check' | 'search-found' | 'search-skip'
  nodeId: number
  point?: Point
  searchArea?: Boundary
  depth: number
}

export interface QuadTreeResult {
  nodes: Map<number, QuadTreeNode>
  steps: QuadTreeStep[]
  totalNodes: number
  totalPoints: number
  maxDepth: number
}

export interface SearchResult {
  steps: QuadTreeStep[]
  foundPoints: Point[]
  nodesChecked: number
  nodesSkipped: number
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function containsPoint(boundary: Boundary, point: Point): boolean {
  return (
    point.x >= boundary.x - boundary.w &&
    point.x <= boundary.x + boundary.w &&
    point.y >= boundary.y - boundary.h &&
    point.y <= boundary.y + boundary.h
  )
}

function intersects(a: Boundary, b: Boundary): boolean {
  return !(
    b.x - b.w > a.x + a.w ||
    b.x + b.w < a.x - a.w ||
    b.y - b.h > a.y + a.h ||
    b.y + b.h < a.y - a.h
  )
}

// ── QuadTree build ────────────────────────────────────────────────────────────

let nodeIdCounter = 0

function createNode(
  boundary: Boundary,
  capacity: number,
  depth: number
): QuadTreeNode {
  return {
    id: nodeIdCounter++,
    boundary,
    points: [],
    capacity,
    divided: false,
    children: { ne: null, nw: null, se: null, sw: null },
    depth,
  }
}

function subdivide(
  node: QuadTreeNode,
  nodes: Map<number, QuadTreeNode>,
  steps: QuadTreeStep[],
  maxDepthRef: { value: number }
): void {
  const { x, y, w, h } = node.boundary
  const hw = w / 2
  const hh = h / 2
  const nextDepth = node.depth + 1

  if (nextDepth > maxDepthRef.value) {
    maxDepthRef.value = nextDepth
  }

  const ne = createNode({ x: x + hw, y: y - hh, w: hw, h: hh }, node.capacity, nextDepth)
  const nw = createNode({ x: x - hw, y: y - hh, w: hw, h: hh }, node.capacity, nextDepth)
  const se = createNode({ x: x + hw, y: y + hh, w: hw, h: hh }, node.capacity, nextDepth)
  const sw = createNode({ x: x - hw, y: y + hh, w: hw, h: hh }, node.capacity, nextDepth)

  nodes.set(ne.id, ne)
  nodes.set(nw.id, nw)
  nodes.set(se.id, se)
  nodes.set(sw.id, sw)

  node.children = { ne: ne.id, nw: nw.id, se: se.id, sw: sw.id }
  node.divided = true

  steps.push({ action: 'subdivide', nodeId: node.id, depth: node.depth })
}

function insertPoint(
  nodeId: number,
  point: Point,
  nodes: Map<number, QuadTreeNode>,
  steps: QuadTreeStep[],
  maxDepthRef: { value: number }
): boolean {
  const node = nodes.get(nodeId)
  if (!node) return false

  if (!containsPoint(node.boundary, point)) return false

  if (!node.divided && node.points.length < node.capacity) {
    node.points.push(point)
    steps.push({ action: 'insert', nodeId: node.id, point, depth: node.depth })
    return true
  }

  if (!node.divided) {
    subdivide(node, nodes, steps, maxDepthRef)

    // Re-distribute existing points into children
    const existingPoints = node.points.splice(0)
    for (const existing of existingPoints) {
      insertIntoChildren(node, existing, nodes, steps, maxDepthRef)
    }
  }

  return insertIntoChildren(node, point, nodes, steps, maxDepthRef)
}

function insertIntoChildren(
  node: QuadTreeNode,
  point: Point,
  nodes: Map<number, QuadTreeNode>,
  steps: QuadTreeStep[],
  maxDepthRef: { value: number }
): boolean {
  const { ne, nw, se, sw } = node.children
  const childIds = [ne, nw, se, sw].filter((id): id is number => id !== null)

  for (const childId of childIds) {
    if (insertPoint(childId, point, nodes, steps, maxDepthRef)) {
      return true
    }
  }
  return false
}

export function buildQuadTree(
  points: Point[],
  boundary: Boundary,
  capacity = 4
): QuadTreeResult {
  nodeIdCounter = 0
  const nodes = new Map<number, QuadTreeNode>()
  const steps: QuadTreeStep[] = []
  const maxDepthRef = { value: 0 }

  const root = createNode(boundary, capacity, 0)
  nodes.set(root.id, root)

  for (const point of points) {
    insertPoint(root.id, point, nodes, steps, maxDepthRef)
  }

  const totalPoints = points.filter((p) => containsPoint(boundary, p)).length

  return {
    nodes,
    steps,
    totalNodes: nodes.size,
    totalPoints,
    maxDepth: maxDepthRef.value,
  }
}

// ── Range search ──────────────────────────────────────────────────────────────

function searchNode(
  nodeId: number,
  searchArea: Boundary,
  nodes: Map<number, QuadTreeNode>,
  steps: QuadTreeStep[],
  foundPoints: Point[],
  stats: { nodesChecked: number; nodesSkipped: number }
): void {
  const node = nodes.get(nodeId)
  if (!node) return

  if (!intersects(node.boundary, searchArea)) {
    steps.push({
      action: 'search-skip',
      nodeId: node.id,
      searchArea,
      depth: node.depth,
    })
    stats.nodesSkipped++
    return
  }

  steps.push({
    action: 'search-check',
    nodeId: node.id,
    searchArea,
    depth: node.depth,
  })
  stats.nodesChecked++

  for (const point of node.points) {
    if (containsPoint(searchArea, point)) {
      steps.push({
        action: 'search-found',
        nodeId: node.id,
        point,
        searchArea,
        depth: node.depth,
      })
      foundPoints.push(point)
    }
  }

  if (node.divided) {
    const { ne, nw, se, sw } = node.children
    const childIds = [ne, nw, se, sw].filter((id): id is number => id !== null)
    for (const childId of childIds) {
      searchNode(childId, searchArea, nodes, steps, foundPoints, stats)
    }
  }
}

export function rangeSearch(
  nodes: Map<number, QuadTreeNode>,
  searchArea: Boundary
): SearchResult {
  const steps: QuadTreeStep[] = []
  const foundPoints: Point[] = []
  const stats = { nodesChecked: 0, nodesSkipped: 0 }

  // Root node always has id 0
  const rootId = 0
  if (nodes.has(rootId)) {
    searchNode(rootId, searchArea, nodes, steps, foundPoints, stats)
  }

  return {
    steps,
    foundPoints,
    nodesChecked: stats.nodesChecked,
    nodesSkipped: stats.nodesSkipped,
  }
}

// ── Point generators ──────────────────────────────────────────────────────────

export function generateRandomPoints(
  count: number,
  width: number,
  height: number
): Point[] {
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    points.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
    })
  }
  return points
}

export function generateClusteredPoints(
  count: number,
  clusters: number,
  width: number,
  height: number
): Point[] {
  const points: Point[] = []
  const clusterCenters: { x: number; y: number }[] = []

  for (let c = 0; c < clusters; c++) {
    clusterCenters.push({
      x: Math.random() * width,
      y: Math.random() * height,
    })
  }

  const spread = Math.min(width, height) * 0.12

  for (let i = 0; i < count; i++) {
    const center = clusterCenters[i % clusters]
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * spread

    points.push({
      id: i,
      x: Math.max(0, Math.min(width, center.x + Math.cos(angle) * radius)),
      y: Math.max(0, Math.min(height, center.y + Math.sin(angle) * radius)),
    })
  }

  return points
}
