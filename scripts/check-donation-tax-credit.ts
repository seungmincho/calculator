// 기부금 세액공제 계산기(/donation-tax-credit) 회귀 체크: node scripts/check-donation-tax-credit.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { donationLimits, donationCredit, politicalCredit, itemTaxSaving } from '../src/utils/yearEndTax.ts'
import { analyze, breakdown, EXAMPLES, ZERO } from '../src/utils/donationTaxCredit.ts'

// ── 예전 donationCredit(일반기부금 30% 한도)과 같은 결과 — 특례·종교 생략 시 (결정적 난수 2,000건) ──
let seed = 11
const rnd = (n: number) => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) % n
const old = (amount: number, ei: number) => {
  const a = Math.min(amount, Math.floor(ei * 0.3))
  return Math.floor(Math.min(a, 10_000_000) * 0.15 + Math.max(0, a - 10_000_000) * 0.3)
}
for (let i = 0; i < 2000; i++) {
  const ei = rnd(300) * 1_000_000 + rnd(1000)
  const a = rnd(60) * 1_000_000 + rnd(1000)
  assert.equal(donationCredit(a, ei), old(a, ei), `compat ${a} ${ei}`)
}

// ── 소득세법 §59의4④ 손계산 (근로소득금액 = 한도 계산의 소득금액) ──
// 종교단체만: 한도 10% → 2,025만 × 10% = 202.5만 × 15%
assert.deepEqual(donationLimits(20_250_000, 0, 0, 5_000_000), { special: 0, base: 20_250_000, cap: 2_025_000, general: 2_025_000 })
assert.equal(donationCredit(0, 20_250_000, 0, 5_000_000), 303_750)
// 종교 + 종교 외(20% 넘음): 한도 = 10% + min(20%, 1,000만) = 377.5만 + 755만 = 1,132.5만 → 1천만 × 15% + 132.5만 × 30%
assert.equal(donationLimits(37_750_000, 0, 10_000_000, 5_000_000).cap, 11_325_000)
assert.equal(donationCredit(10_000_000, 37_750_000, 0, 5_000_000), 1_897_500)
// 종교 + 종교 외(20% 안): 한도 = 10% + 200만 → 종교는 377.5만까지
assert.equal(donationLimits(37_750_000, 0, 2_000_000, 5_000_000).general, 5_775_000)
// 특례 먼저, 일반 한도는 (소득금액 − 특례) × 30%: (3,775만 − 775만) × 30% = 900만 → 1,675만 대상
assert.deepEqual(donationLimits(37_750_000, 7_750_000, 20_000_000), { special: 7_750_000, base: 30_000_000, cap: 9_000_000, general: 9_000_000 })
assert.equal(donationCredit(20_000_000, 37_750_000, 7_750_000), 1_500_000 + 2_025_000)
// 특례 한도 100%: 소득금액 2천만에 특례 2,500만 → 2천만만, 일반 한도 0
assert.deepEqual(donationLimits(20_000_000, 25_000_000, 5_000_000), { special: 20_000_000, base: 0, cap: 0, general: 0 })
assert.equal(donationCredit(5_000_000, 20_000_000, 25_000_000), 1_500_000 + 3_000_000)
// 1천만 초과분 30%, 2026 기부분엔 3천만 초과 +10%p(2024 한정, §59의4⑧) 없음: 4천만 → 150만 + 3천만 × 30%
assert.equal(donationCredit(40_000_000, 200_000_000), 10_500_000)

// ── 조특법 §76① 정치자금: 10만까지 100/110, 10만 초과 금액 15%, 그 금액 3천만 초과분 25% ──
assert.equal(politicalCredit(100_000), 90_909)
assert.equal(politicalCredit(300_000), 90_909 + 30_000)
assert.equal(politicalCredit(40_100_000), 90_909 + 4_500_000 + 2_500_000)
// 표준세액공제와 함께 받음: 연봉 3,000만(표준세액공제 적용)에서도 10만원 거의 전액
{ const r = itemTaxSaving({ salary: 30_000_000 }, { political: 100_000 }); assert.equal(r.after.standard, true); assert.equal(r.saving, 100_000) }

// ── 표시용 배분(종교 외부터)이 합계 한도와 맞는지 ──
for (let i = 0; i < 1000; i++) {
  const salary = rnd(200) * 1_000_000
  const g = { political: rnd(3) * 100_000, special: rnd(5) * 1_000_000, general: rnd(40) * 500_000, religious: rnd(40) * 500_000 }
  const b = breakdown(salary, g)
  const l = donationLimits(b.income, g.special, g.general, g.religious)
  assert.equal(b.rows[2].eligible + b.rows[3].eligible, l.general)
  assert.ok(b.rows.every((r) => r.excess >= 0 && (r.limit === null || r.eligible <= r.limit)), JSON.stringify(g))
}

// ── 상태 ──
assert.equal(analyze(50_000_000, ZERO).status, 'none')
assert.equal(analyze(10_000_000, { ...ZERO, general: 1_000_000 }).status, 'noTax')
{ const r = analyze(20_000_000, { ...ZERO, general: 300_000 }); assert.deepEqual([r.status, r.saving], ['standard', 0]) }
{ const r = analyze(20_000_000, { ...ZERO, general: 5_000_000 }); assert.deepEqual([r.status, r.saving, r.tax], ['partial', 133_210, 133_210]) }

// ── EXAMPLES (page.tsx 본문·FAQ에 찍히는 숫자) ──
{ // 기본값: 연봉 5,000만, 종교 외 36만 + 종교 120만 → 156만 × 15% = 23.4만, 지방소득세 포함 25.74만
  const r = analyze(EXAMPLES.d.salary, EXAMPLES.d.g)
  assert.deepEqual([r.income, r.donation, r.saving, r.status, r.more, r.politicalGain], [37_750_000, 234_000, 257_400, 'full', 49_500, 100_000])
  assert.deepEqual(r.rows.map((x) => x.limit), [null, 37_750_000, 11_325_000, 3_775_000])
}
{ // 연봉 3,000만, 종교 500만 → 한도 202.5만, 297.5만 이월. 표준세액공제(13만) 대신이라 세금은 312,430원 감소
  const r = analyze(EXAMPLES.religious.salary, EXAMPLES.religious.g)
  assert.deepEqual([r.income, r.rows[3].limit, r.rows[3].eligible, r.rows[3].excess, r.donation, r.saving, r.status], [20_250_000, 2_025_000, 2_025_000, 2_975_000, 303_750, 312_430, 'swap'])
}
{ // 연봉 1억 5천만, 일반 1,500만 → 150만 + 500만 × 30% = 300만, 330만 감소
  const r = analyze(EXAMPLES.big.salary, EXAMPLES.big.g)
  assert.deepEqual([r.high, r.donation, r.saving, r.more], [5_000_000, 3_000_000, 3_300_000, 99_000])
}
{ const r = analyze(EXAMPLES.political.salary, EXAMPLES.political.g); assert.deepEqual([r.political, r.saving], [90_909, 100_000]) }
{ // 연봉 4,000만, 특례 200만 → 30만, 33만 감소. 일반 한도 기준은 (2,875만 − 200만)
  const r = analyze(EXAMPLES.special.salary, EXAMPLES.special.g)
  assert.deepEqual([r.income, r.base, r.donation, r.saving], [28_750_000, 26_750_000, 300_000, 330_000])
}

console.log('check-donation-tax-credit OK')
