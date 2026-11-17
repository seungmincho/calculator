/* eslint-disable @typescript-eslint/no-require-imports -- Node port-based regression runner, no real media capture. */
const assert = require('node:assert/strict')
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let index = 0; index < 15; index++) await Promise.resolve() }
class Track extends EventTarget {
  readyState = 'live'; stops = 0
  constructor(kind) { super(); this.kind = kind }
  stop() { this.stops++; this.readyState = 'ended' }
  end() { this.readyState = 'ended'; this.dispatchEvent(new Event('ended')) }
}
class Stream {
  constructor(tracks) { this.tracks = tracks }
  getTracks() { return this.tracks }
  getVideoTracks() { return this.tracks.filter(track => track.kind === 'video') }
  getAudioTracks() { return this.tracks.filter(track => track.kind === 'audio') }
}
class Recorder {
  state = 'inactive'; starts = 0; stops = 0
  constructor(mime, fault = '') { this.mimeType = mime; this.fault = fault }
  start() { if (this.fault === 'start') throw new Error('start'); this.starts++; this.state = 'recording' }
  pause() { this.state = 'paused' }
  resume() { this.state = 'recording' }
  stop() { this.stops++; this.state = 'inactive' }
  data(text = 'video bytes', type = this.mimeType) { this.ondataavailable?.({ data: new Blob([text], { type }) }) }
  finish() { this.state = 'inactive'; this.onstop?.() }
  error() { this.onerror?.(new Event('error')) }
}
const config = { quality: 'high', fps: 30, audio: 'none' }
async function fixture() {
  const { createScreenRecordingSession } = await import('../src/lib/screenRecording/session.ts')
  const display = [], microphones = [], recorders = [], revoked = [], updates = [], urls = new Map(), timers = new Map()
  let now = 0, serial = 0, fault = '', composePort = null
  const ports = {
    supported: () => fault !== 'unsupported', supportsMime: () => true,
    getDisplay() { const task = deferred(); display.push(task); return task.promise },
    getMicrophone() { const task = deferred(); microphones.push(task); return task.promise },
    async compose(source, mic, requested, owner) {
      if (fault === 'compose') throw new Error('compose')
      if (composePort) return composePort(source, mic, requested, owner)
      const system = ['system', 'both'].includes(requested.audio) ? source.getAudioTracks() : []
      const audio = mic?.getAudioTracks() ?? []
      return { stream: new Stream([...source.getVideoTracks(), ...system, ...audio]), audio: { system: system.length > 0, mic: audio.length > 0 } }
    },
    createRecorder(_stream, mime) { if (fault === 'constructor') throw new Error('constructor'); const recorder = new Recorder(fault === 'mp4' ? 'video/mp4' : mime, fault); recorders.push(recorder); return recorder },
    now: () => now, wallNow: () => 1_800_000_000_000,
    every(callback, ms) { const id = ++serial; timers.set(id, { callback, ms }); return () => timers.delete(id) },
    after(callback, ms) { const id = ++serial; timers.set(id, { callback, ms }); return () => timers.delete(id) },
    createUrl(blob) { if (fault === 'url') throw new Error('url'); const url = `blob:session-${++serial}`; urls.set(url, blob); return url },
    revokeUrl(url) { revoked.push(url) },
  }
  const session = createScreenRecordingSession(ports, value => updates.push(value))
  return { ports, session, display, microphones, recorders, revoked, updates, urls, timers,
    fault(value) { fault = value }, compose(value) { composePort = value }, time(value) { now = value },
    tick(ms) { [...timers.values()].filter(timer => timer.ms === ms).forEach(timer => timer.callback()) },
    async start(requested = config, audio = false) { session.start(requested); const video = new Track('video'), sound = audio ? new Track('audio') : null; const stream = new Stream([video, ...(sound ? [sound] : [])]); display.at(-1).resolve(stream); await flush(); return { video, sound, stream } },
    async successful() { const resource = await this.start(); this.time(1500); session.stop(); recorders.at(-1).data(); recorders.at(-1).finish(); await flush(); return { ...resource, result: session.getSnapshot().result } },
  }
}
async function main() {
  let groups = 0
  const check = async (name, callback) => { await callback(); groups++; console.log('PASS', name) }
  await check('duplicate start and late display after cancel/new attempt/unmount cannot acquire a recorder', async () => {
    const h = await fixture(); h.session.start(config); h.session.start(config); assert.equal(h.display.length, 1)
    h.session.cancelPreparation(); h.session.start(config)
    const old = new Track('video'); h.display[0].resolve(new Stream([old])); await flush(); assert.equal(old.stops, 1); assert.equal(h.recorders.length, 0)
    h.session.dispose(); const late = new Track('video'); h.display[1].resolve(new Stream([late])); await flush(); assert.equal(late.stops, 1); assert.equal(h.recorders.length, 0)
  })
  await check('display ended is observed while microphone permission is pending; late microphone is stopped', async () => {
    const h = await fixture(); const resource = await h.start({ ...config, audio: 'both' }, true)
    assert.equal(h.microphones.length, 1); resource.video.end()
    assert.equal(h.session.getSnapshot().error, 'displayEnded'); assert.equal(resource.sound.stops, 1)
    const mic = new Track('audio'); h.microphones[0].resolve(new Stream([mic])); await flush()
    assert.equal(mic.stops, 1); assert.equal(h.recorders.length, 0); assert.equal(resource.video.stops, 1)
    h.session.dispose()
  })
  await check('microphone rejection requires explicit choice; duplicate continue makes one recorder and actual audio flags', async () => {
    const h = await fixture(); const resource = await h.start({ ...config, audio: 'both' }, true)
    h.microphones[0].reject(new DOMException('denied', 'NotAllowedError')); await flush()
    assert.equal(h.session.getSnapshot().phase, 'audioChoice'); assert.equal(h.recorders.length, 0)
    h.session.continueWithoutMic(); h.session.continueWithoutMic(); await flush()
    assert.equal(h.recorders.length, 1); assert.deepEqual(h.session.getSnapshot().audio, { system: true, mic: false }); assert.equal(h.session.getSnapshot().micDenied, true)
    h.session.stop(); h.recorders[0].data(); h.recorders[0].finish(); assert.equal(resource.video.stops, 1); assert.equal(resource.sound.stops, 1); h.session.dispose()
  })
  await check('display ends during microphone choice or audio composition: no late recorder and all owned resources close', async () => {
    for (const phase of ['audioChoice', 'composition']) {
      const h = await fixture(); const pending = deferred(); let closed = 0
      if (phase === 'composition') h.compose((display, _mic, _config, owner) => { owner.context({ close() { closed++; return Promise.resolve() } }); return pending.promise })
      const resource = await h.start({ ...config, audio: phase === 'audioChoice' ? 'mic' : 'none' })
      if (phase === 'audioChoice') { h.microphones[0].reject(new Error('mic')); await flush() }
      resource.video.end(); h.session.continueWithoutMic()
      if (phase === 'composition') { const late = new Track('audio'); pending.resolve({ stream: new Stream([resource.video, late]), audio: { system: false, mic: false } }); await flush(); assert.equal(late.stops, 1); assert.equal(closed, 1) }
      assert.equal(resource.video.stops, 1); assert.equal(h.recorders.length, 0); h.session.dispose()
    }
  })
  await check('active clock catches delayed ticks and excludes pauses; completed time stays separate from next attempt', async () => {
    const h = await fixture(); await h.start(); h.time(61_000); h.tick(250); assert.equal(h.session.getSnapshot().elapsedMs, 61_000)
    h.session.pause(); h.time(121_000); h.tick(250); assert.equal(h.session.getSnapshot().elapsedMs, 61_000)
    h.session.resume(); h.time(123_000); h.session.stop(); h.recorders[0].data(); h.recorders[0].finish()
    const prior = h.session.getSnapshot().result; assert.equal(prior.elapsedMs, 63_000); assert.equal(h.timers.size, 0)
    h.session.start(config); assert.equal(h.session.getSnapshot().elapsedMs, 0); assert.equal(h.session.getSnapshot().result, prior); h.session.dispose()
  })
  await check('permission/compose/constructor/start failures retain the prior Blob and URL', async () => {
    for (const fault of ['permission', 'compose', 'constructor', 'start', 'unsupported']) {
      const h = await fixture(); const { result } = await h.successful(); h.fault(fault)
      if (fault === 'permission') { h.session.start(config); h.display.at(-1).reject(new DOMException('denied', 'NotAllowedError')); await flush() }
      else if (fault === 'unsupported') h.session.start(config)
      else await h.start()
      assert.equal(h.session.getSnapshot().phase, 'idle', fault); assert.equal(h.session.getSnapshot().result, result, fault); assert.deepEqual(h.revoked, [], fault); h.session.dispose()
    }
  })
  await check('recording error, empty output, mismatched MIME, URL failure and stop timeout do not replace last success', async () => {
    for (const fault of ['error', 'empty', 'mismatch', 'url', 'timeout']) {
      const h = await fixture(); const { result } = await h.successful(); await h.start(); const record = h.recorders.at(-1), lateStop = record.onstop, lateData = record.ondataavailable
      h.session.stop()
      if (fault === 'error') { record.error(); lateData({ data: new Blob(['failed bytes'], { type: 'video/webm' }) }); lateStop() }
      else if (fault === 'timeout') { h.tick(10_000); lateData({ data: new Blob(['late bytes'], { type: 'video/webm' }) }); lateStop() }
      else { if (fault !== 'empty') record.data('bytes', fault === 'mismatch' ? 'video/mp4' : record.mimeType); if (fault === 'url') h.fault('url'); record.finish() }
      assert.equal(h.session.getSnapshot().result, result, fault); assert.equal(h.session.getSnapshot().phase, 'idle', fault); assert.ok(h.session.getSnapshot().error, fault); assert.deepEqual(h.revoked, [], fault); assert.equal(h.timers.size, 0)
      h.session.dispose()
    }
  })
  await check('normal browser share ending finalizes once; captured old callbacks cannot alter a newer attempt', async () => {
    const h = await fixture(); const first = await h.start(); const record = h.recorders[0], old = { stop: record.onstop, error: record.onerror, data: record.ondataavailable }
    first.video.end(); assert.equal(record.stops, 1); record.data(); record.finish(); const previous = h.session.getSnapshot().result
    await h.start(); old.error(); old.data({ data: new Blob(['old']) }); old.stop()
    assert.equal(h.session.getSnapshot().phase, 'recording'); assert.equal(h.session.getSnapshot().result, previous)
    h.session.dispose(); assert.equal(first.video.stops, 1); assert.equal(h.timers.size, 0)
  })
  await check('actual MIME controls filename; replacement/delete/unmount revoke each owned result once', async () => {
    const h = await fixture(); const { result: first } = await h.successful(); h.fault('mp4'); await h.start(); h.session.stop(); h.recorders.at(-1).data(); h.recorders.at(-1).finish()
    const second = h.session.getSnapshot().result; assert.equal(second.mime, 'video/mp4'); assert.ok(second.name.endsWith('.mp4')); assert.deepEqual(h.revoked, [first.url])
    h.session.deleteResult(first.id); assert.equal(h.session.getSnapshot().result, second)
    h.session.deleteResult(second.id); h.session.deleteResult(second.id); assert.deepEqual(h.revoked, [first.url, second.url]); h.session.dispose(); assert.equal(h.revoked.length, 2)
  })
  await check('requested system audio without a provided track is not reported connected', async () => {
    const h = await fixture(); await h.start({ ...config, audio: 'system' }); assert.deepEqual(h.session.getSnapshot().audio, { system: false, mic: false }); h.session.dispose()
  })
  console.log(`Screen recording session: ${groups} groups passed`)
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
module.exports = { fixture, Track, Stream, Recorder, flush, config, deferred }
