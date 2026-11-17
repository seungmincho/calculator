import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bestSum, gradeOf, type Grades } from '../src/utils/csatGrade.ts'
import { type CsatScoreSnapshot } from '../src/utils/csatScoreRecords.ts'
import {
  CSAT_GOALS_KEY, CSAT_GOAL_MAX_BYTES, deleteCsatGoal, evaluateCsatGoal, isCsatGoalCondition,
  parseCsatGoals, readCsatGoals, saveCsatGoal, withCsatGoalsLock, writeCsatGoals,
  type CsatGoalStore,
} from '../src/utils/csatGoals.ts'

let checks = 0
function check(name: string, run: () => void) { if (process.argv[2] && !name.includes(process.argv[2])) return; run(); checks++; console.log(`PASS ${name}`) }
const snapshot: CsatScoreSnapshot = { examYear: 2027, referenceYear: 2026, scores: { kor: '84', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41' }, selection: { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics' } }
const condition = { areas: 3 as const, maxSum: 7 }
const empty: CsatGoalStore = { version: 1, revision: 'empty', goals: [] }
const date = '2026-11-17T00:00:00.000Z'
const seeded = saveCsatGoal(empty, { name: '  연습 목표  ', ...condition }, 'goal-1', 'rev-1', date)
const raw = JSON.stringify(seeded)
class MemoryStorage {
  raw: string | null = null
  writes = 0
  getItem(key: string) { assert.equal(key, CSAT_GOALS_KEY); return this.raw }
  setItem(key: string, value: string) { assert.equal(key, CSAT_GOALS_KEY); this.raw = value; this.writes++ }
}

check('all valid input results match the existing bestSum formula for 2/3/4 areas', () => {
  const grades: Grades = { kor: gradeOf('korLm', 84), math: gradeOf('mathProb', 80), eng: gradeOf('english', 85), hist: 1, inq1: gradeOf('society', 44), inq2: gradeOf('ethics', 41) }
  for (const areas of [2, 3, 4]) {
    const result = evaluateCsatGoal(snapshot, { areas, maxSum: areas * 9 })
    assert.equal(result.sum, bestSum(grades, areas)); assert.equal(result.used.length, areas)
    assert.equal(result.available.length, 4); assert.equal(result.status, 'within')
    assert.equal(result.used.reduce((sum, item) => sum + item.grade, 0), result.sum)
  }
})
check('all 32 missing-input combinations distinguish required area counts and explicit zero', () => {
  const fields = ['kor', 'math', 'eng', 'inq1', 'inq2'] as const
  for (let mask = 0; mask < 32; mask++) {
    const current = structuredClone(snapshot)
    fields.forEach((field, index) => { current.scores[field] = mask & (1 << index) ? '0' : '' })
    const count = Number(!!(mask & 1)) + Number(!!(mask & 2)) + Number(!!(mask & 4)) + Number(!!(mask & 24))
    for (const areas of [2, 3, 4]) {
      const result = evaluateCsatGoal(current, { areas, maxSum: areas * 9 })
      assert.equal(result.available.length, count)
      assert.equal(result.status, count < areas ? 'needsInput' : 'within')
      assert.equal(result.sum, count < areas ? null : areas * 9)
      assert.equal(result.used.length, Math.min(count, areas))
    }
  }
})
check('all blank input cannot show within or over even with a loose maximum', () => {
  const current = structuredClone(snapshot)
  Object.keys(current.scores).forEach(key => { current.scores[key as keyof typeof current.scores] = '' })
  const result = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
  assert.equal(result.status, 'needsInput'); assert.equal(result.sum, null); assert.equal(result.over, null)
})
check('Korean History never supplies an area or changes the goal sum', () => {
  const current = structuredClone(snapshot); current.scores.hist = ''
  assert.deepEqual(evaluateCsatGoal(current, condition), evaluateCsatGoal(snapshot, condition))
  current.scores.kor = ''; current.scores.math = ''; current.scores.eng = ''; current.scores.inq1 = ''; current.scores.inq2 = ''; current.scores.hist = '50'
  assert.equal(evaluateCsatGoal(current, condition).available.length, 0)
})
check('one valid Inquiry subject supplies one named area, never two', () => {
  const current = structuredClone(snapshot); current.scores.inq1 = ''
  const result = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
  assert.equal(result.available.length, 4); assert.equal(result.singleInquiry?.subject, 'ethics')
  assert.equal(result.used.filter(area => area.id === 'inq').length, 1)
  assert.equal(result.used.find(area => area.id === 'inq')?.field, 'inq2')
})
check('two Inquiry subjects choose the better grade and expose the actual chosen subject', () => {
  const current = structuredClone(snapshot); current.scores.inq1 = '0'; current.scores.inq2 = '50'
  const result = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
  assert.equal(result.used.find(area => area.id === 'inq')?.subject, 'ethics')
  assert.equal(result.used.find(area => area.id === 'inq')?.grade, 1)
})
check('duplicate Inquiry with equal numeric strings counts once, including leading zeros', () => {
  const current = structuredClone(snapshot); current.selection.inq2 = 'society'; current.scores.inq1 = '044'; current.scores.inq2 = '44'
  const result = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
  assert.equal(result.duplicateInquiry, true); assert.equal(result.inquiryConflict, false)
  assert.equal(result.available.length, 4); assert.equal(result.singleInquiry?.subject, 'society')
})
check('duplicate Inquiry with different scores is excluded even if grades happen to match', () => {
  const current = structuredClone(snapshot); current.selection.inq2 = 'society'; current.scores.inq1 = '44'; current.scores.inq2 = '45'
  const four = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
  assert.equal(four.inquiryConflict, true); assert.equal(four.available.length, 3)
  assert.equal(four.status, 'needsInput'); assert.equal(four.sum, null)
  const three = evaluateCsatGoal(current, condition)
  assert.notEqual(three.status, 'needsInput'); assert.ok(three.used.every(area => area.id !== 'inq'))
})
check('a duplicate subject with only one nonblank valid score remains one valid area', () => {
  const current = structuredClone(snapshot); current.selection.inq2 = 'society'; current.scores.inq2 = ''
  const result = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
  assert.equal(result.inquiryConflict, false); assert.equal(result.available.length, 4)
  assert.equal(result.singleInquiry?.field, 'inq1')
})
check('invalid scores and unsupported electives are excluded instead of clamped', () => {
  for (const value of ['101', '-1', '90.1', '1e2', ' 90', 'NaN']) {
    const current = structuredClone(snapshot); current.scores.kor = value
    const result = evaluateCsatGoal(current, { areas: 4, maxSum: 36 })
    assert.equal(result.status, 'needsInput'); assert.deepEqual(result.invalidFields, ['kor'])
  }
  const current = structuredClone(snapshot); Object.assign(current.selection, { kor: 'unknown', math: 'unknown', inq1: 'unknown' })
  assert.deepEqual(evaluateCsatGoal(current, condition).invalidFields, ['kor', 'math', 'inq1'])
  const wrongArea = structuredClone(snapshot); wrongArea.selection.inq1 = 'english'; wrongArea.selection.inq2 = 'korLm'
  const result = evaluateCsatGoal(wrongArea, { areas: 4, maxSum: 36 })
  assert.deepEqual(result.invalidFields, ['inq1', 'inq2'])
  assert.equal(result.status, 'needsInput'); assert.equal(result.available.length, 3)
})
check('partial input can compare only its valid areas and lists exactly those used', () => {
  const current = structuredClone(snapshot); current.scores.kor = ''; current.scores.inq1 = ''; current.scores.inq2 = ''
  const result = evaluateCsatGoal(current, { areas: 2, maxSum: 18 })
  assert.equal(result.status, 'within'); assert.deepEqual(result.used.map(area => area.id).sort(), ['eng', 'math'])
  assert.equal(result.available.length, 2)
})
check('inclusive target boundary and over amount agree with the computed sum', () => {
  const sum = evaluateCsatGoal(snapshot, condition).sum!
  assert.equal(evaluateCsatGoal(snapshot, { areas: 3, maxSum: sum }).status, 'within')
  const over = evaluateCsatGoal(snapshot, { areas: 3, maxSum: sum - 1 })
  assert.equal(over.status, 'over'); assert.equal(over.over, 1)
})
check('condition range, integer and type validation applies before evaluation', () => {
  for (const value of [{ areas: 1, maxSum: 1 }, { areas: 5, maxSum: 20 }, { areas: 3, maxSum: 2 }, { areas: 3, maxSum: 28 }, { areas: 3, maxSum: 7.5 }, { areas: 3, maxSum: NaN }]) {
    assert.equal(isCsatGoalCondition(value), false)
    const result = evaluateCsatGoal(snapshot, value)
    assert.equal(result.status, 'invalidCondition'); assert.equal(result.sum, null)
  }
  assert.equal(isCsatGoalCondition({ areas: '3', maxSum: 7 }), false)
  for (const areas of [2, 3, 4]) for (const maxSum of [areas, areas * 9]) assert.ok(isCsatGoalCondition({ areas, maxSum }))
})
check('stored and one-off condition objects produce identical evaluations', () => {
  for (const scores of [snapshot.scores, { ...snapshot.scores, kor: '', eng: '' }]) {
    const current = { ...snapshot, scores }
    assert.deepEqual(evaluateCsatGoal(current, seeded.goals[0]), evaluateCsatGoal(current, condition))
  }
})
check('save trims a name and round trips a condition without score data', () => {
  const parsed = parseCsatGoals(raw); assert.ok(parsed.ok)
  assert.deepEqual(parsed.store, seeded); assert.equal(parsed.store.goals[0].name, '연습 목표')
  assert.equal('scores' in parsed.store.goals[0], false)
})
check('editing preserves ID, position and createdAt without mutating the source', () => {
  const next = saveCsatGoal(seeded, { name: '수정', areas: 2, maxSum: 4 }, 'goal-1', 'revision-2', '2026-11-17T00:01:00.000Z', true)
  assert.equal(next.goals[0].id, 'goal-1'); assert.equal(next.goals[0].createdAt, date)
  assert.equal(next.goals[0].updatedAt, '2026-11-17T00:01:00.000Z'); assert.equal(next.goals[0].maxSum, 4)
  assert.equal(seeded.goals[0].maxSum, 7)
  assert.throws(() => saveCsatGoal(seeded, { name: 'missing', ...condition }, 'missing', 'r', date, true), /missing/)
})
check('six goals and 40-character names work; a seventh fails but edits still work', () => {
  let store = empty
  for (let i = 0; i < 6; i++) store = saveCsatGoal(store, { name: '가'.repeat(40), ...condition }, `g${i}`, `r${i}`, date)
  assert.ok(parseCsatGoals(JSON.stringify(store)).ok)
  assert.throws(() => saveCsatGoal(store, { name: 'extra', ...condition }, 'extra', 'r', date), /limit/)
  assert.equal(saveCsatGoal(store, { name: 'edit', areas: 4, maxSum: 20 }, 'g0', 'edited', date, true).goals.length, 6)
})
check('deletion is isolated and refuses a missing target', () => {
  assert.equal(deleteCsatGoal(seeded, 'goal-1', 'gone').goals.length, 0)
  assert.equal(seeded.goals.length, 1); assert.throws(() => deleteCsatGoal(seeded, 'other', 'gone'), /missing/)
})
check('strict schema rejects corrupt, unknown fields and unsupported versions intact', () => {
  assert.ok(parseCsatGoals(null).ok)
  for (const value of ['null', '[]', '{}', '{', '{"version":1,"revision":"r","goals":null}']) assert.equal(parseCsatGoals(value).ok, false)
  assert.deepEqual(parseCsatGoals('{"version":2}'), { ok: false, error: 'unsupported' })
  const changes: ((store: CsatGoalStore) => void)[] = [value => { value.goals.push(value.goals[0]) }, value => { value.goals[0].maxSum = 28 }, value => { value.goals[0].name = 'x'.repeat(41) }, value => { value.goals[0].name = ' x ' }, value => { value.goals[0].id = 'x\n' }, value => { value.revision = '' }, value => { value.goals[0].updatedAt = '2026-02-30T00:00:00.000Z' }, value => { Object.assign(value.goals[0], { scores: {} }) }, value => { Object.assign(value, { extra: true }) }]
  for (const change of changes) { const copy = structuredClone(seeded); change(copy); assert.equal(parseCsatGoals(JSON.stringify(copy)).ok, false) }
})
check('UTF-8 byte size is bounded before parsing', () => {
  assert.deepEqual(parseCsatGoals('x'.repeat(CSAT_GOAL_MAX_BYTES + 1)), { ok: false, error: 'oversized' })
  assert.deepEqual(parseCsatGoals('가'.repeat(11000)), { ok: false, error: 'oversized' })
})
check('verified writes use the separate target key and stale views cannot overwrite', () => {
  const storage = new MemoryStorage()
  assert.deepEqual(writeCsatGoals(storage, null, seeded), { ok: true, raw })
  assert.deepEqual(writeCsatGoals(storage, null, empty), { ok: false, error: 'conflict' })
  assert.equal(storage.writes, 1); assert.ok(readCsatGoals(storage).ok)
})
check('corrupt original data, denied reads and quota never report success', () => {
  const storage = new MemoryStorage(); storage.raw = 'null'
  assert.equal(writeCsatGoals(storage, 'null', seeded).ok, false); assert.equal(storage.writes, 0)
  assert.deepEqual(readCsatGoals({ getItem() { throw new Error('denied') } }), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeCsatGoals({ getItem: () => null, setItem() { throw Object.assign(new Error(), { name: 'QuotaExceededError' }) } }, null, seeded), { ok: false, error: 'quota' })
})
check('readback exception or mismatch reports uncertain persistence without rollback', () => {
  let stored: string | null = null
  assert.deepEqual(writeCsatGoals({ getItem() { if (stored) throw new Error('readback'); return null }, setItem(_key, value) { stored = value } }, null, seeded), { ok: false, error: 'unverified' })
  assert.equal(stored, raw)
  let reads = 0
  assert.deepEqual(writeCsatGoals({ getItem: () => ++reads === 1 ? null : 'other', setItem() {} }, null, seeded), { ok: false, error: 'unverified' })
})
check('Korean/English goal patches have matching keys and interpolation arguments', () => {
  const patch = JSON.parse(readFileSync('docs/verify/2026-11-17-repeat-batch17/translations-csat-goals.json', 'utf8'))
  const flatten = (value: unknown, path = ''): [string, unknown][] => value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value).flatMap(([key, child]) => flatten(child, `${path}.${key}`)) : [[path, value]]
  const ko = flatten(patch.ko), en = new Map(flatten(patch.en))
  assert.deepEqual(ko.map(([key]) => key).sort(), [...en.keys()].sort())
  for (const [key, value] of ko) {
    const vars = (text: unknown) => [...String(text).matchAll(/\{([A-Za-z]+)\}/g)].map(match => match[1]).sort()
    assert.deepEqual(vars(value), vars(en.get(key)), key)
  }
})
assert.equal(await withCsatGoalsLock(() => 'fallback'), 'fallback')
console.log(`CSAT goal checks: ${checks} passed`)
