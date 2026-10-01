// 적금·예금 이자 계산 (은행 공시 방식). 순수 함수 — scripts/check-savings.ts 로 검증.
// 적금 단리: 월납입 × 연이율/12 × n(n+1)/2 (1회차는 n개월, 마지막 회차는 1개월 이자)
// 적금 월복리: 회차별 월납입 × ((1+i)^k − 1), k = 남은 개월 수
// 예금 단리: 원금 × 연이율 × n/12, 예금 월복리: 원금 × ((1+i)^n − 1)

export type Kind = 'saving' | 'deposit'
export type TaxKey = 'normal' | 'pref' | 'coop' | 'free'

// 일반 15.4%(소득세 14% + 지방소득세 1.4%), 세금우대 9.5%(9% + 농특세 0.5%),
// 상호금융 조합예탁금 1.4%(소득세 비과세, 농특세만), 비과세 0%
export const TAX_RATES: Record<TaxKey, number> = { normal: 0.154, pref: 0.095, coop: 0.014, free: 0 }
export const TAX_KEYS = Object.keys(TAX_RATES) as TaxKey[]

export interface Plan {
  kind: Kind
  amount: number // 적금 = 월 납입액, 예금 = 거치 원금
  rate: number // 연이율 %
  months: number
  compound: boolean
  tax: TaxKey
}

export interface Row { month: number; principal: number; interest: number; balance: number }

/** 원금 1원당 세전 이자(소수) — 금액에 선형이라 역산에 그대로 씀 */
export function interestPerWon(kind: Kind, rate: number, n: number, compound: boolean): number {
  const i = rate / 100 / 12
  if (n <= 0) return 0
  if (kind === 'deposit') return compound ? Math.pow(1 + i, n) - 1 : i * n
  if (!compound) return (i * n * (n + 1)) / 2
  if (i === 0) return 0
  return ((1 + i) * (Math.pow(1 + i, n) - 1)) / i - n
}

export function calc(p: Plan) {
  const n = Math.max(0, Math.floor(p.months))
  const principal = p.kind === 'saving' ? p.amount * n : p.amount
  const gross = Math.floor(p.amount * interestPerWon(p.kind, p.rate, n, p.compound))
  const tax = Math.floor(gross * TAX_RATES[p.tax])
  const net = gross - tax
  // 실질 연수익률 = 세후 이자 ÷ 총 원금 ÷ 기간(년) — 원금을 처음부터 다 맡긴 예금으로 환산한 금리
  const yearly = principal > 0 && n > 0 ? (net / principal) * (12 / n) * 100 : 0
  const yearlyGross = principal > 0 && n > 0 ? (gross / principal) * (12 / n) * 100 : 0
  return { principal, gross, tax, net, maturity: principal + net, maturityGross: principal + gross, yearly, yearlyGross }
}

/** 월별 누적 원금·세전 이자(만기 기준으로 그 달까지 붙은 이자) */
export function schedule(p: Plan): Row[] {
  const i = p.rate / 100 / 12
  const rows: Row[] = []
  for (let m = 1; m <= p.months; m++) {
    const principal = p.kind === 'saving' ? p.amount * m : p.amount
    const per = p.kind === 'saving'
      ? (p.compound ? interestPerWon('saving', p.rate, m, true) : (i * m * (m + 1)) / 2)
      : interestPerWon('deposit', p.rate, m, p.compound)
    const interest = Math.floor(p.amount * per)
    rows.push({ month: m, principal, interest, balance: principal + interest })
  }
  return rows
}

/** 적금(단리) 연 r% = 같은 총원금을 예금에 n개월 맡긴 연 r × (n+1)/(2n)% 와 이자가 같음 */
export const savingToDepositRate = (rate: number, n: number) => (n > 0 ? (rate * (n + 1)) / (2 * n) : 0)
export const depositToSavingRate = (rate: number, n: number) => (n > 0 ? (rate * 2 * n) / (n + 1) : 0)

/** 세후 만기 수령액 target 을 n개월 뒤 받으려면 필요한 월 납입액(적금) 또는 원금(예금), 원 단위 올림 */
export function requiredAmount(target: number, kind: Kind, rate: number, n: number, compound: boolean, tax: TaxKey): number {
  if (target <= 0 || n <= 0) return 0
  const per = interestPerWon(kind, rate, n, compound) * (1 - TAX_RATES[tax])
  const base = kind === 'saving' ? n : 1
  let a = Math.ceil(target / (base + per))
  // 절사(floor) 때문에 1~2원 모자랄 수 있어 보정
  while (calc({ kind, amount: a, rate, months: n, compound, tax }).maturity < target) a++
  return a
}
