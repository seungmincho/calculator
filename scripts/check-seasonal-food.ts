// node scripts/check-seasonal-food.ts [i18n.json] (Node 24) — 이달의 제철 음식 데이터·번역 체크
// 인자를 주면 {"ko": {...}, "en": {...}} 파일을, 없으면 messages/ko.json·en.json 의 seasonalFood 를 본다.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CATEGORIES, FOODS, MONTHS, MOF_PICKS, SOURCES, foodsInMonth, monthRuns } from '../src/utils/seasonalFood.ts'

const MIN_PER_CATEGORY = 2

// 데이터
const ids = FOODS.map((f) => f.id)
assert.equal(new Set(ids).size, ids.length, 'id 중복')
const srcKeys = new Set<string>(SOURCES.map(([k]) => k))
for (const f of FOODS) {
  assert.ok(f.months.length > 0, `${f.id}: 제철 달 없음`)
  assert.equal(new Set(f.months).size, f.months.length, `${f.id}: 달 중복`)
  for (const m of f.months) assert.ok(Number.isInteger(m) && m >= 1 && m <= 12, `${f.id}: 달 범위 ${m}`)
  assert.ok(f.src.length > 0 && f.src.every((s) => srcKeys.has(s)), `${f.id}: source 키`)
}
for (const m of MONTHS) {
  for (const c of CATEGORIES) {
    const n = foodsInMonth(m, c).length
    assert.ok(n >= MIN_PER_CATEGORY, `${m}월 ${c} ${n}개 < ${MIN_PER_CATEGORY}`)
  }
}
for (const m of MONTHS) {
  const p = MOF_PICKS[m]
  assert.ok(p, `${m}월 해수부 선정 없음`)
  for (const id of p.ids) {
    const f = FOODS.find((x) => x.id === id)
    assert.ok(f && f.category === 'seafood' && f.months.includes(m), `${m}월 해수부 선정 ${id} 가 그 달 수산물에 없음`)
  }
}

// 구간 표시
assert.deepEqual(monthRuns([11, 12, 1, 2]), [[11, 2]])
assert.deepEqual(monthRuns([12, 1, 2, 3, 5]), [[12, 3], [5, 5]])
assert.deepEqual(monthRuns([4, 12]), [[4, 4], [12, 12]])
assert.deepEqual(monthRuns([5, 9, 10]), [[5, 5], [9, 10]])
assert.deepEqual(monthRuns(MONTHS), [[1, 12]])
assert.deepEqual(monthRuns([1]), [[1, 1]])

// 번역
type Ns = Record<string, unknown> & { items: Record<string, Record<string, string>> }
const arg = process.argv[2]
const load = (lang: 'ko' | 'en'): Ns =>
  arg ? JSON.parse(fs.readFileSync(arg, 'utf8'))[lang] : JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')).seasonalFood
const ko = load('ko'), en = load('en')
assert.ok(ko && en, 'seasonalFood 네임스페이스 없음')

for (const f of FOODS) {
  for (const [lang, ns] of [['ko', ko], ['en', en]] as const) {
    const it = ns.items[f.id]
    assert.ok(it?.name && it?.dish, `${lang} items.${f.id}.name/dish`)
    if (f.category !== 'seafood') assert.ok(it.pick && it.keep, `${lang} items.${f.id}.pick/keep`)
  }
  for (const k of ['pick', 'keep']) assert.equal(!!ko.items[f.id][k], !!en.items[f.id][k], `items.${f.id}.${k} ko·en 짝`)
}
assert.deepEqual(Object.keys(ko.items).sort(), [...ids].sort(), 'ko items 에 데이터에 없는 품목')

// ko·en 구조 같음(키·배열 길이), 근거·해수부 문구 키
const shape = (o: unknown): unknown => Array.isArray(o) ? o.map(shape)
  : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)]).sort()) : typeof o
assert.deepEqual(shape({ ...en, items: 0 }), shape({ ...ko, items: 0 }), 'ko·en 키 구조(items 제외)')
const g = ko.guide as { sources: { items: Record<string, string> }; faq: { items: { q: string; a: string }[] } }
for (const [k] of SOURCES) assert.ok(g.sources.items[k], `guide.sources.items.${k}`)
for (const m of MONTHS) assert.ok((ko.mofPick as Record<string, string>)[`m${m}`], `mofPick.m${m}`)
assert.ok(g.faq.items.every((x) => x.q && x.a), 'faq {q,a}')
assert.equal((ko.monthNames as string[]).length, 12)

const per = MONTHS.map((m) => `${m}월 ${CATEGORIES.map((c) => foodsInMonth(m, c).length).join('/')}`)
console.log(`ok — 품목 ${FOODS.length}개 (${CATEGORIES.map((c) => `${c} ${FOODS.filter((f) => f.category === c).length}`).join(', ')})`)
console.log(`달별 채소/과일/수산물: ${per.join(', ')}`)
