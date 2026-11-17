import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

// Only the generic host/effect replay is shared. These scenarios/assertions are independent.
const sourceMessages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch30/translations-pomodoro.json', 'utf8')).ko
const messages = { ...sourceMessages, pomodoroTimer: { ...sourceMessages.pomodoroTimer, ...fragment.pomodoroTimer } }
const settings = { workDuration: 1, shortBreakDuration: 1, longBreakDuration: 2, longBreakInterval: 2, autoStart: true, notificationsEnabled: true, soundEnabled: true, soundVolume: 50 }
const keys = { timer: 'pomodoro-timer-state', settings: 'pomodoro-settings', tasks: 'pomodoro-tasks', stats: 'pomodoro-daily-stats', goal: 'pomodoro-daily-goal.v1' }
const initialWall = new Date(2026, 10, 17, 12).getTime()
const initialStats = JSON.stringify([{ date: '2026-11-17', count: 2, minutes: 2 }])
const tasks = [{ id: 'A', text: 'task A', completed: false, estimatedPomodoros: 2, completedPomodoros: 1 }, { id: 'B', text: 'task B', completed: false, estimatedPomodoros: 3, completedPomodoros: 0 }]
const timerRaw = overrides => JSON.stringify({ phase: 'work', timeLeft: 60, isRunning: false, currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, lastTickTime: initialWall, settings, ...overrides })
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
async function fixture(overrides = {}) {
  const localeMessages = { ...messages }
  let wall = initialWall, mono = 100, sequence = 0, holdTimer = false
  const values = new Map(Object.entries({ [keys.settings]: JSON.stringify(settings), [keys.tasks]: JSON.stringify(tasks), [keys.timer]: timerRaw({}), [keys.stats]: initialStats, [keys.goal]: '{"version":1,"target":7}', ...overrides }))
  const writes = [], pending = [], notifications = [], audio = [], intervals = []
  const storage = { getItem: key => values.get(key) ?? null, setItem(key, raw) { writes.push([key, raw]); values.set(key, raw) }, removeItem: key => values.delete(key) }
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [wall])) } static now() { return wall } }
  class Notice { static permission = 'granted'; static async requestPermission() { throw new Error('Unexpected permission request') } constructor(title, options) { notifications.push([title, options]) } }
  class SilentAudio {
    constructor() { audio.push(this); this.currentTime = 0; this.destination = {} }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } } }
    createOscillator() { return { connect() {}, frequency: {}, start() {}, stop() {} } }
    close() {}
  }
  const locks = { request(key, options, action) {
    if (typeof options === 'function') return Promise.resolve().then(options)
    const run = () => { if (options.signal?.aborted) throw new DOMException('Canceled', 'AbortError'); return action() }
    return holdTimer && key === keys.timer ? new Promise((resolve, reject) => pending.push(() => { try { resolve(run()) } catch (error) { reject(error) } })) : Promise.resolve().then(run)
  } }
  const h = await componentHarness('src/components/PomodoroTimer.tsx', {
    messages: localeMessages, storagePort: storage, document: { title: 'Original title' }, navigator: { locks },
    globals: { Date: ClockDate, performance: { now: () => mono }, crypto: { randomUUID: () => `parent-${++sequence}` }, AbortController, DOMException, Notification: Notice, AudioContext: SilentAudio },
    modules: { '@/hooks/useDialog': { useDialog() {} }, '@/components/PomodoroGoalPanel': { __esModule: true, default: 'GoalPanel' }, '@/components/PomodoroRecovery': { __esModule: true, default: 'Recovery' } },
  })
  const interval = h.context.setInterval
  h.context.setInterval = (callback, delay) => { intervals.push({ callback, delay }); return interval(callback, delay) }
  const settle = async () => { for (let step = 0; step < 20; step++) { await Promise.resolve(); h.render() } }
  h.render(); await settle()
  const timer = () => h.find(node => Object.hasOwn(node.props, 'data-pomodoro-timer')).props
  const toggle = () => h.find(node => Object.hasOwn(node.props, 'data-pomodoro-toggle'))
  const goal = () => h.find(node => node.type === 'GoalPanel').props
  const recovery = () => h.find(node => node.type === 'Recovery').props
  const byAria = key => h.find(node => node.type === 'button' && node.props['aria-label'] === messages.pomodoroTimer[key])
  const selectTask = name => h.find(node => node.type === 'button' && node.props.children === name).props.onClick({ stopPropagation() {} })
  const elapse = (ms, monotonic = ms) => { wall += ms; mono += monotonic }
  return { h, values, writes, audio, notifications, intervals, pending, settle, timer, toggle, goal, recovery, byAria, selectTask, elapse,
    english() { const english = JSON.parse(fs.readFileSync('messages/en.json', 'utf8')), patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch30/translations-pomodoro.json', 'utf8')).en; localeMessages.pomodoroTimer = { ...english.pomodoroTimer, ...patch.pomodoroTimer }; localeMessages.common = english.common; h.render() },
    hold(value) { holdTimer = value }, release() { holdTimer = false; for (const run of pending.splice(0)) run() } }
}

await check('StrictMode replay restores one live owner; current task and exact observed-day stats increment once', async () => {
  const f = await fixture(); f.h.replayEffects(); await f.settle(); f.h.replayEffects(); await f.settle()
  assert.equal(f.writes.length, 0); assert.equal(f.toggle().props.disabled, false)
  f.selectTask('task A'); f.h.render(); f.toggle().props.onClick(); await f.settle()
  const oldTick = f.intervals.findLast(item => item.delay === 250).callback
  f.elapse(1400); f.h.tick(250); await f.settle(); assert.equal(f.timer()['data-remaining-ms'], 58600)
  f.selectTask('task B'); f.h.render(); f.elapse(58600); f.h.tick(250); await f.settle()
  assert.equal(f.timer()['data-phase'], 'shortBreak'); assert.equal(f.timer()['data-remaining-ms'], 60000)
  assert.deepEqual(JSON.parse(JSON.stringify(f.goal().dailyStats)), [{ date: '2026-11-17', count: 3, minutes: 3 }])
  assert.deepEqual(JSON.parse(f.values.get(keys.tasks)).map(task => task.completedPomodoros), [1, 1])
  assert.equal(f.audio.length, 1); assert.equal(f.notifications.length, 1)
  oldTick(); oldTick(); await f.settle(); assert.equal(f.goal().dailyStats[0].count, 3)
  f.elapse(60000); f.h.tick(250); await f.settle()
  assert.equal(f.timer()['data-phase'], 'work'); assert.equal(f.goal().dailyStats[0].count, 3); assert.equal(f.audio.length, 2); assert.equal(f.notifications.length, 2)
  assert.equal(f.values.get(keys.goal), '{"version":1,"target":7}')
  assert.deepEqual(JSON.parse(f.values.get(keys.stats)), [{ date: '2026-11-17', count: 3, minutes: 3 }])
  const beforeLocale = [f.timer()['data-phase-id'], f.timer()['data-remaining-ms'], f.values.get(keys.tasks), f.values.get(keys.timer)]
  f.english(); await f.settle(); assert.deepEqual([f.timer()['data-phase-id'], f.timer()['data-remaining-ms'], f.values.get(keys.tasks), f.values.get(keys.timer)], beforeLocale)
  f.h.cleanup(); const audioCount = f.audio.length; oldTick(); await Promise.resolve(); assert.equal(f.audio.length, audioCount)
})

await check('Restored expiry and wall-only live expiry keep stats/tasks unchanged and advance without effects', async () => {
  for (const restored of [true, false]) {
    const f = await fixture(restored ? { [keys.timer]: timerRaw({ isRunning: true, lastTickTime: initialWall - 60001 }) } : {})
    f.selectTask('task B'); f.h.render()
    if (!restored) { f.toggle().props.onClick(); await f.settle(); f.elapse(60001, 0); f.h.tick(250); await f.settle() }
    assert.equal(f.timer()['data-notice'], restored ? 'restoredExpired' : 'clockGapExpired')
    assert.equal(f.timer()['data-running'], false); assert.equal(f.timer()['data-remaining-ms'], 0)
    f.toggle().props.onClick(); await f.settle()
    assert.equal(f.timer()['data-phase'], 'shortBreak'); assert.equal(f.timer()['data-running'], true)
    assert.equal(f.audio.length, 0); assert.equal(f.notifications.length, 0); assert.equal(f.values.get(keys.stats), initialStats)
    assert.deepEqual(JSON.parse(f.values.get(keys.tasks)), tasks); f.h.cleanup()
  }
})

await check('Pending completion reset or unmount invalidates delayed approval and all task/stat/audio effects', async () => {
  for (const unmount of [false, true]) {
    const f = await fixture(); f.selectTask('task B'); f.h.render(); f.toggle().props.onClick(); await f.settle(); f.hold(true)
    f.elapse(60000); f.h.tick(250); await f.settle(); assert.equal(f.toggle().props.disabled, true); assert.ok(f.pending.length >= 1)
    if (unmount) f.h.cleanup()
    else { f.byAria('resetPhase').props.onClick(); f.h.render() }
    f.release(); if (unmount) { for (let index = 0; index < 20; index++) await Promise.resolve() } else await f.settle()
    assert.equal(f.values.get(keys.stats), initialStats); assert.deepEqual(JSON.parse(f.values.get(keys.tasks)), tasks)
    assert.equal(f.audio.length, 0); assert.equal(f.notifications.length, 0)
    if (!unmount) { assert.equal(f.timer()['data-phase'], 'work'); assert.equal(f.timer()['data-remaining-ms'], 60000); assert.equal(f.timer()['data-running'], false); f.h.cleanup() }
  }
})

await check('Conflicting timer stops and requires explicit reload; damaged keys stay untouched during memory edits', async () => {
  const f = await fixture(); f.toggle().props.onClick(); await f.settle(); f.elapse(2500); f.h.tick(250); await f.settle()
  const foreign = timerRaw({ phase: 'shortBreak', timeLeft: 37 })
  f.values.set(keys.timer, foreign); f.h.window.dispatch('storage', { key: keys.timer }); await f.settle()
  assert.equal(f.timer()['data-running'], false); assert.equal(f.timer()['data-notice'], 'conflict'); assert.equal(f.toggle().props.disabled, true)
  assert.equal(f.values.get(keys.timer), foreign); assert.equal(await f.recovery().onReload('timer'), true); await f.settle()
  assert.equal(f.timer()['data-phase'], 'shortBreak'); assert.equal(f.timer()['data-remaining-ms'], 37000); assert.equal(f.timer()['data-notice'], '')
  assert.equal(f.values.get(keys.stats), initialStats); f.h.cleanup()
  const broken = { [keys.settings]: 'null', [keys.tasks]: '{bad', [keys.timer]: '{"version":99}' }, d = await fixture(broken)
  assert.equal(d.writes.length, 0)
  const field = d.h.find(node => node.type === 'input' && node.props.placeholder === messages.pomodoroTimer.taskPlaceholder)
  field.props.onChange({ target: { value: 'memory task' } }); d.h.render(); d.byAria('taskAdd').props.onClick(); await d.settle()
  for (const [key, raw] of Object.entries(broken)) assert.equal(d.values.get(key), raw)
  assert.ok(d.h.text().includes('memory task')); assert.equal(d.recovery().stores.tasks.status, 'corrupt'); d.h.cleanup()
})

await check('A newer parent task edit cancels a timer reload waiting for its lock', async () => {
  const f = await fixture(), oldPhaseId = f.timer()['data-phase-id']
  f.hold(true); const pendingReload = f.recovery().onReload('timer'); await f.settle()
  assert.ok(f.pending.length >= 1)
  const field = f.h.find(node => node.type === 'input' && node.props.placeholder === messages.pomodoroTimer.taskPlaceholder)
  field.props.onChange({ target: { value: 'newer edit' } }); f.h.render(); f.byAria('taskAdd').props.onClick(); await f.settle()
  f.release(); assert.equal(await pendingReload, false); await f.settle()
  assert.equal(f.timer()['data-phase-id'], oldPhaseId); assert.ok(JSON.parse(f.values.get(keys.tasks)).some(task => task.text === 'newer edit'))
  assert.equal(f.values.get(keys.stats), initialStats); f.h.cleanup()
})

console.log(`Independent actual Pomodoro parent: ${groups} groups passed; native browser/DOM/notification/audio separate`)
