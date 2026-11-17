// Actual parent and queue, controlled compressor/ZIP/browser ports. Pixel checks are separate.
/* eslint-disable @typescript-eslint/no-require-imports -- This CommonJS fixture loads the existing CommonJS VM harness. */
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module')
const harnessPath = path.resolve('docs/verify/2026-11-17-repeat-batch19/component-harness.cjs')
const harnessModule = new Module(harnessPath)
harnessModule.filename = harnessPath; harnessModule.paths = Module._nodeModulePaths(path.dirname(harnessPath))
// Lower dynamic import to the fixture's require port; the actual browser chunk is tested separately.
harnessModule._compile(fs.readFileSync(harnessPath, 'utf8').replace("platform: 'node', jsx:", "platform: 'node', supported: { 'dynamic-import': false }, jsx:"), harnessPath)
const { componentHarness } = harnessModule.exports
const flush = async () => { for (let i = 0; i < 14; i++) await Promise.resolve() }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const output = tag => ({ blob: new Blob([tag], { type: 'image/jpeg' }), mime: 'image/jpeg', width: 100, height: 50, srcWidth: 400, srcHeight: 200, quality: 0.8, ok: true })

async function fixture() {
  const actual = await import('../../../src/utils/imageCompress.ts')
  const calls = [], zips = [], revoked = [], urls = new Map(), downloads = []
  let serial = 0, active = 0, maximum = 0
  class TestURL extends URL {
    static createObjectURL(blob) { const url = `blob:review-${++serial}`; urls.set(url, blob); return url }
    static revokeObjectURL(url) { revoked.push(url) }
  }
  class Zip {
    entries = []
    file(name, blob) { this.entries.push({ name, blob }) }
    generateAsync() { const task = deferred(); zips.push({ entries: this.entries, task }); return task.promise }
  }
  const h = await componentHarness('src/components/ImageCompressor.tsx', {
    props: {}, globals: { URL: TestURL, AbortController },
    document: { body: { appendChild() {} }, createElement() { return { href: '', download: '', click() { downloads.push({ href: this.href, name: this.download }) }, remove() {} } } },
    modules: {
      '@/utils/imageCompress': { ...actual, detectEncoders: async () => ({ webp: true, avif: true }), compressFile(file, options, signal) {
        const task = deferred(); active++; maximum = Math.max(maximum, active)
        calls.push({ file, options, signal, task }); return task.promise.finally(() => { active-- })
      } },
      jszip: { __esModule: true, default: Zip },
    },
  })
  h.render(); await flush(); h.render()
  return { h, calls, zips, revoked, urls, downloads, maximum: () => maximum,
    async settle() { await flush(); h.render() },
    async add(...names) { h.find(node => Object.hasOwn(node.props, 'data-image-input')).props.onChange({ target: { files: names.map(name => new File(['original'], name, { type: 'image/png' })), value: 'files' } }); await this.settle() },
    async action(name) { h.find(node => node.props['data-image-action'] === name).props.onClick(); await this.settle() },
    async format(name) { h.find(node => node.props['data-image-format'] === name).props.onClick(); await this.settle() },
    async zip() { h.find(node => Object.hasOwn(node.props, 'data-image-zip')).props.onClick(); await this.settle() },
    async finish(index, tag = String(index)) { calls[index].task.resolve(output(tag)); await this.settle() },
    rows() { return h.all().filter(node => Object.hasOwn(node.props, 'data-image-row')) },
    cleanup() { h.cleanup() },
  }
}

;(async () => {
  {
    const f = await fixture()
    await f.add('a.png', 'b.png')
    assert.equal(f.calls.length, 1)
    await f.action('pause'); assert.ok(f.calls[0].signal.aborted)
    await f.format('jpeg'); await f.add('c.png')
    assert.equal(f.calls.length, 1)
    await f.finish(0, 'canceled')
    assert.equal(f.calls.length, 1)
    assert.ok(f.rows().every(row => row.props['data-image-status'] === 'pending'))
    await f.action('resume')
    for (let i = 1; i <= 3; i++) await f.finish(i)
    assert.equal(f.maximum(), 1)
    assert.ok(f.rows().every(row => row.props['data-image-status'] === 'done'))
    assert.ok(f.revoked.some(url => f.urls.get(url)?.type === 'image/jpeg'))
    f.cleanup()
    console.log('PASS parent pause/settings/add/resume drains old work and processes latest settings once')
  }
  {
    const f = await fixture()
    await f.add('bad.png', 'good.png')
    f.calls[0].task.reject(new Error('decode')); await f.settle(); await f.finish(1)
    await f.add('new.png'); assert.equal(f.calls[2].file.name, 'new.png'); await f.finish(2)
    await f.action('retry'); assert.equal(f.calls[3].file.name, 'bad.png'); await f.finish(3)
    assert.equal(f.calls.length, 4)
    await f.format('png')
    assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-image-download')).length, 0)
    await f.action('clear')
    await f.finish(4, 'after-clear')
    assert.equal(f.rows().length, 0)
    assert.equal(f.maximum(), 1)
    f.cleanup()
    console.log('PASS parent retry only reruns failures and settings/clear hide stale outputs')
  }
  {
    const f = await fixture()
    await f.add('a.png', 'a.png'); await f.finish(0, 'first'); await f.finish(1, 'second')
    await f.zip()
    assert.deepEqual(f.zips[0].entries.map(entry => entry.name), ['a_compressed.jpg', 'a_compressed (2).jpg'])
    await f.action('clear')
    assert.deepEqual(await Promise.all(f.zips[0].entries.map(entry => entry.blob.text())), ['first', 'second'])
    f.zips[0].task.resolve(new Blob(['zip'])); await f.settle()
    assert.equal(f.downloads.length, 1)
    assert.equal(f.downloads[0].name, 'compressed_2.zip')
    f.cleanup()
    assert.ok(f.revoked.includes(f.downloads[0].href))
    console.log('PASS parent ZIP keeps clicked Blob snapshot through deletion and cleans its download URL')
  }
  {
    const f = await fixture()
    await f.add('a.png', 'b.png'); await f.finish(0); await f.finish(1)
    await f.zip(); await f.zip()
    f.zips[0].task.reject(new Error('obsolete zip failure')); await f.settle()
    assert.equal(f.h.all().filter(node => node.props.role === 'alert').length, 0)
    f.zips[1].task.reject(new Error('latest zip failure')); await f.settle()
    assert.ok(f.h.text().includes('queue.zipFailed'))
    await f.zip()
    f.cleanup(); f.zips[2].task.resolve(new Blob(['late zip'])); await flush()
    assert.equal(f.downloads.length, 0)
    console.log('PASS parent latest ZIP failure is visible and unmount suppresses a late download')
  }
  console.log('Image parent: 4 controlled event groups passed')
})().catch(error => { console.error(error); process.exitCode = 1 })
