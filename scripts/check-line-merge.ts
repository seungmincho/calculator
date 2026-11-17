import assert from 'node:assert/strict'
import { compareTextLines, type TextDiffResult } from '../src/utils/lineDiff.ts'
import { prepareLineMerge, createLineMergeChoices, selectLineMerge, validateDiffAgainstSources, lineMergePreview, shortenLineMergePreview,
  LINE_MERGE_MAX_BYTES, LINE_MERGE_PAGE_LINES, LINE_MERGE_PREVIEW_CHARACTERS, type LineMergeChoice, type LineMergeDocument } from '../src/utils/lineMerge.ts'

let id = 0, groups = 0, cases = 0, registered = 0
const firstGroup = Number(process.argv.find(arg => arg.startsWith('--from='))?.slice(7) ?? 1)
const prepare = (left: string, right: string) => prepareLineMerge(++id, left, right, compareTextLines(left, right))
const output = (document: LineMergeDocument, side: 'original' | 'modified') => selectLineMerge(document, createLineMergeChoices(document, side))
const normal = (text: string) => text.replace(/\r\n?/g, '\n')
function check(name: string, run: () => void) { if (++registered < firstGroup) return; run(); groups++; console.log('PASS', name) }

check('every pair reconstructs exactly both normalized sources including empty, final newline, repeated lines and Unicode', () => {
  const corpus = ['', '\n', '\n\n', 'A', 'A\n', 'A\r\nB\rC', 'A\nA\nB', ' B \nA\n B ', '가😀\n🙂\n끝', '\uD800\n\uDC00', 'a\nb\nc\nd', 'a\nX\nc\nY']
  for (const left of corpus) for (const right of corpus) {
    const document = prepare(left, right)
    assert.equal(output(document, 'original').text, normal(left)); assert.equal(output(document, 'modified').text, normal(right)); cases++
  }
})
check('source gate rejects plausible counts with wrong content or omitted empty source lines', () => {
  const left = 'a\nb\nc', right = 'a\nB\nc', valid = compareTextLines(left, right)
  assert.equal(validateDiffAgainstSources(left, right, valid), true)
  for (const mutate of [
    (value: TextDiffResult) => { value.lines[0].content = 'forged' },
    (value: TextDiffResult) => { value.lines[1].left = 99 },
    (value: TextDiffResult) => { value.summary.added++ },
    (value: TextDiffResult) => { value.lines[0].content = 'a\nextra' },
  ]) {
    const changed = structuredClone(valid); mutate(changed)
    assert.equal(validateDiffAgainstSources(left, right, changed), false)
    assert.throws(() => prepareLineMerge(++id, left, right, changed), /invalidResponse/)
  }
  const empty: TextDiffResult = { lines: [], summary: { added: 0, removed: 0, unchanged: 0 } }
  assert.equal(validateDiffAgainstSources('', '', empty), true); assert.equal(validateDiffAgainstSources('\n', '', empty), false)
  assert.equal(validateDiffAgainstSources('a'.repeat(1048577), '', empty), false)
  assert.equal(validateDiffAgainstSources('😀'.repeat(262145), '', empty), false)
})
check('adjacent additions/removals form one block, retained rows divide blocks, identities belong to each snapshot', () => {
  const document = prepare('A\nold\nkeep\ntail', 'A\nnew\nkeep\nextra\ntail')
  assert.equal(document.blocks.length, 2)
  assert.deepEqual(document.blocks.map(block => [block.number, block.original, block.modified]), [[1, ['old'], ['new']], [2, [], ['extra']]])
  const mixed = createLineMergeChoices(document).map((choice, index) => ({ ...choice, side: index === 0 ? 'modified' as const : 'original' as const }))
  assert.equal(selectLineMerge(document, mixed).text, 'A\nnew\nkeep\ntail')
  const next = prepare('A\nold\nkeep\ntail', 'A\nnew\nkeep\nextra\ntail')
  assert.throws(() => selectLineMerge(next, mixed), /invalidChoices/)
})
check('every combination selects each contiguous block once and preserves unchanged order', () => {
  const document = prepare('head\nold1\nanchor1\nold2\nanchor2\nold3\ntail', 'head\nnew1\nanchor1\nnew2a\nnew2b\nanchor2\nnew3\ntail')
  assert.equal(document.blocks.length, 3)
  for (let mask = 0; mask < 8; mask++) {
    const choices = document.blocks.map((block, index): LineMergeChoice => ({ blockId: block.id, side: mask & (1 << index) ? 'modified' : 'original' }))
    const expected = ['head', mask & 1 ? 'new1' : 'old1', 'anchor1', ...(mask & 2 ? ['new2a', 'new2b'] : ['old2']), 'anchor2', mask & 4 ? 'new3' : 'old3', 'tail'].join('\n')
    assert.equal(selectLineMerge(document, choices).text, expected); cases++
  }
})
check('invalid selection is rejected atomically instead of choosing a default or reusing a missing block', () => {
  const document = prepare('a\nb\nc\nd', 'a\nB\nc\nD'), choices = createLineMergeChoices(document)
  for (const selection of [[], choices.slice(0, 1), [choices[0], choices[0]], [...choices, choices[0]], choices.map(choice => ({ ...choice, side: 'both' })), choices.map(choice => ({ ...choice, other: true }))]) {
    assert.throws(() => selectLineMerge(document, selection as readonly LineMergeChoice[]), /invalidChoices/)
  }
  assert.throws(() => selectLineMerge({ ...document }, choices), /invalidDocument/)
  assert.throws(() => prepareLineMerge(0, '', '', compareTextLines('', '')), /invalidDocument/)
  assert.throws(() => createLineMergeChoices(document, 'invalid' as 'original'), /invalidChoices/)
})
check('owned rows, blocks, choices and output remain immutable after caller changes', () => {
  const result = compareTextLines('a\nb', 'a\nB')
  Object.assign(result.lines[0], { ignoredRuntimeField: { text: 'secret' } })
  const document = prepareLineMerge(++id, 'a\nb', 'a\nB', result)
  result.lines[0].content = 'mutated'; result.lines.length = 0
  assert.equal(document.rows[0].content, 'a'); assert.equal(Object.hasOwn(document.rows[0], 'ignoredRuntimeField'), false)
  assert.ok(Object.isFrozen(document) && Object.isFrozen(document.rows[0]) && Object.isFrozen(document.blocks[0].original))
  const choices = createLineMergeChoices(document).map(choice => ({ ...choice })), merged = selectLineMerge(document, choices)
  choices[0].side = 'modified'; assert.equal(merged.text, 'a\nb'); assert.equal(merged.choices[0].side, 'original')
  assert.ok(Object.isFrozen(merged) && Object.isFrozen(merged.lines) && Object.isFrozen(merged.choices[0]))
})
check('exact2MiB selection keeps all text while preview caps rows and characters', () => {
  const left = 'a'.repeat(1048575) + '\n', right = '\n' + 'b'.repeat(1048575), document = prepare(left, right)
  assert.equal(document.blocks.length, 2)
  const choices = createLineMergeChoices(document).map((choice, index) => ({ ...choice, side: index === 0 ? 'original' as const : 'modified' as const }))
  const merged = selectLineMerge(document, choices)
  assert.equal(merged.bytes, LINE_MERGE_MAX_BYTES); assert.equal(merged.text, left + right); assert.equal(merged.lineCount, 3)
  const preview = lineMergePreview(merged, 0); assert.equal(preview.rows.length, 3); assert.equal(preview.rows[0].text.length, 2000); assert.equal(preview.rows[2].text.length, 2000); assert.ok(preview.omitted > 2_000_000)
  assert.equal(new TextEncoder().encode(merged.text).length, 2097152)
})
check('long pages retain all row identities and never split a surrogate pair at display cut', () => {
  const text = Array.from({ length: 600 }, (_, index) => `${index}:` + '😀'.repeat(400)).join('\n')
  const merged = output(prepare(text, text), 'original'), first = lineMergePreview(merged, 0), third = lineMergePreview(merged, 2)
  assert.equal(first.rows.length, LINE_MERGE_PAGE_LINES); assert.equal(first.pageCount, 3)
  assert.ok(first.rows.reduce((total, row) => total + row.text.length, 0) <= LINE_MERGE_PREVIEW_CHARACTERS)
  assert.ok(first.rows.some(row => row.shortened)); assert.equal(third.rows[0].number, 401); assert.equal(third.rows.at(-1)!.number, 600)
  for (const row of first.rows) assert.ok(!/[\uD800-\uDBFF]$/.test(row.text))
  assert.equal(shortenLineMergePreview('x😀y', 2), 'x'); assert.equal(shortenLineMergePreview('x\uD800y', 2), 'x\uD800')
  assert.equal(lineMergePreview(merged, 999).page, 2); assert.equal(lineMergePreview(merged, NaN).page, 0)
})
check('empty merged documents are valid outputs including zero-byte downloads and final newline distinctions', () => {
  const cleared = output(prepare('remove me', ''), 'modified')
  assert.equal(cleared.text, ''); assert.equal(cleared.bytes, 0); assert.equal(cleared.lineCount, 0); assert.equal(lineMergePreview(cleared, 0).rows.length, 0)
  const trailing = output(prepare('', '\n'), 'modified'); assert.equal(trailing.text, '\n'); assert.equal(trailing.lineCount, 2)
  assert.deepEqual(output(prepare('', ''), 'original').choices, [])
})
console.log(JSON.stringify({ groups, sourcePairsAndSelections: cases }))
