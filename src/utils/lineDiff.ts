/** Bounded line comparison. Run expensive work in a Worker, never during rendering. */
export const LINE_DIFF_LIMITS = Object.freeze({ bytes: 1024 * 1024, lines: 10000, cells: 4000000 })

export type LineDiffErrorCode = 'invalidInput' | 'tooLarge' | 'tooManyLines' | 'tooComplex'
export class LineDiffError extends Error {
  readonly code: LineDiffErrorCode
  constructor(code: LineDiffErrorCode) { super(code); this.name = 'LineDiffError'; this.code = code }
}

export interface TextDiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  left?: number
  right?: number
}
export interface TextDiffResult {
  lines: TextDiffLine[]
  summary: { added: number; removed: number; unchanged: number }
}

/** CRLF/CR and LF are equivalent. A final newline remains a distinct empty line. */
export function splitDiffLines(text: string): string[] {
  if (typeof text !== 'string') throw new LineDiffError('invalidInput')
  // The UTF-16 length is a cheap early bound; UTF-8 can only require more bytes.
  if (text.length > LINE_DIFF_LIMITS.bytes || new TextEncoder().encode(text).byteLength > LINE_DIFF_LIMITS.bytes) throw new LineDiffError('tooLarge')
  const lines = text === '' ? [] : text.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > LINE_DIFF_LIMITS.lines) throw new LineDiffError('tooManyLines')
  return lines
}

export function compareTextLines(leftText: string, rightText: string): TextDiffResult {
  const left = splitDiffLines(leftText), right = splitDiffLines(rightText)
  const lines: TextDiffLine[] = []
  let prefix = 0
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) {
    lines.push({ type: 'unchanged', content: left[prefix], left: prefix + 1, right: prefix + 1 })
    prefix++
  }
  let suffix = 0
  while (suffix < left.length - prefix && suffix < right.length - prefix && left[left.length - suffix - 1] === right[right.length - suffix - 1]) suffix++
  const leftCount = left.length - prefix - suffix, rightCount = right.length - prefix - suffix
  const middle: TextDiffLine[] = []

  if (leftCount === 0 || rightCount === 0) {
    for (let i = 0; i < leftCount; i++) middle.push({ type: 'removed', content: left[prefix + i], left: prefix + i + 1 })
    for (let j = 0; j < rightCount; j++) middle.push({ type: 'added', content: right[prefix + j], right: prefix + j + 1 })
  } else {
    const width = rightCount + 1
    const cells = (leftCount + 1) * width
    if (cells > LINE_DIFF_LIMITS.cells) throw new LineDiffError('tooComplex')
    // At most 10,000 lines: an LCS length fits uint16; the matrix is at most 8 MB.
    const dp = new Uint16Array(cells)
    for (let i = 1; i <= leftCount; i++) {
      const row = i * width, previous = row - width
      for (let j = 1; j <= rightCount; j++) {
        dp[row + j] = left[prefix + i - 1] === right[prefix + j - 1]
          ? dp[previous + j - 1] + 1
          : Math.max(dp[previous + j], dp[row + j - 1])
      }
    }
    let i = leftCount, j = rightCount
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && left[prefix + i - 1] === right[prefix + j - 1]) {
        middle.push({ type: 'unchanged', content: left[prefix + i - 1], left: prefix + i, right: prefix + j })
        i--; j--
      } else if (i > 0 && (j === 0 || dp[(i - 1) * width + j] > dp[i * width + j - 1])) {
        middle.push({ type: 'removed', content: left[prefix + i - 1], left: prefix + i })
        i--
      } else {
        middle.push({ type: 'added', content: right[prefix + j - 1], right: prefix + j })
        j--
      }
    }
    middle.reverse()
  }
  lines.push(...middle)
  for (let offset = suffix; offset > 0; offset--) {
    const i = left.length - offset, j = right.length - offset
    lines.push({ type: 'unchanged', content: left[i], left: i + 1, right: j + 1 })
  }
  const summary = { added: 0, removed: 0, unchanged: 0 }
  for (const line of lines) summary[line.type]++
  return { lines, summary }
}

/** Readable comparison text, not a unified diff/patch file. Includes all rows. */
export function formatTextDiff(result: TextDiffResult): string {
  return result.lines.map(line => `${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} ${line.content}`).join('\n')
}
