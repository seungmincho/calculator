// 세뱃돈 계산 — 순수 함수. 검증: node scripts/check-sebaetdon.ts
//
// 나이대별 참고 범위는 공식 통계가 없어 언론에 보도된 설문·송금 데이터를 모아 정했다(확인일 CHECKED).
// | 근거                                   | 내용                                                              | 기준일·보도일 | URL |
// |----------------------------------------|-------------------------------------------------------------------|---------------|-----|
// | 카카오페이 송금봉투(연합뉴스·파이낸셜뉴스) | 2024년 설 중·고생 평균 7만4천원(2021년 5만4천원), 부모님 용돈 약 20만원, 투표 7만8천여명 65% '5만원' | 2025-01-24 | https://www.fnnews.com/news/202501241017020979 |
// | 카카오페이 페이어텐션(메트로신문)        | 2025년 설 중·고생 송금봉투 10만원 42% 최다(전년 5만원 39%·10만원 37%), 부모님 용돈 평균 22만7천원 | 2026-02-16 | https://www.metroseoul.co.kr/article/20260216500041 |
// | 매일신문(설문·보도 종합)                 | 미취학·초등 저학년 1~3만, 초등 고학년 3~5만, 중·고생 5~10만, 대학생·취준생 10~20만 | 2026-02-14 | https://www.imaeil.com/page/view/2026021217150788280 |
// | YTN(카드사 고객 약 400명 설문 최다 응답) | 미취학 1만, 초등 3~5만, 중·고생 5~10만, 성인 10만                    | 2024-02-09 | https://www.ytn.co.kr/_ln/0102_202402091524540364 |
// | 세계일보(한화생명 임직원 2,600명)        | 초등 이하 3만, 중학생 5만, 고등·대학생 10만 최다 / 부모님 용돈 30만 36.2%·20만 26.6% | 2023-01-19 | https://www.segye.com/newsView/20230119510300 |
// 신권 교환: 한국은행 '명절 제조화폐 교환' 본부(서울) 1인 1일 한도 5만원권 100만원 등, 2026 설 본점 2/4~2/13·지역본부 2/9~2/13(이투데이 2026-02-04)
// 세금: 상속세 및 증여세법 §46·시행령 §35④(축하금 등 통상 필요 금품 비과세), §53(미성년 자녀가 직계존속에게 10년 2천만원 공제) — 국세청 '증여재산가액' 안내
import { getKoreanHolidays } from './koreanHolidays.ts'
import { daysBetween } from './dday.ts'

export const CHECKED = '2026-11-22'

export const BANDS = ['pre', 'el', 'eh', 'mid', 'high', 'univ', 'adult'] as const
export type Band = (typeof BANDS)[number]

/** 나이대별 [하한, 상한, 참고값] 원. 참고값 = 위 자료에서 가장 많이 꼽힌 금액 */
export const REF: Record<Band, readonly [number, number, number]> = {
  pre: [10_000, 30_000, 20_000], // 매일 1~3만, YTN 최다 1만 → 가운데 2만
  el: [10_000, 30_000, 30_000], // 매일 1~3만, 한화생명 '초등 이하' 최다 3만
  eh: [30_000, 50_000, 50_000], // 매일 3~5만, YTN 초등 3~5만
  mid: [50_000, 100_000, 50_000], // 매일·YTN 5~10만, 한화생명 중학생 최다 5만
  high: [50_000, 100_000, 100_000], // 카카오페이 2025 설 중·고생 10만 42% 최다, 한화생명 고등 10만
  univ: [100_000, 200_000, 100_000], // 매일 10~20만, 한화생명 대학생 최다 10만
  adult: [200_000, 300_000, 200_000], // 부모님 용돈: 카카오페이 평균 약 20만(2024 설)·22만7천(2025 설), 한화생명 30만 최다
}

/** 관계 프리셋: 조카·손주·자녀·동생·사촌·부모님. 그 밖의 문자열은 직접 입력한 관계 이름 */
export const RELS = ['n', 'g', 'c', 's', 'u', 'p'] as const
export const isPresetRel = (r: string) => (RELS as readonly string[]).includes(r)
const REL_MAX = 12
// 코드 포인트 단위로 자른다(.slice 는 이모지 서로게이트 쌍을 반으로 잘라 URL 에서 '�' 가 된다)
export const cleanRel = (r: string) => Array.from(r.replace(/[._]/g, '')).slice(0, REL_MAX).join('')
export const defaultRel = (b: Band) => (b === 'adult' ? 'p' : 'n')

export type Row = { rel: string; band: Band; n: number; amt: number }
export type State = { rows: Row[]; budget: number }

export const N_MAX = 30
export const AMT_MIN = 1_000
export const AMT_MAX = 1_000_000
export const ROWS_MAX = 20
export const BUDGET_MAX = 100_000_000

export const DEFAULT_ROWS: readonly Row[] = [
  { rel: 'n', band: 'pre', n: 1, amt: 20_000 },
  { rel: 'n', band: 'el', n: 1, amt: 30_000 },
  { rel: 'n', band: 'eh', n: 1, amt: 50_000 },
  { rel: 'n', band: 'mid', n: 1, amt: 50_000 },
  { rel: 'n', band: 'high', n: 1, amt: 100_000 },
]
export const DEFAULT: State = { rows: DEFAULT_ROWS.map((r) => ({ ...r })), budget: 0 }

// ── 신권 장수

export const NOTES = [50_000, 10_000, 5_000, 1_000] as const

/** 한 사람 몫을 큰 권종부터 최소 장수로. 금액은 1천원 단위로 받는다 */
export function notesFor(amt: number): number[] {
  let left = Math.max(0, Math.floor(amt / 1000) * 1000)
  return NOTES.map((v) => {
    const k = Math.floor(left / v)
    left -= k * v
    return k
  })
}

// ── 계산

export function calc(s: State) {
  const notes = NOTES.map(() => 0)
  const byBand = new Map<Band, { people: number; total: number }>()
  let people = 0
  let total = 0
  for (const r of s.rows) {
    const sum = r.n * r.amt
    people += r.n
    total += sum
    notesFor(r.amt).forEach((k, i) => { notes[i] += k * r.n })
    const b = byBand.get(r.band) ?? { people: 0, total: 0 }
    byBand.set(r.band, { people: b.people + r.n, total: b.total + sum })
  }
  return {
    people,
    total,
    envelopes: people,
    avg: people ? Math.round(total / people) : 0,
    notes,
    sheets: notes.reduce((a, b) => a + b, 0),
    byBand: BANDS.filter((b) => byBand.has(b)).map((band) => ({ band, ...byBand.get(band)! })),
    /** 예산 - 총액(양수 = 남음, 음수 = 초과). 예산이 없으면 null */
    left: s.budget > 0 ? s.budget - total : null,
  }
}

// ── 다음 설날 D-day (today: 'YYYY-MM-DD', 한국 시간)

export function nextSeollal(today: string): { date: string; days: number } | null {
  const y = Number(today.slice(0, 4))
  for (const year of [y, y + 1]) {
    const d = getKoreanHolidays(year).find((h) => h.nameKey === 'seollal')?.date
    if (d && d >= today) return { date: d, days: daysBetween(today, d) }
  }
  return null
}

// ── URL: r = 나이대.인원.금액(천원).관계 를 '_' 로 잇는다, b = 예산(천원). 기본이면 쿼리 없음

const isBand = (b: string): b is Band => (BANDS as readonly string[]).includes(b)
const intIn = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi

function validRow(x: unknown): Row | null {
  if (!x || typeof x !== 'object') return null
  const { rel, band, n, amt } = x as Record<string, unknown>
  if (typeof band !== 'string' || !isBand(band) || !intIn(n, 1, N_MAX)) return null
  if (!intIn(amt, AMT_MIN, AMT_MAX) || (amt as number) % 1000 !== 0) return null
  return { rel: typeof rel === 'string' ? cleanRel(rel) : defaultRel(band), band, n: n as number, amt: amt as number }
}

const encodeRow = (r: Row) => `${r.band}.${r.n}.${r.amt / 1000}.${cleanRel(r.rel)}`
const numOrNaN = (s: string | undefined) => (s === undefined || s === '' || !/^\d+$/.test(s) ? NaN : Number(s))

export function decodeRows(r: string): Row[] {
  const out: Row[] = []
  for (const part of r.split('_')) {
    const [band, n, k, ...rest] = part.split('.')
    const row = validRow({ band, n: numOrNaN(n), amt: numOrNaN(k) * 1000, rel: rest.length ? rest.join('') : undefined })
    if (row && out.length < ROWS_MAX) out.push(row)
  }
  return out
}

export const hasQuery = (get: (k: string) => string | null) => get('r') !== null || get('b') !== null

export function parseQuery(get: (k: string) => string | null): State {
  const r = get('r')
  const rows = r === null ? [] : decodeRows(r)
  const b = numOrNaN(get('b') ?? undefined) * 1000
  return {
    rows: rows.length ? rows : DEFAULT.rows.map((x) => ({ ...x })),
    budget: Number.isFinite(b) && b > 0 && b <= BUDGET_MAX ? b : 0,
  }
}

export function toQuery(s: State): string {
  const q = new URLSearchParams()
  const r = s.rows.map(encodeRow).join('_')
  if (r !== DEFAULT.rows.map(encodeRow).join('_')) q.set('r', r)
  if (s.budget > 0) q.set('b', String(Math.round(s.budget / 1000)))
  return q.toString()
}

// ── 이 기기 저장(localStorage)

export const STORE_KEY = 'toolhub:sebaetdon:v1'

export function parseSaved(raw: string | null): State | null {
  let data: unknown
  try { data = JSON.parse(raw ?? 'null') } catch { return null }
  if (!data || typeof data !== 'object') return null
  const { rows, budget } = data as Record<string, unknown>
  if (!Array.isArray(rows)) return null
  const ok = rows.map(validRow).filter((x): x is Row => x !== null).slice(0, ROWS_MAX)
  if (!ok.length) return null
  return { rows: ok, budget: intIn(budget, 1, BUDGET_MAX) && (budget as number) % 1000 === 0 ? (budget as number) : 0 }
}
