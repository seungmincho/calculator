import { convert, findUnit, formatNum, parseInput } from './units.ts'
import { isUnitFavoritePair, type UnitFavoritePair } from './unitFavorites.ts'

export const UNIT_BATCH_MAX_ROWS = 1000
export const UNIT_BATCH_MAX_CHARACTERS = 50000
export const UNIT_BATCH_PREVIEW_ROWS = 200

export type UnitBatchRowError = 'columns' | 'invalidNumber' | 'nonFiniteResult'
export type UnitBatchRow = Readonly<{
  line: number
  raw: string
} & ({ status: 'valid'; input: number; output: number; formatted: string }
  | { status: 'blank' }
  | { status: 'invalid'; error: UnitBatchRowError })>

export interface UnitBatchSnapshot {
  readonly source: string
  readonly pair: Readonly<UnitFavoritePair>
  readonly fromSymbol: string
  readonly toSymbol: string
  readonly rows: readonly UnitBatchRow[]
  readonly valid: number
  readonly invalid: number
  readonly blank: number
}

export type UnitBatchResult =
  | { ok: true; snapshot: UnitBatchSnapshot }
  | { ok: false; error: 'invalidPair' | 'tooManyCharacters' | 'tooManyRows' }

/** One terminal newline is a terminator; additional blank lines retain their positions. */
export function convertUnitBatch(source: string, pair: unknown): UnitBatchResult {
  if (!isUnitFavoritePair(pair)) return { ok: false, error: 'invalidPair' }
  if (source.length > UNIT_BATCH_MAX_CHARACTERS) return { ok: false, error: 'tooManyCharacters' }
  const lines = source === '' ? [] : source.replace(/(?:\r\n|\r|\n)$/, '').split(/\r\n|\r|\n/)
  if (lines.length > UNIT_BATCH_MAX_ROWS) return { ok: false, error: 'tooManyRows' }
  const captured = Object.freeze({ c: pair.c, f: pair.f, t: pair.t, p: pair.p, rb: pair.rb })
  let valid = 0, invalid = 0, blank = 0
  const rows: UnitBatchRow[] = lines.map((raw, index) => {
    const base = { line: index + 1, raw }
    if (raw.includes('\t')) { invalid++; return Object.freeze({ ...base, status: 'invalid', error: 'columns' }) }
    if (!raw.trim()) { blank++; return Object.freeze({ ...base, status: 'blank' }) }
    const input = parseInput(raw)
    if (!Number.isFinite(input)) { invalid++; return Object.freeze({ ...base, status: 'invalid', error: 'invalidNumber' }) }
    const output = convert(captured.c, captured.f, captured.t, input, { remBase: captured.rb })
    if (!Number.isFinite(output)) { invalid++; return Object.freeze({ ...base, status: 'invalid', error: 'nonFiniteResult' }) }
    valid++
    return Object.freeze({ ...base, status: 'valid', input, output, formatted: formatNum(output, captured.p, false) })
  })
  return { ok: true, snapshot: Object.freeze({ source, pair: captured,
    fromSymbol: findUnit(captured.c, captured.f)!.sym, toSymbol: findUnit(captured.c, captured.t)!.sym,
    rows: Object.freeze(rows), valid, invalid, blank }) }
}

export interface UnitBatchExportLabels {
  headers: readonly [string, string, string, string, string, string, string, string]
  valid: string
  blank: string
  error: (code: UnitBatchRowError) => string
}

const safeCell = (value: string, forceText = false): string => value && (forceText || /^[\s\uFEFF\u200B-\u200D]*[=+\-@]/.test(value)) ? `'${value}` : value
const quote = (value: string, delimiter: string): string => value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

/** Full snapshot, including blank/error rows. CSV includes a UTF-8 BOM; TSV does not. */
export function serializeUnitBatch(snapshot: UnitBatchSnapshot, format: 'csv' | 'tsv', labels: UnitBatchExportLabels): string {
  const delimiter = format === 'csv' ? ',' : '\t'
  const records: string[][] = [labels.headers.map(value => safeCell(value))]
  for (const row of snapshot.rows) records.push([
    String(row.line), safeCell(row.raw, true), snapshot.fromSymbol,
    row.status === 'valid' ? row.formatted : '', snapshot.toSymbol,
    safeCell(row.status === 'valid' ? labels.valid : row.status === 'blank' ? labels.blank : labels.error(row.error)),
    String(snapshot.pair.p), snapshot.pair.c === 'css' ? String(snapshot.pair.rb) : '',
  ])
  return (format === 'csv' ? '\uFEFF' : '') + records.map(record => record.map(value => quote(value, delimiter)).join(delimiter)).join('\r\n')
}
