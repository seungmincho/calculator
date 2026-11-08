// 중도상환수수료·대출 갈아타기 계산기(/prepayment-fee) 전용 로직. 상환 스케줄은 loanSchedule.ts의 schedule() 그대로.
// 회귀 체크: node scripts/check-prepayment-fee.ts
// 근거(2026-11-08 확인):
//   금융소비자보호법 §20①4호나목 — 대출일부터 3년 이내 상환할 때만 부과 가능
//   금융위원회 2025-01-09 보도자료 — 2025.1.13 신규 계약부터 실비용(자금운용 기회비용 + 행정·모집비용) 안에서만,
//     은행 평균 수수료율(기존 → 개선): 주담대 고정 1.43→0.56, 변동 1.25→0.55 / 기타담보(보증서·전세) 고정 1.09→0.45,
//     변동 0.95→0.40 / 신용 고정 0.95→0.12, 변동 0.83→0.11
//   산식: 상환원금 × 수수료율 × (3년 − 경과일수) ÷ 3년 — 하나은행 보금자리론 상품설명서(2024.10, 3년 = 1,095일 예시),
//     주택도시기금 디딤돌. KB국민은행: 대출기간이 3년보다 짧으면 대출기간 기준
//   보금자리론 0.5% 한도(hf.go.kr), 디딤돌 0.6% 한도 + 2024.8.12~2026.12.31 상환 원금 면제(nhuf.molit.go.kr)
//   인지세법 §3①·§6: 금융기관 금전소비대차 5천만 이하 비과세, 1억 이하 7만, 10억 이하 15만, 초과 35만 — 고객·은행 50%씩
import { schedule, type Method } from './loanSchedule.ts'
import { addDays, daysBetween } from './dday.ts'

export const FEE_DAYS = 1095 // 3년
export const REFORM_DATE = '2025-01-13' // 이날 이후 체결한 계약부터 실비용 기준 요율

export const LOAN_KINDS = ['mortgageFixed', 'mortgageVariable', 'jeonseFixed', 'jeonseVariable', 'creditFixed', 'creditVariable', 'bogeumjari', 'didimdol'] as const
export type LoanKind = (typeof LOAN_KINDS)[number]
/** before: 2025.1.13 전 계약 은행 평균, after: 개편 뒤 은행 평균(정책대출은 현재 상한) */
export const PRESETS: Record<LoanKind, { before?: number; after: number; waivedUntil?: string }> = {
  mortgageFixed: { before: 1.43, after: 0.56 },
  mortgageVariable: { before: 1.25, after: 0.55 },
  jeonseFixed: { before: 1.09, after: 0.45 },
  jeonseVariable: { before: 0.95, after: 0.4 },
  creditFixed: { before: 0.95, after: 0.12 },
  creditVariable: { before: 0.83, after: 0.11 },
  bogeumjari: { after: 0.5 },
  didimdol: { after: 0.6, waivedUntil: '2026-12-31' },
}

export const presetRate = (kind: LoanKind, start: string) => {
  const p = PRESETS[kind]
  return p.before !== undefined && start < REFORM_DATE ? p.before : p.after
}

export type FeeStatus = 'charged' | 'free' | 'waived' | 'zero' | 'invalid'

export interface FeeInput {
  amount: number   // 갚을 원금
  rate: number     // 연 %가 아니라 수수료율 %
  start: string    // 대출 실행일 YYYY-MM-DD
  repay: string    // 상환일
  termDays?: number // 실행일 ~ 만기 일수 (3년보다 짧으면 이 기간 기준)
  free?: number    // 수수료 없이 갚을 수 있는 금액(연 10% 면제 등)
  waivedUntil?: string
}

export function prepaymentFee(i: FeeInput) {
  const elapsed = daysBetween(i.start, i.repay)
  const base = Math.max(1, Math.min(FEE_DAYS, i.termDays ?? FEE_DAYS))
  const left = Math.max(0, base - elapsed)
  const chargeable = Math.max(0, i.amount - Math.max(0, i.free ?? 0))
  const freeDate = addDays(i.start, base)
  const status: FeeStatus = elapsed < 0 ? 'invalid'
    : left === 0 ? 'free'
      : i.waivedUntil && i.repay <= i.waivedUntil ? 'waived'
        : chargeable === 0 || i.rate <= 0 ? 'zero' : 'charged'
  const fee = status === 'charged' ? Math.floor(chargeable * (i.rate / 100) * left / base) : 0
  return { fee, status, elapsed, base, left, chargeable, freeDate }
}

/** 인지세 총액(인지세법 §3①2호·§6) — 대출받는 사람은 이 중 절반 */
export function stampTax(amount: number): number {
  if (amount <= 50_000_000) return 0
  if (amount <= 100_000_000) return 70_000
  if (amount <= 1_000_000_000) return 150_000
  return 350_000
}

export interface Loan { balance: number; rate: number; months: number; method: Method }

const sched = (l: Loan) => schedule({ principal: l.balance, rate: l.rate, months: l.months, method: l.method })

/** 일부 상환: 같은 만기에 월 상환액을 줄이는 방식으로 남은 이자가 얼마 줄어드는지 */
export function prepayEffect(l: Loan, amount: number) {
  const a = Math.min(Math.max(0, amount), l.balance)
  const before = sched(l), after = sched({ ...l, balance: l.balance - a })
  return { amount: a, saved: before.totalInterest - after.totalInterest, payBefore: before.firstPayment, payAfter: after.firstPayment }
}

/**
 * 갈아타기: 지금 대출(cur)을 같은 잔액의 새 대출(newRate, newMonths, 같은 상환방식)로 바꿀 때.
 * net = 이자 절감 − 중도상환수수료 − 부대비용. breakEven = 누적 이자 차이가 비용을 넘는 첫 회차.
 * waitMonths > 0이면 그만큼 기다렸다(수수료 0) 같은 만기로 갈아탈 때의 순이득도 계산 (금리 그대로 가정).
 */
export function refinance(cur: Loan, newRate: number, newMonths: number, fee: number, costs: number, waitMonths = 0) {
  const a = sched(cur)
  const b = sched({ ...cur, rate: newRate, months: newMonths })
  const saving = a.totalInterest - b.totalInterest
  const cost = fee + costs
  let cum = 0, breakEven: number | null = null
  for (let k = 0; k < Math.max(a.rows.length, b.rows.length); k++) {
    cum += (a.rows[k]?.interest ?? 0) - (b.rows[k]?.interest ?? 0)
    if (cum >= cost) { breakEven = k + 1; break }
  }
  let waitNet: number | null = null
  if (fee > 0 && waitMonths > 0 && waitMonths < Math.min(cur.months, newMonths) && a.rows[waitMonths - 1]) {
    const paid = a.rows.slice(0, waitMonths).reduce((s, x) => s + x.interest, 0)
    const later = sched({ ...cur, balance: a.rows[waitMonths - 1].balance, rate: newRate, months: newMonths - waitMonths })
    waitNet = a.totalInterest - paid - later.totalInterest - costs
  }
  return {
    curInterest: a.totalInterest, newInterest: b.totalInterest, saving, cost, net: saving - cost, breakEven,
    payCur: a.firstPayment, payNew: b.firstPayment, waitNet,
  }
}

/** page.tsx 본문·FAQ 예시 (scripts/check-prepayment-fee.ts가 값 고정) */
export const EXAMPLES = {
  // 2025.1.13 이후 은행 주담대(고정) 1억, 6개월(182일) 뒤 상환
  half: { amount: 100_000_000, rate: 0.56, start: '2026-01-05', repay: '2026-07-06' },
  // 같은 대출 1년 뒤
  year: { amount: 100_000_000, rate: 0.56, start: '2025-11-10', repay: '2026-11-10' },
  // 2025.1.13 전 계약(은행 평균 1.43%) 1억, 1년 뒤
  old: { amount: 100_000_000, rate: 1.43, start: '2024-11-11', repay: '2025-11-11' },
  // 갈아타기: 잔액 3억 4.3% 29년 → 3.8% 29년, 실행 1년 뒤
  refi: { balance: 300_000_000, rate: 4.3, months: 348, method: 'equalPayment' as Method, newRate: 3.8, feeRate: 0.56, start: '2025-11-10', repay: '2026-11-10' },
}
