// 연말정산 부양가족 공제 판정(/dependent-deduction) 회귀 체크: node scripts/check-dependent-deduction.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { TAX_YEAR } from '../src/utils/yearEndTax.ts'
import {
  analyze, judge, incomeOf, pensionDeduction, member, selfExtra, birthOrder, toInput,
  EXAMPLES, NO_INCOME, PENSION_LIMIT, CHILD_CREDIT_BORN_BY,
} from '../src/utils/dependentDeduction.ts'

assert.equal(TAX_YEAR, 2026) // 아래 출생연도 경계는 2026 귀속 기준
const inc = (x: Partial<typeof NO_INCOME>) => ({ ...NO_INCOME, ...x })
const ok = (rel: Parameters<typeof member>[0], born: number, i = {}, more = {}) => judge(member(rel, born, i, more)).ok

// ── §47의2 연금소득공제 ──
assert.equal(pensionDeduction(3_000_000), 3_000_000)
assert.equal(pensionDeduction(5_400_000), 4_260_000)        // 350만 + 190만 × 40%
assert.equal(pensionDeduction(10_000_000), 5_500_000)       // 490만 + 300만 × 20%
assert.equal(pensionDeduction(50_000_000), 9_000_000)       // 630만 + 3,600만 × 10% = 990만 → 한도 900만

// ── 공적연금만: 총연금액 516만6,666원까지 통과 (0.6 × (P − 350만) ≤ 100만) ──
assert.deepEqual([incomeOf(inc({ publicPension: PENSION_LIMIT })).total, ok('parent', 1956, { publicPension: PENSION_LIMIT })], [1_000_000, true])
assert.deepEqual([incomeOf(inc({ publicPension: PENSION_LIMIT + 1 })).total, ok('parent', 1956, { publicPension: PENSION_LIMIT + 1 })], [1_000_001, false])
{ const r = judge(EXAMPLES.d.family[0]); assert.deepEqual([r.ok, r.fails, r.inc.total, r.inc.sources, r.elderly], [false, ['income'], 1_140_000, ['publicPension'], true]) }

// ── 퇴직소득·양도소득은 소득금액에 들어간다 ──
{ const r = judge(EXAMPLES.retired); assert.deepEqual([r.ok, r.fails, r.inc.sources], [false, ['income'], ['retirement']]) }
assert.equal(ok('parent', 1960, { capitalGains: 1_000_001 }), false)
assert.equal(ok('parent', 1960, { capitalGains: 1_000_000 }), true)

// ── §53⑤ 하루라도: 2026 귀속 직계존속 1966년 이전, 직계비속 2006년 이후, 형제자매 둘 다, 경로우대 1956년 이전 ──
assert.equal(ok('parent', 1966), true)
assert.equal(ok('parent', 1967), false)
assert.equal(ok('child', 2006), true)
assert.equal(ok('child', 2005), false)
assert.equal(ok('grandchild', 2005), false)
assert.deepEqual([ok('sibling', 2006), ok('sibling', 1966), ok('sibling', 1980)], [true, true, false])
assert.equal(ok('child', 2005, {}, { disabled: true }), true) // 장애인은 나이 무관
assert.equal(ok('spouse', 1990), true)
assert.deepEqual([judge(member('parent', 1956)).elderly, judge(member('parent', 1957)).elderly], [true, false])
assert.equal(judge(member('parent', 1956)).extra, 1_000_000)
assert.equal(judge(member('parent', 1956, {}, { disabled: true })).extra, 3_000_000)
// 형제자매는 동거, 직계존속은 따로 살아도 됨(apart 무시)
assert.equal(ok('sibling', 2008, {}, { apart: true }), false)
assert.equal(ok('parent', 1950, {}, { apart: true }), true)

// ── 근로소득만: 총급여 500만원 이하 ──
assert.equal(ok('spouse', 1990, { wage: 5_000_000 }), true)
{ const r = judge(member('spouse', 1990, { wage: 5_000_001 })); assert.deepEqual([r.ok, r.fails], [false, ['wage']]) }
// 근로 + 다른 소득이면 근로소득금액(총급여 − 근로소득공제)으로 합산: 300만 → 90만 + 사업 10만 = 100만
assert.equal(ok('spouse', 1990, { wage: 3_000_000, business: 100_000 }), true)
assert.equal(ok('spouse', 1990, { wage: 3_000_000, business: 100_001 }), false)
// 일용근로는 분리과세
assert.equal(ok('spouse', 1990, { daily: 30_000_000 }), true)

// ── 분리과세: 금융 2천만 이하, 기타소득금액 300만 이하, 사적연금 1,500만 이하 ──
{ const r = judge(member('parent', 1950, { financial: 20_000_000 })); assert.deepEqual([r.ok, r.inc.total, r.inc.separated], [true, 0, ['financial']]) }
assert.equal(ok('parent', 1950, { financial: 20_000_001 }), false)
assert.equal(ok('parent', 1950, { other: 3_000_000 }), true)
assert.equal(ok('parent', 1950, { other: 3_000_001 }), false)
assert.equal(ok('parent', 1950, { privatePension: 15_000_000 }), true)
assert.equal(ok('parent', 1950, { privatePension: 15_000_001 }), false)
// 사적연금이 종합과세되면 공적연금과 합산해 연금소득공제 한 번
assert.equal(incomeOf(inc({ publicPension: 3_000_000, privatePension: 16_000_000 })).total, 19_000_000 - pensionDeduction(19_000_000))

// ── 추가공제·자녀세액공제 입력 ──
assert.deepEqual(selfExtra({ salary: 41_000_000, female: true, single: false }, []), { kind: 'woman', amount: 500_000 }) // 종합소득금액 3천만 이하
assert.equal(selfExtra({ salary: 42_000_000, female: true, single: false }, []).amount, 0)
assert.deepEqual(selfExtra({ salary: 30_000_000, female: true, single: true }, [member('child', 2015)]), { kind: 'single', amount: 1_000_000 }) // 둘 다면 한부모
assert.equal(selfExtra({ salary: 30_000_000, female: false, single: true }, [member('parent', 1950)]).amount, 0)
assert.equal(CHILD_CREDIT_BORN_BY, 2016)
assert.deepEqual(toInput([member('child', 2016), member('child', 2017), member('grandchild', 2012), member('parent', 1950), member('spouse', 1990)], 0),
  { spouse: true, children: 3, kidsUnder8: 1, others: 1, elderly: 1, disabled: 0, birth: 0 })
assert.equal(birthOrder([member('child', 2020), member('child', 2026)]), 2)

// ── EXAMPLES: 첫 화면 (총급여 5,000만, 아버지 연금 540만 탈락 + 자녀 2015·2019) ──
{
  const r = analyze(EXAMPLES.d.me, EXAMPLES.d.family)
  // 자녀 2명 기본공제 300만 × 15% = 45만 + 자녀세액공제 1명(2015년생) 25만 = 70만 → × 1.1
  assert.deepEqual([r.okCount, r.saving, r.contrib], [2, 770_000, [0, 522_500, 247_500]])
  assert.deepEqual(r.mineInput, { spouse: false, children: 2, kidsUnder8: 1, others: 0, elderly: 0, disabled: 0, birth: 0 })
}
{ // 아버지 연금이 516만6,666원이면 기본 150 + 경로 100 = 250만 × 15% × 1.1 = 412,500 더
  const r = analyze(EXAMPLES.pass.me, EXAMPLES.pass.family)
  assert.deepEqual([r.saving, r.contrib[0]], [1_182_500, 412_500])
}

// ── 맞벌이 최적 배분: 총급여 1억(24% 구간) vs 배우자 6,000만(15% 구간), 75세 어머니 250만 공제 ──
//    배우자가 받으면 250만 × 15% × 1.1 = 412,500, 내가 받으면 × 24% × 1.1 = 660,000 → 내게 옮기면 247,500 이득
{
  const { salary, spouseSalary, family } = EXAMPLES.c
  const r = analyze({ salary, female: false, single: false }, family, spouseSalary)
  const c = r.couple!
  assert.equal(c.before - c.current.total, 412_500)
  assert.equal(c.before - c.best.total, 660_000)
  assert.deepEqual([c.gain, c.best.toSpouse, c.current.toSpouse], [247_500, [false], [true]])
  assert.equal(r.saving, 412_500) // 지금 배분 기준
}
// 같은 세금이면 지금 배분 유지
{ const c = analyze({ salary: 50_000_000, female: false, single: false }, [member('child', 2015)], 50_000_000).couple!; assert.deepEqual([c.gain, c.best.toSpouse], [0, [false]]) }

console.log('check-dependent-deduction OK')
