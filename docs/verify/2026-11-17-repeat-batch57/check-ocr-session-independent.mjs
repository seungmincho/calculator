import assert from 'node:assert/strict'
import { createOcrWorkerSession } from '../../../src/lib/ocr/workerSession.ts'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve() }
const outcome = run => { const box = { value: null }; void run.done.then(value => { box.value = value }); return box }
const request = (source, extra = {}) => ({ source, langs: 'eng', isCurrent: () => true, ...extra })
function fixture() {
  const creates = [], events = []
  const session = createOcrWorkerSession({ create(langs, logger) { const wait = deferred(); creates.push({ langs, logger, wait }); events.push(['create', langs]); return wait.promise } })
  const worker = () => {
    const recognitions = [], initializations = [], terminations = []
    return {
      recognitions, initializations, terminations,
      recognize(source, jobId) { const wait = deferred(); recognitions.push({ source, jobId, wait }); events.push(['recognize', source]); return wait.promise },
      reinitialize(langs, jobId) { const wait = deferred(); initializations.push({ langs, jobId, wait }); events.push(['reinitialize', langs]); return wait.promise },
      terminate() { const wait = deferred(); terminations.push(wait); events.push(['terminate']); return wait.promise },
    }
  }
  return { session, creates, events, worker }
}
let passed = 0
const match = process.argv.find(arg => arg.startsWith('--match='))?.slice(8)
const test = async (name, body) => { if (match && !name.includes(match)) return; await body(); passed++; console.log('PASS', name) }

await test('pending create reset cancels immediately but a replacement waits for late worker termination', async () => {
  const f = fixture(), a = outcome(f.session.run(request('a')))
  await flush(); assert.equal(f.creates.length, 1)
  f.session.cancelAll(); const b = outcome(f.session.run(request('b')))
  await flush(); assert.equal(a.value.status, 'cancelled'); assert.equal(b.value, null); assert.equal(f.creates.length, 1)
  const old = f.worker(); f.creates[0].wait.resolve(old); await flush()
  assert.equal(old.recognitions.length, 0); assert.equal(old.terminations.length, 1); assert.equal(f.creates.length, 1)
  old.terminations[0].resolve(); await flush(); assert.equal(f.creates.length, 2)
  const next = f.worker(); f.creates[1].wait.resolve(next); await flush()
  assert.equal(next.recognitions[0].source, 'b'); next.recognitions[0].wait.resolve({ text: '' }); await flush()
  assert.deepEqual(b.value, { status: 'done', result: { text: '' } })
  f.session.dispose(); await flush(); next.terminations[0].resolve(); await f.session.drain()
})

await test('cancelled recognize may remain pending; physical termination still gates replacement and old callbacks', async () => {
  const f = fixture(), progress = [], first = f.session.run(request('a', { onProgress: message => progress.push(message.status) })), a = outcome(first)
  await flush(); const old = f.worker(); f.creates[0].wait.resolve(old); await flush()
  f.creates[0].logger({ status: 'current', userJobId: old.recognitions[0].jobId }); assert.deepEqual(progress, ['current'])
  first.cancel(); const b = outcome(f.session.run(request('b', { onProgress: message => progress.push(message.status) }))); await flush()
  assert.equal(a.value.status, 'cancelled'); assert.equal(old.terminations.length, 1); assert.equal(f.creates.length, 1)
  f.creates[0].logger({ status: 'late', userJobId: old.recognitions[0].jobId }); assert.deepEqual(progress, ['current'])
  old.terminations[0].resolve(); await flush(); assert.equal(f.creates.length, 2)
  const next = f.worker(); f.creates[1].wait.resolve(next); await flush()
  old.recognitions[0].wait.reject(Error('late old OCR')); await flush(); assert.equal(b.value, null); assert.equal(next.terminations.length, 0)
  next.recognitions[0].wait.resolve('b text'); await flush(); assert.deepEqual(b.value, { status: 'done', result: 'b text' })
  first.cancel(); assert.equal(old.terminations.length, 1)
  f.session.dispose(); await flush(); next.terminations[0].resolve(); await f.session.drain()
})

await test('cancelled reinitialize never needs to settle or start recognize and does not corrupt next language', async () => {
  const f = fixture(), first = outcome(f.session.run(request('first'))); await flush()
  const old = f.worker(); f.creates[0].wait.resolve(old); await flush(); old.recognitions[0].wait.resolve('first'); await flush(); assert.equal(first.value.status, 'done')
  const reinit = f.session.run(request('second', { langs: 'kor' })), second = outcome(reinit); await flush()
  assert.equal(old.initializations[0].langs, 'kor'); reinit.cancel(); const third = outcome(f.session.run(request('third', { langs: 'jpn' }))); await flush()
  assert.equal(second.value.status, 'cancelled'); assert.equal(old.recognitions.length, 1); assert.equal(f.creates.length, 1)
  old.terminations[0].resolve(); await flush(); assert.equal(f.creates[1].langs, 'jpn')
  const next = f.worker(); f.creates[1].wait.resolve(next); await flush()
  old.initializations[0].wait.resolve(); await flush(); assert.equal(old.recognitions.length, 1); assert.equal(next.initializations.length, 0)
  next.recognitions[0].wait.resolve('third'); await flush(); assert.equal(third.value.status, 'done')
  f.session.dispose(); await flush(); next.terminations[0].resolve(); await f.session.drain()
})

await test('cached worker is reused serially with job-id logger isolation; settled cancel cannot terminate it', async () => {
  const f = fixture(), messages = [], one = f.session.run(request('one', { onProgress: value => messages.push('one:' + value.status) }))
  const two = f.session.run(request('two', { onProgress: value => messages.push('two:' + value.status) })), second = outcome(two)
  const three = f.session.run(request('three', { langs: 'kor', onProgress: value => messages.push('three:' + value.status) })), third = outcome(three)
  await flush(); assert.equal(f.creates.length, 1)
  f.creates[0].logger({ status: 'loading', userJobId: 'internal' }); const worker = f.worker(); f.creates[0].wait.resolve(worker); await flush()
  assert.equal(worker.recognitions.length, 1); worker.recognitions[0].wait.resolve('one'); await flush()
  assert.equal(worker.recognitions.length, 2); one.cancel(); assert.equal(worker.terminations.length, 0)
  f.creates[0].logger({ status: 'old', userJobId: worker.recognitions[0].jobId })
  f.creates[0].logger({ status: 'no id' }); f.creates[0].logger({ status: 'current', userJobId: worker.recognitions[1].jobId })
  assert.deepEqual(messages, ['one:loading', 'two:current'])
  worker.recognitions[1].wait.resolve('two'); await flush(); assert.equal(second.value.status, 'done'); assert.equal(worker.initializations.length, 1)
  f.creates[0].logger({ status: 'initializing', userJobId: worker.initializations[0].jobId })
  worker.initializations[0].wait.resolve(); await flush(); assert.equal(worker.recognitions.length, 3)
  worker.recognitions[2].wait.resolve('three'); await flush(); assert.equal(third.value.status, 'done'); assert.equal(f.creates.length, 1)
  assert.deepEqual(messages, ['one:loading', 'two:current', 'three:initializing'])
  f.session.dispose(); await flush(); worker.terminations[0].resolve(); await f.session.drain()
})

await test('idle termination blocks next create and termination rejection fails closed without duplicate cleanup', async () => {
  for (const rejected of [false, true]) {
    const f = fixture(); f.session.run(request('one')); await flush(); const old = f.worker(); f.creates[0].wait.resolve(old); await flush(); old.recognitions[0].wait.resolve('one'); await flush()
    f.session.cancelAll(); f.session.cancelAll(); const second = outcome(f.session.run(request('two'))); await flush()
    assert.equal(old.terminations.length, 1); assert.equal(f.creates.length, 1); assert.equal(second.value, null)
    if (rejected) old.terminations[0].reject(Error('native termination failed')); else old.terminations[0].resolve()
    await flush()
    if (rejected) { assert.deepEqual(second.value, { status: 'failed' }); assert.equal(f.creates.length, 1); f.session.dispose(); await f.session.drain() }
    else { assert.equal(f.creates.length, 2); f.session.dispose(); const late = f.worker(); f.creates[1].wait.resolve(late); await flush(); assert.equal(late.recognitions.length, 0); late.terminations[0].resolve(); await f.session.drain(); assert.equal(second.value.status, 'cancelled') }
  }
})

await test('dispose during create cancels queued work and destroys only returned worker; stale initial requests do no I/O', async () => {
  const f = fixture(), a = outcome(f.session.run(request('a'))), b = outcome(f.session.run(request('b'))); await flush()
  f.session.dispose(); const after = outcome(f.session.run(request('after dispose'))); await flush()
  assert.equal(a.value.status, 'cancelled'); assert.equal(b.value.status, 'cancelled'); assert.equal(f.creates.length, 1)
  const late = f.worker(); f.creates[0].wait.resolve(late); await flush(); assert.equal(late.recognitions.length, 0); assert.equal(late.terminations.length, 1)
  late.terminations[0].resolve(); await f.session.drain(); assert.equal(after.value.status, 'cancelled'); assert.equal(f.creates.length, 1)
  const fresh = fixture(), stale = outcome(fresh.session.run(request('stale', { isCurrent: () => false }))), throws = outcome(fresh.session.run(request('throws', { isCurrent() { throw Error('invalid owner') } })))
  await flush(); assert.equal(stale.value.status, 'cancelled'); assert.equal(throws.value.status, 'cancelled'); assert.equal(fresh.creates.length, 0); fresh.session.dispose(); await fresh.session.drain()
})

console.log(`OCR independent session: ${passed} groups`)
