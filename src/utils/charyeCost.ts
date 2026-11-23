// 설·추석 차례상 비용 — 순수 함수. 검증: node scripts/check-charye-cost.ts
//
// 단가 원천: aT(한국농수산식품유통공사) KAMIS 보도자료 붙임 표(4인 가족, 품목별 전통시장·대형유통업체 평균가). 확인일 2026-11-22
// | 명절 | 조사 기준일 | 제공일     | 조사처                           | 전통시장 | 대형유통 | 전체 평균 | URL |
// |------|-------------|------------|----------------------------------|----------|----------|-----------|-----|
// | 설   | 2026-02-06  | 2026-02-07 | 23개 지역 전통시장 17·대형유통 36 | 185,313  | 227,876  | 202,691   | https://www.kamis.or.kr/customer/trend/peakseason_info/peakseason_info.do?action=detail&brdctsno=467816 |
// | 추석 | 2026-09-18  | 2026-09-18 | 22개 지역 전통시장 17·대형유통 36 | 195,911  | 191,511  | 196,630   | https://www.kamis.or.kr/customer/trend/peakseason_info/peakseason_info.do?action=detail&brdctsno=480238 |
// 축산물은 축산물품질평가원 조사가격(붙임 주석). '전체 평균'은 aT 자체 집계값이라 두 업태의 단순 평균과 다르다(조사처 수 가중도 아님).
// ※ 2027 설 조사(보통 설 2~3주 전 발표)가 나오면 SURVEYS.seol 한 곳만 바꾼다.
//
// 간소화: 성균관 의례정립위원회 차례상 표준안(2022-09-05 추석, 2023-01-16 설) — 송편(설은 떡국)·나물·구이(적)·김치·과일 4종·술.
//   aT 품목 가운데 이 음식에 해당하는 것만 고른 툴허브 구성이다(나물 = 시금치·고사리·무, 김치 = 배추·무, 구이 = 소고기 설도, 과일 = 사과·배·밤·곶감 — 2022 진설도 예시 '밤·사과·배·감').
// 참고(다른 조사): 한국물가정보 2026 설 전통시장 296,500·대형마트 406,880(2026-01-25 발표), 2026 추석 302,500·397,700(2026-09-06 발표) — 품목·수량이 달라 금액이 크다.

export const CHECKED = '2026-11-22'

export type Holiday = 'seol' | 'chuseok'
export type Table = 'full' | 'simple'
export type Shop = 'market' | 'mart'
export type Size = 's' | 'm' | 'l'
export const HOLIDAYS: readonly Holiday[] = ['seol', 'chuseok']
export const TABLES: readonly Table[] = ['full', 'simple']
export const SHOPS: readonly Shop[] = ['market', 'mart']
export const SIZES: readonly Size[] = ['s', 'm', 'l']
export const SIZE_MULT: Record<Size, number> = { s: 0.5, m: 1, l: 1.5 }

export type Cat = 'fruit' | 'veg' | 'meat' | 'fish' | 'tteok' | 'etc'
export const CATS: readonly Cat[] = ['fruit', 'veg', 'meat', 'fish', 'tteok', 'etc']
/** g·ml 은 무게·부피, 나머지는 개수 단위(번역 units.<unit>) */
export type Unit = 'g' | 'ml' | 'ea' | 'fish' | 'egg' | 'block' | 'box' | 'bag'

export type ItemId =
  | 'rice' | 'cabbage' | 'radish' | 'spinach' | 'zucchini' | 'apple' | 'pear'
  | 'beefRound' | 'beefBrisket' | 'pork' | 'egg' | 'pollock' | 'croaker' | 'driedPollock'
  | 'bracken' | 'jujube' | 'chestnut' | 'persimmon'
  | 'tteokguk' | 'songpyeon' | 'pyeontteok' | 'tofu' | 'flour' | 'cheongju' | 'sikhye' | 'yakgwa' | 'sanja'

export const CAT_OF: Record<ItemId, Cat> = {
  apple: 'fruit', pear: 'fruit', jujube: 'fruit', chestnut: 'fruit', persimmon: 'fruit',
  cabbage: 'veg', radish: 'veg', spinach: 'veg', zucchini: 'veg', bracken: 'veg',
  beefRound: 'meat', beefBrisket: 'meat', pork: 'meat', egg: 'meat',
  pollock: 'fish', croaker: 'fish', driedPollock: 'fish',
  tteokguk: 'tteok', songpyeon: 'tteok', pyeontteok: 'tteok',
  rice: 'etc', tofu: 'etc', flour: 'etc', cheongju: 'etc', sikhye: 'etc', yakgwa: 'etc', sanja: 'etc',
}

/** [품목, 단위, 조사 수량, 전통시장 원, 대형유통업체 원] — aT 붙임 표 그대로 */
type Raw = readonly [ItemId, Unit, number, number, number]
export type Survey = {
  /** 조사 기준일 */
  date: string
  published: string
  regions: number
  markets: number
  marts: number
  url: string
  total: { market: number; mart: number; avg: number }
  rows: readonly Raw[]
}

export const SURVEYS: Record<Holiday, Survey> = {
  seol: {
    date: '2026-02-06', published: '2026-02-07', regions: 23, markets: 17, marts: 36,
    url: 'https://www.kamis.or.kr/customer/trend/peakseason_info/peakseason_info.do?action=detail&brdctsno=467816',
    total: { market: 185_313, mart: 227_876, avg: 202_691 },
    rows: [
      ['cabbage', 'g', 300, 518, 436],
      ['radish', 'ea', 1, 2_390, 1_731],
      ['spinach', 'g', 400, 3_228, 5_236],
      ['zucchini', 'ea', 1, 2_319, 2_510],
      ['apple', 'ea', 5, 15_722, 12_922],
      ['pear', 'ea', 3, 11_094, 8_024],
      ['beefRound', 'g', 900, 38_997, 52_200],
      ['beefBrisket', 'g', 400, 20_668, 34_612],
      ['pork', 'g', 300, 4_602, 4_338],
      ['egg', 'egg', 10, 2_060, 1_780],
      ['pollock', 'g', 800, 7_447, 11_504],
      ['croaker', 'fish', 3, 6_360, 4_416],
      ['driedPollock', 'fish', 1, 4_984, 6_469],
      ['bracken', 'g', 400, 6_565, 15_892],
      ['jujube', 'g', 200, 4_120, 4_383],
      ['chestnut', 'g', 1000, 9_229, 9_433],
      ['persimmon', 'ea', 9, 8_386, 9_661],
      ['tteokguk', 'g', 1000, 6_293, 5_471],
      ['tofu', 'block', 2, 3_843, 6_407],
      ['flour', 'g', 1000, 1_974, 1_686],
      ['cheongju', 'ml', 700, 5_613, 4_600],
      ['pyeontteok', 'g', 400, 3_954, 7_327],
      ['sikhye', 'ml', 1500, 5_034, 5_109],
      ['yakgwa', 'box', 1, 4_500, 4_950],
      ['sanja', 'bag', 1, 5_413, 6_779],
    ],
  },
  chuseok: {
    date: '2026-09-18', published: '2026-09-18', regions: 22, markets: 17, marts: 36,
    url: 'https://www.kamis.or.kr/customer/trend/peakseason_info/peakseason_info.do?action=detail&brdctsno=480238',
    total: { market: 195_911, mart: 191_511, avg: 196_630 },
    rows: [
      ['rice', 'g', 1000, 3_242, 2_981],
      ['cabbage', 'g', 300, 1_108, 761],
      ['radish', 'ea', 1, 2_913, 1_732],
      ['spinach', 'g', 400, 6_800, 7_180],
      ['zucchini', 'ea', 1, 2_567, 2_144],
      ['apple', 'ea', 5, 13_647, 10_127],
      ['pear', 'ea', 3, 10_896, 8_517],
      ['beefRound', 'g', 900, 39_456, 31_923],
      ['beefBrisket', 'g', 400, 21_472, 20_756],
      ['pork', 'g', 300, 4_899, 5_751],
      ['egg', 'egg', 10, 2_370, 1_999],
      ['pollock', 'g', 800, 8_505, 11_432],
      ['croaker', 'fish', 3, 5_562, 4_650],
      ['driedPollock', 'fish', 1, 5_118, 6_533],
      ['bracken', 'g', 400, 7_560, 15_985],
      ['jujube', 'g', 200, 3_138, 2_763],
      ['chestnut', 'g', 1000, 8_578, 6_717],
      ['persimmon', 'ea', 9, 8_617, 6_744],
      ['tofu', 'block', 2, 4_172, 6_677],
      ['flour', 'g', 1000, 1_941, 1_680],
      ['cheongju', 'ml', 700, 5_574, 4_631],
      ['songpyeon', 'g', 1000, 12_375, 13_440],
      ['sikhye', 'ml', 1500, 5_063, 4_865],
      ['yakgwa', 'g', 350, 4_425, 4_672],
      ['sanja', 'g', 200, 5_913, 6_851],
    ],
  },
}

/** 성균관 표준안 음식에 해당하는 aT 품목(떡국떡/송편은 명절에 따라) */
const SIMPLE_BASE: readonly ItemId[] = ['spinach', 'bracken', 'radish', 'cabbage', 'beefRound', 'apple', 'pear', 'chestnut', 'persimmon', 'cheongju']
export const simpleSet = (h: Holiday): ItemId[] => [h === 'seol' ? 'tteokguk' : 'songpyeon', ...SIMPLE_BASE]

export const itemIds = (h: Holiday): ItemId[] => SURVEYS[h].rows.map((r) => r[0])
export const presetSet = (h: Holiday, table: Table): ItemId[] => (table === 'full' ? itemIds(h) : simpleSet(h))

/** 조절 단위: g 100g(약과 350g 처럼 100g 단위가 아니면 50g), ml 한 병(조사 수량), 달걀 10구, 나머지 1 */
export const stepOf = (unit: Unit, base: number) =>
  unit === 'g' ? (base % 100 ? 50 : 100) : unit === 'ml' ? base : unit === 'egg' ? 10 : 1
export const QTY_MAX_MULT = 10

/** 규모 배수를 곱해 조절 단위로 반올림(최소 한 단위) */
export function scaledQty(unit: Unit, base: number, size: Size): number {
  const step = stepOf(unit, base)
  return Math.max(step, Math.round((base * SIZE_MULT[size]) / step) * step)
}

export type State = {
  h: Holiday
  t: Table
  s: Shop
  z: Size
  /** 상차림 기본 구성과 포함 여부가 다른 품목(뺀 것·더한 것) */
  o: ItemId[]
  /** 수량을 직접 정한 품목: 품목 단위 수량 */
  q: Partial<Record<ItemId, number>>
}
export const DEFAULT: State = { h: 'seol', t: 'full', s: 'market', z: 'm', o: [], q: {} }

export type Line = {
  id: ItemId
  cat: Cat
  unit: Unit
  base: number
  qty: number
  step: number
  edited: boolean
  included: boolean
  /** 업태별 금액(수량 반영, 원 단위 반올림) */
  cost: Record<Shop, number>
  /** 조사 단가(조사 수량 기준) */
  price: Record<Shop, number>
}

export function lines(st: State): Line[] {
  const preset = new Set(presetSet(st.h, st.t))
  return SURVEYS[st.h].rows.map(([id, unit, base, market, mart]) => {
    const step = stepOf(unit, base)
    const custom = st.q[id]
    const edited = custom !== undefined && validQty(unit, base, custom)
    const qty = edited ? custom! : scaledQty(unit, base, st.z)
    const included = preset.has(id) !== st.o.includes(id)
    return {
      id, cat: CAT_OF[id], unit, base, qty, step, edited, included,
      price: { market, mart },
      cost: { market: Math.round((market * qty) / base), mart: Math.round((mart * qty) / base) },
    }
  })
}

const sum = (ls: readonly Line[], shop: Shop) => ls.reduce((a, l) => a + l.cost[shop], 0)

export function calc(st: State) {
  const all = lines(st)
  const inc = all.filter((l) => l.included)
  const market = sum(inc, 'market')
  const mart = sum(inc, 'mart')
  // 간소화와 비교: 같은 명절·규모·수량 조정에서 '전체'와 '간소화' 기본 구성
  const fullSt = { ...st, t: 'full' as const, o: [] }
  const simpleSt = { ...st, t: 'simple' as const, o: [] }
  const full = sum(lines(fullSt).filter((l) => l.included), st.s)
  const simple = sum(lines(simpleSt).filter((l) => l.included), st.s)
  return {
    lines: all,
    included: inc,
    total: st.s === 'market' ? market : mart,
    byShop: { market, mart },
    /** 품목마다 더 싼 곳에서 사면 */
    mixed: inc.reduce((a, l) => a + Math.min(l.cost.market, l.cost.mart), 0),
    full,
    simple,
    byCat: CATS.map((cat) => ({ cat, total: sum(inc.filter((l) => l.cat === cat), st.s), count: inc.filter((l) => l.cat === cat).length }))
      .filter((c) => c.count > 0),
  }
}

// ── URL: h·t·s·z 는 기본과 다를 때만, o = 포함 여부를 바꾼 품목 'a.b', q = 'id-수량_id-수량'

const isOf = <T extends string>(list: readonly T[], v: string | null): v is T => v !== null && (list as readonly string[]).includes(v)

function validQty(unit: Unit, base: number, n: number) {
  const step = stepOf(unit, base)
  return Number.isInteger(n) && n >= step && n <= base * QTY_MAX_MULT && n % step === 0
}

/** 이 명절 조사에 있는 품목만, 순서는 조사 표 순서로 */
export function normalize(st: State): State {
  const rows = SURVEYS[st.h].rows
  const o = rows.map((r) => r[0]).filter((id) => st.o.includes(id))
  const q: Partial<Record<ItemId, number>> = {}
  for (const [id, unit, base] of rows) {
    const n = st.q[id]
    if (n !== undefined && validQty(unit, base, n)) q[id] = n
  }
  return { ...st, o, q }
}

export function parseQuery(get: (k: string) => string | null): State {
  const h = get('h'), t = get('t'), s = get('s'), z = get('z')
  const st: State = {
    h: isOf(HOLIDAYS, h) ? h : DEFAULT.h,
    t: isOf(TABLES, t) ? t : DEFAULT.t,
    s: isOf(SHOPS, s) ? s : DEFAULT.s,
    z: isOf(SIZES, z) ? z : DEFAULT.z,
    o: (get('o') ?? '').split('.').filter(Boolean) as ItemId[],
    q: {},
  }
  for (const pair of (get('q') ?? '').split('_')) {
    const [id, v] = pair.split('-')
    if (id && v && /^\d+$/.test(v)) st.q[id as ItemId] = Number(v)
  }
  return normalize(st)
}

export function toQuery(st0: State): string {
  const st = normalize(st0)
  const p = new URLSearchParams()
  if (st.h !== DEFAULT.h) p.set('h', st.h)
  if (st.t !== DEFAULT.t) p.set('t', st.t)
  if (st.s !== DEFAULT.s) p.set('s', st.s)
  if (st.z !== DEFAULT.z) p.set('z', st.z)
  if (st.o.length) p.set('o', st.o.join('.'))
  const q = SURVEYS[st.h].rows.filter((r) => st.q[r[0]] !== undefined).map((r) => `${r[0]}-${st.q[r[0]]}`).join('_')
  if (q) p.set('q', q)
  return p.toString()
}

// ── 장보기 체크(이 기기 localStorage). URL 에 없으니 링크로 열어도 덮어쓰지 않는다

export const CHECK_KEY = 'toolhub:charye-cost:checked:v1'
const ALL_IDS = new Set<string>(Object.keys(CAT_OF))
export function parseChecked(raw: string | null): ItemId[] {
  let data: unknown
  try { data = JSON.parse(raw ?? '[]') } catch { return [] }
  return Array.isArray(data) ? [...new Set(data.filter((x): x is ItemId => typeof x === 'string' && ALL_IDS.has(x)))] : []
}
