// 근로계약서 작성기 계산 회귀 체크: node scripts/check-employment-contract.ts
import { week, slotInfo, minWageCheck, monthlyEstimate, minorLimit, ageAt, type Slot } from '../src/utils/employmentContract.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const s = (start: string, end: string, bStart = '', bEnd = ''): Slot => ({ start, end, bStart, bEnd })
const all = (x: Slot) => Array(7).fill(x)
const wk = (n: number) => Array.from({ length: 7 }, (_, i) => i < n)

// 정규직 09~18, 휴게 12~13, 주 5일 → 주 40h, 주휴 8h, 월 209h
const full = week(all(s('09:00', '18:00', '12:00', '13:00')), wk(5))
eq([full.weekly, full.contract, full.overtime, full.holidayHours, full.monthlyHours], [40, 40, 0, 8, 209], '주 40시간')
eq(full.breakShortDays, [], '휴게 1시간 충족')
eq(minWageCheck('monthly', 2_156_880, 0, full).ok, true, '월 2,156,880원 = 최저임금')
eq(minWageCheck('monthly', 2_100_000, 0, full).ok, false, '월 210만원 미달')
eq(minWageCheck('monthly', 2_100_000, 0, full).shortfall, 56_880, '미달액')
eq(minWageCheck('monthly', 2_100_000, 100_000, full).okWithAllowance, true, '정기 수당 포함 시 충족')
eq(minWageCheck('hourly', 10_000, 0, full).ok, false, '시급 1만원 미달')

// 휴게 부족: 09~18 휴게 30분 → 실근로 8.5h, 1시간 필요
eq(slotInfo(s('09:00', '18:00', '12:00', '12:30')).breakShort, true, '8시간 넘는데 휴게 30분')
eq(slotInfo(s('13:00', '17:30', '15:00', '15:30')).breakShort, false, '4시간 근로 휴게 30분')
eq(slotInfo(s('13:00', '17:30')).breakShort, true, '4.5시간 휴게 없음')
eq(slotInfo(s('22:00', '06:00', '02:00', '03:00')).work, 420, '자정 넘김 + 휴게')

// 단시간 월~금 4h → 주 20h, 주휴 4h, 월 104h, 시급 11,000 → 주휴수당 44,000
const part = week(all(s('13:00', '17:30', '15:00', '15:30')), wk(5))
eq([part.weekly, part.holidayHours, part.monthlyHours], [20, 4, 104], '단시간 주 20h')
eq(monthlyEstimate('hourly', 11_000, part, false), { base: 1_144_000, overtime: 0, total: 1_144_000, weeklyHolidayPay: 44_000 }, '단시간 월 예상')

// 주 15시간 미만: 주휴 0
const tiny = week(all(s('10:00', '16:30', '12:00', '12:30')), [false, false, false, false, false, true, true])
eq([tiny.weekly, tiny.holidayHours], [12, 0], '주 12h 주휴 없음')

// 연장근로: 09~20 휴게 1h × 5일 = 50h → 소정 40, 연장 10
const ot = week(all(s('09:00', '20:00', '12:00', '13:00')), wk(5))
eq([ot.weekly, ot.contract, ot.overtime], [50, 40, 10], '연장 10h')
eq(monthlyEstimate('hourly', 10_320, ot, false).overtime, Math.round(10_320 * 1.5 * 10 * 365 / 7 / 12), '연장수당 1.5배')

// 연소근로자 한도
eq(minorLimit(week(all(s('09:00', '16:30', '12:00', '12:30')), wk(5))), 'ok', '7h × 5 = 35h')
eq(minorLimit(full), 'consent', '8h × 5 = 40h 합의 필요')
eq(minorLimit(ot), 'over', '50h 초과')
eq(week(all(s('18:00', '23:00', '20:00', '20:30')), wk(1)).night, true, '22시 이후 야간')

// 만 나이
eq(ageAt('080315', '3', '2026-03-14'), 17, '생일 전날 17세')
eq(ageAt('080315', '3', '2026-03-15'), 18, '생일 당일 18세')
eq(ageAt('900101', '', '2026-10-01'), 36, '뒷자리 없음 1900년대 추정')
eq(ageAt('100101', '', '2026-10-01'), 16, '뒷자리 없음 2000년대 추정')
eq(ageAt('12', '', '2026-10-01'), null, '잘못된 입력')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('employment-contract: all passed')
