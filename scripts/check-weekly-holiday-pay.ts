// 주휴수당·시급 환산 회귀 체크: node scripts/check-weekly-holiday-pay.ts
import { calcWeek, evenDays, holidayHoursFor, monthlyHoursFor, monthlyDeduction, netDayHours, wageTable, MIN_WAGE_2026 } from '../src/utils/weeklyHolidayPay.ts'
import { calcPay } from '../src/utils/workHours.ts'

let fail = 0
const eq = (name: string, got: number | boolean, want: number | boolean) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) < 0.01 : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const W = MIN_WAGE_2026

eq('min wage 2026', W, 10320)
// 주 40시간: 주휴 8h, 월 209시간 = 2,156,880원 (고시 월 환산액)
let r = calcWeek(W, evenDays(5, 8))
eq('40h holiday', r.holidayHours, 8); eq('40h monthly hours', r.monthlyHours, 209); eq('40h monthly', r.monthlyTotal, 2_156_880)
eq('40h weekly', r.weeklyTotal, 48 * W); eq('40h effective', r.effectiveHourly, W * 1.2)
// 주 20시간: 주휴 4h = 41,280원, 월 104시간
r = calcWeek(W, evenDays(5, 4))
eq('20h holiday pay', r.holidayPay, 41_280); eq('20h monthly hours', r.monthlyHours, 104)
// 15시간 경계: 14.5h 미발생, 15h 발생(3h)
eq('14.5h', calcWeek(W, [5, 5, 4.5, 0, 0, 0, 0]).eligible, false)
r = calcWeek(W, evenDays(3, 5)); eq('15h eligible', r.eligible, true); eq('15h holiday', r.holidayHours, 3)
eq('14.5 vs 15 monthly', calcWeek(W, evenDays(3, 5)).monthlyTotal - calcWeek(W, [5, 5, 4.5]).monthlyTotal, W * (78 - 63))
// 하루 10시간 × 5일: 소정 40 → 주휴 8 (초과 10h는 연장, 주휴 판단 제외)
r = calcWeek(W, evenDays(5, 10)); eq('10h days contract', r.contractHours, 40); eq('10h days ot', r.overtimeHours, 10); eq('10h days holiday', r.holidayHours, 8)
// 주말 이틀 12시간: 소정 16 → 주휴 3.2
r = calcWeek(W, [0, 0, 0, 0, 0, 12, 12]); eq('weekend contract', r.contractHours, 16); eq('weekend holiday', r.holidayHours, 3.2)
eq('cap 8', holidayHoursFor(52), 8); eq('monthlyHours 0', monthlyHoursFor(0), 0)
eq('break', netDayHours(9, 60), 8); eq('break off-day', netDayHours(0, 60), 0)
// workHours.calcPay 와 주휴 일치
const shifts = [0, 1, 2, 3, 4].map(() => ({ week: 'w', start: '10:00', end: '14:30', breakMin: 30, holiday: false }))
eq('match calcPay', calcWeek(W, evenDays(5, 4)).holidayPay, calcPay(shifts, W, false).weeklyHolidayPay)

// 공제: 3.3% (10원 절사), 4대보험
eq('3.3%', monthlyDeduction(1_000_000, 'tax33').total, 33_000)
eq('3.3% floor', monthlyDeduction(1_234_567, 'tax33').total, 37_030 + 3_700)
const ins = monthlyDeduction(2_156_880, 'ins')
eq('pension', ins.pension, 102_450); eq('health', ins.health, 77_530); eq('care', ins.care, 10_180); eq('employment', ins.employment, 19_410)
eq('pension floor', monthlyDeduction(300_000, 'ins').pension, 19_470)
eq('none', monthlyDeduction(1_000_000, 'none').total, 0)

// 시급 ↔ 월급 ↔ 주급 양방향
let w = wageTable('hourly', W, 40, 5, true)
eq('hourly→monthly', w.monthly, 2_156_880); eq('hourly→weekly', w.weekly, 495_360); eq('hourly→daily', w.daily, 82_560)
w = wageTable('monthly', 2_156_880, 40, 5, true); eq('monthly→hourly', w.hourly, W)
w = wageTable('weekly', 495_360, 40, 5, true); eq('weekly→hourly', w.hourly, W)
w = wageTable('yearly', 2_156_880 * 12, 40, 5, true); eq('yearly→hourly', w.hourly, W)
w = wageTable('daily', 82_560, 40, 5, true); eq('daily→hourly', w.hourly, W)
w = wageTable('hourly', W, 40, 5, false); eq('no holiday hours', w.monthlyHours, 174)
w = wageTable('hourly', W, 14, 5, true); eq('14h no holiday', w.holidayHours, 0)

console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
