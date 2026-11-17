import { captureRegexJob, REGEX_LIMITS, RegexEngineError, isRegexObject, type RegexEngineResult } from '../../utils/regexEngine.ts'
import { parseRegexResult, RegexExecutionError, regexExecutionErrorCode, type RegexWorkerRequest } from './protocol.ts'

export interface RegexWorkerPort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null
  postMessage(request: RegexWorkerRequest): void
  terminate(): void
}
type Active = { id: number; revision: number; worker: RegexWorkerPort; timer: ReturnType<typeof setTimeout> | null; done: boolean; resolve: (result: RegexEngineResult) => void; reject: (cause: RegexExecutionError) => void }
export function createRegexClient(options: { createWorker?: () => RegexWorkerPort; timeoutMs?: number } = {}) {
  let nextId = 0, active: Active | null = null, disposed = false
  const timeoutMs = options.timeoutMs ?? REGEX_LIMITS.timeoutMs
  const createWorker = options.createWorker ?? (() => {
    if (typeof Worker === 'undefined') throw new RegexExecutionError('unsupported')
    return new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' })
  })
  function finish(entry: Active, result: RegexEngineResult | RegexExecutionError) {
    if (entry.done || active !== entry) return
    entry.done = true; active = null
    if (entry.timer !== null) clearTimeout(entry.timer)
    try { entry.worker.onmessage = null; entry.worker.onerror = null; entry.worker.onmessageerror = null } catch { /* Always try termination independently. */ }
    try { entry.worker.terminate() } catch { /* A failed browser cleanup cannot settle a request twice. */ }
    if (result instanceof RegexExecutionError) entry.reject(result); else entry.resolve(result)
  }
  function cancel() { if (active) finish(active, new RegexExecutionError('canceled')) }
  function run(value: unknown, revision = 0): Promise<RegexEngineResult> {
    cancel()
    return new Promise((resolve, reject) => {
      if (disposed) { reject(new RegexExecutionError('canceled')); return }
      if (!Number.isSafeInteger(revision) || revision < 0) { reject(new RegexExecutionError('invalidInput')); return }
      let job: ReturnType<typeof captureRegexJob>
      try { job = captureRegexJob(value) } catch (cause) { reject(new RegexExecutionError(cause instanceof RegexEngineError ? cause.code : 'invalidInput')); return }
      let worker: RegexWorkerPort
      try { worker = createWorker() } catch (cause) { reject(cause instanceof RegexExecutionError ? cause : new RegexExecutionError('workerFailed')); return }
      const entry: Active = { id: ++nextId, revision, worker, timer: null, done: false, resolve, reject }; active = entry
      try {
        worker.onmessage = event => {
          if (entry.done || active !== entry) return
          const message = event.data
          if (!isRegexObject(message)) { finish(entry, new RegexExecutionError('invalidResponse')); return }
          if (message.id !== entry.id || message.revision !== entry.revision) return
          if (message.ok === true) { const result = parseRegexResult(message.result); finish(entry, result ?? new RegexExecutionError('invalidResponse')) }
          else if (message.ok === false) finish(entry, new RegexExecutionError(regexExecutionErrorCode(message.error)))
          else finish(entry, new RegexExecutionError('invalidResponse'))
        }
        worker.onerror = event => { event.preventDefault?.(); finish(entry, new RegexExecutionError('workerFailed')) }
        worker.onmessageerror = () => finish(entry, new RegexExecutionError('workerFailed'))
        entry.timer = setTimeout(() => finish(entry, new RegexExecutionError('timeout')), timeoutMs)
        worker.postMessage({ id: entry.id, revision, job })
      } catch { finish(entry, new RegexExecutionError('workerFailed')) }
    })
  }
  return { run, cancel, dispose() { disposed = true; cancel() } }
}
