import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { captureTypingReview } from '../../../src/utils/typingReview.ts'
import { fixture } from './typing-review-harness.mjs'

// Only the author's controlled I/O host is reused; expectations and event sequences below are independent.
const files = ['src/components/TypingTest.tsx', 'src/components/CustomTypingWorkspace.tsx', 'src/utils/customTyping.ts', 'src/utils/typingTest.ts', 'docs/verify/2026-11-17-repeat-batch54/existing-typing-observations.json']
const hashes = () => Object.fromEntries(files.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const before = hashes()
const flat = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node ? '' : Array.isArray(node) ? node.map(flat).join('') : flat(node.props?.children)
const visible = (f, key) => f.h.all().filter(node => Object.hasOwn(node.props, `data-typing-review-${key}`))
const currentTimers = f => f.timers.filter(timer => timer.active).length
const resultText = f => flat(f.attr('result'))
const keyEvent = (key, nativeComposing = false, keyCode = 0) => {
  const event = { key, nativeEvent: { isComposing: nativeComposing }, keyCode, prevented: 0, preventDefault() { event.prevented++ } }
  return event
}
let count = 0
async function check(name, run) { await run(); count++; console.log('PASS ' + name) }

await check('actual candidate pagination, exact fragment start and full overlimit preview never silently truncate', async () => {
  const words = Array.from({ length: 24 }, (_, i) => `word${i}`)
  let position = 0
  const errors = words.map(word => { const start = position; position += word.length + 1; return start })
  const snapshot = captureTypingReview(1001, words.join(' '), 'en', errors)
  const f = await fixture(snapshot)
  try {
    assert.equal(visible(f, 'fragment').length, 20); assert.equal(f.io.focuses, 0)
    f.click('next'); assert.equal(visible(f, 'fragment').length, 4)
    f.select(22); assert.equal(flat(f.attr('preview')), 'word22'); assert.equal(f.io.focuses, 0)
    f.click('start'); assert.equal(flat(f.attr('target')), 'word22'); assert.equal(f.io.focuses, 1)
    f.type('w'); assert.equal(currentTimers(f), 1)
    f.click('prev'); f.select(0)
    assert.equal(flat(f.attr('target')), 'word22', 'choosing only does not replace active practice')
    f.click('start'); assert.equal(flat(f.attr('target')), 'word0'); assert.equal(f.io.focuses, 2)
    assert.equal(currentTimers(f), 0)
    f.type('w'); assert.equal(currentTimers(f), 1)
    const huge = captureTypingReview(1002, '🙂'.repeat(1001), 'en', [0])
    f.setProps({ snapshot: huge }); f.select(0)
    assert.equal([...flat(f.attr('preview'))].length, 1001)
    assert.equal(f.attr('start').props.disabled, true); assert.equal(visible(f, 'attempt').length, 0)
    assert.equal(currentTimers(f), 0); assert.equal(f.io.focuses, 2)
    assert.equal(f.io.reads + f.io.writes, 0)
  } finally { f.cleanup() }
})

await check('actual IME ref protects native-false Enter/Escape and exact commit controls error result', async () => {
  const snapshot = captureTypingReview(1101, '각', 'ko', [0]), f = await fixture(snapshot)
  try {
    f.select(0); f.click('start')
    f.attr('input').props.onCompositionStart()
    f.type('ㄴ', false)
    const enter = keyEvent('Enter'), escape = keyEvent('Escape')
    f.attr('input').props.onKeyDown(enter); f.attr('input').props.onKeyDown(escape); f.h.render()
    assert.equal(enter.prevented, 0); assert.equal(escape.prevented, 0)
    assert.equal(f.attr('input').props.value, 'ㄴ'); assert.equal(visible(f, 'result').length, 0)
    f.advance(750); f.end('각')
    assert.ok(resultText(f).includes('100%')); assert.ok(resultText(f).includes('0개'))
    assert.equal(currentTimers(f), 0)
    const finishedText = resultText(f)
    f.end('가'); assert.equal(resultText(f), finishedText, 'duplicate late compositionend cannot finish twice')
    f.click('retry'); f.type('가', false)
    assert.ok(resultText(f).includes('0%')); assert.ok(resultText(f).includes('1개'))
    f.click('retry')
    for (const event of [keyEvent('Escape', true), keyEvent('Escape', false, 229), keyEvent('Enter', true)]) {
      f.attr('input').props.onKeyDown(event); f.h.render(); assert.equal(event.prevented, 0); assert.equal(visible(f, 'attempt').length, 1)
    }
    const normalEnter = keyEvent('Enter'); f.attr('input').props.onKeyDown(normalEnter); assert.equal(normalEnter.prevented, 1)
    f.attr('input').props.onKeyDown(keyEvent('Escape')); f.h.render(); assert.equal(visible(f, 'attempt').length, 0)
  } finally { f.cleanup() }
})

await check('paste/drop prevention, source/run ABA and late input/timer callbacks preserve current selection and resources', async () => {
  const a = captureTypingReview(1201, 'aa bb', 'en', [0, 3]), b = captureTypingReview(1202, 'cc dd', 'en', [0])
  const f = await fixture(a)
  try {
    f.h.replayEffects(); assert.equal(f.io.focuses, 0)
    f.select(0); const oldStart = f.attr('start').props.onClick; f.click('start')
    const oldInput = f.attr('input').props
    f.type('x'); const oldTimer = f.timers.at(-1).callback
    let prevented = 0
    const event = type => ({ nativeEvent: { inputType: type }, preventDefault() { prevented++ } })
    oldInput.onPaste(event()); oldInput.onDrop(event()); oldInput.onBeforeInput(event('insertFromPaste')); oldInput.onBeforeInput(event('insertFromDrop'))
    oldInput.onBeforeInput(event('insertText')); assert.equal(prevented, 4)
    f.click('retry'); const focuses = f.io.focuses
    oldInput.onChange({ target: { value: 'zz' }, nativeEvent: {} }); oldInput.onCompositionEnd({ currentTarget: { value: 'zz' } }); oldTimer(); f.h.render()
    assert.equal(f.attr('input').props.value, ''); assert.equal(visible(f, 'result').length, 0); assert.equal(f.io.focuses, focuses)
    f.setProps({ snapshot: b }); f.setProps({ snapshot: a })
    oldStart(); oldInput.onChange({ target: { value: 'zz' }, nativeEvent: {} }); f.h.render()
    assert.equal(visible(f, 'attempt').length, 0); assert.equal(currentTimers(f), 0)
    f.select(1); f.click('start'); f.type('b'); assert.equal(currentTimers(f), 1)
    const finalInput = f.attr('input').props, finalTimer = f.timers.at(-1).callback
    f.setProps({ active: false }); assert.equal(currentTimers(f), 0)
    finalInput.onChange({ target: { value: 'bb' }, nativeEvent: {} }); finalTimer(); f.h.render()
    f.setProps({ active: true }); assert.equal(visible(f, 'attempt').length, 0)
    f.cleanup(); finalTimer(); oldStart()
    assert.equal(currentTimers(f), 0); assert.equal(f.io.reads + f.io.writes, 0)
  } finally { f.cleanup() }
})

await check('locale only changes labels, exact whitespace/emoji target and input survive with no automatic focus or records', async () => {
  const target = 'a🙂\u00a0 b!', snapshot = captureTypingReview(1301, target, 'en', [2]), f = await fixture(snapshot)
  try {
    f.select(0); f.click('start')
    assert.equal(flat(f.attr('target')), target)
    f.type('a🙂'); const focus = f.io.focuses, timerCount = currentTimers(f)
    const committedHandler = f.attr('input').props.onChange
    f.locale('en')
    assert.equal(flat(f.attr('target')), target); assert.equal(f.attr('input').props.lang, 'en')
    assert.equal(f.attr('input').props.value, 'a🙂'); assert.equal(f.io.focuses, focus); assert.equal(currentTimers(f), timerCount)
    f.io.now += 1000
    committedHandler({ target: { value: target }, nativeEvent: { isComposing: false } }); f.h.render()
    assert.ok(resultText(f).includes('Accuracy 100%')); assert.equal(currentTimers(f), 0)
    f.locale('ko'); assert.equal(flat(f.attr('target')), target); assert.equal(f.io.focuses, focus)
    assert.equal(f.io.reads, 0); assert.equal(f.io.writes, 0)
    assert.equal(new URL(f.h.window.location.href).search, '')
    assert.equal(f.h.all().some(node => node.type === 'ShareResult'), false)
    assert.equal(f.h.text().includes('WPM'), false)
  } finally { f.cleanup() }
})

assert.deepEqual(hashes(), before)
console.log(`Independent typing review child: ${count} groups PASS; existing parents/engines/probe unchanged; native input/Chrome 0`)
