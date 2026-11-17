// Read-only design probe. This local prototype is not imported by the product.
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { compareTextLines, splitDiffLines, LINE_DIFF_LIMITS } from '../../../src/utils/lineDiff.ts'
import { isTextDiffResult } from '../../../src/lib/diff/protocol.ts'

const bytes = value => new TextEncoder().encode(value).byteLength
const normalize = value => value.replace(/\r\n?/g, '\n')
function matchesSources(left, right, result) {
  if (!isTextDiffResult(result)) return false
  const sources = [splitDiffLines(left), splitDiffLines(right)]
  for (const [side, source] of [['left', sources[0]], ['right', sources[1]]]) {
    const rows = result.lines.filter(row => row[side] !== undefined)
    if (rows.length !== source.length || rows.some((row, index) => row[side] !== index + 1 || row.content !== source[index])) return false
  }
  return true
}
function prepare(left, right, result = compareTextLines(left, right)) {
  assert.equal(matchesSources(left, right, result), true)
  const blocks = []
  const rows = result.lines.map(row => ({ ...row }))
  let cursor = 0
  while (cursor < rows.length) {
    if (rows[cursor].type === 'unchanged') { cursor++; continue }
    const start = cursor
    while (cursor < rows.length && rows[cursor].type !== 'unchanged') cursor++
    blocks.push({ start, end: cursor })
  }
  return { rows, blocks }
}
function compose(prepared, choices = []) {
  const selected = []
  let block = 0
  for (let index = 0; index < prepared.rows.length;) {
    const row = prepared.rows[index]
    if (row.type === 'unchanged') { selected.push(row.content); index++; continue }
    const range = prepared.blocks[block]
    const chosen = choices[block++] === 'modified' ? 'added' : 'removed'
    for (; index < range.end; index++) if (prepared.rows[index].type === chosen) selected.push(prepared.rows[index].content)
  }
  return { text: selected.join('\n'), selectedLines: selected.length }
}
let groups = 0, pairs = 0, combinations = 0
function check(name, run) { run(); groups++; console.log(`PASS ${name}`) }

check('empty/terminal newline/CRLF/CR/repeated lines reconstruct both endpoints and every block choice', () => {
  const texts = new Set(['', '\r', '\r\n', 'a\r\nb\r', 'a\nb\na\n', 'a\na\nb', 'a\nb\nb'])
  let values = [[]]
  for (let size = 1; size <= 3; size++) {
    values = values.flatMap(rows => ['a', 'b', ''].map(value => [...rows, value]))
    for (const rows of values) texts.add(rows.join('\n'))
  }
  for (const left of texts) for (const right of texts) {
    const prepared = prepare(left, right)
    assert.equal(compose(prepared).text, normalize(left))
    assert.equal(compose(prepared, prepared.blocks.map(() => 'modified')).text, normalize(right))
    for (let mask = 0; mask < 2 ** prepared.blocks.length; mask++) {
      const choices = prepared.blocks.map((_, index) => mask & (1 << index) ? 'modified' : 'original')
      const merged = compose(prepared, choices)
      assert.ok(bytes(merged.text) <= bytes(left) + bytes(right))
      assert.ok(merged.selectedLines <= splitDiffLines(left).length + splitDiffLines(right).length)
      combinations++
    }
    pairs++
  }
  assert.deepEqual(prepare('old1\nold2', 'new1\nnew2').blocks, [{ start: 0, end: 4 }])
  assert.equal(compose(prepare('', '\n'), ['modified']).text, '\n')
  assert.equal(compose(prepare('\n', ''), ['modified']).text, '')
})
check('current shape validator accepts forged content; source gate rejects content/omission/empty-array ambiguity', () => {
  const original = compareTextLines('left', 'right')
  const forged = structuredClone(original)
  forged.lines[0].content = 'unrelated content'
  assert.equal(isTextDiffResult(forged), true)
  assert.equal(matchesSources('left', 'right', forged), false)
  const omitted = { lines: [], summary: { added: 0, removed: 0, unchanged: 0 } }
  assert.equal(isTextDiffResult(omitted), true)
  assert.equal(matchesSources('left', 'right', omitted), false)
  const blank = { lines: [{ type: 'unchanged', content: '', left: 1, right: 1 }], summary: { added: 0, removed: 0, unchanged: 1 } }
  assert.equal(isTextDiffResult(blank), true)
  assert.equal(matchesSources('', '', blank), false)
  const badSummary = structuredClone(original); badSummary.summary.added++
  assert.equal(matchesSources('left', 'right', badSummary), false)
  const badNumber = structuredClone(original); badNumber.lines[0].left = 2
  assert.equal(matchesSources('left', 'right', badNumber), false)
})
check('two exact 1MiB inputs can merge to exact 2MiB through a common empty line', () => {
  const payload = LINE_DIFF_LIMITS.bytes - 1
  const left = `${'a'.repeat(payload)}\n`
  const right = `\n${'b'.repeat(payload)}`
  assert.equal(bytes(left), LINE_DIFF_LIMITS.bytes); assert.equal(bytes(right), LINE_DIFF_LIMITS.bytes)
  const prepared = prepare(left, right), merged = compose(prepared, ['original', 'modified'])
  assert.equal(prepared.blocks.length, 2)
  assert.equal(bytes(merged.text), LINE_DIFF_LIMITS.bytes * 2)
  assert.throws(() => splitDiffLines(merged.text), error => error.code === 'tooLarge')
  console.log(JSON.stringify({ byteFixture: { left: bytes(left), right: bytes(right), merged: bytes(merged.text), selectedLines: merged.selectedLines } }))
})
check('valid existing 4M-cell comparison produces 11998 merged lines from two 10000-line inputs', () => {
  const common = Array.from({ length: 8001 }, (_, index) => `same-${index}`)
  const left = [...common, ...Array.from({ length: 1998 }, (_, index) => `left-${index}`), 'anchor'].join('\n')
  const right = [...common, 'anchor', ...Array.from({ length: 1998 }, (_, index) => `right-${index}`)].join('\n')
  assert.equal(splitDiffLines(left).length, 10000); assert.equal(splitDiffLines(right).length, 10000)
  const prepared = prepare(left, right), merged = compose(prepared, ['original', 'modified'])
  assert.equal(prepared.blocks.length, 2); assert.equal(merged.selectedLines, 11998)
  assert.throws(() => splitDiffLines(merged.text), error => error.code === 'tooManyLines')
  console.log(JSON.stringify({ lineFixture: { left: 10000, right: 10000, merged: merged.selectedLines, remainingDpCells: 4000000 } }))
})
check('linear composition benchmark only; no browser responsiveness claim', () => {
  const payload = LINE_DIFF_LIMITS.bytes - '\nanchor\nx'.length
  const prepared = prepare(`${'a'.repeat(payload)}\nanchor\nx`, `x\nanchor\n${'b'.repeat(payload)}`)
  const durations = []
  for (let trial = 0; trial < 12; trial++) {
    const start = performance.now(), merged = compose(prepared, ['original', 'modified'])
    assert.ok(bytes(merged.text) <= 2 * LINE_DIFF_LIMITS.bytes)
    durations.push(performance.now() - start)
  }
  durations.sort((a, b) => a - b)
  console.log(JSON.stringify({ nodeOnlyCompositionAndUtf8Ms: { median: durations[6], max: durations.at(-1) } }))
})
console.log(`Read-only merge probe: ${groups} groups, ${pairs} source pairs, ${combinations} choice combinations`)
