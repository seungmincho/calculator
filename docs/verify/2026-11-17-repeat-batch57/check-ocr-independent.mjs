import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import * as q from '../../../src/utils/ocrQueue.ts'

let passed = 0
const match = process.argv.find(arg => arg.startsWith('--match='))?.slice(8)
const test = async (name, body) => { if (match && !name.includes(match)) return; await body(); passed++; console.log('PASS', name) }
const settings = { langs: 'kor+eng', mode: 'gray' }
const data = raw => ({ raw, words: [{ text: 'word', confidence: 71, x0: 1, y0: 2, x1: 3, y1: 4 }], confidence: 80 })
const fresh = (count = 1) => q.appendOcrItems(q.createOcrQueue(), Array.from({ length: count }, (_, i) => ({ id: i + 1, file: { name: `synthetic${i + 1}` }, url: `blob:synthetic${i + 1}` })))
const run = (state, raw) => { const next = q.beginOcrJob(state, settings); assert.ok(next.job); return q.completeOcrJob(next.state, next.job, raw === null ? null : data(raw)) }
const confirm = (state, action) => { const out = q.applyOcrConfirmation(state, q.prepareOcrConfirmation(state, action)); assert.equal(out.ok, true); return out.state }
const rerun = state => confirm(state, { kind: 'rerun', ids: state.items.map(item => item.id) })
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }

await test('installed Tesseract6 factory: explicit blocks, blank success and terminate leaves recognize pending', async () => {
  const filename = 'node_modules/tesseract.js/src/createWorker.js', require = createRequire(new URL('../../../node_modules/tesseract.js/src/createWorker.js', import.meta.url))
  assert.equal(require('../package.json').version, '6.0.1')
  const requests = [], ports = []; let terminated = 0
  const port = {
    defaultOptions: { logger() {} }, spawnWorker() { const worker = {}; ports.push(worker); return worker },
    terminateWorker(worker) { assert.ok(ports.includes(worker)); terminated++ },
    onMessage(worker, receive) { worker.receive = receive }, loadImage: async image => image,
    send(worker, request) {
      requests.push(request)
      if (request.action !== 'recognize') queueMicrotask(() => worker.receive({ ...request, status: 'resolve', data: {} }))
    },
  }
  const exported = { exports: {} }, realFactory = vm.runInNewContext(`(function(require,module,exports){${fs.readFileSync(filename, 'utf8')}\n})`, { Promise, console })
  realFactory(id => id === './worker/node' ? port : require(id), exported, exported.exports)
  const worker = await exported.exports('kor+eng')
  assert.deepEqual(requests.map(value => value.action), ['load', 'loadLanguage', 'initialize'])
  const blank = worker.recognize(new Uint8Array([1]), {}, { text: true, blocks: true }); await flush()
  const request = requests.at(-1); assert.deepEqual(request.payload.output, { text: true, blocks: true })
  ports[0].receive({ ...request, status: 'resolve', data: { text: '', confidence: 0, blocks: null } })
  const result = await blank; assert.equal(result.data.text, ''); assert.equal(result.data.blocks, null)
  let settled = false
  void worker.recognize(new Uint8Array([2]), {}, { text: true, blocks: true }).then(() => { settled = true }, () => { settled = true })
  await flush(); await worker.terminate(); await flush()
  assert.equal(terminated, 1); assert.equal(settled, false)
  await worker.terminate(); assert.equal(terminated, 1)
})

await test('edit revision matrix preserves new drafts including empty and same-text ABA; untouched approval replaces', () => {
  let cases = 0
  for (const initialRaw of ['', 'first raw']) for (const initialEdit of [null, '', 'my draft']) for (const revision of ['same', 'changed', 'aba']) for (const resultRaw of ['', 'new raw']) {
    let state = run(fresh(), initialRaw)
    if (initialEdit !== null) state = q.editOcrText(state, 1, initialEdit)
    state = rerun(state); const started = q.beginOcrJob(state, settings); state = started.state
    const previous = JSON.stringify(state), payload = data(resultRaw)
    if (revision !== 'same') state = q.editOcrText(state, 1, 'changed')
    if (revision === 'aba') state = q.editOcrText(state, 1, initialEdit ?? initialRaw)
    const expected = revision === 'same' ? resultRaw : revision === 'changed' ? 'changed' : initialEdit ?? initialRaw
    const done = q.completeOcrJob(state, started.job, payload)
    assert.equal(q.ocrItemText(done.items[0], done.clean), expected)
    assert.equal(done.items[0].success.raw, resultRaw); assert.equal(done.items[0].status, 'done')
    assert.equal(done.items[0].keptEdited, revision !== 'same')
    assert.equal(JSON.stringify(started.state), previous)
    payload.words[0].text = 'external mutation'; assert.equal(done.items[0].success.words[0].text, 'word')
    cases++
  }
  assert.equal(cases, 36)
})

await test('pending/error expose the same previous draft and blank success is a real replacement', () => {
  let state = run(fresh(2), 'old raw'); state = run(state, '')
  assert.equal(state.items[1].success.raw, ''); assert.equal(q.ocrAllText(state), 'old raw\n\n')
  state = q.editOcrText(state, 1, 'kept draft'); state = rerun(state)
  assert.equal(q.ocrAllText(state), 'kept draft\n\n')
  const active = q.beginOcrJob(state, settings); state = active.state
  assert.equal(q.ocrItemText(state.items[0], state.clean), 'kept draft')
  state = q.completeOcrJob(state, active.job, null)
  assert.equal(state.items[0].status, 'error'); assert.equal(q.ocrAllText(state), 'kept draft\n\n')
  state = confirm(state, { kind: 'rerun', ids: [1] }); state = run(state, '')
  assert.equal(state.items[0].status, 'done'); assert.equal(state.items[0].edited, null)
  assert.equal(q.ocrAllText(state), '\n\n')
})

await test('pause keeps current completion; failure retry captures only failures and remains paused', () => {
  let state = fresh(4); state = run(state, null); state = run(state, 'two')
  const active = q.beginOcrJob(state, settings); state = q.setOcrPaused(active.state, true)
  state = q.completeOcrJob(state, active.job, data('three'))
  assert.deepEqual(state.items.map(item => item.status), ['error', 'done', 'done', 'pending'])
  assert.equal(q.beginOcrJob(state, settings).job, null)
  state = q.retryOcrFailures(state)
  assert.equal(state.paused, true); assert.deepEqual(state.items.map(item => item.status), ['pending', 'done', 'done', 'pending'])
  assert.equal(q.beginOcrJob(state, settings).job, null)
  state = q.setOcrPaused(state, false); const first = q.beginOcrJob(state, settings)
  assert.equal(first.job.itemId, 1); state = q.completeOcrJob(first.state, first.job, data('one'))
  assert.equal(q.beginOcrJob(state, settings).job.itemId, 4)
})

await test('confirmation cancel is inert and edits/ABA/queue completion invalidate cleanup and reset', () => {
  for (const kind of ['cleanup', 'reset', 'rerun']) {
    let state = q.editOcrText(run(fresh(2), 'a\nb'), 1, 'manual')
    const action = kind === 'cleanup' ? { kind, clean: { fixKoreanSpaces: false, joinLines: true } } : kind === 'reset' ? { kind } : { kind, ids: [1] }
    const before = JSON.stringify(state), pending = q.prepareOcrConfirmation(state, action)
    assert.equal(pending.editedCount, 1); assert.equal(JSON.stringify(state), before)
    state = q.editOcrText(state, 1, 'changed'); state = q.editOcrText(state, 1, 'manual')
    const old = q.applyOcrConfirmation(state, pending); assert.equal(old.ok, false); assert.equal(old.state, state)
    const latest = q.prepareOcrConfirmation(state, action); state = run(state, 'second')
    assert.equal(q.applyOcrConfirmation(state, latest).ok, false)
    state = confirm(state, action)
    if (kind === 'reset') { assert.equal(state.items.length, 0); assert.equal(state.epoch, 1) }
    if (kind === 'cleanup') { assert.equal(state.items[0].edited, null); assert.equal(q.ocrItemText(state.items[0], state.clean), 'a b') }
    if (kind === 'rerun') assert.equal(state.items[0].status, 'pending')
  }
})

await test('deleted/reset jobs cannot attach to new items; settings capture remains immutable through rotation', () => {
  let state = fresh(2), next = q.beginOcrJob(state, settings), job = next.job
  state = q.rotateOcrItem(next.state, 1, 90)
  assert.equal(job.settings.rotation, 0); assert.equal(Object.isFrozen(job.settings), true)
  state = q.completeOcrJob(state, job, data('old orientation'))
  assert.equal(state.items[0].rotation, 90); assert.equal(state.items[0].success.settings.rotation, 0)
  state = rerun(state); next = q.beginOcrJob(state, settings); job = next.job
  state = q.removeOcrItem(next.state, 1); assert.equal(q.isOcrJobCurrent(state, job), false)
  assert.equal(q.completeOcrJob(state, job, data('deleted')), state)
  next = q.beginOcrJob(state, settings); state = confirm(next.state, { kind: 'reset' })
  state = q.appendOcrItems(state, [{ id: 9, file: {}, url: 'blob:new' }]); state = q.beginOcrJob(state, settings).state
  assert.equal(q.completeOcrJob(state, next.job, data('old epoch')), state)
  assert.equal(state.items[0].success, null)
})

console.log(`OCR independent preparation: ${passed} groups`)
