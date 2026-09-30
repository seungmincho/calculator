// 영업 커미션 회귀 체크: node scripts/check-sales-commission.ts
import assert from 'node:assert/strict'
import {
  tieredCommission, rawCommission, withholding33, calc, supplyValue, nextBoundary, niceStep,
  encodePlan, decodePlan, DEFAULT_TIERS, PLAN_A, PLAN_B, type Plan,
} from '../src/utils/salesCommission.ts'

const T = DEFAULT_TIERS // 0~1천만 3%, 1천만~3천만 5%, 3천만 이상 7%

// 누진(초과분) vs 전체 적용 — 가이드 예시: 매출 2,500만
assert.equal(tieredCommission(25_000_000, T, 'marginal'), 300_000 + 750_000) // 105만
assert.equal(tieredCommission(25_000_000, T, 'whole'), 1_250_000)            // 125만
// 경계: "이상" → 정확히 1천만부터 높은 요율(전체 적용), 누진은 연속
assert.equal(tieredCommission(9_999_999, T, 'whole'), 299_999)
assert.equal(tieredCommission(10_000_000, T, 'whole'), 500_000)
assert.equal(tieredCommission(10_000_000, T, 'marginal'), 300_000)
assert.equal(tieredCommission(10_000_001, T, 'marginal'), 300_000)           // 0.05원 → 절사
assert.equal(tieredCommission(30_000_000, T, 'marginal'), 300_000 + 1_000_000)
assert.equal(tieredCommission(40_000_000, T, 'marginal'), 1_300_000 + 700_000)
// 전체 적용 절벽: 2,999.9만 vs 3,000만
assert.equal(tieredCommission(29_999_999, T, 'whole'), 1_499_999)
assert.equal(tieredCommission(30_000_000, T, 'whole'), 2_100_000)
assert.equal(tieredCommission(0, T, 'marginal'), 0)
// 정렬 안 된/0 없는 구간도 안전
assert.equal(tieredCommission(20_000_000, [{ from: 10_000_000, rate: 10 }], 'marginal'), 1_000_000)
assert.equal(tieredCommission(5_000_000, [{ from: 10_000_000, rate: 10 }], 'whole'), 0)

// 목표 달성 + 가속(초과분 1.5배)
const g: Plan = { ...PLAN_A, structure: 'target', target: 20_000_000, targetRate: 4, accel: 1.5, threshold: 0 }
assert.equal(rawCommission(g, 20_000_000), 800_000)
assert.equal(rawCommission(g, 30_000_000), 800_000 + 600_000)               // 1천만 × 6%
assert.equal(rawCommission(g, 10_000_000), 400_000)
// 문턱 80%: 1,599만 → 0, 1,600만 → 지급
const g80 = { ...g, threshold: 80 }
assert.equal(rawCommission(g80, 15_999_999), 0)
assert.equal(rawCommission(g80, 16_000_000), 640_000)
assert.equal(nextBoundary(g80, 10_000_000), 16_000_000)
assert.equal(nextBoundary(g80, 16_000_000), 20_000_000)
assert.equal(nextBoundary(g80, 20_000_000), null)

// 정률 · 건당
assert.equal(rawCommission({ ...PLAN_A, structure: 'flat', rate: 3.3 }, 1_000_000), 33_000)
const d: Plan = { ...PLAN_A, structure: 'perDeal', perDeal: 300_000, avgDeal: 2_000_000 }
assert.equal(rawCommission(d, 9_999_999), 4 * 300_000)
assert.equal(nextBoundary(d, 9_999_999), 10_000_000)

// 3.3%: 소득세 3% 10원 미만 절사, 지방소득세 = 소득세 10% 10원 미만 절사
assert.deepEqual(withholding33(1_000_000), { incomeTax: 30_000, localTax: 3_000, total: 33_000 })
assert.deepEqual(withholding33(1_234_567), { incomeTax: 37_030, localTax: 3_700, total: 40_730 }) // 37,037 → 37,030
assert.deepEqual(withholding33(10_000), { incomeTax: 300, localTax: 30, total: 330 })           // 소액부징수 미적용(계속·반복)
assert.deepEqual(withholding33(333), { incomeTax: 0, localTax: 0, total: 0 })

// VAT 포함 → 공급가액
assert.equal(supplyValue(11_000_000, true), 10_000_000)
assert.equal(supplyValue(11_000_000, false), 11_000_000)

// 전체 흐름: 기본 A안(누진, 2,500만, 3.3%) + 팀 분배 50% + 기본급
const r = calc(PLAN_A, 25_000_000, false, 'freelance')
assert.equal(r.commission, 1_050_000)
assert.equal(r.tax.total, 34_650)
assert.equal(r.net, 1_015_350)
const r2 = calc({ ...PLAN_A, split: 50, base: 1_000_000 }, 27_500_000, true, 'employee')
assert.equal(r2.sales, 25_000_000)
assert.equal(r2.commission, 525_000)
assert.equal(r2.gross, 1_525_000)
assert.equal(r2.net, 1_525_000) // 근로소득은 여기서 세금 계산 안 함(안내만)
assert.equal(calc(PLAN_B, 25_000_000, false, 'none').gross, 2_500_000)

// 경계 안내 · 증분
assert.equal(nextBoundary(PLAN_A, 25_000_000), 30_000_000)
assert.equal(nextBoundary(PLAN_A, 30_000_000), null)
assert.equal(niceStep(2_500_000), 2_000_000)
assert.equal(niceStep(4_000_000), 5_000_000)
assert.equal(niceStep(1_000_000), 1_000_000)

// URL 왕복 · 잘못된 값 거부
for (const p of [PLAN_A, PLAN_B, g80, d, { ...PLAN_A, tierMode: 'whole' as const, rate: 2.5 }]) {
  assert.deepEqual(decodePlan(encodePlan(p)), p)
}
assert.equal(decodePlan(null), null)
assert.equal(decodePlan('x~m~1'), null)
assert.equal(decodePlan(encodePlan(PLAN_A).replace(/^t/, 'z')), null)
assert.equal(decodePlan(encodePlan({ ...PLAN_A, rate: -1 })), null)

console.log('check-sales-commission: all passed')
