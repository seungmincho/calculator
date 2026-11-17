import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { JSONPath } from 'jsonpath-plus'
import JSON5 from 'json5'

const harnessUrl = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
const source = fs.readFileSync(harnessUrl, 'utf8'), anchor = '  const react = {'
assert.ok(source.includes(anchor))
const host = { exports: {} }
// Node VM cannot resolve browser dynamic chunks. Keep their async boundary and
// inject the actual installed libraries through the existing module port.
const readAnchor = "fs.readFileSync(entry, 'utf8')"
assert.ok(source.includes(readAnchor))
const hostSource = source.replace(anchor, anchor + '\n    memo(component) { return component },').replace(readAnchor,
  readAnchor + `.replaceAll("import('jsonpath-plus')", "Promise.resolve().then(() => require('jsonpath-plus'))").replaceAll("import('json5')", "Promise.resolve().then(() => require('json5'))")`)
vm.runInThisContext('(function(require,module,exports){\n' + hostSource + '\n})', { filename: 'json-formatter-parent-host.cjs' })(createRequire(harnessUrl), host, host.exports)
export const { componentHarness, all, text } = host.exports
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export const key = value => ({ kind: 'key', key: value })
export const index = value => ({ kind: 'index', index: value })
export const nodeId = path => JSON.stringify(path.map(part => part.kind === 'key' ? ['key', part.key] : ['index', part.index]))
export const readMessages = locale => {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  messages.jsonFormatter.selection = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch32/translations-json-tree.json', 'utf8'))[locale].jsonFormatter.selection
  return messages
}

export async function fixture() {
  const messages = readMessages('ko'), calls = [], engineCalls = [], copied = [], fallback = []
  const io = { mode: 'success', legacy: false }
  class Element { constructor() { this.style = {}; this.value = '' } focus() {} select() {} setSelectionRange() {} remove() {} }
  const engine = options => { engineCalls.push(options); return JSONPath(options) }
  engine.toPathArray = expression => JSONPath.toPathArray(expression)
  const h = await componentHarness('src/components/JsonFormatter.tsx', {
    props: {}, messages, globals: { performance, HTMLElement: Element },
    navigator: { clipboard: { writeText: value => {
      copied.push(value)
      if (io.mode === 'reject') return Promise.reject(new Error('denied'))
      if (io.mode === 'throw') throw new Error('synchronous failure')
      if (io.mode === 'wait') { const job = deferred(); calls.push(job); return job.promise }
      return Promise.resolve()
    } } },
    document: { activeElement: new Element(), body: { appendChild(field) { io.field = field } }, createElement() { return new Element() }, execCommand() { fallback.push(io.field.value); if (io.legacy === 'throw') throw new Error('legacy'); return io.legacy }, getElementById() { return { focus() {} } } },
    modules: {
      'next/dynamic': { __esModule: true, default: () => 'LazyWidget' }, './JsonCodeEditor': { __esModule: true, default: 'JsonCodeEditor' },
      'echarts-for-react': { __esModule: true, default: 'ECharts' }, '@/components/JsonPathPresets': { __esModule: true, default: 'JsonPathPresets' },
      '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, 'jsonpath-plus': { JSONPath: engine }, json5: { __esModule: true, default: JSON5 },
    },
  })
  h.render()
  const attr = (name, value = true) => h.find(node => node.props?.[name] === value)
  const editor = () => h.find(node => node.type === 'LazyWidget' && !node.props.readOnly && typeof node.props.onChange === 'function')
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); h.render() }
  const input = async value => { editor().props.onChange(value); h.render(); h.tick(300); await flush() }
  const mode = value => { attr('data-json-formatter-mode', value).props.onClick(); h.render() }
  const root = () => h.find(node => typeof node.type === 'function' && Array.isArray(node.props.path) && Object.hasOwn(node.props, 'nodeKey'))
  const nodes = () => {
    const result = []
    const visit = node => { const rendered = node.type(node.props); result.push(rendered); for (const child of all(rendered).filter(item => typeof item.type === 'function' && Object.hasOwn(item.props, 'nodeKey'))) visit(child) }
    visit(root()); return result.flatMap(all)
  }
  const treeButton = (kind, path) => { const found = nodes().find(node => node.type === 'button' && node.props[`data-json-tree-${kind}`] === nodeId(path)); assert.ok(found, `Missing ${kind}: ${nodeId(path)}`); return found }
  const select = async path => { treeButton('select', path).props.onClick(); h.render(); await flush() }
  const panel = () => h.all().find(node => typeof node.type === 'function' && typeof node.props.selectionKey === 'string')
  const recovery = () => h.all().find(node => typeof node.type === 'function' && typeof node.props.onRetry === 'function')
  const copy = async (target, value) => { panel().props.onCopy(target, value ?? (target === 'value' ? panel().props.value.text : target === 'pointer' ? panel().props.pointer : panel().props.path.expression)); h.render(); await flush() }
  // Settings is an icon button with a title rather than visible text.
  const openSettings = () => { if (!h.all().some(node => node.props['data-json-formatter-indent'])) { h.find(node => node.type === 'button' && node.props.title === messages.jsonFormatter.controls.settings).props.onClick(); h.render() } }
  return { h, io, calls, copied, fallback, engineCalls, messages, attr, editor, flush, input, mode, root, nodes, treeButton, select, panel, recovery, copy, openSettings }
}
