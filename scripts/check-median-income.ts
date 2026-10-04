// 기준 중위소득 회귀 체크: node scripts/check-median-income.ts
import assert from 'node:assert/strict'
import { MEDIAN_INCOME, MEDIAN_YEARS, yearInForce } from '../src/utils/medianIncome.ts'

// 보건복지부 2026.7.28 보도자료·고시 제2026-157호: 2027년 4인 6,929,885원(6.70%↑), 1인 2,736,042원
assert.deepEqual(MEDIAN_INCOME['2027'], [2736042, 4480645, 5718091, 6929885, 8063019, 9129201])
assert.deepEqual(MEDIAN_INCOME['2026'], [2564238, 4199292, 5359036, 6494738, 7556719, 8555952])
assert.equal(+((MEDIAN_INCOME['2027'][3] / MEDIAN_INCOME['2026'][3] - 1) * 100).toFixed(2), 6.70)
assert.equal(+((MEDIAN_INCOME['2026'][3] / MEDIAN_INCOME['2025'][3] - 1) * 100).toFixed(2), 6.51)
// 2027 생계급여 선정기준 32%: 1인 875,533원, 4인 2,217,563원 (보도자료, 원 미만 절사)
assert.equal(Math.floor(MEDIAN_INCOME['2027'][0] * 0.32), 875533)
assert.equal(Math.floor(MEDIAN_INCOME['2027'][3] * 0.32), 2217563)
for (const y of MEDIAN_YEARS) assert.equal(MEDIAN_INCOME[y].length, 6, y)

// 1월 1일 시행: 2027 고시는 2026년 중에는 적용되지 않음
assert.equal(yearInForce(new Date('2026-10-04T00:00:00+09:00')), '2026')
assert.equal(yearInForce(new Date('2027-01-01T12:00:00+09:00')), '2027')
assert.equal(yearInForce(new Date('2030-06-01')), '2027') // 데이터 없으면 최신 연도
assert.equal(yearInForce(new Date('2020-06-01')), '2023')

console.log('check-median-income: all passed')
