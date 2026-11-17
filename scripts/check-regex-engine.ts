import assert from 'node:assert/strict'
import { REGEX_LIMITS, RegexEngineError, advanceRegexIndex, captureRegexJob, executeRegexJob, regexBetweenPattern, type RegexJob } from '../src/utils/regexEngine.ts'
const job = (inputText: string, pattern: string, options: Partial<RegexJob> = {}): RegexJob => ({ inputText, pattern, flags: 'g', operation: 'extract', replacement: '', transform: 'none', ...options })
const run = (inputText: string, pattern: string, options: Partial<RegexJob> = {}) => executeRegexJob(job(inputText, pattern, options))
const error = (callback: () => unknown, code: string) => assert.throws(callback, cause => cause instanceof RegexEngineError && cause.code === code)
let groups = 0, oracleCases = 0
function check(name: string, callback: () => void) { if (process.argv[2] && !name.includes(process.argv[2])) return; callback(); groups++; console.log('PASS', name) }

check('four original operations and non-global captured output preserve native results', () => {
  assert.equal(run('A12\nB34', '\\d+').outputText, '12\n34')
  assert.equal(run('zab', '(a)(b)', { flags: '' }).outputText, 'ab\na\nb')
  assert.equal(run('A12\nno\nB34', '\\d+', { operation: 'grep' }).outputText, 'A12\nB34')
  const result = run('abac', '(a)', { operation: 'replace', replacement: '[$1]' }); assert.equal(result.outputText, '[a]b[a]c'); assert.equal(result.matchCount, 2)
  assert.equal(run('b', '(a)?b', { flags: '' }).outputText, 'b\n')
})
check('whitespace-only patterns are valid native patterns; only an empty pattern is rejected', () => {
  for (const pattern of [' ', '\t', '\n', ' \t']) for (const flags of ['', 'g']) {
    const input = `a${pattern}b${pattern}c`
    assert.equal(run(input, pattern, { flags }).outputText, (input.match(new RegExp(pattern, flags)) ?? []).join('\n'))
    assert.equal(run(input, pattern, { flags, operation: 'replace', replacement: '!' }).outputText, input.replace(new RegExp(pattern, flags), '!'))
    const regex = new RegExp(pattern, flags)
    assert.equal(run(input, pattern, { flags, operation: 'grep' }).outputText, input.split('\n').filter(line => line.match(regex)).join('\n')); oracleCases += 3
  }
  error(() => run('a', ''), 'emptyPattern')
})
check('zero matches terminate at exact UTF-16/code-point indices and include the final empty match once', () => {
  assert.deepEqual(run('abc', '^').details.map(item => item.index), [0]); assert.deepEqual(run('bbb', 'a*').details.map(item => item.index), [0, 1, 2, 3])
  assert.equal(run('abc', '$', { operation: 'replace', replacement: '!' }).outputText, 'abc!')
  assert.deepEqual(run('😀a', '(?=.)', { flags: 'gu' }).details.map(item => item.index), [0, 2]); assert.deepEqual(run('😀a', '(?:)', { flags: 'gu' }).details.map(item => item.index), [0, 2, 3])
  assert.deepEqual(run('😀a', '(?:)', { flags: 'g' }).details.map(item => item.index), [0, 1, 2, 3]); assert.deepEqual(run('😀a', '(?:)', { flags: 'gv' }).details.map(item => item.index), [0, 2, 3])
  assert.equal(advanceRegexIndex('\ud800a', 0, true), 1); assert.equal(advanceRegexIndex('😀', 0, true), 2); assert.equal(advanceRegexIndex('', 0, true), 1)
})
check('line numbers preserve LF-only policy, CRLF text and final newline without repeated prefixes', () => {
  const input = 'a\r\nb\rc\nd\n', result = run(input, '[a-z]')
  assert.deepEqual(result.details.map(item => [item.match, item.index, item.line]), [['a', 0, 1], ['b', 3, 2], ['c', 5, 2], ['d', 7, 3]])
  assert.equal(result.inputLineCount, 4); assert.equal(result.outputNonblankLines, 4)
  const grep = run('one\r\nskip\r\ntwo\r\n', 'one|two', { operation: 'grep' }); assert.equal(grep.outputText, 'one\r\ntwo\r')
})
check('global and sticky grep retain same-RegExp line state, counts and original group display semantics', () => {
  const inputs = ['a\naa\na\nba\na', '\n\na\n', 'a1b2\n3\nnone', '😀a\n😀\n'], patterns = ['a', '(a)?', '\\d', '^', '(?:)', '.']
  for (const input of inputs) for (const pattern of patterns) for (const flags of ['', 'g', 'y', 'gy', 'u', 'gu', 'yu', 'guy', 'd', 'dv', 'gv']) {
    const regex = new RegExp(pattern, flags), expected: { match: string; groups: string[]; index: number; line: number }[] = []
    const output = input.split('\n').filter((line, index) => { const found = line.match(regex); if (!found) return false; expected.push({ match: line, groups: found.slice(1).map(value => value ?? ''), index: line.indexOf(found[0]), line: index + 1 }); return true }).join('\n')
    const result = run(input, pattern, { flags, operation: 'grep' }); assert.equal(result.outputText, output, JSON.stringify({ input, pattern, flags })); assert.equal(result.matchCount, expected.length)
    assert.deepEqual(result.details.map(({ match, groups, index, line }) => ({ match, groups, index, line })), expected.slice(0, 5)); oracleCases++
  }
})
check('GetSubstitution agrees with native on numeric, named, unmatched, context and literal dollar tokens', () => {
  const replacements = ['', '$$', '$&', '$`', "$'", '$1', '$2', '$0', '$00', '$01', '$09', '$10', '$11', '$99', '$100', '$123', '$<x>', '$<missing>', '$<x', '$<$1>', '$$$1-$&-$`-$\'-end']
  const patterns = ['(a)', '(a)?b', '(?<x>a)?(?<y>b)', '(a)(b)(c)?', 'a*', '(?:)', '(?<=a)b', '\\b', '([a-z])', '(a)'.repeat(12)]
  for (const pattern of patterns) for (const flags of ['', 'g', 'y', 'gy', 'gu', 'gv', 'dgu']) for (const replacement of replacements) for (const input of ['ababa', 'bca\nab', '', '😀a', 'a'.repeat(14)]) {
    const expected = input.replace(new RegExp(pattern, flags), replacement), actual = run(input, pattern, { flags, operation: 'replace', replacement }).outputText
    assert.equal(actual, expected, JSON.stringify({ input, pattern, flags, replacement })); oracleCases++
  }
})
check('deterministic small native oracle covers extraction/captures and arbitrary replacement token adjacency', () => {
  let seed = 1234567; const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0)
  const patterns = ['(a)|(b)', '(a)?', '(?<x>a+)', '.', '[ab]*', 'a(?=b)', '^|$', '(a)(b)?', '[\\p{ASCII}&&[^b]]'], flags = ['', 'g', 'gu', 'gv', 'y', 'gy', 'm', 'gm', 'gs']
  const parts = ['$0', '$1', '$02', '$12', '$99', '$&', '$$', '$`', "$'", '$<x>', '$<$1>', 'a', '\n', '😀', '$']
  for (let n = 0; n < 3000; n++) {
    const input = Array.from({ length: random() % 12 }, () => ['a', 'b', '😀', '\n'][random() % 4]).join(''), pattern = patterns[random() % patterns.length], flag = flags[random() % flags.length]
    let regex: RegExp; try { regex = new RegExp(pattern, flag) } catch { continue }
    const replacement = Array.from({ length: random() % 8 }, () => parts[random() % parts.length]).join('')
    assert.equal(run(input, pattern, { flags: flag }).outputText, (input.match(regex) ?? []).join('\n'))
    assert.equal(run(input, pattern, { flags: flag, operation: 'replace', replacement }).outputText, input.replace(new RegExp(pattern, flag), replacement)); oracleCases += 2
  }
})
check('smart uppercase is an explicit transform; literal multiple-character delimiters and first-occurrence dedupe are exact', () => {
  assert.equal(run('hello world', '\\b(\\w)', { operation: 'replace', transform: 'uppercaseMatch' }).outputText, 'Hello World')
  assert.equal(run('hello world', '\\b(\\w)', { operation: 'replace', transform: 'uppercaseMatch', flags: '' }).outputText, 'Hello world')
  assert.equal(run('::a#b## ::x\ny##', regexBetweenPattern(':: ##')).outputText, '::a#b##\n::x\ny##')
  assert.equal(run('[.*a$^]', regexBetweenPattern('[ ]')).outputText, '[.*a$^]'); assert.equal(run('(a)(b)', regexBetweenPattern('')).outputText, '(a)\n(b)')
  const dedupe = run('A1\nA1\nB2\n\n', '', { operation: 'grep', transform: 'dedupe' }); assert.equal(dedupe.outputText, 'A1\nB2\n'); assert.equal(dedupe.matchCount, 0)
})
check('request shapes, input/pattern/replacement boundaries and unsupported flags reject without coercion or slicing', () => {
  for (const value of [null, [], {}, { ...job('a', 'a'), inputText: 1 }, { ...job('a', 'a'), operation: { toString: () => 'grep' } }]) error(() => captureRegexJob(value), 'invalidInput')
  const source = job('a', 'a'), snapshot = captureRegexJob(source); source.inputText = 'changed'; assert.equal(snapshot.inputText, 'a'); assert.ok(Object.isFrozen(snapshot))
  assert.equal(run('a'.repeat(REGEX_LIMITS.input), '^').matchCount, 1); error(() => run('a'.repeat(REGEX_LIMITS.input + 1), '^'), 'inputTooLarge')
  captureRegexJob(job('', 'a'.repeat(REGEX_LIMITS.pattern), { replacement: 'b'.repeat(REGEX_LIMITS.replacement) }))
  error(() => run('', 'a'.repeat(REGEX_LIMITS.pattern + 1)), 'patternTooLarge'); error(() => run('', 'a', { replacement: 'b'.repeat(REGEX_LIMITS.replacement + 1) }), 'replacementTooLarge')
  for (const flags of ['gg', 'uv', 'no', 'g'.repeat(17)]) error(() => run('a', 'a', { flags }), 'invalidRegex')
  error(() => run('a', '['), 'invalidRegex'); error(() => run('a', '  '), 'emptyPattern'); error(() => run('a', 'a', { transform: 'uppercaseMatch' }), 'invalidInput')
})
check('exact output/match boundaries are complete; huge zero-match/capture/context expansions stop before oversized assembly', () => {
  assert.equal(run('x'.repeat(40), 'x', { operation: 'replace', replacement: 'a'.repeat(100000) }).outputLength, REGEX_LIMITS.output)
  error(() => run('x'.repeat(41), 'x', { operation: 'replace', replacement: 'a'.repeat(100000) }), 'outputTooLarge')
  error(() => run('x'.repeat(100000), '(?=x)', { operation: 'replace', replacement: 'a'.repeat(100000) }), 'outputTooLarge')
  error(() => run('x'.repeat(1_000_000), '^', { operation: 'replace', replacement: "$'".repeat(50000) }), 'outputTooLarge')
  error(() => run('x'.repeat(1_000_000), '(x+)', { operation: 'replace', replacement: '$1'.repeat(50000) }), 'outputTooLarge')
  assert.equal(run('x'.repeat(REGEX_LIMITS.matches), 'x').matchCount, REGEX_LIMITS.matches); error(() => run('x'.repeat(REGEX_LIMITS.matches + 1), 'x'), 'tooManyMatches')
  assert.equal(run('x'.repeat(REGEX_LIMITS.matches - 1), '(?:)').matchCount, REGEX_LIMITS.matches); error(() => run('x'.repeat(REGEX_LIMITS.matches), '(?:)'), 'tooManyMatches')
})
check('details are bounded previews independently of exact full output and match count', () => {
  const pattern = '('.repeat(40) + 'x+' + ')'.repeat(40), result = run('x'.repeat(10000), pattern, { operation: 'replace', replacement: '$&' })
  assert.equal(result.outputText.length, 10000); assert.equal(result.details[0].groupCount, 40); assert.equal(result.details[0].matchLength, 10000); assert.equal(result.details[0].groups.length, 20)
  assert.equal(result.details.reduce((sum, row) => sum + row.match.length + row.groups.reduce((n, value) => n + value.length, 0), 0), REGEX_LIMITS.detailUnits); assert.equal(result.detailsTruncated, true)
  const many = run('x'.repeat(100), 'x'); assert.equal(many.details.length, 5); assert.equal(many.matchCount, 100); assert.equal(many.detailsTruncated, true); assert.equal(many.outputText, Array(100).fill('x').join('\n'))
})
console.log(`Regex engine: ${groups} groups passed; ${oracleCases} native oracle cases`)
