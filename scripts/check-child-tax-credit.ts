// 자녀세액공제 계산기(/child-tax-credit) 회귀 체크: node scripts/check-child-tax-credit.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { childCredit, birthCredit } from '../src/utils/yearEndTax.ts'
import { CHILD_CREDIT_BORN_BY, BORN } from '../src/utils/dependentDeduction.ts'
import { analyze, couple, ageOk, basicOk, bornBy, minAge, reasonOf, span, kid, EXAMPLES } from '../src/utils/childTaxCredit.ts'

// ── 금액 §59의2①③: 1명 25만, 2명 55만, 3명부터 1명당 40만 추가 / 출산·입양 30·50·70만 ──
assert.deepEqual([0, 1, 2, 3, 4].map(childCredit), [0, 250_000, 550_000, 950_000, 1_350_000])
assert.deepEqual([0, 1, 2, 3, 5].map(birthCredit), [0, 300_000, 500_000, 700_000, 700_000])

// ── 대상 나이: 부칙 2026.4.21 §2 (2026 9세·2027 10세·2028 11세·2029 12세, 2017년생 제외, 2030부터 13세) ──
assert.deepEqual([2025, 2026, 2027, 2028, 2029, 2030, 2031].map(minAge), [8, 9, 10, 11, 12, 13, 13])
assert.equal(ageOk(2016, 2026), true)
assert.equal(ageOk(2017, 2026), false) // 9세지만 부칙 §2③
assert.equal(ageOk(2017, 2025), true) // 개정 전 8세 이상
assert.equal(ageOk(2017, 2029), false) // 12세지만 제외
assert.equal(ageOk(2017, 2030), true) // 13세
assert.equal(ageOk(2018, 2030), false)
assert.equal(ageOk(2018, 2031), true)
assert.deepEqual([2025, 2026, 2027, 2028, 2029, 2030, 2031].map(bornBy), [2017, 2016, 2016, 2016, 2016, 2017, 2018])
assert.equal(bornBy(2026), CHILD_CREDIT_BORN_BY) // dependentDeduction.ts와 같은 경계

// ── 기본공제 20세 이하 (2026 귀속 2006년 이후 출생), 장애인은 나이 무관 ──
assert.equal(basicOk(kid(2006)), true)
assert.equal(basicOk(kid(2005)), false)
assert.equal(basicOk(kid(2005, 'child', true)), true)
assert.equal(BORN.young, 2006)
assert.deepEqual([kid(2016), kid(2017), kid(2018), kid(2026), kid(2005), kid(2006)].map(reasonOf), ['ok', 'y2017', 'young', 'newborn', 'over', 'ok'])
assert.deepEqual(span(kid(2017)), { from: 2030, to: 2037 })
assert.deepEqual(span(kid(2014)), { from: 2026, to: 2034 })
assert.deepEqual(span(kid(2020, 'child', true)), { from: 2033, to: null })
assert.deepEqual(span(kid(2005)), { from: null, to: 2025 })

// ── EXAMPLES (page.tsx 본문·FAQ에 찍히는 숫자) ──
{ // 첫 화면: 5,000만, 2014·2018 → 2014년생 1명 25만, 지방소득세 포함 27.5만
  const r = analyze(EXAMPLES.d.salary, EXAMPLES.d.kids, EXAMPLES.d.birth)
  assert.deepEqual([r.basic, r.eligible, r.credit, r.saving, r.status], [2, 1, 250_000, 275_000, 'full'])
  assert.deepEqual(r.input, { children: 2, kidsUnder8: 1, disabled: 0, birth: 0 })
}
{ // 3명: 25 + 30 + 40 = 95만 → 104.5만
  const r = analyze(EXAMPLES.three.salary, EXAMPLES.three.kids, 0)
  assert.deepEqual([r.credit, r.saving], [950_000, 1_045_000])
}
{ // 출산 둘째 50만 + 2016년생 25만 (올해 태어난 아이는 자녀세액공제 대상 아님)
  const r = analyze(EXAMPLES.birth.salary, EXAMPLES.birth.kids, EXAMPLES.birth.birth)
  assert.deepEqual([r.eligible, r.child, r.born, r.saving], [1, 250_000, 500_000, 825_000])
}
// 결정세액 한도: 총급여 3,000만, 대상 자녀 3명(95만·지방세 포함 104.5만) → 원래 세금 237,902원만큼만
{ const r = analyze(EXAMPLES.low.salary, EXAMPLES.three.kids, 0); assert.deepEqual([r.status, r.saving, r.tax], ['partial', 237_902, 237_902]) }
{ const r = analyze(50_000_000, [kid(2018)], 0); assert.deepEqual([r.status, r.saving], ['none', 0]) }

// ── 맞벌이 ──
{ // 4,000만 + 배우자 8,000만, 대상 자녀 2명: 모두 배우자 앞으로 → 기본공제 300만 × (24% − 15%) × 1.1 = 29.7만 덜 냄
  const r = couple(EXAMPLES.c.salary, EXAMPLES.c.spouseSalary, EXAMPLES.c.kids, 0)
  assert.deepEqual([r.best.toSpouse, r.gain, r.split], [[true, true], 297_000, false])
}
{ // 3,000만 + 3,000만: 함께 받으면 55만이 한 사람 세금을 넘어 → 1명씩 나누는 게 유리
  const r = couple(EXAMPLES.split.salary, EXAMPLES.split.spouseSalary, EXAMPLES.split.kids, 0)
  assert.deepEqual([r.split, r.gain, r.allMe.me], [true, 263_725, 0])
}

console.log('check-child-tax-credit OK')
