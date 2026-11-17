/* eslint-disable @typescript-eslint/no-require-imports -- Controlled media adapter/component runner; no real capture. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { fixture, Track, Stream, Recorder, flush, config, deferred } = require('../../../scripts/check-screen-recording-session.cjs')
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')

async function adapterFixture(failure = '') {
  const { screenRecordingBrowserPorts } = await import('../../../src/lib/screenRecording/browser.ts')
  const { createScreenRecordingSession } = await import('../../../src/lib/screenRecording/session.ts')
  const resources = { video: new Track('video'), system: new Track('audio'), mic: new Track('audio') }
  const requests = [], contexts = [], records = [], timers = new Set()
  const keys = ['navigator', 'MediaRecorder', 'MediaStream', 'AudioContext']
  const before = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const define = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, value })
  define('navigator', { mediaDevices: {
    async getDisplayMedia(options) { requests.push({ kind: 'display', options }); return new Stream([resources.video, resources.system]) },
    async getUserMedia(options) { requests.push({ kind: 'mic', options }); return new Stream([resources.mic]) },
  } })
  define('MediaStream', Stream)
  define('MediaRecorder', class extends Recorder {
    static isTypeSupported() { return true }
    constructor(stream, options) { super(options.mimeType); this.stream = stream; records.push(this) }
  })
  define('AudioContext', class {
    state = 'suspended'; closes = 0; disconnected = 0; sources = []; destination = new Track('audio')
    constructor() { contexts.push(this) }
    createMediaStreamDestination() { return { stream: new Stream([this.destination]) } }
    createMediaStreamSource(stream) { this.sources.push(stream); return { connect() {}, disconnect: () => { this.disconnected++ } } }
    async resume() { if (failure === 'resume') throw new Error('blocked resume'); this.state = 'running' }
    async close() { this.closes++; this.state = 'closed' }
  })
  const ports = screenRecordingBrowserPorts()
  ports.every = ports.after = callback => { timers.add(callback); return () => timers.delete(callback) }
  ports.now = () => 100; ports.wallNow = () => 1_800_000_000_000; ports.createUrl = () => 'blob:controlled'; ports.revokeUrl = () => {}
  const session = createScreenRecordingSession(ports, () => {})
  return { session, resources, requests, contexts, records, timers, cleanup() { session.dispose(); for (const [key, value] of before) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key) } } }
}

async function main() {
  let groups = 0
  const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }
  await check('actual browser adapter requests intended constraints and mixes both sources with exact cleanup', async () => {
    const f = await adapterFixture()
    try {
      assert.equal(f.requests.length, 0)
      f.session.start({ ...config, fps: 60, audio: 'both' }); await flush()
      assert.equal(f.requests[0].kind, 'display'); assert.equal(f.requests[0].options.video.frameRate, 60); assert.equal(f.requests[0].options.audio, true)
      assert.equal(f.contexts.length, 1); assert.equal(f.contexts[0].sources.length, 2); assert.equal(f.records[0].stream.getAudioTracks().length, 1)
      assert.deepEqual(f.session.getSnapshot().audio, { system: true, mic: true })
      f.session.stop(); f.records[0].data(); f.records[0].finish()
      assert.equal(f.contexts[0].closes, 1); assert.equal(f.contexts[0].disconnected, 2); assert.equal(f.contexts[0].destination.stops, 1)
      for (const track of Object.values(f.resources)) assert.equal(track.stops, 1)
      assert.equal(f.timers.size, 0)
    } finally { f.cleanup() }
  })
  await check('AudioContext resume rejection frees partial mixing resources and does not start a recorder', async () => {
    const f = await adapterFixture('resume')
    try {
      f.session.start({ ...config, audio: 'both' }); await flush()
      assert.equal(f.session.getSnapshot().error, 'initialization'); assert.equal(f.records.length, 0)
      assert.equal(f.contexts[0].closes, 1); assert.equal(f.contexts[0].destination.stops, 1); assert.equal(f.contexts[0].disconnected, 2)
      for (const track of Object.values(f.resources)) assert.equal(track.stops, 1)
    } finally { f.cleanup() }
  })
  await check('none/system/microphone-only adapter paths avoid AudioContext and exclude unrequested system audio', async () => {
    for (const audio of ['none', 'system', 'mic']) {
      const f = await adapterFixture()
      try {
        f.session.start({ ...config, audio }); await flush()
        assert.equal(f.contexts.length, 0)
        const tracks = f.records[0].stream.getAudioTracks()
        assert.deepEqual(tracks, audio === 'none' ? [] : [audio === 'system' ? f.resources.system : f.resources.mic])
        assert.equal(f.requests.length, audio === 'mic' ? 2 : 1)
      } finally { f.cleanup() }
    }
  })
  for (const language of ['ko', 'en']) await check(`actual parent ${language} keeps successful result through next permission failure, download denial, and stale delete`, async () => {
    const f = await fixture(), downloads = []
    const original = JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8'))
    const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch23/translations-screen-recorder.json', 'utf8'))[language]
    original.screenRecorder.retry = patch.screenRecorder.retry
    let clickFails = false
    const h = await componentHarness('src/components/ScreenRecorder.tsx', {
      props: {}, messages: original, globals: { AbortController },
      modules: { '@/lib/screenRecording/browser': { screenRecordingBrowserPorts: () => f.ports } },
      document: { body: { appendChild() {} }, createElement() { return { click() { if (clickFails) throw new Error('download denied'); downloads.push({ href: this.href, name: this.download }) }, remove() {} } } },
    })
    const sessionPanel = () => h.find(node => typeof node.type === 'function' && node.type.name === 'ScreenRecordingSessionPanel')
    const resultPanel = () => h.find(node => typeof node.type === 'function' && node.type.name === 'ScreenRecordingLastResult')
    h.render(); assert.equal(f.display.length, 0)
    sessionPanel().props.onStart(); sessionPanel().props.onStart(); h.render(); assert.equal(f.display.length, 1)
    assert.equal(h.find(node => node.type === 'fieldset').props.disabled, true)
    f.display[0].resolve(new Stream([new Track('video')])); await flush(); h.render()
    sessionPanel().props.onStop(); f.recorders[0].data(); f.recorders[0].finish(); h.render()
    const previous = resultPanel().props.result, oldDelete = resultPanel().props.onDelete
    clickFails = true; resultPanel().props.onDownload(previous.id); h.render(); assert.ok(h.text().includes(original.screenRecorder.retry.downloadFailed)); assert.equal(resultPanel().props.result, previous)
    clickFails = false; resultPanel().props.onDownload(previous.id); h.render(); assert.equal(downloads.length, 1)
    sessionPanel().props.onStart(); h.render(); assert.equal(resultPanel().props.result, previous)
    f.display[1].reject(new DOMException('denied', 'NotAllowedError')); await flush(); h.render(); assert.equal(resultPanel().props.result, previous)
    sessionPanel().props.onStart(); f.display[2].resolve(new Stream([new Track('video')])); await flush(); h.render()
    sessionPanel().props.onStop(); f.recorders[1].data('new bytes'); f.recorders[1].finish(); h.render()
    const current = resultPanel().props.result; oldDelete(previous.id); h.render(); assert.equal(resultPanel().props.result, current)
    assert.equal(f.revoked.filter(url => url === previous.url).length, 1)
    h.cleanup(); assert.equal(f.revoked.filter(url => url === current.url).length, 1); assert.equal(f.timers.size, 0)
    f.session.dispose()
  })
  await check('parent cancellation during preparation releases a late granted stream and preserves current setup', async () => {
    const f = await fixture(), pending = deferred()
    const h = await componentHarness('src/components/ScreenRecorder.tsx', { props: {}, modules: { '@/lib/screenRecording/browser': { screenRecordingBrowserPorts: () => ({ ...f.ports, getDisplay: () => pending.promise }) } } })
    h.render(); const panel = () => h.find(node => typeof node.type === 'function' && node.type.name === 'ScreenRecordingSessionPanel')
    h.find(node => node.props['data-screen-recording-setting'] === 'quality').props.onChange({ target: { value: 'low' } }); h.render()
    panel().props.onStart(); h.render(); panel().props.onCancelPreparation(); h.render()
    const video = new Track('video'); pending.resolve(new Stream([video])); await flush(); h.render()
    assert.equal(video.stops, 1); assert.equal(f.recorders.length, 0); assert.equal(panel().props.state.phase, 'idle')
    assert.equal(h.find(node => node.props['data-screen-recording-setting'] === 'quality').props.value, 'low')
    h.cleanup(); f.session.dispose()
  })
  console.log(`Screen recording integration: ${groups} groups passed; controlled ports only`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
