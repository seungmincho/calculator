import assert from 'node:assert/strict'
import { GPA_BACKUP_FORMAT, GPA_BACKUP_MAX_BYTES, gpaBackupByteLength, mergeGpaScenarioBackup, parseGpaScenarioBackup, previewGpaScenarioBackup, projectGpaScenario, serializeGpaScenarioBackup } from '../src/utils/gpaScenarioBackup.ts'
import { GPA_AUTOSAVE_KEY, GPA_SCENARIOS_KEY, parseGpaScenarios, writeGpaScenarios, type GpaScenario, type GpaScenarioStore } from '../src/utils/gpaScenarios.ts'

let checks = 0
const check = (label: string, run: () => void) => { run(); checks++; console.log(`PASS ${label}`) }
const scenario = (id = 'one'): GpaScenario => ({ id, name: '1학년 예상', createdAt: '2026-11-16T00:00:00.000Z', snapshot: { scale: '4.5', targetGpa: '4.0', remainingCredits: '20', semesters: [{ id: 'semester-one', isExpanded: false, courses: [{ id: 'course-one', name: '수학 한글 😀\n=CMD', credits: 3, grade: 'A+', major: true, retake: false }, { id: 'course-p', name: '실습', credits: 1, grade: 'P' }, { id: 'course-np', name: '운동', credits: 0.5, grade: 'NP' }] }, { id: 'semester-two', courses: [{ id: 'course-retake', name: '수학 한글 😀\n=CMD', credits: 3, grade: 'B+', major: true, retake: true }] }] } })
const store = (scenarios: GpaScenario[] = []): GpaScenarioStore => ({ version: 1, revision: 'rev', scenarios })
const date = new Date('2026-11-16T01:02:03.000Z')
const original = store([scenario()])
const backup = parseGpaScenarioBackup(serializeGpaScenarioBackup(original, date))
check('full data canonical roundtrip', () => assert.deepEqual(backup.scenarios, original.scenarios.map(projectGpaScenario)))
check('format and export time', () => { assert.equal(backup.format, GPA_BACKUP_FORMAT); assert.equal(backup.exportedAt, date.toISOString()) })
check('4.3 grades and goals preserved', () => { const item = scenario(); item.snapshot.scale = '4.3'; item.snapshot.semesters[0].courses[0].grade = 'A-'; assert.equal(parseGpaScenarioBackup(serializeGpaScenarioBackup(store([item]))).scenarios[0].snapshot.semesters[0].courses[0].grade, 'A-') })
check('UTF8 measured instead of JS length', () => assert.equal(gpaBackupByteLength('가😀'), 7))
check('empty saved list exports honestly', () => assert.deepEqual(parseGpaScenarioBackup(serializeGpaScenarioBackup(store())).scenarios, []))
for (const value of [null, [], {}, { ...backup, format: 'other-tool' }, { ...backup, exportedAt: null }, { ...backup, exportedAt: 'not a date' }, { ...backup, scenarios: [backup.scenarios[0], backup.scenarios[0]] }]) check(`reject malformed ${checks}`, () => assert.throws(() => parseGpaScenarioBackup(JSON.stringify(value)), /invalidFile/))
check('future version explicit', () => assert.throws(() => parseGpaScenarioBackup(JSON.stringify({ ...backup, version: 2 })), /unsupported/))
check('corrupt JSON', () => assert.throws(() => parseGpaScenarioBackup('{oops'), /invalidFile/))
check('unknown fields cannot enter imported data', () => {
  const value = JSON.parse(JSON.stringify(backup)); value.extra = { dangerous: true }; value.scenarios[0].extra = 'ignored'; value.scenarios[0].snapshot.extra = 'ignored'; value.scenarios[0].snapshot.semesters[0].extra = 'ignored'; value.scenarios[0].snapshot.semesters[0].courses[0].extra = 'ignored'
  assert.deepEqual(parseGpaScenarioBackup(JSON.stringify(value)), backup)
})
check('malformed nested course rejects whole file', () => { const value = structuredClone(backup); value.scenarios[0].snapshot.semesters[0].courses[0].credits = 31; assert.throws(() => parseGpaScenarioBackup(JSON.stringify(value)), /invalidFile/) })
check('cross-scale invalid grade rejected', () => { const value = structuredClone(backup); value.scenarios[0].snapshot.semesters[0].courses[0].grade = 'A-'; assert.throws(() => parseGpaScenarioBackup(JSON.stringify(value)), /invalidFile/) })
check('duplicate course IDs rejected', () => { const value = structuredClone(backup); value.scenarios[0].snapshot.semesters[1].courses[0].id = 'course-one'; assert.throws(() => parseGpaScenarioBackup(JSON.stringify(value)), /invalidFile/) })
check('equivalent optional booleans compare by meaning', () => { const copy = structuredClone(backup); delete copy.scenarios[0].snapshot.semesters[0].courses[0].retake; assert.equal(previewGpaScenarioBackup(original, copy)[0].status, 'duplicate') })
check('equivalent property order and timestamp compare equal', () => { const item = scenario(); item.createdAt = '2026-11-16T09:00:00+09:00'; const copy = { ...backup, scenarios: [{ snapshot: item.snapshot, createdAt: item.createdAt, name: item.name, id: item.id }] }; assert.equal(previewGpaScenarioBackup(original, copy)[0].status, 'duplicate') })
check('same content new external ID is duplicate', () => { const copy = structuredClone(backup); copy.scenarios[0].id = 'elsewhere'; assert.equal(previewGpaScenarioBackup(original, copy)[0].status, 'duplicate') })
check('changed course content is a conflict', () => { const copy = structuredClone(backup); copy.scenarios[0].snapshot.semesters[0].courses[0].grade = 'C0'; assert.equal(previewGpaScenarioBackup(original, copy)[0].status, 'conflict') })
check('new record default status', () => assert.equal(previewGpaScenarioBackup(store(), backup)[0].status, 'new'))
check('only explicit selection adds data', () => assert.throws(() => mergeGpaScenarioBackup(store(), backup, [], () => 'new'), /selection/))
check('duplicate selections rejected', () => assert.throws(() => mergeGpaScenarioBackup(store(), backup, ['one', 'one'], () => 'new'), /selection/))
check('unknown selection is not silently dropped', () => assert.throws(() => mergeGpaScenarioBackup(store(), backup, ['one', 'missing'], () => 'new'), /selection/))
check('duplicate item cannot be selected', () => assert.throws(() => mergeGpaScenarioBackup(original, backup, ['one'], () => 'new'), /selection/))
const conflict = structuredClone(backup); conflict.scenarios[0].snapshot.targetGpa = '3.5'
let sequence = 0
const merged = mergeGpaScenarioBackup(original, conflict, ['one'], () => `copy-${++sequence}`)
check('conflict copy changes external ID only', () => { assert.equal(merged.scenarios[1].id, 'copy-1'); assert.deepEqual(merged.scenarios[1].snapshot, conflict.scenarios[0].snapshot); assert.deepEqual(merged.scenarios[0], projectGpaScenario(original.scenarios[0])) })
check('repeat import recognizes copied conflict', () => assert.equal(previewGpaScenarioBackup(merged, conflict)[0].status, 'duplicate'))
check('user edit after import is not mistaken for original duplicate', () => { const edited = structuredClone(merged); edited.scenarios[1].snapshot.targetGpa = '2.0'; assert.equal(previewGpaScenarioBackup(edited, conflict)[0].status, 'conflict') })
check('input objects remain unchanged', () => assert.equal(original.scenarios.length, 1))
check('bounded ID collision retries', () => assert.throws(() => mergeGpaScenarioBackup(original, conflict, ['one'], () => 'one'), /invalidFile/))
check('capacity refuses whole import', () => { const full = store(Array.from({ length: 8 }, (_, i) => ({ ...scenario(`saved-${i}`), name: `저장 ${i}` }))); assert.throws(() => mergeGpaScenarioBackup(full, backup, ['one'], () => 'revision'), /limit/); assert.equal(full.scenarios.length, 8) })
check('at capacity allowed', () => { const seven = store(Array.from({ length: 7 }, (_, i) => ({ ...scenario(`saved-${i}`), name: `저장 ${i}` }))); assert.equal(mergeGpaScenarioBackup(seven, backup, ['one'], () => 'revision').scenarios.length, 8) })

const maxItems = Array.from({ length: 8 }, (_, scenarioIndex): GpaScenario => ({
  id: `scenario-${scenarioIndex}`, name: `${scenarioIndex}${'가'.repeat(39)}`, createdAt: date.toISOString(),
  snapshot: { scale: '4.5', targetGpa: '4.5', remainingCredits: '3000', semesters: Array.from({ length: 10 }, (_, semesterIndex) => ({ id: `s${semesterIndex}${'가'.repeat(126)}`, isExpanded: false, courses: Array.from({ length: 100 }, (_, courseIndex) => ({ id: `${semesterIndex}-${courseIndex}${'한'.repeat(122)}`, name: '\u0001'.repeat(200), credits: 30, grade: 'A+', major: true, retake: true })) })) },
}))
check('largest supported 8x1000 courses escaped names/Korean IDs roundtrip', () => {
  const raw = serializeGpaScenarioBackup(store(maxItems), date)
  assert.ok(gpaBackupByteLength(raw) < GPA_BACKUP_MAX_BYTES)
  const result = parseGpaScenarioBackup(raw)
  assert.deepEqual(result.scenarios, maxItems.map(projectGpaScenario))
  console.log(`Maximum-schema fixture: ${gpaBackupByteLength(raw)} bytes`)
})
check('exact UTF8 byte boundary accepted; next byte rejected', () => {
  const shell = JSON.stringify({ ...backup, scenarios: [], padding: '' })
  const exact = shell.replace('"padding":""', `"padding":"${'x'.repeat(GPA_BACKUP_MAX_BYTES - gpaBackupByteLength(shell))}"`)
  assert.equal(gpaBackupByteLength(exact), GPA_BACKUP_MAX_BYTES)
  assert.equal(parseGpaScenarioBackup(exact).scenarios.length, 0)
  assert.throws(() => parseGpaScenarioBackup(exact + ' '), /fileTooLarge/)
})

check('existing write path preserves current autosave', () => {
  const data = new Map([[GPA_SCENARIOS_KEY, JSON.stringify(original)], [GPA_AUTOSAVE_KEY, 'current-input-bytes']])
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  assert.ok(writeGpaScenarios(storage, JSON.stringify(original), merged).ok)
  assert.equal(data.get(GPA_AUTOSAVE_KEY), 'current-input-bytes')
  assert.ok(parseGpaScenarios(data.get(GPA_SCENARIOS_KEY)!).ok)
})
check('stale CAS refuses import', () => { let writes = 0; const result = writeGpaScenarios({ getItem: () => 'newer', setItem() { writes++ } }, JSON.stringify(original), merged); assert.deepEqual(result, { ok: false, error: 'conflict' }); assert.equal(writes, 0) })
check('quota retains original raw and reports failure', () => { const raw = JSON.stringify(original); const error = new Error('full'); error.name = 'QuotaExceededError'; assert.deepEqual(writeGpaScenarios({ getItem: () => raw, setItem() { throw error } }, raw, merged), { ok: false, error: 'quota' }) })
console.log(`GPA scenario backup: ${checks} checks passed`)
