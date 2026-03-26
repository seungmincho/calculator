// 공용 기하 유틸리티 — 벡터 연산, 내적, 정규화

export interface Vec2 {
  x: number
  y: number
}

export interface Polygon {
  vertices: Vec2[]
  position: Vec2
  rotation: number // radians
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function perpendicular(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x }
}

export function rotatePoint(point: Vec2, angle: number, center: Vec2 = { x: 0, y: 0 }): Vec2 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

/** 폴리곤의 월드 좌표 꼭짓점 반환 (position + rotation 적용) */
export function getWorldVertices(polygon: Polygon): Vec2[] {
  return polygon.vertices.map(v =>
    rotatePoint(add(v, polygon.position), polygon.rotation, polygon.position)
  )
}

/** 정다각형 꼭짓점 생성 */
export function createRegularPolygon(sides: number, radius: number): Vec2[] {
  const vertices: Vec2[] = []
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    vertices.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    })
  }
  return vertices
}

/** 폴리곤 중심 계산 */
export function centroid(vertices: Vec2[]): Vec2 {
  const sum = vertices.reduce((acc, v) => add(acc, v), { x: 0, y: 0 })
  return scale(sum, 1 / vertices.length)
}
