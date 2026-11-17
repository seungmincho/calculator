import assert from 'node:assert/strict'
import { canExportOrder, canRevealAll, canRevealNext, createOrderRevealController, isOrderBusy, type OrderRevealSnapshot } from '../src/utils/orderReveal.ts'
import { copyDecisionResult, createDecisionResultDownloads, createDecisionResultGuard, createOrderResultSnapshot, createRouletteResultSnapshot, ORDER_RESULT_FILENAME, type DecisionDownloadPorts } from '../src/utils/decisionResultActions.ts'

let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (cause: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function setup(onChange?: (state: OrderRevealSnapshot) => void) {
  const jobs: { id: number; callback: () => void; delay: number; cancelled: boolean; fired: boolean }[] = []
  let draws = 0, nextId = 0
  const controller = createOrderRevealController({
    shuffle(items) { draws++; return [...items].reverse() }, onChange,
    schedule(callback, delay) { const id = nextId++ % 2; jobs.push({ id, callback, delay, cancelled: false, fired: false }); return id },
    cancel(id) { const job = jobs.findLast(item => item.id === id && !item.fired && !item.cancelled); if (job) job.cancelled = true },
  })
  const active = () => jobs.filter(job => !job.cancelled && !job.fired)
  const tick = () => { const job = active()[0]; assert.ok(job, 'Expected an owned timer'); job.fired = true; job.callback() }
  return { controller, jobs, active, tick, draws: () => draws }
}
const line = (rank: number, name: string) => `${rank}. ${name}`
function complete(names = ['가', 'A', '가']) {
  const fixture = setup(); fixture.controller.setMode('manual'); fixture.controller.start(names); fixture.controller.revealAll()
  return fixture
}

await check('One immutable permutation preserves duplicate entries and automatic count is monotone', () => {
  const f = setup(), names = ['가', '가', 'B', '😀']
  assert.equal(f.controller.getSnapshot().mode, 'auto'); assert.equal(f.controller.start(['one']), false)
  assert.equal(f.controller.start(names), true); names[0] = 'mutated'
  const captured = f.controller.getSnapshot(), permutation = ['😀', 'B', '가', '가']
  assert.equal(f.draws(), 1); assert.deepEqual(captured.items, permutation); assert.ok(Object.isFrozen(captured.items)); assert.ok(Object.isFrozen(captured))
  assert.equal(f.controller.start(['new', 'draw']), false); assert.equal(f.active().length, 1); assert.equal(f.active()[0].delay, 400)
  assert.equal(canExportOrder(captured), false); assert.equal(canRevealAll(captured), false)
  f.tick(); assert.equal(f.controller.getSnapshot().revealedCount, 0); assert.equal(f.active()[0].delay, 500)
  for (let count = 1; count <= 4; count++) { f.tick(); assert.equal(f.controller.getSnapshot().revealedCount, count); assert.deepEqual(f.controller.getSnapshot().items, permutation) }
  assert.equal(canExportOrder(f.controller.getSnapshot()), true); assert.equal(f.active().length, 0); assert.equal(f.draws(), 1)
})

await check('Mode changes preserve draw and progress; manual shuffling can reveal one/all without a timer', () => {
  const f = setup(); f.controller.start(['A', 'B', 'C']); f.tick(); f.tick()
  const before = f.controller.getSnapshot(), oldJob = f.active()[0]
  f.controller.setMode('manual'); oldJob.callback()
  assert.equal(f.active().length, 0); assert.equal(f.controller.getSnapshot().revealedCount, 1)
  assert.equal(canRevealNext(f.controller.getSnapshot()), true); f.controller.revealNext(); f.controller.setMode('auto')
  assert.equal(f.active()[0].delay, 500); f.tick(); assert.equal(f.controller.getSnapshot().phase, 'complete')
  f.controller.setMode('manual'); f.controller.setMode('auto')
  assert.equal(f.draws(), 1); assert.equal(f.controller.getSnapshot().runId, before.runId); assert.equal(f.controller.getSnapshot().items, before.items)
  assert.equal(f.active().length, 0); assert.equal(f.controller.revealNext(), false)
  f.controller.reset(); f.controller.setMode('manual'); f.controller.start(['A', 'B'])
  assert.equal(f.active().length, 0); assert.equal(f.controller.getSnapshot().phase, 'shuffling'); assert.equal(canRevealAll(f.controller.getSnapshot()), true)
  f.controller.revealNext(); assert.equal(f.controller.getSnapshot().revealedCount, 1); f.controller.revealAll(); assert.equal(canExportOrder(f.controller.getSnapshot()), true)
})

await check('Hidden tabs preserve phase/permutation/count and return schedules only a fresh automatic timer', () => {
  for (const phase of ['shuffling', 'revealing'] as const) {
    const f = setup(); f.controller.start(['A', 'B', 'C']); if (phase === 'revealing') { f.tick(); f.tick() }
    const before = f.controller.getSnapshot(), oldJob = f.active()[0]
    f.controller.setActive(false); oldJob.callback(); assert.equal(f.active().length, 0)
    assert.equal(f.controller.getSnapshot().items, before.items); assert.equal(f.controller.getSnapshot().phase, phase); assert.equal(f.controller.getSnapshot().revealedCount, before.revealedCount)
    f.controller.setActive(true); assert.equal(f.active().length, 1); assert.equal(f.active()[0].delay, phase === 'shuffling' ? 400 : 500)
    oldJob.callback(); assert.equal(f.controller.getSnapshot().revealedCount, before.revealedCount)
    f.controller.setActive(false); f.controller.setMode('manual'); f.controller.setActive(true)
    assert.equal(f.active().length, 0); assert.equal(f.controller.revealNext(), true); assert.equal(f.controller.getSnapshot().revealedCount, before.revealedCount + 1)
    assert.equal(f.draws(), 1)
  }
})

await check('All/reset/new draw and reused timer IDs reject old callbacks and old run handlers', () => {
  const f = setup(); f.controller.start(['A', 'B', 'C']); const oldPrepare = f.active()[0]; f.tick(); const oldReveal = f.active()[0], oldRun = f.controller.getSnapshot().runId
  f.controller.revealAll(); oldPrepare.callback(); oldReveal.callback(); assert.equal(f.controller.getSnapshot().revealedCount, 3)
  f.controller.reset(); f.controller.start(['X', 'Y']); const newTimer = f.active()[0]
  oldPrepare.callback(); oldReveal.callback(); assert.equal(f.active()[0], newTimer); assert.equal(f.controller.getSnapshot().revealedCount, 0)
  assert.equal(f.controller.revealAll(oldRun), false); assert.equal(f.controller.reset(oldRun), false)
  f.controller.dispose(); newTimer.callback(); assert.equal(f.controller.start(['A', 'B']), false); assert.equal(f.active().length, 0); assert.equal(f.controller.getSnapshot().active, false)
})

await check('Reentrant callbacks cannot restart cancelled work; reversible effect replay remains usable', () => {
  let triggered = false
  const f = setup(state => { if (state.phase === 'revealing' && !triggered) { triggered = true; f.controller.setActive(false) } })
  f.controller.start(['A', 'B']); f.tick(); assert.equal(f.active().length, 0); assert.equal(f.controller.getSnapshot().active, false)
  f.controller.setActive(true); assert.equal(f.active().length, 1); f.tick(); assert.equal(f.controller.getSnapshot().revealedCount, 1)
  f.controller.setActive(false); f.controller.setActive(true); assert.equal(f.active().length, 1); f.tick(); assert.equal(canExportOrder(f.controller.getSnapshot()), true)
  const r = setup(state => { if (state.phase === 'shuffling') r.controller.reset() })
  r.controller.start(['A', 'B']); assert.equal(r.controller.getSnapshot().phase, 'idle'); assert.equal(r.active().length, 0)
  const d = setup(state => { if (state.phase === 'revealing') d.controller.dispose() })
  d.controller.start(['A', 'B']); d.tick(); assert.equal(d.active().length, 0)
})

await check('Complete-only snapshots block idle/hidden/partial export and retain literal names/translated rank lines', () => {
  const f = setup(); assert.equal(createOrderResultSnapshot(f.controller.getSnapshot(), line), null)
  f.controller.start(['<img>', 'a\nb', '😀']); assert.equal(createOrderResultSnapshot(f.controller.getSnapshot(), line), null)
  f.tick(); f.tick(); assert.equal(createOrderResultSnapshot(f.controller.getSnapshot(), line), null)
  f.controller.revealAll(); const snapshot = createOrderResultSnapshot(f.controller.getSnapshot(), line)!
  assert.equal(snapshot.text, '1. 😀\n2. a\nb\n3. <img>'); assert.ok(Object.isFrozen(snapshot))
  f.controller.setActive(false); assert.equal(createOrderResultSnapshot(f.controller.getSnapshot(), line), null)
  f.controller.setActive(true); const english = createOrderResultSnapshot(f.controller.getSnapshot(), (rank, name) => `No. ${rank}: ${name}`)!
  assert.equal(english.runId, snapshot.runId); assert.ok(english.text.startsWith('No. 1: 😀')); assert.equal(f.draws(), 1)
  assert.equal(isOrderBusy(f.controller.getSnapshot()), false); assert.equal(createRouletteResultSnapshot(null, 1), null)
})

await check('Clipboard true/false/throw and API absence report only confirmed success', async () => {
  const snapshot = createOrderResultSnapshot(complete().controller.getSnapshot(), line)!
  assert.equal(await copyDecisionResult(snapshot, () => true, { writeText: async text => { assert.equal(text, snapshot.text) }, fallback: () => { throw new Error('unexpected') } }), 'copied')
  for (const answer of [true, false]) assert.equal(await copyDecisionResult(snapshot, () => true, { writeText: async () => { throw new Error('denied') }, fallback: () => answer }), answer ? 'copied' : 'failed')
  assert.equal(await copyDecisionResult(snapshot, () => true, { fallback: () => true }), 'copied')
  assert.equal(await copyDecisionResult(snapshot, () => true, { fallback: () => { throw new Error('legacy error') } }), 'failed')
})

await check('Shared roulette/order copy generation rejects reversed completion and stale fallback', async () => {
  const guard = createDecisionResultGuard(), first = guard.begin(), old = deferred<void>(); let fallback = 0
  const pending = copyDecisionResult(createRouletteResultSnapshot('roulette', 1)!, () => guard.isCurrent(first), { writeText: () => old.promise, fallback: () => { fallback++; return true } })
  const second = guard.begin(), snapshot = createOrderResultSnapshot(complete().controller.getSnapshot(), line)!
  assert.equal(await copyDecisionResult(snapshot, () => guard.isCurrent(second), { fallback: () => true }), 'copied')
  old.reject(new Error('late denied')); assert.equal(await pending, 'stale'); assert.equal(fallback, 0)
  const third = guard.begin(), success = deferred<void>(), late = copyDecisionResult(snapshot, () => guard.isCurrent(third), { writeText: () => success.promise, fallback: () => false })
  guard.invalidate(); success.resolve(); assert.equal(await late, 'stale'); assert.equal(guard.isCurrent(second), false)
  assert.equal(await copyDecisionResult(snapshot, () => false, { fallback: () => { throw new Error('should not run') } }), 'stale')
})

await check('TXT is the exact UTF-8 copy snapshot, fixed filename and one URL release despite late cleanup', async () => {
  const snapshot = createOrderResultSnapshot(complete(['한글', '😀', '<b>']).controller.getSnapshot(), line)!
  let blob!: Blob, callback!: () => void, revokes = 0, downloads = 0, cancels = 0
  const manager = createDecisionResultDownloads({ createUrl(value) { blob = value; return 'blob:1' }, revokeUrl(url) { assert.equal(url, 'blob:1'); revokes++ }, download(url, filename) { assert.equal(url, 'blob:1'); assert.equal(filename, ORDER_RESULT_FILENAME); downloads++ }, schedule(next, delay) { callback = next; assert.equal(delay, 1000); return 0 }, cancel(timer) { assert.equal(timer, 0); cancels++ } })
  assert.equal(manager.download(snapshot, () => true), 'started'); assert.equal(downloads, 1); assert.equal(await blob.text(), snapshot.text)
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new TextEncoder().encode(snapshot.text)); assert.equal(blob.type, 'text/plain;charset=utf-8')
  manager.dispose(); callback(); manager.dispose(); assert.equal(revokes, 1); assert.equal(cancels, 1); assert.equal(manager.download(snapshot, () => true), 'stale')
})

await check('Download failure/staleness releases URLs and leaves snapshot available for retry', () => {
  const snapshot = createOrderResultSnapshot(complete().controller.getSnapshot(), line)!
  let revokes = 0, calls = 0, fail = true, valid = true
  const ports: DecisionDownloadPorts = { createUrl: () => `blob:${++calls}`, revokeUrl: () => { revokes++ }, download() { if (fail) throw new Error('blocked') }, schedule: () => 0, cancel() {} }
  const manager = createDecisionResultDownloads(ports)
  assert.equal(manager.download(snapshot, () => valid), 'failed'); assert.equal(revokes, 1)
  fail = false; assert.equal(manager.download(snapshot, () => valid), 'started'); manager.dispose(); assert.equal(revokes, 2)
  const changed = createDecisionResultDownloads({ ...ports, createUrl() { valid = false; return 'blob:changed' } })
  assert.equal(changed.download(snapshot, () => valid), 'stale'); assert.equal(revokes, 3)
  valid = true; assert.equal(changed.download(createRouletteResultSnapshot('A', 1)!, () => valid), 'stale'); assert.equal(revokes, 3)
})

console.log(`Order reveal/actions: ${groups} meaningful groups passed`)
