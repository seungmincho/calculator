// 인테리어 자재 계산 순수 로직. 규격·도포율은 "일반 규격" 기본값 — 제품별로 다르므로 모두 입력으로 덮어쓸 수 있음.
import { toM2 } from './pyeong.ts'

export type WallFinish = 'wallpaper' | 'paint' | 'tile' | 'none'
export type FloorFinish = 'vinyl' | 'laminate' | 'tile' | 'none'
export type CeilFinish = 'wallpaper' | 'paint' | 'none'

export interface Room {
  name: string
  /** 'dim' = 가로×세로 입력, 'pyeong' = 평수 입력(가로:세로 1.25:1 가정으로 둘레 추정) */
  mode: 'dim' | 'pyeong'
  w: number
  l: number
  pyeong: number
  h: number
  doors: number
  doorW: number
  doorH: number
  wins: number
  winW: number
  winH: number
  /** 붙박이장 등 기타 공제 ㎡ */
  extra: number
  wall: WallFinish
  floor: FloorFinish
  ceil: CeilFinish
}

export const room = (name: string, w: number, l: number, o: Partial<Room> = {}): Room => ({
  name, mode: 'dim', w, l, pyeong: 3, h: 2.3,
  doors: 1, doorW: 0.9, doorH: 2.1, wins: 1, winW: 1.5, winH: 1.2, extra: 0,
  wall: 'wallpaper', floor: 'laminate', ceil: 'wallpaper', ...o,
})

const BATH: Partial<Room> = { wall: 'tile', floor: 'tile', ceil: 'none', wins: 0, doorW: 0.7 }
// 대략적인 방 구성(추정). name = 번역 키(roomNames.*), 컴포넌트가 적용 시 번역. 공급 24평 ≈ 전용 59㎡, 32평 ≈ 전용 84㎡
export const PRESETS: Record<'oneRoom' | 'apt24' | 'apt32', Room[]> = {
  oneRoom: [room('room', 4.5, 3.6), room('bath', 1.8, 1.5, BATH)],
  apt24: [
    room('living', 4.4, 3.6, { doors: 0, wins: 1, winW: 2.4, winH: 2.1 }),
    room('master', 3.6, 3.3),
    room('room2', 3.0, 2.7),
    room('room3', 2.7, 2.4),
    room('kitchen', 3.3, 2.4, { doors: 0 }),
    room('bath', 2.1, 1.5, BATH),
  ],
  apt32: [
    room('living', 5.4, 4.0, { doors: 0, wins: 1, winW: 3.0, winH: 2.1 }),
    room('master', 4.0, 3.6),
    room('room2', 3.3, 3.0),
    room('room3', 3.0, 2.7),
    room('kitchen', 3.6, 3.0, { doors: 0 }),
    room('bath', 2.1, 1.6, BATH),
    room('bath2', 1.8, 1.5, BATH),
  ],
}

const ASPECT = 1.25
/** 평수 모드면 1.25:1 직사각형으로 가로·세로 추정 */
export function dims(r: Room): { w: number; l: number } {
  if (r.mode === 'dim') return { w: Math.max(0, r.w), l: Math.max(0, r.l) }
  const a = toM2(Math.max(0, r.pyeong))
  const s = Math.sqrt(a / ASPECT)
  return { w: s * ASPECT, l: s }
}

export interface Areas { floor: number; perimeter: number; wallGross: number; openings: number; wallNet: number; doorWidth: number }

export function areas(r: Room): Areas {
  const { w, l } = dims(r)
  const perimeter = 2 * (w + l)
  const wallGross = perimeter * Math.max(0, r.h)
  const openings = r.doors * r.doorW * r.doorH + r.wins * r.winW * r.winH + Math.max(0, r.extra)
  return {
    floor: w * l, perimeter, wallGross, openings,
    wallNet: Math.max(0, wallGross - openings),
    doorWidth: r.doors * r.doorW,
  }
}

/** 벽지 폭(재단) 한 장 길이: 높이 + 위아래 재단여유, 무늬 반복이 있으면 반복 단위 배수로 올림 */
export function stripLength(height: number, repeat: number, trim = 0.1): number {
  const raw = height + trim
  return repeat > 0 ? Math.ceil(raw / repeat - 1e-9) * repeat : raw
}

/** 롤 하나에서 나오는 폭(장) 수 */
export const stripsPerRoll = (rollLen: number, strip: number) => (strip > 0 ? Math.floor(rollLen / strip + 1e-9) : 0)

/**
 * 벽 도배 폭 수: 순 벽면적을 (롤 폭 × 층고)로 나눠 올림. 문·창 위아래 짧은 조각은 롤 자투리로 충당한다고 가정.
 * ponytail: 벽별 전개도 계산 아님 — 코너·자투리 배치까지 보려면 벽 단위 입력 필요.
 */
export function wallStrips(wallNet: number, height: number, rollW: number): number {
  if (!(rollW > 0) || !(height > 0) || wallNet <= 0) return 0
  return Math.ceil(wallNet / (rollW * height) - 1e-9)
}

/** 천장 도배: 짧은 변을 가로질러 폭을 나란히 붙임 → 폭 수 = ceil(긴변/롤폭), 길이 = 짧은변+여유 */
export function ceilingStrips(w: number, l: number, rollW: number) {
  const long = Math.max(w, l), short = Math.min(w, l)
  return { count: rollW > 0 && short > 0 ? Math.ceil(long / rollW - 1e-9) : 0, len: short + 0.1 }
}

/** 방별 필요 폭을 롤 단위(소수)로 합산 후 여유율 적용해 올림. 롤은 방 사이에서 이어 쓴다고 가정 */
export function rollsFor(parts: { strips: number; len: number }[], rollLen: number, loss: number): number {
  let rolls = 0
  for (const p of parts) {
    if (p.strips <= 0) continue
    const per = stripsPerRoll(rollLen, p.len)
    if (per === 0) return Infinity // 롤보다 긴 폭 — 규격 오류
    rolls += p.strips / per
  }
  return rolls > 0 ? Math.ceil(rolls * (1 + loss) - 1e-9) : 0
}

/** 페인트 필요 L = 면적 × 도장 횟수 ÷ 도포율(㎡/L/1회) × (1+여유) */
export const paintLiters = (area: number, coats: number, coverage: number, loss: number) =>
  coverage > 0 ? (area * coats / coverage) * (1 + loss) : 0

// 가격 미입력 시 캔 조합 선택용 상대 단가(큰 통일수록 L당 저렴). ponytail: 추정 비율, 실제 가격 입력하면 그걸로 최적화
const REL_PER_L: Record<number, number> = { 18: 1, 4: 1.25, 1: 1.6 }

export interface CanPick { size: number; count: number }
/**
 * 필요 L 이상을 만족하는 캔 조합 중 비용 최소(동률이면 총 용량↓, 캔 수↓).
 * prices[i] ≤ 0 이 하나라도 있으면 상대 단가표로 비교.
 */
export function bestCans(need: number, sizes: number[] = [18, 4, 1], prices: number[] = []): { picks: CanPick[]; liters: number; cost: number } {
  const useReal = prices.length === sizes.length && prices.every((p) => p > 0)
  const unit = (i: number) => (useReal ? prices[i] : sizes[i] * (REL_PER_L[sizes[i]] ?? 1.3))
  if (!(need > 0)) return { picks: [], liters: 0, cost: 0 }
  let best: { counts: number[]; cost: number; vol: number; n: number } | null = null
  const counts = new Array(sizes.length).fill(0)
  const rec = (i: number, rest: number) => {
    if (i === sizes.length - 1) {
      counts[i] = Math.max(0, Math.ceil(rest / sizes[i] - 1e-9))
      const cost = counts.reduce((s, c, k) => s + c * unit(k), 0)
      const vol = counts.reduce((s, c, k) => s + c * sizes[k], 0)
      const n = counts.reduce((s, c) => s + c, 0)
      if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && (vol < best.vol || (vol === best.vol && n < best.n))))
        best = { counts: [...counts], cost, vol, n }
      return
    }
    const max = Math.max(0, Math.ceil(rest / sizes[i] - 1e-9))
    for (let c = 0; c <= max; c++) { counts[i] = c; rec(i + 1, rest - c * sizes[i]) }
    counts[i] = 0
  }
  rec(0, need)
  const b = best as unknown as { counts: number[]; vol: number }
  return {
    picks: sizes.map((size, i) => ({ size, count: b.counts[i] })).filter((p) => p.count > 0),
    liters: b.vol,
    cost: useReal ? b.counts.reduce((s, c, k) => s + c * prices[k], 0) : 0,
  }
}

/** 장판(롤 시트): 가로/세로 두 방향 중 짧은 총길이(m). 각 폭 길이 + 10cm 여유 */
export function vinylMeters(w: number, l: number, rollW: number): number {
  if (!(rollW > 0) || w <= 0 || l <= 0) return 0
  const a = Math.ceil(w / rollW - 1e-9) * (l + 0.1)
  const b = Math.ceil(l / rollW - 1e-9) * (w + 0.1)
  return Math.min(a, b)
}

/** 박스 단위 자재(강마루 등): ceil(면적×(1+로스)/박스㎡) */
export const boxes = (area: number, perBox: number, loss: number) =>
  perBox > 0 && area > 0 ? Math.ceil(area * (1 + loss) / perBox - 1e-9) : 0

/** 타일 장수: 면적×(1+로스) ÷ (타일+줄눈) 면적. 크기 mm */
export function tileCount(area: number, wMm: number, hMm: number, groutMm: number, loss: number): number {
  const cell = ((wMm + groutMm) / 1000) * ((hMm + groutMm) / 1000)
  return cell > 0 && area > 0 ? Math.ceil(area * (1 + loss) / cell - 1e-9) : 0
}

/** 막대 자재(걸레받이·몰딩) 개수: 길이×(1+로스)÷1본 길이 */
export const sticks = (len: number, stick: number, loss: number) =>
  stick > 0 && len > 0 ? Math.ceil(len * (1 + loss) / stick - 1e-9) : 0

// ── 자재 규격/설정 ──
export type PaperKind = 'silk' | 'wideHapji' | 'hapji' | 'custom'
// 일반 규격(제품별 상이): 실크 1.06×15.6m, 광폭합지 0.93×17.75m (둘 다 1롤≈5평 벽면), 소폭합지 0.53×12.5m
export const PAPER_SPECS: Record<Exclude<PaperKind, 'custom'>, { w: number; len: number }> = {
  silk: { w: 1.06, len: 15.6 },
  wideHapji: { w: 0.93, len: 17.75 },
  hapji: { w: 0.53, len: 12.5 },
}

export interface TileSpec { w: number; h: number; perBox: number; price: number }

export interface Settings {
  paper: PaperKind
  paperW: number
  paperLen: number
  repeat: number
  paperLoss: number
  paperPrice: number
  coverage: number
  coats: number
  paintLoss: number
  can18: number
  can4: number
  can1: number
  vinylW: number
  vinylPrice: number
  lamBox: number
  lamLoss: number
  lamPrice: number
  wallTile: TileSpec
  floorTile: TileSpec
  grout: number
  tileLoss: number
  baseboard: boolean
  molding: boolean
  stickLen: number
  baseboardPrice: number
  moldingPrice: number
}

export const DEFAULT_SETTINGS: Settings = {
  paper: 'silk', paperW: 1.06, paperLen: 15.6, repeat: 0, paperLoss: 0.05, paperPrice: 0,
  coverage: 10, coats: 2, paintLoss: 0.05, can18: 0, can4: 0, can1: 0,
  vinylW: 1.8, vinylPrice: 0,
  lamBox: 3.3, lamLoss: 0.05, lamPrice: 0,
  wallTile: { w: 300, h: 600, perBox: 8, price: 0 },
  floorTile: { w: 300, h: 300, perBox: 11, price: 0 },
  grout: 3, tileLoss: 0.1,
  baseboard: true, molding: true, stickLen: 2.4, baseboardPrice: 0, moldingPrice: 0,
}

export const paperSize = (s: Settings) => (s.paper === 'custom' ? { w: s.paperW, len: s.paperLen } : PAPER_SPECS[s.paper])

export interface Line { key: 'paper' | 'paint' | 'vinyl' | 'laminate' | 'wallTile' | 'floorTile' | 'baseboard' | 'molding'; qty: number; area: number; cost: number; cans?: CanPick[]; liters?: number; boxes?: number }

export interface Totals {
  floor: number
  wallNet: number
  ceiling: number
  lines: Line[]
  cost: number
  /** 가격 미입력 자재가 있으면 true (총액이 부분합) */
  partial: boolean
}

export function calculate(rooms: Room[], s: Settings): Totals {
  const { w: rollW, len: rollLen } = paperSize(s)
  const paperParts: { strips: number; len: number }[] = []
  let paperArea = 0, paintArea = 0, vinylM = 0, vinylArea = 0, lamArea = 0, wallTileArea = 0, floorTileArea = 0
  let baseLen = 0, moldLen = 0, floor = 0, wallNet = 0, ceiling = 0
  for (const r of rooms) {
    const a = areas(r)
    const { w, l } = dims(r)
    floor += a.floor
    wallNet += a.wallNet
    if (r.ceil !== 'none') ceiling += a.floor
    if (r.wall === 'wallpaper') {
      paperParts.push({ strips: wallStrips(a.wallNet, r.h, rollW), len: stripLength(r.h, s.repeat) })
      paperArea += a.wallNet
    } else if (r.wall === 'paint') paintArea += a.wallNet
    else if (r.wall === 'tile') wallTileArea += a.wallNet
    if (r.ceil === 'wallpaper') {
      const c = ceilingStrips(w, l, rollW)
      paperParts.push({ strips: c.count, len: c.len }) // 천장은 무늬 맞춤 생략
      paperArea += a.floor
    } else if (r.ceil === 'paint') paintArea += a.floor
    if (r.floor === 'vinyl') { vinylM += vinylMeters(w, l, s.vinylW); vinylArea += a.floor }
    else if (r.floor === 'laminate') lamArea += a.floor
    else if (r.floor === 'tile') floorTileArea += a.floor
    if (r.wall !== 'tile') {
      baseLen += Math.max(0, a.perimeter - a.doorWidth)
      if (r.ceil !== 'none') moldLen += a.perimeter
    }
  }
  const lines: Line[] = []
  let cost = 0, partial = false
  const add = (line: Line, priced: boolean) => {
    if (line.qty <= 0) return
    lines.push(line)
    cost += line.cost
    if (!priced) partial = true
  }
  const rolls = rollsFor(paperParts, rollLen, s.paperLoss)
  add({ key: 'paper', qty: rolls, area: paperArea, cost: rolls * s.paperPrice }, s.paperPrice > 0)
  const liters = paintLiters(paintArea, s.coats, s.coverage, s.paintLoss)
  const cans = bestCans(liters, [18, 4, 1], [s.can18, s.can4, s.can1])
  add({ key: 'paint', qty: cans.picks.reduce((n, p) => n + p.count, 0), area: paintArea, cost: cans.cost, cans: cans.picks, liters }, cans.cost > 0)
  const vm = Math.ceil(vinylM * 10 - 1e-9) / 10
  add({ key: 'vinyl', qty: vm, area: vinylArea, cost: Math.ceil(vm) * s.vinylPrice }, s.vinylPrice > 0)
  const lb = boxes(lamArea, s.lamBox, s.lamLoss)
  add({ key: 'laminate', qty: lb, area: lamArea, cost: lb * s.lamPrice }, s.lamPrice > 0)
  for (const [key, spec, area] of [['wallTile', s.wallTile, wallTileArea], ['floorTile', s.floorTile, floorTileArea]] as const) {
    const n = tileCount(area, spec.w, spec.h, s.grout, s.tileLoss)
    const bx = spec.perBox > 0 ? Math.ceil(n / spec.perBox) : 0
    add({ key, qty: n, area, boxes: bx, cost: bx * spec.price }, spec.price > 0)
  }
  if (s.baseboard) {
    const n = sticks(baseLen, s.stickLen, 0.1)
    add({ key: 'baseboard', qty: n, area: baseLen, cost: n * s.baseboardPrice }, s.baseboardPrice > 0)
  }
  if (s.molding) {
    const n = sticks(moldLen, s.stickLen, 0.1)
    add({ key: 'molding', qty: n, area: moldLen, cost: n * s.moldingPrice }, s.moldingPrice > 0)
  }
  return { floor, wallNet, ceiling, lines, cost, partial }
}

// ── URL 상태 (base64url JSON, 신뢰 불가 입력 검증) ──
const WALLS: WallFinish[] = ['wallpaper', 'paint', 'tile', 'none']
const FLOORS: FloorFinish[] = ['vinyl', 'laminate', 'tile', 'none']
const CEILS: CeilFinish[] = ['wallpaper', 'paint', 'none']
const PAPERS: PaperKind[] = ['silk', 'wideHapji', 'hapji', 'custom']
export const MAX_ROOMS = 12

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : d)
const pick = <T,>(v: unknown, list: T[], d: T) => (list.includes(v as T) ? (v as T) : d)

export function encodeState(rooms: Room[], s: Settings): string {
  return toB64(JSON.stringify([1, rooms.map((r) => [r.name, r.mode === 'dim' ? 0 : 1, r.w, r.l, r.pyeong, r.h, r.doors, r.doorW, r.doorH, r.wins, r.winW, r.winH, r.extra,
    WALLS.indexOf(r.wall), FLOORS.indexOf(r.floor), CEILS.indexOf(r.ceil)]), s]))
}

export function decodeState(str: string | null): { rooms: Room[]; settings: Settings } | null {
  if (!str) return null
  try {
    const a = JSON.parse(fromB64(str))
    if (!Array.isArray(a) || a[0] !== 1 || !Array.isArray(a[1])) return null
    const rooms: Room[] = a[1].slice(0, MAX_ROOMS).filter(Array.isArray).map((x: unknown[]) => ({
      name: typeof x[0] === 'string' ? x[0].slice(0, 20) : '',
      mode: x[1] === 1 ? 'pyeong' : 'dim',
      w: num(x[2], 0, 100, 3), l: num(x[3], 0, 100, 3), pyeong: num(x[4], 0, 500, 3), h: num(x[5], 0, 10, 2.3),
      doors: num(x[6], 0, 20, 0), doorW: num(x[7], 0, 5, 0.9), doorH: num(x[8], 0, 5, 2.1),
      wins: num(x[9], 0, 20, 0), winW: num(x[10], 0, 10, 1.5), winH: num(x[11], 0, 5, 1.2), extra: num(x[12], 0, 500, 0),
      wall: WALLS[num(x[13], 0, 3, 0)], floor: FLOORS[num(x[14], 0, 3, 1)], ceil: CEILS[num(x[15], 0, 2, 0)],
    }))
    if (!rooms.length) return null
    const r = (a[2] ?? {}) as Record<string, unknown>
    const D = DEFAULT_SETTINGS
    const tile = (v: unknown, d: TileSpec): TileSpec => {
      const o = (v ?? {}) as Record<string, unknown>
      return { w: num(o.w, 1, 3000, d.w), h: num(o.h, 1, 3000, d.h), perBox: num(o.perBox, 0, 1000, d.perBox), price: num(o.price, 0, 1e8, d.price) }
    }
    const settings: Settings = {
      paper: pick(r.paper, PAPERS, D.paper), paperW: num(r.paperW, 0.1, 5, D.paperW), paperLen: num(r.paperLen, 1, 100, D.paperLen),
      repeat: num(r.repeat, 0, 2, 0), paperLoss: num(r.paperLoss, 0, 0.5, D.paperLoss), paperPrice: num(r.paperPrice, 0, 1e8, 0),
      coverage: num(r.coverage, 0.5, 50, D.coverage), coats: num(r.coats, 1, 5, D.coats), paintLoss: num(r.paintLoss, 0, 0.5, D.paintLoss),
      can18: num(r.can18, 0, 1e8, 0), can4: num(r.can4, 0, 1e8, 0), can1: num(r.can1, 0, 1e8, 0),
      vinylW: num(r.vinylW, 0.5, 5, D.vinylW), vinylPrice: num(r.vinylPrice, 0, 1e8, 0),
      lamBox: num(r.lamBox, 0.1, 20, D.lamBox), lamLoss: num(r.lamLoss, 0, 0.5, D.lamLoss), lamPrice: num(r.lamPrice, 0, 1e8, 0),
      wallTile: tile(r.wallTile, D.wallTile), floorTile: tile(r.floorTile, D.floorTile),
      grout: num(r.grout, 0, 20, D.grout), tileLoss: num(r.tileLoss, 0, 0.5, D.tileLoss),
      baseboard: r.baseboard !== false, molding: r.molding !== false, stickLen: num(r.stickLen, 0.5, 6, D.stickLen),
      baseboardPrice: num(r.baseboardPrice, 0, 1e8, 0), moldingPrice: num(r.moldingPrice, 0, 1e8, 0),
    }
    return { rooms, settings }
  } catch {
    return null
  }
}
