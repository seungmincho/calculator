// 아동 수당 회귀 체크: node scripts/check-child-benefit.ts
import assert from 'node:assert/strict'
import { calcBenefits, allowanceUnderAge, timeline, cumulative, DAYCARE } from '../src/utils/childBenefit.ts'

// 아동수당 연령: 2026년 9세 미만 → 2030년 13세 미만
assert.deepEqual([2025, 2026, 2027, 2030, 2035].map(allowanceUnderAge), [9, 9, 10, 13, 13])
assert.equal(calcBenefits(107, false, 2026).childAllowance, 100_000) // 만 8세 11개월
assert.equal(calcBenefits(108, false, 2026).childAllowance, 0)       // 만 9세
assert.equal(calcBenefits(108, false, 2027).childAllowance, 100_000) // 2027년엔 10세 미만

// 부모급여: 0세 100만, 1세 50만 / 어린이집 이용 시 2026 보육료 차액만 현금
assert.equal(calcBenefits(5, false, 2026).parentPay, 1_000_000)
assert.equal(calcBenefits(5, true, 2026).parentPay, 1_000_000 - 584_000)  // 416,000
assert.equal(calcBenefits(15, true, 2026).parentPay, 0)                  // 515,000 > 50만 → 차액 없음
// 2세 이후: 어린이집이면 보육료(2세 426,000·누리 280,000), 가정양육이면 양육수당 10만(86개월 전까지)
assert.equal(calcBenefits(30, true, 2026).daycareSubsidy, DAYCARE.age2)
assert.equal(calcBenefits(40, true, 2026).daycareSubsidy, DAYCARE.nuri)
assert.equal(calcBenefits(85, false, 2026).childcareAllowance, 100_000)
assert.equal(calcBenefits(86, false, 2026).childcareAllowance, 0)

// 타임라인: 2026년생은 2035년(만 9세)에 13세 미만 기준이라 만 12세까지 아동수당
const tl = timeline(2026)
assert.equal(tl[0].total, 1_100_000)
assert.equal(tl[9].childAllowance, 100_000)
assert.equal(tl[12].childAllowance, 100_000)
// 누적(가정양육, 첫째): 첫만남 200만 + 부모급여 1,800만 + 아동수당 156개월 1,560만 + 양육수당 62개월 620만
assert.equal(cumulative(2026, false), 2_000_000 + 18_000_000 + 15_600_000 + 6_200_000)

console.log('check-child-benefit: all passed')
