// node --experimental-strip-types scripts/check-image-compression-queue.ts
import assert from 'node:assert/strict'
import { createImageCompressionQueue, imageCompressionKey, type ImageQueueSnapshot } from '../src/utils/imageCompressionQueue.ts'
import { captureImageZip, createImageZipRunner } from '../src/utils/imageZipSnapshot.ts'
import { reserveUniqueImageNames } from '../src/utils/imageUniqueNames.ts'
import type { CompressOptions } from '../src/utils/imageCompress.ts'

type Output = { id: string; blob: Blob }
const defaults: CompressOptions = { format: 'jpeg', quality: 80, maxSide: 0, targetKB: 0 }
const file = (name: string) => new File([name], name, { type: 'image/jpeg' })
const output = (id: string): Output => ({ id, blob: new Blob([id], { type: 'image/jpeg' }) })
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function harness(options = defaults) {
  const calls: { file: File; options: CompressOptions; signal: AbortSignal; task: ReturnType<typeof deferred<Output>> }[] = []
  const released: string[] = [], changes: ImageQueueSnapshot<Output>[] = []
  let active = 0, maximum = 0
  const queue = createImageCompressionQueue<Output>({
    options,
    process: (input, settings, signal) => {
      active++; maximum = Math.max(maximum, active)
      const task = deferred<Output>()
      calls.push({ file: input, options: settings, signal, task })
      return task.promise.finally(() => { active-- })
    },
    release: result => { released.push(result.id) },
    onChange: snapshot => { changes.push(snapshot) },
  })
  return { queue, calls, released, changes, maximum: () => maximum, active: () => active }
}

const checks: [string, () => void | Promise<void>][] = [
  ['reserved filenames avoid generated/original collisions in either order and case', () => {
    assert.deepEqual(reserveUniqueImageNames(['a.jpg', 'a (2).jpg', 'a.jpg']), ['a.jpg', 'a (2).jpg', 'a (3).jpg'])
    assert.deepEqual(reserveUniqueImageNames(['a.jpg', 'A.jpg', 'a (2).jpg']), ['a.jpg', 'A (3).jpg', 'a (2).jpg'])
    assert.deepEqual(reserveUniqueImageNames(['a.jpg', 'b.jpg', 'A.jpg', 'a.jpg']), ['a.jpg', 'b.jpg', 'A (2).jpg', 'a (3).jpg'])
    assert.deepEqual(reserveUniqueImageNames(['noext', 'noext', 'noext (2)']), ['noext', 'noext (3)', 'noext (2)'])
    const original = ['A.JPG', 'a.jpg', 'a (2).jpg', 'A (3).JPG', 'a (2).jpg', 'a.jpg']
    const result = reserveUniqueImageNames(original)
    assert.equal(new Set(result.map(name => name.toLowerCase())).size, original.length)
    assert.deepEqual(original, ['A.JPG', 'a.jpg', 'a (2).jpg', 'A (3).JPG', 'a (2).jpg', 'a.jpg'])
  }],
  ['settings keys preserve the current quality/target-size semantics', () => {
    assert.equal(imageCompressionKey(defaults), 'q80|jpeg|0')
    assert.equal(imageCompressionKey({ ...defaults, targetKB: 500 }), 't500|jpeg|0')
    assert.equal(imageCompressionKey({ ...defaults, targetKB: 500, quality: 20 }), 't500|jpeg|0')
    assert.notEqual(imageCompressionKey({ ...defaults, format: 'png' }), imageCompressionKey(defaults))
  }],
  ['new files do not overlap an active processor and completed outputs are reused', async () => {
    const h = harness()
    h.queue.add([{ id: 'a', file: file('a.jpg') }, { id: 'b', file: file('b.jpg') }])
    await flush()
    assert.equal(h.calls.length, 1)
    h.queue.add([{ id: 'c', file: file('c.jpg') }]); await flush()
    assert.equal(h.calls.length, 1)
    h.calls[0].task.resolve(output('a')); await flush()
    assert.equal(h.calls.length, 2)
    h.calls[1].task.resolve(output('b')); await flush()
    h.calls[2].task.resolve(output('c')); await flush()
    assert.equal(h.maximum(), 1)
    assert.equal(h.active(), 0)
    h.queue.setOptions({ ...defaults }); h.queue.resume(); h.queue.retryFailed(); await flush()
    assert.equal(h.calls.length, 3)
    assert.ok(h.queue.getSnapshot().items.every(item => item.status === 'done'))
    h.queue.dispose()
    assert.deepEqual(h.released, ['a', 'b', 'c'])
  }],
  ['pause then immediate resume waits for actual completion and discards canceled output', async () => {
    const h = harness()
    h.queue.add([{ id: 'a', file: file('a.jpg') }]); await flush()
    h.queue.pause()
    assert.equal(h.queue.getSnapshot().phase, 'pausing')
    assert.ok(h.calls[0].signal.aborted)
    h.queue.resume(); await flush()
    assert.equal(h.calls.length, 1)
    h.calls[0].task.resolve(output('canceled')); await flush()
    assert.equal(h.calls.length, 2)
    assert.deepEqual(h.released, ['canceled'])
    h.calls[1].task.resolve(output('fresh')); await flush()
    assert.equal(h.queue.getSnapshot().items[0].out?.id, 'fresh')
    assert.equal(h.maximum(), 1)
    h.queue.dispose()
  }],
  ['paused add/options/retry never resumes; cancellation is pending rather than failed', async () => {
    const h = harness()
    h.queue.add([{ id: 'a', file: file('a.jpg') }]); await flush()
    h.queue.pause()
    h.calls[0].task.reject(new DOMException('stopped', 'AbortError')); await flush()
    assert.equal(h.queue.getSnapshot().phase, 'paused')
    assert.equal(h.queue.getSnapshot().items[0].status, 'pending')
    assert.equal(h.queue.getSnapshot().items[0].error, undefined)
    h.queue.add([{ id: 'b', file: file('b.jpg') }])
    h.queue.setOptions({ ...defaults, quality: 70 }); h.queue.retryFailed(); await flush()
    assert.equal(h.calls.length, 1)
    h.queue.resume(); await flush()
    assert.equal(h.calls[1].options.quality, 70)
    h.calls[1].task.resolve(output('a70')); await flush()
    h.calls[2].task.resolve(output('b70')); await flush()
    h.queue.dispose()
  }],
  ['same-setting file addition keeps earlier errors; retry only reruns selected failures', async () => {
    const h = harness()
    h.queue.add([{ id: 'bad', file: file('bad.jpg') }, { id: 'good', file: file('good.jpg') }]); await flush()
    h.calls[0].task.reject(new Error('decode')); await flush()
    h.calls[1].task.resolve(output('good')); await flush()
    h.queue.add([{ id: 'next', file: file('next.jpg') }]); await flush()
    assert.equal(h.calls[2].file.name, 'next.jpg')
    h.calls[2].task.resolve(output('next')); await flush()
    assert.equal(h.queue.getSnapshot().items[0].status, 'error')
    h.queue.retryFailed(['good']); await flush()
    assert.equal(h.calls.length, 3)
    h.queue.retryFailed(['bad']); await flush()
    assert.equal(h.calls[3].file.name, 'bad.jpg')
    h.calls[3].task.resolve(output('recovered')); await flush()
    assert.equal(h.calls.length, 4)
    assert.equal(h.queue.getSnapshot().items[1].out?.id, 'good')
    h.queue.dispose()
  }],
  ['new format retries old-format failures while preserving paused state', async () => {
    const h = harness({ ...defaults, format: 'avif' })
    h.queue.add([{ id: 'a', file: file('a.jpg') }]); await flush()
    h.calls[0].task.reject(new Error('format')); await flush()
    h.queue.pause(); h.queue.setOptions(defaults); await flush()
    assert.equal(h.queue.getSnapshot().items[0].status, 'pending')
    assert.equal(h.calls.length, 1)
    h.queue.resume(); await flush()
    assert.equal(h.calls[1].options.format, 'jpeg')
    h.calls[1].task.resolve(output('jpeg')); await flush()
    h.queue.dispose()
  }],
  ['rapid setting changes never overlap and accept only the final settings', async () => {
    const h = harness()
    h.queue.add([{ id: 'a', file: file('a.jpg') }]); await flush()
    h.queue.setOptions({ ...defaults, quality: 60 })
    const last = { ...defaults, format: 'png' as const, quality: 40 }
    h.queue.setOptions(last); last.quality = 10
    await flush()
    assert.equal(h.calls.length, 1)
    h.calls[0].task.resolve(output('old')); await flush()
    assert.deepEqual(h.calls[1].options, { ...defaults, format: 'png', quality: 40 })
    h.calls[1].task.resolve(output('new')); await flush()
    assert.equal(h.maximum(), 1)
    assert.deepEqual(h.released, ['old'])
    assert.equal(h.queue.getSnapshot().items[0].key, 'q40|png|0')
    h.queue.setOptions(defaults)
    assert.deepEqual(h.released, ['old', 'new'])
    assert.equal(h.queue.getSnapshot().items[0].out, undefined)
    h.queue.dispose(); await flush()
  }],
  ['deleted items cannot return, including the same ID being reused before completion', async () => {
    const h = harness()
    h.queue.add([{ id: 'same', file: file('old.jpg') }]); await flush()
    h.queue.remove('same')
    h.queue.add([{ id: 'same', file: file('replacement.jpg') }]); await flush()
    assert.equal(h.calls.length, 1)
    h.calls[0].task.resolve(output('deleted')); await flush()
    assert.equal(h.calls[1].file.name, 'replacement.jpg')
    h.queue.clear()
    h.calls[1].task.resolve(output('cleared')); await flush()
    assert.deepEqual(h.queue.getSnapshot().items, [])
    assert.deepEqual(h.released, ['deleted', 'cleared'])
    assert.equal(h.maximum(), 1)
    h.queue.dispose()
  }],
  ['dispose invalidates late success/error and releases output without publishing to an unmounted UI', async () => {
    for (const success of [true, false]) {
      const h = harness()
      h.queue.add([{ id: 'a', file: file('a.jpg') }]); await flush()
      h.queue.dispose()
      const count = h.changes.length
      if (success) h.calls[0].task.resolve(output('late'))
      else h.calls[0].task.reject(new Error('late failure'))
      await flush()
      h.queue.resume(); h.queue.add([{ id: 'b', file: file('b.jpg') }]); await flush()
      assert.equal(h.changes.length, count)
      assert.equal(h.calls.length, 1)
      assert.deepEqual(h.released, success ? ['late'] : [])
    }
  }],
  ['ZIP captures unique names and Blob contents independently from queue deletion and settings', async () => {
    const h = harness()
    h.queue.add([{ id: 'a', file: file('a.jpg') }, { id: 'b', file: file('a.jpg') }, { id: 'c', file: file('a (2).jpg') }]); await flush()
    for (let i = 0; i < 3; i++) { h.calls[i].task.resolve(output(`pixels-${i}`)); await flush() }
    const snapshot = captureImageZip(h.queue.getSnapshot(), input => input.name)
    assert.deepEqual(snapshot.entries.map(entry => entry.name), ['a.jpg', 'a (3).jpg', 'a (2).jpg'])
    h.queue.setOptions({ ...defaults, format: 'png' })
    assert.equal(captureImageZip(h.queue.getSnapshot(), input => input.name).entries.length, 0)
    h.queue.clear()
    assert.deepEqual(await Promise.all(snapshot.entries.map(entry => entry.blob.text())), ['pixels-0', 'pixels-1', 'pixels-2'])
    assert.equal(snapshot.key, 'q80|jpeg|0')
    h.queue.dispose(); await flush()
  }],
  ['new ZIP request suppresses previous download/error and keeps latest busy state', async () => {
    const jobs: ReturnType<typeof deferred<Blob>>[] = [], downloaded: string[] = []
    const runner = createImageZipRunner({
      encode: () => { const job = deferred<Blob>(); jobs.push(job); return job.promise },
      download: (_blob, snapshot) => { downloaded.push(snapshot.key) },
    })
    const snapshot = (key: string) => ({ key, entries: [{ id: key, name: `${key}.jpg`, blob: new Blob([key]) }] })
    const old = runner.run(snapshot('old')), next = runner.run(snapshot('next'))
    jobs[0].reject(new Error('obsolete failure'))
    assert.equal(await old, 'stale')
    assert.equal(runner.getSnapshot().busy, true)
    assert.equal(runner.getSnapshot().error, null)
    jobs[1].resolve(new Blob(['zip']))
    assert.equal(await next, 'downloaded')
    assert.deepEqual(downloaded, ['next'])
    const late = runner.run(snapshot('late'))
    runner.dispose(); jobs[2].resolve(new Blob(['late zip']))
    assert.equal(await late, 'stale')
    assert.deepEqual(downloaded, ['next'])
  }],
  ['ZIP current failure is visible, retry clears it, and input names are snapshotted before await', async () => {
    const tasks: ReturnType<typeof deferred<Blob>>[] = []
    let downloadName = ''
    const runner = createImageZipRunner({
      encode: () => { const task = deferred<Blob>(); tasks.push(task); return task.promise },
      download: (_blob, snapshot) => { downloadName = snapshot.entries[0].name },
    })
    const input = { key: 'a', entries: [{ id: 'a', name: 'original.jpg', blob: new Blob(['pixels']) }] }
    const failed = runner.run(input)
    tasks[0].reject(new Error('zipFailed'))
    assert.equal(await failed, 'failed')
    assert.equal((runner.getSnapshot().error as Error).message, 'zipFailed')
    const retry = runner.run(input)
    input.entries[0].name = 'edited.jpg'
    assert.equal(runner.getSnapshot().error, null)
    tasks[1].resolve(new Blob(['zip']))
    assert.equal(await retry, 'downloaded')
    assert.equal(downloadName, 'original.jpg')
    assert.equal(await runner.run({ key: 'empty', entries: [] }), 'empty')
    runner.dispose()
  }],
]

for (const [name, run] of checks) { await run(); console.log('PASS', name) }
console.log(`${checks.length} image queue checks passed`)
