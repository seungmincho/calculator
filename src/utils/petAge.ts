// 강아지·고양이 사람 나이 · 생애 단계 · 하루 칼로리·사료량 — 순수 계산. 숫자는 아래 원문에서 옮겼다(확인일 CHECKED).
//
// | 항목                         | 값                                                        | 출처(기준일)                                                       |
// |------------------------------|-----------------------------------------------------------|--------------------------------------------------------------------|
// | 개 1~16살 환산               | DOG_TABLE 1~16번째 값(크기별)                             | AKC "How to Calculate Dog Years to Human Years" 차트(2026-09-14 갱신) |
// | 개 크기 체중 경계            | 소형 20lb 이하 · 중형 21-50lb · 대형 51-100lb · 초대형 100lb+ | 같은 AKC 차트                                                      |
// | 개 17~20살(소·중·대형)       | DOG_TABLE 17~20번째 값                                    | IDEXX "How old is your pet in people years?"(2016, Fred L. Metzger 차트). 6~16살 값이 AKC 와 같은 계열 |
// | UCSD 후성유전 공식           | 사람 나이 = 16·ln(개 나이) + 31                           | Wang et al., Cell Systems 2020 (doi 10.1016/j.cels.2020.06.006), 래브라도 기반 |
// | 고양이 환산                  | CAT_POINTS(1개월=1 … 2살=24, 이후 매년 +4, 25살=116)       | International Cat Care "Cat life stages" 차트                      |
// | 고양이 생애 단계             | kitten ~1 · young adult 1-6 · mature adult 7-10 · senior >10 · end-of-life | 2021 AAHA/AAFP Feline Life Stage Guidelines (JFMS 23:211-233) |
// | 개 생애 단계                 | puppy ~6-9개월 · young adult ~3-4살 · mature adult · senior = 수명 마지막 25% | 2019 AAHA Canine Life Stage Guidelines (JAAHA 55:267-290) |
// | 크기별 평균 수명             | 소형 10-15 · 중형 10-13 · 대형 8-12 · 초대형 8-10년       | AKC "How Long Do Dogs Live?"(2021-05-27) — AAHA 2019 Table 3 의 수명 추정 자료 |
// | RER                          | 70 × 체중(kg)^0.75                                        | AAHA 2021 Nutrition and Weight Management Guidelines Box 1, MSD Vet Manual |
// | MER 계수                     | FACTORS (두 출처가 다르면 범위)                           | AAHA 2021 Box 1 · MSD Vet Manual "Daily Maintenance Energy Requirements" |
// | 간식                         | 하루 칼로리의 10% 이하                                    | AAHA 2021 Nutrition and Weight Management Guidelines              |
//
// 추정(원문 없음): 개 1살 미만은 0→1살 값 직선 보간, 표 끝(소·중·대형 20살, 초대형 16살, 고양이 25살) 뒤는 마지막 1년 증가폭으로 연장.
// 사료 기본 열량 380kcal/100g 은 건사료 예시값(원문 없음) — 화면에서 포장지 값 입력을 권한다.

export const CHECKED = '2026-11-22'

export type Species = 'dog' | 'cat'
export type Size = 'small' | 'medium' | 'large' | 'giant'
export type Activity = 'normal' | 'inactive' | 'loss' | 'active'
export const SIZES = ['small', 'medium', 'large', 'giant'] as const
export const ACTIVITIES = ['normal', 'inactive', 'loss', 'active'] as const

export const SOURCES = {
  akcYears: 'https://www.akc.org/expert-advice/health/how-to-calculate-dog-years-to-human-years/',
  idexx: 'https://www.idexx.com/files/preventive-brochures-age-chart.pdf',
  ucsd: 'https://doi.org/10.1016/j.cels.2020.06.006',
  icatcare: 'https://icatcare.org/cat-advice/cat-life-stages',
  aahaFeline: 'https://catvets.com/resource/aaha-aafp-feline-life-stage-guidelines/',
  aahaCanine: 'https://doi.org/10.5326/JAAHA-MS-6999',
  akcLifespan: 'https://www.akc.org/expert-advice/health/how-long-do-dogs-live/',
  aahaNutrition: 'https://www.aaha.org/aaha-guidelines/2021-aaha-nutrition-and-weight-management-guidelines/',
  msd: 'https://www.msdvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats',
  wsavaBcs: 'https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf',
} as const

// ── 개 크기(AKC 차트: 파운드)
export const LB = 0.45359237
/** 크기별 상한(lb). 차트는 20 이하 · 21-50 · 51-100 · 100+ 라 경계 사이(20~21lb 등)는 위 칸으로 본다 */
export const SIZE_MAX_LB = { small: 20, medium: 50, large: 100 } as const
export const sizeOf = (kg: number): Size =>
  kg <= SIZE_MAX_LB.small * LB + 1e-9 ? 'small' : kg <= SIZE_MAX_LB.medium * LB + 1e-9 ? 'medium' : kg <= SIZE_MAX_LB.large * LB + 1e-9 ? 'large' : 'giant'

// ── 나이 환산표. 값 i 는 (i+1)살의 사람 나이
export const DOG_TABLE: Record<Size, readonly number[]> = {
  small: [15, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96],
  medium: [15, 24, 28, 32, 36, 42, 47, 51, 56, 60, 65, 69, 74, 78, 83, 87, 92, 96, 101, 105],
  large: [15, 24, 28, 32, 36, 45, 50, 55, 61, 66, 72, 77, 82, 88, 93, 99, 104, 109, 115, 120],
  giant: [12, 22, 31, 38, 45, 49, 56, 64, 71, 79, 86, 93, 100, 107, 114, 121],
}

/** [개월, 사람 나이] — iCatCare 차트. 0-1 months = 0-1 years */
export const CAT_POINTS: readonly (readonly [number, number])[] = [
  [0, 0], [1, 1], [2, 2], [3, 4], [4, 6], [5, 8], [6, 10], [7, 12], [12, 15], [18, 21], [24, 24],
  ...Array.from({ length: 23 }, (_, i) => [(i + 3) * 12, 28 + 4 * i] as const),
]

const dogPoints = (z: Size): (readonly [number, number])[] => [[0, 0], ...DOG_TABLE[z].map((v, i) => [(i + 1) * 12, v] as const)]

/** 꺾은선 보간. 마지막 점 뒤는 마지막 구간 기울기로 연장 */
function interp(pts: readonly (readonly [number, number])[], x: number) {
  let i = 1
  while (i < pts.length - 1 && x > pts[i][0]) i++
  const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
}

/** 사람 나이(소수). estimated = 원문 표 밖(개 1살 미만, 표 끝 뒤) */
export function humanAge(s: Species, z: Size, months: number) {
  const pts = s === 'cat' ? CAT_POINTS : dogPoints(z)
  const last = pts[pts.length - 1][0]
  return { value: interp(pts, months), estimated: months > last || (s === 'dog' && months < 12) }
}

/** UCSD 공식(래브라도 기반). 1개월처럼 너무 어려서 0 아래로 내려가면 null */
export function ucsdAge(months: number): number | null {
  if (months <= 0) return null
  const v = 16 * Math.log(months / 12) + 31
  return v < 0 ? null : v
}

// ── 생애 단계. 경계는 [시작, 끝] 살 — 사이에 있으면 앞 단계에서 다음 단계로 넘어가는 중
export const STAGES = { dog: ['puppy', 'young', 'mature', 'senior'], cat: ['kitten', 'young', 'mature', 'senior'] } as const
/** AKC 크기별 평균 수명 [하한, 상한] */
export const LIFESPAN: Record<Size, readonly [number, number]> = { small: [10, 15], medium: [10, 13], large: [8, 12], giant: [8, 10] }

export function stageBounds(s: Species, z: Size): (readonly [number, number])[] {
  // 고양이: young adult "1 year through 6 years", mature "7 to 10 years", senior "over 10 years"(catvets 요약은 "10 years and older") → 10살대는 넘어가는 중
  if (s === 'cat') return [[1, 1], [7, 7], [10, 11]]
  // 개: puppy 끝 6-9개월, young adult 끝 3-4살, senior 시작 = 평균 수명의 75%
  const [lo, hi] = LIFESPAN[z]
  return [[0.5, 0.75], [3, 4], [lo * 0.75, hi * 0.75]]
}

/** from = 지난 경계 수(단계 번호), to = 넘어가는 중이면 from+1 */
export function stageOf(s: Species, z: Size, months: number) {
  const y = months / 12
  const b = stageBounds(s, z)
  const from = b.filter(([, hi]) => y >= hi - 1e-9).length
  const moving = b.some(([lo, hi]) => y >= lo - 1e-9 && y < hi - 1e-9)
  return { from, to: moving ? from + 1 : from }
}

// ── 하루 칼로리
export const rer = (kg: number) => 70 * kg ** 0.75

/** MER = RER × 계수. [하한, 상한] — AAHA 2021 Box 1 과 MSD 표를 합친 범위 */
export const FACTORS = {
  dog: { neutered: [1.4, 1.6], intact: [1.6, 1.8], inactive: [1.0, 1.4], loss: [1.0, 1.0], active: [1.6, 2.0], under4m: [3.0, 3.0], growth: [2.0, 2.0] },
  cat: { neutered: [1.2, 1.4], intact: [1.4, 1.6], inactive: [1.0, 1.0], loss: [0.8, 0.8], growth: [2.5, 2.5] },
} as const

/** 1살 미만은 성장기 계수(중성화·활동량 무시). 개는 4개월 미만 3.0, 이후 2.0 */
export function factorOf(s: Species, months: number, neutered: boolean, a: Activity): { range: readonly [number, number]; key: string } {
  if (months < 12) {
    const f = s === 'dog' ? (months < 4 ? FACTORS.dog.under4m : FACTORS.dog.growth) : FACTORS.cat.growth
    return { range: f, key: s === 'dog' && months < 4 ? 'under4m' : 'growth' }
  }
  const t = FACTORS[s]
  if (a === 'inactive' || a === 'loss') return { range: t[a], key: a }
  if (a === 'active' && s === 'dog') return { range: FACTORS.dog.active, key: 'active' }
  return { range: neutered ? t.neutered : t.intact, key: neutered ? 'neutered' : 'intact' }
}

export const TREAT_SHARE = 0.1

export function feeding(st: State) {
  const r = rer(st.w)
  const { range, key } = factorOf(st.s, st.y * 12 + st.m, st.n, st.a)
  const kcal = range.map((f) => f * r)
  const g = kcal.map((k) => (k / st.k) * 100)
  const pair = (xs: number[]) => [Math.round(xs[0]), Math.round(xs[1])] as const
  return {
    rer: r,
    factor: range,
    key,
    kcal: pair(kcal),
    g: pair(g),
    meal: pair(g.map((x) => x / st.f)),
    treat: pair(kcal.map((k) => k * TREAT_SHARE)),
  }
}

// ── 생일 → 만 개월(오늘 기준). 미래·형식 오류면 null
export function monthsFromBirth(birth: string, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth)
  if (!m) return null
  const [by, bm, bd] = [+m[1], +m[2], +m[3]]
  // 그달에 생일 날짜가 없으면(1/31생의 2월) 말일에 한 달이 찬다 — dday.ymd 와 같은 규칙
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const n = (today.getFullYear() - by) * 12 + (today.getMonth() + 1 - bm) - (today.getDate() < Math.min(bd, lastDay) ? 1 : 0)
  return n < 0 ? null : n
}

// ── 상태와 URL
export type State = { s: Species; y: number; m: number; w: number; z: Size | null; n: boolean; a: Activity; k: number; f: number }
export const DEF_W: Record<Species, number> = { dog: 7, cat: 4 }
export const DEFAULT: State = { s: 'dog', y: 5, m: 0, w: DEF_W.dog, z: null, n: true, a: 'normal', k: 380, f: 2 }
export const Y_MAX = 30
export const W_RANGE = [0.5, 100] as const
export const K_RANGE = [50, 700] as const
export const F_RANGE = [1, 6] as const

export const sizeFor = (st: State): Size => st.z ?? sizeOf(st.w)

const num = (v: string | null) => (v === null || v.trim() === '' ? NaN : Number(v))
const intIn = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi

export function parseState(get: (k: string) => string | null): State {
  const s: Species = get('s') === 'cat' ? 'cat' : 'dog'
  const y = num(get('y')), m = num(get('m')), w = num(get('w')), k = num(get('k')), f = num(get('f'))
  const z = get('z'), a = get('a')
  return {
    s,
    y: intIn(y, 0, Y_MAX) ? y : DEFAULT.y,
    m: intIn(m, 0, 11) ? m : DEFAULT.m,
    w: Number.isFinite(w) && w >= W_RANGE[0] && w <= W_RANGE[1] ? Math.round(w * 10) / 10 : DEF_W[s],
    z: s === 'dog' && (SIZES as readonly string[]).includes(z ?? '') ? (z as Size) : null,
    n: get('n') !== '0',
    a: (ACTIVITIES as readonly string[]).includes(a ?? '') && !(s === 'cat' && a === 'active') ? (a as Activity) : 'normal',
    k: Number.isFinite(k) && k >= K_RANGE[0] && k <= K_RANGE[1] ? Math.round(k) : DEFAULT.k,
    f: intIn(f, F_RANGE[0], F_RANGE[1]) ? f : DEFAULT.f,
  }
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(st: State): string {
  const q = new URLSearchParams()
  if (st.s !== DEFAULT.s) q.set('s', st.s)
  if (st.y !== DEFAULT.y) q.set('y', String(st.y))
  if (st.m !== DEFAULT.m) q.set('m', String(st.m))
  if (st.w !== DEF_W[st.s]) q.set('w', String(st.w))
  if (st.s === 'dog' && st.z) q.set('z', st.z)
  if (!st.n) q.set('n', '0')
  if (st.a !== DEFAULT.a) q.set('a', st.a)
  if (st.k !== DEFAULT.k) q.set('k', String(st.k))
  if (st.f !== DEFAULT.f) q.set('f', String(st.f))
  return q.toString()
}
