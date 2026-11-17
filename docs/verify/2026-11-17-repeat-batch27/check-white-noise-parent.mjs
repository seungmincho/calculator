import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import { createWhiteNoiseAudio } from '../../../src/lib/whiteNoise/audio.ts'
import { DEFAULT_WHITE_NOISE } from '../../../src/utils/whiteNoise.ts'
import { WHITE_NOISE_PROFILES_KEY } from '../../../src/utils/whiteNoiseProfiles.ts'

const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch27/translations-white-noise.json', 'utf8'))
const merge = (base, value) => { for (const [key, next] of Object.entries(value)) { if (next && typeof next === 'object' && !Array.isArray(next)) merge(base[key] ??= {}, next); else base[key] = next }; return base }
const messages = locale => merge(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), patch[locale])
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const has = (node, name) => Object.hasOwn(node.props ?? {}, name)
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }

async function player(locale = 'ko') {
  let wallMs = 1_000_000, monoMs = 1000, mode = 'normal'
  const contexts = [], tickers = new Set(), returns = new Set(), deadlines = new Set(), translated = messages(locale)
  const context = () => {
    const ctx = new EventTarget(), events = [], pending = deferred(), sources = [], buffers = []
    Object.assign(ctx, { state: 'suspended', currentTime: 0, sampleRate: 100, destination: {}, events, pending, sources, buffers, closed: 0,
      createBuffer(channels, length, rate) { const data = new Float32Array(length); const buffer = { channels, length, rate, getChannelData: () => data }; buffers.push(buffer); return buffer },
      createGain() { return { gain: { value: 1, cancelScheduledValues(time) { events.push(['cancel', time]) }, setValueAtTime(value, time) { events.push(['gain', value, time]) }, linearRampToValueAtTime(value, time) { events.push(['ramp', value, time]) } }, connect() {}, disconnect() { events.push(['disconnectGain']) } } },
      createBufferSource() { const source = new EventTarget(); Object.assign(source, { connect() {}, start() { events.push(['start']) }, stop(time) { events.push(['stop', time]) }, disconnect() { events.push(['disconnectSource']) } }); sources.push(source); return source },
      resume() { events.push(['resume']); if (mode === 'reject') return Promise.reject(new Error('denied')); if (mode === 'pending') return pending.promise; ctx.state = 'running'; return Promise.resolve() },
      async close() { ctx.closed++; ctx.state = 'closed' },
    }); contexts.push(ctx); return ctx
  }
  const h = await componentHarness('src/components/WhiteNoise.tsx', { messages: translated,
    modules: { '@/lib/whiteNoise/browser': { whiteNoiseBrowserPorts(makeSource) { return {
      clock: () => ({ wallMs, monotonicMs: monoMs }), createAudio: type => createWhiteNoiseAudio(context(), type, makeSource),
      every(callback) { tickers.add(callback); return () => tickers.delete(callback) }, after(callback) { deadlines.add(callback); return () => deadlines.delete(callback) },
      onReturn(callback) { returns.add(callback); return () => returns.delete(callback) },
    } } } },
    globals: { AbortController },
  }); h.render()
  const node = (name, value = true) => h.find(item => item.props[`data-noise-${name}`] === value)
  const panel = () => h.find(item => has(item, 'data-white-noise-player'))
  const settle = async () => { await flush(); h.render() }
  return { h, contexts, tickers, deadlines, returns, node, panel, settle,
    phase: () => panel().props['data-noise-phase'], remaining: () => panel().props['data-noise-remaining'],
    click(name, value = true) { node(name, value).props.onClick(); h.render() },
    volume(value) { node('volume').props.onChange({ target: { value: String(value) } }); h.render() },
    fade(checked) { node('fade').props.onChange({ target: { checked } }); h.render() },
    profileProps: () => h.find(item => typeof item.type === 'function' && item.type.name === 'WhiteNoiseProfiles').props,
    advance(ms) { wallMs += ms; monoMs += ms; for (const ctx of contexts) if (ctx.state === 'running') ctx.currentTime += ms / 1000; for (const tick of [...tickers]) tick(); h.render() },
    mode(value) { mode = value },
    locale(value) { translated.whiteNoise = messages(value).whiteNoise; h.render() },
    async allow(ctx) { ctx.state = 'running'; ctx.dispatchEvent(new Event('statechange')); ctx.pending.resolve(); await settle() },
    cleanup() { h.cleanup() },
  }
}

async function profiles({ stored = null, input = { ...DEFAULT_WHITE_NOISE }, onLoad = () => {}, key = 'initial' } = {}) {
  let raw = stored, failure = null, lockMode = 'immediate', writes = 0, afterWrite = false
  const jobs = [], loaded = [], props = { settings: input, inputKey: key, onLoad(value) { loaded.push(value); onLoad(value) } }
  const storage = { getItem() { if (failure === 'blocked' || (failure === 'unconfirmed' && afterWrite)) throw new Error('blocked'); return raw }, setItem(_key, value) { if (failure === 'quota') throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); raw = value; writes++; afterWrite = true } }
  const h = await componentHarness('src/components/WhiteNoiseProfiles.tsx', { props, messages: messages('ko'), globals: { AbortController, crypto }, storagePort: storage,
    navigator: { locks: { request(_key, options, callback) { if (lockMode === 'immediate') return Promise.resolve().then(callback); const task = deferred(); jobs.push({ ...task, run() { try { options.signal?.throwIfAborted(); task.resolve(callback()) } catch (error) { task.reject(error) } } }); return task.promise } } },
  }); h.render()
  const node = (name, value = true) => h.find(item => item.props[`data-noise-profile-${name}`] === value)
  const settle = async () => { await flush(); h.render() }
  return { h, jobs, loaded, node, settle, raw: () => raw, writes: () => writes,
    name(value) { node('name').props.onChange({ target: { value } }); h.render() },
    select(value) { node('select').props.onChange({ target: { value } }); h.render() },
    click(name, value = true) { node(name, value).props.onClick(); h.render() },
    async save() { node('save').props.onSubmit({ preventDefault() {} }); await settle() },
    async confirm(kind) { node('confirm', kind).props.onClick(); await settle() },
    change(settings, inputKey = 'changed') { props.settings = settings; props.inputKey = inputKey; h.setProps({ ...props }) },
    fail(value) { failure = value; afterWrite = false }, lock(value) { lockMode = value },
    replaceRaw(value) { raw = value },
    external(value) { raw = value; h.window.dispatch('storage', { key: WHITE_NOISE_PROFILES_KEY, newValue: value }); h.render() },
    cleanup() { h.cleanup() },
  }
}
const saved = (name = 'test') => JSON.stringify({ version: 1, revision: 1, profiles: [{ id: 'saved', name, settings: { type: 'rain', volume: 30, timerMinutes: 5, fade: true } }] })

await check('actual parent remains silent before Play, synthesizes all six original buffers, and treats volume0 as playing', async () => {
  const f = await player(); assert.equal(f.contexts.length, 0); f.click('timer', 5); f.fade(true); f.volume(0); assert.equal(f.contexts.length, 0)
  f.click('play'); await f.settle(); assert.equal(f.phase(), 'playing'); assert.ok(f.h.text().includes(patch.ko.whiteNoise.playback.muted)); assert.equal(f.contexts.length, 1)
  for (const type of ['pink', 'brown', 'rain', 'wind', 'wave']) { f.click('type', type); await f.settle() }
  assert.equal(f.contexts.length, 6)
  for (let i = 0; i < 6; i++) { const buffer = f.contexts[i].buffers[0]; assert.equal(buffer.length, i < 3 ? 200 : 400); assert.ok([...buffer.getChannelData(0)].every(Number.isFinite)); assert.equal(f.contexts[i].sources[0].loop, true) }
  f.cleanup(); assert.ok(f.contexts.every(ctx => ctx.closed === 1))
})
await check('actual parent type/volume/locale retain deadline, different timer resets, and loaded settings stop without new audio', async () => {
  const f = await player(); f.click('timer', 5); f.click('play'); await f.settle(); f.advance(95_000); const end = f.panel().props['data-noise-deadline']
  f.click('type', 'brown'); await f.settle(); f.volume(45); f.locale('en'); assert.equal(f.panel().props['data-noise-deadline'], end); assert.equal(f.remaining(), 205000)
  f.click('timer', 5); assert.equal(f.panel().props['data-noise-deadline'], end); f.click('timer', 10); await f.settle(); assert.equal(f.remaining(), 600000)
  const count = f.contexts.length; f.profileProps().onLoad({ type: 'wave', volume: 10, timerMinutes: 15, fade: true }); f.h.render()
  assert.equal(f.phase(), 'idle'); assert.equal(f.contexts.length, count); assert.equal(f.node('volume').props.value, 10); assert.equal(f.node('timer', 15).props['aria-pressed'], true); f.cleanup()
})
await check('actual parent resume mutes before native call and late expiry never restores positive gain', async () => {
  const f = await player(); f.click('timer', 5); f.click('play'); await f.settle(); f.advance(299000)
  const ctx = f.contexts[0]; ctx.state = 'suspended'; ctx.dispatchEvent(new Event('statechange')); f.h.render(); assert.equal(f.phase(), 'suspended')
  f.mode('pending'); ctx.events.length = 0; f.click('play'); assert.deepEqual(ctx.events.slice(0, 3).map(event => event[0]), ['cancel', 'gain', 'resume']); assert.equal(ctx.events[1][1], 0)
  ctx.state = 'running'; ctx.dispatchEvent(new Event('statechange')); f.volume(90); f.fade(true); assert.ok(!ctx.events.some(event => event[0] === 'gain' && event[1] > 0))
  f.advance(1500); await f.allow(ctx); assert.equal(f.phase(), 'idle'); assert.equal(ctx.closed, 1); assert.ok(!ctx.events.some(event => event[0] === 'gain' && event[1] > 0)); f.cleanup()
})
await check('actual parent failed/late preparation and unmount do not report playing or leak owned resources', async () => {
  const f = await player(); f.mode('reject'); f.click('play'); await f.settle(); assert.equal(f.phase(), 'error'); assert.equal(f.contexts[0].closed, 1)
  f.mode('pending'); f.click('play'); assert.equal(f.phase(), 'preparing'); const pending = f.contexts.at(-1); f.click('play'); await f.allow(pending); assert.equal(f.phase(), 'idle'); assert.ok(!pending.events.some(event => event[0] === 'start'))
  f.click('play'); const last = f.contexts.at(-1); f.cleanup(); await f.allow(last); assert.equal(last.closed, 1); assert.equal(f.tickers.size + f.deadlines.size + f.returns.size, 0)
})
await check('actual profile CRUD is explicit, keeps runtime fields out, and confirmation alone controls load', async () => {
  const f = await profiles(); assert.equal(f.writes(), 0); f.name(' 집중 '); await f.save(); const data = JSON.parse(f.raw()); assert.equal(data.profiles[0].name, '집중'); assert.deepEqual(Object.keys(data.profiles[0].settings).sort(), ['fade', 'timerMinutes', 'type', 'volume']); assert.equal(f.node('name').props.value, '')
  f.click('load'); assert.equal(f.loaded.length, 0); await f.confirm('load'); assert.equal(f.loaded.length, 1)
  f.node('rename').props.onChange({ target: { value: '밤' } }); f.h.render(); f.click('rename-save'); await f.settle(); assert.equal(JSON.parse(f.raw()).profiles[0].name, '밤')
  f.click('delete'); assert.equal(JSON.parse(f.raw()).profiles.length, 1); await f.confirm('delete'); assert.equal(JSON.parse(f.raw()).profiles.length, 0); f.cleanup()
})
await check('profile quota/unknown write/corrupt/future data preserve typed names and never auto-overwrite', async () => {
  for (const failure of ['quota', 'unconfirmed']) {
    const f = await profiles(); f.name('keep name'); f.fail(failure); await f.save(); assert.equal(f.node('name').props.value, 'keep name'); assert.ok(f.h.all().some(node => node.props?.role === 'alert')); assert.equal(f.writes(), failure === 'quota' ? 0 : 1); f.cleanup()
  }
  for (const raw of ['{broken', JSON.stringify({ version: 2, profiles: [] })]) { const f = await profiles({ stored: raw }); f.name('keep'); await f.save(); assert.equal(f.raw(), raw); assert.equal(f.writes(), 0); f.cleanup() }
})
await check('pending profile load is cancelled by changed settings, explicit cancel, storage event or unmount', async () => {
  for (const action of ['settings', 'cancel', 'storage', 'unmount']) {
    const f = await profiles({ stored: saved() }); f.select('saved'); f.click('load'); f.lock('pending'); f.click('confirm', 'load')
    if (action === 'settings') f.change({ ...DEFAULT_WHITE_NOISE, volume: 80 })
    if (action === 'cancel') f.click('cancel')
    if (action === 'storage') f.external(saved('other'))
    if (action === 'unmount') f.cleanup()
    f.jobs[0].run(); await f.settle(); assert.equal(f.loaded.length, 0, action); assert.equal(f.writes(), 0); if (action !== 'unmount') f.cleanup()
  }
})
await check('stale raw rejected inside queued lock, selection load keeps playback until confirmed success, controls use tokens', async () => {
  const f = await profiles({ stored: saved() }); f.name('later'); f.lock('pending'); await f.save(); f.replaceRaw(saved('external')); f.jobs[0].run(); await f.settle(); assert.equal(f.writes(), 0); assert.equal(f.node('name').props.value, 'later'); assert.ok(f.h.text().includes(patch.ko.whiteNoise.profiles.errors.conflict)); f.cleanup()
  const p = await player('en'); p.click('play'); await p.settle(); const child = await profiles({ stored: saved(), input: p.profileProps().settings, key: p.profileProps().inputKey, onLoad: p.profileProps().onLoad }); child.select('saved'); child.click('load'); assert.equal(p.phase(), 'playing'); await child.confirm('load'); p.h.render(); assert.equal(p.phase(), 'idle'); assert.equal(p.contexts.length, 1)
  child.change(p.profileProps().settings, p.profileProps().inputKey)
  assert.ok(child.h.text().includes(patch.ko.whiteNoise.profiles.loaded)); assert.equal(child.node('load').props.disabled, false)
  assert.ok(child.h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); assert.ok(child.node('name').props.className.includes('text-base')); child.cleanup(); p.cleanup()
})
console.log(`White noise parent/profiles: ${groups} groups PASS (actual components/controller/adapter, silent controlled ports)`)
