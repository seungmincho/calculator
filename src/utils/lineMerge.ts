import { LINE_DIFF_LIMITS, splitDiffLines, type TextDiffLine, type TextDiffResult } from './lineDiff.ts'
import { isTextDiffResult } from '../lib/diff/protocol.ts'

export const LINE_MERGE_MAX_BYTES = LINE_DIFF_LIMITS.bytes * 2
export const LINE_MERGE_MAX_LINES = LINE_DIFF_LIMITS.lines * 2
export const LINE_MERGE_PAGE_LINES = 200
export const LINE_MERGE_PREVIEW_CHARACTERS = 50_000
export const LINE_MERGE_ROW_CHARACTERS = 2_000
export type LineMergeSide = 'original' | 'modified'
export interface LineMergeChoice { readonly blockId: string; readonly side: LineMergeSide }
export interface LineMergeBlock {
  readonly id: string; readonly number: number; readonly start: number; readonly end: number
  readonly originalStart: number; readonly modifiedStart: number
  readonly original: readonly string[]; readonly modified: readonly string[]
}
export interface LineMergeDocument {
  readonly id: number; readonly left: string; readonly right: string
  readonly rows: readonly Readonly<TextDiffLine>[]; readonly blocks: readonly LineMergeBlock[]
}
export interface LineMergeOutput {
  readonly documentId: number; readonly choices: readonly LineMergeChoice[]
  readonly text: string; readonly lines: readonly string[]; readonly bytes: number; readonly lineCount: number
}
export type LineMergeErrorCode = 'invalidResponse' | 'invalidDocument' | 'invalidChoices' | 'tooLarge'
export class LineMergeError extends Error {
  readonly code: LineMergeErrorCode
  constructor(code: LineMergeErrorCode) { super(code); this.name = 'LineMergeError'; this.code = code }
}
const prepared = new WeakSet<LineMergeDocument>()
const outputs = new WeakSet<LineMergeOutput>()

/** Shape alone cannot prove a worker result belongs to the two submitted documents. */
export function validateDiffAgainstSources(left: string, right: string, result: unknown): result is TextDiffResult {
  try {
    if (!isTextDiffResult(result)) return false
    const original = splitDiffLines(left), modified = splitDiffLines(right)
    let a = 0, b = 0
    for (const row of result.lines) {
      if (row.type !== 'added' && (row.left !== a + 1 || a >= original.length || row.content !== original[a++])) return false
      if (row.type !== 'removed' && (row.right !== b + 1 || b >= modified.length || row.content !== modified[b++])) return false
    }
    // [] and [''] both join to '', so compare the exact arrays rather than joined strings.
    return a === original.length && b === modified.length
  } catch { return false }
}

/** The factory validates once, owns every nested row and assigns IDs from snapshot + position. */
export function prepareLineMerge(id: number, left: string, right: string, result: unknown): LineMergeDocument {
  if (!Number.isSafeInteger(id) || id < 1) throw new LineMergeError('invalidDocument')
  if (!validateDiffAgainstSources(left, right, result)) throw new LineMergeError('invalidResponse')
  const rows = result.lines.map(row => Object.freeze({ type: row.type, content: row.content,
    ...(row.left === undefined ? {} : { left: row.left }), ...(row.right === undefined ? {} : { right: row.right }) })), blocks: LineMergeBlock[] = []
  let cursor = 0, originalLine = 0, modifiedLine = 0
  while (cursor < rows.length) {
    if (rows[cursor].type === 'unchanged') { originalLine++; modifiedLine++; cursor++; continue }
    const start = cursor, originalStart = originalLine + 1, modifiedStart = modifiedLine + 1
    const original: string[] = [], modified: string[] = []
    while (cursor < rows.length && rows[cursor].type !== 'unchanged') {
      const row = rows[cursor++]
      if (row.type === 'removed') { original.push(row.content); originalLine++ }
      else { modified.push(row.content); modifiedLine++ }
    }
    blocks.push(Object.freeze({ id: `${id}:${start}:${cursor}`, number: blocks.length + 1, start, end: cursor,
      originalStart, modifiedStart, original: Object.freeze(original), modified: Object.freeze(modified) }))
  }
  const document = Object.freeze({ id, left, right, rows: Object.freeze(rows), blocks: Object.freeze(blocks) })
  prepared.add(document)
  return document
}

function requireDocument(document: LineMergeDocument) {
  if (!prepared.has(document)) throw new LineMergeError('invalidDocument')
}
export function createLineMergeChoices(document: LineMergeDocument, side: LineMergeSide = 'original'): readonly LineMergeChoice[] {
  requireDocument(document)
  if (side !== 'original' && side !== 'modified') throw new LineMergeError('invalidChoices')
  return Object.freeze(document.blocks.map(block => Object.freeze({ blockId: block.id, side })))
}

/** Linear projection only. LCS remains in the existing worker; no comparison runs here. */
export function selectLineMerge(document: LineMergeDocument, choices: readonly LineMergeChoice[]): LineMergeOutput {
  requireDocument(document)
  if (!Array.isArray(choices) || choices.length !== document.blocks.length) throw new LineMergeError('invalidChoices')
  const ids = new Set(document.blocks.map(block => block.id)), selected = new Map<string, LineMergeSide>()
  for (const choice of choices) {
    if (!choice || typeof choice !== 'object' || Array.isArray(choice) || Object.keys(choice).length !== 2
      || !Object.hasOwn(choice, 'blockId') || !Object.hasOwn(choice, 'side') || !ids.has(choice.blockId) || selected.has(choice.blockId)
      || (choice.side !== 'original' && choice.side !== 'modified')) throw new LineMergeError('invalidChoices')
    selected.set(choice.blockId, choice.side)
  }
  const lines: string[] = []
  let cursor = 0
  for (const block of document.blocks) {
    while (cursor < block.start) lines.push(document.rows[cursor++].content)
    for (const line of block[selected.get(block.id)!]) lines.push(line)
    cursor = block.end
  }
  while (cursor < document.rows.length) lines.push(document.rows[cursor++].content)
  if (lines.length > LINE_MERGE_MAX_LINES) throw new LineMergeError('tooLarge')
  const text = lines.join('\n'), bytes = new TextEncoder().encode(text).byteLength
  if (bytes > LINE_MERGE_MAX_BYTES) throw new LineMergeError('tooLarge')
  const captured = document.blocks.map(block => Object.freeze({ blockId: block.id, side: selected.get(block.id)! }))
  const output = Object.freeze({ documentId: document.id, choices: Object.freeze(captured), text, lines: Object.freeze(lines), bytes, lineCount: lines.length })
  outputs.add(output)
  return output
}

/** Only shorten presentation. Original invalid surrogates are not silently repaired. */
export function shortenLineMergePreview(text: string, maximum: number): string {
  if (!Number.isSafeInteger(maximum) || maximum < 0) throw new RangeError('maximum')
  let end = Math.min(text.length, maximum)
  if (end > 0 && end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--
  return text.slice(0, end)
}

export function lineMergePreview(output: LineMergeOutput, requestedPage: number) {
  if (!outputs.has(output)) throw new LineMergeError('invalidDocument')
  const pageCount = Math.max(1, Math.ceil(output.lineCount / LINE_MERGE_PAGE_LINES))
  const page = Number.isSafeInteger(requestedPage) ? Math.max(0, Math.min(pageCount - 1, requestedPage)) : 0
  const start = page * LINE_MERGE_PAGE_LINES
  let remaining = LINE_MERGE_PREVIEW_CHARACTERS, omitted = 0
  const rows = output.lines.slice(start, start + LINE_MERGE_PAGE_LINES).map((line, index) => {
    const text = shortenLineMergePreview(line, Math.min(LINE_MERGE_ROW_CHARACTERS, remaining))
    remaining -= text.length; omitted += line.length - text.length
    return Object.freeze({ number: start + index + 1, text, shortened: text.length !== line.length })
  })
  return Object.freeze({ page, pageCount, rows: Object.freeze(rows), omitted, lineCount: output.lineCount })
}
