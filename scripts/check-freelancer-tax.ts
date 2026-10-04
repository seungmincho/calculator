// 프리랜서 세금 회귀 체크: node scripts/check-freelancer-tax.ts
import assert from 'node:assert/strict'
import {
  progressiveTax, bracketIndex, INDUSTRIES, industryOf, excessRate, simpleExpense, standardIncome,
  eligibleMethod, yellowUmbrellaLimit, childCredit, calc, withholding33, grossFromNet,
  filingDeadline, nextFiling, type Input,
} from '../src/utils/freelancerTax.ts'

// ── 세율표 경계: 누진공제 방식이 구간 경계에서 연속 ──
assert.equal(progressiveTax(0), 0)
assert.equal(progressiveTax(14_000_000), 840_000)
assert.equal(progressiveTax(14_000_001), 840_000)
assert.equal(progressiveTax(50_000_000), 6_240_000)
assert.equal(progressiveTax(88_000_000), 15_360_000)
assert.equal(progressiveTax(150_000_000), 37_060_000)
assert.equal(progressiveTax(300_000_000), 94_060_000)
assert.equal(progressiveTax(500_000_000), 174_060_000)
assert.equal(progressiveTax(1_000_000_000), 384_060_000)
assert.equal(bracketIndex(14_000_000), 0)
assert.equal(bracketIndex(14_000_001), 1)
assert.equal(bracketIndex(2e9), 7)

// ── 경비율: 고시 초과율 = 100-(100-단순)×1.4 와 일치 ──
// (배우 등 저경비율 업종은 고시 초과율이 공식과 달라 표 값을 그대로 씀)
for (const x of INDUSTRIES) if (x.simple >= 50) assert.equal(excessRate(x.simple), x.excess, x.code)
const etc = industryOf('940909')
assert.equal(simpleExpense(12_000_000, etc), 7_692_000)
assert.equal(simpleExpense(50_000_000, etc), 25_640_000 + 4_970_000) // 4천만 초과분 49.7%
const custom = industryOf('custom', 60, 20)
assert.equal(custom.excess, 44)
// 기준경비율 = 수입 - 주요경비 - 수입×기준경비율
assert.deepEqual(standardIncome(50_000_000, 5_000_000, etc, false).income, 50_000_000 - 5_000_000 - 8_700_000)
// 복식부기의무자는 기준경비율 1/2 (시행령 §143③1호 단서): 17.4% → 8.7%
assert.equal(standardIncome(50_000_000, 5_000_000, etc, true).income, 50_000_000 - 5_000_000 - 4_350_000)
// 한도: 단순경비율 소득금액 × 2.8 (퀵서비스 3천만: 618만 × 2.8)
const quick = standardIncome(30_000_000, 0, industryOf('940918'), false)
assert.equal(quick.capped, true)
assert.equal(quick.income, 17_304_000)
assert.equal(standardIncome(30_000_000, 0, industryOf('940918'), true).income, Math.floor(6_180_000 * 3.4))

// ── 적용 대상 ──
assert.equal(eligibleMethod(50_000_000, 35_999_999), 'simple')
assert.equal(eligibleMethod(50_000_000, 36_000_000), 'standard')
assert.equal(eligibleMethod(74_999_999, 0), 'simple')
assert.equal(eligibleMethod(75_000_000, 0), 'standard')
// 시행령 §143④: 직전 3,600만 미만이어도 당해 수입 7,500만 이상이면 단순경비율 대상 아님
assert.equal(eligibleMethod(75_000_000, 30_000_000), 'standard')

// ── 2025 귀속 경비율 고시(국세청고시 제2026-14호) 원문 값 ──
assert.deepEqual(INDUSTRIES.map((x) => [x.code, x.simple, x.excess, x.standard]), [
  ['940909', 64.1, 49.7, 17.4], ['940926', 64.4, 50.2, 20.9], ['940100', 58.7, 42.2, 7.2],
  ['940903', 61.7, 46.4, 15.4], ['940306', 64.1, 49.7, 12.1], ['940500', 70.9, 59.3, 16.2],
  ['940600', 58.4, 41.8, 7.6], ['940918', 79.4, 71.2, 19.8], ['940302', 29.0, 10.6, 5.9],
])

// ── 공제 한도: 노란우산 (조특법 §86의3①, 2025.3.14 개정 4구간) ──
assert.equal(yellowUmbrellaLimit(40_000_000), 6_000_000)
assert.equal(yellowUmbrellaLimit(40_000_001), 5_000_000)
assert.equal(yellowUmbrellaLimit(60_000_000), 5_000_000)
assert.equal(yellowUmbrellaLimit(60_000_001), 4_000_000)
assert.equal(yellowUmbrellaLimit(100_000_000), 4_000_000)
assert.equal(yellowUmbrellaLimit(100_000_001), 2_000_000)
assert.deepEqual([0, 1, 2, 3].map(childCredit), [0, 250_000, 550_000, 950_000])

// ── 원천징수: 소득세·지방소득세 각각 10원 미만 절사 ──
assert.deepEqual(withholding33(1_000_000), { incomeTax: 30_000, localTax: 3_000, total: 33_000 })
assert.deepEqual(withholding33(1_234_567), { incomeTax: 37_030, localTax: 3_700, total: 40_730 })
// 실수령 → 지급액: 실수령 ≥ 목표인 최소 지급액
assert.equal(grossFromNet(967_000), 999_980)
for (let n = 1_000; n < 5_000_000; n += 7_919) {
  const g = grossFromNet(n)
  assert.ok(g - withholding33(g).total >= n, `net ${n}`)
  assert.ok(g - 1 - withholding33(g - 1).total < n, `min ${n}`)
}

// ── 종합 계산: 기본값 (1,200만, 기타자영업, 단순경비율, 1인) ──
const base: Input = {
  revenue: 12_000_000, prev: 12_000_000, industry: etc, method: 'simple',
  major: 0, bookExpense: 0, persons: 1, children: 0, pension: 0, yellow: 0,
}
const r = calc(base)
assert.equal(r.income, 4_308_000)
assert.equal(r.taxable, 2_808_000)
assert.equal(r.computed, 168_480)
assert.equal(r.incomeTax, 98_480)       // 표준세액공제 7만
assert.equal(r.localTax, 9_840)         // 10원 미만 절사
assert.equal(r.withheld.total, 396_000)
assert.equal(r.refund, 396_000 - 108_320)
assert.ok(r.refund > 0)
// 공제가 소득보다 크면 과세표준 0, 세액 0 → 기납부 전액 환급
const zero = calc({ ...base, persons: 3 })
assert.equal(zero.taxable, 0)
assert.equal(zero.refund, zero.withheld.total)
// 고소득 + 기준경비율 → 추가납부(음수), 소규모 아니면 무기장가산세
const hi = calc({ ...base, revenue: 90_000_000, prev: 80_000_000, method: 'standard', major: 0 })
assert.ok(hi.refund < 0)
assert.ok(hi.penalty > 0)
assert.equal(calc({ ...hi, ...base, revenue: 90_000_000, prev: 80_000_000, method: 'book', bookExpense: 20_000_000 }).penalty, 0)
// 노란우산: 한도 초과분 무시
assert.equal(calc({ ...base, revenue: 30_000_000, yellow: 9_000_000 }).yellow, 6_000_000)

// ── 신고 기한: 5/31 주말이면 다음 영업일 ──
const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-')
assert.equal(ymd(filingDeadline(2025)), '2025-6-2')  // 5/31 토 → 6/2 월
assert.equal(ymd(filingDeadline(2026)), '2026-6-1')  // 5/31 일 → 6/1 월
assert.equal(ymd(filingDeadline(2027)), '2027-5-31')
const nf = nextFiling(new Date(2026, 9, 1))
assert.equal(nf.taxYear, 2026)
assert.equal(nf.days, 242)
assert.equal(nextFiling(new Date(2026, 5, 1)).days, 0)
assert.equal(nextFiling(new Date(2026, 5, 2)).taxYear, 2026)

console.log('check-freelancer-tax: all passed')
