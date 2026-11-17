import assert from 'node:assert/strict'
import { createAspectImageAdapter, type AspectDecoded } from '../src/lib/aspectRatioImage/browser.ts'
import { AspectImageError, ASPECT_IMAGE_LIMITS as L, type AspectImageSettings } from '../src/utils/aspectRatioImage.ts'

const current = () => true, flush = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function header(width = 400, height = 300) { const bytes = new Uint8Array(33), view = new DataView(bytes.buffer); bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height); return bytes.buffer }
const file = (name: string, w = 400, h = 300) => new File([header(w, h)], name, { type: 'application/octet-stream' })
const settings = (overrides: Partial<AspectImageSettings> = {}): AspectImageSettings => ({ width: 1080, height: 1920, fit: 'crop', padColor: '#000000', x: 50, y: 50, ...overrides })
class Context {
  images: unknown[][] = []; fills: number[][] = []; clears: number[][] = []; saves = 0; restores = 0; imageSmoothingEnabled = false; imageSmoothingQuality = ''; fillStyle = ''
  save() { this.saves++ } restore() { this.restores++ } clearRect(...args: number[]) { this.clears.push(args) } fillRect(...args: number[]) { this.fills.push(args) } drawImage(...args: unknown[]) { this.images.push(args) }
}
class Canvas { width: number; height: number; ctx = new Context(); context = true; constructor(w: number, h: number) { this.width = w; this.height = h } getContext() { return this.context ? this.ctx : null } }
function fixture() {
  const canvases: Canvas[] = [], decodes: string[] = [], closed: string[] = [], encoded: string[] = []
  let read = (blob: Blob) => blob.arrayBuffer(), decode = async (blob: Blob): Promise<AspectDecoded> => {
    const name = (blob as File).name; decodes.push(name)
    return { src: { name } as unknown as CanvasImageSource, width: 400, height: 300, still: true, close: () => { closed.push(name) } }
  }
  let encode = async (_canvas: HTMLCanvasElement, mime: 'image/png' | 'image/jpeg'): Promise<Blob | null> => { encoded.push(mime); return new Blob(['synthetic bytes'], { type: mime }) }
  let makeCanvas = (w: number, h: number) => new Canvas(w, h)
  const adapter = createAspectImageAdapter({ read: blob => read(blob), decode: blob => decode(blob), encode: (canvas, mime) => encode(canvas, mime), canvas: (w, h) => { const canvas = makeCanvas(w, h); canvases.push(canvas); return canvas as unknown as HTMLCanvasElement } })
  return { adapter, canvases, decodes, closed, encoded, read(port: typeof read) { read = port }, decode(port: typeof decode) { decode = port }, encode(port: typeof encode) { encode = port }, canvas(port: typeof makeCanvas) { makeCanvas = port } }
}
const rejectCode = (job: Promise<unknown>, code: string) => assert.rejects(job, error => error instanceof AspectImageError && error.code === code)
let groups = 0
async function check(name: string, run: () => Promise<void>) { await run(); groups++; console.log('PASS', name) }

await check('size and exact16m header validation precede decode; read and actual decode bounds are checked', async () => {
  const f = fixture()
  await rejectCode(f.adapter.loadSource({ size: L.inputBytes + 1 } as File, current), 'fileSize')
  await rejectCode(f.adapter.loadSource(file('header-16m-plus', 4001, 4000), current), 'dimensions')
  await rejectCode(f.adapter.loadSource(new File(['svg'], 'x.png', { type: 'image/png' }), current), 'format')
  assert.equal(f.decodes.length, 0)
  f.read(async () => new ArrayBuffer(L.inputBytes + 1)); await rejectCode(f.adapter.loadSource(file('actual-bytes'), current), 'fileSize')
  f.read(async () => { throw new Error('read') }); await rejectCode(f.adapter.loadSource(file('read'), current), 'read')
  f.read(blob => blob.arrayBuffer()); f.decode(async () => ({ src: {} as CanvasImageSource, width: 4096, height: 4096, still: true, close: () => f.closed.push('too-big') }))
  await rejectCode(f.adapter.loadSource(file('actual-pixels'), current), 'dimensions'); assert.deepEqual(f.closed, ['too-big']); assert.equal(f.canvases.length, 0); f.adapter.dispose()
})

await check('oriented native bitmap is retained once; HTML fallback is frozen and old good source survives failed replacement', async () => {
  const f = fixture(); f.decode(async () => ({ src: { orientation: 'swapped' } as unknown as CanvasImageSource, width: 300, height: 400, still: true, close: () => f.closed.push('A') }))
  const a = await f.adapter.loadSource(file('A', 400, 300), current); assert.equal(a.width, 300); assert.equal(a.height, 400); assert.equal(a.format, 'png'); assert.deepEqual(f.closed, [])
  f.decode(async () => { throw new Error('bad B') }); await rejectCode(f.adapter.loadSource(file('B'), current), 'decode'); const out = await f.adapter.export(a, settings(), current); assert.equal(out.mime, 'image/png'); assert.deepEqual(f.closed, [])
  f.decode(async () => ({ src: { animated: true } as unknown as CanvasImageSource, width: 400, height: 300, still: false, close: () => f.closed.push('HTML') }))
  const html = await f.adapter.loadSource(file('fallback'), current), frozen = f.canvases.at(-1)!
  assert.equal(html.source, frozen); assert.equal(frozen.ctx.images.length, 1); assert.deepEqual(f.closed, ['HTML'])
  await f.adapter.export(html, settings(), current); assert.equal(frozen.ctx.images.length, 1, 'export uses frozen pixels without sampling animated source again')
  html.release(); html.release(); assert.equal(frozen.width, 0); a.release(); a.release(); assert.deepEqual(f.closed, ['HTML', 'A']); f.adapter.dispose()
})

await check('preview and PNG export use identical final-output crop rect and normalized contain placement', async () => {
  const f = fixture(), source = await f.adapter.loadSource(file('A'), current)
  for (const fit of ['crop', 'pad'] as const) {
    const draft = settings({ width: 5001, height: 5000, fit, x: 13, y: 87 }), preview = await f.adapter.preview(source, draft, current), pc = f.canvases.at(-1)!
    const output = await f.adapter.export(source, draft, current), ec = f.canvases.at(-1)!, p = pc.ctx.images.at(-1)!, e = ec.ctx.images.at(-1)!
    assert.equal(output.width * output.height <= 16_000_000, true); assert.equal(preview.aspectRatio, output.width / output.height)
    if (fit === 'crop') { assert.deepEqual(p.slice(1, 5), e.slice(1, 5)); assert.deepEqual(e.slice(5), [0, 0, output.width, output.height]) }
    else for (let i = 1; i <= 4; i++) { const pd = i % 2 ? pc.width : pc.height, ed = i % 2 ? output.width : output.height; assert.ok(Math.abs(Number(p[i]) / pd - Number(e[i]) / ed) < 1e-10) }
    assert.equal(ec.width, 0); assert.equal(ec.height, 0); assert.equal(pc.ctx.saves, pc.ctx.restores); preview.release(); assert.equal(pc.width, 0)
  }
  source.release(); f.adapter.dispose()
})

await check('canceled native decode keeps physical slot until resolution, then closes old resource before next job', async () => {
  const f = fixture(), waiting = deferred<AspectDecoded>(); let alive = true
  f.decode(async blob => { const name = (blob as File).name; f.decodes.push(name); if (name === 'A') return waiting.promise; return { src: {} as CanvasImageSource, width: 400, height: 300, still: true, close: () => f.closed.push(name) } })
  const a = f.adapter.loadSource(file('A'), () => alive); const rejected = rejectCode(a, 'canceled'); await flush(); alive = false
  const b = f.adapter.loadSource(file('B'), current); await flush(); assert.deepEqual(f.decodes, ['A']); assert.deepEqual(f.adapter.getWorkState(), { active: true, pending: 1 })
  waiting.resolve({ src: {} as CanvasImageSource, width: 400, height: 300, still: true, close: () => f.closed.push('A') }); await rejected
  const asset = await b; assert.deepEqual(f.decodes, ['A', 'B']); assert.deepEqual(f.closed, ['A']); asset.release(); f.adapter.dispose()
})

await check('late toBlob remains exclusive and owns canvas cleanup; changed settings prevent successful old export', async () => {
  const f = fixture(), source = await f.adapter.loadSource(file('A'), current), waiting = deferred<Blob | null>(); let alive = true
  f.encode(() => waiting.promise)
  const job = f.adapter.export(source, settings(), () => alive), rejected = rejectCode(job, 'canceled'); await flush(); const canvas = f.canvases.at(-1)!
  alive = false; const next = f.adapter.loadSource(file('B'), current); await flush(); assert.equal(f.adapter.getWorkState().active, true); assert.equal(f.decodes.length, 1); assert.ok(canvas.width > 0)
  waiting.resolve(new Blob(['late'], { type: 'image/png' })); await rejected; const b = await next
  assert.equal(canvas.width, 0); assert.equal(canvas.height, 0); assert.deepEqual(f.decodes, ['A', 'B']); assert.equal(f.closed.length, 0)
  source.release(); b.release(); f.adapter.dispose()
})

await check('null, throw, wrong MIME, unsupported canvas and too-thin output preserve source for explicit retry', async () => {
  const f = fixture(), source = await f.adapter.loadSource(file('A'), current)
  for (const port of [async () => null, async () => { throw new Error('encode') }, async () => new Blob(['wrong'], { type: 'image/jpeg' }), async () => new Blob([], { type: 'image/png' })]) {
    f.encode(port); await rejectCode(f.adapter.export(source, settings(), current), 'output'); assert.equal(f.canvases.at(-1)!.width, 0); assert.deepEqual(f.closed, [])
  }
  await rejectCode(f.adapter.export(source, settings({ width: L.calculationSide, height: 1 }), current), 'tooThin')
  f.canvas((w, h) => { const c = new Canvas(w, h); c.context = false; return c }); await rejectCode(f.adapter.preview(source, settings(), current), 'canvas'); assert.equal(f.canvases.at(-1)!.width, 0)
  f.canvas((w, h) => new Canvas(w, h)); f.encode(async (_canvas, mime) => new Blob(['retry'], { type: mime })); assert.equal((await f.adapter.export(source, settings(), current)).width, 1080)
  source.release(); f.adapter.dispose()
})

await check('click snapshot is frozen before gate entry, and disposal cancels queued/active work with idempotent release', async () => {
  const f = fixture(), source = await f.adapter.loadSource(file('A'), current), waiting = deferred<Blob | null>()
  f.encode(() => waiting.promise); const blocker = f.adapter.export(source, settings(), current); await flush()
  const draft = { ...settings(), x: 0 }, previewJob = f.adapter.preview(source, draft, current); draft.x = 100
  waiting.resolve(new Blob(['done'], { type: 'image/png' })); await blocker; const preview = await previewJob, canvas = f.canvases.at(-1)!
  assert.equal(canvas.ctx.images[0][1], 0, 'queued preview retained click-time x=0')
  f.adapter.dispose(); f.adapter.dispose(); assert.equal(canvas.width, 0); assert.deepEqual(f.closed, ['A']); preview.release(); source.release(); assert.deepEqual(f.closed, ['A'])
  await rejectCode(f.adapter.loadSource(file('after-dispose'), current), 'canceled')
  const g = fixture(), late = deferred<AspectDecoded>(); g.decode(() => late.promise); const active = g.adapter.loadSource(file('active'), current), rejected = rejectCode(active, 'canceled'); await flush()
  const queued = rejectCode(g.adapter.loadSource(file('queued'), current), 'canceled'); g.adapter.dispose()
  late.resolve({ src: {} as CanvasImageSource, width: 400, height: 300, still: true, close: () => g.closed.push('active') }); await rejected; await queued; assert.deepEqual(g.closed, ['active']); assert.equal(g.canvases.length, 0)
})
await check('output format follows verified bytes instead of filename/MIME; aborted reads do not enter decode', async () => {
  const f = fixture(), bytes = new Uint8Array(13), view = new DataView(bytes.buffer)
  bytes.set(new TextEncoder().encode('GIF89a')); view.setUint16(6, 400, true); view.setUint16(8, 300, true)
  const gif = new File([bytes], 'pretend.png', { type: 'image/png' }), source = await f.adapter.loadSource(gif, current)
  assert.equal(source.format, 'gif'); const output = await f.adapter.export(source, settings(), current); assert.equal(output.mime, 'image/jpeg'); assert.deepEqual(f.encoded, ['image/jpeg'])
  const gate = deferred<ArrayBuffer>(), abort = new AbortController(); f.read(() => gate.promise)
  const job = f.adapter.loadSource(file('canceled'), current, abort.signal), rejected = rejectCode(job, 'canceled'); await flush(); abort.abort(); assert.equal(f.adapter.getWorkState().active, true)
  gate.resolve(header()); await rejected; assert.deepEqual(f.decodes, ['pretend.png']); source.release(); f.adapter.dispose()
})
console.log(`Aspect image adapter: ${groups} groups passed`)
