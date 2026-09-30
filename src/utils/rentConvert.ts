// 전월세 전환·비용 비교 순수 로직. 금액 단위: 원, 비율 인자: % (예: 5 = 5%)

/** 한국은행 기준금리 (2026-08-27 금통위 인상, 3.00%). 개정 시 여기만 수정 */
export const BASE_RATE = { rate: 3.0, date: '2026-08-27' }

/** 주택임대차보호법 제7조의2 + 시행령 제9조: min(연 10%, 기준금리 + 2%p) */
export function legalCapRate(baseRate: number): number {
  return Math.min(10, baseRate + 2)
}

/** 전세 → 월세: (전세금 − 보증금) × 전환율 ÷ 12 */
export function jeonseToWolse(jeonse: number, deposit: number, ratePct: number): number {
  const diff = jeonse - deposit
  if (diff <= 0 || ratePct <= 0) return 0
  return Math.round((diff * ratePct) / 100 / 12)
}

/** 월세 → 전세 환산: 보증금 + 월세 × 12 ÷ 전환율 */
export function wolseToJeonse(deposit: number, monthlyRent: number, ratePct: number): number {
  if (ratePct <= 0) return deposit
  return Math.round(deposit + (monthlyRent * 12) / (ratePct / 100))
}

/** 월세 세액공제율 (조특법 제95조의2): 총급여 5,500만 이하 17%, 8,000만 이하 15%, 초과 0 */
export function rentCreditRate(salary: number, eligible: boolean): number {
  if (!eligible || salary <= 0) return 0
  if (salary <= 55_000_000) return 0.17
  if (salary <= 80_000_000) return 0.15
  return 0
}
export const RENT_CREDIT_CAP = 10_000_000 // 공제대상 월세 연 한도

export interface CostInput {
  deposit: number
  monthlyRent: number
  years: number
  cash: number        // 보증금에 넣을 수 있는 내 돈 (부족분은 전세대출)
  loanRate: number    // 대출금리 %
  depositRate: number // 예금금리 % (내 돈의 기회비용)
  creditRate: number  // 월세 세액공제율 (0.15 등)
}
export interface CostResult {
  loan: number; own: number
  interest: number; opportunity: number; rent: number; credit: number
  net: number // 기간 총 순비용
}

export function housingCost(i: CostInput): CostResult {
  const loan = Math.max(0, i.deposit - i.cash)
  const own = i.deposit - loan
  const interest = Math.round(loan * i.loanRate / 100 * i.years)
  const opportunity = Math.round(own * i.depositRate / 100 * i.years)
  const yearlyRent = i.monthlyRent * 12
  const rent = Math.round(yearlyRent * i.years)
  const credit = Math.round(Math.min(yearlyRent, RENT_CREDIT_CAP) * i.creditRate * i.years)
  return { loan, own, interest, opportunity, rent, credit, net: interest + opportunity + rent - credit }
}

/**
 * a와 b의 순비용이 같아지는 대출금리(또는 예금금리) %. 비용이 해당 금리에 선형이므로 두 점으로 푼다.
 * 해가 없거나(기울기 0) 0~30% 밖이면 null.
 */
export function breakevenRate(
  a: Omit<CostInput, 'loanRate' | 'depositRate'>,
  b: Omit<CostInput, 'loanRate' | 'depositRate'>,
  rates: { loanRate: number; depositRate: number },
  key: 'loanRate' | 'depositRate',
): number | null {
  const f = (r: number) => {
    const x = { ...rates, [key]: r }
    return housingCost({ ...a, ...x }).net - housingCost({ ...b, ...x }).net
  }
  const f0 = f(0), slope = (f(10) - f0) / 10
  if (Math.abs(slope) < 1e-9) return null
  const r = -f0 / slope
  return r < 0 || r > 30 ? null : Math.round(r * 100) / 100
}

/**
 * 계약갱신 5% 상한 (주임법 제7조 ②: 약정 차임·보증금의 1/20).
 * 보증금+월세가 섞인 경우 실무 해설대로 전환율로 환산보증금을 만든 뒤 그 5%만큼 인상 가능.
 */
export function renewalCap(deposit: number, monthlyRent: number, ratePct: number) {
  const converted = wolseToJeonse(deposit, monthlyRent, ratePct)
  const room = Math.round(converted * 0.05)
  return {
    converted,
    maxConverted: converted + room,
    maxDepositOnly: deposit + room,                                   // 월세 그대로, 보증금만 올릴 때
    maxRentOnly: monthlyRent + (ratePct > 0 ? Math.round(room * ratePct / 100 / 12) : 0), // 보증금 그대로, 월세만
  }
}
