// 투자 수익률 계산 — 순수 함수 (원 단위, 월 단위 시뮬레이션).
// 적립은 매월 초(기초 납입, annuity due): 이번 달 납입금도 그 달 수익을 받는다.
// 초기 투자금은 0번째 달 초 납입으로 취급.
// 복리: 'annual' = 입력 수익률을 실효 연수익률로 보고 월 (1+r)^(1/12)-1 (거치식이면 정확히 (1+r)^n),
//       'monthly' = 연이율÷12 월복리 (예·적금 표기 방식).

export type Compounding = 'annual' | 'monthly'

export interface PlanInput {
  initial: number        // 원
  monthly: number        // 원 (첫해 월 적립액)
  rate: number           // 연 %
  years: number
  growth?: number        // 월 적립액 연 증가율 % (매년 1월에 인상)
  compounding?: Compounding
}

export interface YearRow { year: number; principal: number; value: number; profit: number }

export const monthlyRate = (ratePct: number, c: Compounding = 'annual') =>
  c === 'monthly' ? ratePct / 100 / 12 : Math.pow(1 + ratePct / 100, 1 / 12) - 1

/** 월별 납입 흐름 (길이 = 개월 수). [0]에 초기 투자금 포함 */
export function contributions(p: PlanInput): number[] {
  const n = Math.max(0, Math.round(p.years * 12))
  const g = (p.growth ?? 0) / 100
  const out = Array.from({ length: n }, (_, m) => p.monthly * Math.pow(1 + g, Math.floor(m / 12)))
  if (n) out[0] += p.initial
  return out
}

/** 납입 흐름의 만기 평가액: m번째 달 초 납입금은 (n-m)개월 굴러간다 */
export function fvOf(stream: number[], i: number): number {
  const n = stream.length
  return stream.reduce((s, c, m) => s + c * Math.pow(1 + i, n - m), 0)
}

export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)

export function futureValue(p: PlanInput): number {
  if (p.years <= 0) return p.initial
  return fvOf(contributions(p), monthlyRate(p.rate, p.compounding))
}

/** 연도별 누적 원금·평가액 */
export function yearly(p: PlanInput): YearRow[] {
  const i = monthlyRate(p.rate, p.compounding)
  const stream = contributions(p)
  const rows: YearRow[] = []
  let value = 0, principal = 0
  stream.forEach((c, m) => {
    principal += c
    value = (value + c) * (1 + i)
    if ((m + 1) % 12 === 0 || m === stream.length - 1) {
      rows.push({ year: Math.ceil((m + 1) / 12), principal, value, profit: value - principal })
    }
  })
  return rows
}

/** 물가 반영 실질 가치 (현재 돈 가치) */
export const realValue = (nominal: number, years: number, inflationPct: number) =>
  nominal / Math.pow(1 + inflationPct / 100, years)

/** 연평균 수익률 기준이 아닌 '원금 대비 수익률' */
export const totalReturnPct = (value: number, principal: number) => (principal > 0 ? (value / principal - 1) * 100 : 0)

// ── 목표 역산 ────────────────────────────────────────────

/** 목표 금액까지 필요한 첫해 월 적립액. FV는 월 적립액에 선형 → 한 번에 풀림. 이미 달성이면 0 */
export function requiredMonthly(target: number, p: Omit<PlanInput, 'monthly'>): number {
  const base = futureValue({ ...p, monthly: 0 })
  const unit = futureValue({ ...p, initial: 0, monthly: 1 })
  if (unit <= 0) return Infinity
  return Math.max(0, (target - base) / unit)
}

/** 목표까지 필요한 연 수익률(%) — 이분법. -50% ~ 100% 밖이면 null */
export function requiredRate(target: number, p: Omit<PlanInput, 'rate'>): number | null {
  const f = (r: number) => futureValue({ ...p, rate: r }) - target
  let lo = -50, hi = 100
  if (f(lo) > 0) return lo
  if (f(hi) < 0) return null
  for (let k = 0; k < 200 && hi - lo > 1e-9; k++) {
    const mid = (lo + hi) / 2
    if (f(mid) >= 0) hi = mid; else lo = mid
  }
  return hi
}

/** 목표 도달까지 걸리는 개월 수 (최대 100년). 도달 못 하면 null */
export function requiredMonths(target: number, p: Omit<PlanInput, 'years'>): number | null {
  if (target <= p.initial) return 0
  const i = monthlyRate(p.rate, p.compounding)
  const g = (p.growth ?? 0) / 100
  let value = 0
  for (let m = 0; m < 1200; m++) {
    value = (value + p.monthly * Math.pow(1 + g, Math.floor(m / 12)) + (m === 0 ? p.initial : 0)) * (1 + i)
    if (value >= target) return m + 1
  }
  return null
}

// ── 인출 ────────────────────────────────────────────────

/** 4% 규칙: 첫해 자산의 4%를 12개월로 */
export const fourPercentMonthly = (asset: number) => (asset * 0.04) / 12

/** 자산을 years년 동안 매월 말 같은 금액으로 나눠 받기 (잔액은 rate%로 계속 운용) */
export function payoutMonthly(asset: number, ratePct: number, years: number, c: Compounding = 'annual'): number {
  const n = years * 12, i = monthlyRate(ratePct, c)
  if (n <= 0) return 0
  return i === 0 ? asset / n : (asset * i) / (1 - Math.pow(1 + i, -n))
}

// ── 계좌별 세금 (2026년 현행 세법) ─────────────────────────
// 일반계좌: 이자·배당 15.4% (소득세 14% + 지방세 1.4%). 수익 전부를 이자·배당으로 보는 보수적 가정.
//   (국내 상장주식 매매차익 비과세, 해외주식 양도차익 22%·연 250만원 공제는 반영 안 함)
// ISA(중개형): 납입 연 2,000만·총 1억(미납분 이월), 의무 3년. 순이익 200만(서민형 400만)까지 비과세, 초과분 9.9% 분리과세.
// 연금저축+IRP: 납입 연 1,800만, 세액공제 대상 연 900만. 총급여 5,500만 이하 16.5%, 초과 13.2%.
//   연금 수령 시 (세액공제 받은 원금 + 운용수익)에 연금소득세 5.5%(55~69세)/4.4%(70~79)/3.3%(80~).
// 한도 초과분은 일반계좌로 흘려보내 계산.

export const TAX = {
  general: 0.154,
  isa: { annual: 20_000_000, total: 100_000_000, exempt: 2_000_000, exemptLow: 4_000_000, rate: 0.099, minYears: 3 },
  pension: { annual: 18_000_000, creditCap: 9_000_000, creditHigh: 0.132, creditLow: 0.165, lowIncomeCap: 55_000_000 },
  pensionTax: { '55': 0.055, '70': 0.044, '80': 0.033 } as Record<string, number>,
}

export type AgeBand = '55' | '70' | '80'

export interface AccountResult {
  value: number        // 세전 평가액
  principal: number
  tax: number
  credit: number       // 세액공제 환급 합계 (재투자 안 함)
  net: number          // 세후 평가액 + 환급
  overflow: number     // 한도 초과로 일반계좌 처리된 납입액
}

/** 연 단위 한도로 흐름을 나눔: [계좌 몫, 넘친 몫]. allowance(y, usedSoFar) = 그 해 납입 가능액 */
function splitByCap(stream: number[], allowance: (year: number, used: number) => number): [number[], number[]] {
  const inAcc: number[] = [], out: number[] = []
  let used = 0, yearUsed = 0, cap = 0
  stream.forEach((c, m) => {
    if (m % 12 === 0) { cap = allowance(m / 12, used); yearUsed = 0 }
    const take = Math.max(0, Math.min(c, cap - yearUsed))
    yearUsed += take; used += take
    inAcc.push(take); out.push(c - take)
  })
  return [inAcc, out]
}

function general(stream: number[], i: number): AccountResult {
  const value = fvOf(stream, i), principal = sum(stream)
  const tax = Math.max(0, value - principal) * TAX.general
  return { value, principal, tax, credit: 0, net: value - tax, overflow: 0 }
}

const plus = (a: AccountResult, b: AccountResult, overflow: number): AccountResult => ({
  value: a.value + b.value, principal: a.principal + b.principal, tax: a.tax + b.tax,
  credit: a.credit + b.credit, net: a.net + b.net, overflow,
})

export function compareAccounts(p: PlanInput, opt: { isaLow?: boolean; lowIncome?: boolean; age?: AgeBand } = {}) {
  const i = monthlyRate(p.rate, p.compounding)
  const stream = contributions(p)
  const gen = general(stream, i)

  // ISA: 연 2,000만씩 한도가 쌓이고(이월) 총 1억까지
  // ponytail: ISA 1계좌를 기간 끝까지 유지한다고 가정. 3년마다 해지·재가입하면 비과세 한도를 여러 번 쓸 수 있음
  const [isaS, isaOut] = splitByCap(stream, (y, used) =>
    Math.min(TAX.isa.annual * (y + 1), TAX.isa.total) - used)
  const isaValue = fvOf(isaS, i), isaPrincipal = sum(isaS)
  const isaProfit = Math.max(0, isaValue - isaPrincipal)
  const isaTax = Math.max(0, isaProfit - (opt.isaLow ? TAX.isa.exemptLow : TAX.isa.exempt)) * TAX.isa.rate
  const isa = plus(
    { value: isaValue, principal: isaPrincipal, tax: isaTax, credit: 0, net: isaValue - isaTax, overflow: 0 },
    general(isaOut, i), sum(isaOut))

  // 연금저축+IRP: 연 1,800만 납입, 그중 900만까지 세액공제
  const [penS, penOut] = splitByCap(stream, () => TAX.pension.annual)
  const creditRate = opt.lowIncome ? TAX.pension.creditLow : TAX.pension.creditHigh
  let credited = 0
  for (let y = 0; y * 12 < penS.length; y++) credited += Math.min(sum(penS.slice(y * 12, y * 12 + 12)), TAX.pension.creditCap)
  const penValue = fvOf(penS, i), penPrincipal = sum(penS)
  const taxable = credited + Math.max(0, penValue - penPrincipal)
  const penTax = taxable * TAX.pensionTax[opt.age ?? '55']
  const credit = credited * creditRate
  const pension = plus(
    { value: penValue, principal: penPrincipal, tax: penTax, credit, net: penValue - penTax + credit, overflow: 0 },
    general(penOut, i), sum(penOut))

  return { general: gen, isa, pension }
}
