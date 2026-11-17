const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const { componentHarness } = require('./component-harness.cjs')
const entry = 'src/components/GradeSavedRecords.tsx'
const key = 'toolhub-grade-records-v1'
const current = { entryYear: 2024, system: 9, rows: [
  { name: '동일 과목', units: ' 2.5 ', rank: '01', ties: '2', total: '100' },
  { name: '동일 과목', units: '-', rank: '', ties: '', total: 'abc' },
] }
const saved = { id: 'saved-a', name: '중간고사', createdAt: '2026-11-17T00:00:00.000Z', snapshot: { ...current, system: 5 } }
const store = { version: 1, revision: 'rev-a', records: [saved] }
const raw = JSON.stringify(store)
const globals = { crypto: webcrypto, AbortController }
const clone = value => JSON.parse(JSON.stringify(value))
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
async function harness(options = {}) {
  const restored = []
  const props = { current: clone(current), ready: true, onRestore: snapshot => restored.push(clone(snapshot)), ...options.props }
  const h = await componentHarness(entry, { globals, ...options, props }); h.render()
  return { h, restored, props }
}
function select(h) { h.find(node => node.type === 'select').props.onChange({ target: { value: saved.id } }); h.render() }
function name(h, value = '기말고사') { h.find(node => node.type === 'input').props.onChange({ target: { value } }); h.render() }
function waitingLock() {
  const jobs = []
  return {
    navigator: { locks: { request(lockKey, options, action) {
      assert.equal(lockKey, key); assert.equal(options.mode, 'exclusive')
      return new Promise((resolve, reject) => {
        const job = { action, resolve, reject, aborted: false }; jobs.push(job)
        options.signal?.addEventListener('abort', () => { job.aborted = true; reject(new DOMException('Canceled', 'AbortError')) }, { once: true })
      })
    } } },
    release() { const job = jobs.shift(); assert.ok(job); if (!job.aborted) { try { job.resolve(job.action()) } catch (error) { job.reject(error) } } },
  }
}

;(async () => {
  await check('Reading never loads; pre-URL ready blocks every action; confirmed load preserves raw inputs', async () => {
    const { h, restored, props } = await harness({ storage: { [key]: raw }, props: { ready: false } })
    select(h)
    assert.equal(h.button('records.load').props.disabled, true)
    assert.equal(restored.length, 0); assert.equal(h.stored.get(key), raw)
    h.setProps({ ...props, ready: true }); h.button('records.load').props.onClick(); h.render()
    assert.equal(restored.length, 0)
    h.button('records.cancel').props.onClick(); h.render(); assert.equal(restored.length, 0)
    h.button('records.load').props.onClick(); h.render(); await h.button('records.confirmLoad').props.onClick(); h.render()
    assert.deepEqual(restored, [saved.snapshot]); assert.equal(h.stored.get(key), raw)
    h.cleanup()
  })
  await check('Explicit save retains duplicate names, blank fields and malformed numeric strings without touching current', async () => {
    const { h, restored, props } = await harness(); name(h)
    await h.button('records.save').props.onClick(); h.render()
    const result = JSON.parse(h.stored.get(key))
    assert.equal(result.records.length, 1); assert.deepEqual(result.records[0].snapshot, current)
    assert.deepEqual(props.current, current); assert.equal(restored.length, 0)
    assert.equal(h.find(node => node.type === 'input').props.value, '')
    h.cleanup()
  })
  await check('Explicit deletion removes the selected record while current input and restore callback stay unchanged', async () => {
    const { h, restored, props } = await harness({ storage: { [key]: raw } }); select(h)
    h.button('records.delete').props.onClick(); h.render(); assert.equal(h.stored.get(key), raw)
    await h.button('records.confirmDelete').props.onClick(); h.render()
    assert.equal(JSON.parse(h.stored.get(key)).records.length, 0)
    assert.deepEqual(props.current, current); assert.equal(restored.length, 0)
    h.cleanup()
  })
  await check('Quota retains name and existing storage; explicit refresh permits a successful retry', async () => {
    let stored = null, fail = true
    const quota = new Error('Full'); quota.name = 'QuotaExceededError'
    const storagePort = { getItem: () => stored, setItem: (_key, value) => { if (fail) throw quota; stored = value } }
    const { h } = await harness({ storagePort }); name(h)
    await h.button('records.save').props.onClick(); h.render()
    assert.equal(stored, null); assert.match(h.text(), /records.errors.quota/)
    assert.equal(h.find(node => node.type === 'input').props.value, '기말고사')
    fail = false; h.button('records.refresh').props.onClick(); h.render()
    await h.button('records.save').props.onClick(); h.render()
    assert.equal(JSON.parse(stored).records.length, 1)
    h.cleanup()
  })
  await check('Readback failure reports uncertainty, keeps typed name and does not roll back a successful write', async () => {
    let stored = null, denied = false, writes = 0
    const storagePort = { getItem: () => { if (denied) throw new Error('Read denied'); return stored }, setItem: (_key, value) => { stored = value; writes++; denied = true } }
    const { h } = await harness({ storagePort }); name(h)
    await h.button('records.save').props.onClick(); h.render()
    assert.equal(JSON.parse(stored).records.length, 1); assert.equal(writes, 1)
    assert.match(h.text(), /records.errors.unconfirmed/)
    assert.equal(h.find(node => node.type === 'input').props.value, '기말고사')
    denied = false; h.button('records.refresh').props.onClick(); h.render()
    assert.equal(h.all().filter(node => node.type === 'option').length, 2); assert.equal(writes, 1)
    h.cleanup()
  })
  await check('Pending load refuses to replace a draft edited while waiting for the Web Lock', async () => {
    const lock = waitingLock()
    const { h, restored, props } = await harness({ navigator: lock.navigator, storage: { [key]: raw } }); select(h)
    h.button('records.load').props.onClick(); h.render()
    const pending = h.button('records.confirmLoad').props.onClick(); h.render()
    h.setProps({ ...props, current: { ...current, rows: [{ ...current.rows[0], rank: '7' }] } })
    lock.release(); await pending; h.render()
    assert.equal(restored.length, 0); assert.match(h.text(), /records.errors.changed/)
    assert.equal(h.stored.get(key), raw); h.cleanup()
  })
  await check('Cancel and unmount prevent a queued load or save from completing', async () => {
    const lock = waitingLock()
    const { h, restored } = await harness({ navigator: lock.navigator, storage: { [key]: raw } }); select(h)
    h.button('records.load').props.onClick(); h.render()
    const pending = h.button('records.confirmLoad').props.onClick(); h.render()
    h.button('records.cancel').props.onClick(); lock.release(); await pending; h.render()
    assert.equal(restored.length, 0); assert.equal(h.stored.get(key), raw); h.cleanup()
    const nextLock = waitingLock(); const next = await harness({ navigator: nextLock.navigator }); name(next.h)
    const save = next.h.button('records.save').props.onClick(); next.h.render(); next.h.cleanup()
    nextLock.release(); await save; assert.equal(next.h.stored.get(key), undefined)
  })
  await check('Two readers cannot overwrite a newer record with an old snapshot', async () => {
    const lock = waitingLock(); let stored = null
    const storagePort = { getItem: () => stored, setItem: (_key, value) => { stored = value } }
    const one = await harness({ storagePort, navigator: lock.navigator })
    const two = await harness({ storagePort, navigator: lock.navigator })
    name(one.h, '첫 기록'); name(two.h, '둘째 기록')
    const p1 = one.h.button('records.save').props.onClick(); const p2 = two.h.button('records.save').props.onClick()
    lock.release(); await p1; one.h.render(); lock.release(); await p2; two.h.render()
    assert.equal(JSON.parse(stored).records.length, 1)
    assert.equal(JSON.parse(stored).records[0].name, '첫 기록')
    assert.match(two.h.text(), /records.errors.conflict/)
    assert.equal(two.h.find(node => node.type === 'input').props.value, '둘째 기록')
    one.h.cleanup(); two.h.cleanup()
  })
  await check('Corrupt and unsupported records never trigger load or overwrite', async () => {
    for (const invalid of ['{broken', JSON.stringify({ ...store, version: 9 })]) {
      const { h, restored } = await harness({ storage: { [key]: invalid } }); name(h)
      assert.equal(h.button('records.save').props.disabled, true)
      assert.equal(restored.length, 0); assert.equal(h.stored.get(key), invalid); h.cleanup()
    }
  })
  console.log(`Independent grade records: ${groups} component groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
