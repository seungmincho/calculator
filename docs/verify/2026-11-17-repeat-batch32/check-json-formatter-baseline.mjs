import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

// Current actual parent, controlled hooks/DOM. Extend memo only; shared harness stays unchanged.
const harnessUrl = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
const harnessSource = fs.readFileSync(harnessUrl, 'utf8')
const anchor = '  const react = {'
assert.ok(harnessSource.includes(anchor))
const hostModule = { exports: {} }
vm.runInThisContext('(function(require,module,exports){\n' + harnessSource.replace(anchor, anchor + '\n    memo(component) { return component },') + '\n})', { filename: 'json-formatter-baseline-host.cjs' })(createRequire(harnessUrl), hostModule, hostModule.exports)
const { componentHarness, all, text } = hostModule.exports
const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
messages.jsonFormatter.selection = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch32/translations-json-tree.json', 'utf8')).ko.jsonFormatter.selection
const t = messages.jsonFormatter
const input = '{"a.b":{"direct":1},"a":{"b":{"nested":2}},"__proto__":{"keep":3},"constructor":"ctor","toString":4}'
const after = process.argv.includes('--after')
const h = await componentHarness('src/components/JsonFormatter.tsx', {
  props: {}, messages, globals: { performance },
  modules: {
    'next/dynamic': { __esModule: true, default: () => 'LazyWidget' },
    './JsonCodeEditor': { __esModule: true, default: 'JsonCodeEditor' },
    'echarts-for-react': { __esModule: true, default: 'ECharts' },
    '@/components/JsonPathPresets': { __esModule: true, default: 'JsonPathPresets' },
    '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
  },
})
h.render()
const editor = () => h.find(node => node.type === 'LazyWidget' && !node.props.readOnly && typeof node.props.onChange === 'function')
editor().props.onChange(input); h.render(); h.tick(300); await new Promise(resolve => setImmediate(resolve)); h.render()
assert.equal(editor().props.value, input)

// Render the real memo TreeNode body too; it has no stateful hooks of its own.
const treeChildren = node => all(node).filter(child => typeof child.type === 'function' && Object.hasOwn(child.props, 'nodeKey') && Object.hasOwn(child.props, 'path'))
const roots = () => {
  const nodes = treeChildren(h.render())
  return nodes.length === 1 && Array.isArray(nodes[0].props.path) && nodes[0].props.path.length === 0 ? treeChildren(treeOf(nodes[0])) : nodes
}
const treeOf = node => node.type(node.props)
const rootNamed = name => {
  const found = roots().find(node => node.props.nodeKey === name)
  assert.ok(found, `Missing root ${JSON.stringify(name)}`); return found
}
const toggle = node => {
  const rendered = treeOf(node)
  const button = all(rendered).find(child => child.type === 'button' && typeof child.props['aria-expanded'] === 'boolean')
  assert.ok(button, 'Expected the actual expand button')
  button.props.onClick({ stopPropagation() {} }); h.render()
}
const nestedB = () => {
  const found = treeChildren(treeOf(rootNamed('a'))).find(node => node.props.nodeKey === 'b')
  assert.ok(found, 'Expected nested a -> b'); return found
}
const expanded = node => all(treeOf(node)).find(child => child.type === 'button' && typeof child.props['aria-expanded'] === 'boolean').props['aria-expanded']

h.button(t.modes.treeView).props.onClick(); h.render()
toggle(rootNamed('a'))
assert.equal(expanded(nestedB()), false)
toggle(rootNamed('a.b'))
assert.equal(expanded(rootNamed('a.b')), true)
const coupledExpansion = expanded(nestedB())
assert.equal(coupledExpansion, !after)
console.log(after ? 'PASS same parent input/click: dotted and nested expansion are independent' : 'REPRODUCED current parent defect: clicking literal a.b also expands nested a -> b')

h.button(t.modes.format).props.onClick(); h.render()
// Settings may be folded. Use its visible toggle before finding the associated native checkbox.
let label = h.all().find(node => node.type === 'label' && text(node).includes(t.settings.sortKeys))
if (!label) {
  const settingsButton = h.all().find(node => node.type === 'button' && (node.props.title === t.controls.settings || node.props['aria-label'] === t.controls.settings))
  assert.ok(settingsButton, 'Expected current settings toggle'); settingsButton.props.onClick(); h.render()
  label = h.all().find(node => node.type === 'label' && text(node).includes(t.settings.sortKeys))
}
assert.ok(label, 'Expected sort keys label')
const checkbox = all(label).find(node => node.type === 'input' && node.props.type === 'checkbox')
checkbox.props.onChange({ target: { checked: true } }); h.render()
const output = h.find(node => node.type === 'LazyWidget' && node.props.readOnly).props.value
const parsed = JSON.parse(output), lostPrototypeKey = !Object.hasOwn(parsed, '__proto__')
assert.equal(lostPrototypeKey, !after)
assert.equal(parsed.constructor, 'ctor'); assert.equal(parsed.toString, 4); assert.equal(editor().props.value, input)
if (after) assert.deepEqual(parsed, JSON.parse(input))
console.log(after ? 'PASS same parent input/sort action: every own data key is retained' : 'REPRODUCED current parent defect: sorted output omits own __proto__ data key')
h.cleanup()
console.log(after ? 'Formatter same-flow regression: 2 checks passed' : 'Formatter baseline: 2 actual-parent defects reproduced; product unchanged')
