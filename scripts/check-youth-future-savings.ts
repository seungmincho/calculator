// 청년미래적금 회귀 체크: node scripts/check-youth-future-savings.ts
import assert from 'node:assert/strict'
import {
  calcYouthFutureSavings as calc, eligibility, CONTRIBUTION_RATE, MONTHLY_MAX, TERM_MONTHS, BASE_RATE, DEFAULT_BONUS, ROUNDS, isTier,
} from '../src/utils/youthFutureSavings.ts'

const man = (n: number) => Math.round(n / 10_000) // 만원 반올림

// 기본값: 월 50만원 · 기본 5% + 우대 2%p · 일반형
let r = calc({ monthly: 500_000, baseRate: BASE_RATE, bonusRate: DEFAULT_BONUS, tier: 'general' })
assert.equal(r.months, 36)
assert.equal(r.principal, 18_000_000)
assert.equal(r.interest, 1_942_500) // 500,000 × 7%/12 × 666
assert.equal(r.monthlyContribution, 30_000)
assert.equal(r.contribution, 1_080_000) // 금융위 예시 108만원
assert.equal(r.contributionInterest, 83_250) // 30,000 × 기본 5%/12 × 666
assert.equal(r.maturity, 21_105_750)
assert.equal(r.taxSaved, Math.floor((1_942_500 + 83_250) * 0.154))
assert.equal(r.regular.maturity, 18_000_000 + 1_942_500 - Math.floor(1_942_500 * 0.154))
assert.equal(r.gainVsRegular, r.maturity - r.regular.maturity)

// 금융위 2026-06-22 예시(원금 1,800만원): 만기 수령액·'단리 적금 가입 효과' 금리와 1만원·0.1%p 단위로 일치
const fsc = [
  { tier: 'general', bonus: 2, maturity: 2110, eq: 13.2 },
  { tier: 'preferred', bonus: 2, maturity: 2227, eq: 18.2 },
  { tier: 'general', bonus: 3, maturity: 2138, eq: 14.4 },
  { tier: 'preferred', bonus: 3, maturity: 2255, eq: 19.4 },
] as const
for (const x of fsc) {
  const y = calc({ monthly: 500_000, baseRate: 5, bonusRate: x.bonus, tier: x.tier })
  assert.ok(Math.abs(man(y.maturity) - x.maturity) <= 1, `${x.tier} ${5 + x.bonus}% maturity ${y.maturity}`)
  assert.equal(Math.round(y.equivalentRate * 10) / 10, x.eq, `${x.tier} ${5 + x.bonus}% eq ${y.equivalentRate}`)
}

// 유형별 기여금: 우대형 12% = 월 6만원 · 216만원, 비과세만 = 0
r = calc({ monthly: 500_000, baseRate: 5, bonusRate: 2, tier: 'preferred' })
assert.equal(r.monthlyContribution, 60_000)
assert.equal(r.contribution, 2_160_000)
assert.equal(r.contributionInterest, 166_500)
r = calc({ monthly: 500_000, baseRate: 5, bonusRate: 2, tier: 'taxOnly' })
assert.equal(r.contribution, 0)
assert.equal(r.contributionInterest, 0)
assert.equal(r.maturity, 18_000_000 + 1_942_500) // 비과세만
assert.equal(r.gainVsRegular, Math.floor(1_942_500 * 0.154)) // 아낀 세금만큼
assert.deepEqual(CONTRIBUTION_RATE, { general: 0.06, preferred: 0.12, taxOnly: 0 })
// 2027 예산안 15%(참고): 월 7.5만원
assert.equal(calc({ monthly: 500_000, baseRate: 5, bonusRate: 2, tier: 'preferred' }, 0.15).monthlyContribution, 75_000)

// 한도 경계: 월 50만원 초과분은 계산에 넣지 않음, 우대금리 3%p 상한
assert.equal(calc({ monthly: MONTHLY_MAX, baseRate: 5, bonusRate: 2, tier: 'general' }).principal, 18_000_000)
assert.equal(calc({ monthly: MONTHLY_MAX + 1, baseRate: 5, bonusRate: 2, tier: 'general' }).maturity, 21_105_750)
assert.equal(calc({ monthly: 1_000_000, baseRate: 5, bonusRate: 2, tier: 'preferred' }).contribution, 2_160_000)
assert.equal(calc({ monthly: 500_000, baseRate: 5, bonusRate: 9, tier: 'general' }).rate, 8)
assert.equal(calc({ monthly: 499_999, baseRate: 5, bonusRate: 2, tier: 'general' }).monthlyContribution, 29_999) // 원 미만 절사
// 소액: 월 10만원 7% → 이자 388,500(은행 일수 계산 예시 389,238원과 0.2% 안)
assert.equal(calc({ monthly: 100_000, baseRate: 5, bonusRate: 2, tier: 'general' }).interest, 388_500)

// 0·잘못된 입력
r = calc({ monthly: 0, baseRate: 5, bonusRate: 2, tier: 'general' })
assert.equal(r.maturity, 0); assert.equal(r.equivalentRate, 0); assert.equal(r.taxSaved, 0)
r = calc({ monthly: 500_000, baseRate: 0, bonusRate: 0, tier: 'general' })
assert.equal(r.interest, 0); assert.equal(r.contributionInterest, 0); assert.equal(r.maturity, 18_000_000 + 1_080_000)
assert.ok(r.equivalentRate > 0) // 금리 0%여도 기여금만큼 환산 금리가 있다
r = calc({ monthly: NaN, baseRate: NaN, bonusRate: -1, tier: 'general' })
assert.equal(r.maturity, 0)
assert.equal(calc({ monthly: -5, baseRate: 5, bonusRate: 2, tier: 'general' }).principal, 0)
assert.equal(TERM_MONTHS, 36)
assert.ok(isTier('preferred') && !isTier('x') && !isTier(null))

// 자격(나이·개인소득)
assert.deepEqual(eligibility(28, 0, 'employee', 35_000_000), { ageOk: true, countedAge: 28, tier: 'general' })
assert.equal(eligibility(34, 0, 'employee', 1).ageOk, true)
assert.equal(eligibility(35, 0, 'employee', 1).ageOk, false)
assert.equal(eligibility(35, 24, 'employee', 1).ageOk, true) // 병역 2년 → 33세
assert.equal(eligibility(35, 24, 'employee', 1).countedAge, 33)
assert.equal(eligibility(35, 18, 'employee', 1).countedAge, 33) // 33.5 → 만 33세
assert.equal(eligibility(35, 1, 'employee', 1).ageOk, true) // 34.9 → 만 34세
assert.equal(eligibility(41, 120, 'employee', 1).ageOk, false) // 병역 차감 최대 6년 → 35세
assert.equal(eligibility(40, 72, 'employee', 1).ageOk, true)
assert.equal(eligibility(30, NaN, 'employee', 1).countedAge, 30)
assert.equal(eligibility(18, 0, 'employee', 1).ageOk, false)
assert.equal(eligibility(19, 0, 'employee', 1).ageOk, true)
assert.equal(eligibility(30, 0, 'employee', 60_000_000).tier, 'general')
assert.equal(eligibility(30, 0, 'employee', 60_000_001).tier, 'taxOnly')
assert.equal(eligibility(30, 0, 'employee', 75_000_000).tier, 'taxOnly')
assert.equal(eligibility(30, 0, 'employee', 75_000_001).tier, null)
assert.equal(eligibility(30, 0, 'smeEmployee', 36_000_000).tier, 'preferred')
assert.equal(eligibility(30, 0, 'smeEmployee', 36_000_001).tier, 'general')
assert.equal(eligibility(30, 0, 'smeNewHire', 60_000_000).tier, 'preferred')
assert.equal(eligibility(30, 0, 'smeNewHire', 60_000_001).tier, 'taxOnly')
assert.equal(eligibility(30, 0, 'smallBiz', 100_000_000).tier, 'preferred')
assert.equal(eligibility(30, 0, 'smallBiz', 300_000_000).tier, 'general')
assert.equal(eligibility(30, 0, 'smallBiz', 300_000_001).tier, null)
assert.equal(eligibility(30, 0, 'employee', 0).tier, 'general') // 비과세 소득만 있어도 일반형 가능(육아휴직급여·병 급여)

// 일정: 시작 ≤ 끝, 차수 순서
for (const x of ROUNDS) for (const [a, b] of [x.apply, x.review, x.open]) assert.ok(a <= b, `${x.round} ${a} ${b}`)
assert.ok(ROUNDS[0].open[1] < ROUNDS[1].apply[0])

console.log('check-youth-future-savings OK')
