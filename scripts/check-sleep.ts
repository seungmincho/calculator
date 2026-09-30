// 수면 계산 회귀 체크: node scripts/check-sleep.ts
import assert from 'node:assert/strict'
import { parseHM, fmtHM, fmt12, bedtimes, wakeTimes, naps, isPast, cycleList, sleepDebt, caffeineCutoff } from '../src/utils/sleep.ts'

assert.equal(parseHM('07:00'), 420)
assert.equal(parseHM('7:05'), 425)
assert.equal(parseHM('24:00'), null)
assert.equal(parseHM('now'), null)
assert.equal(fmtHM(-15), '23:45')
assert.equal(fmtHM(1440 + 75), '01:15')
assert.deepEqual(fmt12(0), { pm: false, hm: '12:00' })
assert.deepEqual(fmt12(22 * 60 + 45), { pm: true, hm: '10:45' })
assert.deepEqual(fmt12(12 * 60), { pm: true, hm: '12:00' })

// 성인 90분: 6~3주기
assert.deepEqual(cycleList('adult', 90), [6, 5, 4, 3])
assert.deepEqual(cycleList('school', 90), [7, 6, 5, 4, 3]) // 11h → 7주기(10.5h)까지
assert.deepEqual(cycleList('adult', 80), [6, 5, 4, 3])

// 07:00 기상, 15분 입면 → 6주기 21:45, 5주기 23:15, 4주기 00:45 (자정 넘김)
const b = bedtimes(420, 90, 15, 'adult')
assert.deepEqual(b.map((o) => fmtHM(o.time)), ['21:45', '23:15', '00:45', '02:15'])
assert.deepEqual(b.map((o) => o.day), [-1, -1, 0, 0])
assert.deepEqual(b.map((o) => o.inRange), [true, true, false, false]) // 9h, 7.5h 권장
assert.deepEqual(b.map((o) => o.short), [false, false, true, true])
// 노인 7~8h: 9h(6주기)는 범위 밖(초과)이지만 부족 아님
const s = bedtimes(420, 90, 15, 'senior')
assert.equal(s[0].inRange, false); assert.equal(s[0].short, false); assert.equal(s[1].inRange, true)

// 23:00 취침 → 5주기 기상 06:45 다음날
const w = wakeTimes(23 * 60, 90, 15, 'adult')
assert.equal(fmtHM(w[1].time), '06:45'); assert.equal(w[1].day, 1)
assert.equal(fmtHM(w[3].time), '03:45')
// 01:00 취침 → 같은 날
assert.equal(wakeTimes(60, 90, 15, 'adult')[0].day, 0)

// 낮잠 14:00, 입면 5분
const n = naps(14 * 60, 90, 5)
assert.deepEqual(n.map((x) => fmtHM(x.time)), ['14:15', '14:25', '15:35'])
assert.equal(n[2].full, true)

// 지금 22:00, 기상 07:00 → 21:45(6주기)는 지남, 23:15는 아님
assert.equal(isPast(22 * 60, 420, b[0], 15), true)
assert.equal(isPast(22 * 60, 420, b[1], 15), false)
// 지금 06:00 → 다음 기상은 1시간 뒤, 모두 지남
assert.ok(b.every((o) => isPast(360, 420, o, 15)))
// 지금 08:00 → 다음 기상은 내일 07:00, 아직 안 지남
assert.ok(b.every((o) => !isPast(480, 420, o, 15)))

// 수면 부채: 목표 8h, 과수면 상계 안 함, 빈 날 제외
const d = sleepDebt([6, 7, 9, null, 8, 5.5, null], 8)
assert.equal(d.days, 5); assert.equal(d.deficit, 2 + 1 + 0 + 0 + 2.5); assert.equal(d.avg, 7.1)
assert.deepEqual(sleepDebt([], 8), { days: 0, deficit: 0, avg: 0 })

assert.equal(fmtHM(caffeineCutoff(23 * 60)), '17:00')
assert.equal(fmtHM(caffeineCutoff(60)), '19:00')

console.log('check-sleep: all passed')
