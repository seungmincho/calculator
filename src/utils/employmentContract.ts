/**
 * 근로계약서 작성기 계산·검사 (EmploymentContract). 회귀 체크: node scripts/check-employment-contract.ts
 *
 * 근거: 근로기준법 제50조(1일 8h·1주 40h), 제53조(연장 1주 12h), 제54조(휴게 4h→30분·8h→1시간),
 *       제55조·제18조③(주휴, 주 15h 미만 제외), 제69조(18세 미만 1일 7h·1주 35h, 합의 시 +1h/+5h),
 *       최저임금 2026 시간급 10,320원(월 209시간 환산 2,156,880원)
 */
import { shiftMinutes, requiredBreak, MIN_WAGE_2026 } from './workHours.ts'
import { holidayHoursFor, monthlyHoursFor, WEEKS_PER_MONTH } from './weeklyHolidayPay.ts'

export { MIN_WAGE_2026 }

export interface Slot {
  start: string // 'HH:MM'
  end: string
  bStart: string // 휴게 시작 ('' = 휴게 없음)
  bEnd: string
}

const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const breakMinutes = (s: Slot) => {
  if (!s.bStart || !s.bEnd) return 0
  const d = toMin(s.bEnd) - toMin(s.bStart)
  return d < 0 ? d + 1440 : d
}

/** 하루: 체류(span)·휴게·실근로·야간(22~06시) 분, 법정 최소 휴게 부족 여부 */
export function slotInfo(s: Slot) {
  const brk = breakMinutes(s)
  const r = shiftMinutes({ start: s.start, end: s.end, breakMin: brk })
  return { ...r, needBreak: requiredBreak(r.work), breakShort: brk < requiredBreak(r.work) }
}

export interface Week {
  dayHours: number[] // 요일별 실근로(월~일), 쉬는 날 0
  weekly: number // 주 실근로
  contract: number // 주휴·월급 환산 기준 소정근로 (일 8h·주 40h 이내분)
  overtime: number // 일 8h·주 40h 초과분 = 연장근로
  maxDay: number
  holidayHours: number // 주휴시간 (주 15h 미만 0)
  monthlyHours: number // (소정 + 주휴) × 365/7/12 → 주 40h = 209
  night: boolean // 22~06시 근로 포함
  breakShortDays: number[] // 휴게 부족한 요일 인덱스
}

export function week(slots: Slot[], on: boolean[]): Week {
  const info = slots.map((s, i) => (on[i] ? slotInfo(s) : null))
  const dayHours = info.map((x) => (x ? x.work / 60 : 0))
  const weekly = dayHours.reduce((a, b) => a + b, 0)
  const contract = Math.min(40, dayHours.reduce((a, h) => a + Math.min(8, h), 0))
  const holidayHours = holidayHoursFor(contract)
  return {
    dayHours,
    weekly,
    contract,
    overtime: weekly - contract,
    maxDay: Math.max(0, ...dayHours),
    holidayHours,
    monthlyHours: monthlyHoursFor(contract + holidayHours),
    night: info.some((x) => !!x && x.night > 0),
    breakShortDays: info.flatMap((x, i) => (x?.breakShort ? [i] : [])),
  }
}

export type WageType = 'hourly' | 'monthly'

/** 기본급 → 시간급 환산 (월급은 월 소정+주휴 시간으로 나눔) */
export const hourlyOf = (type: WageType, amount: number, w: Week) =>
  type === 'hourly' ? amount : w.monthlyHours > 0 ? amount / w.monthlyHours : 0

/** 최저임금 검사: 기본급 기준, 매월 정기 지급 수당을 더하면 충족하는지도 */
export function minWageCheck(type: WageType, amount: number, monthlyAllowance: number, w: Week) {
  const hourly = hourlyOf(type, amount, w)
  const required = type === 'hourly' ? MIN_WAGE_2026 : MIN_WAGE_2026 * w.monthlyHours
  const withAllowance = type === 'monthly' ? hourlyOf(type, amount + monthlyAllowance, w) : hourly
  return {
    hourly: Math.round(hourly),
    required,
    ok: hourly >= MIN_WAGE_2026,
    okWithAllowance: withAllowance >= MIN_WAGE_2026,
    shortfall: Math.max(0, required - amount),
  }
}

/** 시급제 월 예상 세전 급여: (소정+주휴) 월 환산 + 연장근로(5인 이상 1.5배) */
export function monthlyEstimate(type: WageType, amount: number, w: Week, small: boolean) {
  const hourly = hourlyOf(type, amount, w)
  const base = type === 'hourly' ? amount * w.monthlyHours : amount
  const overtime = Math.round(hourly * (small ? 1 : 1.5) * w.overtime * WEEKS_PER_MONTH)
  return { base: Math.round(base), overtime, total: Math.round(base) + overtime, weeklyHolidayPay: Math.round(hourly * w.holidayHours) }
}

/** 18세 미만 한도: 1일 7h·1주 35h, 당사자 합의 시 1일 1h·1주 5h 연장 (제69조) */
export function minorLimit(w: Week): 'ok' | 'consent' | 'over' {
  if (w.maxDay > 8 || w.weekly > 40) return 'over'
  if (w.maxDay > 7 || w.weekly > 35) return 'consent'
  return 'ok'
}

/** 주민번호 앞 6자리(+뒷자리 첫째) → 기준일 만 나이. 뒷자리 없으면 00~현재연도 끝 두 자리는 2000년대로 추정 */
export function ageAt(idFront: string, idBack1: string, on: string): number | null {
  if (!/^\d{6}$/.test(idFront) || !/^\d{4}-\d{2}-\d{2}$/.test(on)) return null
  const yy = Number(idFront.slice(0, 2))
  const mmdd = idFront.slice(2)
  const b = idBack1 ? Number(idBack1) : NaN
  const century = [1, 2, 5, 6].includes(b) ? 1900 : [3, 4, 7, 8].includes(b) ? 2000 : [9, 0].includes(b) ? 1800 : yy <= Number(on.slice(2, 4)) ? 2000 : 1900
  const y = century + yy
  return Number(on.slice(0, 4)) - y - (on.slice(5).replace('-', '') < mmdd ? 1 : 0)
}
