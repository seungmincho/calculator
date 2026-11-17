import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createImageConversionQueue } from '../../../src/utils/imageConversionQueue.ts'
import { createImageConversionImports } from '../../../src/utils/imageConversionImports.ts'
import { captureImageConversionZip, createImageConversionZip, imageConversionSettingsUrl } from '../../../src/utils/imageConversionActions.ts'
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))
const a = { format: 'jpeg', quality: 85, bg: '#ffffff' }, b = { format: 'png', quality: 85, bg: '#ffffff' }
const file = name => new File(['synthetic pixels'], name, { type: 'image/png' })
const item = (id, name = `${id}.png`) => ({ id, file: file(name), src: 'png' })
const out = name => ({ blob: new Blob([name]), url: `blob:${name}`, width: 4, height: 3, srcWidth: 4, srcHeight: 3, downscaled: false })
function fixture(extra = {}) {
  const tasks = [], releases = [], timers = [], cancellations = []
  const queue = createImageConversionQueue({ options: a, process(file, options) { const task = { file, options, ...deferred() }; tasks.push(task); return task.promise }, release(value) { releases.push(value.url) }, schedule(callback) { const timer = { callback }; timers.push(timer); return timer }, cancel(timer) { cancellations.push(timer) }, ...extra })
  return { queue, tasks, releases, timers, cancellations }
}
const results = []
async function test(name, run) { await run(); results.push({ name, pass: true }) }
await test('clear then same-ID add retains one live process and releases the discarded old output', async () => {
  const f = fixture(); f.queue.add([item('same', 'old.png')]); await tick()
  f.queue.clear(); f.queue.add([item('same', 'new.png')]); await tick(); assert.equal(f.tasks.length, 1)
  f.tasks[0].resolve(out('old')); await tick(); assert.equal(f.tasks.length, 2); assert.deepEqual(f.releases, ['blob:old'])
  assert.equal(f.tasks[1].file.name, 'new.png'); f.tasks[1].resolve(out('new')); await tick()
  assert.equal(await f.queue.getSnapshot().items[0].lastSuccess.output.blob.text(), 'new')
  f.queue.dispose(); assert.deepEqual(f.releases, ['blob:old', 'blob:new'])
})
await test('settings ABA and stale debounce cannot accept an old result or start concurrent work', async () => {
  const f = fixture(); f.queue.add([item('x')]); await tick()
  f.queue.setOptions(b); const obsolete = f.timers.at(-1); f.queue.setOptions(a); obsolete.callback(); await tick()
  assert.equal(f.queue.getSnapshot().settling, true); assert.equal(f.tasks.length, 1)
  f.timers.at(-1).callback(); await tick(); assert.equal(f.tasks.length, 1)
  f.tasks[0].resolve(out('obsolete-A')); await tick(); assert.equal(f.tasks.length, 2)
  assert.equal(f.queue.getSnapshot().items[0].lastSuccess, undefined)
  f.tasks[1].resolve(out('current-A')); await tick(); assert.equal(f.queue.getSnapshot().items[0].status, 'done')
  f.queue.dispose(); assert.deepEqual(f.releases, ['blob:obsolete-A', 'blob:current-A'])
})
await test('pause preserves completed output, failed new format and selective retry stay paused', async () => {
  const f = fixture(); f.queue.add([item('x')]); await tick(); f.tasks[0].resolve(out('prior')); await tick()
  const prior = f.queue.getSnapshot().items[0].lastSuccess
  f.queue.pause(); f.queue.setOptions(b, 0); f.queue.add([item('y')]); await tick(); assert.equal(f.tasks.length, 1)
  f.queue.resume(); await tick(); f.queue.pause(); f.tasks[1].reject(new Error('new PNG failed')); await tick()
  assert.equal(f.queue.getSnapshot().items[0].lastSuccess, prior)
  assert.equal(f.queue.getSnapshot().items[0].status, 'error'); assert.equal(f.tasks.length, 2)
  f.queue.retryFailed(); await tick(); assert.equal(f.queue.getSnapshot().paused, true); assert.equal(f.tasks.length, 2)
  f.queue.resume(); await tick(); f.tasks[2].resolve(out('replacement')); await tick(); f.tasks[3].resolve(out('second')); await tick()
  assert.deepEqual(f.releases, ['blob:prior']); f.queue.dispose()
})
await test('processing notification reentry may pause before process starts without stranding row', async () => {
  let queue, once = true, calls = 0
  queue = createImageConversionQueue({ options: a, process: async () => { calls++; return out('accepted') }, release() {}, onChange(snapshot) { if (once && snapshot.phase === 'running') { once = false; queue.pause() } } })
  queue.add([item('x')]); await tick(); assert.equal(calls, 0); assert.equal(queue.getSnapshot().items[0].status, 'pending')
  queue.resume(); await tick(); assert.equal(calls, 1); assert.equal(queue.getSnapshot().items[0].status, 'done'); queue.dispose()
})
await test('concurrent header reads survive each other; clear prevents old publication and preserves new reading count', async () => {
  const reads = [], added = []
  const imports = createImageConversionImports({ read(file) { const task = { file, ...deferred() }; reads.push(task); return task.promise }, add(rows) { added.push(rows) } })
  const first = imports.add([file('first.png')]), second = imports.add([file('second.png')])
  reads[1].reject(new Error('head unavailable')); assert.equal((await second).status, 'added'); assert.equal(added[0][0].src, 'png'); assert.equal(imports.getReading(), 1)
  imports.clear(); const third = imports.add([file('third.png')]); reads[0].resolve(new Uint8Array()); assert.equal((await first).status, 'stale'); assert.equal(imports.getReading(), 1)
  reads[2].resolve(new Uint8Array()); assert.equal((await third).status, 'added'); assert.equal(imports.getReading(), 0)
  assert.deepEqual(added.map(rows => rows[0].file.name), ['second.png', 'third.png']); imports.dispose()
})
await test('ZIP snapshot owns current format bytes and cancellation blocks late downloads', async () => {
  const f = fixture(); f.queue.add([item('x', 'same.png'), item('y', 'same.png')]); await tick()
  f.tasks[0].resolve(out('x')); await tick(); f.tasks[1].resolve(out('y')); await tick()
  const snapshot = captureImageConversionZip(f.queue.getSnapshot())
  assert.deepEqual(snapshot.entries.map(entry => entry.name), ['same.jpg', 'same (2).jpg'])
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.entries))
  f.queue.setOptions(b); assert.equal(captureImageConversionZip(f.queue.getSnapshot()).entries.length, 0)
  const encodes = [], downloads = []
  const zip = createImageConversionZip({ encode(entries) { const pending = deferred(); encodes.push({ entries, ...pending }); return pending.promise }, download(blob, value) { downloads.push({ blob, value }) } })
  const old = zip.run(snapshot); zip.cancel(); const next = zip.run(snapshot)
  encodes[0].resolve(new Blob(['old ZIP'])); await old; assert.equal(downloads.length, 0)
  encodes[1].resolve(new Blob(['new ZIP'])); assert.equal(await next, 'downloaded'); assert.equal(await downloads[0].blob.text(), 'new ZIP')
  f.queue.clear(); assert.equal(await snapshot.entries[0].blob.text(), 'x'); zip.dispose(); f.queue.dispose()
})
await test('settings URL preserves outside state data and drops only irrelevant owned settings', () => {
  const source = 'https://toolhub.ai.kr/image-converter/?tag=one&f=jpeg&q=12&tag=two&bg=000000#result'
  const changed = new URL(imageConversionSettingsUrl(source, b))
  assert.deepEqual(changed.searchParams.getAll('tag'), ['one', 'two']); assert.equal(changed.hash, '#result')
  assert.equal(changed.searchParams.get('f'), 'png'); assert.equal(changed.searchParams.has('q'), false); assert.equal(changed.searchParams.has('bg'), false)
  assert.equal(imageConversionSettingsUrl('not a URL', a), null)
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch56/independent-preparation.json', JSON.stringify({ source: 'Independent direct execution of actual helpers with controlled async process/header/ZIP ports. Not browser pixels/codec execution.', results }, null, 2) + '\n')
console.log(`Image conversion independent preparation: ${results.length}/${results.length} PASS`)
