// 월세 세액공제 랜딩(/rent-tax-credit) 전용 순수 로직. 회귀 체크: node scripts/check-rent-tax-credit.ts
// 올해(TAX_YEAR) 금액은 yearEndTax.ts(rentCredit·itemTaxSaving)를 그대로 쓰고, 여기엔 자격 체크·연도별 규칙·경정청구 기한만 둔다.
// 근거: 조특법 §95의2 각 시행 버전과 부칙, 조특법 시행령 §95, 국세기본법 §45의2⑤·§5 (law.go.kr, 2026-10-04 확인)
import { itemTaxSaving, rentCredit, TAX_YEAR } from './yearEndTax.ts'

// ── 귀속연도별 규칙. rate55 = 총급여 5,500만 이하 공제율, rate = 그 초과~cap 이하, limit = 공제대상 월세 한도, homeValue = 대상 주택 기준시가 상한 ──
export interface RentRule { rate55: number; rate: number; cap: number; limit: number; homeValue: number }
const R2023: RentRule = { rate55: 0.17, rate: 0.15, cap: 70_000_000, limit: 7_500_000, homeValue: 400_000_000 }
const R2024: RentRule = { rate55: 0.17, rate: 0.15, cap: 80_000_000, limit: 10_000_000, homeValue: 400_000_000 }
export const RENT_RULES: Record<number, RentRule> = {
  2021: { rate55: 0.12, rate: 0.10, cap: 70_000_000, limit: 7_500_000, homeValue: 300_000_000 },
  // 2022.12.31 개정(17%/15%)은 부칙 §18로 2022년 지급분에도 적용. 기준시가 4억은 2023.2.28 시행령 부칙 §2로 2023 과세연도부터
  2022: { ...R2023, homeValue: 300_000_000 },
  2023: R2023,
  // 2023.12.31 개정(8천만·1,000만) 부칙 §15: 2024.1.1 이후 지급분부터
  2024: R2024,
  2025: R2024,
  // 2025.12.23 개정(배우자 추가공제)·2026.2.27 시행령(다자녀 100㎡)은 금액 규칙을 바꾸지 않음
  2026: R2024,
}
export const RULE_YEARS = Object.keys(RENT_RULES).map(Number)

export type Tier = 'low' | 'mid' | 'over'
export const tierOf = (salary: number, r: RentRule): Tier => (salary <= 55_000_000 ? 'low' : salary <= r.cap ? 'mid' : 'over')
export const tierRate = (r: RentRule, tier: Tier) => (tier === 'low' ? r.rate55 : tier === 'mid' ? r.rate : 0)
/** 그해 규칙으로 받을 수 있는 최대 환급(지방소득세 10% 포함). 결정세액 한도는 모르므로 반영하지 않은 상한 */
export function ruleMax(r: RentRule, tier: Tier, annualRent: number) {
  const credit = Math.floor(Math.min(Math.max(0, annualRent), r.limit) * tierRate(r, tier))
  return credit + Math.floor(credit * 0.1)
}

// ── 자격 체크 (12월 31일 기준). 총급여는 입력값으로 자동 판정 ──
export const CHECKS = ['house', 'head', 'home', 'address', 'contract'] as const
export type CheckId = (typeof CHECKS)[number]
export function eligibility(salary: number, no: ReadonlySet<CheckId>) {
  const fails: (CheckId | 'salary')[] = CHECKS.filter((c) => no.has(c))
  if (salary > RENT_RULES[TAX_YEAR].cap) fails.push('salary')
  return { ok: fails.length === 0, fails }
}

// ── 올해 결과: 계산상 세액공제 vs 결정세액 한도·표준세액공제 반영 후 실제로 줄어드는 세금 ──
export function rentResult(salary: number, annualRent: number) {
  const rent = Math.max(0, annualRent)
  const r = RENT_RULES[TAX_YEAR]
  const credit = rentCredit(salary, rent)
  const max = credit + Math.floor(credit * 0.1)
  const { before, saving } = itemTaxSaving({ salary }, { rent })
  return {
    rate: tierRate(r, tierOf(salary, r)), base: Math.min(rent, r.limit), credit, max, saving,
    taxBefore: before.totalTax, standardBefore: before.standard,
  }
}

/** 월세를 현금영수증(30%)으로 받을 때 최대 절세액: 카드 사용액이 이미 총급여 25% 문턱을 채운 경우 */
export const cashReceiptMax = (salary: number, annualRent: number) =>
  itemTaxSaving({ salary, credit: Math.floor(salary * 0.25) }, { debit: Math.max(0, annualRent) }).saving

// ── 경정청구 기한: 연말정산만 한 근로자는 연말정산세액 납부기한(다음 해 3월 10일, 소득세법 §128①) 후 5년 (국세기본법 §45의2⑤).
//    기한이 토·일이면 다음 날 (§5①, 공휴일은 미반영) ──
const iso = (d: Date) => d.toISOString().slice(0, 10)
export function nextBusinessDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
  return iso(d)
}
export function claimDeadline(year: number) {
  const due = nextBusinessDay(`${year + 1}-03-10`)
  return nextBusinessDay(`${year + 6}${due.slice(4)}`)
}

/** yearEnd = 아직 회사 연말정산 기간(1~2월), may = 5월 종합소득세 신고로도 가능, claim = 경정청구 */
export type Route = 'yearEnd' | 'may' | 'claim'
export interface PastYear { year: number; deadline: string; route: Route; rule: RentRule }
/** today(YYYY-MM-DD, KST) 기준 아직 경정청구 등으로 받을 수 있는 귀속연도. 규칙을 확인 못 한 해는 unverified로 따로 */
export function pastYears(today: string) {
  const now = Number(today.slice(0, 4))
  const years: PastYear[] = []
  const unverified: number[] = []
  for (let y = now - 1; y >= now - 7; y--) {
    const deadline = claimDeadline(y)
    if (today > deadline) continue
    const rule = RENT_RULES[y]
    if (!rule) { unverified.push(y); continue }
    const route: Route = today < `${y + 1}-03-01` ? 'yearEnd' : today <= nextBusinessDay(`${y + 1}-05-31`) ? 'may' : 'claim'
    years.push({ year: y, deadline, route, rule })
  }
  return { years, unverified }
}

/** 브라우저 기준 오늘 날짜(KST) — 마운트 후에만 호출 (첫 렌더는 REF_DATE로 정적 HTML과 같게) */
export const kstToday = () => iso(new Date(Date.now() + 9 * 3_600_000))
export const REF_DATE = '2026-10-05'
