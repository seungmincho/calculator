export const QR_BATCH_MAX_ROWS = 30
export const QR_BATCH_MAX_BYTES = 1_000
export const QR_BATCH_MAX_CHARS = 30_000
export const QR_BATCH_OPTIONS = {
  errorCorrectionLevel: 'M' as const, width: 512, margin: 4,
  color: { dark: '#000000ff', light: '#ffffffff' }, type: 'image/png' as const,
}

export type QrBatchRowError = 'empty' | 'bytes' | 'unicode'
export type QrBatchError = 'emptyInput' | 'totalLimit' | 'rowLimit'
export interface QrBatchRow {
  line: number
  label: string
  payload: string
  bytes: number
  filename: string
  error: QrBatchRowError | null
}
export interface QrBatchPlan {
  rows: QrBatchRow[]
  rowCount: number
  error: QrBatchError | null
  valid: boolean
}
export interface QrBatchImage { row: QrBatchRow; dataUrl: string }
export type QrBatchGeneration =
  | { status: 'done'; images: QrBatchImage[] }
  | { status: 'cancelled' | 'invalid' }
  | { status: 'failed'; line: number }

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
    } else if (code >= 0xdc00 && code <= 0xdfff) return true
  }
  return false
}

/** The line prefix provides uniqueness even for duplicate names and Windows reserved names. */
export function qrBatchFilename(label: string, line: number): string {
  const cleaned = label.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '')
  const stem = Array.from(cleaned).slice(0, 40).join('')
  return `qr-${String(line).padStart(3, '0')}${stem ? `-${stem}` : ''}.png`
}

/** One final newline is a delimiter, while any other empty row is an explicit validation error. */
export function parseQrBatch(input: string): QrBatchPlan {
  if (!input) return { rows: [], rowCount: 0, error: 'emptyInput', valid: false }
  if (input.length > QR_BATCH_MAX_CHARS) return { rows: [], rowCount: 0, error: 'totalLimit', valid: false }
  const normalized = input.replace(/\r\n?/g, '\n')
  const lines = (normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized).split('\n')
  if (lines.length > QR_BATCH_MAX_ROWS) return { rows: [], rowCount: lines.length, error: 'rowLimit', valid: false }
  const encoder = new TextEncoder()
  const rows = lines.map((value, index): QrBatchRow => {
    const separator = value.indexOf('\t')
    const label = separator < 0 ? '' : value.slice(0, separator).trim()
    // Only the first tab separates a label. Keep all remaining whitespace and tabs in the payload.
    const payload = separator < 0 ? value : value.slice(separator + 1)
    const bytes = encoder.encode(payload).length
    const error = !payload.trim() ? 'empty' : hasUnpairedSurrogate(payload) ? 'unicode' : bytes > QR_BATCH_MAX_BYTES ? 'bytes' : null
    return { line: index + 1, label, payload, bytes, filename: qrBatchFilename(label, index + 1), error }
  })
  return { rows, rowCount: rows.length, error: null, valid: rows.every(row => row.error === null) }
}

/** Publish a complete batch only. Failed or cancelled runs never expose a downloadable partial set. */
export async function generateQrBatch(
  plan: QrBatchPlan,
  render: (payload: string) => Promise<string>,
  cancelled: () => boolean,
  onProgress: (completed: number) => void = () => {},
): Promise<QrBatchGeneration> {
  if (!plan.valid || plan.error || !plan.rows.length || plan.rows.some(row => row.error)) return { status: 'invalid' }
  const images: QrBatchImage[] = []
  for (const row of plan.rows) {
    // Yield between rows so input edits and cancellation can invalidate the generation token.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    if (cancelled()) return { status: 'cancelled' }
    try {
      const dataUrl = await render(row.payload)
      if (cancelled()) return { status: 'cancelled' }
      if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl)) throw new Error('Invalid PNG output')
      images.push({ row, dataUrl })
      onProgress(images.length)
    } catch {
      return cancelled() ? { status: 'cancelled' } : { status: 'failed', line: row.line }
    }
  }
  return { status: 'done', images }
}
