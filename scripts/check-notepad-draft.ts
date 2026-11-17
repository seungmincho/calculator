import assert from 'node:assert/strict'
import { STORAGE_KEY, type Note } from '../src/utils/notepad.ts'
import { createNotepadDraft, type NotepadTimers } from '../src/utils/notepadDraft.ts'
import type { NotepadLock } from '../src/utils/notepadPersistence.ts'
const note = (content = 'saved', id = 'id'): Note => ({ id, title: '', content, createdAt: 1, updatedAt: 2 })
const raw = (content: string) => JSON.stringify([note(content)])
function storage(initial: string | null = raw('saved')) {
  let value = initial
  const writes: string[] = []
  return { writes, getItem: () => value, setItem: (_key: string, next: string) => { writes.push(next); value = next }, external: (next: string | null) => { value = next } }
}
function timers() {
  const jobs: { callback: () => void; cancelled: boolean; ms: number }[] = []
  const port: NotepadTimers = { set(callback, ms) { jobs.push({ callback, ms, cancelled: false }); return 1 }, clear() { const last = jobs.at(-1); if (last) last.cancelled = true } }
  return { port, jobs, latest: () => { const job = jobs.at(-1); assert.ok(job); job.callback() } }
}
function locks() {
  const jobs: (() => void)[] = []
  const lock: NotepadLock = (_key, action) => new Promise(resolve => { jobs.push(() => resolve(action())) })
  return { lock, jobs, next: () => { const job = jobs.shift(); assert.ok(job); job() } }
}
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
let groups = 0
async function check(name: string, run: () => unknown) { await run(); groups++; console.log(`PASS ${name}`) }
await check('initialize and Strict replay preserve the memory draft without bootstrap writes', async () => {
  const s = storage(), t = timers(), c = createNotepadDraft({ storage: s, timers: t.port })
  assert.equal(c.edit([note('too early')]), false); c.initialize(); c.dispose(); c.activate(); c.initialize()
  assert.equal(s.writes.length, 0); assert.equal(c.snapshot().notes[0].content, 'saved')
  c.edit([note('draft')]); c.dispose(); c.activate(); c.initialize(); assert.equal(c.snapshot().notes[0].content, 'draft')
  t.latest(); await settle(); assert.equal(s.getItem(), raw('draft')); c.dispose()
  const empty = storage(null), blank = createNotepadDraft({ storage: empty, timers: timers().port }); blank.initialize(note('')); blank.hide()
  assert.equal(blank.snapshot().dirty, false); assert.equal(empty.writes.length, 0); blank.dispose()
})
await check('400ms debounce ignores stale callback even when timer IDs are reused', async () => {
  const s = storage(), t = timers(), c = createNotepadDraft({ storage: s, timers: t.port }); c.initialize()
  c.edit([note('A')]); const old = t.jobs[0].callback; c.edit([note('B')]); old(); assert.equal(s.writes.length, 0)
  assert.equal(t.jobs.at(-1)?.ms, 400); t.latest(); await settle(); assert.equal(s.getItem(), raw('B')); assert.equal(c.snapshot().status, 'saved'); c.dispose()
})
await check('editing while a Web Lock waits cancels the old write and saves only the current revision', async () => {
  const s = storage(), q = locks(), c = createNotepadDraft({ storage: s, lock: q.lock, timers: timers().port }); c.initialize()
  c.edit([note('A')]); const first = c.requestSave(); c.edit([note('B')]); const second = c.requestSave()
  q.next(); q.next(); assert.deepEqual(await first, { ok: false, error: 'cancelled' }); assert.equal((await second).ok, true)
  assert.deepEqual(s.writes, [raw('B')]); c.dispose()
})
await check('own confirmed basis advances before a delayed Promise and cannot be regressed by its old continuation', async () => {
  const s = storage(), deferred: (() => void)[] = []
  const lock: NotepadLock = (_key, action) => { const result = action(); return new Promise(resolve => { deferred.push(() => resolve(result)) }) }
  const c = createNotepadDraft({ storage: s, lock, timers: timers().port }); c.initialize(); c.edit([note('A')]); const a = c.requestSave()
  c.edit([note('B')]); const b = c.requestSave(); assert.equal(s.getItem(), raw('B'))
  deferred[1](); await b; deferred[0](); await a
  assert.equal(c.snapshot().notes[0].content, 'B'); assert.equal(c.snapshot().status, 'saved'); assert.equal(c.snapshot().dirty, false); c.dispose()
})
await check('dirty external changes including key delete and clear preserve the draft until explicit keep both', async () => {
  for (const external of [raw('external'), null]) {
    const s = storage(), c = createNotepadDraft({ storage: s, timers: timers().port, id: () => 'copy' }); c.initialize(); c.edit([note('local edit')])
    s.external(external); c.externalChange(); assert.equal(c.snapshot().notes[0].content, 'local edit'); assert.equal(c.snapshot().status, 'external')
    assert.equal((await c.requestSave()).ok, false); assert.equal(s.getItem(), external)
    const view = c.snapshot(); assert.equal((await c.applyMergedExternal(view.scope, external)).ok, true)
    assert.deepEqual(c.snapshot().notes.map(n => n.content), external ? ['local edit', 'external'] : ['local edit']); assert.equal(c.snapshot().dirty, false); c.dispose()
  }
})
await check('external preview cannot overwrite an edit or changed raw while waiting for lock', async () => {
  for (const edit of [true, false]) {
    const s = storage(), q = locks(), c = createNotepadDraft({ storage: s, lock: q.lock, timers: timers().port }); c.initialize(); s.external(raw('outside')); c.externalChange()
    const v = c.snapshot(), pending = c.applyMergedExternal(v.scope, raw('outside'))
    if (edit) c.edit([note('latest')]); else s.external(raw('later outside'))
    q.next(); const result = await pending; assert.equal(result.ok, false)
    assert.equal(c.snapshot().notes[0].content, edit ? 'latest' : 'saved'); assert.equal(s.writes.length, 0); c.dispose()
  }
})
await check('unknown write recheck confirms only its own snapshot while keeping a later edit', async () => {
  const s = storage(); let failReadback = false, written = false
  const port = { getItem() { if (failReadback && written) throw new Error('read blocked'); return s.getItem() }, setItem(key: string, value: string) { s.setItem(key, value); written = true } }
  const c = createNotepadDraft({ storage: port, timers: timers().port }); c.initialize(); c.edit([note('A')]); failReadback = true
  assert.deepEqual(await c.requestSave(), { ok: false, error: 'unconfirmed' }); assert.equal(s.writes.length, 1)
  c.edit([note('B')]); failReadback = false; c.recheckExternal()
  assert.equal(c.snapshot().notes[0].content, 'B'); assert.equal(c.snapshot().dirty, true); assert.equal(c.snapshot().external, null)
  assert.equal((await c.retry()).ok, true); assert.equal(s.getItem(), raw('B')); assert.equal(s.writes.length, 2); c.dispose()
})
await check('corrupt storage and failed quota keep memory; no automatic failure loop', async () => {
  const s = storage('{broken'), t = timers(), c = createNotepadDraft({ storage: s, timers: t.port }); c.initialize(); c.edit([note('memory')])
  assert.equal(c.snapshot().originalRaw, '{broken'); assert.equal(t.jobs.length, 0); assert.equal((await c.retry()).ok, false); assert.equal(s.writes.length, 0); c.dispose()
  const good = storage(), qTimer = timers(); let quota = true
  const quotaDraft = createNotepadDraft({ storage: { getItem: good.getItem, setItem(key, value) { if (quota) throw new DOMException('full', 'QuotaExceededError'); good.setItem(key, value) } }, timers: qTimer.port })
  quotaDraft.initialize(); quotaDraft.edit([note('retained')]); qTimer.latest(); await settle(); assert.equal(quotaDraft.snapshot().error, 'quota')
  quotaDraft.edit([note('newer')]); assert.equal(qTimer.jobs.length, 1); quota = false; assert.equal((await quotaDraft.retry()).ok, true); assert.equal(good.getItem(), raw('newer')); quotaDraft.dispose()
})
await check('undo belongs to one actual mutation; no-op/selection preserves it and later edits or external changes invalidate it', () => {
  const s = storage(), c = createNotepadDraft({ storage: s, timers: timers().port }); c.initialize(); c.editUndoable([])
  const token = c.snapshot().undoToken!; assert.equal(c.edit([]), false); c.select(null); assert.equal(c.undo(token), true); assert.equal(c.snapshot().notes[0].content, 'saved')
  c.editUndoable([note('replaced')]); const old = c.snapshot().undoToken!; c.edit([note('typed after')]); assert.equal(c.undo(old), false); assert.equal(c.snapshot().notes[0].content, 'typed after')
  c.editUndoable([]); const externalToken = c.snapshot().undoToken!; s.external(null); c.externalChange(); assert.equal(c.undo(externalToken), false); c.dispose()
})
await check('pagehide starts no write, cancels queued work; BFCache return rechecks without replacing memory', async () => {
  const s = storage(), q = locks(), t = timers(), c = createNotepadDraft({ storage: s, lock: q.lock, timers: t.port }); c.initialize(); c.edit([note('draft')])
  const oldTimer = t.jobs[0].callback; c.hide(); assert.equal(q.jobs.length, 1); c.pagehide(); oldTimer(); q.next(); await settle(); assert.equal(s.writes.length, 0)
  s.external(raw('elsewhere')); c.pageshow(); assert.equal(c.snapshot().notes[0].content, 'draft'); assert.equal(c.snapshot().status, 'external'); assert.equal(s.writes.length, 0); c.dispose()
})
await check('reentrant UI publication cannot submit an obsolete snapshot', async () => {
  const s = storage(), t = timers(); let replace = false
  const c = createNotepadDraft({ storage: s, timers: t.port, onChange(view) { if (replace && view.status === 'saving') { replace = false; c.edit([note('reentered')]) } } })
  c.initialize(); c.edit([note('old')]); replace = true; assert.deepEqual(await c.requestSave(), { ok: false, error: 'cancelled' })
  assert.equal(s.writes.length, 0); t.latest(); await settle(); assert.equal(s.getItem(), raw('reentered')); c.dispose()
})
console.log(`notepad draft: ${groups} groups passed; key ${STORAGE_KEY}`)
