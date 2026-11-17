import assert from 'node:assert/strict'
import { createPercentSnapshot, addPercentSnapshot, removePercentSnapshot, evaluatePercentCard, percentComparisonText, percentStateUrl, type PercentCard, type PercentValues, type PercentSnapshot } from '../src/utils/percentComparison.ts'
import { createPercentOutputOwner, copyPercentText, downloadPercentText } from '../src/utils/percentComparisonActions.ts'

const values: PercentValues = { a: '50000', b: '15', p: '300', w: '1200', f: '30000', t: '40000', dp: '89000', dr: '30', rs: '62300', rr: '30', cp: '100000', x: '3', y: '5', v: '110000' }
const chain = ['30', '20']
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }
const create = (id: string, kind: PercentCard = 'of', inputs = values, decimals = 2, korean = false) => {
  const result = createPercentSnapshot({ kind, values: inputs, chain, decimals, korean, main: 'result ' + id, formula: 'formula ' + id }, id)
  assert.ok(result.ok); return result.snapshot
}
function deferred() { let resolve!: () => void, reject!: (reason: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

await check('eight kinds preserve numeric output and units, optional price and original domain errors', () => {
  const expected: Record<PercentCard, [number, string]> = { of: [7500, ''], ratio: [25, '%'], change: [33.3333333333, '%'], discount: [62300, ''], reverse: [89000, ''], chain: [44, '%'], pp: [2, '%p'], vat: [100000, ''] }
  for (const [kind, [number, unit]] of Object.entries(expected)) assert.deepEqual(evaluatePercentCard(kind as PercentCard, values, chain), { ok: true, value: number, unit })
  for (const cp of ['', 'not a number', '-1']) assert.deepEqual(evaluatePercentCard('chain', { ...values, cp }, chain), { ok: true, value: 44, unit: '%' })
  for (const [kind, patch, error] of [['of', { a: '' }, 'empty'], ['of', { a: 'abc' }, 'invalid'], ['ratio', { w: '0' }, 'zeroBase'], ['change', { f: '0' }, 'zeroBase'], ['discount', { dp: '-1' }, 'negative'], ['discount', { dr: '101' }, 'rateRange'], ['reverse', { rr: '100' }, 'rate100']] as const) assert.deepEqual(evaluatePercentCard(kind, { ...values, ...patch }, chain), { ok: false, error })
  assert.equal(evaluatePercentCard('pp', { ...values, x: '0' }, chain).ok, true)
  assert.equal(evaluatePercentCard('of', { ...values, a: '0' }, chain).ok, true)
})
await check('finite operands overflow is rejected before display and snapshot, with no new numeric amount cap', () => {
  const overflow: [PercentCard, Partial<PercentValues>][] = [['of', { a: '1e308', b: '1e308' }], ['ratio', { p: '1e308', w: '.1' }], ['change', { f: '-1e308', t: '1e308' }], ['discount', { dp: '1e308', dr: '99' }], ['reverse', { rs: '1e308', rr: '99' }], ['pp', { x: '-1e308', y: '1e308' }]]
  for (const [kind, patch] of overflow) {
    assert.deepEqual(evaluatePercentCard(kind, { ...values, ...patch }, chain), { ok: false, error: 'overflow' })
    assert.equal(createPercentSnapshot({ kind, values: { ...values, ...patch }, chain, decimals: 2, korean: false, main: '0', formula: '= 0' }, kind).ok, false)
  }
  assert.equal(evaluatePercentCard('vat', { ...values, v: '1e300' }, chain).ok, true)
  assert.deepEqual(evaluatePercentCard('of', { ...values, a: '9'.repeat(400) + '만' }, chain), { ok: false, error: 'invalid' })
  for (const invalid of [[], [''], ['101'], ['-1'], Array(6).fill('10')]) assert.equal(evaluatePercentCard('chain', values, invalid).ok, false)
})
await check('snapshot copies only related raw inputs and immutable full chain/settings without input normalization', () => {
  const input = { ...values, a: ' 5만 원 ', b: '15%' }, rates = ['30', '20']
  const result = createPercentSnapshot({ kind: 'of', values: input, chain: rates, decimals: 4, korean: true, main: '7,500', formula: '50,000 × 15 ÷ 100 = 7,500' }, 'one'); assert.ok(result.ok)
  input.a = 'edited'; rates[0] = '80'
  assert.deepEqual(result.snapshot.inputs, [{ key: 'a', raw: ' 5만 원 ' }, { key: 'b', raw: '15%' }]); assert.deepEqual(result.snapshot.chain, [])
  assert.equal(result.snapshot.decimals, 4); assert.equal(result.snapshot.korean, true)
  assert.ok(Object.isFrozen(result.snapshot) && Object.isFrozen(result.snapshot.inputs) && Object.isFrozen(result.snapshot.inputs[0]))
  assert.throws(() => { (result.snapshot.inputs[0] as { raw: string }).raw = 'changed' }, TypeError)
  const captured = create('chain', 'chain'); assert.deepEqual(captured.chain, ['30', '20']); assert.deepEqual(captured.inputs, [{ key: 'cp', raw: '100000' }]); assert.ok(Object.isFrozen(captured.chain))
})
await check('six records never evict, duplicate ids and identical snapshots reject before limit, remove keeps order', () => {
  let items: readonly PercentSnapshot[] = []
  for (let n = 0; n < 6; n++) { const next = addPercentSnapshot(items, create(String(n))); assert.ok(next.ok); items = next.items }
  const original = items
  assert.deepEqual(addPercentSnapshot(items, create('seventh')), { ok: false, error: 'limit' }); assert.equal(items, original)
  assert.deepEqual(addPercentSnapshot(items, Object.freeze({ ...items[0], id: 'same-snapshot' })), { ok: false, error: 'duplicate' })
  assert.deepEqual(addPercentSnapshot(items, Object.freeze({ ...items[0], main: 'new' })), { ok: false, error: 'duplicate' })
  items = removePercentSnapshot(items, '2'); assert.deepEqual(items.map(x => x.id), ['0', '1', '3', '4', '5']); assert.equal(original.length, 6)
  assert.ok(addPercentSnapshot(items, Object.freeze({ ...original[2], decimals: 3, id: 'new' })).ok)
})
await check('whole text preserves order and every raw field/formula including CRLF and no preview truncation', () => {
  const long = ' '.repeat(5000) + '5万' // rendering is string-preserving, not reparsing a saved snapshot.
  const a = create('a'), b = create('b', 'chain')
  const captured = Object.freeze({ ...a, inputs: Object.freeze([{ key: 'a' as const, raw: long + '\r\n=literal' }, a.inputs[1]]) })
  const t = (key: string, options?: Record<string, string | number>) => key + (options?.n ?? '')
  const text = percentComparisonText([captured, b], t)
  assert.ok(text.includes(long + '\r\n=literal')); assert.ok(text.indexOf('1. of.title') < text.indexOf('2. chain.title'))
  assert.ok(text.includes('chain.step1: 30') && text.includes('chain.step2: 20')); assert.ok(text.includes(a.formula) && text.includes(b.formula))
  assert.equal(percentComparisonText([], t), '')
})
await check('owned query replacement preserves foreign repeated keys and hash, without mutating caller values', () => {
  const original = 'https://toolhub.ai.kr/percent-calculator/?keep=x&keep=y&a=old&a=duplicate&c=80&d=4&k=1#retained'
  const next = new URL(percentStateUrl(original, { ...values, a: '120' }, values, chain, chain, 2, 2, false))
  assert.deepEqual(next.searchParams.getAll('keep'), ['x', 'y']); assert.deepEqual(next.searchParams.getAll('a'), ['120']); assert.equal(next.hash, '#retained')
  for (const key of ['c', 'd', 'k']) assert.equal(next.searchParams.has(key), false)
  assert.equal(values.a, '50000'); assert.ok(original.includes('a=duplicate'))
})
await check('copy reports actual fallback true only and missing/reject/throw failures remain failures', async () => {
  for (const writeText of [undefined, async () => { throw Error('denied') }, () => { throw Error('sync') }]) {
    for (const fallback of [() => false, () => { throw Error('blocked') }]) assert.equal(await copyPercentText('whole', () => true, { writeText, fallback }), 'failed')
    assert.equal(await copyPercentText('whole', () => true, { writeText, fallback: text => text === 'whole' }), 'success')
  }
  assert.equal(await copyPercentText('whole', () => true, { writeText: async () => {}, fallback: () => { throw Error('unexpected') } }), 'success')
})
await check('shared card/list/download owner prevents late fallback in both directions and ABA/unmount feedback', async () => {
  for (const [old, latest] of [['of', 'comparison'], ['comparison', 'ratio'], ['comparison', 'download']] as const) {
    const owner = createPercentOutputOwner(), token = owner.begin(old), pending = deferred(), fallback: string[] = []
    const result = copyPercentText('old', () => owner.current(token), { writeText: () => pending.promise, fallback: text => { fallback.push(text); return true } })
    const current = owner.begin(latest); assert.equal(owner.current(current), true); pending.reject(Error('late')); assert.equal(await result, 'stale'); assert.deepEqual(fallback, [])
  }
  for (const transition of ['input', 'localeABA', 'dispose'] as const) {
    const owner = createPercentOutputOwner(), token = owner.begin('of'), pending = deferred()
    const result = copyPercentText('captured', () => owner.current(token), { writeText: () => pending.promise, fallback: () => true })
    if (transition === 'dispose') { owner.dispose(); owner.mount() } else { owner.invalidate(); owner.invalidate() }
    pending.resolve(); assert.equal(await result, 'stale')
  }
})
await check('TXT dispatch uses the entire click snapshot with honest failure and stale no-dispatch', () => {
  const full = '한글 😀\r\n'.repeat(20000), calls: string[] = [], owner = createPercentOutputOwner(), token = owner.begin('download')
  assert.equal(downloadPercentText(full, () => owner.current(token), { save(text, filename) { assert.equal(filename, 'percent-comparison.txt'); calls.push(text) } }), 'success'); assert.deepEqual(calls, [full])
  assert.equal(downloadPercentText(full, () => true, { save() { throw Error('unavailable') } }), 'failed')
  owner.invalidate(); assert.equal(downloadPercentText(full, () => owner.current(token), { save() { throw Error('must not run') } }), 'stale')
  assert.equal(downloadPercentText('', () => true, { save() { throw Error('empty') } }), 'failed')
})
console.log(`Percent comparison: ${groups} groups passed`)
