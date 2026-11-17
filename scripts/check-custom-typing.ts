import assert from 'node:assert/strict'
import { prepareCustomTypingText as prepare, createCustomTypingAttempt as create, updateCustomTypingAttempt as update, customTypingStatuses } from '../src/utils/customTyping.ts'
import { copyTypingSummary } from '../src/utils/typingClipboard.ts'
import { accuracy, correctKeystrokes, perMinute, wpm } from '../src/utils/typingTest.ts'

let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log(`PASS ${name}`) }
await check('10–1000 code point boundaries reject without truncating and count emoji once', () => {
  for (const [count, error] of [[9, 'tooShort'], [10, null], [1000, null], [1001, 'tooLong']] as const) {
    const value = '😀'.repeat(count), preview = prepare(value)
    assert.equal(preview.count, count); assert.equal(preview.error, error); assert.equal(preview.text, value)
    if (error) assert.throws(() => create(value, 'en')); else assert.equal(create(value, 'en').target, value)
  }
})
await check('Declared newline/tab/space normalization preserves the original draft and other characters', () => {
  const draft = '  가나다\r\n라마\r바\n사\t아  자차  ', original = draft
  const preview = prepare(draft)
  assert.equal(preview.text, '가나다 라마 바 사 아 자차'); assert.equal(preview.changed, true); assert.equal(draft, original)
  const other = 'ab\u00a0cd\u200befghij'
  assert.equal(prepare(other).text, other); assert.equal(prepare(' \r\n\t ').error, 'tooShort')
})
await check('Explicit commitment waits for a full matching Korean composition and finishes once', () => {
  const target = '가나다라마바사아자차'
  let attempt = update(create(target, 'ko'), 'ㄱ', true, 100)
  assert.equal(attempt.startedAt, 100); assert.equal(attempt.result, null)
  attempt = update(attempt, target, true, 1000); assert.equal(attempt.result, null)
  attempt = update(attempt, target, false, 1100)
  assert.equal(attempt.result?.ms, 1000); assert.equal(attempt.result?.accuracy, 100)
  assert.equal(attempt.result?.keys, correctKeystrokes(target, target))
  assert.equal(update(attempt, target, false, 1200), attempt)
})
await check('Committed Hangul prefix error is not left composing forever', () => {
  const target = '가나다라마바사아자각', wrong = '가나다라마바사아자가'
  let attempt = update(create(target, 'ko'), wrong, true, 10)
  assert.equal(attempt.result, null); assert.equal(customTypingStatuses(target, wrong, true).at(-1), 'composing')
  attempt = update(attempt, wrong, false, 1010)
  assert.equal(attempt.result?.errors, 1); assert.equal(attempt.result?.accuracy, 90)
  assert.deepEqual(attempt.result?.missed, [['ㄱ', 1]])
})
await check('English speed, Unicode positions and timing reuse existing metrics', () => {
  const target = 'abcdefghij'
  const attempt = update(update(create(target, 'en'), 'a', false, 20), target, false, 60020)
  assert.equal(attempt.result?.speed, wpm(10, 60000)); assert.equal(attempt.result?.keys, 10)
  const korean = update(update(create('가'.repeat(10), 'ko'), '가', false, 0), '가'.repeat(10), false, 60000)
  assert.equal(korean.result?.speed, perMinute(20, 60000))
  const emoji = update(update(create('😀'.repeat(10), 'en'), '😀', false, 0), '😀'.repeat(10), false, 1000)
  assert.equal(emoji.result?.accuracy, 100); assert.equal(emoji.result?.keys, 10)
})
await check('Correcting an error keeps its first mistaken position and does not mutate earlier snapshots', () => {
  const initial = create('abcdefghij', 'en')
  const wrong = update(initial, 'x', false, 0)
  const corrected = update(wrong, 'a', false, 100)
  const done = update(corrected, 'abcdefghij', false, 1000)
  assert.deepEqual(initial.mistakes, {}); assert.deepEqual(wrong.mistakes, { 0: 'x' })
  assert.equal(done.result?.accuracy, accuracy(10, 1)); assert.equal(done.result?.errors, 1)
  assert.equal(initial.typed, ''); assert.equal(wrong.typed, 'x')
})
await check('An empty input never starts time; invalid time and already completed updates are ignored', () => {
  const initial = create('abcdefghij', 'en')
  assert.equal(update(initial, '', false, 1).startedAt, null)
  assert.equal(update(initial, 'a', false, Number.NaN), initial)
  const first = update(initial, 'a', false, 0)
  assert.equal(update(first, '', false, 10).startedAt, 0)
})
await check('Clipboard rejects false/throw fallback and accepts only actual successful operations', async () => {
  for (const result of [false, true]) assert.equal(await copyTypingSummary('summary', () => true, { fallback: () => result }), result ? 'copied' : 'failed')
  assert.equal(await copyTypingSummary('summary', () => true, { writeText: async () => { throw Error('denied') }, fallback: () => { throw Error('blocked') } }), 'failed')
  assert.equal(await copyTypingSummary('summary', () => true, { writeText: async () => {}, fallback: () => { throw Error('must not run') } }), 'copied')
})
await check('Stale clipboard completions neither show success nor attempt a fallback', async () => {
  for (const reject of [false, true]) {
    let current = true, settle: () => void = () => {}, fallback = 0
    const task = copyTypingSummary('summary', () => current, { writeText: () => new Promise((resolve, failure) => { settle = () => reject ? failure(Error('late')) : resolve() }), fallback: () => { fallback++; return true } })
    current = false; settle(); assert.equal(await task, 'stale'); assert.equal(fallback, 0)
  }
})
console.log(`Custom typing domain: ${groups} groups passed`)
