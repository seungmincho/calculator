import assert from 'node:assert/strict'
import vm from 'node:vm'
import { build } from 'esbuild'
import { createLineDiffClient, type DiffWorkerPort } from '../src/lib/diff/client.ts'
import { DiffExecutionError, isTextDiffResult, type LineDiffRequest } from '../src/lib/diff/protocol.ts'
import { copyDiffText } from '../src/lib/diff/clipboard.ts'
import { LINE_DIFF_LIMITS, type TextDiffResult } from '../src/utils/lineDiff.ts'

const result: TextDiffResult = { lines: [{ type: 'removed', content: 'before', left: 1 }, { type: 'added', content: 'after', right: 1 }], summary: { added: 1, removed: 1, unchanged: 0 } }
class FakeWorker implements DiffWorkerPort {
  onmessage: DiffWorkerPort['onmessage'] = null
  onerror: DiffWorkerPort['onerror'] = null
  onmessageerror: DiffWorkerPort['onmessageerror'] = null
  requests: LineDiffRequest[] = []
  terminated = 0
  throwOnPost = false
  postMessage(request: LineDiffRequest) { if (this.throwOnPost) throw new Error('clone failure'); this.requests.push(request) }
  terminate() { this.terminated++ }
  send(data: unknown) { this.onmessage?.(new MessageEvent('message', { data })) }
  success(value = result) { this.send({ id: this.requests.at(-1)!.id, ok: true, result: value }) }
}
const rejected = async (promise: Promise<unknown>) => { try { await promise; return 'unexpectedSuccess' } catch (error) { return error instanceof DiffExecutionError ? error.code : 'unexpectedError' } }
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log(`PASS ${name}`) }

await check('successful reply settles once, validates counters and terminates the Worker', async () => {
  const worker = new FakeWorker(), client = createLineDiffClient({ createWorker: () => worker })
  const pending = client.run('before', 'after'); const late = worker.onmessage!
  assert.equal(worker.requests[0].left, 'before'); worker.success()
  assert.deepEqual(await pending, result); assert.equal(worker.terminated, 1); assert.equal(worker.onmessage, null)
  late(new MessageEvent('message', { data: { id: 1, ok: true, result } })); assert.equal(worker.terminated, 1)
})
await check('new comparison cancels the old Worker and ignores its captured late callbacks', async () => {
  const workers: FakeWorker[] = [], client = createLineDiffClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker } })
  const first = rejected(client.run('a', 'b')); const oldMessage = workers[0].onmessage!, oldError = workers[0].onerror!
  const second = client.run('before', 'after')
  assert.equal(await first, 'canceled'); assert.equal(workers[0].terminated, 1)
  oldMessage(new MessageEvent('message', { data: { id: 1, ok: true, result } }))
  oldError({ preventDefault() {} } as ErrorEvent)
  assert.equal(workers[1].terminated, 0); workers[1].success(); assert.deepEqual(await second, result)
})
await check('explicit cancellation terminates immediately and later responses do not settle again', async () => {
  const worker = new FakeWorker(), client = createLineDiffClient({ createWorker: () => worker })
  const pending = rejected(client.run('a', 'b')), late = worker.onmessage!
  client.cancel(); client.cancel(); assert.equal(await pending, 'canceled'); assert.equal(worker.terminated, 1)
  late(new MessageEvent('message', { data: { id: 1, ok: false, error: 'tooComplex' } })); assert.equal(worker.terminated, 1)
})
await check('construction, postMessage, error and messageerror failures are explicit', async () => {
  assert.equal(await rejected(createLineDiffClient({ createWorker() { throw new Error('blocked') } }).run('a', 'b')), 'workerFailed')
  const post = new FakeWorker(); post.throwOnPost = true
  assert.equal(await rejected(createLineDiffClient({ createWorker: () => post }).run('a', 'b')), 'workerFailed'); assert.equal(post.terminated, 1)
  for (const type of ['error', 'messageerror']) {
    const worker = new FakeWorker(), client = createLineDiffClient({ createWorker: () => worker })
    const pending = rejected(client.run('a', 'b')); let prevented = false
    if (type === 'error') worker.onerror!({ preventDefault() { prevented = true } } as ErrorEvent)
    else worker.onmessageerror!(new MessageEvent('messageerror'))
    assert.equal(await pending, 'workerFailed'); assert.equal(worker.terminated, 1)
    if (type === 'error') assert.equal(prevented, true)
  }
})
await check('an unresponsive Worker times out and a new comparison can succeed', async () => {
  const workers: FakeWorker[] = [], client = createLineDiffClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker }, timeoutMs: 5 })
  assert.equal(await rejected(client.run('a', 'b')), 'timeout'); assert.equal(workers[0].terminated, 1)
  const next = client.run('before', 'after'); workers[1].success(); assert.deepEqual(await next, result)
})
await check('oversized UTF-16 inputs fail before Worker creation and never fall back to main-thread LCS', async () => {
  let created = 0; const client = createLineDiffClient({ createWorker: () => { created++; return new FakeWorker() } })
  assert.equal(await rejected(client.run('x'.repeat(LINE_DIFF_LIMITS.bytes + 1), '')), 'tooLarge')
  assert.equal(await rejected(client.run(null as unknown as string, '')), 'invalidInput'); assert.equal(created, 0)
})
await check('unsupported browser is reported without an unbounded synchronous fallback', async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'Worker')
  try { Object.defineProperty(globalThis, 'Worker', { configurable: true, value: undefined }); assert.equal(await rejected(createLineDiffClient().run('a', 'b')), 'unsupported') }
  finally { if (old) Object.defineProperty(globalThis, 'Worker', old); else Reflect.deleteProperty(globalThis, 'Worker') }
})
await check('domain limit failures remain failures, and malformed output cannot be applied', async () => {
  for (const code of ['tooLarge', 'tooManyLines', 'tooComplex']) {
    const worker = new FakeWorker(), client = createLineDiffClient({ createWorker: () => worker }), pending = rejected(client.run('a', 'b'))
    worker.send({ id: 1, ok: false, error: code }); assert.equal(await pending, code)
  }
  for (const value of [null, { id: 1, ok: true, result: { ...result, summary: { added: 0, removed: 0, unchanged: 0 } } }, { id: 1, ok: true, result: { lines: [{ type: 'added', content: 'x', right: 2 }], summary: { added: 1, removed: 0, unchanged: 0 } } }]) {
    const worker = new FakeWorker(), pending = rejected(createLineDiffClient({ createWorker: () => worker }).run('a', 'b'))
    worker.send(value); assert.equal(await pending, 'invalidResponse')
  }
  assert.equal(isTextDiffResult({ lines: Array(20001).fill({}), summary: {} }), false)
})
await check('an unrelated response id cannot replace the current request', async () => {
  const worker = new FakeWorker(), pending = createLineDiffClient({ createWorker: () => worker }).run('before', 'after')
  worker.send({ id: 999, ok: false, error: 'tooComplex' }); assert.equal(worker.terminated, 0)
  worker.success(); assert.deepEqual(await pending, result)
})

const built = await build({ entryPoints: ['src/lib/diff/lineDiff.worker.ts'], bundle: true, write: false, format: 'iife', platform: 'browser' })
const responses: { id: number; ok: boolean; result?: TextDiffResult; error?: string }[] = []
const workerSelf: { onmessage?: (event: { data: unknown }) => void; postMessage: (data: typeof responses[number]) => void } = { postMessage: data => responses.push(data) }
vm.runInContext(built.outputFiles[0].text, vm.createContext({ self: workerSelf, TextEncoder }))
await check('actual Worker module preserves normalized source reconstruction and trailing empty lines', () => {
  workerSelf.onmessage!({ data: { id: 7, left: '한글\r\n\r\n끝', right: '한글\n수정\n끝\n' } })
  const message = responses.at(-1)!; assert.equal(message.id, 7); assert.equal(message.ok, true)
  assert.ok(isTextDiffResult(message.result))
  assert.equal(message.result.lines.filter(line => line.left !== undefined).map(line => line.content).join('\n'), '한글\n\n끝')
  assert.equal(message.result.lines.filter(line => line.right !== undefined).map(line => line.content).join('\n'), '한글\n수정\n끝\n')
})
await check('actual Worker module catches invalid inputs and byte/line/work limits', () => {
  for (const [data, error] of [
    [{ id: 8, left: null, right: '' }, 'invalidInput'],
    [{ id: 9, left: '가'.repeat(350000), right: '' }, 'tooLarge'],
    [{ id: 10, left: '\n'.repeat(10000), right: '' }, 'tooManyLines'],
    [{ id: 11, left: Array(2000).fill('a').join('\n'), right: Array(2000).fill('b').join('\n') }, 'tooComplex'],
  ] as const) { workerSelf.onmessage!({ data }); assert.equal(responses.at(-1)!.ok, false); assert.equal(responses.at(-1)!.error, error) }
})
await check('copy success, denial, missing API, false fallback and throwing fallback are distinguished', async () => {
  let fallback = 0
  assert.equal(await copyDiffText('result', () => true, { writeText: async () => {}, fallback: () => { fallback++; return false } }), 'copied'); assert.equal(fallback, 0)
  assert.equal(await copyDiffText('result', () => true, { writeText: async () => { throw new Error('denied') }, fallback: () => true }), 'copied')
  assert.equal(await copyDiffText('result', () => true, { fallback: () => false }), 'failed')
  assert.equal(await copyDiffText('result', () => true, { fallback() { throw new Error('blocked') } }), 'failed')
})
await check('stale clipboard completion cannot trigger a fallback or a new success state', async () => {
  let reject!: (error: Error) => void, valid = true, fallback = 0
  const pending = copyDiffText('old', () => valid, { writeText: () => new Promise((_resolve, no) => { reject = no }), fallback: () => { fallback++; return true } })
  valid = false; reject(new Error('late denial')); assert.equal(await pending, 'stale'); assert.equal(fallback, 0)
  assert.equal(await copyDiffText('old', () => false, { fallback: () => { fallback++; return true } }), 'stale'); assert.equal(fallback, 0)
})
console.log(`Line diff Worker/client/copy: ${groups} groups passed (Worker module tested in VM, not a browser thread)`)
