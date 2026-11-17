import assert from 'node:assert/strict'
import fs from 'node:fs'
import { build } from 'esbuild'
import QRCode from 'qrcode'

const bundled = await build({ stdin: { contents: "export * from './src/utils/qrBatchPrint'; export * from './src/utils/qrBatchPrintJob'; export * from './src/utils/qrBatch';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' })
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const { createQrBatchPrintPlan, qrBatchPrintHtml, parseQrBatch, QR_BATCH_OPTIONS, startQrBatchPrint } = api
const labels = { title: 'QR <묶음>', row: line => `${line}번`, page: (page, total) => `${page} / ${total}` }
const png = await QRCode.toDataURL('known actual QR', QR_BATCH_OPTIONS)
const sourceFor = count => Array.from({ length: count }, (_, index) => `이름${index + 1}\tsecret-payload-${index + 1}`).join('\n')
const imagesFor = source => parseQrBatch(source).rows.map(row => ({ row, dataUrl: png }))
const results = []
async function test(name, run) { await run(); results.push({ name, pass: true }) }
await test('1/6/7/30 unique ordered cells and bounded A4 pages', () => {
  for (const count of [1, 6, 7, 30]) {
    const source = sourceFor(count), plan = createQrBatchPrintPlan(source, imagesFor(source))
    assert.equal(plan.count, count)
    assert.equal(plan.pages.length, Math.ceil(count / 6))
    assert.deepEqual(plan.pages.flat().map(cell => cell.line), Array.from({ length: count }, (_, index) => index + 1))
    const html = qrBatchPrintHtml(plan, labels, 'ko')
    assert.equal((html.match(/<figure /g) ?? []).length, count)
    assert.equal((html.match(/data-qr-page=/g) ?? []).length, Math.ceil(count / 6))
    assert.equal(html.includes('secret-payload-'), false)
    assert.equal(html.includes('width:65mm'), true)
  }
})
await test('immutable snapshot, emoji labels and no HTML execution', () => {
  const source = `${'😀'.repeat(49)}\tprivate-one\n<script>alert(1)</script>\tprivate-two\nprivate-three`
  const images = imagesFor(source), plan = createQrBatchPrintPlan(source, images)
  assert.equal(plan.shortened, 1)
  assert.equal(Array.from(plan.pages[0][0].label).length, 48)
  assert.equal(plan.pages[0][2].label, '')
  images[0].row.label = 'changed'; images[0].dataUrl = 'changed'
  assert.equal(plan.pages[0][0].dataUrl, png)
  assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.pages) && Object.isFrozen(plan.pages[0]) && Object.isFrozen(plan.pages[0][0]))
  const html = qrBatchPrintHtml(plan, labels, 'en')
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>') && html.includes('lang="en"'))
  assert.ok(!html.includes('private-'))
  assert.throws(() => qrBatchPrintHtml({ ...plan }, labels, 'ko'))
})
await test('incomplete, mismatched, reordered and malformed image results rejected', () => {
  const source = sourceFor(2), images = imagesFor(source)
  assert.equal(createQrBatchPrintPlan(source, images.slice(0, 1)), null)
  assert.equal(createQrBatchPrintPlan(source, images.toReversed()), null)
  assert.equal(createQrBatchPrintPlan('bad\n\n', images), null)
  for (const dataUrl of ['https://example.test/p.png', 'data:image/svg+xml,<svg/>', 'data:image/png;base64,noPNG', png + '" onload="evil', png + 'A'.repeat(1_400_001)]) {
    assert.equal(createQrBatchPrintPlan(source, [{ ...images[0], dataUrl }, images[1]]), null)
  }
  assert.equal(createQrBatchPrintPlan(source, [{ ...images[0], row: { ...images[0].row, payload: 'different' } }, images[1]]), null)
})
const source = sourceFor(1), plan = createQrBatchPrintPlan(source, imagesFor(source))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  const decode = deferred(), io = { mounted: 0, disposed: 0, prints: 0, current: true, after: null }
  const mount = html => { assert.ok(html.includes('data-qr-batch-print-document')); io.mounted++; return { decode: () => decode.promise, onAfterPrint: fn => { io.after = fn }, dispose: () => { io.disposed++ }, print: () => { io.prints++ } } }
  const job = startQrBatchPrint(plan, labels, 'ko', () => io.current, mount)
  return { io, decode, job }
}
await test('print waits for decode and afterprint cleans exactly its document', async () => {
  const { io, decode, job } = fixture()
  await flush(); assert.equal(io.prints, 0)
  decode.resolve(); assert.equal(await job.done, 'opened'); assert.equal(io.prints, 1)
  io.after(); assert.equal(io.disposed, 1); job.cancel(); assert.equal(io.disposed, 1)
})
await test('cancel settles pending decode and late completion never prints', async () => {
  const { io, decode, job } = fixture()
  await flush(); job.cancel(); assert.equal(await job.done, 'cancelled'); assert.equal(io.disposed, 1)
  decode.resolve(); await flush(); assert.equal(io.prints, 0)
})
await test('cancel before mount and current-owner loss prevent printing', async () => {
  const a = fixture(); a.job.cancel(); assert.equal(await a.job.done, 'cancelled'); assert.equal(a.io.mounted, 0)
  const b = fixture(); await flush(); b.io.current = false; b.decode.resolve()
  assert.equal(await b.job.done, 'cancelled'); assert.equal(b.io.prints, 0); assert.equal(b.io.disposed, 1)
})
await test('decode failure and print exception clean resources and allow new jobs', async () => {
  const a = fixture(); await flush(); a.decode.reject(new Error('corrupt image'))
  assert.equal(await a.job.done, 'failed'); assert.equal(a.io.prints, 0); assert.equal(a.io.disposed, 1)
  let disposed = 0
  const b = startQrBatchPrint(plan, labels, 'en', () => true, () => ({ decode: () => Promise.resolve(), onAfterPrint() {}, print() { throw new Error('denied') }, dispose() { disposed++ } }))
  assert.equal(await b.done, 'failed'); assert.equal(disposed, 1)
  const c = fixture(); c.decode.resolve(); assert.equal(await c.job.done, 'opened'); c.job.cancel()
})
await test('decode timeout aborts a hung decoder without invoking print', async () => {
  const realSetTimeout = globalThis.setTimeout
  globalThis.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, ms === api.QR_BATCH_PRINT_DECODE_TIMEOUT ? 1 : ms, ...args)
  try { const { io, job } = fixture(); assert.equal(await job.done, 'failed'); assert.equal(io.prints, 0); assert.equal(io.disposed, 1) }
  finally { globalThis.setTimeout = realSetTimeout }
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch55/author-pure-controller.json', JSON.stringify({ source: 'Actual product utilities; real qrcode PNG; controlled print document ports (not browser/physical printer).', results }, null, 2) + '\n')
console.log(`QR batch print pure/controller: ${results.length}/${results.length} PASS`)
