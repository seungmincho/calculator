// Independent review: actual utilities with controlled image/encoder/queue ports.
/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS review runner. */
const assert = require('node:assert/strict')
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
const settings = { format: 'jpeg', quality: 80, maxSide: 0, targetKB: 0 }
const input = name => new File(['source'], name, { type: 'image/jpeg' })

async function fallbackCancellation(stage) {
  const { compressFile } = await import('../../../src/utils/imageCompress.ts')
  const keys = ['createImageBitmap', 'Image', 'OffscreenCanvas', 'document']
  const old = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const define = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, value })
  const pending = deferred(), abort = new AbortController()
  let htmlDecodes = 0, htmlEncodes = 0, closed = 0
  define('createImageBitmap', () => stage === 'decode' ? pending.promise : Promise.resolve({ width: 10, height: 10, close() { closed++ } }))
  define('Image', class { naturalWidth = 10; naturalHeight = 10; async decode() { htmlDecodes++ } })
  const context = () => ({ fillRect() {}, drawImage() {} })
  define('OffscreenCanvas', class { getContext() { return context() } convertToBlob() { return pending.promise } })
  define('document', { createElement() { return { getContext: context, toBlob(callback) { htmlEncodes++; callback(new Blob(['encoded'], { type: 'image/jpeg' })) } } } })
  try {
    const task = compressFile(input('source.jpg'), settings, abort.signal)
    const handled = task.then(() => 'unexpected-success', error => error.name)
    await flush(); abort.abort(); pending.reject(new Error('native stage failed')); await flush()
    const result = await handled
    return { stage, result, htmlDecodes, htmlEncodes, closed }
  } finally {
    for (const [key, descriptor] of old) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

async function assertFallbackCancellation() {
  for (const stage of ['decode', 'encode']) {
    const result = await fallbackCancellation(stage)
    assert.equal(result.result, 'AbortError')
    assert.equal(result.htmlDecodes, 0, 'canceled bitmap failure must not begin an HTML decoder')
    assert.equal(result.htmlEncodes, 0, 'canceled offscreen failure must not begin a canvas encoder')
    if (stage === 'encode') assert.equal(result.closed, 1)
    console.log('PASS', `canceled ${stage} failure drains without starting a fallback API`)
  }
  return 2
}

async function main() {
  if (process.argv.includes('--reproduce-fallback')) {
    for (const stage of ['decode', 'encode']) console.log(JSON.stringify(await fallbackCancellation(stage)))
    return
  }
  if (process.argv.includes('--fallback')) {
    console.log(`Image independent: ${await assertFallbackCancellation()} affected groups passed`)
    return
  }
  const { createImageCompressionQueue } = await import('../../../src/utils/imageCompressionQueue.ts')
  const { captureImageZip, createImageZipRunner } = await import('../../../src/utils/imageZipSnapshot.ts')
  const { reserveUniqueImageNames } = await import('../../../src/utils/imageUniqueNames.ts')
  let groups = 0
  const pass = name => { groups++; console.log('PASS', name) }
  for (const mutation of ['pause', 'remove', 'clear', 'dispose']) {
    let queue, acted = false, starts = 0
    queue = createImageCompressionQueue({ options: settings, process: async () => { starts++; return {} }, onChange(snapshot) {
      if (snapshot.phase === 'running' && !acted) { acted = true; if (mutation === 'remove') queue.remove('a'); else queue[mutation]() }
    } })
    queue.add([{ id: 'a', file: input('a.jpg') }]); await flush()
    assert.equal(starts, 0, mutation)
    assert.equal(queue.getSnapshot().activeId, null)
    queue.dispose()
  }
  pass('synchronous processing observer pause/remove/clear/dispose starts no invalid work')
  {
    const calls = [], released = []; let active = 0, maximum = 0
    const queue = createImageCompressionQueue({ options: settings, process(file, options, signal) {
      active++; maximum = Math.max(maximum, active); const task = deferred(); calls.push({ file, options, signal, task }); return task.promise.finally(() => active--)
    }, release: out => { released.push(out); throw new Error('cleanup failure') } })
    queue.add([{ id: 'same', file: input('old.jpg') }]); await flush()
    queue.remove('same'); queue.add([{ id: 'same', file: input('new.jpg') }]); queue.pause(); queue.setOptions({ ...settings, quality: 45 }); queue.resume()
    await flush(); assert.equal(calls.length, 1)
    calls[0].task.reject(new Error('late failure from removed item')); await flush()
    assert.equal(calls.length, 2); assert.equal(calls[1].file.name, 'new.jpg'); assert.equal(calls[1].options.quality, 45)
    calls[1].task.resolve('new-result'); await flush()
    queue.clear(); queue.add([{ id: 'same', file: input('third.jpg') }]); await flush()
    assert.equal(calls.length, 3); assert.deepEqual(released, ['new-result']); assert.equal(maximum, 1)
    queue.dispose(); calls[2].task.resolve('late disposed'); await flush()
    assert.deepEqual(released, ['new-result', 'late disposed']); assert.deepEqual(queue.getSnapshot().items, [])
  }
  pass('same ID late rejection and throwing release cannot revive rows or overlap processors')
  {
    const calls = []
    const queue = createImageCompressionQueue({ options: settings, process() { const task = deferred(); calls.push(task); return task.promise } })
    queue.pause(); queue.add([{ id: 'a', file: input('a.jpg') }])
    assert.throws(() => queue.add([{ id: 'b', file: input('b.jpg') }, { id: 'a', file: input('collision.jpg') }]), /duplicateImageId/)
    assert.deepEqual(queue.getSnapshot().items.map(item => item.id), ['a'])
    queue.resume(); await flush(); calls[0].resolve({ blob: new Blob(['retained']) }); await flush()
    const first = queue.getSnapshot().items[0].out
    queue.setOptions({ ...settings }); queue.retryFailed(['a']); queue.add([{ id: 'b', file: input('b.jpg') }]); await flush()
    assert.equal(queue.getSnapshot().items[0].out, first); assert.equal(calls.length, 2)
    calls[1].reject(new Error('bad')); await flush(); queue.pause(); queue.retryFailed(['b']); await flush()
    assert.equal(calls.length, 2); assert.equal(queue.getSnapshot().items[1].status, 'pending'); assert.equal(queue.getSnapshot().items[0].out, first)
    queue.dispose()
  }
  pass('duplicate add is atomic; paused failed retry retains current successful Blob')
  {
    for (let length = 1; length <= 120; length++) {
      const names = Array.from({ length }, (_, index) => index % 4 === 0 ? 'A.JPG' : index % 4 === 1 ? 'a.jpg' : `a (${index % 17 + 2}).jpg`)
      const result = reserveUniqueImageNames(names)
      assert.equal(new Set(result.map(name => name.toLowerCase())).size, length)
      const seen = new Set(); names.forEach((name, index) => { if (!seen.has(name.toLowerCase())) assert.equal(result[index], name); seen.add(name.toLowerCase()) })
    }
  }
  pass('120 adversarial reserved-name lists retain each first original and unique case-folded names')
  {
    const blob = new Blob([new Uint8Array([0, 255, 17])]), other = new Blob(['obsolete'])
    const snapshot = captureImageZip({ key: 'new', items: [
      { id: 'a', file: input('a.jpg'), status: 'done', key: 'new', out: { blob } },
      { id: 'b', file: input('b.jpg'), status: 'done', key: 'old', out: { blob: other } },
      { id: 'c', file: input('c.jpg'), status: 'processing', key: 'new', out: { blob: other } },
    ] }, file => file.name)
    assert.equal(snapshot.entries.length, 1); assert.equal(snapshot.entries[0].blob, blob)
    assert.deepEqual([...new Uint8Array(await snapshot.entries[0].blob.arrayBuffer())], [0, 255, 17])
    const jobs = [], downloads = []
    const runner = createImageZipRunner({ encode(entries) { const task = deferred(); jobs.push({ entries, task }); return task.promise }, download(value) { downloads.push(value); if (downloads.length === 1) throw new Error('download port denied') } })
    const first = runner.run(snapshot); jobs[0].task.resolve(new Blob(['zip1'])); assert.equal(await first, 'failed'); assert.ok(runner.getSnapshot().error)
    const second = runner.run(snapshot); assert.equal(runner.getSnapshot().error, null)
    assert.equal(await runner.run({ key: 'empty', entries: [] }), 'empty')
    jobs[1].task.reject(new Error('superseded failure')); assert.equal(await second, 'stale'); assert.equal(runner.getSnapshot().error, null)
    const third = runner.run(snapshot); jobs[2].task.resolve(new Blob(['zip3'])); assert.equal(await third, 'downloaded'); assert.equal(runner.getSnapshot().busy, false)
    runner.dispose()
  }
  pass('ZIP filters old settings; binary Blob survives and synchronous download failure can retry')
  if (!process.argv.includes('--core')) groups += await assertFallbackCancellation()
  console.log(`Image independent: ${groups} groups passed`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
