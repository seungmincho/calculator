import { convertName, DEFAULTS, needsBg, usesQuality, type ConvertOptions } from './imageConvert.ts'
import { createImageZipRunner, type ImageZipSnapshot, type ImageZipEntry } from './imageZipSnapshot.ts'
import { reserveUniqueImageNames } from './imageUniqueNames.ts'
import type { ConversionSnapshot } from './imageConversionQueue.ts'

export function imageConversionSettingsUrl(href: string, options: ConvertOptions): string | null {
  try {
    const url = new URL(href)
    for (const key of ['f', 'q', 'bg']) url.searchParams.delete(key)
    if (options.format !== DEFAULTS.format) url.searchParams.set('f', options.format)
    if (usesQuality(options.format) && options.quality !== DEFAULTS.quality) url.searchParams.set('q', String(options.quality))
    if (needsBg(options.format) && options.bg !== DEFAULTS.bg) url.searchParams.set('bg', options.bg.slice(1))
    return url.href
  } catch { return null }
}

/** Previous successes are available per row, but never silently included in the current-setting ZIP. */
export function captureImageConversionZip(source: ConversionSnapshot): ImageZipSnapshot {
  const done = source.settling ? [] : source.items.filter(item => item.status === 'done' && item.attemptKey === source.key && item.lastSuccess?.key === source.key)
  const names = reserveUniqueImageNames(done.map(item => convertName(item.file.name, item.lastSuccess!.options.format)))
  return Object.freeze({ key: source.key, entries: Object.freeze(done.map((item, index) => Object.freeze({ id: item.id, name: names[index], blob: item.lastSuccess!.output.blob }))) })
}

export type ConversionZipState = Readonly<{ status: 'idle' | 'working' | 'downloaded' | 'failed' | 'canceled'; error?: unknown }>
/** Each new/canceled request owns a runner. Adding/removing source rows need not mutate its Blob snapshot. */
export function createImageConversionZip(ports: {
  encode: (entries: readonly ImageZipEntry[]) => Promise<Blob>
  download: (blob: Blob, snapshot: ImageZipSnapshot) => void
  onChange?: (state: ConversionZipState) => void
}) {
  let generation = 0, disposed = false
  let active: ReturnType<typeof createImageZipRunner> | null = null
  let state: ConversionZipState = Object.freeze({ status: 'idle' })
  const publish = (next: ConversionZipState) => { state = Object.freeze(next); if (!disposed) ports.onChange?.(state) }
  return {
    getSnapshot: () => state,
    async run(snapshot: ImageZipSnapshot) {
      if (disposed) return 'stale' as const
      const task = ++generation
      active?.dispose()
      const runner = createImageZipRunner({ encode: ports.encode, download: ports.download })
      active = runner
      publish({ status: snapshot.entries.length ? 'working' : 'idle' })
      if (disposed || task !== generation) { runner.dispose(); return 'stale' as const }
      const outcome = await runner.run(snapshot)
      if (disposed || task !== generation) return 'stale' as const
      const error = runner.getSnapshot().error
      active = null; runner.dispose()
      publish(outcome === 'failed' ? { status: 'failed', error } : { status: outcome === 'downloaded' ? 'downloaded' : 'idle' })
      return outcome
    },
    cancel() {
      if (disposed) return
      generation++; active?.dispose(); active = null
      if (state.status === 'working') publish({ status: 'canceled' })
    },
    dispose() { disposed = true; generation++; active?.dispose(); active = null; state = Object.freeze({ status: 'idle' }) },
  }
}
