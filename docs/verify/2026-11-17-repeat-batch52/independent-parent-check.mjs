import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { percentParent, find } from './independent-parent-harness.mjs'

const protectedPaths = ['src/utils/percent.ts', 'docs/verify/2026-11-17-repeat-batch52/before-fix.json', 'docs/verify/2026-11-17-repeat-batch52/probe-percent-baseline.mjs']
const hashes = () => Object.fromEntries(protectedPaths.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))
const before = hashes()
const absent = (h, key, value) => !h.all().some(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
let count = 0
async function check(name, run, options) {
  if (process.argv[2] && !name.includes(process.argv[2])) return
  const f = await percentParent(options)
  try { await run(f); count++; console.log('PASS ' + name) } finally { f.close() }
}

await check('actual hydration defaults, own URL restore and pre-restore editing retain foreign query/hash/state', async f => {
  assert.equal(f.result('of'), '7,500'); assert.equal(f.historyWrites.length, 0)
  assert.equal(find(f.p, 'data-percent-ready').props['data-percent-ready'], false)
  f.p.setHydrated(true); await f.drain()
  assert.equal(f.field('a').props.value, '120'); assert.equal(f.field('b').props.value, '25')
  assert.equal(f.result('of'), '30'); assert.equal(find(f.p, 'data-percent-decimals', 1).props['aria-pressed'], true)
  assert.equal(find(f.p, 'data-percent-korean').props['aria-pressed'], true)
  await f.edit('a', '')
  const url = new URL(f.p.window.location.href)
  assert.equal(url.searchParams.has('a'), true); assert.equal(url.searchParams.get('a'), '')
  assert.deepEqual(url.searchParams.getAll('foreign'), ['first', 'second']); assert.equal(url.hash, '#keep')
  assert.equal(f.p.window.history.state, f.historyState); assert.ok(f.historyWrites.every(entry => entry.state === f.historyState))
  const early = await percentParent({ url: 'https://toolhub.ai.kr/percent-calculator/?a=999&b=99&foreign=keep#hash', restore: false })
  try {
    await early.edit('b', '27'); await early.drain()
    assert.equal(early.field('a').props.value, '50000'); assert.equal(early.field('b').props.value, '27')
    assert.equal(early.result('of'), '13,500')
    assert.equal(new URL(early.p.window.location.href).searchParams.get('foreign'), 'keep')
    assert.equal(early.p.window.location.hash, '#hash')
  } finally { early.close() }
}, { url: 'https://toolhub.ai.kr/percent-calculator/?a=120&b=25&d=1&k=1&foreign=first&foreign=second#keep', hydrated: false, restore: false })

await check('eight actual card snapshots, six-limit/no-eviction and independent original reset versus comparison clear', async f => {
  const expected = { of: [7500, ''], ratio: [25, '%'], change: [33.3333333333, '%'], discount: [62300, ''], reverse: [89000, ''], chain: [44, '%'], pp: [2, '%p'], vat: [100000, ''] }
  const kinds = Object.keys(expected)
  await f.edit('a', ' 5만 원 '); await f.click('data-percent-decimals', 3); await f.click('data-percent-korean')
  for (const kind of kinds.slice(0, 6)) await f.click('data-percent-add', kind)
  assert.equal(f.items().length, 6)
  for (const item of f.items()) { assert.equal(item.value, expected[item.kind][0]); assert.equal(item.unit, expected[item.kind][1]); assert.equal(item.decimals, 3); assert.equal(item.korean, true) }
  assert.equal(f.items()[0].inputs[0].raw, ' 5만 원 ')
  const frozen = JSON.stringify(f.items())
  await f.click('data-percent-add', 'pp'); assert.equal(find(f.panel, 'data-percent-comparison-notice').props['data-percent-comparison-notice'], 'limit')
  assert.equal(JSON.stringify(f.items()), frozen)
  await f.click('data-percent-add', 'of'); assert.equal(find(f.panel, 'data-percent-comparison-notice').props['data-percent-comparison-notice'], 'duplicate')
  for (const kind of ['pp', 'vat']) {
    const firstId = f.items()[0].id
    await f.click('data-percent-comparison-remove', firstId, true); await f.click('data-percent-add', kind)
    assert.equal(f.items().at(-1).value, expected[kind][0]); assert.equal(f.items().at(-1).unit, expected[kind][1])
  }
  const retained = JSON.stringify(f.items())
  await f.edit('a', '840'); await f.edit('b', '25'); await f.click('data-percent-reset')
  assert.equal(f.field('a').props.value, '50000'); assert.equal(JSON.stringify(f.items()), retained)
  await f.edit('a', '840'); await f.edit('b', '25')
  const url = f.p.window.location.href
  await f.click('data-percent-comparison-clear', undefined, true)
  assert.equal(f.items().length, 0); assert.equal(f.result('of'), '210'); assert.equal(f.p.window.location.href, url)
  assert.equal(f.storageWrites.length, 0)
})

await check('finite overflow errors remove copy/add before formatting while blank and actual zero differ', async f => {
  await f.edit('a', '1e308'); await f.edit('b', '1e308')
  assert.equal(absent(f.p, 'data-percent-result', 'of'), true)
  assert.equal(absent(f.p, 'data-percent-copy', 'of'), true); assert.equal(absent(f.p, 'data-percent-add', 'of'), true)
  assert.ok(find(f.p, 'data-percent-error', 'of').props.children.includes('범위'))
  await f.edit('a', '0'); await f.edit('b', '15')
  assert.equal(f.result('of'), '0'); await f.click('data-percent-copy', 'of'); assert.equal(f.copies.at(-1).text, '0')
  await f.click('data-percent-add', 'of'); assert.equal(f.items()[0].value, 0)
  await f.edit('a', ' '); assert.ok(find(f.p, 'data-percent-error', 'of'))
  await f.edit('x', '1e-308'); await f.edit('y', '1e308')
  assert.equal(absent(f.p, 'data-percent-copy', 'pp'), true)
  await f.edit('v', '1e300'); assert.ok(find(f.p, 'data-percent-result', 'vat'))
  await f.edit('cp', 'not a price'); assert.equal(f.result('chain'), '44%')
})

await check('actual card/comparison/TXT output ownership rejects old native failures in both directions', async f => {
  await f.click('data-percent-add', 'of')
  f.clipboard('defer')
  const actions = [
    () => f.click('data-percent-copy', 'of'),
    () => f.click('data-percent-copy', 'ratio'),
    () => f.click('data-percent-comparison-copy', undefined, true),
    () => f.click('data-percent-comparison-download', undefined, true),
  ]
  for (const a of [0, 1, 2]) for (const b of [0, 1, 2, 3]) {
    await actions[a](); const old = f.copies.at(-1)
    await actions[b](); const latest = f.copies.at(-1)
    old.reject(Error('older denied'))
    if (b !== 3) latest.resolve()
    await f.sync()
    assert.equal(f.fallbacks.length, 0); assert.equal(f.recovery(), null)
    if (b === 2) assert.equal(find(f.panel, 'data-percent-comparison-status').props['data-percent-comparison-status'], 'copied')
    if (b === 3) assert.equal(find(f.panel, 'data-percent-comparison-status').props['data-percent-comparison-status'], 'downloaded')
  }
  const contexts = [
    async () => { await f.edit('a', '900'); await f.edit('a', '50000') },
    async () => { await f.locale('en'); await f.locale('ko') },
    async () => { await f.click('data-percent-decimals', 1); await f.click('data-percent-decimals', 2) },
    async () => { await f.click('data-percent-formula'); await f.click('data-percent-formula') },
    async () => { await f.click('data-percent-add', 'ratio'); await f.click('data-percent-comparison-remove', f.items().at(-1).id, true) },
  ]
  for (const change of contexts) {
    await actions[0](); const old = f.copies.at(-1)
    await change(); old.reject(Error('context changed')); await f.sync()
    assert.equal(f.recovery(), null); assert.equal(f.fallbacks.length, 0)
  }
  await f.locale('en'); await f.translationTitle('KO fallback while EN is loading')
  await actions[0](); const beforeCatalogReady = f.copies.at(-1)
  await f.translationTitle('English catalog ready')
  beforeCatalogReady.reject(Error('old fallback-language output')); await f.sync()
  assert.equal(f.recovery(), null); assert.equal(f.fallbacks.length, 0)
})

await check('actual full manual recovery, retry target change and selection/close cancel pending clipboard work', async f => {
  await f.click('data-percent-add', 'of'); await f.click('data-percent-add', 'chain')
  f.clipboard('reject'); f.legacy(false)
  await f.click('data-percent-copy', 'of')
  assert.equal(f.recovery().field.value, '7500'); assert.equal(f.fallbacks.at(-1), '7500')
  const oldKey = f.recovery().key
  await f.click('data-percent-comparison-copy', undefined, true)
  assert.notEqual(f.recovery().key, oldKey)
  const full = f.copies.at(-1).text
  assert.ok(full.includes('50,000 × 15 ÷ 100')); assert.ok(full.includes('100000'))
  assert.equal(f.recovery().field.value, full)
  f.selectionFails(true); find(f.recovery().h, 'data-percent-recovery-select').props.onClick(); await f.sync()
  assert.ok(f.recovery().h.all().some(node => node.props.role === 'alert'))
  f.selectionFails(false); find(f.recovery().h, 'data-percent-recovery-select').props.onClick(); await f.sync()
  assert.equal(f.recovery().field.selectionStart, 0); assert.equal(f.recovery().field.selectionEnd, full.length)
  f.clipboard('defer'); find(f.recovery().h, 'data-percent-recovery-retry').props.onClick(); await f.sync()
  const pending = f.copies.at(-1), fallbacks = f.fallbacks.length
  await f.edit('b', '20'); pending.reject(Error('old retry')); await f.sync()
  assert.equal(f.fallbacks.length, fallbacks); assert.equal(f.recovery(), null)
  f.clipboard('reject'); await f.click('data-percent-copy', 'of')
  find(f.recovery().h, 'data-percent-recovery-close').props.onClick(); await f.sync(); assert.equal(f.recovery(), null)
})

await check('download contains every snapshot with current locale labels and URL lifecycle survives failure', async f => {
  for (const kind of ['of', 'ratio', 'change', 'discount', 'chain', 'vat']) await f.click('data-percent-add', kind)
  const captured = JSON.stringify(f.items()), url = f.p.window.location.href
  await f.edit('a', '99'); await f.locale('en')
  await f.click('data-percent-comparison-download', undefined, true)
  const file = f.downloads.at(-1), text = await file.blob.text()
  assert.equal(file.filename, 'percent-comparison.txt'); assert.equal(file.blob.type, 'text/plain;charset=utf-8')
  assert.equal(text.split('\n').filter(line => /^\d\. /.test(line)).length, 6)
  assert.ok(text.startsWith('Compare collected results'))
  for (const item of f.items()) { assert.ok(text.includes(item.main)); assert.ok(text.includes(item.formula)); for (const input of item.inputs) assert.ok(text.includes(': ' + input.raw)) }
  assert.equal(JSON.stringify(f.items()), captured); assert.equal(f.storageWrites.length, 0)
  assert.notEqual(f.p.window.location.href, url, 'only actual input edit changes owned query')
  const afterInput = f.p.window.location.href
  await f.tick(0); assert.equal(f.revoked.filter(value => value === file.href).length, 1)
  f.clickFails(true); await f.click('data-percent-comparison-download', undefined, true)
  assert.equal(find(f.panel, 'data-percent-comparison-status').props['data-percent-comparison-status'], 'downloadFailed')
  await f.tick(0); assert.equal(f.created.size, f.revoked.length)
  assert.equal(f.p.window.location.href, afterInput)
})

await check('smart query/chain remain functional and replay/unmount make old success timers and rejections inert', async f => {
  await f.edit('q', '12만 30% 할인')
  assert.equal(f.field('dp').props.value, '120000'); assert.equal(f.field('dr').props.value, '30'); assert.equal(f.result('discount'), '84,000')
  for (let i = 0; i < 3; i++) await f.click('data-percent-chain-add')
  assert.equal(absent(f.p, 'data-percent-chain-add'), true)
  await f.edit('c4', '0'); await f.click('data-percent-add', 'chain')
  assert.equal(f.items()[0].chain.length, 5); assert.equal(f.items()[0].chain[4], '0')
  await f.click('data-percent-chain-remove', 1); assert.equal(f.items()[0].chain.length, 5)
  f.clipboard('success'); await f.click('data-percent-copy', 'of')
  const oldTimer = f.oldTimeouts.filter(timer => timer.delay === 1500).at(-1).callback
  await f.click('data-percent-copy', 'ratio'); oldTimer(); await f.sync()
  assert.equal(find(f.p, 'data-percent-copy', 'ratio').props.children.type, 'icon:Check')
  f.clipboard('defer'); await f.click('data-percent-comparison-copy', undefined, true)
  const beforeReplay = f.copies.at(-1), retained = JSON.stringify(f.items())
  f.p.replayEffects(); await f.sync(); beforeReplay.reject(Error('replayed')); await f.sync()
  assert.equal(f.fallbacks.length, 0); assert.equal(JSON.stringify(f.items()), retained)
  await f.click('data-percent-copy', 'of'); const leaving = f.copies.at(-1)
  f.close(); leaving.reject(Error('left')); await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.fallbacks.length, 0)
})

assert.deepEqual(hashes(), before)
console.log(`Independent actual percent parent: ${count} groups PASS; original formulas/baseline preserved; browser calls 0`)
