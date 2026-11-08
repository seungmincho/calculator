// 중도상환수수료 계산기(/prepayment-fee) 회귀 체크: node scripts/check-prepayment-fee.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { prepaymentFee, prepayEffect, refinance, stampTax, presetRate, EXAMPLES, FEE_DAYS } from '../src/utils/prepaymentFee.ts'

// ── 산식: 상환원금 × 요율 × (3년 − 경과일수) ÷ 3년 ──
// 하나은행 보금자리론 상품설명서(2024.10) 예시: 1억 × 0.7% × (1,095 − 182) ÷ 1,095 = 583,650원(10원 미만 표기 생략)
{ const r = prepaymentFee({ amount: 100_000_000, rate: 0.7, start: '2026-01-05', repay: '2026-07-06' })
  assert.equal(r.elapsed, 182); assert.equal(r.base, FEE_DAYS); assert.ok(Math.abs(r.fee - 583_650) < 10, String(r.fee)) }
// 3년 지나면 0 (금소법 §20①4호나목)
{ const r = prepaymentFee({ amount: 100_000_000, rate: 0.56, start: '2023-11-08', repay: '2026-11-08' }); assert.deepEqual([r.status, r.fee], ['free', 0]) }
// 실행 당일 상환 = 요율 그대로
assert.equal(prepaymentFee({ amount: 100_000_000, rate: 0.56, start: '2026-11-08', repay: '2026-11-08' }).fee, 560_000)
// 상환일이 실행일보다 앞이면 계산 안 함
assert.equal(prepaymentFee({ amount: 1, rate: 1, start: '2026-11-08', repay: '2026-11-07' }).status, 'invalid')
// 대출기간이 3년보다 짧으면 대출기간 기준: 1년(365일) 신용대출, 181일 뒤 → 1억 × 0.12% × (365 − 181)/365
{ const r = prepaymentFee({ amount: 100_000_000, rate: 0.12, start: '2026-01-01', repay: '2026-07-01', termDays: 365 })
  assert.deepEqual([r.base, r.left, r.fee, r.freeDate], [365, 184, 60_493, '2027-01-01']) }
// 연 10% 면제 등 면제 금액은 빼고
assert.equal(prepaymentFee({ amount: 100_000_000, rate: 0.56, start: '2026-11-08', repay: '2026-11-08', free: 30_000_000 }).fee, 392_000)
assert.equal(prepaymentFee({ amount: 20_000_000, rate: 0.56, start: '2026-11-08', repay: '2026-11-08', free: 30_000_000 }).status, 'zero')
// 디딤돌 2024.8.12~2026.12.31 상환분 면제
assert.equal(prepaymentFee({ amount: 1e8, rate: 0.6, start: '2026-06-01', repay: '2026-12-31', waivedUntil: '2026-12-31' }).status, 'waived')
assert.equal(prepaymentFee({ amount: 1e8, rate: 0.6, start: '2026-06-01', repay: '2027-01-01', waivedUntil: '2026-12-31' }).fee, 1e8 * 0.006 * (1095 - 214) / 1095 | 0)

// ── 요율 프리셋: 2025.1.13 전 계약은 개편 전 은행 평균 ──
assert.deepEqual([presetRate('mortgageFixed', '2025-01-12'), presetRate('mortgageFixed', '2025-01-13')], [1.43, 0.56])
assert.deepEqual([presetRate('creditVariable', '2024-01-01'), presetRate('bogeumjari', '2024-01-01')], [0.83, 0.5])

// ── 인지세(총액) 구간 ──
assert.deepEqual([50_000_000, 50_000_001, 100_000_000, 100_000_001, 1_000_000_000, 1_000_000_001].map(stampTax), [0, 70_000, 70_000, 150_000, 150_000, 350_000])

// ── EXAMPLES (page.tsx 본문·FAQ) ──
const E = EXAMPLES
assert.deepEqual(prepaymentFee(E.half).fee, 466_922)
{ const r = prepaymentFee(E.year); assert.deepEqual([r.elapsed, r.left, r.fee], [365, 730, 373_333]) }
assert.equal(prepaymentFee(E.old).fee, 953_333)
{
  const R = E.refi
  const cur = { balance: R.balance, rate: R.rate, months: R.months, method: R.method }
  const fee = prepaymentFee({ amount: R.balance, rate: R.feeRate, start: R.start, repay: R.repay }).fee
  assert.equal(fee, 1_120_000)
  // 원리금균등 월 상환액 = 닫힌 식
  const r = R.rate / 1200, n = R.months
  const x = refinance(cur, R.newRate, R.months, fee, stampTax(R.balance) / 2, 24)
  assert.equal(x.payCur, Math.round(R.balance * r * (1 + r) ** n / ((1 + r) ** n - 1)))
  assert.deepEqual([x.saving, x.cost, x.net, x.breakEven, x.payCur, x.payNew, x.waitNet], [29_934_009, 1_195_000, 28_739_009, 10, 1_509_846, 1_423_829, 26_325_106])
  // 같은 금리로 갈아타면 이자 절감 0, 비용만큼 손해, 손익분기 없음
  const same = refinance(cur, R.rate, R.months, fee, 75_000)
  assert.deepEqual([same.saving, same.net, same.breakEven], [0, -1_195_000, null])
  // 일부 상환 1억: 월 상환액 감소 방식
  const e = prepayEffect(cur, 100_000_000)
  assert.deepEqual([e.saved, e.payBefore, e.payAfter], [75_142_139, 1_509_846, 1_006_564])
  assert.equal(prepayEffect(cur, 9e9).amount, R.balance)
}

console.log('check-prepayment-fee OK')
