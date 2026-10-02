/**
 * 집 살 때 실제로 필요한 현금 합산 (RealEstateCalculator). 회귀 체크: node scripts/check-real-estate-cost.ts
 *
 * 세금·중개보수·국민주택채권·인지세는 acquisitionTax.ts(→ brokerageFee.ts), 대출 상환은 loanSchedule.ts를 그대로 쓴다.
 * 여기서 하는 일: 자기자본(매매가 − 대출) + 부대비용 합산, 등기비용 묶음, 대략 DSR.
 */
import { calcTax, buyExtras, LEGAL_FEE, type Owner, type Relief, type TaxResult } from './acquisitionTax.ts'
import { schedule } from './loanSchedule.ts'
import { annualRepay } from './loanQuick.ts'

export { LEGAL_FEE }
export type RepayMethod = 'equalPayment' | 'equalPrincipal'

export interface CostInput {
  price: number
  owner: Owner            // 취득 후 세대 주택 수
  adjusted: boolean       // 조정대상지역
  metro: boolean          // 서울·광역시 (국민주택채권 매입률)
  over85: boolean         // 전용 85㎡ 초과 → 농특세
  relief: Relief          // 생애최초·출산 감면
  loan: number            // 대출 원금
  rate: number            // 연 %
  years: number
  method: RepayMethod
  brokerVat: boolean      // 중개보수 부가세 10% 포함
  legal: number           // 법무사 보수·등기 수수료 (사용자 조정)
  other: number           // 이사·입주청소 등 기타
  income: number          // 연소득 (0이면 DSR 생략)
}

export interface CostResult {
  loan: number
  equity: number          // 자기자본 = 매매가 − 대출
  ltv: number             // %
  tax: TaxResult
  broker: number
  brokerVat: number
  bond: number            // 국민주택채권 즉시 매도 할인 부담 (대략)
  stamp: number           // 매매계약서 인지세 (매수인 절반)
  legal: number
  registration: number    // bond + stamp + legal
  other: number
  fees: number            // 집값 외 부대비용 합계
  cash: number            // 총 필요 현금 = equity + fees
  monthly: number         // 첫 달 상환액 (원금균등은 최대치)
  totalInterest: number
  dsr: number | null      // 이 대출만 반영한 대략 DSR (%)
}

export function totalCost(i: CostInput): CostResult {
  const price = Math.max(0, i.price)
  const loan = Math.min(price, Math.max(0, i.loan))
  // ponytail: 공시가격 1억 이하 중과 제외(under1eok)는 무시 — 다주택 저가 주택이면 /acquisition-tax에서 확인
  const tax = calcTax({
    mode: 'buy', kind: 'house', price, over85: i.over85, adjusted: i.adjusted, owner: i.owner,
    under1eok: false, relief: i.relief, inheritSole: false, giftStd3eok: false, giftFromSingle: false,
  })
  const ex = buyExtras(price, 'house', i.metro)
  const brokerVat = i.brokerVat ? ex.brokerVat : 0
  const legal = Math.max(0, i.legal)
  const other = Math.max(0, i.other)
  const registration = ex.bond + ex.stamp + legal
  const fees = tax.total + ex.broker + brokerVat + registration + other
  const equity = price - loan

  const months = Math.max(1, Math.round(i.years * 12))
  const res = loan > 0 ? schedule({ principal: loan, rate: Math.max(0, i.rate), months, method: i.method }) : null

  return {
    loan, equity, ltv: price ? (loan / price) * 100 : 0, tax,
    broker: ex.broker, brokerVat, bond: ex.bond, stamp: ex.stamp, legal, registration, other, fees,
    cash: equity + fees,
    monthly: res?.firstPayment ?? 0,
    totalInterest: res?.totalInterest ?? 0,
    dsr: res && i.income > 0 ? (annualRepay(res) / i.income) * 100 : null,
  }
}
