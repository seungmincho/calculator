// 카드 할부 수수료 계산 (원금균등 + 잔액 기준 수수료)
// 국내 카드사 방식: 매월 원금 = 할부원금 / 개월수, 수수료 = 할부잔액 × 연 수수료율 × 이용일수 / 365.
// 여기서는 이용일수/365 ≈ 1/12 로 단순화 (월별 일수 차이로 실제 청구액과 수 원~수십 원 차이 가능).
// 출처: SC제일은행 신용카드 할부수수료 계산기 https://www.standardchartered.co.kr/np/kr/cm/fc/CalculatorCard3.jsp
//       뱅크샐러드 할부이자 계산법 https://www.banksalad.com/articles/신용카드-할부-줄여주는-신용카드-할부이자-계산기-활용법

export interface InstallmentRow {
  month: number
  principal: number
  fee: number
  payment: number
  balance: number // 납부 후 잔액
}

export interface InstallmentResult {
  schedule: InstallmentRow[]
  totalFee: number
  totalPayment: number
  firstPayment: number
}

/**
 * @param amount 할부 원금(원)
 * @param months 할부 개월수
 * @param annualRate 연 수수료율(%)
 * @param feeMonths 수수료를 내는 회차 수 (앞에서부터). months 이상 = 일반 유이자, 0 = 무이자, 그 사이 = 부분무이자(1~N회차 고객부담)
 */
export function calcInstallment(amount: number, months: number, annualRate: number, feeMonths = months): InstallmentResult {
  const a = Math.floor(amount)
  const n = Math.floor(months)
  if (!(a > 0) || !(n > 0)) return { schedule: [], totalFee: 0, totalPayment: 0, firstPayment: 0 }
  const r = Math.max(0, annualRate) / 100 / 12
  const base = Math.floor(a / n) // 원 미만 절사, 나머지는 첫 회차에 합산 (카드사 관행)
  let balance = a
  let totalFee = 0
  const schedule: InstallmentRow[] = []
  for (let i = 1; i <= n; i++) {
    const principal = i === 1 ? a - base * (n - 1) : base
    const fee = i <= feeMonths ? Math.floor(balance * r) : 0
    balance -= principal
    totalFee += fee
    schedule.push({ month: i, principal, fee, payment: principal + fee, balance })
  }
  return { schedule, totalFee, totalPayment: a + totalFee, firstPayment: schedule[0].payment }
}
