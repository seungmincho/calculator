import assert from 'node:assert/strict'
import { JSONPath } from 'jsonpath-plus'
import JSON5 from 'json5'
import { jsonTreeKeyFrequencies, jsonTreeLiteralCandidate, jsonTreeNodeId, jsonTreePointer, jsonTreeTextPage, resolveJsonTreeNode, serializeJsonTreeValue, sortJsonTreeObject, verifyJsonTreeLiteral, type JsonTreePath, type JsonTreePathEngine, type JsonTreeSegment } from '../src/utils/jsonTreeSelection.ts'
import { copyJsonTreeText, createJsonTreeCopyGuard, type JsonTreeCopyTarget } from '../src/utils/jsonTreeCopy.ts'

let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }
const key = (value: string): JsonTreeSegment => ({ kind: 'key', key: value })
const index = (value: number): JsonTreeSegment => ({ kind: 'index', index: value })
const engine: JsonTreePathEngine = { toPathArray: expression => JSONPath.toPathArray(expression), evaluate: options => JSONPath<unknown>(options) }
const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

// Independent RFC string-pointer decoder; typed traversal is not used as its oracle.
function pointerValue(root: unknown, pointer: string): unknown {
  if (pointer === '') return root
  assert.ok(pointer.startsWith('/'))
  let value = root
  for (const encoded of pointer.slice(1).split('/')) {
    const token = encoded.replace(/~1/g, '/').replace(/~0/g, '~')
    assert.ok(value !== null && typeof value === 'object' && Object.hasOwn(value, token))
    value = (value as Record<string, unknown>)[token]
  }
  return value
}

await check('Typed identities and Pointer round trips distinguish dotted/nested/empty/numeric/root paths', () => {
  const root = JSON.parse('{"a.b":{"":false},"a":{"b":0},"":{"":null},"0":[{"0":""}],"a/b":{"~":"한글😀"},"__proto__":{"constructor":3}}')
  const samples: [JsonTreePath, unknown, string][] = [
    [[], root, ''], [[key('a.b'), key('')], false, '/a.b/'], [[key('a'), key('b')], 0, '/a/b'],
    [[key(''), key('')], null, '//'], [[key('0'), index(0), key('0')], '', '/0/0/0'],
    [[key('a/b'), key('~')], '한글😀', '/a~1b/~0'], [[key('__proto__'), key('constructor')], 3, '/__proto__/constructor'],
  ]
  assert.equal(new Set(samples.map(([path]) => jsonTreeNodeId(path))).size, samples.length)
  assert.notEqual(jsonTreeNodeId([key('0')]), jsonTreeNodeId([index(0)]))
  assert.notEqual(jsonTreeNodeId([]), jsonTreeNodeId([key('')]))
  for (const [path, expected, pointer] of samples) {
    const resolved = resolveJsonTreeNode(root, path); assert.equal(resolved.ok, true)
    if (resolved.ok) assert.equal(resolved.value, expected)
    assert.equal(jsonTreePointer(path), pointer); assert.equal(pointerValue(root, pointer), expected)
  }
})

await check('Own resolver refuses inherited/accessor/wrong-container/invalid index paths without invoking code', () => {
  let reads = 0
  const own = Object.create({ inherited: 1 }); Object.defineProperty(own, 'getter', { get() { reads++; return 3 } })
  assert.deepEqual(resolveJsonTreeNode(own, [key('inherited')]), { ok: false, reason: 'missing' })
  assert.deepEqual(resolveJsonTreeNode(own, [key('getter')]), { ok: false, reason: 'missing' }); assert.equal(reads, 0)
  for (const value of [-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.deepEqual(resolveJsonTreeNode([], [index(value)]), { ok: false, reason: 'invalidPath' })
  for (const [root, path] of [[[], [key('0')]], [{ 0: 'x' }, [index(0)]], [false, [key('x')]]] as [unknown, JsonTreePath][]) assert.deepEqual(resolveJsonTreeNode(root, path), { ok: false, reason: 'wrongContainer' })
  assert.deepEqual(resolveJsonTreeNode(new Array(1), [index(0)]), { ok: false, reason: 'missing' })
  for (const value of [null, false, 0, '', {}, []]) { const result = resolveJsonTreeNode(value, []); assert.ok(result.ok); assert.equal(result.value, value) }
})

await check('Parser-created own keys survive sorted JSON and exact Map statistics, including large arrays', () => {
  const root = JSON.parse('{"z":2,"__proto__":{"toString":1},"constructor":[{"__proto__":0,"toString":2},{"constructor":3}],"hasOwnProperty":false,"0":"zero"}')
  const result = serializeJsonTreeValue(root, 4, true); assert.ok(result.ok)
  assert.deepEqual(JSON.parse(result.text), root); assert.equal(Object.hasOwn(JSON.parse(result.text), '__proto__'), true)
  assert.deepEqual(JSON.parse(JSON.stringify(sortJsonTreeObject(root))), root)
  assert.deepEqual(Object.fromEntries(jsonTreeKeyFrequencies(root)), { z: 1, ['__proto__']: 2, constructor: 2, hasOwnProperty: 1, '0': 1, toString: 2 })
  const rows = Array.from({ length: 140000 }, () => ({ key: 1 }))
  assert.equal(jsonTreeKeyFrequencies(rows).get('key'), rows.length)
  assert.deepEqual(serializeJsonTreeValue({ b: [3, 1, 2], a: 0 }, 2, true), { ok: true, text: '{\n  "a": 0,\n  "b": [\n    3,\n    1,\n    2\n  ]\n}' })
})

await check('JSON5 nonfinite values anywhere in the selected subtree are blocked, with unrelated values still usable', () => {
  const parsed: unknown = JSON5.parse('{ good: { empty: "", no: false, zero: 0 }, bad: [1, { x: NaN }], inf: Infinity, neg: -Infinity }')
  for (const path of [[], [key('bad')], [key('bad'), index(1)], [key('inf')], [key('neg')]] as JsonTreePath[]) {
    const selected = resolveJsonTreeNode(parsed, path); assert.ok(selected.ok)
    for (const sort of [false, true]) assert.deepEqual(serializeJsonTreeValue(selected.value, 2, sort), { ok: false, reason: 'nonFinite' })
    assert.equal(pointerValue(parsed, jsonTreePointer(path)), selected.value)
  }
  const good = resolveJsonTreeNode(parsed, [key('good')]); assert.ok(good.ok)
  assert.deepEqual(serializeJsonTreeValue(good.value, 0), { ok: true, text: '{"empty":"","no":false,"zero":0}' })
  for (const value of [null, false, 0, '', {}, []]) { const serialized = serializeJsonTreeValue(value); assert.ok(serialized.ok); assert.deepEqual(JSON.parse(serialized.text), value) }
  for (const value of [undefined, 1n, Symbol('x'), () => 1]) assert.deepEqual(serializeJsonTreeValue(value), { ok: false, reason: 'notJsonValue' })
  const cycle: { next?: unknown } = {}; cycle.next = cycle; assert.deepEqual(serializeJsonTreeValue(cycle), { ok: false, reason: 'serializationFailed' })
})

await check('Actual engine verifies supported literal keys with same-valued decoys across nested/array contexts', () => {
  const keys = ['a.b', '', '0', 'a/b', 'a~b', '한글', '*', '..', '$', '`', 'constructor', '__proto__', 'a"b', "a'b", 'a\\b', 'a\nb', 'a,b', '(x)', ':', '😀']
  for (const name of keys) for (const value of [false, 0, null, '', { own: 1 }]) {
    const child = JSON.parse(JSON.stringify({ [name]: value, decoy: value }))
    for (const [root, path] of [[child, [key(name)]], [{ '0': [child], decoy: [child] }, [key('0'), index(0), key(name)]]] as [unknown, JsonTreePath][]) {
      const result = verifyJsonTreeLiteral(root, path, engine)
      assert.ok(result.ok, JSON.stringify({ name, path })); assert.equal(result.expression, jsonTreeLiteralCandidate(path).expression)
    }
  }
})

await check('Unsupported keys or ancestors fail token proof before evaluation; root and index semantics stay distinct', () => {
  let calls = 0
  const observed: JsonTreePathEngine = { ...engine, evaluate: options => { calls++; assert.equal(options.eval, false); assert.equal(options.resultType, 'all'); assert.equal(options.wrap, true); return engine.evaluate(options) } }
  for (const name of ['x]y', 'x[y', 'a;b', '^', '@string()', '%@%', '%%@@%%', '#0']) {
    const root = JSON.parse(JSON.stringify({ [name]: { good: 1 }, decoy: { good: 1 } }))
    const before = calls
    assert.deepEqual(verifyJsonTreeLiteral(root, [key(name)], observed), { ok: false, reason: 'unsupported' })
    assert.deepEqual(verifyJsonTreeLiteral(root, [key(name), key('good')], observed), { ok: false, reason: 'unsupported' }); assert.equal(calls, before)
  }
  for (const value of [null, false, 0, '', [], {}]) assert.deepEqual(verifyJsonTreeLiteral(value, [], observed), { ok: true, expression: '$' })
  assert.equal(calls, 0)
  assert.ok(verifyJsonTreeLiteral({ 0: [7] }, [key('0'), index(0)], observed).ok); assert.equal(calls, 1)
  assert.deepEqual(verifyJsonTreeLiteral({ 0: [7] }, [index(0)], observed), { ok: false, reason: 'unsupported' })
})

await check('Malformed/wrong metadata cannot pass using equal values, and engine failures stay explicit', () => {
  const root = { value: { same: true }, decoy: { same: true } }, path = [key('value')]
  const target = resolveJsonTreeNode(root, path); assert.ok(target.ok)
  const valid = { parent: root, parentProperty: 'value', value: root.value }
  for (const response of [undefined, null, {}, [], [valid, valid], [null], [{ ...valid, parent: { ...root } }], [{ ...valid, parentProperty: 'decoy' }], [{ ...valid, value: { same: true } }]]) {
    assert.deepEqual(verifyJsonTreeLiteral(root, path, { ...engine, evaluate: () => response }), { ok: false, reason: 'unsupported' })
  }
  assert.deepEqual(verifyJsonTreeLiteral(root, path, { ...engine, evaluate: () => { throw new Error('blocked') } }), { ok: false, reason: 'unavailable' })
  assert.deepEqual(verifyJsonTreeLiteral(root, path, { ...engine, toPathArray: () => { throw new Error('load') } }), { ok: false, reason: 'unavailable' })
  const array = [7]
  for (const property of [0, '0']) assert.ok(verifyJsonTreeLiteral(array, [index(0)], { ...engine, evaluate: () => [{ parent: array, parentProperty: property, value: 7 }] }).ok)
  assert.deepEqual(verifyJsonTreeLiteral(array, [index(0)], { ...engine, evaluate: () => [{ parent: array, parentProperty: '00', value: 7 }] }), { ok: false, reason: 'unsupported' })
})

await check('Preview pages retain every UTF-16 unit and keep CRLF/surrogate boundaries together', () => {
  for (const text of ['', 'x', 'a'.repeat(49999) + '😀' + 'b'.repeat(49998) + '\r\n' + 'z'.repeat(100003), 'a'.repeat(100000)]) {
    const count = jsonTreeTextPage(text, 0).pages, pages = Array.from({ length: count }, (_, n) => jsonTreeTextPage(text, n))
    assert.equal(pages.map(page => page.text).join(''), text)
    for (let n = 0; n < count; n++) {
      const page = pages[n]; assert.ok(page.text.length <= 50001); assert.equal(page.total, text.length)
      if (n) assert.equal(page.start, pages[n - 1].end)
      assert.equal(page.text.endsWith('\r') && text[page.end] === '\n', false)
      assert.equal(/[\ud800-\udbff]$/.test(page.text) && /[\udc00-\udfff]/.test(text[page.end] ?? ''), false)
    }
    assert.equal(jsonTreeTextPage(text, -10).page, 0); assert.equal(jsonTreeTextPage(text, NaN).page, 0)
    assert.equal(jsonTreeTextPage(text, 100000).page, count - 1)
  }
})

await check('Copy empty Pointer and full JSON uses exact text; missing/rejected/throwing APIs accept only real fallback true', async () => {
  for (const text of ['', '"' + '한글😀'.repeat(30000) + '"']) {
    let stored = 'unchanged'
    assert.equal(await copyJsonTreeText(text, () => true, { writeText: async value => { stored = value }, fallback: () => { assert.fail('unexpected fallback') } }), 'copied'); assert.equal(stored, text)
  }
  for (const api of ['missing', 'reject', 'throw']) for (const fallback of ['true', 'false', 'throw']) {
    const result = await copyJsonTreeText('full', () => true, {
      ...(api === 'missing' ? {} : { writeText: api === 'reject' ? async () => { throw new Error('denied') } : () => { throw new Error('sync') } }),
      fallback: text => { assert.equal(text, 'full'); if (fallback === 'throw') throw new Error('legacy'); return fallback === 'true' },
    })
    assert.equal(result, fallback === 'true' ? 'copied' : 'failed')
  }
  assert.equal(await copyJsonTreeText('x', () => true, { fallback: () => 1 as unknown as boolean }), 'failed')
})

await check('All copy targets share a generation; stale success/rejection cannot run fallback or claim current completion', async () => {
  const targets: JsonTreeCopyTarget[] = ['output', 'value', 'pointer', 'path']
  for (const oldTarget of targets) for (const nextTarget of targets) for (const late of ['resolve', 'reject']) {
    const guard = createJsonTreeCopyGuard(), first = guard.begin(oldTarget), task = deferred()
    const old = copyJsonTreeText('old', () => guard.isCurrent(first), { writeText: () => task.promise, fallback: () => { assert.fail('old fallback') } })
    const second = guard.begin(nextTarget)
    assert.equal(await copyJsonTreeText('new', () => guard.isCurrent(second), { fallback: () => true }), 'copied')
    if (late === 'resolve') task.resolve(); else task.reject(new Error('late'))
    assert.equal(await old, 'stale'); assert.equal(guard.isCurrent(second), true)
    guard.invalidate(); assert.equal(guard.isCurrent(second), false)
  }
  const guard = createJsonTreeCopyGuard(), token = guard.begin('value'); guard.invalidate()
  assert.equal(await copyJsonTreeText('old', () => guard.isCurrent(token), { writeText: async () => { assert.fail('stale write') }, fallback: () => { assert.fail('stale fallback') } }), 'stale')
})

console.log(`JSON tree selection/copy preparation: ${groups} groups passed`)
