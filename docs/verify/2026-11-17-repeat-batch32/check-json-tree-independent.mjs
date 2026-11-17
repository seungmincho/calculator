import assert from 'node:assert/strict'
import fs from 'node:fs'
import { JSONPath } from 'jsonpath-plus'
import JSON5 from 'json5'
import { componentHarness, all, text } from './json-formatter-harness.mjs'
import { jsonTreeNodeId, jsonTreePointer, resolveJsonTreeNode, verifyJsonTreeLiteral, serializeJsonTreeValue, sortJsonTreeObject, jsonTreeKeyFrequencies, jsonTreeTextPage } from '../../../src/utils/jsonTreeSelection.ts'
import { parseJsonPathPresets, JSONPATH_PRESETS_KEY, addJsonPathPreset } from '../../../src/utils/jsonPathPresets.ts'

// Reuse only the generic hook/module host. All fixtures and assertions below are independent.
const key = value => ({ kind: 'key', key: value }), index = value => ({ kind: 'index', index: value })
const id = path => JSON.stringify(path.map(part => part.kind === 'key' ? ['key', part.key] : ['index', part.index]))
const pause = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function own(root, path) {
  let value = root, parent = null, property = null
  for (const step of path) {
    assert.ok(value !== null && typeof value === 'object'); assert.equal(Array.isArray(value), step.kind === 'index')
    property = step.kind === 'index' ? step.index : step.key
    const descriptor = Reflect.getOwnPropertyDescriptor(value, property); assert.ok(descriptor && Object.hasOwn(descriptor, 'value'))
    parent = value; value = descriptor.value
  }
  return { value, parent, property }
}
function pointer(root, value) {
  if (value === '') return root
  assert.equal(value[0], '/')
  for (const token of value.slice(1).split('/')) {
    const decoded = token.replace(/~[01]/g, match => match === '~1' ? '/' : '~')
    if (Array.isArray(root)) assert.match(decoded, /^(0|[1-9]\d*)$/)
    assert.ok(Object.hasOwn(root, decoded)); root = Object.getOwnPropertyDescriptor(root, decoded).value
  }
  return root
}
const plain = value => JSON.parse(JSON.stringify(value))
function statistics(root) {
  const frequencies = new Map(), types = new Map(), depths = new Map(); let nodes = 0, keys = 0, maximum = 0
  const visit = (value, level) => {
    nodes++; maximum = Math.max(maximum, level); depths.set(level, (depths.get(level) ?? 0) + 1)
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value; types.set(type, (types.get(type) ?? 0) + 1)
    if (Array.isArray(value)) value.forEach(child => visit(child, level + 1))
    else if (type === 'object') for (const name of Reflect.ownKeys(value)) { keys++; frequencies.set(name, (frequencies.get(name) ?? 0) + 1); visit(value[name], level + 1) }
  }; visit(root, 0); return { nodes, keys, maximum, frequencies, types, depths }
}
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('independent own resolver and RFC6901 decoder preserve all typed path identities and escape order', () => {
  const names = ['', 'a.b', '0', '01', 'a/b', '~1', '~01', '한글', 'e\u0301', '\u00e9', 'x"y', "x'y", 'x\\y', '\n', '__proto__', 'constructor', 'toString', '[]', '😀']
  const object = Object.fromEntries(names.map((name, n) => [name, [{ leaf: n }]])), root = [object, { a: { b: 99 } }]
  const identities = new Set()
  for (const name of names) for (const tail of [[], [index(0)], [index(0), key('leaf')]]) {
    const path = [index(0), key(name), ...tail], expected = own(root, path), actual = resolveJsonTreeNode(root, path)
    assert.equal(actual.ok, true); assert.equal(actual.value, expected.value); assert.equal(actual.parent, expected.parent); assert.equal(actual.property, expected.property)
    assert.equal(pointer(root, jsonTreePointer(path)), expected.value); identities.add(jsonTreeNodeId(path))
  }
  assert.equal(identities.size, names.length * 3); assert.equal(jsonTreePointer([]), ''); assert.equal(jsonTreePointer([key('')]), '/'); assert.equal(jsonTreePointer([key('~1')]), '/~01')
  assert.notEqual(jsonTreeNodeId([key('a.b')]), jsonTreeNodeId([key('a'), key('b')])); assert.notEqual(jsonTreeNodeId([key('0')]), jsonTreeNodeId([index(0)]))
  const inherited = Object.create({ secret: 5 }); Object.defineProperty(inherited, 'getter', { get() { throw new Error('must not evaluate') } })
  assert.equal(resolveJsonTreeNode(inherited, [key('secret')]).ok, false); assert.equal(resolveJsonTreeNode(inherited, [key('getter')]).ok, false); assert.equal(resolveJsonTreeNode([0], [key('0')]).ok, false); assert.equal(resolveJsonTreeNode({ 0: 0 }, [index(0)]).ok, false)
})

await check('installed JSONPath supported literals must match independently resolved parent/property identity beside equal primitive decoys', () => {
  const supported = ['', 'a.b', '0', 'constructor', '__proto__', '/', '~', '*', '$', '..', "x'y", 'x"y', 'x\\y', 'line\nnext', '`', '한국어', '😀']
  let evaluated = 0
  for (const name of supported) for (const value of [0, false, null, '', { same: 1 }, []]) {
    const target = Object.fromEntries([[name, value], ['decoy', value]]), root = { array: [target, { decoy: value }] }, path = [key('array'), index(0), key(name)]
    const expected = own(root, path)
    const result = verifyJsonTreeLiteral(root, path, {
      toPathArray: expression => JSONPath.toPathArray(expression), evaluate(options) {
        evaluated++; assert.equal(options.eval, false); assert.equal(options.wrap, true); assert.equal(options.resultType, 'all')
        const found = JSONPath(options); assert.equal(found.length, 1); assert.equal(found[0].parent, expected.parent); assert.equal(found[0].parentProperty, expected.property); assert.ok(Object.is(found[0].value, expected.value)); return found
      },
    }); assert.equal(result.ok, true, name)
  }
  assert.equal(evaluated, supported.length * 6)
  for (const name of ['a[b', 'a]b', ';', '^', '@string()', '%@%']) {
    const root = Object.fromEntries([[name, { child: 1 }], ['other', { child: 1 }]]); let calls = 0
    const result = verifyJsonTreeLiteral(root, [key(name), key('child')], { toPathArray: JSONPath.toPathArray, evaluate() { calls++; return [] } })
    assert.equal(result.ok, false, name); assert.equal(calls, 0, name)
  }
  const root = { same: 1, other: 1 }, candidate = [key('same')]
  assert.equal(verifyJsonTreeLiteral(root, candidate, { toPathArray: JSONPath.toPathArray, evaluate: () => [{ value: 1, parent: root, parentProperty: 'other' }] }).ok, false)
})

await check('own-key sorting and frequency counts retain prototype-like data while strict JSON selection refuses nonfinite subtrees', () => {
  const root = JSON.parse('{"__proto__":{"constructor":0,"toString":false},"constructor":[{"__proto__":"data"},{"constructor":null}],"toString":"","hasOwnProperty":7}')
  const before = statistics(root), sorted = serializeJsonTreeValue(root, 4, true); assert.equal(sorted.ok, true); assert.deepEqual(JSON.parse(sorted.text), root)
  assert.equal(Object.hasOwn(sortJsonTreeObject(root), '__proto__'), true)
  assert.deepEqual([...jsonTreeKeyFrequencies(root)].sort(), [...before.frequencies].sort())
  for (const value of [NaN, Infinity, -Infinity, { valid: 1, nested: [NaN] }]) assert.deepEqual(serializeJsonTreeValue(value), { ok: false, reason: 'nonFinite' })
  for (const value of [null, false, 0, '', {}, []]) { const json = serializeJsonTreeValue(value); assert.equal(json.ok, true); assert.deepEqual(JSON.parse(json.text), value) }
})

await check('long UTF16 preview pages reassemble exact text and never bisect CRLF or surrogate pairs', () => {
  for (const join of ['😀', '\r\n']) {
    const value = 'x'.repeat(49_999) + join + 'y'.repeat(49_999) + join + 'z'.repeat(4), chunks = []
    for (let page = 0; page < jsonTreeTextPage(value, 0).pages; page++) {
      const part = jsonTreeTextPage(value, page); chunks.push(part.text); assert.ok(part.text.length <= 50_001)
      const ending = part.text.charCodeAt(part.text.length - 1); assert.ok(!(ending >= 0xd800 && ending <= 0xdbff)); assert.ok(!part.text.endsWith('\r'))
    }
    assert.equal(chunks.join(''), value)
  }
})

function messages(language = 'ko') {
  const value = JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8'))
  value.jsonFormatter.selection = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch32/translations-json-tree.json', 'utf8'))[language].jsonFormatter.selection
  return value
}
async function parent(seed = {}) {
  const locale = messages(), clipboard = [], legacy = [], calls = [], engineCalls = []
  let copyPort = async () => {}, fallback = false
  class Field { style = {}; value = ''; focus() {} select() {} setSelectionRange() {} remove() {} }
  let activeField
  const engine = options => { engineCalls.push(options); return JSONPath(options) }; engine.toPathArray = JSONPath.toPathArray
  const h = await componentHarness('src/components/JsonFormatter.tsx', {
    props: {}, messages: locale, namedExport: 'computeJsonStats, stableStringify', exportName: 'default', storage: seed, globals: { performance, HTMLElement: Field },
    navigator: { clipboard: { writeText(value) { clipboard.push(value); return copyPort(value) } } },
    document: { activeElement: new Field(), body: { appendChild(value) { activeField = value } }, createElement() { return new Field() }, execCommand() { legacy.push(activeField.value); return fallback }, getElementById() { return { focus() {} } } },
    modules: { 'next/dynamic': { __esModule: true, default: () => 'HostWidget' }, './JsonCodeEditor': { __esModule: true, default: 'HostEditor' }, 'echarts-for-react': { __esModule: true, default: 'HostChart' }, '@/components/JsonPathPresets': { __esModule: true, default: 'SavedPaths' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, 'jsonpath-plus': { JSONPath: engine }, json5: { __esModule: true, default: JSON5 } },
  }); h.render()
  const attr = (name, value = true) => h.find(node => node.props[name] === value)
  const editor = () => h.find(node => node.type === 'HostWidget' && typeof node.props.onChange === 'function')
  const settle = async () => { await pause(); h.render() }
  const edit = source => { editor().props.onChange(source); h.render() }
  const input = async source => { edit(source); h.tick(300); await settle() }
  const mode = value => { attr('data-json-formatter-mode', value).props.onClick(); h.render() }
  const root = () => h.find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'nodeKey'))
  const tree = () => { const walk = node => { const rendered = node.type(node.props); return [...all(rendered), ...all(rendered).filter(child => typeof child.type === 'function' && Object.hasOwn(child.props, 'nodeKey')).flatMap(walk)] }; return walk(root()) }
  const treeButton = (kind, path) => { const node = tree().find(node => node.props[`data-json-tree-${kind}`] === id(path)); assert.ok(node, kind + id(path)); return node }
  const toggle = path => { treeButton('toggle', path).props.onClick(); h.render() }
  const select = async path => { treeButton('select', path).props.onClick(); h.render(); await settle() }
  const panel = () => h.all().find(node => typeof node.type === 'function' && typeof node.props.selectionKey === 'string')
  const recovery = () => h.all().find(node => typeof node.type === 'function' && typeof node.props.onRetry === 'function')
  const copy = async target => { const p = panel().props; p.onCopy(target, target === 'value' ? p.value.text : target === 'pointer' ? p.pointer : p.path.expression); h.render(); await settle() }
  const settings = () => { if (!h.all().some(node => Object.hasOwn(node.props, 'data-json-formatter-sort'))) { h.find(node => node.type === 'button' && node.props.title === locale.jsonFormatter.controls.settings).props.onClick(); h.render() } }
  return { h, attr, editor, input, edit, settle, mode, root, tree, toggle, select, panel, recovery, copy, settings, clipboard, legacy, calls, engineCalls,
    copyPort(value) { copyPort = value }, fallback(value) { fallback = value }, waitCopy() { copyPort = () => { const job = deferred(); calls.push(job); return job.promise } }, locale(next) { locale.jsonFormatter = messages(next).jsonFormatter; h.render() },
  }
}

await check('actual tree distinguishes dotted/nested expansions, empty keys and numeric object keys; sort and locale preserve selection identity', async () => {
  const f = await parent(), source = '{"d.e":{"leaf":1},"d":{"e":{"leaf":2}},"":{"0":false},"0":[0]}'
  await f.input(source); f.mode('tree'); f.toggle([key('d')]); f.toggle([key('d.e')])
  assert.equal(f.tree().find(node => node.props['data-json-tree-toggle'] === id([key('d'), key('e')])).props['aria-expanded'], false)
  f.toggle([key('d'), key('e')]); await f.select([key('d.e'), key('leaf')]); assert.equal(f.panel().props.pointer, '/d.e/leaf'); assert.equal(f.panel().props.value.text, '1')
  await f.select([key('d'), key('e'), key('leaf')]); assert.equal(f.panel().props.pointer, '/d/e/leaf'); assert.equal(f.panel().props.value.text, '2'); const selected = f.panel().props.selectionKey
  f.settings(); f.attr('data-json-formatter-sort').props.onChange({ target: { checked: true } }); f.h.render(); await f.settle(); assert.equal(f.panel().props.pointer, '/d/e/leaf'); assert.notEqual(f.panel().props.selectionKey, selected)
  const sortedKey = f.panel().props.selectionKey; f.locale('en'); assert.equal(f.panel().props.selectionKey, sortedKey)
  f.toggle([key('')]); await f.select([key(''), key('0')]); assert.equal(f.panel().props.pointer, '//0'); assert.equal(f.panel().props.value.text, 'false')
  const numeric = f.tree().find(node => node.props['data-json-tree-select'] === id([key('0')])); assert.ok(text(numeric).includes('"0"')); f.toggle([key('0')]); const array = f.tree().find(node => node.props['data-json-tree-select'] === id([key('0'), index(0)])); assert.ok(text(array).includes('[0]'))
  f.h.cleanup()
})

await check('actual sorted formatter and private statistics preserve every special own key with an independent recursive oracle', async () => {
  const f = await parent(), source = '{"__proto__":{"constructor":1,"toString":2},"constructor":[{"__proto__":3},{"constructor":4}],"toString":false,"hasOwnProperty":"ok"}', root = JSON.parse(source), expected = statistics(root)
  await f.input(source); f.settings(); f.attr('data-json-formatter-sort').props.onChange({ target: { checked: true } }); f.h.render()
  const output = f.h.all().find(node => node.type === 'HostWidget' && node.props.readOnly).props.value; assert.deepEqual(JSON.parse(output), root); assert.equal(f.editor().props.value, source)
  const actual = f.h.module.exports.computeJsonStats(root); assert.equal(actual.totalNodes, expected.nodes); assert.equal(actual.totalKeys, expected.keys); assert.equal(actual.maxDepth, expected.maximum)
  assert.deepEqual(plain(actual.topKeys).map(item => [item.name, item.value]).sort(), [...expected.frequencies].sort()); assert.deepEqual(plain(actual.typeDistribution).map(item => [item.name, item.value]).sort(), [...expected.types].sort())
  f.mode('stats'); assert.ok(f.h.all().some(node => node.type === 'HostWidget' && node.props.option?.series?.[0]?.type === 'pie')); f.h.cleanup()
})

await check('all falsy and empty roots remain selectable, root Pointer empty copy is real, and unsupported paths retain value/Pointer', async () => {
  const f = await parent()
  for (const value of [null, false, 0, '', {}, []]) { await f.input(JSON.stringify(value)); f.mode('tree'); await f.select([]); assert.equal(f.panel().props.pointer, ''); assert.equal(f.panel().props.path.expression, '$'); await f.copy('pointer'); assert.equal(f.clipboard.at(-1), ''); await f.copy('value'); assert.deepEqual(JSON.parse(f.clipboard.at(-1)), value) }
  await f.input('{"bad[key":{"inner":0},"other":0}'); f.toggle([key('bad[key')]); await f.select([key('bad[key'), key('inner')]); assert.equal(f.panel().props.path.ok, false); assert.equal(f.panel().props.pointer, '/bad[key/inner'); await f.copy('value'); assert.equal(f.clipboard.at(-1), '0')
  f.h.cleanup()
})

await check('large selected strings copy the full parsed value; real child preview pages and recovery text do not truncate the export', async () => {
  const f = await parent(), long = 'start' + '한😀'.repeat(40_000) + 'END'; await f.input(JSON.stringify({ long })); f.mode('tree'); await f.select([key('long')])
  assert.equal(JSON.parse(f.panel().props.value.text), long); await f.copy('value'); assert.equal(JSON.parse(f.clipboard.at(-1)), long)
  const child = await componentHarness('src/components/JsonTreeSelectionPanel.tsx', { props: f.panel().props, messages: messages() }); child.render()
  const pieces = []; for (;;) { pieces.push(child.find(node => Object.hasOwn(node.props, 'data-json-tree-value')).props.value); const next = child.find(node => node.props['data-json-tree-page'] === 'next'); if (next.props.disabled) break; next.props.onClick(); child.render() }
  assert.equal(pieces.join(''), f.panel().props.value.text); child.cleanup()
  f.copyPort(async () => { throw new Error('denied') }); f.fallback(false); await f.copy('value'); assert.equal(f.recovery().props.text, f.panel().props.value.text); assert.equal(JSON.parse(f.recovery().props.text).length, long.length)
  f.h.cleanup()
})

await check('JSON5 nonfinite values disable only selected JSON serialization and preserve existing whole-formatter behavior', async () => {
  const f = await parent(); f.settings(); f.attr('data-json-formatter-json5').props.onClick(); f.h.render(); await f.input('{bad: NaN, nested: [Infinity], ok: false}')
  f.mode('tree'); await f.select([key('bad')]); assert.equal(f.panel().props.value.ok, false); assert.equal(f.panel().props.value.reason, 'nonFinite'); assert.equal(f.panel().props.path.ok, true); await f.copy('pointer'); assert.equal(f.clipboard.at(-1), '/bad')
  await f.select([]); assert.equal(f.panel().props.value.ok, false); f.attr('data-json-formatter-copy-output').props.onClick(); await f.settle(); assert.deepEqual(JSON.parse(f.clipboard.at(-1)), { bad: null, nested: [null], ok: false })
  await f.select([key('ok')]); await f.copy('value'); assert.equal(f.clipboard.at(-1), 'false'); f.h.cleanup()
})

await check('input round trips, mode changes and output/value cross-target requests reject obsolete copy closures and late fallback', async () => {
  const f = await parent(), source = '{"first":1,"second":2}'; await f.input(source); f.mode('tree'); await f.select([key('first')]); const oldCallback = f.panel().props.onCopy
  f.waitCopy(); await f.copy('value'); await f.select([key('second')]); await f.copy('pointer'); f.calls[0].reject(new Error('old denied')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.panel().props.pending, 'pointer')
  f.calls[1].resolve(); await f.settle(); assert.equal(f.panel().props.copied, 'pointer')
  f.edit('{broken'); f.edit(source); oldCallback('value', '1'); f.h.render(); assert.equal(f.clipboard.length, 2); assert.equal(f.panel(), undefined); f.h.tick(300); await f.settle()
  await f.select([key('second')]); await f.copy('value'); f.mode('format'); f.attr('data-json-formatter-copy-output').props.onClick(); f.h.render(); f.calls[2].reject(new Error('late value')); await f.settle(); assert.equal(f.legacy.length, 0)
  f.calls[3].resolve(); await f.settle(); assert.equal(f.recovery(), undefined)
  f.mode('tree'); await f.select([]); f.copyPort(async () => { throw new Error('current denied') }); await f.copy('pointer'); assert.equal(f.recovery().props.text, ''); f.fallback(true); f.recovery().props.onRetry(); await f.settle(); assert.equal(f.panel().props.copied, 'pointer')
  f.waitCopy(); await f.copy('value'); const pending = f.calls.at(-1); f.h.cleanup(); pending.reject(new Error('unmounted')); await pause(); assert.equal(f.legacy.length, 2)
})

await check('existing twelve stored JSONPath expressions stay byte-identical and arbitrary filters retain their previous evaluation contract', async () => {
  const filter = '$.items[?(@.score<3)]', store = { version: 1, revision: 'seed', presets: Array.from({ length: 12 }, (_, n) => ({ id: 'p' + n, name: 'Saved ' + n, expression: n === 0 ? filter : '$', updatedAt: '2026-11-17T00:00:00.000Z' })) }, raw = JSON.stringify(store)
  assert.equal(parseJsonPathPresets(raw).ok, true); assert.throws(() => addJsonPathPreset(store, 'new', '$', 'new', '2026-11-17T00:00:00.000Z'), /limit/)
  const f = await parent({ [JSONPATH_PRESETS_KEY]: raw }); await f.input('{"items":[{"score":1},{"score":5}],"a.b":0}'); f.mode('tree'); await f.select([key('a.b')]); assert.ok(f.engineCalls.some(call => call.eval === false))
  f.h.find(node => node.type === 'button' && node.props['aria-expanded'] !== undefined && text(node).includes('JSONPath')).props.onClick(); f.h.render()
  const presets = f.h.find(node => node.type === 'SavedPaths'); presets.props.onLoad(filter); f.h.render(); assert.equal(f.h.find(node => node.props.id === 'jsonpath-query').props.value, filter)
  f.h.find(node => node.props.id === 'jsonpath-query').props.onKeyDown({ key: 'Enter' }); await f.settle(); assert.deepEqual(JSON.parse(f.h.find(node => Object.hasOwn(node.props, 'data-jsonpath-result')).props.children), [{ score: 1 }])
  const invocation = f.engineCalls.at(-1); assert.equal(invocation.path, filter); assert.ok(!Object.hasOwn(invocation, 'eval')); assert.equal(f.h.stored.get(JSONPATH_PRESETS_KEY), raw); assert.equal(f.h.window.location.search, '')
  f.h.cleanup()
})

await check('queued literal import work cannot validate an older selection or source after immediate replacement', async () => {
  const f = await parent(); await f.input('{"first":1,"bad[key":2,"latest":3}'); f.mode('tree')
  const choose = path => { f.tree().find(node => node.props['data-json-tree-select'] === id(path)).props.onClick(); f.h.render() }
  choose([key('first')]); choose([key('bad[key')]); await f.settle()
  assert.equal(f.panel().props.pointer, '/bad[key'); assert.equal(f.panel().props.path.ok, false); assert.equal(f.engineCalls.length, 0)
  choose([key('first')]); f.edit('{"replacement":4}'); await f.settle(); assert.equal(f.panel(), undefined); assert.equal(f.engineCalls.length, 0)
  f.h.tick(300); await f.settle(); await f.select([key('replacement')]); assert.equal(f.panel().props.value.text, '4'); assert.equal(f.panel().props.path.ok, true); assert.equal(f.engineCalls.length, 1)
  f.h.cleanup()
})

console.log(`Independent JSON tree review: ${groups} groups passed; generic host only, no author assertions or browser claims`)
