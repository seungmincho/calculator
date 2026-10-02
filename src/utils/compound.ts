// 복리 계산 — 순수 함수. 회귀 체크: node scripts/check-compound.ts
// 월 단위 시뮬레이션. 복리 주기 n(연1·반기2·분기4·월12·일365)의 연이율 r 은
// 같은 효과의 월 이율 (1 + r/n)^(n/12) − 1 로 바꿔 매월 굴린다.
//  - 거치식은 정수 개월이면 정확히 P(1 + r/n)^(n·t) (엑셀 FV 와 동일)
//  - 월 적립은 엑셀 FV(월환산이율, 개월, −적립액, −원금, type) 와 동일 (type 1 = 월초 납입)
// 세금: 만기 일시과세(예·적금, 이자 전액에 만기 때 한 번) / 매년 과세(해마다 이자 지급·원천징수 후 재투자)

export type Freq = 'yearly' | 'semiannually' | 'quarterly' | 'monthly' | 'daily'
export const FREQS: Freq[] = ['yearly', 'semiannually', 'quarterly', 'monthly', 'daily']
export const FREQ_N: Record<Freq, number> = { yearly: 1, semiannually: 2, quarterly: 4, monthly: 12, daily: 365 }

// 일반 15.4%(소득세 14% + 지방소득세 1.4%), 세금우대 9.5%(9% + 농특세 0.5%), 비과세 0%
export type TaxKey = 'normal' | 'pref' | 'free'
export const TAX_RATES: Record<TaxKey, number> = { normal: 0.154, pref: 0.095, free: 0 }
export const TAX_KEYS = Object.keys(TAX_RATES) as TaxKey[]

export type TaxTiming = 'maturity' | 'yearly'
export type DepositTiming = 'begin' | 'end'

export interface Plan {
  principal: number // 거치 원금 (0번째 달 초)
  monthly: number // 월 적립액
  rate: number // 연이율 %
  months: number
  freq: Freq
  timing: DepositTiming
  tax: TaxKey
  taxTiming: TaxTiming
}

export interface YearRow {
  year: number // 연차 (마지막 행은 남은 개월 포함)
  months: number // 누적 개월
  principal: number // 원금 누계
  interest: number // 그 해 세전 이자
  gross: number // 세전 이자 누계
  tax: number // 그 시점에 끝낼 때 낸(낼) 세금 누계
  value: number // 그 시점 세후 평가액
}

/** 복리 주기 n 의 연이율을 같은 효과의 월 이율로 */
export const monthlyRateOf = (rate: number, freq: Freq) => {
  const n = FREQ_N[freq]
  return Math.pow(1 + rate / 100 / n, n / 12) - 1
}

/** 실효 연이율(%) — 월복리 12% → 12.68% */
export const effectiveAnnual = (rate: number, freq: Freq) => {
  const n = FREQ_N[freq]
  return (Math.pow(1 + rate / 100 / n, n) - 1) * 100
}

export function simulate(p: Plan) {
  const N = Math.max(0, Math.floor(p.months))
  const i = monthlyRateOf(p.rate, p.freq)
  const tr = TAX_RATES[p.tax]
  const yearlyTax = p.taxTiming === 'yearly'
  let bal = p.principal, principal = p.principal, gross = 0, paidTax = 0, yearInt = 0
  const rows: YearRow[] = []
  for (let m = 1; m <= N; m++) {
    if (p.timing === 'begin') { bal += p.monthly; principal += p.monthly }
    const int = bal * i
    bal += int; gross += int; yearInt += int
    if (p.timing === 'end') { bal += p.monthly; principal += p.monthly }
    if (m % 12 === 0 || m === N) {
      if (yearlyTax) { const t = yearInt * tr; bal -= t; paidTax += t }
      const tax = yearlyTax ? paidTax : gross * tr
      rows.push({ year: Math.ceil(m / 12), months: m, principal, interest: yearInt, gross, tax, value: yearlyTax ? bal : bal - tax })
      yearInt = 0
    }
  }
  const last = rows[rows.length - 1]
  const tax = last ? last.tax : 0
  const value = last ? last.value : p.principal
  return {
    principal, // 원금 합계
    gross, // 세전 이자
    tax,
    net: value - principal, // 세후 이자
    value, // 세후 수령액
    preTax: principal + gross, // 세금 없을 때 금액 (매년 과세면 세금 뗀 만큼 덜 굴러간 뒤의 세전 합계)
    rows,
  }
}

/** 같은 납입 흐름의 단리 세전 이자 (원금 × 연이율 × 맡긴 기간) */
export function simpleInterest(p: Plan) {
  const N = Math.max(0, Math.floor(p.months))
  const r = p.rate / 100 / 12
  const s = p.timing === 'begin' ? (N * (N + 1)) / 2 : (N * (N - 1)) / 2
  return p.principal * r * N + p.monthly * r * s
}

/** 원금이 2배 되는 기간(년). tax 를 주면 세후 기준. 이율 0 이하면 null */
export function doublingYears(rate: number, freq: Freq, tax: TaxKey = 'free', taxTiming: TaxTiming = 'maturity'): number | null {
  const e = effectiveAnnual(rate, freq) / 100
  if (e <= 0) return null
  const tr = TAX_RATES[tax]
  // 매년 과세: 세후 연 e(1−tr) 로 굴러감 / 만기 과세: (1+e)^t − tr((1+e)^t − 1) = 2
  if (taxTiming === 'yearly') return Math.log(2) / Math.log(1 + e * (1 - tr))
  return Math.log((2 - tr) / (1 - tr)) / Math.log(1 + e)
}
export const rule72 = (rate: number) => (rate > 0 ? 72 / rate : null)

/** 세후 연환산 수익률(%) — 납입 흐름 대비 세후 수령액의 내부수익률(IRR), 월복리를 연으로 환산 */
export function annualizedReturn(p: Plan, value: number): number | null {
  const N = Math.max(0, Math.floor(p.months))
  if (N === 0 || p.principal + p.monthly * N <= 0) return null
  const fv = (j: number) => {
    let b = p.principal
    for (let m = 0; m < N; m++) {
      if (p.timing === 'begin') b += p.monthly
      b *= 1 + j
      if (p.timing === 'end') b += p.monthly
    }
    return b
  }
  let lo = -0.99, hi = 1
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (fv(mid) < value) lo = mid; else hi = mid }
  return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100
}

/** 물가상승률 inf% 로 months 뒤 금액을 오늘 가치로 */
export const realValue = (amount: number, months: number, inf: number) => amount / Math.pow(1 + inf / 100, months / 12)
/** 피셔 공식 실질 수익률(%) = (1+명목)/(1+물가) − 1 */
export const realRate = (nominal: number, inf: number) => ((1 + nominal / 100) / (1 + inf / 100) - 1) * 100

/** 세후 target 을 만들려면 필요한 월 적립액(원 단위 올림). 원금만으로 충분하면 0 */
export function requiredMonthly(target: number, p: Omit<Plan, 'monthly'>): number {
  const base = simulate({ ...p, monthly: 0 }).value
  if (target <= base || p.months <= 0) return 0
  const per = simulate({ ...p, principal: 0, monthly: 1 }).value // 수령액은 월 적립액에 비례
  if (per <= 0) return 0
  let m = Math.ceil((target - base) / per)
  while (m > 0 && simulate({ ...p, monthly: m - 1 }).value >= target) m--
  return m
}

/** 세후 target 을 만들려면 필요한 연이율(%). 납입만으로 충분하면 0, 100% 로도 안 되면 null */
export function requiredRate(target: number, p: Omit<Plan, 'rate'>): number | null {
  if (simulate({ ...p, rate: 0 }).value >= target) return 0
  if (simulate({ ...p, rate: 100 }).value < target) return null
  let lo = 0, hi = 100
  for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (simulate({ ...p, rate: mid }).value < target) lo = mid; else hi = mid }
  return hi
}
