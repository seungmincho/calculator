/* eslint-disable @typescript-eslint/no-require-imports -- Independent actual-component event review, no browser or external writes. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const esbuild = require('esbuild')
const flush = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

async function fixtures() {
  // Reuse controllable I/O fixtures, not the author's test cases or assertions.
  const original = fs.readFileSync('scripts/check-writing-diff-components.mjs', 'utf8')
  const source = original.slice(0, original.indexOf("await check('source click")) + '\nexport { sourceFixture, targetFixture, componentHarness, newPayload, envelope, saved, current, memory, messages, KEY, PATH, WRITING_VERSIONS_KEY, WRITING_DRAFT_KEY };'
  const built = await esbuild.build({ stdin: { contents: source, resolveDir: path.resolve('scripts'), loader: 'js' }, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external' })
  const location = path.resolve('scripts/writing-diff-review-fixture.cjs'), loaded = new Module(location)
  loaded.paths = Module._nodeModulePaths(path.dirname(location)); loaded._compile(built.outputFiles[0].text, location)
  return loaded.exports
}
async function main() {
  const { sourceFixture, targetFixture, componentHarness, newPayload, envelope, saved, current, memory, messages, KEY, WRITING_VERSIONS_KEY, WRITING_DRAFT_KEY } = await fixtures()
  let groups = 0
  const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }
  await check('all five actual CharacterCounter tabs send their exact snapshot while source bytes and undo remain intact', async () => {
    const store = memory(), m = messages('ko')
    const texts = ['', ' a\r\nb ', '\uD800', '\uFEFF한글\n😀', 'last source']
    const tabs = texts.map((text, index) => ({ ...current, text, title: `Title ${index + 1}` }))
    store.setItem(WRITING_DRAFT_KEY, JSON.stringify({ tabs, active: 0 })); store.setItem(WRITING_VERSIONS_KEY, envelope([saved]))
    const h = await componentHarness('src/components/CharacterCounter.tsx', { props: {}, messages: m, storagePort: store, window: { confirm: () => true } })
    h.render(); await flush(); h.render(); await flush(); h.render()
    for (let index = 0; index < 5; index++) {
      h.all().filter(node => node.props.role === 'tab')[index].props.onClick(); h.render(); await flush(); h.render()
      const child = h.find(node => typeof node.type === 'function' && node.type.name === 'WritingVersionsPanel')
      const f = await sourceFixture({ store, props: child.props }), before = [...store.data], writes = store.writes()
      f.send(); const data = JSON.parse(f.popups[0].sessionStorage.getItem(KEY))
      assert.equal(data.right.text, texts[index]); assert.equal(data.right.sourceTab, index + 1)
      assert.equal(data.left.text, saved.text); assert.equal(data.left.sourceTab, saved.sourceTab)
      assert.deepEqual([...store.data], before); assert.equal(store.writes(), writes); f.h.cleanup()
    }
    h.button(m.characterCounter.tools.upper).props.onClick(); h.render(); await flush(); h.render()
    const child = h.find(node => typeof node.type === 'function' && node.type.name === 'WritingVersionsPanel')
    const f = await sourceFixture({ store, props: child.props }); f.fail('popup'); const before = [...store.data]; f.send()
    assert.deepEqual([...store.data], before); assert.equal(h.button(m.characterCounter.tools.undo).props.disabled, false)
    h.button(m.characterCounter.tools.undo).props.onClick(); h.render(); await flush(); h.render()
    assert.deepEqual(JSON.parse(store.getItem(WRITING_DRAFT_KEY)).tabs, tabs); f.h.cleanup(); h.cleanup()
  })
  await check('opener removal failure closes only the newly opened tab and never navigates or changes the source', async () => {
    const f = await sourceFixture(), open = f.h.window.open, before = [...f.store.data], originalUrl = f.h.window.location.href
    f.h.window.open = (...args) => {
      const target = open(...args)
      Object.defineProperty(target, 'opener', { get: () => 'source', set() {}, configurable: true })
      return target
    }
    f.send(); assert.equal(f.notice(), 'handoffFailed'); assert.equal(f.popups.length, 1)
    assert.equal(f.popups[0].closed, true); assert.equal(f.popups[0].url, '')
    assert.deepEqual([...f.store.data], before); assert.equal(f.h.window.location.href, originalUrl); assert.equal(f.restored(), 0); f.h.cleanup()
  })
  await check('source second raw read rejects a changed selected version without opening a target or writing data', async () => {
    const f = await sourceFixture(), read = f.store.getItem
    const newer = envelope([{ ...saved, text: 'new authoritative saved text' }]); let reads = 0
    f.store.getItem = key => { if (key === WRITING_VERSIONS_KEY && ++reads === 2) f.store.data.set(key, newer); return read(key) }
    const writes = f.store.writes(); f.send()
    assert.equal(f.notice(), 'conflict'); assert.equal(f.popups.length, 0); assert.equal(f.store.data.get(WRITING_VERSIONS_KEY), newer)
    assert.equal(f.store.writes(), writes); assert.equal(f.props.current.text, current.text); f.h.cleanup()
  })
  await check('actual target edits inside either storage read supersede delivery and preserve unconsumed payload', async () => {
    for (const at of [1, 2]) {
      const f = await targetFixture(), read = f.store.getItem, raw = read(KEY); let reads = 0
      f.store.getItem = key => { if (key === KEY && ++reads === at) f.edit('left', `user edit during read ${at}`); return read(key) }
      f.start(); assert.equal(f.input('left'), `user edit during read ${at}`); assert.equal(read(KEY), raw); assert.equal(f.store.removes(), 0)
      f.h.replayEffects(); f.h.tick(0); assert.equal(f.input('left'), `user edit during read ${at}`); assert.equal(f.store.removes(), 0)
      f.h.cleanup()
    }
  })
  await check('replacement during conditional consumption remains stored while the applied older pair stays exact', async () => {
    const f = await targetFixture(), read = f.store.getItem, newer = JSON.stringify(newPayload('new left', 'new right')); let reads = 0
    f.store.getItem = key => { if (key === KEY && ++reads === 3) f.store.data.set(KEY, newer); return read(key) }
    f.start(); assert.equal(f.notice(), 'loaded'); assert.equal(f.input('left'), saved.text); assert.equal(f.input('right'), current.text)
    assert.equal(read(KEY), newer); assert.equal(f.store.removes(), 0); assert.ok(f.h.text().includes(f.m.diffViewer.handoff.cleanupFailed))
    f.locale('en'); f.h.replayEffects(); f.h.tick(0)
    assert.equal(f.input('left'), saved.text); assert.equal(read(KEY), newer); assert.equal(f.jobs.length, 0); f.h.cleanup()
  })
  await check('pending example copy is invalidated by delivery: late success or rejection cannot signal success or run fallback', async () => {
    for (const result of ['resolve', 'reject']) {
      const f = await targetFixture(), pending = deferred(); let fallbacks = 0
      f.h.context.navigator.clipboard.writeText = () => pending.promise
      f.h.document.execCommand = () => { fallbacks++; return true }
      await f.copy(); f.start()
      if (result === 'resolve') pending.resolve(); else pending.reject(new Error('late clipboard refusal'))
      await flush(); f.h.render()
      assert.equal(f.input('left'), saved.text); assert.equal(f.notice(), 'loaded'); assert.equal(fallbacks, 0)
      assert.ok(!f.h.text().includes(f.m.diffViewer.actions.copied)); assert.ok(!f.h.all().some(node => node.props.id === 'diff-copy-fallback'))
      assert.equal(f.jobs.length, 0); f.h.cleanup()
    }
  })
  await check('a comparison superseded by typing does not publish old rows, while the next explicit comparison exports its own snapshot', async () => {
    const f = await targetFixture({ payload: newPayload('unchanged\nold', 'unchanged\nnew') }); f.start()
    const comparing = f.h.button(f.m.diffViewer.actions.compare).props.onClick()
    f.edit('right', 'unchanged\nfinal'); await comparing; await flush(); f.h.render()
    assert.ok(!f.h.all().some(node => node.props['data-diff-type'])); assert.ok(f.h.text().includes(f.m.diffViewer.handoff.edited))
    await f.compare(); f.download()
    const exported = await f.blobs.at(-1).text()
    assert.ok(exported.includes('old')); assert.ok(exported.includes('final')); assert.ok(!exported.includes('+ new'))
    const pending = deferred(); f.h.context.navigator.clipboard.writeText = () => pending.promise
    await f.copy(); f.edit('right', 'third revision'); pending.resolve(); await flush(); f.h.render()
    assert.ok(!f.h.text().includes(f.m.diffViewer.actions.copied))
    assert.equal(await f.blobs.at(-1).text(), exported); f.h.cleanup()
  })
  console.log(`Writing Diff independent actual-parent review: ${groups} groups passed; no browser`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
