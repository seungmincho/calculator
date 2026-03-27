// Convex Hull — Graham Scan with step-by-step recording
// Pure functions, no side effects, TypeScript strict

export interface Point {
  x: number
  y: number
  id: number
}

export interface ConvexHullStep {
  points: Point[]
  stack: number[]              // indices into points[] forming current hull
  currentIndex: number | null  // point being processed
  comparing: [number, number, number] | null // [stackTop-1, stackTop, current] for cross product
  action: 'find-lowest' | 'sort-angle' | 'push' | 'pop' | 'check-turn' | 'done'
  description: string
}

export interface ConvexHullResult {
  steps: ConvexHullStep[]
  hull: number[]               // final hull indices
  sortedOrder: number[]        // angle-sorted order
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function dist2(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

export function grahamScan(points: Point[]): ConvexHullResult {
  const steps: ConvexHullStep[] = []
  const pts = [...points]
  const n = pts.length

  if (n < 3) {
    steps.push({
      points: pts,
      stack: pts.map((_, i) => i),
      currentIndex: null,
      comparing: null,
      action: 'done',
      description: 'Not enough points for convex hull',
    })
    return { steps, hull: pts.map((_, i) => i), sortedOrder: pts.map((_, i) => i) }
  }

  // Step 1: Find lowest point (highest y, leftmost x)
  let lowestIdx = 0
  for (let i = 1; i < n; i++) {
    if (pts[i].y > pts[lowestIdx].y || (pts[i].y === pts[lowestIdx].y && pts[i].x < pts[lowestIdx].x)) {
      lowestIdx = i
    }
  }

  // Swap lowest to index 0
  const tmp = pts[0]
  pts[0] = pts[lowestIdx]
  pts[lowestIdx] = tmp

  steps.push({
    points: [...pts],
    stack: [0],
    currentIndex: 0,
    comparing: null,
    action: 'find-lowest',
    description: `Found lowest point: (${pts[0].x.toFixed(0)}, ${pts[0].y.toFixed(0)})`,
  })

  // Step 2: Sort by polar angle relative to pts[0]
  const pivot = pts[0]
  const rest = pts.slice(1)
  rest.sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x)
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x)
    if (angleA !== angleB) return angleA - angleB
    return dist2(pivot, a) - dist2(pivot, b)
  })
  for (let i = 0; i < rest.length; i++) pts[i + 1] = rest[i]

  const sortedOrder = pts.map(p => p.id)

  steps.push({
    points: [...pts],
    stack: [0],
    currentIndex: null,
    comparing: null,
    action: 'sort-angle',
    description: 'Sorted points by polar angle from lowest point',
  })

  // Step 3: Graham Scan
  const stack: number[] = [0, 1]

  steps.push({
    points: [...pts],
    stack: [...stack],
    currentIndex: 1,
    comparing: null,
    action: 'push',
    description: 'Initialize stack with first two points',
  })

  for (let i = 2; i < n; i++) {
    // Check turn direction
    while (stack.length >= 2) {
      const top = stack[stack.length - 1]
      const belowTop = stack[stack.length - 2]
      const crossVal = cross(pts[belowTop], pts[top], pts[i])

      steps.push({
        points: [...pts],
        stack: [...stack],
        currentIndex: i,
        comparing: [belowTop, top, i],
        action: 'check-turn',
        description: crossVal <= 0
          ? `Clockwise/collinear turn at point ${top} — pop`
          : `Counter-clockwise turn at point ${top} — keep`,
      })

      if (crossVal <= 0) {
        stack.pop()
        steps.push({
          points: [...pts],
          stack: [...stack],
          currentIndex: i,
          comparing: null,
          action: 'pop',
          description: `Popped point ${top} from stack`,
        })
      } else {
        break
      }
    }

    stack.push(i)
    steps.push({
      points: [...pts],
      stack: [...stack],
      currentIndex: i,
      comparing: null,
      action: 'push',
      description: `Pushed point ${i} onto stack`,
    })
  }

  // Done
  steps.push({
    points: [...pts],
    stack: [...stack],
    currentIndex: null,
    comparing: null,
    action: 'done',
    description: `Convex hull complete with ${stack.length} vertices`,
  })

  return { steps, hull: [...stack], sortedOrder }
}

export function generateRandomPoints(count: number, width: number, height: number, margin = 30): Point[] {
  const w = width - margin * 2
  const h = height - margin * 2
  return Array.from({ length: count }, (_, i) => ({
    x: margin + Math.random() * w,
    y: margin + Math.random() * h,
    id: i,
  }))
}

export function generateCirclePoints(count: number, width: number, height: number): Point[] {
  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) / 2.5
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count + (Math.random() - 0.5) * 0.3
    const radius = r * (0.5 + Math.random() * 0.5)
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      id: i,
    }
  })
}
