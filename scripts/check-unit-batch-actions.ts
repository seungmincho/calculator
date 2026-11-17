import assert from 'node:assert/strict'
import { createUnitCopyController, type UnitCopyState } from '../src/utils/unitBatchActions.ts'
import type { ShareClipboardPorts } from '../src/utils/shareResultActions.ts'

const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const value = (id = 'batch', text = 'Line\tValue\r\n1\t100') => ({ id, text, label: id })
function fixture(clipboard: ShareClipboardPorts) {
  const states: (UnitCopyState | null)[] = [], timers: { callback: () => void; canceled: boolean }[] = []
  const owner = createUnitCopyController({ clipboard, after(callback) { const timer = { callback, canceled: false }; timers.push(timer); return () => { timer.canceled = true } } }, state => states.push(state))
  return { owner, states, timers }
}
let groups = 0
async function test(name: string, run: () => Promise<void>) { await run(); groups++; console.log('PASS', name) }
await test('native success is the only first-path success and snapshot values cannot change later', async () => {
  const pending = deferred(), sent: string[] = [], f = fixture({ writeText: text => { sent.push(text); return pending.promise }, fallback: () => { throw new Error('unexpected') } })
  const request = value(), work = f.owner.request(request); request.text = 'mutated'; pending.resolve()
  assert.equal(await work, 'copied'); assert.deepEqual(sent, ['Line\tValue\r\n1\t100']); assert.equal(f.owner.getSnapshot()?.text, sent[0]); assert.ok(Object.isFrozen(f.owner.getSnapshot())); f.owner.dispose()
})
await test('API absence/denial and fallback false/throw never report copied; current true may recover', async () => {
  for (const denied of [false, true]) for (const result of [false, true, 'throw'] as const) {
    let fallback = 0
    const f = fixture({ writeText: denied ? async () => { throw new Error('denied') } : undefined, fallback: () => { fallback++; if (result === 'throw') throw new Error('blocked'); return result } })
    assert.equal(await f.owner.request(value()), result === true ? 'copied' : 'failed'); assert.equal(fallback, 1); f.owner.dispose()
  }
})
await test('single and batch share one owner; late rejection cannot start old fallback', async () => {
  const pending = deferred(); let fallback = 0
  const f = fixture({ writeText: text => text === 'old' ? pending.promise : Promise.resolve(), fallback: () => { fallback++; return true } })
  const old = f.owner.request(value('single', 'old')); assert.equal(await f.owner.request(value('batch', 'new')), 'copied')
  pending.reject(new Error('late')); assert.equal(await old, 'stale'); assert.equal(fallback, 0); assert.equal(f.owner.getSnapshot()?.text, 'new'); f.owner.dispose()
})
await test('input/locale/share invalidation blocks late success and rejection equally', async () => {
  for (const reject of [false, true]) {
    const pending = deferred(); let fallback = 0
    const f = fixture({ writeText: () => pending.promise, fallback: () => { fallback++; return true } }), result = f.owner.request(value())
    f.owner.invalidate(); if (reject) pending.reject(new Error('late')); else pending.resolve()
    assert.equal(await result, 'stale'); assert.equal(f.owner.getSnapshot(), null); assert.equal(fallback, 0); f.owner.dispose()
  }
})
await test('retry retains complete click-time text; stale retry/close cannot clear a newer row copy', async () => {
  const sent: string[] = []; let allowed = false
  const f = fixture({ writeText: async text => { sent.push(text); if (!allowed) throw new Error('denied') }, fallback: () => false })
  assert.equal(await f.owner.request(value()), 'failed'); const old = f.owner.getSnapshot()!.token
  allowed = true; assert.equal(await f.owner.retry(old), 'copied'); assert.equal(sent[0], sent[1]); const current = f.owner.getSnapshot()!
  assert.equal(await f.owner.retry(old), 'stale'); f.owner.close(old); assert.equal(f.owner.getSnapshot(), current)
  f.owner.close(current.token); assert.equal(f.owner.getSnapshot(), null); f.owner.dispose()
})
await test('old success timer and unmount cannot affect a new request or begin fallback', async () => {
  const pending = deferred(); let fallback = 0
  const f = fixture({ writeText: text => text === 'last' ? pending.promise : Promise.resolve(), fallback: () => { fallback++; return false } })
  await f.owner.request(value('single', 'first')); const timer = f.timers[0]
  await f.owner.request(value('batch', 'second')); assert.equal(timer.canceled, true); timer.callback(); assert.equal(f.owner.getSnapshot()?.text, 'second')
  const result = f.owner.request(value('single', 'last')); f.owner.dispose(); pending.reject(new Error('unmounted'))
  assert.equal(await result, 'stale'); assert.equal(fallback, 0); assert.equal(await f.owner.request(value()), 'stale')
})
console.log(`Unit batch copy actions: ${groups} groups passed`)
