import assert from 'node:assert/strict'
import { createRegexDraft, REGEX_URL_KEYS, regexJobKey, restoreRegexUrl, updateRegexUrl } from '../src/utils/regexSnapshot.ts'
import { REGEX_LIMITS } from '../src/utils/regexEngine.ts'
let groups = 0
function check(name: string, callback: () => void) { callback(); groups++; console.log('PASS', name) }
check('legacy double-encoded pattern/input and single-encoded replacement restore with explicit empty flags', () => {
  const params = new URLSearchParams(); params.set('pattern', encodeURIComponent('(?<x>가)\\s+%20')); params.set('input', encodeURIComponent('가 😀\nliteral%20')); params.set('flags', ''); params.set('replacement', '$<x>%20'); params.set('operation', 'replace')
  const restored = restoreRegexUrl(params); assert.deepEqual(restored.warnings, []); assert.equal(restored.draft.pattern, '(?<x>가)\\s+%20'); assert.equal(restored.draft.inputText, '가 😀\nliteral%20'); assert.equal(restored.draft.flags, ''); assert.equal(restored.draft.replacement, '$<x>%20')
  assert.equal(restoreRegexUrl(new URLSearchParams()).draft.flags, 'g'); assert.equal(restoreRegexUrl(new URLSearchParams('input=&pattern=&flags=')).draft.flags, '')
})
check('malformed legacy percent cannot crash or silently drop raw input; unknown/duplicate enum parameters are explicit', () => {
  const result = restoreRegexUrl(new URLSearchParams('operation=bad&pattern=%25ZZ&input=%25&transform=bad&flags=g&flags=i'))
  assert.equal(result.draft.pattern, '%ZZ'); assert.equal(result.draft.inputText, '%'); assert.equal(result.draft.operation, 'grep'); assert.equal(result.draft.transform, 'none'); assert.equal(result.draft.flags, 'g')
  assert.deepEqual(result.warnings.sort(), ['duplicateParameter', 'invalidOperation', 'invalidTransform', 'malformedEncoding'].sort())
})
check('exact numeric URL length cap removes all stale owned keys, retains unrelated duplicates/hash, then recovers a small complete snapshot', () => {
  const base = 'https://toolhub.ai.kr/regex-extractor/?keep=a&keep=b&operation=extract&input=old&replacement=old&transform=dedupe#result', draft = { ...createRegexDraft(), inputText: 'x', pattern: 'x' }
  const empty = updateRegexUrl(base, { ...draft, inputText: '' }); assert.equal(empty.kind, 'ready')
  const available = REGEX_LIMITS.url - empty.href.length
  const exact = updateRegexUrl(base, { ...draft, inputText: 'x'.repeat(available) }); assert.equal(exact.kind, 'ready'); assert.equal(exact.href.length, REGEX_LIMITS.url)
  const huge = updateRegexUrl(base, { ...draft, inputText: 'x'.repeat(available + 1) }); assert.equal(huge.kind, 'tooLong'); assert.equal(huge.shareUrl, null)
  const clean = new URL(huge.href); assert.ok(REGEX_URL_KEYS.every(key => !clean.searchParams.has(key))); assert.deepEqual(clean.searchParams.getAll('keep'), ['a', 'b']); assert.equal(clean.hash, '#result')
  const recovered = updateRegexUrl(huge.href, draft); assert.equal(recovered.kind, 'ready'); assert.deepEqual(restoreRegexUrl(new URL(recovered.href).searchParams).draft, draft)
})
check('encoded Unicode expansion, invalid input and malformed surrogate never return a partial share link', () => {
  const base = 'https://toolhub.ai.kr/regex-extractor/?pattern=old&other=1#x', draft = createRegexDraft()
  assert.equal(updateRegexUrl(base, { ...draft, inputText: '가'.repeat(2000) }).kind, 'tooLong')
  for (const value of [null, { ...draft, inputText: 'x'.repeat(REGEX_LIMITS.input + 1) }, { ...draft, inputText: '\ud800' }, { ...draft, replacement: '\ud800' }, { ...draft, flags: '\ud800' }]) {
    const result = updateRegexUrl(base, value); assert.notEqual(result.kind, 'ready'); assert.equal(result.shareUrl, null); assert.ok(REGEX_URL_KEYS.every(key => !new URL(result.href).searchParams.has(key))); assert.equal(new URL(result.href).searchParams.get('other'), '1')
  }
})
check('smart transforms and replacement restore exactly while draft identity includes all execution fields', () => {
  for (const transform of ['none', 'dedupe', 'uppercaseMatch'] as const) {
    const draft = { ...createRegexDraft(), operation: transform === 'uppercaseMatch' ? 'replace' as const : 'grep' as const, transform, inputText: 'hello\nhello', pattern: '\\b(\\w)', replacement: '$1', flags: '' }, key = regexJobKey(draft)
    const result = updateRegexUrl('https://toolhub.ai.kr/regex-extractor/', draft); assert.equal(result.kind, 'ready'); assert.deepEqual(restoreRegexUrl(new URL(result.href).searchParams).draft, draft); assert.equal(regexJobKey(restoreRegexUrl(new URL(result.href).searchParams).draft), key)
    assert.notEqual(regexJobKey({ ...draft, replacement: '$2' }), key)
  }
})
console.log(`Regex URL snapshot: ${groups} groups passed`)
