import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { recorderFixture, find } from './speaking-recorder-harness.mjs'

// Reuse I/O ports only. Add one deferred decoder port in memory; no author assertions are imported.
const hostUrl = new URL('./speaking-recorder-harness.mjs', import.meta.url)
let host = fs.readFileSync(hostUrl, 'utf8')
const optionsAnchor = "{ parent = false, locale = 'ko', records = [] }"
const decodeAnchor = "decodeSpeakingAudio: async () => { decodes++; throw Error('Unexpected audio decode') }"
assert.ok(host.includes(optionsAnchor) && host.includes(decodeAnchor), 'controlled I/O anchors')
host = host.replace(optionsAnchor, "{ parent = false, locale = 'ko', records = [], decode }")
  .replace(decodeAnchor, 'decodeSpeakingAudio: async file => { decodes++; return decode(file) }')
  .replace("'../2026-11-17-repeat-batch29/team-parent-harness.mjs'", JSON.stringify(new URL('../2026-11-17-repeat-batch29/team-parent-harness.mjs', hostUrl).href))
const { recorderFixture: decoderFixture } = await import('data:text/javascript;base64,' + Buffer.from(host).toString('base64'))
const originalPaths = ['before-ownership.json', 'probe-recorder-ownership.mjs']
const baselineHashes = () => Object.fromEntries(originalPaths.map(path => [path, createHash('sha256').update(fs.readFileSync(new URL(path, import.meta.url))).digest('hex')]))
const before = baselineHashes()
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const turn = () => new Promise(resolve => setImmediate(resolve))
const nodes = (f, key) => f.h.all().filter(node => Object.hasOwn(node.props, key))
const phase = f => find(f.h, 'data-speaking-recorder-phase').props['data-speaking-recorder-phase']
const input = (f, id) => find(f.h, 'id', id)
const take = f => f.h.find(node => typeof node.type === 'function' && node.type.name === 'TakeAudio').props.take
const start = f => find(f.h, 'data-speaking-record', '').props.onClick()
const dispatch = (f, key, value) => find(f.h, key, value).props.onClick()
async function edit(f, id, value) { input(f, id).props.onChange({ target: { value } }); await f.sync() }
const results = []
async function check(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return
  await run(); results.push(name); console.log('PASS ' + name)
}

await check('approval deadline oracle: three delays, fractional observations, rollback and missed callbacks', async () => {
  for (const seconds of [0, 3, 5]) {
    const f = await recorderFixture()
    try {
      f.clock.now = 217.125
      const pending = f.state().start(seconds)
      f.clock.now = 70000.375
      assert.equal(f.recorders.length, 0)
      const approved = f.clock.now
      await f.grant(); await pending
      if (seconds === 0) {
        assert.equal(f.recorders[0].started, approved)
      } else {
        let elapsed = 0
        for (const offset of [0, 100.125, 1000.125, 999, seconds * 1000 - .001, seconds * 1000 - 100, seconds * 1000 + 8234.25]) {
          elapsed = Math.max(elapsed, offset)
          await f.tick(approved + offset)
          const remaining = Math.max(0, Math.ceil(seconds - elapsed / 1000))
          assert.equal(f.state().remaining, remaining)
          if (remaining) {
            assert.equal(f.state().phase, 'preparing')
            assert.equal(f.state().seconds, 0); assert.equal(f.state().level, 0)
            assert.equal(f.recorders.length, 0); assert.equal(f.contexts.length, 0)
          }
        }
        assert.equal(f.recorders[0].started, approved + seconds * 1000 + 8234.25)
        for (const stale of f.timerCallbacks.slice(0, -1)) stale()
        await f.sync()
      }
      assert.equal(f.recorders.length, 1); assert.equal(f.recorders[0].starts.length, 1)
      assert.equal(f.completed.length, 0); assert.equal(f.contexts.length, 1)
    } finally { f.close() }
  }
})

await check('hidden and pagehide cancel only pending preparation; reversed approvals own their streams', async () => {
  for (const route of ['hidden-before-grant', 'hidden-after-grant', 'pagehide-after-grant']) {
    const f = await recorderFixture()
    try {
      void f.state().start(5); await f.sync()
      let oldStream
      if (route !== 'hidden-before-grant') oldStream = await f.grant()
      const oldTimer = f.timerCallbacks.at(-1)
      if (route.startsWith('hidden')) { f.h.document.hidden = true; f.h.document.dispatch('visibilitychange') }
      else f.h.window.dispatch('pagehide')
      await f.sync()
      f.h.document.hidden = false; f.h.document.dispatch('visibilitychange')
      void f.state().start(3); await f.sync()
      const latest = await f.grant(1)
      if (!oldStream) oldStream = await f.grant(0)
      f.clock.now = 9000; oldTimer?.(); await f.sync()
      assert.equal(f.state().phase, 'preparing'); assert.equal(f.recorders.length, 0)
      assert.equal(oldStream.track.stopped, 1); assert.equal(latest.track.stopped, 0)
      await f.tick(9000)
      assert.equal(f.state().phase, 'recording'); assert.equal(f.recorders[0].media, latest)
      f.h.document.hidden = true; f.h.document.dispatch('visibilitychange'); await f.sync()
      assert.equal(f.state().phase, 'recording', 'existing recording background behavior stays unchanged')
    } finally { f.close() }
    assert.ok(f.streams.every(stream => stream.track.stopped === 1))
  }
})

await check('old recorder callbacks have no new-run ownership; stop duration excludes native callback delay', async () => {
  const f = await recorderFixture()
  try {
    void f.state().start(0); await f.grant()
    const first = f.recorders[0]
    const old = { data: first.ondataavailable, stop: first.onstop, error: first.onerror, tick: f.timerCallbacks.at(-1) }
    f.clock.now = first.started + 1250.75
    f.state().stop(); f.state().stop(); void f.state().start(5)
    assert.equal(first.stops, 1); assert.equal(f.permissions.length, 1)
    f.clock.now += 12000
    old.data({ data: new Blob(['FIRST']) }); old.stop(); await f.sync()
    assert.equal(f.completed[0].seconds, 1.25075)
    assert.equal(await f.completed[0].blob.text(), 'FIRST')
    void f.state().start(0); await f.grant()
    const second = f.recorders[1], secondStream = f.streams[1], secondAudio = f.contexts[1]
    for (const callback of [old.error, old.stop, old.tick, () => old.data({ data: new Blob(['OLD']) }), old.stop]) callback()
    await f.sync()
    assert.equal(f.state().phase, 'recording'); assert.equal(f.state().error, null)
    assert.equal(second.stops, 0); assert.equal(secondStream.track.stopped, 0); assert.equal(secondAudio.closed, 0)
    assert.equal(f.completed.length, 1)
    f.clock.now += 720; f.state().stop()
    const finish = second.onstop
    second.ondataavailable({ data: new Blob(['SECOND']) }); finish(); finish(); await f.sync()
    assert.equal(f.completed.length, 2); assert.equal(await f.completed[1].blob.text(), 'SECOND')
    assert.equal(second.stops, 1); assert.equal(secondStream.track.stopped, 1); assert.equal(secondAudio.closed, 1)
  } finally { f.close() }
})

await check('90-second cap begins at actual start and terminal failure releases every acquired owner once', async () => {
  const f = await recorderFixture()
  try {
    void f.state().start(5); f.clock.now = 120000; await f.grant()
    await f.tick(135000)
    const rec = f.recorders[0], finish = rec.onstop
    await f.tick(224999.75)
    assert.equal(rec.stops, 0); assert.equal(f.state().seconds, 89)
    await f.tick(225400)
    assert.equal(rec.stops, 1); assert.equal(f.state().phase, 'stopping')
    await f.tick(300000); assert.equal(rec.stops, 1)
    rec.ondataavailable({ data: new Blob(['MAX']) }); finish(); finish(); await f.sync()
    assert.equal(f.completed.length, 1); assert.equal(f.completed[0].seconds, 90)
    f.failures.close = true
    void f.state().start(0); await f.grant()
    const bad = f.recorders[1], fail = bad.onerror, late = bad.onstop
    fail(); late(); fail(); await f.sync()
    assert.equal(f.completed.length, 1); assert.equal(f.state().error, 'recordingFailed')
    assert.equal(f.contexts[1].closed, 1); assert.equal(f.streams[1].track.stopped, 1); assert.equal(bad.stops, 1)
  } finally { f.close() }
})

await check('parent latest-phase guards survive KO/EN handler changes throughout requesting/preparing/stopping', async () => {
  const f = await recorderFixture({ parent: true })
  try {
    await f.click('data-speaking-text-take')
    await edit(f, 'speaking-transcript', '원본 甲'); await edit(f, 'speaking-session-title', '원래 연습')
    const originalId = take(f).id
    const old = {
      mode: find(f.h, 'data-speaking-mode', 'report').props.onClick,
      fresh: find(f.h, 'data-speaking-new').props.onClick,
      file: find(f.h, 'data-speaking-file').props.onChange,
      text: find(f.h, 'data-speaking-text-take').props.onClick,
      save: find(f.h, 'data-speaking-save').props.onClick,
      title: input(f, 'speaking-session-title').props.onChange,
      body: input(f, 'speaking-transcript').props.onChange,
      start: find(f.h, 'data-speaking-rerecord').props.onClick,
    }
    await f.click('data-speaking-preparation', 3)
    start(f)
    const attemptOld = async () => {
      for (const key of ['mode', 'fresh', 'text', 'save', 'start']) old[key]()
      old.title({ target: { value: 'wrong' } }); old.body({ target: { value: 'wrong' } })
      old.file({ target: { files: [new Blob(['file'])], value: 'file' } })
      await f.sync()
      assert.equal(take(f).id, originalId); assert.equal(input(f, 'speaking-transcript').props.value, '원본 甲')
      assert.equal(input(f, 'speaking-session-title').props.value, '원래 연습')
      assert.equal(find(f.h, 'data-speaking-mode', 'intro').props['aria-pressed'], true)
      assert.equal(f.permissions.length, 1); assert.equal(f.saves.length, 0); assert.equal(f.decodes, 0)
    }
    await attemptOld(); assert.equal(phase(f), 'requesting')
    await f.grant(); await f.locale('en'); await attemptOld(); assert.equal(phase(f), 'preparing')
    await f.tick(3000); await f.locale('ko'); f.clock.now = 4000; start(f); await f.sync()
    await attemptOld(); assert.equal(phase(f), 'stopping')
    const rec = f.recorders[0]; rec.ondataavailable({ data: new Blob(['ONE']) }); rec.onstop(); await f.sync()
    assert.equal(nodes(f, 'data-speaking-take').length, 2)
    assert.equal(f.models, 0); assert.equal(f.decodes, 0)
  } finally { f.close() }
})

await check('file decode awaits, cancel then new recorder, reverse file completions and unmount stay isolated', async () => {
  const jobs = []
  const f = await decoderFixture({ parent: true, decode(file) { const pending = defer(); jobs.push({ ...pending, file }); return pending.promise } })
  const upload = file => find(f.h, 'data-speaking-file').props.onChange({ target: { files: [file], value: 'chosen' } })
  const cancelDecode = () => f.h.find(node => node.type === 'button' && node.props.children === '취소').props.onClick()
  try {
    upload(new Blob(['FIRST'])); await f.sync()
    start(f); dispatch(f, 'data-speaking-text-take'); await f.sync()
    assert.equal(f.permissions.length, 0); assert.equal(nodes(f, 'data-speaking-take').length, 0)
    cancelDecode(); await f.sync(); await f.click('data-speaking-preparation', 5); start(f); await f.sync(); await f.grant()
    jobs[0].resolve({ audio: new Float32Array([1]), seconds: 12 }); await f.sync()
    assert.equal(nodes(f, 'data-speaking-take').length, 0); assert.equal(phase(f), 'preparing')
    await f.click('data-speaking-record-cancel')
    upload(new Blob(['SECOND'])); await f.sync(); cancelDecode(); await f.sync()
    upload(new Blob(['THIRD'])); await f.sync()
    jobs[2].resolve({ audio: new Float32Array([1]), seconds: 7.5 }); await f.sync()
    const id = take(f).id
    jobs[1].reject(Error('late decode failed')); await f.sync()
    assert.equal(take(f).id, id); assert.equal(take(f).seconds, 7.5); assert.equal(await take(f).audio.text(), 'THIRD')
    assert.equal(nodes(f, 'role').filter(node => node.props.role === 'alert').length, 0)
    upload(new Blob(['UNMOUNT'])); await f.sync(); f.close()
    jobs[3].resolve({ audio: new Float32Array([1]), seconds: 9 }); await turn()
    assert.equal(f.models, 0); assert.equal(f.saves.length, 0)
  } finally { f.close() }
})

await check('save snapshot keeps current edits and delays new-session/record operations until commit completes', async () => {
  const f = await recorderFixture({ parent: true })
  try {
    await f.click('data-speaking-text-take'); await edit(f, 'speaking-transcript', 'commit snapshot')
    await edit(f, 'speaking-session-title', 'before')
    const originalId = take(f).id, newSession = find(f.h, 'data-speaking-new').props.onClick
    await f.click('data-speaking-preparation', 5); await f.click('data-speaking-save')
    newSession(); start(f); await f.sync()
    assert.equal(take(f).id, originalId); assert.equal(f.permissions.length, 0)
    await f.locale('en'); await edit(f, 'speaking-transcript', 'latest while saving'); await edit(f, 'speaking-session-title', 'after')
    assert.equal(f.saves[0].session.title, 'before'); assert.equal(f.saves[0].session.takes[0].transcript, 'commit snapshot')
    assert.equal(JSON.stringify(f.saves[0].session).includes('preparation'), false)
    const committed = { session: { ...f.saves[0].session, revision: 'independent-r1', updatedAt: 77 }, basis: { kind: 'revision', revision: 'independent-r1', updatedAt: 77 } }
    f.saves[0].resolve(committed); await f.sync()
    assert.equal(input(f, 'speaking-session-title').props.value, 'after'); assert.equal(input(f, 'speaking-transcript').props.value, 'latest while saving')
    await f.click('data-speaking-save')
    assert.equal(f.saves[1].basis.revision, 'independent-r1'); assert.equal(f.saves[1].session.title, 'after')
    f.saves[1].resolve({ session: f.saves[1].session, basis: committed.basis }); await f.sync()
    await f.click('data-speaking-new'); assert.equal(nodes(f, 'data-speaking-take').length, 0)
    assert.equal(find(f.h, 'data-speaking-preparation', 5).props['aria-pressed'], true)
    assert.equal(f.h.stored.size, 0)
  } finally { f.close() }
})

await check('initial effect replay, unmount and late failures never create takes or touch the successor resource', async () => {
  const f = await recorderFixture()
  try {
    f.h.replayEffects(); await f.sync()
    void f.state().start(5); await f.sync(); f.state().cancelRequest()
    void f.state().start(0); await f.grant(1)
    const stream = f.streams[0], rec = f.recorders[0], callbacks = [rec.onstop, rec.onerror, f.timerCallbacks.at(-1)]
    f.permissions[0].reject(new DOMException('denied old', 'NotAllowedError')); await f.sync()
    assert.equal(f.state().phase, 'recording'); assert.equal(stream.track.stopped, 0)
    const data = rec.ondataavailable
    f.close()
    for (const fn of callbacks) fn()
    data({ data: new Blob(['post-unmount']) }); await turn()
    assert.equal(f.completed.length, 0); assert.equal(stream.track.stopped, 1); assert.equal(f.contexts[0].closed, 1)
  } finally { f.close() }
})

assert.deepEqual(baselineHashes(), before)
console.log(`Independent speaking hook/parent: ${results.length} groups PASS; baseline evidence unchanged; real microphone/model/network/Chrome calls 0`)
