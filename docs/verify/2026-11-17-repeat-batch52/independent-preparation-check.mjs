import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { evaluatePercentCard, createPercentSnapshot, addPercentSnapshot, removePercentSnapshot, percentComparisonText, percentStateUrl } from '../../../src/utils/percentComparison.ts'
import { createPercentOutputOwner, copyPercentText, downloadPercentText } from '../../../src/utils/percentComparisonActions.ts'

const parentPath = 'src/components/PercentCalculator.tsx'
const protectedFiles = [parentPath, 'src/utils/percent.ts', 'docs/verify/2026-11-17-repeat-batch52/before-fix.json', 'docs/verify/2026-11-17-repeat-batch52/probe-percent-baseline.mjs']
const hashes = () => Object.fromEntries(protectedFiles.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const before = hashes()
assert.equal(before[parentPath], JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/before-fix.json', 'utf8')).sourceSha256)
assert.equal(before['src/utils/percent.ts'], '82e13ab72236be7058b1a9b183007c6b740ac7536c6a7abfe9df89db2a6d370b')
assert.equal(/percentComparison|PercentComparison/.test(fs.readFileSync(parentPath, 'utf8')), false)

const source = { a: ' 12,345.6 원 ', b: '17.5%', p: '7', w: '16', f: '-80', t: '20', dp: '72,000', dr: '12.5', rs: '63,000', rr: '12.5', cp: '88,000', x: '-1.25', y: '2.5', v: '1,210' }
const rates = ['10', '25', '20']
const kinds = ['of', 'ratio', 'change', 'discount', 'reverse', 'chain', 'pp', 'vat']
const expectedFields = { of: ['a', 'b'], ratio: ['p', 'w'], change: ['f', 't'], discount: ['dp', 'dr'], reverse: ['rs', 'rr'], chain: ['cp'], pp: ['x', 'y'], vat: ['v'] }
const anchors = { of: [2160.48, ''], ratio: [43.75, '%'], change: [125, '%'], discount: [63000, ''], reverse: [72000, ''], chain: [46, '%'], pp: [3.75, '%p'], vat: [1100, ''] }
const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/translations-percent.json', 'utf8'))
function merge(base, next) {
  for (const [key, value] of Object.entries(next)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) base[key] = merge(base[key] ?? {}, value)
    else base[key] = value
  }
  return base
}
const catalogs = Object.fromEntries(['ko', 'en'].map(locale => [locale, merge(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), patch[locale])]))
const translate = (locale, namespace = 'percentCalculator') => {
  const raw = key => key.split('.').reduce((value, part) => value?.[part], catalogs[locale][namespace])
  const t = (key, vars = {}) => {
    const value = raw(key)
    assert.equal(typeof value, 'string', `translation ${locale}:${namespace}.${key}`)
    return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`))
  }
  t.raw = raw; return t
}
function snapshot(kind, id, overrides = {}) {
  const result = createPercentSnapshot({ kind, values: { ...source }, chain: [...rates], decimals: 3, korean: false,
    main: `${anchors[kind][0]}${anchors[kind][1]} · at capture`, formula: `formula ${kind} : 원문\t"甲"`, ...overrides }, id)
  assert.equal(result.ok, true)
  return result.snapshot
}
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const node = (h, key, value) => h.find(item => value === undefined ? Object.hasOwn(item.props, key) : item.props[key] === value)
const flush = () => new Promise(resolve => setImmediate(resolve))
let count = 0
async function check(name, run) { await run(); count++; console.log(`PASS ${name}`) }

await check('independent eight-card anchors and exact integer/rational ledger', () => {
  for (const kind of kinds) {
    const [value, unit] = anchors[kind]
    assert.deepEqual(evaluatePercentCard(kind, source, rates), { ok: true, value, unit })
  }
  // All values below have exact integer expected results; no product formula is called to create the oracle.
  for (let n = 1; n <= 31; n++) {
    const square = BigInt(n) ** 2n
    const input = { ...source, a: String(n * 100), b: String(n), p: String(n), w: '100', dp: String(n * 100), dr: '25', rs: String(n * 75), rr: '25', v: String(n * 110), x: String(-n), y: String(n) }
    for (const [kind, expected] of [['of', Number(square)], ['ratio', n], ['discount', n * 75], ['reverse', n * 100], ['vat', n * 100], ['pp', n * 2]]) {
      const output = evaluatePercentCard(kind, input, rates)
      assert.equal(output.ok, true); assert.equal(output.value, expected, `${kind} n=${n}`)
    }
  }
})

await check('typed raw strings, all displayed finite outputs, optional chain price and strict settings', () => {
  for (const raw of ['', '\t\n ', 'NaN', 'Infinity', '1e999', '1x', '10px', '--1', '0x10', '12.3.4']) {
    for (const kind of kinds.filter(value => value !== 'chain')) {
      const input = { ...source, [expectedFields[kind][0]]: raw }
      assert.equal(evaluatePercentCard(kind, input, rates).ok, false, `${kind}:${raw}`)
    }
  }
  for (const [kind, input] of [
    ['of', { a: '8e307', b: '800' }], ['ratio', { p: '8e307', w: '.0001' }],
    ['change', { f: '-9e307', t: '9e307' }], ['discount', { dp: '8e307', dr: '80' }],
    ['reverse', { rs: '8e307', rr: '99.9' }],
    // Main %p is finite, but its displayed relative rate is not; reject the complete card.
    ['pp', { x: '1e-308', y: '8e307' }],
  ]) {
    assert.deepEqual(evaluatePercentCard(kind, { ...source, ...input }, rates), { ok: false, error: 'overflow' })
    assert.equal(createPercentSnapshot({ kind, values: { ...source, ...input }, chain: rates, decimals: 2, korean: false, main: '0', formula: '=0' }, 'overflow').ok, false)
  }
  assert.equal(evaluatePercentCard('vat', { ...source, v: '8e300' }, rates).ok, true)
  assert.equal(evaluatePercentCard('pp', { ...source, x: '0' }, rates).ok, true)
  for (const cp of ['', 'not a price', '-5']) assert.deepEqual(evaluatePercentCard('chain', { ...source, cp }, rates), { ok: true, value: 46, unit: '%' })
  for (const chain of [[], [' '], ['NaN'], ['1e999'], ['-1'], ['100.01'], ['1', '2', '3', '4', '5', '6']]) assert.equal(evaluatePercentCard('chain', source, chain).ok, false)
  const draft = { kind: 'of', values: source, chain: rates, decimals: 2, korean: false, main: 'literal', formula: 'formula' }
  for (const decimals of [-1, 1.1, 5, NaN, Infinity]) assert.equal(createPercentSnapshot({ ...draft, decimals }, 'invalid').ok, false)
  assert.equal(createPercentSnapshot({ ...draft, main: '' }, 'invalid').ok, false)
  assert.equal(createPercentSnapshot({ ...draft, formula: '' }, 'invalid').ok, false)
})

await check('snapshots project relevant raw/settings and detach every mutable array while preserving capture strings', () => {
  for (const kind of kinds) {
    const values = { ...source }, chain = [...rates]
    const item = snapshot(kind, kind, { values, chain, korean: true, decimals: 4 })
    assert.deepEqual(item.inputs.map(input => input.key), expectedFields[kind])
    for (const input of item.inputs) assert.equal(input.raw, source[input.key])
    assert.equal(item.value, anchors[kind][0]); assert.equal(item.unit, anchors[kind][1])
    values[expectedFields[kind][0]] = 'latest edited'; chain.splice(0, 3, '99')
    assert.equal(item.inputs[0].raw, source[expectedFields[kind][0]])
    assert.deepEqual(item.chain, kind === 'chain' ? rates : [])
    assert.equal(item.korean, true); assert.equal(item.decimals, 4)
    assert.ok(Object.isFrozen(item) && Object.isFrozen(item.inputs) && Object.isFrozen(item.chain))
    assert.throws(() => { item.inputs[0].raw = 'mutated' }, TypeError)
    assert.throws(() => { item.chain.push('0') }, TypeError)
  }
})

await check('six-slot reference sequence preserves order, rejects duplicates/overflow without eviction and removes explicitly', () => {
  let items = [], model = []
  for (let n = 0; n < 6; n++) {
    const item = snapshot(kinds[n], `r${n}`), result = addPercentSnapshot(items, item)
    assert.equal(result.ok, true); items = result.items; model.push(item.id)
    assert.deepEqual(items.map(item => item.id), model)
  }
  const full = items, fullBytes = JSON.stringify(items)
  assert.deepEqual(addPercentSnapshot(items, snapshot('vat', 'seventh')), { ok: false, error: 'limit' })
  assert.deepEqual(addPercentSnapshot(items, snapshot('of', 'new-id')), { ok: false, error: 'duplicate' })
  assert.deepEqual(addPercentSnapshot(items, snapshot('vat', 'r4')), { ok: false, error: 'duplicate' })
  assert.equal(JSON.stringify(full), fullBytes)
  for (const id of ['r2', 'unknown', 'r0', 'r5']) {
    items = removePercentSnapshot(items, id); model = model.filter(value => value !== id)
    assert.deepEqual(items.map(item => item.id), model)
  }
  const previous = items
  const added = addPercentSnapshot(items, snapshot('vat', 'replacement'))
  assert.equal(added.ok, true); items = added.items
  assert.deepEqual(items.map(item => item.id), [...model, 'replacement'])
  assert.equal(previous.length, 3); assert.equal(full.length, 6)
  const sameNumberDifferentRaw = snapshot('vat', 'different-raw', { values: { ...source, v: '1210' } })
  assert.equal(addPercentSnapshot(items, sameNumberDifferentRaw).ok, true)
})

await check('owned URL mutation preserves foreign repeated query/hash and empty raw without comparison serialization', () => {
  const base = 'https://toolhub.ai.kr/percent-calculator/?ref=alpha&ref=beta&a=old&c=9&d=4&k=1#result'
  const values = { ...source, a: '', b: ' 9만 원 % ', y: '-0.1' }
  const url = new URL(percentStateUrl(base, values, source, ['0', '25'], rates, 0, 3, false))
  assert.deepEqual(url.searchParams.getAll('ref'), ['alpha', 'beta']); assert.equal(url.hash, '#result')
  assert.equal(url.searchParams.get('a'), ''); assert.equal(url.searchParams.get('b'), values.b)
  assert.equal(url.searchParams.get('y'), '-0.1'); assert.equal(url.searchParams.get('c'), '0,25')
  assert.equal(url.searchParams.get('d'), '0'); assert.equal(url.searchParams.has('k'), false)
  const reset = new URL(percentStateUrl(url.href, source, source, rates, rates, 3, 3, false))
  assert.equal(reset.searchParams.size, 2); assert.equal(reset.hash, '#result')
})

await check('all output targets share latest ownership; false/throw fallback and canceled lifecycle never claim success', async () => {
  const targets = ['comparison', 'download', ...kinds], owner = createPercentOutputOwner()
  for (let a = 0; a < targets.length; a++) {
    for (let b = 0; b < targets.length; b++) {
      const pending = deferred(), first = owner.begin(targets[a]); let fallback = 0
      const copying = copyPercentText(`OLD ${targets[a]}`, () => owner.current(first), { writeText: () => pending.promise, fallback: () => { fallback++; return true } })
      const next = owner.begin(targets[b]); assert.equal(owner.current(next), true)
      pending.reject(Error('native denied late'))
      assert.equal(await copying, 'stale'); assert.equal(fallback, 0)
    }
  }
  for (const fallback of [() => false, () => { throw Error('blocked') }]) {
    const token = owner.begin('comparison')
    assert.equal(await copyPercentText('FULL', () => owner.current(token), { writeText: async () => { throw Error('deny') }, fallback }), 'failed')
  }
  let writes = 0
  const canceled = owner.begin('of'); owner.invalidate()
  assert.equal(await copyPercentText('canceled', () => owner.current(canceled), { writeText: async () => { writes++ }, fallback: () => { writes++; return true } }), 'stale')
  const pending = deferred(), token = owner.begin('comparison')
  const action = copyPercentText('LEAVING', () => owner.current(token), { writeText: () => pending.promise, fallback: () => { writes++; return true } })
  owner.dispose(); owner.mount(); pending.reject(Error('late'))
  assert.equal(await action, 'stale'); assert.equal(writes, 0)
  const latest = owner.begin('download'), downloads = []
  assert.equal(downloadPercentText('', () => owner.current(latest), { save: text => downloads.push(text) }), 'failed')
  assert.equal(downloads.length, 0)
  assert.equal(downloadPercentText('FULL\n끝', () => owner.current(latest), { save: text => downloads.push(text) }), 'success')
  assert.deepEqual(downloads, ['FULL\n끝'])
})

await check('actual panel renders six immutable snapshots in both locales and emits complete text/removal/clear intent', async () => {
  const items = kinds.slice(0, 6).map((kind, index) => snapshot(kind, `panel-${index}`))
  let locale = 'ko'; const copies = [], downloads = [], removed = []; let cleared = 0
  const props = { items, onCopy: text => copies.push(text), onDownload: text => downloads.push(text), onRemove: id => removed.push(id), onClear: () => cleared++ }
  const h = await componentHarness('src/components/PercentComparisonPanel.tsx', { props, modules: { '@/lib/i18n': { useTranslations: namespace => translate(locale, namespace) } } })
  try {
    for (const language of ['ko', 'en']) {
      locale = language; h.render()
      assert.equal(h.all().filter(item => Object.hasOwn(item.props, 'data-percent-comparison-item')).length, 6)
      node(h, 'data-percent-comparison-copy').props.onClick(); node(h, 'data-percent-comparison-download').props.onClick()
      const text = copies.at(-1)
      assert.equal(downloads.at(-1), text)
      assert.equal(text.split('\n').filter(line => /^\d\. /.test(line)).length, 6)
      for (const item of items) {
        assert.ok(text.includes(item.main) && text.includes(item.formula))
        for (const input of item.inputs) assert.ok(text.includes(': ' + input.raw))
        assert.ok(h.text().includes(item.main))
      }
      assert.ok(text.startsWith(translate(language)('comparison.title')))
      assert.ok(text.includes(translate(language)('settings.decimals') + ': 3'))
    }
    assert.notEqual(copies[0], copies[1], 'current locale labels change, captured result/formula remain')
    node(h, 'data-percent-comparison-remove', 'panel-3').props.onClick(); assert.deepEqual(removed, ['panel-3'])
    node(h, 'data-percent-comparison-clear').props.onClick(); assert.equal(cleared, 1); assert.equal(items.length, 6)
    h.setProps({ ...props, items: [] })
    for (const key of ['data-percent-comparison-copy', 'data-percent-comparison-download', 'data-percent-comparison-clear']) assert.equal(node(h, key).props.disabled, true)
    assert.equal(percentComparisonText([], translate('en')), '')
    assert.ok(h.text().includes(translate('en')('comparison.empty')))
    h.setProps({ ...props, status: 'copying' }); assert.equal(node(h, 'data-percent-comparison-copy').props.disabled, true)
  } finally { h.cleanup() }
})

await check('actual manual recovery holds complete Unicode text and selection/cancel invalidates pending fallback', async () => {
  const items = kinds.slice(0, 6).map((kind, index) => snapshot(kind, `manual-${index}`, { formula: `${kind}\n${'全🙂\t'.repeat(90)}END-${index}` }))
  const text = percentComparisonText(items, translate('ko')), owner = createPercentOutputOwner(), effects = [], jobs = []
  let selectionFails = true, retries = 0, closes = 0, selectedText = ''
  const field = { selectionStart: 0, selectionEnd: 0, focus() {}, select() {}, setSelectionRange(start, end) { if (selectionFails) throw Error('selection blocked'); this.selectionStart = start; this.selectionEnd = end; selectedText = text.slice(start, end) } }
  const props = { text,
    onSelectIntent() { effects.push('intent'); owner.invalidate() },
    onRetry() { retries++; const token = owner.begin('comparison'); const wait = deferred(); jobs.push({ wait, action: copyPercentText(text, () => owner.current(token), { writeText: () => wait.promise, fallback: () => { effects.push('fallback'); return false } }) }) },
    onClose() { closes++; owner.invalidate() },
  }
  const h = await componentHarness('src/components/PercentCopyRecovery.tsx', { props, messages: catalogs.ko,
    beforeEffects(tree) { const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node?.props) return; if (Object.hasOwn(node.props, 'data-percent-recovery-text')) node.props.ref.current = field; walk(node.props.children) }; walk(tree) },
  })
  try {
    h.render(); assert.equal(node(h, 'data-percent-recovery-text').props.value, text)
    assert.equal(node(h, 'data-percent-recovery-text').props.readOnly, true)
    node(h, 'data-percent-recovery-select').props.onClick(); h.render()
    assert.ok(h.all().some(node => node.props?.role === 'alert'))
    selectionFails = false
    node(h, 'data-percent-recovery-retry').props.onClick()
    node(h, 'data-percent-recovery-select').props.onClick(); h.render()
    assert.equal(selectedText, text); assert.equal(field.selectionEnd, text.length)
    jobs[0].wait.reject(Error('late after select')); assert.equal(await jobs[0].action, 'stale')
    node(h, 'data-percent-recovery-retry').props.onClick()
    node(h, 'data-percent-recovery-close').props.onClick()
    jobs[1].wait.reject(Error('late after close')); assert.equal(await jobs[1].action, 'stale')
    assert.equal(retries, 2); assert.equal(closes, 1); assert.equal(effects.includes('fallback'), false)
    assert.equal(h.all().some(node => node.props?.role === 'alert'), false)
    await flush()
  } finally { h.cleanup(); owner.dispose() }
})

assert.deepEqual(hashes(), before, 'parent/formulas/original baseline stay unchanged during this preconnection review')
console.log(`Independent percent preparation: ${count} groups PASS; parent unconnected; no product changes or native browser work`)
