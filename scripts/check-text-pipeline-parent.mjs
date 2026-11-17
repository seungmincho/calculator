import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Module from 'node:module'
import { REGEX_MAX, runPipeline } from '../src/utils/textConvert.ts'

// Reuse the review hook harness without changing its owner's file. Deferred case previews settle immediately here;
// actual browser scheduling/performance and DOM focus remain the browser verifier's responsibility.
const harnessPath = path.resolve('docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const harnessModule = new Module(harnessPath)
harnessModule.filename = harnessPath
harnessModule.paths = Module._nodeModulePaths(path.dirname(harnessPath))
harnessModule._compile(fs.readFileSync(harnessPath, 'utf8').replace('const react = {', 'const react = { useDeferredValue(value) { return value },'), harnessPath)
const { componentHarness, all } = harnessModule.exports
const clone = value => structuredClone(value)
const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const messages = lang => merge(JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch21/translations-text-history.json', 'utf8'))[lang])
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
async function fixture(url, language) {
  const firstHistories = []
  const settings = { props: {}, url, messages: language ? messages(language) : undefined,
    modules: { '@/components/GuideSection': { __esModule: true, default: 'GuideSection' } },
    beforeEffects(tree) { firstHistories.push(all(tree).find(node => typeof node.type === 'function' && node.type.name === 'TextPipelineHistoryControls').props.history) },
  }
  const parent = await componentHarness('src/components/TextConverter.tsx', settings)
  parent.render()
  const controls = () => parent.find(node => typeof node.type === 'function' && node.type.name === 'TextPipelineHistoryControls')
  const child = await componentHarness('src/components/TextPipelineHistoryControls.tsx', { props: controls().props, messages: settings.messages })
  child.render()
  const render = () => { parent.render(); child.setProps(controls().props) }
  const localized = (key, fallback = key) => language ? key.split('.').reduce((value, part) => value[part], settings.messages.textConverter) : fallback
  const api = {
    parent, child, firstHistories, controls, render,
    history: () => controls().props.history,
    input: () => parent.find(node => node.props.id === 'tc-input'),
    output: () => parent.find(node => node.type === 'textarea' && node.props.readOnly).props.value,
    field: key => parent.find(node => node.type === 'input' && node.props['aria-label'] === localized(key)),
    setSource(value) { this.input().props.onChange({ target: { value } }); render() },
    setField(key, value) { this.field(key).props.onChange({ target: { value } }); render() },
    add(op) { parent.button(localized(`ops.${op}`)).props.onClick(); render() },
    addReplace() { parent.all().filter(node => node.type === 'button' && all(node).length > 0 && String(node.props.children) === localized('addStep'))[0].props.onClick(); render() },
    addAffix() { parent.all().filter(node => node.type === 'button' && String(node.props.children) === localized('addStep'))[1].props.onClick(); render() },
    action(type) { child.find(node => node.props['data-history-action'] === type).props.onClick(); render() },
    row(index, action) { const row = child.find(node => node.props['data-text-step-index'] === index); all(row).find(node => node.props['data-step-action'] === action).props.onClick(); render() },
    navigate(next, pop = false) { parent.window.history.replaceState(parent.window.history.state, '', next); if (pop) parent.window.dispatch('popstate'); render() },
    cleanup() { child.cleanup(); parent.cleanup() },
  }
  return api
}

await check('Shared URL restores after the identical empty initial tree and own query sync retains history', async () => {
  const f = await fixture('https://toolhub.ai.kr/text-converter/?ops=dedupe,trimLines&other=kept#anchor')
  assert.equal(f.firstHistories[0].present.length, 0)
  assert.deepEqual(clone(f.history().present), [{ op: 'dedupe' }, { op: 'trimLines' }])
  assert.equal(f.history().past.length, 0)
  f.add('reverseLines')
  assert.equal(f.history().past.length, 1); assert.equal(f.history().present.length, 3)
  f.render(); f.render(); assert.equal(f.history().past.length, 1)
  assert.equal(new URLSearchParams(f.parent.window.location.search).get('other'), 'kept')
  assert.equal(f.parent.window.location.hash, '#anchor')
  f.cleanup()
})

await check('Real parent and row movement change trim/dedupe output, and undo/redo recover it', async () => {
  const f = await fixture('https://toolhub.ai.kr/text-converter/?ops=dedupe,trimLines')
  f.setSource(' A\nA')
  assert.equal(f.output(), 'A\nA')
  f.row(1, 'up'); assert.equal(f.output(), 'A')
  assert.deepEqual(clone(f.history().present.map(step => step.op)), ['trimLines', 'dedupe'])
  f.action('undo'); assert.equal(f.output(), 'A\nA')
  f.action('redo'); assert.equal(f.output(), 'A')
  f.row(0, 'remove'); assert.equal(f.output(), ' A\nA')
  f.action('undo'); assert.equal(f.output(), 'A')
  f.cleanup()
})

await check('Private step props, shuffle seed and unfinished fields survive reset undo and own URL changes', async () => {
  const f = await fixture('https://toolhub.ai.kr/text-converter/?ops=shuffle')
  f.setSource('秘密 SOURCE\nTARGET\nthird\nfourth')
  f.setField('replace.find', 'TARGET'); f.setField('replace.repl', 'PRIVATE REPLACE'); f.addReplace()
  f.setField('affix.prefix', 'PREFIX SECRET'); f.setField('affix.suffix', 'SUFFIX SECRET'); f.addAffix()
  const steps = clone(f.history().present), output = f.output()
  assert.equal(typeof steps[0].seed, 'number')
  const beforeAnchor = f.history()
  f.navigate(`${f.parent.window.location.pathname}${f.parent.window.location.search}#guide`, true)
  assert.equal(f.history(), beforeAnchor); assert.deepEqual(clone(f.history().present), steps)
  assert.equal(f.output(), output)
  f.setField('replace.find', 'unfinished find'); f.setField('replace.repl', 'unfinished replacement')
  f.setField('affix.prefix', 'unfinished prefix'); f.setField('affix.suffix', 'unfinished suffix')
  f.action('reset'); assert.equal(f.output(), f.input().props.value)
  f.action('undo'); assert.deepEqual(clone(f.history().present), steps); assert.equal(f.output(), output)
  f.action('redo'); f.action('undo')
  assert.deepEqual(clone(f.history().present), steps)
  for (const [key, value] of [['replace.find', 'unfinished find'], ['replace.repl', 'unfinished replacement'], ['affix.prefix', 'unfinished prefix'], ['affix.suffix', 'unfinished suffix']]) assert.equal(f.field(key).props.value, value)
  assert.equal(f.input().props.value, '秘密 SOURCE\nTARGET\nthird\nfourth')
  assert.equal(new URLSearchParams(f.parent.window.location.search).get('ops'), 'shuffle')
  for (const secret of ['秘密', 'PRIVATE', 'PREFIX', 'SUFFIX', 'unfinished', String(steps[0].seed), 'replace', 'affix']) assert.ok(!decodeURIComponent(f.parent.window.location.href).includes(secret))
  f.add('reverseLines'); f.action('undo'); assert.equal(f.history().present[0].seed, steps[0].seed)
  f.cleanup()
})

await check('Thirty transitions, disabled/no-op boundaries and a new edit after undo discard only redo', async () => {
  const f = await fixture('https://toolhub.ai.kr/text-converter/')
  f.setSource('b\na')
  for (let i = 0; i < 35; i++) f.add('reverseLines')
  assert.equal(f.history().past.length, 30)
  const before = f.history(); f.row(0, 'up'); assert.equal(f.history(), before)
  for (let i = 0; i < 30; i++) f.action('undo')
  assert.equal(f.history().present.length, 5); assert.equal(f.history().future.length, 30)
  const noUndo = f.history(); f.action('undo'); assert.equal(f.history(), noUndo)
  f.add('sortAsc'); assert.equal(f.history().future.length, 0); assert.equal(f.history().past.length, 1)
  f.action('reset'); const empty = f.history(); f.action('reset'); assert.equal(f.history(), empty)
  f.action('undo'); assert.equal(f.history().present.length, 6); assert.equal(f.input().props.value, 'b\na')
  f.cleanup()
})

await check('Changed external query restores a new baseline while same-query popstate preserves current private steps', async () => {
  const f = await fixture('https://toolhub.ai.kr/text-converter/?ops=dedupe')
  f.setSource('my private source'); f.setField('replace.find', 'private find'); f.setField('replace.repl', 'private replace'); f.addReplace()
  f.add('trimLines'); assert.equal(f.history().past.length, 2)
  f.navigate('?ops=sortDesc,list-sqlIn&other=external#back')
  assert.equal(f.history().past.length, 0); assert.equal(f.history().future.length, 0)
  assert.deepEqual(clone(f.history().present), [{ op: 'sortDesc' }, { op: 'list', preset: 'sqlIn' }])
  assert.equal(f.input().props.value, 'my private source'); assert.equal(f.field('replace.find').props.value, 'private find')
  f.addReplace(); assert.equal(f.history().past.length, 1)
  const sameQueryHistory = f.history()
  f.navigate(f.parent.window.location.href, true)
  assert.equal(f.history(), sameQueryHistory); assert.equal(f.history().present.length, 3)
  f.action('undo'); const withRedo = f.history()
  f.navigate(`${f.parent.window.location.pathname}${f.parent.window.location.search}#other-anchor`, true)
  assert.equal(f.history(), withRedo); assert.equal(f.history().future.length, 1)
  f.navigate('?ops=unknown,trimLines,replace&other=external#back')
  assert.deepEqual(clone(f.history().present), [{ op: 'trimLines' }]); assert.equal(f.field('replace.repl').props.value, 'private replace')
  f.navigate('?other=external#back', true); assert.equal(f.history().present.length, 0)
  f.cleanup()
})

await check('Regex flags, per-step failures and length protection remain attached to the correct step', async () => {
  const f = await fixture('https://toolhub.ai.kr/text-converter/')
  f.setSource('abc\nABC')
  const regexBox = f.parent.find(node => node.type === 'label' && String(node.props.children).includes('replace.regex'))
  all(regexBox).find(node => node.type === 'input').props.onChange(); f.render()
  f.setField('replace.find', '('); f.setField('replace.repl', 'x'); f.addReplace()
  f.add('reverseLines'); assert.deepEqual(clone(f.controls().props.errors), ['badRegex', null])
  const saved = clone(f.history().present[0]); assert.equal(saved.regex, true); assert.equal(saved.flags, 'm')
  f.row(0, 'down'); assert.deepEqual(clone(f.controls().props.errors), [null, 'badRegex'])
  f.action('undo'); assert.deepEqual(clone(f.history().present[0]), saved)
  f.setSource('a'.repeat(REGEX_MAX + 1)); assert.deepEqual(clone(f.controls().props.errors), ['tooLong', null])
  assert.equal(f.output(), runPipeline(f.input().props.value, clone(f.history().present)).text)
  f.cleanup()
})

await check('Actual Korean and English parent/child labels resolve and source editors keep 16px inputs', async () => {
  for (const lang of ['ko', 'en']) {
    const f = await fixture('https://toolhub.ai.kr/text-converter/?ops=trimLines', lang)
    const translated = messages(lang).textConverter
    assert.ok(f.child.text().includes(translated.history.urlNotice)); assert.ok(f.parent.text().includes(translated.pipeline.hint))
    f.row(0, 'remove'); f.action('undo'); assert.deepEqual(clone(f.history().present), [{ op: 'trimLines' }])
    assert.match(f.input().props.className, /text-base/)
    for (const key of ['replace.find', 'replace.repl', 'affix.prefix', 'affix.suffix']) assert.match(f.field(key).props.className, /text-base/)
    f.cleanup()
  }
})

console.log(`Text pipeline parent: ${groups} groups passed`)
