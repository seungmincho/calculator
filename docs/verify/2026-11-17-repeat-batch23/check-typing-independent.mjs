import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import { prepareCustomTypingText, createCustomTypingAttempt, updateCustomTypingAttempt } from '../../../src/utils/customTyping.ts'

const load = locale => {
  const source = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch23/translations-typing-custom.json', 'utf8'))[locale]
  const merge = (base, extra) => { for (const [key, value] of Object.entries(extra)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
  return merge(source, patch)
}
const has = (node, name) => Object.hasOwn(node.props, name)
const flatten = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(flatten).join('') : node ? flatten(node.props?.children) : ''
const historyKey = 'typing-test-history-v2', dailyKey = 'typing-test-daily-v1'
const epoch = Date.parse('2026-11-17T03:00:00Z')
const flush = async () => { await new Promise(resolve => setImmediate(resolve)) }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }

async function parentFixture(query = 'mode=short&lang=en&i=0', historyLength = 1) {
  let now = 1000, sequence = 0, writes = 0, focused = 0
  const intervals = new Map(), oldIntervals = [], messages = load('ko')
  const records = new Map([
    [historyKey, JSON.stringify(Array.from({ length: historyLength }, (_, i) => ({ ts: epoch - (i + 1) * 1000, lang: 'ko', mode: 'short', speed: 100, acc: 100 })))],
    [dailyKey, '{}'],
  ])
  const initial = JSON.stringify([...records])
  class ClockDate extends Date { constructor(value) { super(value === undefined ? epoch + now : value) } static now() { return epoch + now } }
  const globals = { Date: ClockDate, performance: { now: () => now },
    setInterval(callback) { const id = ++sequence; intervals.set(id, callback); oldIntervals.push(callback); return id },
    clearInterval(id) { intervals.delete(id) },
  }
  const storagePort = { getItem: key => records.get(key) ?? null, setItem(key, value) { writes++; records.set(key, value) } }
  const charts = Object.fromEntries(['LineChart', 'Line', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer'].map(key => [key, key]))
  const p = await componentHarness('src/components/TypingTest.tsx', { props: {}, messages, globals, storagePort, url: `https://toolhub.ai.kr/typing-test/?${query}#retained`, modules: { recharts: charts } })
  p.render(); p.tick(0)
  const childProps = () => p.find(node => typeof node.type === 'function' && node.type.name === 'CustomTypingWorkspace').props
  const c = await componentHarness('src/components/CustomTypingWorkspace.tsx', { props: childProps(), messages, globals, storagePort,
    beforeEffects(tree) {
      const visit = node => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(visit); return }
        if (has(node, 'data-custom-input')) node.props.ref.current = { focus() { focused++ } }
        visit(node.props.children)
      }
      visit(tree)
    },
  })
  c.render()
  const sync = () => { p.render(); c.setProps(childProps()) }
  const field = () => p.find(node => has(node, 'data-standard-input'))
  const custom = key => c.find(node => has(node, key))
  const result = () => c.all().find(node => has(node, 'data-custom-result'))
  return { p, c, messages, records, initial, intervals, oldIntervals, sync, field, custom, result, writes: () => writes, focused: () => focused,
    mode(mode) { p.find(node => node.props['data-typing-mode'] === mode).props.onClick(); sync() },
    draft(value) { custom('data-custom-draft').props.onChange({ target: { value } }); sync() },
    apply() { custom('data-custom-apply').props.onClick(); sync() },
    input(value, composing = false) { custom('data-custom-input').props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); sync() },
    standard(value) { field().props.onChange({ target: { value }, nativeEvent: {} }); sync() },
    target() { return flatten(p.find(node => node.type === 'div' && node.props.lang && node.props.className?.includes('cursor-text'))) },
    time(ms) { now += ms; for (const callback of [...intervals.values()]) callback(); sync() },
    locale(locale) { messages.typingTest = load(locale).typingTest; sync() },
    cleanup() { c.cleanup(); p.cleanup() },
  }
}

await check('Independent code-point/normalization boundaries retain all allowed non-ASCII characters', () => {
  for (const char of ['a', '😀', '각']) for (const length of [9, 10, 1000, 1001]) {
    const raw = ` \t${char.repeat(length)}\r\n `, preview = prepareCustomTypingText(raw)
    assert.equal(preview.count, length); assert.equal(preview.text, char.repeat(length))
    assert.equal(preview.error, length < 10 ? 'tooShort' : length > 1000 ? 'tooLong' : null)
  }
  const source = 'ab\u00a0cd\u200bef\tg h\r\ni'
  assert.equal(prepareCustomTypingText(source).text, 'ab\u00a0cd\u200bef g h i')
})

await check('Independent numeric oracle: KO 30 keys/15s, EN 10 chars/30s, corrected errors and committed final prefix', () => {
  const finish = (target, lang, first, final, duration) => updateCustomTypingAttempt(updateCustomTypingAttempt(createCustomTypingAttempt(target, lang), first, false, 100), final, false, duration + 100)
  const ko = finish('각'.repeat(10), 'ko', '각', '각'.repeat(10), 15000).result
  assert.deepEqual([ko.keys, ko.speed, ko.accuracy, ko.errors], [30, 120, 100, 0])
  const en = finish('abcdefghij', 'en', 'a', 'abcdefghij', 30000).result
  assert.deepEqual([en.keys, en.speed, en.accuracy, en.errors], [10, 4, 100, 0])
  let corrected = updateCustomTypingAttempt(createCustomTypingAttempt('abcdefghij', 'en'), 'xy', false, 0)
  corrected = updateCustomTypingAttempt(corrected, 'a', false, 500)
  corrected = updateCustomTypingAttempt(corrected, 'abcdefghij', false, 6000)
  assert.deepEqual([corrected.result.speed, corrected.result.accuracy, corrected.result.errors], [20, 80, 2])
  const wrong = '각'.repeat(9) + '가'
  let prefix = updateCustomTypingAttempt(createCustomTypingAttempt('각'.repeat(10), 'ko'), '각', true, 0)
  prefix = updateCustomTypingAttempt(prefix, wrong, true, 60000); assert.equal(prefix.result, null)
  prefix = updateCustomTypingAttempt(prefix, wrong, false, 60000)
  assert.deepEqual([prefix.result.keys, prefix.result.speed, prefix.result.accuracy, prefix.result.errors], [27, 27, 90, 1])
  assert.deepEqual(prefix.result.missed, [['ㄱ', 1]])
  assert.equal(updateCustomTypingAttempt(prefix, wrong, false, 61000), prefix)
})

await check('Actual parent keeps four standard modes, 100-row cap and one daily write per completed run', async () => {
  for (const mode of ['daily', 'short', 'long', 'time']) {
    const f = await parentFixture(`mode=${mode}&lang=en&i=0&sec=30`, 100), target = f.target()
    f.standard([...target][0]); f.time(mode === 'time' ? 30000 : 6000)
    if (mode !== 'time') f.standard(target)
    assert.ok(f.p.all().some(node => has(node, 'data-standard-result')))
    const history = JSON.parse(f.records.get(historyKey)), last = history.at(-1)
    assert.equal(history.length, 100); assert.equal(last.mode, mode)
    assert.deepEqual(Object.keys(last).sort(), ['acc', 'lang', 'mode', 'speed', 'ts'])
    assert.equal(f.writes(), mode === 'daily' ? 2 : 1); assert.equal(f.intervals.size, 0)
    const old = f.field(); old.props.onCompositionEnd({ currentTarget: { value: target } }); f.sync()
    assert.equal(f.writes(), mode === 'daily' ? 2 : 1)
    if (mode === 'daily') assert.equal(Object.values(JSON.parse(f.records.get(dailyKey)))[0].tries, 1)
    else assert.equal(last.speed, Math.round((mode === 'time' ? 1 : [...target].length) / 5 * 60000 / (mode === 'time' ? 30000 : 6000)))
    f.cleanup()
  }
})

await check('Actual parent custom IME final/duplicate completion keeps storage bytes and URL free of private text', async () => {
  const f = await parentFixture(), url = f.p.window.location.href, target = '각'.repeat(10)
  f.mode('custom'); f.draft(` \t${target}\r\n `); f.apply()
  const input = f.custom('data-custom-input'); input.props.onCompositionStart()
  f.input('ㄱ', false); f.time(15000); f.input(target, false)
  assert.equal(f.result(), undefined)
  input.props.onCompositionEnd({ currentTarget: { value: target } }); f.sync()
  assert.ok(f.result()); assert.equal(f.intervals.size, 0)
  const completed = flatten(f.result())
  input.props.onCompositionEnd({ currentTarget: { value: target } }); f.input(target)
  assert.equal(flatten(f.result()), completed)
  const copy = f.c.find(node => typeof node.type === 'function' && node.type.name === 'TypingSummaryCopy')
  assert.ok(!copy.props.text.includes(target)); assert.ok(!copy.props.text.includes('http'))
  assert.equal(f.p.window.location.href, url); assert.equal(JSON.stringify([...f.records]), f.initial); assert.equal(f.writes(), 0)
  f.cleanup()
})

await check('Rapid restart and repeated mode cycles reject old input/timer generations without hidden writes', async () => {
  const f = await parentFixture('mode=time&lang=en&i=0&sec=30')
  f.standard('a'); const staleStandard = f.field(), oldTick = f.oldIntervals.at(-1), oldTarget = f.target()
  f.mode('custom'); f.draft('abcdefghij'); f.apply(); f.input('a')
  const staleCustom = f.custom('data-custom-input'), customTick = f.oldIntervals.at(-1)
  const retry = f.custom('data-custom-retry'); retry.props.onClick()
  staleCustom.props.onCompositionEnd({ currentTarget: { value: 'abcdefghij' } }); customTick(); f.sync()
  assert.equal(f.custom('data-custom-input').props.value, ''); assert.equal(f.result(), undefined)
  for (let i = 0; i < 3; i++) {
    f.input('a'); assert.equal(f.intervals.size, 1)
    f.mode('time'); assert.equal(f.intervals.size, 0); f.standard('a'); assert.equal(f.intervals.size, 1)
    f.mode('custom'); assert.equal(f.intervals.size, 0)
  }
  f.time(60000); oldTick(); customTick(); staleStandard.props.onChange({ target: { value: oldTarget }, nativeEvent: {} }); f.sync()
  assert.equal(f.writes(), 0); assert.equal(f.custom('data-custom-input').props.value, ''); assert.equal(f.intervals.size, 0)
  f.cleanup()
})

await check('Locale and next-unit edits preserve active draft/target; explicit actions alone request focus', async () => {
  const f = await parentFixture()
  f.mode('custom'); assert.equal(f.focused(), 0)
  f.draft('abcdefghij'); f.apply(); assert.equal(f.focused(), 1)
  f.input('a'); f.draft('next private draft'); f.c.find(node => node.props['data-custom-language'] === 'en').props.onClick(); f.sync()
  f.locale('en')
  assert.equal(f.custom('data-custom-draft').props.value, 'next private draft'); assert.equal(f.custom('data-custom-input').props.value, 'a')
  assert.equal(flatten(f.custom('data-custom-target')), 'abcdefghij'); assert.equal(f.custom('data-custom-input').props.lang, 'ko')
  assert.equal(f.focused(), 1); assert.equal(f.intervals.size, 1)
  f.custom('data-custom-retry').props.onClick(); f.sync(); assert.equal(f.focused(), 2)
  f.mode('short'); f.mode('custom'); assert.equal(f.focused(), 2)
  f.custom('data-custom-input').props.onKeyDown({ key: 'Escape', nativeEvent: {}, preventDefault() {} }); f.sync(); assert.equal(f.focused(), 3)
  f.cleanup()
})

await check('Actual typing input blocks paste/drop while composition keys remain untouched', async () => {
  const f = await parentFixture(); f.mode('custom'); f.draft('abcdefghij'); f.apply(); f.input('a')
  let prevented = 0
  const input = f.custom('data-custom-input'), event = { nativeEvent: {}, preventDefault() { prevented++ } }
  input.props.onPaste(event); input.props.onDrop(event)
  for (const inputType of ['insertFromPaste', 'insertFromDrop']) input.props.onBeforeInput({ ...event, nativeEvent: { inputType } })
  input.props.onKeyDown({ ...event, key: 'Escape', keyCode: 229, nativeEvent: { isComposing: true } }); f.sync()
  assert.equal(prevented, 4); assert.equal(f.custom('data-custom-input').props.value, 'a')
  assert.equal(f.custom('data-custom-draft').props.onPaste, undefined)
  f.cleanup()
})

await check('Actual copy component ignores obsolete rejection before fallback and exposes only current failed summary', async () => {
  const jobs = [], messages = load('ko'); let fallbacks = 0, selected = 0
  class Host { constructor() { this.style = {} } focus() {} select() { selected++ } setSelectionRange() {} remove() {} }
  let props = { text: 'first numerical summary', contextKey: 'old', active: true }
  const h = await componentHarness('src/components/TypingSummaryCopy.tsx', { props, messages, globals: { HTMLElement: Host },
    navigator: { clipboard: { writeText() { const task = deferred(); jobs.push(task); return task.promise } } },
    document: { body: { appendChild() {} }, createElement: () => new Host(), execCommand() { fallbacks++; return false } },
  })
  h.render(); h.all().find(node => node.type === 'button').props.onClick(); h.render()
  props = { ...props, text: 'second numerical summary', contextKey: 'new' }; h.setProps(props)
  h.all().find(node => node.type === 'button').props.onClick(); h.render()
  jobs[0].reject(new Error('late denial')); await flush(); h.render(); assert.equal(fallbacks, 0)
  jobs[1].reject(new Error('current denial')); await flush(); h.render(); assert.equal(fallbacks, 1)
  const field = h.find(node => node.type === 'textarea'); assert.equal(field.props.value, props.text); assert.equal(field.props.readOnly, true)
  field.props.ref.current = new Host(); h.button(messages.typingTest.copyRecovery.select).props.onClick(); h.render(); assert.equal(selected, 2)
  h.all().find(node => node.type === 'button').props.onClick(); h.render(); h.setProps({ ...props, active: false })
  jobs[2].resolve(); await flush(); h.render(); assert.equal(h.text(), ''); assert.equal(fallbacks, 1)
  h.cleanup()
})

console.log(`Typing independent: ${groups} groups passed (actual component handlers and controlled I/O; no browser or OS IME claim)`)
