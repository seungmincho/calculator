import assert from 'node:assert/strict'
import { createDiscountComparisonGuard, copyDiscountComparison, createDiscountComparisonDownloads } from '../src/utils/discountComparisonActions.ts'
const defer = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(name: string, run: () => Promise<void> | void) { await run(); groups++; console.log('PASS', name) }
await check('late clipboard rejection cannot call fallback after input, unmount or a newer action invalidates it', async () => {
  for (const invalidate of ['input', 'new']) {
    const guard = createDiscountComparisonGuard(), pending = defer(), token = guard.begin(); let calls = 0
    const action = copyDiscountComparison('old', () => guard.current(token), { writeText: () => pending.promise, fallback: () => { calls++; return true } })
    if (invalidate === 'input') guard.invalidate(); else guard.begin()
    pending.reject(new Error('denied')); assert.equal(await action, 'stale'); assert.equal(calls, 0)
  }
  const pending = defer(); let active = true
  const copied = copyDiscountComparison('old', () => active, { writeText: () => pending.promise, fallback: () => true }); active = false; pending.resolve(); assert.equal(await copied, 'stale')
})
await check('native and legacy outcomes are truthful, exceptions preserve failure and stale changes inside a fallback win', async () => {
  assert.equal(await copyDiscountComparison('text', () => true, { writeText: async () => {}, fallback: () => false }), 'copied')
  for (const result of [true, false]) assert.equal(await copyDiscountComparison('text', () => true, { writeText: async () => { throw new Error('denied') }, fallback: () => result }), result ? 'copied' : 'failed')
  assert.equal(await copyDiscountComparison('text', () => true, { fallback: () => { throw new Error('denied') } }), 'failed')
  let current = true; assert.equal(await copyDiscountComparison('text', () => current, { fallback: () => { current = false; return true } }), 'stale')
})
await check('TXT holds exact text, fixed filename and single URL ownership through failures, stale creation and dispose', async () => {
  const blobs: Blob[] = [], downloaded: string[] = [], revoked: string[] = [], callbacks = new Map<number, () => void>(); let current = true, fail = false, createStale = false
  const downloads = createDiscountComparisonDownloads({ createUrl(blob) { blobs.push(blob); if (createStale) current = false; return 'blob:' + blobs.length }, revokeUrl(url) { revoked.push(url) }, download(url, filename) { if (fail) throw new Error('denied'); downloaded.push(url + '/' + filename) }, schedule(callback) { const id = callbacks.size; callbacks.set(id, callback); return id }, cancel(id) { callbacks.delete(id as number) } })
  assert.equal(downloads.download('한글\nexact', () => current), 'started'); assert.equal(await blobs[0].text(), '한글\nexact'); assert.equal(blobs[0].type, 'text/plain;charset=utf-8'); assert.deepEqual(downloaded, ['blob:1/discount-comparison.txt'])
  fail = true; assert.equal(downloads.download('failure', () => current), 'failed'); assert.deepEqual(revoked, ['blob:2']); fail = false; createStale = true
  assert.equal(downloads.download('stale', () => current), 'stale'); assert.deepEqual(revoked, ['blob:2', 'blob:3']); downloads.dispose(); assert.deepEqual(revoked, ['blob:2', 'blob:3', 'blob:1']); assert.equal(callbacks.size, 0)
  current = true; assert.equal(downloads.download('unmounted', () => current), 'stale')
})
console.log(`Discount comparison actions: ${groups} groups passed`)
