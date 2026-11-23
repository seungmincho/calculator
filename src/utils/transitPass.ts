// 대중교통비 환급 비교 — K-패스(모두의카드) 기본형·일반형·플러스형. 순수 계산.
// 출처(확인일 CHECKED):
// | 숫자 | 기관 | URL | 기준일 |
// | 기본형 환급률 일반 20%·청년(만 19~34)·어르신(만 65+)·2자녀 30%·3자녀 50%·저소득 53.3%, 시차 출퇴근 +30%p(5:30~6:30·9~10·16~17·19~20시 승차) | 모두의카드(K-패스) 누리집 '모두의카드 소개' | https://korea-pass.kr/info/intro.do | 2026-11-22 확인 |
// | 정액형 기준금액 표(수도권·비수도권·우대지원·특별지원 × 일반/청년·어르신·2자녀/3자녀·저소득, 일반형/플러스형) | 같은 페이지 | https://korea-pass.kr/info/intro.do | 2026-10-01 이용분부터(한시 인하 종료 후) |
// | 계산 방법: 기본형 = 전체 × 환급률, 일반형 = (전체 − 3,000원 이상 통행 금액) − 기준금액, 플러스형 = 전체 − 기준금액, 셋 중 큰 쪽 자동 | 누리집 '적립안내' | https://korea-pass.kr/info/use_accm.do | 2026-11-22 확인 |
// | 월 15회 이상 이용 시 지급(가입 첫 달은 15회 미만도 지급), 통행 = 환승 포함 1회 | 누리집 '환급안내'·'적립안내' | https://korea-pass.kr/info/use_pay.do | 2026-11-22 확인 |
// | 2026.4~9월 기준금액 한시 인하 종료(10.1 이용분부터 원래 기준), 시차 출퇴근 환급 2026.12.31까지 유지 | 누리집 공지 '10월부터 달라지는 모두의카드 혜택' | https://korea-pass.kr | 2026-10 |
// | 월 60회 상한 폐지(2026.1.1부터), 최대 환급 한도 없음 | 서울시 내 손안에 서울(2026.8) · 매일신문(2026.10.13) | https://mediahub.seoul.go.kr/archives/2018927 | 2026 |
// | 기후동행카드 30일권 운영 종료(선불 충전 8.31·사용 9.29, 후불 9.30) → 서울시민은 기후동행패스(모두의카드 기반), 청년 만 39세까지 | 서울시 교통 '30일권 운영종료 FAQ'·'기후동행패스' | https://news.seoul.go.kr/traffic/public/climatecard-faq/faq-stop | 2026-10 |
// 2027년 기준금액·환급률 변경과 시차 출퇴근 환급 연장은 확인일 현재 발표되지 않았다(2027 예산안 8,652억원만 공개).
// ponytail: 2024년 K-패스의 '월 20만원 초과분 50% 반영' 규정은 현행 누리집 계산 방법에 없어 넣지 않았다 — 공지로 확인되면 basic 에 반영

export const CHECKED = '2026-11-22'

export const SOURCES = {
  intro: 'https://korea-pass.kr/info/intro.do',
  accm: 'https://korea-pass.kr/info/use_accm.do',
  pay: 'https://korea-pass.kr/info/use_pay.do',
  notice: 'https://korea-pass.kr',
  seoulPass: 'https://news.seoul.go.kr/traffic/archives/518138',
  climateEnd: 'https://news.seoul.go.kr/traffic/public/climatecard-faq/faq-stop',
  seoulNews: 'https://mediahub.seoul.go.kr/archives/2018927',
} as const

export const REGIONS = ['seoul', 'metro', 'local', 'pref', 'special'] as const
export type Region = (typeof REGIONS)[number]
export const GROUPS = ['general', 'youth', 'senior', 'kids2', 'kids3', 'low'] as const
export type Group = (typeof GROUPS)[number]
export const METHODS = ['basic', 'general', 'plus'] as const
export type Method = (typeof METHODS)[number]

/** 기본형(정률) 환급률 */
export const RATE: Record<Group, number> = { general: 0.2, youth: 0.3, senior: 0.3, kids2: 0.3, kids3: 0.5, low: 0.533 }
/** 시차 출퇴근 시간대 승차분 추가 환급률(기본형) — 2026.12.31 승차분까지 */
export const OFFPEAK_BONUS = 0.3
export const OFFPEAK_END = '2026-12-31'
export const MIN_TRIPS = 15
/** 1회 총 이용요금(환승 포함) 이 금액 이상이면 일반형에서 빠지고 플러스형에만 들어간다 */
export const WIDE_FARE = 3000

type Area = 'capital' | 'local' | 'pref' | 'special'
const AREA: Record<Region, Area> = { seoul: 'capital', metro: 'capital', local: 'local', pref: 'pref', special: 'special' }
/** 정액형 기준금액 묶음: 0 일반 / 1 청년·어르신·2자녀 / 2 3자녀·저소득 */
const TIER: Record<Group, 0 | 1 | 2> = { general: 0, youth: 1, senior: 1, kids2: 1, kids3: 2, low: 2 }
/** [일반형, 플러스형] 기준금액(원) — korea-pass.kr/info/intro.do */
export const BASE: Record<Area, readonly (readonly [number, number])[]> = {
  capital: [[62_000, 100_000], [55_000, 90_000], [45_000, 80_000]],
  local: [[55_000, 95_000], [50_000, 85_000], [40_000, 75_000]],
  pref: [[50_000, 90_000], [45_000, 80_000], [35_000, 70_000]],
  special: [[45_000, 85_000], [40_000, 75_000], [30_000, 65_000]],
}
export const baseOf = (r: Region, g: Group) => BASE[AREA[r]][TIER[g]]

export type Usage = {
  /** 월 전체 이용금액 */
  total: number
  /** 그중 1회 3,000원 이상 통행 금액 */
  wide: number
  /** 월 통행 수(환승 포함 1회) */
  trips: number
  /** 그중 시차 시간대 승차 횟수 */
  offpeak: number
}

const floor = (x: number) => Math.floor(x + 1e-6)

/** 세 방식의 환급액과 적용될 방식. 15회 미만이면 환급 0(가입 첫 달 제외) */
export function refunds(u: Usage, r: Region, g: Group, offpeakOn = true) {
  const [b1, b2] = baseOf(r, g)
  const trips = Math.max(0, u.trips)
  const wide = Math.min(Math.max(0, u.wide), u.total)
  const off = trips > 0 && offpeakOn ? (u.total * Math.min(u.offpeak, trips)) / trips : 0
  const by: Record<Method, number> = {
    basic: floor(u.total * RATE[g] + off * OFFPEAK_BONUS),
    general: Math.max(0, u.total - wide - b1),
    plus: Math.max(0, u.total - b2),
  }
  const best = METHODS.reduce((a, m) => (by[m] > by[a] ? m : a), 'basic' as Method)
  const eligible = trips >= MIN_TRIPS
  const refund = eligible ? by[best] : 0
  return { by, best, eligible, refund, pay: u.total - refund, base: [b1, b2] as const }
}

/**
 * 지금 이용 구성(3천원 이상 비율·시차 비율)을 그대로 두고 월 이용금액만 늘릴 때
 * 정액형(일반형·플러스형)이 기본형보다 커지는 첫 금액. 이미 정액형이 크면 null.
 */
export function breakeven(u: Usage, r: Region, g: Group, offpeakOn = true): { amount: number; method: 'general' | 'plus' } | null {
  const [b1, b2] = baseOf(r, g)
  const s = u.total > 0 ? Math.min(u.wide, u.total) / u.total : 0
  const o = u.trips > 0 && offpeakOn ? Math.min(u.offpeak, u.trips) / u.trips : 0
  const rr = RATE[g] + OFFPEAK_BONUS * o
  const now = refunds(u, r, g, offpeakOn)
  if (now.best !== 'basic' && u.total > 0) return null
  // T(1 − s − rr) > b1, T(1 − rr) > b2 → 처음으로 '크다'가 되는 정수 원
  const cand: { amount: number; method: 'general' | 'plus' }[] = []
  if (1 - s - rr > 1e-9) cand.push({ amount: floor(b1 / (1 - s - rr)) + 1, method: 'general' })
  if (1 - rr > 1e-9) cand.push({ amount: floor(b2 / (1 - rr)) + 1, method: 'plus' })
  return cand.sort((a, b) => a.amount - b.amount)[0] ?? null
}

/** 플러스형이 일반형보다 커지는 3천원 이상 통행 금액(둘 다 0보다 클 때): 3천원 이상 금액 > 플러스형 − 일반형 기준금액 */
export const plusOverGeneral = (r: Region, g: Group) => {
  const [b1, b2] = baseOf(r, g)
  return b2 - b1
}

// ── 입력 상태와 URL

export type Mode = 'trip' | 'amt'
export type State = {
  m: Mode
  /** trip: 3천원 미만 통행 1회 평균 요금, 횟수 */
  f: number
  n: number
  /** amt: 월 전체 이용금액, 월 통행 수 */
  a: number
  t: number
  /** 3천원 이상 통행(광역버스·GTX·신분당선 등)을 타는가 */
  w: boolean
  /** trip: 3천원 이상 통행 1회 요금, 횟수 / amt: 그 월 금액 */
  wf: number
  wn: number
  wa: number
  /** 시차 시간대 승차 횟수 */
  o: number
  r: Region
  g: Group
}

export const DEFAULT: State = { m: 'trip', f: 1_550, n: 44, a: 68_200, t: 44, w: false, wf: 3_000, wn: 20, wa: 30_000, o: 0, r: 'seoul', g: 'general' }

export const FARE_RANGE = [100, WIDE_FARE - 1] as const
export const WIDE_FARE_RANGE = [WIDE_FARE, 30_000] as const
export const TRIPS_RANGE = [0, 300] as const
export const AMT_RANGE = [0, 3_000_000] as const

/** 상태 → 월 이용 */
export function usageOf(s: State): Usage {
  if (s.m === 'trip') {
    const wideAmt = s.w ? s.wf * s.wn : 0
    const trips = s.n + (s.w ? s.wn : 0)
    return { total: s.f * s.n + wideAmt, wide: wideAmt, trips, offpeak: Math.min(s.o, trips) }
  }
  return { total: s.a, wide: s.w ? Math.min(s.wa, s.a) : 0, trips: s.t, offpeak: Math.min(s.o, s.t) }
}

const inRange = (n: number, [lo, hi]: readonly [number, number]) => Number.isInteger(n) && n >= lo && n <= hi
const num = (v: string | null) => (v === null || v.trim() === '' ? NaN : Number(v))
const pickInt = (v: string | null, range: readonly [number, number], d: number) => {
  const n = num(v)
  return inRange(n, range) ? n : d
}

export function parseState(get: (k: string) => string | null): State {
  const m0 = get('m')
  const r0 = get('r') ?? ''
  const g0 = get('g') ?? ''
  return {
    m: m0 === 'amt' ? 'amt' : 'trip',
    f: pickInt(get('f'), FARE_RANGE, DEFAULT.f),
    n: pickInt(get('n'), TRIPS_RANGE, DEFAULT.n),
    a: pickInt(get('a'), AMT_RANGE, DEFAULT.a),
    t: pickInt(get('t'), TRIPS_RANGE, DEFAULT.t),
    w: get('w') === '1',
    wf: pickInt(get('wf'), WIDE_FARE_RANGE, DEFAULT.wf),
    wn: pickInt(get('wn'), TRIPS_RANGE, DEFAULT.wn),
    wa: pickInt(get('wa'), AMT_RANGE, DEFAULT.wa),
    o: pickInt(get('o'), TRIPS_RANGE, DEFAULT.o),
    r: (REGIONS as readonly string[]).includes(r0) ? (r0 as Region) : DEFAULT.r,
    g: (GROUPS as readonly string[]).includes(g0) ? (g0 as Group) : DEFAULT.g,
  }
}

/** 기본값과 다른 것만, 지금 모드에서 쓰는 값만. 모두 기본이면 '' */
export function toQuery(s: State): string {
  const q = new URLSearchParams()
  const put = (k: keyof State, v: string) => { if (s[k] !== DEFAULT[k]) q.set(k, v) }
  put('m', s.m)
  if (s.m === 'trip') { put('f', String(s.f)); put('n', String(s.n)) } else { put('a', String(s.a)); put('t', String(s.t)) }
  put('w', s.w ? '1' : '0')
  if (s.w) {
    if (s.m === 'trip') { put('wf', String(s.wf)); put('wn', String(s.wn)) } else put('wa', String(s.wa))
  }
  put('o', String(s.o))
  put('r', s.r)
  put('g', s.g)
  return q.toString()
}
