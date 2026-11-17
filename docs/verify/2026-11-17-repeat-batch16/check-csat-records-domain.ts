import assert from 'node:assert/strict'
import { INQ_SOC, INQ_SCI } from '../../../src/utils/csatGrade.ts'
import {
  CSAT_SCORE_FIELDS, CSAT_SCORE_RECORD_MAX_BYTES, compareCsatScoreSnapshots,
  isCsatScoreSnapshot, parseCsatScoreRecords, appendCsatScoreRecord,
  type CsatScoreSnapshot, type CsatScoreField, type CsatScoreStore,
} from '../../../src/utils/csatScoreRecords.ts'

const base: CsatScoreSnapshot = {
  examYear: 2027, referenceYear: 2026,
  scores: { kor: '042', math: '042', eng: '042', hist: '042', inq1: '042', inq2: '042' },
  selection: { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics' },
}
const empty: CsatScoreStore = { version: 1, revision: 'empty', records: [] }
let groups = 0
function check(name: string, run: () => void) { run(); groups++; console.log(`PASS ${name}`) }
const subject = (snapshot: CsatScoreSnapshot, field: CsatScoreField, value: string) => {
  if (field === 'kor') snapshot.selection.kor = value as 'lm' | 'hj'
  else if (field === 'math') snapshot.selection.math = value as 'prob' | 'calc' | 'geo'
  else if (field === 'inq1' || field === 'inq2') snapshot.selection[field] = value
}

check('All 593 subject-pair combinations only subtract scores within the same selected subject', () => {
  let combinations = 0
  for (const field of CSAT_SCORE_FIELDS) {
    const choices = field === 'kor' ? ['lm','hj'] : field === 'math' ? ['prob','calc','geo'] : field === 'inq1' || field === 'inq2' ? [...INQ_SOC, ...INQ_SCI] : ['absolute']
    for (const currentSubject of choices) for (const savedSubject of choices) {
      const current = structuredClone(base), saved = structuredClone(base)
      subject(current, field, currentSubject); subject(saved, field, savedSubject)
      saved.examYear = 2025; saved.referenceYear = 2024; saved.scores[field] = '040'
      const comparison = compareCsatScoreSnapshots(current, saved).find(row => row.field === field)!
      assert.equal(comparison.current, '042'); assert.equal(comparison.saved, '040')
      assert.equal(comparison.difference, currentSubject === savedSubject ? 2 : null)
      assert.equal(comparison.reason, currentSubject === savedSubject ? null : 'differentSubject')
      combinations++
    }
  }
  assert.equal(combinations, 593)
})
check('Empty score is preserved and never becomes zero or a numerical difference', () => {
  for (const field of CSAT_SCORE_FIELDS) for (const [a,b] of [['','0'],['0',''],['','']]) {
    const current = structuredClone(base), saved = structuredClone(base)
    current.scores[field] = a; saved.scores[field] = b
    assert.equal(isCsatScoreSnapshot(current), true); assert.equal(isCsatScoreSnapshot(saved), true)
    const row = compareCsatScoreSnapshots(current, saved).find(row => row.field === field)!
    assert.equal(row.current, a); assert.equal(row.saved, b); assert.equal(row.difference, null); assert.equal(row.reason, 'missingScore')
  }
})
check('Invalid, fractional, nonfinite, signed and out-of-range strings are rejected without normalization', () => {
  for (const field of CSAT_SCORE_FIELDS) {
    const max = ['hist','inq1','inq2'].includes(field) ? 50 : 100
    for (const score of [' 1','1 ','1e1','NaN','Infinity','-1','+1','1.5','0000',String(max + 1)]) {
      const snapshot = structuredClone(base); snapshot.scores[field] = score
      assert.equal(isCsatScoreSnapshot(snapshot), false)
      assert.equal(compareCsatScoreSnapshots(snapshot, base).find(row => row.field === field)?.difference, null)
    }
    for (const score of ['0','000',String(max)]) { const snapshot = structuredClone(base); snapshot.scores[field] = score; assert.equal(isCsatScoreSnapshot(snapshot), true) }
  }
})
check('Exactly 12 records retain detached snapshots and duplicate names without merging', () => {
  let records = empty
  for (let i = 0; i < 12; i++) records = appendCsatScoreRecord(records, base, '동일 기록', `r-${i}`, '2026-11-17T00:00:00.000Z')
  assert.equal(records.records.length, 12); assert.equal(empty.records.length, 0)
  assert.throws(() => appendCsatScoreRecord(records, base, '초과', 'extra', '2026-11-17T00:00:00.000Z'), /limit/)
  assert.deepEqual(records.records[0].snapshot, base); assert.notEqual(records.records[0].snapshot, base)
  const bad = structuredClone(records); bad.records[1].id = bad.records[0].id
  assert.equal(parseCsatScoreRecords(JSON.stringify(bad)).ok, false)
  assert.deepEqual(parseCsatScoreRecords(JSON.stringify({ ...records, version: 2 })), { ok: false, error: 'unsupported' })
})
check('Exact fields are required at root, record, snapshot, scores and selection levels', () => {
  const store = appendCsatScoreRecord(empty, base, '검사', 'one', '2026-11-17T00:00:00.000Z')
  for (let level = 0; level < 5; level++) {
    const copy = structuredClone(store)
    const targets = [copy, copy.records[0], copy.records[0].snapshot, copy.records[0].snapshot.scores, copy.records[0].snapshot.selection]
    Object.assign(targets[level], { extra: 'unrecognized' })
    assert.equal(parseCsatScoreRecords(JSON.stringify(copy)).ok, false)
  }
  const unsupported = structuredClone(base); unsupported.selection.inq1 = 'unknown'
  assert.equal(isCsatScoreSnapshot(unsupported), false)
})
check('64 KiB uses encoded byte length and accepts the exact boundary only', () => {
  const store = appendCsatScoreRecord(empty, base, '한글 기록', 'one', '2026-11-17T00:00:00.000Z')
  const raw = JSON.stringify(store), bytes = new TextEncoder().encode(raw).length
  const exact = ' '.repeat(CSAT_SCORE_RECORD_MAX_BYTES - bytes) + raw
  assert.equal(parseCsatScoreRecords(exact).ok, true)
  assert.deepEqual(parseCsatScoreRecords(' ' + exact), { ok: false, error: 'oversized' })
})
console.log(`Independent CSAT records: ${groups} domain groups passed`)
