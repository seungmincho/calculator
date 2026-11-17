import assert from 'node:assert/strict'
import { measuredSegments, parseRehearsals, sameRehearsalPlan } from '../src/utils/rehearsal.ts'
import { parseTextHandoff, TEXT_HANDOFF_LIMIT } from '../src/utils/textHandoff.ts'
import { excludedMeals, parseMealHistory, dateNumber } from '../src/utils/mealHistory.ts'
assert.deepEqual(measuredSegments(3, [1000, 2600], 4000), [1000, 1600, 1400])
assert.deepEqual(measuredSegments(3, [], 2200), [2200, null, null])
assert.throws(() => measuredSegments(3, [3000, 1000], 4000))
const plan = [{ name: '도입', sec: 30 }, { name: '본론', sec: 60 }]
const record = { id: 'one', title: '연습', createdAt: 1, segments: plan, actualMs: [1200, null], totalMs: 1200 }
assert.deepEqual(parseRehearsals(JSON.stringify([record])), [record])
assert.throws(() => parseRehearsals(JSON.stringify([{ ...record, actualMs: [null, 1200] }])))
assert.throws(() => parseRehearsals(JSON.stringify([{ ...record, totalMs: 2400 }])))
assert.throws(() => parseRehearsals(JSON.stringify([record, record])))
assert.ok(sameRehearsalPlan(plan, structuredClone(plan)))
assert.ok(!sameRehearsalPlan(plan, [{ name: '다른 구성', sec: 30 }]))
const handoff = { source: 'ocr', text: '사진에서 읽은 글', createdAt: 10000 }
assert.deepEqual(parseTextHandoff(JSON.stringify(handoff), 10001), handoff)
assert.equal(parseTextHandoff(JSON.stringify(handoff), 610001), null)
assert.equal(parseTextHandoff(JSON.stringify(handoff), 9999), null)
assert.equal(parseTextHandoff(JSON.stringify({ ...handoff, text: '가'.repeat(TEXT_HANDOFF_LIMIT + 1) }), 10001), null)
assert.equal(parseTextHandoff('{bad'), null)
const meals = [{ id: '1', name: '김밥', date: '2026-11-16' }, { id: '2', name: '라면', date: '2026-11-10' }, { id: '3', name: '피자', date: '2026-11-09' }, { id: '4', name: '우동', date: '2026-11-17' }]
assert.deepEqual(excludedMeals(meals, '2026-11-16', 1), ['김밥'])
assert.deepEqual(excludedMeals(meals, '2026-11-16', 7), ['김밥', '라면'])
assert.deepEqual(excludedMeals(meals, '2026-11-17', 1), ['우동'])
assert.deepEqual(excludedMeals(meals, '2026-11-16', 0), [])
assert.equal(dateNumber('2026-02-30'), null)
assert.notEqual(dateNumber('2028-02-29'), null)
assert.throws(() => parseMealHistory(JSON.stringify({ records: [meals[0], { ...meals[0], id: '9' }], excludeDays: 7 })))
assert.throws(() => parseMealHistory(JSON.stringify({ records: [], excludeDays: 90 })))
assert.deepEqual(parseMealHistory(null), { records: [], excludeDays: 1 })
console.log('Rehearsal, text handoff and meal history: 23 checks passed')
