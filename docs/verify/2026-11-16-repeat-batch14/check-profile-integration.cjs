const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')
const settle = () => new Promise(resolve => setImmediate(resolve))
const nextStyles = { title: { fontId: 'nanum-gothic', size: 52, weight: 400 }, body: { fontId: 'noto-serif-kr', size: 20, weight: 600 } }
const currentPair = { title: { fontId: 'noto-serif-kr', size: 36, weight: 700, text: '현재 제목 😀' }, body: { fontId: 'pretendard', size: 16, weight: 400, text: ' 현재 본문\n두 번째 줄 😀 ' } }
let count = 0
async function setup(options = {}) {
  const state = { links: [], faceTasks: [], copyTasks: [], copyMode: 'pending', fallbacks: 0, pair: null, updates: 0 }
  const onStateChange = value => { state.pair = value; state.updates++ }
  const document = {
    createElement(tag) { return { tag, dataset: {}, style: {}, removed: false, select() {}, remove() { this.removed = true } } },
    head: { appendChild(link) { state.links.push(link) } }, body: { appendChild() {} },
    execCommand() { state.fallbacks++; return true },
    fonts: { load(font, text) { return new Promise((resolve, reject) => state.faceTasks.push({ font, text, resolve, reject })) } },
  }
  const navigator = { clipboard: { writeText(text) { if (state.copyMode === 'success') return Promise.resolve(); return new Promise((resolve, reject) => state.copyTasks.push({ text, resolve, reject })) } } }
  const h = await componentHarness('src/components/FontPairPreview.tsx', {
    url: options.url ?? 'https://toolhub.ai.kr/font-preview/?f=pretendard', props: { savedState: options.savedState ?? null, onStateChange }, document, navigator,
    storagePort: { getItem() { throw new Error('Parent must not read profile storage') }, setItem() { throw new Error('Parent must not store manuscript') } },
  })
  h.render()
  return { h, state,
    profileProps() { return h.find(node => typeof node.type === 'function' && node.props && 'styles' in node.props && 'onLoad' in node.props).props },
    async flush() { await settle(); h.render() },
    async load(styles = nextStyles) { const props = this.profileProps(); const result = props.onLoad(styles); h.render(); await settle(); h.render(); return result },
    async fontsLoaded() { state.links.filter(link => !link.removed).forEach(link => link.onload?.()); await settle(); h.render() },
  }
}
async function check(label, action) { await action(); count++; console.log(`PASS ${label}`) }
async function main() {
  await check('initial shared URL wins before profile actions, and saved style load preserves URL manuscript', async () => {
    const url = 'https://toolhub.ai.kr/font-preview/?pair=1&pairTitleFont=pretendard&pairTitleSize=60&pairTitleWeight=900&pairTitleText=URL%20TITLE&pairBodyFont=nanum-gothic&pairBodySize=22&pairBodyWeight=400&pairBodyText=URL%20BODY'
    const s = await setup({ url }); assert.equal(s.profileProps().ready, false); assert.equal(await s.load(nextStyles), false)
    await s.flush(); assert.equal(s.profileProps().ready, true)
    assert.equal(s.state.pair.title.fontId, 'pretendard'); assert.equal(s.state.pair.title.size, 60); assert.equal(s.state.pair.title.text, 'URL TITLE')
    assert.equal(await s.load(), true); assert.equal(s.state.pair.title.fontId, nextStyles.title.fontId); assert.equal(s.state.pair.title.text, 'URL TITLE'); assert.equal(s.state.pair.body.text, 'URL BODY')
    assert.equal(s.h.window.location.href, url); s.h.cleanup()
  })
  await check('edited current text survives style load and invalid profiles cannot change state', async () => {
    const s = await setup({ savedState: currentPair }); await s.flush()
    const texts = s.h.all().filter(node => node.type === 'textarea')
    texts[0].props.onChange({ target: { value: ' 편집 제목 😀\n' } }); s.h.render()
    s.h.all().filter(node => node.type === 'textarea')[1].props.onChange({ target: { value: '바뀐 본문\n\r\n 그대로 ' } }); s.h.render()
    assert.equal(await s.load(), true); assert.equal(s.state.pair.title.text, ' 편집 제목 😀\n'); assert.equal(s.state.pair.body.text, '바뀐 본문\n\r\n 그대로 ')
    const before = JSON.stringify(s.state.pair)
    assert.equal(await s.load({ ...nextStyles, title: { ...nextStyles.title, fontId: 'local-font' } }), false)
    assert.equal(JSON.stringify(s.state.pair), before); s.h.cleanup()
  })
  await check('close and reopen use the parent memory draft rather than reapplying the initial URL', async () => {
    const url = 'https://toolhub.ai.kr/font-preview/?pair=1&pairTitleText=ORIGINAL&pairTitleFont=pretendard'
    const first = await setup({ url }); await first.flush(); await first.load(); const savedState = first.state.pair; first.h.cleanup()
    const second = await setup({ url, savedState }); await second.flush()
    assert.equal(second.profileProps().ready, true); assert.equal(second.profileProps().styles.title.fontId, nextStyles.title.fontId)
    assert.equal(second.h.all().filter(node => node.type === 'textarea')[0].props.value, 'ORIGINAL')
    assert.equal(second.state.updates, 0, 'remount does not reapply URL or auto-load a profile'); second.h.cleanup()
  })
  await check('old CSS/FontFace callbacks cannot overwrite new loaded-profile readiness or failure', async () => {
    for (const latestSucceeds of [true, false]) {
      const s = await setup({ savedState: currentPair }); await s.flush(); const oldLinks = s.state.links.filter(link => !link.removed), lateError = oldLinks[0].onerror
      await s.fontsLoaded(); const oldFaces = [...s.state.faceTasks]; assert.equal(oldFaces.length, 2)
      await s.load(); assert.ok(oldLinks.every(link => link.removed)); await s.fontsLoaded(); const newFaces = s.state.faceTasks.slice(oldFaces.length); assert.equal(newFaces.length, 2)
      if (latestSucceeds) newFaces.forEach(task => task.resolve([{ status: 'loaded' }]))
      else newFaces.forEach(task => task.reject(new Error('new font failed')))
      await s.flush(); assert.equal(s.h.text().includes('pairing.fontStatus.failed'), !latestSucceeds)
      lateError(); oldFaces.forEach(task => latestSucceeds ? task.reject(new Error('obsolete failure')) : task.resolve([{ status: 'loaded' }]))
      await s.flush(); assert.equal(s.h.text().includes('pairing.fontStatus.failed'), !latestSucceeds)
      assert.equal(s.h.text().includes('pairing.fontStatus.loading'), false); s.h.cleanup()
    }
  })
  await check('loading a saved style invalidates prior copy success/rejection and prevents stale fallback', async () => {
    for (const outcome of ['resolve', 'reject']) {
      const s = await setup({ savedState: currentPair }); await s.flush(); s.h.button('pairing.copyCss').props.onClick(); await s.flush()
      assert.equal(s.state.copyTasks.length, 1); await s.load(); assert.equal(s.h.button('pairing.copyCss').props.disabled, false)
      const task = s.state.copyTasks[0]; if (outcome === 'resolve') task.resolve(); else task.reject(new Error('old copy denied'))
      await s.flush(); assert.equal(s.state.fallbacks, 0); assert.equal(s.h.text().includes('pairing.copyStatus.css'), false); assert.equal(s.h.text().includes('pairing.copyStatus.failed'), false)
      s.state.copyMode = 'success'; s.h.button('pairing.copyCss').props.onClick(); await s.flush(); assert.ok(s.h.text().includes('pairing.copyStatus.css'))
      s.h.cleanup()
    }
  })
  console.log(`Independent profile integration: ${count} component groups passed`)
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
