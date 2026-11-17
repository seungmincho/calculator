import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness, text } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import { createPomodoroBrowserSession, initialPomodoroBrowserState } from '../../../src/lib/pomodoro/browserSession.ts'
import { DEFAULT_POMODORO_SETTINGS } from '../../../src/utils/pomodoroSession.ts'
import { POMODORO_STATE_KEYS } from '../../../src/utils/pomodoroPersistence.ts'
import { POMODORO_STATS_KEY } from '../../../src/utils/pomodoroGoal.ts'

const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch30/translations-pomodoro.json', 'utf8'))
const messages = locale => {
  const base = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  base.pomodoroTimer.reliability = patch[locale].pomodoroTimer.reliability
  return base
}
const flush = () => new Promise(resolve => setImmediate(resolve))
const settings = { ...DEFAULT_POMODORO_SETTINGS, workDuration: 1, shortBreakDuration: 1, longBreakDuration: 2, longBreakInterval: 2, soundEnabled: false }
const task = { id: 'a', text: '첫 할 일', completed: false, estimatedPomodoros: 1, completedPomodoros: 0 }
const keys = POMODORO_STATE_KEYS
async function player({ locale = 'ko', data = {}, firstSettings = settings } = {}) {
  let wallMs = Date.UTC(2026, 10, 17, 1), mono = 1000, sequence = 0, hold = false, fail = null, runtime
  const translated = messages(locale), stored = new Map([[keys.settings, JSON.stringify(firstSettings)], [keys.tasks, JSON.stringify([task, { ...task, id: 'b', text: '둘째 할 일' }])], ...Object.entries(data)])
  const ticks = new Set(), returns = new Set(), storageEvents = new Set(), checkpoints = new Set(), jobs = [], writes = [], notifications = []
  let sounds = 0
  const storage = { getItem(key) { return stored.get(key) ?? null }, setItem(key, value) { if (fail === 'quota' && key !== POMODORO_STATS_KEY) throw new DOMException('full', 'QuotaExceededError'); writes.push(key); stored.set(key, value) }, removeItem(key) { stored.delete(key) } }
  const locks = { request(_key, options, callback) {
    const action = typeof options === 'function' ? options : callback
    if (!hold) return Promise.resolve().then(action)
    return new Promise((resolve, reject) => jobs.push(() => { try { resolve(action()) } catch (error) { reject(error) } }))
  } }
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [wallMs])) } static now() { return wallMs } }
  class Notice { static permission = 'granted'; static requestPermission = async () => 'granted'; constructor(title, body) { notifications.push({ title, body }) } }
  class Sound { constructor() { sounds++ } currentTime = 0; destination = {}; createOscillator() { return { connect() {}, type: '', frequency: { value: 0 }, start() {}, stop() {} } }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } } } close() { return Promise.resolve() } }
  const h = await componentHarness('src/components/PomodoroTimer.tsx', {
    messages: translated, storagePort: storage, navigator: { locks }, document: { title: 'Original title' },
    globals: { Date: ClockDate, AbortController, DOMException, Notification: Notice, AudioContext: Sound },
    modules: {
      '@/hooks/useDialog': { useDialog() {} }, '@/components/PomodoroGoalPanel': { __esModule: true, default: 'GoalPanel' },
      '@/components/PomodoroRecovery': { __esModule: true, default: 'Recovery' },
      '@/lib/pomodoro/browserSession': { initialPomodoroBrowserState,
        createPomodoroBrowserSession(...args) { runtime = createPomodoroBrowserSession(...args); return runtime },
        pomodoroBrowserPorts(activeTaskId) { return {
          clock: () => ({ wallMs, monotonicMs: mono }), nextPhaseId: () => `phase-${++sequence}`, storage: () => storage, activeTaskId, locks,
          every(fn) { ticks.add(fn); return () => ticks.delete(fn) }, onReturn(fn) { returns.add(fn); return () => returns.delete(fn) },
          onStorage(fn) { storageEvents.add(fn); return () => storageEvents.delete(fn) }, onCheckpoint(fn) { checkpoints.add(fn); return () => checkpoints.delete(fn) },
        } },
      },
    },
  })
  h.render()
  const settle = async () => { await flush(); h.render(); await flush(); h.render() }
  await settle()
  const panel = () => h.find(node => Object.hasOwn(node.props, 'data-pomodoro-timer'))
  const click = async label => { h.find(node => node.type === 'button' && (node.props['aria-label'] === label || text(node).trim() === label)).props.onClick(); h.render(); await settle() }
  return { h, stored, writes, ticks, returns, jobs, settle, panel, notifications, sounds: () => sounds, runtime: () => runtime,
    timer: () => runtime.getSnapshot().timer, goal: () => h.find(node => node.type === 'GoalPanel').props,
    recovery: () => h.find(node => node.type === 'Recovery').props,
    click, async toggle() { h.find(node => Object.hasOwn(node.props, 'data-pomodoro-toggle')).props.onClick(); h.render(); await settle() },
    async phase(value) { h.find(node => node.props['data-pomodoro-phase'] === value).props.onClick(); h.render(); await settle() },
    async advance(ms, withMono = true) { wallMs += ms; if (withMono) mono += ms; for (const tick of [...ticks]) tick(); await settle() },
    async active(id) { h.find(node => node.type === 'button' && Object.hasOwn(node.props, 'aria-pressed') && text(node).trim() === (id === 'a' ? task.text : '둘째 할 일')).props.onClick({ stopPropagation() {} }); await settle() },
    async locale(locale) { Object.assign(translated, messages(locale)); await settle() },
    hold(value) { hold = value }, fail(value) { fail = value },
    async drain() { for (let n = 0; n < 100; n++) { await settle(); const job = jobs.shift(); if (!job) return; job() } throw new Error('queue loop') },
    async external(key, value) { stored.set(key, value); for (const listener of storageEvents) listener(key); await settle() },
    cleanup() { h.cleanup() },
  }
}
let groups = 0
const check = async (name, run) => { await run(); console.log('PASS', name); groups++ }

await check('actual parent fractional pause/resume and locale preserve time; goal props do not reset timer', async () => {
  const f = await player(); assert.equal(f.writes.length, 0); await f.toggle(); await f.advance(1400); await f.advance(125)
  await f.toggle(); assert.equal(f.timer().remainingMs, 58_475); const title = f.h.document.title
  await f.advance(200_000); await f.locale('en'); assert.equal(f.timer().remainingMs, 58_475); assert.ok(f.h.text().includes('00:59'))
  assert.equal(f.goal().dailyStats.length, 0); f.h.render(); assert.equal(f.timer().remainingMs, 58_475); assert.ok(title.includes('00:59'))
  await f.toggle(); await f.advance(475); await f.toggle(); assert.equal(f.timer().remainingMs, 58_000); f.cleanup(); assert.equal(f.h.document.title, 'Original title')
})
await check('actual completed work records one local day and current task, normal sound/notification remain explicit', async () => {
  const f = await player({ firstSettings: { ...settings, soundEnabled: true, notificationsEnabled: true, autoStart: true } })
  await f.active('a'); await f.toggle(); await f.advance(40_000); await f.active('b'); await f.advance(20_000)
  assert.equal(f.goal().dailyStats[0].count, 1); assert.equal(f.goal().dailyStats[0].minutes, 1)
  assert.equal(f.runtime().getSnapshot().tasks[0].completedPomodoros, 0); assert.equal(f.runtime().getSnapshot().tasks[1].completedPomodoros, 1)
  assert.equal(JSON.parse(f.stored.get(POMODORO_STATS_KEY))[0].count, 1); assert.equal(f.sounds(), 1); assert.equal(f.notifications.length, 1)
  await f.advance(60_000); assert.equal(f.goal().dailyStats[0].count, 1); assert.equal(f.notifications.length, 2)
  await f.click(messages('ko').pomodoroTimer.skip); assert.equal(f.goal().dailyStats[0].count, 1); assert.equal(f.notifications.length, 2); f.cleanup()
})
await check('legacy expired and wall-only gap show next action, never credit or play completion', async () => {
  const legacy = JSON.stringify({ phase: 'work', timeLeft: 1, isRunning: true, currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, lastTickTime: 1, settings: { ...settings, soundEnabled: true, notificationsEnabled: true } })
  const f = await player({ data: { [keys.timer]: legacy } }); assert.equal(f.timer().notice, 'restoredExpired'); assert.equal(f.writes.length, 0)
  assert.ok(f.h.text().includes(patch.ko.pomodoroTimer.reliability.advanceExpired)); await f.toggle(); assert.equal(f.timer().phase, 'shortBreak')
  assert.equal(f.goal().dailyStats.length, 0); assert.equal(f.sounds(), 0); assert.equal(f.notifications.length, 0)
  await f.advance(70_000, false); assert.equal(f.timer().notice, 'clockGapExpired'); assert.equal(f.goal().dailyStats.length, 0); f.cleanup()
})
await check('phase/reset/settings actions preserve intended counters while task and stats are retained', async () => {
  const f = await player(); await f.active('a'); await f.toggle(); await f.advance(60_000)
  await f.phase('longBreak'); assert.equal(f.timer().remainingMs, 120_000); assert.equal(f.timer().completedRounds, 1)
  await f.click(messages('ko').pomodoroTimer.resetPhase); assert.equal(f.timer().completedRounds, 1)
  await f.click(messages('ko').pomodoroTimer.settings)
  const range = f.h.all().find(node => node.type === 'input' && node.props.type === 'range' && node.props.max === 120)
  range.props.onChange({ target: { value: '2' } }); f.h.render(); await f.click(messages('ko').pomodoroTimer.save)
  assert.equal(f.timer().remainingMs, 120_000); assert.equal(f.timer().completedRounds, 0); assert.equal(f.goal().dailyStats[0].count, 1)
  assert.equal(f.runtime().getSnapshot().tasks[0].completedPomodoros, 1); f.cleanup()
})
await check('pending complete canceled by reset and unmount produces no late stats, tasks, notification or sound', async () => {
  for (const action of ['reset', 'unmount']) {
    const f = await player({ firstSettings: { ...settings, notificationsEnabled: true, soundEnabled: true } }); await f.active('a'); await f.toggle(); f.hold(true); await f.advance(60_000)
    if (action === 'reset') await f.click(messages('ko').pomodoroTimer.resetAll); else f.cleanup()
    await f.drain(); assert.equal(f.goal().dailyStats.length, 0); assert.equal(f.runtime().getSnapshot().tasks[0].completedPomodoros, 0)
    assert.equal(f.sounds(), 0); assert.equal(f.notifications.length, 0); if (action === 'reset') f.cleanup()
  }
})
await check('corrupt storage and quota preserve original bytes and current memory input; external timer stops without credit', async () => {
  const f = await player({ data: { [keys.timer]: '{broken', [keys.tasks]: 'null' } })
  assert.equal(f.recovery().stores.timer.status, 'corrupt'); assert.equal(f.recovery().stores.tasks.status, 'corrupt')
  await f.toggle(); await f.advance(60_000); assert.equal(f.goal().dailyStats[0].count, 1)
  assert.equal(f.stored.get(keys.timer), '{broken'); assert.equal(f.stored.get(keys.tasks), 'null'); f.cleanup()
  const q = await player(); q.fail('quota'); await q.toggle(); assert.equal(q.recovery().stores.timer.status, 'quota'); assert.equal(q.timer().isRunning, true)
  await q.external(keys.timer, 'newer'); assert.equal(q.timer().notice, 'conflict'); await q.advance(70_000); assert.equal(q.goal().dailyStats.length, 0); q.cleanup()
})
await check('actual recovery requires confirmation and preserves stale raw on rejected discard', async () => {
  let discarded = 0, reloaded = 0
  const props = { stores: { settings: { status: 'ready', pending: false }, tasks: { status: 'ready', pending: false }, timer: { status: 'corrupt', raw: 'bad', pending: false } },
    onReload: async () => { reloaded++; return true }, onDiscard: async (_kind, raw) => { assert.equal(raw, 'bad'); discarded++; return false }, onCancel() {} }
  const h = await componentHarness('src/components/PomodoroRecovery.tsx', { props, messages: messages('en') }); h.render()
  h.find(node => node.props['data-pomodoro-discard'] === 'timer').props.onClick(); h.render(); assert.equal(discarded, 0)
  h.find(node => node.props['data-pomodoro-confirm'] === 'discard').props.onClick(); await flush(); h.render(); assert.equal(discarded, 1)
  assert.ok(!h.text().includes(patch.en.pomodoroTimer.reliability.discarded))
  h.find(node => node.props['data-pomodoro-reload'] === 'timer').props.onClick(); h.render(); assert.equal(reloaded, 0)
  h.find(node => node.props['data-pomodoro-confirm'] === 'reload').props.onClick(); await flush(); h.render(); assert.equal(reloaded, 1)
  assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); h.cleanup()
})
console.log(`${groups} actual Pomodoro parent/recovery groups passed (controlled IO, no real audio/notifications).`)
