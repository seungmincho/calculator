// node --experimental-strip-types scripts/check-image-compression-abort.ts
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { compressFile, decodeImage, encodeImage, fitToSize, uniqueNames, outputName } from '../src/utils/imageCompress.ts'
import { convertName } from '../src/utils/imageConvert.ts'
import { outName } from '../src/utils/pdfTools.ts'

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
const options = { format: 'jpeg' as const, quality: 80, maxSide: 100, targetKB: 0 }
const file = new File(['image'], 'a.png', { type: 'image/png' })
const originals = new Map(['createImageBitmap', 'OffscreenCanvas', 'Image', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
const define = (key: string, value: unknown) => Object.defineProperty(globalThis, key, { configurable: true, value })
let decoded = 0, closed = 0, encoded = 0
let decodeTask: ReturnType<typeof deferred<unknown>> | null = null
let encodeTask: ReturnType<typeof deferred<Blob>> | null = null
const draws: unknown[][] = []
function install() {
  decoded = 0; closed = 0; encoded = 0; decodeTask = null; encodeTask = null; draws.length = 0
  define('createImageBitmap', async () => {
    decoded++
    return decodeTask ? decodeTask.promise : { width: 400, height: 200, close() { closed++ } }
  })
  define('OffscreenCanvas', class {
    width: number; height: number
    constructor(width: number, height: number) { this.width = width; this.height = height }
    getContext() { return { fillRect() {}, drawImage(...args: unknown[]) { draws.push(args) } } }
    async convertToBlob(settings: { type: string; quality: number }) {
      encoded++
      return encodeTask ? encodeTask.promise : new Blob(['encoded'], { type: settings.type })
    }
  })
}
const checks: [string, () => Promise<void>][] = [
  ['pre-aborted compression and size fitting start no browser/encoder work', async () => {
    install(); const abort = new AbortController(); abort.abort()
    await assert.rejects(compressFile(file, options, abort.signal), { name: 'AbortError' })
    await assert.rejects(fitToSize(async () => { encoded++; return { size: 1 } }, 100, { signal: abort.signal }), { name: 'AbortError' })
    assert.equal(decoded, 0); assert.equal(encoded, 0)
  }],
  ['cancel during decode waits for the actual API and closes the late bitmap before any encode', async () => {
    install(); decodeTask = deferred(); const abort = new AbortController()
    const pending = compressFile(file, options, abort.signal)
    let settled = false; pending.then(() => { settled = true }, () => { settled = true })
    abort.abort(); await flush(); assert.equal(settled, false)
    decodeTask.resolve({ width: 400, height: 200, close() { closed++ } })
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(encoded, 0); assert.equal(closed, 1)
  }],
  ['cancel during encode drains its callback and closes the image without returning stale output', async () => {
    install(); encodeTask = deferred(); const abort = new AbortController()
    const pending = compressFile(file, options, abort.signal)
    let settled = false; pending.then(() => { settled = true }, () => { settled = true })
    await flush(); assert.equal(encoded, 1)
    abort.abort(); await flush(); assert.equal(settled, false)
    encodeTask.resolve(new Blob(['late'], { type: 'image/jpeg' }))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(encoded, 1); assert.equal(closed, 1)
  }],
  ['target-size search checks cancellation after each encode without further rounds', async () => {
    let calls = 0
    const abort = new AbortController()
    await assert.rejects(fitToSize(async () => { calls++; if (calls === 3) abort.abort(); return { size: 1000 } }, 10, { signal: abort.signal }), { name: 'AbortError' })
    assert.equal(calls, 3)
  }],
  ['legacy compress call without a signal keeps MIME, dimensions, quality and cleanup', async () => {
    install()
    const result = await compressFile(file, options)
    assert.deepEqual([result.width, result.height, result.srcWidth, result.srcHeight, result.quality, result.mime, result.ok], [100, 50, 400, 200, 0.8, 'image/jpeg', true])
    assert.equal(result.blob.type, 'image/jpeg')
    assert.equal(encoded, 1); assert.equal(closed, 1)
    assert.deepEqual(draws[0].slice(1), [0, 0, 100, 50])
  }],
  ['normal HTML decode and canvas encode fallback still work with omitted or active signals', async () => {
    let htmlDecodes = 0, htmlEncodes = 0
    const canvases: { width: number; height: number }[] = []
    define('createImageBitmap', async () => { throw new Error('bitmap unsupported') })
    define('Image', class { naturalWidth = 40; naturalHeight = 20; async decode() { htmlDecodes++ } })
    const context = () => ({ fillRect() {}, drawImage() {} })
    define('OffscreenCanvas', class { getContext() { return context() } async convertToBlob() { throw new Error('offscreen unsupported') } })
    define('document', { createElement() {
      const canvas = { width: 0, height: 0, getContext: context, toBlob(callback: (blob: Blob) => void, mime: string) { htmlEncodes++; callback(new Blob(['fallback'], { type: mime })) } }
      canvases.push(canvas)
      return canvas
    } })
    for (const signal of [undefined, new AbortController().signal]) {
      const decoded = await decodeImage(file, signal)
      assert.deepEqual([decoded.width, decoded.height], [40, 20])
      const output = await encodeImage(decoded.src, 20, 10, 'image/jpeg', 0.8, signal)
      assert.equal(output.type, 'image/jpeg'); assert.equal(await output.text(), 'fallback')
      decoded.close()
    }
    assert.equal(htmlDecodes, 2); assert.equal(htmlEncodes, 2)
    assert.ok(canvases.every(canvas => canvas.width === 0 && canvas.height === 0))
  }],
  ['shared consumer filename paths preserve suffixes and avoid original/generated collisions', async () => {
    const inputs = ['a.png', 'a.png', 'a (2).png', 'A.png']
    const converted = uniqueNames(inputs.map(name => convertName(name, 'jpeg')))
    assert.deepEqual(converted, ['a.jpg', 'a (3).jpg', 'a (2).jpg', 'A (4).jpg'])
    const resized = uniqueNames(inputs.map(name => outputName(name, 'image/jpeg', '_100x50')))
    assert.deepEqual(resized, ['a_100x50.jpg', 'a_100x50 (2).jpg', 'a (2)_100x50.jpg', 'A_100x50 (3).jpg'])
    const pdfs = uniqueNames([outName('doc.pdf', 'p1'), outName('doc.pdf', 'p1'), 'doc_p1 (2).pdf'])
    assert.deepEqual(pdfs, ['doc_p1.pdf', 'doc_p1 (3).pdf', 'doc_p1 (2).pdf'])
    for (const names of [converted, resized, pdfs]) assert.equal(new Set(names.map(name => name.toLowerCase())).size, names.length)
  }],
  ['real JSZip archive contains every distinct entry and its original binary content', async () => {
    const names = uniqueNames(['a.jpg', 'a.jpg', 'a (2).jpg', 'A.jpg'])
    const payloads = names.map((_, index) => new Uint8Array([0, index, 255, 17 + index]))
    const zip = new JSZip()
    names.forEach((name, index) => zip.file(name, payloads[index]))
    const encoded = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
    const extracted = await JSZip.loadAsync(encoded)
    assert.deepEqual(Object.keys(extracted.files), names)
    for (let index = 0; index < names.length; index++) assert.deepEqual(await extracted.file(names[index])!.async('uint8array'), payloads[index])
  }],
]
try {
  const selected = process.argv.includes('--fallback-only') ? checks.filter(([name]) => name.includes('fallback')) : checks
  for (const [name, run] of selected) { await run(); console.log('PASS', name) }
  console.log(`${selected.length} image cancellation/shared ZIP checks passed`)
} finally {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
}
