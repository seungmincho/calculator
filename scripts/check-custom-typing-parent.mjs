import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs'
import { dayNumber } from '../src/utils/typingTest.ts'

const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const messages = lang => merge(JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch23/translations-typing-custom.json', 'utf8'))[lang])
const historyKey = 'typing-test-history-v2', dailyKey = 'typing-test-daily-v1'
const EPOCH = Date.parse('2026-11-17T03:00:00.000Z')
const charts = Object.fromEntries(['LineChart', 'Line', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer'].map(name => [name, `chart:${name}`]))
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }

async function fixture(query = 'mode=time&lang=en&i=2&sec=30') {
  let elapsed = 0, id = 0, writes = 0
  const timers = new Map(), oldTimers = [], translations = messages('ko')
  const stored = new Map([[historyKey, JSON.stringify([{ ts: EPOCH - 86400000, lang: 'ko', mode: 'daily', speed: 100, acc: 100 }])], [dailyKey, JSON.stringify({ [dayNumber(EPOCH)]: { best: 100, acc: 100, tries: 2 } })]])
  const initialBytes = JSON.stringify([...stored])
  class ClockDate extends Date { constructor(value) { super(value === undefined ? EPOCH + elapsed : value) } static now() { return EPOCH + elapsed } }
  const globals = { Date: ClockDate, performance: { now: () => elapsed },
    setInterval(callback) { const next = ++id; timers.set(next, callback); oldTimers.push(callback); return next }, clearInterval(key) { timers.delete(key) },
  }
  const storagePort = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => { writes++; stored.set(key, value) } }
  const parent = await componentHarness('src/components/TypingTest.tsx', { props: {}, globals, messages: translations, storagePort, url: `https://toolhub.ai.kr/typing-test/?${query}#kept`, modules: { recharts: charts } })
  parent.render(); parent.tick(0)
  const childNode = () => parent.find(node => typeof node.type === 'function' && node.type.name === 'CustomTypingWorkspace')
  const child = await componentHarness('src/components/CustomTypingWorkspace.tsx', { props: childNode().props, globals, messages: translations, storagePort })
  child.render()
  const sync = () => { parent.render(); child.setProps(childNode().props) }
  const custom = data => child.find(node => Object.hasOwn(node.props, data))
  const standard = () => parent.find(node => Object.hasOwn(node.props, 'data-standard-input'))
  return { parent, child, translations, stored, initialBytes, timers, oldTimers, sync, custom, standard, writes: () => writes,
    mode(value) { parent.find(node => node.props['data-typing-mode'] === value).props.onClick(); sync() },
    input(value, composing = false) { standard().props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); sync() },
    target() { return parent.find(node => node.type === 'div' && node.props.lang && node.props.className?.includes('cursor-text')).props.children.map(node => node.props.children).join('') },
    draft(value) { custom('data-custom-draft').props.onChange({ target: { value } }); sync() },
    apply() { custom('data-custom-apply').props.onClick(); sync() },
    typeCustom(value, composing = false) { custom('data-custom-input').props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); sync() },
    advance(ms) { elapsed += ms; for (const callback of [...timers.values()]) callback(); sync() },
    result() { return parent.all().find(node => Object.hasOwn(node.props, 'data-standard-result')) },
    customResult() { return child.all().find(node => Object.hasOwn(node.props, 'data-custom-result')) },
    cleanup() { child.cleanup(); parent.cleanup() },
  }
}

await check('Initial standard URL and four modes remain intact; opening custom adds no URL or storage fields', async () => {
  const f = await fixture()
  assert.equal(f.parent.find(node => node.props['data-typing-mode'] === 'time').props['aria-pressed'], true)
  assert.equal(f.standard().props.lang, 'en')
  for (const mode of ['daily', 'short', 'long', 'time']) assert.ok(f.parent.find(node => node.props['data-typing-mode'] === mode))
  const url = f.parent.window.location.href
  f.mode('custom'); f.draft('my private passage goes here'); f.apply()
  assert.equal(f.parent.all().filter(node => Object.hasOwn(node.props, 'data-standard-input')).length, 0)
  assert.equal(f.parent.window.location.href, url); assert.equal(JSON.stringify([...f.stored]), f.initialBytes); assert.equal(f.writes(), 0)
  f.cleanup()
})

await check('Standard timed attempt stops before custom starts, and its late tick/input never writes history', async () => {
  const f = await fixture()
  f.input('a'); assert.equal(f.timers.size, 1)
  const oldTick = f.oldTimers[0], oldInput = f.standard(), target = f.target()
  f.mode('custom'); assert.equal(f.timers.size, 0)
  f.advance(40000); oldTick(); oldInput.props.onChange({ target: { value: target }, nativeEvent: {} }); f.sync()
  assert.equal(f.writes(), 0)
  f.draft('abcdefghij'); f.apply(); f.typeCustom('a'); assert.equal(f.timers.size, 1)
  const customTick = f.oldTimers.at(-1), staleCustom = f.custom('data-custom-input')
  f.mode('short'); assert.equal(f.timers.size, 0)
  customTick(); staleCustom.props.onCompositionEnd({ currentTarget: { value: 'abcdefghij' } }); f.sync()
  assert.equal(f.writes(), 0); assert.equal(f.standard().props.value, '')
  f.mode('custom'); assert.equal(f.custom('data-custom-draft').props.value, 'abcdefghij'); assert.equal(f.custom('data-custom-input').props.value, '')
  assert.equal(f.customResult(), undefined); assert.equal(f.timers.size, 0); f.cleanup()
})

await check('Completed custom work leaves records byte-identical; ordinary daily completion still records exactly once', async () => {
  const f = await fixture('')
  f.mode('custom'); f.draft('abcdefghij'); f.apply(); f.typeCustom('a'); f.advance(1200); f.typeCustom('abcdefghij')
  assert.ok(f.customResult()); assert.equal(JSON.stringify([...f.stored]), f.initialBytes); assert.equal(f.writes(), 0)
  f.mode('daily'); const target = f.target()
  f.standard().props.onCompositionStart(); f.input(target[0], true); f.advance(1000); f.input(target, true)
  assert.equal(f.result(), undefined); assert.equal(f.writes(), 0)
  const finalInput = f.standard()
  finalInput.props.onCompositionEnd({ currentTarget: { value: target } }); f.sync()
  assert.ok(f.result()); assert.equal(f.writes(), 2); assert.equal(f.timers.size, 0)
  finalInput.props.onCompositionEnd({ currentTarget: { value: target } }); f.sync()
  assert.equal(f.writes(), 2)
  assert.equal(JSON.parse(f.stored.get(historyKey)).length, 2)
  assert.equal(JSON.parse(f.stored.get(dailyKey))[dayNumber(EPOCH)].tries, 3)
  f.cleanup()
})

await check('Short, long and timed standard attempts retain their existing modes and history shape', async () => {
  for (const mode of ['short', 'long', 'time']) {
    const f = await fixture(`mode=${mode}&lang=en&i=0&sec=30`), target = f.target()
    f.input(target[0]); f.advance(mode === 'time' ? 30000 : 1500)
    if (mode !== 'time') f.input(target)
    assert.ok(f.result()); assert.equal(f.writes(), 1)
    const last = JSON.parse(f.stored.get(historyKey)).at(-1)
    assert.equal(last.mode, mode); assert.equal(last.lang, 'en')
    assert.deepEqual(Object.keys(last).sort(), ['acc', 'lang', 'mode', 'speed', 'ts'])
    assert.equal(JSON.parse(f.stored.get(dailyKey))[dayNumber(EPOCH)].tries, 2)
    assert.equal(f.timers.size, 0); f.cleanup()
  }
})

await check('App locale and repeated custom selection preserve custom draft, active target and one timer', async () => {
  const f = await fixture()
  f.mode('custom'); f.draft('abcdefghij'); f.apply(); f.typeCustom('a')
  f.draft('unfinished draft to keep'); f.mode('custom')
  f.translations.typingTest = messages('en').typingTest; f.sync()
  assert.equal(f.custom('data-custom-draft').props.value, 'unfinished draft to keep')
  assert.equal(f.custom('data-custom-input').props.value, 'a'); assert.equal(f.timers.size, 1)
  assert.ok(f.child.text().includes('Current confirmed passage'))
  const url = f.parent.window.location.href
  f.mode('daily'); f.mode('custom')
  assert.equal(f.custom('data-custom-draft').props.value, 'unfinished draft to keep')
  assert.equal(f.custom('data-custom-input').props.value, ''); assert.equal(f.timers.size, 0)
  assert.ok(!url.includes('unfinished')); assert.equal(f.writes(), 0); f.cleanup()
})

await check('Standard summary uses the common copy recovery and unmount invalidates its old completion', async () => {
  const f = await fixture('mode=short&lang=en&i=0'), target = f.target()
  f.input(target[0]); f.advance(2000); f.input(target)
  const copyNode = f.parent.find(node => typeof node.type === 'function' && node.type.name === 'TypingSummaryCopy')
  assert.ok(copyNode.props.text.includes(f.parent.window.location.href)); assert.ok(!copyNode.props.text.includes(target))
  let resolvePending, call = 0
  class Element { constructor() { this.style = {} } focus() {} select() {} setSelectionRange() {} remove() {} }
  const copy = await componentHarness('src/components/TypingSummaryCopy.tsx', { props: copyNode.props, messages: f.translations,
    globals: { HTMLElement: Element }, navigator: { clipboard: { writeText: async () => { if (++call === 1) throw Error('denied'); await new Promise(resolve => { resolvePending = resolve }) } } },
    document: { body: { appendChild() {} }, createElement: () => new Element(), execCommand: () => false },
  })
  copy.render(); copy.button('결과 요약 복사').props.onClick(); await new Promise(resolve => setImmediate(resolve)); copy.render()
  assert.equal(copy.find(node => node.type === 'textarea').props.value, copyNode.props.text)
  assert.ok(!copy.text().includes('결과 요약을 복사했습니다.'))
  copy.button('결과 요약 복사').props.onClick(); copy.render(); f.mode('custom'); copy.cleanup(); resolvePending(); await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.result(), undefined); assert.equal(f.parent.all().filter(node => typeof node.type === 'function' && node.type.name === 'TypingSummaryCopy').length, 0)
  f.cleanup()
})

console.log(`Custom typing parent: ${groups} groups passed (actual parent/child events, controlled clocks and I/O)`)
