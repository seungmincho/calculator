const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const { componentHarness, text } = require('./component-harness.cjs')
const entry = 'src/components/CsatScoreRecords.tsx', key = 'toolhub-csat-score-records-v1'
const current = { examYear: 2027, referenceYear: 2026, scores: { kor:'042', math:'80', eng:'', hist:'40', inq1:'0', inq2:'50' }, selection: { kor:'lm', math:'calc', inq1:'society', inq2:'ethics' } }
const saved = { id:'old', name:'이전 기록', createdAt:'2026-11-17T00:00:00.000Z', snapshot: { ...current, examYear:2026, referenceYear:2025, scores:{ ...current.scores, kor:'40', eng:'090' }, selection:{ ...current.selection, math:'prob' } } }
const raw = JSON.stringify({ version:1, revision:'r1', records:[saved] })
const clone = value => JSON.parse(JSON.stringify(value))
const globals = { crypto:webcrypto, AbortController }
let groups = 0
const flush = async h => { await new Promise(resolve => setImmediate(resolve)); h.render() }
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
async function harness(options = {}) {
  const restored = [], props = { current:clone(current), ready:true, fromLink:true, onRestore:value => restored.push(clone(value)), ...options.props }
  const h = await componentHarness(entry, { globals, ...options, props }); h.render(); h.tick(0)
  return { h, restored, props }
}
function name(h, value = '새 기록') { h.find(node => node.props.id === 'csat-score-record-name').props.onChange({ target:{ value } }); h.render() }
function select(h) { h.find(node => node.props.id === 'csat-score-record-select').props.onChange({ target:{ value:saved.id } }); h.render() }
function begin(h, kind) { h.button(`records.${kind}`).props.onClick(); h.render() }
function confirm(h, kind) { h.button(`records.confirm.${kind}Action`).props.onClick(); h.render() }
function waitingLock() {
  const jobs = []
  return { navigator:{ locks:{ request(lockKey, options, action) {
    assert.equal(lockKey, key); assert.equal(options.mode, 'exclusive')
    return new Promise((resolve,reject) => jobs.push({ action,resolve,reject }))
  } } }, release() { const job=jobs.shift(); assert.ok(job); try { job.resolve(job.action()) } catch(error) { job.reject(error) } } }
}
;(async () => {
  await check('Selection only compares; different subject, missing score and changed year stay explicit', async () => {
    const { h, restored } = await harness({ storage:{ [key]:raw } }); select(h)
    assert.equal(restored.length,0); assert.equal(h.stored.get(key),raw)
    const rows = h.all().filter(node => node.props['data-score-field'])
    assert.equal(rows.length,6)
    assert.match(text(rows.find(node => node.props['data-score-field']==='kor')), /records.difference\{"value":"\+2"\}/)
    assert.match(text(rows.find(node => node.props['data-score-field']==='math')), /records.reasons.differentSubject/)
    assert.match(text(rows.find(node => node.props['data-score-field']==='eng')), /records.emptyScore/)
    assert.match(text(rows.find(node => node.props['data-score-field']==='eng')), /records.reasons.missingScore/)
    assert.match(h.text(), /records.differentYear/); h.cleanup()
  })
  await check('URL readiness blocks actions and only explicit confirmation restores raw values', async () => {
    const { h, restored, props } = await harness({ storage:{ [key]:raw }, props:{ ready:false } }); select(h)
    assert.equal(h.button('records.load').props.disabled,true)
    h.setProps({ ...props,ready:true }); begin(h,'load'); assert.equal(restored.length,0)
    assert.match(h.text(),/records.sharedRestore/)
    confirm(h,'load'); await flush(h)
    assert.deepEqual(restored,[saved.snapshot]); assert.equal(h.stored.get(key),raw); h.cleanup()
  })
  await check('Confirmed save preserves blank and leading-zero input; deletion never restores current input', async () => {
    const { h, restored } = await harness(); name(h); begin(h,'save')
    assert.equal(h.stored.get(key),undefined)
    confirm(h,'save'); await flush(h)
    assert.deepEqual(JSON.parse(h.stored.get(key)).records[0].snapshot,current)
    assert.equal(h.find(node => node.props.id==='csat-score-record-name').props.value,'')
    begin(h,'delete'); confirm(h,'delete'); await flush(h)
    assert.equal(JSON.parse(h.stored.get(key)).records.length,0); assert.equal(restored.length,0); h.cleanup()
  })
  await check('A draft change while loading waits for the lock cancels the replacement', async () => {
    const lock=waitingLock(), { h, restored, props }=await harness({ navigator:lock.navigator, storage:{ [key]:raw } }); select(h); begin(h,'load'); confirm(h,'load')
    h.setProps({ ...props,current:{ ...current,scores:{ ...current.scores,kor:'88' } } })
    lock.release(); await flush(h)
    assert.equal(restored.length,0); assert.equal(h.stored.get(key),raw); assert.match(h.text(),/records.errors.stale/); h.cleanup()
  })
  await check('An obsolete save completion cannot clear or overwrite a newer confirmed save', async () => {
    const lock=waitingLock(), { h, props }=await harness({ navigator:lock.navigator }); name(h,'이전 입력'); begin(h,'save'); confirm(h,'save')
    const changed={ ...current,scores:{ ...current.scores,kor:'90' } }
    h.setProps({ ...props,current:changed }); name(h,'최신 입력'); begin(h,'save'); confirm(h,'save')
    lock.release(); await flush(h)
    assert.equal(h.stored.get(key),undefined); assert.match(h.text(),/records.working/)
    lock.release(); await flush(h)
    const records=JSON.parse(h.stored.get(key)).records
    assert.equal(records.length,1); assert.equal(records[0].name,'최신 입력'); assert.deepEqual(records[0].snapshot,changed); h.cleanup()
  })
  await check('Cancel and unmount invalidate pending work even when the Web Lock callback arrives later', async () => {
    const lock=waitingLock(), { h, restored }=await harness({ navigator:lock.navigator, storage:{ [key]:raw } }); select(h); begin(h,'load'); confirm(h,'load')
    h.button('records.cancel').props.onClick(); h.render(); lock.release(); await flush(h)
    assert.equal(restored.length,0); assert.equal(h.stored.get(key),raw); h.cleanup()
    const nextLock=waitingLock(), next=await harness({ navigator:nextLock.navigator }); name(next.h); begin(next.h,'save'); confirm(next.h,'save'); next.h.cleanup(); nextLock.release()
    await new Promise(resolve=>setImmediate(resolve)); assert.equal(next.h.stored.get(key),undefined)
  })
  await check('Quota preserves the original and typed name; readback denial reports an uncertain saved result', async () => {
    let stored=null, quota=true, denyRead=false, readback=false, writes=0
    const quotaError=new Error('full'); quotaError.name='QuotaExceededError'
    const storagePort={ getItem:()=>{if(denyRead)throw new Error('denied');return stored},setItem:(_key,value)=>{if(quota)throw quotaError;stored=value;writes++;denyRead=readback} }
    const { h }=await harness({ storagePort }); name(h); begin(h,'save'); confirm(h,'save'); await flush(h)
    assert.equal(stored,null); assert.match(h.text(),/records.errors.quota/); assert.equal(h.find(node=>node.props.id==='csat-score-record-name').props.value,'새 기록')
    quota=false; readback=true; h.button('records.refresh').props.onClick(); h.render(); begin(h,'save'); confirm(h,'save'); await flush(h)
    assert.equal(JSON.parse(stored).records.length,1); assert.equal(writes,1); assert.match(h.text(),/records.errors.unverified/)
    assert.equal(h.find(node=>node.props.id==='csat-score-record-name').props.value,'새 기록')
    denyRead=false; h.button('records.refresh').props.onClick(); h.render(); assert.equal(h.all().filter(node=>node.type==='option').length,2); assert.equal(writes,1); h.cleanup()
  })
  await check('Concurrent readers reject stale storage and retain the losing input', async () => {
    const lock=waitingLock(); let stored=null
    const storagePort={ getItem:()=>stored,setItem:(_key,value)=>{stored=value} }
    const one=await harness({ storagePort,navigator:lock.navigator }), two=await harness({ storagePort,navigator:lock.navigator })
    name(one.h,'첫 기록'); begin(one.h,'save'); confirm(one.h,'save'); name(two.h,'둘째 기록'); begin(two.h,'save'); confirm(two.h,'save')
    lock.release(); await flush(one.h); lock.release(); await flush(two.h)
    assert.equal(JSON.parse(stored).records.length,1); assert.equal(JSON.parse(stored).records[0].name,'첫 기록')
    assert.match(two.h.text(),/records.errors.conflict/); assert.equal(two.h.find(node=>node.props.id==='csat-score-record-name').props.value,'둘째 기록')
    one.h.cleanup(); two.h.cleanup()
  })
  await check('Corrupt, future and oversized storage stay intact with actions blocked', async () => {
    for(const invalid of ['{bad','{"version":9}',' '.repeat(65537)]) {
      const { h }=await harness({ storage:{ [key]:invalid } }); name(h)
      assert.equal(h.button('records.save').props.disabled,true); assert.equal(h.stored.get(key),invalid); h.cleanup()
    }
  })
  console.log(`Independent CSAT records: ${groups} component groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
