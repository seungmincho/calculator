import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import { WHITE_NOISE_PROFILES_KEY } from '../../../src/utils/whiteNoiseProfiles.ts'

const has = (node, key) => Object.hasOwn(node.props, key)
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const messagesFor = locale => JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }

async function player() {
  let wall = 1000000, mono = 1000
  const contexts = [], messages = messagesFor('ko')
  class Target {
    listeners = new Map()
    addEventListener(name, listener) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(listener) }
    removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener) }
    emit(name) { [...(this.listeners.get(name) ?? [])].forEach(listener => listener()) }
  }
  class Audio extends Target {
    constructor() { super(); this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 32; this.destination = {}; this.events = []; this.sources = []; this.buffers = []; this.closed = 0; this.resumes = []; contexts.push(this) }
    createGain() {
      const param = { value: 1, cancelScheduledValues: at => { this.events.push(['cancel', at]) }, setValueAtTime: (value, at) => { this.events.push(['gain', value, at]); if (at <= this.currentTime) param.value = value }, linearRampToValueAtTime: (value, at) => { this.events.push(['ramp', value, at]) } }
      this.param = param
      return { gain: param, connect() {}, disconnect: () => { this.events.push(['gainDisconnect']) } }
    }
    createBuffer(channels, length, rate) { const data = new Float32Array(length), buffer = { channels, length, rate, getChannelData: () => data }; this.buffers.push(buffer); return buffer }
    createBufferSource() {
      const source = new Target()
      Object.assign(source, { connect() {}, start: () => { this.events.push(['start']) }, stop: at => { this.events.push(['stop', at]) }, disconnect: () => { this.events.push(['sourceDisconnect']) } })
      this.sources.push(source); return source
    }
    resume() { const task = deferred(); this.events.push(['resume', this.param.value]); this.resumes.push(task); return task.promise }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve() }
  }
  const h = await componentHarness('src/components/WhiteNoise.tsx', { props: {}, messages,
    globals: { AudioContext: Audio, AbortController, performance: { now: () => mono }, Date: class extends Date { static now() { return wall } } },
  })
  h.render()
  const node = (key, value = true) => h.find(item => item.props[`data-noise-${key}`] === value)
  const panel = () => h.find(item => has(item, 'data-white-noise-player'))
  const settle = async () => { await flush(); h.render() }
  return { h, contexts, node, panel, settle, last: () => contexts.at(-1), phase: () => panel().props['data-noise-phase'], remaining: () => panel().props['data-noise-remaining'], deadline: () => panel().props['data-noise-deadline'],
    click(key, value = true) { node(key, value).props.onClick(); h.render() },
    volume(value) { node('volume').props.onChange({ target: { value: String(value) } }); h.render() },
    fade(checked) { node('fade').props.onChange({ target: { checked } }); h.render() },
    advance(ms, wallOnly = false) { wall += ms; if (!wallOnly) mono += ms; for (const ctx of contexts) if (ctx.state === 'running') ctx.currentTime += ms / 1000 },
    tick() { h.tick(250) },
    state(ctx, value) { ctx.state = value; ctx.emit('statechange'); h.render() },
    async allow(ctx = contexts.at(-1)) { ctx.state = 'running'; ctx.emit('statechange'); ctx.resumes.at(-1).resolve(); await settle() },
    props: () => h.find(item => typeof item.type === 'function' && item.type.name === 'WhiteNoiseProfiles').props,
    locale(locale) { messages.whiteNoise = messagesFor(locale).whiteNoise; h.render() },
    cleanup() { h.cleanup() },
  }
}

function store(initial = null) {
  let raw = initial, writes = 0, fail = '', committed = false
  return { get raw() { return raw }, set raw(value) { raw = value }, writes: () => writes, failure(value) { fail = value; committed = false },
    getItem(key) { assert.equal(key, WHITE_NOISE_PROFILES_KEY); if (fail === 'blocked' || (fail === 'readback' && committed)) throw new Error('read denied'); return raw },
    setItem(key, value) { assert.equal(key, WHITE_NOISE_PROFILES_KEY); if (fail === 'quota') throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); raw = value; writes++; committed = true },
  }
}
const saved = () => JSON.stringify({ version: 1, revision: 4, profiles: [{ id: 'one', name: 'Focus', settings: { type: 'rain', volume: 24, timerMinutes: 5, fade: true } }] })
async function profiles(storage, initialProps) {
  const loaded = [], jobs = []
  let hold = false
  const props = initialProps ?? { settings: { type: 'white', volume: 50, timerMinutes: 0, fade: false }, inputKey: 'initial', onLoad: value => loaded.push(value) }
  const h = await componentHarness('src/components/WhiteNoiseProfiles.tsx', { props, messages: messagesFor('ko'), storagePort: storage, globals: { AbortController, crypto },
    navigator: { locks: { request(key, options, callback) {
      assert.equal(key, WHITE_NOISE_PROFILES_KEY); assert.equal(options.mode, 'exclusive')
      if (!hold) return Promise.resolve().then(callback)
      const task = deferred(); jobs.push({ ...task, run() { try { options.signal.throwIfAborted(); task.resolve(callback()) } catch (cause) { task.reject(cause) } } }); return task.promise
    } } },
  }); h.render()
  const node = (key, value = true) => h.find(item => item.props[`data-noise-profile-${key}`] === value)
  const settle = async () => { await flush(); h.render() }
  return { h, node, jobs, loaded, settle,
    hold(value) { hold = value },
    click(key, value = true) { node(key, value).props.onClick(); h.render() },
    input(key, value) { node(key).props.onChange({ target: { value } }); h.render() },
    async save() { node('save').props.onSubmit({ preventDefault() {} }); await settle() },
    cleanup() { h.cleanup() },
  }
}

await check('All six original synthesis formulas are byte-identical to HEAD function bodies; parent starts only by action', async () => {
  const baseline = execFileSync('git', ['show', 'HEAD:src/components/WhiteNoise.tsx'], { encoding: 'utf8' })
  const current = fs.readFileSync('src/components/WhiteNoise.tsx', 'utf8')
  const declarations = source => {
    const parsed = ts.createSourceFile('noise.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    return new Map(parsed.statements.filter(ts.isFunctionDeclaration).map(fn => [fn.name?.text, fn.body?.getText(parsed).replace(/\r\n/g, '\n')]))
  }
  const original = declarations(baseline), now = declarations(current)
  for (const name of ['createWhiteNoise', 'createPinkNoise', 'createBrownNoise', 'createNatureNoise']) assert.equal(now.get(name), original.get(name), name)
  const p = await player(); assert.equal(p.contexts.length, 0)
  p.click('timer', 5); p.fade(true); p.volume(0); assert.equal(p.contexts.length, 0)
  p.click('play'); assert.equal(p.phase(), 'preparing'); assert.equal(p.last().events.filter(event => event[0] === 'start').length, 0)
  await p.allow()
  for (const type of ['pink', 'brown', 'rain', 'wind', 'wave']) { p.click('type', type); await p.allow() }
  assert.equal(p.contexts.length, 6)
  p.contexts.forEach((ctx, index) => { assert.equal(ctx.buffers[0].length, index < 3 ? 64 : 128); assert.equal(ctx.sources[0].loop, true); assert.ok([...ctx.buffers[0].getChannelData(0)].every(Number.isFinite)) })
  assert.equal(p.phase(), 'playing'); p.cleanup(); assert.ok(p.contexts.every(ctx => ctx.closed === 1))
})

await check('Actual parent/browser/audio stack mutes before resume; pending changes never unmute and expiry rejects late success', async () => {
  const p = await player(); p.click('timer', 5); p.click('play'); await p.allow(); const ctx = p.last()
  p.state(ctx, 'suspended'); const start = ctx.events.length; p.click('play')
  const events = ctx.events.slice(start), resumeAt = events.findIndex(event => event[0] === 'resume')
  assert.ok(resumeAt >= 0); assert.equal(events[resumeAt][1], 0); assert.ok(events.slice(0, resumeAt).some(event => event[0] === 'gain' && event[1] === 0))
  p.volume(83); p.fade(true); p.state(ctx, 'running'); p.h.window.dispatch('pageshow'); p.h.render()
  assert.equal(p.phase(), 'preparing'); assert.equal(ctx.events.slice(start).filter(event => event[0] === 'gain' && event[1] > 0).length, 0)
  p.advance(300001, true); p.h.window.dispatch('pageshow'); p.h.render(); assert.equal(p.phase(), 'idle'); assert.equal(ctx.closed, 1)
  await p.allow(ctx); assert.equal(p.phase(), 'idle'); assert.equal(ctx.events.slice(start).filter(event => event[0] === 'gain' && event[1] > 0).length, 0)
  p.cleanup(); assert.equal(ctx.closed, 1)
})

await check('Resume confirmation applies latest fade once; type preserves deadline, timer resets and old ended/permission stay inert', async () => {
  const p = await player(); p.click('timer', 5); p.click('play'); await p.allow(); const first = p.last(), deadline = p.deadline()
  p.advance(280000); p.tick(); assert.equal(p.remaining(), 20000)
  p.state(first, 'suspended'); p.click('play'); p.fade(true); p.volume(80); await p.allow(first)
  assert.equal(p.phase(), 'playing'); assert.equal(p.deadline(), deadline)
  assert.equal(first.events.filter(event => event[0] === 'gain').at(-1)[1], 0.8 * 20 / 30)
  const oldEnded = [...first.sources[0].listeners.get('ended')][0]
  p.click('type', 'wave'); const waiting = p.last(); assert.equal(first.closed, 1); assert.equal(p.deadline(), deadline)
  p.click('timer', 10); await p.allow(); const latest = p.last(), generation = p.panel().props['data-noise-generation']
  assert.equal(p.remaining(), 600000); assert.notEqual(p.deadline(), deadline)
  await p.allow(waiting); oldEnded(); p.h.render(); assert.equal(p.last(), latest); assert.equal(p.phase(), 'playing'); assert.equal(p.panel().props['data-noise-generation'], generation)
  assert.equal(waiting.events.filter(event => event[0] === 'start').length, 0)
  p.click('timer', 0); await p.allow(); assert.equal(p.remaining(), ''); assert.equal(p.deadline(), '')
  assert.equal(p.last().events.filter(event => event[0] === 'stop').length, 0)
  const inputKey = p.props().inputKey; p.locale('en'); assert.equal(p.props().inputKey, inputKey)
  p.cleanup(); assert.ok(p.contexts.every(ctx => ctx.closed === 1)); assert.ok(p.contexts.every(ctx => [...ctx.listeners.values()].every(set => set.size === 0)))
})

await check('Profile load uses actual parent stop/change, reports success after parent rerender and keeps locale/settings silent', async () => {
  const p = await player(); p.click('play'); await p.allow(); const before = p.contexts.length, storage = store(saved())
  const panel = await profiles(storage, p.props()); panel.input('select', 'one'); panel.click('load'); panel.click('confirm', 'load'); await panel.settle()
  p.h.render(); panel.h.setProps(p.props())
  assert.equal(p.phase(), 'idle'); assert.equal(p.last().closed, 1); assert.equal(p.contexts.length, before)
  assert.deepEqual(JSON.parse(JSON.stringify(p.props().settings)), { type: 'rain', volume: 24, timerMinutes: 5, fade: true })
  assert.ok(panel.h.text().includes(messagesFor('ko').whiteNoise.profiles.loaded))
  p.locale('en'); assert.equal(p.contexts.length, before); assert.equal(p.props().settings.type, 'rain'); assert.equal(storage.writes(), 0)
  panel.cleanup(); p.cleanup()
})

await check('Held profile load cancels on actual parent interaction, cancel, external conflict and unmount without late apply', async () => {
  for (const change of ['parent', 'cancel', 'external', 'unmount']) {
    const p = await player(), storage = store(saved()), panel = await profiles(storage, p.props())
    panel.input('select', 'one'); panel.click('load'); panel.hold(true); panel.click('confirm', 'load')
    if (change === 'parent') { p.volume(71); panel.h.setProps(p.props()) }
    if (change === 'cancel') panel.click('cancel')
    if (change === 'external') { storage.raw = saved().replace('"revision":4', '"revision":5'); panel.h.window.dispatch('storage', { key: WHITE_NOISE_PROFILES_KEY, newValue: storage.raw }); panel.h.render() }
    if (change === 'unmount') panel.cleanup()
    panel.jobs[0].run(); await panel.settle(); p.h.render()
    assert.equal(p.props().settings.type, 'white'); assert.equal(p.props().settings.volume, change === 'parent' ? 71 : 50)
    assert.equal(p.contexts.length, 0); assert.equal(storage.writes(), 0)
    if (change !== 'unmount') panel.cleanup(); p.cleanup()
  }
})

await check('Two actual panels protect raw CAS and unconfirmed commits; corrupt/future/blocked storage is never reset', async () => {
  const storage = store(), a = await profiles(storage), b = await profiles(storage)
  a.input('name', 'First'); b.input('name', 'Second'); await a.save(); const committed = storage.raw
  await b.save(); assert.equal(storage.raw, committed); assert.equal(storage.writes(), 1)
  assert.ok(b.h.text().includes(messagesFor('ko').whiteNoise.profiles.errors.conflict)); assert.equal(b.node('name').props.value, 'Second')
  b.click('reload'); storage.failure('readback'); await b.save(); assert.equal(storage.writes(), 2)
  assert.ok(b.h.text().includes(messagesFor('ko').whiteNoise.profiles.errors.unconfirmed)); const unknown = storage.raw
  await b.save(); assert.equal(storage.raw, unknown); assert.equal(storage.writes(), 2)
  storage.failure(''); b.click('reload'); assert.equal(JSON.parse(storage.raw).profiles.length, 2)
  a.cleanup(); b.cleanup()
  for (const raw of ['{broken', JSON.stringify({ version: 2, profiles: [] }), saved().replace('"volume":24', '"volume":101')]) {
    const storage = store(raw), panel = await profiles(storage)
    panel.input('name', 'Keep'); await panel.save(); panel.click('reload'); assert.equal(storage.raw, raw); assert.equal(storage.writes(), 0); assert.equal(panel.node('name').props.value, 'Keep'); panel.cleanup()
  }
  const denied = store(saved()); denied.failure('blocked'); const panel = await profiles(denied)
  panel.input('name', 'Retained'); await panel.save(); assert.equal(denied.writes(), 0); assert.equal(denied.raw, saved()); panel.cleanup()
})

console.log(`WhiteNoise independent: ${groups} groups passed (actual parent/browser adapter/profiles; controlled native audio/DOM/locks, no speaker output)`)
