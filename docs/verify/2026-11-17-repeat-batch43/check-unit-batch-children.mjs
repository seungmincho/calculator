import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createUnitCopyController } from '../../../src/utils/unitBatchActions.ts'

const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch43/translations-unit-batch.json', 'utf8'))
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const rowsOf = (text, delimiter) => {
  const rows = []; let row = [], value = '', quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i++) { const c = source[i]
    if (quoted) { if (c === '"' && source[i + 1] === '"') { value += '"'; i++ } else if (c === '"') quoted = false; else value += c }
    else if (c === '"') quoted = true
    else if (c === delimiter) { row.push(value); value = '' }
    else if (c === '\r' || c === '\n') { if (c === '\r' && source[i + 1] === '\n') i++; row.push(value); rows.push(row); row = []; value = '' }
    else value += c
  }
  assert.equal(quoted, false); row.push(value); rows.push(row); return rows
}
async function fixture(locale = 'ko') {
  let state = null, props, sequence = 0
  const messages = fragment[locale], io = { locale, mode: 'resolve' }, texts = [], pending = [], files = [], urls = new Map(), revoked = []
  const owner = createUnitCopyController({ clipboard: { writeText(text) { texts.push(text); if (io.mode === 'wait') { const work = deferred(); pending.push(work); return work.promise } return Promise.resolve() }, fallback: () => { throw new Error('stale fallback') } }, after: () => () => {} }, next => { state = next })
  props = { pair: { c: 'length', f: 'm', t: 'cm', p: 10, rb: 16 }, ready: true, copyState: state, onCopy: request => { void owner.request(request) }, onInvalidateCopy: () => owner.invalidate(), onBeginOutput: () => owner.invalidate() }
  class PortURL extends URL { static createObjectURL(blob) { const url = `blob:unit-${++sequence}`; urls.set(url, blob); return url } static revokeObjectURL(url) { revoked.push(url); urls.delete(url) } }
  const h = await componentHarness('src/components/UnitBatchConverter.tsx', { props, messages, globals: { URL: PortURL }, modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } }, document: {
    body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'a'); return { href: '', download: '', click() { files.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} } },
  } }); h.render()
  const settle = async () => { await flush(); props = { ...props, copyState: state }; h.setProps(props) }
  const attr = (name, value = '') => h.find(node => node.props[name] === value)
  const click = async name => { attr(name).props.onClick(); await settle() }
  const edit = async value => { attr('id', 'unit-batch-input').props.onChange({ target: { value } }); await settle() }
  const set = async changes => { props = { ...props, ...changes }; h.setProps(props); await settle() }
  return { h, io, owner, pending, texts, files, urls, revoked, attr, click, edit, set, settle, cleanup() { h.cleanup(); owner.dispose() } }
}
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
await check('actual child runs only explicitly and preserves prior snapshot through raw/pair edits', async () => {
  const f = await fixture(); assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-unit-batch-result')), false)
  await f.click('data-unit-batch-run'); assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-unit-batch-line')).length, 3); assert.ok(f.h.text().includes('10000 cm'))
  await f.edit('2'); assert.equal(f.attr('data-unit-batch-result').props['data-unit-batch-stale'], true); assert.ok(f.h.text().includes('10000 cm'))
  await f.set({ pair: { c: 'css', f: 'rem', t: 'px', p: 4, rb: 20 } }); await f.click('data-unit-batch-copy'); assert.ok(f.texts.at(-1).includes('\tcm\t'))
  await f.click('data-unit-batch-run'); assert.ok(f.h.text().includes('40 px')); assert.equal(f.attr('data-unit-batch-result').props['data-unit-batch-stale'], false); f.cleanup()
})
await check('actual preview caps at200 while CSV/TSV retain1000 physical rows, blanks, errors and safe cells', async () => {
  const f = await fixture(), lines = Array.from({ length: 1000 }, (_, i) => String(i + 1)); lines[0] = '=2+3'; lines[2] = ''; lines[3] = '1\t2'
  await f.edit(lines.join('\r\n') + '\r\n'); await f.click('data-unit-batch-run')
  assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-unit-batch-line')).length, 200)
  await f.click('data-unit-batch-copy'); const tsv = rowsOf(f.texts.at(-1), '\t'); assert.equal(tsv.length, 1001); assert.ok(tsv.every(row => row.length === 8)); assert.equal(tsv[1][1], "'=2+3"); assert.equal(tsv[3][1], ''); assert.equal(tsv[4][1], "'1\t2"); assert.equal(tsv[1000][3], '100000')
  await f.click('data-unit-batch-csv'); const file = f.files[0], bytes = new Uint8Array(await file.blob.arrayBuffer()); assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]); const csv = rowsOf(await file.blob.text(), ','); assert.deepEqual(csv, tsv); assert.equal(file.name, 'unit-conversion-batch.csv')
  assert.equal(f.urls.size, 1); f.cleanup(); assert.equal(f.urls.size, 0); assert.equal(f.revoked.length, 1)
})
await check('limit errors retain the complete draft and prior result, empty conversion has no export', async () => {
  const f = await fixture(); await f.click('data-unit-batch-run')
  for (const [raw, error] of [['1\n'.repeat(1001), 'tooManyRows'], [' '.repeat(50001), 'tooManyCharacters']]) {
    await f.edit(raw); await f.click('data-unit-batch-run'); assert.equal(f.attr('id', 'unit-batch-input').props.value, raw); assert.equal(f.attr('data-unit-batch-error', error).props.role, 'alert'); assert.ok(f.h.text().includes('10000 cm'))
  }
  await f.click('data-unit-batch-clear'); await f.click('data-unit-batch-run'); assert.equal(f.attr('data-unit-batch-copy').props.disabled, true); assert.equal(f.attr('data-unit-batch-csv').props.disabled, true)
  await f.set({ pair: null }); assert.equal(f.attr('data-unit-batch-run').props.disabled, true); f.cleanup()
})
await check('actual child invalidates pending copy on source/locale ABA and unmount while retaining result', async () => {
  const f = await fixture(); await f.click('data-unit-batch-run'); f.io.mode = 'wait'; await f.click('data-unit-batch-copy'); await f.edit('2'); await f.edit('1\n10\n100'); f.pending.shift().reject(new Error('old input')); await f.settle(); assert.equal(f.owner.getSnapshot(), null)
  await f.click('data-unit-batch-copy'); f.io.locale = 'en'; await f.settle(); f.io.locale = 'ko'; await f.settle(); f.pending.shift().reject(new Error('old language')); await f.settle(); assert.equal(f.owner.getSnapshot(), null)
  await f.click('data-unit-batch-copy'); const pending = f.pending.shift(); f.cleanup(); pending.reject(new Error('unmounted')); await flush(); assert.equal(f.owner.getSnapshot(), null)
})
await check('KO/EN child and recovery preserve full manual text, selection failure and44px/16px controls', async () => {
  for (const locale of ['ko', 'en']) {
    const f = await fixture(locale); assert.ok(f.attr('id', 'unit-batch-input').props.className.includes('text-base')); assert.ok(f.h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); f.cleanup()
    let selected = null, fail = false, retried = 0, closed = 0; const text = 'A\tB\r\n' + '값\n'.repeat(1000)
    const h = await componentHarness('src/components/UnitCopyRecovery.tsx', { props: { text, label: 'TSV', busy: false, onRetry: () => retried++, onClose: () => closed++ }, messages: fragment[locale], beforeEffects(tree) {
      const walk = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (node.type === 'textarea') node.props.ref.current = { focus() {}, select() {}, setSelectionRange(start, end) { if (fail) throw new Error('blocked'); selected = [start, end] } }; walk(node.props?.children) }; walk(tree)
    } }); h.render()
    const attr = name => h.find(node => node.props[name] === ''); assert.equal(attr('data-unit-copy-manual').props.value, text); assert.equal(attr('data-unit-copy-manual').props.readOnly, true)
    attr('data-unit-copy-select').props.onClick(); h.render(); assert.deepEqual(selected, [0, text.length]); fail = true; attr('data-unit-copy-select').props.onClick(); h.render(); assert.ok(h.text().includes(fragment[locale].unitConverter.batchCopy.selectionFailed))
    attr('data-unit-copy-retry').props.onClick(); attr('data-unit-copy-close').props.onClick(); assert.equal(retried, 1); assert.equal(closed, 1); h.cleanup()
  }
})
console.log(`Unit batch unconnected children: ${groups} groups passed`)
