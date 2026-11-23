// 연봉 인상률 계산 — 순수 계산. 실수령은 netSalary.ts(4대보험 요율·근로소득 간이세액표)를 그대로 쓴다.
// 참고 지표 출처(확인일 CHECKED):
// | 숫자 | 기관 | URL | 기준일 |
// | 소비자물가 2025년 2.1% | 국가데이터처 「2025년 12월 및 연간 소비자물가동향」 | https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?idx_cd=1060 | 2025-12-31 |
// | 소비자물가 2026년 10월 2.8%(전년동월비) | 국가데이터처 「2026년 10월 소비자물가동향」 | https://www.korea.kr/briefing/policyBriefingView.do?newsId=156787698 | 2026-11-03 |
// | 소비자물가 전망 2026년 2.7%·2027년 2.3% | 한국은행 「경제전망(2026년 8월)」 | https://www.bok.or.kr/portal/bbs/B0000502/view.do?nttId=11064211&menuNo=200690 | 2026-08-27 |
// | 2025년 명목임금 3.1%·실질임금 0.9% 증가 | 고용노동부 「2026년 1월 사업체노동력조사」 브리핑(2025년 연간) | https://www.korea.kr/briefing/policyBriefingView.do?newsId=156746284 | 2026-02-26 |
// | 상용근로자 월평균 임금총액 2024 433.8만 → 2025 447.2만(3.1%) | e-나라지표 임금(고용노동부 사업체노동력조사) | https://www.index.go.kr/unity/potal/eNara/sub/showStblGams3.do?stts_cd=F012501&idx_cd=F0125&freq=Y&period=N | 2025 연간 |
// | 최저임금 2026 10,320원 · 2027 10,700원 | 고용노동부 고시 | minimumWage.ts | 2025-08-05·2026-08-05 |
import { calculateNetSalary } from './netSalary'
import { MIN_WAGE_BY_YEAR } from './minimumWage'
import { isInsuranceYear, type InsuranceYear } from './insuranceRates'

export const CHECKED = '2026-11-22'

export const SOURCES = {
  cpi: 'https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?idx_cd=1060',
  cpiOct: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156787698',
  bok: 'https://www.bok.or.kr/portal/bbs/B0000502/view.do?nttId=11064211&menuNo=200690',
  wage: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156746284',
  wageIndex: 'https://www.index.go.kr/unity/potal/eNara/sub/showStblGams3.do?stts_cd=F012501&idx_cd=F0125&freq=Y&period=N',
  minWage: 'https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19744',
} as const

/** 참고 지표(%) — 위 표 */
export const REF = {
  cpi2025: 2.1,
  cpiOct2026: 2.8,
  cpi2026f: 2.7,
  cpi2027f: 2.3,
  wage2025: 3.1,
  realWage2025: 0.9,
  regular2024: 4_338_000,
  regular2025: 4_472_000,
} as const

/** 물가 프리셋: 화면 칩 순서 */
export const CPI_PRESETS = [
  { id: 'f2026', v: REF.cpi2026f },
  { id: 'f2027', v: REF.cpi2027f },
  { id: 'y2025', v: REF.cpi2025 },
] as const

/** 그 해 최저임금 인상률(%) — 전년 대비 */
export const minWageRaise = (year: number) => {
  const now = MIN_WAGE_BY_YEAR[year], prev = MIN_WAGE_BY_YEAR[year - 1]
  return now && prev ? (now / prev - 1) * 100 : null
}

export type Mode = 'rate' | 'after' | 'amt'
export const MODES = ['rate', 'after', 'amt'] as const

export type State = {
  /** 현재 연봉 */
  s: number
  /** 인상 입력 방식 */
  m: Mode
  /** rate: 인상률 %, after: 인상 후 연봉, amt: 연 인상액 */
  v: number
  /** 비과세 월액 */
  nt: number
  /** 공제대상가족 수(본인 포함) */
  dep: number
  /** 4대보험 요율 연도 */
  y: InsuranceYear
  /** 물가 상승률 % */
  cpi: number
  /** 이직 제시 연봉(0 = 입력 안 함) */
  o: number
}

export const DEFAULT: State = { s: 50_000_000, m: 'rate', v: 5, nt: 200_000, dep: 1, y: 2027, cpi: REF.cpi2026f, o: 0 }

export const S_RANGE = [1_000_000, 1_000_000_000] as const
export const RATE_RANGE = [-50, 100] as const
export const NT_RANGE = [0, 3_000_000] as const
export const DEP_RANGE = [1, 11] as const
export const CPI_RANGE = [-5, 20] as const
export const YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const TABLE_RATES = Array.from({ length: 16 }, (_, i) => i)

const round2 = (x: number) => Math.round(x * 100) / 100
export const inRange = (n: number, [lo, hi]: readonly [number, number]) => Number.isFinite(n) && n >= lo && n <= hi

/** 인상 후 연봉(원) */
export function afterOf(st: Pick<State, 's' | 'm' | 'v'>): number {
  if (st.m === 'rate') return Math.round(st.s * (1 + st.v / 100))
  if (st.m === 'after') return st.v
  return st.s + st.v
}

/** 정수 연산 뒤 한 번만 나눠 6.000000000000005 같은 오차를 줄인다 */
export const rateOf = (s: number, after: number) => ((after - s) * 100) / s

/** 같은 인상 후 연봉을 다른 입력 방식의 값으로(인상률은 소수 둘째 자리) */
export function convert(st: State, m: Mode): number {
  const after = afterOf(st)
  if (m === 'rate') return round2(rateOf(st.s, after))
  if (m === 'after') return after
  return after - st.s
}

/** 입력값이 계산 가능한가(인상 후 연봉이 범위 안, 인상률 범위 안) */
export function valid(st: State): boolean {
  const after = afterOf(st)
  return inRange(st.s, S_RANGE) && inRange(after, S_RANGE) && inRange(rateOf(st.s, after), RATE_RANGE)
}

const net = (gross: number, st: State) => calculateNetSalary(gross, { nonTaxableMonthly: st.nt, dependents: st.dep, year: st.y })!

/** 핵심 결과. 전·후 모두 같은 연도 요율·같은 공제 조건으로 계산해 인상 효과만 본다 */
export function compute(st: State) {
  const after = afterOf(st)
  const before = net(st.s, st)
  const aft = net(after, st)
  const raise = after - st.s
  const rate = rateOf(st.s, after)
  const netRate = (aft.netMonthly / before.netMonthly - 1) * 100
  const netAnnualDiff = aft.netAnnual - before.netAnnual
  return {
    after,
    rate,
    raise,
    raiseMonthly: Math.round(raise / 12),
    before,
    aft,
    netDiff: aft.netMonthly - before.netMonthly,
    netRate,
    /** 연 인상분 중 세금·4대보험으로 빠진 몫(0~1). 인상액 0이면 0 */
    takenShare: raise === 0 ? 0 : 1 - netAnnualDiff / raise,
    /** 물가 대비 실질 인상률(명목 연봉 기준) */
    real: ((1 + rate / 100) / (1 + st.cpi / 100) - 1) * 100,
    /** 물가 대비 실질 인상률(월 실수령 기준) */
    realNet: ((1 + netRate / 100) / (1 + st.cpi / 100) - 1) * 100,
  }
}

/** 인상률 0~15% 표: 인상 후 연봉, 월 실수령, 지금보다 늘어난 월 실수령 */
export function rateTable(st: State) {
  const base = net(st.s, st).netMonthly
  return TABLE_RATES.map((r) => {
    const after = Math.round(st.s * (1 + r / 100))
    const n = net(after, st).netMonthly
    return { r, after, net: n, diff: n - base }
  })
}

/** 매년 같은 인상률이면 N년 뒤: 연봉, 월 실수령, 오늘 물가로 환산한 연봉. ponytail: 세법·요율은 지금 그대로(과표 구간 물가 연동 없음) */
export function yearsTable(st: State) {
  const rate = rateOf(st.s, afterOf(st)) / 100
  return YEARS.map((n) => {
    const salary = Math.round(st.s * (1 + rate) ** n)
    const ok = inRange(salary, S_RANGE)
    return {
      n,
      salary,
      net: ok ? net(salary, st).netMonthly : null,
      realToday: Math.round(salary / (1 + st.cpi / 100) ** n),
    }
  })
}

/** 이직 제시 연봉의 예시값(입력 전): 현재 연봉 +10%, 100만원 단위 */
export const offerExample = (s: number) => Math.round((s * 1.1) / 1_000_000) * 1_000_000

/** 현재 회사 인상안 vs 이직 제시 연봉 */
export function compareOffer(st: State, offer: number) {
  const after = afterOf(st)
  const a = net(after, st)
  const b = net(offer, st)
  return {
    offer,
    offerRate: rateOf(st.s, offer),
    annualDiff: offer - after,
    netDiff: b.netMonthly - a.netMonthly,
    netOffer: b.netMonthly,
    netStay: a.netMonthly,
  }
}

// ── URL

const num = (s: string | null) => (s === null || s.trim() === '' ? NaN : Number(s))
const int = (n: number) => Number.isInteger(n)

export function parseState(get: (k: string) => string | null): State {
  const s0 = num(get('s'))
  const s = int(s0) && inRange(s0, S_RANGE) ? s0 : DEFAULT.s
  const m0 = get('m') ?? 'rate'
  const m: Mode = (MODES as readonly string[]).includes(m0) ? (m0 as Mode) : 'rate'
  const v0 = num(get('v'))
  let mv: Pick<State, 'm' | 'v'> = { m: 'rate', v: DEFAULT.v }
  if (m === 'rate' && inRange(v0, RATE_RANGE)) mv = { m, v: round2(v0) }
  else if (m !== 'rate' && int(v0) && valid({ ...DEFAULT, s, m, v: v0 })) mv = { m, v: v0 }
  const nt = num(get('nt'))
  const dep = num(get('dep'))
  const y = get('y')
  const cpi = num(get('cpi'))
  const o = num(get('o'))
  return {
    s,
    ...mv,
    nt: int(nt) && inRange(nt, NT_RANGE) ? nt : DEFAULT.nt,
    dep: int(dep) && inRange(dep, DEP_RANGE) ? dep : DEFAULT.dep,
    y: isInsuranceYear(y) ? (Number(y) as InsuranceYear) : DEFAULT.y,
    cpi: inRange(cpi, CPI_RANGE) ? round2(cpi) : DEFAULT.cpi,
    o: int(o) && inRange(o, S_RANGE) ? o : DEFAULT.o,
  }
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(st: State): string {
  const q = new URLSearchParams()
  if (st.s !== DEFAULT.s) q.set('s', String(st.s))
  if (st.m !== DEFAULT.m) q.set('m', st.m)
  if (st.m !== DEFAULT.m || st.v !== DEFAULT.v) q.set('v', String(st.v))
  if (st.nt !== DEFAULT.nt) q.set('nt', String(st.nt))
  if (st.dep !== DEFAULT.dep) q.set('dep', String(st.dep))
  if (st.y !== DEFAULT.y) q.set('y', String(st.y))
  if (st.cpi !== DEFAULT.cpi) q.set('cpi', String(st.cpi))
  if (st.o !== DEFAULT.o) q.set('o', String(st.o))
  return q.toString()
}
