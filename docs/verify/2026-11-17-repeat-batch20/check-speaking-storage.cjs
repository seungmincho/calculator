/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS fixture imports actual TS storage APIs at runtime. */
// Run actual storage API against controlled IDB request/transaction events.
// This fixture serializes overlapping store transactions and models rollback; it is not browser IndexedDB.
const assert = require('node:assert/strict')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

class ControlledIDB {
  constructor(records = [], autoCommit = true) {
    this.data = new Map(records.map(record => [record.id, structuredClone(record)]))
    this.jobs = []; this.transactions = []; this.waiting = []; this.current = null
    this.autoCommit = autoCommit; this.faults = []; this.closes = 0; this.trace = []
  }
  open() {
    const request = {}
    request.result = { close: () => { this.closes++ }, transaction: (_store, mode) => this.transaction(mode) }
    this.jobs.push(() => request.onsuccess?.())
    return request
  }
  transaction(mode) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- Transaction closures share the fixture's mutable database.
    const owner = this, pending = [], fault = this.faults.shift()
    const tx = { mode, error: null, state: 'queued', awaitingCommit: false, staged: null, scheduled: false }
    const finishSlot = () => { owner.current = null; owner.activate() }
    const abort = (error = new DOMException('aborted', 'AbortError'), fireError = false) => {
      if (tx.state === 'done') return
      tx.state = 'done'; tx.awaitingCommit = false; tx.error = error
      owner.jobs.push(() => { if (fireError) tx.onerror?.({ target: tx }); tx.onabort?.(); finishSlot() })
    }
    tx.abort = () => abort()
    tx.commit = () => {
      assert.equal(tx.awaitingCommit, true)
      tx.awaitingCommit = false; tx.state = 'done'
      if (mode === 'readwrite') owner.data = tx.staged
      owner.trace.push('commit'); tx.oncomplete?.(); finishSlot()
    }
    const pump = () => {
      if (tx.state !== 'active' || tx.scheduled) return
      tx.scheduled = true
      owner.jobs.push(() => {
        tx.scheduled = false
        if (tx.state !== 'active') return
        const operation = pending.shift()
        if (!operation) {
          tx.awaitingCommit = true
          if (owner.autoCommit) tx.commit()
          return
        }
        const { kind, request, execute } = operation
        owner.trace.push(kind)
        if (fault?.kind === kind && !fault.afterSuccess) {
          request.error = new DOMException('controlled failure', fault.name)
          request.onerror?.()
          if (fault.bubbleWithNull) {
            // Native request AbortError bubbles before tx.error has been populated.
            tx.error = null; tx.onerror?.({ target: request }); abort(null, false)
          } else abort(request.error, true)
          return
        }
        request.result = structuredClone(execute())
        request.onsuccess?.()
        if (fault?.kind === kind && fault.afterSuccess) { abort(new DOMException('after request success', fault.name), true); return }
        pump()
      })
    }
    const request = (kind, execute) => {
      if (tx.state === 'done') throw new DOMException('inactive', 'TransactionInactiveError')
      const result = {}; pending.push({ kind, request: result, execute }); pump(); return result
    }
    tx.objectStore = () => ({
      get: key => request('get', () => tx.staged.get(key)),
      getAll: () => request('getAll', () => [...tx.staged.values()]),
      count: () => request('count', () => tx.staged.size),
      put: value => { const snapshot = structuredClone(value); return request('put', () => { tx.staged.set(snapshot.id, snapshot); return snapshot.id }) },
      delete: key => request('delete', () => { tx.staged.delete(key); return undefined }),
    })
    tx.start = () => { tx.state = 'active'; tx.staged = structuredClone(owner.data); pump() }
    this.transactions.push(tx); this.waiting.push(tx); this.activate()
    return tx
  }
  activate() {
    if (this.current || !this.waiting.length) return
    this.current = this.waiting.shift()
    this.jobs.push(() => this.current.start())
  }
  async drain() {
    for (let pass = 0; pass < 8; pass++) {
      while (this.jobs.length) this.jobs.shift()()
      await new Promise(setImmediate)
    }
  }
}

const record = (id = 'a', patch = {}) => ({ version: 1, id, mode: 'intro', createdAt: 100, updatedAt: 200,
  takes: [{ id: `${id}-take`, createdAt: 100, seconds: 60, transcript: '원문', audio: new Blob(['audio'], { type: 'audio/webm' }), feedback: { model: 'model', strengthQuote: '원', strength: '장점', improveQuote: '', improve: '개선', rewrite: '수정', next: '다음' } }], ...patch })
const basis = value => value.revision ? { kind: 'revision', revision: value.revision, updatedAt: value.updatedAt } : { kind: 'legacy', updatedAt: value.updatedAt }
const observe = promise => { const state = { status: 'pending', value: null }; promise.then(value => { state.status = 'fulfilled'; state.value = value }, error => { state.status = 'rejected'; state.value = error }); return state }
const checks = [], check = (name, run) => checks.push([name, run])
let api
const install = port => Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: port })

check('save snapshots draft and basis before open and only reports success after transaction complete', async () => {
  const old = record(), port = new ControlledIDB([old], false); install(port)
  const input = record('a', { title: 'captured' }), expected = basis(old)
  const state = observe(api.saveSpeakingSession(input, expected))
  input.title = 'late edit'; input.takes[0].transcript = 'late text'; expected.updatedAt = 999
  await port.drain(); assert.equal(state.status, 'pending'); assert.deepEqual(port.data.get('a'), old)
  assert.deepEqual(port.trace, ['get', 'put'])
  port.current.commit(); await port.drain()
  assert.equal(state.status, 'fulfilled'); assert.equal(state.value.session.title, 'captured')
  assert.equal(state.value.session.takes[0].transcript, '원문')
  assert.equal(await state.value.session.takes[0].audio.text(), 'audio')
  assert.deepEqual(state.value.session.takes[0].feedback, old.takes[0].feedback)
  assert.equal(port.closes, 1)
})
check('put or delete request success followed by transaction abort rolls back and rejects', async () => {
  for (const kind of ['put', 'delete']) {
    const old = record(), port = new ControlledIDB([old]); install(port)
    port.faults.push({ kind, afterSuccess: true, name: 'AbortError' })
    const state = observe(kind === 'put' ? api.saveSpeakingSession({ ...old, title: 'pending' }, basis(old)) : api.deleteSpeakingSession(old.id, basis(old)))
    await port.drain(); assert.equal(state.status, 'rejected'); assert.match(state.value.message, /storageAborted/)
    assert.deepEqual(port.data.get(old.id), old); assert.equal(port.closes, 1)
  }
})
check('two stale legacy writers serialize and exactly one commit succeeds', async () => {
  const old = record(), port = new ControlledIDB([old]); install(port)
  const first = observe(api.saveSpeakingSession({ ...old, title: 'first' }, basis(old)))
  const second = observe(api.saveSpeakingSession({ ...old, title: 'second' }, basis(old)))
  await port.drain(); assert.equal(first.status, 'fulfilled'); assert.equal(second.status, 'rejected')
  assert.equal(second.value.message, 'storageConflict'); assert.equal(port.data.get('a').title, 'first')
  assert.equal(port.trace.filter(kind => kind === 'commit').length, 1); assert.equal(port.closes, 2)
})
check('revision update/delete races reject the operation using the now-stale basis in either order', async () => {
  for (const updateFirst of [true, false]) {
    const old = record('a', { revision: 'r1' }), port = new ControlledIDB([old]); install(port)
    const update = () => observe(api.saveSpeakingSession({ ...old, title: 'updated' }, basis(old)))
    const remove = () => observe(api.deleteSpeakingSession('a', basis(old)))
    const first = updateFirst ? update() : remove(), second = updateFirst ? remove() : update()
    await port.drain(); assert.equal(first.status, 'fulfilled'); assert.equal(second.status, 'rejected')
    assert.equal(second.value.message, 'storageConflict'); assert.equal(port.data.has('a'), updateFirst)
    if (updateFirst) assert.equal(port.data.get('a').title, 'updated')
  }
})
check('parallel absent creation respects physical twenty-record count including unreadable records', async () => {
  const seeds = Array.from({ length: 18 }, (_, i) => record(`seed-${i}`))
  seeds.push({ id: 'future', version: 99, payload: 'preserve' })
  const port = new ControlledIDB(seeds); install(port)
  const first = observe(api.saveSpeakingSession(record('new-a'), { kind: 'absent' }))
  const second = observe(api.saveSpeakingSession(record('new-b'), { kind: 'absent' }))
  await port.drain(); assert.equal(first.status, 'fulfilled'); assert.equal(second.status, 'rejected')
  assert.equal(second.value.message, 'storageFull'); assert.equal(port.data.size, 20)
  const update = observe(api.saveSpeakingSession({ ...seeds[0], title: 'at full capacity' }, basis(seeds[0])))
  await port.drain(); assert.equal(update.status, 'fulfilled'); assert.deepEqual(port.data.get('future'), seeds[18])
})
check('corrupt/future targets and absent collisions reject without replacing existing bytes or media', async () => {
  for (const bad of [{ id: 'bad', version: 2, private: new Blob(['future']) }, { id: 'bad', version: 1, damaged: true }]) {
    const port = new ControlledIDB([bad]); install(port)
    const nonAbsent = observe(api.saveSpeakingSession(record('bad'), { kind: 'legacy', updatedAt: 200 }))
    const absent = observe(api.saveSpeakingSession(record('bad'), { kind: 'absent' }))
    const removal = observe(api.deleteSpeakingSession('bad', { kind: 'legacy', updatedAt: 200 }))
    await port.drain()
    assert.equal(nonAbsent.status, 'rejected'); assert.equal(removal.status, 'rejected')
    assert.equal(nonAbsent.value.message, bad.version === 2 ? 'storageUnsupported' : 'storageCorrupt')
    assert.equal(removal.value.message, nonAbsent.value.message)
    assert.equal(absent.value.message, 'storageConflict'); assert.deepEqual(port.data.get('bad'), bad)
    assert.equal(port.trace.includes('put'), false); assert.equal(port.trace.includes('delete'), false)
  }
})
check('quota and read request failures reject without a phantom commit or open connection', async () => {
  for (const kind of ['get', 'count', 'put']) {
    const port = new ControlledIDB(); install(port); port.faults.push({ kind, name: 'QuotaExceededError' })
    const state = observe(api.saveSpeakingSession(record(), { kind: 'absent' }))
    await port.drain(); assert.equal(state.status, 'rejected'); assert.equal(state.value.message, 'storageQuota')
    assert.equal(port.data.size, 0); assert.equal(port.closes, 1)
  }
})
check('list waits for transaction completion and a post-read abort cannot expose a successful list', async () => {
  const old = record(), future = { id: 'future', version: 5 }, bad = { id: 'bad', broken: true }
  const port = new ControlledIDB([old, future, bad], false); install(port)
  const state = observe(api.listSpeakingSessions()); await port.drain(); assert.equal(state.status, 'pending')
  port.current.commit(); await port.drain()
  assert.equal(state.status, 'fulfilled'); assert.equal(state.value.totalCount, 3)
  assert.equal(state.value.unreadableCount, 1); assert.equal(state.value.unsupportedCount, 1)
  assert.equal(state.value.records[0].session.revision, undefined)
  assert.equal(await state.value.records[0].session.takes[0].audio.text(), 'audio')
  const aborted = new ControlledIDB([old]); install(aborted); aborted.faults.push({ kind: 'getAll', name: 'AbortError', afterSuccess: true })
  const rejected = observe(api.listSpeakingSessions()); await aborted.drain()
  assert.equal(rejected.status, 'rejected'); assert.equal(rejected.value.message, 'storageAborted')
})
check('native request AbortError bubbling while tx.error is null remains storageAborted on abort', async () => {
  for (const operation of ['list', 'save', 'delete']) {
    const old = record(), port = new ControlledIDB([old]); install(port)
    port.faults.push({ kind: operation === 'list' ? 'getAll' : 'get', name: 'AbortError', bubbleWithNull: true })
    const promise = operation === 'list' ? api.listSpeakingSessions() : operation === 'save' ? api.saveSpeakingSession({ ...old, title: 'uncommitted' }, basis(old)) : api.deleteSpeakingSession(old.id, basis(old))
    const state = observe(promise); await port.drain()
    assert.equal(state.status, 'rejected'); assert.equal(state.value.message, 'storageAborted', operation)
    assert.deepEqual(port.data.get(old.id), old); assert.equal(port.trace.includes('commit'), false)
    assert.equal(port.closes, 1)
  }
})

;(async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  api = await import(pathToFileURL(path.resolve('src/lib/speaking/recordStorage.ts')).href)
  let count = 0
  try { for (const [name, run] of checks) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); console.log('PASS', name); count++ } }
  finally { if (original) Object.defineProperty(globalThis, 'indexedDB', original); else Reflect.deleteProperty(globalThis, 'indexedDB') }
  console.log(`${count} independent speaking storage-event checks passed (controlled IDB, not browser)`)
})().catch(error => { console.error(error); process.exitCode = 1 })
