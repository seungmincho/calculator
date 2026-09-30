/** 근무시간·수당 계산 (WorkHoursCalculator). 검증: node scripts/check-work-hours.ts */

// 2026년 최저임금 시간급 10,320원 (고용노동부 고시, 2025-08-05)
// https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=18144
export const MIN_WAGE_2026 = 10320
/** 월 환산 주 수 = 365 / 7 / 12 ≈ 4.345 */
export const WEEKS_PER_MONTH = 365 / 7 / 12

export interface Shift {
  week: string        // 같은 주(월~일)끼리 묶는 키
  start: string       // 'HH:MM'
  end: string         // 'HH:MM' — start 이하이면 다음날 퇴근(자정 넘김)
  breakMin: number    // 음수 = 법정 최소 휴게 자동 적용
  holiday: boolean    // 주휴일·공휴일 근무
}

export interface WeekResult {
  week: string
  hours: number          // 실근로(휴일 포함)
  contractHours: number  // 주휴 판단용 소정근로 = 평일 일 8h 이내분 합, 최대 40
  weeklyHolidayHours: number
  eligible: boolean
  over52: boolean
}

export interface PayResult {
  totalHours: number; basicHours: number; overtimeHours: number; nightHours: number
  holidayHours: number; holidayOver8Hours: number
  basicPay: number; overtimePay: number; nightPay: number; holidayPay: number; holidayOverPay: number
  weeklyHolidayPay: number; totalPay: number
  workDayCount: number; weeks: WeekResult[]; breakShortDays: number
  monthlyPay: number     // 주 평균 × 4.345
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** 근로기준법 제54조: 근로 4시간 → 30분, 8시간 → 1시간 이상 */
export const requiredBreak = (workMin: number) => workMin >= 480 ? 60 : workMin >= 240 ? 30 : 0

/** 출퇴근 사이 시간(span)에서 법을 만족하는 최소 휴게 */
export const legalMinBreak = (spanMin: number) => spanMin >= 510 ? 60 : spanMin >= 240 ? 30 : 0

export function shiftMinutes(s: Pick<Shift, 'start' | 'end' | 'breakMin'>) {
  const a = toMin(s.start)
  let b = toMin(s.end)
  if (b <= a) b += 1440
  const span = b - a
  const brk = s.breakMin < 0 ? legalMinBreak(span) : s.breakMin
  const work = Math.max(0, span - brk)
  // 야간 22:00~06:00 (전날 22시~당일 6시, 당일 22시~익일 6시, 익일 22시~)
  let night = 0
  for (const [ns, ne] of [[-120, 360], [1320, 1800], [2760, 3240]]) {
    night += Math.max(0, Math.min(b, ne) - Math.max(a, ns))
  }
  // ponytail: 휴게가 야간에 걸쳤는지 모름 → 야간은 실근로를 넘지 않게만 제한
  return { span, brk, work, night: Math.min(night, work) }
}

/** 'YYYY-MM-DD' → 그 주 월요일 'YYYY-MM-DD' */
export function weekOf(date: string) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/**
 * small = 5인 미만 사업장 → 연장·야간·휴일 가산 미적용 (근로기준법 시행령 별표1). 주휴는 적용.
 * 연장: 평일 일 8h 초과 + 주 40h 초과(일 8h 이내분 기준) 50%. 휴일: 8h 이내 50%, 초과 100%. 야간 50%.
 * 주휴: 주 소정 15h 이상이면 소정/40×8h (최대 8h). 개근 가정.
 */
export function calcPay(shifts: Shift[], wage: number, small: boolean): PayResult {
  const byWeek = new Map<string, Shift[]>()
  for (const s of shifts) byWeek.set(s.week, [...(byWeek.get(s.week) || []), s])

  let totalH = 0, otH = 0, nightH = 0, hol8H = 0, holOverH = 0, whPayH = 0, days = 0, breakShort = 0
  const weeks: WeekResult[] = []

  for (const [week, list] of byWeek) {
    let weekH = 0, dailyOT = 0, reg = 0
    for (const s of list) {
      const m = shiftMinutes(s)
      if (m.work <= 0) continue
      if (s.breakMin >= 0 && m.brk < requiredBreak(m.work)) breakShort++
      const h = m.work / 60
      days++
      weekH += h
      nightH += m.night / 60
      if (s.holiday) {
        hol8H += Math.min(h, 8); holOverH += Math.max(0, h - 8)
      } else {
        dailyOT += Math.max(0, h - 8); reg += Math.min(h, 8)
      }
    }
    otH += dailyOT + Math.max(0, reg - 40)
    totalH += weekH
    const contract = Math.min(40, reg)
    const eligible = contract >= 15
    const whH = eligible ? Math.min(8, (contract / 40) * 8) : 0
    whPayH += whH
    weeks.push({ week, hours: weekH, contractHours: contract, weeklyHolidayHours: whH, eligible, over52: weekH > 52 })
  }

  // 5인 미만: 모든 시간을 기본급(1배)으로, 가산 항목은 0
  const basicHours = small ? totalH : totalH - otH - hol8H - holOverH
  const p = small ? { ot: 0, night: 0, hol: 0, holOver: 0 } : { ot: 1.5, night: 0.5, hol: 1.5, holOver: 2 }
  const basicPay = basicHours * wage
  const overtimePay = otH * wage * p.ot
  const nightPay = nightH * wage * p.night
  const holidayPay = hol8H * wage * p.hol
  const holidayOverPay = holOverH * wage * p.holOver
  const weeklyHolidayPay = whPayH * wage
  const totalPay = basicPay + overtimePay + nightPay + holidayPay + holidayOverPay + weeklyHolidayPay
  weeks.sort((a, b) => a.week.localeCompare(b.week))

  return {
    totalHours: totalH, basicHours, overtimeHours: otH, nightHours: nightH,
    holidayHours: hol8H, holidayOver8Hours: holOverH,
    basicPay, overtimePay, nightPay, holidayPay, holidayOverPay, weeklyHolidayPay, totalPay,
    workDayCount: days, weeks, breakShortDays: breakShort,
    monthlyPay: weeks.length ? (totalPay / weeks.length) * WEEKS_PER_MONTH : 0,
  }
}
