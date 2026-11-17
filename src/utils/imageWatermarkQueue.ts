import { WATERMARK_LIMITS, WatermarkError, checkWatermarkAddition, createWatermarkSnapshot, type WatermarkSnapshot } from './imageWatermark.ts'

export type WatermarkRowStatus = 'pending' | 'processing' | 'done' | 'error'
export interface WatermarkRow<T> { readonly id: string; readonly file: File; readonly status: WatermarkRowStatus; readonly key?: string; readonly out?: T; readonly error?: unknown }
export interface WatermarkQueueState<T> {
  readonly items: readonly WatermarkRow<T>[]; readonly key: string; readonly outputBytes: number; readonly activeId: string | null
  readonly phase: 'idle' | 'running' | 'pausing' | 'paused'; readonly paused: boolean
}
type Entry<T> = { -readonly [K in keyof WatermarkRow<T>]: WatermarkRow<T>[K] }
type Task<T> = { entry: Entry<T>; generation: number; snapshot: WatermarkSnapshot; controller: AbortController }

/** Explicit batch membership; cancellation never releases a slot before the actual processor settles. */
export function createWatermarkQueue<T extends { blob: Blob }>(ports: {
  process: (file: File, snapshot: WatermarkSnapshot, signal: AbortSignal) => Promise<T>
  release?: (output: T) => void
  onChange?: (state: WatermarkQueueState<T>) => void
}) {
  const entries = new Map<string, Entry<T>>()
  let order: string[] = [], eligibleIds = new Set<string>(), settings: WatermarkSnapshot | null = null
  let generation = 0, outputBytes = 0, armed = false, paused = false, disposed = false, scheduled = false
  let active: Task<T> | null = null
  const snapshot = (): WatermarkQueueState<T> => Object.freeze({
    items: Object.freeze(order.map(id => Object.freeze({ ...entries.get(id)! }))), key: settings?.key ?? '', outputBytes,
    activeId: active?.entry.id ?? null, paused, phase: active ? (paused || !armed ? 'pausing' : 'running') : paused ? 'paused' : 'idle',
  })
  let current = snapshot()
  const publish = () => { current = snapshot(); if (!disposed) ports.onChange?.(current) }
  const release = (out: T) => { try { ports.release?.(out) } catch { /* Ownership is already removed; cleanup failure cannot revive output. */ } }
  const reset = (entry: Entry<T>) => {
    if (entry.out) { outputBytes -= entry.out.blob.size; release(entry.out) }
    entry.status = 'pending'; delete entry.out; delete entry.key; delete entry.error
  }
  const eligible = (task: Task<T>) => !disposed && armed && !paused && !task.controller.signal.aborted && task.generation === generation
    && entries.get(task.entry.id) === task.entry && settings?.key === task.snapshot.key && eligibleIds.has(task.entry.id)
  const schedule = () => {
    if (disposed || scheduled || active || !armed || paused || !settings) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (disposed || active || !armed || paused || !settings) return
      const entry = order.map(id => entries.get(id)!).find(item => eligibleIds.has(item.id) && item.status === 'pending')
      if (!entry) return
      const task: Task<T> = { entry, generation, snapshot: settings, controller: new AbortController() }
      active = task; entry.status = 'processing'; publish(); void run(task)
    })
  }
  const run = async (task: Task<T>) => {
    try {
      if (!eligible(task)) return
      const out = await ports.process(task.entry.file, task.snapshot, task.controller.signal)
      if (!eligible(task)) { release(out); return }
      if (!Number.isSafeInteger(out.blob.size) || out.blob.size < 1 || out.blob.size > WATERMARK_LIMITS.outputBytes - outputBytes) { release(out); throw new WatermarkError('outputLimit') }
      task.entry.out = out; task.entry.status = 'done'; task.entry.key = task.snapshot.key; delete task.entry.error
      outputBytes += out.blob.size
    } catch (error) {
      if (eligible(task)) { task.entry.status = 'error'; task.entry.key = task.snapshot.key; task.entry.error = error }
    } finally {
      if (entries.get(task.entry.id) === task.entry && task.entry.status === 'processing') reset(task.entry)
      if (active === task) active = null
      publish(); schedule()
    }
  }
  const invalidate = () => {
    generation++; active?.controller.abort(); armed = false; paused = false; settings = null; eligibleIds.clear()
    for (const entry of entries.values()) reset(entry)
  }
  return {
    getSnapshot: () => current,
    add(files: readonly { id: string; file: File }[]) {
      if (disposed) return
      checkWatermarkAddition([...entries.values()].map(row => row.file), files.map(row => row.file))
      const used = new Set(entries.keys())
      for (const row of files) { if (typeof row.id !== 'string' || !row.id || row.id.length > 128 || used.has(row.id)) throw new WatermarkError('options'); used.add(row.id) }
      for (const row of files) { entries.set(row.id, { ...row, status: 'pending' }); order.push(row.id) }
      // No automatic output generation; existing batch membership is unchanged.
      publish()
    },
    start(input: WatermarkSnapshot) {
      if (disposed) return
      const next = createWatermarkSnapshot(input.settings, input.logo)
      const changed = settings?.key !== next.key || settings?.logo?.file !== next.logo?.file
      generation++; active?.controller.abort()
      if (changed) for (const entry of entries.values()) reset(entry)
      else for (const entry of entries.values()) if (entry.status !== 'done') reset(entry)
      settings = next; armed = true; paused = false; eligibleIds = new Set(order)
      publish(); schedule()
    },
    invalidate() { if (!disposed) { invalidate(); publish() } },
    pause() { if (!disposed && armed && !paused) { paused = true; active?.controller.abort(); publish() } },
    resume() { if (!disposed && settings && armed && paused) { paused = false; publish(); schedule() } },
    retryFailed(ids?: readonly string[]) {
      if (disposed || !settings) return
      const selected = ids ? new Set(ids) : null
      const retryIds = new Set<string>()
      for (const entry of entries.values()) if (entry.status === 'error' && entry.key === settings.key && (!selected || selected.has(entry.id))) {
        reset(entry); retryIds.add(entry.id)
      }
      if (retryIds.size) {
        generation++; active?.controller.abort(); eligibleIds = retryIds
        armed = true; paused = false; publish(); schedule()
      }
    },
    remove(id: string) {
      if (disposed) return
      const entry = entries.get(id); if (!entry) return
      entries.delete(id); order = order.filter(value => value !== id); eligibleIds.delete(id)
      if (active?.entry === entry) active.controller.abort()
      reset(entry); publish(); schedule()
    },
    move(id: string, targetIndex: number) {
      if (disposed || !entries.has(id) || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= order.length) return
      const previous = order.indexOf(id); if (previous === targetIndex) return
      order = order.filter(value => value !== id); order.splice(targetIndex, 0, id); publish()
    },
    clear() { if (!disposed) { invalidate(); entries.clear(); order = []; publish() } },
    dispose() { if (!disposed) { disposed = true; invalidate(); entries.clear(); order = []; current = snapshot() } },
  }
}
