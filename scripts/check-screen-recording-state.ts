import assert from 'node:assert/strict'
import {
  initialScreenRecordingState, reduceScreenRecording, createScreenRecordingClock, pauseScreenRecordingClock,
  resumeScreenRecordingClock, sampleScreenRecordingClock, screenRecordingTime, selectScreenRecordingMime, screenRecordingExtension,
  type ScreenRecordingConfig, type ScreenRecordingResult,
} from '../src/utils/screenRecording.ts'
import { createScreenRecordingOwner } from '../src/lib/screenRecording/ownership.ts'
const config: ScreenRecordingConfig = { quality: 'high', fps: 30, audio: 'both' }
const actual = { system: true, mic: false }
const result = (id: number): ScreenRecordingResult => ({ id, blob: new Blob(['nonempty recording'], { type: 'video/webm' }), url: `blob:result-${id}`, name: `recording-${id}.webm`, mime: 'video/webm', elapsedMs: 1000, createdAt: 1000, config, audio: actual })
function completed() {
  let state = initialScreenRecordingState()
  state = reduceScreenRecording(state, { type: 'prepare', generation: 1, config })
  state = reduceScreenRecording(state, { type: 'started', generation: 1, now: 0, audio: actual, micDenied: true })
  state = reduceScreenRecording(state, { type: 'stop', generation: 1, now: 1000 })
  return reduceScreenRecording(state, { type: 'complete', generation: 1, result: result(1) })
}
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }
await check('preparation, permission cancellation and initialization failure retain last successful result', () => {
  const done = completed(), previous = done.result
  for (const action of [{ type: 'cancel' as const, generation: 2 }, { type: 'fail' as const, generation: 2, error: 'permissionDenied' as const }, { type: 'fail' as const, generation: 2, error: 'initialization' as const }]) {
    const preparing = reduceScreenRecording(done, { type: 'prepare', generation: 2, config })
    assert.equal(preparing.result, previous); assert.equal(preparing.elapsedMs, 0)
    const failed = reduceScreenRecording(preparing, action)
    assert.equal(failed.phase, 'idle'); assert.equal(failed.result, previous)
  }
})
await check('duplicate starts, stale callbacks and configuration mutation cannot replace current attempt', () => {
  const input = { ...config }
  const state = reduceScreenRecording(initialScreenRecordingState(), { type: 'prepare', generation: 1, config: input })
  input.quality = 'low'; assert.equal(state.config?.quality, 'high')
  assert.equal(reduceScreenRecording(state, { type: 'prepare', generation: 2, config }), state)
  assert.equal(reduceScreenRecording(state, { type: 'started', generation: 0, now: 100, audio: actual, micDenied: false }), state)
  assert.equal(reduceScreenRecording(state, { type: 'complete', generation: 0, result: result(0) }), state)
})
await check('microphone denial enters explicit choice and records actual tracks separately from request', () => {
  let state = reduceScreenRecording(completed(), { type: 'prepare', generation: 2, config })
  state = reduceScreenRecording(state, { type: 'audioChoice', generation: 2, audio: actual })
  assert.equal(state.phase, 'audioChoice'); assert.equal(state.micDenied, true); assert.equal(state.config?.audio, 'both'); assert.equal(state.audio.mic, false)
  state = reduceScreenRecording(state, { type: 'started', generation: 2, now: 0, audio: actual, micDenied: true })
  assert.equal(state.phase, 'recording'); assert.equal(state.micDenied, true); assert.deepEqual(state.audio, actual)
})
await check('monotonic elapsed time catches delayed ticks and excludes paused intervals', () => {
  let clock = createScreenRecordingClock(1000)
  assert.equal(sampleScreenRecordingClock(clock, 61_000), 60_000)
  clock = pauseScreenRecordingClock(clock, 61_000)
  assert.equal(sampleScreenRecordingClock(clock, 121_000), 60_000)
  clock = resumeScreenRecordingClock(clock, 121_000)
  assert.equal(sampleScreenRecordingClock(clock, 122_000), 61_000)
  assert.equal(screenRecordingTime(3_661_000), '01:01:01')
})
await check('sample clock never goes backwards and repeated resume/pause cannot double-count', () => {
  let state = reduceScreenRecording(initialScreenRecordingState(), { type: 'prepare', generation: 1, config })
  state = reduceScreenRecording(state, { type: 'started', generation: 1, now: 100, audio: actual, micDenied: false })
  state = reduceScreenRecording(state, { type: 'tick', generation: 1, now: 10_100 })
  state = reduceScreenRecording(state, { type: 'pause', generation: 1, now: 5100 })
  assert.equal(state.elapsedMs, 10_000)
  const paused = state; assert.equal(reduceScreenRecording(state, { type: 'pause', generation: 1, now: 20_000 }), paused)
  state = reduceScreenRecording(state, { type: 'resume', generation: 1, now: 50_000 })
  const resumed = state; assert.equal(reduceScreenRecording(state, { type: 'resume', generation: 1, now: 60_000 }), resumed)
  state = reduceScreenRecording(state, { type: 'stop', generation: 1, now: 51_000 }); assert.equal(state.elapsedMs, 11_000)
})
await check('error then final stop/data cannot promote a failed attempt; empty/format mismatch cannot replace result', () => {
  let state = reduceScreenRecording(completed(), { type: 'prepare', generation: 2, config })
  state = reduceScreenRecording(state, { type: 'started', generation: 2, now: 0, audio: actual, micDenied: false })
  state = reduceScreenRecording(state, { type: 'stop', generation: 2, now: 1000 })
  const prior = state.result
  const empty = { ...result(2), blob: new Blob([], { type: 'video/webm' }) }
  assert.equal(reduceScreenRecording(state, { type: 'complete', generation: 2, result: empty }), state)
  assert.equal(reduceScreenRecording(state, { type: 'complete', generation: 2, result: { ...result(2), mime: 'video/mp4' } }), state)
  state = reduceScreenRecording(state, { type: 'fail', generation: 2, error: 'recording' })
  assert.equal(reduceScreenRecording(state, { type: 'complete', generation: 2, result: result(2) }), state)
  assert.equal(state.result, prior)
})
await check('valid completion atomically replaces result and explicit deletion leaves active attempt intact', () => {
  let state = reduceScreenRecording(completed(), { type: 'prepare', generation: 2, config })
  state = reduceScreenRecording(state, { type: 'started', generation: 2, now: 0, audio: actual, micDenied: false })
  state = reduceScreenRecording(state, { type: 'deleteResult' }); assert.equal(state.result, null); assert.equal(state.phase, 'recording')
  state = reduceScreenRecording(state, { type: 'stop', generation: 2, now: 2000 })
  const payload = result(2); state = reduceScreenRecording(state, { type: 'complete', generation: 2, result: payload })
  assert.equal(state.result?.url, 'blob:result-2'); assert.equal(state.phase, 'idle')
  assert.notEqual(state.result?.config, payload.config); assert.notEqual(state.result?.audio, payload.audio)
})
await check('MIME selection checks support and filename extension follows actual media type', () => {
  assert.equal(selectScreenRecordingMime(type => type === 'video/webm;codecs=vp8'), 'video/webm;codecs=vp8')
  assert.equal(selectScreenRecordingMime(() => false), null)
  assert.equal(selectScreenRecordingMime(() => { throw new Error('unsupported') }), null)
  assert.equal(screenRecordingExtension('video/webm;codecs=vp9,opus'), 'webm')
  assert.equal(screenRecordingExtension('video/mp4'), 'mp4'); assert.equal(screenRecordingExtension('audio/webm'), null)
})
await check('attempt owner deduplicates tracks, detaches callbacks before stop and releases timers/context once', async () => {
  const events: string[] = []
  const video = { stop() { events.push('video') } } as unknown as MediaStreamTrack
  const audio = { stop() { events.push('audio') } } as unknown as MediaStreamTrack
  const owner = createScreenRecordingOwner()
  owner.stream({ getTracks: () => [video, audio] } as unknown as MediaStream)
  owner.stream({ getTracks: () => [video] } as unknown as MediaStream)
  const recorder = { state: 'recording', onstop: () => events.push('bad stop'), onerror: () => {}, ondataavailable: () => {}, stop() { assert.equal(this.onstop, null); assert.equal(this.onerror, null); events.push('recorder') } } as unknown as MediaRecorder
  owner.recorder(recorder)
  const context = { close() { events.push('context'); return Promise.resolve() } }
  owner.context(context); owner.context(context); owner.cleanup(() => events.push('timer'))
  owner.release(); owner.release()
  assert.deepEqual(events, ['timer', 'recorder', 'video', 'audio', 'context'])
})
await check('late display/mic streams, recorder, context and cleanup are closed after ownership was released', async () => {
  const owner = createScreenRecordingOwner(), events: string[] = []; owner.release()
  for (const name of ['late-display', 'late-mic']) assert.equal(owner.stream({ getTracks: () => [{ stop: () => events.push(name) }] } as unknown as MediaStream), false)
  assert.equal(owner.context({ close() { events.push('context'); return Promise.reject(new Error('already closed')) } }), false)
  assert.equal(owner.cleanup(() => { events.push('cleanup') }), false)
  assert.equal(owner.recorder({ state: 'recording', stop() { events.push('recorder') } } as unknown as MediaRecorder), false)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(events, ['late-display', 'late-mic', 'context', 'cleanup', 'recorder'])
})
console.log(`${groups} screen recording preparation state/ownership groups passed; no media capture`)
