export const JSON_CSV_LIMITS = { inputBytes: 2 * 1024 * 1024, rows: 10_000, columns: 200, cells: 200_000, depth: 20, outputBytes: 8 * 1024 * 1024 } as const
export type CsvDelimiter = ',' | '\t' | '|' | ';'
export type JsonCsvMode = 'jsonToCsv' | 'csvToJson'
export type JsonCsvCell = string | number
export interface JsonCsvOptions { delimiter: CsvDelimiter; header: boolean; nested: 'flatten' | 'preserve'; arrayHandling: 'join' | 'separate'; numbers: boolean; bom: boolean }
export const DEFAULT_JSON_CSV_OPTIONS: JsonCsvOptions = { delimiter: ',', header: true, nested: 'flatten', arrayHandling: 'join', numbers: false, bom: false }
export type JsonCsvErrorCode = 'empty' | 'inputLimit' | 'outputLimit' | 'intermediateLimit' | 'rowLimit' | 'columnLimit' | 'cellLimit' | 'depthLimit' | 'invalidJson' | 'invalidShape' | 'noColumns' | 'invalidOptions' | 'unclosedQuote' | 'unexpectedQuote' | 'afterQuote' | 'width' | 'emptyHeader' | 'duplicateHeader' | 'keyCollision' | 'nonFinite' | 'unsafeInteger'
export class JsonCsvError extends Error {
  readonly code: JsonCsvErrorCode
  readonly position: { row?: number; column?: number; line?: number; offset?: number; key?: string }
  constructor(code: JsonCsvErrorCode, position: { row?: number; column?: number; line?: number; offset?: number; key?: string } = {}) { super(code); this.name = 'JsonCsvError'; this.code = code; this.position = position }
}
const utf8 = new TextEncoder()
export const jsonCsvUtf8Size = (value: string): number => utf8.encode(value).byteLength
function inputCheck(text: string) {
  if (text.length === 0) throw new JsonCsvError('empty')
  if (text.length > JSON_CSV_LIMITS.inputBytes || jsonCsvUtf8Size(text) > JSON_CSV_LIMITS.inputBytes) throw new JsonCsvError('inputLimit')
}
const delimiterValid = (value: string): value is CsvDelimiter => [',', '\t', '|', ';'].includes(value)

/** One record parser for every supported delimiter. Cell whitespace and quoted line endings are data. */
export function parseCsvRecords(text: string, delimiter: CsvDelimiter = ',', header = true): string[][] {
  inputCheck(text)
  if (!delimiterValid(delimiter)) throw new JsonCsvError('invalidOptions')
  const records: string[][] = []
  let cells: string[] = [], field = '', state: 'start' | 'plain' | 'quoted' | 'closed' = 'start'
  let line = 1, cursor = 0, quoteLine = 1, quoteOffset = 0, dataCells = 0, endedRecord = false
  const error = (code: JsonCsvErrorCode) => new JsonCsvError(code, { row: records.length + 1, column: cells.length + 1, line, offset: cursor + 1 })
  const cell = () => {
    cells.push(field); field = ''; state = 'start'
    if (cells.length > JSON_CSV_LIMITS.columns) throw new JsonCsvError('columnLimit', { row: records.length + 1, column: cells.length, line, offset: cursor + 1 })
  }
  const record = () => {
    cell()
    if (records.length && cells.length !== records[0].length) throw new JsonCsvError('width', { row: records.length + 1, column: Math.min(cells.length, records[0].length) + 1, line, offset: cursor + 1 })
    const isData = !header || records.length > 0
    if (isData) { dataCells += cells.length; if (dataCells > JSON_CSV_LIMITS.cells) throw error('cellLimit') }
    if (records.length + (header ? 0 : 1) > JSON_CSV_LIMITS.rows) throw error('rowLimit')
    records.push(cells); cells = []
  }
  while (cursor < text.length) {
    const char = text[cursor], next = text[cursor + 1]
    endedRecord = false
    if (state === 'quoted') {
      if (char === '"') {
        if (next === '"') { field += '"'; cursor += 2; continue }
        state = 'closed'; cursor++; continue
      }
      if (char === '\r' || char === '\n') {
        if (char === '\r' && next === '\n') { field += '\r\n'; cursor += 2 } else { field += char; cursor++ }
        line++; continue
      }
      field += char; cursor++; continue
    }
    if (char === delimiter) { cell(); cursor++; continue }
    if (char === '\r' || char === '\n') {
      record(); cursor += char === '\r' && next === '\n' ? 2 : 1; line++; endedRecord = true; continue
    }
    if (state === 'closed') throw error('afterQuote')
    if (char === '"') {
      if (state !== 'start') throw error('unexpectedQuote')
      state = 'quoted'; quoteLine = line; quoteOffset = cursor; cursor++; continue
    }
    field += char; state = 'plain'; cursor++
  }
  if (state === 'quoted') throw new JsonCsvError('unclosedQuote', { row: records.length + 1, column: cells.length + 1, line: quoteLine, offset: quoteOffset + 1 })
  if (!endedRecord) record()
  return records
}

/** Only explicit number mode calls this. Negative zero and identifier-like spelling stay strings. */
export function csvSafeNumber(value: string): JsonCsvCell {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) return value
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= Number.MAX_SAFE_INTEGER && (!Number.isInteger(number) || Number.isSafeInteger(number)) && !Object.is(number, -0) ? number : value
}
export function serializeCsvRecords(records: readonly (readonly JsonCsvCell[])[], delimiter: CsvDelimiter = ','): string {
  if (!delimiterValid(delimiter)) throw new JsonCsvError('invalidOptions')
  let bytes = 0
  const output = records.map(record => {
    const line = record.map(value => {
      const text = String(value)
      // Quote empty cells so a one-column empty final record survives a round trip.
      return text === '' || text.includes(delimiter) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }).join(delimiter)
    bytes += jsonCsvUtf8Size(line) + 2
    if (bytes > JSON_CSV_LIMITS.outputBytes + 2) throw new JsonCsvError('outputLimit')
    return line
  }).join('\r\n')
  if (jsonCsvUtf8Size(output) > JSON_CSV_LIMITS.outputBytes) throw new JsonCsvError('outputLimit')
  return output
}

export interface JsonCsvResult {
  mode: JsonCsvMode
  text: string
  headers: string[]
  rows: JsonCsvCell[][]
  format: 'csv' | 'json'
  mime: string
  filename: string
  stats: { rows: number; columns: number; cells: number; bytes: number }
}
function serializeJsonRows(headers: readonly string[], rows: readonly (readonly JsonCsvCell[])[]): string {
  const pieces: string[] = []; let bytes = 0
  const append = (piece: string) => {
    bytes += jsonCsvUtf8Size(piece)
    if (bytes > JSON_CSV_LIMITS.outputBytes) throw new JsonCsvError('outputLimit')
    pieces.push(piece)
  }
  const keys = headers.map(key => JSON.stringify(key))
  append('[')
  rows.forEach((row, index) => {
    append(index === 0 ? '\n  {' : ',\n  {')
    headers.forEach((_key, column) => append(`${column ? ',' : ''}\n    ${keys[column]}: ${JSON.stringify(row[column])}`))
    append('\n  }')
  })
  append(rows.length ? '\n]' : ']')
  return pieces.join('')
}
function checkOptions(options: JsonCsvOptions) {
  if (!delimiterValid(options.delimiter) || typeof options.header !== 'boolean' || typeof options.numbers !== 'boolean' || typeof options.bom !== 'boolean' || !['flatten', 'preserve'].includes(options.nested) || !['join', 'separate'].includes(options.arrayHandling)) throw new JsonCsvError('invalidOptions')
}
function checkJsonDepth(value: unknown, depth = 0): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new JsonCsvError('nonFinite')
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) throw new JsonCsvError('unsafeInteger')
  if (value === null || typeof value !== 'object') return
  if (depth + 1 > JSON_CSV_LIMITS.depth) throw new JsonCsvError('depthLimit')
  for (const child of Object.values(value)) checkJsonDepth(child, depth + 1)
}
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const jsonCell = (value: unknown): string => value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
function flattenJsonRow(row: Record<string, unknown>, options: JsonCsvOptions, rowNumber: number, consume: (key: string, value: string) => void): Map<string, string> {
  const flattened = new Map<string, string>()
  const put = (key: string, value: string) => {
    if (flattened.has(key)) throw new JsonCsvError('keyCollision', { row: rowNumber, key })
    consume(key, value)
    flattened.set(key, value)
    if (flattened.size > JSON_CSV_LIMITS.columns) throw new JsonCsvError('columnLimit', { row: rowNumber })
  }
  const visit = (value: unknown, key: string) => {
    if (Array.isArray(value)) {
      if (options.arrayHandling === 'join') put(key, value.map(jsonCell).join(';'))
      else if (value.length === 0) put(key, '[]')
      else value.forEach((item, index) => visit(item, `${key}[${index}]`))
    } else if (isObject(value)) {
      const keys = Object.keys(value)
      if (keys.length === 0) put(key, '{}')
      else keys.forEach(child => visit(value[child], `${key}.${child}`))
    } else put(key, jsonCell(value))
  }
  for (const key of Object.keys(row)) {
    if (options.nested === 'preserve') put(key, jsonCell(row[key]))
    else visit(row[key], key)
  }
  return flattened
}

/** The preview, statistics and export all consume this same confirmed result; no preview re-parser. */
export function convertJsonCsv(input: string, mode: JsonCsvMode, options: JsonCsvOptions = DEFAULT_JSON_CSV_OPTIONS): JsonCsvResult {
  inputCheck(input); checkOptions(options)
  let headers: string[], rows: JsonCsvCell[][], text: string
  if (mode === 'csvToJson') {
    const records = parseCsvRecords(input, options.delimiter, options.header)
    headers = options.header ? records[0] : records[0].map((_, index) => `column_${index}`)
    const used = new Set<string>()
    for (const [index, key] of headers.entries()) {
      if (key.trim() === '') throw new JsonCsvError('emptyHeader', { row: 1, column: index + 1 })
      if (used.has(key)) throw new JsonCsvError('duplicateHeader', { row: 1, column: index + 1, key })
      used.add(key)
    }
    rows = records.slice(options.header ? 1 : 0).map(row => row.map(value => options.numbers ? csvSafeNumber(value) : value))
    // Write quoted keys directly: special names are data, and repeated long headers cannot allocate an unbounded JSON string.
    text = serializeJsonRows(headers, rows)
  } else if (mode === 'jsonToCsv') {
    let value: unknown
    try { value = JSON.parse(input) } catch { throw new JsonCsvError('invalidJson') }
    checkJsonDepth(value)
    const source = Array.isArray(value) ? value : [value]
    if (!source.length || source.some(row => !isObject(row))) throw new JsonCsvError('invalidShape')
    if (source.length > JSON_CSV_LIMITS.rows) throw new JsonCsvError('rowLimit')
    let intermediateBytes = 0
    const consume = (key: string, value: string) => {
      intermediateBytes += jsonCsvUtf8Size(key) + jsonCsvUtf8Size(value)
      if (intermediateBytes > JSON_CSV_LIMITS.outputBytes) throw new JsonCsvError('intermediateLimit')
    }
    const processed = source.map((row, index) => flattenJsonRow(row as Record<string, unknown>, options, index + 1, consume))
    headers = [...new Set(processed.flatMap(row => [...row.keys()]))]
    if (!headers.length) throw new JsonCsvError('noColumns')
    if (headers.length > JSON_CSV_LIMITS.columns) throw new JsonCsvError('columnLimit')
    if (headers.length * source.length > JSON_CSV_LIMITS.cells) throw new JsonCsvError('cellLimit')
    rows = processed.map(row => headers.map(key => row.get(key) ?? ''))
    text = serializeCsvRecords(options.header ? [headers, ...rows] : rows, options.delimiter)
  } else throw new JsonCsvError('invalidOptions')
  if (options.bom && mode === 'jsonToCsv') text = '\uFEFF' + text
  const bytes = jsonCsvUtf8Size(text)
  if (bytes > JSON_CSV_LIMITS.outputBytes) throw new JsonCsvError('outputLimit')
  const format = mode === 'jsonToCsv' ? 'csv' : 'json'
  return { mode, text, headers, rows, format, mime: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8', filename: `converted.${format}`, stats: { rows: rows.length, columns: headers.length, cells: rows.length * headers.length, bytes } }
}
