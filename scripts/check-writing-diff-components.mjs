// Actual source/target component events; only browser I/O and Worker transport are controlled.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { compareTextLines, formatTextDiff } from '../src/utils/lineDiff.ts'
import { DiffExecutionError } from '../src/lib/diff/protocol.ts'
import {
  WRITING_DIFF_HANDOFF_KEY as KEY, WRITING_DIFF_HANDOFF_PATH as PATH, WRITING_DIFF_HANDOFF_TTL as TTL,
  createWritingDiffHandoff, parseWritingDiffHandoff,
} from '../src/utils/writingDiffHandoff.ts'
import { WRITING_VERSIONS_KEY, WRITING_DRAFT_KEY } from '../src/utils/writingVersions.ts'
import { TEXT_HANDOFF_KEY } from '../src/utils/textHandoff.ts'

// Add inspection/replay only to an in-memory copy of the existing hook harness.
const harnessPath = path.resolve('docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const harnessModule = new Module(harnessPath)
harnessModule.paths = Module._nodeModulePaths(path.dirname(harnessPath))
harnessModule.require = createRequire(harnessPath)
const harnessSource = fs.readFileSync(harnessPath, 'utf8').replace('render, all: () => all(tree),', `
  pendingTimers: () => [...timers.values()],
  replayEffects() {
    for (const [index] of effects) hooks[index].cleanup?.();
    for (const [index, pending] of effects) hooks[index].cleanup = pending.effect();
    return render();
  },
  render, all: () => all(tree),`)
harnessModule._compile(harnessSource, harnessPath)
const { componentHarness } = harnessModule.exports
const flush = () => new Promise(resolve => setImmediate(resolve))
const has = (node, key) => Object.hasOwn(node.props, key)
const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const messages = locale => merge(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch25/translations-writing-diff.json', 'utf8'))[locale])
const memory = () => {
  const data = new Map(); let writes = 0, removes = 0
  return { data, getItem: key => data.get(key) ?? null, setItem(key, raw) { writes++; data.set(key, raw) }, removeItem(key) { removes++; data.delete(key) }, writes: () => writes, removes: () => removes }
}
const saved = { id: 'saved-first', name: '저장본 <img onerror=bad()>', title: '첫 문항', text: ' 첫 줄\r\n수정 전😀\r마지막\n', target: 500, basis: 'chars', sourceTab: 2, createdAt: '2026-11-17T00:00:00.000Z' }
const current = { title: '현재 제목', text: ' 첫 줄\r\n수정 후😀\r마지막\n', target: 700, basis: 'bytesKr' }
const envelope = versions => JSON.stringify({ version: 1, versions })
const newPayload = (leftText = saved.text, rightText = current.text, at = Date.now()) => createWritingDiffHandoff({ ...saved, text: leftText }, { ...current, sourceTab: 4, text: rightText }, at)
let groups = 0
async function check(label, run) { if (process.argv[2] && !label.includes(process.argv[2])) return; await run(); groups++; console.log(`PASS ${label}`) }

async function sourceFixture(options = {}) {
  const store = options.store ?? memory(); if (!store.data.has(WRITING_VERSIONS_KEY)) store.setItem(WRITING_VERSIONS_KEY, envelope([saved]))
  const popups = []; let failure = '', restored = 0
  const props = options.props ?? { current, activeTab: 3, onRestore() { restored++ } }
  const m = messages(options.locale ?? 'ko')
  const h = await componentHarness('src/components/WritingVersionsPanel.tsx', {
    props, messages: m, storagePort: store, url: 'https://toolhub.ai.kr/character-counter/?keep=1#draft',
    window: { open(url, target) {
      assert.equal(url, 'about:blank'); assert.equal(target, '_blank')
      if (failure === 'popup') return null
      const targetStore = memory(); const p = { opener: 'source', sessionStorage: targetStore, location: { replace(url) { if (failure === 'navigation') throw new Error('blocked'); p.url = url } }, close() { p.closed = true }, closed: false, url: '' }
      if (failure === 'quota') targetStore.setItem = () => { throw new Error('quota') }
      if (failure === 'readback') targetStore.getItem = () => null
      popups.push(p); return p
    } },
  })
  h.render(); await flush(); h.render()
  return { h, props, store, popups, m, restored: () => restored, fail(value) { failure = value },
    send() { h.find(n => has(n, 'data-writing-diff-send')).props.onClick(); h.render() },
    notice: () => h.all().find(n => has(n, 'data-writing-diff-notice'))?.props['data-writing-diff-notice'],
  }
}

async function targetFixture(options = {}) {
  const store = options.store ?? memory()
  if (Object.hasOwn(options, 'raw')) { if (options.raw !== null) store.setItem(KEY, options.raw) }
  else store.setItem(KEY, JSON.stringify(options.payload ?? newPayload()))
  const m = messages(options.locale ?? 'ko'), jobs = [], blobs = [], copied = [], anchors = []
  let copyFailure = false, downloadFailure = false, workerFailure = false, selected = '', appliedText = ''
  class Field { constructor() { this.style = {}; this.value = '' } focus() {} select() { selected = this.value } setSelectionRange() {} remove() {} }
  const h = await componentHarness('src/components/TextDiffWorkspace.tsx', {
    messages: m, hydrated: options.hydrated ?? false,
    url: options.url ?? `https://toolhub.ai.kr${PATH}`, window: { sessionStorage: store },
    globals: { HTMLElement: Field, URL: { createObjectURL(blob) { if (downloadFailure) throw new Error('blocked'); blobs.push(blob); return 'blob:comparison' }, revokeObjectURL() {} } },
    navigator: { clipboard: { writeText(text) { copied.push(text); return copyFailure ? Promise.reject(new Error('blocked')) : Promise.resolve() } } },
    document: { activeElement: new Field(), body: { appendChild(field) { appliedText = field.value ?? '' } },
      createElement(tag) { if (tag === 'textarea') return new Field(); const a = { click() { a.clicked = true }, remove() { a.removed = true } }; anchors.push(a); return a }, execCommand() { assert.equal(appliedText, copied.at(-1)); return false } },
    modules: { '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/lib/diff/protocol': { DiffExecutionError }, '@/lib/diff/client': { createLineDiffClient: () => ({
      async run(left, right) { jobs.push({ left, right }); if (workerFailure) throw new DiffExecutionError('workerFailed'); try { return compareTextLines(left, right) } catch (e) { throw new DiffExecutionError(e.code) } }, cancel() {},
    }) } },
    beforeEffects(tree) {
      const visit = n => {
        if (!n || typeof n !== 'object') return
        if (Array.isArray(n)) return n.forEach(visit)
        if (n.props?.id === 'diff-copy-fallback') n.props.ref.current = { focus() {}, select() { selected = n.props.value }, setSelectionRange() {} }
        visit(n.props?.children)
      }; visit(tree)
    },
  })
  h.render()
  return { h, store, m, jobs, blobs, copied, anchors, selected: () => selected,
    input: side => h.find(n => n.props.id === `diff-${side}`).props.value,
    edit(side, value) { h.find(n => n.props.id === `diff-${side}`).props.onChange({ target: { value } }); h.render() },
    start() { h.setHydrated(true); h.tick(0) },
    async compare() { h.button(m.diffViewer.actions.compare).props.onClick(); await flush(); h.render() },
    async copy() { h.button(m.diffViewer.actions.copyDiff).props.onClick(); await flush(); h.render() },
    download() { h.button(m.diffViewer.workspace.download).props.onClick(); h.render() },
    copyFails(value) { copyFailure = value }, downloadFails(value) { downloadFailure = value }, workerFails(value) { workerFailure = value },
    notice: () => h.all().find(n => has(n, 'data-writing-diff-handoff'))?.props['data-writing-diff-handoff'],
    locale(locale) { const next = messages(locale); m.diffViewer = next.diffViewer; h.render() },
  }
}

await check('source click opens an isolated target with exact pair and preserves original bytes/restore state', async () => {
  const f = await sourceFixture(); const before = Array.from(f.store.data); const address = f.h.window.location.href
  f.send(); assert.equal(f.popups.length, 1); assert.equal(f.notice(), 'sent')
  const popup = f.popups[0], raw = popup.sessionStorage.getItem(KEY), parsed = parseWritingDiffHandoff(raw)
  assert.equal(parsed.ok, true); assert.equal(parsed.payload.left.text, saved.text); assert.equal(parsed.payload.right.text, current.text)
  assert.equal(parsed.payload.right.sourceTab, 4); assert.equal(popup.opener, null); assert.equal(popup.url, PATH)
  assert.equal(popup.closed, false); assert.deepEqual(Array.from(f.store.data), before); assert.equal(f.h.window.location.href, address); assert.equal(f.restored(), 0)
  const changedProps = { ...f.props, current: { ...current, text: '' }, activeTab: 4 }
  f.h.setProps(changedProps); assert.equal(f.notice(), undefined); f.send()
  const second = parseWritingDiffHandoff(f.popups[1].sessionStorage.getItem(KEY))
  assert.equal(second.payload.right.text, ''); assert.equal(second.payload.right.sourceTab, 5)
  assert.equal(parseWritingDiffHandoff(raw).payload.right.text, current.text); f.h.cleanup()
})

await check('source length, popup, partial-transfer and stale storage failures preserve inputs with recovery', async () => {
  for (const failure of ['popup', 'quota', 'readback', 'navigation']) {
    const f = await sourceFixture(); const before = Array.from(f.store.data); f.fail(failure); f.send()
    assert.equal(f.notice(), failure === 'popup' ? 'popupBlocked' : 'handoffFailed')
    if (failure !== 'popup') assert.equal(f.popups[0].closed, true)
    assert.ok(f.h.all().some(n => n.type === 'a' && n.props.href === '/diff-viewer/' && n.props.target === '_blank'))
    assert.deepEqual(Array.from(f.store.data), before); assert.equal(f.restored(), 0); f.h.cleanup()
  }
  const f = await sourceFixture(); f.h.setProps({ ...f.props, current: { ...current, text: '가'.repeat(50001) } }); f.send()
  assert.equal(f.notice(), 'textTooLong'); assert.equal(f.popups.length, 0)
  f.h.setProps(f.props); f.store.setItem(WRITING_VERSIONS_KEY, envelope([{ ...saved, text: 'newer' }]))
  const before = Array.from(f.store.data); f.send(); assert.equal(f.notice(), 'conflict'); assert.equal(f.popups.length, 0)
  assert.equal(f.h.find(n => has(n, 'data-writing-diff-send')).props.disabled, true); assert.deepEqual(Array.from(f.store.data), before)
  f.h.cleanup()
})

await check('actual CharacterCounter five tabs and existing undo are unchanged by the send action', async () => {
  const store = memory(), m = messages('ko')
  const tabs = Array.from({ length: 5 }, (_, i) => ({ ...current, title: `문항 ${i + 1}`, text: `original ${i + 1}` }))
  store.setItem(WRITING_DRAFT_KEY, JSON.stringify({ tabs, active: 2 })); store.setItem(WRITING_VERSIONS_KEY, envelope([saved]))
  const h = await componentHarness('src/components/CharacterCounter.tsx', { messages: m, storagePort: store, props: {}, window: { confirm: () => true } })
  h.render(); await flush(); h.render(); await flush(); h.render()
  h.button(m.characterCounter.tools.upper).props.onClick(); h.render(); await flush(); h.render()
  const node = h.find(n => typeof n.type === 'function' && n.type.name === 'WritingVersionsPanel')
  assert.equal(node.props.current.text, 'ORIGINAL 3'); assert.equal(h.button(m.characterCounter.tools.undo).props.disabled, false)
  const f = await sourceFixture({ store, props: node.props }); const before = Array.from(store.data); const writes = store.writes()
  f.send(); h.render(); await flush(); h.render()
  assert.deepEqual(Array.from(store.data), before); assert.equal(store.writes(), writes)
  assert.equal(h.button(m.characterCounter.tools.undo).props.disabled, false)
  h.button(m.characterCounter.tools.undo).props.onClick(); h.render(); await flush(); h.render()
  const after = JSON.parse(store.getItem(WRITING_DRAFT_KEY)); assert.deepEqual(after.tabs, tabs); assert.equal(after.active, 2)
  assert.equal(store.getItem(WRITING_VERSIONS_KEY), envelope([saved])); f.h.cleanup(); h.cleanup()
})

await check('hydration restores exact documents once, clears example, consumes only its key and does not compare automatically', async () => {
  const f = await targetFixture(); f.store.setItem(TEXT_HANDOFF_KEY, 'existing TTS transfer')
  const initial = f.input('left'); assert.notEqual(initial, saved.text); assert.equal(f.jobs.length, 0)
  f.start(); assert.equal(f.input('left'), saved.text); assert.equal(f.input('right'), current.text)
  assert.equal(f.notice(), 'loaded'); assert.equal(f.jobs.length, 0); assert.equal(f.store.getItem(KEY), null)
  assert.equal(f.store.getItem(TEXT_HANDOFF_KEY), 'existing TTS transfer'); assert.ok(!f.h.all().some(n => n.props['data-diff-type']))
  assert.ok(!f.h.all().some(n => n.type === 'img' || n.type === 'script'))
  const replacement = JSON.stringify(newPayload('replacement left', 'replacement right')); f.store.setItem(KEY, replacement)
  f.locale('en'); f.h.render(); f.h.tick(0)
  assert.equal(f.input('left'), saved.text); assert.equal(f.store.getItem(KEY), replacement); assert.equal(f.jobs.length, 0)
  f.h.cleanup()
})

await check('received inputs use explicit comparison, exact TXT/native copy and existing failure recovery', async () => {
  const f = await targetFixture(); f.start(); await f.compare()
  assert.deepEqual(f.jobs, [{ left: saved.text, right: current.text }])
  const expected = formatTextDiff(compareTextLines(saved.text, current.text))
  await f.copy(); assert.equal(f.copied.at(-1), expected)
  f.download(); assert.equal(await f.blobs[0].text(), expected); assert.equal(f.anchors[0].download, 'toolhub-text-comparison.txt')
  f.copyFails(true); await f.copy(); const field = f.h.find(n => n.props.id === 'diff-copy-fallback')
  assert.equal(field.props.value, expected); assert.equal(field.props.readOnly, true); assert.equal(f.selected(), expected)
  f.downloadFails(true); f.download(); assert.ok(f.h.text().includes(f.m.diffViewer.workspace.downloadFailed))
  f.edit('right', 'edited later'); assert.equal(f.input('left'), saved.text); assert.ok(f.h.text().includes(f.m.diffViewer.handoff.edited))
  assert.ok(!f.h.text().includes(saved.name)); assert.ok(!f.h.all().some(n => n.props.id === 'diff-copy-fallback'))
  f.h.button(f.m.diffViewer.actions.swap).props.onClick(); f.h.render(); assert.equal(f.input('left'), 'edited later')
  f.workerFails(true); await f.compare(); assert.equal(f.input('left'), 'edited later'); assert.ok(f.h.text().includes(f.m.diffViewer.workspace.errors.workerFailed))
  f.h.cleanup()
})

await check('deferred initial receive never replaces user edits, swaps, clears or an explicit comparison', async () => {
  for (const action of ['beforeHydration', 'edit', 'swap', 'clear', 'compare']) {
    const f = await targetFixture(); const raw = f.store.getItem(KEY)
    if (action === 'beforeHydration') f.edit('left', 'typed before hydration')
    f.h.setHydrated(true)
    if (action === 'edit') f.edit('left', 'typed while waiting')
    if (action === 'swap' || action === 'clear') { f.h.button(f.m.diffViewer.actions[action]).props.onClick(); f.h.render() }
    if (action === 'compare') await f.compare()
    const expected = [f.input('left'), f.input('right')]
    f.h.tick(0); assert.deepEqual([f.input('left'), f.input('right')], expected); assert.equal(f.store.getItem(KEY), raw)
    assert.equal(f.notice(), 'edited'); f.h.cleanup()
  }
})

await check('StrictMode effect replay replaces canceled tickets and unmount blocks manually delivered late callbacks', async () => {
  const f = await targetFixture(); f.h.setHydrated(true)
  const old = f.h.pendingTimers().find(t => t.callback.name === 'receiveWritingDiffTransfer').callback
  f.h.replayEffects(); old(); f.h.render()
  assert.notEqual(f.input('left'), saved.text); assert.equal(f.store.removes(), 0)
  f.h.tick(0); assert.equal(f.input('left'), saved.text); assert.equal(f.store.removes(), 1)
  f.h.replayEffects(); f.h.tick(0); assert.equal(f.store.removes(), 1); f.h.cleanup()
  const g = await targetFixture(); g.h.setHydrated(true); const late = g.h.pendingTimers().find(t => t.callback.name === 'receiveWritingDiffTransfer').callback
  const before = g.input('left'), raw = g.store.getItem(KEY); g.h.cleanup(); late()
  assert.equal(g.input('left'), before); assert.equal(g.store.getItem(KEY), raw)
})

await check('invalid/expired/future/missing/unsupported or inaccessible transfers retain usable default inputs', async () => {
  const valid = newPayload()
  for (const [raw, expected] of [
    [null, 'missing'], ['{bad', 'invalid'], [JSON.stringify({ ...valid, version: 2 }), 'unsupported'],
    [JSON.stringify({ ...valid, createdAt: Date.now() - TTL - 5000 }), 'expired'], [JSON.stringify({ ...valid, createdAt: Date.now() + 60000 }), 'future'],
    [JSON.stringify({ ...valid, left: valid.right, right: valid.left }), 'invalid'],
  ]) {
    const f = await targetFixture({ raw }); const before = f.input('left'); f.start()
    assert.equal(f.input('left'), before); assert.equal(f.notice(), expected); assert.equal(f.store.getItem(KEY), raw)
    await f.compare(); assert.equal(f.jobs.length, 1); f.h.cleanup()
  }
  const f = await targetFixture(); let getterCalls = 0
  Object.defineProperty(f.h.window, 'sessionStorage', { get() { getterCalls++; throw new Error('blocked') } })
  const before = f.input('left'); f.start(); assert.equal(f.notice(), 'unavailable'); assert.equal(f.input('left'), before)
  f.h.replayEffects(); f.h.tick(0); assert.equal(getterCalls, 1, 'storage getter failure is consumed as one attempt'); f.h.cleanup()
  const g = await targetFixture({ url: 'https://toolhub.ai.kr/diff-viewer/?from=ocr' }); const untouched = g.store.getItem(KEY); g.start()
  assert.equal(g.notice(), undefined); assert.equal(g.store.getItem(KEY), untouched); g.h.cleanup()
})

await check('new raw during read is preserved; delete failure retains applied inputs with an accurate notice', async () => {
  const store = memory(), raw = JSON.stringify(newPayload()), newer = JSON.stringify(newPayload('new', 'new'))
  store.setItem(KEY, raw); let reads = 0; const read = store.getItem
  store.getItem = key => { if (key === KEY && ++reads === 2) store.data.set(KEY, newer); return read(key) }
  const f = await targetFixture({ store, raw }); const before = f.input('left'); f.start()
  assert.equal(f.notice(), 'changed'); assert.equal(f.input('left'), before); assert.equal(store.data.get(KEY), newer); assert.equal(store.removes(), 0); f.h.cleanup()
  const blocked = memory(); blocked.removeItem = () => { throw new Error('denied') }
  const g = await targetFixture({ store: blocked, raw }); g.start()
  assert.equal(g.notice(), 'loaded'); assert.equal(g.input('left'), saved.text); assert.equal(blocked.getItem(KEY), raw)
  assert.ok(g.h.text().includes(g.m.diffViewer.handoff.cleanupFailed)); g.h.cleanup()
})

await check('maximum-length transfer remains exact and comparison retains independent line limits in KO/EN', async () => {
  for (const locale of ['ko', 'en']) {
    const text = '가'.repeat(50000), f = await targetFixture({ payload: newPayload(text, ''), locale }); f.start()
    assert.equal(f.input('left'), text); assert.equal(f.input('right'), ''); assert.equal(f.jobs.length, 0)
    assert.ok(f.h.find(n => n.props.id === 'diff-left').props.className.includes('text-base'))
    assert.ok(f.h.button(f.m.diffViewer.actions.compare).props.className.includes('min-h-11')); await f.compare(); assert.equal(f.jobs.length, 1); f.h.cleanup()
  }
  const g = await targetFixture({ payload: newPayload('\n'.repeat(10000), 'x') }); g.start(); assert.equal(g.input('left').length, 10000)
  await g.compare(); assert.ok(g.h.text().includes(g.m.diffViewer.workspace.errors.tooManyLines)); assert.equal(g.input('right'), 'x'); g.h.cleanup()
})

console.log(`Writing Diff actual components: ${groups} groups passed (controlled browser/Worker transport; real browser is separate)`)
