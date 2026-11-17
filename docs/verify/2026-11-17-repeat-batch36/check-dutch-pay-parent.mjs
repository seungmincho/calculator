import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { encodeState, decodeState } from '../../../src/utils/dutchPay.ts'
import { prepareDutchPayRecent, DUTCH_PAY_RECENT_KEY as RECENT, DUTCH_PAY_ACCOUNT_KEY as ACCOUNT } from '../../../src/utils/dutchPayStorage.ts'

const sample = (title = '합성 모임', count = 2) => ({ mode: 's', title, leader: 0, unit: 100, dir: 'ceil', people: [{ name: '같은 이름', weight: 1 }, { name: '같은 이름', weight: 1.5 }], expenses: Array.from({ length: count }, (_, index) => ({ name: `항목${index}`, amount: 12001 + index, payer: 0, among: [0, 1] })) })
const saved = state => { const result = prepareDutchPayRecent(state, 1770000000000); assert.equal(result.ok, true); return result.entry }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let index = 0; index < 24; index++) await Promise.resolve() }
const messages = Object.fromEntries(['ko', 'en'].map(locale => {
  const source = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  Object.assign(source.dutchPay, JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch36/translations-dutch-pay.json', 'utf8'))[locale].dutchPay)
  return [locale, source]
}))

async function fixture({ state = sample(), url = `https://toolhub.ai.kr/dutch-pay/?d=${encodeState(state)}`, data = new Map(), restore = true } = {}) {
  let language = 'ko', clipboard = async () => {}, legacy = false, held = false, frameSeq = 0, shareRender = async () => new Blob(['image'])
  const frames = new Map(), jobs = [], reads = [], writes = [], urlWrites = [], copies = [], fallbacks = [], faults = new Map(), focused = [], nodes = new Map(), timers = [], downloads = []
  const storage = {
    getItem(key) { reads.push(key); const fault = faults.get(key); if (fault === 'get' || fault === 'afterWrite') throw new Error('read denied'); if (fault === 'mismatch') return '"other writer"'; return data.get(key) ?? null },
    setItem(key, value) { const fault = faults.get(key); if (fault === 'quota') throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); writes.push(key); data.set(key, value); if (fault === 'readback') faults.set(key, 'afterWrite') },
  }
  class Field { style = {}; isConnected = true; disabled = false; value = ''; focus() { document.activeElement = this; focused.push(this.id) } select() {} setSelectionRange(start, end) { this.selection = [start, end] } remove() { this.isConnected = false } }
  const document = { activeElement: new Field(), body: { appendChild() {} }, execCommand() { fallbacks.push('copy'); return legacy }, createElement(tag) { if (tag === 'textarea') return new Field(); return { click() { downloads.push(this.download) }, remove() {} } } }
  const navigator = { clipboard: { writeText(value) { copies.push(value); return clipboard(value) } }, locks: { request(key, options, callback) {
    const run = () => { if (options.signal?.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); return callback() }
    return held ? new Promise((resolve, reject) => jobs.push({ key, run() { try { resolve(run()) } catch (error) { reject(error) } } })) : Promise.resolve().then(run)
  } } }
  const translate = namespace => {
    const lookup = key => key.split('.').reduce((result, part) => result?.[part], messages[language][namespace])
    const t = (key, vars = {}) => { const value = lookup(key); assert.equal(typeof value, 'string', `missing ${language}.${namespace}.${key}`); return value.replace(/\{(\w+)\}/g, (_match, name) => String(vars[name] ?? `{${name}}`)) }
    t.raw = lookup; return t
  }
  class LocalURL extends URL { static createObjectURL() { return `blob:parent-${downloads.length}` } static revokeObjectURL() {} }
  const base = {
    url, storagePort: storage, navigator, document,
    modules: { '@/lib/i18n': { useTranslations: translate }, '@/lib/i18n/shared': { useTranslations: translate }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' }, '@/utils/shareCard': { renderShareCard: value => shareRender(value) } },
    globals: { File, HTMLElement: Field, URL: LocalURL, AbortController, atob, btoa, requestAnimationFrame(callback) { const id = ++frameSeq; frames.set(id, callback); return id }, cancelAnimationFrame(id) { frames.delete(id) } },
    beforeEffects(tree) {
      const walk = node => {
        if (Array.isArray(node)) return node.forEach(walk)
        if (!node || typeof node !== 'object') return
        if (node.props?.ref) {
          const id = node.props['data-dutch-copy'] ?? node.props.id ?? `field-${nodes.size}`
          const field = nodes.get(id) ?? new Field(); field.id = id; field.disabled = !!node.props.disabled; field.value = node.props.value; nodes.set(id, field)
          if (typeof node.props.ref === 'function') node.props.ref(field); else node.props.ref.current = field
        }
        walk(node.props?.children)
      }
      walk(tree)
    },
  }
  const h = await componentHarness('src/components/DutchPay.tsx', base)
  const originalReplace = h.window.history.replaceState, originalHistoryState = { framework: 'preserved' }; h.window.history.state = originalHistoryState
  h.window.history.replaceState = (value, title, href) => { urlWrites.push(href); h.window.history.state = value; originalReplace(value, title, href) }
  h.render()
  const boot = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); h.render() }
  if (restore) boot()
  let shared = null
  const shareProps = () => h.all().find(node => node.type === 'ShareResult')?.props
  const mountShare = async () => { shared = await componentHarness('src/components/ShareResult.tsx', { ...base, props: shareProps() }); shared.render(); captureTimers(shared, 'share') }
  const captureTimers = (host, owner) => { const schedule = host.context.setTimeout; host.context.setTimeout = (callback, delay) => { timers.push({ owner, callback, delay }); return schedule(callback, delay) } }
  captureTimers(h, 'parent')
  const sync = () => { h.render(); if (shared && shareProps()) shared.setProps(shareProps()) }
  const by = (key, value) => h.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  const click = (key, value) => { const node = by(key, value); assert.ok(!node.props.disabled, `disabled ${key}`); const pending = node.props.onClick(); sync(); return pending }
  const field = (key, value, next) => { const node = by(key, value); assert.ok(!node.props.disabled); node.props.onChange({ target: { value: next } }); sync() }
  return { h, data, reads, writes, copies, fallbacks, faults, urlWrites, jobs, frames, timers, downloads, focused, shareProps, mountShare, get shared() { return shared }, by, click, field, boot, sync, originalHistoryState,
    async settle() { await flush(); sync() },
    hold(value) { held = value }, release() { const job = jobs.shift(); assert.ok(job); job.run() },
    copy(port) { clipboard = port }, legacy(value) { legacy = value }, image(port) { shareRender = port },
    locale(value) { language = value; sync() },
    event(key) { h.window.dispatch('storage', { key }); sync() },
    shareClick(action) { by('data-dutch-share-boundary').props.onClickCapture(); const button = shared.find(node => node.props['data-share-action'] === action); const result = button.props.onClick(); sync(); return result },
    recovery: () => h.all().find(node => typeof node.type === 'function' && node.type.name === 'DutchPayCopyRecovery')?.props,
    cleanup() { shared?.cleanup(); h.cleanup() },
  }
}

let groups = 0
async function group(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log(`PASS ${name}`) }

await group('URL restoration precedes all actions and legacy reads, preserving query/hash/history without applying recent', async () => {
  const historical = saved(sample('저장된 과거')), data = new Map([[RECENT, JSON.stringify([historical])], [ACCOUNT, '"SYNTHETIC_ACCOUNT"']])
  const source = sample('URL 우선'), url = `https://toolhub.ai.kr/dutch-pay/?d=${encodeState(source)}&utm=x&utm=y#kept`
  const f = await fixture({ url, data, restore: false })
  assert.equal(f.writes.length, 0); assert.equal(f.reads.length, 0); assert.equal(f.urlWrites.length, 0)
  assert.equal(f.by('data-dutch-save').props.disabled, true); f.by('data-dutch-save').props.onClick(); f.by('data-dutch-copy', 'notice').props.onClick(); f.by('data-dutch-title').props.onChange({ target: { value: 'blocked' } }); f.h.render()
  assert.equal(f.copies.length, 0); assert.equal(f.writes.length, 0)
  f.h.replayEffects(); f.h.replayEffects(); assert.equal(f.frames.size, 1); f.boot()
  assert.equal(f.by('data-dutch-title').props.value, source.title); assert.equal(f.by('data-dutch-account').props.value, 'SYNTHETIC_ACCOUNT'); assert.equal(f.writes.length, 0)
  assert.deepEqual(f.h.window.location.searchParams.getAll('utm'), ['x', 'y']); assert.equal(f.h.window.location.hash, '#kept'); assert.equal(f.h.window.history.state, f.originalHistoryState)
  assert.ok(f.by('data-dutch-load', historical.d)); assert.equal(f.data.get(RECENT), JSON.stringify([historical])); f.cleanup()
})

await group('confirmed recent save/delete preserve current form/account; 100 supported and 101 refuses without loss', async () => {
  const f = await fixture({ state: sample('100개', 100) })
  f.field('data-dutch-account', undefined, 'SYNTHETIC_ACCOUNT'); await f.settle()
  f.click('data-dutch-save'); await f.settle()
  const raw = f.data.get(RECENT), savedRecords = JSON.parse(raw)
  assert.equal(decodeState(savedRecords[0].d).expenses.length, 100); assert.equal(raw.includes('SYNTHETIC_ACCOUNT'), false)
  f.click('data-dutch-add-item'); f.click('data-dutch-save'); await f.settle()
  assert.equal(f.data.get(RECENT), raw); assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-dutch-item-name')).length, 101)
  assert.ok(f.h.text().includes(messages.ko.dutchPay.storage.unsupportedState))
  f.click('data-dutch-delete', savedRecords[0].d); await f.settle()
  assert.deepEqual(JSON.parse(f.data.get(RECENT)), []); assert.equal(f.by('data-dutch-title').props.value, '100개'); assert.equal(f.by('data-dutch-account').props.value, 'SYNTHETIC_ACCOUNT')
  f.cleanup()
})

await group('simple rounding and trip settlement retain independently expected transfer amounts', async () => {
  const simple = await fixture()
  simple.click('data-dutch-copy', 'tr0'); await simple.settle()
  // Per-expense largest remainders give 14,402 owed; 100-won ceiling gives 14,500 sent.
  assert.equal(simple.copies.at(-1), '14500'); simple.cleanup()
  const tripState = { ...sample(), mode: 't', people: [{ name: 'A', weight: 1 }, { name: 'B', weight: 1 }], expenses: [{ name: 'shared', amount: 9000, payer: 0, among: [0, 1] }, { name: 'only B', amount: 3000, payer: 1, among: [1] }] }
  const trip = await fixture({ state: tripState }); trip.click('data-dutch-copy', 'tr0'); await trip.settle()
  assert.equal(trip.copies.at(-1), '4500'); trip.click('data-dutch-save'); await trip.settle()
  assert.equal(JSON.parse(trip.data.get(RECENT))[0].total, 12000); trip.cleanup()
})

await group('corrupt keys/quota/readback uncertainty remain separate and never claim a successful save', async () => {
  const f = await fixture({ data: new Map([[RECENT, '{broken']]) })
  f.click('data-dutch-save'); await f.settle(); assert.equal(f.writes.length, 0); assert.equal(f.data.get(RECENT), '{broken')
  f.field('data-dutch-account', undefined, 'MEMORY_AND_SAVED'); await f.settle(); assert.equal(f.data.get(ACCOUNT), '"MEMORY_AND_SAVED"')
  f.data.delete(RECENT); f.click('data-dutch-recent-recheck')
  f.faults.set(RECENT, 'quota'); f.click('data-dutch-save'); await f.settle(); assert.equal(f.by('data-dutch-recent-status').props['data-dutch-recent-status'], 'error'); assert.equal(f.data.has(RECENT), false)
  f.faults.set(RECENT, 'readback'); f.click('data-dutch-save'); await f.settle(); assert.equal(f.data.has(RECENT), true); assert.ok(f.h.text().includes(messages.ko.dutchPay.storage.unconfirmed))
  const count = f.writes.length; f.click('data-dutch-save'); await f.settle(); assert.equal(f.writes.length, count)
  f.faults.delete(RECENT); f.click('data-dutch-recent-recheck'); assert.equal(f.by('data-dutch-title').props.value, '합성 모임'); assert.ok(f.by('data-dutch-load'))
  f.cleanup()
})

await group('latest account edits win held native lock ports and external change requires explicit recheck', async () => {
  const f = await fixture(); f.hold(true)
  f.field('data-dutch-account', undefined, 'OLD'); f.field('data-dutch-account', undefined, 'LATEST')
  assert.equal(f.jobs.length, 2); assert.equal(f.jobs[0].key, ACCOUNT); f.release(); await f.settle(); assert.equal(f.data.has(ACCOUNT), false)
  f.release(); await f.settle(); assert.equal(f.data.get(ACCOUNT), '"LATEST"')
  f.field('data-dutch-account', undefined, 'MY_DRAFT'); f.data.set(ACCOUNT, '"OTHER_TAB"'); f.event(ACCOUNT); f.release(); await f.settle()
  assert.equal(f.data.get(ACCOUNT), '"OTHER_TAB"'); assert.equal(f.by('data-dutch-account').props.value, 'MY_DRAFT')
  f.field('data-dutch-account', undefined, 'NEW_DRAFT'); assert.equal(f.jobs.length, 0)
  f.click('data-dutch-account-recheck'); assert.equal(f.by('data-dutch-account').props.value, 'NEW_DRAFT'); assert.equal(f.jobs.length, 0)
  f.click('data-dutch-account-retry'); f.release(); await f.settle(); assert.equal(f.data.get(ACCOUNT), '"NEW_DRAFT"'); f.cleanup()
})

await group('manual load lock waits cannot overwrite newer edits; same-basis tabs cannot overwrite recent', async () => {
  const old = saved(sample('과거')), data = new Map([[RECENT, JSON.stringify([old])]])
  const a = await fixture({ data }), b = await fixture({ data })
  a.hold(true); a.click('data-dutch-load', old.d); a.field('data-dutch-title', undefined, '최신 폼'); a.release(); await a.settle()
  assert.equal(a.by('data-dutch-title').props.value, '최신 폼')
  a.hold(false); a.click('data-dutch-save'); await a.settle(); const confirmed = data.get(RECENT)
  b.field('data-dutch-title', undefined, '다른 폼'); b.click('data-dutch-save'); await b.settle()
  assert.equal(data.get(RECENT), confirmed); assert.ok(b.h.text().includes(messages.ko.dutchPay.storage.conflict))
  b.click('data-dutch-recent-recheck'); assert.equal(b.by('data-dutch-title').props.value, '다른 폼')
  b.field('data-dutch-account', undefined, 'ACCOUNT_KEPT'); await b.settle(); b.click('data-dutch-load', old.d); await b.settle()
  assert.equal(b.by('data-dutch-title').props.value, '과거'); assert.equal(b.by('data-dutch-account').props.value, 'ACCOUNT_KEPT')
  a.cleanup(); b.cleanup()
})

await group('save captures the clicked settlement while newer form edits suppress stale saved feedback', async () => {
  const f = await fixture(); f.hold(true); f.click('data-dutch-save')
  f.field('data-dutch-title', undefined, '새 폼'); f.release(); await f.settle()
  assert.equal(JSON.parse(f.data.get(RECENT))[0].title, '합성 모임'); assert.equal(f.by('data-dutch-title').props.value, '새 폼')
  assert.equal(f.h.all().some(node => node.props['data-dutch-recent-status'] === 'saved'), false)
  f.field('data-dutch-title', undefined, '합성 모임')
  assert.equal(f.h.all().some(node => node.props['data-dutch-recent-status'] === 'saved'), false)
  f.cleanup()
})

await group('account quota and unknown write keep notice memory and do not auto-retry', async () => {
  const f = await fixture(); f.faults.set(ACCOUNT, 'quota')
  f.field('data-dutch-account', undefined, 'ACCOUNT_MEMORY'); await f.settle()
  assert.ok(f.by('data-dutch-notice').props.children.includes('ACCOUNT_MEMORY')); assert.equal(f.data.has(ACCOUNT), false)
  f.faults.set(ACCOUNT, 'readback'); f.click('data-dutch-account-retry'); await f.settle(); assert.ok(f.h.text().includes(messages.ko.dutchPay.storage.unconfirmed))
  const writes = f.writes.length; f.field('data-dutch-account', undefined, 'NEXT_MEMORY'); await f.settle(); assert.equal(f.writes.length, writes)
  f.faults.delete(ACCOUNT); f.click('data-dutch-account-recheck'); assert.equal(f.by('data-dutch-account').props.value, 'NEXT_MEMORY')
  f.click('data-dutch-account-retry'); await f.settle(); assert.equal(f.data.get(ACCOUNT), '"NEXT_MEMORY"'); f.cleanup()
})

await group('copy failure/full recovery/focus and input-locale A-B-A never revive old token feedback', async () => {
  const f = await fixture()
  f.click('data-dutch-copy', 'notice'); await f.settle(); const oldTimer = f.timers.at(-1)
  f.field('data-dutch-title', undefined, 'B'); f.field('data-dutch-title', undefined, '합성 모임')
  assert.equal(f.by('data-dutch-copy', 'notice').props.children[0].type, 'icon:Copy')
  f.click('data-dutch-copy', 'notice'); await f.settle(); f.locale('en'); f.locale('ko')
  assert.equal(f.by('data-dutch-copy', 'notice').props.children[0].type, 'icon:Copy')
  f.copy(async () => { throw new Error('denied') }); f.legacy(false); f.click('data-dutch-copy', 'notice'); await f.settle()
  assert.equal(f.recovery().snapshot.text, f.by('data-dutch-notice').props.children)
  oldTimer.callback(); f.sync(); assert.ok(f.recovery())
  f.recovery().onClose(); f.sync(); assert.equal(f.recovery(), undefined); assert.equal(f.focused.at(-1), 'notice')
  f.click('data-dutch-copy', 'link'); await f.settle(); f.copy(async () => {}); f.recovery().onRetry(); await f.settle()
  assert.equal(f.recovery(), undefined); assert.equal(f.focused.at(-1), 'link')
  f.click('data-dutch-save'); await f.settle(); assert.equal(f.by('data-dutch-copy', 'link').props.children[0].type, 'icon:Check')
  f.cleanup()
})

await group('actual ShareResult and all local outputs cancel both directions of late copy', async () => {
  for (const local of ['notice', 'link', 'tr0']) for (const reverse of [false, true]) {
    const f = await fixture(); await f.mountShare(); const wait = deferred()
    f.copy(() => wait.promise)
    const old = reverse ? f.shareClick('copy') : f.click('data-dutch-copy', local)
    f.copy(async () => {}); if (reverse) f.click('data-dutch-copy', local); else f.shareClick('copy'); await f.settle()
    wait.reject(new Error('old')); await old; await f.settle()
    assert.equal(f.fallbacks.length, 0); assert.equal(f.recovery(), undefined)
    assert.equal(f.shared.all().some(node => Object.hasOwn(node.props, 'data-share-recovery')), false)
    f.cleanup()
  }
})

await group('ro privacy and legacy URL preserve exact policy; late account/load/copy cannot act after cleanup', async () => {
  const st = sample('보기 전용'), f = await fixture({ url: `https://toolhub.ai.kr/dutch-pay/?d=${encodeState(st)}&ro=1`, data: new Map([[ACCOUNT, '"PRIVATE_ACCOUNT"']]) })
  assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-dutch-account')), false)
  assert.equal(f.by('data-dutch-notice').props.children.includes('PRIVATE_ACCOUNT'), false); assert.equal(f.shareProps().text.includes('PRIVATE_ACCOUNT'), false)
  assert.equal(f.shareProps().url.includes('PRIVATE_ACCOUNT'), false); assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-dutch-save')), false)
  f.click('data-dutch-edit-readonly'); assert.ok(f.by('data-dutch-notice').props.children.includes('PRIVATE_ACCOUNT')); assert.equal(f.shareProps().url.includes('PRIVATE_ACCOUNT'), false)
  f.hold(true); f.field('data-dutch-account', undefined, 'UNMOUNTED'); const wait = deferred(); f.copy(() => wait.promise); f.click('data-dutch-copy', 'notice'); f.cleanup(); f.release(); wait.reject(new Error('unmounted')); await flush()
  assert.equal(f.data.get(ACCOUNT), '"PRIVATE_ACCOUNT"'); assert.equal(f.fallbacks.length, 0)
  const legacy = await fixture({ url: 'https://toolhub.ai.kr/dutch-pay/?total=10001&people=3&keep=yes#old' })
  const restored = decodeState(legacy.h.window.location.searchParams.get('d'))
  assert.equal(restored.people.length, 3); assert.equal(restored.expenses[0].amount, 10001); assert.equal(legacy.h.window.location.searchParams.get('keep'), 'yes'); assert.equal(legacy.h.window.location.hash, '#old'); legacy.cleanup()
})

console.log(`DutchPay actual parent: ${groups} groups PASS; controlled storage/locks/clipboard, no browser or OS share`)
