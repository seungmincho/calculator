import type { ImageQueueSnapshot } from './imageCompressionQueue.ts'
import { reserveUniqueImageNames } from './imageUniqueNames.ts'

export type ImageZipEntry = { readonly id: string; readonly name: string; readonly blob: Blob }
export type ImageZipSnapshot = { readonly key: string; readonly entries: readonly ImageZipEntry[] }

/** Capture only current-setting outputs. Later queue edits cannot change these Blobs. */
export function captureImageZip<T extends { blob: Blob }>(
  source: ImageQueueSnapshot<T>, nameOf: (file: File, output: T) => string,
): ImageZipSnapshot {
  const completed = source.items.filter(item => item.status === 'done' && item.key === source.key && item.out)
  const names = reserveUniqueImageNames(completed.map(item => nameOf(item.file, item.out!)))
  return Object.freeze({ key: source.key, entries: Object.freeze(completed.map((item, index) => Object.freeze({
    id: item.id, name: names[index], blob: item.out!.blob,
  }))) })
}

export type ImageZipState = { readonly busy: boolean; readonly error: unknown | null }

/** ZIP encoding may finish late; only the latest mounted request may download. */
export function createImageZipRunner(ports: {
  encode: (entries: readonly ImageZipEntry[]) => Promise<Blob>
  download: (blob: Blob, snapshot: ImageZipSnapshot) => void
  onChange?: (state: ImageZipState) => void
}) {
  let generation = 0
  let disposed = false
  let current: ImageZipState = Object.freeze({ busy: false, error: null })
  const publish = (busy: boolean, error: unknown | null = null) => {
    current = Object.freeze({ busy, error })
    if (!disposed) ports.onChange?.(current)
  }
  return {
    getSnapshot: () => current,
    async run(input: ImageZipSnapshot): Promise<'downloaded' | 'failed' | 'stale' | 'empty'> {
      if (disposed) return 'stale'
      const task = ++generation
      const snapshot: ImageZipSnapshot = Object.freeze({ key: input.key, entries: Object.freeze(input.entries.map(entry => Object.freeze({ ...entry }))) })
      if (!snapshot.entries.length) { publish(false); return 'empty' }
      publish(true)
      try {
        const blob = await ports.encode(snapshot.entries)
        if (disposed || task !== generation) return 'stale'
        ports.download(blob, snapshot)
        return 'downloaded'
      } catch (error) {
        if (disposed || task !== generation) return 'stale'
        publish(false, error)
        return 'failed'
      } finally {
        if (!disposed && task === generation && current.busy) publish(false)
      }
    },
    dispose() {
      disposed = true
      generation++
      current = Object.freeze({ busy: false, error: null })
    },
  }
}
