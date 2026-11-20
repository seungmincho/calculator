// 어린이 해열제 용량 — 데이터와 순수 계산. 숫자는 모두 SOURCES·PRODUCTS 의 원문에서 옮겼다(확인일 CHECKED).
// 체중 기준(mg/kg)·나이 하한·간격·하루 최대 횟수: 식약처 보도참고자료(2025-12-26) "우리 아이 열날 때 당황하지 마세요"
// 하루 최대 총량·제품 표: 식약처 의약품안전나라 허가사항(용법·용량, 사용상의 주의사항)

export const CHECKED = '2026-11-20'

export type Ing = 'apap' | 'ibu' | 'dexi'
export const INGS = ['apap', 'ibu', 'dexi'] as const

const nedrug = (seq: string) => `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${seq}`

/** 성분 출처(제품 허가사항 외). 화면 이름은 번역 sources.<id> */
export const SOURCES = {
  mfds2025: 'https://www.mfds.go.kr/brd/m_99/view.do?seq=49595',
  mfds2023: 'https://www.korea.kr/multi/visualNewsView.do?newsId=148922737',
  msd: 'https://www.msdmanuals.com/ko/home/%EC%95%84%EB%8F%99%EC%9D%98-%EA%B1%B4%EA%B0%95-%EB%AC%B8%EC%A0%9C/%EC%98%81%EC%95%84-%EB%B0%8F-%EC%86%8C%EC%95%84%EC%9D%98-%EC%A6%9D%EC%83%81/%EC%98%81%EC%95%84-%EB%B0%8F-%EC%86%8C%EC%95%84%EC%9D%98-%EC%97%B4',
} as const

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
/** 다른 계열 해열제와의 최소 간격: 식약처 2023 카드뉴스 "2시간 이상", 2025 보도참고 "(2~3시간)" 중 짧은 쪽 */
export const CROSS_HOURS = 2

export type Rule = {
  /** 1회 mg/kg [하한, 상한] — mfds2025 */
  mgPerKg: readonly [number, number]
  /** 기록 계산에 쓰는 같은 계열 최소 간격(시간). apap 4~6시간, ibu·dexi 6~8시간(mfds2025)의 짧은 쪽 */
  minHours: number
  /** 하루 최대 횟수 — mfds2025, apap·dexi 는 허가사항도 같음 */
  maxTimes: number
  /** 생후 몇 개월부터 — mfds2025 (dexi 는 허가사항 "생후 6개월 이상의 소아" 도 같음) */
  minMonths: number
  /** 1회 상한 mg. ibu: 허가사항 "경증 및 중등도의 동통, 감기: 성인 1회 200-400mg", dexi: 허가 표 12세 43kg 이상 "215~300 mg" */
  maxDoseMg?: number
  /** 하루 상한 mg. apap: 허가사항(e약은요) "일일 최대 용량(4,000 mg)" */
  maxDailyMg?: number
  /** 대표 시럽 농도 mg/mL (아래 제품 허가사항의 원료약품 및 분량) */
  stdConc: number
}

export const RULES: Record<Ing, Rule> = {
  apap: { mgPerKg: [10, 15], minHours: 4, maxTimes: 5, minMonths: 4, maxDailyMg: 4000, stdConc: 32 },
  ibu: { mgPerKg: [5, 10], minHours: 6, maxTimes: 4, minMonths: 6, maxDoseMg: 400, stdConc: 20 },
  dexi: { mgPerKg: [5, 7], minHours: 6, maxTimes: 4, minMonths: 6, maxDoseMg: 300, stdConc: 12 },
}

export type Product = { id: string; name: string; maker: string; ing: Ing; conc: number; url: string }

/** 의약품안전나라에서 허가사항을 직접 읽은 제품만. 농도 = 원료약품 및 분량 100mL 중 g ÷ 100 × 1000 */
export const PRODUCTS: readonly Product[] = [
  { id: 'tylenol', name: '어린이타이레놀현탁액', maker: '켄뷰코리아판매', ing: 'apap', conc: 32, url: nedrug('202200525') },
  { id: 'champ', name: '챔프시럽', maker: '동아제약', ing: 'apap', conc: 32, url: nedrug('201206715') },
  { id: 'kidspen', name: '콜대원키즈펜시럽', maker: '대원제약', ing: 'apap', conc: 32, url: nedrug('201702784') },
  { id: 'setopen', name: '세토펜현탁액', maker: '삼아제약', ing: 'apap', conc: 32, url: nedrug('199800888') },
  { id: 'brufen', name: '어린이부루펜시럽', maker: '삼일제약', ing: 'ibu', conc: 20, url: nedrug('198601920') },
  { id: 'champibu', name: '챔프이부펜시럽', maker: '동아제약', ing: 'ibu', conc: 20, url: nedrug('201604402') },
  { id: 'kidsibu', name: '콜대원키즈이부펜시럽', maker: '대원제약', ing: 'ibu', conc: 20, url: nedrug('198901310') },
  { id: 'maxibufen', name: '맥시부펜시럽', maker: '한미약품', ing: 'dexi', conc: 12, url: nedrug('200608160') },
]

export type LabelRow = {
  /** 허가 표 칸 그대로(원문 표기) */
  cells: readonly string[]
  /** 체중 표: 이 줄의 체중 하한(kg, 포함). 나이 표: 이 줄의 나이 [하한, 상한) 개월 */
  minKg?: number
  months?: readonly [number, number]
  /** 이 줄의 1회 mL [하한, 상한] — 체중 기준 범위와 비교용 */
  ml: readonly [number, number]
}

export type LabelTable = {
  /** 표 칸 이름(번역 label.cols.<key>) */
  cols: readonly string[]
  by: 'weight' | 'age'
  /** 표가 다루는 나이 [하한, 상한) 개월 */
  ages: readonly [number, number]
  /** 원문을 옮긴 제품 id(같은 성분·농도 제품은 표 값이 같음을 확인) */
  ref: string
  rows: readonly LabelRow[]
}

/** 같은 성분·같은 농도 제품의 표는 값이 모두 같았다(아세트아미노펜 4종, 이부프로펜 3종). 칸 문자열은 ref 제품 원문 */
export const TABLES: Record<Ing, LabelTable> = {
  // 어린이타이레놀현탁액: "만 12세 이하의 소아 … 4-6시간 마다 … 1일 5회 (75mg/kg)를 초과하여 복용하지 않는다.
  // 몸무게를 아는 경우 몸무게에 따른 용량(10~15mg/kg)으로 복용하는 것이 더 적절하다."
  apap: {
    cols: ['age', 'weight', 'doseMg', 'doseMl'], by: 'weight', ages: [4, 156], ref: 'tylenol',
    rows: [
      { cells: ['4개월~6개월', '7 ~ 7.9kg', '80mg', '2.5mL'], minKg: 7, ml: [2.5, 2.5] },
      { cells: ['7개월~23개월', '8 ~ 11.9kg', '120mg', '3.5mL'], minKg: 8, ml: [3.5, 3.5] },
      { cells: ['만 2~3세', '12 ~ 15.9kg', '160mg', '5mL'], minKg: 12, ml: [5, 5] },
      { cells: ['만 4세~6세', '16 ~ 22.9kg', '240mg', '7.5mL'], minKg: 16, ml: [7.5, 7.5] },
      { cells: ['만 7세~8세', '23 ~ 29.9kg', '320mg', '10mL'], minKg: 23, ml: [10, 10] },
      { cells: ['만 9세~10세', '30 ~ 37.9kg', '400mg', '12.5mL'], minKg: 30, ml: [12.5, 12.5] },
      { cells: ['만 11세', '38 ~ 42.9kg', '480mg', '15mL'], minKg: 38, ml: [15, 15] },
      { cells: ['만 12세', '43kg 이상', '640mg', '20mL'], minKg: 43, ml: [20, 20] },
    ],
  },
  // 어린이부루펜시럽: "어린이는 다음 1회 용량을 1일 3-4회 경구투여한다. 공복시 투여는 피하는 것이 바람직하다."
  ibu: {
    cols: ['age', 'dose', 'daily'], by: 'age', ages: [12, 180], ref: 'brufen',
    rows: [
      { cells: ['1~2세', '50~100mg (2.5~5mL)', '400mg (20mL)'], months: [12, 36], ml: [2.5, 5] },
      { cells: ['3~6세', '100~150mg (5~7.5mL)', '600mg (30mL)'], months: [36, 84], ml: [5, 7.5] },
      { cells: ['7~10세', '150~200mg (7.5~10mL)', '800mg (40mL)'], months: [84, 132], ml: [7.5, 10] },
      { cells: ['11~14세', '200~250mg (10~12.5mL)', '1000mg (50mL)'], months: [132, 180], ml: [10, 12.5] },
    ],
  },
  // 맥시부펜시럽: "생후 6개월 이상의 소아 : 1회 0.4~0.6mL/kg(덱시부프로펜으로서 5~7mg/kg)의 용량을 4~6시간 간격으로
  // 필요시에 복용하며, 1일 최대 4회(28mg/kg)를 넘지 않는다. … 몸무게를 아는 경우에는 몸무게에 따른 용량으로 복용하는 것이 더 적절하다."
  dexi: {
    cols: ['age', 'weight', 'doseMlMg', 'dailyMlMg'], by: 'weight', ages: [6, 156], ref: 'maxibufen',
    rows: [
      { cells: ['6-11개월', '7.9-9.9 kg', '3~6 mL (40~70 mg)', '12~24 mL (160~280 mg)'], minKg: 7.9, ml: [3, 6] },
      { cells: ['12-23개월', '10.0-11.9 kg', '4~7 mL (50~80 mg)', '16~28 mL (200~320 mg)'], minKg: 10, ml: [4, 7] },
      { cells: ['2-3세', '12.0-15.9 kg', '5~9 mL (60~110 mg)', '20~36 mL (240~440 mg)'], minKg: 12, ml: [5, 9] },
      { cells: ['4-5세', '16.0-20.9 kg', '7~12 mL (80~145 mg)', '28~48 mL (320~580 mg)'], minKg: 16, ml: [7, 12] },
      { cells: ['6-8세', '21.0-29.9 kg', '9~17 mL (105~210 mg)', '36~68mL (420~840 mg)'], minKg: 21, ml: [9, 17] },
      { cells: ['9-10세', '30.0-37.9 kg', '12.5~22 mL (150~265 mg)', '50~88mL (600~1060 mg)'], minKg: 30, ml: [12.5, 22] },
      { cells: ['11세', '38.0-42.9 kg', '16~25 mL (190~300 mg)', '64~100 mL (760~1200 mg)'], minKg: 38, ml: [16, 25] },
      { cells: ['12세', '43 kg 이상', '18~25 mL (215~300 mg)', '72~100 mL (860~1200 mg)'], minKg: 43, ml: [18, 25] },
    ],
  },
}

// ── 입력 범위
export const W_RANGE = [2.5, 60] as const
export const A_RANGE = [0, 168] as const // 0개월 ~ 만 14세
export const C_RANGE = [1, 100] as const

/** 0.1 단위 올림·내림. 부동소수 오차(3.75 → 37.4999…) 보정 */
export const ceil1 = (x: number) => Math.ceil(x * 10 - 1e-9) / 10
export const floor1 = (x: number) => Math.floor(x * 10 + 1e-9) / 10

/** 1회 최대 mg: mg/kg 상한 × 체중, 성분 상한이 있으면 그 안으로 */
export const doseMaxMg = (ing: Ing, w: number) => Math.min(RULES[ing].mgPerKg[1] * w, RULES[ing].maxDoseMg ?? Infinity)

/** 체중 기준 1회 범위. mL 는 하한은 올림·상한은 내림이라 반올림으로 1회 최대를 넘지 않는다 */
export function doseRange(ing: Ing, w: number, conc: number) {
  const hi = doseMaxMg(ing, w)
  const lo = Math.min(RULES[ing].mgPerKg[0] * w, hi)
  const mlHi = floor1(hi / conc)
  return {
    mg: [ceil1(lo), floor1(hi)] as const,
    ml: [Math.min(ceil1(lo / conc), mlHi), mlHi] as const,
    capped: hi < RULES[ing].mgPerKg[1] * w,
  }
}

/** 하루 최대 mg = 하루 최대 횟수 × 1회 최대, 성분 하루 상한이 있으면 그 안으로 */
export const dailyMaxMg = (ing: Ing, w: number) =>
  Math.min(RULES[ing].maxTimes * doseMaxMg(ing, w), RULES[ing].maxDailyMg ?? Infinity)

export type Gates = { tooYoung: boolean; under3m: boolean; under2: boolean }
export const gates = (ing: Ing, months: number): Gates => ({
  tooYoung: months < RULES[ing].minMonths,
  under3m: months < 3,
  under2: months < 24,
})

/** 허가 표에서 이 아이에 해당하는 줄. 체중 표는 체중으로(허가사항: 몸무게를 아는 경우 더 적절), 나이 표는 나이로 */
export function labelRow(ing: Ing, w: number, months: number): number | null {
  const tb = TABLES[ing]
  if (months < tb.ages[0] || months >= tb.ages[1]) return null
  if (tb.by === 'age') {
    const i = tb.rows.findIndex((r) => r.months && months >= r.months[0] && months < r.months[1])
    return i < 0 ? null : i
  }
  for (let i = tb.rows.length - 1; i >= 0; i--) if (w >= (tb.rows[i].minKg ?? Infinity) - 1e-9) return i
  return null
}

/** 허가 표 줄의 mL 가 체중 기준 범위 안이면 true */
export const rowWithin = (row: LabelRow, ml: readonly [number, number]) =>
  row.ml[0] >= ml[0] - 1e-9 && row.ml[1] <= ml[1] + 1e-9

// ── 선택(제품 또는 성분)과 URL

export type State = { w: number; a: number; p: string; c: number }
export const DEFAULT: State = { w: 12, a: 24, p: 'apap', c: 32 }

const isIng = (p: string): p is Ing => (INGS as readonly string[]).includes(p)
export const productOf = (p: string) => PRODUCTS.find((x) => x.id === p) ?? null

/** p 를 성분·농도로. 제품이면 허가 농도, 성분이면 입력 농도. std = 허가 표를 보여 줄 수 있는 농도인가 */
export function resolve(p: string, c: number) {
  const prod = productOf(p)
  const ing: Ing = prod ? prod.ing : isIng(p) ? p : 'apap'
  const conc = prod ? prod.conc : c
  return { ing, conc, product: prod, std: conc === RULES[ing].stdConc }
}

const inRange = (n: number, [lo, hi]: readonly [number, number]) => Number.isFinite(n) && n >= lo && n <= hi
const num = (s: string | null) => (s === null || s.trim() === '' ? NaN : Number(s))

export function parseState(get: (k: string) => string | null): State {
  const w = num(get('w'))
  const a = num(get('a'))
  const p0 = get('p') ?? ''
  const p = productOf(p0) || isIng(p0) ? p0 : DEFAULT.p
  const prod = productOf(p)
  const c = num(get('c'))
  return {
    w: inRange(w, W_RANGE) ? Math.round(w * 10) / 10 : DEFAULT.w,
    a: Number.isInteger(a) && inRange(a, A_RANGE) ? a : DEFAULT.a,
    p,
    c: prod ? prod.conc : inRange(c, C_RANGE) ? Math.round(c * 10) / 10 : RULES[p as Ing].stdConc,
  }
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(s: State): string {
  const q = new URLSearchParams()
  if (s.w !== DEFAULT.w) q.set('w', String(s.w))
  if (s.a !== DEFAULT.a) q.set('a', String(s.a))
  if (s.p !== DEFAULT.p) q.set('p', s.p)
  if (isIng(s.p) && s.c !== RULES[s.p].stdConc) q.set('c', String(s.c))
  return q.toString()
}

// ── 복용 기록(브라우저 localStorage)

export type Dose = { t: number; ing: Ing; ml: number; mg: number }
export const LOG_KEY = 'toolhub:fever-medicine-dose:log'
export const LOG_KEEP = 72 * HOUR
export const LOG_MAX = 60

export function parseLog(raw: string | null, now: number): Dose[] {
  let data: unknown
  try { data = JSON.parse(raw ?? '[]') } catch { return [] }
  if (!Array.isArray(data)) return []
  return data
    .filter((d): d is Dose => !!d && typeof d === 'object'
      && Number.isFinite(d.t) && d.t > now - LOG_KEEP && d.t <= now + HOUR
      && isIng(d.ing) && Number.isFinite(d.ml) && d.ml > 0 && Number.isFinite(d.mg) && d.mg > 0)
    .map((d) => ({ t: d.t, ing: d.ing, ml: d.ml, mg: d.mg }))
    .sort((x, y) => x.t - y.t)
    .slice(-LOG_MAX)
}

/** 'HH:MM' 을 now 기준 가장 최근의 그 시각으로(미래면 어제) */
export function timeToEpoch(hm: string, now: number): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm)
  if (!m || +m[1] > 23 || +m[2] > 59) return null
  const d = new Date(now)
  d.setHours(+m[1], +m[2], 0, 0)
  return d.getTime() > now + 60_000 ? d.getTime() - DAY : d.getTime()
}

export type Block = 'interval' | 'cross' | 'count' | 'total'
const klass = (i: Ing) => (i === 'apap' ? 'apap' : 'nsaid')

/**
 * 이 성분을 다음에 먹일 수 있는 시각(최근 24시간 기록 기준).
 * - 같은 계열 마지막 복용 + 최소 간격(이부프로펜·덱시부프로펜은 같은 계열이라 서로 막는다)
 * - 다른 계열 마지막 복용 + 2시간(교차복용은 의사 지시가 있을 때)
 * - 같은 계열 24시간 횟수가 하루 최대에 닿으면 가장 오래된 기록이 24시간을 벗어날 때까지
 * - 같은 성분 24시간 총량 + 가장 적은 1회량이 하루 최대를 넘으면 넘지 않게 될 때까지
 */
export function nextDose(log: readonly Dose[], ing: Ing, now: number, w: number) {
  // 위쪽은 자르지 않는다: 시계가 분 단위라 방금 적은 기록이 now 보다 몇십 초 뒤일 수 있다
  const win = log.filter((d) => d.t > now - DAY).sort((x, y) => x.t - y.t)
  const same = win.filter((d) => klass(d.ing) === klass(ing))
  const other = win.filter((d) => klass(d.ing) !== klass(ing))
  const mine = win.filter((d) => d.ing === ing)
  const r = RULES[ing]
  const mg = mine.reduce((s, d) => s + d.mg, 0)
  const maxMg = dailyMaxMg(ing, w)
  const cand: [number, Block][] = []
  if (same.length) cand.push([same[same.length - 1].t + r.minHours * HOUR, 'interval'])
  if (other.length) cand.push([other[other.length - 1].t + CROSS_HOURS * HOUR, 'cross'])
  if (same.length >= r.maxTimes) cand.push([same[same.length - r.maxTimes].t + DAY, 'count'])
  const low = Math.min(r.mgPerKg[0] * w, doseMaxMg(ing, w))
  let left = mg
  let i = 0
  while (left + low > maxMg + 1e-9 && i < mine.length) left -= mine[i++].mg
  if (i > 0) cand.push([mine[i - 1].t + DAY, 'total'])
  const late = cand.filter(([t]) => t > now).sort((x, y) => y[0] - x[0])[0]
  return { at: late ? late[0] : null, reason: late ? late[1] : null, count: same.length, maxTimes: r.maxTimes, mg, maxMg }
}
