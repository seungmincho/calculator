import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const results = [], messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
const stringify = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(stringify).join(' ') : stringify(node.props?.children)
const deferred = () => { let reject; const promise = new Promise((_yes, no) => { reject = no }); return { promise, reject } }
async function fixture(url = 'https://toolhub.ai.kr/percent-calculator/') {
  const writes = [], pending = [], io = { legacy: [], mode: 'success', selected: '', initialized: false }
  let h
  h = await componentHarness('src/components/PercentCalculator.tsx', { url, messages, modules: { '@/components/GuideSection': { __esModule: true, default: 'GuideSection' } },
    navigator: { clipboard: { writeText(text) { const p = deferred(); pending.push({ text, ...p }); return io.mode === 'pending' ? p.promise : Promise.resolve() } } },
    beforeEffects() { if (io.initialized) return; io.initialized = true; h.window.history.state = { __NA: true, probe: 'keep' }; const replace = h.window.history.replaceState; h.window.history.replaceState = (state, title, next) => { writes.push({ state, url: next }); h.window.history.state = state; replace(state, title, next) } },
    document: { body: { appendChild() {} }, createElement() { return { value: '', style: {}, select() { io.selected = this.value }, remove() {} } }, execCommand() { io.legacy.push(io.selected); return false } },
  }); h.render()
  const field = (id, value) => { h.find(node => node.props.id === `pc-${id}`).props.onChange(value); h.render() }
  const section = id => h.find(node => node.type === 'section' && node.props['aria-labelledby'] === `pc-${id}`)
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
  const copy = id => { all(section(id)).find(node => node.type === 'button' && node.props.title)?.props.onClick(); h.render() }
  return { h, field, section, copy, writes, pending, io, text: id => stringify(section(id)), async settle() { await new Promise(resolve => setImmediate(resolve)); h.render() } }
}
{
  const f = await fixture(); assert.ok(f.text('of').includes('7,500')); f.copy('of'); await f.settle(); assert.equal(f.pending[0].text, '7500')
  results.push({ scenario: 'default percent-of copy', result: 7500 }); f.h.cleanup()
}
{
  const f = await fixture('https://toolhub.ai.kr/percent-calculator/?a=120&b=25&keep=x&keep=y#retain')
  const observed = { scenario: 'shared inputs preserve own values but lose foreign query, hash and history state', a: f.h.find(node => node.props.id === 'pc-a').props.value, b: f.h.find(node => node.props.id === 'pc-b').props.value, url: f.h.window.location.href, state: f.h.window.history.state }
  assert.equal(observed.a, '120'); assert.equal(observed.b, '25'); assert.deepEqual(f.h.window.location.search, '?a=120&b=25'); assert.equal(f.h.window.location.hash, ''); assert.equal(observed.state, null)
  results.push(observed); f.h.cleanup()
}
{
  const f = await fixture(); f.io.mode = 'pending'; f.copy('of'); f.field('a', '100'); f.pending[0].reject(new Error('late denial')); await f.settle()
  assert.deepEqual(f.io.legacy, ['7500']); assert.ok(f.text('of').includes(messages.percentCalculator.copyFailed))
  results.push({ scenario: 'old card copy rejection after input edit', oldFallback: f.io.legacy[0], currentCardShowsOldFailure: true }); f.h.cleanup()
}
{
  const f = await fixture(); f.field('a', '1e308'); f.field('b', '1e308'); f.copy('of'); await f.settle()
  assert.equal(f.pending.at(-1).text, '0')
  results.push({ scenario: 'finite inputs overflow multiplication and are copied as zero', a: '1e308', b: '1e308', copied: f.pending.at(-1).text, visibleStart: f.text('of').slice(0, 80) }); f.h.cleanup()
}
const report = { actualParent: true, controlledIO: true, nativeBrowser: false, sourceSha256: createHash('sha256').update(fs.readFileSync('src/components/PercentCalculator.tsx')).digest('hex'), results }
if (process.argv.includes('--record')) {
  const target = 'docs/verify/2026-11-17-repeat-batch52/before-fix.json'
  if (fs.existsSync(target)) throw new Error('Preserve the original baseline')
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify(report))
