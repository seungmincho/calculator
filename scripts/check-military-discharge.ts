// 전역일 계산 회귀 체크: node scripts/check-military-discharge.ts
import assert from 'node:assert/strict'
import {
  dischargeDate, promotionDates, summarize, parseBranch, sanitizePeople, rankOn, BRANCHES,
} from '../src/utils/militaryDischarge.ts'

// 전역일 = 입영일 + N개월 해당일의 전날, 해당일 없으면 그 달 말일
assert.equal(dischargeDate('2026-03-10', 18), '2027-09-09')
assert.equal(dischargeDate('2026-03-01', 18), '2027-08-31')
assert.equal(dischargeDate('2026-01-01', 18), '2027-06-30')
assert.equal(dischargeDate('2025-08-31', 18), '2027-02-28') // 2/31 없음 → 말일
assert.equal(dischargeDate('2025-08-29', 18), '2027-02-28') // 2027 평년: 2/29 없음 → 말일
assert.equal(dischargeDate('2025-08-28', 18), '2027-02-27')
assert.equal(dischargeDate('2026-08-29', 18), '2028-02-28') // 2028 윤년: 2/29 있음 → 전날
assert.equal(dischargeDate('2026-08-30', 18), '2028-02-29') // 2/30 없음 → 윤년 말일
assert.equal(dischargeDate('2026-01-31', 18), '2027-07-30')
assert.equal(dischargeDate('2026-03-31', 18), '2027-09-30') // 9/31 없음 → 9/30
assert.equal(dischargeDate('2026-03-31', 21), '2027-12-30')
assert.equal(dischargeDate('2026-12-15', 20), '2028-08-14') // 연 넘김
assert.equal(dischargeDate('2026-01-01', 36), '2028-12-31')

// 복무기간 표
const months = Object.fromEntries(BRANCHES.map(b => [b.key, b.months]))
assert.deepEqual(months, { army: 18, marines: 18, navy: 20, airForce: 21, katusa: 18, reserveDuty: 18, socialService: 21, industrialActive: 34, industrialReserve: 23, researchAgent: 36 })

// 진급: 매월 1일, 입영월 산입 (+2 / +8 / +14개월)
assert.deepEqual(promotionDates('2026-01-20', '2027-07-19'), [
  { rank: 'pvt', date: '2026-01-20' }, { rank: 'pfc', date: '2026-03-01' },
  { rank: 'cpl', date: '2026-09-01' }, { rank: 'sgt', date: '2027-03-01' },
])
assert.deepEqual(promotionDates('2025-11-30', '2027-05-29').map(p => p.date), ['2025-11-30', '2026-01-01', '2026-07-01', '2027-01-01'])
assert.equal(promotionDates('2026-01-20', '2026-12-31').length, 3) // 전역 이후 진급 제외
const promos = promotionDates('2026-01-20', '2027-07-19')
assert.equal(rankOn(promos, '2026-02-28'), 'pvt')
assert.equal(rankOn(promos, '2026-03-01'), 'pfc')
assert.equal(rankOn(promos, '2027-03-01'), 'sgt')
assert.equal(rankOn(promos, '2026-01-19'), null)

// 요약: 입대일 = 1일째, 전역일 당일 100%
let s = summarize('2026-01-01', 'army', '2026-01-01')!
assert.equal(s.discharge, '2027-06-30')
assert.equal(s.totalDays, 546)
assert.equal(s.servedDays, 1)
assert.equal(s.daysLeft, 545)
assert.equal(s.status, 'serving')
assert.equal(s.rank, 'pvt')
assert.equal(s.nextPromo?.date, '2026-03-01')
s = summarize('2026-01-01', 'army', '2027-06-29')!
assert.equal(s.pct, 99.8) // 내림: 전역 전날엔 100 아님
s = summarize('2026-01-01', 'army', '2027-06-30')!
assert.equal(s.pct, 100)
assert.equal(s.daysLeft, 0)
assert.equal(s.status, 'serving')
s = summarize('2026-01-01', 'army', '2027-07-05')!
assert.equal(s.status, 'done')
assert.equal(s.daysLeft, -5)
assert.equal(s.servedDays, 546)
assert.equal(s.rank, 'sgt')
assert.equal(s.nextPromo, null)
s = summarize('2026-11-02', 'airForce', '2026-10-01')!
assert.equal(s.status, 'before')
assert.equal(s.servedDays, 0)
assert.equal(s.pct, 0)
assert.equal(s.rank, null)
// 윤년 포함 복무일수: 2027-03-01 ~ 2028-08-31 (2028-02-29 포함)
assert.equal(summarize('2027-03-01', 'army', '2027-03-01')!.totalDays, 550)

// 마일스톤
s = summarize('2026-01-01', 'army', '2026-05-01')!
const ms = Object.fromEntries(s.milestones.map(m => [m.key, m.date]))
assert.equal(ms.day100, '2026-04-10') // 1/1이 1일째 → 100일째 4/10
assert.equal(ms.half, '2026-09-30') // 273일째 = 546의 절반
assert.equal(ms.left100, '2027-03-22')
assert.equal(ms.left30, '2027-05-31')
assert.equal(ms.sgt, '2027-03-01')
assert.ok(s.milestones.every((m, i, a) => i === 0 || a[i - 1].date <= m.date), '날짜순')
const half = summarize('2026-01-01', 'army', ms.half)!
assert.ok(half.pct >= 50 && summarize('2026-01-01', 'army', '2026-09-29')!.pct < 50, '50% 도달일')
// 사회복무요원: 계급 없음
s = summarize('2026-01-01', 'socialService', '2026-05-01')!
assert.equal(s.rank, null)
assert.ok(!s.milestones.some(m => m.key === 'pfc'))
assert.equal(s.discharge, '2027-09-30')

// 입력 검증
assert.equal(summarize('2026-02-30', 'army', '2026-05-01'), null)
assert.equal(parseBranch('navy'), 'navy')
assert.equal(parseBranch('conscriptedPolice'), 'army')
assert.equal(parseBranch('industrialTechnician'), 'industrialReserve')
assert.equal(parseBranch('xx'), null)
assert.deepEqual(sanitizePeople([{ id: 'a', name: '남자친구', branch: 'army', date: '2026-01-01' }, { id: 'b', branch: 'zz', date: '2026-01-01' }, null, 'x']),
  [{ id: 'a', name: '남자친구', branch: 'army', date: '2026-01-01' }])
assert.deepEqual(sanitizePeople('nope'), [])

console.log('military-discharge: all checks passed')
