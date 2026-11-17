import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch32/translations-json-tree.json', 'utf8'))
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
const base = { selectionKey: 'revision1:root', pointer: '', value: { ok: true, text: 'false' }, path: { ok: true, expression: '$' }, pending: null, copied: null, onCopy() {} }
const has = (node, key) => Object.hasOwn(node.props, key)
const action = (h, target) => h.find(node => node.props['data-json-tree-copy'] === target)
const valueField = h => h.find(node => has(node, 'data-json-tree-value'))

await check('Actual selection child in KO/EN supports empty root Pointer and each full copy target with accessible fields', async () => {
  for (const locale of ['ko', 'en']) {
    const copied = [], props = { ...base, onCopy: (...args) => copied.push(args) }
    const h = await componentHarness('src/components/JsonTreeSelectionPanel.tsx', { props, messages: fragment[locale] }); h.render()
    action(h, 'pointer').props.onClick(); action(h, 'path').props.onClick(); action(h, 'value').props.onClick()
    assert.deepEqual(copied, [['pointer', ''], ['path', '$'], ['value', 'false']])
    assert.ok(h.text().includes(fragment[locale].jsonFormatter.selection.rootPointer))
    for (const field of h.all().filter(n => n.type === 'textarea')) { assert.equal(field.props.readOnly, true); assert.ok(field.props.className.includes('text-base')) }
    for (const button of h.all().filter(n => n.type === 'button')) assert.ok(button.props.className.includes('min-h-11'))
    assert.equal(h.all().some(n => String(n.props.className).includes('opacity-0')), false)
    assert.ok(valueField(h).props['aria-labelledby']); assert.ok(valueField(h).props['aria-describedby'])
    h.cleanup()
  }
})

await check('Actual selection preview reaches every segment, copies full content, and resets native field identity only when needed', async () => {
  const text = 'a'.repeat(49999) + '😀' + 'b'.repeat(49998) + '\r\n' + 'c'.repeat(100020), copied = []
  const props = { ...base, value: { ok: true, text }, onCopy: (...args) => copied.push(args) }
  const messages = structuredClone(fragment.ko), h = await componentHarness('src/components/JsonTreeSelectionPanel.tsx', { props, messages }); h.render()
  const pageButton = name => h.find(n => n.props['data-json-tree-page'] === name)
  const pieces = [], identities = []
  while (true) {
    const field = valueField(h); pieces.push(field.props.value); identities.push(field.key)
    assert.ok(field.props.value.length <= 50001)
    if (pageButton('next').props.disabled) break
    pageButton('next').props.onClick(); h.render()
  }
  assert.equal(pieces.join(''), text); assert.equal(new Set(identities).size, pieces.length)
  action(h, 'value').props.onClick(); assert.deepEqual(copied, [['value', text]])
  const lastKey = valueField(h).key
  messages.jsonFormatter = fragment.en.jsonFormatter; h.render(); assert.equal(valueField(h).key, lastKey)
  assert.ok(h.text().includes('segment'))
  pageButton('first').props.onClick(); h.render(); assert.equal(valueField(h).props['data-json-tree-preview-start'], 0)
  pageButton('last').props.onClick(); h.render(); assert.equal(valueField(h).props['data-json-tree-preview-end'], text.length)
  h.setProps({ ...props, selectionKey: 'revision2:new-selection' }); assert.equal(valueField(h).props['data-json-tree-preview-start'], 0); assert.notEqual(valueField(h).key, identities[0])
  h.cleanup()
})

await check('Unsupported/checking JSONPath and nonfinite JSON block only their own copy target; statuses stay target-specific', async () => {
  const copied = [], props = { ...base, pointer: '/x[y', path: { ok: false, reason: 'unsupported' }, onCopy: (...args) => copied.push(args) }
  const h = await componentHarness('src/components/JsonTreeSelectionPanel.tsx', { props, messages: fragment.ko }); h.render()
  assert.equal(action(h, 'path').props.disabled, true); assert.equal(action(h, 'pointer').props.disabled, false); assert.equal(action(h, 'value').props.disabled, false)
  action(h, 'path').props.onClick(); assert.equal(copied.length, 0)
  h.setProps({ ...props, value: { ok: false, reason: 'nonFinite' }, path: { ok: true, expression: "$['`x']" }, pending: 'pointer', copied: 'path' })
  assert.equal(action(h, 'value').props.disabled, true); assert.equal(action(h, 'pointer').props.disabled, true); assert.equal(action(h, 'path').props.disabled, false)
  assert.equal(action(h, 'path').props['data-json-tree-copied'], true)
  assert.ok(h.text().includes(fragment.ko.jsonFormatter.selection.valueStatus.nonFinite))
  h.setProps({ ...props, path: { checking: true } }); assert.equal(action(h, 'path').props.disabled, true); assert.equal(valueField(h).props.value, 'false')
  assert.ok(h.all().some(n => n.props['data-json-tree-path-status'] === 'checking'))
  h.cleanup()
})

await check('Actual recovery exposes the full snapshot including empty Pointer, selection failure, retry/busy and close', async () => {
  for (const [target, text] of [['value', '한글😀'.repeat(50000)], ['pointer', '']]) {
    let selected = 0, retried = 0, closed = 0, selectionFails = false
    const props = { target, text, busy: false, onRetry() { retried++ }, onClose() { closed++ } }
    const h = await componentHarness('src/components/JsonTreeCopyRecovery.tsx', {
      props, messages: fragment.en,
      beforeEffects(tree) {
        const visit = node => {
          if (!node || typeof node !== 'object') return
          if (Array.isArray(node)) { node.forEach(visit); return }
          if (node.type === 'textarea') node.props.ref.current = { focus() {}, select() { if (selectionFails) throw new Error('denied'); selected++ }, setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, text.length) } }
          visit(node.props?.children)
        }; visit(tree)
      },
    }); h.render()
    const select = () => h.find(n => has(n, 'data-json-tree-manual-select'))
    const field = h.find(n => has(n, 'data-json-tree-manual'))
    assert.equal(field.props.value, text); assert.equal(field.props.readOnly, true)
    select().props.onClick(); assert.equal(selected, 1)
    selectionFails = true; select().props.onClick(); h.render(); assert.ok(h.text().includes(fragment.en.jsonFormatter.selection.recovery.selectionFailed))
    h.find(n => has(n, 'data-json-tree-retry')).props.onClick(); assert.equal(retried, 1)
    h.setProps({ ...props, busy: true }); assert.equal(h.find(n => has(n, 'data-json-tree-retry')).props.disabled, true)
    h.find(n => has(n, 'data-json-tree-recovery-close')).props.onClick(); assert.equal(closed, 1)
    h.cleanup()
  }
})

console.log(`JSON tree actual unconnected children: ${groups} groups passed; host refs controlled, browser selection separate.`)
