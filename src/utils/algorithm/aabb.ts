// AABB (Axis-Aligned Bounding Box) 충돌감지 — 순수 로직
// 두 축 정렬 직사각형의 충돌 판정

export interface AABB {
  x: number      // center x
  y: number      // center y
  width: number  // full width
  height: number // full height
}

export interface AABBStepResult {
  axis: 'x' | 'y'
  rangeA: { min: number; max: number }
  rangeB: { min: number; max: number }
  overlap: number  // positive = overlap, negative = gap
  isSeparating: boolean
}

export interface AABBResult {
  colliding: boolean
  steps: AABBStepResult[]  // always 2 steps: X then Y
  overlapX: number
  overlapY: number
}

/** AABB의 min/max 바운드 계산 */
export function getAABBBounds(box: AABB) {
  return {
    minX: box.x - box.width / 2,
    maxX: box.x + box.width / 2,
    minY: box.y - box.height / 2,
    maxY: box.y + box.height / 2,
  }
}

/** AABB 충돌 판정 — 단계별 결과 포함 */
export function testAABB(a: AABB, b: AABB): AABBResult {
  const boundsA = getAABBBounds(a)
  const boundsB = getAABBBounds(b)

  const overlapX = Math.min(boundsA.maxX, boundsB.maxX) - Math.max(boundsA.minX, boundsB.minX)
  const overlapY = Math.min(boundsA.maxY, boundsB.maxY) - Math.max(boundsA.minY, boundsB.minY)

  const steps: AABBStepResult[] = [
    {
      axis: 'x',
      rangeA: { min: boundsA.minX, max: boundsA.maxX },
      rangeB: { min: boundsB.minX, max: boundsB.maxX },
      overlap: overlapX,
      isSeparating: overlapX <= 0,
    },
    {
      axis: 'y',
      rangeA: { min: boundsA.minY, max: boundsA.maxY },
      rangeB: { min: boundsB.minY, max: boundsB.maxY },
      overlap: overlapY,
      isSeparating: overlapY <= 0,
    },
  ]

  return {
    colliding: overlapX > 0 && overlapY > 0,
    steps,
    overlapX,
    overlapY,
  }
}

/** 단계별 AABB — step번째 축까지만 검사 (애니메이션용) */
export function testAABBStep(a: AABB, b: AABB, step: number): AABBResult {
  const full = testAABB(a, b)
  const limitedSteps = full.steps.slice(0, step + 1)
  const hasSeparating = limitedSteps.some(s => s.isSeparating)

  return {
    ...full,
    steps: limitedSteps,
    colliding: !hasSeparating && limitedSteps.length === 2,
  }
}
