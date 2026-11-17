// node --experimental-strip-types scripts/check-base64-codec.ts
import assert from 'node:assert/strict'
import { BASE64_BYTE_LIMIT, BASE64_TEXT_LIMIT, Base64CodecError, encodeBase64Bytes, encodeBase64Text, decodeBase64, base64DataUrl, base64ImageCandidate, safeBase64Filename } from '../src/utils/base64Codec.ts'
import { createBase64ActionGuard, readBase64File, createBase64ImagePreview, copyBase64Text, type Base64PreviewPorts } from '../src/utils/base64Actions.ts'

const utf8 = (text: string) => new TextEncoder().encode(text)
const expectError = (run: () => unknown, code: string) => assert.throws(run, error => error instanceof Base64CodecError && error.code === code)
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }

await check('RFC 4648 vectors and independent Buffer parity for both alphabets and output padding', () => {
  const vectors = [['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'], ['foob', 'Zm9vYg=='], ['fooba', 'Zm9vYmE='], ['foobar', 'Zm9vYmFy']]
  for (const [plain, encoded] of vectors) {
    assert.equal(encodeBase64Text(plain).value, encoded); assert.equal(decodeBase64(encoded).text, plain)
    assert.equal(decodeBase64(encoded.replace(/=+$/, '')).text, plain)
  }
  for (let length = 0; length <= 257; length++) {
    const bytes = Uint8Array.from({ length }, (_, index) => (index * 73 + length * 17) & 255)
    for (const format of ['standard', 'url'] as const) for (const padding of [false, true]) {
      const actual = encodeBase64Bytes(bytes, format, padding)
      let expected = Buffer.from(bytes).toString(format === 'url' ? 'base64url' : 'base64')
      if (format === 'url' && padding) expected += '='.repeat((4 - expected.length % 4) % 4)
      assert.equal(actual, expected)
      assert.deepEqual(decodeBase64(actual, format).bytes, bytes)
    }
  }
})

await check('Only declared ASCII whitespace is ignored; mixed alphabets and malformed padding are rejected', () => {
  assert.equal(decodeBase64(' Z\tg\r\n=\f= ').text, 'f')
  for (const suffix of ['\v', '\u00a0', '\u200b', '\uFEFF']) expectError(() => decodeBase64(`Zg==${suffix}`), 'alphabet')
  for (const value of ['A', 'Zg=', 'Zg===', '=Zg', 'Z=g=', 'Zm9v=', '====']) expectError(() => decodeBase64(value), 'padding')
  expectError(() => decodeBase64('-_8='), 'alphabet')
  expectError(() => decodeBase64('+/8=', 'url'), 'alphabet')
  expectError(() => decodeBase64('+_8=', 'url'), 'alphabet')
  assert.deepEqual(decodeBase64('-_8', 'url').bytes, new Uint8Array([251, 255]))
})

await check('Nonzero unused bits are rejected for every one-byte value with padded and unpadded input', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (let byte = 0; byte <= 255; byte++) {
    const valid = Buffer.from([byte]).toString('base64'), base = alphabet.indexOf(valid[1])
    for (let low = 1; low < 16; low++) {
      const invalid = valid[0] + alphabet[base + low]
      expectError(() => decodeBase64(invalid), 'canonicalBits')
      expectError(() => decodeBase64(invalid + '=='), 'canonicalBits')
    }
  }
  for (const invalid of ['Zm9=', 'Zm+=', 'Zm/=', 'Zm9', 'Zm-', 'Zm_']) expectError(() => decodeBase64(invalid, invalid.includes('-') || invalid.includes('_') ? 'url' : 'standard'), 'canonicalBits')
})

await check('Unicode/whitespace/BOM round trips preserve bytes while invalid UTF-8 remains a binary result', () => {
  for (const value of ['한글 😀', ' \t\r\n ', '\uFEFFfirst', '\u0000control', '']) {
    const encoded = encodeBase64Text(value)
    assert.equal(decodeBase64(encoded.value).text, value)
    assert.deepEqual(decodeBase64(encoded.value).bytes, utf8(value))
  }
  for (const bytes of [[0xff], [0xc0, 0xaf], [0xe2, 0x82], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80]]) {
    const decoded = decodeBase64(Buffer.from(bytes).toString('base64'))
    assert.equal(decoded.text, null); assert.deepEqual([...decoded.bytes], bytes)
  }
  expectError(() => encodeBase64Text('\ud800'), 'invalidUnicode')
})

await check('Data URL wrapper is separate from alphabet, charset metadata and signature detection', () => {
  const encoded = base64DataUrl(new Uint8Array([251, 255]), 'IMAGE/PNG')
  assert.ok(encoded.startsWith('data:image/png;base64,+/8='))
  const decoded = decodeBase64(encoded, 'url')
  assert.equal(decoded.declaredMime, 'image/png'); assert.equal(decoded.imageCandidate, null); assert.equal(decoded.text, null)
  assert.equal(decodeBase64('data:;charset=iso-8859-1;base64,/w==').text, null)
  assert.equal(decodeBase64('data:;base64,').bytes.length, 0)
  for (const value of ['data:text/plain,hello', 'data:base64,QQ==', 'data:text/plain;base64', 'data:bad;base64,QQ==', 'data:text/plain;x=\u0000;base64,QQ==']) expectError(() => decodeBase64(value), 'dataUrl')
  expectError(() => decodeBase64('data:text/plain;base64,-_8=', 'url'), 'alphabet')
  const markup = utf8('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  assert.equal(decodeBase64(base64DataUrl(markup, 'image/svg+xml')).imageCandidate, null)
  assert.ok(base64DataUrl(utf8('a'), 'text/html\nunsafe').startsWith('data:application/octet-stream;'))
})

await check('4MiB byte and 6MiB source limits are checked without trimming/truncation and before atob allocation', () => {
  const bytes = new Uint8Array(BASE64_BYTE_LIMIT); bytes[bytes.length - 1] = 255
  const encoded = encodeBase64Bytes(bytes)
  assert.equal(decodeBase64(encoded).bytes.at(-1), 255)
  expectError(() => encodeBase64Bytes(new Uint8Array(BASE64_BYTE_LIMIT + 1)), 'byteLimit')
  expectError(() => encodeBase64Text('가'.repeat(Math.floor(BASE64_BYTE_LIMIT / 3) + 1)), 'byteLimit')
  assert.equal(decodeBase64(' '.repeat(BASE64_TEXT_LIMIT)).bytes.length, 0)
  expectError(() => decodeBase64(' '.repeat(BASE64_TEXT_LIMIT + 1)), 'textLimit')
  const original = globalThis.atob; let calls = 0
  globalThis.atob = value => { calls++; return original(value) }
  try { expectError(() => decodeBase64(Buffer.alloc(BASE64_BYTE_LIMIT + 1).toString('base64')), 'byteLimit'); assert.equal(calls, 0) } finally { globalThis.atob = original }
})

await check('File encoding retains binary source; decoding uploads read fatal UTF-8 source and one file BOM only', async () => {
  const bytes = Uint8Array.from([0, 255, 17, 128]), file = new File([bytes], 'source.bin', { type: 'application/octet-stream' })
  const source = await readBase64File(file, 'encode', () => true)
  assert.equal(source.status, 'ready')
  if (source.status !== 'ready' || source.kind !== 'file') throw new Error('Expected binary source')
  assert.deepEqual(source.bytes, bytes)
  const first = encodeBase64Bytes(source.bytes), second = encodeBase64Bytes(source.bytes)
  assert.equal(first, second); assert.deepEqual(decodeBase64(first).bytes, bytes)
  const uploaded = await readBase64File(new File(['\uFEFFZg=='], 'encoded.base64'), 'decode', () => true)
  assert.deepEqual(uploaded, { status: 'ready', kind: 'base64Text', text: 'Zg==', name: 'encoded.base64' })
  assert.deepEqual(await readBase64File(new File([new Uint8Array([255])], 'invalid.txt'), 'decode', () => true), { status: 'failed', error: 'fileUtf8' })
  assert.deepEqual(await readBase64File(file, 'decode', () => true), { status: 'failed', error: 'fileUtf8' })
  assert.deepEqual(await readBase64File(new File(['QQ=='], 'payload.custom', { type: 'application/octet-stream' }), 'decode', () => true), { status: 'ready', kind: 'base64Text', text: 'QQ==', name: 'payload.custom' })
})

await check('Read size/pre-stale guards start no I/O; input revisions suppress late success and failure', async () => {
  let reads = 0
  const oversized = { name: 'large.bin', type: '', size: BASE64_BYTE_LIMIT + 1, arrayBuffer: async () => { reads++; return new ArrayBuffer(0) } }
  assert.deepEqual(await readBase64File(oversized, 'encode', () => true), { status: 'failed', error: 'byteLimit' })
  assert.deepEqual(await readBase64File(oversized, 'encode', () => false), { status: 'stale' }); assert.equal(reads, 0)
  for (const reject of [false, true]) {
    const guard = createBase64ActionGuard(), token = guard.beginRead(), task = deferred<ArrayBuffer>()
    const pending = readBase64File({ name: 'source.bin', type: '', size: 1, arrayBuffer: () => task.promise }, 'encode', () => guard.isCurrent(token))
    guard.invalidate(); if (reject) task.reject(new Error('late read')); else task.resolve(new Uint8Array([1]).buffer)
    assert.deepEqual(await pending, { status: 'stale' })
  }
  const mismatch = { name: 'source.bin', type: '', size: 1, arrayBuffer: async () => new ArrayBuffer(2) }
  assert.deepEqual(await readBase64File(mismatch, 'encode', () => true), { status: 'failed', error: 'fileRead' })
})

function pngHeader(width = 1, height = 1): Uint8Array {
  const bytes = new Uint8Array(33), view = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13)
  bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height)
  return bytes
}

await check('Preview requires signature plus actual load; SVG/HTML creates no URL and fake PNG failure revokes once', async () => {
  const png = pngHeader(), revoked: string[] = []; let creates = 0
  const ports: Base64PreviewPorts = { createUrl(blob) { creates++; assert.equal(blob.type, 'image/png'); return 'blob:fixture' }, revokeUrl(url) { revoked.push(url) }, load: async () => false }
  assert.deepEqual(await createBase64ImagePreview(utf8('<html>fake</html>'), new AbortController().signal, ports), { status: 'none' })
  assert.equal(creates, 0)
  assert.deepEqual(await createBase64ImagePreview(png, new AbortController().signal, ports), { status: 'failed' })
  assert.deepEqual(revoked, ['blob:fixture'])
  for (const [bytes, mime] of [[[255, 216, 255], 'image/jpeg'], [[71, 73, 70, 56, 57, 97], 'image/gif'], [[82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80], 'image/webp']] as const) assert.equal(base64ImageCandidate(new Uint8Array(bytes)), mime)
})

await check('Preview abort revokes immediately; late load success/rejection and explicit release never leak/double revoke', async () => {
  const png = pngHeader()
  for (const reject of [false, true]) {
    const abort = new AbortController(), task = deferred<boolean>(); let revoked = 0
    const pending = createBase64ImagePreview(png, abort.signal, { createUrl: () => 'blob:fixture', revokeUrl() { revoked++ }, load: () => task.promise })
    abort.abort(); assert.equal(revoked, 1)
    if (reject) task.reject(new Error('late load')); else task.resolve(true)
    assert.deepEqual(await pending, { status: 'stale' }); assert.equal(revoked, 1)
  }
  const abort = new AbortController(); let revoked = 0
  const result = await createBase64ImagePreview(png, abort.signal, { createUrl: () => 'blob:ready', revokeUrl() { revoked++ }, load: async () => true })
  assert.equal(result.status, 'ready'); assert.equal(revoked, 0)
  if (result.status !== 'ready') throw new Error('Expected preview')
  abort.abort(); result.release(); result.release(); assert.equal(revoked, 1)
})

await check('Broken raster headers and over-16MP images never start browser decoding or change result bytes', async () => {
  let loads = 0, creates = 0
  const ports = { createUrl() { creates++; return 'blob:bounded' }, revokeUrl() {}, load: async () => { loads++; return true } }
  for (const bytes of [pngHeader(4097, 4096), pngHeader(0, 1), pngHeader().slice(0, 16), pngHeader(0xffffffff, 0xffffffff)]) {
    const original = [...bytes], encoded = encodeBase64Bytes(bytes)
    assert.deepEqual(await createBase64ImagePreview(bytes, new AbortController().signal, ports), { status: 'failed' })
    assert.deepEqual([...bytes], original); assert.deepEqual([...decodeBase64(encoded).bytes], original)
  }
  assert.equal(loads, 0); assert.equal(creates, 0)
  const allowed = await createBase64ImagePreview(pngHeader(4096, 4096), new AbortController().signal, ports)
  assert.equal(allowed.status, 'ready'); assert.equal(loads, 1)
  if (allowed.status === 'ready') allowed.release()
})

await check('Current copy requires actual success; late denial cannot fall back after new input/copy', async () => {
  for (const success of [false, true]) assert.equal(await copyBase64Text('fixture', () => true, { fallback: () => success }), success ? 'copied' : 'failed')
  assert.equal(await copyBase64Text('fixture', () => true, { writeText: async () => { throw new Error('denied') }, fallback: () => false }), 'failed')
  const guard = createBase64ActionGuard(), token = guard.beginCopy(), task = deferred<void>(); let fallback = 0
  const pending = copyBase64Text('old', () => guard.isCurrent(token), { writeText: () => task.promise, fallback: () => { fallback++; return true } })
  const latest = guard.beginCopy(); task.reject(new Error('late denial'))
  assert.equal(await pending, 'stale'); assert.equal(fallback, 0); assert.equal(guard.isCurrent(latest), true)
  guard.invalidate(); assert.equal(guard.isCurrent(latest), false)
})

await check('Download names remove paths/control characters and choose an explicit verified extension', () => {
  assert.equal(safeBase64Filename('../../payload.html', 'bin'), 'payload.bin')
  assert.equal(safeBase64Filename('C:\\folder\\image.svg', 'png'), 'image.png')
  assert.equal(safeBase64Filename('CON.txt', 'txt'), 'file-CON.txt')
  assert.equal(safeBase64Filename('..\u0000\u202epayload?.exe', 'bin'), '..payload.bin')
  assert.equal(safeBase64Filename('', 'bin'), 'converted.bin')
  assert.ok(safeBase64Filename('😀'.repeat(200), 'txt').length <= 204)
})

console.log(`Base64 codec/actions: ${groups} groups passed (independent Buffer/File; preview/browser ports are controlled)`)
