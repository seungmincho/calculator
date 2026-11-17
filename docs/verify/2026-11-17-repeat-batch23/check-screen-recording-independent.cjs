/* eslint-disable @typescript-eslint/no-require-imports -- Independent Node review with controlled media/DOM ports; no browser capture. */
const assert = require('node:assert/strict')
const { fixture, Track, Stream, config, deferred, flush } = require('../../../scripts/check-screen-recording-session.cjs')
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')

async function main() {
  let groups = 0
  const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }
  await check('canceled composition resolves after a newer recording: only old resources close', async () => {
    const f = await fixture(), pending = deferred()
    let closed = 0
    const { result: previous } = await f.successful()
    f.compose((_display, _mic, _config, owner) => {
      owner.context({ close() { closed++; return Promise.resolve() } })
      return pending.promise
    })
    const old = await f.start()
    f.session.cancelPreparation(); assert.equal(closed, 1)
    f.compose(null)
    const next = await f.start(), currentRecord = f.recorders.at(-1)
    const lateMixed = new Track('audio')
    pending.resolve({ stream: new Stream([old.video, lateMixed]), audio: { system: true, mic: true } })
    await flush()
    assert.equal(old.video.stops, 1); assert.equal(lateMixed.stops, 1)
    assert.equal(next.video.stops, 0); assert.equal(closed, 1)
    assert.equal(f.session.getSnapshot().phase, 'recording')
    assert.equal(f.session.getSnapshot().result, previous); assert.deepEqual(f.revoked, [])
    f.session.stop(); currentRecord.data('new video'); currentRecord.finish()
    assert.notEqual(f.session.getSnapshot().result.id, previous.id)
    assert.deepEqual(f.revoked, [previous.url]); f.session.dispose()
    assert.equal(next.video.stops, 1); assert.equal(f.timers.size, 0)
  })
  await check('empty microphone requires choice; cancel during choice preserves result and frees acquired tracks', async () => {
    const f = await fixture(), { result } = await f.successful()
    const resource = await f.start({ ...config, audio: 'both' }, true)
    const endedMic = new Track('audio'); endedMic.readyState = 'ended'
    f.microphones.at(-1).resolve(new Stream([endedMic])); await flush()
    assert.equal(f.session.getSnapshot().phase, 'audioChoice')
    assert.equal(f.recorders.length, 1)
    assert.deepEqual(f.session.getSnapshot().audio, { system: true, mic: false })
    f.session.cancelPreparation(); f.session.continueWithoutMic(); await flush()
    assert.equal(f.session.getSnapshot().phase, 'idle'); assert.equal(f.session.getSnapshot().result, result)
    assert.equal(resource.video.stops, 1); assert.equal(resource.sound.stops, 1); assert.equal(endedMic.stops, 1)
    assert.equal(f.recorders.length, 1); assert.deepEqual(f.revoked, []); f.session.dispose()
  })
  await check('queued old stop watchdog and callbacks cannot fail a new recording or revive a deleted result', async () => {
    const f = await fixture(), { result: first } = await f.successful()
    await f.start(); const oldRecord = f.recorders.at(-1)
    const oldData = oldRecord.ondataavailable, oldStop = oldRecord.onstop, oldError = oldRecord.onerror
    f.session.stop(); f.session.stop(); assert.equal(oldRecord.stops, 1)
    const oldWatchdog = [...f.timers.values()].find(timer => timer.ms === 10_000).callback
    f.session.deleteResult(first.id); assert.equal(f.session.getSnapshot().result, null)
    oldWatchdog(); assert.equal(f.session.getSnapshot().error, 'stopTimeout')
    const current = await f.start()
    oldWatchdog(); oldData({ data: new Blob(['late old video'], { type: 'video/webm' }) }); oldStop(); oldError()
    assert.equal(f.session.getSnapshot().phase, 'recording'); assert.equal(f.session.getSnapshot().error, null)
    assert.equal(f.session.getSnapshot().result, null); assert.equal(current.video.stops, 0)
    assert.deepEqual(f.revoked, [first.url]); f.session.dispose(); assert.equal(f.timers.size, 0)
  })
  await check('clock samples delayed active intervals, ignores backward samples and excludes repeated pauses', async () => {
    const f = await fixture(); f.time(100); await f.start()
    f.time(5100); f.tick(250); assert.equal(f.session.getSnapshot().elapsedMs, 5000)
    f.time(1000); f.session.pause(); f.session.pause()
    assert.equal(f.session.getSnapshot().elapsedMs, 5000)
    f.time(100_000); f.tick(250); assert.equal(f.session.getSnapshot().elapsedMs, 5000)
    f.session.resume(); f.session.resume(); f.time(102_750); f.session.stop()
    f.recorders[0].data(); f.recorders[0].finish()
    const result = f.session.getSnapshot().result
    assert.equal(result.elapsedMs, 7750); assert.equal(f.timers.size, 0)
    f.session.start(config); f.time(1_000_000)
    assert.equal(f.session.getSnapshot().result.elapsedMs, 7750)
    assert.equal(f.session.getSnapshot().elapsedMs, 0); f.session.dispose()
    const late = new Track('video'); f.display.at(-1).resolve(new Stream([late])); await flush(); assert.equal(late.stops, 1)
  })
  await check('MIME fallback checks actual recorder/chunk format before replacement and preserves requested config snapshot', async () => {
    const f = await fixture(), { result: previous } = await f.successful()
    const tried = []
    f.ports.supportsMime = mime => { tried.push(mime); if (tried.length === 1) throw new Error('unsupported codec'); return mime === 'video/webm' }
    const requested = { quality: 'low', fps: 60, audio: 'none' }
    const original = f.ports.createRecorder
    f.ports.createRecorder = (stream, mime, bitrate) => { assert.equal(bitrate, 1_500_000); return original(stream, mime, bitrate) }
    f.session.start(requested); requested.quality = 'high'; requested.fps = 30
    f.display.at(-1).resolve(new Stream([new Track('video')])); await flush()
    const record = f.recorders.at(-1); assert.equal(record.mimeType, 'video/webm'); assert.equal(tried.length, 5)
    f.session.stop(); record.data('wrong format', 'application/octet-stream'); record.finish()
    assert.equal(f.session.getSnapshot().error, 'format'); assert.equal(f.session.getSnapshot().result, previous)
    assert.deepEqual(f.revoked, []); assert.equal(f.session.getSnapshot().config.quality, 'low')
    assert.equal(f.session.getSnapshot().config.fps, 60); f.session.dispose()
  })
  await check('actual browser mixing adapter canceled during resume frees destination, sources and context exactly once', async () => {
    const { screenRecordingBrowserPorts } = await import('../../../src/lib/screenRecording/browser.ts')
    const { createScreenRecordingOwner } = await import('../../../src/lib/screenRecording/ownership.ts')
    const pending = deferred(), video = new Track('video'), system = new Track('audio'), mic = new Track('audio'), output = new Track('audio')
    const before = new Map(['AudioContext', 'MediaStream'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
    let closed = 0, disconnected = 0, connected = 0
    const owner = createScreenRecordingOwner()
    try {
      Object.defineProperty(globalThis, 'MediaStream', { configurable: true, value: Stream })
      Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: class {
        state = 'suspended'
        createMediaStreamDestination() { return { stream: new Stream([output]) } }
        createMediaStreamSource() { return { connect() { connected++ }, disconnect() { disconnected++ } } }
        async resume() { await pending.promise; this.state = 'running' }
        async close() { closed++; this.state = 'closed' }
      } })
      const display = new Stream([video, system]), microphone = new Stream([mic])
      owner.stream(display); owner.stream(microphone)
      const composing = screenRecordingBrowserPorts().compose(display, microphone, { ...config, audio: 'both' }, owner)
      await flush(); assert.equal(connected, 2); owner.release(); pending.resolve()
      await assert.rejects(composing, /audioContextUnavailable/)
      owner.release(); assert.equal(closed, 1); assert.equal(disconnected, 2)
      for (const track of [video, system, mic, output]) assert.equal(track.stops, 1)
    } finally {
      owner.release()
      for (const [key, descriptor] of before) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) }
    }
  })
  await check('actual parent events preserve settings across cancel and unmount blocks late media completion', async () => {
    const f = await fixture()
    const h = await componentHarness('src/components/ScreenRecorder.tsx', { props: {}, modules: { '@/lib/screenRecording/browser': { screenRecordingBrowserPorts: () => f.ports } } })
    const panel = () => h.find(node => typeof node.type === 'function' && node.type.name === 'ScreenRecordingSessionPanel')
    const setting = key => h.find(node => node.props['data-screen-recording-setting'] === key)
    h.render()
    for (const [key, value] of [['quality', 'low'], ['fps', '60'], ['audio', 'both']]) { setting(key).props.onChange({ target: { value } }); h.render() }
    panel().props.onStart(); h.render(); assert.equal(h.find(node => node.type === 'fieldset').props.disabled, true)
    const display = new Track('video'), system = new Track('audio')
    f.display[0].resolve(new Stream([display, system])); await flush(); h.render()
    f.microphones[0].reject(new Error('denied')); await flush(); h.render()
    assert.equal(panel().props.state.phase, 'audioChoice'); panel().props.onCancelPreparation(); h.render()
    assert.equal(setting('quality').props.value, 'low'); assert.equal(setting('fps').props.value, 60); assert.equal(setting('audio').props.value, 'both')
    assert.equal(display.stops, 1); assert.equal(system.stops, 1)
    panel().props.onStart(); h.render(); h.cleanup()
    const lateVideo = new Track('video'), lateAudio = new Track('audio')
    f.display[1].resolve(new Stream([lateVideo, lateAudio])); await flush()
    assert.equal(lateVideo.stops, 1); assert.equal(lateAudio.stops, 1)
    assert.equal(f.microphones.length, 1); assert.equal(f.recorders.length, 0); assert.equal(f.timers.size, 0); f.session.dispose()
  })
  await check('actual child confirmation resets for replacement result and microphone continuation is explicit', async () => {
    const f = await fixture(), { result: first } = await f.successful(), deleted = [], downloads = []
    const child = await componentHarness('src/components/ScreenRecordingLastResult.tsx', { props: { result: first, onDelete: id => deleted.push(id), onDownload: id => downloads.push(id) } })
    child.render(); child.button('retry.deleteResult').props.onClick(); child.render()
    assert.ok(child.text().includes('retry.deletePrompt'))
    const second = { ...first, id: first.id + 1, url: 'blob:replacement', name: 'replacement.webm' }
    child.setProps({ result: second, onDelete: id => deleted.push(id), onDownload: id => downloads.push(id) })
    assert.ok(!child.text().includes('retry.deletePrompt'))
    child.button('download').props.onClick(); assert.deepEqual(downloads, [second.id])
    child.button('retry.deleteResult').props.onClick(); child.render(); child.button('retry.deleteConfirm').props.onClick()
    assert.deepEqual(deleted, [second.id]); child.cleanup()
    const calls = [], state = { ...f.session.getSnapshot(), phase: 'audioChoice', config: { ...config, audio: 'both' }, audio: { system: false, mic: false }, micDenied: true }
    const panel = await componentHarness('src/components/ScreenRecordingSessionPanel.tsx', { props: { state, onStart() { calls.push('start') }, onCancelPreparation() { calls.push('cancel') }, onContinueWithoutMic() { calls.push('continue') }, onPause() {}, onResume() {}, onStop() {} } })
    panel.render(); assert.deepEqual(calls, [])
    assert.ok(panel.text().includes('retry.systemMissing')); assert.ok(panel.text().includes('retry.micChoice'))
    assert.equal(panel.all().filter(node => node.type === 'button').length, 2)
    panel.button('retry.continueWithoutMic').props.onClick(); assert.deepEqual(calls, ['continue'])
    panel.cleanup(); f.session.dispose()
  })
  console.log(`Screen recording independent review: ${groups} groups passed; no real capture/browser`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
