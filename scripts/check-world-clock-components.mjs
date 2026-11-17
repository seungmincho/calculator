import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { webcrypto } from 'node:crypto'
const require = createRequire(import.meta.url)
const { componentHarness } = require('../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const catalog = language => merge(JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch27/translations-world-clock-meeting.json', 'utf8'))[language])
const url = (cities, instant) => `https://toolhub.ai.kr/world-clock/?cities=${encodeURIComponent(cities)}&at=${Date.parse(instant) / 1000}&keep=yes#meeting`
const has = (node, key) => Object.hasOwn(node.props, key)
async function fixture(options = {}) {
  let clock = Date.parse('2026-11-19T03:30:47.987Z'), language = options.language ?? 'ko', fallback = false, fallbackCalls = 0, selected = '', saveFails = false
  let copy = async () => {}, digest = input => webcrypto.subtle.digest('SHA-256', input)
  const messages = catalog(language), copies = [], saved = [], blobs = new Map(), revoked = []
  class FixedDate extends Date { static now() { return clock } }
  class Field { style = {}; value = ''; focus() {} select() { selected = this.value } setSelectionRange() {} remove() {} }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => { const value = `blob:meeting-${blobs.size}`; blobs.set(value, blob); return value }
  LocalURL.revokeObjectURL = value => revoked.push(value)
  const h = await componentHarness('src/components/WorldClock.tsx', {
    props: {}, messages, url: options.url ?? url('seoul,newYork', '2026-11-19T03:30:47Z'), hydrated: options.hydrated ?? true,
    storage: options.storage ?? {}, globals: { Date: FixedDate, ArrayBuffer, HTMLElement: Field, URL: LocalURL, crypto: { subtle: { digest(_algorithm, input) { return digest(input) } } } },
    modules: { '@/contexts/LanguageContext': { useLanguage: () => ({ language }) }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    navigator: { clipboard: { writeText(text) { copies.push(text); return copy(text) } } },
    document: { activeElement: new Field(), body: { appendChild() {} }, execCommand() { fallbackCalls++; return fallback }, createElement(tag) {
      if (tag === 'textarea') return new Field()
      return { click() { if (saveFails) throw new Error('denied'); saved.push({ url: this.href, filename: this.download }) }, remove() {} }
    } }, beforeEffects(tree) {
      const visit = value => { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) { value.forEach(visit); return }
        if (value.props?.id === 'world-clock-copy-manual') { const field = new Field(); field.value = value.props.value; value.props.ref.current = field }
        visit(value.props?.children)
      }; visit(tree)
    },
  })
  h.render()
  const by = (key, value) => h.find(node => has(node, key) && (value === undefined || node.props[key] === value))
  const change = (key, value) => { by(key).props.onChange({ target: { value } }); h.render() }
  const click = (key, value) => { by(key, value).props.onClick(); h.render() }
  const instant = () => by('data-world-selected-ms').props['data-world-selected-ms']
  const share = () => by('data-world-share-text').props.value
  const slots = city => h.all().filter(node => node.props['data-world-slot-city'] === city)
  return { h, by, click, change, instant, share, slots, messages, copies, saved, blobs, revoked,
    setClock(value) { clock = value }, tick() { h.tick(1000) },
    locale(value) { language = value; messages.worldClock = catalog(value).worldClock; h.render() },
    copyPort(value) { copy = value }, digestPort(value) { digest = value }, fallback(value) { fallback = value }, fallbackCalls: () => fallbackCalls, selected: () => selected, failSave(value) { saveFails = value },
    navigate(next) { h.window.history.replaceState({ preserved: true }, '', next); h.window.dispatch('popstate'); h.render() },
    async export() { click('data-world-calendar-download'); for (let i = 0; i < 8; i++) await flush(); h.render() },
  }
}
let groups = 0
const check = async (name, run) => { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

await check('hydration restores exact URL before sync; reordered cities and clocks retain selected seconds', async () => {
  const original = url('seoul,newYork', '2026-11-19T03:30:47Z'), f = await fixture({ url: original, hydrated: false, storage: { 'worldClock.cities': 'tokyo' } })
  assert.equal(f.h.window.location.href, original); assert.ok(!f.h.all().some(n => has(n, 'data-world-selected-ms')))
  f.h.setHydrated(true); const at = Date.parse('2026-11-19T03:30:47Z')
  assert.equal(f.instant(), at); assert.match(f.share(), /12:30:47/); assert.match(f.share(), /22:30:47/)
  assert.equal(f.h.find(n => n.type === 'MobileResultLink').props.href, '#world-clock-selected'); assert.equal(f.h.find(n => n.type === 'MobileResultLink').props.value, '12:30:47')
  assert.ok(f.by('data-world-selected-ms').props.className.includes('scroll-mt-20'))
  f.click('data-world-move', 'newYork:up'); assert.equal(f.instant(), at); assert.equal(f.by('data-world-date').props.value, '2026-11-18')
  assert.equal(f.h.window.location.search.includes(`at=${at / 1000}`), true); assert.equal(f.h.window.location.hash, '#meeting'); assert.equal(f.h.window.location.search.includes('keep=yes'), true)
  const shared = f.h.find(n => n.type === 'ShareResult').props
  assert.ok(shared.card.headline.includes('22:30:47')); assert.equal(shared.text, f.share()); assert.equal(new URL(shared.url).searchParams.get('at'), String(at / 1000))
  f.setClock(Date.parse('2027-01-01T05:01:01.456Z')); f.tick(); assert.equal(f.instant(), at)
  f.click('data-world-now'); assert.equal(f.instant(), Date.parse('2027-01-01T05:01:01Z'))
  f.h.cleanup()
})

await check('NY fold both occurrences remain distinct, exact 23/25-hour and Lord Howe partial slots', async () => {
  for (const [stamp, offset, selectedIndex] of [['2026-11-01T05:30:17Z', 'UTC-04:00', 1], ['2026-11-01T06:30:17Z', 'UTC-05:00', 2]]) {
    const f = await fixture({ url: url('newYork', stamp) }); assert.equal(f.instant(), Date.parse(stamp))
    assert.match(f.share(), /01:30:17/); assert.ok(f.share().includes(offset)); assert.equal(f.slots('newYork').length, 25)
    assert.equal(f.slots('newYork').find(n => n.props['aria-pressed']).props['data-world-slot'], selectedIndex)
    assert.equal(f.by('data-world-day-ms').props['data-world-day-ms'], 25 * 3600000); f.h.cleanup()
  }
  for (const [city, stamp, hours, count] of [['newYork', '2026-03-08T16:00:00Z', 23, 23], ['Australia/Lord_Howe', '2026-04-05T00:00:00Z', 24.5, 25], ['Australia/Lord_Howe', '2026-10-04T00:00:00Z', 23.5, 24]]) {
    const f = await fixture({ url: url(city, stamp) }); assert.equal(f.by('data-world-day-ms').props['data-world-day-ms'], hours * 3600000); assert.equal(f.slots(city).length, count)
    if (city.startsWith('Australia')) assert.equal(f.slots(city).at(-1).props['data-world-slot-duration'], 1800000)
    f.h.cleanup()
  }
})

await check('exact work boundaries preserve minute/second overlap and explicit date selection differs from slot highlight', async () => {
  const f = await fixture({ url: url('seoul,kathmandu', '2026-11-19T03:30:47Z') }), original = f.instant()
  assert.equal(f.by('data-world-overlap-total').props['data-world-overlap-total'], 5.75 * 3600000)
  const first = f.by('data-world-overlap-start'); assert.equal(first.props['data-world-overlap-start'], Date.parse('2026-11-19T03:15:00Z'))
  f.by('data-world-work', 'end').props.onChange({ target: { value: '17' } }); f.h.render(); assert.equal(f.instant(), original)
  f.change('data-world-date', '2026-11-20'); assert.equal(f.instant(), Date.parse('2026-11-20T03:15:00Z'))
  const selected = f.slots('seoul').find(n => n.props['aria-pressed']); assert.equal(selected.props['data-world-slot-ms'], Date.parse('2026-11-20T03:00:00Z'))
  selected.props.onClick(); f.h.render(); assert.equal(f.instant(), Date.parse('2026-11-20T03:00:00Z')); f.h.cleanup()
  const old = await fixture({ url: url('Etc/UTC,paris', '1900-01-01T09:00:00Z') })
  assert.ok(old.share().includes('09:09:21 UTC+00:09:21')); assert.equal(old.by('data-world-overlap-end').props['data-world-overlap-end'], Date.parse('1900-01-01T17:50:39Z'))
  assert.ok(old.h.text().includes('17:50:39')); old.h.cleanup()
})

await check('bad URL/strict dates/city cap/all-city and end bounds fail explicitly without losing a valid instant', async () => {
  for (const raw of ['NaN', 'Infinity', '1.2', '99999999999999999']) {
    const f = await fixture({ url: `https://toolhub.ai.kr/world-clock/?cities=bad,seoul,seoul&at=${raw}` })
    assert.ok(f.by('data-world-url-notice')); assert.equal(f.h.all().filter(n => has(n, 'data-world-city')).length, 1); assert.ok(Number.isSafeInteger(f.instant())); f.h.cleanup()
  }
  const zero = await fixture({ url: 'https://toolhub.ai.kr/world-clock/?cities=Etc%2FUTC&at=0' }); assert.equal(zero.instant(), 0); zero.h.cleanup()
  const many = await fixture({ url: url('seoul,tokyo,osaka,beijing,shanghai,hongKong,taipei,manila,singapore,kualaLumpur,bangkok,hanoi,hoChiMinh', '2026-11-19T03:30:47Z') })
  assert.equal(many.h.all().filter(n => has(n, 'data-world-city')).length, 12); assert.equal(new URLSearchParams(many.h.window.location.search).get('cities').split(',').length, 12); many.h.cleanup()
  const f = await fixture({ url: url('Pacific/Apia', '2011-12-29T20:00:00Z') }), before = f.instant()
  f.change('data-world-date', '2011-12-30'); assert.equal(f.instant(), before); assert.ok(f.by('data-world-error')); assert.equal(f.by('data-world-calendar-download').props.disabled, true)
  f.change('data-world-date', '2028-02-30'); assert.equal(f.instant(), before); assert.ok(f.by('data-world-error')); f.h.cleanup()
  const edge = await fixture({ url: url('Etc/UTC', '9999-12-31T23:30:47Z') })
  edge.change('data-world-event-title', 'edge'); await edge.export(); assert.equal(edge.saved.length, 0); assert.ok(edge.h.text().includes(edge.messages.worldClock.meetingCalendar.errors.end))
  edge.h.find(n => n.type === 'input' && n.props['aria-label'] === edge.messages.worldClock.search).props.onChange({ target: { value: 'seoul' } }); edge.h.render(); edge.click('data-world-add', 'seoul')
  assert.equal(edge.instant(), Date.parse('9999-12-31T23:30:47Z')); assert.equal(edge.h.all().filter(n => has(n, 'data-world-city')).length, 1); assert.ok(edge.by('data-world-error')); edge.h.cleanup()
})

await check('actual ICS download has click snapshot, exact UTC seconds, stable UID and valid Korean folding', async () => {
  const f = await fixture(), title = '미팅😀,세미콜론;역슬래시\\ 줄바꿈\nBEGIN:VEVENT'
  f.change('data-world-event-title', title); f.change('data-world-duration', '90'); await f.export()
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].filename, 'toolhub-world-clock-meeting.ics')
  const text = await f.blobs.get(f.saved[0].url).text(), unfolded = text.replace(/\r\n /g, '')
  assert.ok(unfolded.includes('DTSTART:20261119T033047Z\r\n')); assert.ok(unfolded.includes('DTEND:20261119T050047Z\r\n'))
  assert.equal(unfolded.split('\r\n').filter(line => line === 'BEGIN:VEVENT').length, 1)
  assert.ok(unfolded.includes('SUMMARY:미팅😀\\,세미콜론\\;역슬래시\\\\ 줄바꿈\\nBEGIN:VEVENT'))
  assert.ok(text.split('\r\n').every(line => Buffer.byteLength(line) <= 75)); assert.ok(!text.includes('TZID='))
  const uid = unfolded.match(/^UID:(.+)$/m)[1]; f.click('data-world-move', 'newYork:up'); f.locale('en'); await f.export()
  const again = await f.blobs.get(f.saved[1].url).text(); assert.equal(again.replace(/\r\n /g, '').match(/^UID:(.+)$/m)[1], uid)
  assert.ok(f.share().startsWith('New York:')); assert.equal(f.by('data-world-event-title').props.value, title)
  assert.deepEqual([...f.h.stored.keys()], ['worldClock.cities']); assert.ok(!f.h.window.location.href.includes('BEGIN')); assert.ok(![...f.h.stored.values()].join().includes(title))
  f.h.tick(1000); assert.equal(f.revoked.length, 2); f.h.cleanup()
})

await check('slow digest input/city/locale roundtrip/unmount invalidation blocks automatic old downloads; explicit failure retry survives', async () => {
  for (const change of ['title', 'duration', 'date', 'city', 'work', 'localeRoundtrip', 'unmount']) {
    const f = await fixture(), pending = defer(); f.change('data-world-event-title', 'meeting'); f.digestPort(() => pending.promise)
    f.click('data-world-calendar-download')
    if (change === 'title') f.change('data-world-event-title', 'new')
    if (change === 'duration') f.change('data-world-duration', '30')
    if (change === 'date') f.change('data-world-date', '2026-11-20')
    if (change === 'city') f.click('data-world-move', 'newYork:up')
    if (change === 'work') { f.by('data-world-work', 'end').props.onChange({ target: { value: '17' } }); f.h.render() }
    if (change === 'localeRoundtrip') { f.locale('en'); f.locale('ko') }
    if (change === 'unmount') f.h.cleanup()
    pending.resolve(new ArrayBuffer(32)); await flush(); if (change !== 'unmount') f.h.render()
    assert.equal(f.saved.length, 0, change); if (change !== 'unmount') f.h.cleanup()
  }
  const f = await fixture(); f.change('data-world-event-title', 'kept'); f.failSave(true); await f.export(); assert.equal(f.saved.length, 0)
  assert.equal(f.by('data-world-calendar-status').props['data-world-calendar-status'], 'failed'); assert.equal(f.by('data-world-event-title').props.value, 'kept')
  f.failSave(false); await f.export(); assert.equal(f.saved.length, 1); f.h.cleanup()
})

await check('Clipboard false/manual select/retry and stale resolution/rejection preserve exact snapshot without false success', async () => {
  const f = await fixture(), exact = f.share(); f.copyPort(async () => { throw new Error('denied') }); f.fallback(false)
  f.click('data-world-copy', 'line'); await flush(); f.h.render(); assert.equal(f.by('data-world-copy-recovery').type, 'section')
  const manual = f.h.find(n => n.props.id === 'world-clock-copy-manual'); assert.equal(manual.props.value, exact); assert.equal(manual.props.readOnly, true)
  f.h.button(f.messages.worldClock.copyRecovery.selectAll).props.onClick(); assert.equal(f.selected(), exact)
  f.fallback(true); f.h.button(f.messages.worldClock.copyRecovery.retry).props.onClick(); await flush(); f.h.render(); assert.ok(!f.h.all().some(n => has(n, 'data-world-copy-recovery')))
  for (const result of ['resolve', 'reject']) {
    const pending = defer(); f.copyPort(() => pending.promise); f.click('data-world-copy', 'share'); const attempts = f.fallbackCalls()
    f.click('data-world-now'); if (result === 'resolve') pending.resolve(); else pending.reject(new Error('old'))
    await flush(); f.h.render(); assert.equal(f.fallbackCalls(), attempts); assert.ok(!f.h.text().includes(f.messages.worldClock.copied))
  }
  f.h.cleanup()
})

await check('same-query hash navigation preserves private title; external actual URL restores seconds and permits fresh copying', async () => {
  const f = await fixture(); f.change('data-world-event-title', 'private title'); const before = f.instant()
  f.navigate(f.h.window.location.href.replace('#meeting', '#other')); assert.equal(f.instant(), before); assert.equal(f.by('data-world-event-title').props.value, 'private title')
  f.navigate(url('newYork', '2026-11-01T06:30:17Z')); assert.equal(f.instant(), Date.parse('2026-11-01T06:30:17Z')); assert.equal(f.by('data-world-event-title').props.value, 'private title')
  f.click('data-world-copy', 'share'); await flush(); f.h.render(); assert.ok(f.copies.at(-1).includes('01:30:17 UTC-05:00')); assert.ok(f.copies.at(-1).includes('at=1793514617'))
  f.h.cleanup()
})
console.log(`World Clock actual parent: ${groups} groups passed; no browser`)
