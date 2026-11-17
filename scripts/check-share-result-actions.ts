import assert from 'node:assert/strict'
import { captureShareResult, copyShareResultLink, createShareResultDownloads, createShareResultRequests } from '../src/utils/shareResultActions.ts'

function deferred() { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let passed = 0
const pass = (name: string) => { passed++; console.log(`PASS ${name}`) }

{
  const card = { tool: 'Synthetic', label: 'First', headline: '100', rows: [{ label: 'Count', value: '1' }] }
  const snapshot = captureShareResult(card, 'https://example.test/?v=100', undefined, 'result', 'Open tool')
  card.rows[0].value = '2'; card.headline = '200'; card.rows.push({ label: 'Later', value: '3' })
  assert.equal(snapshot.card.headline, '100'); assert.equal(snapshot.card.rows?.length, 1)
  assert.equal(snapshot.card.rows?.[0].value, '1'); assert.equal(snapshot.text, 'First 100')
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.card) && Object.isFrozen(snapshot.card.rows) && Object.isFrozen(snapshot.card.rows?.[0]))
  assert.equal(captureShareResult({ ...card, cta: 'Custom' }, '', '', 'x', 'Default').card.cta, 'Custom')
  pass('owned immutable rows, click-time text and explicit CTA')
}
{
  const scope = createShareResultRequests('same-result')
  assert.equal(scope.begin(), null); scope.activate()
  const before = scope.begin()!; assert.ok(scope.current(before))
  scope.dispose(); scope.activate(); assert.equal(scope.current(before), false)
  const first = scope.begin()!, second = scope.begin()!
  assert.equal(scope.current(first), false); assert.ok(scope.current(second))
  const other = createShareResultRequests('same-result'); other.activate()
  assert.equal(other.current(second), false)
  scope.invalidate(); assert.equal(scope.current(second), false)
  scope.dispose(); other.dispose()
  pass('effect replay, result A-B-A ownership, new request and invalidation')
}
{
  let fallbackCalls = 0, live = true
  const pending = deferred()
  const copy = copyShareResultLink('first', () => live, { writeText: () => pending.promise, fallback: () => { fallbackCalls++; return true } })
  live = false; pending.reject(new Error('denied'))
  assert.equal(await copy, 'stale'); assert.equal(fallbackCalls, 0)
  live = true
  for (const value of [true, false]) {
    assert.equal(await copyShareResultLink('x', () => live, { fallback: () => value }), value ? 'copied' : 'failed')
    assert.equal(await copyShareResultLink('x', () => live, { writeText: async () => { throw new Error('denied') }, fallback: () => value }), value ? 'copied' : 'failed')
  }
  assert.equal(await copyShareResultLink('x', () => live, { fallback: () => { throw new Error('selection') } }), 'failed')
  assert.equal(await copyShareResultLink('x', () => live, { writeText: async () => {}, fallback: () => { throw new Error('must not fallback') } }), 'copied')
  assert.equal(await copyShareResultLink('x', () => live, { fallback: (_text, current) => { live = false; return current() } }), 'stale')
  pass('native/legacy outcomes and late rejection cannot start another clipboard action')
}
{
  let sequence = 0, clickFails = false, live = true
  const created: string[] = [], revoked: string[] = [], clicked: string[] = []
  const timers = new Map<number, () => void>()
  const downloads = createShareResultDownloads({
    createUrl() { const value = `blob:${++sequence}`; created.push(value); return value },
    revokeUrl(url) { revoked.push(url) },
    click(url) { if (clickFails) throw new Error('download blocked'); clicked.push(url) },
    schedule(callback, delay) { assert.equal(delay, 30_000); const id = ++sequence; timers.set(id, callback); return id },
    cancel(timer) { timers.delete(timer as number) },
  })
  const blob = new Blob(['synthetic'])
  assert.equal(downloads.download(blob, 'a.png', () => live), 'stale')
  downloads.activate(); assert.equal(downloads.download(blob, 'a.png', () => live), 'started')
  live = false; assert.equal(downloads.download(blob, 'b.png', () => live), 'stale')
  assert.equal(created.length, 1); assert.equal(revoked.length, 0)
  // A result edit must not revoke a URL for a download already submitted.
  for (const callback of [...timers.values()]) callback()
  assert.deepEqual(revoked, created); assert.equal(timers.size, 0)
  live = true; clickFails = true
  assert.equal(downloads.download(blob, 'c.png', () => live), 'failed'); assert.equal(revoked.length, 2)
  clickFails = false; assert.equal(downloads.download(blob, 'd.png', () => live), 'started')
  downloads.dispose(); downloads.dispose(); assert.deepEqual(revoked, created); assert.equal(timers.size, 0)
  downloads.activate(); assert.equal(downloads.download(blob, 'e.png', () => live), 'started'); downloads.dispose()
  assert.deepEqual(revoked, created); assert.equal(clicked.length, 3)
  pass('accepted URL lifetime, error cleanup, unmount and replay ownership')
}
{
  let live = true, clicks = 0, releases = 0
  const downloads = createShareResultDownloads({ createUrl() { live = false; return 'blob:late' }, revokeUrl() { releases++ }, click() { clicks++ }, schedule() { throw new Error('must not schedule') }, cancel() {} })
  downloads.activate()
  assert.equal(downloads.download(new Blob(), 'result.png', () => live), 'stale')
  downloads.dispose(); assert.equal(clicks, 0); assert.equal(releases, 1)
  pass('invalidated during URL creation never clicks and releases exactly once')
}
console.log(`Share result actions: ${passed} groups passed`)
