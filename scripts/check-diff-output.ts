import assert from 'node:assert/strict'
import { createTextDiffOutput, type DiffOutputRequest, type DiffOutputState } from '../src/lib/diff/output.ts'
const request = (target: 'comparison' | 'merged', text = target): DiffOutputRequest => ({ target, text, label: target, filename: `toolhub-text-${target}.txt` })
const deferred = () => { let resolve!: () => void, reject!: (reason: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { resolve, reject, promise } }
let groups = 0
async function check(name: string, run: () => Promise<void>) { await run(); groups++; console.log('PASS', name) }
function fixture() {
  const copies: string[] = [], legacy: string[] = [], files: { blob: Blob; filename: string }[] = [], urls = new Map<string, Blob>(), revoked: string[] = []
  const notices: (DiffOutputState | null)[] = [], timers: { callback: () => void; cancelled: boolean }[] = []
  const pending: ReturnType<typeof deferred>[] = [], io = { native: 'success', fallback: false, downloadFailed: false }
  let sequence = 0
  const owner = createTextDiffOutput(value => { notices.push(value) }, { clipboard: {
    writeText(text) { copies.push(text); if (io.native === 'wait') { const job = deferred(); pending.push(job); return job.promise }; if (io.native === 'reject') return Promise.reject(new Error('denied')); return Promise.resolve() },
    fallback(text) { legacy.push(text); return io.fallback },
  }, downloads: {
    createUrl(blob) { const url = `blob:${++sequence}`; urls.set(url, blob); return url }, revokeUrl(url) { urls.delete(url); revoked.push(url) },
    click(url, filename) { if (io.downloadFailed) throw new Error('download'); files.push({ blob: urls.get(url)!, filename }) }, schedule(callback) { return callback }, cancel() {},
  }, after(callback) { const timer = { callback, cancelled: false }; timers.push(timer); return () => { timer.cancelled = true } } })
  owner.activate(); return { owner, copies, legacy, files, urls, revoked, notices, timers, pending, io }
}

await check('comparison and merged copies share a captured latest owner in both directions', async () => {
  for (const targets of [['comparison', 'merged'], ['merged', 'comparison']] as const) {
    const f = fixture(); f.io.native = 'wait'; const source = { ...request(targets[0]), text: 'old\r\n😀' }, old = f.owner.copy(source); source.text = 'mutated'
    f.io.native = 'success'; assert.equal(await f.owner.copy(request(targets[1], 'new result')), 'copied'); f.pending[0].reject(new Error('late'))
    assert.equal(await old, 'stale'); assert.deepEqual(f.copies, ['old\r\n😀', 'new result']); assert.equal(f.legacy.length, 0); assert.equal(f.owner.getSnapshot()!.target, targets[1]); f.owner.dispose()
  }
})
await check('failed copy exposes the complete snapshot, retries only the current token and treats empty text as valid', async () => {
  const f = fixture(), text = '원고\r\n'.repeat(50000); f.io.native = 'reject'
  assert.equal(await f.owner.copy(request('merged', text)), 'failed'); const failed = f.owner.getSnapshot()!
  assert.equal(failed.text, text); assert.equal(failed.kind, 'copy'); assert.equal(failed.status, 'failed'); assert.ok(Object.isFrozen(failed))
  f.io.fallback = true; assert.equal(await f.owner.retry(failed.token), 'copied'); assert.deepEqual(f.legacy, [text, text]); assert.equal(await f.owner.retry(failed.token), 'stale')
  f.io.native = 'success'; assert.equal(await f.owner.copy(request('merged', '')), 'copied'); assert.equal(f.copies.at(-1), ''); f.owner.dispose()
})
await check('TXT download invalidates pending copy without losing complete bytes or adding a BOM', async () => {
  const f = fixture(); f.io.native = 'wait'; const pending = f.owner.copy(request('comparison', 'old'))
  const text = '가😀\n'.repeat(10000); assert.equal(f.owner.download(request('merged', text)), 'started')
  f.pending[0].reject(new Error('late')); assert.equal(await pending, 'stale'); assert.equal(f.legacy.length, 0)
  assert.equal(f.files[0].filename, 'toolhub-text-merged.txt'); assert.equal(await f.files[0].blob.text(), text)
  assert.equal(f.files[0].blob.size, Buffer.byteLength(text)); assert.equal(f.owner.getSnapshot()!.kind, 'download')
  assert.equal(f.owner.download(request('merged', '')), 'started'); assert.equal(f.files[1].blob.size, 0)
  f.owner.dispose(); assert.equal(f.urls.size, 0); assert.equal(new Set(f.revoked).size, 2)
})
await check('context invalidation, stale timers and reactivation cannot revive an old result or clear a new notice', async () => {
  const f = fixture(); await f.owner.copy(request('comparison', 'A')); const oldTimer = f.timers[0]
  f.owner.invalidate(); await f.owner.copy(request('merged', 'B')); oldTimer.callback(); assert.equal(f.owner.getSnapshot()!.text, 'B')
  f.io.native = 'wait'; const pending = f.owner.copy(request('comparison', 'C')); f.owner.dispose(); f.owner.activate(); f.io.native = 'success'; await f.owner.copy(request('merged', 'D'))
  f.pending[0].reject(new Error('disposed')); assert.equal(await pending, 'stale'); assert.equal(f.legacy.length, 0); assert.equal(f.owner.getSnapshot()!.text, 'D'); f.owner.dispose()
})
await check('download failure is explicit, releases its URL and a stale recovery cannot close a new output', async () => {
  const f = fixture(); f.io.native = 'reject'; await f.owner.copy(request('merged', 'manual')); const old = f.owner.getSnapshot()!
  f.io.downloadFailed = true; assert.equal(f.owner.download(request('comparison')), 'failed'); assert.equal(f.urls.size, 0); assert.equal(f.revoked.length, 1)
  f.owner.close(old.token); assert.equal(f.owner.getSnapshot()!.kind, 'download'); assert.equal(f.owner.getSnapshot()!.status, 'failed'); f.owner.dispose()
})
console.log(`${groups} text diff output groups passed`)
