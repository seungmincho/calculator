import assert from 'node:assert/strict'
import { backupJson, STORAGE_KEY, SETTINGS_KEY, type Note } from '../src/utils/notepad.ts'
import { commitNotepad, commitNotepadSettings, inspectStoredNotes, inspectNotepadSettings, readNotepad, readNotepadSettings, type NotepadLock } from '../src/utils/notepadPersistence.ts'

const note = (content = '합성 원고'): Note => ({ id: 'id', title: '', content, createdAt: -1.5, updatedAt: Number.MAX_VALUE, pinned: false })
const storage = (raw: string | null = null) => {
  const data = new Map<string, string>(raw === null ? [] : [[STORAGE_KEY, raw]]), writes: string[] = []
  return { data, writes, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); data.set(key, value) } }
}
function locks() {
  const jobs: (() => void)[] = [], keys: string[] = []
  const lock: NotepadLock = (key, action) => new Promise(resolve => { keys.push(key); jobs.push(() => resolve(action())) })
  return { lock, keys, next: () => { const job = jobs.shift(); assert.ok(job); job() } }
}
let groups = 0
async function check(name: string, run: () => unknown) { await run(); groups++; console.log(`PASS ${name}`) }

await check('legacy exact fields, special strings and initial reads perform zero writes', () => {
  const original = [note('\u0000\ud800\r\n'), { ...note(), id: '__proto__', title: '같은 제목', pinned: true }], raw = JSON.stringify(original), s = storage(raw)
  assert.deepEqual(readNotepad(s), { ok: true, raw, value: original }); assert.equal(s.writes.length, 0)
  assert.deepEqual(readNotepadSettings(s), { ok: true, raw: null, value: { fontSize: 16, mono: false, wrap: true } })
  const r = readNotepad(s); if (r.ok) r.value[0].content = 'mutated'; assert.equal(s.getItem(STORAGE_KEY), raw)
})
await check('existing large self-backups exceed small caps without truncation', () => {
  const list = Array.from({ length: 50000 }, (_, i) => ({ id: `synthetic-${i}`, title: '', content: '', createdAt: 0, updatedAt: 0 }))
  const raw = JSON.stringify(list), backup = backupJson(list, 0)
  assert.equal(Buffer.byteLength(raw), 3838891); assert.equal(Buffer.byteLength(backup), 6338997)
  const result = inspectStoredNotes(raw); assert.equal(result.ok, true); if (result.ok) assert.deepEqual(result.value, list)
  const escaped = JSON.stringify([note('\u0000'.repeat(1024 * 1024))]); assert.ok(escaped.length > 6 * 1024 * 1024); assert.equal(inspectStoredNotes(escaped).ok, true)
})
await check('corrupt, duplicate, extra and future values preserve raw and cannot write', async () => {
  const invalid = ['{broken', 'null', '{}', JSON.stringify([note(), note()]), JSON.stringify([{ ...note(), unexpected: 'retain' }]), JSON.stringify([{ ...note(), updatedAt: null }]), JSON.stringify({ version: 2, notes: [note()] })]
  for (const raw of invalid) {
    const s = storage(raw), r = inspectStoredNotes(raw)
    assert.equal(r.ok, false); assert.equal(r.raw, raw)
    assert.equal((await commitNotepad(raw, [], { storage: s })).ok, false); assert.equal(s.getItem(STORAGE_KEY), raw); assert.equal(s.writes.length, 0)
  }
})
await check('same-key queued writers use raw CAS and capture the input snapshot', async () => {
  const s = storage(), q = locks(), a = [note('A')], b = [note('B')]
  const first = commitNotepad(null, a, { storage: s, lock: q.lock }), second = commitNotepad(null, b, { storage: s, lock: q.lock })
  a[0].content = 'after click'; q.next(); q.next()
  assert.equal((await first).ok, true); assert.deepEqual(await second, { ok: false, error: 'conflict' })
  assert.equal(JSON.parse(s.getItem(STORAGE_KEY)!)[0].content, 'A'); assert.deepEqual(q.keys, [STORAGE_KEY, STORAGE_KEY]); assert.equal(s.writes.length, 1)
})
await check('readback unknown and overwrite do not rollback a successful set', async () => {
  for (const mismatch of [false, true]) {
    const s = storage(); let count = 0
    const result = await commitNotepad(null, [note()], { storage: { setItem: s.setItem, getItem(key) { count++; if (count === 2) { if (mismatch) return 'external'; throw new Error('blocked') } return s.getItem(key) } } })
    assert.deepEqual(result, { ok: false, error: 'unconfirmed' }); assert.equal(s.writes.length, 1); assert.equal(JSON.parse(s.getItem(STORAGE_KEY)!)[0].content, note().content)
  }
})
await check('quota, initial read failure and cancellation never claim save success', async () => {
  const s = storage(), q = locks(), controller = new AbortController()
  const pending = commitNotepad(null, [note()], { storage: s, lock: q.lock, signal: controller.signal }); controller.abort(); q.next()
  assert.deepEqual(await pending, { ok: false, error: 'cancelled' }); assert.equal(s.writes.length, 0)
  assert.equal(readNotepad({ getItem() { throw new Error('blocked') } }).ok, false)
  const quota = await commitNotepad(null, [note()], { storage: { getItem: s.getItem, setItem() { throw new DOMException('full', 'QuotaExceededError') } } })
  assert.deepEqual(quota, { ok: false, error: 'quota' }); assert.equal(s.getItem(STORAGE_KEY), null)
})
await check('confirmed callback runs inside lock before delayed Promise continuation', async () => {
  const s = storage(); let resolveLock: (() => void) | undefined, confirmed: string | null = null
  const lock: NotepadLock = (_key, action) => { const result = action(); return new Promise(resolve => { resolveLock = () => resolve(result) }) }
  const first = commitNotepad(null, [note('A')], { storage: s, lock, onConfirmed: result => { confirmed = result.raw } })
  assert.equal(confirmed, s.getItem(STORAGE_KEY)); assert.notEqual(confirmed, null)
  const next = await commitNotepad(confirmed, [note('B')], { storage: s }); assert.equal(next.ok, true)
  resolveLock?.(); await first; assert.equal(JSON.parse(s.getItem(STORAGE_KEY)!)[0].content, 'B')
})
await check('settings are separate, strict, CAS guarded and leave notes unchanged', async () => {
  const raw = JSON.stringify([note()]), s = storage(raw)
  assert.equal(inspectNotepadSettings('{"fontSize":99,"mono":false,"wrap":true}').ok, false)
  const result = await commitNotepadSettings(null, { fontSize: 14, mono: true, wrap: false }, { storage: s })
  assert.equal(result.ok, true); assert.equal(s.getItem(STORAGE_KEY), raw); assert.deepEqual(s.writes, [SETTINGS_KEY])
  assert.deepEqual(await commitNotepadSettings(null, { fontSize: 20, mono: false, wrap: true }, { storage: s }), { ok: false, error: 'conflict' })
})
console.log(`notepad persistence: ${groups} groups passed`)
