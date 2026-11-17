import assert from 'node:assert/strict'
import fs from 'node:fs'
import { percentFixture, text, all } from './percent-parent-harness.mjs'

const before = fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/before-fix.json'), tests = []
const check = (name, run) => tests.push({ name, run })
check('all eight default results and card numeric copy remain identical; zero/blank/domain errors distinguish', async () => {
  const f = await percentFixture()
  try {
    const expected = { of: '7500', ratio: '25', change: '33.33', discount: '62300', reverse: '89000', chain: '44', pp: '2', vat: '100000' }
    for (const [id, value] of Object.entries(expected)) { await f.click('copy', id); assert.equal(f.copies.at(-1).value, value); await f.click('add', id); if (f.items.length === 6) await f.panel('clear') }
    assert.equal(f.stored.length, 0)
    await f.field('a', '0'); await f.click('copy', 'of'); assert.equal(f.copies.at(-1).value, '0')
    await f.field('a', ''); assert.ok(f.attr('error', 'of')); assert.ok(!f.h.all().some(n => n.props['data-percent-copy'] === 'of'))
    await f.field('w', '0'); assert.ok(text(f.attr('error', 'ratio')).includes(f.messages.percentCalculator.errors.zeroBase))
  } finally { f.cleanup() }
})
check('shared URL restores all owned fields before sync and preserves repeated foreign query/hash/history; early input wins', async () => {
  const params = new URLSearchParams({ a: '120', b: '25', p: '4', w: '5', f: '10', t: '20', dp: '80', dr: '20', rs: '64', rr: '20', cp: '400', x: '1', y: '2', v: '220', c: '10,20,30,40,50', d: '3', k: '1' }); params.append('keep', 'x'); params.append('keep', 'y')
  const f = await percentFixture({ url: 'https://toolhub.ai.kr/percent-calculator/?' + params + '#retain' })
  try {
    for (const [key, value] of params) if (!['c', 'd', 'k', 'keep'].includes(key)) assert.equal(f.node(key).props.value, value)
    for (let n = 0; n < 5; n++) assert.equal(f.node('c' + n).props.value, String((n + 1) * 10))
    assert.equal(f.attr('decimals', 3).props['aria-pressed'], true); assert.equal(f.attr('korean').props['aria-pressed'], true)
    assert.deepEqual(f.history, []); f.h.replayEffects(); await f.settle(); assert.deepEqual(f.history, [])
    await f.field('a', '121')
    const url = new URL(f.h.window.location.href); assert.deepEqual(url.searchParams.getAll('keep'), ['x', 'y']); assert.equal(url.hash, '#retain'); assert.equal(f.h.window.history.state.custom, 'retain'); assert.equal(f.history.length, 1)
  } finally { f.cleanup() }
  const g = await percentFixture({ url: 'https://toolhub.ai.kr/percent-calculator/?a=999&keep=stay#hash', hydrated: false })
  try { assert.equal(g.attr('ready', false).props['data-percent-ready'], false); await g.field('a', '17'); await g.mountHydrated(); assert.equal(g.node('a').props.value, '17'); assert.equal(g.node('b').props.value, '15'); assert.equal(new URL(g.h.window.location.href).searchParams.get('keep'), 'stay'); assert.equal(g.h.window.location.hash, '#hash') } finally { g.cleanup() }
})
check('overflow finite operands show an error before format/copy and cannot enter comparison', async () => {
  const f = await percentFixture()
  try {
    for (const [id, inputs] of [['of', { a: '1e308', b: '1e308' }], ['ratio', { p: '1e308', w: '.1' }], ['change', { f: '-1e308', t: '1e308' }], ['discount', { dp: '1e308', dr: '99' }], ['reverse', { rs: '1e308', rr: '99' }], ['pp', { x: '-1e308', y: '1e308' }]]) {
      for (const [key, raw] of Object.entries(inputs)) await f.field(key, raw)
      assert.equal(text(f.attr('error', id)), f.messages.percentCalculator.errors.overflow)
      for (const action of ['copy', 'add', 'result']) assert.equal(f.h.all().some(n => n.props['data-percent-' + action] === id), false)
    }
    assert.equal(f.items.length, 0); assert.equal(f.copies.length, 0)
    await f.field('v', '1e300'); await f.click('copy', 'vat'); assert.notEqual(f.copies.at(-1).value, '0')
  } finally { f.cleanup() }
})
check('six snapshots preserve raw/settings/units across edits and reset; duplicate/limit/delete/clear never evict or mutate inputs', async () => {
  const f = await percentFixture()
  try {
    await f.field('a', ' 5만원 '); await f.click('decimals', 4); await f.click('korean'); await f.click('add', 'of')
    const first = f.items[0]; assert.equal(first.inputs[0].raw, ' 5만원 '); assert.equal(first.decimals, 4); assert.equal(first.korean, true)
    await f.click('add', 'of'); assert.equal(f.items.length, 1); assert.ok(f.panelAttr('notice', 'duplicate'))
    for (const id of ['ratio', 'change', 'discount', 'chain', 'pp']) await f.click('add', id)
    assert.deepEqual(Array.from(f.items, x => x.unit), ['', '%', '%', '', '%', '%p'])
    await f.click('add', 'vat'); assert.ok(f.panelAttr('notice', 'limit')); assert.equal(f.items.length, 6); assert.equal(f.items[0], first)
    await f.field('a', '99'); await f.click('decimals', 0); await f.click('reset'); assert.equal(f.items[0], first); assert.equal(f.node('a').props.value, '50000'); assert.equal(f.attr('decimals', 0).props['aria-pressed'], true)
    await f.panel('remove', f.items[2].id); assert.equal(f.items.length, 5); await f.click('add', 'vat'); assert.equal(f.items.length, 6)
    await f.panel('clear'); assert.equal(f.items.length, 0); assert.equal(f.node('a').props.value, '50000'); assert.equal(f.attr('korean').props['aria-pressed'], true)
  } finally { f.cleanup() }
})
check('smart query, formula toggle, five-step chain and optional price still work without modifying captured items', async () => {
  const f = await percentFixture()
  try {
    await f.field('q', '5만원의 15%'); assert.equal(f.node('a').props.value, '50000'); await f.click('add', 'of')
    await f.field('q', '300/1200'); assert.equal(f.node('p').props.value, '300'); assert.equal(f.node('w').props.value, '1200')
    await f.click('formula'); assert.equal(f.attr('formula').props['aria-pressed'], false); assert.equal(f.items[0].formula.includes('7,500'), true)
    await f.click('chain-add'); await f.click('chain-add'); await f.click('chain-add'); assert.equal(f.h.all().some(n => n.props['data-percent-chain-add'] === ''), false)
    await f.field('c2', '50'); await f.field('cp', 'not an amount'); await f.click('add', 'chain'); assert.deepEqual(Array.from(f.items.at(-1).chain), ['30', '20', '50', '10', '10']); assert.equal(f.items.at(-1).inputs[0].raw, 'not an amount')
    await f.click('chain-remove', 2); assert.equal(f.items.at(-1).chain.length, 5)
  } finally { f.cleanup() }
})
check('copy failures show full manual target and explicit retry; true legacy alone succeeds; TXT exports same full snapshot', async () => {
  const f = await percentFixture()
  try {
    for (const mode of ['reject', 'throw', 'missing']) {
      f.io.mode = mode; const native = f.navigator.clipboard.writeText; if (mode === 'missing') delete f.navigator.clipboard.writeText
      f.io.legacy = false; await f.click('copy', 'of'); assert.equal(f.recovery.find(n => n.props['data-percent-recovery-text'] === '').props.value, '7500'); assert.equal(f.recovery.find(n => n.props['data-percent-recovery-text'] === '').props.readOnly, true)
      f.navigator.clipboard.writeText = native
    }
    f.io.mode = 'reject'; f.io.legacy = true; f.recovery.find(n => n.props['data-percent-recovery-retry'] === '').props.onClick(); await f.settle(); assert.equal(f.recovery, null)
    f.io.mode = 'success'; await f.click('add', 'of'); await f.click('add', 'ratio'); await f.panel('copy'); const complete = f.copies.at(-1).value
    assert.ok(complete.includes('7,500') && complete.includes('25%')); await f.panel('download'); assert.equal(await f.downloads[0].blob.text(), complete); assert.equal(f.downloads[0].filename, 'percent-comparison.txt'); f.h.tick(0); assert.deepEqual(f.revoked, [f.downloads[0].url])
    f.io.downloadThrow = true; await f.panel('download'); assert.ok(f.panelAttr('status', 'downloadFailed'))
  } finally { f.cleanup() }
})
check('shared copy ownership prevents old fallback across card/list/download and invalidates input/list/locale ABA/unmount', async () => {
  for (const direction of ['card-list', 'list-card', 'list-download']) {
    const f = await percentFixture()
    try {
      await f.click('add', 'of'); f.io.mode = 'pending'
      if (direction === 'card-list') await f.click('copy', 'of'); else await f.panel('copy')
      const old = f.copies.at(-1); f.io.mode = 'success'
      if (direction === 'card-list') await f.panel('copy'); else if (direction === 'list-card') await f.click('copy', 'ratio'); else await f.panel('download')
      old.reject(Error('late')); await f.settle(); assert.deepEqual(f.fallback, [])
    } finally { f.cleanup() }
  }
  for (const action of ['inputABA', 'localeABA', 'list', 'unmount']) {
    const f = await percentFixture(); await f.click('add', 'of'); f.io.mode = 'pending'; await f.click('copy', 'of'); const old = f.copies.at(-1)
    if (action === 'inputABA') { await f.field('a', '1'); await f.field('a', '50000') }
    if (action === 'localeABA') { await f.locale('en'); await f.locale('ko') }
    if (action === 'list') await f.panel('clear')
    if (action === 'unmount') f.cleanup()
    old.reject(Error('late')); if (action !== 'unmount') await f.settle(); else { await Promise.resolve(); await Promise.resolve() }
    assert.deepEqual(f.fallback, []); if (action !== 'unmount') { assert.equal(f.recovery, null); f.cleanup() }
  }
})
check('old success timers and StrictMode cleanup cannot clear newer feedback; late API success cannot reappear after locale change', async () => {
  const f = await percentFixture()
  try {
    f.h.replayEffects(); await f.settle(); await f.click('copy', 'of'); const oldTimer = f.oldTimers.find(t => t.delay === 1500)
    await f.click('copy', 'ratio'); oldTimer.callback(); await f.settle(); assert.equal(f.attr('copy', 'ratio').props.title, f.messages.percentCalculator.common.copied)
    f.io.mode = 'pending'; await f.click('copy', 'of'); const pending = f.copies.at(-1); await f.locale('en'); await f.locale('ko'); pending.resolve(); await f.settle(); assert.equal(f.attr('copy', 'of').props.title, f.messages.percentCalculator.copy)
    assert.ok(all(f.section('of')).find(n => n.props['data-percent-copy'] === 'of').props.className.includes('min-h-11'))
  } finally { f.cleanup() }
})
let passed = 0
for (const { name, run } of tests) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); console.log('PASS', name); passed++ }
assert.deepEqual(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/before-fix.json'), before)
console.log(`Percent actual parent: ${passed} groups passed; original observation bytes retained`)
