import { LINE_DIFF_LIMITS, type TextDiffResult } from '../../utils/lineDiff.ts'
import { validateDiffAgainstSources } from '../../utils/lineMerge.ts'
import { DiffExecutionError, executionErrorCode, isObject, type LineDiffRequest } from './protocol.ts'

export interface DiffWorkerPort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null
  postMessage: (request: LineDiffRequest) => void
  terminate: () => void
}
type Active = { id: number; worker: DiffWorkerPort; settled: boolean; timer: ReturnType<typeof setTimeout> | null; resolve: (result: TextDiffResult) => void; reject: (error: DiffExecutionError) => void }

export function createLineDiffClient(options: { createWorker?: () => DiffWorkerPort; timeoutMs?: number } = {}) {
  let nextId = 0
  let active: Active | null = null
  const timeoutMs = options.timeoutMs ?? 30_000
  const createWorker = options.createWorker ?? (() => {
    if (typeof Worker === 'undefined') throw new DiffExecutionError('unsupported')
    return new Worker(new URL('./lineDiff.worker.ts', import.meta.url), { type: 'module' })
  })
  function finish(entry: Active, outcome: { result: TextDiffResult } | { error: DiffExecutionError }) {
    if (active !== entry || entry.settled) return
    entry.settled = true; active = null
    if (entry.timer !== null) clearTimeout(entry.timer)
    try { entry.worker.onmessage = null; entry.worker.onerror = null; entry.worker.onmessageerror = null; entry.worker.terminate() } catch { /* Completion is still delivered if browser cleanup fails. */ }
    if ('result' in outcome) entry.resolve(outcome.result)
    else entry.reject(outcome.error)
  }
  function cancel() { if (active) finish(active, { error: new DiffExecutionError('canceled') }) }
  function run(left: string, right: string): Promise<TextDiffResult> {
    cancel()
    return new Promise((resolve, reject) => {
      // Cheap bound before structured-cloning enormous strings. Full byte/line/work checks run in the Worker.
      if (typeof left !== 'string' || typeof right !== 'string') { reject(new DiffExecutionError('invalidInput')); return }
      if (left.length > LINE_DIFF_LIMITS.bytes || right.length > LINE_DIFF_LIMITS.bytes) { reject(new DiffExecutionError('tooLarge')); return }
      let worker: DiffWorkerPort
      try { worker = createWorker() }
      catch (cause) { reject(cause instanceof DiffExecutionError ? cause : new DiffExecutionError('workerFailed')); return }
      const entry: Active = { id: ++nextId, worker, settled: false, timer: null, resolve, reject }
      active = entry
      try {
        worker.onmessage = event => {
          if (active !== entry || entry.settled) return
          const message = event.data
          if (!isObject(message)) { finish(entry, { error: new DiffExecutionError('invalidResponse') }); return }
          if (message.id !== entry.id) return
          if (message.ok === true && validateDiffAgainstSources(left, right, message.result)) finish(entry, { result: message.result as TextDiffResult })
          else if (message.ok === false) finish(entry, { error: new DiffExecutionError(executionErrorCode(message.error)) })
          else finish(entry, { error: new DiffExecutionError('invalidResponse') })
        }
        worker.onerror = event => { event.preventDefault?.(); finish(entry, { error: new DiffExecutionError('workerFailed') }) }
        worker.onmessageerror = () => finish(entry, { error: new DiffExecutionError('workerFailed') })
        entry.timer = setTimeout(() => finish(entry, { error: new DiffExecutionError('timeout') }), timeoutMs)
        worker.postMessage({ id: entry.id, left, right })
      } catch { finish(entry, { error: new DiffExecutionError('workerFailed') }) }
    })
  }
  return { run, cancel }
}
