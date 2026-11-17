import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import * as review from '../../../src/utils/typingReview.ts'
import { parentFixture, HISTORY_KEY, DAILY_KEY } from './typing-review-parent-harness.mjs'

// Reuse controlled ports only; the assertions below are independent of author parent tests.
const protectedPaths = ['src/utils/typingTest.ts', 'src/utils/customTyping.ts', 'docs/verify/2026-11-17-repeat-batch54/existing-typing-observations.json']
const hashes = () => Object.fromEntries(protectedPaths.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const before = hashes()
const flat = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node ? '' : Array.isArray(node) ? node.map(flat).join('') : flat(node.props?.children)
const activeTimers = f => f.timers.filter(timer => timer.active).length
const bytes = f => JSON.stringify([...f.stored])
const has = (host, attr) => !!host?.all().some(node => Object.hasOwn(node.props, attr))
const share = f => JSON.stringify(f.p.find(node => node.type === 'ShareResult').props)
const errors = snapshot => Array.from(snapshot.errors)
let count = 0
async function check(name, run) { await run(); count++; console.log('PASS ' + name) }
async function completeWithCorrectedFirst(f, timed = false) {
  const target = f.target()
  await f.input('X'); await f.advance(1250)
  if (timed) { await f.input([...target].slice(0, 4).join('')); await f.advance(60000) }
  else await f.input(target)
  return target
}

await check('four actual standard modes record once and independent section completion never rewrites original results/history', async () => {
  for (const mode of ['daily', 'short', 'long', 'time']) {
    const f = await parentFixture({ query: mode === 'daily' ? '' : `mode=${mode}&lang=en&i=0&sec=30` })
    try {
      const beforeHistory = JSON.parse(f.stored.get(HISTORY_KEY)).length
      const target = await completeWithCorrectedFirst(f, mode === 'time')
      const snapshot = f.snapshot(), originalShare = share(f), originalBytes = bytes(f), originalWrites = f.writes.length, url = f.p.window.location.href
      assert.equal(snapshot.target, target); assert.deepEqual(errors(snapshot), [0])
      assert.equal(JSON.parse(f.stored.get(HISTORY_KEY)).length, beforeHistory + 1)
      assert.equal(f.writes.filter(([key]) => key === HISTORY_KEY).length, 1)
      assert.equal(f.writes.filter(([key]) => key === DAILY_KEY).length, mode === 'daily' ? 1 : 0)
      assert.equal(activeTimers(f), 0)
      await f.choose('standard'); await f.reviewClick('standard', 'start')
      const fragment = snapshot.fragments[0].text
      await f.reviewType('standard', 'X'); await f.advance(800)
      await f.reviewType('standard', [...fragment].map(() => 'X').join(''))
      assert.ok(has(f.standardReview, 'data-typing-review-result'))
      assert.equal(bytes(f), originalBytes); assert.equal(f.writes.length, originalWrites); assert.equal(share(f), originalShare)
      assert.equal(f.p.window.location.href, url); assert.equal(f.snapshot(), snapshot)
      await f.reviewClick('standard', 'retry'); await f.reviewType('standard', fragment)
      await f.reviewClick('standard', 'close')
      for (const timer of f.timers) timer.callback()
      await f.sync()
      assert.equal(bytes(f), originalBytes); assert.equal(f.writes.length, originalWrites); assert.equal(activeTimers(f), 0)
    } finally { f.cleanup() }
  }
})

await check('timed finish captures only previously committed positions, excluding transient IME and untouched suffix', async () => {
  const f = await parentFixture({ query: 'mode=time&lang=ko&i=0&sec=30' })
  try {
    const target = f.target(), chars = [...target]
    await f.input('X'); await f.input(chars[0])
    f.standard().props.onCompositionStart()
    await f.input(chars[0] + 'Z', false)
    await f.advance(30000)
    const first = f.snapshot()
    assert.equal(first.target, target); assert.deepEqual(errors(first), [0]); assert.equal(first.errors.includes(1), false)
    const history = bytes(f), captured = first
    await f.end(chars[0] + 'Z'); assert.equal(f.snapshot(), captured); assert.equal(bytes(f), history)
    await f.mode('custom'); await f.mode('time')
    f.standard().props.onCompositionStart(); await f.input('Z', true); await f.advance(30000)
    assert.deepEqual(errors(f.snapshot()), []); assert.equal(f.snapshot().fragments.length, 0)
    assert.ok(has(f.standardReview, 'data-typing-review-empty')); assert.equal(activeTimers(f), 0)
  } finally { f.cleanup() }
})

await check('actual custom confirmation keeps source/draft/language/result separate from corrected-error practice', async () => {
  const f = await parentFixture()
  try {
    await f.mode('custom')
    const raw = '\t alpha  beta\n gamma '
    await f.draft(raw)
    f.c.find(node => node.props['data-custom-language'] === 'en').props.onClick(); await f.sync(); await f.apply()
    await f.customType('ax'); await f.advance(2000); await f.customType('alpha beta gamma')
    const snapshot = f.snapshot('custom'), originalBytes = bytes(f), originalWrites = f.writes.length, target = flat(f.custom('target'))
    assert.equal(snapshot.target, 'alpha beta gamma'); assert.equal(snapshot.lang, 'en'); assert.deepEqual(errors(snapshot), [1])
    assert.equal(f.custom('draft').props.value, raw); assert.equal(f.custom('input').props.value, snapshot.target)
    await f.choose('custom'); await f.reviewClick('custom', 'start'); await f.reviewType('custom', 'a')
    assert.equal(activeTimers(f), 1)
    await f.draft('다음에 적용할 별도의 새 원고입니다')
    f.c.find(node => node.props['data-custom-language'] === 'ko').props.onClick(); await f.sync(); await f.locale('en')
    assert.equal(f.snapshot('custom'), snapshot); assert.equal(flat(f.custom('target')), target)
    assert.equal(f.reviewAttr('custom', 'input').props.value, 'a'); assert.equal(f.reviewAttr('custom', 'input').props.lang, 'en')
    await f.reviewType('custom', 'alpha'); assert.ok(has(f.customReview, 'data-typing-review-result'))
    assert.equal(bytes(f), originalBytes); assert.equal(f.writes.length, originalWrites)
    assert.equal(f.custom('draft').props.value, '다음에 적용할 별도의 새 원고입니다')
    assert.equal(f.custom('input').props.value, 'alpha beta gamma')
    assert.equal(activeTimers(f), 0)
  } finally { f.cleanup() }
})

await check('new original/custom application and workspace ABA cancel section owners before starting another timer', async () => {
  const f = await parentFixture()
  try {
    await completeWithCorrectedFirst(f)
    await f.choose('standard'); await f.reviewClick('standard', 'start'); await f.reviewType('standard', 'a')
    const oldInput = f.reviewAttr('standard', 'input').props, oldTimer = f.timers.at(-1).callback
    assert.equal(activeTimers(f), 1)
    await f.mode('custom'); assert.equal(activeTimers(f), 0)
    await f.draft('one two three'); await f.apply(); await f.customType('X'); await f.advance(700); await f.customType('one two three')
    await f.choose('custom'); await f.reviewClick('custom', 'start'); await f.reviewType('custom', 'o')
    assert.equal(activeTimers(f), 1)
    const oldCustom = f.reviewAttr('custom', 'input').props, originalTarget = flat(f.custom('target'))
    oldInput.onChange({ target: { value: 'old' }, nativeEvent: {} }); oldInput.onCompositionEnd({ currentTarget: { value: 'old' } }); oldTimer(); await f.sync()
    assert.equal(f.reviewAttr('custom', 'input').props.value, 'o'); assert.equal(activeTimers(f), 1)
    await f.draft('new document for applying'); await f.apply()
    assert.equal(activeTimers(f), 0); assert.equal(f.customReview, null)
    oldCustom.onChange({ target: { value: 'stale' }, nativeEvent: {} }); await f.sync()
    assert.equal(f.custom('input').props.value, ''); assert.notEqual(flat(f.custom('target')), originalTarget)
    await f.mode('short'); await f.input('a')
    assert.equal(activeTimers(f), 1); assert.equal(f.standardReview, null)
    oldInput.onChange({ target: { value: 'old' }, nativeEvent: {} }); oldTimer(); await f.sync()
    assert.equal(f.standard().props.value, 'a'); assert.equal(activeTimers(f), 1)
    const beforeUnmount = bytes(f)
    f.cleanup(); f.timers.forEach(timer => timer.callback())
    assert.equal(activeTimers(f), 0); assert.equal(bytes(f), beforeUnmount)
  } finally { f.cleanup() }
})

await check('custom IME transient alternatives and committed final prefix use the new ledger without altering old scoring', async () => {
  const f = await parentFixture()
  try {
    await f.mode('custom'); await f.draft('각'.repeat(10)); await f.apply()
    f.custom('input').props.onCompositionStart(); await f.customType('ㄴ', false)
    await f.customEnd('각'); await f.advance(1000)
    const final = '각'.repeat(9) + '가'
    f.custom('input').props.onCompositionStart(); await f.customType(final, true)
    assert.equal(f.customReview, null)
    await f.customEnd(final)
    const snapshot = f.snapshot('custom')
    assert.deepEqual(errors(snapshot), [9]); assert.equal(snapshot.target, '각'.repeat(10))
    const result = flat(f.custom('result')), immutable = JSON.stringify(snapshot)
    assert.ok(result.includes(f.messages.typingTest.custom.errors.replace('{count}', '2')), 'legacy mistake aggregate still includes transient first position')
    await f.customEnd('각'.repeat(10))
    assert.equal(JSON.stringify(f.snapshot('custom')), immutable); assert.equal(flat(f.custom('result')), result)
    assert.equal(f.writes.length, 0)
  } finally { f.cleanup() }
})

await check('review capture failure only disables review and retains standard commit/custom original result', async () => {
  const f = await parentFixture({ reviewPort: { ...review, captureTypingReview() { throw Error('controlled review unavailable') } } })
  try {
    await completeWithCorrectedFirst(f)
    assert.ok(has(f.p, 'data-typing-review-unavailable')); assert.equal(f.snapshot(), null)
    assert.equal(JSON.parse(f.stored.get(HISTORY_KEY)).length, 2); assert.ok(share(f).length)
    await f.mode('custom'); await f.draft('private source stays'); await f.apply()
    await f.customType('p'); await f.advance(1000); await f.customType('private source stays')
    assert.ok(has(f.c, 'data-custom-result')); assert.ok(has(f.c, 'data-typing-review-unavailable'))
    assert.equal(f.snapshot('custom'), null); assert.equal(f.custom('draft').props.value, 'private source stays')
    assert.equal(f.custom('input').props.value, 'private source stays')
    assert.equal(f.writes.filter(([key]) => key === HISTORY_KEY).length, 1)
  } finally { f.cleanup() }
})

assert.deepEqual(hashes(), before)
console.log(`Independent actual typing parents: ${count} groups PASS; old engine/probe unchanged; browser/real IME calls 0`)
