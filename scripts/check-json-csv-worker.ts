import assert from 'node:assert/strict'
import vm from 'node:vm'
import { build } from 'esbuild'
import { convertJsonCsv, DEFAULT_JSON_CSV_OPTIONS, JSON_CSV_LIMITS } from '../src/utils/jsonCsv.ts'
import { JSON_CSV_TEXT_PAGE_UNITS, JSON_CSV_VISIBLE_CELLS, jsonCsvTextPage } from '../src/utils/jsonCsvPreview.ts'
import { createJsonCsvClient, type JsonCsvWorkerPort } from '../src/lib/jsonCsv/client.ts'
import { JsonCsvExecutionError, isJsonCsvResult, type JsonCsvRequest, type JsonCsvResponse } from '../src/lib/jsonCsv/protocol.ts'

const bundled = await build({ entryPoints: ['src/lib/jsonCsv/jsonCsv.worker.ts'], bundle: true, write: false, format: 'iife', platform: 'browser' })
const responses: JsonCsvResponse[] = []
const workerSelf: { onmessage?: (event: { data: unknown }) => Promise<void>; postMessage: (response: JsonCsvResponse) => void } = { postMessage: response => responses.push(response) }
vm.runInContext(bundled.outputFiles[0].text, vm.createContext({ self: workerSelf, TextEncoder, TextDecoder, ArrayBuffer, performance }))
const execute = async (request: unknown) => { await workerSelf.onmessage!({ data: request }); return responses.at(-1)! }
const request = (input: string, mode: 'csvToJson' | 'jsonToCsv' = 'csvToJson'): JsonCsvRequest => ({ version: 1, id: 1, kind: 'convert', input, mode, options: { ...DEFAULT_JSON_CSV_OPTIONS } })
const utf8 = (text: string) => new TextEncoder().encode(text).buffer
const snapshot = convertJsonCsv('id,note\n00123,"a\r\nb"', 'csvToJson')
class FakeWorker implements JsonCsvWorkerPort {
  onmessage: JsonCsvWorkerPort['onmessage'] = null
  onerror: JsonCsvWorkerPort['onerror'] = null
  onmessageerror: JsonCsvWorkerPort['onmessageerror'] = null
  requests: JsonCsvRequest[] = []
  terminated = 0
  throws = false
  postMessage(value: JsonCsvRequest, transfer: ArrayBuffer[] = []) { if (this.throws) throw new Error('clone'); this.requests.push(structuredClone(value, { transfer })) }
  terminate() { this.terminated++ }
  send(value: unknown) { this.onmessage?.(new MessageEvent('message', { data: value })) }
  success() { const job = this.requests.at(-1)!; this.send({ version: 1, id: job.id, kind: job.kind, ok: true, result: snapshot, text: 'decoded', computeMs: 1 }) }
}
async function rejection(promise: Promise<unknown>) {
  try { await promise; return 'unexpectedSuccess' } catch (cause) { return cause instanceof JsonCsvExecutionError ? `${cause.failure.scope}:${cause.failure.code}` : 'unexpectedError' }
}
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }

await check('actual Worker uses the existing core for multiline strings, special keys, nested union, BOM and all delimiters', async () => {
  for (const delimiter of [',', '\t', '|', ';'] as const) {
    const job = request(`__proto__${delimiter}code${delimiter}note\r\nx${delimiter}00123${delimiter}" a\r\nb "`)
    job.options.delimiter = delimiter
    const response = await execute(job)
    assert.equal(response.ok, true)
    if (response.ok && response.kind === 'convert') { assert.equal(response.result.text, convertJsonCsv(job.input, job.mode, job.options).text); assert.ok(isJsonCsvResult(response.result, job.mode)); assert.ok(response.computeMs >= 0) }
  }
  const job = request('[{"nested":{"a":1},"list":[{"x":2},null]},{"later":"00987"}]', 'jsonToCsv'); job.options.bom = true
  const response = await execute(job); assert.equal(response.ok, true)
  if (response.ok && response.kind === 'convert') assert.equal(response.result.text, convertJsonCsv(job.input, job.mode, job.options).text)
})
await check('actual Worker preserves structured domain errors and exact positions without leaking Error instances', async () => {
  for (const [input, mode, code] of [['a,b\nx', 'csvToJson', 'width'], ['{"n":9007199254740993}', 'jsonToCsv', 'unsafeInteger'], ['{"a.b":1,"a":{"b":2}}', 'jsonToCsv', 'keyCollision']] as const) {
    const response = await execute(request(input, mode)); assert.equal(response.ok, false)
    if (!response.ok) { assert.equal(response.error.scope, 'conversion'); assert.equal(response.error.code, code); if (response.error.scope === 'conversion' && code === 'width') assert.equal(response.error.position.row, 2) }
  }
  const bad = await execute({ version: 2, id: 8, kind: 'decode', bytes: utf8('a'), encoding: 'utf-8' })
  assert.equal(bad.ok, false)
})
await check('actual Worker decodes UTF-8/EUC-KR once, rejects malformed and expanded input, preserves empty text', async () => {
  for (const [bytes, encoding, text] of [[utf8('\uFEFF\uFEFFa'), 'utf-8', '\uFEFFa'], [Uint8Array.from([0xc7, 0xd1, 0xb1, 0xdb]).buffer, 'euc-kr', '한글'], [new ArrayBuffer(0), 'utf-8', '']] as const) {
    const response = await execute({ version: 1, id: 3, kind: 'decode', bytes, encoding }); assert.equal(response.ok, true)
    if (response.ok && response.kind === 'decode') assert.equal(response.text, text)
  }
  for (const [bytes, code] of [[Uint8Array.from([0xc7]).buffer, 'encoding'], [new ArrayBuffer(JSON_CSV_LIMITS.inputBytes + 1), 'fileLimit']] as const) {
    const response = await execute({ version: 1, id: 4, kind: 'decode', bytes, encoding: 'euc-kr' }); assert.equal(response.ok, false)
    if (!response.ok) assert.equal(response.error.code, code)
  }
  const bytes = new Uint8Array(1_400_000); for (let i = 0; i < bytes.length; i += 2) { bytes[i] = 0xc7; bytes[i + 1] = 0xd1 }
  const response = await execute({ version: 1, id: 4, kind: 'decode', bytes: bytes.buffer, encoding: 'euc-kr' })
  assert.equal(response.ok, false); if (!response.ok) assert.equal(response.error.code, 'decodedLimit')
})
await check('client freezes options, accepts one bounded result and transfers file buffers without a second copy', async () => {
  const worker = new FakeWorker(), client = createJsonCsvClient({ createWorker: () => worker }), settings = { ...DEFAULT_JSON_CSV_OPTIONS }
  const pending = client.convert('id,note\n00123,a', 'csvToJson', settings); settings.numbers = true
  assert.equal(worker.requests[0].kind === 'convert' && worker.requests[0].options.numbers, false)
  const oldCallback = worker.onmessage!; worker.success(); assert.equal((await pending).result.text, snapshot.text); assert.equal(worker.terminated, 1)
  oldCallback(new MessageEvent('message', { data: null })); assert.equal(worker.terminated, 1)
  const decoder = new FakeWorker(), bytes = utf8('decoded'), decoding = createJsonCsvClient({ createWorker: () => decoder }).decode(bytes, 'utf-8')
  assert.equal(bytes.byteLength, 0); assert.equal(decoder.requests[0].kind === 'decode' && decoder.requests[0].bytes.byteLength, 7)
  decoder.success(); assert.equal((await decoding).text, 'decoded')
})
await check('convert/decode replacements, cancel and dispose reject once and ignore captured late callbacks', async () => {
  const workers: FakeWorker[] = [], client = createJsonCsvClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker } })
  const first = rejection(client.convert('a\nb', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)), late = workers[0].onmessage!, lateError = workers[0].onerror!
  const second = client.decode(utf8('decoded'), 'utf-8'); assert.equal(await first, 'worker:canceled'); assert.equal(workers[0].terminated, 1)
  late(new MessageEvent('message', { data: { version: 1, id: 1, kind: 'convert', ok: true, result: snapshot, computeMs: 1 } })); lateError({ preventDefault() {} } as ErrorEvent)
  workers[1].success(); assert.equal((await second).text, 'decoded')
  const third = rejection(client.convert('a\nb', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)); client.cancel(); client.cancel(); assert.equal(await third, 'worker:canceled')
  const fourth = rejection(client.decode(utf8('x'), 'utf-8')); client.dispose(); assert.equal(await fourth, 'worker:canceled')
  assert.equal(await rejection(client.convert('a\nb', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)), 'worker:canceled'); assert.equal(workers.length, 4)
})
await check('Worker construction/post/error/messageerror/timeout and malformed replies fail honestly without main fallback', async () => {
  assert.equal(await rejection(createJsonCsvClient({ createWorker() { throw new Error('blocked') } }).convert('a', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)), 'worker:workerFailed')
  if (typeof Worker === 'undefined') assert.equal(await rejection(createJsonCsvClient().convert('a', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)), 'worker:unsupported')
  for (const kind of ['post', 'error', 'messageerror', 'version', 'result', 'fileScope', 'null']) {
    const worker = new FakeWorker(); worker.throws = kind === 'post'
    const pending = rejection(createJsonCsvClient({ createWorker: () => worker }).convert('a', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS))
    if (kind === 'error') worker.onerror!({ preventDefault() {} } as ErrorEvent)
    if (kind === 'messageerror') worker.onmessageerror!(new MessageEvent('messageerror'))
    if (kind === 'version') worker.send({ version: 2, id: 1, kind: 'convert', ok: true, result: snapshot, computeMs: 1 })
    if (kind === 'result') worker.send({ version: 1, id: 1, kind: 'convert', ok: true, result: { ...snapshot, stats: { ...snapshot.stats, cells: 999 } }, computeMs: 1 })
    if (kind === 'fileScope') worker.send({ version: 1, id: 1, kind: 'convert', ok: false, error: { scope: 'file', code: 'read' } })
    if (kind === 'null') worker.send(null)
    assert.equal(await pending, ['post', 'error', 'messageerror'].includes(kind) ? 'worker:workerFailed' : 'worker:invalidResponse'); assert.equal(worker.terminated, 1)
  }
  const slow = new FakeWorker(); assert.equal(await rejection(createJsonCsvClient({ createWorker: () => slow, timeoutMs: 5 }).convert('a', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)), 'worker:timeout'); assert.equal(slow.terminated, 1)
})
await check('preflight limits avoid Worker creation, unrelated ids cannot complete the current request', async () => {
  let creates = 0; const worker = new FakeWorker(), client = createJsonCsvClient({ createWorker: () => { creates++; return worker } })
  assert.equal(await rejection(client.convert('x'.repeat(JSON_CSV_LIMITS.inputBytes + 1), 'csvToJson', DEFAULT_JSON_CSV_OPTIONS)), 'conversion:inputLimit')
  assert.equal(await rejection(client.decode(new ArrayBuffer(JSON_CSV_LIMITS.inputBytes + 1), 'utf-8')), 'file:fileLimit'); assert.equal(creates, 0)
  const pending = client.convert('a', 'csvToJson', DEFAULT_JSON_CSV_OPTIONS); worker.send({ version: 1, id: 900, kind: 'convert', ok: false, error: { scope: 'worker', code: 'workerFailed' } })
  assert.equal(worker.terminated, 0); worker.success(); await pending
})
await check('all preview pages reconstruct exact text with CRLF/emoji boundaries and no data-limit reduction', () => {
  assert.equal(JSON_CSV_VISIBLE_CELLS, 1000); assert.equal(JSON_CSV_LIMITS.cells, 200_000)
  for (const boundaryText of ['\r\n', '😀', '가', 'x']) {
    const text = 'a'.repeat(JSON_CSV_TEXT_PAGE_UNITS - 1) + boundaryText + 'b'.repeat(JSON_CSV_TEXT_PAGE_UNITS - 2) + '😀\r\nend'
    const first = jsonCsvTextPage(text, 0), pieces: string[] = []
    let previous = 0
    for (let index = 0; index < first.pages; index++) {
      const page = jsonCsvTextPage(text, index); assert.equal(page.start, previous); assert.equal(page.text, text.slice(page.start, page.end)); previous = page.end; pieces.push(page.text)
      assert.ok(!/^[\uDC00-\uDFFF]/.test(page.text)); assert.ok(!/[\uD800-\uDBFF]$/.test(page.text)); assert.ok(!(page.text.startsWith('\n') && text[page.start - 1] === '\r'))
    }
    assert.equal(pieces.join(''), text); assert.equal(previous, text.length); assert.equal(jsonCsvTextPage(text, -1).page, 0); assert.equal(jsonCsvTextPage(text, 999).page, first.pages - 1)
  }
  assert.deepEqual(jsonCsvTextPage('', 1), { text: '', start: 0, end: 0, total: 0, page: 0, pages: 1 })
})
await check('200,000-cell Worker output stays complete; compute and bounded reply validation are timed separately', async () => {
  const input = Array.from({ length: 20 }, (_, index) => `c${index}`).join(',') + '\n' + Array(10_000).fill(Array(20).fill('00123').join(',')).join('\n')
  const response = await execute(request(input)); assert.equal(response.ok, true)
  if (response.ok && response.kind === 'convert') {
    const start = performance.now(); assert.equal(isJsonCsvResult(response.result, 'csvToJson'), true); const validationMs = performance.now() - start
    assert.equal(response.result.stats.cells, 200_000); assert.equal(response.result.rows.length, 10_000); assert.equal(response.result.rows[9999][19], '00123')
    console.log(JSON.stringify({ nodeVmOnly: true, computeMs: response.computeMs, validationMs, outputBytes: response.result.stats.bytes }))
  }
})
console.log(`JSON/CSV Worker/client/preview: ${groups} groups passed; actual worker module in VM, not a browser thread`)
