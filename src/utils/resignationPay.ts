// 퇴사하면 받는 돈 계산기(/resignation-pay). 계산은 기존 util을 그대로 묶는 얇은 계층 — 회귀 체크: node scripts/check-resignation-pay.ts
// 재사용(각 파일 주석에 근거):
//   retirementPay.ts  퇴직금(근로자퇴직급여 보장법 §4·§8, 근로기준법 §2 평균임금)·퇴직소득세(소득세법 §48·§55)
//   annualLeave.ts    발생 연차(근로기준법 §60, 대법원 2021다227100 — 발생일에 재직 중이어야 함)·1일 통상임금(월급 ÷ 209h × 8h)
//   unemploymentBenefit.ts 구직급여 일액(고용보험법 §45·§46, 시행령 §68 상한 — 이직일 연도별)·소정급여일수(§50 별표1)
//   yearEndTax.ts     결정세액(소득세법 §47·§55·§59·§59의4⑨ 표준세액공제) / wageTaxTable.ts 간이세액표(시행령 별표2)
// 여기서 새로 쓰는 규칙(2026-11-08 casenote.kr 원문 확인):
//   근로기준법 §36·근로자퇴직급여 보장법 §9① 퇴직 후 14일 안에 임금·퇴직금 등 모든 금품 지급(특별한 사정 + 합의로 연장 가능)
//   근로자퇴직급여 보장법 §9② 퇴직금은 IRP 계정 이전이 원칙(55세 이후 퇴직 등 예외)
//   고용보험법 §40①1호·② 이직일 이전 18개월 동안 피보험 단위기간 합산 180일 이상
//   고용보험법 §58 중대한 귀책사유 해고·자기 사정 이직(고용노동부령의 정당한 사유 제외)은 수급자격 제한
//   고용보험법 §48① 이직일 다음 날부터 12개월 안에 소정급여일수 한도로 지급
//   국민건강보험법 §110① 직장가입자 자격 통산 1년 이상 → 임의계속가입 신청, 시행령 §77① 최대 36개월
import { calcRetirement, fullYears, isDate } from './retirementPay.ts'
import { summarize, joinGrants, total, dailyWage } from './annualLeave.ts'
import { avgDailyWage, dailyBenefit, benefitDays, type AgeGroup, type InsurancePeriod } from './unemploymentBenefit.ts'
import { calc as yearEnd, DEFAULT_INPUT } from './yearEndTax.ts'
import { wageTax } from './wageTaxTable.ts'
import { addDays, addMonths, daysBetween } from './dday.ts'

export const REASONS = ['advised', 'contract', 'closure', 'dismissal', 'voluntary'] as const
export type Reason = (typeof REASONS)[number]
export type LeaveMode = 'remaining' | 'used'

export interface Input {
  start: string       // 입사일
  last: string        // 마지막 근무일(= 고용보험 이직일). 퇴직일은 그다음 날
  monthly: number     // 최근 3개월 월평균 임금(세전)
  bonus: number       // 연간 상여
  leaveMode: LeaveMode
  leaveDays: number   // 남은 연차 또는 사용한 연차(leaveMode)
  reason: Reason
  age: number         // 이직일 현재 나이
  disabled: boolean
  dependents: number  // 부양가족 수(본인 제외, 연말정산 기본공제)
}

/** 첫 화면 기본값 = 페이지 예시 */
export const DEF: Input = {
  start: '2023-03-02', last: '2026-12-31', monthly: 3_500_000, bonus: 0,
  leaveMode: 'remaining', leaveDays: 5, reason: 'advised', age: 34, disabled: false, dependents: 0,
}

export const UNIT_DAYS_MIN = 180 // 고용보험법 §40①1호
export const PAY_DEADLINE_DAYS = 14 // 근로기준법 §36
const round2 = (n: number) => Math.round(n * 100) / 100
const floor10 = (n: number) => Math.floor(n / 10) * 10

export const periodOf = (years: number): InsurancePeriod =>
  years < 1 ? 'under1' : years < 3 ? '1to3' : years < 5 ? '3to5' : years < 10 ? '5to10' : 'over10'

export function compute(x: Input) {
  if (!isDate(x.start) || !isDate(x.last) || x.last < x.start) return null
  const end = addDays(x.last, 1) // 퇴직일(근로관계 종료일) — retirementPay 규약
  const monthly = Math.max(0, x.monthly), bonus = Math.max(0, x.bonus)

  // 퇴직금: 미사용 연차수당(퇴직으로 생긴 것)은 평균임금에 넣지 않음 → leave 0
  const sev = calcRetirement({ start: x.start, end, monthly, bonus, leave: 0 })!

  // 연차: 입사일 기준. 마지막 근무일에 쓸 수 있는(발생·미소멸) 연차
  const lv = summarize('joinDate', x.start, x.last)
  const unused = x.leaveMode === 'used' ? Math.max(0, round2(lv.active - x.leaveDays)) : Math.max(0, x.leaveDays)
  const daily = dailyWage('monthly', monthly)
  const leavePay = Math.round(unused * daily)

  // 실업급여. 평균임금 = 3개월 임금 + 상여 3/12 (퇴직금과 같은 기준)
  // ponytail: 피보험 단위기간 = 이 회사 재직일 × 6/7(주 5일 + 유급 주휴일) 근사. 이전 직장 합산·단시간 근로는 반영 안 함
  const unitDays = Math.floor((sev.days * 6) / 7)
  const period = periodOf(fullYears(x.start, end))
  const ageGroup: AgeGroup = x.age >= 50 || x.disabled ? 'over50' : 'under50'
  const d = dailyBenefit(avgDailyWage(monthly + bonus / 12, x.last), 8, x.last)
  const ueDays = benefitDays(ageGroup, period)
  const involuntary = x.reason !== 'voluntary'
  const insuredOk = unitDays >= UNIT_DAYS_MIN
  const ue = {
    ...d, days: ueDays, total: d.daily * ueDays, involuntary, insuredOk, eligible: involuntary && insuredOk,
    unitDays, period, ageGroup, applyFrom: end, applyUntil: addDays(addMonths(end, 12), -1),
  }

  // 중도퇴사 연말정산(퇴사한 해): 기본공제·근로소득세액공제·표준세액공제(또는 4대보험 특별소득공제)만 — 카드·의료비 등은 5월 종합소득세
  // 총급여 = (월급 × 12 + 상여) × 그해 재직 비율 + 미사용 연차수당(비과세 없음 가정)
  // 기납부 = 매달 간이세액표 × 그해 재직 개월(상여는 월할해 매달 급여에 더함 — 지급대상기간 방식 근사). 연차수당은 정산 때 함께 계산
  const year = +x.last.slice(0, 4)
  const jan1 = `${year}-01-01`
  const from = x.start > jan1 ? x.start : jan1
  const months = (12 * (daysBetween(from, x.last) + 1)) / (daysBetween(jan1, `${year}-12-31`) + 1)
  const salary = Math.round(((monthly * 12 + bonus) * months) / 12) + leavePay
  const prepaid = floor10(wageTax(monthly + bonus / 12, 1 + x.dependents) * months)
  const y = yearEnd({ ...DEFAULT_INPUT, credit: 0, debit: 0, culture: 0, market: 0, transport: 0, salary, others: x.dependents, prepaid })
  const tax = { year, months, salary, prepaid, determined: y.determined, totalTax: y.totalTax, refund: y.refund }

  const sure = sev.net + leavePay + tax.refund
  return {
    end, sev, lv, unused, daily, leavePay, ue, tax, sure,
    total: sure + (ue.eligible ? ue.total : 0),
    payBy: addDays(end, PAY_DEADLINE_DAYS),
  }
}
export type Result = NonNullable<ReturnType<typeof compute>>

export type SimKey = 'now' | 'oneYear' | 'nextLeave' | 'nextMonth'
/** 퇴사일 바꿔 보기: 지금 / 1년 되는 날(퇴직금 없을 때) / 다음 연차 발생일 / 한 달 뒤.
 *  새로 생기는 연차는 쓰지 않는다고 보고 남은 연차에 더함. 합계엔 연말정산 제외(더 일한 기간 월급도 별도) */
export function simulate(x: Input, r: Result) {
  const cand: { key: SimKey; last: string }[] = [{ key: 'now', last: x.last }]
  if (!r.sev.eligible) cand.push({ key: 'oneYear', last: addDays(r.sev.oneYearEnd, -1) })
  const nextMonth = addMonths(x.last, 1)
  if (r.lv.next) cand.push({ key: 'nextLeave', last: r.lv.next.date })
  if (!r.lv.next || r.lv.next.date > nextMonth) cand.push({ key: 'nextMonth', last: nextMonth }) // 한 달 안에 연차가 생기면 그 행으로 충분
  const base = total(joinGrants(x.start, x.last))
  const seen = new Set<string>()
  return cand
    .filter((c) => c.last >= x.last && !seen.has(c.last) && !!seen.add(c.last))
    .sort((a, b) => a.last.localeCompare(b.last))
    .map((c) => {
      const added = round2(total(joinGrants(x.start, c.last)) - base)
      const s = c.key === 'now' ? r : compute({ ...x, last: c.last, leaveMode: 'remaining', leaveDays: round2(r.unused + added) })!
      const ue = s.ue.eligible ? s.ue.total : 0
      return { ...c, added, sev: s.sev.net, sevEligible: s.sev.eligible, leavePay: s.leavePay, ue, ueDaily: s.ue.daily, sum: s.sev.net + s.leavePay + ue }
    })
}

// ── 페이지 예시 (page.tsx 본문·FAQ 숫자, check 스크립트가 고정) ──
export const EXAMPLES = {
  d: DEF,
  /** 1년 미만: 2026.3.2 입사, 2026.12.31 퇴사 */
  short: { ...DEF, start: '2026-03-02', leaveDays: 2 },
  /** 같은 조건 자발적 퇴사 */
  voluntary: { ...DEF, reason: 'voluntary' as Reason },
}
