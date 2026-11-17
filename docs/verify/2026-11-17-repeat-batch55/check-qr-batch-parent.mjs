import assert from 'node:assert/strict'
import fs from 'node:fs'
import JSZip from 'jszip'
import { fixture, deferred } from './qr-batch-parent-harness.mjs'
const results = []
async function test(name, run) { const f = await fixture(); try { await run(f); results.push({ name, pass: true }) } finally { f.cleanup() } }
await test('full actual QR generation enables 2-cell print and honest opened notice', async f => {
  assert.equal(f.button('batch.print.button').props.disabled, true)
  await f.generate(); const frame = await f.print()
  assert.equal(frame.prints, 0); assert.equal((frame.html.match(/data-qr-line=/g) ?? []).length, 2)
  assert.ok(!frame.html.includes('first payload') && !frame.html.includes('second payload'))
  frame.decode.resolve(); await f.settle()
  assert.equal(frame.prints, 1); assert.ok(f.h.text().includes(f.label('batch.notices.printOpened')))
  frame.after(); assert.equal(frame.disposed, 1)
})
await test('partial generation is never printable and cancelled generation stays absent', async f => {
  f.io.generationGate = deferred(); f.edit('one\ntwo'); f.click('batch.generate')
  await f.wait(() => f.io.payloads.length === 1)
  assert.equal(f.button('batch.print.button').props.disabled, true)
  f.click('batch.cancel'); f.io.generationGate.resolve(); await f.settle()
  assert.equal(f.button('batch.print.button').props.disabled, true); assert.equal(f.io.frames.length, 0)
})
await test('editing invalidates print before decode and same-source regeneration cannot revive it', async f => {
  await f.generate(); const old = await f.print()
  f.edit('new payload'); assert.equal(old.disposed, 1)
  await f.generate(); const next = await f.print()
  old.decode.resolve(); await f.settle(); assert.equal(old.prints, 0); assert.equal(next.prints, 0)
  next.decode.resolve(); await f.settle(); assert.equal(next.prints, 1)
})
await test('cancel keeps complete images for retry; decode error reports failure', async f => {
  await f.generate(); const old = await f.print(); f.click('batch.cancel')
  assert.equal(f.button('batch.print.button').props.disabled, false); assert.equal(old.disposed, 1)
  const retry = await f.print(); retry.decode.reject(new Error('invalid image')); await f.settle()
  assert.equal(retry.prints, 0); assert.equal(retry.disposed, 1)
  assert.ok(f.h.text().includes(f.label('batch.notices.printFailed')))
  old.decode.resolve(); await f.settle(); assert.equal(old.prints, 0)
  const last = await f.print(); last.decode.resolve(); await f.settle(); assert.equal(last.prints, 1)
})
await test('locale ABA invalidates pending work and old rendered action cannot start another print', async f => {
  await f.generate(); const oldHandler = f.button('batch.print.button').props.onClick, old = await f.print()
  f.localeTo('en'); f.localeTo('ko'); old.decode.resolve(); await f.settle()
  assert.equal(old.prints, 0); assert.equal(old.disposed, 1)
  oldHandler(); await f.settle(); assert.equal(f.io.frames.length, 1)
  const next = await f.print(); next.decode.resolve(); await f.settle(); assert.equal(next.prints, 1)
})
await test('unmount and Strict effect replay dispose pending print without late dispatch', async f => {
  await f.generate(); const first = await f.print(); f.h.replayEffects()
  first.decode.resolve(); await f.settle(); assert.equal(first.prints, 0); assert.equal(first.disposed, 1)
  const next = await f.print(); f.cleanup(); next.decode.resolve(); await f.settle()
  assert.equal(next.prints, 0); assert.equal(next.disposed, 1)
})
await test('ZIP retains actual PNGs and filenames and closes its previous print document', async f => {
  await f.generate('같은 이름\tA\tB\n같은 이름\t가나다'); const frame = await f.print()
  frame.decode.resolve(); await f.settle()
  f.click('batch.download'); await f.wait(() => f.io.downloads.length === 1)
  assert.equal(frame.disposed, 1)
  const download = f.io.downloads[0], zip = await JSZip.loadAsync(await download.blob.arrayBuffer())
  assert.equal(download.filename, 'qr-batch-2.zip')
  assert.deepEqual(Object.keys(zip.files), ['qr-001-같은-이름.png', 'qr-002-같은-이름.png'])
  for (const file of Object.values(zip.files)) assert.equal((await file.async('uint8array')).slice(0, 8).join(','), '137,80,78,71,13,10,26,10')
  assert.deepEqual(f.io.payloads, ['A\tB', '가나다'])
  f.h.tick(1000); assert.equal(f.io.revoked.length, 1)
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch55/author-parent.json', JSON.stringify({ source: 'Actual QrBatchGenerator and utility/controller; actual qrcode/JSZip; controlled hook/print/DOM ports, not native browser.', results }, null, 2) + '\n')
console.log(`QR batch print actual parent: ${results.length}/${results.length} PASS`)
