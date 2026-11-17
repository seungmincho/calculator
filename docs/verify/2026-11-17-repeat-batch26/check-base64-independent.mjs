import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { decodeBase64, encodeBase64Bytes, BASE64_BYTE_LIMIT } from '../../../src/utils/base64Codec.ts'
import { createBase64ImagePreview, readBase64File } from '../../../src/utils/base64Actions.ts'

// Read-only reuse of the author's host ports, not their assertions or test groups.
const hostPath = 'docs/verify/2026-11-17-repeat-batch26/check-base64-parent.mjs'
const original = fs.readFileSync(hostPath, 'utf8')
const harnessUrl = pathToFileURL(path.resolve('docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')).href
const host = original.slice(0, original.indexOf('\nawait check(')).replace("'../2026-11-17-repeat-batch19/component-harness.cjs'", JSON.stringify(harnessUrl)) + '\nexport { fixture, pngHeader };'
const { fixture, pngHeader } = await import('data:text/javascript;base64,' + Buffer.from(host).toString('base64'))
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }

await check('independent two-byte Buffer oracle and noncanonical final two bits across standard/url', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (let value = 0; value <= 65535; value += 17) {
    const bytes = Uint8Array.of(value >>> 8, value & 255), standard = Buffer.from(bytes).toString('base64')
    for (const format of ['standard', 'url']) {
      const canonical = format === 'url' ? standard.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : standard
      assert.equal(encodeBase64Bytes(bytes, format), canonical)
      assert.deepEqual(Buffer.from(decodeBase64(canonical, format).bytes), Buffer.from(bytes))
      const wrong = standard.slice(0, 2) + alphabet[alphabet.indexOf(standard[2]) | 1] + '='
      assert.throws(() => decodeBase64(format === 'url' ? wrong.replaceAll('+', '-').replaceAll('/', '_') : wrong, format), error => error.code === 'canonicalBits')
    }
  }
})
await check('txt/base64/b64/unknown decode uploads use actual UTF8 content and one BOM marker; invalid content retains exact input', async () => {
  const f = await fixture(); f.click('mode', 'decode')
  const data = '한글\u0000\r\n😀 ', base64 = Buffer.from(data).toString('base64')
  for (const name of ['sample.txt', 'sample.base64', 'sample.b64', 'arbitrary.xyz']) {
    await f.upload(new File(['\uFEFF' + base64], name, { type: 'application/x-not-base64' }))
    assert.equal(f.input(), base64); assert.equal(f.node('download').props.disabled, true)
    await f.convert(); assert.equal(f.output(), data); f.click('download')
    assert.deepEqual(Buffer.from(await f.downloaded.at(-1).blob.arrayBuffer()), Buffer.from(data))
  }
  const bad = 'ordinary text is not encoded.'
  await f.upload(new File([bad], 'wrong.base64', { type: 'text/plain' })); await f.convert(); assert.equal(f.input(), bad); assert.ok(f.optional('error')); assert.equal(f.node('download').props.disabled, true)
  await f.upload(new File([Uint8Array.of(0xff)], 'bad.txt')); assert.equal(f.input(), bad); assert.ok(f.optional('error')); f.cleanup()
})
await check('binary file URL format/padding/output view/locale reconversion never encodes an old data URL as source', async () => {
  const f = await fixture(), bytes = Uint8Array.from({ length: 1025 }, (_, i) => (i * 197 + 255) & 255)
  await f.upload(new File([bytes], 'bytes.unknown', { type: 'image/png' }))
  f.format('url'); await f.convert(); assert.equal(f.output(), Buffer.from(bytes).toString('base64url'))
  f.node('padding').props.onChange({ target: { checked: true } }); f.h.render(); await f.convert()
  assert.equal(f.output(), Buffer.from(bytes).toString('base64').replaceAll('+', '-').replaceAll('/', '_'))
  f.click('output-view', 'dataUrl'); const expected = 'data:image/png;base64,' + Buffer.from(bytes).toString('base64'); assert.equal(f.output(), expected)
  f.locale('en'); assert.equal(f.output(), expected); await f.convert(); assert.equal(f.output(), expected)
  f.click('swap'); assert.equal(f.input(), expected); await f.convert(); assert.equal(f.optional('utf8').props['data-base64-utf8'], false)
  assert.equal(f.node('swap').props.disabled, true); assert.equal(f.node('copy').props.disabled, true); assert.equal(f.images.length, 0)
  f.click('download'); assert.deepEqual(Buffer.from(await f.downloaded.at(-1).blob.arrayBuffer()), Buffer.from(bytes)); f.cleanup()
})
await check('same-input reconversion and padding change invalidate pending copy while the newest result can succeed', async () => {
  for (const replace of ['reconvert', 'padding']) for (const rejection of [false, true]) {
    const f = await fixture(); f.edit('f'); f.format('url'); await f.convert(); f.copyMode('pending'); await f.copy(); const old = f.jobs[0]
    if (replace === 'padding') { f.node('padding').props.onChange({ target: { checked: true } }); f.h.render() }
    await f.convert(); f.copyMode('success'); await f.copy(); assert.equal(f.node('copy').props['data-base64-copied'], true)
    const before = f.legacyCalls(); if (rejection) old.reject(new Error('late old copy')); else old.resolve(); await f.settle()
    assert.equal(f.legacyCalls(), before); assert.equal(f.node('copy').props['data-base64-copied'], true); assert.equal(f.recovery(), undefined); assert.equal(f.output(), replace === 'padding' ? 'Zg==' : 'Zg'); f.cleanup()
  }
})
await check('a failed newer file invalidates an older pending read while preserving the existing source for explicit retry', async () => {
  const f = await fixture(); f.edit('original\nsource'); await f.convert()
  const pending = defer(), old = f.upload({ name: 'old.bin', type: '', size: 3, arrayBuffer: () => pending.promise })
  await f.upload({ name: 'new.bin', type: '', size: 4, arrayBuffer: async () => { throw new Error('read denied') } })
  pending.resolve(Uint8Array.of(1, 2, 3).buffer); await old
  assert.equal(f.input(), 'original\nsource'); assert.equal(f.optional('file-source'), undefined); assert.ok(f.optional('error'))
  await f.convert(); assert.equal(f.output(), Buffer.from('original\nsource').toString('base64')); f.cleanup()
})
await check('header pixel cap blocks native load; successful headers with actual load failure retain all downloadable bytes', async () => {
  let load = 0, created = 0, revoked = 0
  const ports = { createUrl() { created++; return 'blob:review' }, revokeUrl() { revoked++ }, async load() { load++; return false } }
  const controller = new AbortController()
  const over = pngHeader(4097, 4096), exact = pngHeader(4096, 4096)
  assert.equal((await createBase64ImagePreview(over, controller.signal, ports)).status, 'failed'); assert.equal(load + created, 0)
  assert.equal((await createBase64ImagePreview(exact, controller.signal, ports)).status, 'failed'); assert.equal(load, 1); assert.equal(revoked, 1)
  const f = await fixture(); f.click('mode', 'decode')
  for (const failure of ['native-error', 'native-size']) {
    const bytes = pngHeader(2, 2); f.edit(Buffer.from(bytes).toString('base64')); await f.convert(); const image = f.images.at(-1)
    if (failure === 'native-error') image.onerror()
    else { image.naturalWidth = 4097; image.naturalHeight = 4096; image.onload() }
    await f.settle(); assert.ok(f.optional('preview-failed')); assert.equal(f.node('download').props.disabled, false)
    f.click('download'); assert.deepEqual(Buffer.from(await f.downloaded.at(-1).blob.arrayBuffer()), Buffer.from(bytes)); assert.equal(f.downloaded.at(-1).name, 'converted.bin')
  }
  f.cleanup()
})
await check('ready preview owns URL until next input/unmount and failed new preview cannot restore an old image', async () => {
  const f = await fixture(); f.click('mode', 'decode'); f.edit(Buffer.from(pngHeader(2, 2)).toString('base64')); await f.convert()
  f.images.at(-1).onload(); await f.settle(); const first = f.optional('preview').props.src
  f.locale('en'); assert.equal(f.optional('preview').props.src, first); assert.equal(f.revoked.filter(url => url === first).length, 0)
  f.edit(Buffer.from(pngHeader(3, 3)).toString('base64')); await f.convert(); assert.equal(f.revoked.filter(url => url === first).length, 1)
  const image = f.images.at(-1), second = image.src, late = image.onload
  f.cleanup(); late(); await f.settle(); assert.equal(f.revoked.filter(url => url === second).length, 1); assert.equal(f.stored(), 0)
})
await check('oversize preflight and byte-length mismatch do not allocate or commit file data', async () => {
  let reads = 0
  const huge = { name: 'huge.bin', type: '', size: BASE64_BYTE_LIMIT + 1, async arrayBuffer() { reads++; return new ArrayBuffer(0) } }
  assert.equal((await readBase64File(huge, 'encode', () => true)).error, 'byteLimit'); assert.equal(reads, 0)
  const mismatch = { name: 'mismatch.any', type: '', size: 9, async arrayBuffer() { reads++; return Uint8Array.of(1, 2).buffer } }
  assert.equal((await readBase64File(mismatch, 'decode', () => true)).error, 'fileRead'); assert.equal(reads, 1)
})
console.log(`Independent Base64: ${groups} groups PASS; controlled DOM/image/clipboard, actual File/Blob bytes, no network`)
