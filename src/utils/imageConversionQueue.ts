import type { ConvertOptions, ConvertOutput, SourceFormat } from './imageConvert.ts'

export type ConversionOutput = Readonly<ConvertOutput & { url: string }>
export type ConversionSuccess = Readonly<{ key: string; options: Readonly<ConvertOptions>; output: ConversionOutput }>
export type ConversionItem = Readonly<{
  id: string; file: File; src: SourceFormat; status: 'pending' | 'processing' | 'done' | 'error'
  attemptKey?: string; error?: unknown; lastSuccess?: ConversionSuccess
}>
export type ConversionSnapshot = Readonly<{
  items: readonly ConversionItem[]; options: Readonly<ConvertOptions>; key: string
  settling: boolean; paused: boolean; activeId: string | null
  phase: 'idle' | 'running' | 'finishing' | 'paused' | 'settling'
}>
type Entry = { -readonly [K in keyof ConversionItem]: ConversionItem[K] }
type Task = { entry: Entry; generation: number; key: string; options: Readonly<ConvertOptions> }

/** Preserve the converter's existing complete settings identity. */
export const imageConversionKey = (options: ConvertOptions) => `${options.format}|${options.quality}|${options.bg}`

/** Pause finishes the current file. Settings/reset invalidate acceptance, never the live process slot. */
export function createImageConversionQueue(ports: {
  options: ConvertOptions
  process: (file: File, options: ConvertOptions) => Promise<ConversionOutput>
  release: (output: ConversionOutput) => void
  onChange?: (snapshot: ConversionSnapshot) => void
  schedule?: (callback: () => void, delay: number) => unknown
  cancel?: (timer: unknown) => void
}) {
  let options = Object.freeze({ ...ports.options }), key = imageConversionKey(options)
  const entries = new Map<string, Entry>()
  let generation = 0, paused = false, disposed = false, settling = false, queued = false
  let active: Task | null = null
  let debounce: { handle?: unknown; generation: number } | null = null
  const scheduleTimer = ports.schedule ?? ((callback: () => void, delay: number) => setTimeout(callback, delay))
  const cancelTimer = ports.cancel ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  const snapshot = (): ConversionSnapshot => Object.freeze({
    items: Object.freeze([...entries.values()].map(item => Object.freeze({ ...item }))), options, key,
    settling, paused, activeId: active?.entry.id ?? null,
    phase: paused ? active ? 'finishing' : 'paused' : active ? 'running' : settling ? 'settling' : 'idle',
  })
  let current = snapshot()
  const publish = () => { current = snapshot(); if (!disposed) ports.onChange?.(current) }
  const release = (output: ConversionOutput | undefined) => {
    if (output) { try { ports.release(output) } catch { /* Cleanup failure must not unlock a running process or restore a removed row. */ } }
  }
  const clearDebounce = () => {
    const timer = debounce; debounce = null
    if (timer?.handle !== undefined) cancelTimer(timer.handle)
  }
  const pending = (entry: Entry) => { entry.status = 'pending'; delete entry.attemptKey; delete entry.error }
  const accepts = (task: Task) => !disposed && task.generation === generation && task.key === key && entries.get(task.entry.id) === task.entry
  const schedule = () => {
    if (disposed || paused || settling || active || queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (disposed || paused || settling || active) return
      const entry = [...entries.values()].find(item => item.status === 'pending')
      if (!entry) return
      const task: Task = { entry, generation, key, options }
      active = task; entry.status = 'processing'; entry.attemptKey = key
      publish()
      void run(task)
    })
  }
  const run = async (task: Task) => {
    try {
      // A subscriber may pause/remove/change settings during the processing notification.
      if (!accepts(task) || paused) return
      const output = await ports.process(task.entry.file, { ...task.options })
      if (!accepts(task)) { release(output); return }
      const previous = task.entry.lastSuccess?.output
      task.entry.lastSuccess = Object.freeze({ key: task.key, options: task.options, output: Object.freeze({ ...output }) })
      task.entry.status = 'done'; task.entry.attemptKey = task.key; delete task.entry.error
      if (previous !== output) release(previous)
    } catch (error) {
      if (accepts(task)) { task.entry.status = 'error'; task.entry.attemptKey = task.key; task.entry.error = error }
    } finally {
      if (entries.get(task.entry.id) === task.entry && task.entry.status === 'processing') pending(task.entry)
      if (active === task) active = null
      publish(); schedule()
    }
  }
  return {
    getSnapshot: () => current,
    add(files: readonly { id: string; file: File; src: SourceFormat }[]) {
      if (disposed) return
      const ids = new Set(entries.keys())
      for (const file of files) { if (!file.id || ids.has(file.id)) throw new Error('duplicateImageId'); ids.add(file.id) }
      for (const file of files) entries.set(file.id, { id: file.id, file: file.file, src: file.src, status: 'pending' })
      publish(); schedule()
    },
    remove(id: string) {
      if (disposed) return
      const entry = entries.get(id); if (!entry) return
      entries.delete(id); release(entry.lastSuccess?.output); publish(); schedule()
    },
    clear() {
      if (disposed) return
      generation++; clearDebounce(); settling = false
      const old = [...entries.values()]; entries.clear()
      for (const entry of old) release(entry.lastSuccess?.output)
      publish()
    },
    setOptions(next: ConvertOptions, delay = 250) {
      if (disposed || imageConversionKey(next) === key) return
      generation++; clearDebounce()
      options = Object.freeze({ ...next }); key = imageConversionKey(options)
      for (const entry of entries.values()) pending(entry)
      settling = delay > 0
      if (settling) {
        const timer = { generation, handle: undefined as unknown }; debounce = timer
        timer.handle = scheduleTimer(() => {
          if (disposed || debounce !== timer || timer.generation !== generation) return
          debounce = null; settling = false; publish(); schedule()
        }, delay)
      }
      publish(); schedule()
    },
    pause() { if (disposed || paused) return; paused = true; publish() },
    resume() { if (disposed || !paused) return; paused = false; publish(); schedule() },
    retryFailed() {
      if (disposed || settling) return
      for (const entry of entries.values()) if (entry.status === 'error' && entry.attemptKey === key) pending(entry)
      publish(); schedule()
    },
    dispose() {
      if (disposed) return
      disposed = true; generation++; clearDebounce(); settling = false
      const old = [...entries.values()]; entries.clear()
      for (const entry of old) release(entry.lastSuccess?.output)
      current = snapshot()
    },
  }
}
