// 의료비 세액공제 계산기(/medical-tax-credit) 회귀 체크: node scripts/check-medical-tax-credit.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { medicalCredit } from '../src/utils/yearEndTax.ts'
import {
  analyze, breakdown, couple, netOf, splitFor, threshold, EXAMPLES, PLANS, CURRENT, ZERO,
} from '../src/utils/medicalTaxCredit.ts'

const M0 = { special: 0, general: 0, premature: 0, infertility: 0 }

// ── breakdown(표 표시)과 yearEndTax.medicalCredit이 같은 규칙인지 (결정적 난수 2,000건) ──
let seed = 7
const rnd = (n: number) => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) % n
for (let i = 0; i < 2000; i++) {
  const salary = rnd(200) * 1_000_000 + rnd(1000)
  const m = { special: rnd(30) * 500_000 + rnd(1000), general: rnd(40) * 500_000 + rnd(1000), premature: rnd(3) * 1_000_000, infertility: rnd(3) * 2_000_000 }
  const b = breakdown(salary, m)
  assert.equal(Math.floor(b.reduce((a, x) => a + x.eligible * x.rate, 0)), medicalCredit(salary, m), `breakdown ${salary} ${JSON.stringify(m)}`)
  assert.equal(b.reduce((a, x) => a + x.cut, 0), Math.min(threshold(salary), m.special + m.general + m.premature + m.infertility))
}

// ── 소득세법 §59의4② 규칙 ──
assert.equal(threshold(50_000_000), 1_500_000)
assert.equal(threshold(35_000_000), 1_050_000)
assert.equal(threshold(80_000_000), 2_400_000)
// 3% 문턱은 일반(1호)부터: 일반 100만 전부 + 본인 등 50만 차감 → 250만 × 15%
assert.equal(medicalCredit(50_000_000, { ...M0, general: 1_000_000, special: 3_000_000 }), 375_000)
// 700만 한도는 문턱을 뺀 뒤 일반 의료비에만: 1,000만 − 150만 = 850만 → 700만 × 15%
assert.equal(medicalCredit(50_000_000, { ...M0, general: 10_000_000 }), 1_050_000)
assert.equal(breakdown(50_000_000, { ...M0, general: 10_000_000 })[0].capped, 1_500_000)
assert.equal(medicalCredit(50_000_000, { ...M0, special: 10_000_000 }), 1_275_000) // 본인 등은 한도 없음
assert.equal(medicalCredit(50_000_000, { ...M0, premature: 2_500_000 }), 200_000)  // 20%
assert.equal(medicalCredit(50_000_000, { ...M0, infertility: 2_500_000 }), 300_000) // 30%
// 미달액은 마지막에 난임시술비(30%)에서: 본인 100만 → 남은 문턱 50만을 난임에서 차감
assert.equal(medicalCredit(50_000_000, { ...M0, special: 1_000_000, infertility: 2_000_000 }), 450_000)

// ── 실손보험금 차감 (음수 없음) ──
assert.deepEqual(netOf({ ...ZERO, self: 1_000_000, general: 500_000 }, { ...ZERO, self: 300_000, general: 900_000 }), { ...ZERO, self: 700_000 })

// ── 상태(공제 안 되는 이유) ──
assert.equal(analyze(50_000_000, ZERO).status, 'none')
assert.equal(analyze(50_000_000, { ...ZERO, self: 1_500_000 }).status, 'threshold') // 정확히 3%는 '초과'가 아님
{ const r = analyze(10_000_000, { ...ZERO, self: 3_000_000 }); assert.equal(r.status, 'noTax'); assert.equal(r.saving, 0); assert.ok(r.credit > 0) }
{ const r = analyze(15_000_000, { ...ZERO, self: 500_000 }); assert.equal(r.status, 'standard'); assert.equal(r.saving, 0) }

// ── EXAMPLES (page.tsx 본문·FAQ에 찍히는 숫자) ──
{ // 기본값·FAQ 1: 연봉 5,000만, 본인 70만 + 부양가족 180만 → 100만 × 15%
  const r = analyze(EXAMPLES.d.salary, EXAMPLES.d.e)
  assert.deepEqual([r.threshold, r.spent, r.credit, r.saving, r.status, r.more], [1_500_000, 2_500_000, 150_000, 165_000, 'full', 165_000])
}
{ // 연봉 3,500만: 본인 180만 → 문턱 105만, 75만 × 15%
  const r = analyze(EXAMPLES.a.salary, EXAMPLES.a.e)
  assert.deepEqual([r.threshold, r.rows[1].key, r.rows[1].eligible, r.credit, r.saving, r.status], [1_050_000, 'special', 750_000, 112_500, 123_750, 'full'])
}
{ // 연봉 5,000만: 아버지 수술 800만 − 실손 500만 = 300만 + 자녀 120만 → 일반 120만 전부·본인 등 30만 차감 → 270만 × 15%
  const e = netOf(EXAMPLES.b.paid, EXAMPLES.b.insured)
  const r = analyze(EXAMPLES.b.salary, e)
  assert.equal(r.spent, 4_200_000)
  assert.deepEqual(r.rows.map((x) => [x.key, x.cut, x.eligible]).slice(0, 2), [['general', 1_200_000, 0], ['special', 300_000, 2_700_000]])
  assert.deepEqual([r.credit, r.saving], [405_000, 445_500])
}
{ // 결정세액 한도: 연봉 2,000만, 본인 300만 → 공제 36만이지만 낼 세금이 133,210원뿐
  const r = analyze(EXAMPLES.low.salary, EXAMPLES.low.e)
  assert.deepEqual([r.credit, r.saving, r.tax, r.status], [360_000, 133_210, 133_210, 'partial'])
}
{ // 맞벌이: 연봉 8,000만 + 배우자 3,500만, 본인 50만 + 자녀 300만
  const { salary, spouseSalary, e, spouseOwn } = EXAMPLES.c
  const c = couple(salary, spouseSalary, e, spouseOwn)
  const famOnly = c.results.find((x) => x.plan.mine === 'me' && x.plan.spouse === 'spouse' && x.plan.family === 'spouse')!
  assert.deepEqual([c.current.me, c.current.spouse, c.current.total], [181_500, 0, 181_500]) // (350만 − 240만) × 15% × 1.1
  assert.deepEqual([famOnly.me, famOnly.spouse], [0, 321_750])                                  // (300만 − 105만) × 15% × 1.1
  assert.deepEqual([c.allSpouse.total, c.best.total, c.gain], [404_250, 404_250, 222_750])      // (350만 − 105만) × 15% × 1.1
  assert.deepEqual(c.best.plan, { mine: 'spouse', spouse: 'spouse', family: 'spouse' })
}

// ── 맞벌이 배분 규칙 ──
assert.deepEqual(PLANS[0], CURRENT)
assert.equal(new Set(PLANS.map((p) => JSON.stringify(p))).size, 8)
// 내 본인 의료비를 배우자가 결제하면 배우자 쪽 '그 밖의 가족'(700만 한도), 배우자 본인 의료비를 내가 내면 내 쪽 '그 밖의 가족'
assert.deepEqual(splitFor({ mine: 'spouse', spouse: 'me', family: 'me' }, { ...ZERO, self: 1, family: 2, general: 3, premature: 4, infertility: 5 }, 6),
  { me: { special: 2, general: 3 + 6, premature: 4, infertility: 5 }, spouse: { special: 0, general: 1, premature: 0, infertility: 0 } })
// 같은 금액이면 덜 옮기는 쪽(지금 그대로)을 추천
{ const c = couple(50_000_000, 50_000_000, EXAMPLES.d.e, 0); assert.equal(c.gain, 0); assert.deepEqual(c.best.plan, CURRENT) }

console.log('check-medical-tax-credit OK')
