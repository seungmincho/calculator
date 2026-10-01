// 수평계 순수 계산. 모든 기울기는 "위쪽 방향 벡터 u"(기기 좌표계, 단위벡터)로 다룬다.
// 기기 좌표계(W3C DeviceOrientation): x = 화면 오른쪽, y = 화면 위쪽, z = 화면 밖(사용자 쪽).
// Euler(beta, gamma)는 세운 자세(beta≈90)에서 짐벌락으로 튀지만 u는 연속이라
// 필터·보정·판정을 전부 u로 한다.

export type Vec3 = [number, number, number]

const D = Math.PI / 180
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v))

export const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** beta/gamma(도) → 기기 좌표계에서의 위쪽(중력 반대) 단위벡터. R = Rz(α)·Rx(β)·Ry(γ)의 3행. */
export function upVector(beta: number, gamma: number): Vec3 {
  const b = beta * D, g = gamma * D
  return [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)]
}

/** 기기 좌표 → 화면 좌표(화면이 가로로 자동 회전된 경우). angle = screen.orientation.angle (반시계 회전 각). */
export function toScreen(u: Vec3, screenAngle: number): Vec3 {
  const a = screenAngle * D, c = Math.cos(a), s = Math.sin(a)
  return [u[0] * c - u[1] * s, u[0] * s + u[1] * c, u[2]]
}

/** 1차 저역통과 필터 (시간 상수 tau초, 이벤트 주기와 무관하게 같은 반응 속도). */
export function lowPass(prev: Vec3 | null, next: Vec3, dt: number, tau = 0.25): Vec3 {
  if (!prev) return next
  const k = 1 - Math.exp(-Math.max(0, dt) / tau)
  return norm([prev[0] + k * (next[0] - prev[0]), prev[1] + k * (next[1] - prev[1]), prev[2] + k * (next[2] - prev[2])])
}

/** 바닥에 눕혀 쓰는 모드: 화면 오른쪽 변/위쪽 변의 높이 각(+면 그쪽이 높음), 전체 기울기. */
export function surfaceReading(s: Vec3) {
  return {
    x: Math.asin(clamp1(s[0])) / D,
    y: Math.asin(clamp1(s[1])) / D,
    total: Math.acos(clamp1(s[2])) / D,
  }
}

/**
 * 모서리를 대는 모드: 폰을 세워 한 변을 면에 댄다. 가장 가까운 화면 축(세로/가로)을 자동 감지.
 * vertical=false → 화면 가로 변이 수평 기준, offset>0 이면 오른쪽 끝이 높음.
 * vertical=true  → 화면 세로 변이 수평 기준, offset>0 이면 위쪽 끝이 높음.
 * upright: 폰이 충분히 세워져 있는지(눕혀 있으면 화면 평면 각도가 무의미).
 */
export function edgeReading(s: Vec3) {
  const r = Math.hypot(s[0], s[1])
  const phi = Math.atan2(s[0], s[1]) / D // 화면 위쪽이 하늘에서 몇 도 돌아갔나
  const k = Math.round(phi / 90)
  const vertical = Math.abs(k) % 2 === 1
  const offset = r === 0 ? 0 : Math.asin(clamp1((vertical ? s[1] : s[0]) / r)) / D
  return { offset, abs: Math.abs(offset), vertical, upright: r >= 0.5 }
}

export const slopePercent = (deg: number) => Math.tan(deg * D) * 100
export const mmPerMeter = (deg: number) => Math.tan(deg * D) * 1000
/** 0.1° 표시 기준 ±0.2° 이내면 수평. */
export const isLevel = (deg: number, tol = 0.2) => Math.round(Math.abs(deg) * 10) / 10 <= tol

/** 버블 위치용 비선형 눈금: 0°부근을 크게 보여준다. 1°→0.25, 3°→0.5, 10°→0.77, 상한 1. */
export const bubbleScale = (deg: number) => deg / (Math.abs(deg) + 3)

// ── 보정 ──
// 센서 오차는 기기에 고정된 작은 회전으로 본다. 자세(눕힘/세움)마다 따로 저장: 가장 가까운 기기 축이 키.
export type AxisKey = '+x' | '-x' | '+y' | '-y' | '+z' | '-z'
export type Calibration = Partial<Record<AxisKey, Vec3>>

export function nearestAxis(u: Vec3): { key: AxisKey; axis: Vec3 } {
  let i = 0
  for (let j = 1; j < 3; j++) if (Math.abs(u[j]) > Math.abs(u[i])) i = j
  const sign = u[i] >= 0 ? 1 : -1
  const axis: Vec3 = [0, 0, 0]
  axis[i] = sign
  return { key: `${sign > 0 ? '+' : '-'}${'xyz'[i]}` as AxisKey, axis }
}

/**
 * 뒤집기 보정: 같은 자리에서 측정 → 180° 돌려 다시 측정. 면의 기울기는 부호가 바뀌고 센서 오차는 그대로라
 * 두 벡터의 평균 방향 = "진짜 수평일 때 센서가 내는 값". 수평이 아닌 면에서도 정확하다.
 */
export const reversalZero = (u1: Vec3, u2: Vec3): Vec3 => norm([u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]])

/** from을 to로 보내는 회전을 v에 적용 (Rodrigues). */
export function rotateFromTo(v: Vec3, from: Vec3, to: Vec3): Vec3 {
  const k: Vec3 = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]]
  const sin = Math.hypot(k[0], k[1], k[2])
  const cos = from[0] * to[0] + from[1] * to[1] + from[2] * to[2]
  if (sin < 1e-9) return v // 같은 방향(보정 0)
  const n: Vec3 = [k[0] / sin, k[1] / sin, k[2] / sin]
  const nxv: Vec3 = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]]
  const nv = n[0] * v[0] + n[1] * v[1] + n[2] * v[2]
  return [0, 1, 2].map(i => v[i] * cos + nxv[i] * sin + n[i] * nv * (1 - cos)) as Vec3
}

export function applyCalibration(u: Vec3, cal: Calibration): Vec3 {
  const { key, axis } = nearestAxis(u)
  const zero = cal[key]
  return zero ? rotateFromTo(u, zero, axis) : u
}

/** localStorage 값 검증 (손상/조작된 값 무시). */
export function parseCalibration(raw: string | null): Calibration {
  try {
    const o = JSON.parse(raw ?? '{}')
    const out: Calibration = {}
    for (const k of ['+x', '-x', '+y', '-y', '+z', '-z'] as AxisKey[]) {
      const v = o?.[k]
      if (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite) && nearestAxis(v as Vec3).key === k) out[k] = norm(v as Vec3)
    }
    return out
  } catch {
    return {}
  }
}

// ── 나침반 ──
/**
 * 방위각(시계방향, 북=0). iOS: webkitCompassHeading(이미 시계방향). Android: absolute 이벤트의 alpha는 반시계라 360-alpha.
 * absolute가 아닌 alpha는 임의 기준이라 null. 화면이 가로로 돌면 화면 위쪽 기준으로 보정.
 */
export function compassHeading(alpha: number | null, absolute: boolean, webkitHeading: number | undefined, screenAngle: number): number | null {
  let h: number
  if (typeof webkitHeading === 'number' && webkitHeading >= 0) h = webkitHeading
  else if (absolute && alpha != null) h = 360 - alpha
  else return null
  return (((h + screenAngle) % 360) + 360) % 360
}

/** 각도 저역통과 (359°↔0° 경계 처리). */
export function smoothAngle(prev: number | null, next: number, dt: number, tau = 0.3): number {
  if (prev == null) return next
  const k = 1 - Math.exp(-Math.max(0, dt) / tau)
  const diff = ((next - prev + 540) % 360) - 180
  return (((prev + k * diff) % 360) + 360) % 360
}

export function compassKey(h: number): string {
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(h / 45) % 8]
}
