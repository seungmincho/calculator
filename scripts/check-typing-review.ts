import assert from 'node:assert/strict'
import { captureTypingReview, collectTypingReviewErrors, createTypingReviewAttempt, updateTypingReviewAttempt, TypingReviewError } from '../src/utils/typingReview.ts'
import { createCustomTypingAttempt } from '../src/utils/customTyping.ts'

let passed = 0
const check = (name: string, run: () => void) => { run(); passed++; console.log(`PASS ${name}`) }
const code = (value: string) => (error: unknown) => error instanceof TypingReviewError && error.code === value

check('committed errors retain corrected positions and exclude pending suffix or IME alternatives', () => {
  let errors = collectTypingReviewErrors([], 'alpha beta', 'xl', false)
  assert.deepEqual(errors, [0]); assert.deepEqual(collectTypingReviewErrors(errors, 'alpha beta', 'alpha beta', false), [0])
  assert.deepEqual(collectTypingReviewErrors([], '강 나', '갖', true), [])
  assert.deepEqual(collectTypingReviewErrors([], '강 나', '가', false), [0])
  assert.deepEqual(collectTypingReviewErrors([], 'alpha beta', 'alpha', false), [])
  errors = collectTypingReviewErrors(errors, 'alpha beta', 'alpha X', false)
  assert.deepEqual(errors, [0, 6]); assert.ok(Object.isFrozen(errors))
})
check('word positions stay separate; overlapping whitespace context merges without rewriting text', () => {
  const repeated = captureTypingReview(1, 'same same', 'en', [0, 5])
  assert.deepEqual(repeated.fragments.map(item => [item.start, item.end, item.text]), [[0, 4, 'same'], [5, 9, 'same']])
  const combined = captureTypingReview(2, 'aa  bb\tcc', 'en', [0, 2, 3, 4])
  assert.equal(combined.fragments.length, 1); assert.equal(combined.fragments[0].text, 'aa  bb'); assert.deepEqual(combined.fragments[0].errors, [0, 2, 3, 4])
  assert.equal(captureTypingReview(3, ' aa ', 'en', [0]).fragments[0].text, ' aa')
  assert.equal(captureTypingReview(4, 'aa ', 'en', [2]).fragments[0].text, 'aa ')
})
check('codepoint slices preserve emoji, jamo, NBSP and original offsets', () => {
  const source = '😀가 ㄱ\u00a0나!', snapshot = captureTypingReview(1, source, 'ko', [0, 4])
  assert.deepEqual(snapshot.fragments.map(item => [item.start, item.end, item.text]), [[0, 2, '😀가'], [3, 7, 'ㄱ\u00a0나!']])
  for (const item of snapshot.fragments) assert.equal(item.text, [...source].slice(item.start, item.end).join(''))
})
check('strict source, index and factory ownership boundaries', () => {
  for (const invalid of [-1, 1.1, NaN, Infinity, 3]) assert.throws(() => captureTypingReview(1, 'abc', 'en', [invalid]), code('invalidIndex'))
  assert.throws(() => captureTypingReview(0, 'abc', 'en', []), code('invalidId'))
  assert.throws(() => captureTypingReview(1, '', 'en', []), code('invalidSource'))
  const source = '😀'.repeat(10_000), snapshot = captureTypingReview(1, source, 'ko', [])
  assert.equal(snapshot.target, source); assert.equal(snapshot.fragments.length, 0)
  assert.throws(() => captureTypingReview(1, source + 'a', 'ko', []), code('invalidSource'))
  assert.throws(() => createTypingReviewAttempt({ ...snapshot }, 'no'), code('invalidSnapshot'))
  assert.throws(() => createTypingReviewAttempt(snapshot, 'no'), code('fragmentMissing'))
})
check('1 and 1000 exact codepoint snippets work without altering original custom minimum', () => {
  for (const n of [1, 1000]) {
    const source = '😀'.repeat(n), snapshot = captureTypingReview(n, source, 'ko', [0])
    assert.equal(createTypingReviewAttempt(snapshot, snapshot.fragments[0].id).target, source)
  }
  const long = captureTypingReview(1, 'a'.repeat(1001), 'en', [0])
  assert.equal(long.fragments[0].text.length, 1001); assert.throws(() => createTypingReviewAttempt(long, long.fragments[0].id), code('fragmentTooLong'))
  assert.throws(() => createCustomTypingAttempt('a', 'en'))
})
check('immutable source and per-origin fragments; input collection is bounded to actual target', () => {
  const errors = [1, 0], snapshot = captureTypingReview(1, 'ab cd', 'en', errors)
  errors[0] = 4
  assert.deepEqual(snapshot.errors, [0, 1]); assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.fragments) && Object.isFrozen(snapshot.fragments[0]) && Object.isFrozen(snapshot.fragments[0].errors))
  const other = captureTypingReview(2, 'ab cd', 'en', [0]); assert.notEqual(snapshot.fragments[0].id, other.fragments[0].id)
  assert.throws(() => createTypingReviewAttempt(other, snapshot.fragments[0].id), code('fragmentMissing'))
  assert.deepEqual(collectTypingReviewErrors([], 'abc', 'abc' + 'x'.repeat(20000), false), [])
})
check('review IME intermediate errors never enter history; confirmed prefix completes only once', () => {
  const snapshot = captureTypingReview(1, '강', 'ko', [0]); let attempt = createTypingReviewAttempt(snapshot, snapshot.fragments[0].id)
  attempt = updateTypingReviewAttempt(attempt, '갖', true, 1000); assert.deepEqual(attempt.mistakes, {}); assert.equal(attempt.result, null)
  attempt = updateTypingReviewAttempt(attempt, '강', true, 1200); assert.equal(attempt.result, null)
  attempt = updateTypingReviewAttempt(attempt, '강', false, 1500); assert.equal(attempt.result?.errors, 0); assert.equal(attempt.result?.accuracy, 100)
  assert.equal(updateTypingReviewAttempt(attempt, '가', false, 2000), attempt)
  let wrong = createTypingReviewAttempt(snapshot, snapshot.fragments[0].id)
  wrong = updateTypingReviewAttempt(wrong, '가', true, 1000); wrong = updateTypingReviewAttempt(wrong, '가', false, 2000)
  assert.equal(wrong.result?.errors, 1); assert.equal(wrong.result?.accuracy, 0)
})
check('review exact whitespace and correction retain original targets and committed errors', () => {
  const snapshot = captureTypingReview(1, ' a ', 'en', [0, 2]); let attempt = createTypingReviewAttempt(snapshot, snapshot.fragments[0].id)
  assert.equal(attempt.target, ' a '); attempt = updateTypingReviewAttempt(attempt, 'x', false, 1000)
  attempt = updateTypingReviewAttempt(attempt, ' a ', false, 3000)
  assert.equal(attempt.result?.errors, 1); assert.equal(attempt.result?.accuracy, 66.7); assert.equal(snapshot.target, ' a ')
})
console.log(`Typing review domain: ${passed} groups`)
