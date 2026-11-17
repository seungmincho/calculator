import assert from 'node:assert/strict'
import { convertUnitBatch, serializeUnitBatch, UNIT_BATCH_MAX_CHARACTERS, UNIT_BATCH_MAX_ROWS, UNIT_BATCH_PREVIEW_ROWS, type UnitBatchSnapshot } from '../src/utils/unitBatch.ts'
import type { UnitFavoritePair } from '../src/utils/unitFavorites.ts'

const base: UnitFavoritePair = { c: 'length', f: 'm', t: 'cm', p: 10, rb: 16 }
const labels = { headers: ['Line', 'Input', 'From', 'Result', 'To', 'Status', 'Precision', 'Base px'] as const, valid: 'OK', blank: 'Blank', error: (code: string) => code }
function snapshot(source: string, pair = base): UnitBatchSnapshot { const result = convertUnitBatch(source, pair); assert.equal(result.ok, true); if (!result.ok) throw new Error(result.error); return result.snapshot }
function values(source: string, pair = base) { return snapshot(source, pair).rows.map(row => { assert.equal(row.status, 'valid'); return row.status === 'valid' ? row.output : NaN }) }
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= 1e-11 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`)
let groups = 0
function test(name: string, run: () => void) { run(); groups++; console.log('PASS', name) }

test('linear conversion retains negatives, zero, exponents, grouping and original lexemes', () => {
  const source = '1\n-2\n0\n1e-9\n1,234.5\n 3 \n0x10'
  values(source).forEach((value, index) => near(value, [100, -200, 0, 1e-7, 123450, 300, 1600][index]))
  const tiny = snapshot('1e-9').rows[0]; assert.equal(tiny.status === 'valid' && tiny.formatted, '1e-7')
  assert.equal(snapshot(source).rows[5].raw, ' 3 ')
  const pounds = values('1\n2', { ...base, c: 'weight', f: 'lb', t: 'kg' }); near(pounds[0], .45359237); near(pounds[1], .90718474)
})
test('offset temperatures and same-unit conversions follow existing arithmetic', () => {
  const temperatures = values('-40\n0\n100', { ...base, c: 'temperature', f: 'degC', t: 'degF' })
  temperatures.forEach((value, index) => near(value, [-40, 32, 212][index]))
  assert.deepEqual(values('0\n-5\n123', { ...base, f: 'm', t: 'm' }), [0, -5, 123])
})
test('reciprocal fuel values report nonfinite zero without dropping later valid rows', () => {
  const rows = snapshot('0\n10\n-20', { ...base, c: 'fuel', f: 'kmL', t: 'L100km' }).rows
  assert.deepEqual(rows[0], { line: 1, raw: '0', status: 'invalid', error: 'nonFiniteResult' })
  assert.equal(rows[1].status === 'valid' && rows[1].output, 10); assert.equal(rows[2].status === 'valid' && rows[2].output, -5)
})
test('CSS base and significant figures are captured instead of reading later settings', () => {
  const pair: UnitFavoritePair = { ...base, c: 'css', f: 'rem', t: 'px', rb: 20, p: 4 }, result = snapshot('1.234567', pair)
  pair.rb = 16; pair.p = 15
  assert.equal(result.pair.rb, 20); assert.equal(result.rows[0].status === 'valid' && result.rows[0].formatted, '24.69')
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.pair) && Object.isFrozen(result.rows) && Object.isFrozen(result.rows[0]))
})
test('physical blank lines survive; one final newline is a terminator', () => {
  assert.equal(snapshot('').rows.length, 0)
  const result = snapshot('1\r\n\r\n2\r3\n\n')
  assert.deepEqual(result.rows.map(row => [row.line, row.raw, row.status]), [[1, '1', 'valid'], [2, '', 'blank'], [3, '2', 'valid'], [4, '3', 'valid'], [5, '', 'blank']])
  assert.deepEqual([result.valid, result.invalid, result.blank], [3, 0, 2]); assert.equal(snapshot('\n').blank, 1)
})
test('tabs, text, nonfinite input and finite-input overflow remain explicit error rows', () => {
  const result = snapshot('1\t2\n\t\nabc\nInfinity\n1e308\n4')
  assert.deepEqual(result.rows.map(row => row.status === 'invalid' ? row.error : row.status), ['columns', 'columns', 'invalidNumber', 'invalidNumber', 'nonFiniteResult', 'valid'])
  assert.deepEqual([result.valid, result.invalid, result.blank], [1, 5, 0])
})
test('whole-input boundaries reject without returning a truncated success', () => {
  assert.equal(snapshot(Array(UNIT_BATCH_MAX_ROWS).fill('1').join('\n') + '\n').rows.length, 1000)
  assert.deepEqual(convertUnitBatch(Array(1001).fill('1').join('\n'), base), { ok: false, error: 'tooManyRows' })
  assert.equal(snapshot(' '.repeat(UNIT_BATCH_MAX_CHARACTERS)).blank, 1)
  assert.deepEqual(convertUnitBatch(' '.repeat(UNIT_BATCH_MAX_CHARACTERS + 1), base), { ok: false, error: 'tooManyCharacters' })
})
test('invalid pairs, category summaries, missing units and precision cannot run', () => {
  for (const pair of [null, {}, { ...base, c: 'traditional' }, { ...base, t: 'kg' }, { ...base, p: 0 }, { ...base, rb: Infinity }]) assert.deepEqual(convertUnitBatch('1', pair), { ok: false, error: 'invalidPair' })
})
test('full CSV and TSV include every row beyond the bounded preview', () => {
  const result = snapshot(Array.from({ length: 1000 }, (_, index) => String(index + 1)).join('\n'))
  assert.equal(result.rows.slice(0, UNIT_BATCH_PREVIEW_ROWS).length, 200)
  const csv = serializeUnitBatch(result, 'csv', labels), tsv = serializeUnitBatch(result, 'tsv', labels)
  assert.equal(csv.charCodeAt(0), 0xfeff); assert.equal(csv.split('\r\n').length, 1001); assert.equal(tsv.split('\r\n').length, 1001)
  assert.ok(tsv.endsWith("1000\t'1000\tm\t100000\tcm\tOK\t10\t"))
})
test('export preserves original text, quotes errors and protects spreadsheet formula inputs', () => {
  const result = snapshot('=1+1\n1,000\n"x"\n\t@evil\n\n-2')
  const csv = serializeUnitBatch(result, 'csv', labels), tsv = serializeUnitBatch(result, 'tsv', labels)
  assert.ok(csv.includes("1,'=1+1,m,,cm,invalidNumber,10,")); assert.ok(csv.includes('"\'1,000"')); assert.ok(csv.includes('"\'""x"""'))
  assert.ok(csv.includes("5,,m,,cm,Blank,10,")); assert.ok(tsv.includes("6\t'-2\tm\t-200\tcm\tOK"))
  assert.ok(tsv.includes('"\'\t@evil"'))
})
console.log(`Unit batch domain: ${groups} groups PASS`)
