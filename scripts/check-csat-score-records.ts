import assert from 'node:assert/strict'
import {
  CSAT_SCORE_RECORDS_KEY, CSAT_SCORE_RECORD_MAX_BYTES, appendCsatScoreRecord, compareCsatScoreSnapshots,
  createCsatScoreActionGuard, isCsatScoreSnapshot, parseCsatScoreRecords, readCsatScoreRecords,
  removeCsatScoreRecord, withCsatScoreRecordsLock, writeCsatScoreRecords,
  type CsatScoreSnapshot, type CsatScoreStore,
} from '../src/utils/csatScoreRecords.ts'

let checks = 0
const check = (name: string, run: () => void) => { run(); checks++; console.log(`PASS ${name}`) }
const snapshot: CsatScoreSnapshot = { examYear: 2027, referenceYear: 2026, scores: { kor: '090', math: '80', eng: '0', hist: '', inq1: '44', inq2: '41' }, selection: { kor: 'hj', math: 'calc', inq1: 'society', inq2: 'earth1' } }
const empty: CsatScoreStore = { version: 1, revision: 'empty', records: [] }
const date = '2026-11-17T01:02:03.000Z'
const seeded = appendCsatScoreRecord(empty, snapshot, '  연습 1회  ', 'record-1', date)
const raw = JSON.stringify(seeded)
class MemoryStorage {
  raw: string | null = null
  writes = 0
  getItem(key: string) { assert.equal(key, CSAT_SCORE_RECORDS_KEY); return this.raw }
  setItem(key: string, value: string) { assert.equal(key, CSAT_SCORE_RECORDS_KEY); this.raw = value; this.writes++ }
}
check('round trip preserves original strings, electives and separate academic years', () => {
  assert.ok(isCsatScoreSnapshot(snapshot)); const parsed = parseCsatScoreRecords(raw)
  assert.ok(parsed.ok); assert.deepEqual(parsed.store, seeded)
  assert.equal(parsed.store.records[0].name, '연습 1회')
  assert.equal(parsed.store.records[0].snapshot.scores.hist, '')
  assert.equal(parsed.store.records[0].snapshot.scores.eng, '0')
  assert.equal(parsed.store.records[0].snapshot.scores.kor, '090')
})
check('saved snapshots do not mutate with later input edits', () => {
  const current = structuredClone(snapshot), saved = appendCsatScoreRecord(empty, current, 'original', 'original', date)
  current.scores.kor = '100'; current.selection.inq1 = 'ethics'
  assert.deepEqual(saved.records[0].snapshot, snapshot)
})
check('missing key is empty but JSON null, partial and future stores are preserved as errors', () => {
  assert.equal(parseCsatScoreRecords(null).ok, true)
  for (const bad of ['null', '{}', '[]', '{', '{"version":1}', '{"version":1,"revision":"r","records":null}']) assert.equal(parseCsatScoreRecords(bad).ok, false)
  assert.deepEqual(parseCsatScoreRecords('{"version":2}'), { ok: false, error: 'unsupported' })
})
const invalidSnapshots: [string, (value: CsatScoreSnapshot) => void][] = [
  ['missing score field', value => { delete (value.scores as Partial<typeof value.scores>).hist }],
  ['extra score field', value => { Object.assign(value.scores, { extra: '1' }) }],
  ['extra snapshot field', value => { Object.assign(value, { grades: [1, 1] }) }],
  ['extra selection field', value => { Object.assign(value.selection, { extra: 'lm' }) }],
  ['unknown elective', value => { value.selection.inq1 = 'unknown' }],
  ['score over subject max', value => { value.scores.hist = '51' }],
  ['inquiry score over max', value => { value.scores.inq2 = '100' }],
  ['score over 100', value => { value.scores.kor = '101' }],
  ['negative score', value => { value.scores.eng = '-1' }],
  ['decimal score', value => { value.scores.math = '80.5' }],
  ['exponent score', value => { value.scores.math = '1e2' }],
  ['non-string score', value => { Object.assign(value.scores, { kor: 90 }) }],
  ['score spaces', value => { value.scores.kor = ' 90' }],
  ['unbounded score string', value => { value.scores.eng = '0000' }],
  ['invalid exam year', value => { value.examYear = 999 }],
  ['invalid reference year', value => { value.referenceYear = 2026.5 }],
]
for (const [name, change] of invalidSnapshots) check(`rejects ${name} without dropping fields`, () => {
  const copy = structuredClone(snapshot); change(copy)
  assert.equal(isCsatScoreSnapshot(copy), false)
  const list = structuredClone(seeded); list.records[0].snapshot = copy
  assert.equal(parseCsatScoreRecords(JSON.stringify(list)).ok, false)
})
check('strict record and envelope fields, IDs, dates and names are validated', () => {
  const modifications: ((value: CsatScoreStore) => void)[] = [
    value => { value.records.push(value.records[0]) },
    value => { value.revision = '' },
    value => { value.records[0].id = 'x\n' },
    value => { value.records[0].id = 'x'.repeat(81) },
    value => { value.records[0].name = ' ' },
    value => { value.records[0].name = ' x ' },
    value => { value.records[0].name = 'x'.repeat(41) },
    value => { value.records[0].name = 'a\nb' },
    value => { value.records[0].createdAt = '2026-02-30T00:00:00.000Z' },
    value => { value.records[0].createdAt = '2026-11-17' },
    value => { Object.assign(value.records[0], { extra: true }) },
    value => { Object.assign(value, { extra: true }) },
  ]
  for (const modify of modifications) { const copy = structuredClone(seeded); modify(copy); assert.equal(parseCsatScoreRecords(JSON.stringify(copy)).ok, false) }
})
check('maximum 12 records and 40-character names round trip, record 13 is rejected', () => {
  let store = empty
  for (let i = 0; i < 12; i++) store = appendCsatScoreRecord(store, snapshot, '가'.repeat(40), `r-${i}`, date)
  assert.ok(parseCsatScoreRecords(JSON.stringify(store)).ok)
  assert.throws(() => appendCsatScoreRecord(store, snapshot, 'overflow', 'overflow', date), /limit/)
  const over = { ...store, records: [...store.records, { ...store.records[0], id: 'extra' }] }
  assert.equal(parseCsatScoreRecords(JSON.stringify(over)).ok, false)
})
check('UTF-8 size limits apply before parsing and preserve oversized raw data', () => {
  assert.deepEqual(parseCsatScoreRecords('x'.repeat(CSAT_SCORE_RECORD_MAX_BYTES + 1)), { ok: false, error: 'oversized' })
  assert.deepEqual(parseCsatScoreRecords('가'.repeat(22000)), { ok: false, error: 'oversized' })
})
check('blank and actual zero stay distinct in comparison', () => {
  const current = structuredClone(snapshot); current.scores.hist = '0'; current.scores.eng = ''
  const rows = compareCsatScoreSnapshots(current, snapshot)
  for (const field of ['hist', 'eng']) { const row = rows.find(item => item.field === field)!; assert.equal(row.difference, null); assert.equal(row.reason, 'missingScore') }
})
check('matching subjects use current minus saved including explicit zero', () => {
  const current = structuredClone(snapshot); current.scores.kor = '95'; current.scores.eng = '0'; current.scores.inq1 = '40'
  const rows = compareCsatScoreSnapshots(current, snapshot)
  assert.equal(rows[0].difference, 5); assert.equal(rows[2].difference, 0); assert.equal(rows[4].difference, -4)
})
check('different electives, including swapped Inquiry slots, are never subtracted', () => {
  const current = structuredClone(snapshot)
  current.selection = { kor: 'lm', math: 'prob', inq1: 'earth1', inq2: 'society' }
  for (const row of compareCsatScoreSnapshots(current, snapshot).filter(row => ['kor', 'math', 'inq1', 'inq2'].includes(row.field))) { assert.equal(row.reason, 'differentSubject'); assert.equal(row.difference, null) }
})
check('year differences compare raw scores only and cannot introduce a grade result', () => {
  const current = { ...snapshot, examYear: 2028, referenceYear: 2027 }
  assert.equal(compareCsatScoreSnapshots(current, snapshot)[0].difference, 0)
  assert.equal('grade' in compareCsatScoreSnapshots(current, snapshot)[0], false)
})
check('invalid current score is displayed without a fabricated difference', () => {
  const current = structuredClone(snapshot); current.scores.kor = 'abc'
  assert.equal(compareCsatScoreSnapshots(current, snapshot)[0].reason, 'invalidScore')
})
check('storage CAS and verified readback commit the expected list only', () => {
  const storage = new MemoryStorage(), result = writeCsatScoreRecords(storage, null, seeded)
  assert.deepEqual(result, { ok: true, raw }); assert.equal(storage.writes, 1)
  assert.ok(readCsatScoreRecords(storage).ok)
  assert.deepEqual(writeCsatScoreRecords(storage, null, seeded), { ok: false, error: 'conflict' })
  assert.equal(storage.writes, 1)
})
check('two stale views cannot overwrite a newer committed list', () => {
  const storage = new MemoryStorage(); storage.raw = raw
  const a = appendCsatScoreRecord(seeded, snapshot, 'A', 'a', date)
  const b = appendCsatScoreRecord(seeded, snapshot, 'B', 'b', date)
  assert.ok(writeCsatScoreRecords(storage, raw, a).ok)
  assert.deepEqual(writeCsatScoreRecords(storage, raw, b), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, JSON.stringify(a))
})
check('corrupt and future stores cannot be overwritten through the write API', () => {
  for (const bad of ['null', '{"version":2}']) {
    const storage = new MemoryStorage(); storage.raw = bad
    assert.equal(writeCsatScoreRecords(storage, bad, seeded).ok, false)
    assert.equal(storage.raw, bad); assert.equal(storage.writes, 0)
  }
})
check('quota and denied reads never announce success', () => {
  const denied = { getItem() { throw new Error('denied') }, setItem() { throw new Error('must not write') } }
  assert.deepEqual(readCsatScoreRecords(denied), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeCsatScoreRecords(denied, null, seeded), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeCsatScoreRecords({ getItem: () => null, setItem() { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }) } }, null, seeded), { ok: false, error: 'quota' })
})
check('failed readback explicitly reports uncertain persistence without rollback', () => {
  let value: string | null = null
  const result = writeCsatScoreRecords({ getItem() { if (value !== null) throw new Error('readback denied'); return null }, setItem(_key, raw) { value = raw } }, null, seeded)
  assert.deepEqual(result, { ok: false, error: 'unverified' }); assert.equal(value, raw)
  let reads = 0
  assert.deepEqual(writeCsatScoreRecords({ getItem: () => ++reads === 1 ? null : 'changed', setItem() {} }, null, seeded), { ok: false, error: 'unverified' })
})
check('deleting a record leaves the source snapshot and original store untouched', () => {
  const next = removeCsatScoreRecord(seeded, 'record-1', 'deleted')
  assert.equal(next.records.length, 0); assert.equal(seeded.records.length, 1)
  assert.deepEqual(seeded.records[0].snapshot, snapshot)
  assert.throws(() => removeCsatScoreRecord(next, 'record-1', 'twice'), /missing/)
})
check('action generations reject cancel, new confirmation and input ABA changes', () => {
  const guard = createCsatScoreActionGuard(); guard.update('A')
  const token = guard.begin(); assert.ok(guard.isCurrent(token)); guard.update('A'); assert.ok(guard.isCurrent(token))
  guard.update('B'); guard.update('A'); assert.equal(guard.isCurrent(token), false)
  const next = guard.begin(); guard.invalidate(); assert.equal(guard.isCurrent(next), false)
  const old = guard.begin(); const latest = guard.begin(); assert.equal(guard.isCurrent(old), false); assert.ok(guard.isCurrent(latest))
})

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  assert.equal(await withCsatScoreRecordsLock(() => 'fallback'), 'fallback')
  let queued: (() => void) | undefined
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(key: string, options: { mode: string }, action: () => unknown) {
    assert.equal(key, CSAT_SCORE_RECORDS_KEY); assert.equal(options.mode, 'exclusive')
    return new Promise(resolve => { queued = () => resolve(action()) })
  } } } })
  const guard = createCsatScoreActionGuard(); guard.update('inputs-A'); const token = guard.begin(); let writes = 0
  const waiting = withCsatScoreRecordsLock(() => { if (guard.isCurrent(token)) writes++ })
  guard.update('inputs-B'); assert.ok(queued); queued(); await waiting
  check('exclusive-lock wait checks latest action before any mutation; fallback is available', () => assert.equal(writes, 0))
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
  else Reflect.deleteProperty(globalThis, 'navigator')
}
console.log(`CSAT score record checks: ${checks} passed`)
