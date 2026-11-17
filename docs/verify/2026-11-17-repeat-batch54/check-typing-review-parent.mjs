import assert from 'node:assert/strict'
import { parentFixture, HISTORY_KEY, DAILY_KEY } from './typing-review-parent-harness.mjs'
import * as review from '../../../src/utils/typingReview.ts'

let passed = 0
const test = async (name, run) => { if (process.argv[2] && !new RegExp(process.argv[2]).test(name)) return; await run(); passed++; console.log(`PASS ${name}`) }
const data = (host, key) => host.all().find(node => Object.hasOwn(node.props ?? {}, key))
const bytes = f => JSON.stringify([...f.stored])
const values = value => JSON.parse(JSON.stringify(value))

await test('four original modes record once and completed section practice leaves both records and source unchanged', async () => {
  for (const mode of ['daily', 'short', 'long', 'time']) {
    const f = await parentFixture({ query: `mode=${mode}&lang=en&i=0&sec=30`, historyLength: 100 })
    try {
      const target = f.target(), url = f.p.window.location.href
      assert.equal(f.standardReview, null); await f.input('X'); await f.advance(mode === 'time' ? 30000 : 2000)
      if (mode !== 'time') await f.input(target)
      assert.ok(data(f.p, 'data-standard-result')); const snapshot = f.snapshot()
      assert.deepEqual(values(snapshot.errors), [0]); assert.equal(snapshot.target, target)
      assert.equal(JSON.parse(f.stored.get(HISTORY_KEY)).length, 100); assert.equal(f.writes.length, mode === 'daily' ? 2 : 1)
      const last = JSON.parse(f.stored.get(HISTORY_KEY)).at(-1); assert.deepEqual(Object.keys(last).sort(), ['acc', 'lang', 'mode', 'speed', 'ts']); assert.equal(last.mode, mode)
      const completedBytes = bytes(f), writes = f.writes.length, mainText = f.standard().props.value
      const card = values(f.p.find(node => node.type === 'ShareResult').props.card)
      await f.choose('standard'); await f.reviewClick('standard', 'start')
      const snippet = snapshot.fragments[0].text; await f.reviewType('standard', [...snippet][0]); await f.advance(500)
      assert.ok(f.timers.filter(timer => timer.active).length <= 1); await f.reviewType('standard', snippet)
      assert.ok(data(f.standardReview, 'data-typing-review-result'))
      await f.reviewClick('standard', 'retry'); await f.reviewClick('standard', 'close')
      assert.equal(bytes(f), completedBytes); assert.equal(f.writes.length, writes); assert.equal(f.snapshot(), snapshot)
      assert.deepEqual(values(f.p.find(node => node.type === 'ShareResult').props.card), card); assert.equal(f.standard().props.value, mainText)
      assert.equal(f.p.window.location.href, url); assert.equal(f.timers.filter(timer => timer.active).length, 0)
      const completedInput = f.standard(); completedInput.props.onCompositionEnd({ currentTarget: { value: target } }); await f.sync(); assert.equal(f.writes.length, writes)
    } finally { f.cleanup() }
  }
})

await test('custom corrected errors use confirmed source while draft, unit and locale stay separate from review', async () => {
  const f = await parentFixture()
  try {
    const url = f.p.window.location.href, draft = '  alpha\t beta\r\n gamma  '
    await f.mode('custom'); await f.draft(draft); await f.apply(); await f.customType('x'); await f.advance(1000); await f.customType('alpha'); await f.customType('alpha beta gamma')
    const snapshot = f.snapshot('custom'); assert.deepEqual(values(snapshot.errors), [0]); assert.equal(snapshot.target, 'alpha beta gamma'); assert.equal(snapshot.fragments[0].text, 'alpha')
    assert.ok(data(f.c, 'data-custom-result')); const customInput = f.custom('input').props.value
    assert.ok(f.c.text().includes(f.messages.typingTest.custom.errors.replace('{count}', '1')))
    const summary = f.c.find(node => typeof node.type === 'function' && node.type.name === 'TypingSummaryCopy').props.text
    assert.ok(!summary.includes(snapshot.target)); assert.equal(bytes(f), f.initial)
    await f.choose('custom'); await f.reviewClick('custom', 'start'); await f.reviewType('custom', 'a')
    await f.draft('new private draft to preserve')
    f.c.find(node => node.props['data-custom-language'] === 'en').props.onClick(); await f.sync(); await f.locale('en')
    assert.equal(f.snapshot('custom'), snapshot); assert.equal(f.reviewAttr('custom', 'input').props.value, 'a'); assert.equal(f.timers.filter(timer => timer.active).length, 1)
    assert.equal(f.custom('input').props.value, customInput); assert.equal(f.custom('draft').props.value, 'new private draft to preserve')
    await f.advance(1000); await f.reviewType('custom', 'alpha'); assert.ok(data(f.customReview, 'data-typing-review-result'))
    assert.equal(bytes(f), f.initial); assert.equal(f.writes.length, 0); assert.equal(f.p.window.location.href, url)
    assert.equal(f.custom('input').props.lang, 'ko')
    await f.apply(); assert.equal(f.customReview, null); assert.equal(f.custom('input').props.lang, 'en'); assert.equal(f.custom('input').props.value, '')
  } finally { f.cleanup() }
})

await test('both parents exclude provisional IME errors but include committed final prefixes without changing original scoring', async () => {
  const f = await parentFixture({ query: '' })
  try {
    const target = f.target(); f.standard().props.onCompositionStart(); await f.input('갖'); await f.advance(1000); await f.input(target)
    assert.equal(f.standardReview, null); await f.end(target)
    assert.deepEqual(values(f.snapshot().errors), []); assert.ok(data(f.standardReview, 'data-typing-review-empty'))
    assert.equal(f.writes.length, 2); assert.ok(JSON.parse(f.stored.get(HISTORY_KEY)).at(-1).acc < 100)
    const saved = bytes(f); await f.mode('custom'); const customTarget = '강'.repeat(10)
    await f.draft(customTarget); await f.apply(); f.custom('input').props.onCompositionStart(); await f.customType('갖'); await f.advance(1000); await f.customType(customTarget)
    assert.equal(f.customReview, null); await f.customEnd(customTarget)
    assert.deepEqual(values(f.snapshot('custom').errors), []); assert.ok(f.c.text().includes(f.messages.typingTest.custom.errors.replace('{count}', '1')))
    const first = f.snapshot('custom'); await f.customEnd(customTarget); assert.equal(f.snapshot('custom'), first)
    f.custom('retry').props.onClick(); await f.sync(); f.custom('input').props.onCompositionStart(); await f.customType('ㄱ'); await f.advance(1000)
    await f.customType('강'.repeat(9) + '가'); await f.customEnd('강'.repeat(9) + '가')
    assert.deepEqual(values(f.snapshot('custom').errors), [9]); assert.equal(bytes(f), saved)
    const committed = f.snapshot('custom'); assert.ok(committed.id > first.id)
  } finally { f.cleanup() }
})

await test('timed completion snapshots only prior committed positions and never scores untouched suffix for review', async () => {
  const f = await parentFixture({ query: 'mode=time&lang=en&i=0&sec=30' })
  try {
    await f.input('X'); f.standard().props.onCompositionStart(); await f.input('XZZZZZZ', false); await f.advance(30000)
    const snapshot = f.snapshot(); assert.deepEqual(values(snapshot.errors), [0]); assert.equal(snapshot.fragments.length, 1); assert.ok(snapshot.target.length > 7)
    const writes = f.writes.length, old = f.standard(); old.props.onCompositionEnd({ currentTarget: { value: 'XXXXXX' } }); await f.sync()
    assert.equal(f.snapshot(), snapshot); assert.equal(f.writes.length, writes)
    f.p.button(f.messages.typingTest.restart).props.onClick(); await f.sync(); assert.equal(f.standardReview, null)
    await f.input([...f.target()][0]); await f.advance(30000); assert.deepEqual(values(f.snapshot().errors), [])
    assert.ok(data(f.standardReview, 'data-typing-review-empty')); assert.equal(f.writes.length, writes + 1)
  } finally { f.cleanup() }
})

await test('mode switches and new original attempts cancel review timer and old handlers without hidden writes', async () => {
  const f = await parentFixture()
  try {
    await f.input('X'); await f.advance(1000); await f.input(f.target()); await f.choose('standard'); await f.reviewClick('standard', 'start'); await f.reviewType('standard', 'a')
    const oldInput = f.reviewAttr('standard', 'input').props, oldStart = f.reviewAttr('standard', 'start').props.onClick, oldTick = f.timers.findLast(timer => timer.active).callback
    const stored = bytes(f); await f.mode('custom'); assert.equal(f.timers.filter(timer => timer.active).length, 0)
    await f.draft('alpha beta gamma'); await f.apply(); await f.customType('x'); assert.equal(f.timers.filter(timer => timer.active).length, 1)
    oldInput.onCompositionEnd({ currentTarget: { value: 'old complete' } }); oldStart(); oldTick(); await f.sync()
    assert.equal(f.custom('input').props.value, 'x'); assert.equal(bytes(f), stored)
    await f.advance(1000); await f.customType('alpha beta gamma'); await f.choose('custom'); await f.reviewClick('custom', 'start'); await f.reviewType('custom', 'a')
    const stale = f.reviewAttr('custom', 'input').props
    await f.mode('short'); stale.onCompositionEnd({ currentTarget: { value: 'alpha' } }); await f.sync()
    assert.equal(f.standard().props.value, ''); assert.equal(f.timers.filter(timer => timer.active).length, 0); assert.equal(bytes(f), stored)
    await f.input('X'); await f.advance(1000); await f.input(f.target()); const next = f.snapshot()
    assert.ok(next.id > 1); assert.deepEqual(values(next.errors), [0]); assert.equal(data(f.standardReview, 'data-typing-review-attempt'), undefined)
  } finally { f.cleanup() }
})

await test('review preparation failure preserves completed originals and never changes source storage schema', async () => {
  const port = { ...review, captureTypingReview() { throw Error('controlled review failure') } }, f = await parentFixture({ reviewPort: port })
  try {
    await f.input('X'); await f.advance(1000); await f.input(f.target())
    assert.ok(data(f.p, 'data-standard-result')); assert.ok(data(f.p, 'data-typing-review-unavailable')); assert.equal(f.snapshot(), null)
    assert.equal(f.writes.length, 1); const saved = bytes(f)
    await f.mode('custom'); await f.draft('alpha beta'); await f.apply(); await f.customType('a'); await f.advance(1000); await f.customType('alpha beta')
    assert.ok(data(f.c, 'data-custom-result')); assert.ok(data(f.c, 'data-typing-review-unavailable')); assert.equal(f.snapshot('custom'), null)
    assert.equal(bytes(f), saved); assert.ok(f.writes.every(([key]) => key === HISTORY_KEY || key === DAILY_KEY))
    assert.equal(f.custom('input').props.value, 'alpha beta')
  } finally { f.cleanup() }
})
console.log(`Typing review actual parent: ${passed} groups`)
