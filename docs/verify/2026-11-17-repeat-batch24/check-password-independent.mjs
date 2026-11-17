import assert from 'node:assert/strict'
import fs from 'node:fs'
import { webcrypto } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const load = locale => JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
const has = (node, key) => Object.hasOwn(node.props, key)
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(label, run) { await run(); groups++; console.log(`PASS ${label}`) }

async function fixture(query = '') {
  const messages = load('ko'), writes = [], jobs = [], legacyTexts = []
  let mode = 'success', native = true, fallback = false, storageCalls = 0, removed = 0, focused = 0
  class Host {
    constructor() { this.style = {}; this.value = ''; this.readOnly = false }
    focus() { focused++ } select() {} setSelectionRange() {} remove() { removed++ }
  }
  let appended
  const h = await componentHarness('src/components/PasswordGenerator.tsx', {
    props: {}, messages, url: `https://toolhub.ai.kr/password-generator/?${query}#section`,
    globals: { crypto: webcrypto, HTMLElement: Host, fetch() { throw new Error('Unexpected external request') } },
    storagePort: { getItem() { storageCalls++; return null }, setItem() { storageCalls++ }, removeItem() { storageCalls++ } },
    navigator: { get clipboard() { return native ? { writeText(text) {
      writes.push(text)
      if (mode === 'failure') return Promise.reject(new Error('denied'))
      if (mode === 'pending') { const job = deferred(); jobs.push(job); return job.promise }
      return Promise.resolve()
    } } : undefined } },
    document: { activeElement: new Host(), body: { appendChild(field) { appended = field } }, createElement: () => new Host(),
      execCommand(command) { assert.equal(command, 'copy'); legacyTexts.push(appended.value); return fallback } },
  })
  h.render()
  const node = (key, value) => h.find(n => n.props[key] === value)
  const values = () => h.all().filter(n => has(n, 'data-password-value')).map(n => n.props.children.props.value)
  assert.equal(values().length, 0, 'SSR/first client tree has no generated text')
  h.tick(0)
  const recovery = () => h.all().find(n => typeof n.type === 'function' && n.type.name === 'PasswordCopyRecovery')
  return { h, messages, writes, jobs, legacyTexts, node, values, recovery,
    ports(next, legacy = false, hasNative = true) { mode = next; fallback = legacy; native = hasNative },
    one(index) { node('data-password-regenerate', index).props.onClick(); h.render() },
    all() { h.find(n => has(n, 'data-password-regenerate-all')).props.onClick(); h.render() },
    tab(mode) { node('id', `pg-tab-${mode}`).props.onClick(); h.render() },
    input(id, value) { node('id', id).props.onChange({ target: { value } }); h.render() },
    async copy(target) { node('data-password-copy', target).props.onClick(); await flush(); h.render() },
    async settle() { await flush(); h.render() },
    locale(locale) { messages.passwordGenerator = load(locale).passwordGenerator; h.render() },
    copied(target) { return node('data-password-copy', target).props['data-password-copied'] },
    untouched: () => storageCalls === 0, removed: () => removed, focused: () => focused,
  }
}

await check('real cryptographic generators keep other positions and current options in all three modes', async () => {
  const cases = [
    { query: 'n=5&len=24&sym=!%40&nr=1&amb=1', validate: v => v.length === 24 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[2-9]/.test(v) && /[!@]/.test(v) && !/[0O1lI|]/.test(v) && !/(.)\1/.test(v) },
    { query: 'mode=pin&n=5&pin=12&nr=1', validate: v => /^\d{12}$/.test(v) && !/(.)\1/.test(v) },
    { query: 'mode=passphrase&n=5&w=4&sep=period&cap=1&num=1', validate: v => v.split('.').length === 4 && v.split('.').every(w => /^[A-Z][a-z]+\d?$/.test(w)) && /\d/.test(v) },
  ]
  for (const item of cases) {
    const f = await fixture(item.query)
    assert.ok(f.values().every(item.validate)); assert.equal(f.values().length, 5)
    for (const index of [0, 2, 4]) {
      const before = f.values(); const keys = f.h.all().filter(n => has(n, 'data-password-row')).map(n => n.key)
      f.one(index); const after = f.values()
      assert.equal(after.length, before.length); assert.ok(after.every(item.validate))
      assert.ok(after.every((v, i) => i === index || v === before[i]))
      assert.deepEqual(f.h.all().filter(n => has(n, 'data-password-row')).map(n => n.key), keys)
      assert.ok(f.node('data-password-regenerate', index).props.className.includes('min-h-11'))
    }
    assert.equal(f.untouched(), true); assert.equal(f.h.window.location.hash, '#section'); f.h.cleanup()
  }
})

await check('locale retains generated results and strength input, settings URL never receives secrets', async () => {
  const f = await fixture('mode=pin&pin=8&n=10'); const original = f.values(); const address = f.h.window.location.href
  f.locale('en'); assert.deepEqual(f.values(), original); assert.equal(f.h.window.location.href, address)
  f.tab('check'); f.input('pg-check', 'local-only-review-input')
  f.h.find(n => n.type === 'button' && n.props['aria-label'] === f.messages.passwordGenerator.check.showLabel).props.onClick(); f.h.render()
  f.locale('ko'); assert.equal(f.node('id', 'pg-check').props.value, 'local-only-review-input'); assert.equal(f.node('id', 'pg-check').props.type, 'text')
  f.tab('random'); f.one(0); f.tab('check')
  assert.equal(f.node('id', 'pg-check').props.value, 'local-only-review-input')
  assert.equal(f.h.window.location.search, '?mode=check'); assert.equal(f.untouched(), true)
  assert.ok(!f.h.window.location.href.includes('local-only-review-input')); assert.ok(original.every(v => !f.h.window.location.href.includes(v)))
  f.h.cleanup()
})

await check('native denial plus legacy false gives exact readonly recovery; legacy true is real success', async () => {
  const f = await fixture('n=5'); f.ports('failure', false)
  await f.copy('all'); const text = f.values().join('\n')
  assert.equal(f.writes.at(-1), text); assert.equal(f.legacyTexts.at(-1), text); assert.equal(f.copied('all'), false)
  assert.equal(f.recovery().props.text, text); assert.ok(f.removed() > 0); assert.ok(f.focused() > 0)
  let selected = ''
  const child = await componentHarness('src/components/PasswordCopyRecovery.tsx', { props: f.recovery().props, messages: f.messages,
    beforeEffects(tree) {
      const walk = n => {
        if (!n || typeof n !== 'object') return
        if (Array.isArray(n)) return n.forEach(walk)
        if (n.type === 'textarea') n.props.ref.current = { focus() {}, select() { selected = n.props.value }, setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, text.length) } }
        walk(n.props?.children)
      }; walk(tree)
    },
  })
  child.render(); assert.equal(child.find(n => n.type === 'textarea').props.readOnly, true)
  child.button(f.messages.passwordGenerator.copyRecovery.selectText).props.onClick(); assert.equal(selected, text)
  f.ports('success', true, false); child.button(f.messages.passwordGenerator.copyRecovery.retry).props.onClick(); await f.settle()
  assert.equal(f.copied('all'), true); assert.equal(f.recovery(), undefined); assert.equal(f.legacyTexts.at(-1), text)
  child.cleanup(); f.h.cleanup()
})

await check('result revision and latest request suppress old native completion and legacy fallback', async () => {
  for (const mutation of ['one', 'all', 'settings', 'tab']) {
    const f = await fixture(); f.ports('pending'); await f.copy(0)
    if (mutation === 'one') f.one(2)
    if (mutation === 'all') f.all()
    if (mutation === 'settings') f.input('pg-sym', '!')
    if (mutation === 'tab') f.tab('check')
    f.jobs[0].reject(new Error('late')); await f.settle()
    assert.equal(f.legacyTexts.length, 0); assert.equal(f.recovery(), undefined)
    assert.ok(f.h.all().filter(n => has(n, 'data-password-copied')).every(n => !n.props['data-password-copied']))
    f.h.cleanup()
  }
  const f = await fixture(); f.ports('pending'); await f.copy(0); await f.copy('all')
  f.jobs[1].resolve(); await f.settle(); assert.equal(f.copied('all'), true)
  f.jobs[0].resolve(); await f.settle(); assert.equal(f.copied('all'), true); assert.equal(f.copied(0), false)
  assert.equal(f.legacyTexts.length, 0); f.h.cleanup()
})

await check('invalid options remove generated rows and pending recovery; restoring options remains usable', async () => {
  const f = await fixture('n=5'); f.ports('pending'); await f.copy(0)
  f.input('pg-sym', ''); assert.equal(f.values().length, 0)
  assert.equal(f.h.find(n => has(n, 'data-password-regenerate-all')).props.disabled, true)
  f.jobs[0].resolve(); await f.settle(); assert.equal(f.recovery(), undefined)
  f.input('pg-sym', '!@'); assert.equal(f.values().length, 5); assert.ok(f.values().every(v => /[!@]/.test(v)))
  f.ports('failure', false); await f.copy(1); assert.ok(f.recovery())
  f.one(4); assert.equal(f.recovery(), undefined); assert.equal(f.copied(1), false)
  f.h.cleanup()
})

await check('closing retry and unmount cancel pending fallback; locale preserves current request', async () => {
  const f = await fixture(); f.ports('failure'); await f.copy(1)
  f.ports('pending'); f.recovery().props.onRetry(); await f.settle()
  f.recovery().props.onClose(); f.h.render(); const fallbackCalls = f.legacyTexts.length
  f.jobs[0].reject(new Error('closed')); await f.settle(); assert.equal(f.legacyTexts.length, fallbackCalls); assert.equal(f.recovery(), undefined)
  await f.copy(0); f.locale('en'); f.jobs[1].resolve(); await f.settle(); assert.equal(f.copied(0), true)
  await f.copy(2); f.h.cleanup(); f.jobs[2].reject(new Error('unmounted')); await flush()
  assert.equal(f.legacyTexts.length, fallbackCalls)
})

console.log(`Independent password actions: ${groups} groups passed; actual generators and component code, controlled browser ports; no secret values logged`)
