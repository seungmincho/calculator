import type { CompressOptions } from './imageCompress.ts'

export type ImageQueueStatus = 'pending' | 'processing' | 'done' | 'error'
export type ImageQueueItem<T> = {
  readonly id: string
  readonly file: File
  readonly status: ImageQueueStatus
  readonly key?: string
  readonly out?: T
  readonly error?: unknown
}
export type ImageQueueSnapshot<T> = {
  readonly items: readonly ImageQueueItem<T>[]
  readonly key: string
  readonly paused: boolean
  readonly activeId: string | null
  readonly phase: 'idle' | 'running' | 'pausing' | 'paused'
}
type Entry<T> = { -readonly [K in keyof ImageQueueItem<T>]: ImageQueueItem<T>[K] }
type Task<T> = { entry: Entry<T>; key: string; generation: number; controller: AbortController }

/** Match the existing UI key: quality does not affect target-size mode. */
export function imageCompressionKey(options: CompressOptions): string {
  return `${options.targetKB > 0 ? `t${options.targetKB}` : `q${options.quality}`}|${options.format}|${options.maxSide}`
}

export function createImageCompressionQueue<T>(ports: {
  options: CompressOptions
  process: (file: File, options: CompressOptions, signal: AbortSignal) => Promise<T>
  release?: (output: T) => void
  onChange?: (snapshot: ImageQueueSnapshot<T>) => void
}) {
  let options = { ...ports.options }
  let key = imageCompressionKey(options)
  const entries = new Map<string, Entry<T>>()
  let generation = 0
  let paused = false
  let disposed = false
  let scheduled = false
  let active: Task<T> | null = null

  const snapshot = (): ImageQueueSnapshot<T> => Object.freeze({
    items: Object.freeze([...entries.values()].map(entry => Object.freeze({ ...entry }))),
    key, paused, activeId: active?.entry.id ?? null,
    phase: paused ? active ? 'pausing' : 'paused' : active ? 'running' : 'idle',
  })
  let current = snapshot()
  const publish = () => {
    current = snapshot()
    if (!disposed) ports.onChange?.(current)
  }
  const release = (output: T | undefined) => {
    if (output === undefined) return
    // Cleanup failure must not revive an invalidated item or unlock a running task.
    try { ports.release?.(output) } catch { /* best-effort resource cleanup */ }
  }
  const reset = (entry: Entry<T>) => {
    release(entry.out)
    entry.status = 'pending'
    delete entry.out
    delete entry.error
    delete entry.key
  }
  const eligible = (task: Task<T>) => !disposed && !task.controller.signal.aborted &&
    task.generation === generation && task.key === key && entries.get(task.entry.id) === task.entry

  const schedule = () => {
    if (scheduled || disposed || paused || active) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (disposed || paused || active) return
      const entry = [...entries.values()].find(item => item.status === 'pending')
      if (!entry) return
      const task: Task<T> = { entry, key, generation, controller: new AbortController() }
      const capturedOptions = { ...options }
      active = task
      entry.status = 'processing'
      publish()
      void run(task, capturedOptions)
    })
  }

  const run = async (task: Task<T>, capturedOptions: CompressOptions) => {
    try {
      // A synchronous observer may pause/remove while the processing state is published.
      if (!eligible(task)) return
      const output = await ports.process(task.entry.file, capturedOptions, task.controller.signal)
      if (!eligible(task)) { release(output); return }
      task.entry.status = 'done'
      task.entry.key = task.key
      task.entry.out = output
      delete task.entry.error
    } catch (error) {
      if (eligible(task)) {
        task.entry.status = 'error'
        task.entry.key = task.key
        task.entry.error = error
      }
    } finally {
      if (entries.get(task.entry.id) === task.entry && task.entry.status === 'processing') reset(task.entry)
      // Abort is only a request. Keep this slot until the actual processor settles.
      if (active === task) active = null
      publish()
      schedule()
    }
  }

  return {
    getSnapshot: () => current,
    add(files: readonly { id: string; file: File }[]) {
      if (disposed) return
      const ids = new Set(entries.keys())
      for (const file of files) {
        if (!file.id || ids.has(file.id)) throw new Error('duplicateImageId')
        ids.add(file.id)
      }
      for (const file of files) entries.set(file.id, { ...file, status: 'pending' })
      publish(); schedule()
    },
    remove(id: string) {
      if (disposed) return
      const entry = entries.get(id)
      if (!entry) return
      entries.delete(id)
      if (active?.entry === entry) active.controller.abort()
      release(entry.out)
      publish(); schedule()
    },
    clear() {
      if (disposed) return
      generation++
      active?.controller.abort()
      for (const entry of entries.values()) release(entry.out)
      entries.clear()
      publish()
    },
    setOptions(next: CompressOptions) {
      if (disposed) return
      options = { ...next }
      const nextKey = imageCompressionKey(options)
      if (nextKey === key) return
      key = nextKey
      generation++
      active?.controller.abort()
      for (const entry of entries.values()) reset(entry)
      publish(); schedule()
    },
    pause() {
      if (disposed || paused) return
      paused = true
      active?.controller.abort()
      publish()
    },
    resume() {
      if (disposed) return
      paused = false
      publish(); schedule()
    },
    retryFailed(ids?: readonly string[]) {
      if (disposed) return
      const selected = ids ? new Set(ids) : null
      for (const entry of entries.values()) {
        if (entry.status === 'error' && (!selected || selected.has(entry.id))) reset(entry)
      }
      publish(); schedule()
    },
    dispose() {
      if (disposed) return
      disposed = true
      generation++
      active?.controller.abort()
      for (const entry of entries.values()) release(entry.out)
      entries.clear()
      current = snapshot()
    },
  }
}
