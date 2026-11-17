import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
const key = 'toolhub:lunar-anniversaries:v1'
const lunar = { year: 2025, month: 6, day: 10, isLeap: true }
const record = { id: 'record-1', name: '가족 기념일', lunar }
const raw = JSON.stringify({ version: 1, revision: 'revision-1', anniversaries: [record] })
const globals = { crypto: webcrypto, AbortController }
const flush = async h => { await new Promise(resolve => setImmediate(resolve)); h.render() }
const clone = value => JSON.parse(JSON.stringify(value))
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log(`PASS ${name}`) }
async function panel(setup = {}) {
  const loaded = []
  const props = { lunar, today: { year: 2026, month: 1, day: 1 }, ready: true, inputKey: 'input-one', onLoad: value => { loaded.push(value); return true }, ...setup.props }
  const h = await componentHarness('src/components/LunarSavedAnniversaries.tsx', { ...setup, props, globals: { ...globals, ...setup.globals } })
  h.render()
  return { h, props, loaded }
}
async function copyFixture(clipboard, fallback) {
  let legacyCalls = 0
  class Element { constructor() { this.style = {} } focus() {} select() {} setSelectionRange() {} remove() {} }
  const h = await componentHarness('src/components/LunarConverter.tsx', {
    props: {}, globals: { ...globals, HTMLElement: Element }, navigator: { clipboard },
    document: { body: { appendChild() {} }, createElement: () => new Element(), execCommand() { legacyCalls++; if (fallback === 'throw') throw Error('legacy'); return fallback } },
  })
  h.render()
  return { h, legacyCalls: () => legacyCalls, copy(target) { h.find(node => node.props['data-lunar-copy'] === target).props.onClick(); h.render() }, recovery: () => h.all().find(node => typeof node.type === 'function' && node.type.name === 'LunarCopyRecovery') }
}
;(async () => {
  await check('Saved original leap date stays separate from the recalculated fallback and loads only after confirmation', async () => {
    const { h, loaded } = await panel({ storage: { [key]: raw } })
    assert.equal(loaded.length, 0)
    assert.match(h.text(), /2026/); assert.match(h.text(), /yearly.leapFallback/)
    h.button('savedAnniversaries.load').props.onClick(); h.render()
    assert.equal(loaded.length, 0)
    h.button('savedAnniversaries.loadConfirm').props.onClick(); await flush(h)
    assert.deepEqual(clone(loaded[0]), record)
    assert.equal(h.stored.get(key), raw)
    h.cleanup()
  })
  await check('Rename and delete persist new revisions without calling the input replacement callback', async () => {
    const { h, loaded } = await panel({ storage: { [key]: raw } })
    h.button('savedAnniversaries.rename').props.onClick(); h.render()
    h.find(node => node.type === 'input' && !Object.hasOwn(node.props, 'data-lunar-anniversary-name')).props.onChange({ target: { value: '새 이름' } }); h.render()
    h.button('savedAnniversaries.renameConfirm').props.onClick(); await flush(h)
    const renamed = JSON.parse(h.stored.get(key))
    assert.equal(renamed.anniversaries[0].name, '새 이름'); assert.deepEqual(renamed.anniversaries[0].lunar, lunar)
    assert.notEqual(renamed.revision, 'revision-1')
    h.button('savedAnniversaries.delete').props.onClick(); h.render()
    h.button('savedAnniversaries.deleteConfirm').props.onClick(); await flush(h)
    const deleted = JSON.parse(h.stored.get(key))
    assert.equal(deleted.anniversaries.length, 0); assert.notEqual(deleted.revision, renamed.revision)
    assert.equal(loaded.length, 0); h.cleanup()
  })
  await check('Quota and corrupt data keep the entered name and never report a successful save', async () => {
    let writes = 0
    const { h } = await panel({ storagePort: { getItem: () => null, setItem() { writes++; const error = Error('full'); error.name = 'QuotaExceededError'; throw error } } })
    h.find(node => Object.hasOwn(node.props, 'data-lunar-anniversary-name')).props.onChange({ target: { value: '보존할 이름' } }); h.render()
    h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await flush(h)
    assert.equal(writes, 1); assert.match(h.text(), /errors.quota/)
    assert.equal(h.find(node => Object.hasOwn(node.props, 'data-lunar-anniversary-name')).props.value, '보존할 이름'); h.cleanup()
    const broken = await panel({ storage: { [key]: '{broken' } })
    assert.equal(broken.h.button('savedAnniversaries.save').props.disabled, true)
    assert.match(broken.h.text(), /errors.corrupt/); assert.equal(broken.h.stored.get(key), '{broken'); broken.h.cleanup()
  })
  await check('Changed inputs, explicit cancel and unmount abort queued locks before reads or writes apply', async () => {
    for (const mode of ['input', 'cancel', 'unmount']) {
      let queued
      const { h, props, loaded } = await panel({ storage: { [key]: raw }, navigator: { locks: { request(_name, options, callback) { return new Promise((resolve, reject) => { queued = { options, finish() { try { resolve(callback()) } catch (error) { reject(error) } } } }) } } } })
      h.button('savedAnniversaries.load').props.onClick(); h.render(); h.button('savedAnniversaries.loadConfirm').props.onClick(); h.render()
      assert.ok(queued)
      if (mode === 'input') h.setProps({ ...props, inputKey: 'input-two', lunar: { year: 2024, month: 2, day: 30, isLeap: false } })
      else if (mode === 'cancel') { h.button('savedAnniversaries.cancelPending').props.onClick(); h.render() }
      else h.cleanup()
      assert.equal(queued.options.signal.aborted, true)
      queued.finish(); await new Promise(resolve => setImmediate(resolve))
      assert.equal(loaded.length, 0); assert.equal(h.stored.get(key), raw)
      if (mode !== 'unmount') h.cleanup()
    }
  })
  await check('Shared URL wins on mount and explicit saved-date load preserves its original year and calendar title', async () => {
    const h = await componentHarness('src/components/LunarConverter.tsx', { props: {}, url: 'https://toolhub.ai.kr/lunar-converter/?mode=lunarToSolar&ly=2024&lm=2&ld=30', globals })
    h.render()
    const getPanel = () => h.find(node => typeof node.type === 'function' && node.type.name === 'LunarSavedAnniversaries')
    assert.deepEqual(clone(getPanel().props.lunar), { year: 2024, month: 2, day: 30, isLeap: false })
    assert.equal(getPanel().props.ready, true)
    assert.equal(getPanel().props.onLoad(record), true); h.render()
    assert.deepEqual(clone(getPanel().props.lunar), lunar)
    const calendar = h.find(node => typeof node.type === 'function' && node.type.name === 'LunarAnniversaryCalendar')
    assert.equal(calendar.props.initialTitle, record.name)
    assert.equal(h.window.location.search.includes('ly=2025'), true); assert.equal(h.window.location.search.includes('leap=1'), true)
    const child = await componentHarness('src/components/LunarAnniversaryCalendar.tsx', { props: calendar.props, globals })
    child.render(); assert.equal(child.find(node => node.type === 'input' && node.props.maxLength === 100).props.value, record.name)
    assert.ok(child.all().filter(node => node.type === 'input' && node.props.type === 'checkbox').every(node => !node.props.checked))
    child.cleanup(); h.cleanup()
  })
  await check('Actual result and table copy report success only for true legacy copies and expose the correct failure text', async () => {
    for (const target of ['result', 'table']) for (const api of ['missing', 'reject']) for (const fallback of [false, 'throw', true]) {
      const f = await copyFixture(api === 'missing' ? undefined : { writeText: async () => { throw Error('denied') } }, fallback)
      f.copy(target); await flush(f.h)
      assert.equal(f.legacyCalls(), 1)
      if (fallback === true) { assert.equal(f.recovery(), undefined); assert.ok(f.h.all().some(node => node.type === 'icon:Check')) }
      else { assert.equal(f.recovery().props.target, target); assert.ok(f.recovery().props.text.length > 0); assert.ok(!f.h.all().some(node => node.type === 'icon:Check')) }
      f.h.cleanup()
    }
  })
  await check('An older cross-target rejection cannot start fallback, and editing invalidates late copy success', async () => {
    let rejectOld, resolvePending, writes = 0
    const old = new Promise((_resolve, reject) => { rejectOld = reject })
    const f = await copyFixture({ writeText: () => ++writes === 1 ? old : Promise.resolve() }, true)
    f.copy('result'); f.copy('table'); await flush(f.h); rejectOld(Error('late')); await flush(f.h)
    assert.equal(f.legacyCalls(), 0); assert.equal(f.recovery(), undefined)
    assert.ok(f.h.all().some(node => node.props['data-lunar-copy'] === 'table' && node.props.children.type === 'icon:Check')); f.h.cleanup()
    const pending = new Promise(resolve => { resolvePending = resolve })
    const edited = await copyFixture({ writeText: () => pending }, false)
    edited.copy('result')
    edited.h.find(node => node.type === 'select' && node.props['aria-label'] === 'year').props.onChange({ target: { value: '2025' } }); edited.h.render()
    resolvePending(); await flush(edited.h)
    assert.equal(edited.recovery(), undefined); assert.ok(!edited.h.all().some(node => node.type === 'icon:Check')); edited.h.cleanup()
  })
  console.log(`Lunar saved UI: ${groups} groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
