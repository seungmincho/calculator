// 금연 계산기 — 데이터와 순수 계산. React 의존 없음. 확인일 CHECKED.
//
// | 값 | 기관·자료 | 기준일 |
// |----|-----------|--------|
// | 건강 회복 단계 8개(20분~15년) | WHO, "Tobacco: health benefits of smoking cessation" | 2020-02-25 |
// | 개비당 약 20분(되찾은 수명, 연구 추정) | Jackson·Jarvis·West, Addiction, DOI 10.1111/add.16757 / 영국 보건사회복지부 보도자료 | 2024-12-30 |
// | 금단 증상: 첫 2~3일 가장 강하고 2~4주 안에 진정 | MSD 매뉴얼 일반인용 '금연' | 2025-04-10 |
// | 궐련 한 갑 4,500원 | 뉴시스 "4500원 안팎", 2015년 이후 동결 | 2026-03-03 |
// | 궐련형 전용 스틱 4,800원 | 인사이트, 한국필립모리스 테리아 권장소비자가격 | 2026-08-31 |
// | 하루 10개비 | 국민건강영양조사 1일 흡연량 통계를 찾지 못해 기본 10(참고: 한국보건사회연구원 2019 설문 12.5개비) | — |
// | 액상 월 10만 원 | 공식 통계 없음. 예시값 | — |
// | 지원 제도 | 국민건강보험공단 금연치료지원사업, 금연길라잡이, 서울시(2026-08-07), 국가암정보센터(2023-06-13) | 2026-11-22 확인 |

export const CHECKED = '2026-11-22'

export const SOURCES = {
  who: 'https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation',
  nhis: 'https://www.nhis.or.kr/nhis/healthin/retrieveSsmkInfo01.do',
  guide: 'https://www.nosmokeguide.go.kr/helpness/home',
  seoul: 'https://news.seoul.go.kr/welfare/archives/243201',
  cancer: 'https://cancer.go.kr/lay1/S1T204C207/contents.do',
  cancerTips: 'https://cancer.go.kr/lay1/S1T204C208/contents.do',
  msd: 'https://www.msdmanuals.com/ko/home/%ED%8A%B9%EB%B3%84-%EC%A3%BC%EC%A0%9C/%ED%9D%A1%EC%97%B0/%EA%B8%88%EC%97%B0',
  ucl: 'https://doi.org/10.1111/add.16757',
  dhsc: 'https://www.gov.uk/government/news/quit-for-a-week-and-save-a-day-say-health-experts',
  gg: 'https://www.gg.go.kr/myggd/vol209/2_1.php',
  priceCig: 'https://www.newsis.com/view/NISX20260227_0003529817',
  priceHeat: 'https://www.insight.co.kr/news/571030',
} as const

export const MIN = 60_000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR
export const YEAR = 365 * DAY
/** 서버 렌더·시작일 미입력 때의 고정 예시 */
export const EXAMPLE_MS = 30 * DAY
/** 개비당 잃는 기대수명(분) — UCL·Addiction 2024, 영국 흡연자 평균. 궐련에만 쓴다 */
export const LIFE_MIN_PER_CIG = 20

export type Kind = 'cig' | 'heat' | 'liquid'
export const KINDS = ['cig', 'heat', 'liquid'] as const
/** 종류별 가격 기본값: 궐련·궐련형은 한 갑, 액상은 한 달 비용 */
export const PRICE: Record<Kind, number> = { cig: 4500, heat: 4800, liquid: 100_000 }

export const N_RANGE = [1, 100] as const
export const P_RANGE = [100, 100_000] as const
export const M_RANGE = [1000, 3_000_000] as const
export const C_RANGE = [1, 100] as const
export const priceRange = (k: Kind) => (k === 'liquid' ? M_RANGE : P_RANGE)

/** d: 시작 시각(epoch ms) — null 이면 '30일 전 시작' 기본값 */
export type State = { d: number | null; n: number; k: Kind; p: number; c: number }
export const DEFAULT: State = { d: null, n: 10, k: 'cig', p: PRICE.cig, c: 20 }
export const KEYS = ['d', 'n', 'k', 'p', 'c'] as const

// ── 시간

/** 경과 ms. 시작일이 없거나 시계가 없으면(서버) 30일 예시, 미래 시작은 0 */
export const elapsed = (start: number | null, now: number) =>
  start === null || now <= 0 ? EXAMPLE_MS : Math.max(0, now - start)

export const split = (ms: number) => ({
  d: Math.floor(ms / DAY),
  h: Math.floor((ms % DAY) / HOUR),
  m: Math.floor((ms % HOUR) / MIN),
})

/** 남은 기간을 D-n 으로(올림). 하루 미만이면 0 */
export const dday = (left: number) => (left >= DAY ? Math.ceil(left / DAY) : 0)

// ── 돈·개비

/** 하루 비용(원). 액상은 월 비용 × 12 ÷ 365 */
export const perDay = (s: State) => (s.k === 'liquid' ? (s.p * 12) / 365 : (s.n * s.p) / s.c)
export const savedWon = (s: State, ms: number) => Math.floor((perDay(s) * ms) / DAY + 1e-6)
/** 안 피운 개비(스틱) 수. 액상은 셀 수 없어 null */
export const notSmoked = (s: State, ms: number) => (s.k === 'liquid' ? null : Math.floor((s.n * ms) / DAY + 1e-9))
/** 이대로 years 년 이어 가면 아낄 돈(시작부터 합계, 지금 가격 기준) */
export const projection = (s: State, years: number) => Math.round(perDay(s) * 365 * years)
/** 되찾은 수명(분, 연구 추정). 궐련만 */
export const lifeMinutes = (s: State, ms: number) => (s.k === 'cig' ? (notSmoked(s, ms) ?? 0) * LIFE_MIN_PER_CIG : null)

/** 금단 증상 시기(MSD): 첫 2~3일 가장 강하고 2~4주 안에 진정 */
export const withdrawal = (ms: number) => (ms < 3 * DAY ? 'peak' : ms < 28 * DAY ? 'easing' : null)

/** 한국식 금액: 202500 → '20만 2,500' */
export function manWon(n: number): string {
  const v = Math.max(0, Math.floor(n))
  const eok = Math.floor(v / 1e8), man = Math.floor((v % 1e8) / 1e4), rest = v % 1e4
  const parts = [eok ? `${eok.toLocaleString('ko-KR')}억` : '', man ? `${man.toLocaleString('ko-KR')}만` : '', rest ? rest.toLocaleString('ko-KR') : '']
  return parts.filter(Boolean).join(' ') || '0'
}

// ── 건강 회복 타임라인(WHO 원문 시점만). 월 = 30일, 년 = 365일 근사
// ponytail: 고정 길이 근사라 윤년·달 길이로 하루 안팎 어긋남. 달력 기념일이 필요하면 시작일 기준 Date 계산으로

export type Step = { id: string; at: number; end?: number }
export const STEPS: readonly Step[] = [
  { id: 'min20', at: 20 * MIN },
  { id: 'h12', at: 12 * HOUR },
  { id: 'w2to12', at: 14 * DAY, end: 84 * DAY },
  { id: 'm1to9', at: 30 * DAY, end: 270 * DAY },
  { id: 'y1', at: YEAR },
  { id: 'y5', at: 5 * YEAR },
  { id: 'y10', at: 10 * YEAR },
  { id: 'y15', at: 15 * YEAR },
]

/** 경계 시각에 닿으면 지난 것으로 본다 */
export const stepStatus = (st: Step, ms: number): 'done' | 'now' | 'todo' =>
  ms >= (st.end ?? st.at) ? 'done' : ms >= st.at ? 'now' : 'todo'

/** 아직 시작하지 않은 첫 단계와 남은 ms. 모두 지났으면 null */
export function nextStep(ms: number) {
  const i = STEPS.findIndex((st) => st.at > ms)
  return i < 0 ? null : { i, step: STEPS[i], left: STEPS[i].at - ms }
}

// ── URL·저장(같은 쿼리 문자열)

const pad = (n: number) => String(n).padStart(2, '0')
/** 로컬 시각 'YYYY-MM-DDTHH:mm' (datetime-local 값과 같다) */
export function formatD(ms: number): string {
  const t = new Date(ms)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`
}
/** 'YYYY-MM-DD' 또는 'YYYY-MM-DDTHH:mm'(로컬). 없는 날짜·범위 밖은 null */
export function parseD(v: string | null): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(v ?? '')
  if (!m) return null
  const [y, mo, d] = [m[1], m[2], m[3]].map(Number)
  const h = m[4] ? Number(m[4]) : 0, mi = m[5] ? Number(m[5]) : 0
  if (y < 1900 || y > 2100 || h > 23 || mi > 59) return null
  const t = new Date(y, mo - 1, d, h, mi)
  return t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === d ? t.getTime() : null
}

const isKind = (k: string | null): k is Kind => (KINDS as readonly string[]).includes(k ?? '')
const int = (s: string | null, [lo, hi]: readonly [number, number]) => {
  const n = s === null || s.trim() === '' ? NaN : Number(s)
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null
}

/** 키가 없거나 틀리면 기본값. 액상은 n·c 를 쓰지 않아 기본값으로 둔다 */
export function parseState(get: (k: string) => string | null): State {
  const k = isKind(get('k')) ? (get('k') as Kind) : DEFAULT.k
  const liquid = k === 'liquid'
  return {
    d: parseD(get('d')),
    n: (!liquid && int(get('n'), N_RANGE)) || DEFAULT.n,
    k,
    p: int(get('p'), priceRange(k)) ?? PRICE[k],
    c: (!liquid && int(get('c'), C_RANGE)) || DEFAULT.c,
  }
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(s: State): string {
  const q = new URLSearchParams()
  if (s.d !== null) q.set('d', formatD(s.d))
  if (s.k !== 'liquid' && s.n !== DEFAULT.n) q.set('n', String(s.n))
  if (s.k !== DEFAULT.k) q.set('k', s.k)
  if (s.p !== PRICE[s.k]) q.set('p', String(s.p))
  if (s.k !== 'liquid' && s.c !== DEFAULT.c) q.set('c', String(s.c))
  return q.toString().replace(/%3A/g, ':')
}

export const STORAGE_KEY = 'toolhub:quit-smoking'
export type Saved = { s: State | null; best: number }

/** 저장 형식 { q: 쿼리 문자열, best: 최장 기록 ms }. 틀리면 비운다 */
export function parseSaved(raw: string | null): Saved {
  let data: unknown
  try { data = JSON.parse(raw ?? 'null') } catch { return { s: null, best: 0 } }
  if (!data || typeof data !== 'object') return { s: null, best: 0 }
  const { q, best } = data as { q?: unknown; best?: unknown }
  const p = typeof q === 'string' ? new URLSearchParams(q) : null
  return {
    s: p ? parseState((k) => p.get(k)) : null,
    best: typeof best === 'number' && Number.isFinite(best) && best > 0 && best < 200 * YEAR ? best : 0,
  }
}
