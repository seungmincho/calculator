import assert from 'node:assert/strict'
import { DEFAULT_WHITE_NOISE, WHITE_NOISE_TYPES, WHITE_NOISE_TIMERS, cloneWhiteNoiseSettings, isWhiteNoiseSettings, createWhiteNoiseDeadline, remainingWhiteNoiseMs, whiteNoiseAudioPlan, type WhiteNoiseSettings } from '../src/utils/whiteNoise.ts'
import { parseWhiteNoiseProfiles, applyWhiteNoiseProfileAction, writeWhiteNoiseProfileAction, readWhiteNoiseProfiles, readWhiteNoiseProfileForLoad, withWhiteNoiseProfilesLock, type WhiteNoiseProfilesRead } from '../src/utils/whiteNoiseProfiles.ts'

let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log('PASS', name) }
const settings = (overrides: Partial<WhiteNoiseSettings> = {}): WhiteNoiseSettings => ({ ...DEFAULT_WHITE_NOISE, ...overrides })
const ready = (result: WhiteNoiseProfilesRead) => { assert.equal(result.ok, true); if (!result.ok) throw new Error(result.error); return result.snapshot }
const record = (id = 'a', name = '집중') => ({ id, name, settings: settings({ type: 'rain', volume: 0, timerMinutes: 5, fade: true }) })
const empty = ready(parseWhiteNoiseProfiles(null))
const first = () => ready(applyWhiteNoiseProfileAction(null, { kind: 'add', record: record() }))

await check('six types/timers roundtrip and only known settings are allowed', () => {
  for (const type of WHITE_NOISE_TYPES) for (const timerMinutes of WHITE_NOISE_TIMERS) for (const volume of [0, 50, 100]) for (const fade of [true, false]) {
    const value = settings({ type, timerMinutes, volume, fade }); assert.ok(isWhiteNoiseSettings(value)); assert.deepEqual(cloneWhiteNoiseSettings(value), value); assert.notEqual(cloneWhiteNoiseSettings(value), value)
  }
  for (const value of [null, {}, { ...settings(), type: 'music' }, { ...settings(), volume: '50' }, { ...settings(), volume: 0.5 }, { ...settings(), volume: -1 }, { ...settings(), volume: 101 }, { ...settings(), volume: NaN }, { ...settings(), volume: Infinity }, { ...settings(), timerMinutes: 7 }, { ...settings(), fade: 1 }, { ...settings(), playing: true }]) assert.equal(isWhiteNoiseSettings(value), false)
})
await check('deadline is elapsed time rather than tick count; wall rollback and sleeping monotonic clock', () => {
  const clock = { wallMs: 1_000_000, monotonicMs: 50_000 }, deadline = createWhiteNoiseDeadline(5, clock)
  assert.equal(remainingWhiteNoiseMs(deadline, { wallMs: clock.wallMs + 97_000, monotonicMs: clock.monotonicMs + 97_000 }), 203_000)
  assert.equal(remainingWhiteNoiseMs(deadline, { wallMs: clock.wallMs - 20_000, monotonicMs: clock.monotonicMs + 100_000 }), 200_000)
  assert.equal(remainingWhiteNoiseMs(deadline, { wallMs: clock.wallMs + 301_000, monotonicMs: clock.monotonicMs }), 0)
  assert.equal(remainingWhiteNoiseMs(deadline, { wallMs: clock.wallMs, monotonicMs: clock.monotonicMs + 301_000 }), 0)
  assert.equal(remainingWhiteNoiseMs(createWhiteNoiseDeadline(0, clock), clock), null)
  for (const value of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER]) assert.throws(() => createWhiteNoiseDeadline(5, { wallMs: value, monotonicMs: 0 }))
})
await check('native gain envelope is constant before last30s and linearly reaches zero; volume0 stays muted', () => {
  assert.deepEqual(whiteNoiseAudioPlan(settings({ fade: true }), 60_000, 10), { at: 10, gain: 0.5, holdUntil: 40, stopAt: 70, fade: true })
  const halfway = whiteNoiseAudioPlan(settings({ fade: true }), 15_000, 55); assert.equal(halfway.gain, 0.25); assert.equal(halfway.stopAt, 70)
  assert.equal(whiteNoiseAudioPlan(settings({ fade: true, volume: 80 }), 15_000, 55).gain, 0.4)
  assert.equal(whiteNoiseAudioPlan(settings({ volume: 0 }), 15_000, 55).gain, 0)
  assert.equal(whiteNoiseAudioPlan(settings({ fade: false }), 15_000, 55).gain, 0.5)
  assert.deepEqual(whiteNoiseAudioPlan(settings({ fade: true }), null, 1), { at: 1, gain: 0.5, holdUntil: null, stopAt: null, fade: false })
  assert.throws(() => whiteNoiseAudioPlan(settings(), -1, 0)); assert.throws(() => whiteNoiseAudioPlan(settings(), 0, NaN))
})
await check('profile add/rename/delete projects only settings, clones inputs, increments revision and keeps silence fields absent', () => {
  const input = record(), initial = ready(applyWhiteNoiseProfileAction(null, { kind: 'add', record: input })); input.settings.volume = 100
  assert.equal(initial.profiles[0].settings.volume, 0); assert.equal(initial.revision, 1)
  const rename = ready(applyWhiteNoiseProfileAction(initial.raw, { kind: 'rename', id: 'a', name: '  다시 듣기  ' })); assert.equal(rename.profiles[0].name, '다시 듣기'); assert.equal(rename.revision, 2)
  const removed = ready(applyWhiteNoiseProfileAction(rename.raw, { kind: 'delete', id: 'a' })); assert.equal(removed.profiles.length, 0); assert.equal(removed.revision, 3)
  assert.deepEqual(Object.keys(initial.profiles[0].settings).sort(), ['fade', 'timerMinutes', 'type', 'volume'])
})
await check('six profiles/name40 allow boundary, normalized names and unknown runtime data are rejected', () => {
  let current = empty
  for (let i = 0; i < 6; i++) current = ready(applyWhiteNoiseProfileAction(current.raw, { kind: 'add', record: record(String(i), i === 0 ? '가'.repeat(40) : `설정${i}`) }))
  assert.deepEqual(applyWhiteNoiseProfileAction(current.raw, { kind: 'add', record: record('extra', '추가') }), { ok: false, error: 'limit' })
  assert.deepEqual(applyWhiteNoiseProfileAction(null, { kind: 'add', record: record('x', 'x'.repeat(41)) }), { ok: false, error: 'name' })
  const base = ready(applyWhiteNoiseProfileAction(null, { kind: 'add', record: record('a', 'Ａbc') }))
  assert.deepEqual(applyWhiteNoiseProfileAction(base.raw, { kind: 'add', record: record('b', 'abc') }), { ok: false, error: 'duplicateName' })
  assert.deepEqual(applyWhiteNoiseProfileAction(null, { kind: 'add', record: { ...record(), playing: true } } as never), { ok: false, error: 'invalid' })
})
await check('strict malformed/future/revision/id/name/duplicate schemas never become empty lists', () => {
  const valid = JSON.parse(first().raw!)
  const cases = [[], {}, { ...valid, extra: true }, { ...valid, revision: -1 }, { ...valid, revision: 0.1 }, { ...valid, profiles: [record(), record()] }, { ...valid, profiles: [record('a', 'name'), record('b', 'ＮＡＭＥ')] }, { ...valid, profiles: [record('bad id')] }, { ...valid, profiles: [record('a', '\nname')] }, { ...valid, profiles: [{ ...record(), settings: { ...settings(), remainingMs: 5 } }] }]
  for (const value of cases) assert.deepEqual(parseWhiteNoiseProfiles(JSON.stringify(value)), { ok: false, error: 'corrupt' })
  assert.deepEqual(parseWhiteNoiseProfiles('{'), { ok: false, error: 'corrupt' }); assert.deepEqual(parseWhiteNoiseProfiles(JSON.stringify({ ...valid, version: 2 })), { ok: false, error: 'unsupported' })
  assert.deepEqual(applyWhiteNoiseProfileAction(JSON.stringify({ ...valid, revision: Number.MAX_SAFE_INTEGER }), { kind: 'delete', id: 'a' }), { ok: false, error: 'invalid' })
})
await check('UTF8 raw16KiB bound precedes parse and escaped maximum valid profiles roundtrip', () => {
  const raw = first().raw!, padding = ' '.repeat(16 * 1024 - new TextEncoder().encode(raw).length)
  assert.equal(parseWhiteNoiseProfiles(raw + padding).ok, true)
  assert.deepEqual(parseWhiteNoiseProfiles(raw + padding + ' '), { ok: false, error: 'oversized' })
  assert.deepEqual(parseWhiteNoiseProfiles('가'.repeat(6000)), { ok: false, error: 'oversized' })
})
await check('CAS protects concurrent edits and never trusts mutated parsed arrays', () => {
  let raw: string | null = first().raw; const stale = empty, current = ready(parseWhiteNoiseProfiles(raw)), storage = { getItem: () => raw, setItem(_key: string, value: string) { raw = value } }
  assert.deepEqual(writeWhiteNoiseProfileAction(stale, { kind: 'add', record: record('b', '둘') }, storage), { ok: false, error: 'conflict' })
  current.profiles[0].name = 'caller mutation'; const result = ready(writeWhiteNoiseProfileAction(current, { kind: 'add', record: record('b', '둘') }, storage))
  assert.equal(result.profiles[0].name, '집중'); assert.equal(result.profiles.length, 2)
  assert.deepEqual(readWhiteNoiseProfileForLoad(current, 'a', storage), { ok: false, error: 'conflict' })
})
await check('quota/prewrite block preserve raw, postwrite read failure is unknown rather than rollback', () => {
  let raw: string | null = null, calls = 0
  const quota = { getItem: () => raw, setItem() { throw Object.assign(new Error(), { name: 'QuotaExceededError' }) } }
  assert.deepEqual(writeWhiteNoiseProfileAction(empty, { kind: 'add', record: record() }, quota), { ok: false, error: 'quota' }); assert.equal(raw, null)
  const unknown = { getItem() { if (++calls > 1) throw new Error(); return raw }, setItem(_key: string, value: string) { raw = value } }
  assert.deepEqual(writeWhiteNoiseProfileAction(empty, { kind: 'add', record: record() }, unknown), { ok: false, error: 'unconfirmed' }); assert.ok(raw)
  assert.deepEqual(readWhiteNoiseProfiles({ getItem() { throw new Error() } }), { ok: false, error: 'unavailable' })
})
await check('readback overwrite stays unconfirmed and load returns an independent settings clone', () => {
  let raw: string | null = null
  const storage = { getItem: () => raw, setItem() { raw = first().raw! + ' ' } }
  assert.deepEqual(writeWhiteNoiseProfileAction(empty, { kind: 'add', record: record() }, storage), { ok: false, error: 'unconfirmed' })
  const current = ready(parseWhiteNoiseProfiles(raw)), loaded = readWhiteNoiseProfileForLoad(current, 'a', storage)
  assert.equal(loaded.ok, true); if (loaded.ok) loaded.record.settings.volume = 100
  assert.equal(current.profiles[0].settings.volume, 0); assert.equal(ready(parseWhiteNoiseProfiles(raw)).profiles[0].settings.volume, 0)
})
await check('pre-aborted lock never executes action, fallback runs only explicit caller action', async () => {
  let actions = 0; const controller = new AbortController(); controller.abort()
  await assert.rejects(withWhiteNoiseProfilesLock(() => { actions++ }, controller.signal)); assert.equal(actions, 0)
  await withWhiteNoiseProfilesLock(() => { actions++ }); assert.equal(actions, 1)
})
console.log(`White noise pure/storage: ${groups} groups PASS`)
