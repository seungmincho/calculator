import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { copyGpaText, createGpaCopyGuard, gpaShareUrl, readGpaCopyQuery, type GpaScale } from '../src/utils/gpaCopy.ts'
import type { Converted } from '../src/components/GpaConverter.tsx'

let count = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); count++; console.log(`PASS ${name}`) }
const deferred = () => {
  let resolve!: () => void, reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

await check('Clipboard success preserves exact Korean text and line breaks without fallback', async () => {
  const text = '4.3 만점 3.7\n비례 환산: 3.87 / 86%\n등급표 기준(참고): A-'
  let copied = '', fallbacks = 0
  assert.equal(await copyGpaText(text, () => true, { writeText: async value => { copied = value }, fallback: () => { fallbacks++; return true } }), 'copied')
  assert.equal(copied, text)
  assert.equal(fallbacks, 0)
})

for (const available of [false, true]) {
  for (const outcome of ['true', 'false', 'throw'] as const) {
    await check(`${available ? 'rejected Clipboard' : 'missing Clipboard'} + fallback ${outcome} reports exact outcome`, async () => {
      let calls = 0
      const result = await copyGpaText('unchanged', () => true, {
        ...(available ? { writeText: async () => { throw new Error('NotAllowedError') } } : {}),
        fallback: text => { calls++; assert.equal(text, 'unchanged'); if (outcome === 'throw') throw new Error('blocked'); return outcome === 'true' },
      })
      assert.equal(result, outcome === 'true' ? 'copied' : 'failed')
      assert.equal(calls, 1)
    })
  }
}

await check('synchronous Clipboard failure uses fallback and truthy nonboolean is not success', async () => {
  assert.equal(await copyGpaText('x', () => true, { writeText: () => { throw new Error('blocked') }, fallback: () => true }), 'copied')
  assert.equal(await copyGpaText('x', () => true, { fallback: () => 1 as unknown as boolean }), 'failed')
})

await check('an already stale request touches neither API', async () => {
  assert.equal(await copyGpaText('old', () => false, { writeText: async () => { assert.fail('must not write') }, fallback: () => { assert.fail('must not fallback') } }), 'stale')
})

for (const late of ['resolve', 'reject'] as const) await check(`late ${late} after input change is stale and cannot start fallback`, async () => {
  const guard = createGpaCopyGuard(), token = guard.begin('result'), pending = deferred()
  let fallbackCalls = 0
  const copying = copyGpaText('old result', () => guard.isCurrent(token), { writeText: () => pending.promise, fallback: () => { fallbackCalls++; return true } })
  guard.invalidate()
  if (late === 'resolve') pending.resolve()
  else pending.reject(new Error('old denied'))
  assert.equal(await copying, 'stale')
  assert.equal(fallbackCalls, 0)
})

await check('the latest request supersedes earlier requests across both clipboard targets', async () => {
  const guard = createGpaCopyGuard()
  const oldResult = guard.begin('result'), link = guard.begin('link'), latestResult = guard.begin('result')
  assert.equal(guard.isCurrent(oldResult), false)
  assert.equal(guard.isCurrent(link), false)
  assert.equal(guard.isCurrent(latestResult), true)
  guard.invalidate()
  assert.equal(guard.isCurrent(link), false)
  assert.equal(guard.isCurrent(latestResult), false)
})

await check('a late result rejection cannot overwrite a newer copied link using fallback', async () => {
  const guard = createGpaCopyGuard(), result = guard.begin('result'), pending = deferred()
  let clipboardText = ''
  const old = copyGpaText('old result', () => guard.isCurrent(result), { writeText: () => pending.promise, fallback: text => { clipboardText = text; return true } })
  const link = guard.begin('link')
  assert.equal(await copyGpaText('current URL', () => guard.isCurrent(link), { writeText: async text => { clipboardText = text }, fallback: () => false }), 'copied')
  pending.reject(new Error('late rejection'))
  assert.equal(await old, 'stale')
  assert.equal(clipboardText, 'current URL')
})

await check('late first request cannot replace a newer same-target success or failure', async () => {
  for (const latestCopied of [false, true]) {
    const guard = createGpaCopyGuard(), first = guard.begin('link'), pending = deferred()
    const old = copyGpaText('old URL', () => guard.isCurrent(first), { writeText: () => pending.promise, fallback: () => { assert.fail('stale fallback') } })
    const second = guard.begin('link')
    assert.equal(await copyGpaText('current URL', () => guard.isCurrent(second), { fallback: () => latestCopied }), latestCopied ? 'copied' : 'failed')
    pending.reject(new Error('late'))
    assert.equal(await old, 'stale')
  }
})

await check('shared query restoration allows only known scales and preserves the original value', () => {
  for (const scale of ['4.5', '4.3', '4.0', '100'] as const) assert.deepEqual(readGpaCopyQuery(new URLSearchParams({ scale, v: '3.700' })), { scale, inputValue: '3.700' })
  for (const scale of ['constructor', '__proto__', '5', '4']) assert.deepEqual(readGpaCopyQuery(new URLSearchParams({ scale, v: '0' })), { scale: '4.5', inputValue: '0' })
  assert.deepEqual(readGpaCopyQuery(new URLSearchParams()), { scale: '4.5', inputValue: '' })
})

await check('current-input share URL replaces stale values before any effect and retains unrelated context', () => {
  const url = gpaShareUrl('https://example.test/gpa-converter/?scale=100&v=88&lang=en#result', '4.3', '3.70')
  assert.equal(url, 'https://example.test/gpa-converter/?lang=en&scale=4.3&v=3.70#result')
  assert.deepEqual(readGpaCopyQuery(new URL(url).searchParams), { scale: '4.3', inputValue: '3.70' })
  assert.equal(gpaShareUrl(url, '4.5', ''), 'https://example.test/gpa-converter/?lang=en#result')
  assert.equal(new URL(gpaShareUrl(url, '4.0', '0')).searchParams.get('v'), '0')
})

// Run the existing converter directly; no duplicate conversion implementation or React/browser runtime.
const source = readFileSync(new URL('../src/components/GpaConverter.tsx', import.meta.url), 'utf8')
const calculationSource = source.slice(source.indexOf('type Scale ='), source.indexOf('export default function GpaConverter'))
assert.ok(calculationSource.includes('export function convert'))
const exports: { convert?: (value: number, scale: GpaScale) => Converted | null } = {}
new Function('exports', ts.transpileModule(calculationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exports)
const convert = exports.convert!

await check('all four source scales preserve full-mark, zero and invalid-input conversion boundaries', () => {
  for (const scale of ['4.5', '4.3', '4.0', '100'] as const) {
    const max = Number(scale)
    assert.deepEqual(convert(max, scale)?.ratio, { '4.5': 4.5, '4.3': 4.3, '4.0': 4, '100': 100 })
    assert.deepEqual(convert(0, scale)?.ratio, { '4.5': 0, '4.3': 0, '4.0': 0, '100': 0 })
    for (const invalid of [-1, max + 0.001, Infinity, NaN]) assert.equal(convert(invalid, scale), null)
  }
})

await check('ratio and reference-band results remain distinct across all four source scales', () => {
  assert.deepEqual(convert(3.5, '4.5'), { ratio: { '4.5': 3.5, '4.3': 3.34, '4.0': 3.11, '100': 77.8 }, bandG45: null, bandPercent: '85~89', grade: 'B+' })
  assert.deepEqual(convert(3.7, '4.3'), { ratio: { '4.5': 3.87, '4.3': 3.7, '4.0': 3.44, '100': 86 }, bandG45: null, bandPercent: '90~94', grade: 'A-' })
  assert.deepEqual(convert(3.2, '4.0'), { ratio: { '4.5': 3.6, '4.3': 3.44, '4.0': 3.2, '100': 80 }, bandG45: null, bandPercent: '85~89', grade: 'B+' })
  assert.deepEqual(convert(88, '100'), { ratio: { '4.5': 3.96, '4.3': 3.78, '4.0': 3.52, '100': 88 }, bandG45: 3.5, bandPercent: null, grade: 'B+' })
})

console.log(`${count} GPA copy and conversion checks passed`)
