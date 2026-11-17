import assert from 'node:assert/strict'
import { convertUnitBatch, serializeUnitBatch } from '../../../src/utils/unitBatch.ts'
import { UNITS } from '../../../src/utils/units.ts'

// UNITS supplies IDs for coverage only. convert/formatNum/parseInput are never called as oracles.
const pair = (c = 'length', f = 'm', t = 'cm', p = 15, rb = 16) => ({ c, f, t, p, rb })
const snapshot = (source, settings = pair()) => {
  const result = convertUnitBatch(source, settings)
  assert.equal(result.ok, true)
  return result.snapshot
}
const output = (source, settings) => {
  const rows = snapshot(String(source), settings).rows
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'valid')
  return rows[0].output
}
const near = (actual, expected, tolerance = 3e-12) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} is not close to ${expected}`)
const labels = { headers: ['Line', 'Raw', 'From', 'Converted', 'To', 'Status', 'Precision', 'CSS basis'], valid: 'Valid', blank: 'Blank', error: code => `Error:${code}` }
let groups = 0, roundtrips = 0
function check(name, run) { run(); groups++; console.log(`PASS ${name}`) }

// Independent record scanner: each CRLF is one boundary, and the last boundary terminates a row.
function physicalRows(source) {
  if (!source) return []
  const rows = []; let start = 0, i = 0
  for (; i < source.length; i++) {
    if (source[i] !== '\r' && source[i] !== '\n') continue
    rows.push(source.slice(start, i))
    if (source[i] === '\r' && source[i + 1] === '\n') i++
    start = i + 1
  }
  if (start < source.length) rows.push(source.slice(start))
  return rows
}

// Independent delimited-text state machine. Does not split on physical lines inside quotes.
function parseDelimited(text, delimiter) {
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0, row = [], field = '', quoted = false, closed = false
  const rows = []
  for (; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') { quoted = false; closed = true }
      else field += ch
      continue
    }
    if (ch === delimiter) { row.push(field); field = ''; closed = false; continue }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''; closed = false; continue
    }
    if (ch === '"') { assert.equal(field, ''); assert.equal(closed, false); quoted = true; continue }
    assert.equal(closed, false, 'unexpected data after quoted field'); field += ch
  }
  assert.equal(quoted, false, 'unterminated quote'); row.push(field); rows.push(row)
  return rows
}

check('independent definition anchors cover linear, offset, reciprocal, CSS and traditional pairs', () => {
  const examples = [
    ['length', 'inch', 'mm', 12, 304.8], ['length', 'nmi', 'm', 3, 5556], ['length', 'yd', 'ft', 7, 21],
    ['weight', 'lb', 'g', 4, 1814.36948], ['weight', 'oz', 'lb', 32, 2], ['weight', 'don', 'g', 8, 30],
    ['area', 'ha', 'm2', 1.25, 12500], ['area', 'pyeong', 'm2', 121, 400],
    ['volume', 'usGal', 'L', 2, 7.570823568], ['volume', 'm3', 'mL', .125, 125000],
    ['temperature', 'degF', 'degC', -40, -40], ['temperature', 'degC', 'K', -273.15, 0], ['temperature', 'degC', 'degF', 37, 98.6],
    ['speed', 'kmh', 'mps', 90, 25], ['speed', 'knot', 'kmh', 10, 18.52],
    ['data', 'MiB', 'byte', 2, 2097152], ['data', 'MB', 'byte', 2, 2000000], ['data', 'byte', 'bit', 2, 16],
    ['time', 'week', 'h', .5, 84], ['pressure', 'atm', 'Pa', 2, 202650], ['pressure', 'bar', 'kPa', .75, 75],
    ['energy', 'kWh', 'J', .5, 1800000], ['energy', 'cal', 'J', 10, 41.84],
    ['fuel', 'kmL', 'L100km', 25, 4], ['fuel', 'L100km', 'kmL', -5, -20],
    ['cooking', 'cupKr', 'tbsp', .3, 4], ['cooking', 'tbsp', 'tsp', 2, 6],
    ['css', 'inch', 'px', 1.5, 144], ['css', 'pt', 'px', 9, 12],
  ]
  for (const [c, f, t, input, expected] of examples) near(output(input, pair(c, f, t)), expected)
  near(output(2.25, pair('css', 'rem', 'px', 15, 18)), 40.5)
  near(output(40.5, pair('css', 'px', 'em', 15, 18)), 2.25)
})
check('every category/unit ordered pair reverses raw numeric output independently of formatting', () => {
  for (const [category, units] of Object.entries(UNITS)) {
    const bases = category === 'css' ? [9.5, 16, 27] : [16]
    for (const rb of bases) for (const from of units) for (const to of units) for (const original of [-123.125, .00390625, 1, 28.5, 10000]) {
      const converted = output(original, pair(category, from.id, to.id, 4, rb))
      const restored = output(converted, pair(category, to.id, from.id, 4, rb))
      near(restored, original, 2e-9); roundtrips++
    }
  }
  assert.ok(roundtrips > 5000)
})
check('raw lexemes, blanks, tabs and invalid numbers have independent per-row outcomes', () => {
  const inputs = ['', ' ', '\t', '1\t2', '1,25', ' 1 _ 2 ', '0b1010', '0o17', '0x20', '1e-3', '-0', '+2', 'Infinity', '-Infinity', 'NaN', '2oops', '\u00a0', '0']
  const expected = ['blank', 'blank', 'columns', 'columns', 12500, 1200, 1000, 1500, 3200, .1, 0, 200, 'invalidNumber', 'invalidNumber', 'invalidNumber', 'invalidNumber', 'blank', 0]
  const result = snapshot(inputs.join('\n'))
  assert.deepEqual(result.rows.map(row => row.raw), inputs)
  result.rows.forEach((row, i) => {
    assert.equal(row.line, i + 1)
    if (typeof expected[i] === 'number') { assert.equal(row.status, 'valid'); near(row.output, expected[i]) }
    else assert.equal(row.status === 'invalid' ? row.error : row.status, expected[i])
  })
  assert.deepEqual([result.valid, result.invalid, result.blank], [9, 6, 3])
})
check('independent physical-row scanner matches mixed endings and randomized empty lines', () => {
  let seed = 987654321
  const pick = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n }
  const tokens = ['1', '', '  ', '\t', 'bad', '-2'], endings = ['\r', '\n', '\r\n']
  const cases = ['', '\n', '\r', '\r\n', '\n\n', '\r\n\n', '\n\r', '1\r\n\r\n', '1\n\r2']
  for (let run = 0; run < 400; run++) {
    let source = ''; const size = pick(40) + 1
    for (let i = 0; i < size; i++) source += tokens[pick(tokens.length)] + endings[pick(endings.length)]
    if (pick(2)) source += tokens[pick(tokens.length)]
    cases.push(source)
  }
  for (const source of cases) {
    const result = snapshot(source), expected = physicalRows(source)
    assert.deepEqual(result.rows.map(row => row.raw), expected)
    assert.deepEqual(result.rows.map(row => row.line), expected.map((_row, i) => i + 1))
    assert.equal(result.valid + result.invalid + result.blank, expected.length)
  }
})
check('whole-input limits and finite-output checks cannot produce silent partial success', () => {
  assert.equal(snapshot('0'.repeat(50000)).rows[0].output, 0)
  assert.deepEqual(convertUnitBatch('0'.repeat(50001), pair()), { ok: false, error: 'tooManyCharacters' })
  assert.equal(snapshot('😀'.repeat(25000)).rows[0].error, 'invalidNumber')
  assert.deepEqual(convertUnitBatch('😀'.repeat(25001), pair()), { ok: false, error: 'tooManyCharacters' })
  assert.equal(snapshot(Array(1000).fill('0').join('\r\n') + '\r\n').rows.length, 1000)
  assert.deepEqual(convertUnitBatch(Array(1001).fill('0').join('\n'), pair()), { ok: false, error: 'tooManyRows' })
  const rows = snapshot('1e308\n-1e308\n1\n0').rows
  assert.deepEqual(rows.map(row => row.status === 'invalid' ? row.error : row.output), ['nonFiniteResult', 'nonFiniteResult', 100, 0])
  assert.equal(snapshot('0', pair('fuel', 'kmL', 'L100km')).rows[0].error, 'nonFiniteResult')
  for (const invalid of [{ ...pair(), c: 'traditional' }, { ...pair(), t: 'kg' }, { ...pair(), extra: 'x' }, { ...pair(), p: 5 }, { ...pair(), rb: 0 }]) assert.deepEqual(convertUnitBatch('1', invalid), { ok: false, error: 'invalidPair' })
})
check('snapshot immutability includes settings, source and every row; known display rounding remains stable', () => {
  const settings = pair('css', 'rem', 'px', 4, 18), source = '1.234567\n\ninvalid', result = snapshot(source, settings)
  const before = serializeUnitBatch(result, 'csv', labels)
  settings.rb = 100; settings.p = 15; settings.t = 'inch'
  assert.equal(result.rows[0].formatted, '22.22'); assert.equal(result.source, source)
  for (const mutate of [() => { result.source = 'changed' }, () => { result.pair.rb = 2 }, () => { result.rows[0].raw = 'other' }, () => result.rows.pop()]) assert.throws(mutate, TypeError)
  assert.equal(serializeUnitBatch(result, 'csv', labels), before)
  assert.equal(snapshot('1.234567', pair('length', 'm', 'm', 6)).rows[0].formatted, '1.23457')
  assert.equal(snapshot('0.000000001', pair('length', 'm', 'cm', 4)).rows[0].formatted, '1e-7')
})
check('full CSV/TSV independent parser preserves every row and spreadsheet-safe raw cells', () => {
  const originals = ['=1+1', '+12', '-2', '@SUM(A1)', ' \uFEFF=cmd()', '\u200B@cmd', '\t@cmd', '"quoted, value"', "'already quoted", '1,234', '', '  ', '5']
  while (originals.length < 1000) originals.push(String(originals.length + 1))
  const result = snapshot(originals.join('\n'))
  const tricky = { headers: ['=header', 'Raw,source', 'From"unit', 'Converted\r\nvalue', 'To\tunit', 'Status', 'Precision', 'CSS basis'], valid: '+OK', blank: '@Blank', error: code => ` \n=${code}` }
  for (const format of ['csv', 'tsv']) {
    const serialized = serializeUnitBatch(result, format, tricky), records = parseDelimited(serialized, format === 'csv' ? ',' : '\t')
    assert.equal(serialized.startsWith('\uFEFF'), format === 'csv'); assert.equal(records.length, 1001)
    assert.equal(records[0][0], "'=header"); assert.equal(records[0][3], 'Converted\r\nvalue'); assert.equal(records[0][4], 'To\tunit')
    records.slice(1).forEach((record, index) => {
      const raw = originals[index], row = result.rows[index]
      assert.equal(record.length, 8); assert.equal(record[0], String(index + 1))
      assert.equal(record[1], raw ? `'${raw}` : '')
      assert.equal(raw ? record[1].slice(1) : record[1], raw)
      assert.equal(record[2], 'm'); assert.equal(record[4], 'cm'); assert.equal(record[6], '15'); assert.equal(record[7], '')
      assert.equal(record[3], row.status === 'valid' ? row.formatted : '')
      assert.ok(record[5].startsWith("'")); assert.equal(record[5].slice(1), row.status === 'valid' ? '+OK' : row.status === 'blank' ? '@Blank' : ` \n=${row.error}`)
    })
    assert.equal(records[3][3], '-200') // Generated signed results remain numeric, while the input remains text.
    assert.equal(records.at(-1)[0], '1000'); assert.equal(records.at(-1)[3], '100000')
  }
  const css = parseDelimited(serializeUnitBatch(snapshot('2', pair('css', 'rem', 'px', 4, 18)), 'csv', labels), ',')
  assert.equal(css[1][3], '36'); assert.equal(css[1][7], '18')
})
console.log(`Unit batch independent: ${groups} groups PASS; ${roundtrips} ordered-pair numeric roundtrips`)
