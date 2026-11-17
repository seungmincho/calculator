import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')), t = messages.characterCounter
const draft = () => ({ active: 0, tabs: Array.from({ length: 5 }, (_, i) => ({ title: `Question ${i + 1}`, text: `text-${i + 1}`, target: 500, basis: 'chars' })) })
const KEY = 'characterCounter.v2', observed = []
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
async function fixture({ initial = draft(), controlledMicrotasks = false } = {}) {
  const tasks = [], copied = [], legacy = [], pending = [], io = { mode: 'resolve', fallback: false }, values = new Map([[KEY, JSON.stringify(initial)]])
  let field
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const h = await componentHarness('src/components/CharacterCounter.tsx', { messages, props: {}, storagePort: storage,
    modules: { '@/components/WritingVersionsPanel': { __esModule: true, default: 'WritingVersionsPanel' }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' } },
    globals: controlledMicrotasks ? { queueMicrotask: callback => tasks.push(callback) } : {},
    navigator: { clipboard: { writeText(value) { copied.push(value); if (io.mode === 'reject') return Promise.reject(new Error('denied')); if (io.mode === 'wait') { const job = deferred(); pending.push(job); return job.promise } return Promise.resolve() } } },
    document: { body: { appendChild() {}, removeChild() {} }, createElement(tag) { assert.equal(tag, 'textarea'); field = { value: '', style: {}, select() {} }; return field }, execCommand() { legacy.push(field.value); return io.fallback } },
    window: { confirm: () => true, open: () => ({}) },
  }); h.render()
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); h.render() }
  if (!controlledMicrotasks) await settle()
  const textarea = () => h.find(node => node.type === 'textarea' && node.props['aria-label'] === t.input.aria)
  const edit = async text => { textarea().props.onChange({ target: { value: text } }); h.render(); if (!controlledMicrotasks) await settle() }
  const click = async label => { const result = h.button(label).props.onClick(); await settle(); return result }
  const tab = async index => { h.all().filter(node => node.props.role === 'tab')[index].props.onClick(); await settle() }
  return { h, io, copied, legacy, pending, tasks, values, textarea, edit, click, tab, settle, cleanup: () => h.cleanup() }
}

{
  const f = await fixture(); await f.edit('ordinary copy'); await f.click(t.actions.copy)
  assert.deepEqual(f.copied, ['ordinary copy']); assert.ok(f.h.text().includes(t.actions.copied))
  observed.push({ boundary: 'normal native clipboard resolution', outcome: 'success feedback after matching copy' }); f.cleanup()
}
{
  const f = await fixture(); f.io.mode = 'reject'; await f.click(t.actions.copy)
  assert.deepEqual(f.legacy, ['text-1']); assert.ok(f.h.text().includes(t.actions.copied))
  observed.push({ boundary: 'native reject + legacy false', outcome: 'incorrect copied feedback although both attempts fail', legacyReturned: false }); f.cleanup()
}
{
  const f = await fixture(); f.io.mode = 'wait'; const promise = f.h.button(t.actions.copy).props.onClick(); await f.settle()
  await f.tab(1); f.pending.shift().reject(new Error('late')); await promise; await f.settle()
  assert.equal(f.textarea().props.value, 'text-2'); assert.deepEqual(f.legacy, ['text-1']); assert.ok(f.h.text().includes(t.actions.copied))
  observed.push({ boundary: 'copy A, switch writing tab B, reject old clipboard', outcome: 'old A legacy copy runs and copied feedback appears on B' }); f.cleanup()
}
{
  const f = await fixture({ controlledMicrotasks: true }); await f.edit('early USER input')
  assert.equal(f.textarea().props.value, 'early USER input'); while (f.tasks.length) { f.tasks.shift()(); f.h.render() }
  assert.equal(f.textarea().props.value, 'text-1')
  observed.push({ boundary: 'edit enabled textarea before initial storage microtask', outcome: 'saved draft overwrites early input' }); f.cleanup()
}
{
  const f = await fixture(); await f.edit('lower'); await f.click(t.tools.upper); assert.equal(f.textarea().props.value, 'LOWER')
  await f.edit('new user paragraph'); assert.equal(f.h.button(t.tools.undo).props.disabled, false); await f.click(t.tools.undo)
  assert.equal(f.textarea().props.value, 'lower')
  observed.push({ boundary: 'transform, type new content, undo old transform', outcome: 'new user content is overwritten by unrelated old undo' }); f.cleanup()
}
if (process.argv.includes('--record')) fs.writeFileSync('docs/verify/2026-11-17-repeat-batch48/before-fix.json', JSON.stringify({ kind: 'actual original CharacterCounter handlers with controlled browser ports; not native browser', cases: observed }, null, 2) + '\n')
console.log(JSON.stringify({ cases: observed.length, normal: 1, reproducedIssues: observed.length - 1 }))
