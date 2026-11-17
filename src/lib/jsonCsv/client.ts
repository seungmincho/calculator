import { JSON_CSV_LIMITS, type JsonCsvMode, type JsonCsvOptions } from '../../utils/jsonCsv.ts'
import type { JsonCsvFileEncoding } from '../../utils/jsonCsvActions.ts'
import { JsonCsvExecutionError, isJsonCsvFailure, isJsonCsvRequest, isJsonCsvSuccess, jsonCsvObject, type JsonCsvFailure, type JsonCsvJob, type JsonCsvRequest, type JsonCsvSuccess } from './protocol.ts'

export interface JsonCsvWorkerPort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null
  postMessage: (request: JsonCsvRequest, transfer: ArrayBuffer[]) => void
  terminate: () => void
}
type Active = { id: number; job: JsonCsvJob; worker: JsonCsvWorkerPort; timer: ReturnType<typeof setTimeout> | null; resolve: (value: JsonCsvSuccess) => void; reject: (error: JsonCsvExecutionError) => void }
const failure = (code: 'canceled' | 'unsupported' | 'workerFailed' | 'invalidResponse' | 'timeout'): JsonCsvFailure => ({ scope: 'worker', code })

/** One request owns one Worker; cancel terminates CPU work instead of queueing a cancel message. */
export function createJsonCsvClient(options: { createWorker?: () => JsonCsvWorkerPort; timeoutMs?: number } = {}) {
  let serial = 0, disposed = false
  let active: Active | null = null
  const createWorker = options.createWorker ?? (() => {
    if (typeof Worker === 'undefined') throw new JsonCsvExecutionError(failure('unsupported'))
    return new Worker(new URL('./jsonCsv.worker.ts', import.meta.url), { type: 'module' })
  })
  function finish(entry: Active, outcome: { success: JsonCsvSuccess } | { error: JsonCsvFailure }) {
    if (active !== entry) return
    active = null
    if (entry.timer !== null) clearTimeout(entry.timer)
    entry.worker.onmessage = null; entry.worker.onerror = null; entry.worker.onmessageerror = null
    try { entry.worker.terminate() } catch { /* Settle even if browser cleanup fails. */ }
    if ('success' in outcome) entry.resolve(outcome.success)
    else entry.reject(new JsonCsvExecutionError(outcome.error))
  }
  function cancel() { if (active) finish(active, { error: failure('canceled') }) }
  function run(job: JsonCsvJob): Promise<JsonCsvSuccess> {
    cancel()
    return new Promise((resolve, reject) => {
      const fail = (error: JsonCsvFailure) => reject(new JsonCsvExecutionError(error))
      if (disposed) { fail(failure('canceled')); return }
      const request: JsonCsvRequest = { ...job, version: 1, id: ++serial }
      if (!isJsonCsvRequest(request)) { fail(failure('invalidResponse')); return }
      if (job.kind === 'convert' && job.input.length > JSON_CSV_LIMITS.inputBytes) { fail({ scope: 'conversion', code: 'inputLimit', position: {} }); return }
      if (job.kind === 'decode' && job.bytes.byteLength > JSON_CSV_LIMITS.inputBytes) { fail({ scope: 'file', code: 'fileLimit' }); return }
      let worker: JsonCsvWorkerPort
      try { worker = createWorker() } catch (cause) { reject(cause instanceof JsonCsvExecutionError ? cause : new JsonCsvExecutionError(failure('workerFailed'))); return }
      const entry: Active = { id: request.id, job, worker, timer: null, resolve, reject }
      active = entry
      try {
        worker.onmessage = event => {
          if (active !== entry) return
          const message = event.data
          if (!jsonCsvObject(message)) { finish(entry, { error: failure('invalidResponse') }); return }
          if (message.id !== entry.id) return
          if (message.version !== 1 || message.kind !== job.kind) { finish(entry, { error: failure('invalidResponse') }); return }
          if (message.ok === true && isJsonCsvSuccess(message, job)) finish(entry, { success: message })
          else if (message.ok === false && isJsonCsvFailure(message.error, job.kind)) finish(entry, { error: message.error })
          else finish(entry, { error: failure('invalidResponse') })
        }
        worker.onerror = event => { event.preventDefault?.(); finish(entry, { error: failure('workerFailed') }) }
        worker.onmessageerror = () => finish(entry, { error: failure('workerFailed') })
        entry.timer = setTimeout(() => finish(entry, { error: failure('timeout') }), options.timeoutMs ?? 30_000)
        worker.postMessage(request, job.kind === 'decode' ? [job.bytes] : [])
      } catch { finish(entry, { error: failure('workerFailed') }) }
    })
  }
  return {
    async convert(input: string, mode: JsonCsvMode, settings: JsonCsvOptions) {
      const value = await run({ kind: 'convert', input, mode, options: { ...settings } })
      if (value.kind !== 'convert') throw new JsonCsvExecutionError(failure('invalidResponse'))
      return { result: value.result, computeMs: value.computeMs }
    },
    async decode(bytes: ArrayBuffer, encoding: JsonCsvFileEncoding) {
      const value = await run({ kind: 'decode', bytes, encoding })
      if (value.kind !== 'decode') throw new JsonCsvExecutionError(failure('invalidResponse'))
      return { text: value.text, computeMs: value.computeMs }
    },
    cancel,
    dispose() { disposed = true; cancel() },
  }
}
