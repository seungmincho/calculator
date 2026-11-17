import assert from 'node:assert/strict'
import { recorderFixture } from './speaking-recorder-harness.mjs'

let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; const f = await recorderFixture(); try { await run(f); groups++; console.log(`PASS ${name}`) } finally { f.close() } }
await check('default zero retains immediate approved recording; duplicate requests and completion are owned', async f => {
  const request = f.state().start(); void f.state().start(); assert.equal(f.permissions.length, 1)
  f.clock.now = 80000; const stream = await f.grant(); await request
  const rec = f.recorders[0], stop = rec.onstop
  assert.deepEqual(rec.starts, [250]); assert.equal(rec.started, 80000); assert.equal(f.state().recording, true)
  await f.finish(rec); stop(); await f.sync()
  assert.equal(f.completed.length, 1); assert.equal(f.completed[0].seconds, 1); assert.equal(await f.completed[0].blob.text(), 'synthetic')
  assert.equal(stream.track.stopped, 1); assert.equal(f.contexts[0].closed, 1)
})
await check('permission delay is excluded and 3/5 preparation produces no recorder, context or Blob', async f => {
  for (const delay of [3, 5]) {
    void f.state().start(delay); f.clock.now += 40000; const approved = f.clock.now; const stream = await f.grant()
    const before = f.recorders.length, completeBefore = f.completed.length
    assert.equal(f.state().preparing, true); assert.equal(f.state().remaining, delay); assert.equal(f.state().seconds, 0)
    await f.tick(approved + 999); assert.equal(f.state().remaining, delay)
    await f.tick(approved + 1000); assert.equal(f.state().remaining, delay - 1)
    await f.tick(approved + delay * 1000 - 1)
    assert.equal(f.recorders.length, before); assert.equal(f.contexts.length, before); assert.equal(f.completed.length, completeBefore)
    await f.tick(approved + delay * 1000); assert.equal(f.recorders.length, before + 1); assert.equal(f.state().seconds, 0)
    await f.finish(); assert.equal(stream.track.stopped, 1); assert.equal(f.completed.at(-1).seconds, 1)
  }
})
await check('cancel pending permission; cancel preparation and retry rejects old timer and old permission failure', async f => {
  const old = f.state().start(5); f.state().cancelRequest(); const oldStream = await f.grant(0); await old
  assert.equal(oldStream.track.stopped, 1); assert.equal(f.recorders.length, 0)
  void f.state().start(3); const preparing = await f.grant(); const timer = f.timerCallbacks.at(-1)
  f.state().cancelRequest(); assert.equal(preparing.track.stopped, 1); assert.equal(f.state().remaining, 0)
  void f.state().start(5); await f.grant(); f.clock.now += 3000; timer(); await f.sync()
  assert.equal(f.state().remaining, 5); assert.equal(f.recorders.length, 0)
  f.state().cancelRequest(); const reject = f.state().start(); f.state().cancelRequest(); void f.state().start(3)
  f.permissions.at(-2).reject(new DOMException('denied', 'NotAllowedError')); await reject; await f.grant()
  assert.equal(f.state().phase, 'preparing'); assert.equal(f.state().error, null)
})
await check('hidden and pagehide cancel requesting/preparing; return never resumes, active recording policy unchanged', async f => {
  for (const phase of ['requesting', 'preparing']) for (const event of ['visibilitychange', 'pagehide']) {
    const request = f.state().start(3); if (phase === 'preparing') await f.grant()
    const oldTimer = f.timerCallbacks.at(-1)
    if (event === 'visibilitychange') { f.h.document.visibilityState = 'hidden'; f.h.document.dispatch(event) } else f.h.window.dispatch(event)
    await f.sync(); assert.equal(f.state().phase, 'idle')
    if (phase === 'requesting') { await f.grant(); await request }
    f.h.document.visibilityState = 'visible'; f.h.document.dispatch('visibilitychange'); f.h.window.dispatch('pageshow')
    f.clock.now += 10000; oldTimer?.(); await f.sync(); assert.equal(f.recorders.length, 0)
  }
  void f.state().start(); await f.grant(); const rec = f.recorders[0]
  f.h.document.visibilityState = 'hidden'; f.h.document.dispatch('visibilitychange'); f.h.window.dispatch('pagehide'); await f.sync()
  assert.equal(f.state().recording, true); assert.equal(rec.stops, 0)
  f.h.document.visibilityState = 'visible'; await f.finish()
})
await check('old stop error data and meter callbacks do not touch the new run or duplicate completion', async f => {
  void f.state().start(); const firstStream = await f.grant(); const first = f.recorders[0]
  const callbacks = [first.onstop, first.onerror, () => first.ondataavailable?.({ data: new Blob(['ignored detached']) })]
  const data = first.ondataavailable, meter = f.timerCallbacks.at(-1)
  await f.finish(first)
  void f.state().start(); const secondStream = await f.grant(); const secondContext = f.contexts[1]
  callbacks.forEach(callback => callback()); data({ data: new Blob(['old bytes']) }); meter(); await f.sync()
  assert.equal(secondStream.track.stopped, 0); assert.equal(secondContext.closed, 0); assert.equal(f.state().recording, true); assert.equal(f.state().error, null)
  await f.finish(f.recorders[1], 1200, 'new bytes')
  assert.equal(f.completed.length, 2); assert.equal(await f.completed[1].blob.text(), 'new bytes'); assert.equal(f.completed[1].seconds, 1.2)
  assert.equal(firstStream.track.stopped, 1)
})
await check('constructor start analyser and stop failures release only owned resources; retry works', async f => {
  for (const stage of ['recorder', 'audio', 'analyser', 'start', 'stop']) {
    f.failures[stage] = true; void f.state().start(); const stream = await f.grant()
    if (stage === 'stop') f.state().stop()
    await f.sync(); assert.equal(f.state().error, 'recordingFailed'); assert.equal(f.state().phase, 'idle'); assert.equal(stream.track.stopped, 1)
    f.failures[stage] = false
  }
  f.failures.close = true; void f.state().start(); await f.grant(); await f.finish()
  assert.equal(f.completed.length, 1); assert.ok(f.contexts.every(context => context.closed === 1))
})
await check('90second timer starts after preparation; stop waits for native completion and minimum duration remains', async f => {
  void f.state().start(5); await f.grant(); await f.tick(5000); const rec = f.recorders[0]
  await f.tick(94999); assert.equal(rec.stops, 0); assert.equal(f.state().seconds, 89)
  await f.tick(95000); assert.equal(rec.stops, 1); assert.equal(f.state().phase, 'stopping'); assert.equal(f.state().isBusy(), true)
  void f.state().start(); assert.equal(f.permissions.length, 1)
  f.clock.now += 9000; rec.ondataavailable({ data: new Blob(['ninety']) }); rec.onstop(); await f.sync()
  assert.equal(f.completed[0].seconds, 90)
  for (const [elapsed, bytes, valid] of [[499, 'tiny', false], [500, 'half', true], [1000, '', false]]) {
    void f.state().start(); await f.grant(); const count = f.completed.length; await f.finish(f.recorders.at(-1), elapsed, bytes)
    assert.equal(f.completed.length, count + Number(valid)); assert.equal(f.state().error, valid ? null : 'audioTooShort')
  }
})
await check('Strict initial replay and unmount reject old lifecycle permission and recorder callbacks', async f => {
  f.h.replayEffects(); const pending = f.state().start(3); f.h.cleanup(); const stream = await f.grant(); await pending
  assert.equal(stream.track.stopped, 1); assert.equal(f.recorders.length, 0)
  f.h.replayEffects(); void f.state().start(); const active = await f.grant(); const rec = f.recorders[0]
  const stop = rec.onstop, error = rec.onerror, data = rec.ondataavailable, timer = f.timerCallbacks.at(-1)
  f.close(); stop(); error(); data({ data: new Blob(['closed']) }); timer(); await Promise.resolve()
  assert.equal(f.completed.length, 0); assert.equal(active.track.stopped, 1); assert.equal(f.contexts[0].closed, 1)
})
console.log(`Speaking actual recorder: ${groups} groups passed`)
