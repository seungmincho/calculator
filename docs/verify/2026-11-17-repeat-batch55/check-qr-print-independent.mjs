import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { build } from 'esbuild'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { fixture as parentFixture, deferred } from './qr-batch-parent-harness.mjs'

const built = await build({ stdin: { contents: "export * from './src/utils/qrBatchPrint'; export * from './src/utils/qrBatchPrintJob'; export * from './src/utils/qrBatch';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' })
const labels = { title: '묶음 <title>', row: line => `행 ${line}`, page: (page, total) => `페이지 ${page}/${total}` }
const flush = async () => { for (let n = 0; n < 5; n++) await Promise.resolve() }
function domFixture(options = {}) {
  const frames = [], timers = new Map(), foreign = { name: 'foreign document' }, children = [foreign]
  const io = { sequence: 0, phase: null, images: undefined, printThrows: false, syncAfterPrint: false, ...options }
  const document = { body: { appendChild(frame) { if (io.phase === 'append') throw Error('append denied'); children.push(frame) } }, createElement(tag) {
    assert.equal(tag, 'iframe')
    const frame = { attrs: {}, style: {}, removals: 0, prints: 0, focus: 0, decoded: [], listeners: new Map(),
      setAttribute(name, value) { this.attrs[name] = value }, remove() { this.removals++; const at = children.indexOf(this); if (at >= 0) children.splice(at, 1) },
    }
    const doc = { images: [], open() { if (io.phase === 'open') throw Error('open failed') }, write(html) {
      if (io.phase === 'write') throw Error('write failed')
      frame.html = html
      doc.images = (io.images ?? [...html.matchAll(/<img src="([^"]+)"/g)].map(match => match[1])).map(() => {
        const pending = deferred(), image = { naturalWidth: 512, naturalHeight: 512, pending, decode() { frame.decoded.push(image); return pending.promise } }; return image
      })
    }, close() { if (io.phase === 'close') throw Error('close failed') } }
    const win = { document: doc, focus() { frame.focus++ }, print() { if (io.printThrows) throw Error('print failed'); frame.prints++; if (io.syncAfterPrint) frame.listeners.get('afterprint')?.() }, addEventListener(event, callback) { frame.listeners.set(event, callback) }, removeEventListener(event, callback) { if (frame.listeners.get(event) === callback) frame.listeners.delete(event) } }
    frame.contentWindow = io.phase === 'window' ? null : win; frame.doc = doc; frames.push(frame); return frame
  } }
  const compiledModule = { exports: {} }
  const context = vm.createContext({ module: compiledModule, exports: compiledModule.exports, console, TextEncoder, setTimeout(fn, ms) { const id = ++io.sequence; timers.set(id, { fn, ms }); return id }, clearTimeout(id) { timers.delete(id) }, document })
  vm.runInContext(built.outputFiles[0].text, context)
  const api = compiledModule.exports
  return { api, frames, io, children, timers, foreign, tick(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn() } } }
}
const png = await QRCode.toDataURL('only synthetic QR content', { width: 512, margin: 4, errorCorrectionLevel: 'M' })
function make(f, source) { const rows = f.api.parseQrBatch(source).rows, images = Array.from(rows, row => ({ row, dataUrl: png })); return { plan: f.api.createQrBatchPrintPlan(source, images), images } }
const results = []
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); results.push({ name, pass: true }); console.log('PASS', name) }

await check('independent 1..30 page oracle, exact order and HTML payload exclusion, escaping and 48-codepoint label boundary', () => {
  const f = domFixture()
  for (let count = 1; count <= 30; count++) {
    const source = Array.from({ length: count }, (_, n) => `이름${n % 2}\tprivate-value-${n}`).join('\r\n') + '\r\n'
    const { plan } = make(f, source), html = f.api.qrBatchPrintHtml(plan, labels, 'ko')
    assert.equal(plan.count, count); assert.equal(plan.pages.length, Math.ceil(count / 6)); assert.equal(plan.pages.at(-1).length, (count - 1) % 6 + 1)
    const numbers = [...html.matchAll(/<figure data-qr-line="(\d+)"/g)].map(match => Number(match[1]))
    assert.deepEqual(numbers, Array.from({ length: count }, (_, n) => n + 1)); assert.equal((html.match(/data-qr-page=/g) ?? []).length, Math.ceil(count / 6))
    assert.ok(!html.includes('private-value-')); assert.ok(!/<script|<link|src="https?:|url\(/i.test(html))
  }
  const label = '😀'.repeat(47) + '<&', source = `${label}\tsecret1\n<svg onload="bad">\tsecret2\nsecret3`, { plan, images } = make(f, source)
  const html = f.api.qrBatchPrintHtml(plan, labels, 'other')
  assert.equal(plan.pages[0][0].label, '😀'.repeat(47) + '<'); assert.equal(plan.shortened, 1)
  assert.ok(html.includes('&lt;…') && html.includes('&lt;svg onload=&quot;bad&quot;&gt;')); assert.equal(html.includes('<svg'), false)
  assert.equal((html.match(/class="row"/g) ?? []).length, 3); assert.equal((html.match(/class="name"/g) ?? []).length, 2)
  assert.ok(html.includes('lang="ko"') && html.includes('&lt;title&gt;'))
  images[0].dataUrl = 'changed'; images[0].row.label = 'changed'; assert.equal(plan.pages[0][0].dataUrl, png); assert.ok(Object.isFrozen(plan.pages[0][0]))
  assert.throws(() => f.api.qrBatchPrintHtml(structuredClone(plan), labels, 'ko'))
})
await check('source-result metadata mismatch or non-PNG URL refuses every print snapshot', () => {
  const f = domFixture(), source = 'name\tpayload\nsecond\tpayload2'
  for (const [field, value] of [['line', 8], ['label', 'changed'], ['payload', 'changed'], ['bytes', 999], ['filename', 'changed.png'], ['error', 'bytes']]) {
    const { images } = make(f, source); images[0].row = { ...images[0].row, [field]: value }; assert.equal(f.api.createQrBatchPrintPlan(source, images), null)
  }
  const { images } = make(f, source)
  for (const url of ['data:image/png;base64,iVBORw0KGgo<script>', 'data:image/svg+xml,a', 'https://remote.invalid/image', png + '\n', png + 'A'.repeat(1400001)]) assert.equal(f.api.createQrBatchPrintPlan(source, [{ ...images[0], dataUrl: url }, images[1]]), null)
  assert.equal(f.api.createQrBatchPrintPlan(source, images.toReversed()), null); assert.equal(f.api.createQrBatchPrintPlan(source, images.slice(1)), null)
})
await check('actual default iframe adapter waits for all reverse-order decoders and cleans only its own frame/listener after print', async () => {
  const f = domFixture(), { plan } = make(f, 'a\tone\nb\ttwo\nc\tthree'), job = f.api.startQrBatchPrint(plan, labels, 'en', () => true)
  await flush(); const frame = f.frames[0]; assert.equal(frame.attrs['aria-hidden'], 'true'); assert.equal(frame.tabIndex, -1); assert.ok(frame.style.cssText.includes('left:-10000px'))
  assert.equal(frame.decoded.length, 3); frame.doc.images[2].pending.resolve(); frame.doc.images[0].pending.resolve(); await flush(); assert.equal(frame.prints, 0)
  frame.doc.images[1].pending.resolve(); assert.equal(await job.done, 'opened'); assert.equal(frame.prints, 1); assert.equal(frame.focus, 1); assert.equal(f.children.includes(frame), true)
  assert.deepEqual(Array.from(f.timers.values(), timer => timer.ms), [120000]); const after = frame.listeners.get('afterprint'); assert.equal(typeof after, 'function')
  after(); job.cancel(); assert.equal(frame.removals, 1); assert.equal(frame.listeners.size, 0); assert.deepEqual(f.children, [f.foreign]); assert.equal(f.timers.size, 0)
})
await check('actual iframe failures in document/image/print never open a partial document and release frames', async () => {
  for (const phase of ['window', 'open', 'write', 'close', 'empty', 'dimensions', 'decode', 'print']) {
    const f = domFixture({ phase, ...(phase === 'empty' ? { images: [] } : {}), printThrows: phase === 'print' }), { plan } = make(f, 'one'), job = f.api.startQrBatchPrint(plan, labels, 'ko', () => true)
    await flush(); const frame = f.frames[0]
    if (phase === 'dimensions') { frame.doc.images[0].naturalWidth = 511; frame.doc.images[0].pending.resolve() }
    if (phase === 'decode') frame.doc.images[0].pending.reject(Error('broken'))
    if (phase === 'print') frame.doc.images[0].pending.resolve()
    assert.equal(await job.done, 'failed', phase); assert.equal(frame.prints, 0, phase); assert.equal(frame.removals, 1, phase); assert.equal(f.timers.size, 0, phase); assert.deepEqual(f.children, [f.foreign])
  }
})
await check('actual iframe timeout/cancel/owner loss/old afterprint never interfere with a newer document', async () => {
  const f = domFixture(), { plan } = make(f, 'one')
  const zero = f.api.startQrBatchPrint(plan, labels, 'ko', () => true); zero.cancel(); assert.equal(await zero.done, 'cancelled'); assert.equal(f.frames.length, 0)
  const timeout = f.api.startQrBatchPrint(plan, labels, 'ko', () => true); await flush(); const first = f.frames[0]; f.tick(15000); assert.equal(await timeout.done, 'failed'); first.doc.images[0].pending.resolve(); await flush(); assert.equal(first.prints, 0)
  let current = true; const lost = f.api.startQrBatchPrint(plan, labels, 'ko', () => current); await flush(); current = false; f.frames[1].doc.images[0].pending.resolve(); assert.equal(await lost.done, 'cancelled'); assert.equal(f.frames[1].prints, 0)
  const opened = f.api.startQrBatchPrint(plan, labels, 'ko', () => true); await flush(); const old = f.frames[2]; old.doc.images[0].pending.resolve(); assert.equal(await opened.done, 'opened'); const oldAfter = old.listeners.get('afterprint'); opened.cancel()
  const next = f.api.startQrBatchPrint(plan, labels, 'ko', () => true); await flush(); const latest = f.frames[3]; oldAfter(); assert.equal(latest.removals, 0); latest.doc.images[0].pending.resolve(); assert.equal(await next.done, 'opened'); f.tick(120000); assert.equal(latest.removals, 1); assert.deepEqual(f.children, [f.foreign])
  const sync = domFixture({ syncAfterPrint: true }), synced = make(sync, 'one'), job = sync.api.startQrBatchPrint(synced.plan, labels, 'ko', () => true); await flush(); sync.frames[0].doc.images[0].pending.resolve(); assert.equal(await job.done, 'opened'); assert.equal(sync.frames[0].removals, 1); assert.equal(sync.timers.size, 0)
})
await check('actual parent print-cancel retains complete QR bytes and ZIP names/content; retry prints unchanged order', async () => {
  const f = await parentFixture()
  try {
    const source = '같은 이름\t first\tpayload \n같은 이름\t두 번째 값'
    await f.generate(source); const before = f.h.all().filter(n => n.type === 'img').map(n => n.props.src)
    const pending = await f.print(); f.click('batch.cancel'); pending.decode.resolve(); await f.settle(); assert.equal(pending.prints, 0); assert.equal(pending.disposed, 1)
    assert.deepEqual(f.h.all().filter(n => n.type === 'img').map(n => n.props.src), before)
    f.click('batch.download'); await f.wait(() => f.io.downloads.length === 1)
    const blob = f.io.downloads[0].blob, zip = await JSZip.loadAsync(await blob.arrayBuffer()), names = Object.keys(zip.files)
    assert.deepEqual(names, ['qr-001-같은-이름.png', 'qr-002-같은-이름.png'])
    for (let n = 0; n < names.length; n++) assert.equal(await zip.file(names[n]).async('base64'), before[n].split(',')[1])
    const next = await f.print(); assert.equal((next.html.match(/<figure /g) ?? []).length, 2); next.decode.resolve(); await f.wait(() => next.prints === 1); assert.equal(pending.prints, 0)
    assert.deepEqual(f.io.payloads, [' first\tpayload ', '두 번째 값'])
  } finally { f.cleanup() }
})
await check('actual parent old print/edit/localeABA/unmount callbacks cannot print or replace the current result', async () => {
  for (const mode of ['edit', 'locale', 'unmount']) {
    const f = await parentFixture(); await f.generate(); const original = f.h.all().filter(n => n.type === 'img').map(n => n.props.src), stalePrint = f.button('batch.print.button').props.onClick, frame = await f.print()
    if (mode === 'edit') f.edit('changed\tpayload')
    if (mode === 'locale') { f.localeTo('en'); f.localeTo('ko') }
    if (mode === 'unmount') f.cleanup()
    frame.decode.resolve(); if (mode === 'unmount') await flush(); else await f.settle(); assert.equal(frame.prints, 0); assert.equal(frame.disposed, 1)
    if (mode !== 'unmount') { stalePrint(); await f.settle(); assert.equal(f.io.frames.length, 1); if (mode === 'locale') assert.deepEqual(f.h.all().filter(n => n.type === 'img').map(n => n.props.src), original); f.cleanup() }
  }
})
await check('actual parent generation remains all-or-nothing and stale generation cannot expose printable partial QR', async () => {
  const f = await parentFixture()
  try {
    f.io.generationGate = deferred(); f.edit('first\tfirst\nsecond\tsecond'); f.click('batch.generate'); await f.wait(() => f.io.payloads.length === 1)
    assert.equal(f.button('batch.print.button').props.disabled, true); assert.equal(f.h.all().filter(n => n.type === 'img').length, 0)
    f.edit('replacement\tnew payload'); f.io.generationGate.resolve(); await f.settle(); assert.equal(f.button('batch.print.button').props.disabled, true); assert.equal(f.io.frames.length, 0)
    f.io.generationGate = null; f.click('batch.generate'); await f.wait(() => !f.button('batch.print.button').props.disabled)
    const latest = await f.print(); assert.equal((latest.html.match(/<figure /g) ?? []).length, 1); assert.ok(latest.html.includes('replacement')); assert.ok(!latest.html.includes('new payload')); latest.decode.resolve(); await f.wait(() => latest.prints === 1)
  } finally { f.cleanup() }
})
fs.writeFileSync(`docs/verify/2026-11-17-repeat-batch55/independent-print-${process.argv[2] ? 'impact-' : ''}results.json`, JSON.stringify({ boundary: 'Actual pure/default iframe adapter with controlled DOM; actual parent with native qrcode/JSZip and controlled print ports; no Chrome or physical printer', results }, null, 2) + '\n')
console.log(`QR batch print independent: ${results.length} groups passed`)
