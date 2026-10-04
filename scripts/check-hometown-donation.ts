// 고향사랑기부금 계산기(/hometown-donation) 회귀 체크: node scripts/check-hometown-donation.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES와 util 함수로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { hometownCredit } from '../src/utils/yearEndTax.ts'
import { donate, breakEven, compare, curve, credit, disasterCredit, chartMax, EXAMPLES, CAP } from '../src/utils/hometownDonation.ts'

const pick = (r: ReturnType<typeof donate>) => [r.income, r.local, r.nominal, r.saving, r.gift, r.cost]

// ── 2026 기부분 공제 구간 (조특법 §58① 2025.12.23 개정): 10만 100/110, 10만~20만 40%, 20만 초과 15% ──
assert.equal(hometownCredit(100_000), 90_909)
assert.equal(hometownCredit(200_000), 130_909)
assert.deepEqual(credit(100_000), { income: 90_909, local: 9_090, total: 99_999 })
assert.deepEqual(credit(200_000), { income: 130_909, local: 13_090, total: 143_999 })
assert.equal(hometownCredit(CAP + 1_000_000), hometownCredit(CAP)) // 연 2,000만 한도

// ── 본문 사례 (총급여 없이 = 공제 전부 받는다고 가정) ──
assert.deepEqual(pick(donate(EXAMPLES.ten)), [90_909, 9_090, 99_999, 99_999, 30_000, -29_999])          // 10만 → 29,999원 이득
assert.deepEqual(pick(donate(EXAMPLES.twenty)), [130_909, 13_090, 143_999, 143_999, 60_000, -3_999])   // 20만 → 3,999원 이득 (기본값)
assert.deepEqual(pick(donate(EXAMPLES.million)), [250_909, 25_090, 275_999, 275_999, 300_000, 424_001]) // 100만 → 실부담 424,001
assert.equal(donate(EXAMPLES.twenty).benefit, 203_999)
assert.equal(donate(EXAMPLES.million).benefit, 575_999)

// ── 비교표 10만·20만·30만·50만·100만 ──
assert.deepEqual(compare({}).map((r) => [r.amount, r.nominal, r.gift, r.cost]), [
  [100_000, 99_999, 30_000, -29_999],
  [200_000, 143_999, 60_000, -3_999],
  [300_000, 160_499, 90_000, 49_501],
  [500_000, 193_499, 150_000, 156_501],
  [1_000_000, 275_999, 300_000, 424_001],
])

// ── 이미 기부한 금액: 구간은 연간 누적 → 이번 기부의 공제 = 공제(누적) − 공제(이미 기부분) ──
let r = donate(EXAMPLES.more) // 이미 10만 + 10만 더
assert.deepEqual(pick(r), [40_000, 4_000, 44_000, 44_000, 30_000, 26_000])
assert.deepEqual(r.bands.map((b) => b.amount), [0, 100_000, 0])
r = donate({ amount: 100_000, prior: 50_000 }) // 5만은 100/110, 5만은 40%
assert.deepEqual(r.bands.map((b) => [b.amount, b.income]), [[50_000, 45_455], [50_000, 20_000], [0, 0]])
assert.equal(r.income, hometownCredit(150_000) - hometownCredit(50_000))
assert.equal(donate({ amount: 100_000, prior: 200_000 }).nominal, 16_500)
// 나눠 기부해도 합계가 같으면 공제 같음
assert.equal(donate({ amount: 150_000 }).income + donate({ amount: 150_000, prior: 150_000 }).income, donate({ amount: 300_000 }).income)
// 연 한도: 이미 1,950만 → 이번엔 50만까지만
r = donate({ amount: 1_000_000, prior: 19_500_000 })
assert.equal(r.amount, 500_000); assert.equal(r.over, 500_000)

// ── 실부담 0원 지점: 약 20만 7천 (0.535a − 111,000 = 0 → 207,476.6, 원 단위 절사 반영) ──
const be = breakEven({})
assert.equal(be, 207_475)
assert.ok(donate({ amount: be }).cost <= 0 && donate({ amount: be + 100 }).cost > 0)
assert.equal(breakEven({ prior: 50_000 }), 107_691)
assert.equal(breakEven({ prior: 100_000 }), 0) // 이미 10만 넘게 기부 → 이득 구간 없음
assert.equal(breakEven({ salary: 50_000_000 }), 207_475)
// 1만원 더 낼 때 늘어나는 실부담 (차트 설명): 10만~20만 약 2,600원, 20만 초과 약 5,350원
const step = (a: number) => donate({ amount: a + 10_000 }).cost - donate({ amount: a }).cost
assert.ok(Math.abs(step(150_000) - 2_600) <= 1)
assert.ok(Math.abs(step(400_000) - 5_350) <= 1)
// 실부담이 가장 작은 곳은 10만원(이득 29,999원)
assert.ok(compare({}).every((x) => x.cost >= donate(EXAMPLES.ten).cost))

// ── 총급여 → 결정세액 한도 (연봉만 있는 근로자 가정, itemTaxSaving) ──
r = donate(EXAMPLES.low) // 연봉 2,000만, 50만 기부
assert.equal(r.taxLeft, 133_210)       // 올해 세금(지방소득세 포함)
assert.equal(r.nominal, 193_499)
assert.equal(r.saving, 133_210)        // 세금 전부까지만
assert.equal(r.lost, 60_289)
assert.equal(r.cost, 216_790)
assert.equal(r.capped, true)
assert.equal(donate({ amount: 100_000, salary: 20_000_000 }).saving, 100_000) // 10만은 다 돌려받음
assert.equal(donate({ amount: 100_000, salary: 20_000_000 }).capped, false)
assert.equal(breakEven({ salary: 20_000_000 }), 190_300)
r = donate({ amount: 500_000, salary: 50_000_000 })
assert.equal(r.capped, false); assert.ok(Math.abs(r.saving - r.nominal) <= 1) // 지방소득세 원 단위 절사 차이만
// 이미 기부한 금액만큼 남은 세금도 줄어든다
r = donate({ amount: 100_000, salary: 20_000_000, prior: 200_000 })
assert.equal(r.taxLeft, 0); assert.equal(r.saving, 0); assert.equal(r.cost, 70_000)

// ── 특별재난지역(선포일부터 3개월 이내) 100만: 20만 초과분 30% → 407,999 (고향사랑e음 예시 40.8만) ──
assert.equal(disasterCredit(1_000_000), 407_999)
assert.equal(disasterCredit(200_000), 143_999) // 20만 이하는 같음

// ── 2025년 기부분(10만 초과 일괄 15%)과 비교: 20만 → 116,499 → 2026년 143,999로 27,500원 늘어남 ──
const old = (a: number) => { const i = Math.floor((Math.min(a, 100_000) * 100) / 110 + Math.max(a - 100_000, 0) * 0.15); return i + Math.floor(i * 0.1) }
assert.equal(old(200_000), 116_499)
assert.equal(credit(200_000).total - old(200_000), 27_500)

// ── 곡선: 꺾이는 점(10만·20만)과 0원 지점 포함, 오름차순 ──
const pts = curve({}, chartMax(200_000))
assert.equal(chartMax(200_000), 1_000_000); assert.equal(chartMax(3_500_000), 4_000_000)
assert.ok([100_000, 200_000, be].every((x) => pts.some((p) => p.a === x)))
assert.ok(pts.every((p, i) => i === 0 || p.a > pts[i - 1].a))
assert.equal(pts[0].cost, 0)
assert.equal(curve({ prior: 19_900_000 }, 1_000_000).at(-1)!.a, 100_000) // 남은 한도까지만

console.log('check-hometown-donation: ok')
