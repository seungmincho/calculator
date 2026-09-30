// 대출 상환 스케줄 — 순수 계산 (원 단위, 월할).
// 이자 = floor(잔액 × 연이율/12) (원 미만 절사), 월 상환액·원금은 원 단위 반올림,
// 마지막 회차가 남은 잔액을 전부 흡수 → 원금 합계 = 대출금 정확히 일치.
// 은행 실제 이자는 일할(실제 일수/365)이라 월마다 몇 원~몇백 원 차이 날 수 있음.

export type Method = 'equalPayment' | 'equalPrincipal' | 'bullet' | 'graduated'
export type PrepayMode = 'shorten' | 'reduce'

export interface Prepay {
  month: number     // N회차 납입 직후 일시 상환
  amount: number    // 원
  feeRate: number   // 중도상환수수료율 % (사용자 입력)
  feeMonths?: number // 수수료 부과 기간(개월), 기본 36 (금소법: 3년 초과 면제)
  mode: PrepayMode  // 기간 단축 | 월 상환액 감소
}

export interface LoanInput {
  principal: number
  rate: number        // 연 %
  months: number      // 총 기간(거치 포함)
  grace?: number      // 거치(이자만) 개월
  method: Method
  growth?: number     // 체증식 연 증가율 %
  rateChangeMonth?: number // 이 회차까지 rate, 다음 회차부터 newRate (0 = 없음)
  newRate?: number
  prepay?: Prepay | null
}

export interface Row {
  n: number
  rate: number
  payment: number   // 정기 상환액 = principal + interest
  principal: number
  interest: number
  balance: number   // 중도상환 반영 후 잔액
  grace: boolean
  prepay: number
  fee: number
}

export interface LoanResult {
  rows: Row[]
  totalInterest: number
  totalPayment: number // 정기 상환 + 중도상환 + 수수료
  fee: number
  months: number
  firstPayment: number // 첫 원금 상환 회차의 상환액 (거치 제외)
  graceInterest: number // 거치 중 월 이자 (첫 달)
  lastPayment: number
  maxPayment: number
}

/** 중도상환수수료 = 상환액 × 요율 × 잔존기간/부과기간 (대출기간이 더 짧으면 대출기간 기준) */
export function prepayFee(amount: number, feeRate: number, month: number, loanMonths: number, feeMonths = 36): number {
  const base = Math.min(feeMonths, loanMonths)
  if (base <= 0 || month >= base) return 0
  return Math.floor(amount * (feeRate / 100) * (base - month) / base)
}

// 체증식: 원금 상환 k번째 달(0-base)의 상환액 = base × (1+g)^floor(k/12)
function graduatedBase(balance: number, r: number, g: number, from: number, to: number): number {
  let pv = 0
  for (let k = from; k < to; k++) pv += Math.pow(1 + g, Math.floor(k / 12)) / Math.pow(1 + r, k - from + 1)
  return balance / pv
}

export function schedule(inp: LoanInput): LoanResult {
  const grace = Math.max(0, Math.min(inp.grace ?? 0, inp.months - 1))
  const amortMonths = inp.months - grace
  const g = (inp.growth ?? 0) / 100
  const rows: Row[] = []
  let bal = Math.round(inp.principal)
  let prevRate = NaN
  let pay = 0          // 원리금균등 월 상환액 / 원금균등 월 원금 / 체증식 base
  let dirty = true     // 상환액 재계산 필요
  let fee = 0

  for (let n = 1; n <= inp.months && bal > 0; n++) {
    const rate = inp.rateChangeMonth && n > inp.rateChangeMonth ? (inp.newRate ?? inp.rate) : inp.rate
    const r = rate / 100 / 12
    if (rate !== prevRate) dirty = true
    prevRate = rate
    const isGrace = n <= grace
    const k = n - grace - 1             // 원금 상환 몇 번째 달 (0-base)
    const left = amortMonths - k        // 남은 원금 상환 회차 (이번 포함)
    const interest = Math.floor(bal * r)
    let principal = 0

    if (!isGrace) {
      if (dirty && inp.method !== 'bullet') {
        if (inp.method === 'equalPayment') {
          pay = r === 0 ? bal / left : bal * r * Math.pow(1 + r, left) / (Math.pow(1 + r, left) - 1)
          pay = Math.round(pay)
        } else if (inp.method === 'equalPrincipal') {
          pay = Math.round(bal / left)
        } else {
          pay = graduatedBase(bal, r, g, k, amortMonths)
        }
        dirty = false
      }
      if (n === inp.months) principal = bal
      else if (inp.method === 'equalPayment') principal = pay - interest
      else if (inp.method === 'equalPrincipal') principal = pay
      else if (inp.method === 'graduated') principal = Math.round(pay * Math.pow(1 + g, Math.floor(k / 12))) - interest
      // 기간 단축으로 조기 종료 시: 반올림 찌꺼기(1,000원 미만)가 한 회차로 남지 않게 흡수
      if (bal - principal < 1000) principal = bal
    }

    bal -= principal
    let pre = 0, f = 0
    const pp = inp.prepay
    if (pp && pp.amount > 0 && n === pp.month && bal > 0) {
      pre = Math.min(Math.round(pp.amount), bal)
      f = prepayFee(pre, pp.feeRate, n, inp.months, pp.feeMonths)
      bal -= pre
      fee += f
      if (pp.mode === 'reduce') dirty = true
    }
    rows.push({ n, rate, payment: principal + interest, principal, interest, balance: bal, grace: isGrace, prepay: pre, fee: f })
  }

  const totalInterest = rows.reduce((s, x) => s + x.interest, 0)
  const totalPayment = rows.reduce((s, x) => s + x.payment + x.prepay + x.fee, 0)
  const amort = rows.filter((x) => !x.grace)
  return {
    rows, totalInterest, totalPayment, fee, months: rows.length,
    firstPayment: amort[0]?.payment ?? 0,
    graceInterest: rows[0]?.grace ? rows[0].interest : 0,
    lastPayment: rows[rows.length - 1]?.payment ?? 0,
    maxPayment: Math.max(0, ...rows.map((x) => x.payment)),
  }
}

export interface YearSum { year: number; principal: number; interest: number; prepay: number; fee: number; balance: number; from: number; to: number }

/** 대출 연차(1~12회차 = 1년차)별 합계 */
export function yearly(rows: Row[]): YearSum[] {
  const out: YearSum[] = []
  for (const x of rows) {
    const y = Math.ceil(x.n / 12)
    let s = out[out.length - 1]
    if (!s || s.year !== y) { s = { year: y, principal: 0, interest: 0, prepay: 0, fee: 0, balance: 0, from: x.n, to: x.n }; out.push(s) }
    s.principal += x.principal; s.interest += x.interest; s.prepay += x.prepay; s.fee += x.fee
    s.balance = x.balance; s.to = x.n
  }
  return out
}

/** 시작일(YYYY-MM-DD) + n개월 납입일. 말일 보정(1/31 → 2/28). */
export function payDate(start: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start)
  if (!m) return ''
  const total = Number(m[1]) * 12 + Number(m[2]) - 1 + n
  const y = Math.floor(total / 12), mo = total % 12
  const day = Math.min(Number(m[3]), new Date(Date.UTC(y, mo + 1, 0)).getUTCDate())
  return `${y}.${String(mo + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`
}
