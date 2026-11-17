import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash, webcrypto } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')), t = messages.ddayCalculator
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve)), observations = []
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-17T00:00:00Z'])) } static now() { return Date.parse('2026-11-17T00:00:00Z') } }
async function parent(copyMode = 'resolve') {
  const copies = [], legacy = [], waiting = deferred(); let field
  const h = await componentHarness('src/components/DdayCalculator.tsx', {
    messages, url: 'https://toolhub.ai.kr/dday-calculator/?mode=dday&date=2028-02-29&title=BASELINE-A',
    globals: { Date: TestDate }, navigator: { clipboard: { writeText(value) { copies.push(value); return copyMode === 'wait' ? waiting.promise : copyMode === 'reject' ? Promise.reject(new Error('denied')) : Promise.resolve() } } },
    document: { body: { appendChild() {}, removeChild() {} }, createElement(tag) { assert.equal(tag, 'textarea'); field = { style: {}, value: '', select() {} }; return field }, execCommand() { legacy.push(field.value); return false } },
    modules: { '@/components/DdayCalendarExport': { __esModule: true, default: 'CalendarExport' }, '@/components/GuideSection': { __esModule: true, default: 'Guide' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
  })
  h.render(); await flush(); h.render()
  return { h, copies, legacy, waiting, copy: () => h.button(t.shareText.copyText).props.onClick(), async settle() { await flush(); h.render() }, cleanup: () => h.cleanup() }
}
{
  const f = await parent(); await f.copy(); await f.settle(); assert.equal(f.copies.length, 1); assert.equal(f.legacy.length, 0); assert.ok(f.h.text().includes(t.shareText.copied))
  observations.push({ boundary: 'normal matching native Clipboard completion', normal: true, copiedFeedback: true, legacyCalls: 0 }); f.cleanup()
}
{
  const f = await parent('reject'); await f.copy(); await f.settle(); assert.equal(f.legacy.length, 1); assert.ok(f.h.text().includes(t.shareText.copied))
  observations.push({ boundary: 'native rejection and execCommand false', problem: true, copiedFeedback: true, legacyReturned: false, outcome: 'success label despite both copy methods failing' }); f.cleanup()
}
{
  const f = await parent('wait'), pending = f.copy(); await f.settle(); const captured = f.copies[0]
  f.h.find(n => n.props.id === 'dday-title').props.onChange({ target: { value: 'BASELINE-B' } }); f.h.render()
  f.h.find(n => n.props.id === 'dday-date').props.onChange({ target: { value: '2029-03-01' } }); f.h.render()
  f.waiting.reject(new Error('old A')); await pending; await f.settle()
  assert.deepEqual(f.legacy, [captured]); assert.ok(f.h.text().includes(t.shareText.copied)); assert.equal(f.h.find(n => n.props.id === 'dday-title').props.value, 'BASELINE-B')
  observations.push({ boundary: 'copy A pending then title/date B then old rejection', problem: true, oldFallbackCalls: f.legacy.length, copiedFeedbackOnB: true, inputPreserved: true }); f.cleanup()
}
async function calendar(change) {
  const wait = deferred(), files = [], urls = [], revoked = []; let digestCalls = 0
  class TestURL extends URL { static createObjectURL(blob) { const url = `blob:baseline-${urls.length}`; urls.push({ url, blob }); return url } static revokeObjectURL(url) { revoked.push(url) } }
  const props = { current: { title: 'OLD;한글', date: '2028-02-29' }, saved: [], savedAvailable: true, readSaved: () => [] }
  const h = await componentHarness('src/components/DdayCalendarExport.tsx', { props, messages,
    globals: { URL: TestURL, crypto: { subtle: { digest(...args) { digestCalls++; return wait.promise.then(() => webcrypto.subtle.digest(...args)) } } } },
    document: { body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'a'); const link = { click() { files.push({ href: link.href, name: link.download }) }, remove() {} }; return link } },
  })
  h.render(); h.button(t.calendarExport.download).props.onClick(); h.render(); assert.equal(digestCalls, 1); assert.equal(files.length, 0)
  if (change === 'edit') h.setProps({ ...props, current: { title: 'NEW', date: '2029-03-01' } })
  if (change === 'unmount') h.cleanup()
  wait.resolve(); for (let i = 0; i < 30 && !files.length; i++) await flush()
  assert.equal(files.length, 1); assert.equal(urls.length, 1)
  const text = await urls[0].blob.text(); assert.ok(text.includes('DTSTART;VALUE=DATE:20280229\r\n')); assert.ok(text.includes('DTEND;VALUE=DATE:20280301\r\n')); assert.ok(text.includes('SUMMARY:OLD\\;한글\r\n')); assert.equal(text.includes('20290301'), false)
  h.tick(1000); assert.deepEqual(revoked, [urls[0].url]); h.cleanup()
  observations.push({ boundary: change === 'none' ? 'normal current ICS real SHA/Blob' : `ICS real SHA pending then ${change}`, normal: change === 'none', problem: change !== 'none', downloads: files.length, filename: files[0].name, originalSnapshotPreserved: true, revoked: revoked.length, outcome: change === 'none' ? 'matching requested file' : 'old clicked file is still submitted after current context changes' })
}
await calendar('none'); await calendar('edit'); await calendar('unmount')
const sources = ['src/components/DdayCalculator.tsx', 'src/components/DdayCalendarExport.tsx']
const report = { kind: 'actual original parent/ICS with controlled I/O; real Web Crypto and Blob; not native browser', sourceSha256: Object.fromEntries(sources.map(path => [path, createHash('sha256').update(fs.readFileSync(path)).digest('hex')])), normal: observations.filter(row => row.normal).length, reproducedProblems: observations.filter(row => row.problem).length, cases: observations }
if (process.argv.includes('--record')) {
  const path = 'docs/verify/2026-11-17-repeat-batch51/before-fix.json'
  if (fs.existsSync(path)) throw new Error('Baseline evidence already exists; do not overwrite')
  fs.writeFileSync(path, JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify(report, null, 2))
