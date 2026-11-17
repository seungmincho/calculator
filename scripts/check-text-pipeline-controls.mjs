import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness, all } from '../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs'
import { createTextPipelineHistory as create, reduceTextPipelineHistory as reduce } from '../src/utils/textPipelineHistory.ts'
import { runPipeline } from '../src/utils/textConvert.ts'

const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const messages = language => merge(JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch21/translations-text-history.json', 'utf8'))[language])
function key(key, options = {}) {
  const event = { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, keyCode: 0, nativeEvent: { isComposing: false }, target: { closest: () => null }, prevented: 0, stopped: 0,
    preventDefault() { this.prevented++ }, stopPropagation() { this.stopped++ }, ...options }
  return event
}
async function fixture(initial, options = {}) {
  let current = initial, calls = 0
  const focused = [], queued = [], source = options.source ?? '가 \n가', fields = { find: '작성 중', replacement: '$1' }
  const onChange = next => { calls++; if (options.defer) queued.push(next); else { current = next; h.setProps(props()) } }
  const props = () => ({ history: current, errors: runPipeline(source, current.present).errors, onChange })
  const h = await componentHarness('src/components/TextPipelineHistoryControls.tsx', { props: props(), messages: options.language ? messages(options.language) : undefined })
  h.render()
  const section = () => h.find(node => node.props['data-text-pipeline-history'] === true)
  section().props.ref.current = { querySelector(selector) {
    const step = selector.match(/data-text-step-index="(\d+)"/), action = selector.match(/data-history-action="(\w+)"/)
    const node = h.all().find(item => step ? item.props['data-text-step-index'] === Number(step[1]) : item.props['data-history-action'] === action?.[1])
    if (!node) return null
    return { focus() { assert.equal(!!node.props.disabled, false, 'must not focus a disabled control'); focused.push(selector) } }
  } }
  return Object.assign(h, { focused, queued, source, fields, history: () => current, calls: () => calls,
    row(index) { return h.find(node => node.props['data-text-step-index'] === index) },
    rowButton(index, action) { return all(this.row(index)).find(node => node.props['data-step-action'] === action) },
    clickRow(index, action) { this.rowButton(index, action).props.onClick(); h.render() },
    clickHistory(action) { h.find(node => node.props['data-history-action'] === action).props.onClick(); h.render() },
    shortcut(event) { section().props.onKeyDown(event); h.render() },
    rowShortcut(index, event) { this.row(index).props.onKeyDown(event); h.render() },
    external(next) { current = next; h.setProps(props()) },
  })
}
let passed = 0
async function check(name, run) { await run(); passed++; console.log(`PASS ${name}`) }
await check('Korean/English UI uses actual translations and initial history availability', async () => {
  for (const language of ['ko', 'en']) {
    const h = await fixture(create([{ op: 'replace', find: '(', repl: 'x', regex: true, flags: 'i' }]), { language })
    const t = messages(language).textConverter
    assert.ok(h.text().includes(t.history.undo)); assert.ok(h.text().includes(t.errors.badRegex)); assert.ok(h.text().includes(t.history.urlNotice))
    for (const action of ['undo', 'redo']) assert.equal(h.find(node => node.props['data-history-action'] === action).props.disabled, true)
    for (const node of h.all().filter(node => node.type === 'button')) assert.match(node.props.className, /min-h-11/)
    h.cleanup()
  }
})
await check('duplicate operation kinds move by position with their options and focused row', async () => {
  const first = { op: 'affix', prefix: 'A', suffix: '1' }, second = { op: 'affix', prefix: 'B', suffix: '2' }
  const h = await fixture(create([first, second, first]))
  h.clickRow(1, 'down'); assert.deepEqual(structuredClone(h.history().present), [first, first, second]); assert.equal(h.focused.at(-1), '[data-text-step-index="2"]')
  assert.equal(h.rowButton(2, 'down').props.disabled, true); assert.match(h.text(), /history.moved/); h.cleanup()
})
await check('delete/reset undo and redo never focus a removed row and preserve source/form values', async () => {
  const original = [{ op: 'shuffle', seed: 17 }, { op: 'affix', prefix: '앞', suffix: '뒤' }, { op: 'upper' }], h = await fixture(create(original))
  h.clickRow(2, 'remove'); assert.equal(h.focused.at(-1), '[data-text-step-index="1"]')
  h.clickHistory('undo'); assert.deepEqual(structuredClone(h.history().present), original); assert.equal(h.focused.at(-1), '[data-history-action="redo"]')
  h.clickHistory('redo'); assert.equal(h.history().present.length, 2)
  h.clickHistory('reset'); assert.equal(h.history().present.length, 0); assert.equal(h.focused.at(-1), '[data-history-action="undo"]')
  h.clickHistory('undo'); assert.equal(h.history().present.length, 2); assert.equal(h.source, '가 \n가'); assert.deepEqual(h.fields, { find: '작성 중', replacement: '$1' }); h.cleanup()
})
await check('boundary or identical-step moves do not notify the parent or create announcements', async () => {
  const h = await fixture(create([{ op: 'upper' }, { op: 'upper' }]))
  h.clickRow(0, 'up'); h.clickRow(1, 'down'); h.clickRow(0, 'down')
  assert.equal(h.calls(), 0); assert.equal(h.focused.length, 0); assert.ok(!h.text().includes('history.moved')); h.cleanup()
})
await check('scoped keyboard undo/redo and Alt movement use the real reducer', async () => {
  const baseline = create([{ op: 'dedupe' }, { op: 'trimLines' }]), h = await fixture(baseline)
  const move = key('ArrowUp', { altKey: true }); h.rowShortcut(1, move); assert.equal(move.prevented, 1)
  assert.equal(runPipeline(h.source, h.history().present).text, '가')
  const undo = key('z', { ctrlKey: true }); h.shortcut(undo); assert.equal(undo.prevented, 1); assert.deepEqual(structuredClone(h.history().present), baseline.present)
  const redo = key('Z', { metaKey: true, shiftKey: true }); h.shortcut(redo); assert.equal(redo.prevented, 1)
  h.shortcut(key('z', { metaKey: true })); h.shortcut(key('y', { ctrlKey: true })); assert.equal(runPipeline(h.source, h.history().present).text, '가')
  const copy = key('Enter', { ctrlKey: true }); h.shortcut(copy); assert.equal(copy.prevented, 0); h.cleanup()
})
await check('editor targets and IME composition keep native shortcuts without any action', async () => {
  const h = await fixture(reduce(create([{ op: 'lower' }, { op: 'upper' }]), { type: 'add', step: { op: 'trimLines' } }))
  for (const ignored of [
    ...['input', 'textarea', 'select', 'contenteditable', 'plaintext-only'].map(tag => ({ target: { closest: selector => { assert.match(selector, /contenteditable/); return { tag } } } })),
    { nativeEvent: { isComposing: true } }, { keyCode: 229 },
  ]) {
    const undo = key('z', { ctrlKey: true, ...ignored }); h.shortcut(undo); assert.equal(undo.prevented, 0)
    const move = key('ArrowUp', { altKey: true, ...ignored }); h.rowShortcut(1, move); assert.equal(move.prevented, 0)
  }
  assert.equal(h.calls(), 0); h.cleanup()
})
await check('external replacement clears a delayed focus request for an obsolete list', async () => {
  const h = await fixture(create([{ op: 'upper' }, { op: 'lower' }]), { defer: true })
  h.clickRow(1, 'up'); assert.equal(h.queued.length, 1); assert.equal(h.focused.length, 0)
  h.external(create()); assert.equal(h.focused.length, 0); assert.equal(h.history().present.length, 0); h.cleanup()
})
await check('thirty-transition history counts remain visible and redo is discarded after new work', async () => {
  let history = create()
  for (let i = 0; i < 32; i++) history = reduce(history, { type: 'add', step: { op: 'shuffle', seed: i } })
  const h = await fixture(history); assert.ok(h.text().includes('"undo":30'))
  h.clickHistory('undo'); h.clickHistory('undo'); assert.equal(h.history().future.length, 2)
  h.external(reduce(h.history(), { type: 'add', step: { op: 'list', preset: 'json' } }))
  assert.equal(h.find(node => node.props['data-history-action'] === 'redo').props.disabled, true); assert.equal(h.history().future.length, 0); h.cleanup()
})
console.log(`Text pipeline controls: ${passed} groups passed (actual child/events, controlled parent and focus port; no browser layout assertion)`)
