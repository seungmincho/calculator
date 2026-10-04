// 근무시간 계산 회귀 체크: node scripts/check-work-hours.ts
import { calcPay, shiftMinutes, weekOf, legalMinBreak, BREAK_WAIVER_FROM, EI_INCOME_BASIS_FROM } from '../src/utils/workHours.ts'
import { todayKST } from '../src/utils/dday.ts'
let fail = 0
const eq = (name: string, got: number, want: number) => { if (Math.abs(got - want) > 0.01) { fail++; console.log('FAIL', name, got, '!=', want) } }
const W = 10000
const day = (start: string, end: string, breakMin = 60, holiday = false, week = 'w') => ({ week, start, end, breakMin, holiday })
// 주5일 9-18 → 40h, 주휴 8h
let r = calcPay([0, 1, 2, 3, 4].map(() => day('09:00', '18:00')), W, false)
eq('fulltime total', r.totalHours, 40); eq('fulltime ot', r.overtimeHours, 0); eq('fulltime wh', r.weeklyHolidayPay, 80000); eq('fulltime pay', r.totalPay, 480000)
// 자정 넘김 22-07 휴게60 → 8h 근무, 야간 8h(상한=실근로)
const m = shiftMinutes(day('22:00', '07:00')); eq('overnight work', m.work, 480); eq('overnight night', m.night, 480)
// 새벽 04-09 → 야간 2h (기존 버그)
eq('early night', shiftMinutes(day('04:00', '09:00', 0)).night, 120)
// 하루 10h → 연장 2h
r = calcPay([day('09:00', '20:00')], W, false); eq('daily ot', r.overtimeHours, 2); eq('daily ot pay', r.overtimePay, 30000)
// 주6일 8h → 주 48h: 연장 8h, 52h 미만
r = calcPay([0, 1, 2, 3, 4, 5].map(() => day('09:00', '18:00')), W, false); eq('weekly ot', r.overtimeHours, 8); if (r.weeks[0].over52) { fail++; console.log('FAIL over52') }
// 2주 기간 → 주별 계산 (기존: 80h 전체를 40과 비교해 40h 연장 버그)
r = calcPay([...[0, 1, 2, 3, 4].map(() => day('09:00', '18:00', 60, false, 'a')), ...[0, 1, 2, 3, 4].map(() => day('09:00', '18:00', 60, false, 'b'))], W, false)
eq('2wk ot', r.overtimeHours, 0); eq('2wk wh', r.weeklyHolidayPay, 160000)
// 휴일 10h → 8h×1.5 + 2h×2
r = calcPay([day('09:00', '20:00', 60, true)], W, false); eq('holiday pay', r.holidayPay + r.holidayOverPay, 8 * W * 1.5 + 2 * W * 2)
// 5인 미만: 가산 없음
r = calcPay([day('20:00', '08:00', 60)], W, true); eq('small total', r.totalPay, 11 * W)
// 주 12h → 주휴 없음, 주 20h → 4h
eq('no wh', calcPay([0, 1, 2].map(() => day('10:00', '14:30', 30)), W, false).weeklyHolidayPay, 0)
eq('wh 20h', calcPay([0, 1, 2, 3, 4].map(() => day('10:00', '14:30', 30)), W, false).weeklyHolidayPay, 4 * W)
eq('auto break 9h', legalMinBreak(540), 60); eq('auto break 8.4h', legalMinBreak(504), 30)
if (weekOf('2026-10-04') !== '2026-09-28' || weekOf('2026-09-28') !== '2026-09-28') { fail++; console.log('FAIL weekOf') }
// 법 개정 안내 전환: KST 자정 기준 (law.go.kr 법률 제21784호 부칙 제1조 단서 2026-12-10, 제21473호 부칙 제1조 단서 2027-01-01)
const on = (from: string, utc: number) => todayKST(utc) >= from
if (on(BREAK_WAIVER_FROM, Date.UTC(2026, 11, 9, 14, 59)) || !on(BREAK_WAIVER_FROM, Date.UTC(2026, 11, 9, 15, 0))) { fail++; console.log('FAIL break waiver gate') }
if (on(EI_INCOME_BASIS_FROM, Date.UTC(2026, 11, 31, 14, 59)) || !on(EI_INCOME_BASIS_FROM, Date.UTC(2026, 11, 31, 15, 0))) { fail++; console.log('FAIL EI gate') }
if ('' >= BREAK_WAIVER_FROM) { fail++; console.log('FAIL pre-mount gate') } // 마운트 전 today='' → 안내 숨김
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
