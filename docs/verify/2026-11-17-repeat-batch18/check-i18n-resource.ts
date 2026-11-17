import assert from 'node:assert/strict'
import {createTranslationResource,getActiveTranslationFailureCount,retryActiveTranslations} from '../../../src/lib/i18n/translationResource.ts'
let groups=0
async function check(name:string,run:()=>Promise<void>){await run();groups++;console.log(`PASS ${name}`)}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason?:unknown)=>void;const promise=new Promise<T>((res,rej)=>{resolve=res;reject=rej});return{promise,resolve,reject}}
const ko={demo:{title:'한국어'}},en={demo:{title:'English'}}
await check('Registration does not load English; concurrent consumers share exactly one request',async()=>{
  let calls=0;const d=deferred<typeof en>(),resource=createTranslationResource(ko,()=>{calls++;return d.promise})
  assert.equal(calls,0);assert.equal(resource.getSnapshot().status,'idle')
  const a=resource.load(),b=resource.load();assert.equal(a,b);await Promise.resolve();assert.equal(calls,1)
  d.resolve(en);await a;assert.equal(resource.getSnapshot().en,en);assert.equal(resource.getSnapshot().status,'ready')
  await resource.load({retry:true});assert.equal(calls,1)
})
await check('Handled failure remains stable until explicit retry and only active failures are retried',async()=>{
  let calls=0;const active=createTranslationResource(ko,()=>{calls++;return calls===1?Promise.reject(new Error('offline')):Promise.resolve(en)})
  let inactiveCalls=0;const inactive=createTranslationResource(ko,()=>{inactiveCalls++;return Promise.reject(new Error('offline'))})
  const release=active.retain();await Promise.all([active.load(),inactive.load()]);assert.equal(getActiveTranslationFailureCount(),1)
  const failed=active.getSnapshot();await active.load();await active.load();assert.equal(active.getSnapshot(),failed);assert.equal(calls,1)
  await retryActiveTranslations();assert.equal(calls,2);assert.equal(inactiveCalls,1);assert.equal(active.getSnapshot().status,'ready');assert.equal(getActiveTranslationFailureCount(),0)
  release();release();assert.equal(getActiveTranslationFailureCount(),0)
})
await check('HMR source replacement discards old success and old failure without hiding a new request',async()=>{
  for(const outcome of ['success','failure']){
    const old=deferred<typeof en>(),fresh=deferred<typeof en>(),r=createTranslationResource(ko,()=>old.promise)
    const oldLoad=r.load();await Promise.resolve();const nextKo={demo:{title:'새 한국어'}}
    r.replace(nextKo,()=>fresh.promise);const nextLoad=r.load();await Promise.resolve()
    if(outcome==='success')old.resolve({demo:{title:'obsolete'}});else old.reject(new Error('obsolete'))
    await oldLoad;assert.equal(r.getSnapshot().ko,nextKo);assert.equal(r.getSnapshot().status,'loading');assert.equal(r.getSnapshot().en,null)
    fresh.resolve(en);await nextLoad;assert.equal(r.getSnapshot().en,en)
  }
})
await check('Released consumers cannot pollute active failure notices or global retry',async()=>{
  let calls=0;const d=deferred<typeof en>(),r=createTranslationResource(ko,()=>{calls++;return d.promise}),release=r.retain()
  const load=r.load();release();d.reject(new Error('late'));await load
  assert.equal(r.getSnapshot().status,'failed');assert.equal(getActiveTranslationFailureCount(),0)
  await retryActiveTranslations();assert.equal(calls,1)
  const releaseAgain=r.retain();assert.equal(getActiveTranslationFailureCount(),1);releaseAgain();assert.equal(getActiveTranslationFailureCount(),0)
})
await check('Invalid catalogue rejects safely and source revision changes only on replacement',async()=>{
  const loader=async()=>[] as unknown as typeof en,r=createTranslationResource(ko,loader),revision=r.getSnapshot().revision
  await r.load();assert.equal(r.getSnapshot().status,'failed');assert.equal(r.getSnapshot().revision,revision)
  r.replace(ko,loader);assert.equal(r.getSnapshot().revision,revision)
  r.replace({...ko},async()=>en);assert.equal(r.getSnapshot().revision,revision+1);await r.load();assert.equal(r.getSnapshot().revision,revision+1)
})
console.log(`Independent i18n resource: ${groups} groups passed`)
