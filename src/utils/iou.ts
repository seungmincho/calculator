// 차용증 계산 (순수 함수). 날짜는 'YYYY-MM-DD'. 검증: node scripts/check-iou.ts
import { addMonths } from './dday.ts'

export type RepayMethod = 'bullet' | 'annuity' | 'equalPrincipal'

/** 이자제한법 제2조·시행령: 최고이자율 연 20% (2021-07-07~). 지연손해금(배상액 예정)도 같은 상한 (같은 법 제6조) */
export const MAX_RATE = 20
/** 상속세 및 증여세법 시행령 제31조의4·시행규칙 제10조의5: 적정이자율 연 4.6% (1천분의 46) */
export const FAIR_RATE = 4.6
/** 같은 법 제41조의4: 이자 차액이 연 1천만원 미만이면 증여 과세 제외 */
export const GIFT_THRESHOLD = 10_000_000
/** 비영업대금의 이익 원천징수: 소득세 25% + 지방소득세 2.5% */
export const WITHHOLD_INCOME = 0.25

export interface ScheduleRow {
  no: number
  date: string
  principal: number
  interest: number
  payment: number
  balance: number
}

export interface Schedule {
  rows: ScheduleRow[]
  totalInterest: number
  totalPayment: number
}

/** 차용일 다음 달부터 매월 payDay(말일 초과 시 말일)인 지급일들, 변제기일까지. 마지막 회차 = 변제기일 */
export function payDates(loanDate: string, dueDate: string, payDay: number): string[] {
  const base = loanDate.slice(0, 8) + '01'
  const out: string[] = []
  for (let k = 1; k <= 600; k++) {
    const first = addMonths(base, k)
    const d = `${first.slice(0, 8)}${String(Math.min(Math.max(1, payDay), lastDay(first))).padStart(2, '0')}`
    if (d > dueDate) break
    out.push(d)
  }
  if (!out.length || out[out.length - 1] !== dueDate) {
    if (out.length) out[out.length - 1] = dueDate
    else out.push(dueDate)
  }
  return out
}

function lastDay(firstOfMonth: string): number {
  const [y, m] = firstOfMonth.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// ponytail: 이자는 매월 잔액 × 연이율/12 (일할 계산 안 함). 첫·마지막 회차가 한 달이 아니어도 같은 이자 — 정밀 일수 계산이 필요해지면 daysBetween으로 교체
export function schedule(amount: number, ratePct: number, loanDate: string, dueDate: string, method: RepayMethod, payDay: number): Schedule {
  const r = Math.max(0, ratePct) / 100 / 12
  if (!(amount > 0) || !(dueDate > loanDate)) return { rows: [], totalInterest: 0, totalPayment: 0 }
  let dates = payDates(loanDate, dueDate, payDay)
  // 무이자 일시상환: 변제기일 한 번만
  if (method === 'bullet' && r === 0) dates = [dueDate]
  const n = dates.length
  const annuity = r === 0 ? amount / n : (amount * r) / (1 - Math.pow(1 + r, -n))
  let bal = amount
  const rows: ScheduleRow[] = dates.map((date, i) => {
    const last = i === n - 1
    const interest = Math.round(bal * r)
    let principal =
      method === 'bullet' ? 0 :
      method === 'annuity' ? Math.round(annuity) - interest :
      Math.round(amount / n)
    if (last) principal = bal
    principal = Math.min(principal, bal)
    bal -= principal
    return { no: i + 1, date, principal, interest, payment: principal + interest, balance: bal }
  })
  const totalInterest = rows.reduce((s, x) => s + x.interest, 0)
  return { rows, totalInterest, totalPayment: amount + totalInterest }
}

/** 이자 원천징수(비영업대금): 소득세 25% 10원 미만 절사 + 지방소득세 그 10% */
export function withholding(interest: number): { income: number; local: number; total: number } {
  const income = Math.floor((interest * WITHHOLD_INCOME) / 10) * 10
  const local = Math.floor(income / 10 / 10) * 10
  return { income, local, total: income + local }
}

/** 가족 간 저리·무이자 대여: 연 이자 차액 (적정이자율 4.6% − 약정이율) × 원금. 1천만원 이상이면 증여세 대상 */
export function giftInterestGap(amount: number, ratePct: number): { gap: number; taxable: boolean } {
  // 소수 오차 제거 (2억 × 4.6% = 9,199,999.999…)
  const raw = Math.max(0, Math.round(amount * (FAIR_RATE - Math.max(0, ratePct))) / 100)
  return { gap: Math.floor(raw), taxable: raw >= GIFT_THRESHOLD }
}

/** 무이자일 때 증여세가 안 붙는 원금 한도 (≈ 2억 1,739만원) */
export const giftFreePrincipal = (ratePct = 0) =>
  ratePct >= FAIR_RATE ? Infinity : Math.ceil(GIFT_THRESHOLD / ((FAIR_RATE - ratePct) / 100)) - 1

export const overMaxRate = (ratePct: number) => ratePct > MAX_RATE
