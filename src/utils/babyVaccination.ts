// 아기 예방접종 일정 — 데이터와 순수 계산. 회귀 체크: node scripts/check-baby-vaccination.ts
// 날짜는 모두 'YYYY-MM-DD' 문자열(dday.ts 의 UTC 산술)이라 시간대와 무관하다. 월 더하기의 말일 처리도 dday.addMonths 와 같다.
//
// 출처(확인일 CHECKED)
// | 무엇                                   | 기관 · 문서                                                         | 기준일            |
// |----------------------------------------|---------------------------------------------------------------------|-------------------|
// | 백신별 차수·권장 시기(SCHEDULE)         | 질병관리청 예방접종도우미 「표준예방접종일정표(2026)」 원문 이미지   | 2026판            |
// | 차수 사이 간격(note: hepa·jei·jel·hpv)  | 예방접종도우미 감염병별 페이지(A형간염·일본뇌염·사람유두종바이러스)  | 확인일            |
// | 국가지원 대상(12세 이하, 2013.1.1 이후) | 예방접종도우미 「국가예방접종사업」                                 | 최종검토 2026-07-14 |
// | 인플루엔자 2026-2027절기(FLU)           | 예방접종도우미 「인플루엔자 국가예방접종」                           | 최종검토 2026-08-25 |
// | 영유아 건강검진 1~8차·구강검진 1~4차    | 국민건강보험공단 「영유아 건강검진 안내」                            | 2026 안내         |
// 건강검진 "a~b개월" 의 끝나는 날은 '생후 b+1개월이 되기 전날'로 해석했다(원문에 계산 규칙 없음 → 공단 조회 화면으로 확인 안내).

import { addDays, addMonths, daysBetween, isValidDate, ymd } from './dday.ts'
import type { IcsEvent } from './carMaintenance.ts'

export const CHECKED = '2026-11-22'
export const SCHEDULE_YEAR = 2026

export const SOURCES = {
  schedule: 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuLv=1&menuCd=115',
  nip: 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuLv=1&menuCd=131',
  diseases: 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuLv=1&menuCd=1102',
  flu: 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuLv=1&menuCd=134',
  hpv: 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuLv=1&menuCd=132',
  care: 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuLv=1&menuCd=114',
  nhis: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
} as const

export const LINKS = {
  history: 'https://nip.kdca.go.kr/irhp/mngm/goVcntMngm.do?menuLv=3&menuCd=312',
  clinic: 'https://nip.kdca.go.kr/irhp/mngm/goVcntMngm.do?menuLv=3&menuCd=331',
  nhisDates: 'https://www.nhis.or.kr/nhis/healthin/retrieveInfntExmdDtInq.do',
} as const

export type Rv = 'rv1' | 'rv5'
export type Je = 'i' | 'l'

/**
 * 표준예방접종일정표(2026)의 칸 하나 = 한 항목. from~to 는 표의 열 그대로(양 끝 포함).
 * unit 'd' 는 일(출생시 = 0~0, 4주이내 = 0~28), 없으면 개월(4세 = 48, 6세 = 72~83, 12세 = 144~155).
 * '1~2' 처럼 표가 두 차수를 한 칸으로 묶은 것은 한 항목으로 둔다(간격은 note).
 */
export type Dose = {
  id: string
  vax: string
  n: string
  from: number
  to: number
  unit?: 'd'
  rv?: Rv
  je?: Je
  note?: string
}

export const SCHEDULE: readonly Dose[] = [
  { id: 'bcg1', vax: 'bcg', n: '1', from: 0, to: 28, unit: 'd', note: 'bcg' },
  { id: 'hepb1', vax: 'hepb', n: '1', from: 0, to: 0, unit: 'd', note: 'hepb1' },
  { id: 'hepb2', vax: 'hepb', n: '2', from: 1, to: 1 },
  { id: 'hepb3', vax: 'hepb', n: '3', from: 6, to: 6 },
  { id: 'dtap1', vax: 'dtap', n: '1', from: 2, to: 2 },
  { id: 'dtap2', vax: 'dtap', n: '2', from: 4, to: 4 },
  { id: 'dtap3', vax: 'dtap', n: '3', from: 6, to: 6 },
  { id: 'dtap4', vax: 'dtap', n: '4', from: 15, to: 18 },
  { id: 'dtap5', vax: 'dtap', n: '5', from: 48, to: 83 },
  { id: 'dtap6', vax: 'tdap', n: '6', from: 132, to: 155 },
  { id: 'ipv1', vax: 'ipv', n: '1', from: 2, to: 2 },
  { id: 'ipv2', vax: 'ipv', n: '2', from: 4, to: 4 },
  { id: 'ipv3', vax: 'ipv', n: '3', from: 6, to: 18 },
  { id: 'ipv4', vax: 'ipv', n: '4', from: 48, to: 83 },
  { id: 'hib1', vax: 'hib', n: '1', from: 2, to: 2 },
  { id: 'hib2', vax: 'hib', n: '2', from: 4, to: 4 },
  { id: 'hib3', vax: 'hib', n: '3', from: 6, to: 6 },
  { id: 'hib4', vax: 'hib', n: '4', from: 12, to: 15 },
  { id: 'pcv1', vax: 'pcv', n: '1', from: 2, to: 2 },
  { id: 'pcv2', vax: 'pcv', n: '2', from: 4, to: 4 },
  { id: 'pcv3', vax: 'pcv', n: '3', from: 6, to: 6 },
  { id: 'pcv4', vax: 'pcv', n: '4', from: 12, to: 15 },
  { id: 'rv1', vax: 'rv', n: '1', from: 2, to: 2 },
  { id: 'rv2', vax: 'rv', n: '2', from: 4, to: 4 },
  { id: 'rv3', vax: 'rv', n: '3', from: 6, to: 6, rv: 'rv5' },
  { id: 'mmr1', vax: 'mmr', n: '1', from: 12, to: 15 },
  { id: 'mmr2', vax: 'mmr', n: '2', from: 48, to: 83 },
  { id: 'var1', vax: 'var', n: '1', from: 12, to: 15 },
  { id: 'hepa12', vax: 'hepa', n: '1~2', from: 12, to: 35, note: 'hepa' },
  { id: 'jei12', vax: 'jei', n: '1~2', from: 12, to: 23, je: 'i', note: 'jei12' },
  { id: 'jei3', vax: 'jei', n: '3', from: 24, to: 35, je: 'i', note: 'jei3' },
  { id: 'jei4', vax: 'jei', n: '4', from: 72, to: 83, je: 'i' },
  { id: 'jei5', vax: 'jei', n: '5', from: 144, to: 155, je: 'i' },
  { id: 'jel1', vax: 'jel', n: '1', from: 12, to: 23, je: 'l' },
  { id: 'jel2', vax: 'jel', n: '2', from: 24, to: 35, je: 'l', note: 'jel2' },
  { id: 'hpv12', vax: 'hpv', n: '1~2', from: 132, to: 155, note: 'hpv' },
]

/** 영유아 건강검진(gen) 1~8차, 구강검진(oral) 1~4차 — 국민건강보험공단 */
export type Checkup = { id: string; kind: 'gen' | 'oral'; n: number; from: number; to: number; unit?: 'd' }
export const CHECKUPS: readonly Checkup[] = [
  { id: 'gen1', kind: 'gen', n: 1, from: 14, to: 35, unit: 'd' },
  { id: 'gen2', kind: 'gen', n: 2, from: 4, to: 6 },
  { id: 'gen3', kind: 'gen', n: 3, from: 9, to: 12 },
  { id: 'gen4', kind: 'gen', n: 4, from: 18, to: 24 },
  { id: 'gen5', kind: 'gen', n: 5, from: 30, to: 36 },
  { id: 'gen6', kind: 'gen', n: 6, from: 42, to: 48 },
  { id: 'gen7', kind: 'gen', n: 7, from: 54, to: 60 },
  { id: 'gen8', kind: 'gen', n: 8, from: 66, to: 71 },
  { id: 'oral1', kind: 'oral', n: 1, from: 18, to: 29 },
  { id: 'oral2', kind: 'oral', n: 2, from: 30, to: 41 },
  { id: 'oral3', kind: 'oral', n: 3, from: 42, to: 53 },
  { id: 'oral4', kind: 'oral', n: 4, from: 54, to: 65 },
]

/** 인플루엔자 국가예방접종 절기. ponytail: 해마다 9월 질병관리청 발표로 손으로 바꾼다 */
export const FLU = { season: '2026-2027', start: '2026-09-21', end: '2027-04-30', bornFrom: '2012-01-01', bornTo: '2026-08-31' } as const
/** 국가예방접종 지원: 12세 이하 어린이(2013.1.1. 이후 출생자, 2026년도 기준) */
export const NIP_BORN_FROM = '2013-01-01'

// ── 날짜

/** [시작, 끝] 양 끝 포함. 개월은 'to 개월이 끝나는 날' = to+1 개월이 되기 전날 */
export function windowOf(b: string, x: { from: number; to: number; unit?: 'd' }): [string, string] {
  if (x.unit === 'd') return [addDays(b, x.from), addDays(b, x.to)]
  return [addMonths(b, x.from), addDays(addMonths(b, x.to + 1), -1)]
}

export const monthEnd = (d: string) => addDays(addMonths(`${d.slice(0, 7)}-01`, 1), -1)

/** 만 n개월 n일, 생후 n일. 출생 전이면 null */
export function ageOf(b: string, today: string) {
  const days = daysBetween(b, today)
  if (days < 0) return null
  const r = ymd(b, today)
  return { months: r.totalMonths, days: r.days, totalDays: days }
}

export type Status = 'done' | 'past' | 'now' | 'soon'
/** 지남 = 끝난 날 < 오늘, 이번 달 = 이번 달 말일까지 시작하고 아직 안 끝남, 예정 = 다음 달 이후 시작 */
export function statusOf(start: string, end: string, today: string, done = false): Status {
  if (done) return 'done'
  if (end < today) return 'past'
  return start <= monthEnd(today) ? 'now' : 'soon'
}

export type Row = Dose & { start: string; end: string }
export const ORDER = ['bcg', 'hepb', 'dtap', 'tdap', 'ipv', 'hib', 'pcv', 'rv', 'mmr', 'var', 'hepa', 'jei', 'jel', 'hpv']

/** 선택한 로타 제품·일본뇌염 종류에 맞는 항목을 날짜순으로(같은 날이면 표 순서) */
export function scheduleFor(b: string, rv: Rv, je: Je): Row[] {
  return SCHEDULE
    .filter((d) => (!d.rv || d.rv === rv) && (!d.je || d.je === je))
    .map((d) => { const [start, end] = windowOf(b, d); return { ...d, start, end } })
    .sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : x.end < y.end ? -1 : x.end > y.end ? 1 : ORDER.indexOf(x.vax) - ORDER.indexOf(y.vax)))
}

/** 같은 권장 기간끼리 묶는다(타임라인 한 칸) */
export function groupRows(rows: readonly Row[]) {
  const out: { start: string; end: string; from: number; to: number; unit?: 'd'; rows: Row[] }[] = []
  for (const r of rows) {
    const g = out[out.length - 1]
    if (g && g.start === r.start && g.end === r.end) g.rows.push(r)
    else out.push({ start: r.start, end: r.end, from: r.from, to: r.to, unit: r.unit, rows: [r] })
  }
  return out
}

/** 다음 접종 = 완료 안 했고 아직 안 끝난 항목 중 가장 이른 시작일, 그 날 시작하는 것 모두. diff ≤ 0 이면 지금 접종 시기 */
export function nextDoses(rows: readonly Row[], today: string, done: ReadonlySet<string>) {
  const open = rows.filter((r) => !done.has(r.id) && r.end >= today)
  if (!open.length) return null
  const start = open.reduce((m, r) => (r.start < m ? r.start : m), open[0].start)
  const list = open.filter((r) => r.start === start)
  return { start, end: list.reduce((m, r) => (r.end < m ? r.end : m), list[0].end), diff: daysBetween(today, start), list }
}

/**
 * 이번 절기 인플루엔자 국가지원 판정. ok.from = 접종 가능 첫날(절기 시작·생후 6개월 중 늦은 날).
 * 지원 출생일 끝(8/31)이 절기 끝(4/30)보다 8개월 앞이라 지원 대상은 모두 절기 안에 생후 6개월이 된다.
 */
export function fluStatus(b: string) {
  const six = addMonths(b, 6)
  if (b < FLU.bornFrom) return { kind: 'old' as const }
  if (b > FLU.bornTo) return { kind: 'bornAfter' as const, from: six }
  return { kind: 'ok' as const, from: six > FLU.start ? six : FLU.start, to: FLU.end }
}

export type AgeLabel = { k: 'birth' | 'weeks' | 'days' | 'month' | 'months' | 'year' | 'years'; a: number; b: number }
/** 표 열 이름 그대로: 출생시·4주이내·생후 a~b일·a개월·a~b개월·만 a세·만 a~b세(48개월 이상이고 해 단위로 떨어질 때) */
export function ageLabel(x: { from: number; to: number; unit?: 'd' }): AgeLabel {
  if (x.unit === 'd') {
    if (x.to === 0) return { k: 'birth', a: 0, b: 0 }
    return x.from === 0 && x.to % 7 === 0 ? { k: 'weeks', a: x.to / 7, b: x.to / 7 } : { k: 'days', a: x.from, b: x.to }
  }
  if (x.from >= 48 && x.from % 12 === 0 && (x.to + 1) % 12 === 0) {
    const a = x.from / 12
    const b = (x.to + 1) / 12 - 1
    return { k: a === b ? 'year' : 'years', a, b }
  }
  return { k: x.from === x.to ? 'month' : 'months', a: x.from, b: x.to }
}
export const FLU_ID = `flu${FLU.season}`

export const nipEligible = (b: string) => b >= NIP_BORN_FROM

// ── URL: b(생년월일, 사용자가 직접 정했을 때만), r(로타 제품), j(일본뇌염 종류)

export type State = { b: string | null; r: Rv; j: Je }
export const DEFAULT: State = { b: null, r: 'rv1', j: 'i' }
export const B_RANGE = ['2000-01-01', '2099-12-31'] as const
/** 서버 렌더·하이드레이션 첫 화면용 고정 예시(생후 2개월). 마운트 뒤에는 오늘 기준으로 바뀐다 */
export const DEMO_TODAY = '2026-11-22'
export const defaultBirth = (today: string) => addMonths(today, -2)

export const validBirth = (s: string | null | undefined): s is string => isValidDate(s) && s >= B_RANGE[0] && s <= B_RANGE[1]

export function parseState(get: (k: string) => string | null): State {
  const b = get('b')
  const r = get('r')
  const j = get('j')
  return {
    b: validBirth(b) ? b : DEFAULT.b,
    r: r === 'rv1' || r === 'rv5' ? r : DEFAULT.r,
    j: j === 'i' || j === 'l' ? j : DEFAULT.j,
  }
}

export function toQuery(s: State): string {
  const q = new URLSearchParams()
  if (s.b) q.set('b', s.b)
  if (s.r !== DEFAULT.r) q.set('r', s.r)
  if (s.j !== DEFAULT.j) q.set('j', s.j)
  return q.toString()
}

// ── 완료 체크(localStorage 에만, 생일별)

export const STORE_KEY = 'toolhub-baby-vaccination-v1'
export type DoneMap = Record<string, string[]>
const KNOWN = new Set<string>([...SCHEDULE.map((d) => d.id), ...CHECKUPS.map((c) => c.id), FLU_ID])
const STORE_MAX = 20

/** 깨졌거나 모르는 값은 버린다. 생일 키는 날짜 형식만 */
export function parseDone(raw: string | null): DoneMap {
  let data: unknown
  try { data = JSON.parse(raw ?? '{}') } catch { return {} }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const out: DoneMap = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (!validBirth(k) || !Array.isArray(v)) continue
    const ids = [...new Set(v.filter((x): x is string => typeof x === 'string' && KNOWN.has(x)))]
    if (ids.length) out[k] = ids
  }
  return out
}

/** 한 생일의 완료 목록을 바꾼다. 비면 키를 지우고, 생일이 많아지면 오래 안 바꾼 것부터 뺀다 */
export function setDone(map: DoneMap, b: string, ids: Iterable<string>): DoneMap {
  const rest = { ...map }
  delete rest[b]
  const list = [...new Set(ids)].filter((x) => KNOWN.has(x))
  const next: DoneMap = list.length ? { ...rest, [b]: list } : rest
  const keys = Object.keys(next)
  return keys.length > STORE_MAX ? Object.fromEntries(keys.slice(-STORE_MAX).map((k) => [k, next[k]])) : next
}

// ── 캘린더(.ics): 완료 안 했고 아직 안 끝난 접종·검진. 이미 기간 안이면 오늘 날짜로

export type IcsItem = { id: string; start: string; end: string; title: string }
export function icsEvents(b: string, items: readonly IcsItem[], today: string, done: ReadonlySet<string>, description: string): IcsEvent[] {
  return items
    .filter((x) => !done.has(x.id) && x.end >= today)
    .map((x) => ({ uid: `baby-vaccination-${b}-${x.id}`, date: x.start > today ? x.start : today, title: x.title, description, alarmDays: 1 }))
}
