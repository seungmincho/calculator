// 출산 예정일 로직 회귀 체크: node scripts/check-due-date.ts
import assert from 'node:assert/strict'
import {
  dueDate, gestAge, trimester, koreanMonth, progress, lmpOf, checkupDates, CHECKUPS,
  maternityLeave, voucher, shortHours,
} from '../src/utils/dueDate.ts'

// 네겔레: LMP 2026-03-01 → +280일 = 2026-12-06 (월-3, 일+7 = 12/8은 근사, 280일 정확값은 12/6)
assert.equal(dueDate({ method: 'lmp', date: '2026-03-01' }), '2026-12-06')
assert.equal(dueDate({ method: 'lmp', date: '2026-01-01' }), '2026-10-08') // 교과서 예: 1/1 → 10/8
// 주기 보정: 35일 주기 → +7일, 21일 주기 → -7일
assert.equal(dueDate({ method: 'lmp', date: '2026-01-01', cycle: 35 }), '2026-10-15')
assert.equal(dueDate({ method: 'lmp', date: '2026-01-01', cycle: 21 }), '2026-10-01')
// 윤년: 2027-06-01 LMP → 2028-03-07 (2028-02-29 경유)
assert.equal(dueDate({ method: 'lmp', date: '2027-06-01' }), '2028-03-07')
assert.equal(dueDate({ method: 'lmp', date: '2028-05-24' }), '2029-02-28')
// 수정일 = LMP + 14
assert.equal(dueDate({ method: 'conception', date: '2026-01-15' }), dueDate({ method: 'lmp', date: '2026-01-01' }))
// 초음파: 측정일에 8주 3일 → 40주까지 221일
assert.equal(dueDate({ method: 'ultrasound', date: '2026-03-01', usWeeks: 8, usDays: 3 }), '2026-10-08')
// IVF (ACOG): 5일 배아 +261, 3일 배아 +263
assert.equal(dueDate({ method: 'ivf', date: '2026-01-20', embryo: 5 }), '2026-10-08')
assert.equal(dueDate({ method: 'ivf', date: '2026-01-18', embryo: 3 }), '2026-10-08')

// 주수
const edd = '2026-10-08'
assert.deepEqual(gestAge(edd, '2026-01-01'), { totalDays: 0, weeks: 0, days: 0 })
assert.deepEqual(gestAge(edd, '2026-04-11'), { totalDays: 100, weeks: 14, days: 2 })
assert.deepEqual(gestAge(edd, edd), { totalDays: 280, weeks: 40, days: 0 })
assert.equal(gestAge(edd, '2025-12-25').totalDays, -7)
assert.equal(lmpOf(edd), '2026-01-01')

// 분기 경계 (ACOG): 13주6일=1, 14주0일=2, 27주6일=2, 28주0일=3
assert.equal(trimester(13 * 7 + 6), 1)
assert.equal(trimester(14 * 7), 2)
assert.equal(trimester(27 * 7 + 6), 2)
assert.equal(trimester(28 * 7), 3)

// 한국식 개월
assert.equal(koreanMonth(0), 1)
assert.equal(koreanMonth(3), 1)
assert.equal(koreanMonth(4), 2)
assert.equal(koreanMonth(19), 5)
assert.equal(koreanMonth(36), 10)
assert.equal(koreanMonth(41), 10)

assert.equal(progress(140), 50)
assert.equal(progress(-3), 0)
assert.equal(progress(300), 100)

// 검사 구간: NT 11주0일~13주6일
const nt = CHECKUPS.find(c => c.key === 'nt')!
assert.deepEqual(checkupDates(edd, nt, '2026-03-01'), { start: '2026-03-19', end: '2026-04-08', status: 'upcoming' })
assert.equal(checkupDates(edd, nt, '2026-03-19').status, 'now')
assert.equal(checkupDates(edd, nt, '2026-04-08').status, 'now')
assert.equal(checkupDates(edd, nt, '2026-04-09').status, 'past')

// 출산전후휴가: 단태아 예정일 44일 전 시작, 90일 → 출산일 후 45일 남음
const ml = maternityLeave(edd, 1)
assert.equal(ml.earliestStart, '2026-08-25')
assert.equal(ml.endIfOnTime, '2026-11-22')
assert.equal(ml.total - (44 + 1), 45)
const ml2 = maternityLeave(edd, 2)
assert.equal(ml2.earliestStart, '2026-08-10') // 59일 전
assert.equal(ml2.total, 120)

assert.equal(voucher(1), 100)
assert.equal(voucher(2), 200)
assert.equal(voucher(3, true), 320)

assert.deepEqual(shortHours(edd), { week12: '2026-03-26', week32: '2026-08-13' })

console.log('check-due-date: all passed')
