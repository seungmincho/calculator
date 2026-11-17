import assert from 'node:assert/strict'
import { compareTextLines } from '../../../src/utils/lineDiff.ts'
import { prepareLineMerge, validateDiffAgainstSources, createLineMergeChoices, selectLineMerge, lineMergePreview, shortenLineMergePreview } from '../../../src/utils/lineMerge.ts'
import { createTextDiffOutput } from '../../../src/lib/diff/output.ts'

let id=1000, groups=0, cases=0
const encode=value=>Buffer.byteLength(value,'utf8'), normalize=value=>value.replace(/\r\n?/g,'\n')
async function check(name, run){if(process.argv[2]&&!name.includes(process.argv[2]))return;await run();groups++;console.log('PASS',name)}
const prepare=(a,b,result=compareTextLines(a,b))=>prepareLineMerge(++id,a,b,result)
// Independent oracle scans raw diff rows. It never uses product block arrays to build expected output.
function expected(rows, flags){const result=[];let group=-1,inside=false;for(const row of rows){if(row.type==='unchanged'){inside=false;result.push(row.content)}else{if(!inside){group++;inside=true}if(row.type===(flags[group]?'added':'removed'))result.push(row.content)}}return result}

await check('independent raw-row projection across duplicate/blank/CR/Unicode pairs and reversed choice order',()=>{
  const texts=new Set(['','\n','\r\n','\r','😀\n가\n','x\nx\ny','x\ny\nx','\n\n'])
  let tuples=[[]]
  for(let size=1;size<=3;size++){tuples=tuples.flatMap(tuple=>['x','y',''].map(value=>[...tuple,value]));tuples.forEach(tuple=>texts.add(tuple.join('\n')))}
  for(const a of texts)for(const b of texts){const result=compareTextLines(a,b),doc=prepare(a,b,result)
    assert.equal(selectLineMerge(doc,createLineMergeChoices(doc)).text,normalize(a));assert.equal(selectLineMerge(doc,createLineMergeChoices(doc,'modified')).text,normalize(b))
    for(let mask=0;mask<2**doc.blocks.length;mask++){const flags=doc.blocks.map((_,index)=>Boolean(mask&(1<<index))),choice=doc.blocks.map((block,index)=>({blockId:block.id,side:flags[index]?'modified':'original'})).reverse(),want=expected(result.lines,flags),out=selectLineMerge(doc,choice);assert.deepEqual(out.lines,want);assert.equal(out.text,want.join('\n'));assert.equal(out.lineCount,want.length);assert.equal(out.bytes,encode(out.text));cases++}
  }
})
await check('source gate fails closed on omission/embedded delimiters/summary/numbering and array-versus-empty ambiguity',()=>{
  const a='head\r\nold\rtail\n',b='head\nnew\ntail\n',valid=compareTextLines(a,b)
  for(const mutate of [r=>r.lines[0].content='head\n',r=>r.lines[0].right=2,r=>delete r.lines[0].left,r=>r.summary.removed--,r=>r.lines.pop(),r=>r.lines.reverse(),r=>r.lines[1].type='unchanged',r=>r.lines[0].content='head\r']){const copy=structuredClone(valid);mutate(copy);assert.equal(validateDiffAgainstSources(a,b,copy),false);assert.throws(()=>prepare(a,b,copy),error=>error.code==='invalidResponse')}
  const empty={lines:[],summary:{added:0,removed:0,unchanged:0}},oneBlank={lines:[{type:'unchanged',content:'',left:1,right:1}],summary:{added:0,removed:0,unchanged:1}}
  assert.equal(validateDiffAgainstSources('','',empty),true);assert.equal(validateDiffAgainstSources('','',oneBlank),false);assert.equal(validateDiffAgainstSources('\n','',empty),false)
  assert.equal(validateDiffAgainstSources('x'.repeat(1048577),'',empty),false);assert.equal(validateDiffAgainstSources('\n'.repeat(10000),'',empty),false)
  assert.equal(validateDiffAgainstSources(a,b,new Proxy({}, {get(){throw Error('bad accessor')}})),false)
})
await check('owned frozen graph and WeakSet reject cloned/proxy/forged documents and stale snapshot choices',()=>{
  const a='head\nold\nmiddle\nold\ntail',b='head\nnew\nmiddle\nnew\ntail',raw=compareTextLines(a,b),doc=prepare(a,b,raw),choices=createLineMergeChoices(doc),copy=structuredClone(choices),out=selectLineMerge(doc,copy)
  raw.lines[0].content='changed';raw.lines.length=0;copy[0].side='modified'
  assert.equal(out.text,a);assert.equal(out.choices[0].side,'original');assert.equal(doc.rows[0].content,'head')
  for(const value of [doc,doc.rows,doc.rows[0],doc.blocks,doc.blocks[0],doc.blocks[0].original,doc.blocks[0].modified,choices,choices[0],out,out.lines,out.choices,out.choices[0]])assert.equal(Object.isFrozen(value),true)
  for(const fake of [{...doc},structuredClone(doc),new Proxy(doc,{})])assert.throws(()=>selectLineMerge(fake,choices),error=>error.code==='invalidDocument')
  for(const fake of [{...out},structuredClone(out),new Proxy(out,{})])assert.throws(()=>lineMergePreview(fake,0),error=>error.code==='invalidDocument')
  const next=prepare(a,b);assert.notEqual(next.blocks[0].id,doc.blocks[0].id);assert.throws(()=>selectLineMerge(next,choices),error=>error.code==='invalidChoices')
  for(const choice of [[],[choices[0],choices[0]],[...choices,choices[0]],choices.map(c=>Object.create(c)),choices.map(c=>({...c,side:'both'})),choices.map(c=>({...c,extra:true})),new Array(2)])assert.throws(()=>selectLineMerge(doc,choice),error=>error.code==='invalidChoices')
  assert.equal(selectLineMerge(doc,[...choices].reverse()).text,a)
})
await check('exact UTF8 2MiB mixed result and 19999-row defensive projection preserve full data beyond previews',()=>{
  const payload='😀'.repeat(262143)+'abc',a=payload+'\n',b='\n'+payload,doc=prepare(a,b)
  assert.equal(encode(a),1048576);assert.equal(encode(b),1048576)
  const out=selectLineMerge(doc,doc.blocks.map((block,i)=>({blockId:block.id,side:i?'modified':'original'})))
  assert.equal(out.bytes,2097152);assert.equal(out.text,a+b);assert.equal(out.lineCount,3)
  const preview=lineMergePreview(out,0);assert.equal(preview.rows.length,3);assert.equal(preview.rows[0].text.length,2000);assert.equal(preview.rows[2].text.length,2000);assert.ok(preview.rows.every(row=>!/[\uD800-\uDBFF]$/.test(row.text)))
  const left=Array.from({length:9999},(_,i)=>`L${i}`),right=Array.from({length:9999},(_,i)=>`R${i}`),result={lines:[...left.map((content,i)=>({type:'removed',content,left:i+1})),{type:'unchanged',content:'anchor',left:10000,right:1},...right.map((content,i)=>({type:'added',content,right:i+2}))],summary:{removed:9999,unchanged:1,added:9999}}
  // A consistent bounded response for the gate, not a claim that the 4M-cell worker accepts this input pair.
  const huge=prepare([...left,'anchor'].join('\n'),['anchor',...right].join('\n'),result)
  const merged=selectLineMerge(huge,huge.blocks.map((block,i)=>({blockId:block.id,side:i?'modified':'original'})))
  assert.equal(merged.lineCount,19999);assert.equal(lineMergePreview(merged,99).rows.at(-1).number,19999);assert.equal(lineMergePreview(merged,99).rows.length,199)
  assert.equal(lineMergePreview(merged,-1).page,0);assert.equal(lineMergePreview(merged,10000).page,99);assert.equal(lineMergePreview(merged,Infinity).page,0)
})
await check('page cap and Unicode boundary use an independent code-point prefix oracle; empty outputs stay valid',()=>{
  function prefix(s,max){let out='';for(const char of s){if(out.length+char.length>max)break;out+=char}return out}
  const corpus=['x😀y','😀'.repeat(1010),'가x🙂\ud800\udc00z','x\ud800y','\udc00x','']
  for(const s of corpus)for(let max=0;max<=Math.min(s.length+2,2010);max++){assert.equal(shortenLineMergePreview(s,max),prefix(s,max));cases++}
  const text=Array.from({length:250},(_,i)=>`${i}:`+'가😀'.repeat(200)).join('\n'),doc=prepare(text,text),out=selectLineMerge(doc,[]),preview=lineMergePreview(out,0)
  let budget=50000,omitted=0;for(let i=0;i<200;i++){const original=out.lines[i],want=prefix(original,Math.min(2000,budget));assert.equal(preview.rows[i].text,want);budget-=want.length;omitted+=original.length-want.length}assert.equal(preview.omitted,omitted)
  for(const [a,b,side,wantLines]of [['x','','modified',[]],['','\n','modified',['','']],['\n','','original',['','']],['','','original',[]]]){const document=prepare(a,b),value=selectLineMerge(document,createLineMergeChoices(document,side));assert.deepEqual(value.lines,wantLines);assert.equal(value.text,wantLines.join('\n'));assert.equal(value.bytes,encode(value.text))}
})

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
const req=(target,text)=>({target,text,label:target,filename:`toolhub-text-${target}.txt`})
function outputFixture(){let native='success',fallback=false,createHook,clickHook,serial=0;const events=[],copies=[],pending=[],fallbacks=[],downloads=[],urls=new Map(),revokes=[],timers=[],noticeTimers=[]
  const owner=createTextDiffOutput(state=>events.push(state),{clipboard:{writeText(text){copies.push(text);if(native==='wait'){const job=deferred();pending.push(job);return job.promise}return native==='reject'?Promise.reject(Error('denied')):Promise.resolve()},fallback(text,current){fallbacks.push({text,current:current()});return fallback}},downloads:{createUrl(blob){const url=`blob:ind-${++serial}`;urls.set(url,blob);createHook?.();return url},revokeUrl(url){revokes.push(url);urls.delete(url)},click(url,filename){clickHook?.();downloads.push({blob:urls.get(url),filename})},schedule(callback){const timer={callback,canceled:false};timers.push(timer);return timer},cancel(timer){timer.canceled=true}},after(callback){const timer={callback,canceled:false};noticeTimers.push(timer);return()=>{timer.canceled=true}}})
  owner.activate();return {owner,events,copies,pending,fallbacks,downloads,urls,revokes,timers,noticeTimers,native(value){native=value},fallback(value){fallback=value},createHook(value){createHook=value},clickHook(value){clickHook=value}}
}
await check('output request identity survives same-text ABA, old notices, retry/close and lifecycle restart',async()=>{
  const f=outputFixture();try{await f.owner.copy(req('merged','A'));const old=f.owner.getSnapshot(),timer=f.noticeTimers[0];f.owner.invalidate();await f.owner.copy(req('comparison','B'));f.owner.invalidate();await f.owner.copy(req('merged','A'));const current=f.owner.getSnapshot();assert.notEqual(current.token,old.token);timer.callback();f.owner.close(old.token);assert.equal(await f.owner.retry(old.token),'stale');assert.equal(f.owner.getSnapshot(),current)
    f.native('wait');const delayed=f.owner.copy(req('comparison','before remount'));const request=f.pending.shift();f.owner.dispose();f.owner.activate();f.native('success');await f.owner.copy(req('merged','after remount'));request.reject(Error('old'));assert.equal(await delayed,'stale');assert.equal(f.fallbacks.length,0);assert.equal(f.owner.getSnapshot().text,'after remount')
  }finally{f.owner.dispose()}
})
await check('all four target actions supersede pending copies; download creation reentrancy cannot emit stale files',async()=>{
  for(const from of ['comparison','merged'])for(const to of ['comparison','merged'])for(const action of ['copy','download']){const f=outputFixture();try{f.native('wait');const old=f.owner.copy(req(from,'old'));const pending=f.pending.shift();f.native('success');if(action==='copy')await f.owner.copy(req(to,'new'));else assert.equal(f.owner.download(req(to,'new')),'started');pending.reject(Error('late'));assert.equal(await old,'stale');assert.equal(f.fallbacks.length,0);assert.equal(f.owner.getSnapshot().target,to);assert.equal(f.owner.getSnapshot().text,'new')}finally{f.owner.dispose()}}
  const f=outputFixture();try{f.createHook(()=>f.owner.invalidate());assert.equal(f.owner.download(req('merged','cancel during URL')),'stale');assert.equal(f.downloads.length,0);assert.equal(f.urls.size,0);assert.equal(f.revokes.length,1);assert.equal(f.owner.getSnapshot(),null)}finally{f.owner.dispose()}
})
await check('complete failure snapshot and zero-byte TXT match exact encoded bytes; false fallback is never copied',async()=>{
  const f=outputFixture(),text='가😀\n'.repeat(50000)
  try{f.native('reject');assert.equal(await f.owner.copy(req('merged',text)),'failed');const failed=f.owner.getSnapshot();assert.equal(failed.text,text);assert.equal(Object.isFrozen(failed),true);assert.equal(failed.status,'failed');f.fallback(true);assert.equal(await f.owner.retry(failed.token),'copied');assert.equal(f.fallbacks.at(-1).text,text);assert.equal(f.owner.download(req('merged',text)),'started');assert.equal(f.downloads[0].blob.type,'text/plain;charset=utf-8');assert.equal(f.downloads[0].blob.size,encode(text));assert.deepEqual(Buffer.from(await f.downloads[0].blob.arrayBuffer()),Buffer.from(text));assert.equal(f.downloads[0].filename,'toolhub-text-merged.txt');assert.equal(f.owner.download(req('merged','')),'started');assert.equal(f.downloads[1].blob.size,0);f.native('success');assert.equal(await f.owner.copy(req('merged','')),'copied');assert.equal(f.copies.at(-1),'');f.owner.dispose();for(const timer of f.timers)timer.callback();assert.equal(f.urls.size,0);assert.equal(new Set(f.revokes).size,f.revokes.length)
  }finally{f.owner.dispose()}
})
await check('actual native fallback checks owner after focus and does not steal newly focused element',async()=>{
  const original=new Map(['document','navigator','HTMLElement'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  try{let commands=0,restores=0,field,active,owner,mode='invalidate'
    class Element {isConnected=true;focus(){restores++}}
    const previous=new Element(),newer=new Element()
    const document={get activeElement(){return active},body:{appendChild(){}},createElement(){field={value:'',readOnly:false,style:{},focus(){active=field;if(mode==='invalidate')owner.invalidate();if(mode==='newFocus')active=newer},select(){},setSelectionRange(){},remove(){}};return field},execCommand(){commands++;return true}}
    Object.defineProperty(globalThis,'HTMLElement',{configurable:true,value:Element});Object.defineProperty(globalThis,'document',{configurable:true,value:document});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}})
    owner=createTextDiffOutput(()=>{});owner.activate();active=previous;assert.equal(await owner.copy(req('merged','old')),'stale');assert.equal(commands,0);assert.equal(restores,0)
    mode='newFocus';active=previous;assert.equal(await owner.copy(req('comparison','current')),'copied');assert.equal(commands,1);assert.equal(restores,0);assert.equal(active,newer);owner.dispose()
  }finally{for(const [key,descriptor]of original){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)}}
})
console.log(`Independent merge/output: ${groups} groups; ${cases} choice/Unicode oracle cases`)
