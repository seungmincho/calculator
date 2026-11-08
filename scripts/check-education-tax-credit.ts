// 교육비 세액공제 계산기(/education-tax-credit) 회귀 체크: node scripts/check-education-tax-credit.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { educationCredit } from '../src/utils/yearEndTax.ts'
import { analyze, personOf, hubAmounts, EXAMPLES, ITEMS, KINDS, type Person } from '../src/utils/educationTaxCredit.ts'

// ── 1인별 한도 (§59의4③1 단서, 시행령 §118의6①4·6) ──
const eligible = (p: Person) => personOf(p).eligible
assert.equal(eligible({ kind: 'lower', a: { arts: 3_600_000 } }), 3_000_000)                       // 마목: 300만
assert.equal(eligible({ kind: 'lower', a: { school: 1_000_000, arts: 2_500_000 } }), 3_000_000)    // 학교 교육비와 합쳐서 300만
assert.equal(eligible({ kind: 'preschool', a: { care: 2_000_000, academy: 2_000_000 } }), 3_000_000)
assert.equal(eligible({ kind: 'school', a: { uniform: 800_000, trip: 500_000 } }), 800_000)          // 교복 50만 + 체험학습 30만
assert.equal(eligible({ kind: 'school', a: { school: 2_900_000, uniform: 500_000 } }), 3_000_000)  // 항목 한도도 300만 안
assert.equal(eligible({ kind: 'univ', a: { tuition: 12_000_000, exam: 200_000 } }), 9_000_000)
assert.equal(eligible({ kind: 'self', a: { grad: 20_000_000, loan: 3_000_000 } }), 23_000_000)    // 본인 한도 없음
assert.equal(eligible({ kind: 'disabled', a: { special: 15_000_000 } }), 15_000_000)              // 장애인 특수교육비 한도 없음
assert.equal(personOf({ kind: 'school', a: { school: -5 } }).spent, 0)                             // 음수 무시
// 다른 구분의 항목 금액은 계산에 들어가지 않음 (구분을 바꿔도 금액은 남겨 둠)
assert.equal(personOf({ kind: 'school', a: { arts: 1_000_000, school: 100_000 } }).spent, 100_000)
// URL 값 순서가 바뀌면 예전 공유 링크가 어긋난다
assert.deepEqual(KINDS, ['self', 'preschool', 'lower', 'school', 'univ', 'disabled'])
assert.deepEqual(ITEMS.school, ['school', 'uniform', 'trip', 'exam'])

// ── 1인별 한도 vs 연말정산 계산기의 합산 한도: 한 명은 넘고 한 명은 남으면 다르다 ──
{
  const kids: Person[] = [{ kind: 'school', a: { school: 3_600_000 } }, { kind: 'school', a: { school: 1_000_000 } }]
  const r = analyze(50_000_000, kids)
  assert.equal(r.eligible, 4_000_000)                                  // 300 + 100
  assert.equal(r.credit, 600_000)
  assert.equal(educationCredit(0, 4_600_000, 0, 2), 690_000)           // 허브 방식(460만 ≤ 600만)은 과대
  assert.equal(r.credit, educationCredit(r.eligible, 0, 0, 0))         // eduSelf 자리 = 합계 × 15%
  assert.deepEqual(r.rows.map((x) => [x.over, x.room]), [[600_000, 0], [0, 2_000_000]])
}

// ── 상태 ──
assert.equal(analyze(50_000_000, []).status, 'none')
assert.equal(analyze(50_000_000, [{ kind: 'self', a: {} }]).status, 'none')
{ const r = analyze(10_000_000, [{ kind: 'self', a: { grad: 3_000_000 } }]); assert.equal(r.status, 'noTax'); assert.equal(r.saving, 0) }
{ const r = analyze(15_000_000, [{ kind: 'lower', a: { arts: 500_000 } }]); assert.equal(r.status, 'standard'); assert.equal(r.saving, 0); assert.equal(r.rows[0].more, 14_039) }

// ── 연말정산 계산기 링크 금액 ──
assert.deepEqual(hubAmounts([
  { kind: 'self', a: { grad: 1_000_000 } }, { kind: 'disabled', a: { special: 2_000_000 } },
  { kind: 'preschool', a: { academy: 100_000 } }, { kind: 'school', a: { uniform: 700_000 } }, { kind: 'univ', a: { tuition: 10_000_000 } },
]), { es: 3_000_000, esc: 600_000, eu: 10_000_000 })

// ── EXAMPLES (page.tsx 본문·FAQ에 찍히는 숫자) ──
{ // 기본값: 연봉 5,000만, 초2 예체능 360만 → 300만 × 15% = 45만, 지방소득세 포함 49.5만
  const r = analyze(EXAMPLES.d.salary, EXAMPLES.d.people)
  assert.deepEqual([r.spent, r.eligible, r.over, r.credit, r.saving, r.status, r.rows[0].room], [3_600_000, 3_000_000, 600_000, 450_000, 495_000, 'full', 0])
}
{ // 연봉 6,000만, 중학생 180 + 교복 60(→50) + 수학여행 40(→30) = 260만, 남은 한도 40만 → 66,000원 더
  const r = analyze(EXAMPLES.mid.salary, EXAMPLES.mid.people)
  assert.deepEqual([r.spent, r.eligible, r.credit, r.saving, r.rows[0].room, r.rows[0].more], [2_800_000, 2_600_000, 390_000, 429_000, 400_000, 66_000])
}
{ // 연봉 8,000만, 대학생 등록금 1,000만 → 900만 × 15%
  const r = analyze(EXAMPLES.univ.salary, EXAMPLES.univ.people)
  assert.deepEqual([r.eligible, r.over, r.credit, r.saving, r.status], [9_000_000, 1_000_000, 1_350_000, 1_485_000, 'full'])
}
{ // 결정세액 한도: 연봉 2,500만, 본인 대학원 800만 → 공제 120만이지만 낼 세금이 252,381원
  const r = analyze(EXAMPLES.low.salary, EXAMPLES.low.people)
  assert.deepEqual([r.credit, r.saving, r.tax, r.status], [1_200_000, 252_381, 252_381, 'partial'])
}

console.log('check-education-tax-credit OK')
