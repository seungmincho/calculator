import assert from 'node:assert/strict'
import * as image from '../../../src/utils/aspectRatioImage.ts'
import { createAspectImageAdapter } from '../../../src/lib/aspectRatioImage/browser.ts'

// Independent inputs/oracles. No assertions or fixture code from the author's tests.
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export const flush = () => new Promise(resolve => setImmediate(resolve))
export function sourceFile(name = 'landscape.png', width = 600, height = 200) {
  const bytes = new Uint8Array(33), data = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); data.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12); data.setUint32(16, width); data.setUint32(20, height)
  return new File([bytes], name, { type: 'image/png' })
}
export const settings = (change = {}) => ({ width: 400, height: 400, fit: 'crop', padColor: '#ffffff', x: 50, y: 50, ...change })
export function imagePorts() {
  const canvases = [], decodes = [], closes = [], reads = [], encodes = []
  const io = { decodeWait: null, encodeWait: null, readFailure: false, decodeDimensions: null, still: true }
  const ports = {
    async read(file) { reads.push(file.name); if (io.readFailure) throw new Error('read unavailable'); return file.arrayBuffer() },
    async decode(file) {
      decodes.push(file.name); const data = new DataView(await file.arrayBuffer())
      const decoded = { src: { name: file.name }, width: io.decodeDimensions?.[0] ?? data.getUint32(16), height: io.decodeDimensions?.[1] ?? data.getUint32(20), still: io.still, close: () => closes.push(file.name) }
      if (io.decodeWait) await io.decodeWait.promise
      return decoded
    },
    canvas(width, height) {
      const draws = [], fills = [], canvas = { width, height, style: {}, setAttribute() {}, draws, fills,
        getContext() { return { save() {}, restore() {}, clearRect() {}, drawImage(...args) { draws.push(args) }, fillRect(...args) { fills.push(args) } } } }
      canvases.push(canvas); return canvas
    },
    async encode(canvas, mime) { encodes.push({ canvas, mime }); if (io.encodeWait) await io.encodeWait.promise; return new Blob(['controlled native bytes'], { type: mime }) },
  }
  return { ports, io, canvases, decodes, closes, reads, encodes }
}

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${actual} != ${expected}`)
const tests = [], test = (name, run) => tests.push({ name, run })
test('independent scale oracle covers rounded output, source bounds, nine positions and arbitrary percentages', () => {
  let samples = 0
  for (const [sw, sh] of [[600, 200], [200, 600], [100, 100], [4000, 4000], [1, 8192]]) {
    for (const [requestedW, requestedH] of [[1920, 1080], [1080, 1920], [8192, 8192], [10000, 3001], [1, 8192]]) {
      const output = image.aspectOutputSize(requestedW, requestedH); assert.equal(output.ok, true)
      const tw = output.width, th = output.height, cover = Math.max(tw / sw, th / sh), contain = Math.min(tw / sw, th / sh)
      for (const x of [0, 13.7, 50, 100]) for (const y of [0, 81.3, 50, 100]) {
        const g = image.aspectImageGeometry(sw, sh, tw, th, x, y), cx = tw / cover, cy = th / cover
        near(g.crop.w, cx); near(g.crop.h, cy); near(g.crop.x, (sw - cx) * x / 100); near(g.crop.y, (sh - cy) * y / 100)
        near(g.pad.w, sw * contain); near(g.pad.h, sh * contain); near(g.pad.x * 2 + g.pad.w, tw); near(g.pad.y * 2 + g.pad.h, th)
        assert.ok(g.crop.x >= -1e-8 && g.crop.y >= -1e-8 && g.crop.x + g.crop.w <= sw + 1e-8 && g.crop.y + g.crop.h <= sh + 1e-8)
        near(g.crop.w * th, g.crop.h * tw); samples++
      }
    }
  }
  assert.equal(samples, 400)
})
test('exact pixel and edge boundaries distinguish accepted thin images from zero-rounded output', () => {
  assert.doesNotThrow(() => image.checkAspectImageDimensions(4000, 4000))
  assert.throws(() => image.checkAspectImageDimensions(4001, 4000), { code: 'dimensions' })
  assert.deepEqual(image.aspectOutputSize(4000, 4000), { ok: true, width: 4000, height: 4000, scaled: false })
  assert.deepEqual(image.aspectOutputSize(1, 8192), { ok: true, width: 1, height: 8192, scaled: false })
  assert.deepEqual(image.aspectOutputSize(1, 16000000), { ok: false, reason: 'tooThin' })
  assert.deepEqual(image.aspectOutputSize(8192, 8192), { ok: true, width: 4000, height: 4000, scaled: true })
  assert.deepEqual(image.aspectPreviewSize(1, 8192), { width: 1, height: 320, aspectRatio: 1 / 8192 })
  for (let width = 7991; width < 8450; width += 13) for (let height = 1801; height < 2500; height += 17) {
    const out = image.aspectOutputSize(width, height); assert.equal(out.ok, true)
    assert.ok(out.width <= 8192 && out.height <= 8192 && out.width * out.height <= 16000000)
  }
  for (const raw of ['Infinity', 'NaN', '2px', '0', '-1', '1e6', '9'.repeat(1000)]) assert.equal(image.parseAspectPixels(raw), null)
  const bad = image.readAspectQuery(new URLSearchParams('w=Infinity&h=0&lock=1&zone=bad'))
  assert.equal(bad.width, 'Infinity'); assert.equal(bad.height, '0'); assert.equal(bad.lockedRatio, null); assert.equal(bad.zone, 'none')
})
test('adapter uses identical rounded source crop for preview/export and normalizes pad in output space', async () => {
  const f = imagePorts(), adapter = createAspectImageAdapter(f.ports), source = await adapter.loadSource(sourceFile(), () => true)
  const draft = settings({ width: 10000, height: 3001, x: 17, y: 89 })
  const preview = await adapter.preview(source, draft, () => true), out = await adapter.export(source, draft, () => true)
  const previewDraw = preview.canvas.draws[0], exportDraw = f.encodes[0].canvas.draws[0]
  assert.deepEqual(previewDraw.slice(1, 5), exportDraw.slice(1, 5)); near(preview.aspectRatio, out.width / out.height)
  assert.notEqual(out.width / out.height, draft.width / draft.height)
  assert.ok(preview.canvas.width <= 320 && preview.canvas.height <= 320)
  const pad = await adapter.preview(source, settings({ width: 1, height: 8192, fit: 'pad' }), () => true)
  const [, px, py, pw, ph] = pad.canvas.draws[0]
  near(px, 0); near(pw, pad.canvas.width); near(py + ph / 2, pad.canvas.height / 2)
  const temp = f.encodes[0].canvas; assert.deepEqual([temp.width, temp.height], [0, 0])
  preview.release(); preview.release(); pad.release(); source.release(); source.release(); adapter.dispose()
  assert.deepEqual(f.closes, ['landscape.png']); assert.ok(f.canvases.every(c => c.width === 0 && c.height === 0))
})
test('oversized header prevents decode; oversized decoded dimensions close only new failed source', async () => {
  const f = imagePorts(), adapter = createAspectImageAdapter(f.ports), source = await adapter.loadSource(sourceFile('A.png'), () => true)
  await assert.rejects(adapter.loadSource(sourceFile('large.png', 4000, 4001), () => true), { code: 'dimensions' }); assert.deepEqual(f.decodes, ['A.png'])
  f.io.decodeDimensions = [4001, 4000]
  await assert.rejects(adapter.loadSource(sourceFile('B.png'), () => true), { code: 'dimensions' }); assert.deepEqual(f.closes, ['B.png'])
  f.io.decodeDimensions = null; const kept = await adapter.preview(source, settings(), () => true); assert.equal(kept.canvas.draws[0][0].name, 'A.png')
  adapter.dispose(); assert.deepEqual(f.closes, ['B.png', 'A.png'])
})
test('canceled decode owns physical slot until finally; queued current source begins only afterward', async () => {
  const f = imagePorts(), adapter = createAspectImageAdapter(f.ports), pending = deferred(), abort = new AbortController()
  f.io.decodeWait = pending
  const old = adapter.loadSource(sourceFile('old.png'), () => true, abort.signal); const oldOutcome = old.catch(error => error.code)
  await flush(); abort.abort(); f.io.decodeWait = null
  const next = adapter.loadSource(sourceFile('next.png'), () => true)
  await flush(); assert.deepEqual(f.decodes, ['old.png']); assert.deepEqual(adapter.getWorkState(), { active: true, pending: 1 })
  pending.resolve(); assert.equal(await oldOutcome, 'canceled'); const current = await next
  assert.deepEqual(f.decodes, ['old.png', 'next.png']); assert.deepEqual(f.closes, ['old.png']); current.release(); adapter.dispose()
  assert.deepEqual(f.closes, ['old.png', 'next.png'])
})
test('stale export and queued preview cannot overlap native encode; dispose never returns late output', async () => {
  const f = imagePorts(), adapter = createAspectImageAdapter(f.ports), source = await adapter.loadSource(sourceFile(), () => true), done = deferred()
  f.io.encodeWait = done; let current = true
  const exported = adapter.export(source, settings(), () => current).catch(error => error.code)
  await flush(); const nativeCanvas = f.encodes[0].canvas; current = false
  const preview = adapter.preview(source, settings({ x: 0 }), () => true).catch(error => error.code)
  await flush(); assert.equal(f.canvases.length, 1); assert.ok(nativeCanvas.width > 0); assert.equal(adapter.getWorkState().pending, 1)
  adapter.dispose(); done.resolve(); assert.equal(await exported, 'canceled'); assert.equal(await preview, 'canceled')
  assert.deepEqual([nativeCanvas.width, nativeCanvas.height], [0, 0]); assert.deepEqual(f.closes, ['landscape.png'])
  assert.deepEqual(adapter.getWorkState(), { active: false, pending: 0 })
})
test('mutable queued settings are captured, frozen HTML frame owns its canvas and original decode closes once', async () => {
  const f = imagePorts(); f.io.still = false
  const adapter = createAspectImageAdapter(f.ports), source = await adapter.loadSource(sourceFile(), () => true)
  assert.deepEqual(f.closes, ['landscape.png']); const draft = settings({ x: 0 })
  const first = adapter.preview(source, draft, () => true); draft.x = 100; const preview = await first
  assert.equal(preview.canvas.draws[0][1], 0)
  source.release(); adapter.dispose(); assert.deepEqual(f.closes, ['landscape.png']); assert.ok(f.canvases.every(c => c.width === 0 && c.height === 0))
})

if (process.argv[1]?.endsWith('check-aspect-independent.mjs')) {
  for (const { name, run } of tests) { await run(); console.log('PASS', name) }
  console.log(`Aspect independent logic/resource: ${tests.length} groups passed`)
}
