// 중소기업 취업자 소득세 감면 계산기(/sme-tax-exemption) 전용 로직. 회귀 체크: node scripts/check-sme-tax-exemption.ts
// 근거(2026-11-08 원문 확인 — 조특법은 casenote.kr 현행본 법률 제21467호, 시행령은 law.go.kr 대통령령 제36587호 2026.9.18 시행):
//   조특법 §30① (마지막 개정 2025.3.14 — 2025.12 개정에서 연장 안 됨): 2012.1.1(60세 이상·장애인 2014.1.1)부터 2026.12.31까지 취업,
//     취업일부터 3년(청년 5년)이 되는 날이 속하는 달까지 발생한 근로소득에 소득세 70%(청년 90%), 과세기간별 200만원 한도.
//     감면기간은 이직·재취업·고용 승계와 관계없이 감면받은 최초 취업일부터. ② 원천징수의무자에게 신청(퇴직자는 주소지 세무서장)
//   조특령 §27 ①1호 청년 = 근로계약 체결일 현재 15~34세. 병역(현역병·상근예비역·의무경찰·의무소방·사회복무요원, 현역 장교·준사관·부사관)
//     기간은 6년 한도로 연령에서 뺌. ①2호 60세 이상 = 근로계약 체결일 현재. ⑤ 취업일이 속하는 달의 다음 달 말일까지 감면신청서.
//     ⑧ 감면세액 = 산출세액 × (근로소득금액/종합소득금액) × (감면대상 총급여/총급여) × 감면율, 200만원 한도
//     ⑨ 근로소득세액공제 = 공제액 × (1 − 감면세액 / 근로소득분 산출세액)
// 산출세액·공제는 yearEndTax.ts calc(연말정산 계산기와 같은 함수). calc의 sme는 '1년 내내 90%'라서, 여기서는 sme 없이 계산한
// 특별공제·표준세액공제 두 경로의 산출세액에 ⑧(기간 비율·70%)과 ⑨를 다시 적용해 결정세액 차이를 구한다(calc와 같은 경로 선택 규칙).
// 미반영: 2026 세제개편안(2026.8.3 발표, 국회 심의 중) — 비수도권 감면기간·감면율 상향, 적용기한 연장. 병역 후 복직 특례(§30① 괄호)
import { calc, earnedIncomeCredit, DEFAULT_INPUT, SME_CAP, TAX_YEAR, type YetInput, type YetResult } from './yearEndTax.ts'

export const KINDS = ['youth', 'senior', 'disabled', 'careerBreak'] as const
export type Kind = (typeof KINDS)[number]
export const DEADLINE = '2026-12-31' // §30① 이 날까지 취업해야 대상
export const FROM: Record<Kind, string> = { youth: '2012-01-01', careerBreak: '2012-01-01', senior: '2014-01-01', disabled: '2014-01-01' }
export const PCT = { youth: 90, other: 70 } // 감면율(%)
export const YEARS = { youth: 5, other: 3 }
export const YOUTH_MIN = 15, YOUTH_MAX = 34, SENIOR_MIN = 60
export const MILITARY_CAP = 72 // 병역 차감 한도 6년(개월)

export interface SmeInput {
  start: string      // 지금 회사 취업일(근로계약 체결일로 봄) YYYY-MM-DD
  birth: string      // 생년월일
  military: number   // 병역 개월 (청년만)
  kind: Kind
  salary: number     // 연봉(총급여, 12개월 기준)
  excluded: boolean  // 회사 업종이 감면 대상 업종이 아님 (시행령 §27③)
  prev: string       // 이직 전 회사에서 감면받기 시작한 날(최초 취업일). '' = 없음
}

// ── 날짜: 'YYYY-MM-DD' 문자열(사전순 = 시간순), UTC로만 계산 ──
const ymd = (s: string) => s.split('-').map(Number) as [number, number, number]
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
export const isDate = (s: string | null): s is string => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = ymd(s)
  return iso(Date.UTC(y, m - 1, d)) === s
}
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m: 1~12

/** 만 나이(개월). 생일 '일'이 안 지났으면 한 달 덜 — 해당 일이 없는 달은 말일 다음 날 넘어감(민법 §160③과 같은 결과) */
export function ageMonths(birth: string, at: string) {
  const [by, bm, bd] = ymd(birth), [y, m, d] = ymd(at)
  return (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0)
}

/** 청년으로 인정되는 마지막 근로계약일: 만 (35세 + 병역) 되는 날의 전날 */
export function youthUntil(birth: string, military: number) {
  const [by, bm, bd] = ymd(birth)
  const n = (YOUTH_MAX + 1) * 12 + Math.min(Math.max(0, military), MILITARY_CAP)
  const ty = by + Math.floor((bm - 1 + n) / 12), tm = ((bm - 1 + n) % 12) + 1
  const reach = bd <= lastDay(ty, tm) ? Date.UTC(ty, tm - 1, bd) : Date.UTC(ty, tm, 1)
  return iso(reach - 86_400_000)
}

/** 감면 마지막 달: 시작일부터 N년이 되는 날(시작일 + N년 − 1일, 취업일 산입)이 속하는 달.
 *  ponytail: 1일 취업이면 전달 말일까지 — 초일 불산입으로 보면 그 달까지라 한 달 차이, 예규 확인 못 함 */
export function endMonth(first: string, years: number) {
  const [y, m, d] = ymd(first)
  const t = new Date(Date.UTC(y + years, m - 1, d) - 86_400_000)
  const ey = t.getUTCFullYear(), em = t.getUTCMonth() + 1
  return { y: ey, m: em, date: `${ey}-${String(em).padStart(2, '0')}-${lastDay(ey, em)}` }
}

const BASE: YetInput = { ...DEFAULT_INPUT, credit: 0, debit: 0, culture: 0, market: 0, transport: 0 }

/** 한 해 세금: 총급여 salary 중 months/work 비율이 감면 기간, 감면율 pct%. 연봉 외 공제는 없다고 본 근사(itemTaxSaving과 같은 기본) */
export function yearTax(salary: number, pct: number, months: number, work: number) {
  const before = calc({ ...BASE, salary })
  const apply = (p: YetResult['special']) => {
    const t = p.computedTax
    // §27⑧ 감면대상 총급여/총급여 = 감면 개월/근무 개월 (월급이 같다고 가정). 정수 곱셈 뒤 한 번만 나눔
    const reduction = t > 0 && months > 0 ? Math.min(Math.floor((t * pct * months) / (100 * work)), SME_CAP) : 0
    const earned = Math.floor(earnedIncomeCredit(t, before.salary) * (1 - (t ? reduction / t : 0))) // §27⑨
    const determined = Math.max(0, t - reduction - earned - (p.credits.total - p.credits.earned))
    return { computedTax: t, reduction, earnedCut: p.credits.earned - earned, determined }
  }
  const sp = apply(before.special), st = apply(before.std)
  const a = st.determined < sp.determined ? st : sp // calc와 같은 선택: 결정세액이 적은 쪽
  const after = a.determined + Math.floor(a.determined * 0.1)
  return { ...a, before: before.totalTax, after, saving: before.totalTax - after }
}

export type Reason = 'early' | 'deadline' | 'young' | 'old' | 'senior' | 'industry'

export function analyze(x: SmeInput, year = TAX_YEAR) {
  const youth = x.kind === 'youth'
  const pct = youth ? PCT.youth : PCT.other
  const years = youth ? YEARS.youth : YEARS.other
  // 이전 회사에서 감면받기 시작했으면 기간·나이 모두 그 날 기준(§30① 후단 '최초 취업일')
  const moved = !!x.prev && x.prev < x.start
  const first = moved ? x.prev : x.start
  const age = ageMonths(x.birth, first)
  const military = youth ? Math.min(Math.max(0, x.military), MILITARY_CAP) : 0
  const adjAge = age - military

  const reasons: Reason[] = []
  if (first < FROM[x.kind]) reasons.push('early')
  if (x.start > DEADLINE) reasons.push('deadline')
  if (youth && age < YOUTH_MIN * 12) reasons.push('young')
  if (youth && adjAge >= (YOUTH_MAX + 1) * 12) reasons.push('old')
  if (x.kind === 'senior' && age < SENIOR_MIN * 12) reasons.push('senior')
  if (x.excluded) reasons.push('industry')
  const eligible = reasons.length === 0

  const end = endMonth(first, years)
  const [fy, fm] = ymd(first)
  const rows = eligible ? Array.from({ length: end.y - fy + 1 }, (_, i) => {
    const y = fy + i
    const work = y === fy ? 13 - fm : 12
    const months = (y === end.y ? end.m : 12) - (y === fy ? fm : 1) + 1
    const gross = Math.round((x.salary * work) / 12)
    return { year: y, work, months, gross, ...yearTax(gross, pct, months, work) }
  }) : []
  const now = rows.find((r) => r.year === year)
  const sum = (list: typeof rows) => list.reduce((a, r) => a + r.saving, 0)
  return {
    eligible, reasons, pct, years, first, moved, end,
    // 지금 회사 취업일로 새로 시작했다면의 종료(이직 시뮬레이션 비교용)
    endIfNew: endMonth(x.start, years),
    age: Math.floor(age / 12), adjAge: Math.floor(adjAge / 12), military,
    until: youthUntil(x.birth, military), untilNoMil: youthUntil(x.birth, 0),
    status: !eligible ? 'no' as const : now ? 'ok' as const : end.y < year ? 'ended' as const : 'later' as const,
    rows, now,
    saving: now?.saving ?? 0,
    reduction: now?.reduction ?? 0,
    remaining: sum(rows.filter((r) => r.year >= year)),
    past: sum(rows.filter((r) => r.year < year)),
  }
}

// ── 페이지 예시 (page.tsx 본문·FAQ가 이 값으로 렌더링, check 스크립트가 숫자 고정) ──
export const EXAMPLES = {
  /** 계산기 첫 화면 기본값: 2025-03-02 취업, 1999년생 남성 병역 18개월, 청년, 연봉 3,600만 */
  d: { start: '2025-03-02', birth: '1999-05-01', military: 18, kind: 'youth', salary: 36_000_000, excluded: false, prev: '' } as SmeInput,
  /** 병역 차감: 1990-01-10생, 2025-03-04 근로계약(만 35세) + 현역 21개월 → 33세 */
  army: { start: '2025-03-04', birth: '1990-01-10', military: 21, kind: 'youth', salary: 36_000_000, excluded: false, prev: '' } as SmeInput,
  /** 60세 이상 70%·3년: 2026-03-03 재취업, 연봉 3,000만 */
  senior: { start: '2026-03-03', birth: '1965-02-01', military: 0, kind: 'senior', salary: 30_000_000, excluded: false, prev: '' } as SmeInput,
  /** 고연봉 200만 한도: 2026-01-02 취업, 연봉 6,000만 */
  high: { start: '2026-01-02', birth: '1998-07-01', military: 0, kind: 'youth', salary: 60_000_000, excluded: false, prev: '' } as SmeInput,
}
