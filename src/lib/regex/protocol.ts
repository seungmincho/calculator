import { REGEX_LIMITS, isRegexObject, type RegexEngineErrorCode, type RegexEngineResult, type RegexJob } from '../../utils/regexEngine.ts'

export interface RegexWorkerRequest { id: number; revision: number; job: Readonly<RegexJob> }
export type RegexWorkerResponse = { id: number; revision: number; ok: true; result: RegexEngineResult } | { id: number; revision: number; ok: false; error: RegexEngineErrorCode | 'workerFailed' }
export type RegexExecutionErrorCode = RegexEngineErrorCode | 'unsupported' | 'workerFailed' | 'invalidResponse' | 'timeout' | 'canceled'
export class RegexExecutionError extends Error {
  readonly code: RegexExecutionErrorCode
  constructor(code: RegexExecutionErrorCode) { super(code); this.name = 'RegexExecutionError'; this.code = code }
}
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
export function regexExecutionErrorCode(value: unknown): RegexExecutionErrorCode {
  const codes: RegexExecutionErrorCode[] = ['invalidInput', 'inputTooLarge', 'patternTooLarge', 'replacementTooLarge', 'emptyPattern', 'invalidRegex', 'outputTooLarge', 'tooManyMatches', 'unsupported', 'workerFailed', 'invalidResponse', 'timeout', 'canceled']
  return typeof value === 'string' && codes.includes(value as RegexExecutionErrorCode) ? value as RegexExecutionErrorCode : 'workerFailed'
}
export function isRegexWorkerRequest(value: unknown): value is RegexWorkerRequest {
  return isRegexObject(value) && integer(value.id, 1, Number.MAX_SAFE_INTEGER) && integer(value.revision, 0, Number.MAX_SAFE_INTEGER) && isRegexObject(value.job)
}
/** Bound reply memory/counters before storing it; no regular-expression execution on the UI thread. */
export function parseRegexResult(value: unknown): RegexEngineResult | null {
  if (!isRegexObject(value) || typeof value.outputText !== 'string' || value.outputText.length > REGEX_LIMITS.output || value.outputLength !== value.outputText.length
    || !integer(value.matchCount, 0, REGEX_LIMITS.matches) || !integer(value.scannedMatches, value.matchCount, REGEX_LIMITS.matches)
    || !integer(value.inputLineCount, 1, REGEX_LIMITS.input + 1) || !integer(value.outputNonblankLines, 0, value.outputText.length)
    || !Array.isArray(value.details) || value.details.length !== Math.min(value.matchCount, REGEX_LIMITS.details) || typeof value.detailsTruncated !== 'boolean') return null
  const details: RegexEngineResult['details'] = []; let total = 0
  for (const detail of value.details) {
    if (!isRegexObject(detail) || typeof detail.match !== 'string' || detail.match.length > REGEX_LIMITS.detailField || !integer(detail.matchLength, detail.match.length, REGEX_LIMITS.input)
      || !integer(detail.index, 0, REGEX_LIMITS.input) || !integer(detail.line, 1, value.inputLineCount) || !integer(detail.groupCount, 0, REGEX_LIMITS.matches)
      || !Array.isArray(detail.groups) || detail.groups.length !== Math.min(detail.groupCount, REGEX_LIMITS.detailGroups) || typeof detail.truncated !== 'boolean') return null
    total += detail.match.length
    const groups: string[] = []
    for (const group of detail.groups) { if (typeof group !== 'string' || group.length > REGEX_LIMITS.detailField) return null; total += group.length; groups.push(group) }
    if (total > REGEX_LIMITS.detailUnits) return null
    if ((detail.match.length !== detail.matchLength || detail.groupCount > detail.groups.length) && !detail.truncated) return null
    details.push({ match: detail.match, matchLength: detail.matchLength, groups, groupCount: detail.groupCount, index: detail.index, line: detail.line, truncated: detail.truncated })
  }
  if (value.detailsTruncated !== (value.matchCount > details.length || details.some(detail => detail.truncated))) return null
  return { outputText: value.outputText, outputLength: value.outputLength, matchCount: value.matchCount, scannedMatches: value.scannedMatches, inputLineCount: value.inputLineCount, outputNonblankLines: value.outputNonblankLines, details, detailsTruncated: value.detailsTruncated }
}
