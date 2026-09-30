// 투자 계산 회귀 체크: node scripts/check-investment.ts
import assert from 'node:assert/strict'
import {
  monthlyRate, contributions, fvOf, futureValue, yearly, realValue, requiredMonthly, requiredRate, requiredMonths,
  fourPercentMonthly, payoutMonthly, compareAccounts, sum, TAX,
} from '../src/utils/investment.ts'

const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`)

// 거치식: 연복리(실효)는 정확히 (1+r)^n, 월복리는 (1+r/12)^(12n)
near(futureValue({ initial: 10_000_000, monthly: 0, rate: 7, years: 10 }), 10_000_000 * 1.07 ** 10)
near(futureValue({ initial: 10_000_000, monthly: 0, rate: 7, years: 10, compounding: 'monthly' }), 10_000_000 * (1 + 0.07 / 12) ** 120)
assert.ok(futureValue({ initial: 1e7, monthly: 0, rate: 7, years: 10, compounding: 'monthly' }) > futureValue({ initial: 1e7, monthly: 0, rate: 7, years: 10 }))

// 적립식 = 기초 납입 연금 공식 PMT × ((1+i)^n − 1)/i × (1+i)
for (const c of ['annual', 'monthly'] as const) {
  const i = monthlyRate(7, c), n = 240
  near(futureValue({ initial: 0, monthly: 500_000, rate: 7, years: 20, compounding: c }), 500_000 * ((1 + i) ** n - 1) / i * (1 + i))
}
// 기본값 예시: 월 50만 × 20년 × 연 7% ≈ 2.55억, 원금 1.2억
const fv20 = futureValue({ initial: 0, monthly: 500_000, rate: 7, years: 20 })
assert.ok(fv20 > 254_000_000 && fv20 < 257_000_000, String(fv20))
// 수익률 0% → 원금 그대로
near(futureValue({ initial: 1e6, monthly: 1e5, rate: 0, years: 3 }), 1e6 + 1e5 * 36)

// 연도별 표 마지막 행 = 만기 평가액, 원금 누적 일치
const plan = { initial: 5_000_000, monthly: 300_000, rate: 6, years: 15, growth: 3 }
const rows = yearly(plan)
assert.equal(rows.length, 15)
near(rows[14].value, futureValue(plan))
near(rows[14].principal, sum(contributions(plan)))
// 적립 증가율: 2년차 월 적립액 = 30만 × 1.03
near(contributions(plan)[12], 309_000)
near(contributions(plan)[0], 5_300_000)
// 반기(0.5년)도 표 마지막 행 생성
assert.equal(yearly({ initial: 0, monthly: 1, rate: 5, years: 1.5 }).length, 2)

// 실질 가치
near(realValue(1.02 ** 10 * 100, 10, 2), 100)

// 목표 역산 — 왕복 검증
const target = 500_000_000
const pm = requiredMonthly(target, { initial: 10_000_000, rate: 7, years: 20, growth: 2 })
near(futureValue({ initial: 10_000_000, monthly: pm, rate: 7, years: 20, growth: 2 }), target)
assert.equal(requiredMonthly(1_000, { initial: 10_000, rate: 5, years: 1 }), 0)

const r = requiredRate(target, { initial: 10_000_000, monthly: 1_000_000, years: 20 })!
near(futureValue({ initial: 10_000_000, monthly: 1_000_000, rate: r, years: 20 }), target, 1e-7)
assert.ok(r > 5 && r < 10, String(r))
assert.equal(requiredRate(1e15, { initial: 0, monthly: 1, years: 1 }), null)

const n = requiredMonths(target, { initial: 10_000_000, monthly: 1_000_000, rate: 7 })!
assert.ok(futureValue({ initial: 10_000_000, monthly: 1_000_000, rate: 7, years: n / 12 }) >= target)
assert.ok(futureValue({ initial: 10_000_000, monthly: 1_000_000, rate: 7, years: (n - 1) / 12 }) < target)
assert.equal(requiredMonths(target, { initial: 0, monthly: 0, rate: 7 }), null)
assert.equal(requiredMonths(100, { initial: 100, monthly: 0, rate: 7 }), 0)

// 인출
assert.equal(fourPercentMonthly(300_000_000), 1_000_000)
near(payoutMonthly(120_000_000, 0, 10), 1_000_000)
// 나눠 받기: 연금 현가 = 자산
{ const i = monthlyRate(4), p = payoutMonthly(300_000_000, 4, 25); near(p * (1 - (1 + i) ** -300) / i, 300_000_000) }

// 계좌별 세금
{
  // 거치식 1,000만 × 5년 × 7% — 모두 한도 안
  const p = { initial: 10_000_000, monthly: 0, rate: 7, years: 5 }
  const profit = 10_000_000 * (1.07 ** 5 - 1)
  const c = compareAccounts(p, { lowIncome: true })
  near(c.general.tax, profit * 0.154)
  near(c.isa.tax, (profit - 2_000_000) * 0.099)
  near(compareAccounts(p, { isaLow: true }).isa.tax, (profit - 4_000_000) * 0.099) // 서민형 400만 비과세
  // 연금: 1년차 1,000만 중 900만 공제 × 16.5%, 수령 시 (900만 + 수익) × 5.5%
  near(c.pension.credit, 9_000_000 * 0.165)
  near(c.pension.tax, (9_000_000 + profit) * 0.055)
  near(compareAccounts(p, { age: '80' }).pension.tax, (9_000_000 + profit) * 0.033)
  near(compareAccounts(p).pension.credit, 9_000_000 * 0.132)
  assert.equal(c.isa.overflow, 0)
}
{
  // 월 300만 × 10년: ISA 연 2,000만 한도·총 1억, 연금 연 1,800만 한도 초과분 → 일반계좌
  const p = { initial: 0, monthly: 3_000_000, rate: 5, years: 10 }
  const c = compareAccounts(p)
  near(c.isa.principal, 360_000_000)
  near(c.isa.overflow, 360_000_000 - TAX.isa.total)
  near(c.pension.overflow, 360_000_000 - 18_000_000 * 10)
  near(c.pension.credit, 9_000_000 * 10 * 0.132)
  // 세전 평가액은 계좌와 무관
  near(c.isa.value, c.general.value); near(c.pension.value, c.general.value)
  assert.ok(c.isa.net > c.general.net && c.pension.net > c.general.net)
}
{
  // ISA 한도 이월: 거치 1억은 1년차에 2,000만만 들어감
  const c = compareAccounts({ initial: 100_000_000, monthly: 0, rate: 5, years: 5 })
  near(c.isa.overflow, 80_000_000)
}

console.log('check-investment: all passed')
