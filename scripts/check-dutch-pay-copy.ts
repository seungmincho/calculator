import assert from 'node:assert/strict'
import { captureDutchPayCopy, copyDutchPayText, createDutchPayCopyGuard } from '../src/utils/dutchPayCopy.ts'

const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log(`PASS ${name}`) }

await check('amount, literal notice and link snapshots keep exact strings without storage', async () => {
  const values = [captureDutchPayCopy('amount', 'person-1', '12345'), captureDutchPayCopy('notice', 'notice', '<b>합성 이름</b>\n계좌: synthetic only\n😀'), captureDutchPayCopy('link', 'link', 'https://toolhub.ai.kr/dutch-pay/?d=abc&ro=1')]
  for (const snapshot of values) {
    assert.equal(Object.isFrozen(snapshot), true)
    const received: string[] = []
    assert.equal(await copyDutchPayText(snapshot, () => true, { writeText: async value => { received.push(value) }, fallback: () => { throw new Error('no fallback after success') } }), 'copied')
    assert.deepEqual(received, [snapshot.text])
  }
})

await check('native refusal/absence and legacy true, false, throw are distinguished', async () => {
  const snapshot = captureDutchPayCopy('notice', 'notice', 'literal')
  for (const writeText of [undefined, async () => { throw new Error('denied') }]) {
    for (const result of [true, false]) assert.equal(await copyDutchPayText(snapshot, () => true, { writeText, fallback: value => { assert.equal(value, snapshot.text); return result } }), result ? 'copied' : 'failed')
    assert.equal(await copyDutchPayText(snapshot, () => true, { writeText, fallback: () => { throw new Error('legacy error') } }), 'failed')
  }
})

await check('latest target, scope invalidation, replay and disposal reject stale completions', async () => {
  const guard = createDutchPayCopyGuard(), first = guard.begin()!, wait = deferred()
  let fallbacks = 0
  const pending = copyDutchPayText(captureDutchPayCopy('amount', '1', '99'), () => guard.current(first), { writeText: () => wait.promise, fallback: () => { fallbacks++; return true } })
  const second = guard.begin()!
  assert.equal(await copyDutchPayText(captureDutchPayCopy('notice', 'notice', 'new'), () => guard.current(second), { fallback: () => true }), 'copied')
  wait.reject(new Error('late')); assert.equal(await pending, 'stale'); assert.equal(fallbacks, 0)
  guard.invalidate(); assert.equal(guard.current(second), false)
  const before = guard.begin()!; guard.dispose(); assert.equal(guard.begin(), null); guard.activate()
  assert.equal(guard.current(before), false); assert.equal(guard.current(guard.begin()!), true)
  const other = createDutchPayCopyGuard(); assert.equal(other.current(guard.begin()!), false)
})

await check('stale native success is not reported; fallback reentrancy cannot claim success', async () => {
  const guard = createDutchPayCopyGuard(), token = guard.begin()!, wait = deferred()
  const snapshot = captureDutchPayCopy('link', 'link', 'url')
  const pending = copyDutchPayText(snapshot, () => guard.current(token), { writeText: () => wait.promise, fallback: () => true })
  guard.invalidate(); wait.resolve(); assert.equal(await pending, 'stale')
  const next = guard.begin()!
  assert.equal(await copyDutchPayText(snapshot, () => guard.current(next), { fallback: () => { guard.invalidate(); return true } }), 'stale')
  assert.equal(await copyDutchPayText(snapshot, () => false, { writeText: async () => { throw new Error('must not run') }, fallback: () => { throw new Error('must not run') } }), 'stale')
})

console.log(`DutchPay copy preparation: ${groups} groups passed; native clipboard is separate`)
