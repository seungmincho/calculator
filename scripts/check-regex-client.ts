import assert from 'node:assert/strict'
import { Worker as NodeWorker } from 'node:worker_threads'
import { buildSync } from 'esbuild'
import { createRegexClient, type RegexWorkerPort } from '../src/lib/regex/client.ts'
import { parseRegexResult, RegexExecutionError, type RegexWorkerRequest } from '../src/lib/regex/protocol.ts'
import { executeRegexJob, REGEX_LIMITS, type RegexJob } from '../src/utils/regexEngine.ts'
const input = (inputText = 'ab12', pattern = '\\d+', extra: Partial<RegexJob> = {}): RegexJob => ({ operation: 'extract', inputText, pattern, flags: 'g', replacement: '', transform: 'none', ...extra })
const outcome = (promise: Promise<unknown>) => promise.then(() => 'success', cause => cause instanceof RegexExecutionError ? cause.code : 'unexpected')
class FakeWorker implements RegexWorkerPort {
  onmessage: RegexWorkerPort['onmessage'] = null; onerror: RegexWorkerPort['onerror'] = null; onmessageerror: RegexWorkerPort['onmessageerror'] = null
  requests: RegexWorkerRequest[] = []; terminated = 0; postFailure = false
  postMessage(request: RegexWorkerRequest) { if (this.postFailure) throw new Error('post denied'); this.requests.push(request) }
  terminate() { this.terminated++ }
  send(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
  complete() { const request = this.requests.at(-1)!; this.send({ id: request.id, revision: request.revision, ok: true, result: executeRegexJob(request.job) }) }
}
let groups = 0
async function check(name: string, callback: () => Promise<void> | void) { if (process.argv[2] && !name.includes(process.argv[2])) return; await callback(); groups++; console.log('PASS', name) }
await check('immutable request and matching revision settle once, project bounded output and terminate', async () => {
  const worker = new FakeWorker(), client = createRegexClient({ createWorker: () => worker }), draft = input(), pending = client.run(draft, 7), late = worker.onmessage!
  draft.inputText = 'changed'; assert.equal(worker.requests[0].job.inputText, 'ab12'); assert.ok(Object.isFrozen(worker.requests[0].job))
  worker.send({ id: worker.requests[0].id, revision: 6, ok: true, result: {} }); assert.equal(worker.terminated, 0); worker.complete(); assert.equal((await pending).outputText, '12'); assert.equal(worker.terminated, 1)
  late({ data: null } as MessageEvent); client.cancel(); client.dispose(); assert.equal(worker.terminated, 1); assert.equal(await outcome(client.run(input())), 'canceled')
})
await check('A-B-A request generations, explicit cancel and disposed clients reject old callbacks', async () => {
  const workers: FakeWorker[] = [], client = createRegexClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker } })
  const a = outcome(client.run(input('A1'), 1)), oldMessage = workers[0].onmessage!, oldError = workers[0].onerror!
  const b = outcome(client.run(input('B2'), 2)), current = client.run(input('A1'), 3); assert.equal(await a, 'canceled'); assert.equal(await b, 'canceled')
  oldMessage({ data: { id: 1, revision: 1, ok: true, result: executeRegexJob(input('A1')) } } as MessageEvent); oldError({ preventDefault() {} } as ErrorEvent)
  assert.equal(workers[2].terminated, 0); workers[2].complete(); assert.equal((await current).outputText, '1'); assert.ok(workers.every(worker => worker.terminated === 1))
  const canceled = outcome(client.run(input(), 4)); client.cancel(); client.cancel(); assert.equal(await canceled, 'canceled'); assert.equal(workers[3].terminated, 1)
})
await check('unsupported, creation/post/message errors, typed worker errors and invalid replies have no synchronous fallback', async () => {
  assert.equal(await outcome(createRegexClient().run(input())), 'unsupported')
  assert.equal(await outcome(createRegexClient({ createWorker() { throw new Error('denied') } }).run(input())), 'workerFailed')
  const post = new FakeWorker(); post.postFailure = true; assert.equal(await outcome(createRegexClient({ createWorker: () => post }).run(input())), 'workerFailed'); assert.equal(post.terminated, 1)
  for (const kind of ['error', 'messageerror', 'malformed', 'invalidRegex']) {
    const worker = new FakeWorker(), client = createRegexClient({ createWorker: () => worker }), pending = outcome(client.run(input())), request = worker.requests[0]
    if (kind === 'error') worker.onerror?.({ preventDefault() {} } as ErrorEvent)
    else if (kind === 'messageerror') worker.onmessageerror?.({} as MessageEvent)
    else if (kind === 'malformed') worker.send({ id: request.id, revision: request.revision, ok: true, result: { ...executeRegexJob(input()), outputLength: -1 } })
    else worker.send({ id: request.id, revision: request.revision, ok: false, error: kind })
    assert.equal(await pending, kind === 'malformed' ? 'invalidResponse' : kind === 'invalidRegex' ? kind : 'workerFailed'); assert.equal(worker.terminated, 1)
  }
  let created = 0; const client = createRegexClient({ createWorker() { created++; return new FakeWorker() } })
  assert.equal(await outcome(client.run(input('x'.repeat(REGEX_LIMITS.input + 1)))), 'inputTooLarge'); assert.equal(await outcome(client.run(null)), 'invalidInput'); assert.equal(created, 0)
})
await check('timeout releases the physical worker once and later requests still succeed', async () => {
  const workers: FakeWorker[] = [], client = createRegexClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker }, timeoutMs: 5 })
  assert.equal(await outcome(client.run(input())), 'timeout'); assert.equal(workers[0].terminated, 1)
  const next = client.run(input('A42')); workers[1].complete(); assert.equal((await next).outputText, '42'); client.dispose(); assert.equal(workers[1].terminated, 1)
})
await check('reply validators reject forged counters/detail payloads and project unknown fields away', () => {
  const result = executeRegexJob(input()); assert.ok(parseRegexResult(result)); assert.equal(Object.hasOwn(parseRegexResult({ ...result, extra: 'discard' })!, 'extra'), false)
  for (const forged of [{ ...result, matchCount: 100001 }, { ...result, scannedMatches: 0 }, { ...result, inputLineCount: 0 }, { ...result, outputNonblankLines: 99 }, { ...result, detailsTruncated: true }, { ...result, details: [{ ...result.details[0], match: 'x'.repeat(2001) }] }, { ...result, details: [{ ...result.details[0], groupCount: 99, groups: [], truncated: true }] }]) assert.equal(parseRegexResult(forged), null)
})

const compiled = buildSync({ entryPoints: ['src/lib/regex/regex.worker.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' }).outputFiles[0].text
const workerCode = `const {parentPort}=require('node:worker_threads');global.self={postMessage:data=>parentPort.postMessage(data)};${compiled};parentPort.on('message',data=>{parentPort.postMessage({testStarted:true});self.onmessage({data})});`
let actualCreated = 0, actualTerminated = 0; const exits: Promise<number>[] = [], started: number[] = []
function actualWorker(): RegexWorkerPort {
  const serial = ++actualCreated, worker = new NodeWorker(workerCode, { eval: true }); let stopped = false
  const port: RegexWorkerPort = { onmessage: null, onerror: null, onmessageerror: null, postMessage: value => worker.postMessage(value), terminate() { if (!stopped) { stopped = true; actualTerminated++; exits.push(worker.terminate()) } } }
  worker.on('message', data => { if (data.testStarted) started.push(serial); else port.onmessage?.({ data } as MessageEvent) })
  worker.on('error', () => port.onerror?.({ preventDefault() {} } as ErrorEvent)); worker.on('messageerror', () => port.onmessageerror?.({} as MessageEvent)); return port
}
await check('actual product Worker module in a separate thread preserves Unicode/output limits and smart replacements', async () => {
  const client = createRegexClient({ createWorker: actualWorker })
  assert.deepEqual((await client.run(input('😀a', '(?:)', { flags: 'gv' }), 1)).details.map(row => row.index), [0, 2, 3])
  assert.equal((await client.run(input('hello world', '\\b(\\w)', { operation: 'replace', transform: 'uppercaseMatch' }), 2)).outputText, 'Hello World')
  assert.equal(await outcome(client.run(input('x'.repeat(1000), '(?:)', { operation: 'replace', replacement: 'r'.repeat(100000) }), 3)), 'outputTooLarge')
  assert.equal(await outcome(client.run(input('a', '['), 4)), 'invalidRegex'); client.dispose(); assert.equal(actualCreated, actualTerminated)
})
await check('actual pathological backtracking is terminated by the client deadline while the parent heartbeat keeps running', async () => {
  const before = actualCreated, client = createRegexClient({ createWorker: actualWorker, timeoutMs: 300 }); let heartbeats = 0
  const interval = setInterval(() => { heartbeats++ }, 10)
  try { assert.equal(await outcome(client.run(input('a'.repeat(40) + '!', '(a+)+$'), 1)), 'timeout') } finally { clearInterval(interval); client.dispose() }
  assert.ok(started.includes(before + 1), 'the real engine entered the pathological request before the deadline'); assert.ok(heartbeats >= 5); assert.equal(actualCreated, actualTerminated)
})
await check('actual superseded and explicitly canceled workers cannot replace the newest dedupe result', async () => {
  const client = createRegexClient({ createWorker: actualWorker }), old = outcome(client.run(input('a'.repeat(40) + '!', '(a+)+$'), 1))
  const result = await client.run(input('A1\nA1\nB2', '', { operation: 'grep', transform: 'dedupe' }), 2); assert.equal(await old, 'canceled'); assert.equal(result.outputText, 'A1\nB2')
  const next = outcome(client.run(input('a'.repeat(40) + '!', '(a+)+$'), 3)); client.cancel(); assert.equal(await next, 'canceled'); client.dispose(); assert.equal(actualCreated, actualTerminated)
})
await Promise.all(exits)
console.log(`Regex client: ${groups} groups passed; ${actualCreated} actual threads created/${actualTerminated} terminated`)
