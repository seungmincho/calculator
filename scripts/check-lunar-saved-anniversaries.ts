import assert from 'node:assert/strict'
import {
  isSavedLunarDate, parseLunarAnniversaries, readLunarAnniversaries, writeLunarAnniversaryAction,
  readLunarAnniversaryForLoad, nextSavedLunarAnniversary, withLunarAnniversariesLock,
  LUNAR_ANNIVERSARIES_KEY, LUNAR_ANNIVERSARY_RAW_LIMIT, type LunarAnniversaryRead, type SavedLunarAnniversary,
} from '../src/utils/lunarSavedAnniversaries.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log(`PASS ${name}`) }
const snapshot = (value: LunarAnniversaryRead) => { assert.equal(value.ok, true); if (!value.ok) throw new Error(value.error); return value.snapshot }
const error = (value: { ok: boolean; error?: string }, expected: string) => { assert.equal(value.ok, false); assert.equal(value.error, expected) }
const birthday: SavedLunarAnniversary = { id: 'birthday-a', name: '음력 생일', lunar: { year: 2025, month: 6, day: 10, isLeap: true } }
const initial = () => snapshot(parseLunarAnniversaries(null))
function storage(seed: string | null = null) {
  let value = seed, writes = 0
  return { getItem(key: string) { assert.equal(key, LUNAR_ANNIVERSARIES_KEY); return value }, setItem(key: string, raw: string) { assert.equal(key, LUNAR_ANNIVERSARIES_KEY); writes++; value = raw }, get writes() { return writes } }
}

check('original leap-year date survives next-occurrence fallback and detached load', () => {
  const port = storage(), saved = snapshot(writeLunarAnniversaryAction(initial(), { kind: 'add', record: birthday }, 'rev1', port))
  const upcoming = nextSavedLunarAnniversary(saved.anniversaries[0], { year: 2026, month: 1, day: 1 })
  assert.deepEqual(upcoming?.solar, { year: 2026, month: 7, day: 23 }); assert.equal(upcoming?.leapFallback, true)
  const loaded = readLunarAnniversaryForLoad(saved, birthday.id, port); assert.equal(loaded.ok, true)
  if (loaded.ok) { assert.deepEqual(loaded.record, birthday); loaded.record.name = 'changed' }
  assert.equal(snapshot(readLunarAnniversaries(port)).anniversaries[0].name, birthday.name)
})
check('short month uses existing fallback without changing original day 30', () => {
  const record = { ...birthday, lunar: { year: 2024, month: 2, day: 30, isLeap: false } }
  assert.equal(isSavedLunarDate(record.lunar), true)
  const next = nextSavedLunarAnniversary(record, { year: 2026, month: 1, day: 1 })
  assert.deepEqual(next?.solar, { year: 2026, month: 4, day: 16 }); assert.equal(next?.dayFallback, true); assert.equal(record.lunar.day, 30)
})
check('real coverage boundaries and invalid original dates are rejected', () => {
  assert.equal(isSavedLunarDate({ year: 1900, month: 1, day: 1, isLeap: false }), true)
  assert.equal(isSavedLunarDate({ year: 2050, month: 11, day: 18, isLeap: false }), true)
  for (const date of [{ year: 2050, month: 11, day: 19, isLeap: false }, { ...birthday.lunar, year: 2026 }, { ...birthday.lunar, day: 0 }, { ...birthday.lunar, month: 6.1 }, { ...birthday.lunar, year: '2025' }, { ...birthday.lunar, extra: true }]) assert.equal(isSavedLunarDate(date), false)
  assert.equal(nextSavedLunarAnniversary(birthday, { year: 2026, month: 2, day: 30 }), null)
})
check('strict envelopes, duplicate ids, limits and future versions never filter data', () => {
  const encode = (changes = {}) => JSON.stringify({ version: 1, revision: 'rev1', anniversaries: [birthday], ...changes })
  error(parseLunarAnniversaries('{'), 'corrupt'); error(parseLunarAnniversaries(encode({ version: 2 })), 'unsupported')
  error(parseLunarAnniversaries(encode({ extra: true })), 'corrupt'); error(parseLunarAnniversaries(encode({ revision: null })), 'corrupt')
  error(parseLunarAnniversaries(encode({ anniversaries: [birthday, birthday] })), 'corrupt')
  error(parseLunarAnniversaries(encode({ anniversaries: [{ ...birthday, name: 'x'.repeat(41) }] })), 'corrupt')
  error(parseLunarAnniversaries(' '.repeat(LUNAR_ANNIVERSARY_RAW_LIMIT + 1)), 'oversized')
  const port = storage('{'); error(writeLunarAnniversaryAction({ ...initial(), raw: '{' }, { kind: 'add', record: birthday }, 'rev1', port), 'corrupt'); assert.equal(port.writes, 0)
})
check('add rename delete preserve date and new revision, including empty envelope', () => {
  const port = storage(); let state = snapshot(writeLunarAnniversaryAction(initial(), { kind: 'add', record: birthday }, 'rev1', port))
  state = snapshot(writeLunarAnniversaryAction(state, { kind: 'rename', id: birthday.id, name: '  새 이름  ' }, 'rev2', port))
  assert.equal(state.anniversaries[0].name, '새 이름'); assert.deepEqual(state.anniversaries[0].lunar, birthday.lunar)
  error(writeLunarAnniversaryAction(state, { kind: 'delete', id: birthday.id }, 'rev2', port), 'invalid')
  state = snapshot(writeLunarAnniversaryAction(state, { kind: 'delete', id: birthday.id }, 'rev3', port))
  assert.equal(state.anniversaries.length, 0); assert.equal(state.revision, 'rev3'); assert.notEqual(state.raw, null)
  error(writeLunarAnniversaryAction(initial(), { kind: 'add', record: birthday }, 'rev4', port), 'conflict')
})
check('12 records, duplicate names, validation and missing targets', () => {
  const port = storage(); let state = initial()
  for (let i = 0; i < 12; i++) state = snapshot(writeLunarAnniversaryAction(state, { kind: 'add', record: { ...birthday, id: `item-${i}` } }, `rev-${i}`, port))
  error(writeLunarAnniversaryAction(state, { kind: 'add', record: { ...birthday, id: 'extra' } }, 'more', port), 'limit')
  error(writeLunarAnniversaryAction(state, { kind: 'rename', id: 'item-0', name: '\n' }, 'more', port), 'name')
  error(writeLunarAnniversaryAction(state, { kind: 'delete', id: 'absent' }, 'more', port), 'missing')
  error(readLunarAnniversaryForLoad(state, 'absent', port), 'missing'); assert.equal(state.anniversaries.length, 12)
})
check('stale writes and confirmed loads require an unchanged raw snapshot', () => {
  const port = storage(), old = initial(); snapshot(writeLunarAnniversaryAction(old, { kind: 'add', record: birthday }, 'rev1', port))
  error(writeLunarAnniversaryAction(old, { kind: 'add', record: { ...birthday, id: 'second' } }, 'rev2', port), 'conflict')
  error(readLunarAnniversaryForLoad(old, birthday.id, port), 'conflict'); assert.equal(port.writes, 1)
})
check('quota, blocked access and unverified writes do not claim rollback', () => {
  const action = { kind: 'add' as const, record: birthday }
  error(writeLunarAnniversaryAction(initial(), action, 'rev1', { getItem: () => null, setItem: () => { throw { name: 'QuotaExceededError' } } }), 'quota')
  error(readLunarAnniversaries({ getItem: () => { throw new Error('blocked') } }), 'unavailable')
  let written: string | null = null
  error(writeLunarAnniversaryAction(initial(), action, 'rev1', { getItem: () => { if (written) throw new Error('read blocked'); return null }, setItem: (_, raw) => { written = raw } }), 'unverified')
  assert.notEqual(written, null)
  error(writeLunarAnniversaryAction(initial(), action, 'rev1', { getItem: () => null, setItem: () => {} }), 'unverified')
})
const controller = new AbortController(); controller.abort()
let called = false
await assert.rejects(withLunarAnniversariesLock(() => { called = true }, controller.signal))
assert.equal(called, false); groups++; console.log('PASS aborted lock never invokes action')
console.log(`Saved lunar anniversaries: ${groups} groups passed`)
