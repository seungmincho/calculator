// SAT (Separating Axis Theorem) 순수 로직
// 두 볼록 다각형의 충돌 판정

import { Vec2, sub, dot, normalize, perpendicular, getWorldVertices, type Polygon } from './geometry'

/** 축 하나에 대한 투영 결과 */
export interface Projection {
  min: number
  max: number
}

/** 축 정보 — 방향, 출처 엣지, 투영 결과 */
export interface AxisInfo {
  axis: Vec2           // 정규화된 축 방향
  edgeStart: Vec2      // 이 축이 유래한 엣지의 시작점
  edgeEnd: Vec2        // 엣지의 끝점
  sourcePolygon: 'A' | 'B'
  projA: Projection
  projB: Projection
  overlap: number      // 양수=겹침, 음수=분리
  isSeparating: boolean
}

/** SAT 전체 결과 */
export interface SATResult {
  colliding: boolean
  axes: AxisInfo[]
  separatingAxisIndex: number | null  // 분리축이면 첫 번째 분리축 인덱스
  minOverlap: number                  // MTV 크기 (겹침 시)
  mtv: Vec2 | null                    // Minimum Translation Vector
}

/** 폴리곤을 축에 투영 */
export function projectPolygon(vertices: Vec2[], axis: Vec2): Projection {
  let min = dot(vertices[0], axis)
  let max = min
  for (let i = 1; i < vertices.length; i++) {
    const p = dot(vertices[i], axis)
    if (p < min) min = p
    if (p > max) max = p
  }
  return { min, max }
}

/** 두 투영의 겹침 크기 (음수면 분리) */
export function getOverlap(a: Projection, b: Projection): number {
  return Math.min(a.max, b.max) - Math.max(a.min, b.min)
}

/** 볼록 다각형의 엣지 법선(분리축 후보) 추출 */
export function getEdgeNormals(vertices: Vec2[]): { axis: Vec2; start: Vec2; end: Vec2 }[] {
  const normals: { axis: Vec2; start: Vec2; end: Vec2 }[] = []
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    const edge = sub(end, start)
    const normal = normalize(perpendicular(edge))
    normals.push({ axis: normal, start, end })
  }
  return normals
}

/** SAT 충돌 판정 — 단계별 결과 포함 */
export function testSAT(polygonA: Polygon, polygonB: Polygon): SATResult {
  const vertsA = getWorldVertices(polygonA)
  const vertsB = getWorldVertices(polygonB)

  const normalsA = getEdgeNormals(vertsA)
  const normalsB = getEdgeNormals(vertsB)

  const axes: AxisInfo[] = []
  let minOverlap = Infinity
  let mtvAxis: Vec2 | null = null
  let separatingAxisIndex: number | null = null

  // A의 엣지 법선으로 투영
  for (const { axis, start, end } of normalsA) {
    const projA = projectPolygon(vertsA, axis)
    const projB = projectPolygon(vertsB, axis)
    const overlap = getOverlap(projA, projB)
    const isSeparating = overlap < 0

    axes.push({
      axis, edgeStart: start, edgeEnd: end,
      sourcePolygon: 'A', projA, projB, overlap, isSeparating,
    })

    if (isSeparating && separatingAxisIndex === null) {
      separatingAxisIndex = axes.length - 1
    }
    if (overlap < minOverlap) {
      minOverlap = overlap
      mtvAxis = axis
    }
  }

  // B의 엣지 법선으로 투영
  for (const { axis, start, end } of normalsB) {
    const projA = projectPolygon(vertsA, axis)
    const projB = projectPolygon(vertsB, axis)
    const overlap = getOverlap(projA, projB)
    const isSeparating = overlap < 0

    axes.push({
      axis, edgeStart: start, edgeEnd: end,
      sourcePolygon: 'B', projA, projB, overlap, isSeparating,
    })

    if (isSeparating && separatingAxisIndex === null) {
      separatingAxisIndex = axes.length - 1
    }
    if (overlap < minOverlap) {
      minOverlap = overlap
      mtvAxis = axis
    }
  }

  const colliding = separatingAxisIndex === null

  return {
    colliding,
    axes,
    separatingAxisIndex,
    minOverlap: colliding ? minOverlap : 0,
    mtv: colliding && mtvAxis ? { x: mtvAxis.x * minOverlap, y: mtvAxis.y * minOverlap } : null,
  }
}

/** 단계별 SAT — step번째 축까지만 검사 (애니메이션용) */
export function testSATStep(polygonA: Polygon, polygonB: Polygon, step: number): SATResult {
  const fullResult = testSAT(polygonA, polygonB)
  const limitedAxes = fullResult.axes.slice(0, step + 1)
  const separating = limitedAxes.findIndex(a => a.isSeparating)

  return {
    ...fullResult,
    axes: limitedAxes,
    separatingAxisIndex: separating >= 0 ? separating : null,
    colliding: separating < 0 && limitedAxes.length === fullResult.axes.length,
  }
}
