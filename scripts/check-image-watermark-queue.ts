import assert from 'node:assert/strict'
import { createWatermarkQueue } from '../src/utils/imageWatermarkQueue.ts'
import { createWatermarkWorkGate } from '../src/utils/imageWatermarkWorkGate.ts'
import { createWatermarkZipController } from '../src/utils/imageWatermarkZip.ts'
import { createWatermarkSnapshot, DEFAULT_WATERMARK_DRAFT, WATERMARK_LIMITS, WatermarkError } from '../src/utils/imageWatermark.ts'
import type { ImageZipSnapshot } from '../src/utils/imageZipSnapshot.ts'

const flush = () => new Promise<void>(resolve => setImmediate(resolve))
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const file = (name: string) => new File(['x'], name)
const settings = createWatermarkSnapshot(DEFAULT_WATERMARK_DRAFT)
type Output = { blob: Blob; id: string }
// Queue metadata port only: no 80MiB allocation is needed to check accounting.
const output = (id: string, size = 10): Output => ({ id, blob: { size, type: 'image/png' } as Blob })
function fixture() {
  const work: { file: File; signal: AbortSignal; job: ReturnType<typeof deferred<Output>> }[] = [], released: string[] = []
  let simultaneous = 0, maximum = 0
  const queue = createWatermarkQueue<Output>({
    process: async (file, _settings, signal) => { const job = deferred<Output>(); work.push({ file, signal, job }); maximum = Math.max(maximum, ++simultaneous); try { return await job.promise } finally { simultaneous-- } },
    release: out => released.push(out.id),
  })
  return { queue, work, released, maximum: () => maximum }
}
let groups = 0
async function check(name: string, run: () => Promise<void>) { await run(); groups++; console.log('PASS', name) }

await check('files never auto-process; explicit batch membership excludes later additions and preserves reordered stable IDs', async () => {
  const f = fixture(); f.queue.add([{ id: 'a', file: file('same.png') }, { id: 'b', file: file('same.png') }]); await flush(); assert.equal(f.work.length, 0)
  f.queue.move('b', 0); f.queue.start(settings); await flush(); assert.equal(f.work.length, 1); assert.equal(f.queue.getSnapshot().activeId, 'b')
  f.queue.add([{ id: 'c', file: file('new.png') }]); f.work[0].job.resolve(output('B')); await flush(); assert.equal(f.queue.getSnapshot().activeId, 'a')
  f.work[1].job.resolve(output('A')); await flush(); assert.equal(f.work.length, 2); assert.equal(f.queue.getSnapshot().items[2].status, 'pending')
  f.queue.start(settings); await flush(); assert.equal(f.queue.getSnapshot().activeId, 'c'); f.work[2].job.resolve(output('C')); await flush()
  assert.deepEqual(f.queue.getSnapshot().items.map(row => [row.id, row.out?.id]), [['b', 'B'], ['a', 'A'], ['c', 'C']]); assert.equal(f.queue.getSnapshot().outputBytes, 30); f.queue.dispose()
})

await check('pause/resume retains the physical slot despite ineffective abort and releases a late canceled output once', async () => {
  const f = fixture(); f.queue.add([{ id: 'a', file: file('a') }, { id: 'b', file: file('b') }]); f.queue.start(settings); await flush()
  f.queue.pause(); assert.equal(f.queue.getSnapshot().phase, 'pausing'); assert.ok(f.work[0].signal.aborted)
  f.queue.resume(); await flush(); assert.equal(f.work.length, 1)
  f.work[0].job.resolve(output('canceled')); await flush(); assert.deepEqual(f.released, ['canceled']); assert.equal(f.work.length, 2); assert.equal(f.queue.getSnapshot().activeId, 'a')
  f.work[1].job.resolve(output('a')); await flush(); f.work[2].job.resolve(output('b')); await flush()
  assert.equal(f.maximum(), 1); assert.ok(f.queue.getSnapshot().items.every(row => row.status === 'done')); f.queue.dispose()
})

await check('invalidate releases current outputs, drops old errors, blocks stale key roundtrip and holds the old slot', async () => {
  const f = fixture(); f.queue.add([{ id: 'a', file: file('a') }, { id: 'b', file: file('b') }]); f.queue.start(settings); await flush()
  f.work[0].job.resolve(output('done')); await flush(); assert.equal(f.queue.getSnapshot().outputBytes, 10)
  f.queue.invalidate(); assert.deepEqual(f.released, ['done']); assert.equal(f.queue.getSnapshot().outputBytes, 0); assert.equal(f.queue.getSnapshot().phase, 'pausing')
  f.queue.start(createWatermarkSnapshot({ ...DEFAULT_WATERMARK_DRAFT, opacity: 75 })); f.queue.invalidate(); f.queue.start(settings); await flush(); assert.equal(f.work.length, 2)
  f.work[1].job.resolve(output('old-back-to-key')); await flush(); assert.ok(f.released.includes('old-back-to-key')); assert.equal(f.queue.getSnapshot().activeId, 'a')
  f.work[2].job.resolve(output('new-a')); await flush(); f.work[3].job.resolve(output('new-b')); await flush(); assert.equal(f.maximum(), 1); f.queue.dispose()
})

await check('remove/clear/dispose leave old processors owned until settlement and do not revive removed rows', async () => {
  for (const action of ['remove', 'clear', 'dispose']) {
    const f = fixture(); f.queue.add([{ id: 'a', file: file('a') }]); f.queue.start(settings); await flush()
    if (action === 'remove') f.queue.remove('a'); else if (action === 'clear') f.queue.clear(); else f.queue.dispose()
    assert.equal(f.queue.getSnapshot().items.length, 0)
    if (action !== 'dispose') { f.queue.add([{ id: 'b', file: file('b') }]); f.queue.start(settings) }
    await flush(); assert.equal(f.work.length, 1)
    f.work[0].job.resolve(output('old')); await flush(); assert.deepEqual(f.released, ['old'])
    assert.ok(!f.queue.getSnapshot().items.some(row => row.id === 'a'))
    if (action !== 'dispose') { assert.equal(f.work.length, 2); f.work[1].job.resolve(output('new')); await flush(); f.queue.dispose() }
    assert.equal(f.maximum(), 1)
  }
})

await check('failure-only retry preserves successful output and accepts only current-key failed rows', async () => {
  const f = fixture(); f.queue.add([{ id: 'a', file: file('bad') }, { id: 'b', file: file('good') }]); f.queue.start(settings); await flush()
  f.work[0].job.reject(new WatermarkError('format')); await flush(); f.work[1].job.resolve(output('good')); await flush()
  assert.deepEqual(f.queue.getSnapshot().items.map(row => row.status), ['error', 'done']); const retained = f.queue.getSnapshot().items[1].out
  f.queue.retryFailed(['b']); await flush(); assert.equal(f.work.length, 2)
  f.queue.retryFailed(); await flush(); assert.equal(f.work.length, 3); f.work[2].job.resolve(output('retry')); await flush()
  assert.equal(f.queue.getSnapshot().items[1].out, retained); assert.equal(f.queue.getSnapshot().outputBytes, 20)
  f.queue.invalidate(); f.queue.retryFailed(); await flush(); assert.equal(f.work.length, 3); f.queue.dispose()
})

await check('80MiB accounting is inclusive, releases excess before failure, and recovers bytes on delete/retry without double count', async () => {
  const f = fixture(); f.queue.add([{ id: 'a', file: file('a') }, { id: 'b', file: file('b') }]); f.queue.start(settings); await flush()
  f.work[0].job.resolve(output('limit', WATERMARK_LIMITS.outputBytes)); await flush(); f.work[1].job.resolve(output('excess', 1)); await flush()
  assert.equal(f.queue.getSnapshot().outputBytes, WATERMARK_LIMITS.outputBytes); assert.equal(f.queue.getSnapshot().items[1].status, 'error')
  assert.equal((f.queue.getSnapshot().items[1].error as WatermarkError).code, 'outputLimit'); assert.deepEqual(f.released, ['excess'])
  f.queue.remove('a'); assert.equal(f.queue.getSnapshot().outputBytes, 0); f.queue.retryFailed(); await flush()
  f.work[2].job.resolve(output('one', 1)); await flush(); assert.equal(f.queue.getSnapshot().outputBytes, 1); f.queue.clear(); assert.equal(f.queue.getSnapshot().outputBytes, 0)
  assert.deepEqual(f.released, ['excess', 'limit', 'one']); f.queue.dispose()
})

await check('failure-only retry after pause never resumes unrelated waiting photos', async () => {
  const f = fixture(); f.queue.add(['a', 'b', 'c'].map(id => ({ id, file: file(id) }))); f.queue.start(settings); await flush()
  f.work[0].job.reject(new WatermarkError('decode')); await flush(); f.queue.pause()
  f.work[1].job.resolve(output('canceled-b')); await flush()
  assert.deepEqual(f.queue.getSnapshot().items.map(row => row.status), ['error', 'pending', 'pending'])
  f.queue.retryFailed(); await flush(); assert.equal(f.work[2].file.name, 'a')
  f.work[2].job.resolve(output('retry-a')); await flush(); assert.equal(f.work.length, 3)
  assert.deepEqual(f.queue.getSnapshot().items.map(row => row.status), ['done', 'pending', 'pending'])
  f.queue.start(settings); await flush(); assert.equal(f.work[3].file.name, 'b')
  f.work[3].job.resolve(output('b')); await flush(); f.work[4].job.resolve(output('c')); await flush(); f.queue.dispose()
})

await check('synchronous processing observer can pause before allocation; rejected aggregate add is atomic', async () => {
  let calls = 0, observing = false
  const queue = createWatermarkQueue<Output>({ process: async () => { calls++; return output('unexpected') }, onChange(state) { if (observing && state.phase === 'running') queue.pause() } })
  queue.add([{ id: 'a', file: file('a') }]); observing = true; queue.start(settings); await flush()
  assert.equal(calls, 0); assert.equal(queue.getSnapshot().phase, 'paused'); assert.equal(queue.getSnapshot().items[0].status, 'pending')
  assert.throws(() => queue.add(Array.from({ length: 10 }, (_, index) => ({ id: `new${index}`, file: file('new') }))), (error: unknown) => error instanceof WatermarkError && error.code === 'count')
  assert.equal(queue.getSnapshot().items.length, 1); queue.dispose()
})

await check('shared browser work gate serializes actual completion, skips stale queued work and survives rejected jobs', async () => {
  const gate = createWatermarkWorkGate(), first = deferred<string>(); let stale = false, allocated = 0
  const a = gate.run(async () => { allocated++; return first.promise }, () => true)
  const b = gate.run(async () => { allocated++; return 'obsolete' }, () => !stale)
  const caught = b.catch(error => { assert.ok(error instanceof WatermarkError); assert.equal(error.code, 'canceled') })
  const c = gate.run(async () => { allocated++; return 'new' }, () => true)
  await flush(); assert.equal(allocated, 1); assert.deepEqual(gate.getSnapshot(), { active: true, pending: 2 })
  stale = true; first.resolve('first'); assert.equal(await a, 'first'); await caught; assert.equal(await c, 'new'); assert.equal(allocated, 2)
  assert.deepEqual(gate.getSnapshot(), { active: false, pending: 0 })
  await assert.rejects(gate.run(async () => { throw new Error('decode') }, () => true)); assert.equal(await gate.run(async () => 'recovered', () => true), 'recovered')
})

await check('ZIP invalidation keeps physical busy, blocks overlapping encode, retains clicked Blob refs and permits explicit next request', async () => {
  const first = deferred<Blob>(), source = new Blob(['first']), captured: Blob[] = [], downloaded: Blob[] = []; let calls = 0
  const controller = createWatermarkZipController({ encode: async entries => { calls++; captured.push(entries[0].blob); return calls === 1 ? first.promise : new Blob(['new zip']) }, download: blob => downloaded.push(blob) })
  const input: ImageZipSnapshot = { key: 'current', entries: [{ id: 'a', name: 'a.png', blob: source }] }
  const a = controller.run(input); controller.invalidate(); assert.equal(controller.getSnapshot().busy, true)
  assert.equal(await controller.run(input), 'busy'); assert.equal(calls, 1); assert.equal(captured[0], source)
  first.resolve(new Blob(['obsolete zip'])); assert.equal(await a, 'stale'); assert.equal(downloaded.length, 0); assert.equal(controller.getSnapshot().busy, false)
  assert.equal(await controller.run(input), 'downloaded'); assert.equal(downloaded.length, 1); controller.dispose()
  assert.equal(await controller.run(input), 'stale')
})

console.log(`Watermark queue/gate/ZIP preparation: ${groups} groups passed; synthetic metadata/I-O only`)
