import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { parseAmount, toKoreanReading } from '../../../src/utils/numberToKorean.ts'
import { addNumberQuickAmount, formatNumberOnBlur } from '../../../src/utils/numberToKoreanEditing.ts'

// Only the generic host is shared. Fixtures, event sequences and export/number oracles are independent.
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const messagesFor = locale => {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch34/translations-number.json', 'utf8'))
  Object.assign(messages.numberToKorean, patch[locale].numberToKorean); return messages
}
async function fixture(query = '', hydrated = true) {
  const writes = [], legacyWrites = [], delayed = [], timers = [], microtasks = [], files = [], urls = new Map(), replaced = [], messages = messagesFor('ko')
  const io = { mode: 'resolve', legacy: false, locale: 'ko', focusAction: null }, marker = { framework: { tree: 'preserve' } }, field = { isConnected: true, focus() {} }
  let selected = null, sequence = 0
  class TestURL extends URL { static createObjectURL(blob) { const url = `blob:independent-${++sequence}`; urls.set(url, blob); return url } static revokeObjectURL(url) { urls.delete(url) } }
  const globals = { URL: TestURL, queueMicrotask: callback => microtasks.push(callback), setTimeout: (callback, delay) => { const timer = { id: ++sequence, callback, delay, canceled: false }; timers.push(timer); return timer.id }, clearTimeout: id => { const timer = timers.find(timer => timer.id === id); if (timer) timer.canceled = true } }
  const navigator = { clipboard: { writeText: text => { writes.push(text); if (io.mode === 'reject') return Promise.reject(new Error('denied')); if (io.mode === 'wait') { const job = deferred(); delayed.push(job); return job.promise } return Promise.resolve() } } }
  const document = { activeElement: null, body: { appendChild() {} }, createElement(tag) {
    if (tag === 'a') return { href: '', download: '', click() { files.push({ name: this.download, blob: urls.get(this.href) }) }, remove() {} }
    if (tag !== 'textarea') throw new Error('Unexpected host element')
    selected = { value: '', style: {}, focus() { io.focusAction?.() }, select() {}, setSelectionRange() {}, remove() {} }; return selected
  }, execCommand() { legacyWrites.push(selected.value); if (io.legacy === 'throw') throw new Error('legacy'); return io.legacy } }
  const modules = { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } }
  const h = await componentHarness('src/components/NumberToKorean.tsx', { props: {}, url: `https://toolhub.ai.kr/number-to-korean/?campaign=one&campaign=two${query ? '&' + query : ''}#preserved`, hydrated, messages, globals, navigator, document,
    beforeEffects(tree) { nodes(tree).find(node => node.props.id === 'ntk-input').props.ref.current = field }, modules })
  h.window.history.state = marker
  const replace = h.window.history.replaceState
  h.window.history.replaceState = (state, title, url) => { replaced.push({ state, url: String(url) }); h.window.history.state = state; replace(state, title, url) }
  h.render()
  const batchProps = () => h.find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'copyState') && Object.hasOwn(node.props, 'spacing')).props
  const b = await componentHarness('src/components/NumberToKoreanBatch.tsx', { props: batchProps(), messages, globals, navigator, document, modules }); b.render()
  const settle = async () => { for (let i = 0; i < 6; i++) { for (const job of microtasks.splice(0)) job(); await Promise.resolve(); h.render(); b.setProps(batchProps()) } }
  const find = (host, attribute, value = true) => host.find(node => node.props[attribute] === value)
  const input = () => find(h, 'id', 'ntk-input'), batchInput = () => find(b, 'id', 'number-batch-input')
  const change = (raw, composing = false) => input().props.onChange({ target: { value: raw }, nativeEvent: { isComposing: composing } })
  const edit = async (raw, composing = false) => { change(raw, composing); await settle() }
  const editBatch = async raw => { batchInput().props.onChange({ target: { value: raw } }); await settle() }
  const click = async (attr, value = true, host = h) => { find(host, attr, value).props.onClick(); await settle() }
  const copy = target => click('data-number-copy', target, target === 'batch' ? b : h)
  const recovery = () => [...h.all(), ...b.all()].find(node => typeof node.type === 'function' && Object.hasOwn(node.props, 'onRetry'))
  return { h, b, io, field, navigator, writes, legacyWrites, delayed, timers, files, replaced, marker, messages, input, change, edit, editBatch, click, copy, find, settle, recovery,
    cleanup() { b.cleanup(); h.cleanup() } }
}

// Independent delimited-text state machine. It does not call the product's converter/serializer.
function readDelimited(source, delimiter) {
  const text = source.replace(/^\uFEFF/, ''), rows = []; let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false; else cell += c; continue }
    if (c === '"' && cell === '') quoted = true
    else if (c === delimiter) { row.push(cell); cell = '' }
    else if (c === '\r' || c === '\n') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  assert.equal(quoted, false); row.push(cell); rows.push(row); return rows
}

const checks = [], test = (name, run) => checks.push({ name, run })
test('independent exact20-digit expectations and BigInt quick-add oracle retain legacy negative semantics', () => {
  const samples = [
    ['10000000000000000000', '천경'],
    ['10000000000000000001', '천경일'],
    ['12345678901234567890', '천이백삼십사경오천육백칠십팔조구천십이억삼천사백오십육만칠천팔백구십'],
  ]
  for (const [raw, expected] of samples) { assert.equal(parseAmount(raw).int, raw); assert.equal(toKoreanReading(parseAmount(raw)), expected); assert.equal(formatNumberOnBlur(raw).replaceAll(',', ''), raw) }
  for (let size = 1; size <= 20; size++) {
    const source = '8'.repeat(size), value = BigInt(source) + 1000n
    assert.equal(addNumberQuickAmount(source, '1000').replaceAll(',', ''), value.toString().length <= 20 ? value.toString() : source)
  }
  assert.equal(addNumberQuickAmount('-9007199254740993.25', '1000'), '1,000')
  assert.equal(addNumberQuickAmount('9007199254740993.25', '1000'), '9,007,199,254,741,993.25')
  assert.equal(formatNumberOnBlur('일금 오만원정'), '일금 오만원정'); assert.equal(parseAmount('100000000000000000000'), null)
})

test('actual initial has(n), blank revisit, early edit before queued restoration and URL/history preservation', async () => {
  for (const [query, expected] of [['', '123,456,789'], ['n=', ''], ['n=000123', '123'], ['n=bad-value', 'bad-value'], ['n=12345678901234567890', '12,345,678,901,234,567,890']]) {
    const f = await fixture(query); assert.equal(f.input().props.value, '123,456,789'); assert.equal(f.input().props.autoFocus, undefined)
    await f.settle(); assert.equal(f.input().props.value, expected); assert.equal(f.replaced.length, 0); f.cleanup()
  }
  const f = await fixture('n=777'); f.change('-1234.'); await f.settle(); assert.equal(f.input().props.value, '-1234.')
  assert.equal(new URL(f.h.window.location.href).searchParams.get('n'), '-1234')
  assert.deepEqual(new URL(f.h.window.location.href).searchParams.getAll('campaign'), ['one', 'two']); assert.equal(new URL(f.h.window.location.href).hash, '#preserved')
  assert.ok(f.replaced.every(entry => entry.state === f.marker))
  await f.click('data-number-clear'); assert.equal(new URL(f.h.window.location.href).searchParams.get('n'), ''); f.cleanup()
  const revisit = await fixture('n='); await revisit.settle(); assert.equal(revisit.input().props.value, ''); revisit.cleanup()
})

test('actual middle raw edits and IME trailing input reject canceled normalization and composition overwrite', async () => {
  const f = await fixture('n=42'); await f.settle(); f.input().props.onFocus(); f.h.document.activeElement = f.field; await f.settle()
  for (const raw of ['12,904,567', '12,4,567', '-1.', '−.5', '12345678901234567890.00000000001']) { await f.edit(raw); assert.equal(f.input().props.value, raw) }
  f.input().props.onCompositionStart(); await f.edit('12345', true); const url = f.h.window.location.href
  f.input().props.onBlur(); f.h.document.activeElement = null; await f.settle()
  f.input().props.onCompositionEnd({ currentTarget: { value: '12345' } }); await f.settle(); const old = f.timers.filter(timer => timer.delay === 0).at(-1)
  await f.edit('123456'); const latest = f.timers.filter(timer => timer.delay === 0).at(-1); assert.notEqual(old, latest)
  old.callback(); await f.settle(); assert.equal(f.input().props.value, '123456')
  latest.callback(); await f.settle(); assert.equal(f.input().props.value, '123,456')
  f.input().props.onCompositionStart(); await f.edit('오ㅁ', true); const composingUrl = f.h.window.location.href
  await f.click('data-number-quick', '1000'); await f.click('data-number-clear'); await f.copy('reading'); assert.equal(f.input().props.value, '오ㅁ'); assert.equal(f.writes.length, 0); assert.equal(f.h.window.location.href, composingUrl)
  assert.notEqual(url, composingUrl)
  f.input().props.onCompositionEnd({ currentTarget: { value: '오만' } }); await f.settle(); f.input().props.onFocus(); f.h.document.activeElement = f.field; await f.settle()
  for (const timer of f.timers.filter(timer => timer.delay === 0)) timer.callback(); await f.settle(); assert.equal(f.input().props.value, '오만'); f.cleanup()
})

test('actual20-digit rows, overflow no-op, quick negative and composing early hydration retain current raw', async () => {
  const f = await fixture('n=10000000000000000001'); await f.settle(); await f.copy('reading'); assert.equal(f.writes.at(-1), '천경일')
  await f.edit('99999999999999999999'); await f.click('data-number-quick', '1000'); assert.equal(f.input().props.value, '99999999999999999999')
  await f.edit('-100.25'); await f.click('data-number-quick', '10000'); assert.equal(f.input().props.value, '10,000'); await f.copy('reading'); assert.equal(f.writes.at(-1), '만'); f.cleanup()
  const early = await fixture('n=999', false); early.input().props.onCompositionStart(); early.change('삼ㅁ', true); await early.settle(); early.h.setHydrated(true); await early.settle(); assert.equal(early.input().props.value, '삼ㅁ'); assert.equal(early.replaced.length, 0); early.cleanup()
})

test('actual nine clipboard targets share newest ownership across both directions and old success timers', async () => {
  const f = await fixture('n=1234'); await f.settle(); await f.editBatch('금액\t5678')
  const targets = ['formal', 'formal-mobile', 'contract', 'chinese', 'mixed', 'reading', 'english', 'link', 'batch']
  for (let i = 0; i < targets.length; i++) {
    const oldTarget = targets[i], newTarget = targets[(i + 1) % targets.length]
    f.io.mode = 'wait'; await f.copy(oldTarget); const old = f.delayed.at(-1)
    f.io.mode = 'resolve'; await f.copy(newTarget); const latestText = f.writes.at(-1), marker = f.find(newTarget === 'batch' ? f.b : f.h, 'data-number-copy', newTarget)
    assert.equal(marker.props['data-number-copied'], true)
    if (i % 2) old.resolve(); else old.reject(new Error('late'))
    await f.settle(); assert.equal(f.writes.at(-1), latestText); assert.equal(f.legacyWrites.length, 0); assert.equal(f.find(newTarget === 'batch' ? f.b : f.h, 'data-number-copy', newTarget).props['data-number-copied'], true)
  }
  const oldTimer = f.timers.filter(timer => timer.delay === 2000).at(-1); await f.copy('link'); oldTimer.callback(); await f.settle(); assert.equal(f.find(f.h, 'data-number-copy', 'link').props['data-number-copied'], true); f.cleanup()
})

test('actual editing/options/locale/batch invalidation and recovery retry never resurrect old text', async () => {
  const f = await fixture('n=1234'); await f.settle(); await f.editBatch('row\t1')
  for (const change of ['input', 'prefix', 'spacing', 'batch', 'locale']) {
    f.io.mode = 'wait'; await f.copy('reading'); const pending = f.delayed.at(-1)
    if (change === 'input') await f.edit('5678')
    if (change === 'prefix') await f.click('data-number-prefix', 'ilgeum')
    if (change === 'spacing') { f.find(f.h, 'data-number-spacing').props.onChange({ target: { checked: true } }); await f.settle() }
    if (change === 'batch') await f.editBatch('new\t2')
    if (change === 'locale') { f.io.locale = 'en'; f.messages.numberToKorean = messagesFor('en').numberToKorean; await f.settle() }
    pending.reject(new Error('old')); await f.settle(); assert.equal(f.recovery(), undefined); assert.equal(f.legacyWrites.length, 0)
  }
  f.io.mode = 'reject'; await f.copy('link'); const failed = f.recovery(); assert.equal(failed.props.target, 'link'); assert.equal(new URL(failed.props.text).searchParams.get('n'), '5678')
  f.io.legacy = true; failed.props.onRetry(); await f.settle(); assert.equal(f.find(f.h, 'data-number-copy', 'link').props['data-number-copied'], true)
  failed.props.onClose(); await f.settle(); assert.equal(f.find(f.h, 'data-number-copy', 'link').props['data-number-copied'], true)
  f.cleanup()
})

test('actual100-line CSV and TSV retain seven columns, physical order, error rows and protected exact numeric strings', async () => {
  const f = await fixture('n=999'); await f.settle()
  const lines = Array.from({ length: 100 }, (_, i) => `항목${i + 1}\t${i + 1}`)
  lines[0] = '=SUM(1,2)\t12345678901234567890'; lines[4] = ''; lines[5] = '음수\t-1.25'; lines[7] = '"quoted"\tbad'; lines[9] = 'extra\t2\t3'; lines[15] = "'literal\t0"
  await f.editBatch(lines.join('\r\n') + '\r\n'); const before = f.h.window.location.href
  await f.copy('batch'); const tsv = readDelimited(f.writes.at(-1), '\t')
  await f.click('data-number-download', 'csv', f.b); assert.equal(f.files.length, 1); assert.equal(f.files[0].name, 'number-to-korean-batch.csv')
  const bytes = new Uint8Array(await f.files[0].blob.arrayBuffer()); assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191])
  const csv = readDelimited(await f.files[0].blob.text(), ','); assert.deepEqual(csv, tsv); assert.equal(csv.length, 100)
  assert.ok(csv.every(row => row.length === 7)); assert.deepEqual(csv.slice(1).map(row => Number(row[0])), Array.from({ length: 100 }, (_, i) => i + 1).filter(n => n !== 5))
  assert.equal(csv[1][1], "'=SUM(1,2)"); assert.equal(csv[1][2], "'=SUM(1,2)\t12345678901234567890"); assert.equal(csv[1][3], "'12345678901234567890")
  const negative = csv.find(row => row[0] === '6'); assert.equal(negative[3], "'-1.25"); assert.equal(negative[5], '')
  for (const n of ['8', '10']) { const invalid = csv.find(row => row[0] === n); assert.equal(invalid[2], "'" + lines[Number(n) - 1]); assert.equal(invalid[3], ''); assert.notEqual(invalid[6], '') }
  assert.equal(f.h.window.location.href, before); assert.equal(f.input().props.value, '999'); f.cleanup()
})

test('actual StrictMode effect replay recreates clipboard owner; real cleanup rejects late completion', async () => {
  const f = await fixture('n=123'); await f.settle(); f.h.replayEffects(); f.b.replayEffects(); await f.settle(); await f.copy('reading'); assert.equal(f.writes.at(-1), '백이십삼')
  f.io.mode = 'wait'; await f.copy('link'); const pending = f.delayed.at(-1), oldRecovery = f.recovery(), before = f.legacyWrites.length
  f.cleanup(); pending.reject(new Error('unmount')); await Promise.resolve(); await Promise.resolve(); assert.equal(f.legacyWrites.length, before); assert.equal(oldRecovery, undefined)
})

let count = 0
for (const { name, run } of checks) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); count++; console.log('PASS ' + name) }
console.log(`Independent NumberToKorean: ${count} groups passed`)
