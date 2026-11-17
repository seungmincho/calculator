import assert from 'node:assert/strict'
import { createOcrQueue, appendOcrItems, beginOcrJob, completeOcrJob, editOcrText, prepareOcrConfirmation, applyOcrConfirmation, setOcrPaused, retryOcrFailures, removeOcrItem, ocrAllText, ocrItemText } from '../src/utils/ocrQueue.ts'
import { createOcrWorkerSession, type OcrWorkerProgress } from '../src/lib/ocr/workerSession.ts'

let groups = 0
async function check(name: string, fn: () => void | Promise<void>) { await fn(); groups++; console.log('PASS', name) }
const settings = { langs: 'kor+eng', mode: 'gray' as const }
const recognized = (raw: string) => ({ raw, words: [], confidence: 90 })
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let n = 0; n < 20; n++) await Promise.resolve() }

await check('pause lets current finish, retains added pending and retries only captured failures without discarding text', () => {
  let state = appendOcrItems(createOcrQueue<string>(), [{ id: 1, file: 'a', url: 'a' }, { id: 2, file: 'b', url: 'b' }])
  let started = beginOcrJob(state, settings); assert.ok(started.job); state = completeOcrJob(started.state, started.job, recognized('old text'))
  state = editOcrText(state, 1, 'edited'); const permission = prepareOcrConfirmation(state, { kind: 'rerun', ids: [1] }), applied = applyOcrConfirmation(state, permission); assert.ok(applied.ok)
  started = beginOcrJob(applied.state, settings); assert.ok(started.job); state = setOcrPaused(started.state, true); state = completeOcrJob(state, started.job, null)
  assert.equal(ocrAllText(state), 'edited'); assert.equal(state.items[0].status, 'error')
  state = appendOcrItems(state, [{ id: 3, file: 'c', url: 'c' }]); const retried = retryOcrFailures(state)
  assert.equal(retried.paused, true); assert.equal(retried.items[1], state.items[1]); assert.equal(beginOcrJob(retried, settings).job, null)
  started = beginOcrJob(setOcrPaused(retried, false), settings); assert.ok(started.job); state = completeOcrJob(started.state, started.job, recognized('new raw')); assert.equal(ocrItemText(state.items[0], state.clean), 'edited')
})
await check('confirmation cancel/stale and new edit ABA preserve manuscript, while accepted blank OCR is a real success', () => {
  let state = appendOcrItems(createOcrQueue<string>(), [{ id: 1, file: 'original bytes', url: 'a' }]); let started = beginOcrJob(state, settings); assert.ok(started.job)
  state = completeOcrJob(started.state, started.job, recognized('raw')); state = editOcrText(state, 1, 'draft')
  const old = prepareOcrConfirmation(state, { kind: 'cleanup', clean: { fixKoreanSpaces: true, joinLines: true } }); assert.equal(state.items[0].edited, 'draft')
  state = editOcrText(state, 1, 'new'); assert.equal(applyOcrConfirmation(state, old).ok, false)
  let accepted = applyOcrConfirmation(state, prepareOcrConfirmation(state, { kind: 'rerun', ids: [1] })); assert.ok(accepted.ok); started = beginOcrJob(accepted.state, settings); assert.ok(started.job)
  state = editOcrText(started.state, 1, 'during'); state = editOcrText(state, 1, 'new'); state = completeOcrJob(state, started.job, recognized('')); assert.equal(state.items[0].success?.raw, ''); assert.equal(state.items[0].edited, 'new'); assert.equal(state.items[0].keptEdited, true)
  accepted = applyOcrConfirmation(state, prepareOcrConfirmation(state, { kind: 'rerun', ids: [1] })); assert.ok(accepted.ok); started = beginOcrJob(accepted.state, settings); assert.ok(started.job); state = completeOcrJob(started.state, started.job, recognized('')); assert.notEqual(state.items[0].success, null); assert.equal(ocrAllText(state), '')
  const removed = removeOcrItem(started.state, 1); assert.equal(completeOcrJob(removed, started.job, recognized('late')), removed)
  const reset = applyOcrConfirmation(started.state, prepareOcrConfirmation(started.state, { kind: 'reset' })); assert.ok(reset.ok); assert.equal(completeOcrJob(reset.state, started.job, recognized('late')), reset.state)
})
function portFixture() {
  const creates: { logger: (message: OcrWorkerProgress) => void; gate: ReturnType<typeof deferred<void>> }[] = []
  const recognizes: { source: string; id: string; pending: ReturnType<typeof deferred<string>> }[] = [], reinits: { langs: string; id: string; pending: ReturnType<typeof deferred<void>> }[] = []
  const retirements: ReturnType<typeof deferred<void>>[] = [], io = { holdCreate: false, holdTerminate: false, rejectTerminate: false }
  const session = createOcrWorkerSession<string, string>({ async create(_langs, logger) {
    const gate = deferred<void>(); creates.push({ logger, gate }); if (io.holdCreate) await gate.promise
    return { recognize(source, id) { const pending = deferred<string>(); recognizes.push({ source, id, pending }); return pending.promise }, reinitialize(langs, id) { const pending = deferred<void>(); reinits.push({ langs, id, pending }); return pending.promise }, async terminate() { const pending = deferred<void>(); retirements.push(pending); if (io.rejectTerminate) throw Error('terminate failed'); if (io.holdTerminate) await pending.promise } }
  } })
  return { creates, recognizes, reinits, retirements, io, session, request: (source: string, langs = 'kor') => ({ source, langs, isCurrent: () => true }) }
}
await check('one-worker reuse serializes calls and filters old logger job ids; old completed cancel does not retire it', async () => {
  const f = portFixture(), log: string[] = [], a = f.session.run({ ...f.request('a'), onProgress: message => log.push(message.status) }); await flush()
  const b = f.session.run({ ...f.request('b'), onProgress: message => log.push(message.status) }); await flush(); assert.equal(f.recognizes.length, 1)
  f.recognizes[0].pending.resolve('a'); assert.deepEqual(await a.done, { status: 'done', result: 'a' }); await flush(); assert.equal(f.creates.length, 1); assert.equal(f.recognizes.length, 2)
  a.cancel(); f.creates[0].logger({ status: 'old', userJobId: f.recognizes[0].id }); f.creates[0].logger({ status: 'current', userJobId: f.recognizes[1].id }); assert.deepEqual(log, ['current']); assert.equal(f.retirements.length, 0)
  f.recognizes[1].pending.resolve('b'); await b.done; f.session.dispose(); await f.session.drain(); assert.equal(f.retirements.length, 1)
})
await check('cancel during create settles UI immediately but holds replacement until real return and termination', async () => {
  const f = portFixture(); f.io.holdCreate = true; f.io.holdTerminate = true
  const a = f.session.run(f.request('a')); await flush(); a.cancel(); assert.deepEqual(await a.done, { status: 'cancelled' }); const b = f.session.run(f.request('b')); await flush(); assert.equal(f.creates.length, 1)
  f.creates[0].gate.resolve(); await flush(); assert.equal(f.recognizes.length, 0); assert.equal(f.creates.length, 1); assert.equal(f.retirements.length, 1)
  f.io.holdCreate = false; f.io.holdTerminate = false; f.retirements[0].resolve(); await flush(); assert.equal(f.creates.length, 2); assert.equal(f.recognizes[0].source, 'b'); f.recognizes[0].pending.resolve('b'); await b.done; f.session.dispose(); await f.session.drain()
})
await check('unresolved recognize/reinitialize cancel cannot block logical completion or bypass termination barrier', async () => {
  const f = portFixture(), a = f.session.run(f.request('a')); await flush(); f.io.holdTerminate = true; a.cancel(); assert.deepEqual(await a.done, { status: 'cancelled' })
  const b = f.session.run(f.request('b')); await flush(); assert.equal(f.creates.length, 1); f.io.holdTerminate = false; f.retirements[0].resolve(); await flush(); assert.equal(f.creates.length, 2)
  f.recognizes[0].pending.reject(Error('late')); f.recognizes[1].pending.resolve('b'); assert.deepEqual(await b.done, { status: 'done', result: 'b' })
  const c = f.session.run(f.request('c', 'eng')); await flush(); assert.equal(f.reinits.length, 1); c.cancel(); assert.deepEqual(await c.done, { status: 'cancelled' }); await f.session.drain(); assert.equal(f.recognizes.length, 2)
  f.reinits[0].pending.resolve(); await flush(); assert.equal(f.recognizes.length, 2); f.session.dispose()
})
await check('idle cancellation terminates its cache and failed termination blocks replacement; dispose is permanent', async () => {
  const f = portFixture(), a = f.session.run(f.request('a')); await flush(); f.recognizes[0].pending.resolve('a'); await a.done; await f.session.drain()
  f.io.rejectTerminate = true; f.session.cancelAll(); const b = f.session.run(f.request('b')); assert.deepEqual(await b.done, { status: 'failed' }); assert.equal(f.creates.length, 1)
  f.session.dispose(); assert.deepEqual(await f.session.run(f.request('after')).done, { status: 'cancelled' })
})
console.log(`OCR queue/session author: ${groups} groups passed`)
