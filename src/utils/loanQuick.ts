// 대출 계산기(빠른 계산) 보조 로직 — 상환 스케줄 자체는 loanSchedule.ts의 schedule()을 그대로 씀.
import type { LoanResult, Method } from './loanSchedule.ts'

/**
 * 역산: 월 상환 가능액(원)으로 빌릴 수 있는 최대 원금(만원 단위 내림).
 * schedule()의 반올림 규칙(이자 원 미만 절사, 상환액 반올림)에서 첫 원금 상환 회차 상환액 ≤ pay.
 * 원리금균등: P = pay·((1+r)^n−1)/(r(1+r)^n) · 원금균등: 첫 달 P/n + P·r = pay · 만기일시: P·r = pay
 * (n = 거치 제외 상환 개월). 금리 0%인 만기일시는 상한이 없어 Infinity.
 */
export function maxPrincipal(pay: number, rate: number, months: number, grace: number, method: Method): number {
  const n = months - grace
  if (pay <= 0 || n <= 0) return 0
  const r = rate / 100 / 12
  let p: number
  if (method === 'bullet') p = r > 0 ? pay / r : Infinity
  else if (method === 'equalPrincipal') p = pay / (1 / n + r)
  else p = r === 0 ? pay * n : pay * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
  return Number.isFinite(p) ? Math.floor(p / 1e4) * 1e4 : p
}

/** DSR용 연간 원리금: 거치 끝난 뒤 첫 12회차 상환액 합 (12회차 미만이면 전체 합) */
export function annualRepay(res: LoanResult): number {
  return res.rows.filter((x) => !x.grace).slice(0, 12).reduce((s, x) => s + x.payment, 0)
}
