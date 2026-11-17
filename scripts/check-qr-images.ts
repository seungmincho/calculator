import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Worker } from 'node:worker_threads'
import {
  QR_IMAGE_LIMITS, checkQrImageSelection, checkQrImageSize, checkQrImageDimensions,
  qrImageDimensions, qrImageCanvasSize, qrImagesText, qrImageHttpLink, canRetryQrImage,
} from '../src/utils/qrImageBatch.ts'
import { parseQrScanHistory, writeQrScanHistory } from '../src/utils/qrScanHistory.ts'
const require = createRequire(import.meta.url)
const QRCode = require('qrcode'), { PNG } = require('pngjs'), esbuild = require('esbuild')
let count = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); count++; console.log('PASS', name) }
const arrayBuffer = (bytes: Uint8Array) => Uint8Array.from(bytes).buffer
await check('selection and byte/pixel limits include exact boundary and reject one above', () => {
  assert.equal(checkQrImageSelection(Array.from({ length: 10 }, () => ({ size: 4 * 1024 * 1024 }))), null)
  assert.equal(checkQrImageSelection(Array.from({ length: 11 }, () => ({ size: 1 }))), 'count')
  assert.equal(checkQrImageSelection([{ size: QR_IMAGE_LIMITS.totalBytes + 1 }]), 'total')
  checkQrImageSize(QR_IMAGE_LIMITS.fileBytes); assert.throws(() => checkQrImageSize(QR_IMAGE_LIMITS.fileBytes + 1)); assert.throws(() => checkQrImageSize(0))
  checkQrImageDimensions(4096, 4096); assert.throws(() => checkQrImageDimensions(4096, 4097))
  assert.deepEqual(qrImageCanvasSize(4096, 4096), { width: 2048, height: 2048, scaled: true })
  assert.deepEqual(qrImageCanvasSize(512, 256), { width: 512, height: 256, scaled: false })
})
await check('PNG/GIF/JPEG/WebP headers are bounded and malformed sources fail', () => {
  const png = PNG.sync.write({ width: 16, height: 12, data: Buffer.alloc(16 * 12 * 4, 255) })
  assert.deepEqual(qrImageDimensions(arrayBuffer(png)), { width: 16, height: 12, format: 'png' })
  const gif = Buffer.from('47494638396110000c00000000', 'hex')
  assert.deepEqual(qrImageDimensions(arrayBuffer(gif)), { width: 16, height: 12, format: 'gif' })
  const jpeg = Buffer.from('ffd8ffc0000808000c001001ffd9', 'hex')
  assert.deepEqual(qrImageDimensions(arrayBuffer(jpeg)), { width: 16, height: 12, format: 'jpeg' })
  const webp = Buffer.alloc(30); webp.write('RIFF'); webp.writeUInt32LE(22, 4); webp.write('WEBPVP8X', 8); webp.writeUInt32LE(10, 16); webp[24] = 15; webp[27] = 11
  assert.deepEqual(qrImageDimensions(arrayBuffer(webp)), { width: 16, height: 12, format: 'webp' })
  for (const bad of [jpeg.subarray(0, 8), webp.subarray(0, 25), Buffer.from('<svg width="4"/>')]) assert.throws(() => qrImageDimensions(arrayBuffer(bad)))
  const oversized = Buffer.from(png); oversized.writeUInt32BE(4097, 16); oversized.writeUInt32BE(4096, 20)
  assert.throws(() => qrImageDimensions(arrayBuffer(oversized)), /dimensions/)
})
await check('TXT preserves payload whitespace and duplicate file mapping; only selected successes are exported', () => {
  const rows = [{ id: 'a', index: 0, name: 'same\nname.png', status: 'success' as const, text: '  한글\nhttps://example.com/?a=1  ' }, { id: 'b', index: 1, name: 'same\nname.png', status: 'success' as const, text: 'same' }, { id: 'c', index: 2, name: 'bad.png', status: 'readFailed' as const }]
  assert.equal(qrImagesText(rows, new Set(['a', 'c'])), '1. same name.png\n  한글\nhttps://example.com/?a=1  ')
  assert.match(qrImagesText(rows, new Set(['a', 'b'])), /2\. same name.png\nsame$/)
  assert.equal(qrImageHttpLink('javascript:alert(1)'), null); assert.equal(qrImageHttpLink('mailto:a@example.com'), null)
  assert.equal(qrImageHttpLink('https://example.com/'), 'https://example.com/')
  assert.equal(canRetryQrImage({ ...rows[2], error: 'format' }), false)
  assert.equal(canRetryQrImage({ ...rows[2], status: 'canceled' }), true)
})
await check('history corruption/quota/stale/readback preserve explicit failure distinctions', () => {
  for (const raw of ['{}', '[null]', '{"version":2}', '[{"content":"x","type":"text","timestamp":1,"extra":1}]']) assert.equal(parseQrScanHistory(raw).ok, false)
  const empty = parseQrScanHistory(null), item = { content: 'private', type: 'text', timestamp: 100 }
  let raw: string | null = null, failRead = false
  const storage = { getItem: () => { if (failRead) throw new Error('read'); return raw }, setItem: (_key: string, value: string) => { raw = value }, removeItem: () => { raw = null } }
  const saved = writeQrScanHistory(empty, [item], storage); assert.equal(saved.ok, true)
  assert.deepEqual(writeQrScanHistory(empty, [], storage), { ok: false, error: 'conflict' })
  assert.deepEqual(writeQrScanHistory(saved, [item], { ...storage, setItem() { throw new DOMException('full', 'QuotaExceededError') } }), { ok: false, error: 'quota' })
  const unverified = writeQrScanHistory(saved, [{ ...item, content: 'new' }], { ...storage, setItem(_key, value) { raw = value; failRead = true } })
  assert.deepEqual(unverified, { ok: false, error: 'unverified' }); assert.match(raw!, /new/)
})

const built = esbuild.buildSync({ entryPoints: ['src/lib/qr/qrImage.worker.ts'], bundle: true, write: false, platform: 'browser', format: 'iife', minify: true }).outputFiles[0].text
const { gzipSync } = require('node:zlib')
console.log(`Worker isolated minified bytes=${Buffer.byteLength(built)}, gzip=${gzipSync(built).byteLength}; not a production chunk measurement`)
async function decode(data: Uint8Array, width: number, height: number, requestId = 1): Promise<{ requestId: number; type: string; text?: string }> {
  const worker = new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:value=>parentPort.postMessage(value)};parentPort.on('message',value=>self.onmessage({data:value}));${built}`, { eval: true })
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Worker test timeout')), 10_000)
      worker.once('message', value => { clearTimeout(timer); resolve(value) }); worker.once('error', error => { clearTimeout(timer); reject(error) })
      const pixels = arrayBuffer(data); worker.postMessage({ requestId, width, height, pixels }, [pixels])
    })
  } finally { await worker.terminate() }
}
await check('actual bundled jsQR Worker decodes Korean and UTF8 URLs from qrcode PNG pixels', async () => {
  for (const payload of ['안녕하세요 · 가족 기념일\n둘째 줄', 'https://example.com/경로?q=원문%20유지']) {
    const png = PNG.sync.read(await QRCode.toBuffer(payload, { width: 512, margin: 4, errorCorrectionLevel: 'M' }))
    const result = await decode(png.data, png.width, png.height)
    assert.equal(result.type, 'found'); assert.equal(result.text, payload)
  }
})
await check('actual Worker reports no code and validates malformed pixel buffers', async () => {
  assert.equal((await decode(new Uint8Array(256 * 256 * 4).fill(255), 256, 256)).type, 'notFound')
  assert.equal((await decode(new Uint8Array(4), 256, 256)).type, 'error')
})
await check('actual two-code image returns one valid code without a uniqueness or spatial-order claim', async () => {
  const payloads = ['왼쪽 QR', '오른쪽 QR'], images = await Promise.all(payloads.map(async (payload, index) => PNG.sync.read(await QRCode.toBuffer(payload, { width: index ? 128 : 512, margin: 4 }))))
  const pixels = Buffer.alloc(1024 * 640 * 4, 255)
  images.forEach((image, index) => { for (let y = 0; y < image.height; y++) image.data.copy(pixels, ((y + 32) * 1024 + 32 + index * 560) * 4, y * image.width * 4, (y + 1) * image.width * 4) })
  const result = await decode(pixels, 1024, 640)
  assert.equal(result.type, 'found'); assert.ok(payloads.includes(result.text!))
})
console.log(`${count} QR image domain/actual Worker groups passed`)
