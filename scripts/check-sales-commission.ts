// 영업 커미션 회귀 체크: node scripts/check-sales-commission.ts
import assert from 'node:assert/strict'
import {
  tieredCommission, rawCommission, withholding33, calc, supplyValue, nextBoundary, niceStep,
  encodePlan, decodePlan, DEFAULT_TIERS, PLAN_A, PLAN_B, type Plan,
} from '../src/utils/salesCommission.ts'
import {
  marketFees, NAVER_ORDER_MGMT, NAVER_SALES, COUPANG_SALES, ELEVENST_DEFAULT, CATEGORY_KEYS, type MarketInput,
} from '../src/utils/marketplaceFees.ts'

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

// ── 오픈마켓 건당 수수료 (요율 확인일 2026-10-05, 출처는 src/utils/marketplaceFees.ts) ──
const mk: MarketInput = { price: 30_000, shipping: 3_000, category: 'fashion', tier: 'micro', inflow: 'normal', elevenstRate: ELEVENST_DEFAULT }
// 요율 고정: 스마트스토어 주문관리(2025.10.1 인하 후)·판매수수료, 쿠팡 대분류 기본, 11번가 대표값
assert.deepEqual(NAVER_ORDER_MGMT, { micro: 1.77, small1: 2.33, small2: 2.48, small3: 2.73, general: 3.3 })
assert.deepEqual(NAVER_SALES, { normal: 2.73, marketing: 0.91 })
assert.deepEqual(COUPANG_SALES, { fashion: 10.5, fashionAcc: 10.5, beauty: 9.6, food: 10.6, living: 7.8, electronics: 7.8, sports: 10.8, books: 10.8, baby: 10, furniture: 10.8 })
assert.equal(ELEVENST_DEFAULT, 13)

// 스마트스토어: 주문관리 1.77% × (판매가+배송비) + 판매 2.73% × 판매가, 부가세 10% 별도
const ss = marketFees('smartstore', mk)
assert.deepEqual(ss.lines.map((l) => [l.key, l.base, l.amount]), [['orderMgmt', 33_000, 584], ['sales', 30_000, 819]])
assert.equal(ss.vat, 140)
assert.equal(ss.total, 1_543)
assert.equal(ss.settlement, 31_457)
// 카테고리 무관
for (const c of CATEGORY_KEYS) assert.equal(marketFees('smartstore', { ...mk, category: c }).total, 1_543)
// 마케팅 링크 0.91%, 일반 등급 3.30%
assert.equal(marketFees('smartstore', { ...mk, inflow: 'marketing' }).total, Math.round((584 + 273) * 1.1)) // 943
assert.equal(marketFees('smartstore', { ...mk, tier: 'general' }).total, 1_089 + 819 + Math.round((1_089 + 819) * 0.1))
// 배송비에도 주문관리 수수료(판매수수료는 아님)
assert.equal(marketFees('smartstore', { ...mk, shipping: 0 }).lines[0].amount, 531)

// 쿠팡: 판매가 × 카테고리 기본 수수료 + 배송비 × 3%, 부가세 별도
const cp = marketFees('coupang', mk)
assert.deepEqual(cp.lines.map((l) => [l.key, l.amount]), [['sales', 3_150], ['shipping', 90]])
assert.equal(cp.total, 3_564)
assert.equal(cp.settlement, 29_436)
assert.equal(marketFees('coupang', { ...mk, category: 'electronics' }).total, Math.round((2_340 + 90) * 1.1)) // 2,673

// 11번가: 입력 요율 × 판매가 + 배송비 × 3.3% (둘 다 부가세 포함으로 보고 그대로)
const es = marketFees('elevenst', mk)
assert.equal(es.vat, 0)
assert.equal(es.total, 3_900 + 99)
assert.equal(marketFees('elevenst', { ...mk, elevenstRate: 7 }).total, 2_100 + 99)

// 비교: 같은 입력이면 기본값에서 스마트스토어가 가장 낮음, 실효율
assert.equal([ss, cp, es].reduce((a, b) => (b.total < a.total ? b : a)).platform, 'smartstore')
assert.equal(ss.effRate.toFixed(2), '4.68')
assert.equal(marketFees('coupang', { ...mk, price: 0, shipping: 0 }).effRate, 0)

console.log('check-sales-commission: all passed')
