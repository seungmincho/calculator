import assert from 'node:assert/strict'
import { createWatermarkBrowserAdapter, drawWatermarkCanvas, type WatermarkDecoded } from '../src/lib/imageWatermark/browser.ts'
import { createWatermarkSnapshot, DEFAULT_WATERMARK_DRAFT as D, WatermarkError, WATERMARK_LIMITS as L } from '../src/utils/imageWatermark.ts'

const flush = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function header(width = 100, height = 50): ArrayBuffer {
  const bytes = new Uint8Array(33), view = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height)
  return bytes.buffer
}
const image = (name: string, width = 100, height = 50) => new File([header(width, height)], name, { type: 'application/octet-stream' })
type Command = { name: string; values: unknown[]; alpha: number }
class Context {
  commands: Command[] = []; stack: number[] = []; globalAlpha = 1; font = ''; fillStyle = ''; textAlign = ''; textBaseline = ''; imageSmoothingEnabled = false; imageSmoothingQuality = ''; measured = 40
  command(name: string, ...values: unknown[]) { this.commands.push({ name, values, alpha: this.globalAlpha }) }
  save() { this.stack.push(this.globalAlpha); this.command('save') }
  restore() { this.globalAlpha = this.stack.pop() ?? 1; this.command('restore') }
  scale(...values: number[]) { this.command('scale', ...values) }
  translate(...values: number[]) { this.command('translate', ...values) }
  rotate(value: number) { this.command('rotate', value) }
  drawImage(...values: unknown[]) { this.command('image', ...values) }
  fillText(...values: unknown[]) { this.command('text', ...values) }
  measureText(text: string) { this.command('measure', text, this.font); return { width: this.measured } }
}
class Canvas {
  context = new Context(); width: number; height: number
  constructor(width: number, height: number) { this.width = width; this.height = height }
  getContext() { return this.context }
}
function fixture() {
  const canvases: Canvas[] = [], decoded: string[] = [], closed: string[] = [], urls: string[] = [], revoked: string[] = [], actual = new Map<File, { width: number; height: number }>()
  let readPort = (file: Blob) => file.arrayBuffer()
  let pngPort: (canvas: HTMLCanvasElement) => Promise<Blob | null> = async () => new Blob(['synthetic output'], { type: 'image/png' })
  let decodePort = async (blob: Blob): Promise<WatermarkDecoded> => {
    const file = blob as File, dims = actual.get(file) ?? { width: 100, height: 50 }; decoded.push(file.name)
    return { ...dims, src: { name: file.name } as unknown as CanvasImageSource, close: () => { closed.push(file.name) } }
  }
  const adapter = createWatermarkBrowserAdapter({
    read: file => readPort(file), decode: file => decodePort(file), png: canvas => pngPort(canvas),
    canvas: (width, height) => { const canvas = new Canvas(width, height); canvases.push(canvas); return canvas as unknown as HTMLCanvasElement },
    url: () => { const url = `blob:synthetic-${urls.length}`; urls.push(url); return url }, revoke: url => { revoked.push(url) },
  })
  return { adapter, canvases, decoded, closed, urls, revoked, actual,
    read(port: typeof readPort) { readPort = port }, png(port: typeof pngPort) { pngPort = port }, decode(port: typeof decodePort) { decodePort = port },
  }
}
const text = createWatermarkSnapshot(D)
const rejectCode = (promise: Promise<unknown>, code: string) => assert.rejects(promise, error => error instanceof WatermarkError && error.code === code)
let groups = 0
async function check(name: string, run: () => Promise<void>) { await run(); groups++; console.log('PASS', name) }

await check('header and source/logo byte/pixel checks run before native decode, and actual decoded dimensions are rechecked', async () => {
  const f = fixture()
  await rejectCode(f.adapter.sourcePreview({ size: L.fileBytes + 1 } as File, () => true), 'fileSize')
  await rejectCode(f.adapter.sourcePreview(new File(['not image'], 'fake.png', { type: 'image/png' }), () => true), 'format')
  await rejectCode(f.adapter.sourcePreview(image('oversize', 4097, 4096), () => true), 'dimensions')
  await rejectCode(f.adapter.logo(image('logo-too-large', 2049, 2048), 'logo', () => true), 'logoDimensions')
  await rejectCode(f.adapter.logo({ size: L.logoBytes + 1 } as File, 'logo', () => true), 'logoSize')
  assert.equal(f.decoded.length, 0); assert.equal(f.canvases.length, 0)
  const file = image('decoded-too-large'); f.actual.set(file, { width: 8192, height: 8192 })
  await rejectCode(f.adapter.sourcePreview(file, () => true), 'dimensions'); assert.deepEqual(f.closed, ['decoded-too-large']); assert.equal(f.canvases.length, 0); f.adapter.dispose()
})

await check('process owns source and logo decode within one gate, uses actual orientation dimensions and releases native resources', async () => {
  const f = fixture(), source = image('portrait-header', 50, 100), logoFile = image('logo', 80, 40)
  f.actual.set(source, { width: 100, height: 50 }); f.actual.set(logoFile, { width: 80, height: 40 })
  const snapshot = createWatermarkSnapshot({ ...D, watermarkType: 'image', watermarkSize: 20 }, { id: 'logo', file: logoFile, width: 80, height: 40 })
  const out = await f.adapter.process(source, snapshot, () => true)
  assert.deepEqual(f.decoded, ['portrait-header', 'logo']); assert.deepEqual(f.closed, ['portrait-header', 'logo']); assert.equal(out.width, 100); assert.equal(out.height, 50)
  const commands = f.canvases[0].context.commands.filter(value => value.name === 'image')
  assert.equal(commands.length, 2); assert.equal(commands[0].alpha, 1); assert.equal(commands[1].alpha, 0.5); assert.deepEqual(commands[1].values.slice(1), [-10, -5, 20, 10])
  assert.equal(f.canvases[0].width, 0); assert.equal(f.canvases[0].height, 0); assert.equal(f.urls.length, 1)
  f.adapter.release(out); f.adapter.release(out); assert.deepEqual(f.revoked, [out.url]); f.adapter.dispose()
})

await check('shared draw geometry applies source paint before alpha, logical font and exact 10000 tile calls without scaled-font drift', async () => {
  const context = new Context(), source = {} as CanvasImageSource
  drawWatermarkCanvas(context as unknown as CanvasRenderingContext2D, source, 300, 200, createWatermarkSnapshot({ ...D, fontSize: 30, rotation: 90, opacity: 25, margin: 20 }), null, 91, 60)
  assert.deepEqual(context.commands.find(command => command.name === 'scale')!.values, [91 / 300, 60 / 200])
  assert.deepEqual(context.commands.find(command => command.name === 'translate')!.values, [260, 165])
  assert.equal(context.commands.find(command => command.name === 'image')!.alpha, 1); assert.equal(context.commands.find(command => command.name === 'text')!.alpha, 0.25)
  assert.equal(context.font, '30px sans-serif'); assert.equal(context.globalAlpha, 1)
  const tiles = new Context(); tiles.measured = 10
  drawWatermarkCanvas(tiles as unknown as CanvasRenderingContext2D, source, 300, 400, createWatermarkSnapshot({ ...D, tileMode: true, fontSize: 10, margin: 0 }), null)
  assert.equal(tiles.commands.filter(command => command.name === 'text').length, 10000)
  assert.deepEqual(tiles.commands.find(command => command.name === 'text')!.values, [D.text, -500, -500]); assert.equal(tiles.globalAlpha, 1)
})

await check('small retained preview uses the shared original-pixel plan and closes original decode before settings redraws', async () => {
  const f = fixture(), source = image('large', 4000, 3000); f.actual.set(source, { width: 4000, height: 3000 })
  const base = await f.adapter.sourcePreview(source, () => true)
  assert.equal(base.canvas.width, 800); assert.equal(base.canvas.height, 600); assert.deepEqual(f.closed, ['large'])
  const first = await f.adapter.preview(base, text, null, () => true), second = await f.adapter.preview(base, createWatermarkSnapshot({ ...D, rotation: -30 }), null, () => true)
  assert.equal(f.decoded.length, 1); assert.equal(first.width, 4000); assert.equal(first.height, 3000)
  assert.deepEqual(f.canvases[1].context.commands.find(command => command.name === 'scale')!.values, [0.2, 0.2]); assert.equal(f.canvases[1].context.font, '48px sans-serif')
  first.release(); first.release(); assert.equal(first.canvas.width, 0); assert.equal(base.canvas.width, 800)
  second.release(); base.release(); assert.ok(f.canvases.every(canvas => canvas.width === 0)); f.adapter.dispose()
})

await check('stale read is skipped before decode and the next large operation waits for real settlement', async () => {
  const f = fixture(), first = deferred<ArrayBuffer>(); let current = true, reads = 0
  f.read(async file => ++reads === 1 ? first.promise : file.arrayBuffer())
  const old = f.adapter.sourcePreview(image('old'), () => current); const caught = rejectCode(old, 'canceled')
  const next = f.adapter.sourcePreview(image('new'), () => true); await flush(); assert.equal(reads, 1); assert.equal(f.decoded.length, 0)
  current = false; first.resolve(header()); await caught; const result = await next
  assert.deepEqual(f.decoded, ['new']); result.release(); f.adapter.dispose()
})

await check('late toBlob cancel holds its canvas and gate until completion, then releases without creating an old URL', async () => {
  const f = fixture(), first = deferred<Blob | null>(); let current = true, pngCalls = 0
  f.png(async () => ++pngCalls === 1 ? first.promise : new Blob(['new'], { type: 'image/png' }))
  const old = f.adapter.process(image('old'), text, () => current); const caught = rejectCode(old, 'canceled'); await flush()
  const next = f.adapter.process(image('new'), text, () => true); current = false; await flush()
  assert.deepEqual(f.decoded, ['old']); assert.equal(f.canvases[0].width, 100); assert.equal(f.adapter.getWorkState().active, true)
  first.resolve(new Blob(['old'], { type: 'image/png' })); await caught; const out = await next
  assert.deepEqual(f.closed, ['old', 'new']); assert.equal(f.urls.length, 1); assert.equal(out.url, f.urls[0]); assert.ok(f.canvases.every(canvas => canvas.width === 0))
  f.adapter.release(out); f.adapter.dispose()
})

await check('failed replacement logo preserves the previous valid thumbnail and wrong logo identity cannot render a snapshot', async () => {
  const f = fixture(), source = image('base'), good = image('good-logo'); const base = await f.adapter.sourcePreview(source, () => true), logo = await f.adapter.logo(good, 'good', () => true)
  await rejectCode(f.adapter.logo(new File(['bad'], 'bad-logo.png'), 'bad', () => true), 'format')
  assert.ok(logo.thumbnail.width > 0); assert.equal(logo.file, good)
  const snapshot = createWatermarkSnapshot({ ...D, watermarkType: 'image' }, logo)
  await rejectCode(f.adapter.preview(base, snapshot, { ...logo, id: 'different' }, () => true), 'logoRequired')
  const preview = await f.adapter.preview(base, snapshot, logo, () => true); assert.ok(preview.canvas.width > 0)
  preview.release(); logo.release(); base.release(); f.adapter.dispose()
})

await check('null/wrong-format PNG failures release canvas and decode; dispose releases retained assets and suppresses late URLs', async () => {
  for (const encoded of [null, new Blob(['jpeg'], { type: 'image/jpeg' })]) {
    const f = fixture(); f.png(async () => encoded); await rejectCode(f.adapter.process(image('source'), text, () => true), 'output')
    assert.deepEqual(f.closed, ['source']); assert.equal(f.canvases[0].width, 0); assert.equal(f.urls.length, 0); f.adapter.dispose()
  }
  const f = fixture(), base = await f.adapter.sourcePreview(image('base'), () => true), done = await f.adapter.process(image('done'), text, () => true), pending = deferred<Blob | null>()
  f.png(() => pending.promise); const old = f.adapter.process(image('pending'), text, () => true); const caught = rejectCode(old, 'canceled'); await flush()
  const activeCanvas = f.canvases.at(-1)!; f.adapter.dispose(); assert.equal(base.canvas.width, 0); assert.equal(activeCanvas.width, 100); assert.deepEqual(f.revoked, [done.url])
  pending.resolve(new Blob(['late'], { type: 'image/png' })); await caught; assert.equal(activeCanvas.width, 0); assert.equal(f.urls.length, 1)
})
console.log(`Watermark browser-adapter ports: ${groups} groups passed; synthetic headers/canvas commands, no Chrome or real image decoding`)
