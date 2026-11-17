/** Synchronous engine: product callers must execute this module in a dedicated Worker. */
export const REGEX_LIMITS = Object.freeze({ input: 1_000_000, pattern: 10_000, replacement: 100_000, output: 4_000_000, matches: 100_000, fileBytes: 4 * 1024 * 1024, timeoutMs: 5000, preview: 50_000, details: 5, detailUnits: 20_000, detailField: 2000, detailGroups: 20, url: 16_384 })
export type RegexOperation = 'grep' | 'replace' | 'extract'
export type RegexTransform = 'none' | 'dedupe' | 'uppercaseMatch'
export interface RegexJob { operation: RegexOperation; pattern: string; flags: string; replacement: string; inputText: string; transform: RegexTransform }
export type RegexEngineErrorCode = 'invalidInput' | 'inputTooLarge' | 'patternTooLarge' | 'replacementTooLarge' | 'emptyPattern' | 'invalidRegex' | 'outputTooLarge' | 'tooManyMatches'
export class RegexEngineError extends Error {
  readonly code: RegexEngineErrorCode
  constructor(code: RegexEngineErrorCode) { super(code); this.name = 'RegexEngineError'; this.code = code }
}
export interface RegexDetail {
  match: string; matchLength: number; groups: string[]; groupCount: number; index: number; line: number; truncated: boolean
}
export interface RegexEngineResult {
  outputText: string; outputLength: number; matchCount: number; scannedMatches: number; inputLineCount: number; outputNonblankLines: number; details: RegexDetail[]; detailsTruncated: boolean
}
export const isRegexObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
/** Cheap, non-executing checks are safe before structured clone on the UI thread. */
export function captureRegexJob(value: unknown): Readonly<RegexJob> {
  if (!isRegexObject(value) || typeof value.operation !== 'string' || !['grep', 'replace', 'extract'].includes(value.operation) || typeof value.transform !== 'string' || !['none', 'dedupe', 'uppercaseMatch'].includes(value.transform)) throw new RegexEngineError('invalidInput')
  for (const key of ['pattern', 'flags', 'replacement', 'inputText'] as const) if (typeof value[key] !== 'string') throw new RegexEngineError('invalidInput')
  const { operation, pattern, flags, replacement, inputText, transform } = value as unknown as RegexJob
  if ((transform === 'uppercaseMatch' && operation !== 'replace') || (transform === 'dedupe' && operation !== 'grep')) throw new RegexEngineError('invalidInput')
  if (inputText.length > REGEX_LIMITS.input) throw new RegexEngineError('inputTooLarge')
  if (pattern.length > REGEX_LIMITS.pattern) throw new RegexEngineError('patternTooLarge')
  if (replacement.length > REGEX_LIMITS.replacement) throw new RegexEngineError('replacementTooLarge')
  if (flags.length > 16) throw new RegexEngineError('invalidRegex')
  return Object.freeze({ operation, pattern, flags, replacement, inputText, transform })
}

class Output {
  private chunks: string[] = []
  private small: string[] = []
  private smallLength = 0
  length = 0
  append(value: string, start = 0, end = value.length) {
    const size = end - start
    if (size <= 0) return
    if (size > REGEX_LIMITS.output - this.length) throw new RegexEngineError('outputTooLarge')
    this.length += size; this.smallLength += size; this.small.push(start === 0 && end === value.length ? value : value.slice(start, end))
    if (this.smallLength >= 8192 || this.small.length >= 1024) this.flush()
  }
  private flush() { if (this.small.length) this.chunks.push(this.small.join('')); this.small = []; this.smallLength = 0 }
  finish() { this.flush(); return this.chunks.join('') }
}
/** AdvanceStringIndex: do not split a valid surrogate pair in u/v mode. */
export function advanceRegexIndex(text: string, index: number, unicode: boolean): number {
  if (unicode && index + 1 < text.length) {
    const first = text.charCodeAt(index), second = text.charCodeAt(index + 1)
    if (first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff) return index + 2
  }
  return index + 1
}
function* lines(text: string): Generator<{ value: string; line: number }> {
  let start = 0, line = 1
  while (true) { const end = text.indexOf('\n', start); if (end === -1) { yield { value: text.slice(start), line }; return } yield { value: text.slice(start, end), line: line++ }; start = end + 1 }
}
function countLines(text: string) { let count = 1; for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) count++; return count }
function nonblankLines(text: string) { let count = 0; for (const line of lines(text)) if (line.value.trim()) count++; return count }
type ReplacementToken = { kind: 'literal'; value: string } | { kind: 'capture'; index: number } | { kind: 'named'; name: string } | { kind: 'match' | 'prefix' | 'suffix' }
/** Compile only syntax, never code. Token rules follow ECMA-262 GetSubstitution. */
function replacementTokens(template: string, captures: number, named: boolean): ReplacementToken[] {
  const tokens: ReplacementToken[] = []; let literal = 0, cursor = 0
  while (cursor < template.length) {
    if (template[cursor] !== '$') { cursor++; continue }
    const next = template[cursor + 1]; let consumed = 0, token: ReplacementToken | undefined
    if (next === '$') { token = { kind: 'literal', value: '$' }; consumed = 2 }
    else if (next === '&' || next === '`' || next === "'") { token = { kind: next === '&' ? 'match' : next === '`' ? 'prefix' : 'suffix' }; consumed = 2 }
    else if (next >= '0' && next <= '9') {
      let index = Number(next); consumed = 2
      const second = template[cursor + 2]
      if (second >= '0' && second <= '9') { const pair = index * 10 + Number(second); if (pair <= captures) { index = pair; consumed = 3 } }
      if (index >= 1 && index <= captures) token = { kind: 'capture', index }
    } else if (next === '<' && named) {
      const end = template.indexOf('>', cursor + 2)
      if (end !== -1) { token = { kind: 'named', name: template.slice(cursor + 2, end) }; consumed = end - cursor + 1 }
    }
    if (!token) { cursor++; continue }
    if (cursor > literal) tokens.push({ kind: 'literal', value: template.slice(literal, cursor) })
    tokens.push(token); cursor += consumed; literal = cursor
  }
  if (literal < template.length) tokens.push({ kind: 'literal', value: template.slice(literal) })
  return tokens
}
function appendReplacement(output: Output, tokens: ReplacementToken[], match: RegExpExecArray, input: string) {
  for (const token of tokens) {
    if (token.kind === 'literal') output.append(token.value)
    else if (token.kind === 'capture') output.append(match[token.index] ?? '')
    else if (token.kind === 'named') output.append(match.groups && Object.hasOwn(match.groups, token.name) ? match.groups[token.name] ?? '' : '')
    else if (token.kind === 'match') output.append(match[0])
    else if (token.kind === 'prefix') output.append(input, 0, match.index)
    else output.append(input, match.index + match[0].length)
  }
}

/** Main-thread calls are forbidden in the product; isolated domain tests may use bounded fixtures. */
export function executeRegexJob(value: unknown): RegexEngineResult {
  const job = captureRegexJob(value), output = new Output(), details: RegexDetail[] = []
  let matchCount = 0, scannedMatches = 0, detailRemaining = REGEX_LIMITS.detailUnits, detailCut = false
  const take = (text: string) => { const size = Math.min(text.length, REGEX_LIMITS.detailField, detailRemaining); detailRemaining -= size; return text.slice(0, size) }
  const detail = (matched: string, groupCount: number, group: (index: number) => string | undefined, index: number, line: number) => {
    if (details.length >= REGEX_LIMITS.details) { detailCut = true; return }
    const preview = take(matched), groups: string[] = []; let truncated = preview.length !== matched.length || groupCount > REGEX_LIMITS.detailGroups
    for (let i = 0; i < Math.min(groupCount, REGEX_LIMITS.detailGroups); i++) { const full = group(i) ?? '', part = take(full); groups.push(part); if (full.length !== part.length) truncated = true }
    details.push({ match: preview, matchLength: matched.length, groups, groupCount, index, line, truncated }); detailCut ||= truncated
  }
  const countMatch = () => { if (++scannedMatches > REGEX_LIMITS.matches) throw new RegexEngineError('tooManyMatches') }
  if (job.transform === 'dedupe') {
    const seen = new Set<string>(); let first = true
    for (const line of lines(job.inputText)) if (!seen.has(line.value)) { seen.add(line.value); if (!first) output.append('\n'); output.append(line.value); first = false }
  } else {
    if (job.pattern.length === 0) throw new RegexEngineError('emptyPattern')
    let regex: RegExp
    try { regex = new RegExp(job.pattern, job.flags) } catch { throw new RegexEngineError('invalidRegex') }
    const global = regex.global, unicode = job.flags.includes('u') || job.flags.includes('v')
    if (job.operation === 'grep') {
      let firstLine = true
      // Preserve String.match state: g resets each line; non-global y retains lastIndex between lines.
      for (const line of lines(job.inputText)) {
        if (global) regex.lastIndex = 0
        let first: RegExpExecArray | null = null, groups: string[] = [], groupCount = 0, current: RegExpExecArray | null
        while ((current = regex.exec(line.value)) !== null) {
          countMatch()
          if (!first) first = current
          else if (global) { groupCount++; if (groups.length < REGEX_LIMITS.detailGroups && details.length < REGEX_LIMITS.details) groups.push(current[0].slice(0, REGEX_LIMITS.detailField + 1)) }
          if (!global) break
          if (current[0] === '') regex.lastIndex = advanceRegexIndex(line.value, regex.lastIndex, unicode)
        }
        if (!first) continue
        matchCount++; if (!firstLine) output.append('\n'); output.append(line.value); firstLine = false
        if (!global) { groupCount = first.length - 1; groups = first.slice(1, REGEX_LIMITS.detailGroups + 1) }
        detail(line.value, groupCount, i => groups[i], line.value.indexOf(first[0]), line.line)
      }
    } else {
      let match: RegExpExecArray | null, previousEnd = 0, nextLine = job.inputText.indexOf('\n'), lineNumber = 1, tokens: ReplacementToken[] | undefined
      while ((match = regex.exec(job.inputText)) !== null) {
        countMatch(); matchCount++
        while (nextLine !== -1 && nextLine < match.index) { lineNumber++; nextLine = job.inputText.indexOf('\n', nextLine + 1) }
        detail(match[0], match.length - 1, i => match![i + 1], match.index, lineNumber)
        if (job.operation === 'extract') {
          if (matchCount > 1) output.append('\n')
          output.append(match[0])
          if (!global) for (let i = 1; i < match.length; i++) { output.append('\n'); output.append(match[i] ?? '') }
        } else {
          output.append(job.inputText, previousEnd, match.index)
          if (job.transform === 'uppercaseMatch') output.append(match[0].toUpperCase())
          else { tokens ??= replacementTokens(job.replacement, match.length - 1, match.groups !== undefined); appendReplacement(output, tokens, match, job.inputText) }
          previousEnd = match.index + match[0].length
        }
        if (!global) break
        if (match[0] === '') regex.lastIndex = advanceRegexIndex(job.inputText, regex.lastIndex, unicode)
      }
      if (job.operation === 'replace') output.append(job.inputText, previousEnd)
    }
  }
  const outputText = output.finish()
  return { outputText, outputLength: outputText.length, matchCount, scannedMatches, inputLineCount: countLines(job.inputText), outputNonblankLines: nonblankLines(outputText), details, detailsTruncated: detailCut }
}

/** Existing smart input syntax: first two whitespace-separated literal delimiters. */
export function regexBetweenPattern(description: string): string {
  const parts = description.trim().split(/\s+/)
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const start = parts.length >= 2 ? parts[0] : '(', end = parts.length >= 2 ? parts[1] : ')'
  return `${escape(start)}([\\s\\S]*?)${escape(end)}`
}
