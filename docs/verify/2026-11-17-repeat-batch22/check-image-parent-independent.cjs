// Independent scenarios reuse the author's controlled ports, not their assertions.
/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS VM fixture. */
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module')
const file = path.resolve('docs/verify/2026-11-17-repeat-batch22/check-image-parent.cjs')
const source = fs.readFileSync(file, 'utf8')
const loadedModule = new Module(file)
loadedModule.filename = file; loadedModule.paths = Module._nodeModulePaths(path.dirname(file))
loadedModule._compile(source.slice(0, source.indexOf(';(async () =>')) + '\nmodule.exports = { fixture };', file)
const { fixture } = loadedModule.exports
const output = tag => ({ blob: new Blob([tag], { type: 'image/jpeg' }), mime: 'image/jpeg', width: 100, height: 50, srcWidth: 400, srcHeight: 200, quality: 0.8, ok: true })

;(async () => {
  {
    const f = await fixture()
    await f.add('a.jpg', 'b.jpg'); await f.finish(0, 'old-a'); await f.finish(1, 'old-b')
    const oldDownload = f.h.find(node => Object.hasOwn(node.props, 'data-image-download')).props.onClick
    const oldZip = f.h.find(node => Object.hasOwn(node.props, 'data-image-zip')).props.onClick
    f.h.find(node => node.type === 'input' && node.props.type === 'range').props.onChange({ target: { value: '40' } }); await f.settle()
    oldDownload(); oldZip(); await f.settle()
    assert.equal(f.downloads.length, 0); assert.equal(f.zips.length, 0)
    assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-image-download')).length, 0)
    await f.finish(2, 'new-a')
    f.h.find(node => Object.hasOwn(node.props, 'data-image-download')).props.onClick(); await f.settle()
    assert.equal(await f.urls.get(f.downloads[0].href).text(), 'new-a')
    await f.finish(3, 'new-b'); await f.zip()
    assert.deepEqual(await Promise.all(f.zips[0].entries.map(entry => entry.blob.text())), ['new-a', 'new-b'])
    f.cleanup(); f.zips[0].task.resolve(new Blob(['unmounted zip'])); await f.settle()
    assert.equal(f.downloads.length, 1)
    console.log('PASS actual parent stale download/ZIP handlers reject old keys and new files use current Blob')
  }
  {
    const f = await fixture()
    await f.add('one.jpg', 'two.jpg'); await f.finish(0, 'one'); await f.finish(1, 'two'); await f.zip()
    await f.add('pending.jpg')
    const sourceUrls = [...f.urls.keys()]
    f.cleanup()
    assert.equal(f.calls[2].signal.aborted, true)
    for (const url of sourceUrls) assert.equal(f.revoked.filter(value => value === url).length, 1)
    f.calls[2].task.resolve(output('late output')); f.zips[0].task.resolve(new Blob(['late zip'])); await f.settle()
    assert.equal(f.downloads.length, 0)
    const lateUrl = [...f.urls.keys()].find(url => !sourceUrls.includes(url))
    assert.ok(lateUrl); assert.equal(f.revoked.filter(url => url === lateUrl).length, 1)
    console.log('PASS actual parent cleanup releases previews/completed/late URLs once and blocks late ZIP')
  }
  {
    const f = await fixture()
    await f.add('same.jpg', 'SAME.jpg', 'same (2).jpg')
    for (let i = 0; i < 3; i++) await f.finish(i, `binary-${i}`)
    await f.zip(); const captured = f.zips[0].entries
    f.h.find(node => node.type === 'input' && node.props.type === 'range').props.onChange({ target: { value: '20' } }); await f.settle()
    await f.action('pause'); await f.action('clear')
    assert.equal(new Set(captured.map(entry => entry.name.toLowerCase())).size, 3)
    assert.deepEqual(await Promise.all(captured.map(entry => entry.blob.text())), ['binary-0', 'binary-1', 'binary-2'])
    f.zips[0].task.resolve(new Blob(['captured zip'])); await f.settle()
    assert.equal(f.downloads[0].name, 'compressed_3.zip')
    f.calls[3].task.reject(new Error('old settings failed after clear')); await f.settle()
    assert.equal(f.rows().length, 0); assert.equal(f.maximum(), 1)
    f.cleanup()
    console.log('PASS ZIP snapshot remains valid through settings/pause/clear and old rejection stays hidden')
  }
  console.log('Image parent independent: 3 groups passed')
})().catch(error => { console.error(error); process.exitCode = 1 })
