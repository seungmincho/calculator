import assert from 'node:assert/strict'
import {
  DISCOUNT_COMPARISON_LIMITS as L, DISCOUNT_COMPARISON_FIELDS as F, createDiscountComparisonExamples,
  createDiscountCondition, evaluateDiscountComparison as evaluate, captureDiscountComparison as capture,
  compareDiscountUnitAmounts, encodeDiscountComparison as encode, decodeDiscountComparison as decode,
  discountComparisonUrl, formatDiscountComparison, type DiscountConditionDraft,
} from '../src/utils/discountComparison.ts'

const row = (id = 'a', values: Partial<DiscountConditionDraft> = {}): DiscountConditionDraft => ({ id, name: '', unitPrice: '100', quantity: '1', coupon: '0', shipping: '0', ...values })
let groups = 0
function check(name: string, run: () => void) { run(); groups++; console.log('PASS', name) }

check('independent BigInt oracle checks 840 exact integer cart totals, coupons and source bounds', () => {
  let checked = 0
  for (const price of [0, 1, 99, 1000, 999_999_999, L.unitPrice]) for (const quantity of [1, 2, 3, 500, 999]) for (const coupon of [0, 1, 99, 1000, 999_000_000_000, L.coupon, 123456789]) for (const shipping of [0, 1, 999, L.shipping]) {
    const result = evaluate([row('a', { unitPrice: String(price), quantity: String(quantity), coupon: String(coupon), shipping: String(shipping) })]).rows[0].result!
    const goods = BigInt(price) * BigInt(quantity), applied = goods < BigInt(coupon) ? goods : BigInt(coupon), payable = goods - applied, total = payable + BigInt(shipping)
    assert.equal(result.subtotal, Number(goods)); assert.equal(result.appliedCoupon, Number(applied)); assert.equal(result.excessCoupon, coupon - Number(applied)); assert.equal(result.goodsTotal, Number(payable)); assert.equal(result.total, Number(total)); assert.equal(result.unitAverage, Number(total) / quantity); checked++
  }
  assert.equal(checked, 840)
  assert.ok(Number.isSafeInteger(999_010_000_000 * 999)); assert.equal(BigInt(999_010_000_000 * 999), 998_010_990_000_000n)
})

check('total and unit winners differ with quantity, exact rational ties retain all IDs and original order', () => {
  const rows = [row('small', { unitPrice: '10', quantity: '1' }), row('bulk', { unitPrice: '6', quantity: '2' }), row('bulk-tie', { unitPrice: '6', quantity: '3' })]
  const e = evaluate(rows); assert.deepEqual(e.lowestTotalIds, ['small']); assert.deepEqual(e.lowestUnitIds, ['bulk', 'bulk-tie']); assert.deepEqual(e.rows.map(item => item.id), rows.map(item => item.id))
  const zeros = evaluate([row('zero-a', { coupon: '1000' }), row('zero-b', { unitPrice: '0', quantity: '999' })]); assert.deepEqual(zeros.lowestTotalIds, ['zero-a', 'zero-b']); assert.deepEqual(zeros.lowestUnitIds, ['zero-a', 'zero-b'])
  const fractional = evaluate([row('first', { unitPrice: '0', quantity: '998', shipping: '1' }), row('second', { unitPrice: '0', quantity: '999', shipping: '1' })])
  assert.equal(fractional.rows[0].result!.unitAverage.toFixed(2), fractional.rows[1].result!.unitAverage.toFixed(2)); assert.deepEqual(fractional.lowestUnitIds, ['second']); assert.deepEqual(fractional.lowestTotalIds, ['first', 'second'])
})

check('all valid fraction orderings agree with a separate BigInt cross-product oracle including the largest products', () => {
  const values = [0, 1, 10, 99, 100000, 999_010_000_000], quantities = [1, 2, 3, 998, 999]
  for (const a of values) for (const b of values) for (const q of quantities) for (const r of quantities) {
    const left = BigInt(a) * BigInt(r), right = BigInt(b) * BigInt(q), expected = left < right ? -1 : left > right ? 1 : 0
    assert.equal(compareDiscountUnitAmounts({ total: a, quantity: q }, { total: b, quantity: r }), expected)
  }
})

check('blank is not zero; malformed/ranged integers and names remain invalid, partial rows never receive winners or partial exports', () => {
  for (const field of F) {
    for (const value of ['', ' ', '\t']) { const draft = row('b', { [field]: value }), e = evaluate([row(), draft]); assert.equal(e.validCount, 1); assert.equal(e.rows[1].status, 'missing'); assert.equal(draft[field], value); assert.deepEqual(e.lowestTotalIds, []); assert.deepEqual(e.lowestUnitIds, []); assert.equal(capture([row(), draft]), null); assert.equal(encode([row(), draft]), null) }
    for (const value of ['-1', '+1', '0.5', '1e2', 'Infinity', 'NaN', '1,000', ' 1', '1 ', '０', '1\n', '0'.repeat(33), String(L[field] + 1)]) assert.equal(evaluate([row('a', { [field]: value })]).allReady, false, field + '=' + value)
    assert.equal(evaluate([row('a', { [field]: '0' })]).allReady, field !== 'quantity')
  }
  assert.equal(evaluate([row('a', { name: '😀'.repeat(40) })]).allReady, true); assert.equal(evaluate([row('a', { name: '😀'.repeat(41) })]).allReady, false)
  assert.equal(evaluate([row('a', { name: 'nul\0name' })]).allReady, false)
  const draft = row('a', { unitPrice: '0001', name: 'one\r\ntwo' }); const c = capture([draft])!; assert.equal(c.rows[0].name, 'one two'); assert.equal(c.rows[0].unitPrice, 1); assert.equal(draft.unitPrice, '0001'); assert.deepEqual(c.lowestTotalIds, [])
})

check('duplicate/bad IDs, unsupported shapes and count limits cannot produce a successful snapshot', () => {
  for (const rows of [[], Array.from({ length: 5 }, (_, i) => row('a' + i)), [row(), row()], [row('')], [row('unsafe id')], [null], [{ ...row(), id: undefined }], [{ ...row(), name: null }], null]) assert.equal(capture(rows as unknown as DiscountConditionDraft[]), null)
  assert.equal(capture(Array.from({ length: 4 }, (_, i) => row('a' + i)))!.rows.length, 4)
})

check('captured snapshots project exact fields and stay frozen after original rows and arrays are edited', () => {
  const originals = [{ ...row('a'), extra: 'must not leave' }, { ...row('b'), name: 'same' }]
  const snapshot = capture(originals)!; originals[0].unitPrice = '999'; originals[1].name = 'changed'; originals.reverse()
  assert.equal(snapshot.rows[0].unitPrice, 100); assert.equal(snapshot.rows[1].name, 'same'); assert.ok(!Object.hasOwn(snapshot.rows[0], 'extra')); assert.ok(Object.isFrozen(snapshot)); assert.ok(Object.isFrozen(snapshot.rows)); assert.ok(Object.isFrozen(snapshot.rows[0])); assert.ok(Object.isFrozen(snapshot.lowestUnitIds))
  const first = createDiscountComparisonExamples(), second = createDiscountComparisonExamples(); assert.notEqual(first, second); assert.notEqual(first[0], second[0]); assert.equal(evaluate(first).allReady, true)
})

check('current-result imports apply exactly existing Math.round once and never clamp invalid or excessive source amounts', () => {
  for (const value of [0, 0.49, 0.5, 1.5, 199.4999, 999_999_999.9, 1_000_000_000.49]) {
    const imported = createDiscountCondition('new', value)!; assert.equal(imported.unitPrice, String(Math.round(value))); assert.equal(imported.quantity, '1'); assert.equal(imported.coupon, '0'); assert.equal(imported.shipping, '0')
  }
  for (const value of [-1, -0.01, NaN, Infinity, 1_000_000_000.5]) assert.equal(createDiscountCondition('new', value), null)
  assert.equal(createDiscountCondition('bad id', 1), null); assert.equal(createDiscountCondition('new')!.unitPrice, '')
})

check('numeric-only v1 round trips all four rows and excludes every custom name, ID and computed result', () => {
  const drafts = Array.from({ length: 4 }, (_, i) => row('private-' + i, { name: '비밀 이름 ' + i, unitPrice: String(i ? L.unitPrice : 0), quantity: String(i ? 999 : 1), coupon: String(L.coupon), shipping: String(L.shipping) }))
  const raw = encode(drafts)!; assert.ok(raw.length <= 154); assert.ok(!raw.includes('private')); assert.ok(!raw.includes('이름'))
  const decoded = decode(raw); assert.equal(decoded.kind, 'ready'); if (decoded.kind !== 'ready') return
  assert.equal(decoded.rows.length, 4); decoded.rows.forEach((value, index) => { assert.equal(value.name, ''); for (const field of F) assert.equal(Number(value[field]), Number(drafts[index][field])) })
  assert.equal(encode(decoded.rows), raw)
  const url = discountComparisonUrl('https://toolhub.ai.kr/discount-calculator/?mode=discountAmount&amount=7&other=kept#results', drafts)!
  assert.equal(new URL(url).searchParams.get('compare'), raw); assert.equal(new URL(url).searchParams.get('mode'), 'discountAmount'); assert.equal(new URL(url).searchParams.get('other'), 'kept'); assert.equal(new URL(url).hash, '#results'); assert.ok(!decodeURIComponent(url).includes('비밀'))
  assert.equal(discountComparisonUrl('javascript:alert(1)', drafts), null)
})

check('URL parsing is bounded and atomic, rejects unknown versions and every malformed tuple, and accepts the exact 256-character boundary', () => {
  assert.equal(decode(null).kind, 'absent'); assert.equal(decode(undefined).kind, 'absent')
  for (const raw of ['', 'v2:1,1,0,0', 'v1:', 'v1:1,1,0', 'v1:1,1,0,0,extra', 'v1:1,0,0,0', 'v1:1,1,0,0;', 'v1:1,1,0,0;bad', 'v1:' + Array(5).fill('1,1,0,0').join(';'), 'v1:1.1,1,0,0', 'v1:-1,1,0,0', 'v1:1e2,1,0,0', 'v1:1,1,0,10000001', {}, 1]) assert.equal(decode(raw).kind, 'invalid')
  const tuples = Array.from({ length: 4 }, (_, i) => F.map((field, j) => (field === 'quantity' ? '1' : '0').padStart(i === 0 && j < 2 ? 14 : 15, '0')).join(','))
  const exact = 'v1:' + tuples.join(';'); assert.equal(exact.length, 256); assert.equal(decode(exact).kind, 'ready'); assert.equal(decode(exact + '0').kind, 'invalid')
})

check('full text exports every exact condition and coupon detail in original order from the same immutable snapshot', () => {
  const snapshot = capture([row('a', { name: 'A', coupon: '1000', shipping: '8' }), row('b', { name: 'B', unitPrice: '1', quantity: '3' })])!
  const fields = { unitPrice: 'price', quantity: 'quantity', coupon: 'coupon', shipping: 'shipping', subtotal: 'subtotal', appliedCoupon: 'applied', excessCoupon: 'excess', goodsTotal: 'goods', total: 'total', unitAverage: 'average' }
  const text = formatDiscountComparison(snapshot, { title: 'TITLE', formula: 'FORMULA', averageHint: 'ROUND', sourceHint: 'ASSUMPTION', defaultName: n => 'Condition ' + n, fields, lowestTotal: 'TOTAL LOW', lowestUnit: 'UNIT LOW', none: 'ADD CONDITION', money: (value, average) => average ? value.toFixed(2) : String(value) })
  assert.ok(text.indexOf('[1] A') < text.indexOf('[2] B')); assert.match(text, /coupon: 1000\nsubtotal: 100\napplied: 100\nexcess: 900\ngoods: 0\nshipping: 8\ntotal: 8\naverage: 8.00/); assert.match(text, /TOTAL LOW: \[2\] B/); assert.match(text, /UNIT LOW: \[2\] B/)
})
console.log(`Discount comparison preparation: ${groups} groups passed; exact BigInt oracle and bounded numeric links`)
