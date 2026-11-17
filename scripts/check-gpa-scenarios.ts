import assert from 'node:assert/strict'
import {
  GPA_AUTOSAVE_KEY, GPA_SCENARIOS_KEY, appendGpaScenario, compareGpaSnapshots,
  isGpaSnapshot, parseGpaAutosave, parseGpaScenarios, readGpaScenarios,
  withGpaStorageLock, writeGpaAutosave, writeGpaScenarios,
  type GpaSnapshot, type GpaScenarioStore,
} from '../src/utils/gpaScenarios.ts'

let count = 0
function check(name: string, action: () => void) { action(); count++; console.log(`PASS ${name}`) }
const snapshot: GpaSnapshot = {
  scale: '4.5', targetGpa: '3.8', remainingCredits: '30',
  semesters: [
    { id: 's1', isExpanded: false, courses: [
      { id: 'old', name: '자료 구조', credits: 3, grade: 'C0', major: true },
      { id: 'pass', name: '체육', credits: 1, grade: 'P' },
      { id: 'np', name: '봉사', credits: 1, grade: 'NP' },
    ] },
    { id: 's2', isExpanded: true, courses: [
      { id: 'retake', name: '자료구조', credits: 3, grade: 'A0', major: true, retake: true },
      { id: 'f', name: '수학', credits: 2, grade: 'F' },
      { id: 'blank', name: '', credits: 3, grade: '' },
    ] },
  ],
}
const empty: GpaScenarioStore = { version: 1, revision: 'empty', scenarios: [] }
const date = '2026-11-16T00:00:00.000Z'
const seeded = appendGpaScenario(empty, snapshot, '  재수강 계획  ', 'plan1', date)
const raw = JSON.stringify(seeded)
class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

check('full snapshot validates', () => assert.equal(isGpaSnapshot(snapshot), true))
check('save trims name and preserves target/collapse/IDs', () => {
  assert.equal(seeded.scenarios[0].name, '재수강 계획')
  assert.deepEqual(seeded.scenarios[0].snapshot, snapshot)
  assert.notEqual(seeded.scenarios[0].snapshot, snapshot)
})
check('round trip preserves all semesters and courses', () => {
  const parsed = parseGpaScenarios(raw)
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.deepEqual(parsed.store, seeded)
})
check('save snapshot is independent of later edits', () => {
  const live = structuredClone(snapshot)
  const saved = appendGpaScenario(empty, live, 'before', 'before', date)
  live.semesters[0].courses[0].grade = 'F'
  assert.equal(saved.scenarios[0].snapshot.semesters[0].courses[0].grade, 'C0')
})
check('retake, P/NP and F share the original calculation', () => {
  const result = compareGpaSnapshots(snapshot, snapshot)
  assert.equal(result.current.gpa, 2.4)
  assert.equal(result.current.majorGpa, 4)
  assert.equal(result.current.earnedCredits, 4)
  assert.equal(result.current.gpaCredits, 5)
  assert.equal(result.gpaDifference, 0)
})
check('same-scale comparison reports current minus saved', () => {
  const improved = structuredClone(snapshot)
  improved.semesters[1].courses[0].grade = 'A+'
  const result = compareGpaSnapshots(improved, snapshot)
  assert.ok(Math.abs(result.gpaDifference! - 0.3) < 1e-10)
  assert.equal(result.majorDifference, 0.5)
})
check('different scale never exposes a GPA difference', () => {
  const other = { ...snapshot, scale: '4.3' as const }
  const result = compareGpaSnapshots(other, snapshot)
  assert.equal(result.sameScale, false)
  assert.equal(result.gpaDifference, null)
  assert.equal(result.majorDifference, null)
  assert.equal(result.creditDifference, 0)
})
check('ungraded inputs show unavailable GPA difference', () => {
  const blank = { ...snapshot, semesters: [{ id: 's', courses: [] }] }
  assert.equal(compareGpaSnapshots(blank, snapshot).gpaDifference, null)
})

const invalid: [string, (copy: GpaSnapshot) => void][] = [
  ['duplicate semester ID', copy => { copy.semesters[1].id = 's1' }],
  ['duplicate course ID', copy => { copy.semesters[1].courses[0].id = 'old' }],
  ['course and semester ID collision', copy => { copy.semesters[0].courses[0].id = 's1' }],
  ['empty ID', copy => { copy.semesters[0].id = '' }],
  ['control character ID', copy => { copy.semesters[0].id = 'x\n' }],
  ['long ID', copy => { copy.semesters[0].id = 'x'.repeat(129) }],
  ['negative credits', copy => { copy.semesters[0].courses[0].credits = -1 }],
  ['excess credits', copy => { copy.semesters[0].courses[0].credits = 31 }],
  ['NaN credits', copy => { copy.semesters[0].courses[0].credits = NaN }],
  ['infinite credits', copy => { copy.semesters[0].courses[0].credits = Infinity }],
  ['unknown grade', copy => { copy.semesters[0].courses[0].grade = 'A++' }],
  ['grade invalid in the stored scale', copy => { copy.semesters[0].courses[0].grade = 'A-' }],
  ['long course name', copy => { copy.semesters[0].courses[0].name = 'x'.repeat(201) }],
  ['negative target', copy => { copy.targetGpa = '-1' }],
  ['invalid target', copy => { copy.targetGpa = 'Infinity' }],
  ['excess target', copy => { copy.targetGpa = '11' }],
  ['negative remaining credits', copy => { copy.remainingCredits = '-30' }],
  ['excess remaining credits', copy => { copy.remainingCredits = '3001' }],
  ['empty semester list', copy => { copy.semesters = [] }],
  ['too many semesters', copy => { copy.semesters = Array.from({ length: 33 }, (_, i) => ({ id: `s${i}`, courses: [] })) }],
  ['too many courses in one semester', copy => { copy.semesters = [{ id: 's', courses: Array.from({ length: 101 }, (_, i) => ({ id: `c${i}`, name: '', credits: 3, grade: '' })) }] }],
  ['too many courses overall', copy => { copy.semesters = Array.from({ length: 11 }, (_, s) => ({ id: `s${s}`, courses: Array.from({ length: 100 }, (_, c) => ({ id: `c${s}-${c}`, name: '', credits: 3, grade: '' })) })) }],
]
for (const [name, mutate] of invalid) check(`reject ${name}`, () => {
  const copy = structuredClone(snapshot)
  mutate(copy)
  assert.equal(isGpaSnapshot(copy), false)
})
for (const [field, value] of [['major', 'true'], ['retake', 1], ['grade', null], ['credits', '3'], ['name', 12]] as const) {
  check(`reject wrong ${field} type`, () => {
    const copy = structuredClone(snapshot)
    Object.assign(copy.semesters[0].courses[0], { [field]: value })
    assert.equal(isGpaSnapshot(copy), false)
  })
}
check('valid 4.3 minus grade accepted', () => {
  const copy = structuredClone(snapshot)
  copy.scale = '4.3'; copy.semesters[0].courses[0].grade = 'A-'
  assert.equal(isGpaSnapshot(copy), true)
})
check('empty numeric goals and zero credits preserved', () => {
  const copy = structuredClone(snapshot)
  copy.targetGpa = ''; copy.remainingCredits = ''; copy.semesters[0].courses[0].credits = 0
  assert.equal(isGpaSnapshot(copy), true)
})
check('name is required', () => assert.throws(() => appendGpaScenario(empty, snapshot, ' ', 'id', date), /name/))
check('40-character name accepted', () => assert.equal(appendGpaScenario(empty, snapshot, '가'.repeat(40), 'id', date).scenarios[0].name.length, 40))
check('41-character name rejected', () => assert.throws(() => appendGpaScenario(empty, snapshot, '가'.repeat(41), 'id', date), /name/))
check('ninth scenario rejected without dropping earlier scenarios', () => {
  let store = empty
  for (let i = 0; i < 8; i++) store = appendGpaScenario(store, snapshot, `plan${i}`, `p${i}`, date)
  assert.throws(() => appendGpaScenario(store, snapshot, 'ninth', 'p9', date), /limit/)
  assert.equal(store.scenarios.length, 8)
})
check('duplicate scenario IDs rejected', () => assert.throws(() => appendGpaScenario(seeded, snapshot, 'same id', 'plan1', date), /invalid/))
check('bad timestamp rejected', () => assert.throws(() => appendGpaScenario(empty, snapshot, 'bad date', 'id', 'bad'), /invalid/))
check('corrupt JSON preserved', () => assert.deepEqual(parseGpaScenarios('{oops'), { ok: false, error: 'corrupt' }))
check('future store version preserved', () => assert.deepEqual(parseGpaScenarios('{"version":2}'), { ok: false, error: 'unsupported' }))
check('malformed version 1 envelope rejected', () => assert.deepEqual(parseGpaScenarios('{"version":1,"scenarios":[]}'), { ok: false, error: 'corrupt' }))
check('any malformed snapshot blocks entire store', () => {
  const bad = structuredClone(seeded)
  bad.scenarios[0].snapshot.semesters[0].courses[0].credits = -1
  assert.deepEqual(parseGpaScenarios(JSON.stringify(bad)), { ok: false, error: 'corrupt' })
})
check('missing store is writable', () => {
  const memory = new MemoryStorage()
  assert.equal(writeGpaScenarios(memory, null, seeded).ok, true)
  assert.equal(memory.getItem(GPA_SCENARIOS_KEY), raw)
})
check('stale tab write does not overwrite newer save', () => {
  const memory = new MemoryStorage(); memory.setItem(GPA_SCENARIOS_KEY, raw)
  assert.deepEqual(writeGpaScenarios(memory, null, empty), { ok: false, error: 'conflict' })
  assert.equal(memory.getItem(GPA_SCENARIOS_KEY), raw)
})
check('stale tab delete does not overwrite newer save', () => {
  const memory = new MemoryStorage(); memory.setItem(GPA_SCENARIOS_KEY, raw)
  const newer = appendGpaScenario(seeded, snapshot, 'newer', 'new', date)
  memory.setItem(GPA_SCENARIOS_KEY, JSON.stringify(newer))
  assert.deepEqual(writeGpaScenarios(memory, raw, empty), { ok: false, error: 'conflict' })
  assert.equal(memory.getItem(GPA_SCENARIOS_KEY), JSON.stringify(newer))
})
check('corrupt originals cannot be overwritten', () => {
  const memory = new MemoryStorage(); memory.setItem(GPA_SCENARIOS_KEY, '{oops')
  assert.deepEqual(writeGpaScenarios(memory, '{oops', seeded), { ok: false, error: 'corrupt' })
  assert.equal(memory.getItem(GPA_SCENARIOS_KEY), '{oops')
})
check('storage denied is visible', () => {
  assert.deepEqual(readGpaScenarios({ getItem() { throw new Error('blocked') } }), { ok: false, error: 'unavailable' })
})
check('quota leaves existing scenarios unchanged', () => {
  const memory = new MemoryStorage(); memory.setItem(GPA_SCENARIOS_KEY, raw)
  const previous = memory.getItem(GPA_SCENARIOS_KEY)
  memory.setItem = () => { const error = new Error('full'); error.name = 'QuotaExceededError'; throw error }
  assert.deepEqual(writeGpaScenarios(memory, raw, empty), { ok: false, error: 'quota' })
  assert.equal(memory.getItem(GPA_SCENARIOS_KEY), previous)
})
check('readback detects a conflicting write', () => {
  const memory = new MemoryStorage()
  memory.setItem = (key) => memory.values.set(key, 'changed immediately')
  assert.deepEqual(writeGpaScenarios(memory, null, seeded), { ok: false, error: 'conflict' })
})
check('legacy autosave fields are restored intact', () => {
  assert.deepEqual(parseGpaAutosave(JSON.stringify(snapshot)), { ok: true, snapshot })
})
check('legacy missing goals receive empty defaults', () => {
  const legacy: Partial<GpaSnapshot> = structuredClone(snapshot)
  delete legacy.targetGpa
  delete legacy.remainingCredits
  const result = parseGpaAutosave(JSON.stringify(legacy))
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.snapshot?.targetGpa, '')
})
check('malformed autosave is not partially normalized', () => {
  const copy = structuredClone(snapshot); copy.semesters[0].courses[0].grade = 'invalid'
  assert.deepEqual(parseGpaAutosave(JSON.stringify(copy)), { ok: false, error: 'corrupt' })
})
check('future autosave preserved', () => assert.deepEqual(parseGpaAutosave('{"version":2}'), { ok: false, error: 'unsupported' }))
check('autosave never replaces damaged input', () => {
  const memory = new MemoryStorage(); memory.setItem(GPA_AUTOSAVE_KEY, '{oops')
  assert.deepEqual(writeGpaAutosave(memory, '{oops', snapshot), { ok: false, error: 'corrupt' })
  assert.equal(memory.getItem(GPA_AUTOSAVE_KEY), '{oops')
})
check('autosave stale tab preserves current browser save', () => {
  const memory = new MemoryStorage(); const saved = JSON.stringify(snapshot); memory.setItem(GPA_AUTOSAVE_KEY, saved)
  assert.deepEqual(writeGpaAutosave(memory, null, snapshot), { ok: false, error: 'conflict' })
  assert.equal(memory.getItem(GPA_AUTOSAVE_KEY), saved)
})
check('scenario save does not mutate personal autosave', () => {
  const memory = new MemoryStorage(); memory.setItem(GPA_AUTOSAVE_KEY, 'my personal grades')
  assert.equal(writeGpaScenarios(memory, null, seeded).ok, true)
  assert.equal(memory.getItem(GPA_AUTOSAVE_KEY), 'my personal grades')
})
check('invalid inputs never overwrite autosave', () => {
  const memory = new MemoryStorage(); const bad = { ...snapshot, targetGpa: 'NaN' }
  assert.deepEqual(writeGpaAutosave(memory, null, bad), { ok: false, error: 'invalid' })
  assert.equal(memory.getItem(GPA_AUTOSAVE_KEY), null)
})
check('autosave successful write returns the exact observed raw', () => {
  const memory = new MemoryStorage()
  const result = writeGpaAutosave(memory, null, snapshot)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(memory.getItem(GPA_AUTOSAVE_KEY), result.raw)
})
assert.equal(await withGpaStorageLock('test', () => 42), 42)
count++
console.log(`${count} GPA scenario checks passed`)
