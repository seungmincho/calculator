import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import * as review from '../../../src/utils/typingReview.ts'

const { collectTypingReviewErrors, captureTypingReview, createTypingReviewAttempt, updateTypingReviewAttempt } = review
const files = ['src/components/TypingTest.tsx', 'src/components/CustomTypingWorkspace.tsx', 'src/utils/customTyping.ts', 'src/utils/typingTest.ts', 'docs/verify/2026-11-17-repeat-batch54/existing-typing-observations.json']
const hashes = () => Object.fromEntries(files.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const before = hashes()
const checks = []
async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name) }

await check('independent committed ledger excludes transient IME and untyped suffix but keeps corrected real errors', () => {
  const target = '각🙂 beta 끝'
  let observed = []
  const events = [['가', true], ['가', false], ['각', false], ['각X', true], ['각🙂 ', false], ['각🙂 z', false], ['각🙂 beta', false], ['각🙂 beta ㄲ', true]]
  const expected = [[], [0], [0], [0], [0], [0, 3], [0, 3], [0, 3]]
  events.forEach(([text, composing], i) => {
    const previous = observed
    observed = collectTypingReviewErrors(previous, target, text, composing)
    assert.deepEqual(observed, expected[i]); assert.ok(Object.isFrozen(observed))
    if (i) assert.deepEqual(previous, expected[i - 1])
  })
  const snapshot = captureTypingReview(1, target, 'ko', observed)
  assert.deepEqual(snapshot.errors, [0, 3]); assert.equal(snapshot.errors.includes(8), false)
  // Independent position ledger for ordinary text, including shorter input after correction.
  let ledger = [], model = new Set()
  for (const text of ['X', 'alX', 'alpha bX', 'a', 'alpha beta gamma', 'alpha beta gamm!']) {
    ;[...text].slice(0, 16).forEach((char, i) => { if (char !== [...'alpha beta gamma'][i]) model.add(i) })
    ledger = collectTypingReviewErrors(ledger, 'alpha beta gamma', text, false)
    assert.deepEqual(ledger, [...model].sort((a, b) => a - b))
  }
})

function tokenOracle(target, indices) {
  const chars = [...target]
  const words = [...target.matchAll(/\S+/gu)].map(match => ({ start: [...target.slice(0, match.index)].length, end: [...target.slice(0, match.index + match[0].length)].length }))
  const ranges = indices.map(index => {
    const word = words.find(word => word.start <= index && index < word.end)
    if (word) return { ...word }
    const left = words.filter(word => word.end <= index).at(-1), right = words.find(word => word.start > index)
    return { start: left?.start ?? 0, end: right?.end ?? chars.length }
  }).sort((a, b) => a.start - b.start || a.end - b.end)
  // Build overlap connected components by pair intersections, independently of the product sweep.
  const components = []
  while (ranges.length) {
    const group = [ranges.shift()]
    for (let changed = true; changed;) {
      changed = false
      for (let i = ranges.length - 1; i >= 0; i--) if (group.some(member => member.start < ranges[i].end && ranges[i].start < member.end)) { group.push(ranges.splice(i, 1)[0]); changed = true }
    }
    const start = Math.min(...group.map(item => item.start)), end = Math.max(...group.map(item => item.end))
    components.push({ start, end, text: chars.slice(start, end).join('') })
  }
  return components.sort((a, b) => a.start - b.start)
}

await check('code-point token graph oracle keeps repeated words separate and joins only actual overlap', () => {
  const target = ' aa🙂  bb\tcc aa🙂 ', candidates = [0, 2, 5, 7, 9, 12]
  for (let mask = 0; mask < 64; mask++) {
    const errors = candidates.filter((_, i) => mask & (1 << i))
    const snapshot = captureTypingReview(mask + 2, target, 'en', errors)
    assert.deepEqual(snapshot.fragments.map(({ start, end, text }) => ({ start, end, text })), tokenOracle(target, errors))
    assert.equal(snapshot.fragments.flatMap(fragment => fragment.errors).length, errors.length)
    for (const fragment of snapshot.fragments) assert.equal(fragment.text, [...snapshot.target].slice(fragment.start, fragment.end).join(''))
  }
  const repeated = captureTypingReview(100, 'same same same', 'en', [0, 5, 10])
  assert.equal(repeated.fragments.length, 3); assert.equal(new Set(repeated.fragments.map(item => item.id)).size, 3)
  const exact = captureTypingReview(101, '🙂a\u00a0\u00a0b! e\u0301', 'en', [2])
  assert.deepEqual(exact.fragments.map(item => item.text), ['🙂a\u00a0\u00a0b!'])
})

await check('immutable snapshots, invalid indices/brands and exact 1/1000/1001/10000 boundaries', () => {
  const indices = [2, 0, 2], snapshot = captureTypingReview(200, 'one two', 'en', indices)
  indices.splice(0, 3, 6)
  assert.deepEqual(snapshot.errors, [0, 2]); assert.ok(Object.isFrozen(snapshot.fragments[0].errors))
  assert.throws(() => { snapshot.fragments[0].text = 'changed' }, TypeError)
  assert.throws(() => createTypingReviewAttempt({ ...snapshot }, snapshot.fragments[0].id), error => error.code === 'invalidSnapshot')
  assert.throws(() => createTypingReviewAttempt(snapshot, 'another-id'), error => error.code === 'fragmentMissing')
  for (const errors of [[-1], [7], [.5], [NaN], [Infinity]]) assert.throws(() => captureTypingReview(201, 'one two', 'en', errors), error => error.code === 'invalidIndex')
  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => captureTypingReview(id, 'a', 'en', [0]), error => error.code === 'invalidId')
  for (const size of [1, 1000, 1001, 10000]) {
    const text = '🙂'.repeat(size), value = captureTypingReview(size + 300, text, 'en', [0])
    assert.equal(value.fragments[0].text, text)
    if (size <= 1000) assert.equal(createTypingReviewAttempt(value, value.fragments[0].id).target, text)
    else assert.throws(() => createTypingReviewAttempt(value, value.fragments[0].id), error => error.code === 'fragmentTooLong')
  }
  assert.throws(() => captureTypingReview(1, '🙂'.repeat(10001), 'en', [0]), error => error.code === 'invalidSource')
})

await check('separate attempt permits short incorrect completion and excludes temporary composition mistakes', () => {
  const snapshot = captureTypingReview(500, '각', 'ko', [0]), fresh = () => createTypingReviewAttempt(snapshot, snapshot.fragments[0].id)
  let attempt = fresh()
  attempt = updateTypingReviewAttempt(attempt, 'ㄴ', true, 100)
  assert.equal(attempt.result, null); assert.deepEqual(attempt.mistakes, {})
  attempt = updateTypingReviewAttempt(attempt, '각', false, 1100)
  assert.equal(attempt.result.accuracy, 100); assert.equal(attempt.result.errors, 0)
  const committed = updateTypingReviewAttempt(fresh(), '가', false, 100)
  assert.equal(committed.result.accuracy, 0); assert.equal(committed.result.errors, 1)
  assert.equal(updateTypingReviewAttempt(committed, '각', false, 9999), committed)
  assert.equal(fresh().target, '각'); assert.deepEqual(snapshot.errors, [0])
})

assert.deepEqual(hashes(), before)
console.log(`Independent typing review preparation: ${checks.length} pure groups PASS; existing parents/engines/probe unchanged`)
