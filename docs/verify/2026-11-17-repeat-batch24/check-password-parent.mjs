import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import * as password from '../../../src/utils/password.ts'

const load = locale => {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch24/translations-password-actions.json', 'utf8'))[locale]
  Object.assign(messages.passwordGenerator, patch.passwordGenerator)
  return messages
}
const has = (node, key) => Object.hasOwn(node.props, key)
const flush = async () => { await new Promise(resolve => setImmediate(resolve)) }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }

async function fixture(query = '') {
  const messages = load('ko'), calls = [], clipboard = [], jobs = []
  let sequence = 0, forcedValue, copyMode = 'success', legacy = false, fallbackCalls = 0, stored = 0
  class Host { constructor() { this.style = {} } focus() {} select() {} setSelectionRange() {} remove() {} }
  const h = await componentHarness('src/components/PasswordGenerator.tsx', {
    props: {}, messages, url: `https://toolhub.ai.kr/password-generator/${query ? `?${query}` : ''}#kept`,
    storagePort: { getItem() { stored++; return null }, setItem() { stored++ }, removeItem() { stored++ } },
    globals: { HTMLElement: Host },
    navigator: { clipboard: { writeText(text) {
      clipboard.push(text)
      if (copyMode === 'failure') return Promise.reject(new Error('denied'))
      if (copyMode === 'pending') { const task = deferred(); jobs.push(task); return task.promise }
      return Promise.resolve()
    } } },
    document: { activeElement: new Host(), body: { appendChild() {} }, createElement: () => new Host(), execCommand() { fallbackCalls++; return legacy } },
    modules: { '@/utils/password': { ...password,
      generatePassword(options) { calls.push({ mode: options.upper || options.lower || options.symbols ? 'random' : 'pin', options }); return forcedValue ?? String(++sequence).padStart(options.length, options.upper ? 'A' : '0') },
      generatePassphrase(options, words) { calls.push({ mode: 'passphrase', options, listLength: words.length }); return forcedValue ?? `fixture-word-${++sequence}` },
    } },
  })
  h.render()
  assert.equal(h.all().filter(node => has(node, 'data-password-row')).length, 0)
  h.tick(0)
  const rows = () => h.all().filter(node => has(node, 'data-password-row'))
  const values = () => h.all().filter(node => has(node, 'data-password-value')).map(node => node.props.children.props.value)
  const action = (key, value) => h.find(node => node.props[key] === value)
  const recovery = () => h.all().find(node => typeof node.type === 'function' && node.type.name === 'PasswordCopyRecovery')
  return { h, messages, calls, clipboard, jobs, rows, values, action, recovery, stored: () => stored, fallbackCalls: () => fallbackCalls,
    force(value) { forcedValue = value },
    copyMode(value, legacyValue = false) { copyMode = value; legacy = legacyValue },
    tab(mode) { h.find(node => node.props.id === `pg-tab-${mode}`).props.onClick(); h.render() },
    one(index) { action('data-password-regenerate', index).props.onClick(); h.render() },
    all() { h.find(node => has(node, 'data-password-regenerate-all')).props.onClick(); h.render() },
    async copy(target) { action('data-password-copy', target).props.onClick(); await flush(); h.render() },
    copied(target) { return action('data-password-copy', target).props['data-password-copied'] },
    input(id, value) { h.find(node => node.props.id === id).props.onChange({ target: { value } }); h.render() },
    async settle() { await flush(); h.render() },
    locale(locale) { messages.passwordGenerator = load(locale).passwordGenerator; h.render() },
    cleanup() { h.cleanup() },
  }
}

await check('Three modes regenerate one position once; stable row keys retain identity and duplicate values are allowed', async () => {
  for (const mode of ['random', 'pin', 'passphrase']) {
    const f = await fixture(`mode=${mode}&n=5&pin=8&w=4&sep=period`)
    const previous = f.values(), keys = f.rows().map(node => node.key), count = f.calls.length
    f.one(2)
    const next = f.values()
    assert.equal(f.calls.length, count + 1); assert.equal(next.length, previous.length)
    assert.ok(next.every((value, index) => index === 2 ? value !== previous[index] : value === previous[index]))
    assert.deepEqual(f.rows().map(node => node.key), keys)
    assert.equal(f.calls.at(-1).mode, mode)
    if (mode === 'pin') assert.equal(f.calls.at(-1).options.length, 8)
    if (mode === 'passphrase') { assert.equal(f.calls.at(-1).options.words, 4); assert.equal(f.calls.at(-1).options.separator, '.'); assert.ok(f.calls.at(-1).listLength > 100) }
    f.force(next[2]); f.one(2); assert.ok(f.values().every((value, index) => value === next[index])); assert.equal(f.calls.length, count + 2)
    f.cleanup()
  }
})

await check('Settings/full generation remain complete updates, invalid options call no generator, locale preserves results/check input', async () => {
  const f = await fixture('n=5&len=18'), first = f.values(), calls = f.calls.length
  f.locale('en'); assert.equal(f.calls.length, calls); assert.ok(f.values().every((value, index) => value === first[index]))
  f.all(); assert.equal(f.calls.length, calls + 5); assert.ok(f.values().every((value, index) => value !== first[index]))
  f.input('pg-sym', ''); const invalidCalls = f.calls.length
  assert.equal(f.rows().length, 0); assert.equal(f.h.find(node => has(node, 'data-password-regenerate-all')).props.disabled, true)
  f.h.find(node => has(node, 'data-password-regenerate-all')).props.onClick(); f.h.render(); assert.equal(f.calls.length, invalidCalls)
  f.input('pg-sym', '!@'); assert.equal(f.rows().length, 5); assert.equal(f.calls.length, invalidCalls + 5)
  f.tab('check'); f.input('pg-check', 'fake-check-input'); const before = f.calls.length
  f.locale('ko'); assert.equal(f.calls.length, before); assert.equal(f.h.find(node => node.props.id === 'pg-check').props.value, 'fake-check-input')
  f.tab('pin'); f.one(1); f.tab('check'); assert.equal(f.h.find(node => node.props.id === 'pg-check').props.value, 'fake-check-input')
  assert.equal(f.stored(), 0)
  assert.equal(f.h.window.location.search, '?mode=check'); assert.equal(f.h.window.location.hash, '#kept')
  assert.ok(!f.h.window.location.href.includes('fake-check')); assert.ok(!f.h.window.location.href.includes(first[0]))
  f.cleanup()
})

await check('Native current row/full copy matches values; denied plus legacy false gives recovery with no false check', async () => {
  const f = await fixture(), values = f.values()
  await f.copy(1); assert.equal(f.clipboard.at(-1), values[1]); assert.equal(f.copied(1), true)
  await f.copy('all'); assert.equal(f.clipboard.at(-1), values.join('\n')); assert.equal(f.copied('all'), true); assert.equal(f.copied(1), false)
  f.copyMode('failure'); await f.copy(2)
  assert.equal(f.fallbackCalls(), 1); assert.equal(f.copied(2), false)
  assert.equal(f.recovery().props.text, values[2]); assert.equal(f.recovery().props.target, 2)
  f.copyMode('success'); f.recovery().props.onRetry(); await f.settle()
  assert.equal(f.copied(2), true); assert.equal(f.recovery(), undefined)
  f.h.tick(2000); assert.equal(f.copied(2), false)
  f.cleanup()
})

await check('Row/full regeneration, settings and tab changes invalidate pending success/rejection without fallback', async () => {
  for (const change of ['one', 'all', 'settings', 'tab']) for (const rejection of [false, true]) {
    const f = await fixture(); f.copyMode('pending'); await f.copy(0)
    if (change === 'one') f.one(0)
    if (change === 'all') f.all()
    if (change === 'settings') f.input('pg-sym', '!')
    if (change === 'tab') f.tab('check')
    if (rejection) f.jobs[0].reject(new Error('late denial')); else f.jobs[0].resolve()
    await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.equal(f.recovery(), undefined)
    assert.ok(f.h.all().filter(node => has(node, 'data-password-copied')).every(node => node.props['data-password-copied'] === false))
    f.cleanup()
  }
})

await check('New copy supersedes old response; recovery changes only for current target and close cancels its retry', async () => {
  const f = await fixture(); f.copyMode('pending')
  await f.copy(0); await f.copy('all'); f.jobs[1].resolve(); await f.settle()
  assert.equal(f.copied('all'), true)
  f.jobs[0].reject(new Error('old denial')); await f.settle(); assert.equal(f.fallbackCalls(), 0); assert.equal(f.copied('all'), true)
  f.copyMode('failure'); await f.copy(0); assert.equal(f.recovery().props.target, 0)
  f.copyMode('pending'); await f.copy(1); assert.equal(f.recovery(), undefined)
  f.jobs[2].reject(new Error('current denial')); await f.settle(); assert.equal(f.recovery().props.target, 1)
  const oldRecovery = f.recovery(); oldRecovery.props.onRetry(); await f.settle()
  f.recovery().props.onClose(); f.h.render(); f.jobs[3].reject(new Error('closed retry')); await f.settle()
  assert.equal(f.recovery(), undefined); assert.equal(f.copied(1), false); assert.equal(f.fallbackCalls(), 2)
  f.cleanup()
})

await check('Locale preserves an in-flight current copy; unmount prevents late fallback and removes timers', async () => {
  const f = await fixture(); f.copyMode('pending'); const values = f.values(), calls = f.calls.length
  await f.copy(0); f.locale('en'); f.jobs[0].resolve(); await f.settle()
  assert.equal(f.copied(0), true); assert.equal(f.calls.length, calls); assert.ok(f.values().every((value, index) => value === values[index]))
  assert.ok(f.h.text().includes('Copied'))
  await f.copy(1); f.cleanup(); f.jobs[1].reject(new Error('late unmount denial')); await flush()
  assert.equal(f.fallbackCalls(), 0)
})

console.log(`Password parent: ${groups} groups passed (controlled generation/Clipboard; actual browser focus is separate; no generated values logged)`)
