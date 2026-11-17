import assert from 'node:assert/strict'
import fs from 'node:fs'
import { transform } from 'esbuild'
import { createWatermarkSnapshot, DEFAULT_WATERMARK_DRAFT as D, WATERMARK_LIMITS as L, WATERMARK_POSITIONS, watermarkLayout, captureWatermarkZip } from '../../../src/utils/imageWatermark.ts'
import { createWatermarkQueue } from '../../../src/utils/imageWatermarkQueue.ts'
import { createWatermarkZipController } from '../../../src/utils/imageWatermarkZip.ts'
import { drawWatermarkCanvas } from '../../../src/lib/imageWatermark/browser.ts'
import { decodeImage } from '../../../src/utils/imageCompress.ts'

// Host I/O declarations only; none of the author's assertions are imported/executed.
const sourceUrl = new URL('../../../scripts/check-image-watermark-browser.ts', import.meta.url)
const source = fs.readFileSync(sourceUrl, 'utf8')
const prefix = source.slice(0, source.indexOf('await check(')).replace(/from '(\.\.\/src\/[^']+)'/g, (_all, path) => `from ${JSON.stringify(new URL(path, sourceUrl).href)}`)
const converted = await transform(prefix + '\nexport { fixture, header, image, deferred };', { loader: 'ts', format: 'esm', target: 'esnext' })
const { fixture, header, image, deferred } = await import(`data:text/javascript;base64,${Buffer.from(converted.code).toString('base64')}`)
const flush = () => new Promise(resolve => setImmediate(resolve))
const rejects = (promise, code) => assert.rejects(promise, error => error?.code === code)
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

class MatrixContext {
  matrix = [1, 0, 0, 1, 0, 0]; stack = []; marks = []; globalAlpha = 1; font = ''; measured = 77.5
  save() { this.stack.push({ matrix: [...this.matrix], alpha: this.globalAlpha }) }
  restore() { const old = this.stack.pop(); this.matrix = old.matrix; this.globalAlpha = old.alpha }
  scale(x, y) { const [a, b, c, d, e, f] = this.matrix; this.matrix = [a * x, b * x, c * y, d * y, e, f] }
  translate(x, y) { const [a, b, c, d, e, f] = this.matrix; this.matrix = [a, b, c, d, e + a * x + c * y, f + b * x + d * y] }
  rotate(angle) { const [a, b, c, d, e, f] = this.matrix, cos = Math.cos(angle), sin = Math.sin(angle); this.matrix = [a * cos + c * sin, b * cos + d * sin, -a * sin + c * cos, -b * sin + d * cos, e, f] }
  record(kind, x, y, width, height) { const [a, b, c, d, e, f] = this.matrix; this.marks.push({ kind, point: [a * x + c * y + e, b * x + d * y + f], axis: [a, b, c, d], width, height, alpha: this.globalAlpha }) }
  drawImage(_source, x, y, width, height) { this.record('image', x, y, width, height) }
  fillText(_text, x, y) { this.record('text', x, y) }
  measureText() { return { width: this.measured } }
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)

await check('Independent affine oracle: nine anchors, source dimensions, rotation, alpha and preview/output geometry', () => {
  for (const [width, height] of [[2401, 1603], [203, 401], [1, 3]]) for (const type of ['text', 'image']) for (let p = 0; p < 9; p++) for (const rotation of [-180, -37, 0, 90, 180]) {
    const logo = { id: 'logo', file: new File(['x'], 'logo'), width: 31, height: 19 }
    const snapshot = createWatermarkSnapshot({ ...D, watermarkType: type, fontSize: 36, watermarkSize: 35, position: WATERMARK_POSITIONS[p], rotation, opacity: 37, margin: 7 }, type === 'image' ? logo : null)
    const output = new MatrixContext(), preview = new MatrixContext(), tw = Math.max(1, Math.floor(width / 3)), th = Math.max(1, Math.floor(height / 3))
    drawWatermarkCanvas(output, {}, width, height, snapshot, type === 'image' ? {} : null)
    drawWatermarkCanvas(preview, {}, width, height, snapshot, type === 'image' ? {} : null, tw, th)
    const w = type === 'text' ? 77.5 : width * 0.35, h = type === 'text' ? 36 : w * 19 / 31
    const x = [7 + w / 2, width / 2, width - 7 - w / 2][p % 3], y = [7 + h / 2, height / 2, height - 7 - h / 2][Math.floor(p / 3)]
    const angle = rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle)
    const expected = type === 'text' ? [x, y] : [x - w * cos / 2 + h * sin / 2, y - w * sin / 2 - h * cos / 2]
    assert.equal(output.marks.length, 2); assert.equal(output.marks[0].alpha, 1); assert.equal(output.marks[1].alpha, 0.37)
    for (let axis = 0; axis < 2; axis++) { close(output.marks[1].point[axis], expected[axis]); close(preview.marks[1].point[axis], expected[axis] * (axis ? th / height : tw / width)) }
    close(preview.marks[1].axis[0], cos * tw / width); close(preview.marks[1].axis[1], sin * th / height)
    assert.equal(output.globalAlpha, 1); assert.deepEqual(output.matrix, [1, 0, 0, 1, 0, 0])
  }
})

await check('Exact tile cap and active-mode text/color snapshot policies preserve the raw draft', () => {
  const raw = { ...D, text: '😀'.repeat(198) + '\r\nX', fontColor: '#aBcD12' }, original = structuredClone(raw)
  const snapshot = createWatermarkSnapshot(raw)
  assert.equal(Array.from(snapshot.settings.text).length, 200); assert.equal(snapshot.settings.fontColor, '#ABCD12'); assert.deepEqual(raw, original)
  assert.throws(() => createWatermarkSnapshot({ ...D, text: '😀'.repeat(201) }), /text/)
  for (const color of ['red', '#fff', '#12345678', ' #123456', '#gggggg']) assert.throws(() => createWatermarkSnapshot({ ...D, fontColor: color }), /color/)
  const tile = createWatermarkSnapshot({ ...D, tileMode: true, fontSize: 10, margin: 0 })
  assert.equal(watermarkLayout(300, 400, tile, 10).tile.draws, 10000)
  const c = new MatrixContext(); c.measured = 10; drawWatermarkCanvas(c, {}, 300, 400, tile, null)
  assert.equal(c.marks.filter(mark => mark.kind === 'text').length, 10000)
  assert.throws(() => watermarkLayout(300, 400, tile, 9.999), /tileLimit/)
  assert.throws(() => watermarkLayout(300, 400, tile, 0), /tileSpacing/)
  const inactive = createWatermarkSnapshot({ ...D, watermarkType: 'image', text: '', fontColor: 'bad' }, { id: 'L', file: new File(['x'], 'logo'), width: 2, height: 1 })
  assert.equal(Object.hasOwn(inactive.settings, 'fontColor'), false)
})

await check('Public adapter jobs share one physical gate across source/logo/output; stale queued jobs allocate nothing', async () => {
  const f = fixture(), held = deferred(); let firstCurrent = true, logoCurrent = true, reads = 0
  f.read(file => ++reads === 1 ? held.promise : file.arrayBuffer())
  const first = f.adapter.sourcePreview(image('source-old'), () => firstCurrent), firstRejected = rejects(first, 'canceled')
  const skippedLogo = f.adapter.logo(image('logo-skip'), 'skip', () => logoCurrent), logoRejected = rejects(skippedLogo, 'canceled')
  const output = f.adapter.process(image('source-current'), createWatermarkSnapshot(D), () => true)
  await flush(); firstCurrent = false; logoCurrent = false
  assert.equal(reads, 1); assert.deepEqual(f.decoded, []); assert.equal(f.adapter.getWorkState().pending, 2)
  held.resolve(header()); await firstRejected; await logoRejected; const result = await output
  assert.equal(reads, 2); assert.deepEqual(f.decoded, ['source-current']); assert.deepEqual(f.closed, ['source-current'])
  f.adapter.release(result); f.adapter.dispose(); assert.equal(f.revoked.length, 1)
})

await check('Header limits precede decode and actual EXIF dimension swap is retained; default decoder closes bitmap', async () => {
  const f = fixture()
  await rejects(f.adapter.process(image('too-many', 16777217, 1), createWatermarkSnapshot(D), () => true), 'dimensions')
  await rejects(f.adapter.logo(image('logo-too-many', 4194305, 1), 'L', () => true), 'logoDimensions')
  await rejects(f.adapter.process(new File(['bad'], 'valid.jpg', { type: 'image/jpeg' }), createWatermarkSnapshot(D), () => true), 'format')
  assert.equal(f.decoded.length, 0)
  const photo = image('rotated', 123, 321); f.actual.set(photo, { width: 321, height: 123 })
  const output = await f.adapter.process(photo, createWatermarkSnapshot(D), () => true)
  assert.equal(output.width, 321); assert.equal(output.height, 123); assert.deepEqual(f.closed, ['rotated']); f.adapter.release(output); f.adapter.dispose()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap'); let closes = 0
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async (_file, options) => { assert.deepEqual(options, { imageOrientation: 'from-image' }); return { width: 321, height: 123, close() { closes++ } } } })
  try { const decoded = await decodeImage(photo); assert.equal(decoded.width, 321); assert.equal(decoded.height, 123); decoded.close(); assert.equal(closes, 1) }
  finally { if (previous) Object.defineProperty(globalThis, 'createImageBitmap', previous); else delete globalThis.createImageBitmap }
})

await check('Logo failure preserves old assets; failed/stale PNG keeps its slot until finally and never creates a late URL', async () => {
  const f = fixture(), base = await f.adapter.sourcePreview(image('base'), () => true), logo = await f.adapter.logo(image('valid-logo'), 'L', () => true)
  await rejects(f.adapter.logo(new File(['bad'], 'bad.png'), 'new', () => true), 'format')
  assert.ok(base.canvas.width > 0); assert.ok(logo.thumbnail.width > 0)
  const snapshot = createWatermarkSnapshot({ ...D, watermarkType: 'image' }, logo), preview = await f.adapter.preview(base, snapshot, logo, () => true)
  assert.ok(preview.canvas.width > 0)
  const pending = deferred(); let current = true
  f.png(() => pending.promise)
  const old = f.adapter.process(image('old-output'), snapshot, () => current), oldRejected = rejects(old, 'canceled'); await flush()
  const activeCanvas = f.canvases.at(-1); current = false; f.adapter.dispose()
  assert.equal(base.canvas.width, 0); assert.equal(logo.thumbnail.width, 0); assert.ok(activeCanvas.width > 0); assert.equal(f.adapter.getWorkState().active, true)
  pending.reject(new Error('late encoder failure')); await oldRejected
  assert.equal(activeCanvas.width, 0); assert.equal(f.urls.length, 0); assert.equal(f.adapter.getWorkState().active, false)
  assert.equal(f.closed.filter(name => name === 'old-output').length, 1); assert.equal(f.closed.filter(name => name === 'valid-logo').length, 2)
})

function queueFixture() {
  const jobs = [], released = []
  const queue = createWatermarkQueue({ process(file, snapshot, signal) { const job = deferred(); jobs.push({ file, snapshot, signal, job }); return job.promise }, release: out => released.push(out.id) })
  const out = (id, size) => ({ id, blob: { size, type: 'image/png' } })
  return { queue, jobs, released, out }
}

await check('Independent output-byte ledger respects 80MiB, failure retry, deletion and ID reuse without stale replacement', async () => {
  const f = queueFixture(), snapshot = createWatermarkSnapshot(D)
  f.queue.add(['a', 'b', 'c'].map(id => ({ id, file: new File(['x'], id) }))); f.queue.start(snapshot); await flush()
  f.jobs[0].job.resolve(f.out('a', L.outputBytes - 1)); await flush(); f.jobs[1].job.resolve(f.out('b', 1)); await flush(); f.jobs[2].job.resolve(f.out('c-excess', 1)); await flush()
  assert.equal(f.queue.getSnapshot().outputBytes, L.outputBytes); assert.deepEqual(f.released, ['c-excess']); assert.equal(f.queue.getSnapshot().items[2].status, 'error')
  f.queue.remove('b'); f.queue.retryFailed(['c']); await flush(); f.jobs[3].job.resolve(f.out('c', 1)); await flush()
  assert.equal(f.queue.getSnapshot().outputBytes, L.outputBytes); f.queue.invalidate(); assert.equal(f.queue.getSnapshot().outputBytes, 0)
  f.queue.start(snapshot); await flush(); const old = f.jobs.at(-1)
  f.queue.remove('a'); f.queue.add([{ id: 'a', file: new File(['new'], 'replacement') }]); f.queue.start(snapshot); await flush(); assert.equal(f.jobs.at(-1), old)
  old.job.resolve(f.out('late-old-a', 3)); await flush(); assert.ok(f.released.includes('late-old-a'))
  f.queue.dispose(); f.jobs.at(-1).job.resolve(f.out('late-after-dispose', 4)); await flush()
  assert.equal(new Set(f.released).size, f.released.length)
})

await check('Selected ZIP capture uses original Blob refs and safe unique names; invalidation holds real encode busy', async () => {
  const blobs = [new Blob(['first']), new Blob(['second']), new Blob(['third'])]
  const rows = blobs.map((blob, i) => ({ id: String(i), file: { name: ['../../photo.jpg', 'PHOTO.png', 'bad\u0000name.gif'][i] }, status: 'done', key: 'K', out: { blob, width: 1, height: 1, url: 'blob:' + i } }))
  rows.push({ id: 'failure', file: { name: 'fail.png' }, status: 'error', key: 'K' })
  const capture = captureWatermarkZip(rows, new Set(['0', '1', '2', 'failure']), 'K')
  assert.equal(capture.successCount, 3); assert.equal(capture.unavailableCount, 1)
  assert.deepEqual(capture.snapshot.entries.map(row => row.name), ['photo_watermarked.png', 'PHOTO_watermarked (2).png', 'bad_name_watermarked.png'])
  rows[0].out = undefined; rows.reverse(); assert.equal(capture.snapshot.entries[0].blob, blobs[0]); assert.equal(await capture.snapshot.entries[0].blob.text(), 'first')
  const held = deferred(), downloaded = []; let calls = 0
  const zip = createWatermarkZipController({ encode: async entries => { calls++; assert.equal(entries[0].blob, blobs[0]); return calls === 1 ? held.promise : new Blob(['new zip']) }, download: (...args) => downloaded.push(args) })
  const old = zip.run(capture.snapshot); await flush(); zip.invalidate()
  assert.equal(zip.getSnapshot().busy, true); assert.equal(await zip.run(capture.snapshot), 'busy'); assert.equal(calls, 1)
  held.resolve(new Blob(['old zip'])); assert.equal(await old, 'stale'); assert.equal(downloaded.length, 0)
  assert.equal(await zip.run(capture.snapshot), 'downloaded'); assert.equal(downloaded.length, 1); zip.dispose()
})

await check('Failure-only retry after pause does not restart unrelated pending rows', async () => {
  const f = queueFixture(); f.queue.add(['a', 'b', 'c'].map(id => ({ id, file: new File(['x'], id) }))); f.queue.start(createWatermarkSnapshot(D)); await flush()
  f.jobs[0].job.reject(new Error('failed a')); await flush(); f.queue.pause(); f.jobs[1].job.resolve(f.out('canceled b', 1)); await flush()
  assert.deepEqual(f.queue.getSnapshot().items.map(row => row.status), ['error', 'pending', 'pending'])
  f.queue.retryFailed(); await flush(); f.jobs[2].job.resolve(f.out('retried a', 1)); await flush()
  const started = f.jobs.map(job => job.file.name)
  f.queue.dispose(); if (f.jobs.length > 3) { f.jobs[3].job.resolve(f.out('cleanup', 1)); await flush() }
  assert.deepEqual(started, ['a', 'b', 'a'])
})

console.log(`Watermark independent pure/adapter review: ${groups} groups passed; simulated canvas commands and metadata, actual browser pixels/ZIP separate.`)
