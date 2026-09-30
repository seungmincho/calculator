// 색각(색약) 테스트 — 가성동색표(pseudo-isochromatic plate) 절차적 생성 + 채점 순수 로직.
//
// 색 설계 원리 (Viénot, Brettel & Mollon 1999, "Digital video colourmaps for checking the
// legibility of displays by dichromats"):
//   선형 sRGB → LMS(Smith-Pokorny 기반) 로 바꾸면, 제1색맹(protan)은 L, 제2색맹(deutan)은 M,
//   제3색맹(tritan)은 S 원추세포 신호가 없다. 그래서 배경과 숫자가 "L 값만" 다르면 protan에게는
//   완전히 같은 색(혼동선 위의 두 점)이고, 정상 색각에게는 뚜렷이 다른 색이다.
//   점마다 곱하는 밝기 노이즈(선형 RGB 배율)는 LMS에서도 배율이라 혼동 관계를 깨지 않으면서,
//   "밝기 차이로 숫자를 읽는 것"을 막는다.
// 검증은 scripts/check-color-blind-test.ts 에서 Viénot 모델 + 독립 모델(Machado 2009)로 한다.

export type Vec3 = [number, number, number]
export type Observer = 'normal' | 'protan' | 'deutan' | 'tritan'
export type Deficiency = 'protan' | 'deutan' | 'tritan'
export type PlateKind = 'demo' | 'vanishing' | 'transform' | 'hidden' | 'classify' | 'tritan'
export const NONE = 'none' // "안 보임" 답

// ── 선형대수 ──
type M3 = [Vec3, Vec3, Vec3]
const mul = (m: M3, v: Vec3): Vec3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
function inv3(m: M3): M3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g
  const det = a * A + b * B + c * C
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ]
}

// ── sRGB ──
export const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
export const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)
export function hexToLinear(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16)
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)]
}
export function linearToHex(c: Vec3): string {
  return '#' + c.map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255).toString(16).padStart(2, '0')).join('')
}

// ── Viénot 1999 이색형 시뮬레이션 (선형 RGB 기준) ──
export const RGB2LMS: M3 = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
]
export const LMS2RGB = inv3(RGB2LMS)
export function simulate(lin: Vec3, obs: Observer): Vec3 {
  if (obs === 'normal') return lin
  const [l, m, s] = mul(RGB2LMS, lin)
  const lms: Vec3 =
    obs === 'protan' ? [2.02344 * m - 2.52581 * s, m, s]
    : obs === 'deutan' ? [l, 0.494207 * l + 1.24827 * s, s]
    : [l, m, TRITAN_A * l + TRITAN_B * m]
  return mul(LMS2RGB, lms)
}
// tritan: S 를 L·M 의 선형결합으로 대체. 흰색과 빨강 원색(≈660nm 앵커, Brettel 1997)을 보존하도록 계수를 푼다.
// (흔히 쓰이는 -0.395913L + 0.801109M 계수는 화면 밖 색을 만들어 여기선 쓰지 않음)
const [TRITAN_A, TRITAN_B] = (() => {
  const w = mul(RGB2LMS, [1, 1, 1]), r = mul(RGB2LMS, [1, 0, 0])
  const det = w[0] * r[1] - w[1] * r[0]
  return [(w[2] * r[1] - w[1] * r[2]) / det, (w[0] * r[2] - w[2] * r[0]) / det]
})()

// Machado, Oliveira & Fernandes 2009 (severity 1.0) — 검증용 독립 모델
export const MACHADO: Record<Deficiency, M3> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
}
export const simulateMachado = (lin: Vec3, obs: Observer): Vec3 => (obs === 'normal' ? lin : mul(MACHADO[obs], lin))

// ── OKLab (지각 균등 색공간, Björn Ottosson 2020) ──
export function oklab([r, g, b]: Vec3): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
export const deltaE = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

// 한 원추세포 신호만 바꾸는 선형 RGB 방향 = 그 결손형의 혼동선 방향
const coneAxis = (i: 0 | 1 | 2): Vec3 => [LMS2RGB[0][i], LMS2RGB[1][i], LMS2RGB[2][i]]
export const CONFUSION_AXIS: Record<Deficiency, Vec3> = { protan: coneAxis(0), deutan: coneAxis(1), tritan: coneAxis(2) }

// ── 난수 (시드 고정: 같은 판은 다시 그려도 똑같다) ──
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── 숫자 모양: 둥근 7세그먼트 (세그먼트 단위라 "정상은 74, 색약은 21" 변환판을 만들 수 있다) ──
type Seg = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'
const DIGIT_SEGS: Record<string, Seg[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'], '1': ['b', 'c'], '2': ['a', 'b', 'g', 'e', 'd'], '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'], '5': ['a', 'f', 'g', 'c', 'd'], '6': ['a', 'f', 'g', 'e', 'c', 'd'], '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'], '9': ['a', 'b', 'c', 'd', 'f', 'g'],
}
const CELL_W = 0.48, CELL_H = 1.08, CELL_GAP = 0.24, STROKE = 0.09, SKEW = 0.1
const SEG_PTS: Record<Seg, [number, number, number, number]> = {
  a: [0, -0.5, 1, -0.5], b: [1, -0.5, 1, 0], c: [1, 0, 1, 0.5], d: [0, 0.5, 1, 0.5],
  e: [0, 0, 0, 0.5], f: [0, -0.5, 0, 0], g: [0, 0, 1, 0],
}
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - x0 - t * dx, py - y0 - t * dy)
}

/** 판의 영역 색 정의 (선형 RGB). jitter: 혼동축 방향 색 흔들림 */
export interface Region { base: Vec3; axis?: Vec3; amp?: number; bimodal?: boolean; lum?: [number, number] }
/** 숫자 칸: n=정상이 보는 숫자, d=결손형이 보는 숫자. 세그먼트가 둘 다에 있으면 rc, n만 rn, d만 rd 영역 */
export interface Cell { n?: string; d?: string; rc: number; rn: number; rd: number }

export interface Plate {
  id: number
  kind: PlateKind
  target: Deficiency | null
  /** 정상 색각의 기대 답 (NONE = 안 보임) */
  normal: string
  /** 대상 결손형이 볼 것으로 예상되는 답 (분류판은 protanSees/deutanSees) */
  deficient: string
  protanSees?: string
  deutanSees?: string
  cells: Cell[]
  regions: Region[] // 0 = 배경
  seed: number
}

export function regionAt(p: Pick<Plate, 'cells'>, x: number, y: number): number {
  const n = p.cells.length
  const total = n * CELL_W + (n - 1) * CELL_GAP
  let best = 0
  for (let i = 0; i < n; i++) {
    const cell = p.cells[i]
    const ox = -total / 2 + i * (CELL_W + CELL_GAP)
    // 기울임(이탤릭) 보정 후 셀 좌표
    const ly = y / CELL_H
    const lx = (x - ox + SKEW * y) / CELL_W
    if (lx < -0.6 || lx > 1.6 || Math.abs(ly) > 0.8) continue
    const inN = new Set(cell.n ? DIGIT_SEGS[cell.n] : [])
    const inD = new Set(cell.d ? DIGIT_SEGS[cell.d] : [])
    for (const s of Object.keys(SEG_PTS) as Seg[]) {
      if (!inN.has(s) && !inD.has(s)) continue
      const [x0, y0, x1, y1] = SEG_PTS[s]
      const d = segDist(x - ox + SKEW * y, y, x0 * CELL_W, y0 * CELL_H, x1 * CELL_W, y1 * CELL_H)
      if (d > STROKE) continue
      best = inN.has(s) && inD.has(s) ? cell.rc : inN.has(s) ? cell.rn : cell.rd
      if (best) return best
    }
  }
  return best
}

// ── 점 배치: 크기가 다른 원을 겹치지 않게 채움 (단위 원 반지름 1) ──
export interface Dot { x: number; y: number; r: number; region: number; color: Vec3 }
const RADII = [0.036, 0.029, 0.024, 0.02, 0.016, 0.013, 0.01]
export const LUM_NOISE: [number, number] = [0.66, 1]

export function packDots(seed: number): { x: number; y: number; r: number }[] {
  const rand = rng(seed)
  const G = 0.11
  const grid = new Map<string, { x: number; y: number; r: number }[]>()
  const out: { x: number; y: number; r: number }[] = []
  const gap = 0.007
  for (const R of RADII) {
    for (let k = 0; k < 6000; k++) {
      const r = R * (0.88 + rand() * 0.24)
      const x = rand() * 2 - 1, y = rand() * 2 - 1
      if (Math.hypot(x, y) > 0.98 - r) continue
      const gx = Math.floor(x / G), gy = Math.floor(y / G)
      let ok = true
      for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) {
        for (const q of grid.get(`${gx + i},${gy + j}`) ?? []) {
          if (Math.hypot(q.x - x, q.y - y) < q.r + r + gap) { ok = false; break }
        }
      }
      if (!ok) continue
      const dot = { x, y, r }
      out.push(dot)
      const key = `${gx},${gy}`
      grid.set(key, [...(grid.get(key) ?? []), dot])
    }
  }
  return out
}

/** 판의 모든 점 + 색(선형 RGB, 클리핑 전) */
export function plateDots(p: Plate): Dot[] {
  const rand = rng(p.seed ^ 0x9e3779b9)
  return packDots(p.seed).map((d) => {
    const region = regionAt(p, d.x, d.y)
    const R = p.regions[region]
    let c = R.base
    if (R.axis && R.amp) {
      const j = R.bimodal ? (rand() < 0.5 ? -1 : 1) * (0.8 + rand() * 0.2) : rand() * 2 - 1
      c = add(c, R.axis, j * R.amp)
    }
    const [lo, hi] = R.lum ?? LUM_NOISE
    return { ...d, region, color: scale(c, lo + rand() * (hi - lo)) }
  })
}

// ── 색 설계 ──
// 기준색: 이시하라 판처럼 올리브·주황 계열 중간 밝기 (혼동축으로 ± 이동해도 sRGB 범위 안)
const BASE_RG = hexToLinear('#8e875a')
const BASE_T = hexToLinear('#8f8f8f')
const DEMO_FIG = hexToLinear('#2f3f7a') // 어두운 남색: 밝기·색 모두 달라 누구에게나 보임
/** 정상 색각 기준 OKLab 거리가 target 이 되도록 축 길이 조정 */
export function stepFor(base: Vec3, axis: Vec3, target: number, sign = 1): Vec3 {
  const unit = scale(axis, sign / Math.hypot(...axis))
  let lo = 0, hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (deltaE(oklab(base), oklab(add(base, unit, mid))) < target) lo = mid
    else hi = mid
  }
  return scale(unit, (lo + hi) / 2)
}
const unitAxis = (a: Vec3) => scale(a, 1 / Math.hypot(...a))
// 판 종류별 세기 (정상 색각 OKLab 거리). 0.1 ≈ 확연히 다른 색
export const STRENGTH = { vanish: 0.13, jitter: 0.25, transformU: 0.16, transformV: 0.055, hiddenU: 0.08, hiddenV: 0.06, tritan: 0.12 }

// protan 판: L만 증가(숫자가 붉게) / deutan 판: M만 감소(숫자가 분홍·자주빛)
const SIGN: Record<Deficiency, number> = { protan: 1, deutan: -1, tritan: 1 }
const figureStep = (def: Deficiency, base: Vec3, strength: number) => stepFor(base, CONFUSION_AXIS[def], strength, SIGN[def])
// 보조축 v: 청-황(S 원추) 방향 — protan·deutan 모두 볼 수 있다
const V_AXIS = CONFUSION_AXIS.tritan

function regionsFor(kind: PlateKind, target: Deficiency | null): Region[] {
  const jit = (def: Deficiency, base: Vec3, strength: number): Region => ({
    base, axis: unitAxis(CONFUSION_AXIS[def]), amp: Math.hypot(...figureStep(def, base, strength)) * STRENGTH.jitter,
  })
  switch (kind) {
    case 'demo': {
      // 밝기 자체가 다름(노이즈 범위가 겹치지 않음) → 누구나 읽힘
      return [{ base: BASE_RG }, { base: DEMO_FIG, lum: [0.85, 1] }]
    }
    case 'vanishing':
    case 'tritan': {
      const def = target!
      const base = kind === 'tritan' ? BASE_T : BASE_RG
      const u = figureStep(def, base, kind === 'tritan' ? STRENGTH.tritan : STRENGTH.vanish)
      return [jit(def, base, STRENGTH.vanish), jit(def, add(base, u), STRENGTH.vanish)]
    }
    case 'transform': {
      // 공통(rc)=u+v, 정상만(rn)=u, 결손형만(rd)=v. 대상에게 u는 안 보임 → rc≈rd, rn≈배경
      const def = target!
      const u = figureStep(def, BASE_RG, STRENGTH.transformU)
      const v = stepFor(BASE_RG, V_AXIS, STRENGTH.transformV, 1)
      const j = (base: Vec3): Region => ({ base, axis: unitAxis(CONFUSION_AXIS[def]), amp: Math.hypot(...u) * STRENGTH.jitter })
      return [j(BASE_RG), j(add(add(BASE_RG, u), v)), j(add(BASE_RG, u)), j(add(BASE_RG, v))]
    }
    case 'hidden': {
      // 배경·숫자 모두 u 방향으로 크게(빨강/초록 점) 흔들고, 숫자만 v로 살짝 이동.
      // 정상은 큰 u 변화에 가려 잘 안 보이고, 대상에게는 u가 사라져 v만 남는다.
      const def = target!
      const uAmp = Math.hypot(...figureStep(def, BASE_RG, STRENGTH.hiddenU))
      const v = stepFor(BASE_RG, V_AXIS, STRENGTH.hiddenV, 1)
      const axis = unitAxis(CONFUSION_AXIS[def])
      return [
        // 밝기 노이즈는 약하게: 가림은 u(색) 흩어짐이 담당하고, 대상에게 v가 묻히지 않게
        { base: BASE_RG, axis, amp: uAmp, bimodal: true, lum: [0.88, 1] },
        { base: add(BASE_RG, v), axis, amp: uAmp, bimodal: true, lum: [0.88, 1] },
      ]
    }
    case 'classify': {
      // 왼쪽 숫자 = L만 다름(protan에게 안 보임), 오른쪽 숫자 = M만 다름(deutan에게 안 보임)
      return [
        { base: BASE_RG },
        { base: add(BASE_RG, figureStep('protan', BASE_RG, STRENGTH.vanish)) },
        { base: add(BASE_RG, figureStep('deutan', BASE_RG, STRENGTH.vanish)) },
      ]
    }
  }
}

// ── 판 세트 생성 ──
// 변환판 쌍 [정상이 읽는 숫자, 대상 결손형이 읽는 숫자] — 7세그먼트로 한쪽이 다른 쪽에서 파생
export const TRANSFORM_PAIRS: [string, string][] = [['74', '21'], ['29', '70'], ['15', '17'], ['6', '5'], ['8', '3']]
export const PLATE_COUNT = 14

function cellsFor(n: string | null, d: string | null, rc: number, rn: number, rd: number): Cell[] {
  const len = Math.max(n?.length ?? 0, d?.length ?? 0)
  return Array.from({ length: len }, (_, i) => ({ n: n?.[i], d: d?.[i], rc, rn, rd }))
}

export function generatePlates(seed: number): Plate[] {
  const rand = rng(seed)
  const used = new Set<string>()
  const pick2 = (): string => {
    for (;;) {
      const s = String(10 + Math.floor(rand() * 90))
      if (!used.has(s) && s[0] !== s[1]) { used.add(s); return s }
    }
  }
  const [tp, td] = shuffle(TRANSFORM_PAIRS, rand)
  const mk = (kind: PlateKind, target: Deficiency | null, extra: Omit<Plate, 'id' | 'kind' | 'target' | 'regions' | 'seed'>): Plate =>
    ({ id: 0, kind, target, regions: regionsFor(kind, target), seed: Math.floor(rand() * 2 ** 31), ...extra })
  const vanish = (kind: PlateKind, def: Deficiency) => {
    const n = pick2()
    return mk(kind, def, { normal: n, deficient: NONE, cells: cellsFor(n, null, 1, 1, 1) })
  }
  const transform = (def: Deficiency, [n, d]: [string, string]) =>
    mk('transform', def, { normal: n, deficient: d, cells: cellsFor(n, d, 1, 2, 3) })
  const hidden = (def: Deficiency) => {
    const d = pick2()
    return mk('hidden', def, { normal: NONE, deficient: d, cells: cellsFor(null, d, 1, 1, 1) })
  }
  const classify = () => {
    const n = pick2() // 왼쪽=protan에게 안 보임, 오른쪽=deutan에게 안 보임
    return mk('classify', null, {
      normal: n, deficient: '', protanSees: n[1], deutanSees: n[0],
      cells: [{ n: n[0], rc: 1, rn: 1, rd: 1 }, { n: n[1], rc: 2, rn: 2, rd: 2 }],
    })
  }
  const demoN = pick2()
  const demo = mk('demo', null, { normal: demoN, deficient: demoN, cells: cellsFor(demoN, null, 1, 1, 1) })
  const rest = shuffle([
    vanish('vanishing', 'protan'), vanish('vanishing', 'protan'), vanish('vanishing', 'deutan'), vanish('vanishing', 'deutan'),
    transform('protan', tp), transform('deutan', td),
    hidden('protan'), hidden('deutan'),
    classify(), classify(),
    vanish('tritan', 'tritan'), vanish('tritan', 'tritan'),
    vanish('vanishing', 'protan'),
  ], rand)
  return [demo, ...rest].map((p, i) => ({ ...p, id: i + 1 }))
}

/** 관찰자 모형별 예상 답 (결과 화면 "적색약이라면 보통 …" 과 채점 근거; 색 계산 검증은 check 스크립트) */
export function expectedAnswer(p: Plate, obs: Observer): string {
  if (obs === 'normal' || p.kind === 'demo') return p.normal
  if (p.kind === 'classify') return obs === 'protan' ? p.protanSees! : obs === 'deutan' ? p.deutanSees! : p.normal
  if (p.kind === 'hidden') return obs === p.target ? p.deficient : NONE
  return obs === p.target ? p.deficient : p.normal
}

// ── 채점 ──
export type Verdict = 'normal' | 'protan' | 'deutan' | 'redGreen' | 'tritan' | 'unclear'
export type Confidence = 'high' | 'medium' | 'low'
export type Reading = 'normal' | 'protan' | 'deutan' | 'tritan' | 'other'
export interface PlateOutcome { plate: Plate; answer: string; correct: boolean; reading: Reading }
export interface Score {
  outcomes: PlateOutcome[]
  correct: number
  total: number
  rgFails: number
  rgTotal: number
  tritanFails: number
  tritanTotal: number
  protan: number
  deutan: number
  demoOk: boolean
  verdict: Verdict
  confidence: Confidence
}

export const normalizeAnswer = (a: string) => (a === NONE ? NONE : a.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))

export function scoreTest(plates: Plate[], answers: string[]): Score {
  let rgFails = 0, rgTotal = 0, tritanFails = 0, tritanTotal = 0, protan = 0, deutan = 0, demoOk = true
  const outcomes = plates.map((plate, i): PlateOutcome => {
    const answer = normalizeAnswer(answers[i] ?? NONE)
    const correct = answer === plate.normal
    let reading: Reading = correct ? 'normal' : 'other'
    const t = plate.target
    switch (plate.kind) {
      case 'demo':
        demoOk = correct
        break
      case 'vanishing':
      case 'transform':
        rgTotal++
        if (!correct) {
          rgFails++
          if (answer === plate.deficient) { reading = t!; if (t === 'protan') protan += 1.5; else deutan += 1.5 }
          else if (t === 'protan') protan += 0.5
          else deutan += 0.5
        }
        break
      case 'classify':
        rgTotal++
        if (!correct) {
          rgFails++
          if (answer === plate.protanSees) { reading = 'protan'; protan += 1.5 }
          else if (answer === plate.deutanSees) { reading = 'deutan'; deutan += 1.5 }
        }
        break
      case 'hidden':
        // 보조 근거: 결손형만 볼 것으로 설계된 숫자를 읽었을 때만 가산 (정상/비정상 판정엔 쓰지 않음)
        if (answer === plate.deficient) { reading = t!; if (t === 'protan') protan += 1; else deutan += 1 }
        break
      case 'tritan':
        tritanTotal++
        if (!correct) { tritanFails++; if (answer === NONE) reading = 'tritan' }
        break
    }
    return { plate, answer, correct, reading }
  })
  const correct = outcomes.filter((o) => o.correct).length
  const margin = protan - deutan
  let verdict: Verdict
  let confidence: Confidence
  if (!demoOk || (rgFails >= 2 && tritanFails >= 2)) {
    verdict = 'unclear'; confidence = 'low' // 누구나 보이는 판을 틀림 / 전부 틀림 → 화면·집중 문제 가능성
  } else if (rgFails >= 2) {
    if (protan >= 2 && margin >= 1.5) verdict = 'protan'
    else if (deutan >= 2 && -margin >= 1.5) verdict = 'deutan'
    else verdict = 'redGreen'
    confidence = verdict === 'redGreen' ? 'low' : rgFails >= 4 && Math.abs(margin) >= 3 ? 'high' : 'medium'
  } else if (tritanFails >= tritanTotal && tritanTotal > 0) {
    verdict = 'tritan'; confidence = 'low'
  } else {
    verdict = 'normal'; confidence = rgFails === 0 && tritanFails === 0 ? 'high' : 'medium'
  }
  return { outcomes, correct, total: plates.length, rgFails, rgTotal, tritanFails, tritanTotal, protan, deutan, demoOk, verdict, confidence }
}

/** 대상 관찰자에게 판이 어떻게 보이는지 (정상/Viénot 시뮬) sRGB hex */
export const dotHex = (c: Vec3, obs: Observer = 'normal') => linearToHex(simulate(c, obs))
