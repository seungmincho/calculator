import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fixture } from './ocr-output-parent-harness.mjs'
const results = []
const status = f => f.h.all().find(node => Object.hasOwn(node.props ?? {}, 'data-ocr-output-status'))?.props['data-ocr-output-status']
async function test(name, run) { const f = await fixture(); try { await f.add(2); await f.complete(0, 'first'); await f.complete(1, 'second'); await run(f); results.push({ name, pass: true }) } finally { f.cleanup() } }
await test('current/all copy use exact displayed edited text and failed fallback remains honest', async f => {
  await f.edit('  원고 😀\n'); await f.action('output-copy', 'result'); assert.equal(f.io.copies.at(-1), '  원고 😀\n'); assert.equal(status(f), 'copied')
  await f.action('output-copy', 'all'); assert.equal(f.io.copies.at(-1), '  원고 😀\n\n\nsecond')
  f.io.copyMode = 'no'; await f.action('output-copy', 'all'); assert.equal(status(f), 'failed'); assert.equal(f.io.legacyCalls, 1)
  const recovery = f.recovery(); assert.equal(recovery.failure.text, f.io.copies.at(-1)); assert.equal(recovery.isCurrent(recovery.failure), true)
  f.io.legacy = true; recovery.onRetry(recovery.failure); await f.settle(); assert.equal(status(f), 'copied')
})
await test('pending current/all copies share one owner and stale rejection never performs fallback', async f => {
  f.io.copyMode = 'wait'; await f.action('output-copy', 'result'); const old = f.io.pendingCopies.at(-1)
  await f.action('output-copy', 'all'); const latest = f.io.pendingCopies.at(-1)
  old.reject(new Error('old')); await f.settle(); assert.equal(f.io.legacyCalls, 0)
  latest.resolve(); await f.settle(); assert.equal(status(f), 'copied')
})
await test('edited text and locale ABA invalidate pending copy and old manual callbacks', async f => {
  f.io.copyMode = 'no'; await f.action('output-copy', 'result'); const recovery = f.recovery(), copied = f.io.copies.length
  await f.edit('changed'); recovery.onRetry(recovery.failure); recovery.onClose(recovery.failure); await f.settle(); assert.equal(f.io.copies.length, copied)
  f.io.copyMode = 'wait'; await f.action('output-copy', 'result'); const old = f.io.pendingCopies.at(-1)
  await f.locale('en'); await f.locale('ko'); old.reject(new Error('late')); await f.settle(); assert.equal(f.io.legacyCalls, 1); assert.equal(status(f), undefined)
})
await test('TXT contains current whole UTF8 text and suppresses an older pending copy', async f => {
  await f.edit('\ufeff  한국어😀\r\n'); f.io.copyMode = 'wait'; await f.action('output-copy', 'all'); const pending = f.io.pendingCopies.at(-1)
  const expected = f.io.copies.at(-1); await f.action('output-download'); assert.equal(status(f), 'downloadStarted')
  const download = f.io.downloads.at(-1); assert.equal(download.filename, 'ocr-result.txt')
  assert.deepEqual(new Uint8Array(await download.blob.arrayBuffer()), new TextEncoder().encode(expected))
  pending.reject(new Error('late')); await f.settle(); assert.equal(f.io.legacyCalls, 0); assert.equal(status(f), 'downloadStarted')
  const before = f.io.revoked.length; f.h.tick(1000); assert.equal(f.io.revoked.length, before + 1)
})
await test('handoff and unmount invalidate pending output', async f => {
  f.io.copyMode = 'wait'; await f.action('output-copy', 'result'); const handed = f.io.pendingCopies.at(-1)
  await f.click('handoff.read'); handed.reject(new Error('late')); await f.settle(); assert.equal(f.io.legacyCalls, 0); assert.equal(f.io.routes.at(-1), '/text-to-speech/?from=ocr')
  await f.action('output-copy', 'result'); const departed = f.io.pendingCopies.at(-1); f.cleanup(); departed.reject(new Error('unmounted')); await f.flush(); assert.equal(f.io.legacyCalls, 0)
})
await test('empty edited result is not reported as copied and closing recovery preserves original text', async f => {
  await f.edit(''); await f.action('output-copy', 'result'); assert.equal(status(f), 'empty'); assert.equal(f.io.copies.length, 0)
  await f.edit('keep this'); f.io.copyMode = 'no'; await f.action('output-copy', 'result'); const recovery = f.recovery()
  recovery.onClose(recovery.failure); await f.settle(); assert.equal(status(f), undefined); assert.equal(f.field().props.value, 'keep this')
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch58/author-parent.json', JSON.stringify({ source: 'Actual ImageOcr/queue/session/output helpers; synthetic Worker/Canvas/Clipboard/DOM ports. Recovery child tested separately; no model/native claim.', results }, null, 2) + '\n')
console.log(`OCR output actual parent: ${results.length}/${results.length} PASS`)
