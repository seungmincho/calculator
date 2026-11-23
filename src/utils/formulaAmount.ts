// 아기 분유량 — 데이터와 순수 계산. 검증: node scripts/check-formula-amount.ts
//
// | 숫자 | 기관·자료 | URL | 기준일 | 확인일 |
// |---|---|---|---|---|
// | 생후 3개월이 될 때까지 하루 체중 1kg당 150~180mL(일부·조산아 최대 200mL) | 보건복지부 임신육아종합포털 아이사랑 "1~3개월 수유" | childcare.go.kr/?menuno=429 | 게시일 표시 없음 | 2026-11-22 |
// | 3~6개월 하루 1kg당 약 120mL, 하루 960mL 넘지 않게, 분유수유 표(월령별 횟수·간격·1회 양·하루 총량) | 아이사랑 "4~6개월 수유" | childcare.go.kr/?menuno=437 | 게시일 표시 없음 | 2026-11-22 |
// | 6~12개월 하루 1kg당 약 90~100mL | 아이사랑 "7~9개월 수유,영양"·"10~12개월 수유,영양" | childcare.go.kr/?menuno=443 · 449 | 게시일 표시 없음 | 2026-11-22 |
// | 신생아 하루 8~12회·2~3시간 간격, 생후 1주 무렵 소변 기저귀 6~8개(일회용 5~6개) | 아이사랑 "신생아 수유" | childcare.go.kr/?menuno=422 | 게시일 표시 없음 | 2026-11-22 |
// | 하루 체중 1파운드(453g)당 2½온스(75mL), 하루 평균 약 32온스(960mL) 넘지 않게, 첫 주 1회 1~2온스(30~60mL) 이하, 6개월 1회 6~8온스(180~240mL) 하루 4~5회 | 미국소아과학회 AAP healthychildren.org "Amount and Schedule of Baby Formula Feedings" | healthychildren.org | 2022-05-16 | 2026-11-22 |
// | 조제 후 2시간 안, 먹이기 시작하고 1시간 안, 바로 안 먹이면 냉장 24시간 안, 먹다 남은 분유는 버림 | 미국 CDC "Infant Formula Preparation and Storage" | cdc.gov | 2026-05-14 | 2026-11-22 |
// | 배고픔·배부름 신호(0~5개월) | 미국 CDC "Signs Your Child is Hungry or Full" | cdc.gov | 2026-03-11 | 2026-11-22 |
// | 분유 타는 물은 끓여서 70℃ 이상, 먹다 남긴 분유는 버림 | 식품의약품안전처 "영·유아용식품의 올바른 사용을 위한 소비자 가이드" | mfds.go.kr | 2007-08-31 | 2026-11-22 |
// | 전자레인지 데우기 권하지 않음 | MSD 매뉴얼 일반인용 "분유 수유" | msdmanuals.com | 2023-09-06 검토 | 2026-11-22 |
//
// 기본 기준은 아이사랑(체중당). AAP 는 비교 범위로만 보여 준다. 월령 기본 수유 횟수는 아이사랑 분유수유 표 범위 안에서 정했고,
// 6개월 이후는 분유만 먹을 때(체중당 90~100mL)를 기준으로 AAP 6개월 "하루 4~5회" 안에서 5회로 둔다(이유식 병행 시 표는 따로 보여 줌).
// 분유통 '1스푼당 물 mL' 기본값 20 은 제품마다 달라 화면에서 분유통 표기를 확인하라고 안내한다.

export const CHECKED = '2026-11-22'

export const SOURCES = {
  isarang13: 'https://www.childcare.go.kr/?menuno=429',
  isarang46: 'https://www.childcare.go.kr/?menuno=437',
  isarang79: 'https://www.childcare.go.kr/?menuno=443',
  isarangNewborn: 'https://www.childcare.go.kr/?menuno=422',
  aap: 'https://www.healthychildren.org/English/ages-stages/baby/formula-feeding/Pages/Amount-and-Schedule-of-Formula-Feedings.aspx',
  cdcStorage: 'https://www.cdc.gov/infant-toddler-nutrition/formula-feeding/preparation-and-storage.html',
  cdcCues: 'https://www.cdc.gov/infant-toddler-nutrition/mealtime/signs-your-child-is-hungry-or-full.html',
  mfds: 'https://www.mfds.go.kr/brd/m_218/view.do?seq=875',
  msd: 'https://www.msdmanuals.com/ko/home/%EC%95%84%EB%8F%99%EC%9D%98-%EA%B1%B4%EA%B0%95-%EB%AC%B8%EC%A0%9C/%EC%8B%A0%EC%83%9D%EC%95%84%EC%99%80-%EC%98%81%EC%95%84-%EA%B4%80%EB%A6%AC/%EB%B6%84%EC%9C%A0-%EC%88%98%EC%9C%A0',
} as const

export const M_RANGE = [0, 12] as const
export const W_RANGE = [1.5, 20] as const
export const N_RANGE = [1, 12] as const
export const S_RANGE = [10, 100] as const
/** 하루 상한(아이사랑 "960cc 는 넘기지 않도록", AAP 32온스 ≈ 960mL) */
export const DAILY_CAP = 960
/** AAP: 하루 1파운드(453g)당 75mL → 1kg당 */
export const AAP_PER_KG = 75 / 0.453

/** 아이사랑 월령별 하루 체중 1kg당 분유량(mL) */
export const perKg = (m: number): readonly [number, number] => (m < 3 ? [150, 180] : m < 6 ? [120, 120] : [90, 100])

export type RowId = 'newborn' | 'm1to4' | 'm5to6' | 'm7to8' | 'm9to11' | 'm12'
export type Row = {
  id: RowId
  /** 이 줄의 월령 [하한, 상한] */
  months: readonly [number, number]
  times: readonly [number, number]
  perFeed?: readonly [number, number]
  daily?: readonly [number, number]
}
/** 아이사랑 "4~6개월 수유" 분유수유 표 그대로. 5개월 이후는 이유식 병행 기준(간격은 번역 rows.<id>.interval) */
export const ROWS: readonly Row[] = [
  { id: 'newborn', months: [0, 0], times: [8, 12], perFeed: [50, 100] },
  { id: 'm1to4', months: [1, 4], times: [4, 10], perFeed: [100, 200] },
  { id: 'm5to6', months: [5, 6], times: [4, 6], perFeed: [160, 200], daily: [800, 1000] },
  { id: 'm7to8', months: [7, 8], times: [3, 5], perFeed: [160, 240], daily: [700, 800] },
  { id: 'm9to11', months: [9, 11], times: [2, 3], daily: [600, 800] },
  { id: 'm12', months: [12, 12], times: [2, 2], daily: [400, 600] },
]
export const rowOf = (m: number) => ROWS.find((r) => m >= r.months[0] && m <= r.months[1])!

/** 월령 기본 수유 횟수(사용자가 바꿀 수 있음) */
const TIMES = [8, 7, 7, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5] as const
export const defaultTimes = (m: number) => TIMES[m]

export const r10 = (x: number) => Math.round(x / 10) * 10
export const half = (x: number) => Math.round(x * 2) / 2

export type State = { m: number; w: number; n: number | null; b: number; s: number }
export const DEFAULT: State = { m: 1, w: 4.5, n: null, b: 0, s: 20 }

export function calc(st: State) {
  const n = st.n ?? defaultTimes(st.m)
  const b = Math.min(st.b, n)
  const k = perKg(st.m)
  const raw = [k[0] * st.w, k[1] * st.w] as const
  const daily = [Math.min(raw[0], DAILY_CAP), Math.min(raw[1], DAILY_CAP)] as const
  const feed = [daily[0] / n, daily[1] / n] as const
  const row = rowOf(st.m)
  // 화면 값: mL 는 10 단위, 스푼은 0.5 단위
  const feedR = [r10(feed[0]), r10(feed[1])] as const
  const aap = st.m < 6 ? Math.min(AAP_PER_KG * st.w, DAILY_CAP) : null
  return {
    n, b, perKg: k,
    daily: [r10(daily[0]), r10(daily[1])] as const,
    over: raw[1] > DAILY_CAP,
    feed: feedR,
    scoops: [half(feedR[0] / st.s), half(feedR[1] / st.s)] as const,
    /** 하루 평균 간격(시간, 0.5 단위) */
    interval: half(24 / n),
    row,
    /** 1회 양이 아이사랑 표의 1회 양보다 많은가 */
    feedAboveRow: !!row.perFeed && feedR[1] > row.perFeed[1],
    /** 혼합수유: 분유 횟수와 하루 분유량(화면의 1회 양 × 분유 횟수, 추정). 반올림 전 값으로 곱하면 '4회 × 100~120 = 390~460' 처럼 식이 안 맞는다 */
    formulaTimes: n - b,
    mixedDaily: [feedR[0] * (n - b), feedR[1] * (n - b)] as const,
    aap: aap === null ? null : { daily: r10(aap), feed: r10(aap / n) },
  }
}

/** 생년월일(YYYY-MM-DD)과 오늘(YYYY-MM-DD)로 생후 일수·만 개월. 미래·잘못된 날짜면 null */
export function ageFrom(birth: string, today: string) {
  const p = (x: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x)
    if (!m) return null
    const [y, mo, d] = [+m[1], +m[2], +m[3]]
    const t = Date.UTC(y, mo - 1, d)
    const back = new Date(t)
    return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? { y, mo, d, t } : null
  }
  const a = p(birth), z = p(today)
  if (!a || !z || a.t > z.t) return null
  const months = (z.y - a.y) * 12 + (z.mo - a.mo) - (z.d < a.d ? 1 : 0)
  return { days: Math.round((z.t - a.t) / 86_400_000), months }
}

const num = (x: string | null) => (x === null || x.trim() === '' ? NaN : Number(x))
const inRange = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi

export function parseState(get: (k: string) => string | null): State {
  const m0 = num(get('m'))
  const m = Number.isInteger(m0) && inRange(m0, M_RANGE) ? m0 : DEFAULT.m
  const w0 = num(get('w'))
  const n0 = num(get('n'))
  const n = Number.isInteger(n0) && inRange(n0, N_RANGE) && n0 !== defaultTimes(m) ? n0 : null
  const b0 = num(get('b'))
  const s0 = num(get('s'))
  return {
    m,
    w: inRange(w0, W_RANGE) ? Math.round(w0 * 10) / 10 : DEFAULT.w,
    n,
    b: Number.isInteger(b0) && b0 >= 0 ? Math.min(b0, n ?? defaultTimes(m)) : DEFAULT.b,
    s: Number.isInteger(s0) && inRange(s0, S_RANGE) ? s0 : DEFAULT.s,
  }
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(st: State): string {
  const q = new URLSearchParams()
  if (st.m !== DEFAULT.m) q.set('m', String(st.m))
  if (st.w !== DEFAULT.w) q.set('w', String(st.w))
  if (st.n !== null && st.n !== defaultTimes(st.m)) q.set('n', String(st.n))
  if (st.b !== DEFAULT.b) q.set('b', String(st.b))
  if (st.s !== DEFAULT.s) q.set('s', String(st.s))
  return q.toString()
}
