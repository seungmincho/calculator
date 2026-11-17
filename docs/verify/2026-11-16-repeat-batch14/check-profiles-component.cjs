const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')
const KEY = 'toolhub:font-pair:profiles'
const styles = { title: { fontId: 'noto-serif-kr', size: 48, weight: 600 }, body: { fontId: 'pretendard', size: 18, weight: 400 } }
const profile = (id, name) => ({ id, name, styles })
const encode = profiles => JSON.stringify({ version: 1, profiles })
const settle = () => new Promise(resolve => setImmediate(resolve))
let id = 0, checks = 0
function memory(raw = null) {
  const state = { raw, quota: false, blockRead: false, afterWriteReadBlocked: false, writes: 0, writtenKeys: [] }
  return { state, getItem(key) { assert.equal(key, KEY); if (state.blockRead) throw new Error('Storage denied'); return state.raw },
    setItem(key, value) { state.writtenKeys.push(key); if (state.quota) { const error = new Error('Full'); error.name = 'QuotaExceededError'; throw error } state.raw = value; state.writes++; if (state.afterWriteReadBlocked) state.blockRead = true },
  }
}
async function setup(options = {}) {
  const storage = options.storage ?? memory(options.raw ?? null), applied = []
  let props = { styles: structuredClone(styles), ready: options.ready ?? true, onLoad(value) { applied.push(value); return true } }
  const h = await componentHarness('src/components/FontPairProfiles.tsx', { props, storagePort: storage, navigator: options.navigator ?? {}, globals: { crypto: { randomUUID: () => `review-id-${++id}` } } })
  h.render()
  return { h, storage, applied,
    name(value) { h.find(node => node.props?.id === 'font-pair-profile-name').props.onChange({ target: { value } }); h.render() },
    currentName() { return h.find(node => node.props?.id === 'font-pair-profile-name').props.value },
    async save() { h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle(); h.render() },
    async click(label) { h.button(`pairing.profiles.${label}`).props.onClick(); await settle(); h.render() },
    ready(value) { props = { ...props, ready: value }; h.setProps(props) },
  }
}
async function check(label, action) { await action(); checks++; console.log(`PASS ${label}`) }

async function main() {
  await check('storage reading never applies a profile; actions wait for URL restoration and panel starts open', async () => {
    const s = await setup({ raw: encode([profile('saved', '기존 스타일')]), ready: false })
    assert.equal(s.applied.length, 0); assert.equal(s.h.find(node => node.type === 'details').props.open, true)
    assert.equal(s.h.button('pairing.profiles.load').props.disabled, true)
    s.ready(true); assert.equal(s.h.button('pairing.profiles.load').props.disabled, false); assert.equal(s.applied.length, 0)
    await s.click('load'); assert.deepEqual(JSON.parse(JSON.stringify(s.applied)), [styles]); s.h.cleanup()
  })
  await check('explicit save stores only styles and clears name only after confirmed success', async () => {
    const s = await setup(); s.name('문서용'); await s.save()
    assert.equal(s.currentName(), ''); assert.ok(s.h.text().includes('pairing.profiles.saved'))
    const saved = JSON.parse(s.storage.state.raw); assert.equal(saved.profiles[0].name, '문서용'); assert.deepEqual(saved.profiles[0].styles, styles)
    assert.deepEqual(Object.keys(saved.profiles[0]).sort(), ['id', 'name', 'styles']); assert.deepEqual(s.storage.state.writtenKeys, [KEY]); assert.equal(s.applied.length, 0)
    s.h.cleanup()
  })
  await check('quota retains name and original list, then retry succeeds without refreshing away input', async () => {
    const s = await setup({ raw: encode([profile('existing', '기존')]) }), initial = s.storage.state.raw
    s.name('실패한 이름'); s.storage.state.quota = true; await s.save()
    assert.equal(s.storage.state.raw, initial); assert.equal(s.currentName(), '실패한 이름'); assert.ok(s.h.text().includes('errors.quota'))
    s.storage.state.quota = false; await s.save(); assert.equal(JSON.parse(s.storage.state.raw).profiles.length, 2); assert.equal(s.currentName(), '')
    s.h.cleanup()
  })
  await check('two waiting tabs serialize; stale second write retains input and retries only after reload', async () => {
    const storage = memory(), queue = []
    const navigator = { locks: { request(key, action) { assert.equal(key, KEY); return new Promise((resolve, reject) => queue.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } }
    const a = await setup({ storage, navigator }), b = await setup({ storage, navigator })
    a.name('첫 탭'); b.name('둘째 탭'); await a.save(); await b.save(); assert.equal(queue.length, 2)
    queue.shift()(); await settle(); a.h.render(); queue.shift()(); await settle(); b.h.render()
    assert.equal(JSON.parse(storage.state.raw).profiles.length, 1); assert.equal(b.currentName(), '둘째 탭'); assert.ok(b.h.text().includes('errors.conflict'))
    await b.click('refresh'); assert.equal(b.currentName(), '둘째 탭'); assert.equal(b.applied.length, 0)
    await b.save(); queue.shift()(); await settle(); b.h.render()
    assert.deepEqual(JSON.parse(storage.state.raw).profiles.map(value => value.name), ['첫 탭', '둘째 탭'])
    a.h.cleanup(); b.h.cleanup()
  })
  await check('external change before load blocks applying a stale style until explicit refresh', async () => {
    const s = await setup({ raw: encode([profile('saved', '처음')]) })
    s.storage.state.raw = encode([profile('replacement', '교체됨')]); await s.click('load')
    assert.equal(s.applied.length, 0); assert.ok(s.h.text().includes('errors.conflict'))
    await s.click('refresh'); assert.equal(s.applied.length, 0); await s.click('load'); assert.equal(s.applied.length, 1)
    s.h.cleanup()
  })
  await check('delete requires confirmation, quota retains list, and successful delete never applies a style', async () => {
    const s = await setup({ raw: encode([profile('saved', '보관 조합')]) }), initial = s.storage.state.raw
    await s.click('delete'); assert.equal(s.storage.state.raw, initial)
    s.storage.state.quota = true; await s.click('deleteConfirm'); assert.equal(s.storage.state.raw, initial); assert.ok(s.h.text().includes('errors.quota'))
    s.storage.state.quota = false; await s.click('deleteConfirm'); assert.equal(JSON.parse(s.storage.state.raw).profiles.length, 0); assert.equal(s.applied.length, 0)
    s.h.cleanup()
  })
  await check('corrupt/future/injected-manuscript snapshots cannot be silently replaced', async () => {
    for (const raw of ['{bad', JSON.stringify({ version: 2, profiles: [] }), encode([{ ...profile('saved', '문서'), text: 'PRIVATE' }])]) {
      const s = await setup({ raw }); assert.equal(s.h.find(node => node.props?.id === 'font-pair-profile-name').props.disabled, true)
      assert.equal(s.storage.state.raw, raw); assert.equal(s.storage.state.writes, 0); assert.equal(s.applied.length, 0)
      assert.ok(s.h.all().some(node => node.props?.role === 'alert')); s.h.cleanup()
    }
  })
  await check('post-write read failure reports unknown outcome, retains name and resolves through reload', async () => {
    const s = await setup(); s.name('확인 필요'); s.storage.state.afterWriteReadBlocked = true; await s.save()
    assert.equal(JSON.parse(s.storage.state.raw).profiles.length, 1); assert.equal(s.currentName(), '확인 필요')
    assert.ok(s.h.text().includes('errors.unavailable')); assert.equal(s.h.text().includes('pairing.profiles.saved'), false)
    s.storage.state.blockRead = false; s.storage.state.afterWriteReadBlocked = false; await s.click('refresh')
    assert.ok(s.h.text().includes('확인 필요')); assert.equal(s.storage.state.writes, 1); assert.equal(s.applied.length, 0)
    s.h.cleanup()
  })
  console.log(`Independent profile panel: ${checks} component groups passed`)
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
