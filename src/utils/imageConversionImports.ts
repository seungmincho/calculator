import { acceptFile, detectFormat, readHead, type SourceFormat } from './imageConvert.ts'

export type ConversionImport = Readonly<{ file: File; src: SourceFormat }>
export type ConversionImportResult = Readonly<{ status: 'added' | 'empty' | 'stale' | 'failed'; added: number; skipped: number; error?: unknown }>

/** Concurrent batches share only the clear/unmount generation; adding a second batch does not cancel the first. */
export function createImageConversionImports(ports: {
  add: (files: readonly ConversionImport[]) => void
  read?: (file: File) => Promise<Uint8Array>
  onChange?: (reading: number) => void
}) {
  let generation = 0, disposed = false, reading = 0
  const publish = () => { if (!disposed) ports.onChange?.(reading) }
  return {
    getReading: () => reading,
    async add(files: readonly File[]): Promise<ConversionImportResult> {
      if (disposed) return { status: 'stale', added: 0, skipped: 0 }
      const accepted = files.filter(acceptFile), skipped = files.length - accepted.length, task = generation
      if (!accepted.length) return { status: 'empty', added: 0, skipped }
      reading += accepted.length; publish()
      try {
        if (disposed || task !== generation) return { status: 'stale', added: 0, skipped }
        const rows = await Promise.all(accepted.map(async file => {
          let head: Uint8Array | null = null
          try { head = await (ports.read ?? readHead)(file) } catch { /* Existing MIME/name fallback is retained. */ }
          return Object.freeze({ file, src: detectFormat(head, file.name, file.type) })
        }))
        if (disposed || task !== generation) return { status: 'stale', added: 0, skipped }
        ports.add(Object.freeze(rows))
        return { status: 'added', added: rows.length, skipped }
      } catch (error) {
        return { status: disposed || task !== generation ? 'stale' : 'failed', added: 0, skipped, error }
      } finally {
        if (!disposed && task === generation) { reading -= accepted.length; publish() }
      }
    },
    clear() { if (disposed) return; generation++; reading = 0; publish() },
    dispose() { disposed = true; generation++; reading = 0 },
  }
}
