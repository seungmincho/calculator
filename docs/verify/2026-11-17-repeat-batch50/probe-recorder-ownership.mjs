// Controlled callback-order probe of the existing hook, not evidence of a native microphone failure.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const results = []
async function fixture() {
  const permissions = [], recorders = [], streams = [], contexts = [], completed = [], clock = { now: 0 }
  class Recorder {
    static isTypeSupported(type) { return type === 'audio/webm' }
    constructor(media, options) { this.media = media; this.mimeType = options?.mimeType ?? ''; this.state = 'inactive'; recorders.push(this) }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive' }
  }
  class Audio {
    constructor() { this.closed = 0; contexts.push(this) }
    createAnalyser() { return { fftSize: 256, getByteTimeDomainData(data) { data.fill(128) } } }
    createMediaStreamSource() { return { connect() {} } }
    async close() { this.closed++ }
  }
  const host = await componentHarness('src/hooks/useSpeakingRecorder.ts', { exportName: 'useSpeakingRecorder', props: (blob, seconds) => completed.push({ bytes: blob.size, seconds }),
    navigator: { mediaDevices: { getUserMedia() { const pending = deferred(); permissions.push(pending); return pending.promise } } }, globals: { MediaRecorder: Recorder, AudioContext: Audio, performance: { now: () => clock.now }, DOMException },
  }); host.render()
  const media = () => { const track = { stopped: 0, stop() { this.stopped++ } }, stream = { track, getTracks: () => [track] }; streams.push(stream); return stream }
  const start = async () => { const promise = host.render().start(); const stream = media(); permissions.at(-1).resolve(stream); await promise; host.render(); return { recorder: recorders.at(-1), stream } }
  const finish = entry => { clock.now += 1000; entry.recorder.ondataavailable({ data: new Blob(['synthetic']) }); entry.recorder.stop(); entry.recorder.onstop(); host.render() }
  return { host, clock, permissions, recorders, streams, contexts, completed, media, start, finish }
}
{
  const f = await fixture(), first = await f.start(); f.finish(first)
  assert.equal(f.completed.length, 1); assert.equal(f.completed[0].seconds, 1); assert.equal(first.stream.track.stopped, 1); assert.equal(f.host.render().recording, false)
  results.push({ scenario: 'normal one-second synthetic completion', completed: 1, streamStops: 1 }); f.host.cleanup()
}
{
  const f = await fixture(), pending = f.host.render().start(); f.host.render().cancelRequest(); const stream = f.media(); f.permissions[0].resolve(stream); await pending
  assert.equal(stream.track.stopped, 1); assert.equal(f.recorders.length, 0); assert.equal(f.host.render().requesting, false)
  results.push({ scenario: 'permission arrives after explicit cancellation', recorderCount: 0, streamStops: 1 }); f.host.cleanup()
}
{
  const f = await fixture(), first = await f.start(), oldError = first.recorder.onerror; f.finish(first); const second = await f.start()
  oldError(); f.host.render()
  const observation = { scenario: 'invoke captured old error after a new recorder starts', newStreamStops: second.stream.track.stopped, newRecordingFlag: f.host.render().recording, error: f.host.render().error }
  assert.deepEqual(observation, { scenario: observation.scenario, newStreamStops: 1, newRecordingFlag: false, error: 'recordingFailed' }); results.push(observation); f.host.cleanup()
}
{
  const f = await fixture(), first = await f.start(), oldStop = first.recorder.onstop; f.finish(first); const second = await f.start(); f.clock.now += 700
  oldStop(); f.host.render()
  const observation = { scenario: 'invoke captured old stop a second time after a new recorder starts', newStreamStops: second.stream.track.stopped, newRecordingFlag: f.host.render().recording, completed: f.completed.length }
  assert.deepEqual(observation, { scenario: observation.scenario, newStreamStops: 1, newRecordingFlag: false, completed: 2 }); results.push(observation); f.host.cleanup()
}
const report = { kind: 'controlled actual-hook callback order', nativeBrowser: false, realMicrophone: false, limitation: 'Captured callback invocation proves missing ownership checks; it does not establish that browsers dispatch duplicate or stale native events in this order.', results }
if (process.argv.includes('--record')) {
  const path = 'docs/verify/2026-11-17-repeat-batch50/before-ownership.json'
  if (fs.existsSync(path)) throw new Error('Baseline already exists; do not overwrite')
  fs.writeFileSync(path, JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify(report))
