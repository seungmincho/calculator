import { createImageZipRunner, type ImageZipEntry, type ImageZipSnapshot, type ImageZipState } from './imageZipSnapshot.ts'

/** Invalidation suppresses a late download but retains physical busy until JSZip really settles. */
export function createWatermarkZipController(ports: {
  encode: (entries: readonly ImageZipEntry[]) => Promise<Blob>
  download: (blob: Blob, snapshot: ImageZipSnapshot) => void
  onChange?: (state: ImageZipState) => void
}) {
  let disposed = false, generation = 0, busy = false, error: unknown = null
  let active: ReturnType<typeof createImageZipRunner> | null = null
  const snapshot = (): ImageZipState => Object.freeze({ busy, error })
  let state = snapshot()
  const publish = () => { state = snapshot(); if (!disposed) ports.onChange?.(state) }
  return {
    getSnapshot: () => state,
    async run(input: ImageZipSnapshot): Promise<'downloaded' | 'failed' | 'stale' | 'empty' | 'busy'> {
      if (disposed) return 'stale'
      if (busy) return 'busy'
      const task = ++generation
      const runner = createImageZipRunner({ encode: ports.encode, download: ports.download })
      active = runner; busy = true; error = null; publish()
      try {
        const outcome = await runner.run(input)
        if (disposed || task !== generation) return 'stale'
        if (outcome === 'failed') error = runner.getSnapshot().error
        return outcome
      } finally {
        runner.dispose()
        if (active === runner) active = null
        busy = false; publish()
      }
    },
    invalidate() { if (!disposed) { generation++; active?.dispose(); error = null; publish() } },
    dispose() { if (!disposed) { disposed = true; generation++; active?.dispose(); error = null; state = snapshot() } },
  }
}
