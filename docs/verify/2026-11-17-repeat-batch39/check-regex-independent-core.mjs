// Independent native-JS oracle. All patterns are fixed and inputs are short.
import assert from 'node:assert/strict'
import { executeRegexJob } from '../../../src/utils/regexEngine.ts'

const patterns = ['a', '(a)', '(a)?b', '(a)|(b)', '(?<x>a)?b', '(?<__proto__>a)', '(?<toString>b)', '^', '$', '(?:)', '(?=a)', 'a*', '(a(b)?)', '(.)', '(a)(b)(c)?', '[\\s\\S]', '[]', '\\b', '\\d+', '(?<=a)b', '\\ud800', '[\\u{1f600}]']
const inputs = ['', 'ab', 'aba', 'b', 'A1\nb2', '😀a', '\ud800a', '\r\n', 'aab', '##', 'xy']
const flagsList = ['', 'g', 'y', 'gy', 'gu', 'gmu', 'gsy', 'u', 'v']
const replacements = ['$', '$0', '$00', '$01', '$09', '$10', '$12', '$99', '$$', '$&', '$`', "$'", '$<x>', '$<missing>', '$$1', '$<__proto__>', '$<toString>', '$<>', '$<x', 'a$1b$2c', '\ud800']
let replacementsChecked = 0, extractsChecked = 0, grepsChecked = 0
for (const pattern of patterns) for (const flags of flagsList) {
  try { new RegExp(pattern, flags) } catch { continue }
  for (const inputText of inputs) {
    const base = { pattern, flags, inputText, replacement: '', transform: 'none' }
    for (const replacement of replacements) {
      const actual = executeRegexJob({ ...base, operation: 'replace', replacement })
      const expected = inputText.replace(new RegExp(pattern, flags), replacement)
      assert.equal(actual.outputText, expected, JSON.stringify({ mode: 'replace', pattern, flags, inputText, replacement }))
      assert.equal(actual.outputLength, expected.length)
      replacementsChecked++
    }
    const extracted = executeRegexJob({ ...base, operation: 'extract' })
    const nativeMatches = inputText.match(new RegExp(pattern, flags)) ?? []
    assert.equal(extracted.outputText, nativeMatches.join('\n'), JSON.stringify({ mode: 'extract', pattern, flags, inputText }))
    assert.equal(extracted.matchCount, flags.includes('g') ? nativeMatches.length : nativeMatches.length ? 1 : 0)
    extractsChecked++
    const regex = new RegExp(pattern, flags), expectedLines = []
    for (const line of inputText.split('\n')) if (line.match(regex)) expectedLines.push(line)
    const grepped = executeRegexJob({ ...base, operation: 'grep' })
    assert.equal(grepped.outputText, expectedLines.join('\n'), JSON.stringify({ mode: 'grep', pattern, flags, inputText }))
    assert.equal(grepped.matchCount, expectedLines.length)
    grepsChecked++
  }
}
const unicode = executeRegexJob({ operation: 'extract', pattern: '(?:)', flags: 'gu', inputText: '😀a', replacement: '', transform: 'none' })
assert.deepEqual(unicode.details.map(detail => detail.index), [0, 2, 3])
const codeUnits = executeRegexJob({ operation: 'extract', pattern: '(?:)', flags: 'g', inputText: '😀a', replacement: '', transform: 'none' })
assert.deepEqual(codeUnits.details.map(detail => detail.index), [0, 1, 2, 3])
console.log(JSON.stringify({ independentPreparationOnly: true, groups: 4, replacementsChecked, extractsChecked, grepsChecked, zeroLengthIndices: { unicode: [0, 2, 3], utf16: [0, 1, 2, 3] } }, null, 2))
