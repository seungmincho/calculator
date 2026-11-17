/* eslint-disable @typescript-eslint/no-require-imports -- Actual component with controlled file/Clipboard/DOM ports. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { componentHarness, all } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
async function fixture(locale = 'ko') {
  const messages = merge(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch26/translations-json-csv.json', 'utf8'))[locale])
  const readers = [], urls = new Map(), downloads = [], revoked = [], copies = []
  const nativeInput = new EventTarget(); let selected = '', fallback = false, fallbackCount = 0, copyPort = async () => {}, serial = 0, downloadFails = false
  class Field { style = {}; value = ''; focus() {} select() { selected = this.value } remove() {} }
  class Reader {
    constructor() { readers.push(this) }
    readAsArrayBuffer(file) { this.file = file }
    abort() { this.aborted = true } // Deliberately ineffective: late onload must also be guarded.
    complete(bytes) { this.result = bytes; this.onload?.() }
    fail() { this.onerror?.() }
  }
  class LocalURL extends URL {}
  LocalURL.createObjectURL = blob => { const url = `blob:json-csv-${++serial}`; urls.set(url, blob); return url }
  LocalURL.revokeObjectURL = url => revoked.push(url)
  const h = await componentHarness('src/components/JsonCsvConverter.tsx', { props: {}, messages,
    globals: { FileReader: Reader, ArrayBuffer, HTMLElement: Field, URL: LocalURL, performance },
    navigator: { clipboard: { writeText(text) { copies.push(text); return copyPort(text) } } },
    modules: { '@/components/GuideSection': { __esModule: true, default: () => null }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    document: { activeElement: new Field(), body: { appendChild() {} }, execCommand() { fallbackCount++; return fallback }, createElement(tag) {
      if (tag === 'textarea') return new Field()
      return { click() { if (downloadFails) throw new Error('denied'); downloads.push({ href: this.href, name: this.download }) }, remove() {} }
    } },
    beforeEffects(tree) { for (const node of all(tree)) {
      if (node.props.id === 'json-csv-file') node.props.ref.current = nativeInput
      if (node.props.id === 'json-csv-manual') { const field = new Field(); field.value = node.props.value; node.props.ref.current = field }
    } },
  })
  h.render()
  const by = (key, value) => h.find(node => Object.hasOwn(node.props, key) && (value === undefined || node.props[key] === value))
  const input = () => h.find(node => node.props.id === 'json-csv-input')
  const output = () => h.find(node => node.props.id === 'json-csv-output').props.value
  const change = value => { input().props.onChange({ target: { value } }); h.render() }
  const option = (key, value) => { by('data-json-csv-option', key).props.onChange({ target: { value, checked: value } }); h.render() }
  const mode = value => { by('data-json-csv-mode-button', value).props.onClick(); h.render() }
  const convert = async () => { by('data-json-csv-convert').props.onClick(); h.render(); h.tick(0); await flush(); h.render() }
  const view = value => { by('data-json-csv-view', value).props.onClick(); h.render() }
  const upload = (size = 10) => { h.find(node => node.props.id === 'json-csv-file').props.onChange({ target: { value: 'file', files: [{ name: 'data.txt', size }] } }); h.render() }
  const copied = async () => { by('data-json-csv-copy').props.onClick(); await flush(); h.render() }
  return { h, by, input, output, change, option, mode, convert, view, upload, copied, readers, urls, downloads, revoked, copies, nativeInput, messages,
    copyPort(value) { copyPort = value }, fallback(value) { fallback = value }, fallbackCount: () => fallbackCount, selected: () => selected,
    downloadFails(value) { downloadFails = value }, download() { by('data-json-csv-download').props.onClick(); h.render() },
    locale(next) { const changed = merge(JSON.parse(fs.readFileSync(`messages/${next}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch26/translations-json-csv.json', 'utf8'))[next]); messages.jsonCsvConverter = changed.jsonCsvConverter; h.render() },
  }
}
const utf8 = text => new TextEncoder().encode(text).buffer
async function main() {
  let groups = 0
  const check = async (name, run) => { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }
  await check('A11y table names identify each header and cell, including empty values and bounded long content', async () => {
    for (const locale of ['ko', 'en']) {
      const f = await fixture(locale), header = 'h'.repeat(100), content = 'v'.repeat(200)
      f.change(JSON.stringify([{ [header]: content, empty: '' }, { [header]: '', empty: '' }])); await f.convert(); f.view('table')
      const labels = f.messages.jsonCsvConverter.fidelity
      const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]))
      const headerName = format(labels.expandHeader, { column: 1, name: header.slice(0, 80) })
      assert.ok(f.h.all().some(node => node.type === 'button' && node.props['aria-label'] === headerName))
      assert.equal(f.by('data-json-csv-cell', '0-0').props['aria-label'], format(labels.expandCellAt, { row: 1, column: 1, preview: content.slice(0, 80) }))
      assert.equal(f.by('data-json-csv-cell', '0-1').props['aria-label'], format(labels.expandCellAt, { row: 1, column: 2, preview: '' }))
      assert.equal(f.by('data-json-csv-cell', '1-1').props['aria-label'], format(labels.expandCellAt, { row: 2, column: 2, preview: '' }))
      f.by('data-json-csv-cell', '0-0').props.onClick(); f.h.render()
      assert.equal(f.h.find(node => node.props.id === 'json-csv-cell-full').props.value, content)
      f.view('text'); assert.equal(f.output().includes(content), true); f.h.cleanup()
    }
  })
  await check('KO/EN initial translated example has a real result; locale and collapse preserve draft and snapshot', async () => {
    for (const locale of ['ko', 'en']) {
      const f = await fixture(locale), input = f.input().props.value, output = f.output()
      assert.equal(f.by('data-json-csv-stat', 'rows').props.children, 2); assert.equal(f.by('data-json-csv-stat', 'columns').props.children, 3)
      assert.ok(output.includes('00123')); f.download(); assert.equal(await f.urls.get(f.downloads[0].href).text(), output)
      f.h.button(f.messages.jsonCsvConverter.fidelity.hideInput).props.onClick(); f.h.render(); f.locale(locale === 'ko' ? 'en' : 'ko')
      assert.equal(f.input().props.value, input); assert.equal(f.output(), output); f.h.cleanup(); assert.ok(f.revoked.includes(f.downloads[0].href))
    }
  })
  await check('quoted multiline CSV stays strings, table/expanded cells/JSON/download/stats share the exact confirmed data', async () => {
    const f = await fixture(); f.mode('csvToJson')
    const csv = 'code,note,last\r\n00123," a\r\nb ""quoted"" ",\r\n9007199254740993,"끝",'
    f.change(csv); await f.convert()
    const expected = [{ code: '00123', note: ' a\r\nb "quoted" ', last: '' }, { code: '9007199254740993', note: '끝', last: '' }]
    const output = f.output(); assert.deepEqual(JSON.parse(output), expected)
    f.view('table'); assert.equal(f.by('data-json-csv-cell', '0-0').props.children[0], '00123')
    f.by('data-json-csv-cell', '0-1').props.onClick(); f.h.render(); assert.equal(f.h.find(node => node.props.id === 'json-csv-cell-full').props.value, expected[0].note)
    f.download(); assert.deepEqual(JSON.parse(await f.urls.get(f.downloads[0].href).text()), expected); assert.equal(f.downloads[0].name, 'converted.json')
    assert.equal(f.by('data-json-csv-stat', 'bytes').props.children, f.messages.jsonCsvConverter.fidelity.bytes.replace('{bytes}', String(new TextEncoder().encode(output).length)))
    f.option('numbers', true); assert.equal(f.by('data-json-csv-result').props['data-json-csv-result'], 'stale'); f.download(); assert.equal(f.downloads.length, 1)
    f.h.cleanup()
  })
  await check('JSON union and no-header preserve first row; actual tab value and CSV-only BOM remain exact', async () => {
    const f = await fixture(); f.change('[{"a":"first","b":""},{"a":"second","later":3}]')
    f.option('delimiter', '\t'); f.option('header', false); f.option('bom', true); await f.convert()
    assert.equal(f.output(), '\uFEFFfirst\t""\t""\r\nsecond\t""\t3')
    assert.equal(f.by('data-json-csv-stat', 'columns').props.children, 3); f.view('table')
    assert.equal(f.by('data-json-csv-cell', '0-0').props.children[0], 'first')
    f.mode('csvToJson'); assert.ok(!f.h.all().some(node => node.props['data-json-csv-option'] === 'bom'))
    f.change('00123\t\r\nx\ty'); await f.convert(); f.view('text')
    assert.deepEqual(JSON.parse(f.output()), [{ column_0: '00123', column_1: '' }, { column_0: 'x', column_1: 'y' }]); assert.ok(!f.output().startsWith('\uFEFF'))
    f.h.cleanup()
  })
  await check('invalid input/options retain raw text and previous result but block stale export with positioned errors', async () => {
    const f = await fixture(), old = f.output()
    for (const [input, key] of [['{"n":9007199254740993}', 'unsafeInteger'], ['{"a.b":1,"a":{"b":2}}', 'keyCollision']]) {
      f.change(input); await f.convert(); assert.equal(f.input().props.value, input); assert.equal(f.output(), old)
      assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.errors[key])); assert.equal(f.by('data-json-csv-download').props.disabled, true)
    }
    f.mode('csvToJson'); f.change('a,b\nx'); await f.convert()
    assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.errors.width)); assert.ok(f.h.text().includes('2'))
    f.h.cleanup()
  })
  await check('file encoding decodes actual UTF-8/EUC-KR bytes, rejects invalid/oversize files without replacing current input', async () => {
    const f = await fixture(); f.mode('csvToJson'); f.change('kept')
    f.upload(4); f.readers.at(-1).complete(utf8('\uFEFFa\n값')); await flush(); f.h.render(); assert.equal(f.input().props.value, 'a\n값')
    f.option('encoding', 'euc-kr'); f.upload(4); f.readers.at(-1).complete(Uint8Array.from([0xc7, 0xd1, 0xb1, 0xdb]).buffer); await flush(); f.h.render(); assert.equal(f.input().props.value, '한글')
    f.upload(1); f.readers.at(-1).complete(Uint8Array.from([0xc7]).buffer); await flush(); f.h.render(); assert.equal(f.input().props.value, '한글')
    assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.encodingFailed))
    const count = f.readers.length; f.upload(2 * 1024 * 1024 + 1); await flush(); f.h.render(); assert.equal(f.readers.length, count); assert.equal(f.input().props.value, '한글')
    f.h.cleanup()
  })
  await check('new file/direct edit/mode/encoding/native cancel/unmount invalidate late reads even when abort is ineffective', async () => {
    for (const action of ['new', 'edit', 'mode', 'encoding', 'cancel', 'unmount']) {
      const f = await fixture(); f.change('original'); f.upload(); const old = f.readers[0]
      if (action === 'new') { f.upload(); f.readers[1].complete(utf8('latest')); await flush(); f.h.render() }
      if (action === 'edit') f.change('typed')
      if (action === 'mode') f.mode('csvToJson')
      if (action === 'encoding') f.option('encoding', 'euc-kr')
      if (action === 'cancel') { f.nativeInput.dispatchEvent(new Event('cancel')); f.h.render() }
      const expected = f.input().props.value
      if (action === 'unmount') f.h.cleanup()
      old.complete(utf8('obsolete')); await flush(); if (action !== 'unmount') f.h.render()
      assert.equal(f.input().props.value, expected, action); assert.equal(old.aborted, true, action)
      if (action !== 'unmount') f.h.cleanup()
    }
  })
  await check('copy false/rejection uses exact read-only recovery; retry works and stale completion never runs fallback', async () => {
    const f = await fixture(), result = f.output(); f.copyPort(async () => { throw new Error('denied') }); f.fallback(false)
    await f.copied(); assert.equal(f.h.find(node => node.props.id === 'json-csv-manual').props.value, result)
    assert.equal(f.h.find(node => node.props.id === 'json-csv-manual').props.readOnly, true)
    f.h.button(f.messages.jsonCsvConverter.fidelity.select).props.onClick(); assert.equal(f.selected(), result)
    f.fallback(true); await f.copied(); assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.copied))
    for (const finish of ['resolve', 'reject']) {
      const pending = deferred(); f.copyPort(() => pending.promise); await f.copied()
      const count = f.fallbackCount(); f.change('{"new":1}')
      if (finish === 'resolve') pending.resolve(); else pending.reject(new Error('late'))
      await flush(); f.h.render(); assert.equal(f.fallbackCount(), count); assert.ok(!f.h.text().includes(f.messages.jsonCsvConverter.fidelity.copied))
      await f.convert()
    }
    f.h.cleanup()
  })
  await check('pending conversion cannot replace edited input; wide-table pagination keeps full export and bounds visible cells', async () => {
    const f = await fixture(), initial = f.output(); f.change('{"old":1}'); f.by('data-json-csv-convert').props.onClick(); f.change('{"new":2}'); f.h.tick(0); await flush(); f.h.render()
    assert.equal(f.output(), initial); assert.equal(f.input().props.value, '{"new":2}')
    f.mode('csvToJson')
    const header = Array.from({ length: 200 }, (_, index) => `c${index}`).join(','), row = Array(200).fill('x').join(',')
    f.change(header + '\n' + Array(1000).fill(row).join('\n')); await f.convert()
    const output = f.output(); assert.equal(JSON.parse(output).length, 1000); f.view('table')
    assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-json-csv-cell')).length, 5000)
    f.h.button(f.messages.jsonCsvConverter.fidelity.next).props.onClick(); f.h.render(); assert.ok(f.by('data-json-csv-cell', '25-0'))
    f.download(); assert.equal(await f.urls.get(f.downloads[0].href).text(), output)
    f.downloadFails(true); f.download(); assert.ok(f.h.text().includes(f.messages.jsonCsvConverter.fidelity.downloadFailed)); f.h.cleanup()
  })
  console.log(`JSON/CSV actual component: ${groups} groups passed; no browser`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
