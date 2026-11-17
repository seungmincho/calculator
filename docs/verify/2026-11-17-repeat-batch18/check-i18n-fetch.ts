import assert from 'node:assert/strict'
import {loadTranslationFallback} from '../../../src/lib/i18n/translationFetch.ts'
import {createTranslationResource} from '../../../src/lib/i18n/translationResource.ts'
let groups=0
async function check(name:string,run:()=>Promise<void>){await run();groups++;console.log(`PASS ${name}`)}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>resolve=done);return{promise,resolve}}
const originalFetch=globalThis.fetch
const url=(name:string)=>`/i18n/en/ns/${name}.1234567890abcdef.json`
try{
  await check('Resource passes retry true only for a failed resource plus an explicit retry',async()=>{
    const contexts:unknown[]=[],r=createTranslationResource({demo:{}},async context=>{contexts.push(context);if(contexts.length===1)throw Error('import cached failure');return{demo:{label:'English'}}})
    await r.load({retry:true});assert.equal(r.getSnapshot().status,'failed');assert.deepEqual(contexts,[{retry:false}])
    await r.load();assert.equal(contexts.length,1);await r.load({retry:true});assert.deepEqual(contexts,[{retry:false},{retry:true}]);assert.equal(r.getSnapshot().status,'ready')
    await r.load({retry:true});assert.equal(contexts.length,2)
  })
  await check('Concurrent fallback requests share one fetch and only success is cached',async()=>{
    let calls=0;const response=deferred<Response>()
    globalThis.fetch=async(input,options)=>{calls++;assert.equal(String(input),url('reviewCache'));assert.equal(options?.cache,'no-store');return response.promise}
    const a=loadTranslationFallback(url('reviewCache'),['reviewCache']),b=loadTranslationFallback(url('reviewCache'),['reviewCache'])
    await Promise.resolve();assert.equal(calls,1);response.resolve(new Response(JSON.stringify({reviewCache:{label:'English'}}),{status:200}))
    const [one,two]=await Promise.all([a,b]);assert.equal(one,two);assert.equal((await loadTranslationFallback(url('reviewCache'),['reviewCache'])),one);assert.equal(calls,1)
  })
  await check('HTTP and JSON failures remain retryable and cannot poison a later successful fallback',async()=>{
    let calls=0;globalThis.fetch=async()=>{calls++;return calls===1?new Response('offline',{status:503}):calls===2?new Response('not JSON',{status:200}):new Response(JSON.stringify({reviewRetry:{label:'Ready'}}))}
    await assert.rejects(loadTranslationFallback(url('reviewRetry'),['reviewRetry']));await assert.rejects(loadTranslationFallback(url('reviewRetry'),['reviewRetry']))
    assert.deepEqual(await loadTranslationFallback(url('reviewRetry'),['reviewRetry']),{reviewRetry:{label:'Ready'}});assert.equal(calls,3)
    await loadTranslationFallback(url('reviewRetry'),['reviewRetry']);assert.equal(calls,3)
  })
  await check('Wrong namespace, extra namespace and non-object namespace bodies are rejected before cache',async()=>{
    const invalid:unknown[]=[null,[],{other:{}},{reviewShape:{},extra:{}},{reviewShape:[]},{reviewShape:'text'}]
    let calls=0;globalThis.fetch=async()=>{const index=calls++;return new Response(JSON.stringify(index<invalid.length?invalid[index]:{reviewShape:{label:'Valid'}}))}
    for(let i=0;i<invalid.length;i++)await assert.rejects(loadTranslationFallback(url('reviewShape'),['reviewShape']))
    assert.deepEqual(await loadTranslationFallback(url('reviewShape'),['reviewShape']),{reviewShape:{label:'Valid'}});assert.equal(calls,invalid.length+1)
  })
  await check('Unapproved URLs cannot create a request',async()=>{
    let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}')}
    for(const invalid of ['https://example.com/i18n/en/ns/a.1234567890abcdef.json','/i18n/en/ns/a.json','/i18n/en/ns/../a.1234567890abcdef.json','/i18n/en/ns/a.1234567890abcdef.json?x=1','/i18n/ko/ns/a.1234567890abcdef.json'])await assert.rejects(loadTranslationFallback(invalid,['a']))
    assert.equal(calls,0)
  })
  await check('A late fallback cannot replace a newer resource source',async()=>{
    const delayed=deferred<Response>();let calls=0
    globalThis.fetch=async()=>{calls++;return delayed.promise}
    const r=createTranslationResource({reviewLate:{label:'KO1'}},async context=>{if(!context?.retry)throw Error('import failure');return loadTranslationFallback(url('reviewLate'),['reviewLate'])})
    await r.load();const pending=r.load({retry:true});await Promise.resolve();await Promise.resolve()
    r.replace({reviewLate:{label:'KO2'}},async()=>({reviewLate:{label:'EN2'}}));await r.load()
    delayed.resolve(new Response(JSON.stringify({reviewLate:{label:'obsolete EN1'}})));await pending
    assert.deepEqual(r.getSnapshot().en,{reviewLate:{label:'EN2'}});assert.equal(calls,1)
  })
}finally{globalThis.fetch=originalFetch}
console.log(`Independent i18n fallback: ${groups} groups passed`)
