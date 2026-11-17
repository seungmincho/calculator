import assert from 'node:assert/strict'
import { all, fixture, key, index, readMessages } from './json-formatter-harness.mjs'

const tests = []
const test = (name, run) => tests.push({ name, run })

test('typed paths, Pointer and installed engine metadata through actual tree selection', async () => {
  const f = await fixture()
  const data = JSON.parse('{"a.b":1,"a":{"b":2},"":3,"0":4,"arr":[5],"/a~":6,"*":7,"..":8,"quote\'":9,"slash\\\\":10,"[x]":11,"line\\n":12,"__proto__":13,"toString":14}')
  await f.input(JSON.stringify(data)); f.mode('tree')
  const paths = Object.keys(data).map(name => [key(name)])
  for (const path of paths) {
    await f.select(path)
    assert.equal(f.panel().props.pointer, '/' + path[0].key.replaceAll('~', '~0').replaceAll('/', '~1'))
    assert.deepEqual(JSON.parse(f.panel().props.value.text), data[path[0].key])
    if (f.panel().props.path.ok) {
      const last = f.engineCalls.at(-1); assert.equal(last.eval, false); assert.equal(last.resultType, 'all')
    }
  }
  f.treeButton('toggle', [key('arr')]).props.onClick(); f.h.render(); await f.select([key('arr'), index(0)])
  assert.equal(f.panel().props.pointer, '/arr/0'); assert.equal(f.panel().props.value.text, '5')
  f.treeButton('toggle', [key('a')]).props.onClick(); f.h.render(); await f.select([key('a'), key('b')])
  assert.equal(f.panel().props.pointer, '/a/b'); assert.equal(f.panel().props.value.text, '2')
  // Search must not coerce objects with an own non-callable toString.
  f.h.find(node => node.type === 'input' && node.props.placeholder === f.messages.jsonFormatter.treeView.search).props.onChange({ target: { value: 'a' } }); f.h.render(); assert.ok(f.nodes().length)
  f.h.cleanup()
})

test('falsy and empty roots remain selectable and empty Pointer is a copy target', async () => {
  const f = await fixture()
  for (const source of ['null', 'false', '0', '""', '{}', '[]']) {
    await f.input(source); f.mode('tree'); await f.select([])
    assert.equal(f.panel().props.pointer, ''); assert.equal(f.panel().props.path.expression, '$'); assert.equal(f.panel().props.value.text, source)
    await f.copy('pointer'); assert.equal(f.copied.at(-1), ''); assert.equal(f.panel().props.copied, 'pointer')
  }
  f.h.cleanup()
})

test('real fallback failures recover full current target, retry and cross-target stale rejection', async () => {
  const f = await fixture(); await f.input('{"a":"text"}'); f.mode('tree'); await f.select([key('a')])
  f.io.mode = 'reject'
  await f.copy('value'); assert.equal(f.panel().props.copied, null); assert.equal(f.recovery().props.text, '"text"'); assert.equal(f.recovery().props.target, 'value')
  f.io.legacy = 'throw'; f.recovery().props.onRetry(); await f.flush(); assert.equal(f.recovery().props.target, 'value')
  f.io.legacy = true; f.recovery().props.onRetry(); await f.flush(); assert.equal(f.recovery(), undefined); assert.equal(f.panel().props.copied, 'value')
  f.io.mode = 'wait'; await f.copy('value'); const old = f.calls.at(-1)
  f.io.mode = 'success'; await f.copy('pointer'); const before = f.fallback.length
  old.reject(new Error('late')); await f.flush(); assert.equal(f.fallback.length, before); assert.equal(f.panel().props.copied, 'pointer'); assert.equal(f.copied.at(-1), '/a')
  f.h.cleanup()
})

test('input, selection, formatting, mode, JSON5 and unmount invalidate pending copy and old events', async () => {
  const f = await fixture(); f.openSettings()
  for (const action of ['input', 'selection', 'indent', 'sort', 'mode', 'json5']) {
    await f.input('{"a":1,"b":2}'); f.mode('tree'); await f.select([key('a')]); f.io.mode = 'wait'
    await f.copy('value'); const pending = f.calls.at(-1), oldCopy = f.panel().props.onCopy, writes = f.copied.length
    if (action === 'input') f.editor().props.onChange('{"a":3}')
    if (action === 'selection') f.treeButton('select', [key('b')]).props.onClick()
    if (action === 'indent') f.attr('data-json-formatter-indent').props.onChange({ target: { value: '4' } })
    if (action === 'sort') f.attr('data-json-formatter-sort').props.onChange({ target: { checked: true } })
    if (action === 'mode') f.mode('minify')
    if (action === 'json5') f.attr('data-json-formatter-json5').props.onClick()
    f.h.render(); pending.reject(new Error('late')); await f.flush(); assert.equal(f.recovery(), undefined); assert.equal(f.panel()?.props.copied ?? null, null)
    oldCopy('value', 'OLD'); await f.flush(); assert.equal(f.copied.length, writes, action)
    if (action === 'indent') f.attr('data-json-formatter-indent').props.onChange({ target: { value: '2' } })
    if (action === 'sort') f.attr('data-json-formatter-sort').props.onChange({ target: { checked: false } })
    if (action === 'json5') f.attr('data-json-formatter-json5').props.onClick()
    f.h.render()
  }
  await f.input('{"a":1}'); f.mode('tree'); await f.select([key('a')]); await f.copy('value'); const pending = f.calls.at(-1), before = f.fallback.length
  f.h.cleanup(); pending.reject(new Error('after unmount')); await new Promise(resolve => setImmediate(resolve)); assert.equal(f.fallback.length, before)
})

test('selection survives collapse, same-mode click, sorting and language; literal stale completion does not return', async () => {
  const f = await fixture(); await f.input('{"a":{"b":1},"x":2}'); f.mode('tree'); await f.select([key('a')])
  const before = f.panel().props.pointer; f.mode('tree'); await f.flush(); assert.equal(f.panel().props.path.ok, true)
  f.h.button(f.messages.jsonFormatter.controls.collapseAll).props.onClick(); f.h.render(); assert.equal(f.panel().props.pointer, before)
  f.openSettings(); f.attr('data-json-formatter-sort').props.onChange({ target: { checked: true } }); f.h.render(); assert.equal(f.panel().props.pointer, before)
  f.messages.jsonFormatter = readMessages('en').jsonFormatter; f.h.render(); assert.equal(f.panel().props.pointer, before)
  f.mode('format'); f.mode('tree'); await f.flush(); assert.equal(f.panel().props.path.ok, true)
  f.h.button(f.messages.jsonFormatter.controls.expandAll).props.onClick(); f.h.render()
  f.treeButton('select', [key('a'), key('b')]).props.onClick(); f.h.render(); f.editor().props.onChange('{"other":3}'); f.h.render(); await f.flush()
  assert.equal(f.panel(), undefined); f.h.cleanup()
})

test('JSON5 nonfinite subtree is not silently copied as JSON; existing whole output remains unchanged', async () => {
  const f = await fixture(); f.openSettings(); f.attr('data-json-formatter-json5').props.onClick(); f.h.render()
  await f.input('{ a: { bad: NaN, inf: Infinity }, valid: 1 }'); f.mode('tree'); await f.select([key('a')])
  assert.equal(f.panel().props.value.ok, false); assert.equal(f.panel().props.value.reason, 'nonFinite'); assert.equal(f.panel().props.path.ok, true)
  await f.copy('pointer'); assert.equal(f.copied.at(-1), '/a')
  f.mode('format'); const output = f.h.find(node => node.type === 'LazyWidget' && node.props.readOnly).props.value
  assert.deepEqual(JSON.parse(output), { a: { bad: null, inf: null }, valid: 1 }); f.h.cleanup()
})

test('large selected value reaches native whole-copy and full recovery, not the 50k preview', async () => {
  const f = await fixture(), value = 'x'.repeat(50000) + '🙂\r\n' + 'y'.repeat(60000), source = JSON.stringify({ long: value })
  await f.input(source); f.mode('tree'); await f.select([key('long')]); await f.copy('value')
  assert.equal(f.copied.at(-1), JSON.stringify(value)); assert.ok(f.copied.at(-1).length > 100000)
  f.io.mode = 'reject'; await f.copy('value'); assert.equal(f.recovery().props.text, JSON.stringify(value))
  f.h.cleanup()
})

test('existing saved filter load/execution and own-key statistics retain their contracts', async () => {
  const f = await fixture(); await f.input('{"items":[{"n":1},{"n":3}],"__proto__":1,"constructor":2,"toString":3}')
  f.h.find(node => node.type === 'button' && node.props['aria-label'] === f.messages.jsonFormatter.presets.openPanel).props.onClick(); f.h.render()
  const preset = f.h.find(node => node.type === 'JsonPathPresets'); preset.props.onLoad('$.items[?(@.n > 1)].n'); f.h.render()
  const query = f.h.find(node => node.props.id === 'jsonpath-query'); assert.equal(query.props.value, '$.items[?(@.n > 1)].n')
  query.props.onKeyDown({ key: 'Enter' }); await f.flush()
  assert.deepEqual(JSON.parse(f.attr('data-jsonpath-result').props.children), [3])
  const invocation = f.engineCalls.at(-1); assert.equal(Object.hasOwn(invocation, 'eval'), false)
  f.mode('stats')
  for (const name of ['__proto__', 'constructor', 'toString']) {
    const row = f.h.all().find(node => node.type === 'div' && node.key === name)
    assert.ok(row); assert.equal(all(row).find(node => node.type === 'span').props.children, 1)
  }
  assert.equal(f.editor().props.value, '{"items":[{"n":1},{"n":3}],"__proto__":1,"constructor":2,"toString":3}')
  assert.equal(all(preset).length, 1); f.h.cleanup()
})

let count = 0
for (const { name, run } of tests) {
  if (process.argv[2] && !name.includes(process.argv[2])) continue
  await run(); count++; console.log('PASS ' + name)
}
console.log(`JsonFormatter actual-parent checks: ${count} groups passed`)
