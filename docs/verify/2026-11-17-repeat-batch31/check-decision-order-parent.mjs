import assert from 'node:assert/strict'
import { decisionOrderRaceHarness } from './decision-order-race-harness.mjs'

let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const has = (node, key) => Object.hasOwn(node.props, key)
const action = (f, key, value) => f.h.find(node => has(node, key) && (value === undefined || node.props[key] === value))
const click = (f, key, value) => { action(f, key, value).props.onClick(); f.h.render() }
const state = f => action(f, 'data-order-phase').props
const cards = f => f.h.all().filter(node => has(node, 'data-order-card'))
const revealedNames = f => cards(f).filter(node => node.props['data-order-visible']).map(node => node.props.children.props.children[1].props.children)
const recovery = f => f.h.all().find(node => node.type?.name === 'DecisionResultCopyRecovery')

function io() {
  const writes = [], files = [], urls = new Map(), revoked = [], images = []
  let legacy = false, legacyCalls = 0, failDownload = false
  const context = new Proxy({}, { get: (_target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true })
  const document = {
    activeElement: null, body: { appendChild() {}, removeChild() {} },
    execCommand() { legacyCalls++; return legacy },
    createElement(tag) {
      if (tag === 'textarea') return { style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }
      if (tag === 'canvas') { const image = { width: 0, height: 0, getContext: () => context, toDataURL: type => { images.push({ width: image.width, height: image.height, type }); return 'data:image/png;base64,fixture' } }; return image }
      const anchor = { href: '', download: '', click() { if (failDownload) throw new Error('download denied'); files.push({ href: anchor.href, filename: anchor.download, blob: urls.get(anchor.href) }) }, remove() {} }; return anchor
    },
  }
  class ResultURL extends URL {
    static createObjectURL(blob) { const key = `blob:decision-${urls.size}`; urls.set(key, blob); return key }
    static revokeObjectURL(key) { revoked.push(key) }
  }
  return { writes, files, urls, revoked, images, document, globals: { URL: ResultURL, HTMLElement: class {} },
    navigator: { clipboard: { async writeText(text) { writes.push(text) } } },
    legacy(value) { legacy = value }, legacyCalls: () => legacyCalls, failDownload(value) { failDownload = value } }
}

await check('Strict replay and duplicate URL roster retain one fixed draw through auto/manual changes and finish focus', async () => {
  const f = await decisionOrderRaceHarness({ url: 'https://toolhub.ai.kr/order-picker?order=A,A,B,C' })
  f.h.replayEffects(); await f.settle(); f.h.replayEffects(); await f.settle()
  click(f, 'data-order-mode', 'manual'); f.draw()
  assert.equal(f.draws(), 1); assert.equal(f.pending(400).length + f.pending(500).length, 0)
  assert.equal(state(f)['data-order-phase'], 'shuffling'); assert.equal(action(f, 'data-order-input').props.disabled, true)
  const blockedAdd = action(f, 'data-order-add'), blockedRemove = action(f, 'data-order-remove', 0)
  const input = action(f, 'data-order-input')
  assert.equal(blockedAdd.props.disabled, true); assert.equal(blockedRemove.props.disabled, true)
  input.props.onChange({ target: { value: 'blocked' } }); input.props.onKeyDown({ key: 'Enter' }); blockedAdd.props.onClick(); blockedRemove.props.onClick(); f.h.render()
  assert.equal(action(f, 'data-order-input').props.value, '')
  click(f, 'data-order-next'); assert.deepEqual(revealedNames(f), ['C'])
  click(f, 'data-order-mode', 'auto'); assert.equal(f.pending(500).length, 1); await f.fire(f.pending(500)[0])
  assert.deepEqual(revealedNames(f), ['C', 'B'])
  click(f, 'data-order-mode', 'manual'); click(f, 'data-order-next'); click(f, 'data-order-next')
  assert.deepEqual(revealedNames(f), ['C', 'B', 'A', 'A']); assert.equal(f.draws(), 1); assert.equal(f.focuses.at(-1), 'data-order-copy')
  const oldCopy = action(f, 'data-order-copy').props.onClick, before = state(f)['data-order-run']
  click(f, 'data-order-mode', 'auto'); assert.equal(state(f)['data-order-run'], before); assert.equal(f.pending(500).length, 0)
  const field = action(f, 'data-order-input'); field.props.onChange({ target: { value: 'E' } }); f.h.render(); action(f, 'data-order-input').props.onKeyDown({ key: 'Enter' }); f.h.render()
  assert.equal(state(f)['data-order-phase'], 'idle'); oldCopy(); await f.settle(); assert.equal(f.canCopy(), false)
  f.h.cleanup()
})

await check('Tool-tab pause preserves phase and permutation; auto returns fresh and manual returns with no timer', async () => {
  const f = await decisionOrderRaceHarness({ props: { single: false } })
  f.draw(); const oldPrepare = f.pending(400)[0], run = state(f)['data-order-run']
  click(f, 'data-decision-tab', 'roulette'); await f.fire(oldPrepare)
  assert.equal(f.pending(400).length + f.pending(500).length, 0)
  click(f, 'data-decision-tab', 'order'); assert.equal(state(f)['data-order-run'], run); assert.equal(f.pending(400).length, 1)
  await f.fire(f.pending(400)[0]); await f.fire(f.pending(500)[0]); assert.equal(f.visible(), 1)
  const oldReveal = f.pending(500)[0]; click(f, 'data-decision-tab', 'roulette'); await f.fire(oldReveal)
  click(f, 'data-decision-tab', 'order'); assert.equal(f.visible(), 1); assert.equal(f.pending(500).length, 1)
  click(f, 'data-order-mode', 'manual'); click(f, 'data-decision-tab', 'roulette'); click(f, 'data-decision-tab', 'order')
  assert.equal(f.pending(400).length + f.pending(500).length, 0); click(f, 'data-order-next'); assert.equal(f.visible(), 2)
  assert.equal(f.draws(), 1); f.h.cleanup()
})

await check('Partial draw has no export; copy and literal UTF-8 TXT match and every temporary URL is released', async () => {
  const port = io(), f = await decisionOrderRaceHarness({ ...port, url: 'https://toolhub.ai.kr/order-picker?order=%3Cb%3E,A,%F0%9F%98%80' })
  f.draw(); await f.fire(f.pending(400)[0]); assert.equal(f.canCopy(), false); assert.equal(f.h.all().some(node => has(node, 'data-order-download')), false)
  f.revealAll(); click(f, 'data-order-copy'); await f.settle(); assert.equal(port.writes.length, 1)
  const copied = port.writes[0]; assert.ok(copied.includes('<b>')); assert.ok(copied.includes('😀'))
  click(f, 'data-order-download'); assert.equal(port.files.length, 1); assert.equal(port.files[0].filename, 'presentation-order.txt')
  assert.equal(await port.files[0].blob.text(), copied); assert.deepEqual(new Uint8Array(await port.files[0].blob.arrayBuffer()), new TextEncoder().encode(copied))
  const oldExport = action(f, 'data-order-download').props.onClick
  f.reset(); oldExport(); assert.equal(port.files.length, 1); assert.equal(f.focuses.at(-1), 'data-order-draw')
  f.h.cleanup(); assert.equal(port.revoked.length, 1); for (const job of f.jobs.filter(job => job.delay === 1000)) job.callback(); assert.equal(port.revoked.length, 1)
})

await check('Clipboard denial/false recovers exact text, supports retry/close and download failure preserves result', async () => {
  const port = io(); port.navigator.clipboard.writeText = async () => { throw new Error('denied') }
  const f = await decisionOrderRaceHarness(port); click(f, 'data-order-mode', 'manual'); f.draw(); f.revealAll()
  click(f, 'data-order-copy'); await f.settle(); assert.equal(port.legacyCalls(), 1); assert.ok(recovery(f)); const text = recovery(f).props.text
  assert.ok(text.length > 0); assert.equal(action(f, 'data-order-copy').props.disabled, false)
  port.legacy(true); recovery(f).props.onRetry(); await f.settle(); assert.equal(recovery(f), undefined); assert.equal(port.legacyCalls(), 2); assert.equal(f.focuses.at(-1), 'data-order-copy')
  port.legacy(false); click(f, 'data-order-copy'); await f.settle(); assert.equal(recovery(f).props.text, text)
  recovery(f).props.onClose(); f.h.render(); assert.equal(recovery(f), undefined); assert.equal(f.focuses.at(-1), 'data-order-copy')
  port.failDownload(true); click(f, 'data-order-download'); assert.equal(state(f)['data-order-phase'], 'complete'); assert.ok(f.h.all().some(node => node.props.role === 'alert'))
  port.failDownload(false); click(f, 'data-order-download'); assert.equal(port.files.length, 1); f.h.cleanup()
})

await check('Late clipboard rejection/old notice timers cannot affect reset, a newer request or unmount', async () => {
  const port = io(), first = deferred(); port.navigator.clipboard.writeText = () => first.promise
  const f = await decisionOrderRaceHarness(port); click(f, 'data-order-mode', 'manual'); f.draw(); f.revealAll(); click(f, 'data-order-copy'); f.reset()
  first.reject(new Error('late denied')); await f.settle(); assert.equal(port.legacyCalls(), 0); assert.equal(recovery(f), undefined)
  f.draw(); f.revealAll(); port.navigator.clipboard.writeText = async text => { port.writes.push(text) }
  click(f, 'data-order-copy'); await f.settle(); const oldNotice = f.pending(2000)[0]
  click(f, 'data-order-copy'); await f.settle(); await f.fire(oldNotice); assert.equal(action(f, 'data-order-copied').props['data-order-copied'], true)
  const late = deferred(); port.navigator.clipboard.writeText = () => late.promise; click(f, 'data-order-copy'); f.h.cleanup()
  late.reject(new Error('unmounted')); for (let count = 0; count < 8; count++) await Promise.resolve(); assert.equal(port.legacyCalls(), 0)
})

await check('Locale preserves order and an older completed export handler cannot disclose a new run', async () => {
  const port = io(), f = await decisionOrderRaceHarness(port); click(f, 'data-order-mode', 'manual'); f.draw(); f.revealAll()
  const names = revealedNames(f), run = state(f)['data-order-run'], oldCopy = action(f, 'data-order-copy').props.onClick
  f.english(); await f.settle(); assert.deepEqual(revealedNames(f), names); assert.equal(state(f)['data-order-run'], run); assert.equal(f.draws(), 1)
  f.reset(); f.draw(); oldCopy(); await f.settle(); assert.equal(port.writes.length, 0); assert.equal(f.visible(), 0); f.h.cleanup()
})

await check('New roulette copy owns the shared clipboard guard after an older order request rejects', async () => {
  const port = io(), old = deferred(); port.navigator.clipboard.writeText = () => old.promise
  const f = await decisionOrderRaceHarness({ ...port, props: { single: false }, globals: { ...port.globals, performance: { now: () => 0 } } })
  click(f, 'data-order-mode', 'manual'); f.draw(); f.revealAll(); click(f, 'data-order-copy')
  click(f, 'data-decision-tab', 'roulette'); f.h.find(node => node.props.id === 'roulette-spin').props.onClick(); f.h.render()
  await f.fire(f.pending(16)[0], 4200)
  port.navigator.clipboard.writeText = async text => { port.writes.push(text) }
  click(f, 'data-roulette-copy'); await f.settle(); assert.equal(action(f, 'data-roulette-copied').props['data-roulette-copied'], true)
  old.reject(new Error('obsolete order')); await f.settle()
  assert.equal(port.legacyCalls(), 0); assert.equal(recovery(f), undefined); assert.equal(action(f, 'data-roulette-copied').props['data-roulette-copied'], true)
  f.h.cleanup()
})

await check('Menu storage/plan and existing roulette RAF/PNG remain separate from order resets', async () => {
  const port = io(), today = '2026-11-17', meals = JSON.stringify({ records: [{ id: 'old', name: '치킨', date: today }], excludeDays: 1 })
  const plan = JSON.stringify({ version: 1, entries: [{ date: today, menu: '김밥' }] })
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-17T12:00:00+09:00'])) } }
  const math = Object.create(Math); math.random = () => 0.25
  const f = await decisionOrderRaceHarness({ ...port, props: { initialTab: 'roulette', single: false, menuMode: true, defaultPreset: '저녁메뉴' }, storage: { 'toolhub-meals-v1': meals, 'toolhub:meal-plan': plan }, globals: { ...port.globals, Date: ClockDate, Math: math, performance: { now: () => 100 }, crypto: { randomUUID: () => 'new-meal' } } })
  const history = f.h.find(node => node.type === 'MealHistoryPanel').props, weekly = f.h.find(node => node.type === 'MealPlanPanel').props
  assert.equal(history.candidates, 11); assert.equal(weekly.candidates.includes('치킨'), false)
  f.h.find(node => node.props.id === 'roulette-spin').props.onClick(); f.h.render(); const wheelFrame = f.pending(16)[0]
  click(f, 'data-decision-tab', 'order'); click(f, 'data-order-mode', 'manual'); f.draw(); f.reset(); assert.equal(wheelFrame.active, true)
  await f.fire(wheelFrame, 4300); click(f, 'data-decision-tab', 'roulette')
  assert.equal(f.h.find(node => node.props.id === 'roulette-spin').props.disabled, false)
  click(f, 'data-roulette-copy'); await f.settle(); assert.equal(port.writes.length, 1); assert.ok(weekly.candidates.includes(port.writes[0]))
  f.h.button('이미지').props.onClick(); assert.deepEqual(port.images, [{ width: 600, height: 340, type: 'image/png' }])
  assert.equal(f.h.stored.get('toolhub-meals-v1'), meals); assert.equal(f.h.stored.get('toolhub:meal-plan'), plan)
  const add = f.h.find(node => node.type === 'MealHistoryPanel').props.onAdd
  assert.equal(add('새 식사', today), true); f.h.render(); assert.equal(JSON.parse(f.h.stored.get('toolhub-meals-v1')).records.length, 2)
  assert.equal(f.h.stored.get('toolhub:meal-plan'), plan); assert.equal(f.h.all().some(node => has(node, 'data-roulette-copy')), false); f.h.cleanup()
})

console.log(`DecisionTools actual parent: ${groups} groups passed; controlled clocks/DOM ports, native browser separate`)
