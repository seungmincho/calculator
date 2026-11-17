import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const KEY = 'characterCounter.v2', VERSIONS = 'characterCounter.writingVersions.v1'
const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch48/translations-character.json', 'utf8'))
const copiedLabel = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')).characterCounter.actions.copied
const merge = (a, b) => { for (const [key, value] of Object.entries(b)) { if (value && typeof value === 'object' && !Array.isArray(value)) merge(a[key] ??= {}, value); else a[key] = value } return a }
const draft = (active = 0) => ({ active, tabs: Array.from({ length: 5 }, (_, i) => ({ title: `Question ${i + 1}`, text: `text-${i + 1}`, target: 100 + i, basis: 'chars' })) })
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve))
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
async function fixture({ initial = draft(), autoBoot = true } = {}) {
  const messages = merge(JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')), fragments.ko)
  const values = new Map([[KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)], [VERSIONS, '{"version":1,"versions":[]}']])
  const io = { locale: 'ko', copy: 'resolve', fallback: false, hold: false, deny: false, quota: false, unknown: false, confirm: true, popupThrow: false }
  const writes = [], copies = [], legacy = [], pending = [], tasks = [], locks = [], events = [], opens = [], fields = []
  let input, recovery = null, live = true
  const storage = { getItem(key) { if (io.deny && key === KEY) throw new Error('blocked'); return values.get(key) ?? null }, setItem(key, value) { if (io.quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); writes.push(['set', key, value]); values.set(key, value); if (io.unknown) io.deny = true }, removeItem(key) { writes.push(['remove', key]); values.delete(key) } }
  const navigator = { clipboard: { writeText(text) { copies.push(text); events.push('copy'); if (io.copy === 'wait') { const job = deferred(); pending.push(job); return job.promise } return io.copy === 'reject' ? Promise.reject(new Error('denied')) : Promise.resolve() } }, locks: { request(key, action) { assert.equal(key, KEY); if (!io.hold) return Promise.resolve().then(action); return new Promise((resolve, reject) => locks.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } }
  const document = { activeElement: null, body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'textarea'); input = { value: '', style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }; return input }, execCommand() { legacy.push(input.value); if (io.fallback === 'throw') throw new Error('legacy blocked'); return io.fallback } }
  const h = await componentHarness('src/components/CharacterCounter.tsx', { messages, storagePort: storage, navigator, document,
    modules: { '@/components/WritingVersionsPanel': { __esModule: true, default: 'Versions' }, '@/components/GuideSection': { __esModule: true, default: 'Guide' }, '@/components/CharacterCopyRecovery': { __esModule: true, default: 'Recovery' }, '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } },
    globals: { queueMicrotask: callback => tasks.push(callback) }, window: { confirm: () => io.confirm, open(...args) { events.push('open'); opens.push(args); if (io.popupThrow) throw new Error('popup denied'); return null } } })
  h.render()
  const attr = (key, value = '') => h.find(node => node.props[key] === value)
  const render = () => { if (live) h.render() }
  const settle = async (drain = true) => {
    for (let pass = 0; pass < 4; pass++) {
      if (drain) { let limit = 0; while (tasks.length) { assert.ok(++limit < 100); tasks.shift()(); render() } }
      await flush(); render()
      if (live) {
        const props = h.all().find(node => node.type === 'Recovery')?.props
        if (!props && recovery) { recovery.cleanup(); recovery = null }
        else if (props && recovery) recovery.setProps(props)
        else if (props) { recovery = await componentHarness('src/components/CharacterCopyRecovery.tsx', { props, messages, beforeEffects(tree) { for (const node of nodes(tree)) if (node.type === 'textarea') { const field = { focus() {}, select() {}, setSelectionRange(start, end) { fields.push([start, end]) } }; node.props.ref.current = field } } }); recovery.render() }
      }
    }
  }
  const click = async (key, value = '') => { const result = attr(key, value).props.onClick(); render(); await settle(autoBoot); return result }
  const edit = async (key, value) => { attr(key).props.onChange({ target: { value } }); render(); await settle(autoBoot) }
  if (autoBoot) await settle()
  return { h, io, values, writes, copies, legacy, pending, tasks, locks, events, opens, fields, attr, click, edit, settle, get recovery() { return recovery },
    async locale(value) { io.locale = value; Object.assign(messages, merge(JSON.parse(fs.readFileSync(`messages/${value}.json`, 'utf8')), fragments[value])); render(); await settle() },
    cleanup() { live = false; recovery?.cleanup(); recovery = null; h.cleanup() } }
}
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
await check('normal copy and native rejection/legacy false use actual full-text recovery with explicit retry', async () => {
  const f = await fixture(); await f.click('data-character-copy'); assert.ok(f.h.text().includes(copiedLabel)); assert.deepEqual(f.copies, ['text-1'])
  await f.edit('data-character-content', 'full\r\n\t한글😀'); f.io.copy = 'reject'; await f.click('data-character-copy'); assert.deepEqual(f.legacy, ['full\r\n\t한글😀']); assert.equal(f.h.text().includes(copiedLabel), false)
  const field = f.recovery.find(node => node.props['data-character-copy-manual'] === ''); assert.equal(field.props.value, 'full\r\n\t한글😀'); assert.equal(field.props.readOnly, true)
  f.recovery.find(node => node.props['data-character-copy-select'] === '').props.onClick(); assert.deepEqual(f.fields.at(-1), [0, field.props.value.length]); f.io.copy = 'resolve'; f.recovery.find(node => node.props['data-character-copy-retry'] === '').props.onClick(); await f.settle(); assert.equal(f.recovery, null); assert.ok(f.h.text().includes(copiedLabel)); f.cleanup()
})
await check('tab and input/locale ABA consume late Clipboard rejection without legacy copy or wrong-tab feedback', async () => {
  const f = await fixture(); f.io.copy = 'wait'; f.attr('data-character-copy').props.onClick(); await f.settle(); await f.click('data-character-tab', 1); f.pending.shift().reject(new Error('A late')); await f.settle(); assert.equal(f.attr('data-character-content').props.value, 'text-2'); assert.equal(f.legacy.length, 0); assert.equal(f.recovery, null)
  f.attr('data-character-copy').props.onClick(); await f.settle(); await f.edit('data-character-content', 'NEW'); await f.edit('data-character-content', 'text-2'); f.pending.shift().reject(new Error('ABA')); await f.settle(); assert.equal(f.legacy.length, 0)
  f.attr('data-character-copy').props.onClick(); await f.settle(); await f.locale('en'); await f.locale('ko'); f.pending.shift().reject(new Error('locale ABA')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.recovery, null); f.cleanup()
})
await check('initial field-specific early edits preserve untouched5stored manuscripts and saved activation', async () => {
  const f = await fixture({ initial: draft(4), autoBoot: false }); await f.edit('data-character-content', 'EARLY'); await f.click('data-character-tab', 2); await f.edit('data-character-title', 'Early title'); await f.edit('data-character-target', '700'); await f.click('data-character-basis', 'bytesKr')
  assert.equal(f.writes.length, 0); await f.settle(); assert.equal(f.attr('data-character-root').props['data-character-active'], 2)
  const saved = JSON.parse(f.values.get(KEY)); assert.deepEqual(saved.tabs[0], { ...draft().tabs[0], text: 'EARLY' }); assert.deepEqual(saved.tabs[2], { ...draft().tabs[2], title: 'Early title', target: 700, basis: 'bytesKr' }); assert.deepEqual([saved.tabs[1], saved.tabs[3], saved.tabs[4]], [draft().tabs[1], draft().tabs[3], draft().tabs[4]])
  assert.equal(f.writes.length, 1); f.cleanup()
  const plain = await fixture({ initial: draft(4) }); assert.equal(plain.attr('data-character-root').props['data-character-active'], 4); assert.equal(plain.writes.length, 0); plain.cleanup()
})
await check('transform then new edit cannot undo; valid restore undo includes all fields and old callback cannot change another tab', async () => {
  const f = await fixture(); await f.edit('data-character-content', 'lower'); await f.click('data-character-transform', 'upper'); const oldUndo = f.attr('data-character-undo').props.onClick; assert.equal(f.attr('data-character-content').props.value, 'LOWER')
  await f.edit('data-character-content', 'new user paragraph'); oldUndo(); await f.settle(); assert.equal(f.attr('data-character-content').props.value, 'new user paragraph'); assert.equal(f.attr('data-character-undo').props.disabled, true)
  const before = JSON.parse(f.values.get(KEY)).tabs[0], version = f.h.find(node => node.type === 'Versions').props
  version.onRestore({ title: 'RESTORED', text: 'version body', target: 777, basis: 'x' }); await f.settle(); await f.click('data-character-undo'); assert.deepEqual(JSON.parse(f.values.get(KEY)).tabs[0], before)
  await f.click('data-character-tab', 1); version.onRestore({ title: 'OLD', text: 'bad old restore', target: 1, basis: 'chars' }); await f.settle(); assert.equal(f.attr('data-character-content').props.value, 'text-2'); f.cleanup()
})
await check('current clear cancel/undo and all clear confirmation preserve versions; queued old clear cannot erase newer input', async () => {
  const f = await fixture(), versionRaw = f.values.get(VERSIONS); f.io.confirm = false; await f.click('data-character-clear'); assert.equal(f.attr('data-character-content').props.value, 'text-1'); f.io.confirm = true
  await f.click('data-character-clear'); assert.equal(f.attr('data-character-content').props.value, ''); await f.click('data-character-undo'); assert.equal(f.attr('data-character-content').props.value, 'text-1')
  f.io.hold = true; const clear = f.attr('data-character-clear-all').props.onClick(); await f.settle(); await f.edit('data-character-content', 'AFTER CONFIRM'); assert.ok(f.attr('data-character-action-notice', 'clearCancelled'))
  f.locks.shift()(); await clear; await f.settle(); assert.equal(f.attr('data-character-content').props.value, 'AFTER CONFIRM'); assert.equal(f.writes.filter(row => row[0] === 'remove').length, 0)
  f.locks.shift()(); await f.settle(); f.io.hold = false; await f.click('data-character-clear-all'); assert.equal(f.values.has(KEY), false); assert.equal(f.values.get(VERSIONS), versionRaw); assert.equal(f.attr('data-character-content').props.value, ''); assert.equal(f.attr('data-character-root').props['data-character-active'], 0); f.cleanup()
})
await check('latest autosave owns deferred write and unmount rejects queued save/clear and late Clipboard', async () => {
  const f = await fixture(); f.io.hold = true; await f.edit('data-character-content', 'A'); await f.edit('data-character-content', 'B'); assert.equal(f.locks.length, 2)
  f.locks.shift()(); await f.settle(); assert.equal(f.writes.length, 0); f.locks.shift()(); await f.settle(); assert.equal(JSON.parse(f.values.get(KEY)).tabs[0].text, 'B')
  await f.edit('data-character-content', 'LATE'); f.io.copy = 'wait'; f.attr('data-character-copy').props.onClick(); await f.settle(); const job = f.pending.shift(); const before = f.values.get(KEY), writeCount = f.writes.length; f.cleanup(); f.locks.shift()(); job.reject(new Error('closed')); await flush(); assert.equal(f.values.get(KEY), before); assert.equal(f.writes.length, writeCount); assert.equal(f.legacy.length, 0)
  const c = await fixture(); c.io.hold = true; const clear = c.attr('data-character-clear-all').props.onClick(); await c.settle(); c.cleanup(); c.locks.shift()(); await clear; assert.equal(c.writes.length, 0)
})
await check('corrupt draft preserves early input/raw and quota/CAS/readback never falsely report autosaved', async () => {
  const broken = await fixture({ initial: '{corrupt', autoBoot: false }); await broken.edit('data-character-content', 'KEEP EARLY'); await broken.settle(); assert.equal(broken.attr('data-character-content').props.value, 'KEEP EARLY'); assert.equal(broken.values.get(KEY), '{corrupt'); assert.ok(broken.attr('data-character-save-status', 'corrupt')); broken.cleanup()
  for (const cause of ['quota', 'unknown', 'external']) {
    const f = await fixture(); if (cause === 'external') f.values.set(KEY, JSON.stringify(draft(3))); else f.io[cause] = true
    await f.edit('data-character-content', 'LOCAL'); assert.equal(f.attr('data-character-content').props.value, 'LOCAL'); assert.equal(f.attr('data-character-save-status', cause === 'external' ? 'conflict' : 'failed').props.role, 'alert')
    if (cause === 'quota') { f.io.quota = false; await f.click('data-character-save-retry'); assert.equal(JSON.parse(f.values.get(KEY)).tabs[0].text, 'LOCAL') }
    f.cleanup()
  }
})
await check('spelling popup is requested synchronously with fixed URL and no manuscript payload, copy remains recoverable', async () => {
  const f = await fixture(); f.io.copy = 'wait'; const click = f.attr('data-character-speller').props.onClick; click()
  assert.deepEqual(f.events, ['copy', 'open']); assert.deepEqual(f.opens[0], ['https://nara-speller.co.kr/speller/', '_blank', 'noopener,noreferrer']); assert.equal(f.opens[0].some(value => value.includes('text-1')), false)
  f.pending.shift().reject(new Error('clipboard denied')); await f.settle(); assert.ok(f.recovery); assert.ok(f.attr('data-character-action-notice', 'spellerOpened'))
  f.io.copy = 'resolve'; f.io.popupThrow = true; await f.click('data-character-speller'); assert.ok(f.attr('data-character-action-notice', 'spellerFailed')); f.cleanup()
})
await check('Strict replay retains current draft and fresh copy; cleanup prevents initial restoration callbacks', async () => {
  const f = await fixture(); await f.edit('data-character-content', 'SURVIVE'); const before = f.values.get(KEY); f.h.replayEffects(); await f.settle(); assert.equal(f.attr('data-character-content').props.value, 'SURVIVE'); assert.equal(f.values.get(KEY), before)
  await f.click('data-character-copy'); assert.equal(f.copies.at(-1), 'SURVIVE'); f.cleanup()
  const pending = await fixture({ autoBoot: false }); pending.cleanup(); while (pending.tasks.length) pending.tasks.shift()(); assert.equal(pending.writes.length, 0)
})
console.log(`Character counter actual parent: ${groups} groups passed`)
