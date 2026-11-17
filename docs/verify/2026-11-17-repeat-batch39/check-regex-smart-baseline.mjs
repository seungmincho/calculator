import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../../../src/components/RegexExtractor.tsx', import.meta.url), 'utf8')
const smartStart = source.indexOf('const smartModes = [')
const smartEnd = source.indexOf('// 패턴 설명 생성', smartStart)
const processStart = source.indexOf('const processText = useCallback(() => {')
const processEnd = source.indexOf('}, [pattern, flags, replacement, inputText, operation])', processStart)
assert.ok(smartStart >= 0 && smartEnd > smartStart && processStart >= 0 && processEnd > processStart)
const processBody = source.slice(processStart + 'const processText = useCallback(() => {'.length, processEnd)
const smartCode = source.slice(smartStart, smartEnd)
const compile = value => ts.transpileModule(value, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const fixture = input => {
  const state = {}, context = vm.createContext({ ...input, t: key => key, updateURL() {} })
  for (const name of ['Pattern', 'Operation', 'Replacement', 'OutputText', 'Matches', 'IsValid', 'IsProcessing', 'ErrorMessage', 'ShowShareButton']) {
    context[`set${name}`] = value => { state[name] = value }
  }
  vm.runInContext(compile(`${smartCode};globalThis.apply = applySmartMode;globalThis.process = () => {${processBody}};`), context)
  return { state, context }
}
const probes = []
{
  const f = fixture({ smartMode: 'capitalize-words', userDescription: '', inputText: 'hello world' })
  f.context.apply()
  const output = f.context.inputText.replace(new RegExp(f.state.Pattern, 'g'), f.state.Replacement)
  assert.equal(output, 'hello world')
  probes.push({ name: 'capitalize smart mode leaves matched letters unchanged', replacement: f.state.Replacement, output })
}
{
  const f = fixture({ smartMode: 'extract-between', userDescription: ':: ##', inputText: '::a#b##' })
  f.context.apply()
  const matches = [...f.context.inputText.matchAll(new RegExp(f.state.Pattern, 'g'))]
  assert.equal(matches.length, 0)
  probes.push({ name: 'multi-character delimiter treats each character as forbidden content', pattern: f.state.Pattern, matches: matches.length })
}
{
  const f = fixture({ smartMode: 'remove-duplicates', userDescription: '', inputText: 'A1\nA1\nB2', pattern: '\\d+', flags: 'g', operation: 'extract', replacement: '' })
  f.context.apply()
  const immediate = f.state.OutputText
  assert.equal(immediate, 'A1\nB2')
  f.context.process()
  assert.equal(f.state.OutputText, '1\n1\n2')
  probes.push({ name: 'already scheduled regex callback overwrites deduplication', immediate, afterOldCallback: f.state.OutputText })
}
const report = { reproductionOnly: true, sourceSha256: createHash('sha256').update(source).digest('hex'), groups: probes.length, probes }
if (process.argv.includes('--record')) writeFileSync(new URL('before-smart-fix.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
