import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { chunkText, splitLong } from '../../../src/utils/tts.ts'
import { captureTtsRecovery } from '../../../src/utils/ttsRecovery.ts'
import { meetingSentences } from '../../../src/utils/meetingHandoff.ts'
import { TTS_READING_KEY, parseTtsReadingRecords, readTtsReadingRecords, createTtsReadingRecord, captureTtsReadingPosition, resolveTtsReadingPosition, resolveTtsReadingVoice, writeTtsReadingAction, loadTtsReadingRecord } from '../../../src/utils/ttsReadingRecords.ts'

const settings={voiceName:'Local 한국어',rate:1.25,pitch:0.75,volume:0.5,localVoicesOnly:true}
const text='  첫 문장입니다.\r\n두 번째 문장입니다! 마지막입니다. '
const position=(source,index)=>({index,...chunkText(source)[index]})
function record(id='record-1',name='원고 1',source=text,index=1){const result=createTtsReadingRecord({text:source,position:position(source,index),settings},id,name,1794870000000);assert.equal(result.ok,true);return result.value}
const rawOf=(records=[record()],revision='initial')=>JSON.stringify({version:1,revision,records})
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes});return {resolve,promise}}
let groups=0,cases=0
async function check(name,run){if(process.argv[2]&&!name.includes(process.argv[2]))return;await run();groups++;console.log('PASS',name)}
function memory(raw=null){let current=raw,mode='',reads=0;const writes=[];return {storage:{getItem(key){assert.equal(key,TTS_READING_KEY);reads++;if(mode==='read'||mode==='unknown'&&writes.length)throw Error('denied');return current},setItem(key,value){assert.equal(key,TTS_READING_KEY);if(mode==='quota'){const e=Error('quota');e.name='QuotaExceededError';throw e}writes.push(value);current=value}},get raw(){return current},set raw(value){current=value},set mode(value){mode=value},get reads(){return reads},writes}}
await check('strict fields/decoded duplicate keys/normalized names and exact UTF8 2MiB keep bad raw unchanged',()=>{
  const original=rawOf(),parsed=parseTtsReadingRecords(original);assert.equal(parsed.ok,true)
  for(const bad of ['null','[]','{"version":2}',original.replace('"version":1','"version":1,"vers\\u0069on":1'),original.replace('"rate":1.25','"rate":1.25,"r\\u0061te":1.25')]){const result=parseTtsReadingRecords(bad);assert.equal(result.ok,false);assert.equal(result.raw,bad)}
  for(const mutate of [v=>v.extra=1,v=>v.records[0].extra=1,v=>v.records[0].settings.extra=1,v=>v.records[0].position.extra=1,v=>v.records[0].position.text='different',v=>v.records[0].position.start++,v=>v.records[0].createdAt=-1,v=>v.records[0].settings.volume=2,v=>v.records[0].settings.localVoicesOnly='true']){const copy=JSON.parse(original);mutate(copy);const raw=JSON.stringify(copy),result=parseTtsReadingRecords(raw);assert.equal(result.ok,false);assert.equal(result.raw,raw);cases++}
  const first=record('a','ＡＢＣ'),second=record('b','abc');assert.equal(parseTtsReadingRecords(rawOf([first,second])).ok,false)
  const full=original+' '.repeat(2097152-Buffer.byteLength(original));assert.equal(Buffer.byteLength(full),2097152);assert.equal(parseTtsReadingRecords(full).ok,true);assert.equal(parseTtsReadingRecords(full+' ').error,'tooLarge')
})
await check('eight maximum documents roundtrip, ninth/duplicate writes do not evict and snapshot mutation is isolated',async()=>{
  const source='a'+'\ud800'.repeat(29999),records=Array.from({length:8},(_,i)=>record(`max-${i}`,`원고 ${i}`.padEnd(40,'가'),source,0));records.forEach(value=>{value.settings.voiceName='\ud800'.repeat(512)})
  const raw=rawOf(records),read=parseTtsReadingRecords(raw);assert.equal(read.ok,true);assert.ok(Buffer.byteLength(raw)<2097152);assert.equal(read.snapshot.records[7].text,source)
  const f=memory(raw);const denied=await writeTtsReadingAction(read.snapshot,{kind:'add',record:record('ninth','아홉')},'new',{storage:f.storage});assert.equal(denied.error,'limit');assert.equal(f.writes.length,0);assert.equal(f.raw,raw)
  const single=memory(rawOf([record('old','동일')])),basis=readTtsReadingRecords(single.storage);const dupe=await writeTtsReadingAction(basis.snapshot,{kind:'add',record:record('new','동일')},'next',{storage:single.storage});assert.equal(dupe.error,'duplicateName');assert.equal(single.writes.length,0)
  const empty=memory(),entry=record('late','캡처'),wait=deferred();let enter
  const pending=writeTtsReadingAction(readTtsReadingRecords(empty.storage).snapshot,{kind:'add',record:entry},'next',{storage:empty.storage,lock:action=>{enter=action;return wait.promise.then(action)}});entry.text='mutated';entry.position.text='mutated';entry.settings.rate=2;wait.resolve();assert.ok(enter);const saved=await pending;assert.equal(saved.ok,true);assert.equal(saved.snapshot.records[0].text,text);assert.equal(saved.snapshot.records[0].settings.rate,1.25)
  assert.equal(createTtsReadingRecord({text:source+'x',position:position(source,0),settings},'too','길이',0).error,'textTooLong')
})
await check('current exact sentence wins recovery/active/restored correctly; previous segmentation safely falls back and local-only cannot play remote',()=>{
  const segments=chunkText(text),context={text,segments,generation:12,repeat:true,repeatStart:0,repeatEnd:2,repeatCount:3,repeatGap:0.1},recovery=captureTtsRecovery(context,2,2)
  for(const status of ['speaking','paused','stopped'])assert.equal(captureTtsReadingPosition(text,{status,currentIndex:1,startFrom:0,recovery,recoveryContext:context}).value.index,2)
  assert.equal(captureTtsReadingPosition(text,{status:'paused',currentIndex:1,startFrom:0,recovery,recoveryContext:{...context,generation:13}}).value.index,1)
  assert.equal(captureTtsReadingPosition(text,{status:'stopped',currentIndex:2,startFrom:1,recovery:null}).value.index,1)
  const old={...position(text,1)};old.end--;old.text=old.text.slice(0,-1);const oldContext={...context,segments:[segments[0],old,segments[2]]},oldRecovery=captureTtsRecovery(oldContext,1,1);assert.ok(oldRecovery);assert.equal(captureTtsReadingPosition(text,{status:'paused',currentIndex:0,startFrom:0,recovery:oldRecovery,recoveryContext:oldContext}).error,'invalidPosition');const raw=rawOf([{...record(),position:old}]);assert.equal(parseTtsReadingRecords(raw).ok,true);const resolved=resolveTtsReadingPosition(text,old);assert.equal(resolved.index,0);assert.equal(resolved.positionMatched,false);assert.equal(createTtsReadingRecord({text,position:old,settings},'bad','지난 조각',0).error,'invalidPosition')
  const voices=[{name:settings.voiceName,lang:'ko-KR',localService:false,default:true},{name:'Unknown locality',lang:'ko-KR'},{name:'English local',lang:'en-US',localService:true}]
  const local=resolveTtsReadingVoice(settings,voices);assert.equal(local.voice.name,'English local');assert.equal(local.playAllowed,true);assert.equal(local.missing,true)
  const none=resolveTtsReadingVoice(settings,voices.slice(0,2));assert.deepEqual(none,{voice:null,playAllowed:false,missing:true})
  assert.equal(resolveTtsReadingVoice({...settings,localVoicesOnly:false},voices).voice,voices[0])
})
await check('chunk max RangeError, code-point-safe slices and meeting1000/TTS140 preserve independently expected source offsets',()=>{
  for(const max of [0,-1,1.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,'140',null])for(const source of ['',text]){assert.throws(()=>chunkText(source,max),RangeError);assert.throws(()=>splitLong({text:source,start:0,end:source.length},max),RangeError)}
  for(const max of [1,2,3,7,139,140,141,999,1000])for(let offset=0;offset<=max+1;offset+=Math.max(1,Math.floor(max/5))){const source='a'.repeat(offset)+'😀'+'b'.repeat(max+3),parts=chunkText(source,max);let cursor=0;for(const part of parts){assert.equal(part.start,cursor);assert.equal(part.text,source.slice(part.start,part.end));assert.ok(part.text.length<=max||(max===1&&part.text.length===2));assert.ok(!/[\uD800-\uDBFF]$/.test(part.text));assert.ok(!/^[\uDC00-\uDFFF]/.test(part.text));cursor=part.end;cases++}assert.equal(cursor,source.length);assert.equal(parts.map(part=>part.text).join(''),source)}
  const source='a'.repeat(999)+'😀'+'b'.repeat(1050);const meet=meetingSentences(source);assert.equal(meet.join(''),source);assert.equal(meet[0].length,999);assert.equal(meet[1].startsWith('😀'),true);assert.ok(meet.every(s=>s.length<=1000));assert.equal(chunkText(source)[0].end,140)
  const spaced=' \r\nHello.\r\n 둘째!\n';const actual=chunkText(spaced);assert.deepEqual(actual,[{text:'Hello.',start:3,end:9},{text:'둘째!',start:12,end:15}]);assert.throws(()=>meetingSentences('a'.repeat(12001)),/invalidTranscript/)
})
await check('two readers CAS, lock wait cancellation, quota and unknown readback never restore or claim a write',async()=>{
  const f=memory(),a=readTtsReadingRecords(f.storage).snapshot,b=readTtsReadingRecords(f.storage).snapshot
  assert.equal((await writeTtsReadingAction(a,{kind:'add',record:record('a','A')},'revA',{storage:f.storage})).ok,true);const stored=f.raw;assert.equal((await writeTtsReadingAction(b,{kind:'add',record:record('b','B')},'revB',{storage:f.storage})).error,'conflict');assert.equal(f.raw,stored);assert.equal(f.writes.length,1)
  const signal=new AbortController(),wait=deferred();const pending=loadTtsReadingRecord(readTtsReadingRecords(f.storage).snapshot,'a',{storage:f.storage,signal:signal.signal,lock:action=>wait.promise.then(action)});signal.abort();wait.resolve();assert.equal((await pending).error,'canceled')
  const quota=memory();quota.mode='quota';assert.equal((await writeTtsReadingAction(readTtsReadingRecords(quota.storage).snapshot,{kind:'add',record:record()},'q',{storage:quota.storage})).error,'quota');assert.equal(quota.raw,null)
  const unknown=memory(),basis=readTtsReadingRecords(unknown.storage).snapshot;unknown.mode='unknown';assert.equal((await writeTtsReadingAction(basis,{kind:'add',record:record()},'u',{storage:unknown.storage})).error,'writeUnknown');assert.equal(unknown.writes.length,1);assert.ok(unknown.raw);unknown.mode='';const reread=readTtsReadingRecords(unknown.storage);assert.equal(reread.ok,true);assert.equal((await loadTtsReadingRecord(reread.snapshot,'record-1',{storage:unknown.storage})).ok,true)
})

async function childFixture({raw=rawOf(),ready=true,locale='ko'}={}){
  const f=memory(raw),locks=[],applied=[],captured=[],messages=JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8'));Object.assign(messages.textToSpeech,JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch46/translations-tts.json','utf8'))[locale].textToSpeech)
  let hold=false,serial=0;const props={ready,inputRevision:0,capture(){captured.push(true);return {ok:true,value:{text,position:position(text,1),settings}}},onApply(value){applied.push(value);return true}}
  const h=await componentHarness('src/components/TtsReadingList.tsx',{props,messages,storagePort:f.storage,globals:{AbortController,crypto:{randomUUID:()=>`ind-${++serial}`}},navigator:{locks:{request(key,options,callback){assert.equal(key,TTS_READING_KEY);assert.equal(options.mode,'exclusive');if(!hold)return Promise.resolve().then(callback);const ticket=deferred();locks.push({...ticket,options});return ticket.promise.then(callback)}}}})
  async function flush(){for(let i=0;i<6;i++){await Promise.resolve();h.render()}}
  const node=(key,value='')=>h.find(n=>n.props?.[`data-tts-reading-${key}`]===value)
  const click=async(key,value='')=>{node(key,value).props.onClick();await flush()}
  const set=async(patch)=>{Object.assign(props,patch);h.setProps(props);await flush()}
  const save=async(name)=>{node('name').props.onChange({target:{value:name}});await flush();h.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush()}
  h.render();await flush();return {h,f,props,locks,applied,captured,node,click,set,save,flush,hold(value){hold=value},close(){h.cleanup()}}
}
await check('actual child initial no autoload/write, explicit load only, deletion/current data isolation and strict unsupported storage',async()=>{
  for(const locale of ['ko','en']){const c=await childFixture({locale});try{c.h.replayEffects();await c.flush();assert.equal(c.applied.length,0);assert.equal(c.f.writes.length,0);await c.click('load','record-1');assert.equal(c.applied.length,0);await c.click('cancel');await c.click('load','record-1');await c.click('confirm','load');assert.equal(c.applied.length,1);assert.equal(c.applied[0].record.text,text);assert.equal(c.applied[0].index,1);await c.click('delete','record-1');await c.click('confirm','delete');assert.equal(c.applied.length,1);assert.equal(JSON.parse(c.f.raw).records.length,0)}finally{c.close()}}
  const gated=await childFixture({ready:false});try{assert.equal(gated.node('load','record-1').props.disabled,true);assert.equal(gated.node('save').props.disabled,true);assert.equal(gated.applied.length,0);assert.equal(gated.f.writes.length,0);await gated.set({ready:true});assert.equal(gated.applied.length,0)}finally{gated.close()}
  const c=await childFixture({raw:'{"version":2,"private":"keep"}'});try{assert.equal(c.node('error','unsupported').props.role,'alert');assert.equal(c.node('save').props.disabled,true);assert.equal(c.f.writes.length,0);assert.equal(c.applied.length,0);assert.equal(c.f.raw,'{"version":2,"private":"keep"}')}finally{c.close()}
})
await check('actual child lock ignores abort: explicit edit/storage/refresh/unmount invalidate pending saves or applies',async()=>{
  for(const action of ['revision','storage','refresh','unmount']){const c=await childFixture();try{c.hold(true);await c.click('load','record-1');await c.click('confirm','load');const lock=c.locks[0];if(action==='revision')await c.set({inputRevision:1});if(action==='storage'){c.f.raw=rawOf([record('new','새 원고')],'external');c.h.window.dispatch('storage',{key:TTS_READING_KEY,newValue:c.f.raw});await c.flush()}if(action==='refresh')await c.click('refresh');if(action==='unmount')c.close();lock.resolve();await c.flush();assert.equal(c.applied.length,0);assert.equal(c.f.writes.length,0);assert.equal(lock.options.signal.aborted,true)}finally{c.close()}}
  const c=await childFixture({raw:null});try{c.hold(true);await c.save('취소될 저장');const lock=c.locks[0];await c.set({inputRevision:2});lock.resolve();await c.flush();assert.equal(c.f.writes.length,0);assert.equal(c.node('name').props.value,'취소될 저장')}finally{c.close()}
})
await check('actual child writeUnknown preserves the intended name and requires reread without reapplying manuscript',async()=>{
  const c=await childFixture({raw:null});try{c.f.mode='unknown';await c.save('확인 대기');assert.equal(c.f.writes.length,1);assert.equal(c.node('error','writeUnknown').props.role,'alert');assert.equal(c.node('name').props.value,'확인 대기');assert.equal(c.node('save').props.disabled,true);assert.equal(c.applied.length,0);c.f.mode='';await c.click('refresh');assert.equal(c.h.all().filter(n=>Object.hasOwn(n.props,'data-tts-reading-record')).length,1);assert.equal(c.applied.length,0);assert.equal(c.f.writes.length,1)}finally{c.close()}
})
assert.equal(fs.readFileSync('src/components/TextToSpeech.tsx','utf8').includes('TtsReadingList'),false)
console.log(`Independent TTS reading preparation: ${groups} groups; ${cases} parser/chunk oracle cases; parent remains unconnected`)
