export type UrlBatchMode = 'encode' | 'decode'
export type UrlBatchRowError = 'encodeError' | 'decodeError'
export type UrlBatchLimit = 'tooManyCharacters' | 'tooManyLines'
export const URL_BATCH_MAX_LINES = 100
export const URL_BATCH_MAX_CHARACTERS = 30000

export interface UrlBatchRow {
  line: number
  source: string
  result: string
  status: 'success' | 'blank' | 'error'
  error: UrlBatchRowError | null
}
export interface UrlBatchResult {
  mode: UrlBatchMode
  rows: UrlBatchRow[]
  successRows: number
  errorRows: number
  blankRows: number
  multilineRows: number
  limit: UrlBatchLimit | null
}

/** Treat every source line as opaque text. No trimming, URL navigation, normalization or repeated decoding. */
export function convertUrlBatch(raw: string, mode: UrlBatchMode): UrlBatchResult {
  const input = raw.replace(/(?:\r\n|\n|\r)$/, '')
  const lines = raw === '' ? [] : input.split(/\r\n|\n|\r/)
  const output: UrlBatchResult = {
    mode, rows: [], successRows: 0, errorRows: 0, blankRows: 0, multilineRows: 0,
    limit: raw.length > URL_BATCH_MAX_CHARACTERS ? 'tooManyCharacters' : lines.length > URL_BATCH_MAX_LINES ? 'tooManyLines' : null,
  }
  if (output.limit) return output
  lines.forEach((source, index) => {
    if (source === '') {
      output.rows.push({ line: index + 1, source, result: '', status: 'blank', error: null })
      output.blankRows++
      return
    }
    try {
      const result = mode === 'encode' ? encodeURIComponent(source) : decodeURIComponent(source)
      output.rows.push({ line: index + 1, source, result, status: 'success', error: null })
      output.successRows++
      if (/[\r\n]/.test(result)) output.multilineRows++
    } catch {
      // Keep error rows in ordinary output too, rather than dropping them and shifting later rows.
      output.rows.push({ line: index + 1, source, result: source, status: 'error', error: mode === 'encode' ? 'encodeError' : 'decodeError' })
      output.errorRows++
    }
  })
  return output
}

export function urlBatchText(result: UrlBatchResult): string {
  return result.limit ? '' : result.rows.map((row) => row.result).join('\n')
}

export interface UrlBatchTableText {
  headers: readonly [string, string, string, string, string]
  success: string
  blank: string
  error: string
  errorDescription: (error: UrlBatchRowError) => string
}

function spreadsheetText(value: string, forceText = false): string {
  if (!value) return ''
  const protectedValue = forceText || /^[\s\uFEFF\u200B-\u200D]*[=+\-@]/.test(value) ? `'${value}` : value
  return /["\t\r\n]/.test(protectedValue) ? `"${protectedValue.replace(/"/g, '""')}"` : protectedValue
}

/** Quotes embedded tabs/newlines and prefixes untrusted cells with an apostrophe for spreadsheet safety. */
export function urlBatchTsv(result: UrlBatchResult, text: UrlBatchTableText): string {
  if (result.limit || !result.rows.length) return ''
  const rows = result.rows.map((row) => [
    String(row.line), spreadsheetText(text[row.status]), spreadsheetText(row.source, true), spreadsheetText(row.result, true),
    spreadsheetText(row.error ? text.errorDescription(row.error) : ''),
  ].join('\t'))
  return [text.headers.map((header) => spreadsheetText(header)).join('\t'), ...rows].join('\r\n')
}
