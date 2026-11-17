import assert from 'node:assert/strict'
import { notepadHost } from './notepad-parent-harness.mjs'

// Reuse browser/React ports only; all fixtures and expected mutations below are independent.
const NOTES = 'toolhub-notepad-notes', SETTINGS = 'toolhub-notepad-settings'
const note = (id, content, extra = {}) => ({ id, title: `제목 ${id}`, content, createdAt: 100, updatedAt: 200, ...extra })
const json = value => JSON.parse(JSON.stringify(value))
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async host => { for (let i = 0; i < 3; i++) { await new Promise(resolve => setImmediate(resolve)); host.render() } }
const txt = (name, value) => ({ name, text: async () => value })
const backup = rows => JSON.stringify({ app: 'toolhub-notepad', version: 1, exportedAt: '2026-11-17T00:00:00.000Z', notes: rows })
const contents = host => Array.from(host.view().notes, row => row.content).sort()
const original = () => [note('a', '원문 A'), note('b', '원문 B', { updatedAt: 150 })]
const boot = async options => { const host = await notepadHost(options); host.boot(); await flush(host); return host }
let count = 0
const only = process.argv.find(value => value.startsWith('--only='))?.slice(7)
async function check(name, run) { if (only && !name.includes(only)) return; await run(); count++; console.log('PASS', name) }

await check('initial reading and Strict replay never write; early guarded event and locale keep the latest raw manuscript', async () => {
  const rows = original(), raw = JSON.stringify(rows), h = await notepadHost({ notes: rows })
  const start = h.by('new'); assert.equal(start.props.disabled, true); start.props.onClick(); h.render(); assert.equal(h.view().notes.length, 0)
  h.replayEffects(); h.boot(); await flush(h); assert.equal(h.by('content').props.value, '원문 A'); assert.equal(h.writes.length, 0)
  const rawInput = '  새 원고\r\n한글 조합 ㄱ\t😀  '; h.input('content', rawInput); h.input('title', '  입력 제목  '); h.locale('en'); h.locale('ko'); h.tick(0)
  assert.equal(h.by('content').props.value, rawInput); assert.equal(h.by('title').props.value, '  입력 제목  '); assert.equal(h.values.get(NOTES), raw)
  h.tick(400); await flush(h); assert.equal(h.writes.length, 1); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, rawInput); assert.equal(h.view().status, 'saved'); h.cleanup()
})
await check('original external-update and clear regressions preserve dirty text until an explicit current preview is accepted', async () => {
  const h = await boot({ notes: original() }); h.input('content', '저장 전 로컬 A'); const selected = h.view().activeId
  const external = [note('a', '다른 탭 A'), note('c', '외부 C')], raw = JSON.stringify(external)
  h.external(raw); h.tick(400); await flush(h); assert.equal(h.by('content').props.value, '저장 전 로컬 A'); assert.equal(h.view().activeId, selected); assert.equal(h.writes.length, 0); assert.equal(h.values.get(NOTES), raw)
  const old = h.view(); h.input('title', '로컬 편집 계속'); h.recovery().onKeepBoth(old.scope, old.external.raw); await flush(h); assert.equal(h.writes.length, 0)
  const current = h.view(); h.recovery().onKeepBoth(current.scope, current.external.raw); await flush(h)
  assert.deepEqual(contents(h), ['다른 탭 A', '외부 C', '원문 B', '저장 전 로컬 A'].sort()); assert.equal(h.view().activeId, selected); assert.equal(h.writes.length, 1)
  h.values.delete(NOTES); h.window.dispatch('storage', { key: null }); h.render(); const preserved = contents(h); h.tick(400); await flush(h)
  assert.deepEqual(contents(h), preserved); assert.equal(h.values.has(NOTES), false); assert.equal(h.view().external.value.length, 0)
  const clear = h.view(); h.recovery().onKeepBoth(clear.scope, clear.external.raw); await flush(h); assert.deepEqual(JSON.parse(h.values.get(NOTES)).map(row => row.content).sort(), preserved); h.cleanup()
})
await check('actual keep-both and file import reserve later legitimate IDs and preserve distinct titles, then undo safely', async () => {
  const h = await boot({ notes: [note('a', 'LOCAL')] })
  const NativeDate = Date; h.context.Date = class extends NativeDate { static now() { return 1000 } }; h.context.Math = Object.create(Math); h.context.Math.random = () => 0.25
  const incoming = [note('a', 'REMOTE'), note('1000-9', 'REMOTE', { title: '다른 제목' })]
  h.external(JSON.stringify(incoming)); const v = h.view(); h.recovery().onKeepBoth(v.scope, v.external.raw); await flush(h)
  const rows = json(h.view().notes); assert.deepEqual(rows.map(row => row.id), ['a', '1000-9-1', '1000-9']); assert.deepEqual(rows.map(row => row.title), ['제목 a', '제목 a', '다른 제목']); assert.deepEqual(rows.map(row => row.content), ['LOCAL', 'REMOTE', 'REMOTE'])
  await h.import([txt('새 파일.json', backup([note('extra', 'IMPORTED')]))]); await flush(h); assert.equal(h.file.value, ''); const undo = h.by('undo').props.onClick
  h.input('content', 'LOCAL NOW'); undo(); h.render(); assert.deepEqual(contents(h), ['IMPORTED', 'LOCAL NOW', 'REMOTE', 'REMOTE'].sort()); assert.equal(h.view().undoToken, null); h.cleanup()
})
await check('original late-file edit regression, superseded rejection, same-file choice and partial failure never revert current text', async () => {
  const h = await boot({ notes: original() }), slow = pending(); let secondRead = 0
  const task = h.import([{ name: 'slow.txt', text: () => slow.promise }, { name: 'never.txt', text: async () => { secondRead++; return 'NEVER' } }])
  h.input('content', 'FILE 이후 최신 편집'); slow.resolve('OLD FILE'); await task; await flush(h); assert.equal(secondRead, 0); assert.equal(h.by('content').props.value, 'FILE 이후 최신 편집'); assert.equal(h.view().notes.length, 2)
  const old = pending(), previous = h.import([{ name: 'old.txt', text: () => old.promise }])
  const good = txt('정상.json', backup([note('c', 'KEEP C')]))
  await h.import([txt('깨진.json', '{'), good]); await flush(h); old.reject(new Error('old read denied')); await previous; await flush(h)
  assert.deepEqual(contents(h), ['FILE 이후 최신 편집', 'KEEP C', '원문 B'].sort()); assert.ok(h.text().includes('깨진.json'))
  await h.import([good]); await flush(h); assert.equal(h.view().notes.length, 3)
  const cancelled = pending(), read = h.import([{ name: 'cancel.txt', text: () => cancelled.promise }]); h.click('import-cancel'); cancelled.resolve('CANCELLED'); await read; await flush(h); assert.equal(h.view().notes.length, 3)
  const last = pending(), late = h.import([{ name: 'late.txt', text: () => last.promise }]); h.cleanup(); last.reject(new Error('unmounted')); await late; assert.equal(h.writes.length, 0)
})
await check('delete undo and toast timeout have separate owners; later editing cannot resurrect removed content', async () => {
  const h = await boot({ notes: original() }); h.click('delete', 'a'); const firstUndo = h.by('undo').props.onClick, firstTimer = h.timerCallbacks.filter(row => row.ms === 6000).at(-1).callback
  assert.equal(h.by('content').props.value, '원문 B'); firstUndo(); h.render(); assert.equal(h.by('content').props.value, '원문 A')
  h.click('delete', 'b'); const currentUndo = h.by('undo').props.onClick; firstTimer(); h.render(); assert.equal(typeof h.by('undo').props.onClick, 'function')
  h.input('content', 'AFTER DELETE'); currentUndo(); h.render(); assert.deepEqual(contents(h), ['AFTER DELETE']); assert.equal(h.view().undoToken, null)
  h.click('export-txt'); assert.equal(await h.downloads[0].blob.text(), 'AFTER DELETE'); h.cleanup(); assert.equal(h.urls.size, 0)
})
await check('confirmed basis advances inside the real parent lock before continuation; queued old writes lose ownership', async () => {
  const h = await boot({ notes: [note('a', '0')] }); h.hold(); h.input('content', '1'); h.tick(400); assert.equal(h.pending.length, 1)
  h.release(); h.input('content', '2'); h.tick(400); assert.equal(h.pending.length, 1); h.release(); await flush(h)
  assert.equal(h.writes.length, 2); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, '2'); assert.equal(h.view().status, 'saved')
  h.input('content', '3'); h.tick(400); h.input('content', '4'); h.tick(400); assert.equal(h.pending.length, 2)
  h.release(); await flush(h); assert.equal(h.writes.length, 2); h.release(); await flush(h); assert.equal(h.writes.length, 3); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, '4')
  assert.ok(h.lockNames.every(key => key === NOTES)); h.cleanup()
})
await check('hidden flush stays pending until confirmed; pagehide cancels queued writes and pageshow rechecks external raw', async () => {
  const h = await boot({ notes: [note('a', 'OLD')] }); h.hold(); h.input('content', 'HIDDEN DRAFT')
  h.document.visibilityState = 'hidden'; h.document.dispatch('visibilitychange'); h.render(); assert.equal(h.pending.length, 1); assert.equal(h.view().status, 'saving'); assert.equal(h.writes.length, 0)
  const queued = h.pending[0]; h.window.dispatch('pagehide'); h.render(); assert.equal(queued.config.signal.aborted, true); h.release(); await flush(h); assert.equal(h.writes.length, 0)
  const changed = JSON.stringify([note('a', 'REMOTE WHILE AWAY')]); h.values.set(NOTES, changed); h.document.visibilityState = 'visible'; h.window.dispatch('pageshow'); await flush(h)
  assert.equal(h.by('content').props.value, 'HIDDEN DRAFT'); assert.equal(h.view().status, 'external'); h.tick(400); assert.equal(h.values.get(NOTES), changed); assert.equal(h.writes.length, 0); h.cleanup()
})
await check('unknown readback and corrupt original never claim saved or overwrite raw; explicit recheck retains newer edits', async () => {
  const h = await boot({ notes: [note('a', 'ORIGINAL')] }); h.faults({ unknownKey: NOTES, afterWrite: false }); h.input('content', 'WROTE BUT UNKNOWN'); h.tick(400); await flush(h)
  assert.equal(h.view().error, 'unconfirmed'); assert.equal(h.writes.length, 1); const wrote = h.values.get(NOTES)
  h.input('content', 'NEWER LOCAL'); h.tick(400); await flush(h); assert.equal(h.values.get(NOTES), wrote)
  h.faults({ unknownKey: null }); h.recovery().onRecheck(); await flush(h); assert.equal(h.by('content').props.value, 'NEWER LOCAL'); assert.equal(h.view().dirty, true)
  h.recovery().onRetry(); await flush(h); assert.equal(h.view().status, 'saved'); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, 'NEWER LOCAL'); h.cleanup()
  for (const raw of ['{BROKEN', '{"version":2,"notes":[]}']) {
    const blocked = await boot({ values: new Map([[NOTES, raw]]) }); blocked.click('new'); blocked.input('content', 'MEMORY SAFE'); blocked.tick(400); await flush(blocked); assert.equal(blocked.values.get(NOTES), raw); assert.equal(blocked.writes.length, 0)
    blocked.recovery().onRawBackup(raw); blocked.click('backup'); assert.equal(await blocked.downloads[0].blob.text(), raw); assert.equal(JSON.parse(await blocked.downloads[1].blob.text()).notes[0].content, 'MEMORY SAFE'); blocked.cleanup(); assert.equal(blocked.urls.size, 0)
  }
})
await check('TTS selected/current text and settings remain independent from notes persistence and failed queued settings', async () => {
  const content = '첫 문장\nsecond\n마지막', h = await boot({ notes: [note('a', content)] })
  h.editor.selectionStart = 5; h.editor.selectionEnd = 11; h.by('content').props.onSelect(); h.render(); const oldSelection = h.by('reading', 'selection').props.onClick
  h.click('reading', 'selection'); assert.equal(h.targets.length, 1); const payload = JSON.parse([...h.targets[0].stored.values()][0]); assert.equal(payload.text, content.slice(5, 11)); assert.equal(payload.source, 'notepad'); assert.equal(h.targets[0].url, '/text-to-speech/?from=notepad'); assert.equal(h.targets[0].opener, null)
  h.input('content', 'CHANGED'); oldSelection(); h.render(); assert.equal(h.targets.length, 1); h.click('reading', 'all'); assert.equal(JSON.parse([...h.targets[1].stored.values()][0]).text, 'CHANGED')
  h.faults({ quotaKey: SETTINGS }); const select = h.all().find(node => node.type === 'select' && node.props['aria-label'] === h.t('fontSize')); select.props.onChange({ target: { value: '20' } }); await flush(h)
  assert.equal(h.recovery().settingsError, 'quota'); assert.equal(h.by('content').props.style.fontSize, 20); h.tick(400); await flush(h); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, 'CHANGED')
  h.faults({ quotaKey: null }); h.recovery().onRetrySettings(); await flush(h); assert.equal(JSON.parse(h.values.get(SETTINGS)).fontSize, 20)
  h.hold(); h.all().find(node => node.type === 'select').props.onChange({ target: { value: '24' } }); h.render(); h.window.dispatch('pagehide'); h.release(); await flush(h); assert.equal(JSON.parse(h.values.get(SETTINGS)).fontSize, 20); assert.ok(h.lockNames.includes(SETTINGS)); h.cleanup()
})
console.log(`Notepad independent actual parent: ${count} groups passed`)
