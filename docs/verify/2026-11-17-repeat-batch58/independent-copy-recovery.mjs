import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const childPath = 'src/components/OcrCopyRecovery.tsx'
const parentPath = 'src/components/ImageOcr.tsx'
const hash = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const initial = { child: hash(childPath), parent: hash(parentPath) }
assert.equal(fs.readFileSync(parentPath, 'utf8').includes('OcrCopyRecovery'), false, 'parent integration is outside this preparation check')
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch58/translations-ocr-output.json', 'utf8'))
const has = (node, name) => Object.hasOwn(node.props ?? {}, name)
const flat = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node ? '' : Array.isArray(node) ? node.map(flat).join('') : flat(node.props?.children)
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS ' + name) }

async function fixture(text = '한글\n🙂\t  second line', label = '독립 결과') {
  const messages = structuredClone(fragment.ko), calls = [], outputs = [], stored = []
  let failure = Object.freeze({ text, label }), active = failure, alive = true, fieldPresent = true, phase = () => {}
  const field = {
    focus(options) { calls.push(['focus', options.preventScroll]); phase('focus') },
    select() { calls.push(['select']); phase('select') },
    setSelectionRange(start, end) { calls.push(['range', start, end]); phase('range') },
  }
  const props = () => ({ failure, isCurrent: value => alive && active === value, onRetry: value => outputs.push(['retry', value]), onClose: value => outputs.push(['close', value]) })
  const h = await componentHarness(childPath, {
    props: props(), messages,
    beforeEffects(tree) { const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node || typeof node !== 'object') return; if (has(node, 'data-ocr-copy-manual')) node.props.ref.current = fieldPresent ? field : null; visit(node.props?.children) }; visit(tree) },
    storagePort: { getItem() { stored.push('read'); return null }, setItem() { stored.push('write') }, removeItem() { stored.push('remove') } },
  })
  h.render()
  const attr = key => h.find(node => has(node, 'data-ocr-copy-' + key))
  return { h, calls, outputs, stored, attr, messages,
    get failure() { return failure },
    click(key) { const node = attr(key); assert.notEqual(node.props.disabled, true); node.props.onClick(); h.render() },
    replace(next) { failure = Object.freeze(next); active = failure; h.setProps(props()); return failure },
    stale() { active = null },
    phase(callback) { phase = callback },
    ref(present) { fieldPresent = present; h.render() },
    locale(locale) { Object.assign(messages, structuredClone(fragment[locale])); h.render() },
    close() { alive = false; h.cleanup() },
  }
}

await check('large exact UTF16 source is lazy readonly content and survives catalog changes without output side effects', async () => {
  const text = '\uFEFF' + '  한글🙂\r\n\t<&>  \u00a0e\u0301\n'.repeat(12000) + '끝\n'
  const f = await fixture(text)
  try {
    assert.equal(f.h.all().filter(n => n.type === 'textarea').length, 0)
    assert.equal(f.h.text().includes(text), false)
    f.click('expand')
    assert.equal(f.attr('manual').props.value, text); assert.equal(f.attr('manual').props.readOnly, true)
    assert.equal(f.attr('manual').props.dangerouslySetInnerHTML, undefined)
    assert.equal(f.attr('manual').props.onChange, undefined)
    assert.deepEqual(f.calls, [], 'expansion does not steal focus')
    const before = f.failure
    for (const locale of ['en', 'ko']) {
      f.locale(locale); assert.equal(f.attr('manual').props.value, text); assert.equal(f.failure, before)
      assert.equal(flat(f.attr('select')), fragment[locale].imageOcr.output.select)
    }
    f.click('select'); assert.deepEqual(f.calls, [['focus', true], ['select'], ['range', 0, text.length]])
    assert.equal(f.failure.text, text); assert.deepEqual(f.outputs, []); assert.deepEqual(f.stored, [])
  } finally { f.close() }
})

await check('same-text replacement uses failure identity and old commands cannot act on a new owner or after unmount', async () => {
  const f = await fixture()
  try {
    const first = f.failure, expand = f.attr('expand').props.onClick
    f.click('expand')
    const old = ['select', 'retry', 'close'].map(key => f.attr(key).props.onClick)
    const second = f.replace({ ...first })
    assert.notEqual(first, second); assert.equal(f.h.all().filter(n => n.type === 'textarea').length, 0)
    expand(); old.forEach(fn => fn()); f.h.render()
    assert.equal(f.h.all().filter(n => n.type === 'textarea').length, 0); assert.deepEqual(f.calls, []); assert.deepEqual(f.outputs, [])
    f.click('expand'); f.click('retry'); f.click('close')
    assert.deepEqual(f.outputs.map(([kind]) => kind), ['retry', 'close']); assert.ok(f.outputs.every(([, owner]) => owner === second))
    const recent = ['select', 'retry', 'close'].map(key => f.attr(key).props.onClick)
    const third = f.replace({ ...first })
    old.forEach(fn => fn()); recent.forEach(fn => fn()); f.h.render()
    assert.notEqual(first, third); assert.equal(f.outputs.length, 2)
    const afterUnmount = ['expand', 'retry', 'close'].map(key => f.attr(key).props.onClick)
    f.close(); afterUnmount.forEach(fn => fn())
    assert.equal(f.outputs.length, 2); assert.deepEqual(f.stored, [])
  } finally { f.close() }
})

await check('selection reentry at each DOM stage never continues on a replaced failure or reports an old error', async () => {
  for (const target of ['focus', 'select', 'range']) {
    const f = await fixture('선택 경합 🙂')
    try {
      f.click('expand')
      f.phase(stage => { if (stage === target) { f.stale(); throw new Error('controlled replaced selection') } })
      f.click('select')
      assert.deepEqual(f.calls.map(([stage]) => stage), ['focus', 'select', 'range'].slice(0, ['focus', 'select', 'range'].indexOf(target) + 1))
      assert.equal(f.h.all().some(n => n.props.role === 'status'), false)
      const next = f.replace({ text: '현재 새 원고', label: '새 결과' }); f.phase(() => {})
      f.click('expand'); f.click('select')
      assert.deepEqual(f.calls.at(-1), ['range', 0, next.text.length]); assert.deepEqual(f.outputs, [])
    } finally { f.close() }
  }
})

await check('missing/throwing selection reports manual guidance then recovers; empty text remains exact and honestly labeled', async () => {
  const f = await fixture('선택 복구 문장')
  try {
    f.click('expand'); f.ref(false); f.click('select')
    assert.equal(f.h.find(n => n.props.role === 'status').props.children, fragment.ko.imageOcr.output.selectionFailed)
    f.ref(true); f.phase(stage => { if (stage === 'range') throw Error('selection unavailable') }); f.click('select')
    assert.ok(f.h.all().some(n => n.props.role === 'status'))
    f.phase(() => {}); f.click('select'); assert.equal(f.h.all().some(n => n.props.role === 'status'), false)
    const empty = f.replace({ text: '', label: '빈 결과' }); f.click('expand')
    assert.equal(f.attr('manual').props.value, ''); assert.equal(f.attr('select').props.disabled, true)
    assert.ok(f.h.text().includes(fragment.ko.imageOcr.output.empty))
    f.click('retry'); assert.equal(f.outputs.at(-1)[1], empty)
    assert.deepEqual(f.stored, [])
  } finally { f.close() }
})

assert.deepEqual({ child: hash(childPath), parent: hash(parentPath) }, initial)
console.log(`Independent OCR recovery child: ${groups} groups PASS; actual child only; parent integration/native clipboard/model calls 0`)
