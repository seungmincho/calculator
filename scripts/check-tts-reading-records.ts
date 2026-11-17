import assert from 'node:assert/strict'
import { chunkText, splitLong } from '../src/utils/tts.ts'
import { meetingSentences } from '../src/utils/meetingHandoff.ts'
import { captureTtsRecovery } from '../src/utils/ttsRecovery.ts'
import {
  TTS_READING_KEY, TTS_READING_LIMITS, captureTtsReadingPosition, createTtsReadingRecord, loadTtsReadingRecord, parseTtsReadingRecords,
  readTtsReadingRecords, resolveTtsReadingPosition, resolveTtsReadingVoice, writeTtsReadingAction,
  type TtsReadingDraft, type TtsReadingRecord, type TtsReadingSnapshot,
} from '../src/utils/ttsReadingRecords.ts'

let count = 0
const check = async (label: string, test: () => void | Promise<void>) => { await test(); count++; console.log('PASS', label) }
const settings = { voiceName: 'device', rate: 1, pitch: 1, volume: 1, localVoicesOnly: true }
const text = '  첫 문장입니다.\r\n두 번째 😀 문장입니다.  마지막 문장입니다.\n'
const segments = chunkText(text)
const draft = (body = text, index = 1): TtsReadingDraft => ({ text: body, position: { index, ...chunkText(body)[index] }, settings: { ...settings } })
const record = (id = 'one', name = '원고', value = draft()): TtsReadingRecord => { const made = createTtsReadingRecord(value, id, name, 1794870000000); assert.ok(made.ok); return made.value }
const rawOf = (records: TtsReadingRecord[], revision = 'rev-1') => JSON.stringify({ version: 1, revision, records })
const snapshot = (raw: string | null): TtsReadingSnapshot => { const parsed = parseTtsReadingRecords(raw); assert.ok(parsed.ok); return parsed.snapshot }
const memory = (initial: string | null = null) => {
  let raw = initial, writes = 0, mode = '', readsAfterWrite = 0
  return { get raw() { return raw }, set raw(value) { raw = value }, get writes() { return writes }, set mode(value) { mode = value },
    getItem(key: string) { assert.equal(key, TTS_READING_KEY); if (mode === 'blocked') throw Error('blocked'); if (writes && mode === 'unknown' && ++readsAfterWrite > 0) throw Error('readback'); return raw },
    setItem(key: string, value: string) { assert.equal(key, TTS_READING_KEY); if (mode === 'quota') { const error = Error('full'); error.name = 'QuotaExceededError'; throw error }; raw = value; writes++ }, }
}
await check('safe chunk limit rejects invalid values before work; max1 permits one whole code point', () => {
  for (const max of [0, -1, NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => chunkText('', max), RangeError)
    assert.throws(() => splitLong({ text: 'ABCD', start: 0, end: 4 }, max), RangeError)
  }
  for (const max of [1, 2, 3, 140, 1000]) for (const start of [0, 1, max - 1, max, max + 1]) {
    const body = 'a'.repeat(start) + '😀' + 'b'.repeat(max + 5), result = chunkText(body, max)
    assert.equal(result.map(item => item.text).join(''), body)
    for (const item of result) { assert.equal(body.slice(item.start, item.end), item.text); assert.ok(item.end > item.start); assert.ok(item.text.length <= max || max === 1 && item.text === '😀'); assert.ok(!/[\uD800-\uDBFF]$/.test(item.text)); assert.ok(!/^[\uDC00-\uDFFF]/.test(item.text)) }
  }
  const meeting = 'a'.repeat(999) + '😀' + '나'.repeat(2000)
  const result = meetingSentences(meeting); assert.equal(result.join(''), meeting); assert.ok(result.every(item => item.length <= 1000 && !/[\uD800-\uDBFF]$/.test(item)))
})
await check('strict schema rejects corruption, unknown versions, duplicate keys/IDs/names and invalid offsets/settings', () => {
  const good = record(), raw = rawOf([good]); assert.ok(parseTtsReadingRecords(raw).ok)
  const invalid = [null, [], { version: 2, revision: 'r', records: [] }, { version: 1, revision: 'r', records: [good, good] }, { version: 1, revision: 'r', records: [{ ...good, position: { ...good.position, start: -1 } }] }, { version: 1, revision: 'r', records: [{ ...good, text: 'changed' }] }, { version: 1, revision: 'r', records: [{ ...good, settings: { ...settings, volume: 2 } }] }, { version: 1, revision: 'r', records: [{ ...good, future: true }] }]
  for (const value of invalid) assert.equal(parseTtsReadingRecords(JSON.stringify(value)).ok, false)
  assert.equal(parseTtsReadingRecords(raw.replace('"version":1', '"version":1,"\\u0076ersion":1')).ok, false)
  assert.equal(parseTtsReadingRecords(rawOf([good, { ...good, id: 'other', name: '원고' }])).ok, false)
  const storage = memory(raw); assert.ok(readTtsReadingRecords(storage).ok); assert.equal(storage.writes, 0)
})
await check('exact original text and 8 maximal records round trip below2MiB; external raw limit is independent', () => {
  const body = '\uD800'.repeat(29999) + '가', value = draft(body, 214); value.settings.voiceName = '\uD800'.repeat(512)
  const records = Array.from({ length: 8 }, (_, index) => record(String(index).padEnd(80, 'x'), '\uD800'.repeat(39) + index, value))
  const raw = rawOf(records, 'r'.repeat(80)); assert.ok(Buffer.byteLength(raw) < TTS_READING_LIMITS.rawBytes); assert.deepEqual(snapshot(raw).records, records)
  const base = rawOf([record()]), padded = base + ' '.repeat(TTS_READING_LIMITS.rawBytes - Buffer.byteLength(base)); assert.ok(parseTtsReadingRecords(padded).ok)
  const over = padded + ' '; const invalid = parseTtsReadingRecords(over); assert.equal(invalid.ok, false); if (!invalid.ok) { assert.equal(invalid.error, 'tooLarge'); assert.equal(invalid.raw, over) }
  assert.equal(createTtsReadingRecord(draft(), 'x', 'a'.repeat(41), 0).ok, false)
  assert.equal(createTtsReadingRecord({ ...value, text: body + '가' }, 'x', 'test', 0).ok, false)
  assert.equal(createTtsReadingRecord({ ...value, settings: { ...settings, voiceName: 'v'.repeat(513) } }, 'x', 'test', 0).ok, false)
  const plain = record(); assert.equal(plain.text, text); assert.deepEqual(plain.position, { index: 1, ...segments[1] })
})
await check('capture uses exact recovery then active/paused/restored/first positions without word offsets', () => {
  const base = { text, segments, generation: 4, repeat: true, repeatStart: 0, repeatEnd: 2, repeatCount: 3, repeatGap: 2 }
  const recovery = captureTtsRecovery(base, 2, 2); assert.ok(recovery)
  const contexts = [
    { status: 'stopped' as const, currentIndex: 0, startFrom: 0, recovery, recoveryContext: base, expected: 2 },
    { status: 'speaking' as const, currentIndex: 1, startFrom: 0, recovery: null, expected: 1 },
    { status: 'paused' as const, currentIndex: 2, startFrom: 0, recovery: null, expected: 2 },
    { status: 'stopped' as const, currentIndex: -1, startFrom: 1, recovery: null, expected: 1 },
    { status: 'stopped' as const, currentIndex: -1, startFrom: 0, recovery, recoveryContext: { ...base, generation: 5 }, expected: 0 },
  ]
  for (const item of contexts) { const captured = captureTtsReadingPosition(text, item); assert.ok(captured.ok); assert.deepEqual(captured.value, { index: item.expected, ...segments[item.expected] }) }
  assert.equal(captureTtsReadingPosition(text, { status: 'paused', currentIndex: 99, startFrom: 0, recovery: null }).ok, false)
})
await check('old split position opens exact original with first-selection notice; malformed slice is rejected', async () => {
  const old = record(); old.position = { index: 1, start: segments[1].start, end: segments[1].end - 1, text: segments[1].text.slice(0, -1) }
  const storage = memory(rawOf([old])), result = await loadTtsReadingRecord(snapshot(storage.raw), old.id, { storage }); assert.ok(result.ok)
  assert.equal(result.value.record.text, text); assert.equal(result.value.index, 0); assert.equal(result.value.positionMatched, false); assert.equal(storage.writes, 0)
  assert.equal(resolveTtsReadingPosition(text, record().position).index, 1)
  assert.equal(parseTtsReadingRecords(rawOf([{ ...old, position: { ...old.position, text: 'wrong' } }])).ok, false)
})
await check('voice policy preserves local-only and blocks null voice rather than falling through to remote default', () => {
  const remote = { name: 'remote', lang: 'ko-KR', localService: false }, local = { name: 'local', lang: 'en-US', localService: true }
  assert.deepEqual(resolveTtsReadingVoice(settings, [remote]), { voice: null, missing: true, playAllowed: false })
  assert.equal(resolveTtsReadingVoice(settings, [remote, local]).voice, local)
  assert.equal(resolveTtsReadingVoice({ ...settings, localVoicesOnly: false }, [remote]).voice, remote)
  assert.equal(resolveTtsReadingVoice({ ...settings, localVoicesOnly: false, voiceName: null }, []).playAllowed, true)
})
await check('add/delete changes revision, ninth is rejected without eviction and duplicate names do not overwrite', async () => {
  const storage = memory(); let basis = snapshot(null)
  for (let i = 0; i < 8; i++) { const result = await writeTtsReadingAction(basis, { kind: 'add', record: record('id' + i, 'name' + i) }, 'r' + i, { storage }); assert.ok(result.ok); basis = result.snapshot }
  const raw = storage.raw; const ninth = await writeTtsReadingAction(basis, { kind: 'add', record: record('last', 'last') }, 'ninth', { storage }); assert.equal(ninth.ok, false); assert.equal(storage.raw, raw); assert.equal(storage.writes, 8)
  const deleted = await writeTtsReadingAction(basis, { kind: 'delete', id: 'id3' }, 'deleted', { storage }); assert.ok(deleted.ok); assert.equal(deleted.snapshot.records.length, 7); assert.notEqual(deleted.snapshot.revision, basis.revision)
  const duplicate = await writeTtsReadingAction(deleted.snapshot, { kind: 'add', record: record('new', 'NAME0') }, 'dupe', { storage }); assert.equal(duplicate.ok, false); assert.equal(storage.writes, 9)
})
await check('stale/CAS, quota and unknown write keep bytes; captured action cannot mutate while lock waits', async () => {
  const storage = memory(), empty = snapshot(null); const first = await writeTtsReadingAction(empty, { kind: 'add', record: record() }, 'one', { storage }); assert.ok(first.ok)
  assert.equal((await writeTtsReadingAction(empty, { kind: 'add', record: record('other', 'other') }, 'two', { storage })).ok, false)
  storage.mode = 'quota'; const old = storage.raw; assert.deepEqual(await writeTtsReadingAction(first.snapshot, { kind: 'delete', id: 'one' }, 'three', { storage }), { ok: false, error: 'quota' }); assert.equal(storage.raw, old)
  const unknown = memory(); unknown.mode = 'unknown'; const result = await writeTtsReadingAction(empty, { kind: 'add', record: record() }, 'unknown', { storage: unknown }); assert.deepEqual(result, { ok: false, error: 'writeUnknown' }); assert.ok(unknown.raw); assert.equal(unknown.writes, 1)
  const captured = record('captured', 'captured'); let release!: () => void; const held = new Promise<void>(resolve => { release = resolve }), target = memory()
  const saving = writeTtsReadingAction(empty, { kind: 'add', record: captured }, 'cap', { storage: target, lock: async action => { await held; return action() } }); captured.text = 'changed'; captured.settings.rate = 2; release(); const saved = await saving; assert.ok(saved.ok); assert.equal(saved.snapshot.records[0].text, text); assert.equal(saved.snapshot.records[0].settings.rate, 1)
})
await check('load/save canceled during lock make no application/write; changed raw and unsupported raw are preserved', async () => {
  const storage = memory(rawOf([record()])), basis = snapshot(storage.raw); let release!: () => void; const held = new Promise<void>(resolve => { release = resolve }), controller = new AbortController()
  const pending = loadTtsReadingRecord(basis, 'one', { storage, signal: controller.signal, lock: async action => { await held; return action() } }); controller.abort(); release(); assert.deepEqual(await pending, { ok: false, error: 'canceled' }); assert.equal(storage.writes, 0)
  const raw = storage.raw; storage.raw = rawOf([record('changed', 'changed')], 'new'); assert.deepEqual(await loadTtsReadingRecord(basis, 'one', { storage }), { ok: false, error: 'conflict' }); assert.notEqual(storage.raw, raw)
  storage.raw = '{"version":99,"secret":"keep"}'; const unsupported = storage.raw; assert.equal((await writeTtsReadingAction(basis, { kind: 'delete', id: 'one' }, 'newrev', { storage })).ok, false); assert.equal(storage.raw, unsupported); assert.equal(storage.writes, 0)
})
console.log(`TTS reading records: ${count} groups passed`)
