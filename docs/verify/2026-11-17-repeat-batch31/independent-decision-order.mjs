import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createOrderRevealController } from '../../../src/utils/orderReveal.ts'
import { createDecisionResultDownloads } from '../../../src/utils/decisionResultActions.ts'

// Only the common React host is reused; expectations and IO orchestration are independent.
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log(`PASS ${name}`) }
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : !value || typeof value !== 'object' ? '' : Array.isArray(value) ? value.map(text).join(' ') : text(value.props?.children)
const names = ['A', 'dup', 'B', 'dup', '한글🧾', 'last']
const expected = ['B', 'dup', '한글🧾', 'last', 'A', 'dup']
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

async function fixture(options = {}) {
  const messages = JSON.parse(readFileSync('messages/ko.json', 'utf8'))
  const jobs = [], copied = [], selected = [], downloads = [], revoked = [], focus = [], writes = []
  const urls = new Map(), stored = new Map(Object.entries(options.storage ?? {}))
  let sequence = 0, draws = 0, legacy = false, failSelection = false
  let native = async value => { copied.push(value) }
  const schedule = (callback, delay, kind = 'timeout') => {
    const job = { id: ++sequence, callback, delay, kind, active: true }; jobs.push(job); return job.id
  }
  const cancel = id => { const job = jobs.find(value => value.id === id); if (job) job.active = false }
  class Element { isConnected = true; focus() { focus.push('restored') } }
  class ReviewURL extends URL {
    static createObjectURL(blob) { const url = `blob:independent-${++sequence}`; urls.set(url, blob); return url }
    static revokeObjectURL(url) { revoked.push(url) }
  }
  const document = {
    activeElement: new Element(), body: { appendChild() {} },
    createElement(tag) {
      if (tag === 'textarea') return { value: '', readOnly: false, style: {}, focus() {},
        select() { if (failSelection) throw new Error('selection denied') },
        setSelectionRange(a, b) { selected.push([a, b, this.value]) }, remove() {} }
      if (tag === 'a') return { href: '', download: '', click() { downloads.push({ name: this.download, blob: urls.get(this.href), url: this.href }) }, remove() {} }
      throw new Error(`Unexpected DOM request ${tag}`)
    },
    execCommand(command) { assert.equal(command, 'copy'); return legacy },
  }
  const h = await componentHarness('src/components/DecisionTools.tsx', {
    props: { initialTab: 'order', ...options.props }, messages,
    url: options.url ?? `https://toolhub.ai.kr/order-picker/?keep=1&order=${encodeURIComponent(names.join(','))}&roulette=X,Y,Z#section`,
    navigator: { clipboard: { writeText: value => native(value) } }, document,
    storagePort: { getItem: key => stored.get(key) ?? null, setItem(key, value) { writes.push([key, value]); stored.set(key, value) }, removeItem(key) { writes.push([key, null]); stored.delete(key) } },
    beforeEffects(tree) {
      for (const node of nodes(tree)) if (node.type === 'button' && node.props.ref) node.props.ref.current = {
        disabled: !!node.props.disabled, isConnected: true, focus() { focus.push(Object.keys(node.props).find(key => key.startsWith('data-'))) },
      }
    },
    globals: {
      URL: ReviewURL, HTMLElement: Element, AbortController, DOMException,
      crypto: { randomUUID: () => 'independent-record' }, performance: { now: () => 100 },
      setTimeout: (callback, delay) => schedule(callback, delay), clearTimeout: cancel,
      setInterval: (callback, delay) => schedule(callback, delay, 'interval'), clearInterval: cancel,
      requestAnimationFrame: callback => schedule(callback, 16, 'raf'), cancelAnimationFrame: cancel,
    },
    modules: {
      '@/utils/password': { shuffle(items) { draws++; return [...items.slice(2), ...items.slice(0, 2)] } },
      '@/components/MealHistoryPanel': { __esModule: true, default: 'MealHistoryPanel' },
      '@/components/MealPlanPanel': { __esModule: true, default: 'MealPlanPanel' },
      '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
    },
  })
  const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.resolve(); h.render() } }
  h.render(); await settle()
  const find = (key, value) => h.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  const click = async (key, value) => { find(key, value).props.onClick(); await settle() }
  const fire = async (job, time) => { assert.ok(job, 'expected pending callback'); job.active = false; job.callback(time); await settle() }
  const pending = delay => jobs.filter(job => job.active && job.kind === 'timeout' && job.delay === delay)
  const status = () => {
    const props = find('id', 'order-picker-result').props
    return { phase: props['data-order-phase'], count: props['data-order-revealed-count'], run: props['data-order-run'], mode: props['data-order-reveal-mode'] }
  }
  const visibleNames = () => h.all().filter(node => Object.hasOwn(node.props, 'data-order-card') && node.props['data-order-visible'])
    .map(card => nodes(card).find(node => node.type === 'span' && node.props.className.includes('text-base')).props.children)
  const recovery = () => h.all().find(node => typeof node.type === 'function' && node.type.name === 'DecisionResultCopyRecovery')
  return { h, messages, jobs, copied, selected, downloads, revoked, focus, writes, stored, find, click, fire, pending, status, visibleNames, recovery, settle,
    draws: () => draws, setNative(value) { native = value }, setLegacy(value) { legacy = value }, setSelectionFailure(value) { failSelection = value },
    locale(locale) { messages.decisionTools = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).decisionTools; return settle() },
  }
}

await check('independent controller oracle: one immutable duplicate-preserving draw across mode/activity changes', () => {
  const jobs = []; let draws = 0
  const input = Object.freeze(['alpha', 'same', 'omega', 'same'])
  const c = createOrderRevealController({ shuffle: values => { draws++; return [values[3], values[2], values[1], values[0]] },
    schedule: (callback, delay) => { jobs.push({ callback, delay }); return 1 }, cancel() {} })
  assert.equal(c.start(input), true)
  const first = c.getSnapshot(), oldPrepare = jobs[0]
  c.setMode('manual'); oldPrepare.callback()
  assert.equal(c.getSnapshot().phase, 'shuffling')
  c.revealNext(); c.setMode('auto')
  const oldAuto = jobs.at(-1)
  c.setActive(false); oldAuto.callback(); c.setMode('manual'); c.setActive(true)
  assert.equal(c.getSnapshot().revealedCount, 1)
  c.revealNext(); c.revealAll()
  assert.deepEqual([...c.getSnapshot().items], ['same', 'omega', 'same', 'alpha'])
  assert.equal(c.getSnapshot().revealedCount, 4)
  assert.equal(c.getSnapshot().phase, 'complete')
  assert.equal(c.getSnapshot().runId, first.runId)
  assert.equal(draws, 1)
  assert.throws(() => c.getSnapshot().items.push('mutate'), TypeError)
  assert.deepEqual(input, ['alpha', 'same', 'omega', 'same'])
  c.reset(); c.start(input); oldPrepare.callback(); oldAuto.callback()
  assert.equal(c.getSnapshot().revealedCount, 0)
  c.dispose(); jobs.at(-1).callback()
  assert.equal(c.getSnapshot().active, false)
})

await check('independent download ownership: stale during Blob URL creation and throwing click release exactly once', () => {
  const snapshot = { target: 'order', runId: 3, text: '1위: 한글\n2위: same' }
  let current = true, clicks = 0; const revoked = []
  const d = createDecisionResultDownloads({ createUrl: () => { current = false; return 'blob:late' }, revokeUrl: url => revoked.push(url),
    download: () => { clicks++ }, schedule: () => assert.fail('stale scheduled'), cancel() {} })
  assert.equal(d.download(snapshot, () => current), 'stale')
  assert.equal(clicks, 0); d.dispose(); assert.deepEqual(revoked, ['blob:late'])
  const failureRevoked = []
  const failing = createDecisionResultDownloads({ createUrl: () => 'blob:failed', revokeUrl: url => failureRevoked.push(url),
    download: () => { throw new Error('download blocked') }, schedule: () => assert.fail('failed scheduled'), cancel() {} })
  assert.equal(failing.download(snapshot, () => true), 'failed')
  failing.dispose(); assert.deepEqual(failureRevoked, ['blob:failed'])
})

await check('actual auto→manual→next→all keeps one permutation, locks stale edit handlers and hides unrevealed names', async () => {
  const f = await fixture(); f.h.replayEffects(); await f.settle()
  f.find('data-order-input').props.onChange({ target: { value: 'pending' } }); await f.settle()
  const addBefore = f.find('data-order-add').props.onClick, removeBefore = f.find('data-order-remove', 0).props.onClick
  await f.click('data-order-draw'); const run = f.status().run
  assert.equal(f.draws(), 1); assert.equal(f.status().count, 0)
  assert.equal(f.find('data-order-input').props.disabled, true)
  addBefore(); removeBefore(); f.find('data-order-input').props.onKeyDown({ key: 'Enter' }); await f.settle()
  assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-order-remove')).length, names.length)
  await f.fire(f.pending(400)[0]); await f.fire(f.pending(500)[0])
  assert.deepEqual(f.visibleNames(), expected.slice(0, 1))
  const obsolete = f.pending(500)[0]
  await f.click('data-order-mode', 'manual'); await f.fire(obsolete)
  assert.equal(f.status().count, 1); assert.equal(f.pending(500).length, 0)
  await f.click('data-order-next'); assert.deepEqual(f.visibleNames(), expected.slice(0, 2))
  for (const card of f.h.all().filter(node => Object.hasOwn(node.props, 'data-order-card') && !node.props['data-order-visible'])) {
    assert.equal(text(card), '?')
    assert.ok(!Object.keys(card.props).some(key => /name|title|label/.test(key)))
  }
  assert.ok(!f.h.all().some(node => Object.hasOwn(node.props, 'data-order-copy') || Object.hasOwn(node.props, 'data-order-download')))
  await f.click('data-order-reveal-all'); assert.deepEqual(f.visibleNames(), expected)
  assert.equal(f.status().run, run); assert.equal(f.draws(), 1)
  await f.click('data-order-mode', 'auto'); assert.deepEqual(f.visibleNames(), expected)
  assert.equal(f.find('data-order-input').props.value, 'pending')
  assert.equal(f.pending(400).length + f.pending(500).length, 0)
  f.h.cleanup()
})

await check('actual tool-tab return never catches up; old callbacks and old complete exports cannot affect a new run', async () => {
  const f = await fixture()
  await f.click('data-order-draw'); await f.fire(f.pending(400)[0]); await f.fire(f.pending(500)[0])
  const queued = f.pending(500)[0], run = f.status().run
  await f.click('data-decision-tab', 'roulette')
  for (let i = 0; i < 20; i++) await f.fire(queued)
  await f.click('data-decision-tab', 'order')
  assert.deepEqual(f.visibleNames(), expected.slice(0, 1)); assert.equal(f.status().run, run)
  assert.equal(f.pending(500).length, 1)
  await f.fire(f.pending(500)[0]); assert.equal(f.status().count, 2)
  await f.click('data-order-reveal-all')
  const oldCopy = f.find('data-order-copy').props.onClick, oldTxt = f.find('data-order-download').props.onClick
  const oldReset = f.find('data-order-reset').props.onClick, oldAll = f.find('data-order-reveal-all').props.onClick
  await f.click('data-order-reset'); await f.click('data-order-draw')
  oldCopy(); oldTxt(); oldReset(); oldAll(); await f.fire(queued)
  assert.equal(f.status().phase, 'shuffling'); assert.equal(f.status().count, 0)
  assert.equal(f.copied.length, 0); assert.equal(f.downloads.length, 0)
  const newPrepare = f.pending(400)[0]
  f.h.cleanup(); newPrepare.callback(); await f.settle()
  assert.equal(f.pending(500).length, 0)
})

await check('actual complete export is exact ordered UTF-8; draft edit preserves it, committed list change invalidates it', async () => {
  const f = await fixture()
  await f.click('data-order-mode', 'manual'); await f.click('data-order-draw'); await f.click('data-order-reveal-all')
  const expectedText = expected.map((name, i) => `${i + 1}위: ${name}`).join('\n')
  await f.click('data-order-copy'); await f.click('data-order-download')
  assert.deepEqual(f.copied, [expectedText])
  assert.equal(f.downloads[0].name, 'presentation-order.txt')
  assert.equal(await f.downloads[0].blob.text(), expectedText)
  assert.deepEqual(new Uint8Array(await f.downloads[0].blob.arrayBuffer()), new TextEncoder().encode(expectedText))
  assert.ok(!expectedText.startsWith('\uFEFF'))
  const revokedJob = f.pending(1000)[0]
  f.find('data-order-input').props.onChange({ target: { value: 'new person' } }); await f.settle()
  assert.equal(f.status().phase, 'complete')
  assert.equal(f.find('data-order-copy').props['data-order-copied'], true)
  await f.click('data-order-add')
  assert.equal(f.status().phase, 'idle')
  assert.equal(f.recovery(), undefined)
  assert.ok(!f.h.all().some(node => Object.hasOwn(node.props, 'data-order-copy')))
  assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-order-remove')).length, 7)
  assert.equal(f.writes.length, 0)
  assert.equal(new URL(f.h.window.location).searchParams.get('keep'), '1')
  assert.equal(new URL(f.h.window.location).hash, '#section')
  f.h.cleanup(); revokedJob.callback(); assert.deepEqual(f.revoked, [f.downloads[0].url])
})

await check('actual denied copy exposes full manual recovery; real child select and retry return to current result', async () => {
  const f = await fixture()
  await f.click('data-order-mode', 'manual'); await f.click('data-order-draw'); await f.click('data-order-reveal-all')
  f.setNative(async () => { throw new Error('NotAllowedError') }); f.setLegacy(false)
  await f.click('data-order-copy')
  const recovery = f.recovery(); assert.ok(recovery)
  const expectedText = expected.map((name, i) => `${i + 1}위: ${name}`).join('\n')
  assert.equal(recovery.props.text, expectedText)
  assert.equal(f.find('data-order-copy').props['data-order-copied'], false)
  const ranges = []
  const child = await componentHarness('src/components/DecisionResultCopyRecovery.tsx', { props: recovery.props, messages: f.messages,
    beforeEffects(tree) {
      nodes(tree).find(node => node.type === 'textarea').props.ref.current = { focus() {}, select() {}, setSelectionRange(a, b) { ranges.push([a, b]) } }
    },
  })
  child.render()
  const area = child.find(node => node.type === 'textarea').props
  assert.equal(area.readOnly, true); assert.equal(area.value, expectedText)
  child.find(node => Object.hasOwn(node.props, 'data-decision-copy-select')).props.onClick(); child.render()
  assert.deepEqual(ranges, [[0, expectedText.length]])
  assert.equal(f.find('data-order-copy').props['data-order-copied'], false)
  f.setNative(async value => { f.copied.push(value) })
  child.find(node => Object.hasOwn(node.props, 'data-decision-copy-retry')).props.onClick(); await f.settle()
  assert.deepEqual(f.copied, [expectedText]); assert.equal(f.recovery(), undefined)
  assert.equal(f.find('data-order-copy').props['data-order-copied'], true)
  assert.ok(f.focus.includes('data-order-copy'))
  f.setNative(async () => { throw new Error('denied again') }); f.setSelectionFailure(true)
  await f.click('data-order-copy')
  assert.equal(f.find('data-order-copy').props['data-order-copied'], false)
  assert.equal(f.recovery().props.text, expectedText)
  f.recovery().props.onClose(); await f.settle()
  assert.equal(f.recovery(), undefined); assert.equal(f.status().phase, 'complete')
  assert.deepEqual(f.visibleNames(), expected)
  child.cleanup(); f.h.cleanup()
})

await check('actual late copy rejection, stale success timer, locale and unmount cannot replace newer feedback', async () => {
  const f = await fixture()
  await f.click('data-order-mode', 'manual'); await f.click('data-order-draw'); await f.click('data-order-reveal-all')
  await f.click('data-order-copy'); const staleTimer = f.pending(2000)[0]
  const pending = deferred(); f.setNative(() => pending.promise)
  await f.click('data-order-copy')
  await f.click('data-decision-tab', 'roulette')
  f.find('id', 'roulette-spin').props.onClick(); await f.settle()
  await f.fire(f.jobs.find(job => job.active && job.kind === 'raf'), 4300)
  f.setNative(async value => { f.copied.push(value) })
  await f.click('data-roulette-copy')
  const fallbacksBefore = f.selected.length
  pending.reject(new Error('old order denied')); await f.settle(); await f.fire(staleTimer)
  assert.equal(f.selected.length, fallbacksBefore); assert.equal(f.recovery(), undefined)
  assert.equal(f.find('data-roulette-copy').props['data-roulette-copied'], true)
  await f.click('data-decision-tab', 'order')
  const late = deferred(); f.setNative(() => late.promise); await f.click('data-order-copy')
  await f.locale('en'); late.reject(new Error('old language denied')); await f.settle()
  assert.equal(f.recovery(), undefined); assert.equal(f.selected.length, fallbacksBefore)
  assert.deepEqual(f.visibleNames(), expected)
  const afterUnmount = deferred(); f.setNative(() => afterUnmount.promise); await f.click('data-order-copy')
  f.h.cleanup(); afterUnmount.reject(new Error('left page')); await f.settle()
  assert.equal(f.selected.length, fallbacksBefore); assert.equal(f.recovery(), undefined)
})

await check('bounded menu regression: read-only mounting/tab changes preserve history and weekly bytes/candidates', async () => {
  const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const historyRaw = JSON.stringify({ records: [{ id: 'existing', name: 'X', date: today }], excludeDays: 1 })
  const weekRaw = JSON.stringify({ version: 1, entries: [{ date: today, menu: 'X' }] })
  const f = await fixture({ props: { initialTab: 'roulette', menuMode: true }, storage: { 'toolhub-meals-v1': historyRaw, 'toolhub:meal-plan': weekRaw } })
  const plan = () => f.h.find(node => node.type === 'MealPlanPanel').props
  assert.deepEqual([...plan().candidates], ['Y', 'Z'])
  assert.equal(plan().history.length, 1)
  await f.click('data-decision-tab', 'order'); await f.click('data-order-mode', 'manual'); await f.click('data-order-draw'); await f.click('data-order-reveal-all')
  await f.click('data-decision-tab', 'roulette')
  assert.deepEqual([...plan().candidates], ['Y', 'Z'])
  assert.equal(f.stored.get('toolhub-meals-v1'), historyRaw)
  assert.equal(f.stored.get('toolhub:meal-plan'), weekRaw)
  assert.equal(f.writes.length, 0)
  assert.equal(plan().onAddMeal('future', '2200-01-01'), false)
  assert.equal(f.writes.length, 0)
  f.h.cleanup()
})

console.log(`${groups} independent decision-order groups passed; actual parent/child, controlled native ports, no Chrome`)
