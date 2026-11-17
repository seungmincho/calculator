import assert from 'node:assert/strict'
import { parseCsvRecords, serializeCsvRecords, convertJsonCsv, csvSafeNumber, DEFAULT_JSON_CSV_OPTIONS as defaults, JSON_CSV_LIMITS as limits, JsonCsvError, type JsonCsvErrorCode, type JsonCsvOptions, type CsvDelimiter } from '../src/utils/jsonCsv.ts'
import { createJsonCsvActionGuard, readJsonCsvFile, copyJsonCsvText } from '../src/utils/jsonCsvActions.ts'

let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log('PASS', name) }
const fails = (run: () => unknown, code: JsonCsvErrorCode) => assert.throws(run, error => error instanceof JsonCsvError && error.code === code)
const options = (patch: Partial<JsonCsvOptions>): JsonCsvOptions => ({ ...defaults, ...patch })
const bytes = (text: string) => new TextEncoder().encode(text).buffer
const deferred = <T>() => { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { resolve, reject, promise } }

await check('RFC-style quoted fields preserve multilingual text, delimiters, escaped quotes and all embedded line endings', () => {
  const input = 'name,note,code\r\n한글,"line1\r\nline2\nline3\r끝, ""quote""",00123\r\n'
  const expected = [['name', 'note', 'code'], ['한글', 'line1\r\nline2\nline3\r끝, "quote"', '00123']]
  assert.deepEqual(parseCsvRecords(input), expected)
  for (const delimiter of [',', '\t', '|', ';'] as CsvDelimiter[]) {
    const rows = [[' a ', '"quoted"', `before${delimiter}after`, 'line\r\n다음'], ['', '', '', '']]
    assert.deepEqual(parseCsvRecords(serializeCsvRecords(rows, delimiter), delimiter, false), rows)
  }
})
await check('empty cells/records and terminal separators are not trimmed or silently dropped', () => {
  for (const newline of ['\n', '\r', '\r\n']) {
    assert.deepEqual(parseCsvRecords(newline, ',', false), [['']])
    assert.deepEqual(parseCsvRecords(`a${newline}`, ',', false), [['a']])
    assert.deepEqual(parseCsvRecords(`a${newline}${newline}`, ',', false), [['a'], ['']])
    assert.deepEqual(convertJsonCsv(`a,b${newline}`, 'csvToJson').rows, [])
  }
  assert.deepEqual(parseCsvRecords('""', ',', false), [['']])
  assert.deepEqual(parseCsvRecords(' ,\t ', ',', false), [[' ', '\t ']])
  fails(() => parseCsvRecords(''), 'empty')
  fails(() => parseCsvRecords('a,b\n\n'), 'width')
  assert.equal(convertJsonCsv('a,b', 'csvToJson').text, '[]')
})
await check('malformed quoting/width/header errors identify logical row and column without renaming keys', () => {
  for (const [input, code] of [['a\n"unterminated', 'unclosedQuote'], ['a\n"x" y', 'afterQuote'], ['a\nx"y', 'unexpectedQuote'], ['a,b\nx', 'width']] as const) {
    assert.throws(() => parseCsvRecords(input), error => error instanceof JsonCsvError && error.code === code && error.position.row === 2 && !!error.position.column)
  }
  fails(() => convertJsonCsv('a,a\nx,y', 'csvToJson'), 'duplicateHeader')
  fails(() => convertJsonCsv(' ,a\nx,y', 'csvToJson'), 'emptyHeader')
  assert.deepEqual(convertJsonCsv('a,A, a \nx,y,z', 'csvToJson').headers, ['a', 'A', ' a '])
  assert.deepEqual(convertJsonCsv('first,second\n,', 'csvToJson', options({ header: false })).headers, ['column_0', 'column_1'])
})
await check('strings are default; opt-in number grammar rejects identifiers, unsafe values, negative zero and whitespace', () => {
  const keep = ['00123', '+3', '.5', '1.', ' 3', '3 ', '-0', '-0.0', '-1e-999', '9007199254740992', '1e400', 'NaN', 'Infinity', '']
  for (const text of keep) assert.equal(csvSafeNumber(text), text)
  for (const [text, value] of [['1e3', 1000], ['-2.5', -2.5], ['0', 0], ['9007199254740991', Number.MAX_SAFE_INTEGER], ['0.125', 0.125]] as const) assert.equal(csvSafeNumber(text), value)
  const input = 'code,amount\n00123,1000'
  assert.deepEqual(JSON.parse(convertJsonCsv(input, 'csvToJson').text), [{ code: '00123', amount: '1000' }])
  assert.deepEqual(JSON.parse(convertJsonCsv(input, 'csvToJson', options({ numbers: true })).text), [{ code: '00123', amount: 1000 }])
})
await check('special names remain own data keys and later rows extend the common columns without prototype access', () => {
  const result = convertJsonCsv('__proto__,constructor,hasOwnProperty\na,b,c', 'csvToJson')
  const object = JSON.parse(result.text)[0]
  for (const key of result.headers) assert.ok(Object.hasOwn(object, key))
  assert.equal(object.__proto__, 'a'); assert.equal(object.constructor, 'b'); assert.equal(object.hasOwnProperty, 'c')
  const csv = convertJsonCsv('[{"__proto__":{"x":1},"constructor":2},{"later":3,"hasOwnProperty":4}]', 'jsonToCsv')
  assert.deepEqual(csv.headers, ['__proto__.x', 'constructor', 'later', 'hasOwnProperty'])
  assert.deepEqual(csv.rows, [['1', '2', '', ''], ['', '', '3', '4']])
  assert.equal(csv.stats.columns, 4); assert.equal(csv.stats.cells, 8)
})
await check('nested preserve/join/separate handle empty containers and collisions explicitly', () => {
  const input = '{"a":[{"x":1},[2],null],"b":[],"c":{}}'
  assert.deepEqual(convertJsonCsv(input, 'jsonToCsv').rows, [['{"x":1};[2];', '', '{}']])
  assert.deepEqual(convertJsonCsv(input, 'jsonToCsv', options({ nested: 'preserve' })).rows, [['[{"x":1},[2],null]', '[]', '{}']])
  const separate = convertJsonCsv(input, 'jsonToCsv', options({ arrayHandling: 'separate' }))
  assert.deepEqual(separate.headers, ['a[0].x', 'a[1][0]', 'a[2]', 'b', 'c'])
  assert.deepEqual(separate.rows, [['1', '2', '', '[]', '{}']])
  fails(() => convertJsonCsv('{"a.b":1,"a":{"b":2}}', 'jsonToCsv'), 'keyCollision')
  fails(() => convertJsonCsv('{"a[0]":1,"a":[2]}', 'jsonToCsv', options({ arrayHandling: 'separate' })), 'keyCollision')
  for (const invalid of ['[]', '[1]', '[{},null]', 'true', 'null', '[[{}]]']) fails(() => convertJsonCsv(invalid, 'jsonToCsv'), 'invalidShape')
  for (const empty of ['{}', '[{},{}]']) fails(() => convertJsonCsv(empty, 'jsonToCsv'), 'noColumns')
  fails(() => convertJsonCsv('{"n":1e400}', 'jsonToCsv'), 'nonFinite')
  fails(() => convertJsonCsv('{"n":9007199254740993}', 'jsonToCsv'), 'unsafeInteger')
  assert.equal(convertJsonCsv('{"n":"9007199254740993"}', 'jsonToCsv').rows[0][0], '9007199254740993')
})
await check('header/no-header confirmed rows match serialized bytes and retain the first row and trailing empty cell', () => {
  const input = JSON.stringify([{ a: 'one\ntwo', b: '' }, { a: ' three ', c: 'last' }])
  for (const header of [true, false]) {
    const result = convertJsonCsv(input, 'jsonToCsv', options({ header }))
    assert.deepEqual(parseCsvRecords(result.text, ',', header), header ? [result.headers, ...result.rows] : result.rows)
    assert.equal(result.stats.rows, 2); assert.equal(result.stats.columns, 3); assert.equal(result.stats.bytes, new TextEncoder().encode(result.text).length)
    assert.equal(result.format, 'csv'); assert.equal(result.filename, 'converted.csv')
  }
  const bom = convertJsonCsv('{"a":1}', 'jsonToCsv', options({ bom: true }))
  assert.ok(bom.text.startsWith('\uFEFFa\r\n1')); assert.equal(bom.stats.bytes, 7)
  const json = convertJsonCsv('a\n00123', 'csvToJson', options({ bom: true }))
  assert.deepEqual(JSON.parse(json.text), [{ a: '00123' }]); assert.ok(!json.text.startsWith('\uFEFF'))
})
await check('flatten intermediate keys and values are bounded before building the table, including header-disabled output', () => {
  const leaves = Object.fromEntries(Array.from({ length: 160 }, (_, index) => [`k${String(index).padStart(3, '0')}`, 1]))
  const under = JSON.stringify({ ['x'.repeat(52422)]: leaves }), over = JSON.stringify({ ['x'.repeat(52423)]: leaves })
  assert.equal(convertJsonCsv(under, 'jsonToCsv', options({ header: false })).stats.columns, 160)
  for (const header of [true, false]) fails(() => convertJsonCsv(over, 'jsonToCsv', options({ header })), 'intermediateLimit')
  const row = { ['x'.repeat(26000)]: leaves }
  fails(() => convertJsonCsv(JSON.stringify([row, row, row]), 'jsonToCsv', options({ header: false })), 'intermediateLimit')
})
await check('row/column/cell limits are exact and stop oversized tables rather than truncating them', () => {
  assert.equal(parseCsvRecords(Array(10_000).fill('x').join('\n'), ',', false).length, 10_000)
  fails(() => parseCsvRecords(Array(10_001).fill('x').join('\n'), ',', false), 'rowLimit')
  const row = Array(200).fill('x').join(',')
  assert.equal(parseCsvRecords(row, ',', false)[0].length, 200)
  fails(() => parseCsvRecords(row + ',x', ',', false), 'columnLimit')
  assert.equal(parseCsvRecords(Array(1000).fill(row).join('\n'), ',', false).length, 1000)
  fails(() => parseCsvRecords(Array(1001).fill(row).join('\n'), ',', false), 'cellLimit')
  const sparse = Array.from({ length: 1001 }, (_, index) => ({ [`key${index % 200}`]: index }))
  fails(() => convertJsonCsv(JSON.stringify(sparse), 'jsonToCsv'), 'cellLimit')
})
await check('UTF-8 input, JSON depth and incremental output limits protect boundary allocations', () => {
  assert.equal(parseCsvRecords('x'.repeat(limits.inputBytes), ',', false)[0][0].length, limits.inputBytes)
  fails(() => parseCsvRecords('x'.repeat(limits.inputBytes + 1), ',', false), 'inputLimit')
  fails(() => parseCsvRecords('가'.repeat(Math.floor(limits.inputBytes / 3) + 1), ',', false), 'inputLimit')
  const nested = (depth: number) => '{"a":'.repeat(depth) + '1' + '}'.repeat(depth)
  assert.equal(convertJsonCsv(nested(20), 'jsonToCsv').rows[0][0], '1')
  fails(() => convertJsonCsv(nested(21), 'jsonToCsv'), 'depthLimit')
  assert.equal(serializeCsvRecords([['x'.repeat(limits.outputBytes)]]).length, limits.outputBytes)
  fails(() => serializeCsvRecords([['x'.repeat(limits.outputBytes + 1)]]), 'outputLimit')
  fails(() => convertJsonCsv('k'.repeat(1000) + '\n' + Array(10_000).fill('x').join('\n'), 'csvToJson'), 'outputLimit')
})
await check('actual UTF-8/EUC-KR decoding is fatal, removes only one BOM and checks raw plus decoded sizes', async () => {
  const utf = bytes('\uFEFF\uFEFF한글'), euc = Uint8Array.from([0xc7, 0xd1, 0xb1, 0xdb]).buffer
  assert.deepEqual(await readJsonCsvFile({ size: utf.byteLength }, 'utf-8', async () => utf), { status: 'ready', text: '\uFEFF한글' })
  assert.deepEqual(await readJsonCsvFile({ size: euc.byteLength }, 'euc-kr', async () => euc), { status: 'ready', text: '한글' })
  for (const encoding of ['utf-8', 'euc-kr'] as const) assert.deepEqual(await readJsonCsvFile({ size: 1 }, encoding, async () => Uint8Array.from([0xc7]).buffer), { status: 'failed', error: 'encoding' })
  let reads = 0
  assert.deepEqual(await readJsonCsvFile({ size: limits.inputBytes + 1 }, 'utf-8', async () => { reads++; return bytes('') }), { status: 'failed', error: 'fileLimit' }); assert.equal(reads, 0)
  const expanded = new Uint8Array(limits.inputBytes)
  for (let index = 0; index < expanded.length; index += 2) { expanded[index] = 0xb0; expanded[index + 1] = 0xa1 }
  assert.deepEqual(await readJsonCsvFile({ size: expanded.byteLength }, 'euc-kr', async () => expanded.buffer), { status: 'failed', error: 'decodedLimit' })
})
await check('new reads/edit/mode/encoding/unmount revisions invalidate late file responses and errors', async () => {
  const guard = createJsonCsvActionGuard(), old = deferred<ArrayBuffer>(), token = guard.beginRead()
  const reading = readJsonCsvFile({ size: 3 }, 'utf-8', () => old.promise, () => guard.isCurrent(token))
  const latest = guard.beginRead(); old.resolve(bytes('old')); assert.deepEqual(await reading, { status: 'stale' })
  assert.ok(guard.isCurrent(latest)); guard.cancelRead(); assert.ok(!guard.isCurrent(latest))
  const failed = deferred<ArrayBuffer>(), next = guard.beginRead(), pending = readJsonCsvFile({ size: 3 }, 'utf-8', () => failed.promise, () => guard.isCurrent(next))
  guard.invalidate(); failed.reject(new Error('late')); assert.deepEqual(await pending, { status: 'stale' })
})
await check('copy requires actual success and stale API rejection cannot trigger fallback or overwrite new state', async () => {
  for (const fallback of [() => false, () => { throw new Error('blocked') }]) assert.equal(await copyJsonCsvText('result', { write: async () => { throw new Error('denied') }, fallback }), 'failed')
  assert.equal(await copyJsonCsvText('result', { fallback: () => true }), 'copied')
  const guard = createJsonCsvActionGuard(), token = guard.beginCopy(), pending = deferred<void>(); let fallbacks = 0
  const copying = copyJsonCsvText('old', { write: () => pending.promise, fallback: () => { fallbacks++; return true } }, () => guard.isCurrent(token))
  guard.beginCopy(); pending.reject(new Error('late')); assert.equal(await copying, 'stale'); assert.equal(fallbacks, 0)
  const token2 = guard.beginCopy(), success = deferred<void>(), copy2 = copyJsonCsvText('old', { write: () => success.promise, fallback: () => true }, () => guard.isCurrent(token2))
  guard.invalidate(); success.resolve(); assert.equal(await copy2, 'stale')
})
console.log(`${groups} JSON/CSV preparation groups passed`)
