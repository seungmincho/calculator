import assert from 'node:assert/strict'
import fs from 'node:fs'
import { splitExpense, settle, simpleSplit, encodeState, decodeState } from '../../../src/utils/dutchPay.ts'
import { parseDutchPayRecent, parseDutchPayAccount, prepareDutchPayRecent, commitDutchPayRecent, createDutchPayAccountWriter, DUTCH_PAY_RECENT_KEY as RECENT, DUTCH_PAY_ACCOUNT_KEY as ACCOUNT } from '../../../src/utils/dutchPayStorage.ts'
import { createDutchPayCopyGuard, captureDutchPayCopy, copyDutchPayText } from '../../../src/utils/dutchPayCopy.ts'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve))
const sample = (title = 'Independent settlement', count = 3) => ({ mode: 't', title, leader: 1, unit: 10, dir: 'round', people: [{ name: '', weight: .5 }, { name: 'same', weight: 1.5 }, { name: 'same', weight: 0 }], expenses: Array.from({ length: count }, (_, index) => ({ name: `line ${index}`, amount: 109 + index * 7, payer: index % 3, among: index % 2 ? [0, 1] : [0, 1, 2] })) })
const entry = state => { const result = prepareDutchPayRecent(state, 1800000000000); assert.equal(result.ok, true); return result.entry }
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('independent BigInt residue oracle and transfer conservation preserve exact original arithmetic', () => {
  let seed = 78321; const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0)
  const oracle = (amount, weights, among) => {
    const active = [...new Set(among)].sort((a, b) => a - b), units = active.map(index => BigInt(Math.round(weights[index] * 10))), result = weights.map(() => 0)
    if (!active.length) return result
    const normalized = units.every(value => value === 0n) ? units.map(() => 1n) : units, sum = normalized.reduce((a, b) => a + b, 0n), total = BigInt(amount)
    const fractions = active.map((index, i) => ({ index, remainder: total * normalized[i] % sum, base: total * normalized[i] / sum }))
    const remaining = Number(total - fractions.reduce((a, row) => a + row.base, 0n)); fractions.sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)
    fractions.forEach((row, i) => { result[row.index] = Number(row.base) + (i < remaining ? 1 : 0) }); return result
  }
  for (let k = 0; k < 500; k++) {
    const n = 1 + random() % 8, weights = Array.from({ length: n }, () => [0, .1, .5, 1, 1.5, 3, 9.9][random() % 7]), among = Array.from({ length: n }, (_, i) => i).filter(() => random() % 3 !== 0), amount = k % 9 ? random() % 100000 : 1e11
    assert.deepEqual(splitExpense(amount, weights, among), oracle(amount, weights, among))
    const people = weights.map(weight => ({ name: '', weight })), expenses = [{ name: '', amount, payer: random() % n, among }], result = settle(people, expenses), balances = [...result.net]
    for (const move of result.transfers) { assert.ok(Number.isSafeInteger(move.amount) && move.amount > 0); balances[move.from] += move.amount; balances[move.to] -= move.amount }
    assert.ok(balances.every(value => value === 0)); assert.equal(result.owed.reduce((a, b) => a + b, 0), result.total)
    for (const dir of ['ceil', 'floor', 'round']) { const simple = simpleSplit(people, expenses, 0, 100, dir); assert.equal(simple.pay.reduce((a, b) => a + b, 0), simple.total); for (let i = 1; i < n; i++) assert.equal(simple.pay[i], (dir === 'ceil' ? Math.ceil : dir === 'floor' ? Math.floor : Math.round)(simple.owed[i] / 100) * 100) }
  }
})
await check('independently encoded maximum legacy ten records read 339201 bytes, and 101-item save refuses without changing source', () => {
  const chars = [1, 2, 3, 4, 5, 6, 7, 14, 15, 16], entries = chars.map(code => {
    const c = String.fromCharCode(code), tuple = [1, 't', c.repeat(30), 29, 1000, 'round', Array.from({ length: 30 }, () => [c.repeat(20), 99]), Array.from({ length: 100 }, () => [c.repeat(30), 1e11, 29, 1073741822])]
    const d = Buffer.from(JSON.stringify(tuple)).toString('base64url'); return { d, title: c.repeat(30), total: 1e13, n: 30, at: -8640000000000000 }
  })
  const raw = JSON.stringify(entries); assert.equal(Buffer.byteLength(raw), 339201); const parsed = parseDutchPayRecent(raw); assert.equal(parsed.ok, true); assert.equal(parsed.value.length, 10); assert.equal(parsed.raw, raw)
  for (const item of entries) { assert.equal(encodeState(decodeState(item.d)), item.d); assert.equal(decodeState(item.d).expenses.length, 100) }
  const state = sample('101', 101), before = JSON.stringify(state); assert.equal(prepareDutchPayRecent(state, 1).ok, false); assert.equal(JSON.stringify(state), before)
  for (const bad of ['null', '{}', '{', JSON.stringify([...entries, entries[0]]), JSON.stringify([entries[0], entries[0]]), JSON.stringify([{ ...entries[0], total: 0 }])]) { const result = parseDutchPayRecent(bad); assert.equal(result.ok, false); assert.equal(result.raw, bad) }
  const future = Buffer.from(JSON.stringify([2])).toString('base64url'), rawFuture = JSON.stringify([{ ...entries[0], d: future }]); assert.equal(parseDutchPayRecent(rawFuture).error, 'unsupported'); assert.equal(parseDutchPayRecent(rawFuture).raw, rawFuture)
  assert.equal(parseDutchPayAccount('null').ok, false); assert.equal(parseDutchPayAccount(JSON.stringify('\ud800'.repeat(60))).ok, true)
})
await check('recent commits retain raw on corruption/quota/canceled locks and reject second-reader CAS or uncertain write without rollback', async () => {
  const item = entry(sample()), data = new Map(), writes = [], queue = []; let quota = false, readback = false
  const storage = { getItem(key) { if (readback && writes.length) throw new Error('blocked'); return data.get(key) ?? null }, setItem(key, raw) { if (quota) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); writes.push(raw); data.set(key, raw) } }
  const lock = (_key, action) => new Promise(resolve => queue.push(() => resolve(action())))
  const first = commitDutchPayRecent(null, { kind: 'save', entry: item }, { storage, lock }), second = commitDutchPayRecent(null, { kind: 'save', entry: entry(sample('other')) }, { storage, lock })
  queue.shift()(); assert.equal((await first).ok, true); const confirmed = data.get(RECENT); queue.shift()(); assert.equal((await second).error, 'conflict'); assert.equal(data.get(RECENT), confirmed)
  quota = true; assert.equal((await commitDutchPayRecent(confirmed, { kind: 'delete', d: item.d }, { storage })).error, 'quota'); assert.equal(data.get(RECENT), confirmed); quota = false
  let current = true; const canceled = commitDutchPayRecent(confirmed, { kind: 'delete', d: item.d }, { storage, lock, current: () => current }); current = false; queue.shift()(); assert.equal((await canceled).error, 'cancelled'); assert.equal(data.get(RECENT), confirmed)
  readback = true; writes.length = 0; const unknown = await commitDutchPayRecent(confirmed, { kind: 'delete', d: item.d }, { storage }); assert.equal(unknown.error, 'unconfirmed'); assert.equal(data.get(RECENT), '[]'); assert.equal(writes.length, 1)
})
await check('account latest-input coordinator preserves known basis across synchronous own-write continuation and unknown writes require recheck', async () => {
  const values = new Map([[ACCOUNT, JSON.stringify('synthetic original')]]), writes = [], jobs = []; let readbackBlocked = false
  const storage = { getItem(key) { if (readbackBlocked) throw new Error('blocked'); return values.get(key) ?? null }, setItem(key, value) { values.set(key, value); writes.push(value) } }
  const writer = createDutchPayAccountWriter({ storage, lock: (_key, callback) => new Promise(resolve => jobs.push(() => resolve(callback()))) })
  writer.initialize(); assert.equal(writes.length, 0); const a = writer.edit('A'), b = writer.edit('B'); jobs.shift()(); assert.equal((await a).error, 'cancelled'); jobs.shift()(); const c = writer.edit('C'); assert.equal((await b).ok, true); jobs.shift()(); assert.equal((await c).ok, true); assert.equal(values.get(ACCOUNT), JSON.stringify('C'))
  const d = writer.edit('D'); values.set(ACCOUNT, JSON.stringify('external')); writer.externalChange(); jobs.shift()(); await d; assert.equal(writer.snapshot().value, 'D'); const count = writes.length; await writer.edit('latest draft'); assert.equal(writes.length, count)
  writer.recheck(); assert.equal(writer.snapshot().value, 'latest draft'); assert.equal(writes.length, count); const retry = writer.retry(); jobs.shift()(); assert.equal((await retry).ok, true)
  const unknown = createDutchPayAccountWriter({ storage: { getItem: key => storage.getItem(key), setItem(key, value) { storage.setItem(key, value); readbackBlocked = true } } }); unknown.initialize(); assert.equal((await unknown.edit('uncertain')).error, 'unconfirmed'); readbackBlocked = false; const after = writes.length; await unknown.edit('memory newer'); assert.equal(writes.length, after); assert.equal(unknown.snapshot().value, 'memory newer'); unknown.recheck(); assert.equal(unknown.snapshot().value, 'memory newer'); writer.dispose(); unknown.dispose()
})
await check('copy guard owns targets and activation generations; stale native rejection and legacy false never claim a copy', async () => {
  const guard = createDutchPayCopyGuard(), first = guard.begin(), old = deferred(); let fallback = 0
  const result = copyDutchPayText(captureDutchPayCopy('notice', 'n', 'synthetic notice'), () => guard.current(first), { writeText: () => old.promise, fallback: () => { fallback++; return true } })
  guard.begin(); old.reject(new Error('late')); assert.equal(await result, 'stale'); assert.equal(fallback, 0)
  for (const truth of [true, false, undefined]) { const token = guard.begin(), value = await copyDutchPayText(captureDutchPayCopy('amount', 'a', '109'), () => guard.current(token), { fallback: () => truth }); assert.equal(value, truth === true ? 'copied' : 'failed') }
  const token = guard.begin(); guard.dispose(); guard.activate(); assert.equal(guard.current(token), false)
})

// Parent probes below use only the common hook/DOM host, with independently authored I/O and assertions.
const catalogs = Object.fromEntries(['ko', 'en'].map(locale => {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  Object.assign(messages.dutchPay, JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch36/translations-dutch-pay.json', 'utf8'))[locale].dutchPay)
  return [locale, messages]
}))
async function parent({ state = sample(), records = [], url, hydrate = true, account = 'SYNTHETIC_ACCOUNT' } = {}) {
  let language = 'ko', write = async () => {}, held = false, legacy = false, frameId = 0, image = async () => new Blob(['picture'])
  const data = new Map([[RECENT, JSON.stringify(records)], [ACCOUNT, JSON.stringify(account)]]), writes = [], pending = [], frames = new Map(), copied = [], faults = new Map(), timers = [], downloads = [], refs = new Map(), focus = []
  const storage = { getItem(key) { if (faults.get(key) === 'read' || faults.get(key) === 'readback-block') throw new Error('read denied'); return data.get(key) ?? null }, setItem(key, raw) { if (faults.get(key) === 'quota') throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); writes.push(key); data.set(key, raw); if (faults.get(key) === 'unknown') faults.set(key, 'readback-block') } }
  class Field { value = ''; style = {}; isConnected = true; disabled = false; focus() { document.activeElement = this; focus.push(this.id) } select() {} setSelectionRange() {} remove() { this.isConnected = false } }
  const fallback = [], document = { activeElement: new Field(), body: { appendChild() {} }, createElement: tag => tag === 'textarea' ? new Field() : { click() { downloads.push(this.download) }, remove() {} }, execCommand() { fallback.push(true); return legacy } }
  const navigator = { clipboard: { writeText(text) { copied.push(text); return write(text) } }, locks: { request(_key, options, callback) { const run = () => { if (options.signal?.aborted) throw Object.assign(new Error('abort'), { name: 'AbortError' }); return callback() }; return held ? new Promise((resolve, reject) => pending.push(() => { try { resolve(run()) } catch (error) { reject(error) } })) : Promise.resolve().then(run) } } }
  const translation = namespace => { const lookup = key => key.split('.').reduce((value, part) => value?.[part], catalogs[language][namespace]); const t = (key, vars = {}) => { const text = lookup(key); assert.equal(typeof text, 'string', key); return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`)) }; t.raw = lookup; return t }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = () => 'blob:independent-dutch'; LocalURL.revokeObjectURL = () => {}
  const setup = { url: url ?? `https://toolhub.ai.kr/dutch-pay/?d=${encodeState(state)}&keep=1&keep=2#anchor`, storagePort: storage, navigator, document,
    modules: { '@/lib/i18n': { useTranslations: translation }, '@/lib/i18n/shared': { useTranslations: translation }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/utils/shareCard': { renderShareCard: () => image() } },
    globals: { AbortController, File, HTMLElement: Field, atob, btoa, URL: LocalURL, requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId }, cancelAnimationFrame(id) { frames.delete(id) } },
    beforeEffects(tree) { const visit = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); if (node.props?.ref) { const id = node.props['data-dutch-copy'] ?? node.props.id ?? 'recovery'; const field = refs.get(id) ?? new Field(); field.id = id; field.value = node.props.value; field.disabled = !!node.props.disabled; refs.set(id, field); if (typeof node.props.ref === 'function') node.props.ref(field); else node.props.ref.current = field } visit(node.props?.children) }; visit(tree) },
  }
  const h = await componentHarness('src/components/DutchPay.tsx', setup), urlWrites = [], stateObject = { preserved: 17 }
  const replace = h.window.history.replaceState; h.window.history.state = stateObject; h.window.history.replaceState = (value, title, next) => { urlWrites.push(next); h.window.history.state = value; replace(value, title, next) }
  const schedule = h.context.setTimeout; h.context.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return schedule(callback, delay) }
  h.render(); const boot = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); h.render() }; if (hydrate) boot()
  let share
  const sharedProps = () => h.all().find(node => node.type === 'ShareResult')?.props, sync = () => { h.render(); if (share && sharedProps()) share.setProps(sharedProps()) }
  const by = (key, value) => h.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  return { h, by, data, writes, copied, fallback, faults, timers, downloads, pending, frames, stateObject, urlWrites, boot, sync, focus,
    click(key, value) { const node = by(key, value); assert.ok(!node.props.disabled, key); node.props.onClick(); sync() }, edit(key, value, text) { const node = by(key, value); assert.ok(!node.props.disabled); node.props.onChange({ target: { value: text } }); sync() },
    async settle() { await flush(); sync() }, hold(value) { held = value }, release() { assert.ok(pending.length); pending.shift()() }, storageEvent(key) { h.window.dispatch('storage', { key }); sync() },
    writer(port) { write = port }, legacy(value) { legacy = value }, locale(locale) { language = locale; sync() }, sharedProps,
    recovery: () => h.all().find(node => typeof node.type === 'function' && node.type.name === 'DutchPayCopyRecovery')?.props,
    async mountShare() { share = await componentHarness('src/components/ShareResult.tsx', { ...setup, props: sharedProps() }); share.render() },
    shareClick(action) { by('data-dutch-share-boundary').props.onClickCapture(); share.find(node => node.props['data-share-action'] === action).props.onClick(); sync() }, image(port) { image = port },
    cleanup() { share?.cleanup(); h.cleanup() },
  }
}
await check('actual parent initial URL wins over stored recent, Strict replay writes nothing early and retains unrelated URL/history', async () => {
  const historical = entry(sample('saved')), f = await parent({ records: [historical], hydrate: false })
  assert.equal(f.writes.length, 0); assert.equal(f.urlWrites.length, 0); assert.equal(f.by('data-dutch-save').props.disabled, true); f.h.replayEffects(); assert.equal(f.frames.size, 1); f.boot()
  assert.equal(f.by('data-dutch-title').props.value, sample().title); assert.equal(f.writes.length, 0); assert.equal(f.by('data-dutch-account').props.value, 'SYNTHETIC_ACCOUNT'); assert.equal(f.data.get(RECENT), JSON.stringify([historical]))
  f.edit('data-dutch-title', undefined, 'edited'); assert.deepEqual(f.h.window.location.searchParams.getAll('keep'), ['1', '2']); assert.equal(f.h.window.location.hash, '#anchor'); assert.equal(f.h.window.history.state, f.stateObject); f.cleanup()
  const legacy = await parent({ url: 'https://toolhub.ai.kr/dutch-pay/?total=1001&people=3&keep=x#old' }); const state = decodeState(legacy.h.window.location.searchParams.get('d')); assert.equal(state.people.length, 3); assert.equal(state.expenses[0].amount, 1001); assert.equal(legacy.h.window.location.hash, '#old'); legacy.cleanup()
})
await check('actual parent saves click-time state but late load never replaces an edited form; 101-item save retains original bytes', async () => {
  const historical = entry(sample('saved')), f = await parent({ state: sample('current', 100), records: [historical] }); f.hold(true)
  f.click('data-dutch-save'); f.edit('data-dutch-title', undefined, 'edited while save waits'); f.release(); await f.settle(); const saved = JSON.parse(f.data.get(RECENT)); assert.equal(saved[0].title, 'current'); assert.equal(f.by('data-dutch-title').props.value, 'edited while save waits'); assert.ok(!f.h.text().includes(catalogs.ko.dutchPay.storage.saved))
  f.click('data-dutch-load', historical.d); f.edit('data-dutch-title', undefined, 'edited while load waits'); f.release(); await f.settle(); assert.equal(f.by('data-dutch-title').props.value, 'edited while load waits')
  const before = f.data.get(RECENT); f.click('data-dutch-add-item'); f.click('data-dutch-save'); await f.settle(); assert.equal(f.pending.length, 0); assert.equal(f.data.get(RECENT), before); assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-dutch-item-name')).length, 101); f.cleanup()
})
await check('actual parent account lock edits, unknown writes, two-tab conflict and explicit recheck preserve current input', async () => {
  const f = await parent(); f.hold(true); f.edit('data-dutch-account', undefined, 'first'); f.edit('data-dutch-account', undefined, 'latest'); f.release(); await f.settle(); assert.equal(f.data.get(ACCOUNT), JSON.stringify('SYNTHETIC_ACCOUNT')); f.release(); await f.settle(); assert.equal(f.data.get(ACCOUNT), JSON.stringify('latest'))
  f.edit('data-dutch-account', undefined, 'my draft'); f.data.set(ACCOUNT, JSON.stringify('second tab')); f.storageEvent(ACCOUNT); f.release(); await f.settle(); assert.equal(f.data.get(ACCOUNT), JSON.stringify('second tab')); assert.equal(f.by('data-dutch-account').props.value, 'my draft')
  f.click('data-dutch-account-recheck'); assert.equal(f.by('data-dutch-account').props.value, 'my draft'); assert.equal(f.pending.length, 0); f.click('data-dutch-account-retry'); f.release(); await f.settle(); assert.equal(f.data.get(ACCOUNT), JSON.stringify('my draft'))
  f.hold(false); f.faults.set(ACCOUNT, 'unknown'); f.edit('data-dutch-account', undefined, 'unconfirmed draft'); await f.settle(); assert.equal(f.by('data-dutch-account-status').props['data-dutch-account-status'], 'error'); const count = f.writes.length; f.edit('data-dutch-account', undefined, 'memory latest'); await f.settle(); assert.equal(f.writes.length, count); assert.ok(f.by('data-dutch-notice').props.children.includes('memory latest')); f.cleanup()
})
await check('readonly URL and recent record exclude account, while editable explicit notice includes it', async () => {
  const f = await parent(); assert.ok(f.sharedProps().text.includes('SYNTHETIC_ACCOUNT')); assert.ok(!f.sharedProps().url.includes('SYNTHETIC_ACCOUNT')); f.click('data-dutch-save'); await f.settle(); assert.ok(!f.data.get(RECENT).includes('SYNTHETIC_ACCOUNT'))
  const readonly = await parent({ url: f.sharedProps().url }); assert.equal(readonly.by('data-dutch-root').props['data-dutch-readonly'], true); assert.ok(!readonly.h.all().some(node => Object.hasOwn(node.props, 'data-dutch-account'))); assert.ok(!readonly.sharedProps().text.includes('SYNTHETIC_ACCOUNT')); assert.ok(!readonly.h.all().some(node => Object.hasOwn(node.props, 'data-dutch-save'))); readonly.cleanup(); f.cleanup()
})
await check('actual parent copy targets and A-B-A input/locale feedback never revive old success, failure or timers', async () => {
  const f = await parent(), pending = deferred(); f.writer(() => pending.promise); f.click('data-dutch-copy', 'notice'); f.writer(async () => {}); f.click('data-dutch-copy', 'link'); await f.settle(); pending.reject(new Error('old')); await f.settle(); assert.equal(f.fallback.length, 0); assert.equal(f.by('data-dutch-copy', 'link').props['data-dutch-copied'], true)
  const oldTimer = f.timers.at(-1); f.edit('data-dutch-title', undefined, 'B'); oldTimer.callback(); f.sync(); f.edit('data-dutch-title', undefined, sample().title); assert.equal(f.by('data-dutch-copy', 'link').props['data-dutch-copied'], false)
  f.click('data-dutch-copy', 'notice'); await f.settle(); f.locale('en'); f.locale('ko'); assert.equal(f.by('data-dutch-copy', 'notice').props['data-dutch-copied'], false)
  f.writer(async () => { throw new Error('no clipboard') }); f.legacy(false); f.click('data-dutch-copy', 'notice'); await f.settle(); assert.ok(f.recovery()); const original = f.recovery().snapshot.text; assert.equal(original, f.copied.at(-1)); f.edit('data-dutch-title', undefined, 'B'); f.edit('data-dutch-title', undefined, sample().title); assert.equal(f.recovery(), undefined)
  f.click('data-dutch-copy', 'link'); await f.settle(); f.writer(async () => {}); f.recovery().onRetry(); await f.settle(); assert.equal(f.recovery(), undefined); assert.ok(f.focus.includes('link')); f.cleanup()
})
await check('actual ShareResult and parent clipboard ownership is bidirectional and newer copy cancels old card download', async () => {
  const f = await parent(); await f.mountShare(); const oldParent = deferred(); f.writer(() => oldParent.promise); f.click('data-dutch-copy', 'notice'); f.writer(async () => {}); f.shareClick('copy'); await f.settle(); oldParent.reject(new Error('old parent')); await f.settle(); assert.equal(f.fallback.length, 0); assert.equal(f.recovery(), undefined)
  const oldShare = deferred(); f.writer(() => oldShare.promise); f.shareClick('copy'); f.writer(async () => {}); f.click('data-dutch-copy', 'notice'); await f.settle(); oldShare.reject(new Error('old share')); await f.settle(); assert.equal(f.fallback.length, 0); assert.equal(f.by('data-dutch-copy', 'notice').props['data-dutch-copied'], true)
  const image = deferred(); f.image(() => image.promise); f.shareClick('save'); f.click('data-dutch-copy', 'link'); image.resolve(new Blob(['older'])); await f.settle(); assert.equal(f.downloads.length, 0); f.cleanup()
})
console.log(`Independent DutchPay: ${groups} groups passed`)
