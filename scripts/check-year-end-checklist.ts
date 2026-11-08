// 연말정산 준비 체크리스트(/year-end-checklist) 항목 정의 검사: node scripts/check-year-end-checklist.ts
import assert from 'node:assert/strict'
import { menuConfig, categoryKeys } from '../src/config/menuConfig.ts'
import { TAX_YEAR, DEADLINE } from '../src/utils/yearEndTax.ts'
import { ITEMS, GROUPS, SITUATIONS, visibleItems, parseSituations } from '../src/utils/yearEndChecklist.ts'

const hrefs = new Set(categoryKeys.flatMap((k) => menuConfig[k].items.map((i) => i.href)))
const ids = ITEMS.map((i) => i.id)

// id 중복 없음, 링크는 menuConfig 에 있는 경로
assert.equal(new Set(ids).size, ids.length, `중복 id: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`)
for (const i of ITEMS) if (i.href) assert.ok(hrefs.has(i.href), `${i.id}: menuConfig 에 없는 href ${i.href}`)
assert.ok(hrefs.has('/year-end-checklist'), '/year-end-checklist 가 menuConfig 에 없음')

// 묶음: 순서 고정, 날짜는 yearEndTax DEADLINE, 모든 묶음에 공통 항목이 하나 이상 (기본 상태에서 빈 묶음 없음)
assert.deepEqual(GROUPS.map((g) => g.id), ['dec', 'jan', 'docs', 'submit'])
assert.equal(GROUPS[0].date, `${TAX_YEAR}-12-31`)
assert.equal(GROUPS[1].date, DEADLINE.simplified)
for (const g of GROUPS) assert.ok(ITEMS.some((i) => i.group === g.id && !i.when), `${g.id}: 공통 항목 없음`)

// 상황 필터
const base = visibleItems([])
assert.ok(base.every((i) => !i.when), '기본 상태에 상황 항목이 섞임')
for (const x of ['pension', 'card', 'download', 'company']) assert.ok(base.some((i) => i.id === x), `기본 상태에 ${x} 없음`)
assert.equal(visibleItems([...SITUATIONS]).length, ITEMS.length, '모든 상황을 켜면 전체 항목')
for (const s of SITUATIONS) {
  const more = visibleItems([s]).filter((i) => i.when)
  assert.ok(more.length > 0, `${s}: 켜도 추가되는 항목 없음`)
  assert.ok(more.every((i) => i.when!.includes(s)), `${s}: 상관없는 항목이 보임`)
}
assert.deepEqual(visibleItems(['rent']).filter((i) => i.when).map((i) => i.id), ['rentHome', 'rentDocs'])
assert.ok(visibleItems(['parents']).some((i) => i.id === 'consent') && !visibleItems(['rent']).some((i) => i.id === 'consent'))

// URL·저장값 파싱: 모르는 값·중복 제거, 정의 순서
assert.deepEqual(parseSituations(['kids', 'x', 'rent', 'rent', 1, null]), ['rent', 'kids'])
assert.deepEqual(parseSituations(''.split('.')), [])

// 조특법 §92 혼인세액공제는 2026.12.31 혼인신고분까지 — 귀속연도를 올리면 연장 여부 확인 후 marriage 항목·문구 수정
assert.ok(TAX_YEAR <= 2026, '혼인세액공제(조특법 §92) 적용기한 확인 필요')

console.log(`ok: 항목 ${ITEMS.length}개(공통 ${base.length}), 상황 ${SITUATIONS.length}개`)
