export interface OcrWorkerProgress { status: string; progress?: number; userJobId?: string }
/** Adapter supplies explicit Tesseract jobId and the existing { text: true, blocks: true } output. */
export interface OcrWorkerPort<Source, Result> {
  reinitialize: (langs: string, jobId: string) => Promise<unknown>
  recognize: (source: Source, jobId: string) => Promise<Result>
  terminate: () => Promise<unknown>
}
export interface OcrSessionPorts<Source, Result> {
  create: (langs: string, logger: (message: OcrWorkerProgress) => void, isCurrent: () => boolean) => Promise<OcrWorkerPort<Source, Result>>
}
export interface OcrSessionRequest<Source> {
  source: Source; langs: string; isCurrent: () => boolean
  onProgress?: (message: OcrWorkerProgress) => void
  onPhase?: (phase: 'waiting' | 'initializing' | 'recognizing') => void
}
export type OcrSessionOutcome<Result> = { status: 'done'; result: Result } | { status: 'failed' | 'cancelled' }
export interface OcrSessionRun<Result> { done: Promise<OcrSessionOutcome<Result>>; cancel: () => void }

/** One worker and serialized public calls per mounted session. Never clears caller-owned source data. */
export function createOcrWorkerSession<Source, Result>(ports: OcrSessionPorts<Source, Result>) {
  interface Holder { worker: OcrWorkerPort<Source, Result>; langs: string; identity: object; retiring: Promise<void> | null }
  interface Run {
    id: string; request: OcrSessionRequest<Source>; cancelled: boolean; settled: boolean; phase: 'waiting' | 'creating' | 'initializing' | 'recognizing'
    identity: object | null; holder: Holder | null; canceled: Promise<void>; notifyCancel: () => void
    finish: (outcome: OcrSessionOutcome<Result>) => void
  }
  let alive = true, blocked = false, sequence = 0, holder: Holder | null = null, active: Run | null = null
  let tail: Promise<void> = Promise.resolve()
  const pending = new Set<Run>(), retirements = new Set<Promise<void>>()
  const current = (run: Run) => { try { return alive && !run.cancelled && run.request.isCurrent() } catch { return false } }
  const phase = (run: Run, value: 'waiting' | 'initializing' | 'recognizing') => { if (current(run)) run.request.onPhase?.(value) }
  const retire = (entry: Holder): Promise<void> => {
    if (entry.retiring) return entry.retiring
    if (holder === entry) holder = null
    const retirement = Promise.resolve().then(() => entry.worker.terminate()).then(() => {}, () => { blocked = true; throw Error('OCR worker termination failed') })
    entry.retiring = retirement; retirements.add(retirement)
    void retirement.then(() => { retirements.delete(retirement) }, () => { retirements.delete(retirement) })
    return retirement
  }
  const cancel = (run: Run) => {
    if (run.cancelled || run.settled) return
    run.cancelled = true; run.notifyCancel(); run.finish({ status: 'cancelled' })
    if (run.holder) void retire(run.holder).catch(() => { /* Fail closed; no replacement worker is created. */ })
  }
  const awaitRun = async <Value>(run: Run, operation: Promise<Value>): Promise<{ ok: true; value: Value } | { ok: false }> =>
    Promise.race([operation.then(value => ({ ok: true as const, value })), run.canceled.then(() => ({ ok: false as const }))])
  const execute = async (run: Run) => {
    try {
      if (!current(run)) { run.finish({ status: 'cancelled' }); return }
      if (blocked) { run.finish({ status: 'failed' }); return }
      active = run
      let entry = holder
      if (!entry) {
        phase(run, 'initializing'); run.phase = 'creating'
        const identity = {}; run.identity = identity
        // Creation has no public cancel API. Keep the physical slot until it returns and is retired.
        const worker = await ports.create(run.request.langs, message => {
          const recipient = active
          if (!recipient || recipient.identity !== identity || !current(recipient)) return
          if (recipient.phase !== 'creating' && message.userJobId !== recipient.id) return
          recipient.request.onProgress?.(message)
        }, () => current(run))
        entry = { worker, langs: run.request.langs, identity, retiring: null }; run.holder = entry
        if (!current(run)) { await retire(entry); run.finish({ status: 'cancelled' }); return }
        holder = entry
      } else {
        run.holder = entry; run.identity = entry.identity
        if (entry.langs !== run.request.langs) {
          run.phase = 'initializing'; phase(run, 'initializing')
          const initialized = await awaitRun(run, entry.worker.reinitialize(run.request.langs, run.id))
          if (!initialized.ok || !current(run)) { await retire(entry); run.finish({ status: 'cancelled' }); return }
          entry.langs = run.request.langs
        }
      }
      if (!current(run)) { await retire(entry); run.finish({ status: 'cancelled' }); return }
      run.phase = 'recognizing'; phase(run, 'recognizing')
      const recognized = await awaitRun(run, entry.worker.recognize(run.request.source, run.id))
      if (!recognized.ok || !current(run)) { await retire(entry); run.finish({ status: 'cancelled' }); return }
      run.finish({ status: 'done', result: recognized.value })
    } catch {
      if (run.holder) { try { await retire(run.holder) } catch { /* blocked remains true */ } }
      run.finish({ status: current(run) ? 'failed' : 'cancelled' })
    } finally {
      if (run.cancelled && run.holder) { try { await retire(run.holder) } catch { /* blocked remains true */ } }
      if (active === run) active = null
      pending.delete(run)
    }
  }
  const run = (request: OcrSessionRequest<Source>): OcrSessionRun<Result> => {
    let resolve!: (outcome: OcrSessionOutcome<Result>) => void, notifyCancel!: () => void
    const done = new Promise<OcrSessionOutcome<Result>>(yes => { resolve = yes }), canceled = new Promise<void>(yes => { notifyCancel = yes })
    const job: Run = { id: `toolhub-ocr-${++sequence}`, request, cancelled: false, settled: false, phase: 'waiting', identity: null, holder: null, canceled, notifyCancel,
      finish(outcome) { if (!job.settled) { job.settled = true; resolve(outcome) } },
    }
    pending.add(job)
    try { phase(job, 'waiting') } catch { /* Progress UI cannot prevent cancellation ownership. */ }
    tail = tail.then(() => execute(job))
    return { done, cancel: () => cancel(job) }
  }
  return {
    run,
    cancelAll() {
      for (const job of pending) cancel(job)
      if (holder) {
        const retirement = retire(holder)
        // An idle worker is still owned until terminate completes; queue its replacement behind that.
        tail = tail.then(() => retirement.catch(() => {}))
      }
    },
    dispose() { alive = false; for (const job of pending) cancel(job); if (holder) void retire(holder).catch(() => {}) },
    /** Test/teardown observation only: creation may legitimately remain unresolved until its source settles. */
    async drain() { await tail; await Promise.allSettled([...retirements]) },
  }
}
