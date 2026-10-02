/**
 * 자동차 할부 (CarLoanCalculator). 회귀 체크: node scripts/check-car-loan.ts
 *
 * 상환 스케줄은 loanSchedule.ts의 schedule()을 그대로 쓴다.
 * 유예(잔가) 할부 = 유예금 B는 매달 이자만(만기일시), 나머지 P−B는 원리금균등 → 두 스케줄을 회차별로 합산.
 * 이 합은 엑셀 PMT(r, n, −P, B)와 수학적으로 같다: (P−B)·A + B·r = P·A − B·vⁿ·A  (A = r/(1−vⁿ), v = 1/(1+r)).
 * 취득세는 evSubsidy.ts의 acquisitionTax()(공급가액 = 가격/1.1, 7%·경차 4%)를 재사용.
 */
import { schedule, type Row } from './loanSchedule.ts'
import { acquisitionTax, ACQ_RELIEF_CAP } from './evSubsidy.ts'

export type Fuel = 'normal' | 'light' | 'ev'
export const FUELS: readonly Fuel[] = ['normal', 'light', 'ev']
export const TERMS = [12, 24, 36, 48, 60] as const
/** 경형 승용 취득세 감면 한도 (지방세특례제한법 §67) */
export const LIGHT_RELIEF_CAP = 750_000
export const MAX_RATE = 20 // 법정 최고금리 연 20%

export interface CarTax { base: number; tax: number; relief: number; pay: number }

/** 비영업용 승용 취득세: 과세표준 = 실구매가(부가세 포함) / 1.1, 7%(경차 4%), 경차·전기차 감면 */
export function carTax(price: number, fuel: Fuel): CarTax {
  const { tax } = acquisitionTax(Math.max(0, price) / 10_000, 0, fuel === 'light')
  const cap = fuel === 'light' ? LIGHT_RELIEF_CAP : fuel === 'ev' ? ACQ_RELIEF_CAP : 0
  const relief = Math.min(tax, cap)
  return { base: Math.max(0, price) / 1.1, tax, relief, pay: tax - relief }
}

export interface CarLoanInput {
  price: number      // 차량가 (부가세 포함)
  options: number
  discount: number
  down: number       // 선수금 (원)
  months: number
  rate: number       // 연 %
  balloonPct: number // 유예율 % (차량 구매가 대비), 0 = 일반 할부
  fuel: Fuel
  extra: number      // 공채·번호판·탁송 등 기타 초기 비용 (사용자 입력)
}

export interface CarLoanResult {
  carPrice: number   // 차량가 + 옵션 − 할인
  down: number
  principal: number  // 할부 원금
  balloon: number    // 만기 일시 상환액 (유예금)
  rows: Row[]        // 회차별 합산 (마지막 회차 principal에 유예금 포함)
  monthly: number    // 정기 월 납입금 (첫 회차)
  totalInterest: number
  tax: CarTax
  extra: number
  upfront: number    // 출고 때 필요한 현금 = 선수금 + 취득세 + 기타
  total: number      // 총 지출 = 차값 + 이자 + 취득세 + 기타
}

export function carLoan(i: CarLoanInput): CarLoanResult {
  const carPrice = Math.max(0, Math.round(i.price + i.options - i.discount))
  const down = Math.min(carPrice, Math.max(0, Math.round(i.down)))
  const principal = carPrice - down
  // 유예금은 할부 원금을 넘을 수 없음
  const balloon = Math.min(principal, Math.round((carPrice * Math.max(0, i.balloonPct)) / 100))
  const months = Math.max(1, Math.round(i.months))
  const rate = Math.min(MAX_RATE, Math.max(0, i.rate))

  const a = principal - balloon > 0 ? schedule({ principal: principal - balloon, rate, months, method: 'equalPayment' }).rows : []
  const b = balloon > 0 ? schedule({ principal: balloon, rate, months, method: 'bullet' }).rows : []
  const rows: Row[] = []
  for (let k = 0; k < Math.max(a.length, b.length); k++) {
    const x = a[k], y = b[k]
    const principalK = (x?.principal ?? 0) + (y?.principal ?? 0)
    const interestK = (x?.interest ?? 0) + (y?.interest ?? 0)
    rows.push({
      n: k + 1, rate, payment: principalK + interestK, principal: principalK, interest: interestK,
      balance: (x?.balance ?? 0) + (y?.balance ?? 0), grace: false, prepay: 0, fee: 0,
    })
  }

  const totalInterest = rows.reduce((s, r) => s + r.interest, 0)
  const tax = carTax(carPrice, i.fuel)
  const extra = Math.max(0, Math.round(i.extra))
  return {
    carPrice, down, principal, balloon, rows,
    monthly: rows[0]?.payment ?? 0,
    totalInterest, tax, extra,
    upfront: down + tax.pay + extra,
    total: carPrice + totalInterest + tax.pay + extra,
  }
}

/** 월 소득 대비 차량 월 비용 비율(%) — 소득 0이면 null */
export function burden(monthlyCarCost: number, monthlyIncome: number): number | null {
  return monthlyIncome > 0 ? (monthlyCarCost / monthlyIncome) * 100 : null
}

/** 참고 구간(공식 기준 아님): ≤15 여유, ≤25 보통, 초과 부담 */
export const burdenLevel = (pct: number): 'ok' | 'mid' | 'high' => (pct <= 15 ? 'ok' : pct <= 25 ? 'mid' : 'high')
