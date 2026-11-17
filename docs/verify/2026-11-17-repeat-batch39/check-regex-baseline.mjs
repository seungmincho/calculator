// Bounded, read-only reproduction of the real component's processing callback.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../../../src/components/RegexExtractor.tsx', import.meta.url), 'utf8')
const start = source.indexOf('const processText = useCallback(() => {')
const end = source.indexOf('}, [pattern, flags, replacement, inputText, operation])', start)
assert.ok(start >= 0 && end > start, 'baseline callback must be present')
const body = source.slice(start + 'const processText = useCallback(() => {'.length, end)
const code = ts.transpileModule(`(() => {${body}})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

function run(input) {
  const state = {}
  const context = { pattern: '', flags: 'g', replacement: '', inputText: '', operation: 'extract', ...input, t: key => key }
  for (const name of ['OutputText', 'Matches', 'ShowShareButton', 'IsProcessing', 'IsValid', 'ErrorMessage']) {
    context[`set${name}`] = value => { state[name] = value }
  }
  try {
    vm.runInNewContext(code, context, { timeout: 100 })
    return { timeout: false, output: state.OutputText, count: state.Matches?.length, state }
  } catch (error) {
    if (error.code !== 'ERR_SCRIPT_EXECUTION_TIMEOUT') throw error
    return { timeout: true }
  }
}

const probes = [
  { name: 'ordinary global extract', input: { pattern: '\\d+', inputText: 'A12\nB34' }, output: '12\n34', count: 2 },
  { name: 'non-global extract keeps capture output', input: { pattern: '(a)(b)', flags: '', inputText: 'zab' }, output: 'ab\na\nb', count: 1 },
  { name: 'grep returns matching lines', input: { operation: 'grep', pattern: '\\d+', inputText: 'A12\nno\nB34' }, output: 'A12\nB34', count: 2 },
  { name: 'replace retains JS replacement tokens', input: { operation: 'replace', pattern: '(a)', replacement: '[$1]', inputText: 'abac' }, output: '[a]b[a]c', count: 2 },
  { name: 'global start anchor never advances', input: { pattern: '^', inputText: 'abc' }, timeout: true },
  { name: 'global optional match never advances', input: { pattern: 'a*', inputText: 'bbb' }, timeout: true },
  { name: 'replace global end anchor never advances', input: { operation: 'replace', pattern: '$', replacement: '!', inputText: 'abc' }, timeout: true },
  { name: 'Unicode lookahead never advances', input: { pattern: '(?=.)', flags: 'gu', inputText: '😀a' }, timeout: true },
  { name: 'backtracking blocks current synchronous callback', input: { pattern: '(a+)+$', inputText: `${'a'.repeat(30)}!` }, timeout: true },
]
const result = probes.map(probe => {
  const actual = run(probe.input)
  assert.equal(actual.timeout, !!probe.timeout, probe.name)
  if (!probe.timeout) {
    assert.equal(actual.output, probe.output, probe.name)
    assert.equal(actual.count, probe.count, probe.name)
  }
  return { name: probe.name, ...actual, state: undefined }
})
const report = { reproductionOnly: true, sourceSha256: createHash('sha256').update(source).digest('hex'), timeoutMs: 100, groups: result.length, result }
if (process.argv.includes('--record')) writeFileSync(new URL('before-fix.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
