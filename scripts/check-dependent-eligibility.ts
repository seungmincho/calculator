// 피부양자 자격 판정 회귀 체크: node scripts/check-dependent-eligibility.ts
import assert from 'node:assert/strict'
import { DEP, asks, support, businessTest, propertyTest, judge, dataYears, type DependentInput } from '../src/utils/dependentEligibility.ts'

const base: DependentInput = {
  relation: 'parent', together: true, age: 70, disabled: false, marital: 'single', blocker: false, kidsIncome: false,
  business: 0, bizRegistered: false, housingRental: false, financial: 0, pension: 0, wage: 0, other: 0, propertyTaxBase: 0,
}
const j = (p: Partial<DependentInput>) => judge({ ...base, ...p })

// 소득 합계 2천만원 '이하' (별표 1의2 1.가)
assert.equal(j({ pension: 20_000_000 }).eligible, true, '정확히 2천만 = 충족')
assert.equal(j({ pension: 20_000_001 }).income.totalOk, false, '2천만 1원 초과 = 탈락')
assert.equal(j({ pension: 12_000_000, wage: 5_000_000, other: 3_000_000 }).income.total, 20_000_000, '유형별 합산')
assert.equal(j({ pension: 12_000_000, wage: 5_000_000, other: 3_000_001 }).eligible, false, '합산 2천만 초과')
assert.equal(j({ pension: 15_000_000 }).room, 5_000_000, '여유 500만')

// 사업소득 (1.나): 원칙 없음, 예외 대상은 500만 이하
assert.deepEqual(businessTest(0, true, false, false), { ok: true, reason: 'none' }, '사업소득 0')
assert.deepEqual(businessTest(1, true, false, false), { ok: false, reason: 'registered' }, '사업자등록 + 1원')
assert.deepEqual(businessTest(5_000_000, false, false, false), { ok: true, reason: 'small' }, '미등록 500만 이하')
assert.deepEqual(businessTest(5_000_001, false, false, false), { ok: false, reason: 'over' }, '미등록 500만 초과')
assert.deepEqual(businessTest(1_000_000, false, true, false), { ok: false, reason: 'housingRental' }, '주택임대소득은 미등록 예외 없음')
assert.deepEqual(businessTest(5_000_000, true, true, true), { ok: true, reason: 'small' }, '장애·상이는 등록·주택임대와 무관하게 500만')
assert.deepEqual(businessTest(5_000_001, true, false, true), { ok: false, reason: 'over' }, '장애·상이도 500만 초과는 탈락')
assert.equal(j({ business: 3_000_000, bizRegistered: true }).eligible, false, '등록 사업자는 소액도 탈락')

// 재산 (2.가): 5.4억 이하 / 5.4억 초과~9억 이하 + 소득 1천만 이하 / 9억 초과
assert.deepEqual(propertyTest('parent', 540_000_000, 19_000_000), { ok: true, band: 'low' }, '정확히 5.4억 = 소득 무관')
assert.deepEqual(propertyTest('parent', 540_000_001, 10_000_000), { ok: true, band: 'mid' }, '5.4억 초과 + 소득 정확히 1천만')
assert.deepEqual(propertyTest('parent', 540_000_001, 10_000_001), { ok: false, band: 'mid' }, '5.4억 초과 + 소득 1천만 초과')
assert.deepEqual(propertyTest('parent', 900_000_000, 0), { ok: true, band: 'mid' }, '정확히 9억 + 소득 0')
assert.deepEqual(propertyTest('parent', 900_000_001, 0), { ok: false, band: 'high' }, '9억 초과 = 소득 무관 탈락')
assert.equal(j({ propertyTaxBase: 600_000_000, pension: 10_000_000 }).room, 0, '중간 구간 여유는 1천만 기준')
assert.ok(Number.isNaN(j({ propertyTaxBase: 1_000_000_000 }).room), '9억 초과면 여유 없음')

// 형제자매 (별표 1 10호 + 별표 1의2 2.나)
const sib = (p: Partial<DependentInput>) => j({ relation: 'sibling', marital: 'single', ...p })
assert.equal(sib({ age: 29 }).support.ok, true, '만 29세')
assert.equal(sib({ age: 30 }).support.reason, 'siblingStatus', '만 30세는 대상 아님')
assert.equal(sib({ age: 64 }).support.ok, false, '만 64세')
assert.equal(sib({ age: 65 }).support.ok, true, '만 65세')
assert.equal(sib({ age: 45, disabled: true }).support.ok, true, '장애·상이면 나이 무관')
assert.equal(sib({ age: Number.NaN }).support.ok, false, '나이 미입력은 연령 요건 미충족')
assert.equal(sib({ age: 70, marital: 'married' }).support.reason, 'married', '기혼 형제자매')
assert.equal(sib({ age: 70, blocker: true }).support.reason, 'earner', '부모 등에 보수·소득')
assert.equal(sib({ age: 70, marital: 'divorced', kidsIncome: true }).support.reason, 'divorcedKids', '이혼·사별 + 자녀 소득')
assert.equal(sib({ age: 70, marital: 'divorced' }).support.reason, 'divorcedOk', '이혼·사별 + 자녀 소득 없음')
assert.deepEqual(sib({ age: 70, propertyTaxBase: 180_000_000 }).property, { ok: true, band: 'sibling' }, '형제자매 정확히 1.8억')
assert.equal(sib({ age: 70, propertyTaxBase: 180_000_001 }).property.ok, false, '형제자매 1.8억 초과')
assert.equal(sib({ age: 70, propertyTaxBase: 180_000_001, pension: 0 }).eligible, false, '형제자매는 1천만 예외 없음')

// 부양요건 관계별 (별표 1)
const s = (p: Partial<DependentInput>) => support({ ...base, ...p })
assert.equal(s({ relation: 'spouse', together: false }).ok, true, '배우자 비동거')
assert.equal(s({ relation: 'parent', together: false }).ok, true, '부모 비동거, 동거 형제자매 소득 없음')
assert.equal(s({ relation: 'parent', together: false, blocker: true }).ok, false, '부모 비동거, 동거 형제자매 소득 있음')
assert.equal(s({ relation: 'grandparent', together: true, blocker: true }).ok, true, '조부모 동거는 무조건')
assert.equal(s({ relation: 'child', together: true, marital: 'married' }).ok, true, '자녀 동거는 기혼도 인정')
assert.equal(s({ relation: 'child', together: false, marital: 'married' }).ok, false, '자녀 비동거 기혼')
assert.equal(s({ relation: 'child', together: false, marital: 'single' }).ok, true, '자녀 비동거 미혼')
assert.equal(s({ relation: 'stepchild', together: false }).reason, 'apart', '배우자의 자녀 비동거 불인정')
assert.equal(s({ relation: 'stepchild', together: true, marital: 'married' }).ok, false, '배우자의 자녀 동거 기혼')
assert.equal(s({ relation: 'grandchild', together: true, blocker: true }).ok, false, '손자녀 동거, 부모 소득 있음')
assert.equal(s({ relation: 'grandchild', together: false, blocker: true }).reason, 'parentsAlive', '손자녀 비동거, 부모 있음')
assert.equal(s({ relation: 'grandchild', together: false }).reason, 'noParents', '손자녀 비동거, 부모 없음 미혼')
assert.equal(s({ relation: 'childSpouse', together: false }).ok, false, '며느리·사위 비동거')
assert.equal(s({ relation: 'childSpouse', together: true }).ok, true, '며느리·사위 동거')
assert.equal(s({ relation: 'other' }).reason, 'other', '그 밖의 친척')

// 질문 노출
assert.deepEqual(asks('parent', true), { age: false, marital: false, blocker: null }, '부모 동거')
assert.deepEqual(asks('parent', false), { age: false, marital: false, blocker: 'parentApart' }, '부모 비동거')
assert.deepEqual(asks('sibling', false), { age: true, marital: true, blocker: 'siblingApart' }, '형제자매 비동거')
assert.deepEqual(asks('stepchild', true), { age: false, marital: true, blocker: null }, '배우자의 자녀 동거')
assert.deepEqual(asks('child', true), { age: false, marital: false, blocker: null }, '자녀 동거')

// 금융소득 1천만원 이하: 판정엔 넣고, 빼면 결과가 바뀌면 표시 (확인 필요)
assert.equal(j({ pension: 19_000_000, financial: 2_000_000 }).eligible, false, '금융 포함 2,100만 = 탈락')
assert.equal(j({ pension: 19_000_000, financial: 2_000_000 }).financialUncertain, true, '금융 빼면 충족 → 확인 필요')
assert.equal(j({ pension: 10_000_000, financial: 2_000_000 }).financialUncertain, false, '어느 쪽이든 충족')
assert.equal(j({ pension: 19_000_000, financial: 10_000_001 }).financialUncertain, false, '1천만 초과는 전액 반영(대상 아님)')
assert.equal(j({ propertyTaxBase: 600_000_000, pension: 9_000_000, financial: DEP.financialExclusion }).financialUncertain, true, '재산 중간 구간도 영향')

// 자료 반영 시기 (시행령 제41조③, 공단 정관 제43조의4)
assert.deepEqual(dataYears(2026, 11), { income: 2025, pension: 2025, property: 2026 }, '11월: 전년도 소득·올해 6/1 재산')
assert.deepEqual(dataYears(2026, 12), { income: 2025, pension: 2025, property: 2026 }, '12월')
assert.deepEqual(dataYears(2027, 1), { income: 2025, pension: 2026, property: 2026 }, '1월: 전전년도 소득·연금 전년도')
assert.deepEqual(dataYears(2027, 10), { income: 2025, pension: 2026, property: 2026 }, '10월')

console.log('check-dependent-eligibility: OK')
