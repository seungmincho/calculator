import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

// Independent assertions; reuse only the generic hook/DOM host, not author tests.
const ko = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')).shareResult
const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8')).shareResult
const initial = () => ({ card: { tool: '독립 합성 도구', label: '선택 A', headline: '17', sub: '설명', rows: [{ label: '항목', value: '17' }] }, text: '명시 공유 문구', fileName: 'independent-card', resultKey: 'A' })
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }
const png = new Blob([new Uint8Array([137, 80, 78, 71, 0, 17])], { type: 'image/png' })

async function fixture(overrides = {}) {
  let messages = ko, imagePort = async () => png, copyPort = async () => {}, sharePort = async () => {}, legacyResult = false
  let createThrows = false, clickThrows = false, selectThrows = false
  const images = [], copies = [], shares = [], legacy = [], urls = [], revoked = [], clicks = [], scheduled = []
  let h
  const field = { value: '', focus() { h.document.activeElement = field }, select() { if (selectThrows) throw new Error('selection denied') }, setSelectionRange(start, end) { field.selection = [start, end] } }
  class TestURL extends URL {
    static createObjectURL(blob) { if (createThrows) throw new Error('url unavailable'); const url = `blob:independent-${urls.length}`; urls.push({ blob, url }); return url }
    static revokeObjectURL(url) { revoked.push(url) }
  }
  const props = { ...initial(), ...overrides }
  h = await componentHarness('src/components/ShareResult.tsx', {
    props, url: 'https://toolhub.ai.kr/synthetic/?condition=A',
    modules: {
      '@/lib/i18n/shared': { useTranslations: () => key => { assert.equal(typeof messages[key], 'string', `missing ${key}`); return messages[key] } },
      '@/utils/shareCard': { renderShareCard: card => { images.push(card); return imagePort(card) } },
    },
    globals: { URL: TestURL, File },
    navigator: {
      clipboard: { writeText: value => { copies.push(value); return copyPort(value) } },
      canShare: () => true,
      share: value => { shares.push(value); return sharePort(value) },
    },
    document: {
      activeElement: null,
      body: { appendChild() {} },
      createElement(tag) { return { tag, style: {}, value: '', focus() { h.document.activeElement = this }, select() {}, setSelectionRange() {}, remove() {}, click() { if (clickThrows) throw new Error('click denied'); clicks.push({ href: this.href, filename: this.download }) } } },
      execCommand(value) { legacy.push(value); if (legacyResult instanceof Error) throw legacyResult; return legacyResult },
    },
    beforeEffects(tree) {
      const walk = node => {
        if (Array.isArray(node)) return node.forEach(walk)
        if (!node || typeof node !== 'object') return
        if (node.type === 'textarea' && node.props.ref) { field.value = node.props.value; node.props.ref.current = field }
        walk(node.props?.children)
      }
      walk(tree)
    },
  })
  const originalSchedule = h.context.setTimeout
  h.context.setTimeout = (callback, delay) => { const id = originalSchedule(callback, delay); scheduled.push({ callback, delay, id }); return id }
  h.render()
  const action = name => h.find(node => node.props?.['data-share-action'] === name)
  return {
    h, props, field, images, copies, shares, legacy, urls, revoked, clicks, scheduled, action,
    image: port => { imagePort = port }, copy: port => { copyPort = port }, share: port => { sharePort = port },
    legacyResult: value => { legacyResult = value }, createThrows: value => { createThrows = value }, clickThrows: value => { clickThrows = value }, selectThrows: value => { selectThrows = value },
    locale: value => { messages = value === 'en' ? en : ko; h.render() },
    pending: () => action('copy').props.disabled === true,
    recovery: () => h.all().some(node => node.props?.['data-share-recovery'] !== undefined),
    run: async name => { const result = action(name).props.onClick(); h.render(); await result; await flush(); h.render() },
  }
}

const results = []
async function group(name, check) { await check(); results.push(name); console.log(`PASS ${name}`) }

await group('semantic identity, Strict replay and A-B-A never resurrect an old scope', async () => {
  const f = await fixture()
  f.h.replayEffects(); f.h.replayEffects()
  const wait = deferred(); f.image(() => wait.promise)
  const save = f.action('save').props.onClick(); f.h.render()
  f.h.setProps(structuredClone(f.props))
  wait.resolve(png); await save; f.h.render()
  assert.equal(f.clicks.length, 1)
  assert.equal(f.clicks[0].filename, 'independent-card.png')
  const late = deferred(); f.image(() => late.promise)
  const old = f.action('save').props.onClick(); f.h.render()
  f.h.setProps({ ...f.props, resultKey: 'B' }); f.h.setProps(structuredClone(f.props))
  late.resolve(png); await old; f.h.render()
  assert.equal(f.clicks.length, 1); assert.equal(f.pending(), false)
  // The development mount replay above precedes events, as it does in React.
  f.copy(async () => {}); await f.run('copy'); assert.ok(f.h.text().includes(ko.copied))
  f.h.cleanup()
})

await group('every declared meaning field and locale invalidate pending copy; snapshot rows are detached', async () => {
  const changes = [
    p => ({ ...p, card: { ...p.card, tool: '다른 도구' } }),
    p => ({ ...p, card: { ...p.card, label: '선택 B' } }),
    p => ({ ...p, card: { ...p.card, headline: '18' } }),
    p => ({ ...p, card: { ...p.card, sub: '다른 설명' } }),
    p => ({ ...p, card: { ...p.card, cta: '다른 CTA' } }),
    p => ({ ...p, card: { ...p.card, rows: [{ label: '항목', value: '18' }] } }),
    p => ({ ...p, url: 'https://toolhub.ai.kr/synthetic/?condition=B' }),
    p => ({ ...p, text: '다른 공유 문구' }),
    p => ({ ...p, fileName: 'new-card' }),
    p => ({ ...p, resultKey: 'B' }),
  ]
  for (const change of changes) {
    const f = await fixture(), wait = deferred(); f.copy(() => wait.promise)
    const pending = f.action('copy').props.onClick(); f.h.render(); f.h.setProps(change(f.props))
    assert.equal(f.pending(), false)
    wait.reject(new Error('late')); await pending; f.h.render()
    assert.equal(f.legacy.length, 0); assert.equal(f.recovery(), false); f.h.cleanup()
  }
  const f = await fixture(), wait = deferred(); f.image(() => wait.promise)
  const pending = f.action('save').props.onClick(); f.h.render()
  f.props.card.rows[0].value = 'mutated after click'
  assert.equal(f.images[0].rows[0].value, '17'); assert.equal(Object.isFrozen(f.images[0].rows[0]), true)
  f.locale('en'); wait.resolve(png); await pending; f.h.render()
  assert.equal(f.urls.length, 0); assert.equal(f.pending(), false); f.h.cleanup()
})

await group('default URL-only changes release pending after late completion without mixed links', async () => {
  for (const kind of ['copy', 'save', 'share']) {
    const f = await fixture(), wait = deferred()
    if (kind === 'copy') f.copy(() => wait.promise); else f.image(() => wait.promise)
    const pending = f.action(kind).props.onClick(); f.h.render()
    f.h.window.history.replaceState(null, '', '?condition=B')
    wait.resolve(kind === 'copy' ? undefined : png); await pending; f.h.render()
    assert.equal(f.pending(), false); assert.equal(f.shares.length, 0); assert.equal(f.urls.length, 0); assert.equal(f.legacy.length, 0)
    f.copy(async () => {}); await f.run('copy')
    assert.equal(f.copies.at(-1), 'https://toolhub.ai.kr/synthetic/?condition=B')
    f.h.cleanup()
  }
})

await group('native file/text snapshots, absent share, AbortError and ordinary failures stay distinct', async () => {
  const f = await fixture({ url: 'https://toolhub.ai.kr/synthetic/?literal=%3Ctag%3E' })
  await f.run('share')
  const shared = f.shares[0]
  assert.equal(shared.title, f.props.card.tool)
  assert.equal(shared.text, `${f.props.text}\n${f.props.url}`)
  assert.equal(shared.files[0].name, 'independent-card.png')
  assert.deepEqual(new Uint8Array(await shared.files[0].arrayBuffer()), new Uint8Array(await png.arrayBuffer()))
  assert.equal(f.copies.length, 0)
  delete f.h.context.navigator.canShare
  await f.run('share'); assert.equal(f.shares[1].url, f.props.url); assert.equal(f.shares[1].text, f.props.text); assert.equal(f.shares[1].files, undefined)
  f.share(async () => { throw Object.assign(new Error('cancel'), { name: 'AbortError' }) })
  await f.run('share'); assert.equal(f.copies.length, 0); assert.equal(f.recovery(), false); assert.equal(f.pending(), false)
  f.share(async () => { throw new Error('native failed') }); await f.run('share')
  assert.equal(f.copies.length, 1); assert.equal(f.copies[0], f.props.url)
  f.image(async () => { throw new Error('render failed') }); await f.run('share')
  assert.equal(f.copies.length, 2)
  const imagesBefore = f.images.length; delete f.h.context.navigator.share; await f.run('share')
  assert.equal(f.images.length, imagesBefore); assert.equal(f.copies.length, 3)
  f.h.cleanup()
})

await group('full literal manual recovery, failed selection, retry and captured closed handlers', async () => {
  const url = `https://toolhub.ai.kr/synthetic/?names=${encodeURIComponent('<script>한글 & 이름</script>'.repeat(80))}`
  const f = await fixture({ url }); f.copy(async () => { throw new Error('denied') })
  await f.run('copy'); assert.equal(f.recovery(), true)
  const text = f.h.find(node => node.type === 'textarea')
  assert.equal(text.props.value, url); assert.equal(text.props.readOnly, true)
  f.selectThrows(true); await f.run('select'); assert.ok(f.h.text().includes(ko.selectionFailed))
  f.selectThrows(false); await f.run('select'); assert.deepEqual(f.field.selection, [0, url.length])
  assert.equal(f.h.document.activeElement, f.field)
  const oldRetry = f.action('retry').props.onClick
  await f.run('close'); assert.equal(f.recovery(), false)
  const before = f.copies.length; await oldRetry(); assert.equal(f.copies.length, before)
  await f.run('copy'); f.copy(async () => {}); await f.run('retry')
  assert.equal(f.recovery(), false); assert.ok(f.h.text().includes(ko.copied)); assert.equal(f.copies.at(-1), url)
  f.h.cleanup()
})

await group('cross-action late rejection and old success timers cannot overwrite the latest view', async () => {
  const f = await fixture(), first = deferred(); f.copy(() => first.promise)
  const old = f.action('copy').props.onClick(); f.h.render()
  // Invoke a previously captured event as a race, bypassing disabled presentation deliberately.
  f.copy(async () => {}); await f.run('copy')
  const oldTimer = f.scheduled.filter(timer => timer.delay === 2000).at(-1).callback
  first.reject(new Error('late denied')); await old; f.h.render()
  assert.equal(f.legacy.length, 0); assert.ok(f.h.text().includes(ko.copied))
  f.copy(async () => { throw new Error('new denied') }); await f.run('copy')
  oldTimer(); f.h.render(); assert.equal(f.recovery(), true)
  const native = deferred(); f.share(() => native.promise)
  const pending = f.action('share').props.onClick(); await flush(); f.h.render()
  f.h.cleanup(); native.reject(new Error('late native')); await pending
  assert.equal(f.legacy.length, 1); assert.equal(f.copies.length, 3)
})

await group('30-second download ownership survives edits and cleanup releases each URL once', async () => {
  const f = await fixture()
  await f.run('save'); assert.equal(f.urls.length, 1); assert.equal(f.revoked.length, 0)
  f.h.setProps({ ...f.props, resultKey: 'B' }); assert.equal(f.revoked.length, 0)
  await f.run('save'); assert.equal(f.urls.length, 2)
  const releases = f.scheduled.filter(timer => timer.delay === 30000)
  assert.equal(releases.length, 2)
  releases[0].callback(); assert.deepEqual(f.revoked, [f.urls[0].url])
  f.h.cleanup(); assert.deepEqual(f.revoked, f.urls.map(item => item.url))
  releases[0].callback(); releases[1].callback(); assert.equal(f.revoked.length, 2)
  const failure = await fixture(); failure.clickThrows(true); await failure.run('save')
  assert.equal(failure.urls.length, 1); assert.equal(failure.revoked.length, 1); assert.ok(failure.h.text().includes(ko.saveFailed))
  failure.clickThrows(false); failure.createThrows(true); await failure.run('save')
  assert.equal(failure.urls.length, 1); assert.equal(failure.pending(), false)
  failure.createThrows(false); await failure.run('save'); assert.equal(failure.clicks.length, 1)
  failure.h.cleanup(); assert.equal(failure.revoked.length, 2)
})

console.log(JSON.stringify({ groups: results.length, result: 'PASS', scope: 'actual component and actions, controlled hooks/IO; no native OS share, browser or real PNG rendering' }, null, 2))
