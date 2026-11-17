import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module from 'node:module'
import path from 'node:path'
import { convertJsonCsv, parseCsvRecords, serializeCsvRecords, DEFAULT_JSON_CSV_OPTIONS as defaults, JsonCsvError, JSON_CSV_LIMITS as limits } from '../../../src/utils/jsonCsv.ts'
import { readJsonCsvFile } from '../../../src/utils/jsonCsvActions.ts'

// Reuse only the author's controlled DOM/FileReader ports, not their assertions.
// The re-exported production parent and its actual utility remain bundled by the shared harness.
const portsPath = path.resolve('docs/verify/2026-11-17-repeat-batch26/check-json-csv-component.cjs')
const ports = new Module(portsPath)
ports.filename = portsPath
ports.paths = Module._nodeModulePaths(path.dirname(portsPath))
ports._compile(fs.readFileSync(portsPath, 'utf8').split('async function main()')[0] + '\nmodule.exports = { fixture, flush, deferred };', portsPath)
const { fixture, flush, deferred } = ports.exports
const bytes = text => new TextEncoder().encode(text).buffer
const normalized = value => JSON.parse(JSON.stringify(value))
const fails = (run, code) => assert.throws(run, error => error instanceof JsonCsvError && error.code === code)
let count = 0
async function check(name, run) { await run(); console.log('PASS', name); count++ }

// An independent record reader using anchored whole-field grammar, not the
// production character-state machine. Only valid serialized CSV is fed to it.
function oracleCsv(text, delimiter) {
  const separator = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const field = new RegExp(`(?:"((?:[^"]|"")*)"|([^"\\r\\n${separator}]*))(${separator}|\\r\\n|\\r|\\n|$)`, 'y')
  const records = [], row = []
  let at = 0
  while (true) {
    field.lastIndex = at
    const match = field.exec(text)
    assert.ok(match, `oracle valid-field parse at ${at}`)
    row.push(match[1] === undefined ? match[2] : match[1].replace(/""/g, '"'))
    at = field.lastIndex
    if (match[3] === delimiter) continue
    records.push(row.splice(0))
    if (at === text.length) break
  }
  return records
}

await check('independent grammar + known cell matrices: 4 delimiters, all line endings, 576 adversarial field pairs', () => {
  const values = ['', ' ', '  left', 'right  ', '00123', '9007199254740993', '한글😀', 'a,b\t;c|d', '"', 'a\nb', 'a\rb', 'a\r\nb']
  for (const delimiter of [',', '\t', '|', ';']) for (const first of values) for (const second of values) {
    const expected = [[first, second], [second, first]]
    // Always-quoted independent construction avoids depending on production escaping.
    for (const newline of ['\r\n', '\n', '\r']) {
      const input = expected.map(row => row.map(cell => '"' + cell.replaceAll('"', '""') + '"').join(delimiter)).join(newline)
      assert.deepEqual(parseCsvRecords(input, delimiter, false), expected)
      assert.deepEqual(oracleCsv(serializeCsvRecords(expected, delimiter), delimiter), expected)
      assert.deepEqual(parseCsvRecords(input + newline, delimiter, false), expected)
    }
  }
})

await check('blank/header/special-key semantics and numeric opt-in use literal independent expectations', () => {
  for (const [input, expected] of [['""', [['']]], ['\n', [['']]], ['a\n', [['a']]], ['a\n\n', [['a'], ['']]], ['a,', [['a', '']]]]) assert.deepEqual(parseCsvRecords(input, ',', false), expected)
  for (const input of ['x', 'x\n']) assert.equal(convertJsonCsv(input, 'csvToJson').text, '[]')
  const csv = '__proto__,constructor,hasOwnProperty, spaced \n00123,9007199254740993,, value '
  const record = JSON.parse(convertJsonCsv(csv, 'csvToJson').text)[0]
  assert.deepEqual(Object.keys(record), ['__proto__', 'constructor', 'hasOwnProperty', ' spaced '])
  assert.equal(record.__proto__, '00123'); assert.equal(record.constructor, '9007199254740993'); assert.equal(record.hasOwnProperty, ''); assert.equal(record[' spaced '], ' value ')
  assert.equal(Object.prototype.polluted, undefined)
  const numbers = '00123\n9007199254740993\n1e3\n-2.5\n-0\n1e309\n 3\n+3\n.5\n1.'
  const result = convertJsonCsv(numbers, 'csvToJson', { ...defaults, header: false, numbers: true })
  assert.deepEqual(JSON.parse(result.text).map(row => row.column_0), ['00123', '9007199254740993', 1000, -2.5, '-0', '1e309', ' 3', '+3', '.5', '1.'])
  for (const [input, code] of [['a,a\nx,y', 'duplicateHeader'], ['a, \nx,y', 'emptyHeader'], ['a,b\nx', 'width'], ['a\n"x', 'unclosedQuote'], ['a\n"x"z', 'afterQuote'], ['a\nx"', 'unexpectedQuote']]) fails(() => convertJsonCsv(input, 'csvToJson'), code)
})

await check('JSON union/no-header/nesting/big identifiers/BOM-only CSV cross-checked through independent CSV reader', () => {
  const text = '[{"__proto__":"safe","arr":[{"x":1},null,[]],"empty":{}},{"constructor":"c","later":"9007199254740993"}]'
  const result = convertJsonCsv(text, 'jsonToCsv', { ...defaults, header: false, bom: true })
  assert.deepEqual(result.headers, ['__proto__', 'arr', 'empty', 'constructor', 'later'])
  const expected = [['safe', '{"x":1};;[]', '{}', '', ''], ['', '', '', 'c', '9007199254740993']]
  assert.deepEqual(result.rows, expected); assert.deepEqual(oracleCsv(result.text.slice(1), ','), expected)
  assert.equal(result.stats.bytes, Buffer.byteLength(result.text)); assert.equal(result.stats.cells, 10)
  const separate = convertJsonCsv('{"x":[],"a":[{"v":2},{}]}', 'jsonToCsv', { ...defaults, arrayHandling: 'separate' })
  assert.deepEqual(oracleCsv(separate.text, ','), [['x', 'a[0].v', 'a[1]'], ['[]', '2', '{}']])
  const preserve = convertJsonCsv('{"nested":{"n":1},"arr":[1,2]}', 'jsonToCsv', { ...defaults, nested: 'preserve' })
  assert.deepEqual(oracleCsv(preserve.text, ','), [['nested', 'arr'], ['{"n":1}', '[1,2]']])
  assert.deepEqual(JSON.parse(convertJsonCsv('x\n00123', 'csvToJson', { ...defaults, bom: true }).text), [{ x: '00123' }])
  for (const text of ['{"n":9007199254740993}', '{"n":-9007199254740992}', '{"nested":[9007199254740992]}']) fails(() => convertJsonCsv(text, 'jsonToCsv'), 'unsafeInteger')
  fails(() => convertJsonCsv('{"a.b":1,"a":{"b":2}}', 'jsonToCsv'), 'keyCollision')
})

await check('long flattened paths stop at intermediate 8MiB without relying on header export; fatal bytes/BOM preserve source cells', async () => {
  const key = 'k'.repeat(80_000), children = Object.fromEntries(Array.from({ length: 110 }, (_, i) => [`c${i}`, 'v']))
  const input = JSON.stringify({ [key]: children })
  assert.ok(Buffer.byteLength(input) < limits.inputBytes)
  for (const header of [true, false]) fails(() => convertJsonCsv(input, 'jsonToCsv', { ...defaults, header }), 'intermediateLimit')
  for (const [raw, expected] of [['\uFEFFx\n\uFEFFinside', 'x\n\uFEFFinside'], ['\uFEFF\uFEFFx', '\uFEFFx']]) {
    const buffer = bytes(raw), result = await readJsonCsvFile({ size: buffer.byteLength }, 'utf-8', async () => buffer)
    assert.deepEqual(result, { status: 'ready', text: expected })
  }
  const malformed = Uint8Array.from([0xf0, 0x80, 0x80, 0x80]).buffer
  assert.deepEqual(await readJsonCsvFile({ size: 4 }, 'utf-8', async () => malformed), { status: 'failed', error: 'encoding' })
  const euc = Uint8Array.from([0xc7, 0xd1, 0xb1, 0xdb]).buffer
  assert.deepEqual(await readJsonCsvFile({ size: 4 }, 'euc-kr', async () => euc), { status: 'ready', text: '한글' })
})

await check('actual parent: old copy cannot report on a new result, newest copy wins, locale preserves content and recovery', async () => {
  const f = await fixture('ko'), first = deferred(), second = deferred()
  let calls = 0
  f.copyPort(() => ++calls === 1 ? first.promise : second.promise)
  await f.copied(); await f.copied(); second.resolve(); await flush(); f.h.render()
  assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.copied))
  first.reject(new Error('obsolete')); await flush(); f.h.render(); assert.equal(f.fallbackCount(), 0)
  assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.copied))
  const pending = deferred(); f.copyPort(() => pending.promise); await f.copied()
  f.change('{"fresh":"00123"}'); await f.convert(); const fresh = f.output()
  pending.resolve(); await flush(); f.h.render(); assert.ok(!f.h.text().includes(f.messages.jsonCsvConverter.fidelity.copied))
  f.copyPort(async () => { throw new Error('denied') }); f.fallback(false); await f.copied()
  f.locale('en'); assert.equal(f.output(), fresh); assert.equal(f.input().props.value, '{"fresh":"00123"}')
  assert.equal(f.h.find(node => node.props.id === 'json-csv-manual').props.value, fresh)
  assert.equal(f.h.find(node => node.props.id === 'json-csv-manual').props.readOnly, true)
  assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.copyFailed)); f.h.cleanup()
})

await check('actual parent: read/copy order, cancel, mode and original text survive late failed or successful file requests', async () => {
  const f = await fixture(), pending = deferred(), original = f.input().props.value
  f.copyPort(() => pending.promise); await f.copied(); f.upload(); const old = f.readers[0]
  pending.reject(new Error('obsolete')); await flush(); f.h.render(); assert.equal(f.fallbackCount(), 0)
  f.option('delimiter', '|'); old.complete(bytes('obsolete')); await flush(); f.h.render()
  assert.equal(f.input().props.value, original); assert.ok(old.aborted)
  f.upload(); const older = f.readers.at(-1); f.upload(); const newest = f.readers.at(-1)
  newest.complete(bytes('{"latest":true}')); await flush(); f.h.render(); older.fail(); await flush(); f.h.render()
  assert.equal(f.input().props.value, '{"latest":true}'); assert.ok(!f.h.text().includes(f.messages.jsonCsvConverter.fidelity.readFailed))
  f.upload(); const canceled = f.readers.at(-1); f.nativeInput.dispatchEvent(new Event('cancel')); f.h.render()
  canceled.complete(bytes('canceled')); await flush(); f.h.render(); assert.equal(f.input().props.value, '{"latest":true}')
  f.mode('csvToJson'); f.change('a\n00123'); await f.convert(); f.mode('jsonToCsv')
  assert.equal(f.input().props.value, '{"latest":true}'); f.h.cleanup()
})

await check('actual parent: grammar failure retains raw and snapshot, stale controls refuse export, fresh no-header bytes match table', async () => {
  const f = await fixture('en'), initial = f.output()
  f.mode('csvToJson'); f.change('a,b\r\n"line\r\nunterminated'); await f.convert()
  assert.equal(f.input().props.value, 'a,b\r\n"line\r\nunterminated'); assert.equal(f.output(), initial)
  assert.equal(f.by('data-json-csv-copy').props.disabled, true); assert.equal(f.by('data-json-csv-download').props.disabled, true)
  f.download(); await f.copied(); assert.equal(f.downloads.length, 0); assert.equal(f.copies.length, 0)
  assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.errors.unclosedQuote))
  f.option('header', false); f.change('" first ","two\nlines"\r\n"",00123'); await f.convert()
  const expected = [{ column_0: ' first ', column_1: 'two\nlines' }, { column_0: '', column_1: '00123' }]
  assert.deepEqual(JSON.parse(f.output()), expected); f.view('table')
  f.by('data-json-csv-cell', '0-1').props.onClick(); f.h.render()
  assert.equal(f.h.find(node => node.props.id === 'json-csv-cell-full').props.value, 'two\nlines')
  f.download(); const text = await f.urls.get(f.downloads[0].href).text(); assert.deepEqual(JSON.parse(text), expected)
  assert.equal(f.downloads[0].name, 'converted.json'); f.h.cleanup()
})

await check('actual parent: 200-column 200000-cell result pages 5000 cells while last page and full download stay exact', async () => {
  const f = await fixture(), headers = Array.from({ length: 200 }, (_, i) => `h${i}`)
  const rows = Array.from({ length: 1000 }, (_, row) => headers.map((_, col) => `${row}:${col}`))
  f.mode('csvToJson'); f.change([headers, ...rows].map(row => row.join(',')).join('\n')); await f.convert()
  const full = f.output(); assert.equal(JSON.parse(full).length, 1000); f.view('table')
  const visible = () => f.h.all().filter(node => Object.hasOwn(node.props, 'data-json-csv-cell'))
  assert.equal(visible().length, 5000); assert.equal(f.by('data-json-csv-cell', '0-0').props.children[0], '0:0')
  f.h.button(f.messages.jsonCsvConverter.pagination.last).props.onClick(); f.h.render()
  assert.equal(visible().length, 5000); assert.equal(f.by('data-json-csv-cell', '999-199').props.children[0], '999:199')
  f.download(); assert.equal(await f.urls.get(f.downloads[0].href).text(), full)
  const outputRows = JSON.parse(full).map(record => headers.map(header => record[header]))
  assert.deepEqual(outputRows, rows); assert.equal(f.by('data-json-csv-stat', 'rows').props.children, 1000)
  assert.equal(f.by('data-json-csv-stat', 'columns').props.children, 200)
  assert.deepEqual(normalized([...f.h.stored]), []); f.h.cleanup()
})

console.log(`Independent JSON/CSV: ${count} groups passed; actual components, no browser`)
