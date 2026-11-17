// node scripts/check-pomodoro-goal.ts
import assert from 'node:assert/strict'
import {
  DEFAULT_POMODORO_GOAL, POMODORO_GOAL_KEY, POMODORO_STATS_KEY, isPomodoroDate, isPomodoroGoal,
  normalizePomodoroStats, parsePomodoroGoal, parsePomodoroStats, pomodoroLocalDay, pomodoroStatsCsv,
  readPomodoroValue, recentPomodoroDays, savePomodoroGoal, savePomodoroStats, withPomodoroLock,
} from '../src/utils/pomodoroGoal.ts'

class MemoryStorage {
  values = new Map<string, string>()
  failRead = false
  failWrite = false
  getItem(key: string) {
    if (this.failRead) throw new Error('SecurityError')
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('QuotaExceededError')
    this.values.set(key, value)
  }
}

const storage = new MemoryStorage()
const today = '2026-11-16'
assert.equal(parsePomodoroGoal(null), DEFAULT_POMODORO_GOAL)
for (let target = 1; target <= 20; target++) {
  const result = savePomodoroGoal(storage, storage.getItem(POMODORO_GOAL_KEY), target)
  assert.equal(result.ok, true)
  assert.equal(parsePomodoroGoal(storage.getItem(POMODORO_GOAL_KEY)), target)
}
for (const target of [0, -1, 21, 1.5, NaN, Infinity, Number.MAX_VALUE, '4', null, true]) assert.equal(isPomodoroGoal(target), false)
const beforeInvalid = storage.getItem(POMODORO_GOAL_KEY)
assert.deepEqual(savePomodoroGoal(storage, beforeInvalid, 21), { ok: false, error: 'invalid' })
assert.equal(storage.getItem(POMODORO_GOAL_KEY), beforeInvalid)
for (const raw of ['{bad', 'null', '[]', '{}', '{"version":2,"target":4}', '{"version":1,"target":"4"}', '{"version":1,"target":0}']) {
  assert.throws(() => parsePomodoroGoal(raw))
  storage.values.set(POMODORO_GOAL_KEY, raw)
  assert.deepEqual(savePomodoroGoal(storage, raw, 4), { ok: false, error: 'corrupt' })
  assert.equal(storage.getItem(POMODORO_GOAL_KEY), raw)
}

// Dates use calendar validation, including leap days, and reject future records.
for (const date of ['2024-02-29', '2026-11-16', '2000-02-29']) assert.equal(isPomodoroDate(date), true)
for (const date of ['2026-02-29', '1900-02-29', '2026-11-31', '2026-00-10', '2026-13-01', '26-11-16', '2026-1-01', '', '2026-11-16T00:00:00Z']) assert.equal(isPomodoroDate(date), false)
const duplicates = [
  { date: today, count: 2, minutes: 50 }, { date: '2026-11-15', count: 1, minutes: 10 },
  { date: today, count: 3, minutes: 45 },
]
assert.deepEqual(normalizePomodoroStats(duplicates, today), [
  { date: '2026-11-15', count: 1, minutes: 10 }, { date: today, count: 5, minutes: 95 },
])
assert.equal(duplicates.length, 3)
assert.deepEqual(parsePomodoroStats(null, today), [])
for (const value of [null, {}, [null], [{ date: '2026-11-17', count: 1, minutes: 25 }],
  [{ date: '2026-02-29', count: 1, minutes: 25 }], [{ date: today, count: -1, minutes: 25 }],
  [{ date: today, count: 1.5, minutes: 25 }], [{ date: today, count: 1, minutes: -1 }],
  [{ date: today, count: '1', minutes: 25 }], [{ date: today, count: 1, minutes: null }],
  [{ date: today, count: Number.MAX_SAFE_INTEGER, minutes: 0 }, { date: today, count: 1, minutes: 0 }],
]) assert.throws(() => normalizePomodoroStats(value, today))

// Seven daily rows retain zeros, cross month/year/leap boundaries, and aggregate each day once.
assert.deepEqual(recentPomodoroDays(duplicates, today).map(row => row.date), [
  '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', today,
])
assert.deepEqual(recentPomodoroDays(duplicates, today).map(row => row.count), [0, 0, 0, 0, 0, 1, 5])
assert.equal(recentPomodoroDays([], '2027-01-02')[0].date, '2026-12-27')
assert.ok(recentPomodoroDays([], '2024-03-02').some(row => row.date === '2024-02-29'))
assert.equal(pomodoroLocalDay(new Date(2026, 10, 16, 0, 5)), today)
const originalTimezone = process.env.TZ
process.env.TZ = 'America/New_York'
assert.deepEqual(recentPomodoroDays([], '2026-11-03').map(row => row.date), ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'])
if (originalTimezone === undefined) delete process.env.TZ
else process.env.TZ = originalTimezone

// CSV is UTF-8 BOM with CRLF, includes exactly seven rows and no arbitrary/task fields.
const csv = pomodoroStatsCsv([{ ...duplicates[0], task: '=HYPERLINK("evil")' } as typeof duplicates[number], ...duplicates.slice(1)], today, ['날짜', '완료 횟수', '완료 시간(분)'])
assert.ok(csv.startsWith('\uFEFF"날짜","완료 횟수","완료 시간(분)"\r\n'))
assert.equal(csv.trimEnd().split('\r\n').length, 8)
assert.ok(csv.includes('"2026-11-16","5","95"'))
assert.ok(csv.includes('"2026-11-10","0","0"'))
assert.ok(!csv.includes('HYPERLINK'))

// CAS, failed reads/writes and malformed statistics preserve the stored bytes.
storage.values.delete(POMODORO_GOAL_KEY)
assert.equal(savePomodoroGoal(storage, null, 6).ok, true)
assert.deepEqual(savePomodoroGoal(storage, null, 7), { ok: false, error: 'conflict' })
const beforeQuota = storage.getItem(POMODORO_GOAL_KEY)
storage.failWrite = true
assert.deepEqual(savePomodoroGoal(storage, beforeQuota, 8), { ok: false, error: 'unavailable' })
assert.equal(storage.getItem(POMODORO_GOAL_KEY), beforeQuota)
storage.failWrite = false
storage.failRead = true
assert.deepEqual(readPomodoroValue(storage, POMODORO_GOAL_KEY, parsePomodoroGoal), { ok: false, error: 'unavailable' })
storage.failRead = false
storage.values.set(POMODORO_STATS_KEY, '{broken')
assert.deepEqual(savePomodoroStats(storage, '{broken', duplicates, today), { ok: false, error: 'corrupt' })
assert.equal(storage.getItem(POMODORO_STATS_KEY), '{broken')
storage.values.delete(POMODORO_STATS_KEY)
assert.equal(savePomodoroStats(storage, null, duplicates, today).ok, true)
assert.deepEqual(parsePomodoroStats(storage.getItem(POMODORO_STATS_KEY), today), normalizePomodoroStats(duplicates, today))
const competing = { getItem: () => storage.getItem(POMODORO_GOAL_KEY), setItem: () => storage.setItem(POMODORO_GOAL_KEY, '{"version":1,"target":12}') }
assert.deepEqual(savePomodoroGoal(competing, beforeQuota, 9), { ok: false, error: 'conflict' })

// Web Locks serialize simultaneous writers; older browsers retain compare/read-back fallback.
storage.values.delete(POMODORO_GOAL_KEY)
let queue = Promise.resolve<unknown>(undefined)
const locks = { request(_key: string, action: () => unknown) { const next = queue.then(action); queue = next.catch(() => undefined); return next } } as Pick<LockManager, 'request'>
const simultaneous = await Promise.all([
  withPomodoroLock(POMODORO_GOAL_KEY, () => savePomodoroGoal(storage, null, 3), locks),
  withPomodoroLock(POMODORO_GOAL_KEY, () => savePomodoroGoal(storage, null, 7), locks),
])
assert.equal(simultaneous[0].ok, true)
assert.deepEqual(simultaneous[1], { ok: false, error: 'conflict' })
assert.equal((await withPomodoroLock(POMODORO_GOAL_KEY, () => savePomodoroGoal(storage, storage.getItem(POMODORO_GOAL_KEY), 8), {} as Pick<LockManager, 'request'>)).ok, true)

console.log('check-pomodoro-goal OK: goals, calendar/duplicates, last 7 days/DST, CSV privacy, corrupt/quota/CAS, concurrent locks and fallback')
