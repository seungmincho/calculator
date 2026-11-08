// 카드 수수료 계산기(/card-fee-calculator) 회귀 체크: node scripts/check-card-fee.ts
// page.tsx 본문·FAQ 숫자는 analyze(DEFAULTS…)로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { analyze, classify, fees, vatCredit, RATES, DEFAULTS, type Input } from '../src/utils/cardFee.ts'

// ── 금융위 2026.8.11 보도자료 우대수수료율 (2025.2.14~ 같은 값) ──
assert.deepEqual(RATES.small, { credit: 0.4, check: 0.15 })
assert.deepEqual(RATES.mid1, { credit: 1.0, check: 0.75 })
assert.deepEqual(RATES.mid2, { credit: 1.15, check: 0.9 })
assert.deepEqual(RATES.mid3, { credit: 1.45, check: 1.15 })

// ── 구간 경계: 3억·5억·10억·30억 "이하" ──
assert.deepEqual(
  [0, NaN, 300_000_000, 300_000_001, 500_000_000, 1_000_000_000, 1_000_000_001, 3_000_000_000, 3_000_000_001].map(classify),
  ['small', 'small', 'small', 'mid1', 'mid1', 'mid2', 'mid3', 'mid3', 'general'],
)

// ── 보도자료 환급 예시: 1.4억 × (2.2% − 0.4%) = 252만원 ──
assert.equal(fees(140_000_000, 0, { credit: 2.2, check: 0 }).fee - fees(140_000_000, 0, RATES.small).fee, 2_520_000)

// ── 기본값: 월 2,000만 (신용 1,500만·체크 500만), 영세 ──
const def: Input = { ...DEFAULTS, rates: RATES.small }
{
  const r = analyze(def)
  assert.deepEqual([r.credit, r.check, r.creditFee, r.checkFee, r.monthlyFee, r.annualCard, r.annualFee], [15_000_000, 5_000_000, 60_000, 7_500, 67_500, 240_000_000, 810_000])
  assert.equal(r.effective, 0.3375)
  // 세액공제 2.4억 × 1.3% = 312만 > 수수료 → 실부담 음수
  assert.deepEqual([r.eligible, r.taxCredit, r.net, r.taxCredit2027, r.net2027], [true, 3_120_000, -2_310_000, 2_880_000, -2_070_000])
  assert.deepEqual(r.compare.map((x) => x.fee), [810_000, 2_250_000, 2_610_000, 3_300_000, 4_644_000])
  assert.deepEqual([r.up?.bracket, r.up?.diff], ['mid1', 1_440_000])
  assert.equal(r.refundMonthly, 387_000 - 67_500)
}

// ── 세액공제 한도·자격 ──
{ // 월 7,000만 → 연 8.4억 × 1.3% = 1,092만 → 한도 1,000만. 2027 정부안 1.2% = 1,008만 → 500만
  const r = analyze({ ...def, bracket: 'mid2', rates: RATES.mid2, monthly: 70_000_000 })
  assert.deepEqual([r.taxCredit, r.taxCredit2027], [10_000_000, 5_000_000])
}
assert.equal(analyze({ ...def, corp: true }).taxCredit, 0) // 법인 제외
assert.equal(analyze({ ...def, bracket: 'mid3', rates: RATES.mid3 }).eligible, false) // 10억 초과
assert.equal(vatCredit(-1), 0)

// ── 사용자가 고친 수수료율은 현재 구간에만, 일반가맹점은 다음 구간 없음 ──
{
  const r = analyze({ ...def, bracket: 'general', rates: { credit: 2.3, check: 1.5 } })
  assert.deepEqual([r.monthlyFee, r.up, r.refundMonthly], [345_000 + 75_000, null, 0])
  assert.equal(r.compare[0].fee, 810_000)
}
// 체크 비중 범위 밖·음수 입력
assert.deepEqual(fees(10_000_000, 150, RATES.small), { credit: 0, check: 10_000_000, creditFee: 0, checkFee: 15_000, fee: 15_000 })
assert.deepEqual(fees(-5, 25, RATES.small), { credit: 0, check: 0, creditFee: 0, checkFee: 0, fee: 0 })

console.log('check-card-fee OK')
