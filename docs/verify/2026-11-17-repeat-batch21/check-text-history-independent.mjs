// Actual product parent/child handlers, controlled hooks/URL/focus ports; no browser layout claim.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Module from 'node:module'
import { createTextPipelineHistory, reduceTextPipelineHistory } from '../../../src/utils/textPipelineHistory.ts'
import { runPipeline, REGEX_MAX } from '../../../src/utils/textConvert.ts'

const harnessPath = path.resolve('docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const harnessModule = new Module(harnessPath)
harnessModule.filename = harnessPath
harnessModule.paths = Module._nodeModulePaths(path.dirname(harnessPath))
harnessModule._compile(fs.readFileSync(harnessPath, 'utf8').replace('const react = {', 'const react = { useDeferredValue(value) { return value },'), harnessPath)
const { componentHarness, all } = harnessModule.exports
const clone = value => structuredClone(value)

async function parentFixture(url = 'https://toolhub.ai.kr/text-converter/?ops=shuffle#first') {
  let seed = 1000
  const parent = await componentHarness('src/components/TextConverter.tsx', {
    url, props: {}, globals: { Date: class extends Date { static now() { return ++seed } } },
    modules: { '@/components/GuideSection': { __esModule: true, default: 'GuideSection' } },
  })
  parent.render()
  const props = () => parent.find(node => typeof node.type === 'function' && node.type.name === 'TextPipelineHistoryControls').props
  const child = await componentHarness('src/components/TextPipelineHistoryControls.tsx', { props: props() })
  child.render()
  const render = () => { parent.render(); child.setProps(props()) }
  const field = label => parent.find(node => node.type === 'input' && node.props['aria-label'] === label)
  const focused = []
  child.find(node => node.props['data-text-pipeline-history']).props.ref.current = {
    querySelector(selector) {
      const step = selector.match(/data-text-step-index="(\d+)"/), action = selector.match(/data-history-action="(\w+)"/)
      const node = child.all().find(item => step ? item.props['data-text-step-index'] === Number(step[1]) : item.props['data-history-action'] === action?.[1])
      return node ? { focus() { assert.equal(!!node.props.disabled, false); focused.push(selector) } } : null
    },
  }
  return {
    parent, child, render, field, focused, history: () => props().history,
    source: () => parent.find(node => node.props.id === 'tc-input'),
    output: () => parent.find(node => node.type === 'textarea' && node.props.readOnly).props.value,
    setSource(value) { this.source().props.onChange({ target: { value } }); render() },
    setField(label, value) { field(label).props.onChange({ target: { value } }); render() },
    add(op) { parent.button(`ops.${op}`).props.onClick(); render() },
    privateStep(kind) { parent.all().filter(node => node.type === 'button' && node.props.children === 'addStep')[kind === 'replace' ? 0 : 1].props.onClick(); render() },
    action(action) { child.find(node => node.props['data-history-action'] === action).props.onClick(); render() },
    row(index, action) { all(child.find(node => node.props['data-text-step-index'] === index)).find(node => node.props['data-step-action'] === action).props.onClick(); render() },
    navigate(url, pop = true) { parent.window.history.replaceState(null, '', url); if (pop) parent.window.dispatch('popstate'); render() },
    cleanup() { child.cleanup(); parent.cleanup() },
  }
}
function key(key, extra = {}) {
  return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, keyCode: 0,
    nativeEvent: { isComposing: false }, target: { closest: () => null }, prevented: 0, stopped: 0,
    preventDefault() { this.prevented++ }, stopPropagation() { this.stopped++ }, ...extra }
}
const checks = [
  ['hash-only popstate preserves private steps, shuffle seed and undo/redo history', async () => {
    const f = await parentFixture()
    try {
      f.setSource('private source\nsecond\nthird')
      f.setField('replace.find', 'private'); f.setField('replace.repl', 'changed'); f.privateStep('replace')
      f.setField('affix.prefix', '['); f.setField('affix.suffix', ']'); f.privateStep('affix')
      f.add('reverseLines'); f.action('undo')
      const before = clone(f.history()), beforeOutput = f.output(), query = f.parent.window.location.search
      f.navigate(`${query}#second`)
      const after = clone(f.history())
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        const evidence = { route: '/text-converter/', queryBefore: query, queryAfter: f.parent.window.location.search,
          hash: f.parent.window.location.hash, before, after, beforeOutput, afterOutput: f.output() }
        const target = 'docs/verify/2026-11-17-repeat-batch21/text-history-hash-before-fix.json'
        if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(evidence, null, 2) + '\n')
      }
      assert.deepEqual(after, before)
      assert.equal(f.output(), beforeOutput)
      f.navigate(`${query}#first`)
      assert.deepEqual(clone(f.history()), before)
      assert.equal(f.source().props.value, 'private source\nsecond\nthird')
    } finally { f.cleanup() }
  }],
  ['changed ops establishes an external baseline while preserving source and unfinished forms', async () => {
    const f = await parentFixture()
    try {
      f.setSource('private draft')
      f.setField('replace.find', 'unsaved find'); f.setField('replace.repl', 'unsaved replacement')
      f.setField('affix.prefix', 'left'); f.setField('affix.suffix', 'right'); f.privateStep('affix')
      f.navigate('?ops=sortDesc,list-json#external')
      assert.deepEqual(clone(f.history()), { past: [], present: [{ op: 'sortDesc' }, { op: 'list', preset: 'json' }], future: [] })
      assert.equal(f.source().props.value, 'private draft')
      for (const [label, value] of [['replace.find', 'unsaved find'], ['replace.repl', 'unsaved replacement'], ['affix.prefix', 'left'], ['affix.suffix', 'right']]) assert.equal(f.field(label).props.value, value)
      f.navigate('?ops=trimLines', false)
      assert.deepEqual(clone(f.history().present), [{ op: 'trimLines' }])
    } finally { f.cleanup() }
  }],
  ['source/form/seed privacy survives repeated edits, private reordering and undo/redo', async () => {
    const f = await parentFixture('https://toolhub.ai.kr/text-converter/?ops=shuffle&keep=yes#section')
    try {
      const seed = f.history().present[0].seed
      f.setSource('PRIVATE SOURCE\nB\nC')
      f.setField('replace.find', 'PRIVATE'); f.setField('replace.repl', 'SECRET'); f.privateStep('replace')
      f.setField('affix.prefix', 'PRIVATE PREFIX'); f.setField('affix.suffix', 'PRIVATE SUFFIX'); f.privateStep('affix')
      const allSteps = clone(f.history().present), result = f.output()
      f.row(2, 'up'); f.action('undo'); assert.equal(f.output(), result)
      f.action('reset'); f.action('undo'); assert.deepEqual(clone(f.history().present), allSteps)
      f.action('redo'); f.action('undo'); assert.equal(f.history().present[0].seed, seed)
      assert.equal(f.source().props.value, 'PRIVATE SOURCE\nB\nC')
      const url = decodeURIComponent(f.parent.window.location.href)
      for (const secret of ['PRIVATE', 'SECRET', 'replace', 'affix', String(seed)]) assert.equal(url.includes(secret), false)
      assert.equal(f.parent.window.location.hash, '#section')
      assert.equal(new URLSearchParams(f.parent.window.location.search).get('keep'), 'yes')
    } finally { f.cleanup() }
  }],
  ['thirty-transition cap and no-op moves preserve history identity and branching semantics', async () => {
    const f = await parentFixture('https://toolhub.ai.kr/text-converter/')
    try {
      for (let i = 0; i < 40; i++) f.add('reverseLines')
      assert.equal(f.history().past.length, 30)
      const before = f.history(); f.row(0, 'up'); f.row(0, 'down'); assert.equal(f.history(), before)
      for (let i = 0; i < 30; i++) f.action('undo')
      assert.equal(f.history().present.length, 10)
      assert.equal(f.history().past.length + f.history().future.length, 30)
      f.action('redo'); f.action('redo'); f.add('dedupe')
      assert.equal(f.history().future.length, 0)
      assert.equal(f.history().past.length, 3)
    } finally { f.cleanup() }
  }],
  ['keyboard movement/history keeps editor and IME shortcuts untouched and focuses existing controls', async () => {
    const f = await parentFixture('https://toolhub.ai.kr/text-converter/?ops=dedupe,trimLines')
    try {
      f.setSource(' A\nA')
      let row = f.child.find(node => node.props['data-text-step-index'] === 1)
      const move = key('ArrowUp', { altKey: true }); row.props.onKeyDown(move); f.render()
      assert.equal(f.output(), 'A'); assert.equal(move.prevented, 1)
      assert.equal(f.focused.at(-1), '[data-text-step-index="0"]')
      const section = () => f.child.find(node => node.props['data-text-pipeline-history'])
      const undo = key('z', { ctrlKey: true }); section().props.onKeyDown(undo); f.render()
      assert.equal(f.output(), 'A\nA'); assert.equal(undo.prevented, 1)
      assert.equal(f.focused.at(-1), '[data-history-action="redo"]')
      const redo = key('Z', { metaKey: true, shiftKey: true }); section().props.onKeyDown(redo); f.render()
      assert.equal(f.output(), 'A')
      for (const extra of [{ target: { closest: () => ({ tagName: 'TEXTAREA' }) } }, { nativeEvent: { isComposing: true } }, { keyCode: 229 }]) {
        const before = f.history(), ignored = key('z', { ctrlKey: true, ...extra })
        section().props.onKeyDown(ignored); f.render(); assert.equal(f.history(), before); assert.equal(ignored.prevented, 0)
        row = f.child.find(node => node.props['data-text-step-index'] === 1)
        const ignoredMove = key('ArrowUp', { altKey: true, ...extra }); row.props.onKeyDown(ignoredMove); f.render()
        assert.equal(f.history(), before); assert.equal(ignoredMove.prevented, 0)
      }
      f.row(1, 'remove'); assert.equal(f.focused.at(-1), '[data-text-step-index="0"]')
      f.row(0, 'remove'); assert.equal(f.focused.at(-1), '[data-history-action="undo"]')
    } finally { f.cleanup() }
  }],
  ['all primitive Step fields are cloned and regex failure/length policy stays aligned with moved stages', () => {
    const replace = { op: 'replace', find: '(', repl: '$1', regex: true, flags: 'ims' }
    let history = createTextPipelineHistory([{ op: 'shuffle', seed: 77 }, replace, { op: 'affix', prefix: '<', suffix: '>' }])
    replace.find = 'mutated outside'
    assert.equal(history.present[1].find, '(')
    const before = clone(history.present)
    history = reduceTextPipelineHistory(history, { type: 'move', index: 1, direction: 'down' })
    assert.deepEqual(runPipeline('one\ntwo', history.present).errors, [null, null, 'badRegex'])
    assert.deepEqual(runPipeline('a'.repeat(REGEX_MAX + 1), history.present).errors, [null, null, 'tooLong'])
    history = reduceTextPipelineHistory(history, { type: 'undo' })
    assert.deepEqual(history.present, before)
  }],
]
let passed = 0, failed = 0
for (const [name, run] of checks) {
  if (process.argv.includes('--hash-only') && !name.startsWith('hash-only')) continue
  try { await run(); passed++; console.log('PASS', name) }
  catch (error) { failed++; console.error('FAIL', name, error) }
}
console.log(`Independent text history: ${passed} passed, ${failed} failed`)
if (failed) process.exitCode = 1
