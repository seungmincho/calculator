import { canonical, parseAmount, toKoreanFormal, toKoreanReading } from './numberToKorean.ts'

export const NUMBER_BATCH_MAX_LINES = 100
export const NUMBER_BATCH_MAX_CHARACTERS = 30000
export const NUMBER_BATCH_MAX_LINE_CHARACTERS = 300

export type NumberBatchRowError = 'lineTooLong' | 'tooManyColumns' | 'emptyAmount' | 'invalidAmount'
export type NumberBatchLimit = 'tooManyCharacters' | 'tooManyLines'
interface RowSource {
  line: number
  raw: string
  label: string
}
export type NumberBatchRow =
  | (RowSource & { status: 'valid'; number: string; reading: string; formal: string })
  | (RowSource & { status: 'invalid'; error: NumberBatchRowError })
export interface NumberBatchResult {
  rows: NumberBatchRow[]
  totalLines: number
  skippedLines: number
  validRows: number
  invalidRows: number
  unavailableFormalRows: number
  limit: NumberBatchLimit | null
}

function validCommaGroups(amount: string): boolean {
  if (!amount.includes(',')) return true
  const compact = amount.replace(/\s/g, '')
  if (/(^|[^\d]),|,([^\d]|$)|\.\d*,/.test(compact)) return false
  return (compact.match(/\d[\d,]*/g) ?? []).every((digits) => !digits.includes(',') || /^\d{1,3}(?:,\d{3})+$/.test(digits))
}

/** Commas belong to an amount. Only tabs separate the optional label and the amount. */
export function convertNumberToKoreanBatch(raw: string, options: { prefix: string; spacing: boolean }): NumberBatchResult {
  // A terminal newline from a spreadsheet is a line terminator, not an extra 101st record.
  // Remove only one: intentional additional blank lines still count and retain their positions.
  const input = raw.replace(/(?:\r\n|\n|\r)$/, '')
  const lines = raw === '' ? [] : input.split(/\r\n|\n|\r/)
  const result: NumberBatchResult = {
    rows: [], totalLines: lines.length, skippedLines: 0, validRows: 0, invalidRows: 0, unavailableFormalRows: 0,
    limit: raw.length > NUMBER_BATCH_MAX_CHARACTERS ? 'tooManyCharacters' : lines.length > NUMBER_BATCH_MAX_LINES ? 'tooManyLines' : null,
  }
  // Do not return a misleading partial conversion when a whole-input limit is exceeded.
  if (result.limit) return result
  lines.forEach((line, index) => {
    if (!line.trim()) {
      result.skippedLines++
      return
    }
    const columns = line.split('\t')
    const source: RowSource = { line: index + 1, raw: line, label: columns.length > 1 ? columns[0].trim() : '' }
    const amount = columns.length > 1 ? columns[1] : columns[0]
    const error: NumberBatchRowError | null = line.length > NUMBER_BATCH_MAX_LINE_CHARACTERS
      ? 'lineTooLong'
      : columns.length > 2 ? 'tooManyColumns'
        : !amount.trim() ? 'emptyAmount' : !validCommaGroups(amount) ? 'invalidAmount' : null
    const parsed = error ? null : parseAmount(amount)
    if (error || !parsed) {
      result.rows.push({ ...source, status: 'invalid', error: error ?? 'invalidAmount' })
      result.invalidRows++
      return
    }
    const formal = toKoreanFormal(parsed, options.prefix, options.spacing)
    result.rows.push({ ...source, status: 'valid', number: canonical(parsed), reading: toKoreanReading(parsed, options.spacing), formal })
    result.validRows++
    if (!formal) result.unavailableFormalRows++
  })
  return result
}

export interface NumberBatchExportText {
  headers: readonly [string, string, string, string, string, string, string]
  valid: string
  unavailableFormal: string
  error: (error: NumberBatchRowError) => string
}

/** A leading apostrophe protects raw text/long numbers. Never manufacture spreadsheet formulas. */
export function protectSpreadsheetCell(value: string, forceText = false): string {
  if (!value) return ''
  // Includes leading whitespace, BOM and zero-width characters before a formula marker.
  const startsFormula = /^[\s\uFEFF\u200B-\u200D]*[=+\-@]/.test(value)
  return forceText || startsFormula ? `'${value}` : value
}

function quoteCell(value: string, separator: '\t' | ','): string {
  return value.includes(separator) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** All nonblank rows, including errors, stay in source order. Empty lines are represented by line-number gaps. */
export function serializeNumberToKoreanBatch(result: NumberBatchResult, format: 'tsv' | 'csv', text: NumberBatchExportText): string {
  if (result.limit || !result.rows.length) return ''
  const separator = format === 'tsv' ? '\t' : ','
  const rows = result.rows.map((row) => [
    String(row.line),
    protectSpreadsheetCell(row.label, true),
    protectSpreadsheetCell(row.raw, true),
    row.status === 'valid' ? protectSpreadsheetCell(row.number, true) : '',
    row.status === 'valid' ? protectSpreadsheetCell(row.reading) : '',
    row.status === 'valid' && row.formal ? protectSpreadsheetCell(row.formal) : '',
    protectSpreadsheetCell(row.status === 'invalid' ? text.error(row.error) : row.formal ? text.valid : text.unavailableFormal),
  ])
  return [text.headers.map((cell) => protectSpreadsheetCell(cell)), ...rows]
    .map((row) => row.map((cell) => quoteCell(cell, separator)).join(separator))
    .join('\r\n')
}
