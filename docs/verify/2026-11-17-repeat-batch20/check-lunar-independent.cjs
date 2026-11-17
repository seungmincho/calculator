/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node fixture reuses the existing harness. */
// Independent change-boundary checks; actual product code, controlled DOM/locks/storage/crypto ports.
const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const { componentHarness, text } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const original = { id: 'leap-original', name: '원 윤달 기념일', lunar: { year: 2025, month: 6, day: 10, isLeap: true } }
const raw = JSON.stringify({ version: 1, revision: 'r1', anniversaries: [original] })
const clone = value => JSON.parse(JSON.stringify(value))
const flush = async h => { for (let i = 0; i < 3; i++) { await new Promise(setImmediate); h?.render() } }
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
async function panel(port, extra = {}) {
  const loaded = [], props = { lunar: original.lunar, today: { year: 2026, month: 1, day: 1 }, ready: true, inputKey: 'same-input', onLoad: value => { loaded.push(value); return true } }
  const h = await componentHarness('src/components/LunarSavedAnniversaries.tsx', { storagePort: port, props, globals: { crypto: webcrypto, AbortController }, ...extra }); h.render()
  const click = key => { const button = h.find(node => node.type === 'button' && text(node) === key); assert.equal(!!button.props.disabled, false); button.props.onClick(); h.render() }
  const field = () => h.find(node => Object.hasOwn(node.props ?? {}, 'data-lunar-anniversary-name'))
  const edit = value => { field().props.onChange({ target: { value } }); h.render() }
  const save = () => { assert.equal(h.button('savedAnniversaries.save').props.disabled, false); h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); h.render() }
  return { h, loaded, click, field, edit, save }
}
const checks = [], check = (name, run) => checks.push([name, run])

check('post-write read failure keeps draft and blocks follow-up until explicit reread without claiming rollback', async () => {
  let stored = raw, unreadable = false, writes = 0
  const port = { getItem: () => { if (unreadable) throw new Error('post-write read blocked'); return stored }, setItem: (_key, value) => { stored = value; writes++; unreadable = true } }
  const f = await panel(port); f.edit('남아야 할 이름'); f.save(); await flush(f.h)
  assert.equal(writes, 1); assert.equal(JSON.parse(stored).anniversaries.length, 2)
  assert.match(f.h.text(), /savedAnniversaries.errors.unverified/)
  assert.equal(f.field().props.value, '남아야 할 이름'); assert.equal(f.h.button('savedAnniversaries.save').props.disabled, true)
  assert.equal(f.loaded.length, 0)
  unreadable = false; f.click('savedAnniversaries.refresh')
  assert.equal(f.h.all().filter(node => node.props?.['data-lunar-anniversary']).length, 2)
  assert.equal(f.field().props.value, '남아야 할 이름'); assert.equal(writes, 1); f.h.cleanup()
})
check('two actual panels with one lock queue preserve first write and second draft; explicit refresh permits retry', async () => {
  let stored = raw, writes = 0
  const queue = [], port = { getItem: () => stored, setItem: (_key, value) => { stored = value; writes++ } }
  const locks = { request(_key, options, callback) { const d = defer(); queue.push({ ...d, options, callback }); return d.promise } }
  const release = index => { const pending = queue[index]; try { pending.options.signal.throwIfAborted(); pending.resolve(pending.callback()) } catch (error) { pending.reject(error) } }
  const a = await panel(port, { navigator: { locks } }), b = await panel(port, { navigator: { locks } })
  a.edit('첫 탭 이름'); b.edit('둘째 탭 이름'); a.save(); b.save()
  assert.equal(queue.length, 2); release(0); await flush(a.h)
  const firstRaw = stored; release(1); await flush(b.h)
  assert.equal(stored, firstRaw); assert.equal(writes, 1)
  assert.match(b.h.text(), /errors.conflict/); assert.equal(b.field().props.value, '둘째 탭 이름')
  b.click('savedAnniversaries.refresh'); b.save(); release(2); await flush(b.h)
  assert.deepEqual(JSON.parse(stored).anniversaries.map(record => record.name), [original.name, '첫 탭 이름', '둘째 탭 이름'])
  assert.equal(a.loaded.length + b.loaded.length, 0); a.h.cleanup(); b.h.cleanup()
})
check('confirmed load rechecks raw while queued even when no storage event was delivered', async () => {
  let stored = raw, pending
  const port = { getItem: () => stored, setItem: () => { throw new Error('Load must not write') } }
  const locks = { request(_key, options, callback) { const d = defer(); pending = { ...d, options, callback }; return d.promise } }
  const f = await panel(port, { navigator: { locks } })
  f.click('savedAnniversaries.load'); f.click('savedAnniversaries.loadConfirm')
  stored = JSON.stringify({ version: 1, revision: 'foreign', anniversaries: [{ ...original, name: '다른 탭 이름' }] })
  pending.resolve(pending.callback()); await flush(f.h)
  assert.equal(f.loaded.length, 0); assert.match(f.h.text(), /errors.conflict/)
  assert.equal(JSON.parse(stored).revision, 'foreign'); f.h.cleanup()
})
check('loading the same saved record remounts calendar with empty years and invalidates the previous SHA completion', async () => {
  const parent = await componentHarness('src/components/LunarConverter.tsx', { props: {}, url: 'https://toolhub.ai.kr/lunar-converter/?mode=lunarToSolar&ly=2024&lm=2&ld=30', globals: { crypto: webcrypto, AbortController } })
  parent.render()
  const savedPanel = () => parent.find(node => typeof node.type === 'function' && node.type.name === 'LunarSavedAnniversaries')
  const calendar = () => parent.find(node => typeof node.type === 'function' && node.type.name === 'LunarAnniversaryCalendar')
  assert.deepEqual(clone(savedPanel().props.lunar), { year: 2024, month: 2, day: 30, isLeap: false })
  assert.equal(savedPanel().props.onLoad(original), true); parent.render()
  const first = calendar(), generationKey = first.key
  assert.deepEqual(clone(savedPanel().props.lunar), original.lunar)
  assert.equal(first.props.initialTitle, original.name)
  const digest = defer(), blobs = [], clicks = []
  class ArtifactURL extends URL { static createObjectURL(blob) { blobs.push(blob); return 'blob:review' } static revokeObjectURL() {} }
  const setup = { globals: { crypto: { subtle: { digest: () => digest.promise } }, URL: ArtifactURL }, document: { body: { appendChild() {} }, createElement: () => ({ click() { clicks.push(true) }, remove() {} }) } }
  const oldCalendar = await componentHarness('src/components/LunarAnniversaryCalendar.tsx', { ...setup, props: first.props }); oldCalendar.render()
  oldCalendar.find(node => node.type === 'input' && node.props.type === 'checkbox' && !node.props.disabled).props.onChange(); oldCalendar.render()
  oldCalendar.button('calendarExport.download').props.onClick(); oldCalendar.render()
  assert.equal(savedPanel().props.onLoad(original), true); parent.render()
  const second = calendar(); assert.notEqual(second.key, generationKey)
  assert.equal(second.props.initialTitle, original.name)
  oldCalendar.cleanup()
  const fresh = await componentHarness('src/components/LunarAnniversaryCalendar.tsx', { ...setup, props: second.props }); fresh.render()
  assert.equal(fresh.find(node => node.type === 'input' && !node.props.type).props.value, original.name)
  assert.equal(fresh.all().filter(node => node.props?.type === 'checkbox' && node.props.checked).length, 0)
  assert.equal(fresh.button('calendarExport.download').props.disabled, true)
  digest.resolve(new ArrayBuffer(32)); await flush(fresh)
  assert.equal(blobs.length, 0); assert.equal(clicks.length, 0)
  fresh.cleanup(); parent.cleanup()
})

;(async () => { let count = 0; for (const [name, run] of checks) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); console.log('PASS', name); count++ } console.log(`${count} independent lunar change-boundary checks passed`) })().catch(error => { console.error(error); process.exitCode = 1 })
