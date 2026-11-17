import assert from 'node:assert/strict'
import { cloneTeamSnapshot, commitTeamHistory, createTeamHistory, createTeamRevealGuard, redoTeamHistory, sameTeamSnapshot, TEAM_HISTORY_LIMIT, undoTeamHistory, type TeamEditSnapshot } from '../src/utils/teamBoardHistory.ts'
import { copyTeamResultText, createTeamResultDownloads, createTeamResultGuard, createTeamResultSnapshot, formatTeamResult, TEAM_RESULT_FILENAME, type TeamDownloadPorts } from '../src/utils/teamResultActions.ts'

let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (cause: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const snapshot = (id: number): TeamEditSnapshot => ({ teams: [[`A${id}`, 'B'], ['C', 'D']], locked: ['B'], mode: 'balanced', comparison: { previous: [['B', `A${id}`], ['D', 'C']], baselineSkillGap: id, skills: Object.fromEntries([['B', 5], ['__proto__', 4]]), balanceLimited: id % 2 === 1, edited: false } })
const idOf = (board: TeamEditSnapshot | null) => board?.comparison?.baselineSkillGap

await check('Empty/first/shared/captain seeding has no transition and explicit reset drops both directions', () => {
  let state = createTeamHistory()
  assert.equal(state.present, null); assert.equal(undoTeamHistory(state), state); assert.equal(redoTeamHistory(state), state)
  state = commitTeamHistory(state, snapshot(1)); assert.equal(state.past.length, 0)
  state = commitTeamHistory(state, snapshot(2)); state = undoTeamHistory(state)
  assert.equal(state.future.length, 1)
  const seeded = createTeamHistory({ ...snapshot(3), mode: 'captain' })
  assert.equal(seeded.present?.mode, 'captain'); assert.equal(seeded.past.length + seeded.future.length, 0)
  assert.deepEqual(createTeamHistory(), { past: [], present: null, future: [] })
})

await check('Twenty transitions are shared across undo/redo and branching keeps only the nearest history', () => {
  let state = createTeamHistory(snapshot(0))
  for (let id = 1; id <= 30; id++) state = commitTeamHistory(state, snapshot(id))
  assert.equal(state.past.length, TEAM_HISTORY_LIMIT)
  for (let count = 0; count < 20; count++) {
    state = undoTeamHistory(state)
    assert.equal(idOf(state.present), 29 - count); assert.equal(state.past.length + state.future.length, 20)
  }
  assert.equal(idOf(state.present), 10); assert.equal(undoTeamHistory(state), state)
  for (let count = 0; count < 20; count++) { state = redoTeamHistory(state); assert.equal(idOf(state.present), 11 + count); assert.equal(state.past.length + state.future.length, 20) }
  assert.equal(redoTeamHistory(state), state)
  state = undoTeamHistory(undoTeamHistory(state)); state = commitTeamHistory(state, snapshot(100))
  assert.equal(state.future.length, 0); assert.equal(state.past.length, 19); assert.equal(idOf(undoTeamHistory(state).present), 28)
})

await check('Independent timeline/cursor oracle matches 500 deterministic mixed actions without growing above 20', () => {
  let state = createTeamHistory(snapshot(0)), timeline = [0], cursor = 0, seed = 37, nextId = 1
  for (let step = 0; step < 500; step++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const action = (seed >>> 16) % 4
    if (action === 0) { state = undoTeamHistory(state); cursor = Math.max(0, cursor - 1) }
    else if (action === 1) { state = redoTeamHistory(state); cursor = Math.min(timeline.length - 1, cursor + 1) }
    else if (action === 2) {
      state = commitTeamHistory(state, snapshot(nextId)); timeline = [...timeline.slice(0, cursor + 1), nextId++].slice(-21); cursor = timeline.length - 1
    } else { const before = state; state = commitTeamHistory(state, snapshot(timeline[cursor])); assert.equal(state, before) }
    assert.equal(idOf(state.present), timeline[cursor]); assert.equal(state.past.length, cursor); assert.equal(state.future.length, timeline.length - cursor - 1)
    assert.ok(state.past.length + state.future.length <= 20)
  }
})

await check('Deep immutable capture separates all source arrays/comparison and retains safe own-name skills', () => {
  const source = { teams: [['A', 'B'], ['C']], locked: ['B'], mode: 'balanced' as const, comparison: { previous: [['B', 'A'], ['C']], baselineSkillGap: 1, skills: Object.fromEntries([['__proto__', 5], ['A', 2]]), balanceLimited: false, edited: false } }
  const captured = cloneTeamSnapshot(source), frozenText = JSON.stringify(captured)
  source.teams[0][0] = 'changed'; source.locked[0] = 'changed'; source.comparison.previous[0][0] = 'changed'; source.comparison.skills.A = 4
  assert.equal(JSON.stringify(captured), frozenText); assert.equal(captured.comparison?.skills.__proto__, 5)
  for (const value of [captured, captured.teams, captured.teams[0], captured.locked, captured.comparison, captured.comparison?.previous, captured.comparison?.previous[0], captured.comparison?.skills]) assert.ok(Object.isFrozen(value))
  assert.throws(() => { (captured.teams[0] as string[]).push('forbidden') }, TypeError)
  const state = commitTeamHistory(createTeamHistory(captured), snapshot(2)), restored = undoTeamHistory(state)
  assert.notEqual(restored.present, state.past[0]); assert.notEqual(restored.future[0], state.present)
  assert.ok(Object.isFrozen(restored.past)); assert.ok(Object.isFrozen(restored.future)); assert.equal(JSON.stringify(restored.present), frozenText)
})

await check('No-op lock-set/skill-key order preserves redo; result mode, order and every comparison field count as edits', () => {
  const original: TeamEditSnapshot = { ...snapshot(1), locked: ['B', 'C'] }
  let state = undoTeamHistory(commitTeamHistory(createTeamHistory(original), snapshot(2)))
  const reordered: TeamEditSnapshot = { ...original, locked: ['C', 'B', 'B'], comparison: { ...original.comparison!, skills: Object.fromEntries([['__proto__', 4], ['B', 5]]) } }
  assert.equal(sameTeamSnapshot(original, reordered), true); assert.equal(commitTeamHistory(state, reordered), state); assert.equal(state.future.length, 1)
  const variants: TeamEditSnapshot[] = [
    { ...original, mode: 'random' }, { ...original, teams: [['B', 'A1'], ['C', 'D']] }, { ...original, locked: ['B'] }, { ...original, comparison: null },
    ...[{ baselineSkillGap: null }, { balanceLimited: false }, { edited: true }, { skills: { B: 4 } }, { previous: [['A1', 'B'], ['D', 'C']] }].map(change => ({ ...original, comparison: { ...original.comparison!, ...change } })),
  ]
  for (const variant of variants) { const next = commitTeamHistory(state, variant); assert.notEqual(next, state); assert.equal(next.future.length, 0) }
  state = redoTeamHistory(state); assert.equal(idOf(state.present), 2)
})

await check('History schema excludes input settings and result formatting reads separate current skills after undo', () => {
  const before = createTeamHistory(snapshot(1)), after = commitTeamHistory(before, snapshot(2)), restored = undoTeamHistory(after)
  const currentSkills = { B: 1 }
  assert.equal(restored.present?.mode, 'balanced'); assert.equal(restored.present?.comparison?.skills.B, 5)
  const currentText = formatTeamResult(restored.present!, currentSkills, { teamLabel: 'Team', memberUnit: ' people', skillSum: sum => `sum ${sum}` })
  assert.ok(currentText.includes('sum 4')); assert.ok(currentText.includes('B(1)'))
  assert.deepEqual(Object.keys(restored.present!).sort(), ['comparison', 'locked', 'mode', 'teams'])
  assert.equal(sameTeamSnapshot(restored.present!, before.present!), true)
  assert.equal(idOf(redoTeamHistory(restored).present), 2)
})

await check('Reveal generation and owned timer reject old callbacks, reused IDs and foreign completion', () => {
  const guard = createTeamRevealGuard<number>(), first = guard.start()
  assert.equal(first.previousTimer, null); assert.equal(guard.attach(first.generation, 0), true)
  assert.equal(guard.attach(first.generation, 9), false); assert.equal(guard.owns(first.generation, 0), true)
  const second = guard.start(); assert.equal(second.previousTimer, 0)
  assert.equal(guard.attach(first.generation, 5), false); assert.equal(guard.attach(second.generation, 0), true)
  assert.equal(guard.finish(first.generation, 0), null); assert.equal(guard.finish(second.generation, 99), null)
  assert.equal(guard.owns(second.generation, 0), true); assert.equal(guard.finish(second.generation, 0), 0)
  assert.equal(guard.owns(second.generation, 0), false); assert.equal(guard.attach(second.generation, 1), false)
  const third = guard.start(); guard.attach(third.generation, 2); assert.equal(guard.invalidate(), 2)
  assert.equal(guard.finish(third.generation, 2), null); assert.equal(guard.invalidate(), null)
})

const labels = { teamLabel: '팀', memberUnit: '명', skillSum: (sum: number) => `실력 합계 ${sum}` }
await check('Independent existing text format preserves members/order/Unicode and only balanced adds current ratings', () => {
  const board = { teams: [['가, 나', '__proto__'], ['😀', '줄\n이름']], mode: 'random' as const }
  const skills = Object.fromEntries([['가, 나', 1], ['__proto__', 5], ['😀', 2]])
  const plain = '팀 1 (2명)\n가, 나, __proto__\n\n팀 2 (2명)\n😀, 줄\n이름'
  assert.equal(formatTeamResult(board, skills, labels), plain)
  assert.equal(formatTeamResult({ ...board, mode: 'captain' }, skills, labels), plain)
  assert.equal(formatTeamResult({ ...board, mode: 'balanced' }, skills, labels), '팀 1 (2명 · 실력 합계 6)\n가, 나(1), __proto__(5)\n\n팀 2 (2명 · 실력 합계 5)\n😀(2), 줄\n이름(3)')
  const snapshot = createTeamResultSnapshot(board, skills, labels)
  board.teams[0][0] = 'edited'; skills['__proto__'] = 1
  assert.equal(snapshot.text, plain); assert.equal(snapshot.filename, TEAM_RESULT_FILENAME); assert.ok(Object.isFrozen(snapshot))
  assert.equal(formatTeamResult({ teams: [], mode: 'random' }, {}, labels), '')
})

await check('Native success/legacy true are copied; false/errors stay failed and stale requests perform no fallback', async () => {
  for (const success of [true, false]) assert.equal(await copyTeamResultText('teams', () => true, { fallback: () => success }), success ? 'copied' : 'failed')
  assert.equal(await copyTeamResultText('teams', () => true, { writeText: async () => {}, fallback: () => { throw new Error('must not fallback') } }), 'copied')
  assert.equal(await copyTeamResultText('teams', () => true, { writeText: async () => { throw new Error('denied') }, fallback: () => false }), 'failed')
  assert.equal(await copyTeamResultText('teams', () => true, { fallback: () => { throw new Error('denied') } }), 'failed')
  for (const reject of [false, true]) {
    const guard = createTeamResultGuard(), token = guard.begin(), task = deferred<void>(); let fallback = 0
    const pending = copyTeamResultText('old', () => guard.isCurrent(token), { writeText: () => task.promise, fallback: () => { fallback++; return true } })
    guard.invalidate(); if (reject) task.reject(new Error('late')); else task.resolve()
    assert.equal(await pending, 'stale'); assert.equal(fallback, 0)
  }
  const guard = createTeamResultGuard(), first = guard.begin(), latest = guard.begin()
  assert.equal(guard.isCurrent(first), false); assert.equal(guard.isCurrent(latest), true)
  let writes = 0
  assert.equal(await copyTeamResultText('old', () => false, { fallback: () => { writes++; return true } }), 'stale'); assert.equal(writes, 0)
})

function downloadPorts() {
  const blobs = new Map<string, Blob>(), revoked: string[] = [], calls: { url: string; name: string }[] = [], tasks = new Map<number, () => void>()
  let sequence = 0, timer = 0
  const ports: TeamDownloadPorts = {
    createUrl(blob) { const url = `blob:team-${++sequence}`; blobs.set(url, blob); return url },
    revokeUrl(url) { revoked.push(url) }, download(url, name) { calls.push({ url, name }) },
    schedule(callback, delay) { assert.equal(delay, 1000); tasks.set(++timer, callback); return timer }, cancel(id) { tasks.delete(id as number) },
  }
  return { ports, blobs, revoked, calls, tasks }
}

await check('TXT uses exact click snapshot UTF-8 bytes and fixed filename; each temporary URL is released once', async () => {
  const io = downloadPorts(), downloads = createTeamResultDownloads(io.ports), snapshot = createTeamResultSnapshot({ teams: [['가', '😀'], ['나']], mode: 'random' }, {}, labels)
  assert.equal(downloads.download(snapshot, () => true), 'started')
  const call = io.calls[0], blob = io.blobs.get(call.url)!
  assert.equal(call.name, 'team-divider.txt'); assert.equal(blob.type, 'text/plain;charset=utf-8')
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new TextEncoder().encode(snapshot.text))
  assert.equal(await blob.text(), snapshot.text); assert.notEqual(new Uint8Array(await blob.arrayBuffer())[0], 0xef)
  const callback = [...io.tasks.values()][0]; callback(); callback(); downloads.dispose(); assert.deepEqual(io.revoked, [call.url])
  assert.equal(downloads.download(snapshot, () => true), 'stale'); assert.equal(io.calls.length, 1)
})

await check('Download stale/create/click/schedule failures and disposal during host calls preserve cleanup ownership', () => {
  const snapshot = createTeamResultSnapshot({ teams: [['A'], ['B']], mode: 'random' }, {}, labels)
  for (const stage of ['stale', 'create', 'click', 'schedule', 'dispose']) {
    const io = downloadPorts()
    if (stage === 'create') io.ports.createUrl = () => { throw new Error('URL unavailable') }
    if (stage === 'click') io.ports.download = () => { throw new Error('click unavailable') }
    if (stage === 'schedule') io.ports.schedule = () => { throw new Error('timer unavailable') }
    if (stage === 'dispose') io.ports.download = () => downloads.dispose()
    const downloads = createTeamResultDownloads(io.ports)
    assert.equal(downloads.download(snapshot, () => stage !== 'stale'), stage === 'stale' ? 'stale' : stage === 'dispose' ? 'started' : 'failed')
    downloads.dispose(); assert.equal(io.revoked.length, io.blobs.size); assert.equal(io.tasks.size, 0)
  }
  const io = downloadPorts(); let current = true
  const create = io.ports.createUrl
  io.ports.createUrl = blob => { const url = create(blob); current = false; return url }
  const downloads = createTeamResultDownloads(io.ports)
  assert.equal(downloads.download(snapshot, () => current), 'stale'); assert.equal(io.calls.length, 0); assert.equal(io.revoked.length, 1)
})

await check('Several TXT downloads keep independent snapshots and unmount cancels all pending releases', async () => {
  const io = downloadPorts(), downloads = createTeamResultDownloads(io.ports)
  for (let index = 0; index < 3; index++) {
    const snapshot = createTeamResultSnapshot({ teams: [[`A${index}`], ['B']], mode: 'random' }, {}, labels)
    assert.equal(downloads.download(snapshot, () => true), 'started')
    assert.equal(await io.blobs.get(io.calls[index].url)!.text(), snapshot.text)
  }
  const staleCallbacks = [...io.tasks.values()]
  downloads.dispose(); staleCallbacks.forEach(callback => callback()); downloads.dispose()
  assert.equal(io.tasks.size, 0); assert.equal(io.revoked.length, 3); assert.equal(new Set(io.revoked).size, 3)
})

console.log(`Team history/actions: ${groups} groups passed (pure transitions, independent timeline/text/Blob; clipboard/timers are controlled ports)`)
