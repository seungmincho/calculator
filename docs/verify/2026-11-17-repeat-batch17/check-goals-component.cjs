const assert=require('node:assert/strict')
const {webcrypto}=require('node:crypto')
const {componentHarness}=require('./component-harness.cjs')
const entry='src/components/CsatGoalConditions.tsx',key='toolhub-csat-goals-v1'
const current={examYear:2027,referenceYear:2026,scores:{kor:'84',math:'80',eng:'85',hist:'42',inq1:'44',inq2:'41'},selection:{kor:'lm',math:'prob',inq1:'society',inq2:'ethics'}}
const goal={id:'g1',name:'기존 목표',areas:3,maxSum:7,createdAt:'2026-11-17T00:00:00.000Z',updatedAt:'2026-11-17T00:00:00.000Z'}
const raw=JSON.stringify({version:1,revision:'r1',goals:[goal]})
const clone=value=>JSON.parse(JSON.stringify(value))
const flush=async h=>{await new Promise(resolve=>setImmediate(resolve));h.render()}
let groups=0
async function check(name,run){await run();groups++;console.log(`PASS ${name}`)}
async function harness(options={}){const props={current:clone(current),ready:true,...options.props};const h=await componentHarness(entry,{globals:{crypto:webcrypto},...options,props});h.render();h.tick(0);return{h,props}}
function field(h,id,value){h.find(node=>node.props.id===`csat-goal-${id}`).props.onChange({target:{value}});h.render()}
function click(h,label){h.button(`goals.${label}`).props.onClick();h.render()}
function name(h,value='새 목표'){field(h,'name',value)}
function queue(){const jobs=[];return{navigator:{locks:{request(lockKey,options,action){assert.equal(lockKey,key);assert.equal(options.mode,'exclusive');return new Promise((resolve,reject)=>jobs.push({action,resolve,reject}))}}},release(){const job=jobs.shift();assert.ok(job);try{job.resolve(job.action())}catch(e){job.reject(e)}}}}
;(async()=>{
  await check('Readiness and explicit confirmation gate saving; update and deletion retain current scores',async()=>{
    const {h,props}=await harness({props:{ready:false}});name(h);assert.equal(h.button('goals.save').props.disabled,true)
    h.setProps({...props,ready:true});click(h,'save');assert.equal(h.stored.get(key),undefined);click(h,'confirm.saveAction');await flush(h)
    const stored=JSON.parse(h.stored.get(key));assert.equal(stored.goals.length,1);assert.equal(stored.goals[0].name,'새 목표');assert.equal('scores'in stored.goals[0],false)
    click(h,'edit');name(h,'수정 목표');field(h,'areas','2');field(h,'max','4');click(h,'update');click(h,'confirm.updateAction');await flush(h)
    const edited=JSON.parse(h.stored.get(key)).goals[0];assert.equal(edited.id,stored.goals[0].id);assert.equal(edited.createdAt,stored.goals[0].createdAt);assert.equal(edited.name,'수정 목표')
    click(h,'delete');assert.equal(JSON.parse(h.stored.get(key)).goals.length,1);click(h,'confirm.deleteAction');await flush(h)
    assert.equal(JSON.parse(h.stored.get(key)).goals.length,0);assert.deepEqual(props.current,current);h.cleanup()
  })
  await check('Pending save becomes stale after current scores change, and old completion cannot settle a new save',async()=>{
    const q=queue(),{h,props}=await harness({navigator:q.navigator});name(h,'이전 목표');click(h,'save');click(h,'confirm.saveAction')
    h.setProps({...props,current:{...current,scores:{...current.scores,kor:''}}});assert.match(h.text(),/goals.errors.stale/)
    name(h,'최신 목표');click(h,'save');click(h,'confirm.saveAction');q.release();await flush(h)
    assert.equal(h.stored.get(key),undefined);assert.match(h.text(),/goals.working/)
    q.release();await flush(h);assert.equal(JSON.parse(h.stored.get(key)).goals[0].name,'최신 목표');h.cleanup()
  })
  await check('Cancel, unmount and storage events invalidate queued mutations',async()=>{
    for(const event of ['cancel','unmount','storage']){
      const q=queue(),{h}=await harness({navigator:q.navigator,storage:{[key]:raw}});name(h);click(h,'save');click(h,'confirm.saveAction')
      if(event==='cancel')click(h,'cancel');else if(event==='unmount')h.cleanup();else{h.window.dispatch('storage',{key});h.render()}
      q.release();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.stored.get(key),raw);if(event!=='unmount')h.cleanup()
    }
  })
  await check('Quota keeps the draft and original; post-write read failure is uncertain until explicit refresh',async()=>{
    let stored=null,quota=true,deny=false,writes=0
    const storagePort={getItem(){if(deny)throw new Error('denied');return stored},setItem(_key,value){if(quota){const e=new Error('full');e.name='QuotaExceededError';throw e}stored=value;writes++;deny=true}}
    const {h}=await harness({storagePort});name(h);click(h,'save');click(h,'confirm.saveAction');await flush(h)
    assert.equal(stored,null);assert.match(h.text(),/goals.errors.quota/);assert.equal(h.find(node=>node.props.id==='csat-goal-name').props.value,'새 목표')
    quota=false;click(h,'refresh');click(h,'save');click(h,'confirm.saveAction');await flush(h)
    assert.equal(JSON.parse(stored).goals.length,1);assert.match(h.text(),/goals.errors.unverified/);assert.equal(writes,1)
    assert.equal(h.find(node=>node.props.id==='csat-goal-name').props.value,'새 목표');deny=false;click(h,'refresh');assert.equal(h.all().filter(node=>node.props['data-csat-goal-id']).length,1);assert.equal(writes,1);h.cleanup()
  })
  await check('Two readers preserve the winning list and the losing draft under the same lock',async()=>{
    let stored=null;const storagePort={getItem:()=>stored,setItem:(_key,value)=>stored=value},q=queue()
    const a=await harness({storagePort,navigator:q.navigator}),b=await harness({storagePort,navigator:q.navigator})
    name(a.h,'먼저 저장');click(a.h,'save');click(a.h,'confirm.saveAction');name(b.h,'다음 입력');click(b.h,'save');click(b.h,'confirm.saveAction')
    q.release();await flush(a.h);q.release();await flush(b.h)
    assert.equal(JSON.parse(stored).goals.length,1);assert.equal(JSON.parse(stored).goals[0].name,'먼저 저장');assert.match(b.h.text(),/goals.errors.conflict/)
    assert.equal(b.h.find(node=>node.props.id==='csat-goal-name').props.value,'다음 입력');a.h.cleanup();b.h.cleanup()
  })
  await check('Corrupt and future stores are protected; invalid condition cannot open confirmation',async()=>{
    for(const bad of ['{',JSON.stringify({version:2,goals:[]})]){const{h}=await harness({storage:{[key]:bad}});name(h);assert.equal(h.button('goals.save').props.disabled,true);assert.equal(h.stored.get(key),bad);h.cleanup()}
    const{h}=await harness();name(h);field(h,'areas','4');field(h,'max','3');assert.equal(h.button('goals.save').props.disabled,true);assert.match(h.text(),/goals.invalidCondition/);h.cleanup()
  })
  console.log(`Independent goals component: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
