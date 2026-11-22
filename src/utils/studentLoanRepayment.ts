// 학자금 대출 상환 계산기 — 취업 후 상환(ICL) 의무상환액과 일반 상환 원리금균등을 같은 조건에서 비교.
// 회귀 체크: node scripts/check-student-loan-repayment.ts   금액 단위: 원(상태·URL 은 만원)
//
// 출처(확인 2026-11-22)
// | 값 | 내용 | 출처 |
// |---|---|---|
// | 의무상환액 | (연간 소득금액 − 상환기준소득) × 상환율, 계산액이 최소부담의무상환액 미만이면 그 금액 | 「취업 후 학자금 상환 특별법」 §18② (법률 제21660호, 2026.11.20 시행) |
// | 상환율 | 학부 대출 20%, 대학원 대출 25% | 같은 법 시행령 §10①1·2 (2026.6.16 시행본) |
// | 최소부담의무상환액 | 연 36만원 | 시행령 §10② |
// | 소득금액 | 근로소득만 있으면 총급여 − 근로소득공제(소득세법 §47) | 시행령 §8의2①, 국세청 2026.4.27 "소득금액(총급여액−근로소득공제)" |
// | 원천공제 | 의무상환액 ÷ 12 를 매달, 소득 이듬해 7월 ~ 그다음 해 6월 | 시행령 §21③, §10의2③2가 / 국세청('25 귀속 → '26.7~'27.6) |
// | 자발적 상환 | 그해(소득 귀속연도) 재단에 자발적으로 갚은 금액은 그해 의무상환액에서 뺀다 | 법 §18⑧, 국세청 2026.4.27 |
// | 상환기준소득(총급여 기준) | '22 2,394 · '23 2,525 · '24 2,679 · '25 2,851 · '26 3,037만원 | 교육부 「2026학년도 1학기 학자금대출 기본계획」 표 |
// |  | '25 귀속 소득금액 1,898만원(총급여 2,851만원) | 국세청(정책브리핑 2026.4.27) |
// | 상환기준소득 산정 | 기준 중위소득·물가상승률 등을 고려해 매년 고시 | 법 §18⑤. '23~'26 인상률이 4인 가구 기준 중위소득 인상률과 같다(5.47·6.09·6.42·6.51%) |
// | 금리 | 2026학년도 1·2학기 연 1.7% 동결. ICL 변동금리, 일반 상환 고정금리 | 교육부 보도자료(2026.6.30, KDI 경제정보센터 게재), 「2026학년도 2학기 학자금대출 기본계획」 붙임1 |
// | ICL 이자 | 학기별 금리를 대출잔액에 단리로 일할 계산 | 법 §17①, 한국장학재단 상환안내 |
// | 일반 상환 | 최장 20년(거치 10년 + 상환 10년), 원리금균등·원금균등 중 선택, 중도상환 수수료 없음 | 「2026학년도 2학기 학자금대출 기본계획」 붙임1, 재단 업무처리기준 |
// | 이자 면제 | 기초·차상위·다자녀·자립지원·중위 130%(6구간, '26.7.1~) 이하·비수도권 대학 중위 200%(8구간, '26.11.20~) 이하: 졸업 및 의무상환 개시 전 이자 | 법 §16의2②, 2학기 기본계획 |
//
// 확인 못 한 것·추정
// - 2026 상환기준소득의 소득금액 고시값(원 단위). 여기서는 총급여 3,037만원 − 근로소득공제 = 20,564,500원으로 환산('25 도 이 방식이면 18,983,500 ≈ 국세청 1,898만원).
// - 2027 상환기준소득은 미고시. 2026 값 × 2027 4인 기준 중위소득 인상률(6.70%)로 추정. 2028 이후는 사용자 가정(h).
// - 이자 면제가 끝나는 시점은 "의무상환 개시" = 첫 원천공제 달로 가정. 이자는 월할(잔액 × 연이율/12, 원 미만 버림)로 근사.
import { earnedIncomeDeduction } from './yearEndTax.ts'
import { MEDIAN_INCOME } from './medianIncome.ts'

export const CHECKED = '2026-11-22'
export const SOURCES = {
  act: 'https://www.law.go.kr/법령/취업후학자금상환특별법',
  decree: 'https://www.law.go.kr/법령/취업후학자금상환특별법시행령',
  nts: 'https://www.korea.kr/news/policyNewsView.do?newsId=148963512',
  plan1: 'https://siae.korea.ac.kr/bbs/csg/86/175392/download.do',
  plan2: 'https://eiec.kdi.re.kr/policy/materialView.do?num=283500',
  kosaf: 'https://www.kosaf.go.kr/ko/tuition.do?pg=tuition05_01_01',
} as const

export const MAN = 10_000
/** 2026학년도 1·2학기 학자금대출 금리(%) */
export const RATE_2026 = 1.7
/** 상환기준소득, 총급여 기준(만원) — 교육부 2026-1 기본계획 */
export const THRESHOLD_GROSS: Record<number, number> = { 2022: 2394, 2023: 2525, 2024: 2679, 2025: 2851, 2026: 3037 }
export const LAST_OFFICIAL = 2026
export const REPAY_RATE = { ug: 0.2, grad: 0.25 } as const
export const MIN_DUE = 360_000
export const MAX_YEARS = 50

export type Kind = 'icl' | 'gen'
export type Basis = 'official' | 'median' | 'assumed'

/** 근로소득만 있을 때 소득금액 = 총급여 − 근로소득공제 */
export const incomeAmount = (gross: number) => Math.max(0, gross - earnedIncomeDeduction(Math.max(0, gross)))

/**
 * 그해 상환기준소득(총급여 기준, 원). 2026 까지 고시값, 이후는 4인 기준 중위소득 인상률(고시된 해),
 * 그 뒤는 연 h% 가정. 해마다 만원 단위 반올림(고시값이 만원 단위).
 */
export function thresholdGross(year: number, h: number): { won: number; basis: Basis } {
  if (year <= LAST_OFFICIAL) return { won: (THRESHOLD_GROSS[year] ?? THRESHOLD_GROSS[2022]) * MAN, basis: 'official' }
  let won = THRESHOLD_GROSS[LAST_OFFICIAL] * MAN
  let basis: Basis = 'official'
  for (let y = LAST_OFFICIAL + 1; y <= year; y++) {
    const m0 = MEDIAN_INCOME[String(y - 1)], m1 = MEDIAN_INCOME[String(y)]
    const known: boolean = !!m0 && !!m1 && basis !== 'assumed'
    basis = known ? 'median' : 'assumed'
    won = Math.round((won * (known ? m1[3] / m0[3] : 1 + h / 100)) / MAN) * MAN
  }
  return { won, basis }
}

/** 의무상환액(자발적 상환 차감 전). 소득금액이 기준을 넘을 때만(같으면 0) */
export function dueOf(income: number, thrIncome: number, grad: boolean): { raw: number; due: number; min: boolean } {
  if (income <= thrIncome) return { raw: 0, due: 0, min: false }
  const raw = Math.floor((income - thrIncome) * (grad ? REPAY_RATE.grad : REPAY_RATE.ug))
  return { raw, due: Math.max(raw, MIN_DUE), min: raw < MIN_DUE }
}

// ── 입력
export type State = {
  k: Kind
  b: number // 대출 잔액(만원)
  r: number // 금리 %
  s: number // 연봉(만원, 비과세 포함)
  n: number // 월 비과세(만원)
  g: number // 연봉 상승률 %(가정)
  h: number // 2028 이후 상환기준소득 상승률 %(가정)
  y: number // 계산 시작 연도 = 취업 후 상환은 첫 소득 연도
  d: number // 일반 상환 남은 거치(년)
  m: number // 일반 상환 상환 기간(년)
  x: number // 매달 더 갚을 금액(만원) — 추가 상환 시뮬레이션에만
  u: boolean // 대학원 대출(상환율 25%)
  f: boolean // ICL 이자 면제 대상
}

// 기본값 근거: 잔액 1,500만원·연봉 3,500만원·추가 10만원은 예시값(공식 평균 대출액 통계 미확인).
// 연봉은 3,200만원이면 기준 3,037만원에 너무 가까워 최소부담 36만원만 내다 50년 안에 못 갚는 결과가 첫 화면에 나와서 올렸다.
// 금리 = 2026 고시 1.7%, 시작 연도 = 상환기준소득이 고시된 마지막 해. 일반 상환 거치 0·상환 10년(최장) 예시.
// 연봉·상환기준소득 상승률 3%는 가정(임금과 기준 중위소득이 길게 보면 같은 속도로 오른다고 봄).
export const DEFAULT: State = { k: 'icl', b: 1500, r: RATE_2026, s: 3500, n: 0, g: 3, h: 3, y: 2026, d: 0, m: 10, x: 10, u: false, f: false }

export const RANGES = {
  b: [0, 30000], r: [0, 10], s: [0, 50000], n: [0, 500], g: [-10, 30], h: [-5, 20],
  y: [2025, 2035], d: [0, 10], m: [1, 10], x: [0, 1000],
} as const satisfies Record<string, readonly [number, number]>
type NumKey = keyof typeof RANGES
const INT: readonly NumKey[] = ['b', 's', 'n', 'y', 'd', 'm', 'x']
const NUM_KEYS = Object.keys(RANGES) as NumKey[]

/** 범위 안이면 정리한 값(정수 키는 정수만, 나머지 소수 둘째 자리), 아니면 null */
export function clean(key: NumKey, v: number): number | null {
  const [lo, hi] = RANGES[key]
  if (!Number.isFinite(v) || v < lo || v > hi) return null
  if (INT.includes(key)) return Number.isInteger(v) ? v : null
  return Math.round(v * 100) / 100
}

export function parseState(get: (k: string) => string | null): State {
  const out: State = { ...DEFAULT }
  for (const key of NUM_KEYS) {
    const raw = get(key)
    if (raw === null || raw.trim() === '') continue
    const v = clean(key, Number(raw))
    if (v !== null) out[key] = v
  }
  const t = get('t')
  if (t === 'g') out.k = 'gen'
  out.u = get('u') === '1'
  out.f = get('f') === '1'
  return out
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(s: State): string {
  const q = new URLSearchParams()
  if (s.k !== DEFAULT.k) q.set('t', 'g')
  for (const key of NUM_KEYS) if (s[key] !== DEFAULT[key]) q.set(key, String(s[key]))
  if (s.u) q.set('u', '1')
  if (s.f) q.set('f', '1')
  return q.toString()
}

// ── 시뮬레이션(월 단위, 시작 연도 1월 잔액부터)

export type YearRow = {
  year: number
  /** 그해 낸 이자 발생분·낸 금액·연말 잔액(이자 포함) */
  interest: number
  paid: number
  balance: number
}
export type IclRow = YearRow & {
  salary: number
  gross: number
  income: number
  thrGross: number
  thrIncome: number
  basis: Basis
  /** 그해 소득으로 매겨지는 의무상환액(자발적 상환 차감·연말 잔액 한도) — 이듬해 7월부터 12개월 원천공제 */
  due: number
  /** 상환율만 곱한 계산액(최소부담 적용 전) */
  raw: number
  min: boolean
  /** 자발적 상환으로 빠진 금액 */
  offset: number
}
export type Plan<R extends YearRow> = {
  rows: R[]
  /** 다 갚을 때까지 개월 수(시작 연도 1월 = 1). 기간 안에 못 갚으면 null */
  months: number | null
  totalInterest: number
  totalPaid: number
}

const intOf = (p: number, r: number) => Math.floor((p * r) / 100 / 12)

/** 취업 후 상환. extra = 매달 자발적 상환(원) */
export function simulateIcl(s: State, extra = 0): Plan<IclRow> {
  let P = s.b * MAN
  let I = 0
  const rows: IclRow[] = []
  let started = false
  let yInt = 0, yPaid = 0, yVol = 0, totInt = 0, totPaid = 0
  let months: number | null = P > 0 ? null : 0
  const nt = s.n * MAN * 12

  for (let k = 0; k < MAX_YEARS * 12 && months === null; k++) {
    const yi = Math.floor(k / 12)
    const mon = k % 12
    // 7~12월은 전년 소득분, 1~6월은 전전년 소득분을 원천공제
    const src = mon >= 6 ? yi - 1 : yi - 2
    const mand = src >= 0 ? rows[src].due / 12 : 0
    // 의무가 생긴 해(raw>0)면 자발적 상환으로 원천공제액이 0이 돼도 면제는 끝난다(이자 면제는 의무 발생 전까지)
    if (src >= 0 && rows[src].raw > 0) started = true
    const int = s.f && !started ? 0 : intOf(P, s.r)
    I += int
    yInt += int
    const pay = Math.min(mand + extra, P + I)
    const toI = Math.min(pay, I)
    I -= toI
    P -= pay - toI
    yPaid += pay
    yVol += Math.max(0, pay - mand)
    if (P + I < 1) { P = 0; I = 0; months = k + 1 }

    if (mon === 11 || months !== null) {
      const year = s.y + yi
      const salary = Math.round(s.s * MAN * Math.pow(1 + s.g / 100, yi))
      const gross = Math.max(0, salary - nt)
      const income = incomeAmount(gross)
      const thr = thresholdGross(year, s.h)
      const thrIncome = incomeAmount(thr.won)
      const d = dueOf(income, thrIncome, s.u)
      const left = Math.max(0, d.due - yVol)
      rows.push({
        year, salary, gross, income, thrGross: thr.won, thrIncome, basis: thr.basis,
        due: Math.min(left, P + I), raw: d.raw, min: d.min, offset: d.due - left,
        interest: yInt, paid: yPaid, balance: P + I,
      })
      totInt += yInt
      totPaid += yPaid
      yInt = 0; yPaid = 0; yVol = 0
    }
  }
  return { rows, months, totalInterest: totInt, totalPaid: totPaid }
}

export type GenPlan = Plan<YearRow & { principal: number }> & {
  /** 거치 중 첫 달 이자, 원리금균등 월 납입액(거치 0 이면 graceInterest 0) */
  graceInterest: number
  payment: number
}

/**
 * 일반 상환: 거치 d년(이자만) 뒤 m년 원리금균등. 이자 = floor(잔액 × 연이율/12), 납입액 반올림,
 * 마지막 회차와 1,000원 미만 찌꺼기는 남은 원금을 다 갚는다(loanSchedule.schedule 과 같은 규칙).
 * extra 는 매달 원금에 더 갚고, 상환 개시 때 그 잔액으로 납입액을 정한 뒤 기간을 줄인다.
 */
export function simulateGen(s: State, extra = 0): GenPlan {
  const grace = s.d * 12
  const n = s.m * 12
  const r = s.r / 100 / 12
  let P = s.b * MAN
  let pay = 0
  let graceInterest = 0
  const rows: GenPlan['rows'] = []
  let yInt = 0, yPrin = 0, yPaid = 0, totInt = 0, totPaid = 0
  let months: number | null = P > 0 ? null : 0

  for (let k = 0; k < grace + n && months === null; k++) {
    const int = intOf(P, s.r)
    let prin = 0
    if (k < grace) {
      if (k === 0) graceInterest = int
    } else {
      if (k === grace) pay = Math.round(r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
      prin = k === grace + n - 1 ? P : Math.min(P, pay - int)
      if (P - prin < 1000) prin = P
    }
    const ex = Math.min(extra, P - prin)
    P -= prin + ex
    yInt += int
    yPrin += prin + ex
    yPaid += int + prin + ex
    if (P <= 0) { P = 0; months = k + 1 }
    if (k % 12 === 11 || months !== null) {
      rows.push({ year: s.y + Math.floor(k / 12), interest: yInt, principal: yPrin, paid: yPaid, balance: P })
      totInt += yInt
      totPaid += yPaid
      yInt = 0; yPrin = 0; yPaid = 0
    }
  }
  return { rows, months, totalInterest: totInt, totalPaid: totPaid, graceInterest, payment: pay }
}

/** 개월 수(1 = 시작 연도 1월) → 다 갚는 해·달 */
export const payoffAt = (startYear: number, months: number) => ({
  year: startYear + Math.floor((months - 1) / 12),
  month: ((months - 1) % 12) + 1,
})
