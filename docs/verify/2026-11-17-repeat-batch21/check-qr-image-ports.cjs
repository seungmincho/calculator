/* eslint-disable @typescript-eslint/no-require-imports -- Controlled browser ports around actual bundled TypeScript. */
const assert = require('node:assert/strict'), esbuild = require('esbuild'), vm = require('node:vm')
const { PNG } = require('pngjs')
function load(entry, globals, external = {}) {
  const result = esbuild.buildSync({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', external: Object.keys(external), define: { 'import.meta.url': JSON.stringify('https://toolhub.ai.kr/qr-worker-client.js') } })
  const loadedModule = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module: loadedModule, exports: loadedModule.exports, console, setTimeout, clearTimeout, ArrayBuffer, Uint8ClampedArray, Uint8Array, DataView, URL, Error, DOMException, Date, ...globals, require: name => external[name] ?? require(name) })
  return loadedModule.exports
}
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const tick = () => new Promise(setImmediate)
let count = 0
async function check(name, run) { await run(); count++; console.log('PASS', name) }
function workerPort() {
  const workers = []
  class Worker {
    constructor() { workers.push(this); this.terminated = 0 }
    postMessage(data, transfer) { this.sent = data; this.transfer = transfer }
    terminate() { this.terminated++ }
  }
  return { Worker, workers }
}
function imagePort(native, workerResult = 'worker result') {
  const canvases = [], urls = [], revoked = [], workers = []
  class Picture {
    constructor() { this.naturalWidth = 64; this.naturalHeight = 64 }
    set src(value) { if (value) queueMicrotask(() => this.onload?.()) }
  }
  class ImageURL extends URL { static createObjectURL() { const value = `blob:${urls.length}`; urls.push(value); return value } static revokeObjectURL(url) { revoked.push(url) } }
  const context = { fillRect() {}, drawImage() {}, getImageData() { return { data: new Uint8ClampedArray(64 * 64 * 4) } } }
  const api = load('src/lib/qr/image.ts', { Image: Picture, URL: ImageURL, BarcodeDetector: native, document: { createElement() { const canvas = { width: 0, height: 0, getContext: () => context }; canvases.push(canvas); return canvas } } }, { './client': { decodeQrInWorker: async (...args) => { workers.push(args); return workerResult } } })
  const png = PNG.sync.write({ width: 64, height: 64, data: Buffer.alloc(64 * 64 * 4, 255) })
  const file = { size: png.length, arrayBuffer: async () => Uint8Array.from(png).buffer }
  return { api, file, canvases, urls, revoked, workers }
}
;(async () => {
  await check('actual Worker client isolates request IDs, transfers pixels and terminates on success/cancel', async () => {
    const port = workerPort(), api = load('src/lib/qr/client.ts', { Worker: port.Worker })
    const signal = new AbortController(), data = new Uint8ClampedArray(16), pending = api.decodeQrInWorker(data, 2, 2, signal.signal)
    const first = port.workers[0]; assert.equal(first.transfer[0], data.buffer)
    let resolved = false; pending.then(() => { resolved = true })
    first.onmessage({ data: { requestId: first.sent.requestId + 1, type: 'found', text: 'wrong' } }); await tick(); assert.equal(resolved, false)
    first.onmessage({ data: { requestId: first.sent.requestId, type: 'found', text: 'right' } }); assert.equal(await pending, 'right'); assert.equal(first.terminated, 1)
    const abort = new AbortController(), canceled = api.decodeQrInWorker(new Uint8ClampedArray(16), 2, 2, abort.signal)
    abort.abort(); await assert.rejects(canceled, error => error.code === 'canceled'); assert.equal(port.workers[1].terminated, 1)
  })
  await check('Worker timeout, error, messageerror and postMessage failure settle once and terminate', async () => {
    for (const mode of ['timeout', 'error', 'messageerror', 'post']) {
      const port = workerPort()
      if (mode === 'post') port.Worker.prototype.postMessage = () => { throw new Error('blocked') }
      const api = load('src/lib/qr/client.ts', { Worker: port.Worker }), pending = api.decodeQrInWorker(new Uint8ClampedArray(16), 2, 2, new AbortController().signal, 5)
      const worker = port.workers[0], late = worker.onmessage
      if (mode === 'error') worker.onerror({ preventDefault() {} })
      if (mode === 'messageerror') worker.onmessageerror()
      await assert.rejects(pending, error => error.code === (mode === 'timeout' ? 'timeout' : 'worker'))
      late?.({ data: { requestId: worker.sent?.requestId, type: 'found', text: 'late' } }); assert.equal(worker.terminated, 1)
    }
  })
  await check('actual image pipeline falls back once for native absence, unsupported format, constructor/detect failure and no match', async () => {
    for (const mode of ['absent', 'unsupported', 'constructor', 'detect', 'empty', 'success']) {
      class Native {
        static async getSupportedFormats() { return mode === 'unsupported' ? ['ean_13'] : ['qr_code'] }
        constructor() { if (mode === 'constructor') throw new Error('unsupported') }
        async detect() { if (mode === 'detect') throw new Error('detect failed'); return mode === 'success' ? [{ rawValue: 'native', format: 'qr_code' }] : [] }
      }
      const port = imagePort(mode === 'absent' ? undefined : Native)
      const result = await port.api.readQrImage(port.file, new AbortController().signal)
      assert.equal(result.text, mode === 'success' ? 'native' : 'worker result')
      assert.equal(port.workers.length, mode === 'success' ? 0 : 1)
      assert.deepEqual(port.revoked, port.urls); assert.ok(port.canvases.every(canvas => canvas.width === 0 && canvas.height === 0))
    }
  })
  await check('cancel during native detection cleans resources and ignores late native completion', async () => {
    const native = defer()
    class Native { static async getSupportedFormats() { return ['qr_code'] } detect() { return native.promise } }
    const port = imagePort(Native), abort = new AbortController(), pending = port.api.readQrImage(port.file, abort.signal)
    await tick(); abort.abort(); await assert.rejects(pending, error => error.code === 'canceled')
    native.resolve([{ rawValue: 'late native', format: 'qr_code' }]); await tick()
    assert.equal(port.workers.length, 0); assert.deepEqual(port.revoked, port.urls); assert.equal(port.canvases[0].width, 0)
  })
  await check('shared clipboard sequencing prevents old history rejection from overwriting a newer batch copy', async () => {
    const requests = [], copied = []; let fallback = 0
    const api = load('src/utils/qrClipboard.ts', { navigator: { clipboard: { writeText(text) { const d = defer(); requests.push(d); copied.push(text); return d.promise } } }, document: { createElement() { fallback++; throw new Error('must not run') } } })
    const history = api.copyQrText('history', () => true), batch = api.copyQrText('batch', () => true)
    requests[1].resolve(); assert.equal(await batch, true)
    requests[0].reject(new Error('late rejection')); assert.equal(await history, null)
    assert.deepEqual(copied, ['history', 'batch']); assert.equal(fallback, 0)
  })
  console.log(`${count} QR Worker/image/clipboard port groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
