import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { build } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const require = createRequire(import.meta.url)
const fragment = JSON.parse(readFileSync(new URL('./translations-number.json', import.meta.url), 'utf8'))
const getMessages = locale => {
  const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
  Object.assign(messages.numberToKorean, fragment[locale].numberToKorean)
  return messages
}
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log(`PASS ${name}`) }

async function fixture({ url = 'https://toolhub.ai.kr/number-to-korean/?campaign=keep#result', hydrated = true } = {}) {
  const messages = getMessages('ko'), jobs = [], nativeTexts = [], fallbackTexts = [], downloads = [], revokes = [], replacements = []
  let seq = 0, language = 'ko', legacy = false, copyImpl = async text => nativeTexts.push(text)
  const objects = new Map(), marker = { keep: ['framework', 1] }
  const schedule = (callback, delay) => { const job = { id: ++seq, callback, delay, active: true }; jobs.push(job); return job.id }
  const cancel = id => { const job = jobs.find(job => job.id === id); if (job) job.active = false }
  class LocalURL extends URL {
    static createObjectURL(blob) { const url = `blob:number-${++seq}`; objects.set(url, blob); return url }
    static revokeObjectURL(url) { revokes.push(url) }
  }
  const field = { focus() {} }
  let currentLegacyField = null
  const document = { activeElement: null, body: { appendChild() {} }, createElement(tag) {
    if (tag === 'textarea') {
      const value = { value: '', style: {}, readOnly: false, focus() {}, select() {}, setSelectionRange() {}, remove() {} }
      currentLegacyField = value; return value
    }
    if (tag === 'a') return { href: '', download: '', click() { downloads.push({ name: this.download, blob: objects.get(this.href), url: this.href }) }, remove() {} }
    throw new Error(`Unexpected DOM ${tag}`)
  }, execCommand(command) { assert.equal(command, 'copy'); fallbackTexts.push(currentLegacyField.value); return legacy } }
  const globals = { URL: LocalURL, setTimeout: schedule, clearTimeout: cancel }
  const modules = { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language }) } }
  const navigator = { clipboard: { writeText: text => copyImpl(text) } }
  const h = await componentHarness('src/components/NumberToKorean.tsx', { messages, modules, navigator, globals, document, url, hydrated,
    beforeEffects(tree) { const input = nodes(tree).find(node => node.props?.id === 'ntk-input'); input.props.ref.current = field },
  })
  h.window.history.state = marker
  const replace = h.window.history.replaceState
  h.window.history.replaceState = (state, title, url) => { replacements.push({ state, url: String(url) }); h.window.history.state = state; replace(state, title, url) }
  h.render()
  const batchElement = () => h.find(node => typeof node.type === 'function' && node.type.name === 'NumberToKoreanBatch')
  const b = await componentHarness('src/components/NumberToKoreanBatch.tsx', { messages, modules, navigator, globals, document, props: batchElement().props })
  b.render()
  const settle = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); h.render(); b.setProps(batchElement().props) } }
  await settle()
  const find = (host, key, value) => host.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  const input = () => find(h, 'id', 'ntk-input')
  const batchInput = () => find(b, 'id', 'number-batch-input')
  const edit = async (raw, composing = false) => { input().props.onChange({ target: { value: raw }, nativeEvent: { isComposing: composing } }); await settle() }
  const editBatch = async raw => { batchInput().props.onChange({ target: { value: raw } }); await settle() }
  const click = async (key, value, host = h) => { find(host, key, value).props.onClick(); await settle() }
  const focus = async () => { h.document.activeElement = field; input().props.onFocus(); await settle() }
  const blur = async () => { h.document.activeElement = null; input().props.onBlur(); await settle() }
  const fire = async job => { assert.ok(job); job.active = false; job.callback(); await settle() }
  const recovery = () => [...h.all(), ...b.all()].find(node => typeof node.type === 'function' && node.type.name === 'NumberToKoreanCopyRecovery')
  return { h, b, messages, jobs, nativeTexts, fallbackTexts, downloads, revokes, replacements, marker, field, input, batchInput, find, edit, editBatch, click, focus, blur, fire, recovery, settle,
    setNative(value) { copyImpl = value }, setLegacy(value) { legacy = value },
    async locale(value) { language = value; await settle() },
    async resolveTranslations(value) { messages.numberToKorean = getMessages(value).numberToKorean; await settle() },
    cleanup() { h.cleanup(); b.cleanup() },
  }
}

await check('actual React SSR and first-client representation agree on fixed sample for all initial queries', async () => {
  let params = new URLSearchParams()
  const messages = getMessages('ko')
  const bundle = await build({ entryPoints: ['src/components/NumberToKorean.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', '@/lib/i18n', '@/lib/i18n/ns/*', '@/hooks/useHydrated', '@/hooks/useSearchParams', '@/contexts/LanguageContext'] })
  const bundleModule = { exports: {} }
  vm.runInNewContext(bundle.outputFiles[0].text, { module: bundleModule, exports: bundleModule.exports, console, require(name) {
    if (name === '@/hooks/useHydrated') return { useHydrated: () => false }
    if (name === '@/hooks/useSearchParams') return { useSearchParams: () => params }
    if (name === '@/contexts/LanguageContext') return { useOptionalLanguage: () => undefined }
    if (name.startsWith('@/lib/i18n/ns/')) return {}
    if (name === '@/lib/i18n') return { useTranslations: namespace => {
      const get = key => key.split('.').reduce((value, next) => value[next], messages[namespace])
      const t = (key, values = {}) => get(key).replace(/\{(\w+)\}/g, (_all, key) => String(values[key] ?? `{${key}}`))
      t.raw = get; return t
    } }
    return require(name)
  } })
  const render = () => renderToStaticMarkup(React.createElement(bundleModule.exports.default))
  const server = render()
  assert.ok(server.includes('value="123,456,789"')); assert.ok(server.includes('data-number-example'))
  assert.ok(!server.includes('autofocus'))
  for (const query of ['n=', 'n=invalid', 'n=9007199254740993', 'n=%EC%98%A4%EB%A7%8C']) { params = new URLSearchParams(query); assert.equal(render(), server) }
})

await check('actual restore honors has(n), early raw/IME/clear edits and read-only invalid URLs', async () => {
  for (const [query, value] of [['', '123,456,789'], ['n=', ''], ['n=private-invalid', 'private-invalid'], ['n=9007199254740993', '9,007,199,254,740,993']]) {
    const f = await fixture({ url: `https://toolhub.ai.kr/number-to-korean/?${query}&campaign=keep#result` })
    assert.equal(f.input().props.value, value); assert.equal(f.replacements.length, 0)
    assert.equal(f.h.all().some(node => Object.hasOwn(node.props, 'data-number-example')), !query)
    f.cleanup()
  }
  for (const action of ['raw', 'ime', 'clear']) {
    const f = await fixture({ hydrated: false, url: 'https://toolhub.ai.kr/number-to-korean/?n=999&campaign=keep#result' })
    if (action === 'raw') await f.edit('-123.')
    if (action === 'ime') { f.input().props.onCompositionStart(); await f.edit('오ㅁ', true) }
    if (action === 'clear') await f.click('data-number-clear')
    const before = f.input().props.value
    f.h.setHydrated(true); await f.settle()
    assert.equal(f.input().props.value, before)
    assert.equal(f.h.find(node => Object.hasOwn(node.props, 'data-number-restored')).props['data-number-restored'], true)
    f.cleanup()
  }
})

await check('actual raw middle edits, incomplete values and IME blur/end/trailing-input ownership', async () => {
  const f = await fixture(); await f.focus()
  for (const raw of ['12,934,567', '-1234.', '−.', '오만 원정', '99999999999999999999.00000000001']) { await f.edit(raw); assert.equal(f.input().props.value, raw) }
  await f.edit('1234567.00'); await f.blur(); assert.equal(f.input().props.value, '1,234,567.00')
  await f.focus(); f.input().props.onCompositionStart(); await f.edit('12345', true)
  const before = f.h.window.location.href
  await f.click('data-number-quick', '1000'); await f.click('data-number-clear'); await f.click('data-number-copy', 'reading')
  assert.equal(f.input().props.value, '12345'); assert.equal(f.nativeTexts.length, 0); assert.equal(f.h.window.location.href, before)
  await f.blur(); assert.equal(f.input().props.value, '12345')
  f.input().props.onCompositionEnd({ currentTarget: { value: '123456' } }); await f.settle()
  const old = f.jobs.findLast(job => job.active && job.delay === 0)
  await f.edit('1234567')
  await f.fire(old); assert.equal(f.input().props.value, '1234567')
  await f.fire(f.jobs.findLast(job => job.active && job.delay === 0)); assert.equal(f.input().props.value, '1,234,567')
  await f.focus(); f.input().props.onCompositionStart(); await f.edit('98765', true); await f.blur()
  f.input().props.onCompositionEnd({ currentTarget: { value: '98765' } }); await f.settle()
  const canceled = f.jobs.findLast(job => job.active && job.delay === 0)
  await f.focus(); await f.fire(canceled); assert.equal(f.input().props.value, '98765')
  f.cleanup()
})

await check('actual clear n= fresh visit, unrelated history/query/hash and current-link copy before sync', async () => {
  const f = await fixture(); await f.edit('-0009007199254740993.5000')
  // Keep the current render while the address still represents an earlier input.
  f.h.window.history.replaceState(f.marker, '', 'https://toolhub.ai.kr/number-to-korean/?n=1&campaign=keep#result')
  await f.click('data-number-copy', 'link')
  const link = new URL(f.nativeTexts.at(-1))
  assert.equal(link.searchParams.get('n'), '-9007199254740993.5')
  assert.equal(link.searchParams.get('campaign'), 'keep'); assert.equal(link.hash, '#result')
  assert.equal(f.h.window.history.state, f.marker)
  await f.click('data-number-clear')
  assert.equal(new URL(f.h.window.location).searchParams.has('n'), true)
  assert.equal(new URL(f.h.window.location).searchParams.get('n'), '')
  const fresh = await fixture({ url: f.h.window.location.href }); assert.equal(fresh.input().props.value, '')
  assert.equal(fresh.h.all().some(node => Object.hasOwn(node.props, 'data-number-example')), false)
  fresh.cleanup(); f.cleanup()
})

await check('actual quick/format options preserve 20-digit math, reverse Korean and no-op selection copy access', async () => {
  const f = await fixture(); await f.edit('9007199254740993.5000'); await f.click('data-number-quick', '1000')
  assert.equal(f.input().props.value, '9,007,199,254,741,993.5')
  await f.edit('-900.5'); await f.click('data-number-quick', '1000'); assert.equal(f.input().props.value, '1,000')
  await f.edit('99999999999999999999'); await f.click('data-number-quick', '1000'); assert.equal(f.input().props.value, '99999999999999999999')
  await f.edit('일금 오만원정'); await f.blur(); assert.equal(f.input().props.value, '일금 오만원정')
  await f.click('data-number-prefix', 'geum'); await f.click('data-number-copy', 'formal')
  assert.equal(f.nativeTexts.at(-1), '금 오만원정')
  await f.click('data-number-prefix', 'ilgeum'); await f.click('data-number-copy', 'formal')
  assert.equal(f.nativeTexts.at(-1), '일금 오만원정')
  f.cleanup()
})

await check('actual single↔batch global requests, old timer and stale raw/options/locale completions', async () => {
  const f = await fixture(); await f.editBatch('A\t1000\nB\t2000')
  for (const [first, second] of [['formal', 'batch'], ['batch', 'link']]) {
    const old = deferred(); f.setNative(() => old.promise)
    await f.click('data-number-copy', first, first === 'batch' ? f.b : f.h)
    f.setNative(async text => f.nativeTexts.push(text))
    await f.click('data-number-copy', second, second === 'batch' ? f.b : f.h)
    old.reject(new Error('old denied')); await f.settle()
    assert.equal(f.fallbackTexts.length, 0); assert.equal(f.recovery(), undefined)
    assert.equal(f.find(second === 'batch' ? f.b : f.h, 'data-number-copy', second).props['data-number-copied'], true)
  }
  const oldTimer = f.jobs.findLast(job => job.active && job.delay === 2000)
  await f.click('data-number-copy', 'formal'); await f.fire(oldTimer)
  assert.equal(f.find(f.h, 'data-number-copy', 'formal').props['data-number-copied'], true)
  for (const action of ['raw', 'prefix', 'spacing', 'batch', 'locale', 'translation']) {
    const old = deferred(); f.setNative(() => old.promise)
    await f.click('data-number-copy', 'batch', f.b)
    if (action === 'raw') await f.edit('2222')
    if (action === 'prefix') await f.click('data-number-prefix', 'none')
    if (action === 'spacing') { f.find(f.h, 'data-number-spacing').props.onChange({ target: { checked: true } }); await f.settle() }
    if (action === 'batch') await f.editBatch('new\t3333')
    if (action === 'locale') await f.locale('en')
    if (action === 'translation') await f.resolveTranslations('en')
    old.reject(new Error('obsolete')); await f.settle()
    assert.equal(f.fallbackTexts.length, 0); assert.equal(f.recovery(), undefined)
  }
  f.cleanup()
})

await check('actual current failure/retry/close and old recovery handlers cannot operate after edit/unmount', async () => {
  const f = await fixture(); f.setNative(async () => { throw new Error('denied') }); f.setLegacy(false)
  await f.click('data-number-copy', 'formal')
  const old = f.recovery(); assert.ok(old); assert.equal(old.props.target, 'formal')
  f.setLegacy(true); old.props.onRetry(); await f.settle()
  assert.equal(f.find(f.h, 'data-number-copy', 'formal').props['data-number-copied'], true)
  await f.edit('7777'); f.setLegacy(false); await f.click('data-number-copy', 'reading')
  const current = f.recovery(); assert.equal(current.props.text, '칠천칠백칠십칠')
  const before = f.fallbackTexts.length
  old.props.onRetry(); old.props.onClose(); await f.settle()
  assert.equal(f.fallbackTexts.length, before); assert.equal(f.recovery().props.target, 'reading')
  current.props.onClose(); await f.settle(); assert.equal(f.recovery(), undefined)
  const late = deferred(); f.setNative(() => late.promise); await f.click('data-number-copy', 'formal')
  f.cleanup(); late.reject(new Error('left page')); await f.settle()
  assert.equal(f.fallbackTexts.length, before)
})

function delimited(source, separator) {
  const rows = []; let row = [], field = '', quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '"') { if (quoted && source[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted }
    else if (!quoted && char === separator) { row.push(field); field = '' }
    else if (!quoted && (char === '\r' || char === '\n')) { if (char === '\r' && source[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = '' }
    else field += char
  }
  if (field || row.length) rows.push([...row, field])
  assert.equal(quoted, false); return rows
}

await check('actual 100-line TSV/CSV preserves 7 columns, BOM, precision, formula safety and limits', async () => {
  const f = await fixture()
  const lines = Array.from({ length: 100 }, (_, i) => i === 0 ? '=SUM(1,2)\t99999999999999999999' : i === 1 ? '"quoted,label"\t-12.5' : i === 2 ? 'error\tnot-a-number' : `한글${i}\t${i + 1}`)
  await f.editBatch(lines.join('\n') + '\n')
  await f.click('data-number-copy', 'batch', f.b); await f.click('data-number-download', 'csv', f.b)
  const tsv = delimited(f.nativeTexts.at(-1), '\t')
  const blob = f.downloads[0].blob, bytes = new Uint8Array(await blob.arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191])
  const csv = delimited(Buffer.from(bytes).toString('utf8').slice(1), ',')
  assert.deepEqual(csv, tsv); assert.equal(csv.length, 101)
  assert.ok(csv.every(row => row.length === 7))
  assert.equal(csv[1][1], "'=SUM(1,2)"); assert.equal(csv[1][3], "'99999999999999999999")
  assert.equal(csv[2][1], '\'"quoted,label"'); assert.equal(csv[2][3], "'-12.5")
  assert.equal(csv[3][2], "'error\tnot-a-number"); assert.ok(csv[3][6].length > 0)
  assert.equal(f.downloads[0].name, 'number-to-korean-batch.csv')
  await f.editBatch('1'.repeat(301))
  assert.equal(f.find(f.b, 'data-number-copy', 'batch').props.disabled, false)
  await f.click('data-number-copy', 'batch', f.b)
  const invalidRow = delimited(f.nativeTexts.at(-1), '\t')
  assert.equal(invalidRow.length, 2); assert.equal(invalidRow[1][2], "'" + '1'.repeat(301))
  assert.equal(invalidRow[1][6], f.messages.numberToKorean.batch.errors.lineTooLong)
  for (const raw of [Array(101).fill('1').join('\n'), '1'.repeat(30001)]) {
    await f.editBatch(raw)
    assert.equal(f.find(f.b, 'data-number-copy', 'batch').props.disabled, true)
    assert.equal(f.find(f.b, 'data-number-download', 'csv').props.disabled, true)
    assert.ok(f.b.all().some(node => node.props?.role === 'alert'))
  }
  f.cleanup()
})

console.log(`${groups} number parent groups passed (actual parent/batch/React SSR; controlled clipboard, selection and download)`)
