// 위임장 검사 회귀 체크: node scripts/check-power-of-attorney.ts
import assert from 'node:assert/strict'
import { checkPoa, matterList, MATTERS, PURPOSES, type PoaInput } from '../src/utils/powerOfAttorney.ts'

const base: PoaInput = { purpose: 'resident', items: [MATTERS.resident[0]], extra: '', periodMode: 'range', from: '2026-10-01', to: '2026-10-31', target: '' }
const c = (p: Partial<PoaInput>) => checkPoa({ ...base, ...p })

assert.deepEqual(c({}), [])
assert.deepEqual(matterList(['a'], ' b \n\n c'), ['a', 'b', 'c'])
assert.ok(c({ items: [], extra: '  \n ' }).includes('noMatters'))
assert.ok(!c({ items: [], extra: '서류 수령' }).includes('noMatters'))
assert.ok(c({ to: '2026-09-30' }).includes('periodOrder'))
assert.ok(!c({ periodMode: 'done', to: '2026-09-30' }).includes('periodOrder'))
// 인감: 공식 서식 안내 항상, 6개월 초과 경고 (2026-10-01 + 6개월 = 2027-04-01 까지 OK)
assert.ok(c({ purpose: 'seal' }).includes('sealForm'))
assert.ok(!c({ purpose: 'seal', to: '2027-04-01' }).includes('sealOver6m'))
assert.ok(c({ purpose: 'seal', to: '2027-04-02' }).includes('sealOver6m'))
assert.ok(c({ to: '2027-10-02' }).includes('periodLong'))
assert.ok(!c({ to: '2027-10-01' }).includes('periodLong'))
// 포괄 위임 표현
assert.ok(c({ extra: '재산에 관한 일체의 행위' }).includes('broad'))
assert.ok(c({ target: '모든 재산' }).includes('broad'))
// 대상 비어 있음 (부동산·은행·자동차)
assert.ok(c({ purpose: 'realty', items: [MATTERS.realty[0]] }).includes('noTarget'))
assert.ok(!c({ purpose: 'realty', items: [MATTERS.realty[0]], target: '서울시 ○○구 ○○동 1-1' }).includes('noTarget'))
// 직접 입력 외에는 기본 체크 항목이 있어야 함
for (const p of PURPOSES) if (p !== 'custom') assert.ok(MATTERS[p].length > 0, p)

console.log('check-power-of-attorney: OK')
