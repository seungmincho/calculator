/* eslint-disable @typescript-eslint/no-require-imports -- Independent event sequences using the author's controlled host setup. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const sourcePath = path.resolve(__dirname, 'check-json-csv-performance-component.cjs')
const source = fs.readFileSync(sourcePath, 'utf8').split('const utf8 =')[0].replace("platform: 'browser'", "platform: 'browser', target: 'es2022'")
const host = new Module(sourcePath, module)
host.filename = sourcePath; host.paths = Module._nodeModulePaths(path.dirname(sourcePath))
host._compile(source + '\nmodule.exports = { fixture, flush, deferred };', sourcePath)
const { fixture, flush, deferred } = host.exports
const results = []
async function check(name, action) { const detail = await action(); results.push({ name, status: 'pass', ...detail }); console.log('PASS', name) }
async function main() {
  await check('native file-picker cancel during conversion settles busy state and captured late result cannot replace next confirmation', async () => {
    const f = await fixture(); const initial = f.output(); f.holdWorkers(true)
    f.change('{"old":1}'); await f.convert(); const old = f.workers.at(-1)
    assert.equal(f.by('data-json-csv-job').props['data-json-csv-job'], 'processing')
    f.nativeInput.dispatchEvent(new Event('cancel')); await flush(); f.h.render()
    assert.equal(f.h.all().some(node => node.props['data-json-csv-job']), false)
    assert.equal(f.output(), initial); assert.equal(old.terminated, 1)
    f.change('{"new":"😀\\r\\nexact"}'); f.holdWorkers(false); await f.convert()
    const expected = 'new\r\n"😀\r\nexact"'; assert.equal(f.output(), expected)
    await old.finish(); await flush(); f.h.render(); assert.equal(f.output(), expected)
    f.download(); assert.equal(await f.urls.get(f.downloads[0].href).text(), expected)
    f.h.cleanup(); return { oldWorkerTerminated: true, newExactCsvPreserved: true }
  })
  await check('cross-action copy rejection cannot resurrect manual recovery after transferred decode and a new confirmation', async () => {
    const f = await fixture(); f.change('{"first":"private-old"}'); await f.convert()
    const copy = deferred(); f.copyPort(() => copy.promise); void f.copied()
    f.holdWorkers(true); f.upload(7); const bytes = new TextEncoder().encode('a,b\n1,2').buffer
    f.readers.at(-1).complete(bytes); await flush(); f.h.render(); const decode = f.workers.at(-1)
    assert.equal(bytes.byteLength, 0)
    f.mode('csvToJson'); f.change('new\n002'); f.holdWorkers(false); await f.convert()
    const expected = JSON.stringify([{ new: '002' }], null, 2); assert.equal(f.output(), expected)
    copy.reject(new Error('obsolete clipboard rejection')); await decode.finish(); await flush(); f.h.render()
    assert.equal(f.output(), expected); assert.equal(f.input().props.value, 'new\n002')
    assert.equal(f.fallbackCount(), 0); assert.equal(f.h.all().some(node => node.props.id === 'json-csv-manual'), false)
    f.h.cleanup(); return { actualTransferDetached: true, staleFallbackCalls: 0, staleDecodeApplied: false }
  })
  await check('surrogate-adjusted 50001-unit page keeps exact full export while dirty edits retain memoized read-only snapshot', async () => {
    const f = await fixture(); const value = 'a'.repeat(49992) + '😀' + 'b'.repeat(100000)
    const raw = JSON.stringify({ value }); f.change(raw); await f.convert()
    const expected = 'value\r\n' + value
    let parts = [], longest = 0
    do { const part = f.output(); parts.push(part); longest = Math.max(longest, part.length); if (f.by('data-json-csv-text-page', 'next').props.disabled) break; f.by('data-json-csv-text-page', 'next').props.onClick(); f.h.render() } while (true)
    assert.equal(parts.join(''), expected); assert.equal(longest, 50001)
    f.download(); assert.equal(await f.urls.get(f.downloads[0].href).text(), expected)
    const lastNode = f.h.find(node => node.props.id === 'json-csv-output')
    f.change(raw + ' '); assert.equal(f.h.find(node => node.props.id === 'json-csv-output'), lastNode)
    assert.equal(f.by('data-json-csv-copy').props.disabled, true); assert.equal(f.by('data-json-csv-download').props.disabled, true)
    await f.convert(); assert.equal(f.h.find(node => node.props.id === 'json-csv-output').props['data-json-csv-preview-start'], 0)
    f.h.cleanup(); return { longestUtf16Page: longest, allPageBytesExact: true, dirtySnapshotNodeRetained: true }
  })
  fs.writeFileSync(path.resolve(__dirname, 'parent-independent-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), passed: results.length, browserExecuted: false, hostSetupReused: 'author controlled React/DOM setup only; independent event sequences and string oracles', results }, null, 2))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
