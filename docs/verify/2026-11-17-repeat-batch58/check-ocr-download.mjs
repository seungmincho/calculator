import assert from 'node:assert/strict'
import fs from 'node:fs'
import { downloadOcrText } from '../../../src/utils/ocrOutput.ts'
const results = []
function fixture({ error = '', append = null } = {}) {
  const oldDocument = globalThis.document, create = URL.createObjectURL, revoke = URL.revokeObjectURL, timer = globalThis.setTimeout
  const io = { blobs: [], revoked: [], clicks: [], removed: 0, timers: [], current: true }
  URL.createObjectURL = blob => { if (error === 'url') throw new Error('url denied'); io.blobs.push(blob); return `blob:ocr-${io.blobs.length}` }
  URL.revokeObjectURL = url => { io.revoked.push(url) }
  globalThis.setTimeout = callback => { io.timers.push(callback); return 1 }
  globalThis.document = { body: { appendChild() { append?.(io); if (error === 'append') throw new Error('append denied') } }, createElement() {
    if (error === 'create') throw new Error('create denied')
    return { href: '', download: '', click() { if (error === 'click') throw new Error('click denied'); io.clicks.push({ href: this.href, filename: this.download }) }, remove() { io.removed++; if (error === 'remove') throw new Error('remove denied') } }
  } }
  return { io, close() { globalThis.document = oldDocument; URL.createObjectURL = create; URL.revokeObjectURL = revoke; globalThis.setTimeout = timer } }
}
async function test(name, run) { await run(); results.push({ name, pass: true }) }
await test('exact UTF8 bytes, filename and delayed owned URL cleanup', async () => {
  const f = fixture(); try {
    const text = '\ufeff  한국어 😀\r\nsecond\tline\n'
    assert.equal(downloadOcrText(text, () => f.io.current), 'started')
    assert.equal(f.io.clicks[0].filename, 'ocr-result.txt')
    assert.deepEqual(new Uint8Array(await f.io.blobs[0].arrayBuffer()), new TextEncoder().encode(text))
    assert.equal(f.io.blobs[0].type, 'text/plain;charset=utf-8'); assert.equal(f.io.removed, 1)
    assert.deepEqual(f.io.revoked, []); f.io.timers[0](); assert.deepEqual(f.io.revoked, ['blob:ocr-1'])
  } finally { f.close() }
})
await test('empty/stale requests and invalidation before click cannot dispatch', () => {
  const f = fixture({ append: io => { io.current = false } }); try {
    assert.equal(downloadOcrText('', () => true), 'empty'); assert.equal(downloadOcrText('old', () => false), 'stale')
    assert.equal(f.io.blobs.length, 0); assert.equal(downloadOcrText('new', () => f.io.current), 'stale')
    assert.equal(f.io.clicks.length, 0); assert.deepEqual(f.io.revoked, ['blob:ocr-1']); assert.equal(f.io.timers.length, 0)
  } finally { f.close() }
})
await test('DOM/URL/click failures are honest and release any acquired URL', () => {
  for (const error of ['create', 'url', 'append', 'click']) { const f = fixture({ error }); try {
    assert.equal(downloadOcrText('text', () => true), 'failed'); assert.equal(f.io.clicks.length, 0)
    assert.equal(f.io.revoked.length, ['append', 'click'].includes(error) ? 1 : 0)
  } finally { f.close() } }
  const f = fixture({ error: 'remove' }); try {
    assert.equal(downloadOcrText('text', () => true), 'started'); f.io.timers[0](); assert.equal(f.io.revoked.length, 1)
  } finally { f.close() }
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch58/author-download.json', JSON.stringify({ source: 'Actual unconnected utility with controlled browser DOM/URL and real Blob UTF8 bytes, not a native disk save.', results }, null, 2) + '\n')
console.log(`OCR TXT output: ${results.length}/${results.length} PASS`)
