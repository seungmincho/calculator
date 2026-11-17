import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fixture } from './typing-review-harness.mjs'
import { captureTypingReview } from '../../../src/utils/typingReview.ts'

let passed = 0
const test = async (name, run) => { if (process.argv[2] && !new RegExp(process.argv[2]).test(name)) return; await run(); passed++; console.log(`PASS ${name}`) }
const has = (f, name) => f.h.all().some(node => Object.hasOwn(node.props ?? {}, 'data-typing-review-' + name))

await test('explicit start and retry focus only; original snapshot and storage are untouched', async () => {
  const snapshot = captureTypingReview(1, ' alpha beta ', 'en', [0]), before = JSON.stringify(snapshot), f = await fixture(snapshot)
  try {
    assert.equal(f.io.focuses, 0); assert.equal(has(f, 'attempt'), false); assert.equal(f.attr('start').props.disabled, true)
    f.select(0); assert.equal(f.io.focuses, 0); assert.equal(f.attr('preview').props.children, ' alpha')
    f.click('start'); assert.equal(f.io.focuses, 1); assert.equal(f.attr('input').props.value, '')
    f.type('x'); assert.equal(f.timers.filter(timer => timer.active).length, 1); f.advance(1000); f.type(' alpha')
    assert.equal(has(f, 'result'), true); assert.equal(f.attr('input').props.disabled, true); assert.equal(f.timers.filter(timer => timer.active).length, 0)
    assert.ok(f.h.text().includes('83.3%')); assert.ok(!/WPM|타\/분/.test(f.h.text()))
    f.click('retry'); assert.equal(f.io.focuses, 2); assert.equal(has(f, 'result'), false)
    f.click('close'); assert.equal(has(f, 'attempt'), false); assert.equal(f.io.focuses, 2)
    assert.equal(JSON.stringify(snapshot), before); assert.equal(f.io.reads, 0); assert.equal(f.io.writes, 0)
  } finally { f.cleanup() }
})
await test('IME provisional alternatives and final prefix are handled exactly once', async () => {
  const f = await fixture(captureTypingReview(1, '강', 'ko', [0]))
  try {
    f.select(0); f.click('start'); f.attr('input').props.onCompositionStart()
    f.type('갖', false); assert.equal(has(f, 'result'), false)
    f.type('강', false); assert.equal(has(f, 'result'), false); f.advance(1000); f.end('강')
    assert.equal(has(f, 'result'), true); assert.ok(f.h.text().includes('100%')); assert.ok(f.h.text().includes('오타 위치 0개'))
    const completed = f.h.text(); f.end('가'); f.type('가'); assert.equal(f.h.text(), completed)
    f.click('retry'); f.attr('input').props.onCompositionStart(); f.type('가'); f.advance(1000); f.end('가')
    assert.equal(has(f, 'result'), true); assert.ok(f.h.text().includes('오타 위치 1개')); assert.ok(f.h.text().includes('정확도 0%'))
  } finally { f.cleanup() }
})
await test('20 candidates per page retain chosen and active exact sections without automatic replacement', async () => {
  const source = Array.from({ length: 42 }, () => 'word').join(' '), snapshot = captureTypingReview(1, source, 'en', Array.from({ length: 42 }, (_, i) => i * 5)), f = await fixture(snapshot)
  try {
    assert.equal(f.h.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-typing-review-fragment')).length, 20)
    f.select(0); f.click('start'); f.type('w'); const target = f.h.find(node => Object.hasOwn(node.props ?? {}, 'data-typing-review-target'))
    f.click('next'); f.select(20); assert.equal(f.attr('input').props.value, 'w'); assert.deepEqual(f.h.find(node => Object.hasOwn(node.props ?? {}, 'data-typing-review-target')).props.children, target.props.children)
    f.click('next'); assert.equal(f.h.all().filter(node => Object.hasOwn(node.props ?? {}, 'data-typing-review-fragment')).length, 2)
    f.click('prev'); assert.equal(f.h.find(node => node.type === 'input' && node.props.value === snapshot.fragments[20].id).props.checked, true)
    f.click('start'); assert.equal(f.attr('input').props.value, ''); assert.equal(f.timers.filter(timer => timer.active).length, 0)
    assert.equal(f.io.focuses, 2)
  } finally { f.cleanup() }
})
await test('one and 1000 codepoints accepted, too long and empty candidates stay explicit in KO and EN', async () => {
  for (const locale of ['ko', 'en']) {
    for (const length of [1, 1000, 1001]) {
      const f = await fixture(captureTypingReview(1, '😀'.repeat(length), 'en', [0]), { locale })
      try {
        f.select(0); assert.equal(f.attr('preview').props.children, '😀'.repeat(length)); assert.equal(f.attr('start').props.disabled, length === 1001)
        if (length <= 1000) { f.click('start'); assert.equal(f.attr('input').props.maxLength, length * 2); f.type('😀'.repeat(length)); assert.equal(has(f, 'result'), true) }
        else assert.equal(has(f, 'attempt'), false)
      } finally { f.cleanup() }
    }
    const empty = await fixture(captureTypingReview(1, 'No mistakes', 'en', []), { locale })
    try { assert.equal(has(empty, 'empty'), true); assert.equal(has(empty, 'start'), false); assert.equal(empty.io.focuses, 0) } finally { empty.cleanup() }
  }
})
await test('new origin, active switch, retry and unmount reject old input, timer and close handlers', async () => {
  const one = captureTypingReview(1, 'alpha beta', 'en', [0]), f = await fixture(one)
  try {
    f.select(0); f.click('start'); f.type('a'); const oldInput = f.attr('input').props, oldClose = f.attr('close').props.onClick, oldTick = f.timers.at(-1).callback
    f.attr('retry').props.onClick(); oldInput.onCompositionEnd({ currentTarget: { value: 'alpha' } }); f.h.render()
    assert.equal(f.attr('input').props.value, ''); assert.equal(has(f, 'result'), false)
    const two = captureTypingReview(1, 'other words', 'en', [6]); f.setProps({ snapshot: two })
    assert.equal(has(f, 'attempt'), false); oldClose(); oldTick(); oldInput.onChange({ target: { value: 'alpha' }, nativeEvent: {} }); f.h.render()
    assert.equal(has(f, 'attempt'), false); f.select(0); f.click('start'); f.type('w')
    const newest = f.attr('input').props; f.setProps({ active: false }); assert.equal(f.h.text(), ''); assert.equal(f.timers.filter(timer => timer.active).length, 0)
    newest.onCompositionEnd({ currentTarget: { value: 'words' } }); f.setProps({ active: true }); assert.equal(has(f, 'attempt'), false)
    f.select(0); f.click('start'); f.type('w'); const unmounted = f.attr('input').props; f.cleanup(); unmounted.onCompositionEnd({ currentTarget: { value: 'words' } }); oldTick()
    assert.equal(f.timers.filter(timer => timer.active).length, 0); assert.equal(f.io.writes, 0)
  } finally { f.cleanup() }
})
await test('locale preserves attempt; IME 229 is untouched; paste/drop blocked and normal Escape closes', async () => {
  const f = await fixture(captureTypingReview(1, 'alpha beta', 'en', [0]))
  try {
    f.select(0); f.io.focusThrows = true; f.click('start'); f.type('a'); const focuses = f.io.focuses
    f.locale('en'); assert.equal(f.attr('input').props.value, 'a'); assert.equal(f.io.focuses, focuses)
    const input = f.attr('input').props; let prevented = 0
    input.onPaste({ preventDefault() { prevented++ } }); input.onDrop({ preventDefault() { prevented++ } })
    for (const inputType of ['insertFromPaste', 'insertFromDrop', 'insertText']) input.onBeforeInput({ nativeEvent: { inputType }, preventDefault() { prevented++ } })
    assert.equal(prevented, 4)
    input.onKeyDown({ nativeEvent: { isComposing: true }, key: 'Escape', keyCode: 27 }); f.h.render(); assert.equal(has(f, 'attempt'), true)
    input.onKeyDown({ nativeEvent: {}, key: 'Escape', keyCode: 229 }); f.h.render(); assert.equal(has(f, 'attempt'), true)
    input.onCompositionStart()
    input.onKeyDown({ nativeEvent: { isComposing: false }, key: 'Enter', keyCode: 13, preventDefault() { prevented++ } }); assert.equal(prevented, 4)
    input.onKeyDown({ nativeEvent: { isComposing: false }, key: 'Escape', keyCode: 27 }); f.h.render(); assert.equal(has(f, 'attempt'), true)
    f.end('al')
    input.onKeyDown({ nativeEvent: {}, key: 'Enter', keyCode: 13, preventDefault() { prevented++ } }); assert.equal(prevented, 5)
    input.onKeyDown({ nativeEvent: {}, key: 'Escape', keyCode: 27 }); f.h.render(); assert.equal(has(f, 'attempt'), false)
    assert.equal(f.io.writes, 0); assert.equal(f.io.reads, 0)
    for (const path of ['src/components/TypingTest.tsx', 'src/components/CustomTypingWorkspace.tsx']) assert.ok(fs.readFileSync(path, 'utf8').includes('TypingMistakePractice'))
    assert.deepEqual(Object.keys(f.translations.ko.typingTest.review).sort(), Object.keys(f.translations.en.typingTest.review).sort())
  } finally { f.cleanup() }
})
console.log(`Typing review child: ${passed} groups`)
