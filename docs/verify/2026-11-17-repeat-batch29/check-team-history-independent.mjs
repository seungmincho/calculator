import assert from 'node:assert/strict'
import { createTeamHistory, commitTeamHistory, undoTeamHistory, redoTeamHistory, createTeamRevealGuard } from '../../../src/utils/teamBoardHistory.ts'
import { createTeamResultSnapshot, createTeamResultGuard, copyTeamResultText, createTeamResultDownloads } from '../../../src/utils/teamResultActions.ts'

let passed = 0
const group = async (name, run) => { await run(); console.log(`PASS ${name}`); passed++ }
const board = id => ({ teams: [[`board-${id}`, '__proto__'], ['constructor', '가😀']], locked: [], mode: 'random', comparison: null })
const marker = value => value.teams[0][0]
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

await group('independent linear timeline oracle: 2,000 mixed edits/undo/redo/no-op and 20-transition cap', () => {
  let value = createTeamHistory(board(0)), timeline = ['board-0'], cursor = 0, serial = 0, seed = 92731
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 }
  for (let index = 0; index < 2000; index++) {
    const choice = Math.floor(random() * 6)
    if (choice <= 2) {
      const next = board(++serial)
      value = commitTeamHistory(value, next)
      timeline = [...timeline.slice(0, cursor + 1), marker(next)].slice(-21); cursor = timeline.length - 1
    } else if (choice === 3) { value = undoTeamHistory(value); cursor = Math.max(0, cursor - 1) }
    else if (choice === 4) { value = redoTeamHistory(value); cursor = Math.min(timeline.length - 1, cursor + 1) }
    else { const previous = value; value = commitTeamHistory(value, structuredClone(value.present)); assert.equal(value, previous) }
    assert.deepEqual(value.past.map(marker), timeline.slice(0, cursor))
    assert.equal(marker(value.present), timeline[cursor])
    assert.deepEqual(value.future.map(marker), timeline.slice(cursor + 1))
    assert.ok(value.past.length + value.future.length <= 20)
  }
  const empty = createTeamHistory(); assert.equal(undoTeamHistory(empty), empty); assert.equal(redoTeamHistory(empty), empty)
  assert.equal(commitTeamHistory(empty, board(7)).past.length, 0)
})

await group('deep ownership, own special keys, metadata and locked-set no-op preserve redo', () => {
  const source = board(1)
  source.locked = ['__proto__', 'constructor']
  source.comparison = { previous: [['before']], baselineSkillGap: 2, skills: Object.fromEntries([['__proto__', 5], ['constructor', 1]]), balanceLimited: true, edited: false }
  let value = createTeamHistory(source)
  source.teams[0][0] = 'mutated'; source.comparison.previous[0][0] = 'mutated'; source.comparison.skills.__proto__ = 4
  assert.equal(marker(value.present), 'board-1'); assert.equal(value.present.comparison.previous[0][0], 'before')
  assert.equal(Object.hasOwn(value.present.comparison.skills, '__proto__'), true)
  assert.equal(value.present.comparison.skills.__proto__, 5)
  assert.throws(() => { value.present.teams[0][0] = 'mutated' }, TypeError)
  value = commitTeamHistory(value, board(2)); value = undoTeamHistory(value)
  const unchanged = structuredClone(value.present); unchanged.locked = ['constructor', '__proto__', '__proto__']
  assert.equal(commitTeamHistory(value, unchanged), value); assert.equal(value.future.length, 1)
  unchanged.comparison.edited = true
  const changed = commitTeamHistory(value, unchanged); assert.equal(changed.future.length, 0)
  assert.equal(changed.past.at(-1).comparison.edited, false)
})

await group('reveal cancellation survives timer-ID reuse and queued old callbacks', () => {
  const guard = createTeamRevealGuard()
  const first = guard.start(); assert.equal(guard.attach(first.generation, 0), true)
  const second = guard.start(); assert.equal(second.previousTimer, 0)
  assert.equal(guard.attach(first.generation, 0), false)
  assert.equal(guard.attach(second.generation, 0), true)
  assert.equal(guard.owns(first.generation, 0), false); assert.equal(guard.finish(first.generation, 0), null)
  assert.equal(guard.owns(second.generation, 0), true)
  assert.equal(guard.finish(second.generation, 1), null)
  assert.equal(guard.invalidate(), 0); assert.equal(guard.finish(second.generation, 0), null)
  const third = guard.start(), timer = {}
  assert.equal(guard.attach(third.generation, timer), true)
  assert.equal(guard.attach(third.generation, {}), false)
  assert.equal(guard.finish(third.generation, timer), timer); assert.equal(guard.finish(third.generation, timer), null)
})

await group('clipboard late native resolve/reject never changes a newer request or calls stale fallback', async () => {
  const guard = createTeamResultGuard(), pending = deferred(); let fallback = 0
  const old = guard.begin()
  const copying = copyTeamResultText('old', () => guard.isCurrent(old), { writeText: () => pending.promise, fallback: () => { fallback++; return true } })
  const next = guard.begin(); pending.reject(new Error('denied'))
  assert.equal(await copying, 'stale'); assert.equal(fallback, 0); assert.equal(guard.isCurrent(next), true)
  const success = deferred(), token = guard.begin()
  const staleSuccess = copyTeamResultText('old success', () => guard.isCurrent(token), { writeText: () => success.promise, fallback: () => true })
  guard.invalidate(); success.resolve(); assert.equal(await staleSuccess, 'stale')
  assert.equal(await copyTeamResultText('current', () => true, { fallback: () => false }), 'failed')
  assert.equal(await copyTeamResultText('current', () => true, { fallback: () => 'truthy' }), 'failed')
  assert.equal(await copyTeamResultText('current', () => true, { fallback: () => { throw new Error('blocked') } }), 'failed')
  assert.equal(await copyTeamResultText('current', () => true, { writeText: async () => { throw new Error('denied') }, fallback: text => text === 'current' }), 'copied')
})

await group('balanced/current-skill export matches independent literal text and immutable UTF-8 snapshot', async () => {
  const source = { teams: [['__proto__', 'constructor'], ['가😀']], mode: 'balanced' }
  const skills = Object.fromEntries([['__proto__', 5], ['constructor', 1], ['가😀', 2]])
  const text = '팀 1 (2명 · 합계 6)\n__proto__(5), constructor(1)\n\n팀 2 (1명 · 합계 2)\n가😀(2)'
  const snapshot = createTeamResultSnapshot(source, skills, { teamLabel: '팀', memberUnit: '명', skillSum: sum => `합계 ${sum}` })
  assert.equal(snapshot.text, text); assert.equal(snapshot.filename, 'team-divider.txt')
  skills.__proto__ = 1; source.teams[0].push('new'); assert.equal(snapshot.text, text)
  const blobs = [], downloads = [], revoked = [], timers = []
  const runner = createTeamResultDownloads({ createUrl: blob => { blobs.push(blob); return `blob:${blobs.length}` }, revokeUrl: url => revoked.push(url), download: (url, name) => downloads.push([url, name]), schedule: callback => { timers.push(callback); return timers.length }, cancel() {} })
  assert.equal(runner.download(snapshot, () => true), 'started')
  assert.deepEqual(downloads, [['blob:1', 'team-divider.txt']])
  const bytes = new Uint8Array(await blobs[0].arrayBuffer())
  assert.deepEqual(bytes, new TextEncoder().encode(text)); assert.notDeepEqual([...bytes.slice(0, 3)], [239, 187, 191])
  runner.dispose(); timers[0](); assert.deepEqual(revoked, ['blob:1'])
  assert.equal(runner.download(snapshot, () => true), 'stale'); assert.equal(blobs.length, 1)
})

await group('download preflight/current-generation failure releases exactly once and creates no stale save', () => {
  const snapshot = createTeamResultSnapshot(board(1), {}, { teamLabel: 'Team', memberUnit: ' members', skillSum: sum => String(sum) })
  let current = true, created = 0, downloaded = 0; const revoked = []
  const runner = createTeamResultDownloads({ createUrl() { created++; current = false; return 'blob:late' }, revokeUrl: value => revoked.push(value), download() { downloaded++ }, schedule: () => 1, cancel() {} })
  assert.equal(runner.download(snapshot, () => false), 'stale'); assert.equal(created, 0)
  assert.equal(runner.download(snapshot, () => current), 'stale'); assert.equal(created, 1); assert.equal(downloaded, 0)
  runner.dispose(); assert.deepEqual(revoked, ['blob:late'])
})

console.log(`Team history/actions independent: ${passed} groups passed; actual parent/browser integration is separate.`)
