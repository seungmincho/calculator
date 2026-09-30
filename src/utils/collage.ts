/**
 * 사진 콜라주 순수 로직 (레이아웃 → 칸 좌표, cover-fit + 이동/확대 clamp).
 * 검증: node scripts/check-collage.ts
 */

export interface Rect { x: number; y: number; w: number; h: number }

/** 격자 단위 칸: c,r = 시작 열/행, cs,rs = 차지하는 열/행 수 (기본 1) */
type GridCell = [c: number, r: number, cs?: number, rs?: number]

export interface LayoutDef {
  id: string
  n: number
  cols: number
  rows: number
  cells: GridCell[]
}

const grid = (id: string, cols: number, rows: number): LayoutDef => {
  const cells: GridCell[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r])
  return { id, n: cells.length, cols, rows, cells }
}
const custom = (id: string, cols: number, rows: number, cells: GridCell[]): LayoutDef =>
  ({ id, n: cells.length, cols, rows, cells })

export const LAYOUTS: LayoutDef[] = [
  grid('one', 1, 1),
  grid('h2', 2, 1),
  grid('v2', 1, 2),
  grid('h3', 3, 1),
  grid('v3', 1, 3),
  custom('l1r2', 2, 2, [[0, 0, 1, 2], [1, 0], [1, 1]]),
  custom('t1b2', 2, 2, [[0, 0, 2, 1], [0, 1], [1, 1]]),
  grid('g4', 2, 2),
  grid('strip4', 1, 4),
  custom('t1b3', 3, 3, [[0, 0, 3, 2], [0, 2], [1, 2], [2, 2]]),
  custom('l1r3', 3, 3, [[0, 0, 2, 3], [2, 0], [2, 1], [2, 2]]),
  custom('t2b3', 6, 2, [[0, 0, 3, 1], [3, 0, 3, 1], [0, 1, 2, 1], [2, 1, 2, 1], [4, 1, 2, 1]]),
  custom('l1g4', 4, 2, [[0, 0, 2, 2], [2, 0], [3, 0], [2, 1], [3, 1]]),
  grid('g6', 3, 2),
  grid('g6v', 2, 3),
  custom('b1s5', 3, 3, [[0, 0, 2, 2], [2, 0], [2, 1], [0, 2], [1, 2], [2, 2]]),
  custom('t1g6', 3, 3, [[0, 0, 3, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]),
  grid('g8', 2, 4),
  grid('g9', 3, 3),
]

export const getLayout = (id: string): LayoutDef => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[7]

const DEFAULT_BY_COUNT: Record<number, string> = {
  1: 'one', 2: 'h2', 3: 'l1r2', 4: 'g4', 5: 't2b3', 6: 'g6', 7: 't1g6', 8: 'g8', 9: 'g9',
}
/** 사진 수에 맞는 기본 레이아웃 (0장 → 4분할, 10장 이상 → 9분할) */
export const layoutForCount = (count: number): LayoutDef =>
  getLayout(DEFAULT_BY_COUNT[Math.min(Math.max(count, 0), 9)] ?? 'g4')

/**
 * 칸 좌표(px). gap은 칸 사이 + 바깥 테두리 모두 같은 두께.
 * footer > 0 이면 아래쪽 footer px 영역을 비워둔다(문구용). 그때 사진 영역 아래 여백은 gap 대신 0.
 * 정규화 경계 u → u*(span - gap) 로 매핑하고 왼쪽/위 경계에 gap을 더하면 인접 칸 사이가 정확히 gap.
 */
export function cellRects(layout: LayoutDef, W: number, H: number, gap: number, footer = 0): Rect[] {
  const areaH = footer > 0 ? H - footer + gap : H
  const mx = (u: number) => u * (W - gap)
  const my = (u: number) => u * (areaH - gap)
  return layout.cells.map(([c, r, cs = 1, rs = 1]) => {
    const x = mx(c / layout.cols) + gap
    const y = my(r / layout.rows) + gap
    return { x, y, w: Math.max(0, mx((c + cs) / layout.cols) - x), h: Math.max(0, my((r + rs) / layout.rows) - y) }
  })
}

export const hitTest = (rects: Rect[], x: number, y: number): number =>
  rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)

/** z: 확대(1 = 칸을 꽉 채우는 cover), fx/fy: 넘치는 부분 중 어디를 보여줄지 0..1 (0.5 = 가운데) */
export interface Transform { z: number; fx: number; fy: number }
export const FIT: Transform = { z: 1, fx: 0.5, fy: 0.5 }
export const MAX_ZOOM = 5

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 칸(cw×ch) 안에 이미지(iw×ih)를 그릴 위치/크기 (칸 좌상단 기준). 항상 칸을 덮는다. */
export function coverPlacement(iw: number, ih: number, cw: number, ch: number, t: Transform) {
  const s = Math.max(cw / iw, ch / ih) * clamp(t.z, 1, MAX_ZOOM)
  const dw = iw * s, dh = ih * s
  return { dx: (cw - dw) * clamp(t.fx, 0, 1), dy: (ch - dh) * clamp(t.fy, 0, 1), dw, dh }
}

/** 칸 좌표계에서 (dx,dy)px 만큼 끌었을 때의 새 변환. 넘치는 부분이 없으면 그 축은 가운데 고정. */
export function panBy(t: Transform, dx: number, dy: number, iw: number, ih: number, cw: number, ch: number): Transform {
  const { dw, dh } = coverPlacement(iw, ih, cw, ch, t)
  const ox = dw - cw, oy = dh - ch
  return {
    z: t.z,
    fx: ox > 0.5 ? clamp(t.fx - dx / ox, 0, 1) : 0.5,
    fy: oy > 0.5 ? clamp(t.fy - dy / oy, 0, 1) : 0.5,
  }
}

export const zoomTo = (t: Transform, z: number): Transform => ({ ...t, z: clamp(z, 1, MAX_ZOOM) })

/** 비율(가로/세로)과 긴 변 px → 캔버스 크기(정수) */
export function canvasSize(ratio: number, longSide: number): { w: number; h: number } {
  if (!(ratio > 0)) ratio = 1
  return ratio >= 1
    ? { w: longSide, h: Math.round(longSide / ratio) }
    : { w: Math.round(longSide * ratio), h: longSide }
}

/** 배경색이 어두우면 true (문구 색 자동 결정) */
export function isDark(hex: string): boolean {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return false
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16))
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}
