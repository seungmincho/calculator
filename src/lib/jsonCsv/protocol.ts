import { JSON_CSV_LIMITS, type JsonCsvErrorCode, type JsonCsvMode, type JsonCsvOptions, type JsonCsvResult } from '../../utils/jsonCsv.ts'
import type { JsonCsvFileEncoding } from '../../utils/jsonCsvActions.ts'

export type JsonCsvJob = { kind: 'convert'; input: string; mode: JsonCsvMode; options: JsonCsvOptions } | { kind: 'decode'; bytes: ArrayBuffer; encoding: JsonCsvFileEncoding }
export type JsonCsvRequest = JsonCsvJob & { version: 1; id: number }
export type JsonCsvFileError = 'fileLimit' | 'decodedLimit' | 'encoding' | 'read'
export type JsonCsvExecutionCode = 'unsupported' | 'workerFailed' | 'invalidResponse' | 'timeout' | 'canceled'
export type JsonCsvFailure = { scope: 'conversion'; code: JsonCsvErrorCode; position: { row?: number; column?: number; line?: number; offset?: number; key?: string } } | { scope: 'file'; code: JsonCsvFileError } | { scope: 'worker'; code: JsonCsvExecutionCode }
export type JsonCsvSuccess = { kind: 'convert'; result: JsonCsvResult; computeMs: number } | { kind: 'decode'; text: string; computeMs: number }
export type JsonCsvResponse = { version: 1; id: number } & (({ ok: true } & JsonCsvSuccess) | { kind: JsonCsvJob['kind']; ok: false; error: JsonCsvFailure })
export class JsonCsvExecutionError extends Error {
  readonly failure: JsonCsvFailure
  constructor(failure: JsonCsvFailure) { super(failure.code); this.name = 'JsonCsvExecutionError'; this.failure = failure }
}

export const jsonCsvObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const oneOf = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value)
export function isJsonCsvRequest(value: unknown): value is JsonCsvRequest {
  if (!jsonCsvObject(value) || value.version !== 1 || !Number.isSafeInteger(value.id) || Number(value.id) < 1) return false
  if (value.kind === 'decode') return value.bytes instanceof ArrayBuffer && oneOf(value.encoding, ['utf-8', 'euc-kr'])
  if (value.kind !== 'convert' || typeof value.input !== 'string' || !oneOf(value.mode, ['jsonToCsv', 'csvToJson']) || !jsonCsvObject(value.options)) return false
  const options = value.options
  return oneOf(options.delimiter, [',', '\t', '|', ';']) && typeof options.header === 'boolean' && oneOf(options.nested, ['flatten', 'preserve'])
    && oneOf(options.arrayHandling, ['join', 'separate']) && typeof options.numbers === 'boolean' && typeof options.bom === 'boolean'
}

const conversionCodes: readonly JsonCsvErrorCode[] = ['empty', 'inputLimit', 'outputLimit', 'intermediateLimit', 'rowLimit', 'columnLimit', 'cellLimit', 'depthLimit', 'invalidJson', 'invalidShape', 'noColumns', 'invalidOptions', 'unclosedQuote', 'unexpectedQuote', 'afterQuote', 'width', 'emptyHeader', 'duplicateHeader', 'keyCollision', 'nonFinite', 'unsafeInteger']
export function isJsonCsvFailure(value: unknown, kind: JsonCsvJob['kind']): value is JsonCsvFailure {
  if (!jsonCsvObject(value)) return false
  if (value.scope === 'worker') return oneOf(value.code, ['unsupported', 'workerFailed', 'invalidResponse', 'timeout', 'canceled'])
  if (value.scope === 'file') return kind === 'decode' && oneOf(value.code, ['fileLimit', 'decodedLimit', 'encoding', 'read'])
  if (kind !== 'convert' || value.scope !== 'conversion' || !oneOf(value.code, conversionCodes) || !jsonCsvObject(value.position)) return false
  for (const key of ['row', 'column', 'line', 'offset']) {
    const number = value.position[key]
    if (number !== undefined && (!Number.isSafeInteger(number) || Number(number) < 1 || Number(number) > JSON_CSV_LIMITS.inputBytes + 1)) return false
  }
  return value.position.key === undefined || (typeof value.position.key === 'string' && value.position.key.length <= JSON_CSV_LIMITS.outputBytes)
}

/** Bounded shape/counter checks only: no main-thread reparsing, UTF-8 encoding or string joins. */
export function isJsonCsvResult(value: unknown, mode: JsonCsvMode): value is JsonCsvResult {
  if (!jsonCsvObject(value) || value.mode !== mode || typeof value.text !== 'string' || value.text.length > JSON_CSV_LIMITS.outputBytes
    || !Array.isArray(value.headers) || value.headers.length < 1 || value.headers.length > JSON_CSV_LIMITS.columns
    || !Array.isArray(value.rows) || value.rows.length > JSON_CSV_LIMITS.rows || !jsonCsvObject(value.stats)) return false
  const format = mode === 'jsonToCsv' ? 'csv' : 'json', columns = value.headers.length, cells = columns * value.rows.length
  if (cells > JSON_CSV_LIMITS.cells || value.format !== format || value.filename !== `converted.${format}`
    || value.mime !== (format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8')
    || value.stats.rows !== value.rows.length || value.stats.columns !== columns || value.stats.cells !== cells
    || !Number.isSafeInteger(value.stats.bytes) || Number(value.stats.bytes) < value.text.length || Number(value.stats.bytes) > JSON_CSV_LIMITS.outputBytes) return false
  let characters = 0
  for (const header of value.headers) {
    if (typeof header !== 'string') return false
    characters += header.length
    if (characters > JSON_CSV_LIMITS.outputBytes * 2) return false
  }
  for (const row of value.rows) {
    if (!Array.isArray(row) || row.length !== columns) return false
    for (const cell of row) {
      if (typeof cell === 'string') characters += cell.length
      else if (typeof cell !== 'number' || !Number.isFinite(cell) || Math.abs(cell) > Number.MAX_SAFE_INTEGER) return false
      if (characters > JSON_CSV_LIMITS.outputBytes * 2) return false
    }
  }
  return true
}
export function isJsonCsvSuccess(value: unknown, job: JsonCsvJob): value is JsonCsvSuccess {
  if (!jsonCsvObject(value) || value.kind !== job.kind || typeof value.computeMs !== 'number' || !Number.isFinite(value.computeMs) || value.computeMs < 0) return false
  return job.kind === 'convert' ? isJsonCsvResult(value.result, job.mode) : typeof value.text === 'string' && value.text.length <= JSON_CSV_LIMITS.inputBytes
}
