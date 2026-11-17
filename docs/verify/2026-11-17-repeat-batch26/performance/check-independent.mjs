import assert from 'node:assert/strict'
import { Worker } from 'node:worker_threads'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'esbuild'

// Independent review: real worker_threads execute the product browser Worker
// module; lifecycle tests inject ports. No product parser is the result oracle.
const folder = resolve('docs/verify/2026-11-17-repeat-batch26/performance')
const options = { delimiter: ',', header: true, nested: 'flatten', arrayHandling: 'join', numbers: false, bom: false }
const bundled = await build({ entryPoints: ['src/lib/jsonCsv/jsonCsv.worker.ts'], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022' })
const workerCode = `const { parentPort } = require('node:worker_threads'); globalThis.self = { postMessage: message => parentPort.postMessage(message) };\n${bundled.outputFiles[0].text}\nparentPort.on('message', data => self.onmessage({ data }));`
const imports = await build({ stdin: { contents: "export * from './src/lib/jsonCsv/client.ts'; export * from './src/utils/jsonCsvPreview.ts';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022' })
const { createJsonCsvClient, jsonCsvTextPage, JSON_CSV_VISIBLE_CELLS } = await import(`data:text/javascript;base64,${Buffer.from(imports.outputFiles[0].text).toString('base64')}`)
const results = [], realThreads = new Set()
class ThreadPort {
  onmessage = null; onerror = null; onmessageerror = null; terminated = 0
  constructor() {
    this.thread = new Worker(workerCode, { eval: true }); realThreads.add(this)
    this.thread.on('message', data => this.onmessage?.({ data }))
    this.thread.on('error', error => this.onerror?.({ message: String(error), preventDefault() {} }))
    this.thread.on('messageerror', event => this.onmessageerror?.(event))
  }
  postMessage(message, transfer) { this.thread.postMessage(message, transfer) }
  terminate() { this.terminated++; void this.thread.terminate(); realThreads.delete(this) }
}
class ControlledPort {
  onmessage = null; onerror = null; onmessageerror = null; terminated = 0; posted = []; throwOnTerminate = false
  postMessage(message, transfer) { this.posted.push(structuredClone(message, { transfer })) }
  terminate() { this.terminated++; if (this.throwOnTerminate) throw new Error('Controlled terminate failure') }
  deliver(data) { this.onmessage?.({ data }) }
}
const convert = async (input, mode = 'csvToJson', patch = {}) => createJsonCsvClient({ createWorker: () => new ThreadPort() }).convert(input, mode, { ...options, ...patch })
const outcome = promise => promise.then(value => ({ ok: true, value }), error => ({ ok: false, failure: error.failure }))
const minimal = { mode: 'csvToJson', text: '[\n  {\n    "k": "v"\n  }\n]', headers: ['k'], rows: [['v']], format: 'json', filename: 'converted.json', mime: 'application/json;charset=utf-8', stats: { rows: 1, columns: 1, cells: 1, bytes: 24 } }
minimal.stats.bytes = Buffer.byteLength(minimal.text)
const response = (id, result = minimal) => ({ version: 1, id, kind: 'convert', ok: true, result, computeMs: 1 })
async function check(name, fn) { const start = performance.now(); const detail = await fn(); results.push({ name, status: 'pass', elapsedMs: performance.now() - start, ...detail }); console.log('PASS', name) }
const quote = value => `"${String(value).replaceAll('"', '""')}"`
const csvOracle = (rows, delimiter = ',') => rows.map(row => row.map(value => { const text = String(value); return !text || text.includes(delimiter) || /["\r\n]/.test(text) ? quote(text) : text }).join(delimiter)).join('\r\n')
try {
  await check('real Worker independent quoted records and headerless object oracle', async () => {
    const headers = ['__proto__', 'constructor', 'hasOwnProperty', 'id', 'note'], records = [['data', ' own ', '', '00123', 'x\r\ny\n"quoted"'], ['false', 'null', '😀', '9007199254740993', '\uFEFF tail\t|;,']]
    let cases = 0
    for (const delimiter of [',', '\t', '|', ';']) for (const header of [true, false]) {
      const inputRows = header ? [headers, ...records] : records
      const input = inputRows.map(row => row.map(quote).join(delimiter)).join('\r\n')
      const { result } = await convert(input, 'csvToJson', { delimiter, header })
      const keys = header ? headers : headers.map((_, index) => `column_${index}`)
      const expected = records.map(row => Object.fromEntries(keys.map((key, index) => [key, row[index]])))
      assert.deepEqual(JSON.parse(result.text), expected); assert.deepEqual(result.rows, records); assert.deepEqual(result.headers, keys); assert.equal(result.stats.bytes, Buffer.byteLength(result.text)); cases++
    }
    return { independentCases: cases, expectedObjectsBuiltWithoutProductParser: true }
  })
  await check('real Worker JSON union serialization uses independent exact byte oracle', async () => {
    const rows = [Object.fromEntries([['__proto__', '00123'], ['note', 'a\r\nb'], ['empty', '']]), { late: '😀,;"', note: ' ending ' }]
    const expectedRows = [['00123', 'a\r\nb', '', ''], ['', ' ending ', '', '😀,;"']], headers = ['__proto__', 'note', 'empty', 'late']
    for (const header of [true, false]) for (const bom of [true, false]) {
      const { result } = await convert(JSON.stringify(rows), 'jsonToCsv', { header, bom })
      const expected = (bom ? '\uFEFF' : '') + csvOracle(header ? [headers, ...expectedRows] : expectedRows)
      assert.deepEqual(Buffer.from(result.text), Buffer.from(expected)); assert.deepEqual(result.rows, expectedRows)
    }
    return { byteOracles: 4 }
  })
  await check('actual 200000-cell output equals preserved browser artifact and every preview page rejoins it', async () => {
    const headers = Array.from({ length: 20 }, (_, index) => `c${index}`), line = Array.from({ length: 20 }, (_, index) => `v${index}`).join(',')
    const input = headers.join(',') + '\n' + Array(10000).fill(line).join('\n'), { result, computeMs } = await convert(input)
    const baseline = readFileSync(resolve(folder, '../browser/csv-200000-cells-full.json'))
    assert.deepEqual(Buffer.from(result.text), baseline); assert.equal(result.stats.cells, 200000); assert.equal(JSON_CSV_VISIBLE_CELLS, 1000)
    const first = jsonCsvTextPage(result.text, 0), pieces = []
    for (let index = 0; index < first.pages; index++) pieces.push(jsonCsvTextPage(result.text, index).text)
    assert.equal(pieces.join(''), result.text)
    return { actualWorkerThread: true, wholeBytes: baseline.length, previewPages: first.pages, computeMsNodeOnly: computeMs }
  })
  await check('pre-transfer bound preserves rejected buffer and exact-bound decode transfers once', async () => {
    let creates = 0; const ports = [], client = createJsonCsvClient({ createWorker: () => { creates++; const port = new ThreadPort(); ports.push(port); return port } })
    const oversized = new Uint8Array(2 * 1024 * 1024 + 1); oversized[0] = 53
    const rejected = await outcome(client.decode(oversized.buffer, 'utf-8')); assert.equal(rejected.failure.code, 'fileLimit'); assert.equal(creates, 0); assert.equal(oversized.byteLength, 2 * 1024 * 1024 + 1); assert.equal(oversized[0], 53)
    const exact = new Uint8Array(2 * 1024 * 1024).fill(97), decoding = client.decode(exact.buffer, 'utf-8'); assert.equal(exact.byteLength, 0); const decoded = await decoding; assert.equal(decoded.text.length, 2 * 1024 * 1024); assert.equal(decoded.text[0], 'a'); assert.equal(decoded.text.at(-1), 'a'); assert.equal(ports[0].terminated, 1)
    const malformed = Uint8Array.of(0xed, 0xa0, 0x80), failed = await outcome(client.decode(malformed.buffer, 'utf-8')); assert.equal(malformed.byteLength, 0); assert.deepEqual(failed.failure, { scope: 'file', code: 'encoding' })
    const euc = Uint8Array.of(0xc7, 0xd1, 0xb1, 0xdb), value = await client.decode(euc.buffer, 'euc-kr'); assert.equal(value.text, '한글'); assert.equal(euc.byteLength, 0)
    return { oversizedCreatedWorkers: 0, rejectedBytesRetained: true, exactTwoMiBTransferredAndDecoded: true, surrogateUtf8Rejected: true }
  })
  await check('mixed conversion/decode ownership timeline ignores captured callbacks after replacement and termination', async () => {
    const ports = [], client = createJsonCsvClient({ createWorker: () => { const port = new ControlledPort(); ports.push(port); return port } }), pending = [], obsolete = []
    for (let index = 0; index < 24; index++) {
      const kind = index % 3 ? 'convert' : 'decode'; const promise = kind === 'convert' ? client.convert('k\nv', 'csvToJson', options) : client.decode(Uint8Array.of(97).buffer, 'utf-8')
      pending.push(outcome(promise)); const port = ports.at(-1), request = port.posted[0]
      for (const old of obsolete) { old.message({ data: response(old.id) }); old.error({ preventDefault() {} }); old.messageerror({}); assert.equal(old.port.terminated, 1) }
      obsolete.push({ port, id: request.id, message: port.onmessage, error: port.onerror, messageerror: port.onmessageerror })
      if (index % 5 === 4) { client.cancel(); client.cancel() }
    }
    const last = ports.at(-1); last.throwOnTerminate = true; const id = last.posted[0].id; last.deliver(response(id))
    const answers = await Promise.all(pending); assert.equal(answers.filter(item => item.ok).length, 1); assert.equal(answers.at(-1).ok, true); assert.ok(answers.slice(0, -1).every(item => item.failure.code === 'canceled')); assert.ok(ports.every(port => port.terminated === 1)); client.dispose(); const disposed = await outcome(client.convert('k\nv', 'csvToJson', options)); assert.equal(disposed.failure.code, 'canceled'); assert.equal(ports.length, 24)
    return { independentTimelineTransitions: 24, eachWorkerTerminatedOnce: true, lateMessageErrorMessageerrorIgnored: true, throwingTerminateStillSettled: true }
  })
  await check('response trust boundaries reject malformed shape but preserve valid domain positions', async () => {
    const invalid = [
      data => ({ ...data, computeMs: NaN }), data => ({ ...data, kind: 'decode' }), data => ({ ...data, version: 2 }),
      data => ({ ...data, result: { ...minimal, rows: [['v', 'extra']] } }), data => ({ ...data, result: { ...minimal, stats: { ...minimal.stats, bytes: 1 } } }),
      data => ({ ...data, result: { ...minimal, mime: 'text/html' } }), data => ({ ...data, result: { ...minimal, rows: [[Infinity]] } }),
      data => ({ ...data, ok: false, error: { scope: 'conversion', code: 'width', position: { row: 0 } } }),
    ]
    for (const mutate of invalid) { const port = new ControlledPort(), client = createJsonCsvClient({ createWorker: () => port }); const pending = outcome(client.convert('k\nv', 'csvToJson', options)); port.deliver(mutate(response(1))); assert.equal((await pending).failure.code, 'invalidResponse'); assert.equal(port.terminated, 1) }
    const port = new ControlledPort(), pending = outcome(createJsonCsvClient({ createWorker: () => port }).convert('k\nv', 'csvToJson', options)); port.deliver(response(999)); assert.equal(port.terminated, 0); const error = { scope: 'conversion', code: 'width', position: { row: 3, column: 2, line: 4, offset: 17, key: '__proto__' } }; port.deliver({ version: 1, id: 1, kind: 'convert', ok: false, error }); assert.deepEqual((await pending).failure, error)
    return { malformedReplies: invalid.length, unrelatedIdIgnored: true, structuredErrorPositionPreserved: true }
  })
  await check('preview exhaustive boundary placements preserve CRLF and astral pairs without touching source', () => {
    let vectors = 0, longestPage = 0
    for (const boundary of [50000, 100000, 150000]) for (const shift of [-2, -1, 0, 1, 2]) for (const marker of ['\r\n', '😀', '🧑‍🚀\r\n']) {
      const text = '앞'.repeat(boundary + shift) + marker + '뒷😀\r\n'.repeat(200), original = Buffer.from(text), first = jsonCsvTextPage(text, 0), pieces = []
      let end = 0
      for (let page = 0; page < first.pages; page++) { const part = jsonCsvTextPage(text, page); assert.equal(part.start, end); assert.equal(part.text, text.slice(part.start, part.end)); assert.ok(!/^[\udc00-\udfff]/.test(part.text)); assert.ok(!/[\ud800-\udbff]$/.test(part.text)); assert.ok(!(text[part.start - 1] === '\r' && part.text[0] === '\n')); end = part.end; pieces.push(part.text); longestPage = Math.max(longestPage, part.text.length) }
      assert.equal(end, text.length); assert.deepEqual(Buffer.from(pieces.join('')), original); for (const request of [NaN, Infinity, -Infinity, 1.5, -1]) assert.equal(jsonCsvTextPage(text, request).page, 0); assert.equal(jsonCsvTextPage(text, Number.MAX_SAFE_INTEGER).page, first.pages - 1); vectors++
    }
    assert.ok(longestPage <= 50001); return { boundaryVectors: vectors, longestUtf16Page: longestPage, exactBytesRejoined: true, noCRLFOrSurrogateSplit: true }
  })
  await check('off-thread UTF8 and intermediate errors preserve failure type and no successful partial payload', async () => {
    const utf8Input = '가'.repeat(700000), byteError = await outcome(convert(utf8Input)); assert.equal(byteError.failure.code, 'inputLimit')
    const expanded = JSON.stringify({ ['p'.repeat(45000)]: Object.fromEntries(Array.from({ length: 200 }, (_, index) => [`k${index}`, 'v'])) }), expansionError = await outcome(convert(expanded, 'jsonToCsv', { header: false })); assert.equal(expansionError.failure.code, 'intermediateLimit')
    const malformed = await outcome(convert('a,b\r\n"x\r\ny",z\r\nq')); assert.equal(malformed.failure.code, 'width'); assert.equal(malformed.failure.position.row, 3); assert.equal(malformed.failure.position.line, 4)
    assert.equal(utf8Input.length, 700000); assert.ok(expanded.includes('"k199":"v"')); return { utf16PreboundAllowedWorkerUtf8Rejected: true, intermediateExpansionRejectedWithoutPartialSuccess: true, multilineLogicalPhysicalPositionPreserved: true }
  })
} finally {
  for (const port of realThreads) port.terminate()
  writeFileSync(resolve(folder, 'independent-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), passed: results.length, browserExecuted: false, results }, null, 2))
}
console.log(`CSV performance independent: ${results.length} groups passed; Node worker_threads, not Chrome`)
