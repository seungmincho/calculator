import assert from 'node:assert/strict'
import { createWhiteNoiseSession, type WhiteNoisePorts, type WhiteNoiseState } from '../src/lib/whiteNoise/session.ts'
import { createWhiteNoiseAudio, type WhiteNoiseAudio } from '../src/lib/whiteNoise/audio.ts'
import { whiteNoiseBrowserPorts } from '../src/lib/whiteNoise/browser.ts'
import { DEFAULT_WHITE_NOISE, whiteNoiseAudioPlan, type WhiteNoiseSettings, type WhiteNoiseAudioPlan } from '../src/utils/whiteNoise.ts'

const settings = (changes: Partial<WhiteNoiseSettings> = {}): WhiteNoiseSettings => ({ ...DEFAULT_WHITE_NOISE, timerMinutes: 5, ...changes })
const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve() }
class AudioPort implements WhiteNoiseAudio {
  nativeState = 'suspended'; audioTime = 0; resumeCount = 0; releaseCount = 0; plans: WhiteNoiseAudioPlan[] = []; starts = 0
  pending = deferred(); states = new Set<() => void>(); ends = new Set<() => void>()
  order: string[] = []
  state = () => this.nativeState
  time = () => this.audioTime
  resume = () => { this.order.push('resume'); this.resumeCount++; return this.pending.promise }
  mute = () => { this.order.push('mute') }
  start = (plan: WhiteNoiseAudioPlan) => { this.starts++; this.plans.push(plan) }
  schedule = (plan: WhiteNoiseAudioPlan) => { this.order.push('schedule'); this.plans.push(plan) }
  onState = (listener: () => void) => { this.states.add(listener); return () => { this.states.delete(listener) } }
  onEnded = (listener: () => void) => { this.ends.add(listener); return () => { this.ends.delete(listener) } }
  release = () => { this.releaseCount++ }
  allow = async () => { this.nativeState = 'running'; this.pending.resolve(); await flush() }
  setState(value: string) { this.nativeState = value; for (const callback of this.states) callback() }
}
function fixture(onChange?: (state: WhiteNoiseState) => void) {
  const audios: AudioPort[] = [], ticks = new Set<() => void>(), timeouts = new Set<() => void>(), returns = new Set<() => void>(), changes: WhiteNoiseState[] = []
  let wallMs = 1_000_000, monotonicMs = 1_000
  const ports: WhiteNoisePorts = {
    clock: () => ({ wallMs, monotonicMs }), createAudio: () => { const audio = new AudioPort(); audios.push(audio); return audio },
    every(callback) { ticks.add(callback); return () => { ticks.delete(callback) } }, after(callback) { timeouts.add(callback); return () => { timeouts.delete(callback) } },
    onReturn(callback) { returns.add(callback); return () => { returns.delete(callback) } },
  }
  const session = createWhiteNoiseSession(ports, state => { changes.push(state); onChange?.(state) })
  return { ports, session, audios, ticks, timeouts, returns, changes, last: () => audios.at(-1)!, state: () => session.getSnapshot(),
    advance(ms: number, wall = true, mono = true) { if (wall) wallMs += ms; if (mono) monotonicMs += ms; for (const audio of audios) if (audio.nativeState === 'running') audio.audioTime += ms / 1000 },
    tick() { for (const callback of [...ticks]) callback() }, back() { for (const callback of [...returns]) callback() } }
}
let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log('PASS', name) }

await check('ports/session/idle setting changes stay silent; exposed snapshots cannot mutate internal settings', () => {
  const f = fixture(); f.session.change(settings({ volume: 0 })); assert.equal(f.audios.length, 0); assert.equal(f.state().phase, 'idle')
  const view = f.state(); view.settings.type = 'wave'; assert.equal(f.state().settings.type, 'white')
  assert.equal(typeof whiteNoiseBrowserPorts(() => { throw new Error('must not run') }).createAudio, 'function'); f.session.dispose()
})
await check('prepare is not success, delayed ticks use deadline, muted volume retains playing and timed stop', async () => {
  const f = fixture(); f.session.start(settings()); assert.equal(f.state().phase, 'preparing'); assert.equal(f.last().starts, 0)
  await f.last().allow(); assert.equal(f.state().phase, 'playing'); assert.equal(f.last().starts, 1); assert.equal(f.last().plans[0].stopAt, 300)
  f.advance(97_000); f.tick(); assert.equal(f.state().remainingMs, 203_000)
  const deadline = f.state().deadline; f.session.change(settings({ volume: 0 })); assert.equal(f.state().phase, 'playing'); assert.equal(f.last().plans.at(-1)!.gain, 0); assert.deepEqual(f.state().deadline, deadline)
  f.advance(204_000); f.tick(); assert.equal(f.state().phase, 'idle'); assert.equal(f.last().releaseCount, 1); assert.equal(f.ticks.size + f.returns.size + f.timeouts.size, 0)
})
await check('type keeps deadline, same timer is no-op for owner, other timer resets now and off removes old scheduled stop', async () => {
  const f = fixture(); f.session.start(settings()); await f.last().allow(); f.advance(90_000); const original = f.state().deadline
  f.session.change(settings({ type: 'pink' })); assert.deepEqual(f.state().deadline, original); assert.equal(f.audios[0].releaseCount, 1)
  f.advance(10_000); await f.last().allow(); assert.equal(f.state().remainingMs, 200_000)
  f.session.change(settings({ type: 'pink' })); assert.equal(f.audios.length, 2); assert.deepEqual(f.state().deadline, original)
  f.session.change(settings({ type: 'pink', timerMinutes: 10 })); await f.last().allow(); assert.equal(f.state().remainingMs, 600_000); assert.notDeepEqual(f.state().deadline, original)
  f.session.change(settings({ timerMinutes: 0, type: 'pink' })); await f.last().allow(); assert.equal(f.state().remainingMs, null); assert.equal(f.last().plans[0].stopAt, null); assert.equal(f.audios[2].releaseCount, 1); f.session.dispose()
})
await check('last30s gain changes and fade toggle preserve stop/deadline', async () => {
  const f = fixture(); f.session.start(settings({ fade: true })); await f.last().allow(); f.advance(285_000); f.tick()
  const deadline = f.state().deadline; f.session.change(settings({ fade: true, volume: 80 })); assert.equal(f.last().plans.at(-1)!.gain, 0.4); assert.equal(f.last().plans.at(-1)!.stopAt, 300)
  f.session.change(settings({ fade: false, volume: 80 })); assert.equal(f.last().plans.at(-1)!.gain, 0.8); assert.equal(f.last().plans.at(-1)!.fade, false); assert.deepEqual(f.state().deadline, deadline); assert.equal(f.audios.length, 1); f.session.dispose()
})
await check('late resume/ended after replacement or stop cannot start or change the new attempt', async () => {
  const f = fixture(); f.session.start(settings()); const old = f.last(), ended = [...old.ends][0]
  f.session.start(settings({ type: 'wave' })); await f.last().allow(); const generation = f.state().generation
  await old.allow(); ended(); assert.equal(old.starts, 0); assert.equal(old.releaseCount, 1); assert.equal(f.state().phase, 'playing'); assert.equal(f.state().generation, generation)
  f.session.start(settings()); const pending = f.last(); f.session.stop(); await pending.allow(); assert.equal(pending.starts, 0); assert.equal(pending.releaseCount, 1); assert.equal(f.state().phase, 'idle'); assert.equal(f.ticks.size + f.timeouts.size + f.returns.size, 0)
})
await check('resume rejection, nonrunning resolution, hung timeout and unavailable factory fail without success', async () => {
  for (const mode of ['reject', 'nonrunning', 'timeout', 'factory', 'watchdog'] as const) {
    const f = fixture()
    if (mode === 'factory') f.ports.createAudio = () => { throw new Error() }
    if (mode === 'watchdog') f.ports.after = () => { throw new Error() }
    f.session.start(settings())
    if (mode === 'reject') f.last().pending.reject(new Error())
    if (mode === 'nonrunning') f.last().pending.resolve()
    if (mode === 'timeout') { for (const callback of [...f.timeouts]) callback(); await f.last().allow() }
    await flush(); assert.equal(f.state().phase, 'error', mode); assert.ok(!f.changes.some(value => value.phase === 'playing'), mode)
    if (mode !== 'factory') { assert.equal(f.last().starts, 0); assert.equal(f.last().releaseCount, 1) }
    assert.equal(f.ticks.size + f.returns.size + f.timeouts.size, 0); f.session.dispose()
  }
})
await check('suspension requires explicit resume; wall deadline after sleep closes without resuming', async () => {
  const f = fixture(); f.session.start(settings()); await f.last().allow(); const audio = f.last()
  audio.setState('suspended'); assert.equal(f.state().phase, 'suspended'); f.back(); assert.equal(audio.resumeCount, 1)
  audio.pending = deferred(); f.session.resume(); assert.equal(f.state().phase, 'preparing'); assert.equal(audio.resumeCount, 2); await audio.allow(); assert.equal(audio.starts, 1); assert.equal(f.state().phase, 'playing')
  audio.setState('suspended'); f.advance(301_000, true, false); f.back(); assert.equal(f.state().phase, 'idle'); assert.equal(audio.resumeCount, 2); assert.equal(audio.releaseCount, 1); f.session.resume(); assert.equal(audio.resumeCount, 2)
})
await check('started resume mutes first and pending statechange/volume/fade cannot unmute before confirmation', async () => {
  const f = fixture(); f.session.start(settings()); await f.last().allow(); const audio = f.last()
  audio.setState('suspended'); audio.pending = deferred(); audio.order.length = 0
  f.session.resume(); assert.deepEqual(audio.order, ['mute', 'resume'])
  const before = audio.plans.length; audio.setState('running'); f.session.change(settings({ volume: 80, fade: true })); f.back()
  assert.equal(audio.plans.length, before); assert.equal(f.state().phase, 'preparing')
  await audio.allow(); assert.deepEqual(audio.order, ['mute', 'resume', 'schedule']); assert.equal(audio.plans.at(-1)!.gain, 0.8); f.session.dispose()
})
await check('deadline passing during a muted delayed resume never restores gain or starts another source', async () => {
  const f = fixture(); f.session.start(settings()); await f.last().allow(); f.advance(299_000); f.tick(); const audio = f.last()
  audio.setState('suspended'); audio.pending = deferred(); audio.order.length = 0; f.session.resume()
  f.advance(1500, true, false); const before = audio.plans.length
  audio.setState('running'); await audio.allow()
  assert.equal(f.state().phase, 'idle'); assert.equal(audio.plans.length, before); assert.deepEqual(audio.order, ['mute', 'resume']); assert.equal(audio.starts, 1); assert.equal(audio.releaseCount, 1)
})
await check('unmount and reentrant stop release ownership before late async callbacks; early ended is a failure', async () => {
  const f = fixture(); f.session.start(settings()); const pending = f.last(); f.session.dispose(); await pending.allow(); assert.equal(pending.starts, 0); assert.equal(pending.releaseCount, 1); assert.equal(f.ticks.size + f.returns.size + f.timeouts.size, 0)
  const g = fixture(); g.session.start(settings()); await g.last().allow(); [...g.last().ends][0](); assert.equal(g.state().phase, 'error'); assert.equal(g.last().releaseCount, 1)
  const h = fixture(state => { if (state.phase === 'preparing') h.session.stop() }); h.session.start(settings()); assert.equal(h.audios.length, 0); assert.equal(h.state().phase, 'idle')
})

function nativeFixture() {
  const events: Array<[string, ...number[]]> = []
  const sourceEvents = new EventTarget(), contextEvents = new EventTarget()
  let close = 0, disconnectSource = 0, disconnectGain = 0, audioTime = 10
  const param = { value: 1, cancelScheduledValues: (time: number) => { events.push(['cancel', time]) }, setValueAtTime: (value: number, time: number) => { events.push(['value', value, time]) }, linearRampToValueAtTime: (value: number, time: number) => { events.push(['linear', value, time]) } }
  const gain = { gain: param, connect() {}, disconnect() { disconnectGain++ } }
  const source = Object.assign(sourceEvents, { connect() {}, start() { events.push(['start']) }, stop(time?: number) { events.push(time === undefined ? ['stopNow'] : ['stop', time]) }, disconnect() { disconnectSource++ } })
  const context = Object.assign(contextEvents, { get currentTime() { return audioTime }, state: 'running', destination: {}, createGain: () => gain, resume: async () => {}, close: async () => { close++ } })
  return { context, source, events, param, counts: () => ({ close, disconnectSource, disconnectGain }), time(value: number) { audioTime = value } }
}
await check('actual native adapter applies AudioParam schedule/stop order and releases listeners/nodes/context once', async () => {
  const f = nativeFixture(), audio = createWhiteNoiseAudio(f.context as unknown as AudioContext, 'white', () => f.source as unknown as AudioBufferSourceNode)
  let notifications = 0; audio.onEnded(() => notifications++); audio.onState(() => notifications++)
  audio.start(whiteNoiseAudioPlan(settings({ fade: true }), 60_000, 10))
  assert.deepEqual(f.events, [['cancel', 10], ['value', 0.5, 10], ['value', 0.5, 40], ['linear', 0, 70], ['start'], ['stop', 70]])
  f.time(55); audio.schedule(whiteNoiseAudioPlan(settings({ fade: true, volume: 80 }), 15_000, 55)); assert.deepEqual(f.events.slice(-4), [['cancel', 55], ['value', 0.4, 55], ['linear', 0, 70], ['stop', 70]])
  f.source.dispatchEvent(new Event('ended')); assert.equal(notifications, 1); audio.release(); audio.release(); f.source.dispatchEvent(new Event('ended')); f.context.dispatchEvent(new Event('statechange')); await flush()
  assert.equal(notifications, 1); assert.deepEqual(f.counts(), { close: 1, disconnectSource: 1, disconnectGain: 1 }); assert.ok(f.events.some(event => event[0] === 'stopNow'))
})
await check('native partial factory/start failure cleanup still closes context and disconnects owned nodes', async () => {
  const f = nativeFixture(); assert.throws(() => createWhiteNoiseAudio(f.context as unknown as AudioContext, 'white', () => { throw new Error('factory') })); await flush(); assert.deepEqual(f.counts(), { close: 1, disconnectSource: 0, disconnectGain: 1 })
  const g = nativeFixture(), audio = createWhiteNoiseAudio(g.context as unknown as AudioContext, 'white', () => g.source as unknown as AudioBufferSourceNode)
  g.source.start = () => { throw new Error('start') }; assert.throws(() => audio.start(whiteNoiseAudioPlan(settings(), 1000, 10))); audio.release(); await flush(); assert.deepEqual(g.counts(), { close: 1, disconnectSource: 1, disconnectGain: 1 })
})
console.log(`White noise ownership/native ports: ${groups} groups PASS (no speaker output)`)
