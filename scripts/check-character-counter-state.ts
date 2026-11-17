import assert from 'node:assert/strict'
import { createCharacterDraft, initializeCharacterDraft, patchCharacterDraft, selectCharacterTab, undoCharacterDraft, clearCharacterDraft, characterDraftRaw } from '../src/utils/characterCounterDraft.ts'
import { createCharacterCopy } from '../src/utils/characterCounterActions.ts'

const saved = () => ({ active: 4, tabs: Array.from({ length: 5 }, (_, i) => ({ title: `Stored ${i}`, text: `original-${i}`, target: i + 100, basis: 'chars' as const })) })
let count = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); count++; console.log('PASS', name) }
await check('initial field merge preserves all untouched5tabs and user active intention', () => {
  const original = saved(), bytes = JSON.stringify(original)
  let state = createCharacterDraft()
  state = patchCharacterDraft(state, 0, { text: 'EARLY' }); state = selectCharacterTab(state, 2); state = patchCharacterDraft(state, 2, { title: 'NEW TITLE', target: 700, basis: 'bytesKr' })
  state = initializeCharacterDraft(state, original)
  assert.deepEqual(state.tabs[0], { ...original.tabs[0], text: 'EARLY' }); assert.deepEqual(state.tabs[2], { ...original.tabs[2], title: 'NEW TITLE', target: 700, basis: 'bytesKr' }); assert.deepEqual([state.tabs[1], state.tabs[3], state.tabs[4]], [original.tabs[1], original.tabs[3], original.tabs[4]])
  assert.equal(state.active, 2); assert.equal(JSON.stringify(original), bytes); assert.equal(initializeCharacterDraft(state, saved()), state)
})
await check('same-value nonediting and explicit initial tab0 are distinct', () => {
  const initial = createCharacterDraft(); assert.equal(patchCharacterDraft(initial, 0, { text: '' }), initial)
  assert.equal(initializeCharacterDraft(initial, saved()).active, 4)
  const chosen = selectCharacterTab(initial, 0); assert.equal(initializeCharacterDraft(chosen, saved()).active, 0)
  const state = initializeCharacterDraft(patchCharacterDraft(initial, 0, { text: '  원문\r\n\t😀' }), null); assert.equal(state.tabs[0].text, '  원문\r\n\t😀'); assert.equal(state.tabs.length, 5)
})
await check('20field coordinates independently override initial storage without transforming strings', () => {
  for (let tab = 0; tab < 5; tab++) for (const patch of [{ text: 'exact\r\n' }, { title: '제목' }, { target: 0 }, { basis: 'x' as const }]) {
    let state = selectCharacterTab(createCharacterDraft(), tab); state = patchCharacterDraft(state, tab, patch); state = initializeCharacterDraft(state, saved())
    for (let i = 0; i < 5; i++) assert.deepEqual(state.tabs[i], { ...saved().tabs[i], ...(i === tab ? patch : {}) })
  }
})
await check('undo protects after-revision and all restored fields; tab-only move retains valid undo', () => {
  const initial = initializeCharacterDraft(createCharacterDraft(), { ...saved(), active: 0 })
  let changed = patchCharacterDraft(initial, 0, { text: 'RESTORED', title: 'RESTORE', target: 999, basis: 'x' }, true)
  const token = changed.undo!.token; changed = selectCharacterTab(changed, 1); assert.equal(undoCharacterDraft(changed, token), changed)
  changed = selectCharacterTab(changed, 0); const back = undoCharacterDraft(changed, token); assert.deepEqual(back.tabs, initial.tabs); assert.equal(back.undo, null)
  changed = patchCharacterDraft(changed, 0, { text: 'USER' }); changed = patchCharacterDraft(changed, 0, { text: 'RESTORED' }); assert.equal(undoCharacterDraft(changed, token), changed)
})
await check('no-op transform keeps existing undo, invalid updates never change state, clear advances every owner', () => {
  const initial = initializeCharacterDraft(createCharacterDraft(), { ...saved(), active: 0 }), changed = patchCharacterDraft(initial, 0, { text: 'UPPER' }, true)
  assert.equal(patchCharacterDraft(changed, 0, { text: 'UPPER' }, true), changed)
  assert.equal(patchCharacterDraft(changed, 0, { target: NaN }), changed); assert.equal(selectCharacterTab(changed, 5), changed)
  const empty = clearCharacterDraft(changed); assert.ok(empty.revision > changed.revision); assert.equal(empty.active, 0); assert.equal(empty.undo, null); assert.equal(empty.tabs.every(tab => tab.text === '' && tab.title === '' && tab.target === 500), true)
  assert.deepEqual(Object.keys(JSON.parse(characterDraftRaw(empty))).sort(), ['active', 'tabs']); assert.equal(undoCharacterDraft(empty, changed.undo!.token), empty)
})
const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const request = (text: string) => ({ text, tab: 0, revision: 1, kind: 'copy' as const })
await check('false and throwing fallback fail; true is success; missing native uses the same verified result', async () => {
  for (const mode of ['false', 'throw', 'true'] as const) {
    const owner = createCharacterCopy({ clipboard: { writeText: async () => { throw new Error('denied') }, fallback: () => { if (mode === 'throw') throw new Error('denied'); return mode === 'true' } }, after: () => () => {} }, () => {})
    assert.equal(await owner.request(request('본문')), mode === 'true' ? 'copied' : 'failed'); owner.dispose()
  }
  const owner = createCharacterCopy({ clipboard: { fallback: () => false }, after: () => () => {} }, () => {}); assert.equal(await owner.request(request('value')), 'failed'); owner.dispose()
})
await check('superseded request and context invalidation consume late reject without legacy writes', async () => {
  let legacy = 0; const jobs: ReturnType<typeof deferred>[] = []
  const owner = createCharacterCopy({ clipboard: { writeText: () => { const job = deferred(); jobs.push(job); return job.promise }, fallback: () => { legacy++; return true } }, after: () => () => {} }, () => {})
  const a = owner.request(request('A')), b = owner.request({ ...request('B'), kind: 'speller' }); jobs[0].reject(new Error('old')); jobs[1].resolve(); assert.equal(await a, 'stale'); assert.equal(await b, 'copied'); assert.equal(legacy, 0)
  const c = owner.request(request('C')); owner.invalidate(); jobs[2].reject(new Error('context')); assert.equal(await c, 'stale'); assert.equal(legacy, 0); owner.dispose()
})
await check('manual retry uses captured original and old close/timer cannot own new requests', async () => {
  let fail = true; const copied: string[] = [], timers: (() => void)[] = []
  const owner = createCharacterCopy({ clipboard: { writeText: async text => { copied.push(text); if (fail) throw new Error('denied') }, fallback: () => false }, after: callback => { timers.push(callback); return () => {} } }, () => {})
  const input = request('CAPTURED'); await owner.request(input); const old = owner.getSnapshot()!.token; input.text = 'MUTATED'; fail = false; await owner.retry(old); assert.equal(copied.at(-1), 'CAPTURED'); owner.close(old); assert.equal(owner.getSnapshot()!.status, 'copied')
  await owner.request(request('LATEST')); timers[0](); assert.equal(owner.getSnapshot()!.text, 'LATEST'); owner.dispose(); timers.at(-1)!(); assert.equal(owner.getSnapshot(), null)
})
await check('unmount rejects late success and publishes no later state', async () => {
  const job = deferred(); let emissions = 0
  const owner = createCharacterCopy({ clipboard: { writeText: () => job.promise, fallback: () => { throw new Error('must not run') } }, after: () => () => {} }, () => { emissions++ })
  const work = owner.request(request('A')); owner.dispose(); job.resolve(); assert.equal(await work, 'stale'); assert.equal(emissions, 1)
})
console.log(`${count} character draft/copy groups passed`)
