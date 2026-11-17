import assert from 'node:assert/strict'
import { createNotepadDraft } from '../../../src/utils/notepadDraft.ts'
import { createNotepadImporter, mergeImportedNotes, parseNotepadImport } from '../../../src/utils/notepadImport.ts'
import { commitNotepad, commitNotepadSettings, inspectStoredNotes } from '../../../src/utils/notepadPersistence.ts'
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../../../src/utils/notepad.ts'

const note = (id, content = id, extra = {}) => ({ id, title: `제목 ${id}`, content, createdAt: 17, updatedAt: 18, ...extra })
const flush = () => new Promise(resolve => setImmediate(resolve))
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function storage(initial = null) {
  const map = new Map([[STORAGE_KEY, initial]]), writes = []; let afterSet = false
  const io = { quota: false, readbackThrow: false, readUnavailable: false }
  const port = { getItem(key) { if (io.readUnavailable) throw new Error('blocked'); if (afterSet && io.readbackThrow) { afterSet = false; throw new Error('cannot verify') } return map.get(key) ?? null }, setItem(key, raw) { if (io.quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); map.set(key, raw); writes.push({ key, raw }); afterSet = true } }
  return { map, writes, io, port }
}
function queuedLock() {
  const queue = []
  const lock = (key, action, signal) => { const pending = defer(); queue.push({ key, action, signal, pending }); return pending.promise }
  const run = (after = () => {}) => { const job = queue.shift(); assert.ok(job); try { const result = job.action(); after(result); job.pending.resolve(result); return result } catch (error) { job.pending.reject(error); return error } }
  return { queue, lock, run }
}
function draftFixture(initial = JSON.stringify([note('a')]), lock) {
  const store = storage(initial), timers = [], changes = []
  const draft = createNotepadDraft({ storage: store.port, ...(lock ? { lock } : {}), timers: { set(callback, ms) { const timer = { callback, ms, canceled: false }; timers.push(timer); return timer }, clear(timer) { timer.canceled = true } }, id: (() => { let i = 0; return () => `copy-${++i}` })(), onChange: value => changes.push(value) })
  return { store, timers, changes, draft }
}
const tests = [], test = (name, run) => tests.push({ name, run })
test('merge preserves independent IDs and every distinct body without mutating unicode/special-key input', () => {
  const current = [note('__proto__', '\u0000원문\r\n한글😀'), note('constructor', 'same', { title: 'same', pinned: true })]
  const incoming = [note('__proto__', '다른 원문'), note('same-body-id', 'same', { title: 'same', pinned: true }), note('spaces', ' \t\n ')]
  const original = structuredClone({ current, incoming }), merged = mergeImportedNotes(current, incoming, () => '__proto__')
  assert.equal(merged.notes.length, 5); assert.equal(new Set(merged.notes.map(item => item.id)).size, 5)
  for (const item of [...current, ...incoming]) assert.ok(merged.notes.some(saved => saved.title === item.title && saved.content === item.content && saved.createdAt === item.createdAt && saved.updatedAt === item.updatedAt))
  assert.equal(merged.notes.find(item => item.id === '__proto__').content, current[0].content); assert.ok(merged.notes.some(item => item.id === 'same-body-id'))
  assert.deepEqual({ current, incoming }, original)
  const repeated = mergeImportedNotes(merged.notes, incoming, () => 'copy'); assert.equal(repeated.added, 0); assert.equal(repeated.duplicates, 3)
  for (const id of ['__proto__', 'constructor', 'same-body-id', 'spaces']) assert.ok(repeated.notes.some(item => item.id === id))
})
test('strict first reads do no writes; corrupt/future raw remains intact during memory edits and retries', async () => {
  for (const raw of ['{bad', JSON.stringify({ version: 99, notes: [note('a')] }), JSON.stringify([{ ...note('a'), future: true }])]) {
    const f = draftFixture(raw); const before = f.draft.initialize(note('empty')); assert.equal(before.ready, true); assert.equal(f.store.writes.length, 0)
    f.draft.edit([note('local', 'current unsaved')]); assert.equal(f.draft.snapshot().notes[0].content, 'current unsaved')
    await f.draft.requestSave(); await f.draft.retry(); assert.equal(f.store.writes.length, 0); assert.equal(f.store.map.get(STORAGE_KEY), raw); assert.equal(f.draft.snapshot().originalRaw, raw); f.draft.dispose()
  }
  const original = [note('old', 'x'.repeat(120000), { createdAt: -1, updatedAt: 1e30 })], f = draftFixture(JSON.stringify(original)); f.draft.initialize(); assert.deepEqual(f.draft.snapshot().notes, original); assert.equal(f.store.writes.length, 0); f.draft.dispose()
})
test('commit captures the proposed list and rejects conflicting or canceled basis inside the lock', async () => {
  const f = storage(JSON.stringify([note('a')])), q = queuedLock(), proposal = [note('a', 'new')], expected = f.map.get(STORAGE_KEY)
  const result = commitNotepad(expected, proposal, { storage: f.port, lock: q.lock }); proposal[0].content = 'mutated later'; q.run(); assert.equal((await result).ok, true); assert.equal(JSON.parse(f.map.get(STORAGE_KEY))[0].content, 'new')
  const firstWrites = f.writes.length, conflict = commitNotepad(expected, [note('bad')], { storage: f.port, lock: q.lock }); q.run(); assert.equal((await conflict).error, 'conflict'); assert.equal(f.writes.length, firstWrites)
  const abort = new AbortController(), canceled = commitNotepad(f.map.get(STORAGE_KEY), [note('bad')], { storage: f.port, lock: q.lock, signal: abort.signal }); abort.abort(); q.run(); assert.equal((await canceled).error, 'cancelled'); assert.equal(f.writes.length, firstWrites)
})
test('inside-lock confirmation updates own basis before a newer edit and second queued write', async () => {
  const q = queuedLock(), f = draftFixture(undefined, q.lock); f.draft.initialize(); f.draft.edit([note('a', 'first')]); const first = f.draft.requestSave()
  let second
  q.run(() => {
    assert.equal(f.draft.snapshot().originalRaw, f.store.map.get(STORAGE_KEY))
    f.draft.edit([note('a', 'latest')]); second = f.draft.requestSave()
  })
  assert.equal((await first).ok, true); assert.equal(f.draft.snapshot().notes[0].content, 'latest'); assert.equal(q.queue.length, 1)
  q.run(); assert.equal((await second).ok, true); assert.equal(JSON.parse(f.store.map.get(STORAGE_KEY))[0].content, 'latest'); assert.equal(f.draft.snapshot().dirty, false); f.draft.dispose()
})
test('readback unknown never rolls back and explicit retry adopts the written basis while keeping newer draft', async () => {
  const f = draftFixture(); f.draft.initialize(); f.draft.edit([note('a', 'written')]); f.store.io.readbackThrow = true
  const result = await f.draft.requestSave(); assert.equal(result.error, 'unconfirmed'); assert.equal(f.store.writes.length, 1); assert.equal(JSON.parse(f.store.map.get(STORAGE_KEY))[0].content, 'written')
  f.store.io.readbackThrow = false; f.draft.edit([note('a', 'newer unsaved')]); const rechecked = f.draft.recheckExternal(); assert.equal(rechecked.notes[0].content, 'newer unsaved'); assert.equal(rechecked.dirty, true)
  assert.equal((await f.draft.retry()).ok, true); assert.equal(JSON.parse(f.store.map.get(STORAGE_KEY))[0].content, 'newer unsaved'); assert.equal(f.store.writes.length, 2); f.draft.dispose()
})
test('external updates and clear do not replace dirty memory; explicit keep-both includes both note bodies', async () => {
  const f = draftFixture(); f.draft.initialize(); f.draft.edit([note('a', 'local')]); f.store.map.set(STORAGE_KEY, JSON.stringify([note('a', 'external'), note('b', 'external second')]))
  const preview = f.draft.externalChange(); assert.equal(preview.notes[0].content, 'local'); assert.equal(f.store.writes.length, 0); assert.equal(preview.external.ok, true)
  assert.equal((await f.draft.applyMergedExternal(preview.scope, preview.external.raw)).ok, true)
  const contents = f.draft.snapshot().notes.map(item => item.content).sort(); assert.deepEqual(contents, ['external', 'external second', 'local']); assert.equal(new Set(f.draft.snapshot().notes.map(item => item.id)).size, 3)
  f.draft.edit(f.draft.snapshot().notes.map(item => item.id === 'a' ? { ...item, content: 'after edit' } : item))
  f.store.map.set(STORAGE_KEY, null); const clear = f.draft.externalChange(); const writeCount = f.store.writes.length
  assert.equal(clear.notes[0].content, 'after edit'); assert.equal(clear.external.raw, null); assert.equal(f.store.writes.length, writeCount)
  assert.equal((await f.draft.applyMergedExternal(clear.scope, null)).ok, true); assert.equal(JSON.parse(f.store.map.get(STORAGE_KEY)).length, 3); f.draft.dispose()
})
test('keep-both checks preview raw/scope; quota retains the complete combined draft without replacing stored raw', async () => {
  const q = queuedLock(), f = draftFixture(undefined, q.lock); f.draft.initialize(); f.draft.edit([note('a', 'local')])
  const externalRaw = JSON.stringify([note('a', 'external')]); f.store.map.set(STORAGE_KEY, externalRaw); const preview = f.draft.externalChange()
  const queued = f.draft.applyMergedExternal(preview.scope, externalRaw); f.draft.edit([note('a', 'latest edit')]); q.run(); assert.equal((await queued).error, 'cancelled'); assert.equal(f.store.writes.length, 0)
  const latest = f.draft.recheckExternal(); f.store.io.quota = true; const combined = f.draft.applyMergedExternal(latest.scope, externalRaw); q.run(); assert.equal((await combined).error, 'quota')
  assert.deepEqual(f.draft.snapshot().notes.map(item => item.content).sort(), ['external', 'latest edit']); assert.equal(f.store.map.get(STORAGE_KEY), externalRaw); f.draft.dispose()
})
test('undo only affects its revision; later edits and Strict dispose/activate cancel old timers and locks', async () => {
  const q = queuedLock(), f = draftFixture(undefined, q.lock); f.draft.initialize(); f.draft.editUndoable([note('a'), note('import', 'imported')]); const token = f.draft.snapshot().undoToken
  assert.equal(f.draft.undo(token), true); assert.equal(f.draft.snapshot().notes.length, 1)
  f.draft.editUndoable([note('a'), note('again')]); const staleToken = f.draft.snapshot().undoToken; f.draft.edit([note('a', 'edited')]); assert.equal(f.draft.undo(staleToken), false)
  const oldTimers = [...f.timers], pending = f.draft.requestSave(); f.draft.dispose(); f.draft.activate()
  for (const timer of oldTimers) timer.callback(); q.run(); assert.equal((await pending).error, 'cancelled'); assert.equal(f.store.writes.length, 0); assert.equal(f.draft.snapshot().notes[0].content, 'edited')
  const retry = f.draft.requestSave(); q.run(); assert.equal((await retry).ok, true); assert.equal(JSON.parse(f.store.map.get(STORAGE_KEY))[0].content, 'edited'); f.draft.dispose()
})
test('pagehide starts no new lock; pageshow observes external bytes before resuming dirty saves', async () => {
  const q = queuedLock(), f = draftFixture(undefined, q.lock); f.draft.initialize(); f.draft.edit([note('a', 'draft')]); f.draft.pagehide(); assert.equal(q.queue.length, 0)
  f.store.map.set(STORAGE_KEY, JSON.stringify([note('else', 'other tab')])); f.draft.pageshow(); assert.equal(f.draft.snapshot().status, 'external'); assert.equal(f.draft.snapshot().notes[0].content, 'draft')
  for (const timer of f.timers) timer.callback(); await flush(); assert.equal(q.queue.length, 0); assert.equal(f.store.writes.length, 0); f.draft.dispose()
})
test('sequential importer consumes late rejects/cancel and keeps individual failures beside successful files', async () => {
  const importer = createNotepadImporter({ id: () => 'text-id', now: () => 25 }), pending = defer(), reads = []
  const old = importer.read([{ name: 'old.txt', text() { reads.push('old'); return pending.promise } }, { name: 'never.txt', async text() { reads.push('never'); return 'never' } }])
  importer.cancel(); const fresh = await importer.read([{ name: 'new.txt', async text() { return '새\r\n본문' } }]); assert.equal(fresh.notes[0].content, '새\n본문'); pending.reject(new Error('late')); assert.equal(await old, null); assert.deepEqual(reads, ['old'])
  const report = await importer.read([{ name: 'bad.json', async text() { return '{' } }, { name: 'missing.txt', async text() { throw new Error('read') } }, { name: 'valid.json', async text() { return JSON.stringify([note('json')]) } }])
  assert.equal(report.files, 3); assert.deepEqual(report.failures, [{ name: 'bad.json', error: 'corrupt' }, { name: 'missing.txt', error: 'unreadable' }]); assert.equal(report.notes[0].id, 'json')
  const late = defer(), disposed = importer.read([{ name: 'dispose.txt', text: () => late.promise }]); importer.dispose(); importer.activate(); late.resolve('old'); assert.equal(await disposed, null)
  assert.equal((await importer.read([{ name: 'fresh.txt', async text() { return 'active again' } }])).notes[0].content, 'active again')
  assert.equal(parseNotepadImport(JSON.stringify({ app: 'toolhub-notepad', version: 9, notes: [] })).error, 'unsupported'); importer.dispose()
})
test('notes/settings use distinct locks and strict settings failure never overwrites valid notes', async () => {
  const f = storage(JSON.stringify([note('a')])), q = queuedLock(), raw = f.map.get(STORAGE_KEY)
  f.map.set(SETTINGS_KEY, '{bad'); const settings = commitNotepadSettings('{bad', DEFAULT_SETTINGS, { storage: f.port, lock: q.lock }); assert.equal(q.queue[0].key, SETTINGS_KEY); q.run(); assert.equal((await settings).error, 'corrupt')
  const notes = commitNotepad(raw, [note('a', 'new content')], { storage: f.port, lock: q.lock }); assert.equal(q.queue[0].key, STORAGE_KEY); q.run(); assert.equal((await notes).ok, true); assert.equal(f.map.get(SETTINGS_KEY), '{bad'); assert.equal(inspectStoredNotes(f.map.get(STORAGE_KEY)).value[0].content, 'new content')
})

for (const { name, run } of tests) { await run(); console.log('PASS', name) }
console.log(`Notepad unconnected independent logic: ${tests.length} groups passed`)
