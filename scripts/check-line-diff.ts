import assert from 'node:assert/strict'
import { compareTextLines, formatTextDiff, splitDiffLines, LINE_DIFF_LIMITS, LineDiffError, type TextDiffResult } from '../src/utils/lineDiff.ts'

let groups = 0
function check(name: string, run: () => void) { run(); groups++; console.log(`PASS ${name}`) }
function reconstruct(result: TextDiffResult, side: 'left' | 'right') {
  return result.lines.filter(line => line[side] !== undefined).map(line => line.content)
}
function verify(left: string, right: string) {
  const result = compareTextLines(left, right)
  assert.deepEqual(reconstruct(result, 'left'), splitDiffLines(left))
  assert.deepEqual(reconstruct(result, 'right'), splitDiffLines(right))
  for (const side of ['left', 'right'] as const) {
    const numbered = result.lines.filter(line => line[side] !== undefined)
    numbered.forEach((line, index) => assert.equal(line[side], index + 1))
  }
  assert.equal(result.summary.added + result.summary.removed + result.summary.unchanged, result.lines.length)
  return result
}
function throwsCode(run: () => unknown, code: string) {
  assert.throws(run, error => error instanceof LineDiffError && error.code === code)
}

check('empty, insertion, removal and final newline', () => {
  assert.deepEqual(verify('', '').summary, { added: 0, removed: 0, unchanged: 0 })
  assert.deepEqual(verify('', 'hello').summary, { added: 1, removed: 0, unchanged: 0 })
  assert.deepEqual(verify('hello', '').summary, { added: 0, removed: 1, unchanged: 0 })
  assert.deepEqual(verify('hello', 'hello\n').summary, { added: 1, removed: 0, unchanged: 1 })
  verify('\n', ''); verify('', '\n'); verify('\n\n', '\n')
})
check('Korean, repeated and blank lines, HTML as plain text', () => {
  for (const [left, right] of [
    ['안녕하세요\n오늘 일정\n완료', '안녕하세요\n바뀐 일정\n완료'],
    ['a\nb\na\nb', 'b\na\nb\na'], ['\nA\n\nB\n', '\nB\n\nA\n'],
    ['<script>alert(1)</script>', '<script>alert(2)</script>'],
  ]) verify(left, right)
})
check('newline normalization is explicit; spaces remain meaningful', () => {
  assert.deepEqual(verify('a\r\nb\r', 'a\nb\n').summary, { added: 0, removed: 0, unchanged: 3 })
  assert.deepEqual(verify('a ', 'a').summary, { added: 1, removed: 1, unchanged: 0 })
})
check('exhaustive small duplicate sequences have maximal unchanged counts', () => {
  const sequences: string[][] = [[]]
  for (let length = 1; length <= 4; length++) for (let mask = 0; mask < 2 ** length; mask++) sequences.push(Array.from({ length }, (_, i) => mask & (1 << i) ? 'a' : 'b'))
  function lcs(a: string[], b: string[]): number {
    if (!a.length || !b.length) return 0
    return a[0] === b[0] ? 1 + lcs(a.slice(1), b.slice(1)) : Math.max(lcs(a.slice(1), b), lcs(a, b.slice(1)))
  }
  for (const a of sequences) for (const b of sequences) assert.equal(verify(a.join('\n'), b.join('\n')).summary.unchanged, lcs(a, b))
})
check('10,000 shared lines and a small middle change avoid the matrix cap', () => {
  const left = Array.from({ length: LINE_DIFF_LIMITS.lines }, (_, i) => `line ${i}`)
  const right = [...left]; right[5000] = 'changed'
  assert.equal(verify(left.join('\n'), left.join('\n')).summary.unchanged, 10000)
  assert.deepEqual(verify(left.join('\n'), right.join('\n')).summary, { added: 1, removed: 1, unchanged: 9999 })
})
check('UTF-8 bytes, line count and matrix work reject independently', () => {
  splitDiffLines('a'.repeat(LINE_DIFF_LIMITS.bytes))
  throwsCode(() => splitDiffLines('a'.repeat(LINE_DIFF_LIMITS.bytes + 1)), 'tooLarge')
  throwsCode(() => splitDiffLines('가'.repeat(Math.floor(LINE_DIFF_LIMITS.bytes / 3) + 1)), 'tooLarge')
  throwsCode(() => splitDiffLines('\n'.repeat(LINE_DIFF_LIMITS.lines)), 'tooManyLines')
  throwsCode(() => compareTextLines(Array(2000).fill('left').join('\n'), Array(2000).fill('right').join('\n')), 'tooComplex')
  throwsCode(() => splitDiffLines(null as unknown as string), 'invalidInput')
})
check('matrix limit boundary and asymmetric insertions preserve numbering', () => {
  const left = Array(1999).fill('left').join('\n'), right = Array(1999).fill('right').join('\n')
  assert.deepEqual(verify(left, right).summary, { added: 1999, removed: 1999, unchanged: 0 })
  verify('start\nend', 'start\nnew1\nnew2\nend')
  verify('start\nold1\nold2\nend', 'start\nend')
})
check('text export prefixes all rows without interpreting HTML', () => {
  const result = verify('first\nold\nlast', 'first\nnew\nlast')
  const output = formatTextDiff(result)
  assert.equal(output, '  first\n- old\n+ new\n  last')
  assert.equal(formatTextDiff(verify('', '<img src=x>')), '+ <img src=x>')
  assert.equal(formatTextDiff(verify('', '')), '')
})
console.log(`Line diff: ${groups} groups passed`)
