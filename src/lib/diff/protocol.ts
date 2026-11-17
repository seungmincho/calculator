import { LINE_DIFF_LIMITS, type LineDiffErrorCode, type TextDiffResult } from '../../utils/lineDiff.ts'

export interface LineDiffRequest { id: number; left: string; right: string }
export type LineDiffResponse = { id: number; ok: true; result: TextDiffResult } | { id: number; ok: false; error: LineDiffErrorCode | 'workerFailed' }
export type DiffExecutionErrorCode = LineDiffErrorCode | 'unsupported' | 'workerFailed' | 'invalidResponse' | 'timeout' | 'canceled'
export class DiffExecutionError extends Error {
  readonly code: DiffExecutionErrorCode
  constructor(code: DiffExecutionErrorCode) { super(code); this.name = 'DiffExecutionError'; this.code = code }
}

export const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function isLineDiffRequest(value: unknown): value is LineDiffRequest {
  return isObject(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0 && typeof value.left === 'string' && typeof value.right === 'string'
}

/** Validate numbering, counters and bounded output before accepting a Worker reply. */
export function isTextDiffResult(value: unknown): value is TextDiffResult {
  if (!isObject(value) || !Array.isArray(value.lines) || value.lines.length > LINE_DIFF_LIMITS.lines * 2 || !isObject(value.summary)) return false
  const count = { added: 0, removed: 0, unchanged: 0 }
  let left = 0, right = 0, characters = 0
  for (const line of value.lines) {
    if (!isObject(line) || typeof line.content !== 'string') return false
    characters += line.content.length
    if (characters > LINE_DIFF_LIMITS.bytes * 2) return false
    if (line.type === 'added') { if (line.left !== undefined || line.right !== ++right) return false; count.added++ }
    else if (line.type === 'removed') { if (line.right !== undefined || line.left !== ++left) return false; count.removed++ }
    else if (line.type === 'unchanged') { if (line.left !== ++left || line.right !== ++right) return false; count.unchanged++ }
    else return false
  }
  return left <= LINE_DIFF_LIMITS.lines && right <= LINE_DIFF_LIMITS.lines
    && value.summary.added === count.added && value.summary.removed === count.removed && value.summary.unchanged === count.unchanged
}

export function executionErrorCode(value: unknown): DiffExecutionErrorCode {
  const allowed: DiffExecutionErrorCode[] = ['invalidInput', 'tooLarge', 'tooManyLines', 'tooComplex', 'unsupported', 'workerFailed', 'invalidResponse', 'timeout', 'canceled']
  return typeof value === 'string' && allowed.includes(value as DiffExecutionErrorCode) ? value as DiffExecutionErrorCode : 'workerFailed'
}
