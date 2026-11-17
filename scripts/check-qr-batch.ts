// node scripts/check-qr-batch.ts
import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import {
  generateQrBatch, parseQrBatch, qrBatchFilename, QR_BATCH_MAX_BYTES, QR_BATCH_MAX_CHARS, QR_BATCH_OPTIONS,
} from '../src/utils/qrBatch.ts'

// Original payloads stay byte-for-byte unchanged; only the first tab separates a label.
const source = 'toolhub.ai.kr\r\n 안내문 \t  첫 내용\t뒤 탭 유지  \r\n상품\tPRODUCT-A-001\r\n'
const parsed = parseQrBatch(source)
assert.equal(parsed.valid, true)
assert.equal(parsed.rowCount, 3)
assert.deepEqual(parsed.rows.map(row => row.payload), ['toolhub.ai.kr', '  첫 내용\t뒤 탭 유지  ', 'PRODUCT-A-001'])
assert.deepEqual(parsed.rows.map(row => row.line), [1, 2, 3])
assert.equal(parsed.rows[1].label, '안내문')
assert.ok(!parsed.rows[0].payload.startsWith('https://'))
assert.equal(parseQrBatch('\tcontent').rows[0].payload, 'content')
assert.equal(parseQrBatch('javascript:alert(1)').rows[0].payload, 'javascript:alert(1)')

// Exactly one final delimiter is ignored; blank rows and invalid rows are never silently dropped.
assert.equal(parseQrBatch('').error, 'emptyInput')
assert.equal(parseQrBatch('one\n').rowCount, 1)
assert.deepEqual(parseQrBatch('one\n\ntwo').rows.map(row => row.error), [null, 'empty', null])
assert.deepEqual(parseQrBatch('one\n\n').rows.map(row => row.error), [null, 'empty'])
assert.equal(parseQrBatch('\n').rows[0].error, 'empty')
assert.equal(parseQrBatch('label\t  ').rows[0].error, 'empty')
assert.equal(parseQrBatch('one\rtwo').rowCount, 2)

// Limits count encoded UTF-8 bytes, not characters; whole input and row limits are hard guards.
for (const payload of ['x'.repeat(1000), '가'.repeat(333) + 'x', '😀'.repeat(250)]) {
  const result = parseQrBatch(payload)
  assert.equal(result.valid, true)
  assert.equal(result.rows[0].bytes, QR_BATCH_MAX_BYTES)
}
for (const payload of ['x'.repeat(1001), '가'.repeat(334), '😀'.repeat(251)]) assert.equal(parseQrBatch(payload).rows[0].error, 'bytes')
assert.equal(parseQrBatch('bad\ud800').rows[0].error, 'unicode')
assert.equal(parseQrBatch('bad\udc00').rows[0].error, 'unicode')
assert.equal(parseQrBatch(Array.from({ length: 30 }, () => 'a'.repeat(999)).join('\n') + '\n').valid, true)
assert.equal(parseQrBatch(Array.from({ length: 31 }, () => 'a').join('\n')).error, 'rowLimit')
assert.equal(parseQrBatch('x'.repeat(QR_BATCH_MAX_CHARS + 1)).error, 'totalLimit')
const severalBad = parseQrBatch(`good\n\n${'x'.repeat(1001)}\nlast`)
assert.equal(severalBad.rowCount, 4)
assert.deepEqual(severalBad.rows.filter(row => row.error).map(row => [row.line, row.error]), [[2, 'empty'], [3, 'bytes']])

// Safe row-prefixed filenames cannot escape the ZIP root or collide, even for repeated labels.
const names = ['../../secret', 'CON', 'A/B\\C:*?"<>|', 'same', 'same', '\u202Ebad', '한글 이름', '😀'.repeat(80), '가'.repeat(100)]
const filenames = names.map((name, index) => qrBatchFilename(name, index + 1))
assert.equal(new Set(filenames).size, names.length)
for (const [index, filename] of filenames.entries()) {
  assert.ok(filename.startsWith(`qr-${String(index + 1).padStart(3, '0')}`))
  assert.ok(filename.endsWith('.png'))
  assert.ok(!/[\\/:*?"<>|\u202E]/.test(filename))
  assert.ok(!filename.includes('..'))
  assert.ok(Array.from(filename).length <= 51)
}

// Render with the actual installed encoder and check the PNG output size/options and ZIP mapping.
assert.deepEqual(QR_BATCH_OPTIONS, {
  errorCorrectionLevel: 'M', width: 512, margin: 4,
  color: { dark: '#000000ff', light: '#ffffffff' }, type: 'image/png',
})
const actual = parseQrBatch('같은이름\t  toolhub.ai.kr  \n같은이름\t한글 😀\n../../../CON\tA\tB')
const renderedPayloads: string[] = []
const progress: number[] = []
const generated = await generateQrBatch(actual, async payload => {
  renderedPayloads.push(payload)
  return QRCode.toDataURL(payload, QR_BATCH_OPTIONS)
}, () => false, count => progress.push(count))
assert.equal(generated.status, 'done')
if (generated.status !== 'done') throw new Error('unexpected generation failure')
assert.deepEqual(renderedPayloads, actual.rows.map(row => row.payload))
assert.deepEqual(progress, [1, 2, 3])
const zip = new JSZip()
for (const image of generated.images) {
  const png = Buffer.from(image.dataUrl.split(',')[1], 'base64')
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 512)
  assert.equal(png.readUInt32BE(20), 512)
  zip.file(image.row.filename, png)
}
const restoredZip = await JSZip.loadAsync(await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }))
assert.deepEqual(Object.keys(restoredZip.files), actual.rows.map(row => row.filename))
for (const filename of Object.keys(restoredZip.files)) {
  assert.equal(restoredZip.files[filename].dir, false)
  assert.equal((await restoredZip.files[filename].async('nodebuffer')).subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
}

// Failed, cancelled and stale runs return no partial downloadable results.
let renderCalls = 0
const fakePng = 'data:image/png;base64,aGVsbG8='
assert.deepEqual(await generateQrBatch(severalBad, async () => { renderCalls++; return fakePng }, () => false), { status: 'invalid' })
assert.equal(renderCalls, 0)
assert.deepEqual(await generateQrBatch(actual, async () => { renderCalls++; return fakePng }, () => true), { status: 'cancelled' })
assert.equal(renderCalls, 0)
let cancelled = false
assert.deepEqual(await generateQrBatch(actual, async () => { cancelled = true; return fakePng }, () => cancelled), { status: 'cancelled' })
let calls = 0
assert.deepEqual(await generateQrBatch(actual, async () => { if (++calls === 2) throw new Error('canvas failed'); return fakePng }, () => false), { status: 'failed', line: 2 })
assert.deepEqual(await generateQrBatch(actual, async () => 'data:image/svg+xml,wrong format', () => false), { status: 'failed', line: 1 })
let token = 1
assert.deepEqual(await generateQrBatch(actual, async () => { await Promise.resolve(); token = 2; return fakePng }, () => token !== 1), { status: 'cancelled' })

console.log('check-qr-batch OK: exact payloads/rows, UTF-8 and input caps, filenames, real PNG/ZIP, invalid/failed/cancelled/stale batches')
