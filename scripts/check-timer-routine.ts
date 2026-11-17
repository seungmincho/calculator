import assert from 'node:assert/strict'
import {
  TIMER_ROUTINES_KEY, ROUTINE_LIMITS, advanceRoutine, appendRoutineProfile, isTimerRoutine, parseRoutineStore,
  pauseRoutine, readRoutineStore, resumeRoutine, routineStageRemaining, routineTotalRemaining,
  routineTotalSeconds, skipRoutine, startRoutine, withRoutineStorageLock, writeRoutineStore,
  type RoutineStore, type TimerRoutineConfig,
} from '../src/utils/timerRoutine.ts'

let checks = 0
function check(name: string, test: () => void) { test(); checks++; console.log(`PASS ${name}`) }
const config: TimerRoutineConfig = { name: '집중과 휴식', stages: [{ name: '집중', seconds: 2 }, { name: '휴식', seconds: 3 }], repeats: 2 }
const getRun = () => startRoutine(config, 1000)!

check('default snapshots, exact boundaries, repeat rollover and one final transition', () => {
  const run = getRun()
  assert.equal(run.deadline, 3000)
  assert.equal(routineTotalSeconds(config), 10)
  assert.equal(routineTotalRemaining(run, 1000), 10000)
  assert.equal(routineStageRemaining(run, 2500), 500)
  assert.equal(advanceRoutine(run, 2999).crossed, 0)
  const first = advanceRoutine(run, 3000)
  assert.equal(first.crossed, 1); assert.equal(first.run.cursor, 1); assert.equal(first.run.deadline, 6000)
  const nextRound = advanceRoutine(first.run, 6000)
  assert.equal(nextRound.run.cursor, 2); assert.equal(nextRound.run.deadline, 8000)
  const finished = advanceRoutine(run, 11000)
  assert.equal(finished.crossed, 4); assert.equal(finished.run.status, 'done')
  assert.equal(routineTotalRemaining(finished.run, 99000), 0)
  assert.deepEqual(advanceRoutine(finished.run, 99000), { run: finished.run, crossed: 0 })
  assert.equal(getRun().cursor, 0, 'restarting creates a new run')
  config.stages[0].seconds = 5
  assert.equal(run.routine.stages[0].seconds, 2, 'a run owns an immutable settings snapshot')
  config.stages[0].seconds = 2
})

check('pause freezes both remaining values, resume shifts only the deadline', () => {
  const paused = pauseRoutine(getRun(), 2500)
  assert.equal(paused.status, 'paused'); assert.equal(paused.remainingMs, 500)
  assert.equal(routineStageRemaining(paused, 999999), 500)
  assert.equal(routineTotalRemaining(paused, 999999), 8500)
  assert.deepEqual(advanceRoutine(paused, 999999), { run: paused, crossed: 0 })
  const resumed = resumeRoutine(paused, 100000)
  assert.equal(resumed.deadline, 100500)
  assert.equal(advanceRoutine(resumed, 100500).run.cursor, 1)
  const latePause = pauseRoutine(getRun(), 6500)
  assert.equal(latePause.cursor, 2); assert.equal(latePause.remainingMs, 1500)
  assert.equal(pauseRoutine(getRun(), 11000).status, 'done')
})

check('skip starts one new stage, preserves pause and ends without duplicate advancement', () => {
  const next = skipRoutine(getRun(), 1500)
  assert.equal(next.cursor, 1); assert.equal(next.deadline, 4500)
  assert.equal(routineTotalRemaining(next, 1500), 8000)
  const paused = skipRoutine(pauseRoutine(getRun(), 1500), 900000)
  assert.equal(paused.status, 'paused'); assert.equal(paused.remainingMs, 3000); assert.equal(paused.cursor, 1)
  const last = advanceRoutine(getRun(), 8000).run
  const finished = skipRoutine(last, 8500)
  assert.equal(finished.status, 'done'); assert.equal(advanceRoutine(finished, 999999).crossed, 0)
  assert.equal(skipRoutine(finished, 999999), finished)
  assert.equal(skipRoutine(getRun(), 3000).cursor, 2, 'a boundary already elapsed before the click is caught up first')
})

check('background catchup handles 300 seconds and all 120 possible boundaries', () => {
  const full: TimerRoutineConfig = { name: '최대 반복', stages: Array.from({ length: 12 }, (_, i) => ({ name: `단계 ${i + 1}`, seconds: 1 })), repeats: 10 }
  const run = startRoutine(full, 1000)!
  const resumed = advanceRoutine(run, 301000)
  assert.equal(resumed.run.status, 'done'); assert.equal(resumed.crossed, 120)
  assert.equal(advanceRoutine(resumed.run, 601000).crossed, 0)
  const uneven = { name: '백그라운드', stages: [{ name: '운동', seconds: 100 }, { name: '휴식', seconds: 200 }], repeats: 3 }
  const current = advanceRoutine(startRoutine(uneven, 1000)!, 451000)
  assert.equal(current.run.cursor, 3); assert.equal(current.run.deadline, 601000)
  assert.equal(routineTotalRemaining(current.run, 451000), 450000)
})

check('all configured ranges, total duration cap and malformed configuration', () => {
  assert.equal(isTimerRoutine({ name: '하루', stages: Array.from({ length: 12 }, (_, i) => ({ name: `${i}`, seconds: 7200 })), repeats: 1 }), true)
  assert.equal(isTimerRoutine({ name: '하루', stages: Array.from({ length: 12 }, (_, i) => ({ name: `${i}`, seconds: 720 })), repeats: 10 }), true)
  const invalid = [
    null, {}, { ...config, name: '' }, { ...config, name: ' '.repeat(4) }, { ...config, name: 'a'.repeat(41) },
    { ...config, stages: [] }, { ...config, stages: Array.from({ length: 13 }, () => ({ name: '운동', seconds: 1 })) },
    ...[0, -1, 7201, 1.2, Infinity, NaN, '1'].map(seconds => ({ ...config, stages: [{ name: '운동', seconds }] })),
    ...[0, 11, 1.2, '2'].map(repeats => ({ ...config, repeats })),
    { ...config, stages: [{ name: 'a'.repeat(41), seconds: 1 }] },
    { ...config, stages: [{ name: ' ', seconds: 1 }] },
    { ...config, stages: [{ name: 'a\nb', seconds: 1 }] },
    { name: '초과', stages: [{ name: '운동', seconds: 7200 }, { name: '휴식', seconds: 7200 }], repeats: 7 },
  ]
  for (const value of invalid) assert.equal(isTimerRoutine(value), false)
  assert.equal(startRoutine(config, NaN), null)
  const run = getRun()
  assert.equal(pauseRoutine(run, NaN), run); assert.equal(skipRoutine(run, NaN), run)
  assert.equal(resumeRoutine(pauseRoutine(run, 1200), Infinity).status, 'paused')
})

check('independent flattened schedule agrees across 120 generated routines', () => {
  for (let seed = 1; seed <= 120; seed++) {
    const routine = { name: `예시 ${seed}`, stages: Array.from({ length: seed % 12 + 1 }, (_, index) => ({ name: `단계 ${index}`, seconds: (seed + index * 7) % 59 + 1 })), repeats: seed % 10 + 1 }
    const durations = Array.from({ length: routine.repeats }, () => routine.stages.map(stage => stage.seconds * 1000)).flat()
    const elapsed = (seed * 7137) % (durations.reduce((sum, duration) => sum + duration, 0) + 1000)
    let expectedCursor = 0, consumed = 0
    for (const duration of durations) { if (consumed + duration > elapsed) break; consumed += duration; expectedCursor++ }
    const run = advanceRoutine(startRoutine(routine, 5000)!, 5000 + elapsed).run
    assert.equal(run.cursor, expectedCursor)
    assert.equal(routineTotalRemaining(run, 5000 + elapsed), Math.max(0, durations.reduce((sum, duration) => sum + duration, 0) - elapsed))
  }
})

let stored: string | null = null
const storage = { getItem: (key: string) => { assert.equal(key, TIMER_ROUTINES_KEY); return stored }, setItem: (key: string, value: string) => { assert.equal(key, TIMER_ROUTINES_KEY); stored = value } }
const empty: RoutineStore = { version: 1, revision: 'empty', profiles: [] }
const timestamp = '2026-11-16T09:00:00.000Z'
const saved = appendRoutineProfile(empty, config, 'one', timestamp)

check('valid storage roundtrip stores settings only and rejects duplicate names/IDs', () => {
  assert.deepEqual(readRoutineStore(storage), { ok: true, raw: null, store: empty })
  const result = writeRoutineStore(storage, null, saved)
  assert.equal(result.ok, true)
  const restored = readRoutineStore(storage)
  assert.equal(restored.ok, true)
  if (restored.ok) assert.deepEqual(restored.store.profiles[0].routine, config)
  assert.ok(!stored?.includes('deadline') && !stored?.includes('remainingMs'))
  assert.throws(() => appendRoutineProfile(saved, config, 'two', timestamp), /duplicate/)
  assert.throws(() => appendRoutineProfile(saved, { ...config, name: '새 이름' }, 'one', timestamp), /invalid/)
  assert.deepEqual(parseRoutineStore(JSON.stringify({ ...saved, profiles: [saved.profiles[0], saved.profiles[0]] })), { ok: false, error: 'corrupt' })
})

check('corrupt/unsupported/oversized stores preserve raw data and block writing', () => {
  for (const raw of ['{bad', '{}', JSON.stringify({ ...saved, version: 2 }), 'a'.repeat(100001), JSON.stringify({ ...saved, profiles: [{ ...saved.profiles[0], routine: { ...config, repeats: 20 } }] })]) {
    stored = raw
    assert.equal(readRoutineStore(storage).ok, false)
    assert.equal(writeRoutineStore(storage, raw, empty).ok, false)
    assert.equal(stored, raw)
  }
  assert.deepEqual(parseRoutineStore(JSON.stringify({ ...saved, version: 2 })), { ok: false, error: 'unsupported' })
})

check('compare-and-set rejects additions, removal, quota, unavailable storage and failed readback', () => {
  const savedRaw = JSON.stringify(saved)
  stored = savedRaw
  assert.deepEqual(writeRoutineStore(storage, null, saved), { ok: false, error: 'conflict' })
  assert.equal(stored, savedRaw)
  stored = null
  assert.deepEqual(writeRoutineStore(storage, savedRaw, empty), { ok: false, error: 'conflict' })
  const quota = new Error('full'); quota.name = 'QuotaExceededError'
  assert.deepEqual(writeRoutineStore({ getItem: () => null, setItem: () => { throw quota } }, null, saved), { ok: false, error: 'quota' })
  assert.deepEqual(readRoutineStore({ getItem: () => { throw new Error('denied') } }), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeRoutineStore({ getItem: () => { throw new Error('denied') }, setItem: () => {} }, null, saved), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeRoutineStore({ getItem: () => null, setItem: () => {} }, null, saved), { ok: false, error: 'conflict' })
})

check('ten-profile limit and delete retain remaining configurations', () => {
  let store = empty
  for (let index = 0; index < ROUTINE_LIMITS.profiles; index++) store = appendRoutineProfile(store, { ...config, name: `루틴 ${index}` }, `id-${index}`, timestamp)
  assert.equal(store.profiles.length, 10)
  assert.throws(() => appendRoutineProfile(store, { ...config, name: '초과' }, 'over', timestamp), /limit/)
  stored = JSON.stringify(store)
  const next = { ...store, revision: 'delete', profiles: store.profiles.filter(profile => profile.id !== 'id-4') }
  assert.equal(writeRoutineStore(storage, stored, next).ok, true)
  assert.deepEqual(next.profiles.map(profile => profile.id), ['id-0', 'id-1', 'id-2', 'id-3', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9'])
})

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  assert.equal(await withRoutineStorageLock(() => 'fallback'), 'fallback')
  let locks = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key: string, options: { mode: string }, action: () => string) => {
    assert.equal(key, TIMER_ROUTINES_KEY); assert.equal(options.mode, 'exclusive'); locks++; return action()
  } } } })
  assert.equal(await withRoutineStorageLock(() => 'locked'), 'locked'); assert.equal(locks, 1)
  checks++; console.log('PASS Web Locks and checked legacy fallback')
} finally {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
  else Reflect.deleteProperty(globalThis, 'navigator')
}

console.log(`Timer routine: ${checks} groups, including 120 independent schedule cases, passed`)
