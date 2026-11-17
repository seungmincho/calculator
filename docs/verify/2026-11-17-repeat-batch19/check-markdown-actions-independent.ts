import assert from 'node:assert/strict'
import {copyMarkdownContent,createMarkdownActionGuard,readMarkdownTextFile,MARKDOWN_TEXT_FILE_LIMIT,type MarkdownClipboardPorts} from '../../../src/utils/markdownActions.ts'
let groups=0
async function check(name:string,run:()=>Promise<void>){await run();groups++;console.log(`PASS ${name}`)}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(cause:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
const snapshot={markdown:'# 제목\n본문',html:'<h1>제목</h1><p>본문</p>'}
await check('Rich failures never become plain success and every fallback must return actual true',async()=>{
  for(const target of ['md','html','rich'] as const){
    let textCalls=0,richCalls=0
    const ports:MarkdownClipboardPorts={writeText:async()=>{throw Error('denied')},writeRich:async()=>{throw Error('denied')},fallbackText:text=>{textCalls++;assert.equal(text,target==='html'?snapshot.html:snapshot.markdown);return false},fallbackRich:html=>{richCalls++;assert.equal(html,snapshot.html);return false}}
    assert.equal(await copyMarkdownContent(snapshot,target,ports),'failed');assert.equal(textCalls,target==='rich'?0:1);assert.equal(richCalls,target==='rich'?1:0)
  }
})
await check('Late failure of a previous copy cannot start fallback after a different target or document change',async()=>{
  for(const change of ['copy','document']){
    const guard=createMarkdownActionGuard(),old=guard.beginCopy(),pending=deferred<void>();let fallbacks=0
    const ports:MarkdownClipboardPorts={writeText:()=>pending.promise,fallbackText:()=>{fallbacks++;return true},fallbackRich:()=>true}
    const first=copyMarkdownContent(snapshot,'md',ports,()=>guard.isCurrent(old))
    if(change==='copy'){const next=guard.beginCopy();assert.equal(await copyMarkdownContent(snapshot,'rich',{writeRich:async()=>{},fallbackRich:()=>false,fallbackText:()=>false},()=>guard.isCurrent(next)),'copied')}else guard.invalidateDocument()
    pending.reject(Error('old rejection'));assert.equal(await first,'stale');assert.equal(fallbacks,0)
  }
})
await check('Snapshot payload is fixed before awaits and stale completion reports no current success',async()=>{
  const guard=createMarkdownActionGuard(),token=guard.beginCopy(),pending=deferred<void>(),mutable={...snapshot};let actual=''
  const promise=copyMarkdownContent(mutable,'rich',{writeRich:async html=>{actual=html;await pending.promise},fallbackText:()=>false,fallbackRich:()=>false},()=>guard.isCurrent(token))
  mutable.html='<p>new</p>';guard.invalidateDocument();pending.resolve();assert.equal(await promise,'stale');assert.equal(actual,snapshot.html)
})
await check('File validation is pre-read and preserves empty files at the exact byte cap',async()=>{
  let reads=0;const read=async()=>{reads++;return''}
  for(const file of [{name:'bad.exe',size:1},{name:'x.md',size:MARKDOWN_TEXT_FILE_LIMIT+1},{name:'x.txt',size:NaN},{name:'x.txt',size:-1}])assert.equal((await readMarkdownTextFile(file,read)).status,'failed')
  assert.equal(reads,0);assert.deepEqual(await readMarkdownTextFile({name:'EXAMPLE.MARKDOWN',size:MARKDOWN_TEXT_FILE_LIMIT},read),{status:'ready',text:''});assert.equal(reads,1)
})
await check('Reverse reads, document edits and invalidation discard both old success and old error',async()=>{
  for(const outcome of ['success','error']){
    const guard=createMarkdownActionGuard(),old=guard.beginRead(),pending=deferred<string>()
    const first=readMarkdownTextFile({name:'old.md',size:1},()=>pending.promise,()=>guard.isCurrent(old))
    const next=guard.beginRead();assert.deepEqual(await readMarkdownTextFile({name:'new.txt',size:3},async()=>'new',()=>guard.isCurrent(next)),{status:'ready',text:'new'})
    if(outcome==='success')pending.resolve('old');else pending.reject(Error('old failure'));assert.deepEqual(await first,{status:'stale'})
    const editing=guard.beginRead();guard.invalidateDocument();let read=false
    assert.deepEqual(await readMarkdownTextFile({name:'x.md',size:0},async()=>{read=true;return''},()=>guard.isCurrent(editing)),{status:'stale'});assert.equal(read,false)
  }
})
console.log(`Independent Markdown actions: ${groups} groups passed`)
