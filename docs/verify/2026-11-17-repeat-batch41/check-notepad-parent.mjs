import assert from 'node:assert/strict'
import { notepadHost, note, NOTES, SETTINGS, plain, deferred, settle } from './notepad-parent-harness.mjs'

let groups = 0
async function test(name, run) { await run(); console.log('PASS ' + name); groups++ }
const has = (h, name) => h.all().some(node => Object.hasOwn(node.props, 'data-notepad-' + name))
const content = h => h.view().notes.find(n => n.id === h.view().activeId)?.content

await test('initial zero writes, actual Strict replay, legacy raw and blocked corrupt raw', async () => {
  const raw = ' [ ' + JSON.stringify(note('legacy', '  원문\r\n\u0000', { createdAt: -1.5, pinned: false })) + ' ] '
  const h = await notepadHost({ values: new Map([[NOTES, raw]]) })
  assert.equal(h.view().ready, false); assert.equal(h.by('new').props.disabled, true)
  h.click('new'); h.replayEffects(); h.boot(); assert.equal(content(h), '  원문\r\n\u0000'); assert.equal(h.values.get(NOTES), raw)
  h.replayEffects(); h.boot(); h.locale('en'); await settle(h); assert.equal(h.writes.length, 0)
  h.input('content', '새 원고'); h.tick(400); await settle(h); assert.equal(h.view().status, 'saved'); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, '새 원고'); h.cleanup()
  for (const rawValue of [null, '{broken', '{"version":2}']) {
    const x = await notepadHost({ values: new Map(rawValue === null ? [] : [[NOTES, rawValue]]) }); x.boot(); x.tick(400); await settle(x); assert.equal(x.writes.length, 0)
    if (rawValue !== null) { x.click('new'); x.input('content', '메모리 원고'); x.tick(400); await settle(x); assert.equal(x.values.get(NOTES), rawValue); assert.equal(content(x), '메모리 원고') }
    x.cleanup()
  }
})

await test('dirty external change, delete and clear keep current; explicit keep both protects preview', async () => {
  const h = await notepadHost(); h.boot(); h.input('content', 'local dirty')
  h.external(JSON.stringify([note('a', 'other tab'), note('b', 'other note')]))
  assert.equal(content(h), 'local dirty'); assert.equal(h.view().status, 'external'); h.tick(400); await settle(h); assert.equal(h.writes.length, 0)
  const stale = h.recovery(), oldView = h.view(); h.input('content', 'local newer'); stale.onKeepBoth(oldView.scope, oldView.external.raw); await settle(h); assert.equal(h.writes.length, 0)
  const v = h.view(); h.recovery().onKeepBoth(v.scope, v.external.raw); await settle(h)
  assert.equal(h.view().status, 'saved'); assert.deepEqual(plain(h.view().notes.map(n => n.content).sort()), ['local newer', 'other note', 'other tab'].sort())
  h.external(null); assert.equal(h.view().notes.length, 3); assert.equal(h.view().external.value.length, 0)
  const cleared = h.view(); h.recovery().onKeepBoth(cleared.scope, null); await settle(h); assert.equal(JSON.parse(h.values.get(NOTES)).length, 3)
  h.values.clear(); h.window.dispatch('storage', { key: null }); h.render(); assert.equal(h.view().notes.length, 3); assert.equal(h.view().external.raw, null); h.cleanup()
})

await test('queued key locks cancel older edit and stale merge; two tab raw CAS', async () => {
  const values = new Map([[NOTES, JSON.stringify([note()])]])
  const a = await notepadHost({ values }), b = await notepadHost({ values }); a.boot(); b.boot(); a.hold()
  a.input('content', 'old'); a.tick(400); a.input('content', 'new'); a.tick(400); assert.equal(a.pending.length, 2)
  a.release(); await settle(a); assert.equal(a.writes.length, 0); a.release(); await settle(a); assert.equal(JSON.parse(values.get(NOTES))[0].content, 'new')
  b.input('content', 'other draft'); b.tick(400); await settle(b); assert.equal(b.view().error, 'conflict'); assert.equal(content(b), 'other draft'); assert.equal(JSON.parse(values.get(NOTES))[0].content, 'new')
  b.recovery().onRecheck(); b.render(); b.hold(); const v = b.view(); b.recovery().onKeepBoth(v.scope, v.external.raw); b.input('content', 'latest after merge click'); b.release(); await settle(b); assert.equal(content(b), 'latest after merge click'); assert.equal(b.writes.length, 0)
  assert.ok(a.lockNames.every(k => k === NOTES)); a.cleanup(); b.cleanup()
})

await test('quota, read failure and uncertain readback preserve raw/memory; explicit retry reconfirms', async () => {
  const h = await notepadHost(); h.boot(); const original = h.values.get(NOTES)
  h.faults({ quotaKey: NOTES }); h.input('content', 'quota memory'); h.tick(400); await settle(h); assert.equal(h.view().error, 'quota'); assert.equal(h.values.get(NOTES), original)
  h.faults({ quotaKey: null }); h.recovery().onRetry(); await settle(h); assert.equal(h.view().status, 'saved')
  h.faults({ unknownKey: NOTES, afterWrite: false }); h.input('content', 'written but uncertain'); h.tick(400); await settle(h); assert.equal(h.view().error, 'unconfirmed'); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, 'written but uncertain')
  h.input('content', 'newer memory'); const count = h.writes.length; h.faults({ unknownKey: null }); h.recovery().onRetry(); await settle(h); assert.equal(h.view().status, 'saved'); assert.equal(h.writes.length, count + 1); assert.equal(JSON.parse(h.values.get(NOTES))[0].content, 'newer memory')
  h.faults({ readKey: NOTES }); h.recovery().onRecheck(); h.render(); assert.equal(h.view().error, 'unavailable'); assert.equal(content(h), 'newer memory'); h.cleanup()
})

await test('late files cannot replace edits/new selection/cancel; partial failures are explicit', async () => {
  const h = await notepadHost(); h.boot(); const old = deferred(); const request = h.import([{ name: 'old.txt', text: () => old.promise }]); assert.equal(h.file.value, '')
  h.input('content', 'typed while loading'); old.resolve('stale'); await request; await settle(h); assert.equal(h.view().notes.length, 1); assert.equal(content(h), 'typed while loading'); assert.equal(h.by('import-status').props['data-notepad-import-status'], 'cancelled')
  const a = deferred(), b = deferred(); const first = h.import([{ name: 'old.md', text: () => a.promise }]); const second = h.import([{ name: 'new.md', text: () => b.promise }]); a.reject(new Error('late')); b.resolve('line1\r\nline2\rline3'); await Promise.all([first, second]); await settle(h)
  assert.deepEqual(plain(h.view().notes.map(n => n.content)), ['typed while loading', 'line1\nline2\nline3'])
  const c = deferred(); const cancelled = h.import([{ name: 'cancel.txt', text: () => c.promise }]); h.click('import-cancel'); c.resolve('no'); await cancelled; await settle(h); assert.equal(h.view().notes.length, 2)
  await h.import([{ name: 'future.json', text: async () => '{"version":2}' }, { name: 'ok.txt', text: async () => 'kept' }]); await settle(h); assert.equal(h.view().notes.length, 3); assert.ok(h.text().includes('future.json')); h.cleanup()
})

await test('same ID import keeps both; delete/import/replace undo cannot undo later input', async () => {
  const h = await notepadHost({ notes: [note('a', 'one one'), note('b', 'two')] }); h.boot()
  await h.import([{ name: 'self.json', text: async () => JSON.stringify([note('a', 'different')]) }]); await settle(h); assert.equal(h.view().notes.length, 3)
  h.click('undo'); assert.equal(h.view().notes.length, 2)
  h.click('delete', 'a'); const oldUndo = h.by('undo').props.onClick; assert.equal(h.view().notes.length, 1)
  h.click('select', 'b'); h.click('undo'); assert.equal(h.view().notes.length, 2); assert.equal(h.view().activeId, 'a')
  h.click('delete', 'a'); h.input('content', 'new b'); oldUndo(); h.render(); assert.equal(h.view().notes.length, 1); assert.equal(content(h), 'new b'); assert.equal(has(h, 'undo'), false)
  h.button(h.t('find.button')).props.onClick(); h.render(); h.find(n => n.props['aria-label'] === h.t('find.find')).props.onChange({ target: { value: 'new' } }); h.render(); h.find(n => n.props['aria-label'] === h.t('find.replace')).props.onChange({ target: { value: '$&' } }); h.render()
  h.button(h.t('find.replaceAll')).props.onClick(); h.render(); assert.equal(content(h), '$& b'); h.click('undo'); assert.equal(content(h), 'new b'); h.cleanup()
})

await test('old toast/focus callbacks cannot clear new undo or move focus to another note', async () => {
  const h = await notepadHost({ notes: [note('a'), note('b'), note('c')] }); h.boot(); h.click('delete', 'a')
  const oldTimer = h.timerCallbacks.filter(x => x.ms === 6000).at(-1).callback
  h.click('delete', 'b'); const token = h.view().undoToken; oldTimer(); h.render(); assert.equal(h.view().undoToken, token); assert.equal(has(h, 'undo'), true)
  h.click('new'); const oldFocus = h.timerCallbacks.filter(x => x.ms === 0).at(-1).callback; h.click('select', 'c'); oldFocus(); assert.notEqual(h.getFocus(), h.editor)
  h.click('new'); h.tick(0); assert.equal(h.getFocus(), h.editor)
  const before = JSON.stringify(h.view().notes); h.locale('en'); assert.equal(JSON.stringify(h.view().notes), before); h.cleanup()
})

await test('view settings stay independent, latest queued edit wins, corrupt settings raw stays', async () => {
  const h = await notepadHost(); h.boot(); h.hold()
  const change = value => { h.find(n => n.type === 'select').props.onChange({ target: { value } }); h.render() }
  change('18'); change('24'); h.release(); await settle(h); assert.equal(h.writes.length, 0); h.release(); await settle(h); assert.equal(JSON.parse(h.values.get(SETTINGS)).fontSize, 24)
  h.hold(false); h.faults({ quotaKey: SETTINGS }); change('20'); await settle(h); assert.equal(h.recovery().settingsError, 'quota'); assert.equal(h.by('content').props.style.fontSize, 20)
  h.input('content', 'independent body'); h.tick(400); await settle(h); assert.equal(h.view().status, 'saved'); assert.equal(h.recovery().settingsError, 'quota')
  h.faults({ quotaKey: null }); h.recovery().onRetrySettings(); await settle(h); assert.equal(JSON.parse(h.values.get(SETTINGS)).fontSize, 20)
  h.external('{bad', SETTINGS); change('18'); await settle(h); assert.equal(h.values.get(SETTINGS), '{bad'); assert.equal(content(h), 'independent body'); h.cleanup()
})

await test('actual selected/full text handoff, stale selection, literal IME and keyboard editing', async () => {
  const h = await notepadHost({ notes: [note('a', 'ABC 한글 DEF')] }); h.boot(); h.editor.setSelectionRange(4, 6); h.by('content').props.onSelect(); h.render(); h.click('reading', 'selection')
  assert.equal(JSON.parse(h.targets[0].stored.get('toolhub-ocr-tts-v1')).text, '한글'); assert.equal(h.targets[0].url, '/text-to-speech/?from=notepad')
  const oldSelection = h.by('reading', 'selection').props.onClick; h.input('content', '조합중 ㄱ\n  그대로'); oldSelection(); h.render(); assert.equal(h.targets.length, 1)
  h.click('reading', 'all'); assert.equal(JSON.parse(h.targets[1].stored.get('toolhub-ocr-tts-v1')).text, '조합중 ㄱ\n  그대로')
  h.faults({ blockPopup: true }); h.click('reading', 'all'); assert.ok(h.text().includes(h.t('reading.popupBlocked')))
  h.editor.setSelectionRange(0, 0); let prevented = 0; const event = key => ({ key, currentTarget: h.editor, preventDefault() { prevented++ } })
  h.by('content').props.onKeyDown(event('Tab')); h.render(); assert.equal(content(h), '\t조합중 ㄱ\n  그대로'); assert.equal(prevented, 1)
  h.by('content').props.onKeyDown(event('Escape')); h.by('content').props.onKeyDown(event('Tab')); h.render(); assert.equal(prevented, 1); h.cleanup()
})

await test('TXT/backup/raw Blob snapshots, URL ownership, pagehide no async write, BFCache reread', async () => {
  const h = await notepadHost({ notes: [note('a', '<html>\u0000\r\n원문')] }); h.boot(); h.click('export-txt'); assert.equal(await h.downloads[0].blob.text(), '<html>\u0000\r\n원문')
  h.click('backup'); const backup = JSON.parse(await h.downloads[1].blob.text()); assert.deepEqual(backup.notes, plain(h.view().notes))
  h.external('{broken'); h.recovery().onRawBackup('{broken'); assert.equal(await h.downloads[2].blob.text(), '{broken'); assert.equal(h.values.get(NOTES), '{broken')
  h.tick(1000); assert.equal(new Set(h.revoked).size, 3); h.click('export-txt'); h.cleanup(); assert.equal(new Set(h.revoked).size, 4); assert.equal(h.revoked.length, 4)
  const b = await notepadHost(); b.boot(); b.input('content', 'unsaved draft'); const count = b.lockNames.length; b.window.dispatch('pagehide'); b.tick(400); await settle(b); assert.equal(b.lockNames.length, count); assert.equal(b.writes.length, 0)
  b.values.set(NOTES, JSON.stringify([note('a', 'external while away')])); b.window.dispatch('pageshow'); b.render(); assert.equal(content(b), 'unsaved draft'); assert.equal(b.view().status, 'external'); b.cleanup()
})
console.log(`notepad actual parent: ${groups} groups passed; controlled ports, native DOM/storage/layout separate`)
