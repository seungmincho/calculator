import assert from 'node:assert/strict'
import {
  GRADE_RECORDS_KEY, GRADE_RECORD_LIMITS, GRADE_ENTRY_YEARS, appendGradeSavedRecord, gradeInputUnits, isGradeRecordSnapshot,
  parseGradeSavedRecords, readGradeSavedRecords, removeGradeSavedRecord, summarizeGradeRecord,
  withGradeRecordLock, writeGradeSavedRecords,
  type GradeRecordSnapshot, type GradeRecordStore,
} from '../src/utils/gradeSavedRecords.ts'

let count = 0
function check(name: string, action: () => void) { action(); count++; console.log(`PASS ${name}`) }
const date = '2026-11-17T01:00:00.000Z'
const empty: GradeRecordStore = { version: 1, revision: 'empty', records: [] }
const snapshot: GradeRecordSnapshot = { entryYear: 2024, system: 9, rows: [
  { name: '같은 과목', units: '4', rank: '1', ties: '7', total: '96' },
  { name: '같은 과목', units: '2.5', rank: '5', ties: '', total: '100' },
  { name: '', units: '', rank: '', ties: '', total: '' },
  { name: '편집 중', units: '-', rank: '0', ties: '1000', total: '1e2' },
] }
const first = appendGradeSavedRecord(empty, snapshot, '  1학기 중간  ', 'one', date)

check('raw strings, duplicate subjects, blank rows and tied rank survive a detached round trip', () => {
  assert.equal(first.records[0].name, '1학기 중간')
  assert.deepEqual(first.records[0].snapshot, snapshot)
  assert.notEqual(first.records[0].snapshot.rows, snapshot.rows)
  const parsed = parseGradeSavedRecords(JSON.stringify(first))
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.deepEqual(parsed.store.records[0].snapshot, snapshot)
  assert.equal(empty.records.length, 0)
  assert.deepEqual(parseGradeSavedRecords(null), { ok: true, raw: null, store: empty })
})

check('summary keeps the existing tie and units rules and excludes unfinished rows', () => {
  assert.deepEqual(summarizeGradeRecord(snapshot), { subjectCount: 4, validCount: 2, units: 6.5 })
  assert.deepEqual(summarizeGradeRecord({ ...snapshot, system: 5 }), { subjectCount: 4, validCount: 2, units: 6.5 })
  const incomplete = { ...snapshot, rows: [{ name: 'x', units: '1', rank: '', ties: '', total: '100' }] }
  assert.deepEqual(summarizeGradeRecord(incomplete), { subjectCount: 1, validCount: 0, units: 0 })
  for (const units of ['0', '-1', 'Infinity', 'NaN', '', '2abc', '2.3.4', '1e', '1e999']) {
    assert.equal(summarizeGradeRecord({ ...snapshot, rows: [{ ...snapshot.rows[0], units }] }).validCount, 0)
    assert.equal(gradeInputUnits(units), null)
  }
  for (const units of ['2', '2.5', '.5', ' 2 ', '1e2', '+2', '2.']) assert.equal(gradeInputUnits(units), Number(units))
})

check('eight records and 40 character names; same names do not overwrite prior inputs', () => {
  let store = empty
  for (let i = 0; i < 8; i++) store = appendGradeSavedRecord(store, snapshot, '동일 이름', `id-${i}`, date)
  assert.equal(store.records.length, 8)
  assert.throws(() => appendGradeSavedRecord(store, snapshot, '추가', 'extra', date), /limit/)
  assert.equal(appendGradeSavedRecord(empty, snapshot, '가'.repeat(40), 'valid', date).records[0].name.length, 40)
  for (const name of ['', '   ', '가'.repeat(41), '제어\n문자']) assert.throws(() => appendGradeSavedRecord(empty, snapshot, name, 'bad', date), /name/)
  assert.throws(() => appendGradeSavedRecord(first, snapshot, '다른 제목', 'one', date), /invalid/)
})

check('30 rows and text boundaries are accepted exactly and never truncated', () => {
  const boundary: GradeRecordSnapshot = { ...snapshot, rows: Array.from({ length: 30 }, () => ({ name: '가'.repeat(80), units: '0'.repeat(32), rank: '0', ties: '', total: '999' })) }
  assert.equal(isGradeRecordSnapshot(boundary), true)
  assert.deepEqual(appendGradeSavedRecord(empty, boundary, '경계', 'bounds', date).records[0].snapshot, boundary)
  assert.equal(isGradeRecordSnapshot({ ...boundary, rows: [...boundary.rows, boundary.rows[0]] }), false)
  for (const [field, value] of [['name', '가'.repeat(81)], ['rank', '1'.repeat(33)], ['units', '1\n2']]) {
    assert.equal(isGradeRecordSnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], [field]: value }] }), false)
  }
})

check('strict versions, keys, dates, IDs and numeric field types reject damaged stores', () => {
  const invalid = [
    '{broken', 'null', '[]', '{}', '', 'x'.repeat(GRADE_RECORD_LIMITS.raw + 1),
    JSON.stringify({ ...first, extra: true }), JSON.stringify({ ...first, records: [first.records[0], first.records[0]] }),
    JSON.stringify({ ...first, records: [{ ...first.records[0], createdAt: '2026-02-30T01:00:00.000Z' }] }),
    JSON.stringify({ ...first, records: [{ ...first.records[0], id: '' }] }),
    JSON.stringify({ ...first, records: [{ ...first.records[0], snapshot: { ...snapshot, system: 4 } }] }),
    JSON.stringify({ ...first, records: [{ ...first.records[0], snapshot: { ...snapshot, rows: [] } }] }),
  ]
  for (const raw of invalid) assert.equal(parseGradeSavedRecords(raw).ok, false)
  assert.deepEqual(parseGradeSavedRecords(JSON.stringify({ ...first, version: 2 })), { ok: false, error: 'unsupported' })
  for (const entryYear of [2020, 2029, 2025.5, '2025', null]) assert.equal(isGradeRecordSnapshot({ ...snapshot, entryYear }), false)
  for (const entryYear of GRADE_ENTRY_YEARS) assert.equal(isGradeRecordSnapshot({ ...snapshot, entryYear }), true)
  assert.equal(isGradeRecordSnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], rank: 1 }] }), false)
  assert.equal(isGradeRecordSnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], id: 7 }] }), false)
})

check('deletion removes only the chosen ID and leaves all input values intact', () => {
  const two = appendGradeSavedRecord(first, { ...snapshot, system: 5 }, '2학기', 'two', date)
  const remaining = removeGradeSavedRecord(two, 'one', 'delete-one')
  assert.deepEqual(remaining.records, [two.records[1]])
  assert.equal(two.records.length, 2)
  assert.throws(() => removeGradeSavedRecord(two, 'missing', 'bad'), /invalid/)
  assert.deepEqual(snapshot, first.records[0].snapshot)
})

check('maximum escaped allowed data fits the parser and round trips without loss', () => {
  const large: GradeRecordSnapshot = { entryYear: 2025, system: 5, rows: Array.from({ length: 30 }, () => ({ name: '\\'.repeat(80), units: '"'.repeat(32), rank: '"'.repeat(32), ties: '"'.repeat(32), total: '"'.repeat(32) })) }
  let store = empty
  for (let i = 0; i < 8; i++) store = appendGradeSavedRecord(store, large, '\\'.repeat(40), `large-${i}`, date)
  const raw = JSON.stringify(store)
  assert.ok(raw.length < GRADE_RECORD_LIMITS.raw)
  const parsed = parseGradeSavedRecords(raw)
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.deepEqual(parsed.store, store)
})

check('CAS rejects another tab insertion or deletion, including absent-key races', () => {
  let raw: string | null = null
  const storage = { getItem: (key: string) => { assert.equal(key, GRADE_RECORDS_KEY); return raw }, setItem: (_key: string, next: string) => { raw = next } }
  assert.equal(writeGradeSavedRecords(storage, null, first).ok, true)
  assert.equal(readGradeSavedRecords(storage).ok, true)
  const original = raw
  assert.deepEqual(writeGradeSavedRecords(storage, null, empty), { ok: false, error: 'conflict' })
  assert.equal(raw, original)
  raw = null
  assert.deepEqual(writeGradeSavedRecords(storage, original, empty), { ok: false, error: 'conflict' })
  assert.equal(raw, null)
})

check('corrupt and future raw data are never overwritten', () => {
  for (const raw of ['{broken', JSON.stringify({ ...first, version: 5 })]) {
    let writes = 0
    const storage = { getItem: () => raw, setItem: () => { writes++ } }
    assert.equal(writeGradeSavedRecords(storage, raw, empty).ok, false)
    assert.equal(writes, 0)
  }
})

check('quota, denied reads and post-write uncertainty are distinct without rollback', () => {
  const quota = new Error('full'); quota.name = 'QuotaExceededError'
  assert.deepEqual(writeGradeSavedRecords({ getItem: () => null, setItem: () => { throw quota } }, null, first), { ok: false, error: 'quota' })
  assert.deepEqual(readGradeSavedRecords({ getItem: () => { throw new Error('blocked') } }), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeGradeSavedRecords({ getItem: () => { throw new Error('blocked') }, setItem: () => assert.fail() }, null, first), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeGradeSavedRecords({ getItem: () => null, setItem: () => {} }, null, first), { ok: false, error: 'unconfirmed' })
  let raw: string | null = null, reads = 0, writes = 0
  const storage = { getItem: () => { if (++reads > 1) throw new Error('after-write'); return raw }, setItem: (_key: string, next: string) => { raw = next; writes++ } }
  assert.deepEqual(writeGradeSavedRecords(storage, null, first), { ok: false, error: 'unconfirmed' })
  assert.equal(raw, JSON.stringify(first)); assert.equal(writes, 1)
})

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
try {
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
  assert.equal(await withGradeRecordLock(() => 7), 7)
  let calls = 0
  Object.defineProperty(globalThis, 'navigator', { value: { locks: { request: async (key: string, options: { mode: string }, action: () => number) => { assert.equal(key, GRADE_RECORDS_KEY); assert.equal(options.mode, 'exclusive'); calls++; return action() } } }, configurable: true })
  assert.equal(await withGradeRecordLock(() => 8), 8)
  assert.equal(calls, 1)
  const aborted = new AbortController()
  aborted.abort()
  await assert.rejects(withGradeRecordLock(() => assert.fail('canceled callback ran'), aborted.signal), { name: 'AbortError' })
  count++; console.log('PASS Web Locks and the explicit CAS/readback fallback')
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
  else Reflect.deleteProperty(globalThis, 'navigator')
}

console.log(`${count} grade record groups passed`)
