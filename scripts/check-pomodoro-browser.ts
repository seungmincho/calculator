import assert from 'node:assert/strict'
import { createPomodoroBrowserSession, type PomodoroBrowserPorts } from '../src/lib/pomodoro/browserSession.ts'
import { DEFAULT_POMODORO_SETTINGS } from '../src/utils/pomodoroSession.ts'
import { POMODORO_STATE_KEYS, parsePomodoroTimer } from '../src/utils/pomodoroPersistence.ts'
import type { PomodoroTransition } from '../src/lib/pomodoro/session.ts'

const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve() }
const settings = { ...DEFAULT_POMODORO_SETTINGS, workDuration: 1, shortBreakDuration: 1, soundEnabled: false }
const task = { id: 'active', text: '원문 작업', completed: false, estimatedPomodoros: 150, completedPomodoros: 0 }
class Memory {
  values = new Map<string, string>(); writes: string[] = []; quota = false; failReadback = false; wasWritten = false
  getItem(key: string) { if (this.failReadback && this.wasWritten) throw new Error('readback blocked'); return this.values.get(key) ?? null }
  setItem(key: string, raw: string) { if (this.quota) throw new DOMException('full', 'QuotaExceededError'); this.values.set(key, raw); this.writes.push(key); this.wasWritten = true }
  removeItem(key: string) { this.values.delete(key) }
}
class Locks {
  jobs: (() => void)[] = []; depth = 0; maxDepth = 0
  request = (_name: string, _options: unknown, callback: () => unknown) => new Promise((resolve, reject) => this.jobs.push(() => {
    this.depth++; this.maxDepth = Math.max(this.maxDepth, this.depth)
    try { resolve(callback()) } catch (error) { reject(error) } finally { this.depth-- }
  }))
  async drain() { for (let n = 0; n < 100; n++) { await flush(); const next = this.jobs.shift(); if (!next) return; next() } throw new Error('non-draining queue') }
}
function fixture(store = new Memory(), locks = new Locks()) {
  let wallMs = 1_000_000, monotonicMs = 1000, id = 0, activeTaskId: string | null = 'active'
  const ticks = new Set<() => void>(), returns = new Set<() => void>(), checkpoints = new Set<() => void>(), storage = new Set<(key: string | null) => void>(), events: PomodoroTransition[] = []
  const ports: PomodoroBrowserPorts = { clock: () => ({ wallMs, monotonicMs }), nextPhaseId: () => `p-${++id}`,
    storage: () => store, activeTaskId: () => activeTaskId, locks: locks as unknown as Pick<LockManager, 'request'>,
    every(fn) { ticks.add(fn); return () => { ticks.delete(fn) } }, onReturn(fn) { returns.add(fn); return () => { returns.delete(fn) } },
    onStorage(fn) { storage.add(fn); return () => { storage.delete(fn) } }, onCheckpoint(fn) { checkpoints.add(fn); return () => { checkpoints.delete(fn) } },
  }
  const session = createPomodoroBrowserSession(ports, () => {}, event => events.push(event))
  return { session, store, locks, events, ticks, returns, checkpoints, storage, ports,
    state: () => session.getSnapshot(), advance(ms: number, mono = true) { wallMs += ms; if (mono) monotonicMs += ms },
    tick() { for (const fn of [...ticks]) fn() }, checkpoint() { for (const fn of [...checkpoints]) fn() },
    changed(key: string | null) { for (const fn of storage) fn(key) }, active(id: string | null) { activeTaskId = id } }
}
const seeded = () => { const s = new Memory(); s.values.set(POMODORO_STATE_KEYS.settings, JSON.stringify(settings)); s.values.set(POMODORO_STATE_KEYS.tasks, JSON.stringify([task])); return s }
let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); console.log('PASS', name); groups++ }

await check('initial read writes nothing; tick-only updates do not write, pause saves exact elapsed time', async () => {
  const f = fixture(seeded()); assert.equal(f.store.writes.length, 0); f.session.start(); await f.locks.drain(); assert.equal(f.store.writes.length, 1)
  for (let i = 0; i < 5; i++) { f.advance(1400); f.tick() }
  await f.locks.drain(); assert.equal(f.store.writes.length, 1); f.advance(125); f.session.pause(); await f.locks.drain()
  assert.equal(parsePomodoroTimer(f.store.getItem(POMODORO_STATE_KEYS.timer))?.remainingMs, 52_875); assert.equal(f.store.writes.length, 2); f.session.dispose()
})
await check('completed work adds selected task once; skip/break/expired advance add none and no nested locks', async () => {
  const f = fixture(seeded()); f.session.start(); await f.locks.drain(); f.advance(60_000); f.tick(); await f.locks.drain()
  assert.equal(f.events.filter(e => e.kind === 'completed').length, 1); assert.equal(f.state().tasks[0].completedPomodoros, 1)
  assert.equal(JSON.parse(f.store.getItem(POMODORO_STATE_KEYS.tasks)!)[0].completedPomodoros, 1)
  f.session.start(); await f.locks.drain(); f.advance(60_000); f.tick(); await f.locks.drain(); f.session.skip(); await f.locks.drain()
  assert.equal(f.state().tasks[0].completedPomodoros, 1); assert.equal(f.state().timer.completedRounds, 1); assert.equal(f.locks.maxDepth, 1); f.session.dispose()
})
await check('expired legacy and clock-gap expiry preserve no-credit semantics through persistence', async () => {
  const store = seeded(); const raw = JSON.stringify({ phase: 'work', timeLeft: 1, isRunning: true, currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, lastTickTime: 1, settings })
  store.values.set(POMODORO_STATE_KEYS.timer, raw); const f = fixture(store)
  assert.equal(f.state().timer.notice, 'restoredExpired'); assert.equal(store.writes.length, 0); f.session.advanceExpired(); await f.locks.drain()
  assert.equal(f.state().tasks[0].completedPomodoros, 0); assert.equal(f.state().timer.completedRounds, 0)
  f.advance(70_000, false); f.tick(); await f.locks.drain(); assert.equal(f.state().timer.notice, 'clockGapExpired')
  assert.equal(f.events.filter(e => e.kind === 'completed').length, 0); f.session.dispose()
})
await check('corrupt originals block only their writes; memory-only work, task edits and valid keys still function', async () => {
  const store = seeded(); store.values.set(POMODORO_STATE_KEYS.timer, '{broken'); store.values.set(POMODORO_STATE_KEYS.tasks, 'null')
  const f = fixture(store); f.session.setTasks([task]); f.session.start(); await f.locks.drain(); f.advance(60_000); f.tick(); await f.locks.drain()
  assert.equal(f.events.filter(e => e.kind === 'completed').length, 1); assert.equal(f.state().tasks[0].completedPomodoros, 1)
  assert.equal(store.getItem(POMODORO_STATE_KEYS.timer), '{broken'); assert.equal(store.getItem(POMODORO_STATE_KEYS.tasks), 'null')
  f.session.updatePreferences({ soundVolume: 5 }); await f.locks.drain(); assert.equal(JSON.parse(store.getItem(POMODORO_STATE_KEYS.settings)!).soundVolume, 5); f.session.dispose()
})
await check('two restored tabs racing completion permit only the first owner to record work', async () => {
  const store = seeded(), locks = new Locks()
  store.values.set(POMODORO_STATE_KEYS.timer, JSON.stringify({ phase: 'work', timeLeft: 60, isRunning: true, currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, lastTickTime: 1_000_000, settings }))
  const a = fixture(store, locks), b = fixture(store, locks)
  a.advance(60_000); b.advance(60_000); a.tick(); b.tick(); await locks.drain()
  assert.equal(a.events.filter(e => e.kind === 'completed').length + b.events.filter(e => e.kind === 'completed').length, 1)
  assert.equal(b.state().timer.notice, 'conflict'); assert.equal(JSON.parse(store.getItem(POMODORO_STATE_KEYS.tasks)!)[0].completedPomodoros, 1); a.session.dispose(); b.session.dispose()
})
await check('quota remains honest while memory timer runs; readback uncertainty stops without completion', async () => {
  const store = seeded(), f = fixture(store); store.quota = true; f.session.start(); await f.locks.drain()
  assert.equal(f.state().stores.timer.status, 'quota'); assert.equal(f.state().timer.isRunning, true)
  f.advance(60_000); f.tick(); await f.locks.drain(); assert.equal(f.events.filter(e => e.kind === 'completed').length, 1); f.session.dispose()
  const other = fixture(seeded()); other.session.start(); await other.locks.drain(); other.store.wasWritten = false; other.store.failReadback = true
  other.advance(60_000); other.tick(); await other.locks.drain(); assert.equal(other.state().timer.notice, 'unconfirmed'); assert.equal(other.events.length, 0); other.session.dispose()
})
await check('input changes cancel queued explicit reload and retain typed state; discard confirms exact raw', async () => {
  const f = fixture(seeded()); const reload = f.session.reload('tasks'); f.session.setTasks([{ ...task, text: 'new draft' }]); await f.locks.drain()
  assert.equal(await reload, false); assert.equal(f.state().tasks[0].text, 'new draft'); assert.equal(f.state().stores.tasks.pending, false)
  f.store.values.set(POMODORO_STATE_KEYS.timer, 'bad'); f.changed(POMODORO_STATE_KEYS.timer)
  const read = f.session.reload('timer'); await f.locks.drain(); assert.equal(await read, false); assert.equal(f.state().stores.timer.status, 'corrupt')
  f.store.values.set(POMODORO_STATE_KEYS.timer, 'new bad'); const discard = f.session.discard('timer', 'bad'); await f.locks.drain()
  assert.equal(await discard, false); assert.equal(f.store.getItem(POMODORO_STATE_KEYS.timer), 'new bad'); f.session.dispose()
})
await check('storage events stop before expiry and unmount cancels all queued saves and late callbacks', async () => {
  const f = fixture(seeded()); f.session.start(); await f.locks.drain(); const oldTick = [...f.ticks][0]
  f.store.values.set(POMODORO_STATE_KEYS.timer, 'other'); f.changed(POMODORO_STATE_KEYS.timer); f.advance(70_000); oldTick(); await f.locks.drain()
  assert.equal(f.events.length, 0); assert.equal(f.state().timer.notice, 'conflict')
  f.session.setTasks([{ ...task, text: 'unsaved after dispose' }]); const before = f.store.getItem(POMODORO_STATE_KEYS.tasks); f.session.dispose(); await f.locks.drain()
  assert.equal(f.store.getItem(POMODORO_STATE_KEYS.tasks), before); assert.equal(f.ticks.size + f.returns.size + f.checkpoints.size + f.storage.size, 0)
})
console.log(`${groups} Pomodoro browser-coordinator groups passed (controlled Storage/LockManager/lifecycle ports).`)
