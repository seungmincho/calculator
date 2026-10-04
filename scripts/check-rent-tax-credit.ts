// 월세 세액공제 회귀 체크: node scripts/check-rent-tax-credit.ts
// 페이지(FAQ·본문·예시)에 적힌 숫자와 경정청구 가능 연도 경계를 고정한다.
import assert from 'node:assert/strict'
import { rentCredit, TAX_YEAR } from '../src/utils/yearEndTax.ts'
import {
  RENT_RULES, ruleMax, tierOf, eligibility, rentResult, cashReceiptMax, claimDeadline, pastYears, nextBusinessDay, type CheckId,
} from '../src/utils/rentTaxCredit.ts'

// ── 올해 규칙이 yearEndTax.rentCredit과 같은지 ──
const r26 = RENT_RULES[TAX_YEAR]
for (const s of [20e6, 55e6, 55_000_001, 70e6, 80e6, 80_000_001]) for (const rent of [0, 6e6, 7.2e6, 10e6, 12e6]) {
  const credit = Math.floor(Math.min(rent, r26.limit) * (s <= 55e6 ? r26.rate55 : s <= r26.cap ? r26.rate : 0))
  assert.equal(rentCredit(s, rent), credit, `rentCredit ${s} ${rent}`)
}

// ── 사례 (월세 60만 원 × 12개월 = 720만 원, 본인 1명·다른 공제 없음) ──
let x = rentResult(35e6, 7.2e6)
assert.deepEqual([x.rate, x.credit, x.max, x.taxBefore, x.saving], [0.17, 1_224_000, 1_346_400, 1_051_420, 1_051_420]) // 결정세액 한도에 걸림
x = rentResult(50e6, 7.2e6)
assert.deepEqual([x.rate, x.credit, x.max, x.saving], [0.17, 1_224_000, 1_346_400, 1_346_400])
x = rentResult(80e6, 7.2e6)
assert.deepEqual([x.rate, x.credit, x.max, x.saving], [0.15, 1_080_000, 1_188_000, 1_188_000])
x = rentResult(50e6, 10.8e6) // 월 90만 원 → 1,000만 원 한도
assert.deepEqual([x.base, x.credit, x.saving], [10_000_000, 1_700_000, 1_870_000])
x = rentResult(80_000_001, 7.2e6)
assert.deepEqual([x.credit, x.saving], [0, 0])
x = rentResult(30e6, 7.2e6) // 표준세액공제(13만)를 쓰던 사람
assert.equal(x.standardBefore, true); assert.equal(x.saving, x.taxBefore)

// ── 현금영수증으로 받을 때 (카드가 이미 25% 문턱을 채운 경우): 720만 × 30% = 216만 소득공제 ──
assert.equal(cashReceiptMax(50e6, 7.2e6), 356_400) // 216만 × 15% × 1.1
assert.equal(cashReceiptMax(90e6, 7.2e6), 570_240) // 총급여 9,000만: 세액공제 대상 아님, 현금영수증만 가능 (216만 × 24% × 1.1)

// ── 지난 연도 상한 (규칙 × 한도 내 월세 × 1.1) ──
const low = (y: number, rent: number) => ruleMax(RENT_RULES[y], 'low', rent)
assert.deepEqual([2021, 2022, 2023, 2024, 2025].map((y) => low(y, 7.2e6)), [950_400, 1_346_400, 1_346_400, 1_346_400, 1_346_400])
assert.equal([2021, 2022, 2023, 2024, 2025].reduce((a, y) => a + low(y, 7.2e6), 0), 6_336_000)
assert.deepEqual([2021, 2022, 2023, 2024, 2025].map((y) => low(y, 10.8e6)), [990_000, 1_402_500, 1_402_500, 1_870_000, 1_870_000])
// 총급여 7,500만: 2023 귀속까지 소득요건 7천만이라 대상 아님, 2024 귀속부터 15%
assert.deepEqual([2021, 2022, 2023, 2024, 2025].map((y) => tierOf(75e6, RENT_RULES[y])), ['over', 'over', 'over', 'mid', 'mid'])
assert.equal(ruleMax(RENT_RULES[2024], 'mid', 7.2e6), 1_188_000)
assert.equal(ruleMax(RENT_RULES[2023], 'over', 7.2e6), 0)

// ── 경정청구 기한: 다음 해 3월 10일(주말이면 다음 월요일) 후 5년 ──
assert.equal(nextBusinessDay('2026-05-31'), '2026-06-01')
assert.deepEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026].map(claimDeadline),
  ['2026-03-10', '2027-03-10', '2028-03-10', '2029-03-12', '2030-03-11', '2031-03-10', '2032-03-10'])
const ys = (d: string) => pastYears(d).years.map((p) => p.year)
assert.deepEqual(ys('2026-10-05'), [2025, 2024, 2023, 2022, 2021])
assert.deepEqual(pastYears('2026-10-05').unverified, [])
assert.deepEqual(pastYears('2026-10-05').years.map((p) => p.route), ['claim', 'claim', 'claim', 'claim', 'claim'])
assert.deepEqual(ys('2027-06-01'), [2026, 2025, 2024, 2023, 2022])
assert.equal(pastYears('2027-06-01').years[0].route, 'claim')
assert.deepEqual(ys('2027-03-10'), [2026, 2025, 2024, 2023, 2022, 2021]) // 2021 귀속 마지막 날
assert.deepEqual(ys('2027-03-11'), [2026, 2025, 2024, 2023, 2022])
assert.equal(pastYears('2027-01-20').years[0].route, 'yearEnd')
assert.equal(pastYears('2027-04-15').years[0].route, 'may')
assert.deepEqual(pastYears('2026-03-10').unverified, [2020]) // 2020 귀속 규칙은 표에 없음 → 제외 안내

// ── 자격 체크 ──
const no = (...c: CheckId[]) => new Set<CheckId>(c)
assert.deepEqual(eligibility(50e6, no()), { ok: true, fails: [] })
assert.deepEqual(eligibility(80e6, no()), { ok: true, fails: [] })
assert.deepEqual(eligibility(80_000_001, no('address')), { ok: false, fails: ['address', 'salary'] })

console.log('rent-tax-credit OK')
