// 전기차 보조금 회귀 체크: node scripts/check-ev-subsidy.ts
import assert from 'node:assert/strict'
import {
  priceFactor, rangeCoef, weighted, gradeCoef, estimateNational, conversionNational, multiChildBonus,
  acquisitionTax, calcSubsidy, runningCost, MODELS, REGIONS, regionByCd, localFor, estimateLocal,
} from '../src/utils/evSubsidy.ts'

// ── 가격계수 경계 (지침 별표1: 5,300 미만 100% / 8,500 미만 50% / 이상 0%) ──
assert.equal(priceFactor(5299), 1)
assert.equal(priceFactor(5300), 0.5)
assert.equal(priceFactor(8499), 0.5)
assert.equal(priceFactor(8500), 0)

// ── 주행거리계수: 구간 경계에서 연속 ──
assert.ok(Math.abs(rangeCoef('large', 440) - 1.0) < 1e-9)
assert.ok(Math.abs(rangeCoef('large', 439.999) - 1.0) < 1e-4)
assert.ok(Math.abs(rangeCoef('large', 550) - 1.209) < 1e-9)
assert.equal(rangeCoef('large', 600), 1.21)
assert.equal(rangeCoef('large', 200), 0) // 음수 → 0
assert.equal(rangeCoef('small', 300), 1.17)
assert.ok(Math.abs(rangeCoef('small', 299.9) - 1.16467) < 1e-4)

// ── 가중값 (상온 0.75 + 저온 0.25) ──
const w = weighted(5.0, 400, 320)
assert.equal(w.range, 380)
assert.ok(Math.abs(w.eff - (5.0 * 0.75 + 4.0 * 0.25)) < 1e-9)
assert.equal(gradeCoef(1), 1)
assert.ok(Math.abs(gradeCoef(5) - 0.6) < 1e-9)

// ── 성능 추정: 상한 580 / 가격계수 50% ──
const top = estimateNational({ size: 'large', priceMan: 5000, roomEff: 6, roomRange: 600, coldRange: 550, batteryGrade: 1, envGrade: 1, asGrade: 1, incentive: 280 })
assert.equal(top.perf, 300) // 성능보조금 상한
assert.equal(top.national, 580)
assert.equal(estimateNational({ size: 'large', priceMan: 6000, roomEff: 6, roomRange: 600, coldRange: 550, batteryGrade: 1, envGrade: 1, asGrade: 1, incentive: 280 }).national, 290)
assert.equal(estimateNational({ size: 'small', priceMan: 3000, roomEff: 6, roomRange: 400, coldRange: 350, batteryGrade: 1, envGrade: 1, asGrade: 1, incentive: 280 }).national, 530)

// ── 전환지원금: 국비 비례(0~500), ev.or.kr 공고값과 일치 ──
for (const [nat, conv] of [[274, 55], [469, 94], [217, 43], [457, 91], [458, 92], [285, 57], [483, 97], [564, 100], [500, 100], [300, 60]]) {
  assert.equal(conversionNational(nat), conv, `conv ${nat}`)
}
assert.deepEqual([0, 1, 2, 3, 4, 6].map(multiChildBonus), [0, 0, 100, 200, 300, 300])

// ── 지침 계산 예시: 차상위 + 3자녀, 국비 500 → 500 + 100 + 200 = 800 ──
const buyer0 = { conversion: false, youth: false, lowIncome: false, children: 0 }
const ex = calcSubsidy({ priceMan: 4000, discountMan: 0, national: 500, local: 0, convLocalRatio: 0.3, buyer: { ...buyer0, lowIncome: true, children: 3 }, light: false })
assert.equal(ex.total, 800)
// 청년 예시: 국비 500 → 추가 100
assert.equal(calcSubsidy({ priceMan: 4000, discountMan: 0, national: 500, local: 0, convLocalRatio: 0.3, buyer: { ...buyer0, youth: true }, light: false }).youth, 100)

// ── 서울 아이오닉5: 국비 564 + 지방 169, 전환 100 + 30 ──
const seoul = regionByCd('1100')!
const ioniq5 = MODELS.find((m) => m.id === 'ioniq5-lr')!
assert.equal(localFor(seoul, ioniq5.id), 169)
const r = calcSubsidy({ priceMan: 5000, discountMan: 100, national: ioniq5.national, local: 169, convLocalRatio: seoul.convRatio, buyer: { ...buyer0, conversion: true }, light: false })
assert.equal(r.convNational, 100)
assert.equal(r.convLocal, 30)
assert.equal(r.total, 564 + 169 + 130)
assert.equal(r.netPrice, 5000 - 100 - 863)

// ── 데이터 무결성 ──
assert.equal(new Set(MODELS.map((m) => m.id)).size, MODELS.length)
assert.equal(new Set(REGIONS.map((x) => x.cd)).size, REGIONS.length)
assert.equal(REGIONS.length, 160)
for (const reg of REGIONS) {
  assert.equal(reg.local.length, MODELS.length, reg.name)
  assert.ok(reg.ratio > 0 && reg.ratio < 3, reg.name)
  for (const v of reg.local) assert.ok(v === null || (Number.isInteger(v) && v >= 0 && v <= 1200), reg.name)
}
for (const m of MODELS) assert.ok(m.national > 0 && m.national <= 580, m.id)
// 서울 지방비 = 국비의 30%(내림) — 공고 규칙과 일치
for (const m of MODELS) assert.equal(localFor(seoul, m.id), Math.floor(m.national * 0.3 + 1e-9), m.id)
assert.equal(estimateLocal(seoul, 400), 120)

// ── 취득세: 5,000만원 → 과표 45,454,545 × 7% = 3,181,810(10원 미만 절사), 감면 140만 ──
assert.deepEqual(acquisitionTax(5000, 0, false), { tax: 3_181_810, relief: 1_400_000, pay: 1_781_810 })
assert.equal(acquisitionTax(2500, 0, true).pay, 0) // 경차 4% → 90.9만원 전액 감면
assert.equal(acquisitionTax(0, 0, false).tax, 0)

// ── 유지비 ──
const c = runningCost({ kmPerYear: 15000, years: 5, evEff: 5, chargeWon: 325.6, iceEff: 12, fuelWon: 1700 })
assert.equal(c.ev, 4_884_000)
assert.equal(c.ice, 10_625_000)
assert.equal(c.saving, 5_741_000)

console.log('ev-subsidy: all checks passed')
