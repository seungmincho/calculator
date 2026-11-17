// node --experimental-strip-types scripts/check-speaking-records.ts
import assert from 'node:assert/strict'
import { isSpeakingSession, summaryFromParams } from '../src/lib/speaking/core.ts'
import {
  MAX_SPEAKING_TITLE, captureSpeakingBasis, filterSpeakingRecords, inspectSpeakingRecords,
  isSpeakingRecord, isSpeakingStoredBasis, isSpeakingTitle, matchesSpeakingBasis,
  prepareSpeakingRecord, speakingRecordStatus, type SpeakingRecord,
} from '../src/lib/speaking/records.ts'
import { deleteSpeakingSession, listSpeakingSessions, saveSpeakingSession } from '../src/lib/speaking/recordStorage.ts'

const legacy: SpeakingRecord = {
  version: 1, id: 'legacy', mode: 'intro', createdAt: 100, updatedAt: 200,
  takes: [
    { id: 'first', createdAt: 100, seconds: 60, transcript: '첫 번째 답변입니다.', audio: new Blob(['original audio'], { type: 'audio/webm' }),
      feedback: { model: 'existing-model', strengthQuote: '답변', strength: '설명', improveQuote: '', improve: '연습', rewrite: '다듬기', next: '다시 연습' } },
    { id: 'second', createdAt: 150, seconds: null, transcript: '마지막 take에 ONLY SECOND 검색어' },
  ],
}

const checks: [string, () => void | Promise<void>][] = [
  ['legacy v1 reads preserve absent fields, all takes, Blob and feedback without migration', async () => {
    assert.ok(isSpeakingSession(legacy))
    assert.ok(isSpeakingRecord(legacy))
    const result = inspectSpeakingRecords([legacy])
    assert.equal(result.records[0].session, legacy)
    assert.deepEqual(result.records[0].basis, { kind: 'legacy', updatedAt: 200 })
    assert.equal(Object.hasOwn(legacy, 'title'), false)
    assert.equal(Object.hasOwn(legacy, 'revision'), false)
    assert.equal(await result.records[0].session.takes[0].audio!.text(), 'original audio')
    assert.equal(result.records[0].session.takes[0].feedback?.model, 'existing-model')
  }],
  ['optional title limits are explicit; blank, 40, 41, controls and malformed fields', () => {
    assert.equal(MAX_SPEAKING_TITLE, 40)
    for (const title of ['', '   ', '가'.repeat(40), '같은 제목']) assert.ok(isSpeakingTitle(title))
    for (const title of ['가'.repeat(41), 'a\nb', 'a\tb', 'a\u0000b', 'a\u007fb', null, 4]) assert.equal(isSpeakingTitle(title), false)
    for (const patch of [{ title: null }, { title: 3 }, { revision: '' }, { revision: ' ' }, { revision: 'x'.repeat(129) }, { revision: 3 }]) {
      assert.equal(isSpeakingRecord({ ...legacy, ...patch }), false)
    }
    assert.ok(isSpeakingRecord({ ...legacy, title: '', revision: 'revision_1' }))
  }],
  ['explicit save clones all media/content and only normalizes the optional title', async () => {
    const source = { ...legacy, title: '  연습 이름  ', extraLegacyField: { preserved: true } }
    const saved = prepareSpeakingRecord(source, 'new-revision', 300)
    assert.equal(saved.title, '연습 이름')
    assert.equal(source.title, '  연습 이름  ')
    assert.equal(source.updatedAt, 200)
    assert.equal(source.revision, undefined)
    assert.notEqual(saved.takes, source.takes)
    assert.notEqual(saved.takes[0].feedback, source.takes[0].feedback)
    assert.deepEqual(saved.takes[0].feedback, source.takes[0].feedback)
    assert.equal(await saved.takes[0].audio!.text(), 'original audio')
    assert.equal(saved.takes[0].audio!.type, 'audio/webm')
    assert.deepEqual((saved as typeof source).extraLegacyField, { preserved: true })
    assert.equal(Object.hasOwn(prepareSpeakingRecord({ ...legacy, title: '  ' }, 'blank', 300), 'title'), false)
    assert.equal(prepareSpeakingRecord(legacy, 'clock-back', 50).updatedAt, 200)
    assert.throws(() => prepareSpeakingRecord(saved, 'new-revision', 400), /storageFailed/)
    assert.throws(() => prepareSpeakingRecord(legacy, 'next', Infinity), /storageFailed/)
  }],
  ['captured legacy basis is independent of edited updatedAt and detects deletion/upgrades', () => {
    const draft = structuredClone(legacy)
    const basis = captureSpeakingBasis(draft)
    draft.updatedAt = 900
    assert.deepEqual(basis, { kind: 'legacy', updatedAt: 200 })
    assert.ok(matchesSpeakingBasis(legacy, basis))
    assert.equal(matchesSpeakingBasis(draft, basis), false)
    assert.equal(matchesSpeakingBasis(undefined, basis), false)
    assert.equal(matchesSpeakingBasis({ ...legacy, revision: 'another-tab' }, basis), false)
    assert.equal(matchesSpeakingBasis({ ...legacy, version: 2 }, basis), false)
  }],
  ['revision checks both token and stored timestamp; fresh ID requires absence', () => {
    const saved = prepareSpeakingRecord(legacy, 'r1', 300)
    const basis = captureSpeakingBasis(saved)
    assert.ok(matchesSpeakingBasis(saved, basis))
    assert.equal(matchesSpeakingBasis({ ...saved, revision: 'r2' }, basis), false)
    assert.equal(matchesSpeakingBasis({ ...saved, updatedAt: 301 }, basis), false)
    assert.equal(matchesSpeakingBasis(legacy, basis), false)
    assert.ok(matchesSpeakingBasis(undefined, { kind: 'absent' }))
    for (const current of [null, {}, legacy, { version: 2 }]) assert.equal(matchesSpeakingBasis(current, { kind: 'absent' }), false)
    for (const basis of [null, {}, { kind: 'legacy', updatedAt: NaN }, { kind: 'revision', updatedAt: 100, revision: '' }]) assert.equal(isSpeakingStoredBasis(basis), false)
  }],
  ['reading reports corrupt/future records without deleting or reducing physical count', () => {
    const values = [legacy, { ...legacy, id: 'newest', updatedAt: 600 }, { ...legacy, version: 2 }, { ...legacy, title: 'x'.repeat(41) }, null]
    const before = structuredClone(values)
    const result = inspectSpeakingRecords(values)
    assert.deepEqual(result.records.map(row => row.session.id), ['newest', 'legacy'])
    assert.equal(result.totalCount, 5)
    assert.equal(result.unreadableCount, 2)
    assert.equal(result.unsupportedCount, 1)
    assert.deepEqual(values, before)
    assert.equal(speakingRecordStatus({ version: 0 }), 'unreadable')
    assert.equal(speakingRecordStatus({ version: 5 }), 'unsupported')
  }],
  ['search reaches every take, normalizes text, combines mode, and keeps duplicate names', () => {
    const report = { ...legacy, id: 'report', mode: 'report' as const, title: '같은 이름', takes: [{ ...legacy.takes[0], transcript: '주간 보고' }] }
    const intro = { ...legacy, title: '같은 이름' }
    const records = inspectSpeakingRecords([intro, report]).records
    assert.deepEqual(filterSpeakingRecords(records, ' 같은   이름 ', 'all').map(row => row.session.id), ['legacy', 'report'])
    assert.deepEqual(filterSpeakingRecords(records, 'ＯＮＬＹ　second', 'all').map(row => row.session.id), ['legacy'])
    assert.deepEqual(filterSpeakingRecords(records, '', 'report').map(row => row.session.id), ['report'])
    assert.deepEqual(filterSpeakingRecords(records, 'ONLY SECOND', 'report'), [])
    assert.deepEqual(filterSpeakingRecords(records, '없는 검색어', 'all'), [])
    assert.equal(filterSpeakingRecords(records, ' ', 'all')[0], records[0])
    assert.equal(intro.title, '같은 이름')
  }],
  ['existing limits remain compatible; title does not enter summary URL interpretation', () => {
    assert.ok(isSpeakingRecord({ ...legacy, takes: Array.from({ length: 5 }, (_, index) => ({ ...legacy.takes[0], id: `take-${index}` })) }))
    assert.equal(isSpeakingRecord({ ...legacy, takes: Array(6).fill(legacy.takes[0]) }), false)
    assert.deepEqual(summaryFromParams(new URLSearchParams('summary=1&mode=intro&seconds=60&words=10&title=private')), { mode: 'intro', seconds: 60, words: 10 })
  }],
  ['invalid operations are rejected before opening IndexedDB', async () => {
    let opens = 0
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open: () => { opens++; throw new Error('must not open') } } })
    await assert.rejects(saveSpeakingSession({ ...legacy, title: 'x'.repeat(41) }, { kind: 'absent' }), /storageFailed/)
    await assert.rejects(saveSpeakingSession(legacy, null as never), /storageFailed/)
    await assert.rejects(deleteSpeakingSession(legacy.id, { kind: 'absent' }), /storageFailed/)
    assert.equal(opens, 0)
  }],
  ['blocked open is rejected and a later successful connection is closed', async () => {
    let closed = 0
    const request = { result: { close: () => { closed++ } }, onblocked: null as null | (() => void), onsuccess: null as null | (() => void) }
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open: () => request } })
    const pending = listSpeakingSessions()
    request.onblocked!()
    await assert.rejects(pending, /storageBlocked/)
    request.onsuccess!()
    assert.equal(closed, 1)
  }],
  ['open failure preserves quota classification and does not claim saved success', async () => {
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open: () => { throw new DOMException('quota', 'QuotaExceededError') } } })
    await assert.rejects(saveSpeakingSession(legacy, { kind: 'absent' }), /storageQuota/)
    await assert.rejects(listSpeakingSessions(), /storageQuota/)
  }],
]

const originalIndexedDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
try {
  for (const [name, run] of checks) { await run(); console.log('PASS', name) }
  console.log(`${checks.length} speaking record checks passed`)
} finally {
  if (originalIndexedDB) Object.defineProperty(globalThis, 'indexedDB', originalIndexedDB)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
}
