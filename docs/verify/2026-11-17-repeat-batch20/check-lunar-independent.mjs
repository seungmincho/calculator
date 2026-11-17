import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import { isSavedLunarDate, parseLunarAnniversaries, nextSavedLunarAnniversary, readLunarAnniversaryForLoad, writeLunarAnniversaryAction } from '../../../src/utils/lunarSavedAnniversaries.ts'
import { leapMonth, lunarMonthDays, lunarToSolar, solarToLunar, nextLunarAnniversary } from '../../../src/utils/lunarCalendar.ts'

const key = 'toolhub:lunar-anniversaries:v1'
const lunar = { year: 2025, month: 6, day: 10, isLeap: true }
const record = { id: 'original', name: '원 윤달 기념일', lunar }
const encode = (records = [record], revision = 'first') => JSON.stringify({ version: 1, revision, anniversaries: records })
const globals = { crypto: webcrypto, AbortController }
const detached = value => structuredClone(value)
const flush = async h => { await new Promise(resolve => setImmediate(resolve)); h?.render() }
const child = (h, name) => h.find(node => typeof node.type === 'function' && node.type.name === name)
const click = (h, label) => { const button = h.button(label); assert.equal(!!button.props.disabled, false); button.props.onClick(); h.render() }
const tick = () => new Promise(resolve => setImmediate(resolve))
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log(`PASS ${name}`) }
function queuedLocks() {
  const pending = []
  return { pending, locks: { request(_key, options, callback) { return new Promise((resolve, reject) => pending.push({ options, release() { try { resolve(callback()) } catch (cause) { reject(cause) } } })) } } }
}
async function panel(setup = {}) {
  const loads = [], props = { lunar, today: { year: 2026, month: 1, day: 1 }, ready: true, inputKey: 'initial', onLoad: value => { loads.push(detached(value)); return true }, ...setup.props }
  const h = await componentHarness('src/components/LunarSavedAnniversaries.tsx', { ...setup, props, storage: setup.storage ?? { [key]: encode() }, globals })
  h.render(); return { h, loads, props }
}

await check('All supported years preserve valid original month ends and leap month ends', () => {
  let checked = 0
  for (let year = 1900; year <= 2050; year++) {
    for (const [month, isLeap] of [[1, false], [12, false], ...(leapMonth(year) ? [[leapMonth(year), true]] : [])]) {
      const date = { year, month, day: lunarMonthDays(year, month, isLeap), isLeap }
      const solar = lunarToSolar(year, month, date.day, isLeap)
      assert.equal(isSavedLunarDate(date), solar !== null)
      if (!solar) continue
      assert.deepEqual(solarToLunar(solar.year, solar.month, solar.day), date)
      const item = { ...record, lunar: date }, before = structuredClone(item)
      for (const today of [{ year: 2026, month: 1, day: 1 }, { year: 2050, month: 12, day: 31 }]) {
        assert.deepEqual(nextSavedLunarAnniversary(item, today), nextLunarAnniversary(today, month, date.day, isLeap))
      }
      assert.deepEqual(item, before); checked++
    }
  }
  assert.ok(checked > 300)
  console.log(`  ${checked} original date boundary fixtures`)
})

await check('Parsed raw is authoritative; detached load and revision prevent stale empty-list writes', () => {
  let raw = encode(), writes = 0
  const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value; writes++ } }
  const parsed = parseLunarAnniversaries(raw); assert.equal(parsed.ok, true)
  parsed.snapshot.anniversaries[0].lunar.year = 2026
  const loaded = readLunarAnniversaryForLoad(parsed.snapshot, record.id, storage)
  assert.equal(loaded.ok, true); assert.deepEqual(loaded.record.lunar, lunar)
  loaded.record.lunar.day = 1
  const renamed = writeLunarAnniversaryAction(parsed.snapshot, { kind: 'rename', id: record.id, name: '동명이인' }, 'renamed', storage)
  assert.equal(renamed.ok, true); assert.deepEqual(renamed.snapshot.anniversaries[0].lunar, lunar)
  const deleted = writeLunarAnniversaryAction(renamed.snapshot, { kind: 'delete', id: record.id }, 'deleted', storage)
  assert.equal(deleted.ok, true)
  const stale = writeLunarAnniversaryAction(parseLunarAnniversaries(null).snapshot, { kind: 'add', record }, 'stale', storage)
  assert.deepEqual(stale, { ok: false, error: 'conflict' }); assert.equal(writes, 2)
})

await check('Input changes and cancel after queued load preserve input; late rejection leaves a new prompt', async () => {
  for (const invalidation of ['input', 'cancel', 'unmount']) {
    const port = queuedLocks(), f = await panel({ navigator: { locks: port.locks } })
    click(f.h, 'savedAnniversaries.load'); click(f.h, 'savedAnniversaries.loadConfirm')
    if (invalidation === 'input') f.h.setProps({ ...f.props, inputKey: 'edited', lunar: { ...lunar, day: 11 } })
    else if (invalidation === 'cancel') { click(f.h, 'savedAnniversaries.cancelPending'); click(f.h, 'savedAnniversaries.rename') }
    else f.h.cleanup()
    assert.equal(port.pending[0].options.signal.aborted, true)
    port.pending[0].release(); await tick()
    assert.equal(f.loads.length, 0); assert.equal(f.h.stored.get(key), encode())
    if (invalidation !== 'unmount') {
      f.h.render()
      if (invalidation === 'cancel') { assert.match(f.h.text(), /savedAnniversaries.renameConfirm/); assert.doesNotMatch(f.h.text(), /errors.unavailable/) }
      f.h.cleanup()
    }
  }
})

await check('Storage event and missing storage event both stop stale confirmed loads and mutations', async () => {
  for (const event of [true, false]) for (const action of ['load', 'delete']) {
    const port = queuedLocks(), f = await panel({ navigator: { locks: port.locks } })
    click(f.h, `savedAnniversaries.${action}`); click(f.h, `savedAnniversaries.${action}Confirm`)
    const newer = encode([{ ...record, name: '다른 탭 수정' }], 'other-tab')
    f.h.stored.set(key, newer)
    if (event) f.h.window.dispatch('storage', { key, newValue: newer })
    port.pending[0].release(); await flush(f.h)
    assert.equal(f.loads.length, 0); assert.equal(f.h.stored.get(key), newer); assert.match(f.h.text(), /errors.conflict/)
    click(f.h, 'savedAnniversaries.refresh'); assert.match(f.h.text(), /다른 탭 수정/)
    f.h.cleanup()
  }
})

await check('Readback failure preserves draft and requires reread, while malformed/future data never writes', async () => {
  let raw = null, unreadable = false, writes = 0
  const storagePort = { getItem() { if (unreadable) throw Error('blocked readback'); return raw }, setItem(_key, value) { raw = value; unreadable = true; writes++ } }
  const f = await panel({ storagePort })
  const name = () => f.h.find(node => Object.hasOwn(node.props, 'data-lunar-anniversary-name'))
  name().props.onChange({ target: { value: '저장 결과 확인 필요' } }); f.h.render()
  f.h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await flush(f.h)
  assert.equal(writes, 1); assert.match(f.h.text(), /errors.unverified/); assert.equal(name().props.value, '저장 결과 확인 필요')
  assert.equal(f.h.button('savedAnniversaries.save').props.disabled, true)
  unreadable = false; click(f.h, 'savedAnniversaries.refresh'); assert.equal(f.h.all().filter(node => node.props['data-lunar-anniversary']).length, 1); f.h.cleanup()
  for (const invalid of ['null', '{', encode([{ ...record, lunar: { ...lunar, year: 2026 } }]), '{"version":2}']) {
    let mutations = 0
    const blocked = await panel({ storagePort: { getItem: () => invalid, setItem: () => { mutations++ } } })
    assert.equal(blocked.h.button('savedAnniversaries.save').props.disabled, true)
    assert.equal(mutations, 0); blocked.h.cleanup()
  }
})

await check('Parent takes original lunar pair from either shared mode and calendar load resets initial state', async () => {
  const solar = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeap)
  const h = await componentHarness('src/components/LunarConverter.tsx', { props: {}, globals, url: `https://toolhub.ai.kr/lunar-converter/?mode=solarToLunar&sy=${solar.year}&sm=${solar.month}&sd=${solar.day}`, storage: { [key]: encode([{ ...record, lunar: { year: 2024, month: 2, day: 30, isLeap: false } }]) } })
  h.render(); const saved = () => child(h, 'LunarSavedAnniversaries')
  assert.deepEqual(detached(saved().props.lunar), lunar)
  assert.match(h.window.location.search, /mode=solarToLunar/)
  const oldInputKey = saved().props.inputKey
  assert.equal(saved().props.onLoad(record), true); h.render()
  assert.notEqual(saved().props.inputKey, oldInputKey); assert.match(h.window.location.search, /mode=lunarToSolar/)
  const calendar = await componentHarness('src/components/LunarAnniversaryCalendar.tsx', { props: child(h, 'LunarAnniversaryCalendar').props, globals })
  calendar.render()
  const title = () => calendar.find(node => node.type === 'input' && node.props.maxLength === 100)
  assert.equal(title().props.value, record.name)
  assert.ok(calendar.all().filter(node => node.type === 'input' && node.props.type === 'checkbox').every(node => !node.props.checked))
  title().props.onChange({ target: { value: '불러온 뒤 편집' } }); calendar.render()
  h.render(); calendar.setProps(child(h, 'LunarAnniversaryCalendar').props)
  assert.equal(title().props.value, '불러온 뒤 편집')
  const beforeReload = saved().props.inputKey
  assert.equal(saved().props.onLoad(record), true); h.render(); assert.notEqual(saved().props.inputKey, beforeReload)
  calendar.cleanup(); h.cleanup()
})

await check('Copy target success generation and manually selectable failure text remain separate', async () => {
  let rejectOld, resolveNew, legacy = 0
  class Element { constructor() { this.style = {} } focus() {} select() {} setSelectionRange() {} remove() {} }
  const pending = [new Promise((_resolve, reject) => { rejectOld = reject }), new Promise(resolve => { resolveNew = resolve })]
  const h = await componentHarness('src/components/LunarConverter.tsx', { props: {}, globals: { ...globals, HTMLElement: Element }, navigator: { clipboard: { writeText: () => pending.shift() ?? Promise.reject(Error('denied')) } }, document: { body: { appendChild() {} }, createElement: () => new Element(), execCommand() { legacy++; return false } } })
  h.render()
  const copy = target => { h.find(node => node.props['data-lunar-copy'] === target).props.onClick(); h.render() }
  copy('result'); copy('table'); rejectOld(Error('old')); await flush(h)
  assert.equal(legacy, 0)
  resolveNew(); await flush(h); assert.ok(h.all().some(node => node.props['data-lunar-copy'] === 'table' && node.props.children?.type === 'icon:Check'))
  copy('result'); await flush(h); assert.equal(legacy, 1)
  const recovery = child(h, 'LunarCopyRecovery')
  assert.equal(recovery.props.target, 'result'); assert.ok(recovery.props.text.includes('=')); assert.equal(h.all().filter(node => node.type === 'icon:Check').length, 0)
  const recoveryUi = await componentHarness('src/components/LunarCopyRecovery.tsx', { props: recovery.props, globals })
  recoveryUi.render(); let selected = false
  const field = recoveryUi.find(node => node.type === 'textarea')
  assert.equal(field.props.value, recovery.props.text); assert.equal(field.props.readOnly, true)
  field.props.ref.current = { focus() {}, select() { selected = true }, setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, recovery.props.text.length) } }
  click(recoveryUi, 'copyRecovery.select'); assert.equal(selected, true)
  field.props.ref.current.select = () => { throw Error('selection blocked') }
  click(recoveryUi, 'copyRecovery.select'); assert.match(recoveryUi.text(), /selectionFailed/)
  recoveryUi.cleanup(); h.cleanup()
})

await check('Editing calendar title or years while a confirmed saved load waits cancels the pending replacement', async () => {
  for (const change of ['title', 'years']) {
  const parent = await componentHarness('src/components/LunarConverter.tsx', { props: {}, globals, url: 'https://toolhub.ai.kr/lunar-converter/?mode=lunarToSolar&ly=2024&lm=2&ld=30' })
  parent.render()
  const port = queuedLocks()
  const calendar = await componentHarness('src/components/LunarAnniversaryCalendar.tsx', { props: child(parent, 'LunarAnniversaryCalendar').props, globals })
  calendar.render()
  const f = await panel({ props: child(parent, 'LunarSavedAnniversaries').props, navigator: { locks: port.locks } })
  click(f.h, 'savedAnniversaries.load'); click(f.h, 'savedAnniversaries.loadConfirm')
  const oldKey = child(parent, 'LunarSavedAnniversaries').props.inputKey
  if (change === 'title') calendar.find(node => node.type === 'input' && node.props.maxLength === 100).props.onChange({ target: { value: '대기 중 새 달력 제목' } })
  else calendar.find(node => node.type === 'input' && node.props.type === 'checkbox' && !node.props.disabled).props.onChange()
  calendar.render()
  parent.render(); f.h.setProps(child(parent, 'LunarSavedAnniversaries').props)
  assert.equal(port.pending[0].options.signal.aborted, true)
  port.pending[0].release(); await flush(f.h); parent.render()
  const after = child(parent, 'LunarSavedAnniversaries').props
  assert.deepEqual(detached(after.lunar), { year: 2024, month: 2, day: 30, isLeap: false }, `A late load applied after calendar edit (original inputKey=${oldKey})`)
  assert.equal(child(parent, 'LunarAnniversaryCalendar').props.initialTitle, '')
  calendar.setProps(child(parent, 'LunarAnniversaryCalendar').props)
  if (change === 'title') assert.equal(calendar.find(node => node.type === 'input' && node.props.maxLength === 100).props.value, '대기 중 새 달력 제목')
  else assert.equal(calendar.all().filter(node => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked).length, 1)
  // A new explicit confirmation remains available after the stale work ends.
  click(f.h, 'savedAnniversaries.load'); click(f.h, 'savedAnniversaries.loadConfirm')
  port.pending[1].release(); await flush(f.h); parent.render()
  assert.deepEqual(detached(child(parent, 'LunarSavedAnniversaries').props.lunar), lunar)
  assert.equal(child(parent, 'LunarAnniversaryCalendar').props.initialTitle, record.name)
  calendar.cleanup(); f.h.cleanup(); parent.cleanup()
  }
})

console.log(`Independent lunar verification: ${groups} groups passed`)
