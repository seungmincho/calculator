import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

// Independent integration fixture. Reuses only the generic hook/event host, not author assertions.
const settleTurn = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no) => { resolve=yes; reject=no }); return {promise,resolve,reject} }
const walk = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(walk) : [value,...walk(value.props?.children)]
const by = (h,key,value='') => h.find(node => node.props?.[key] === value)
async function fixture({query='c=length&f=m&t=cm&v=7.5',hydrated=true,storage={}}={}) {
  const language={value:'ko'}, messages=JSON.parse(fs.readFileSync('messages/ko.json','utf8'))
  const pendingCopies=[],pendingImages=[],copied=[],fallbacks=[],downloads=[],blobs=new Map(),revoked=[],scrolls=[]
  let copyMode='ok',fallbackResult=false,selected,serial=0,batch=null,share=null,closed=false
  class Element {value='';style={};isConnected=true;focus(){}select(){}setSelectionRange(){}remove(){}click(){downloads.push({filename:this.download,blob:blobs.get(this.href)})}}
  class ObjectURL extends URL {static createObjectURL(blob){const id=`blob:unit-independent-${++serial}`;blobs.set(id,blob);return id}static revokeObjectURL(id){revoked.push(id);blobs.delete(id)}}
  const document={activeElement:new Element(),body:{appendChild(){}},createElement(){selected=new Element();return selected},execCommand(){fallbacks.push(selected.value);return fallbackResult}}
  const navigator={clipboard:{writeText(text){copied.push(text);if(copyMode==='no')return Promise.reject(Error('denied'));if(copyMode==='wait'){const job=deferred();pendingCopies.push(job);return job.promise}return Promise.resolve()}}}
  const context={'@/contexts/LanguageContext':{useOptionalLanguage:()=>({language:language.value})}}
  const parent=await componentHarness('src/components/UnitConverter.tsx',{url:`https://toolhub.ai.kr/unit-converter/?foreign=a&foreign=b&${query}#retained`,hydrated,messages,storage,document,navigator,globals:{URL:ObjectURL,HTMLElement:Element},modules:{...context,'@/components/UnitFavorites':{__esModule:true,default:'FavoritePort'},'@/components/UnitBatchConverter':{__esModule:true,default:'BatchPort'},'@/components/UnitCopyRecovery':{__esModule:true,default:'RecoveryPort'},'@/components/MobileResultLink':{__esModule:true,default:'MobilePort'}},beforeEffects(tree){for(const n of walk(tree)){if(n.props?.id==='unit-batch-panel')n.props.ref.current={scrollIntoView:()=>scrolls.push(true)};if(n.props?.id==='uc-value')n.props.ref.current={focus(){}}}}})
  const historyState={independent:43},writes=[],replace=parent.window.history.replaceState
  parent.window.history.state=historyState;parent.window.history.replaceState=(state,title,url)=>{writes.push({state,url:String(url)});replace(state,title,url)}
  const sharedTranslations=ns=>(key,values={})=>{const v=key.split('.').reduce((o,k)=>o?.[k],messages[ns]);assert.equal(typeof v,'string',`${ns}.${key}`);return v.replace(/\{(\w+)\}/g,(_m,k)=>String(values[k]??`{${k}}`))}
  async function sync(){
    for(let turn=0;turn<4;turn++){
      await settleTurn();parent.render()
      const bp=parent.all().find(n=>n.type==='BatchPort')?.props,sp=parent.all().find(n=>n.type==='ShareResult')?.props
      if(bp){if(!batch){batch=await componentHarness('src/components/UnitBatchConverter.tsx',{props:bp,messages,document,navigator,globals:{URL:ObjectURL,HTMLElement:Element},modules:context});batch.render()}else batch.setProps(bp)}
      if(sp){if(!share){share=await componentHarness('src/components/ShareResult.tsx',{props:sp,messages,document,navigator,url:parent.window.location.href,globals:{URL:ObjectURL,HTMLElement:Element},modules:{'@/lib/i18n/shared':{useTranslations:sharedTranslations},'@/utils/shareCard':{renderShareCard(card){const job=deferred();pendingImages.push({...job,card});return job.promise}}}});share.render()}else{share.window.history.replaceState(null,'',parent.window.location.href);share.setProps(sp)}}else if(share){share.cleanup();share=null}
    }
  }
  parent.render();await sync()
  async function click(h,key,value=''){by(h,key,value).props.onClick({stopPropagation(){}});await sync()}
  async function edit(h,id,value){by(h,'id',id).props.onChange({target:{value}});await sync()}
  async function open(){await click(parent,'data-unit-batch-toggle');return batch}
  async function shareAction(value){by(parent,'data-unit-share-boundary').props.onClickCapture();by(share,'data-share-action',value).props.onClick();await sync()}
  return {parent,get batch(){return batch},get share(){return share},pendingCopies,pendingImages,copied,fallbacks,downloads,blobs,revoked,writes,historyState,scrolls,messages,sync,click,edit,open,shareAction,
    copyMode(value){copyMode=value},fallback(value){fallbackResult=value},async locale(value){language.value=value;Object.assign(messages,JSON.parse(fs.readFileSync(`messages/${value}.json`,'utf8')));await sync()},
    close(){if(closed)return;closed=true;batch?.cleanup();share?.cleanup();parent.cleanup()},
  }
}
// Independent CSV/TSV scanner, including quoted delimiters and embedded line breaks.
function records(text,delimiter){let i=text.charCodeAt(0)===0xfeff?1:0,field='',row=[],quoted=false;const rows=[];for(;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===delimiter){row.push(field);field=''}else if(c==='\r'&&text[i+1]==='\n'){row.push(field);rows.push(row);row=[];field='';i++}else field+=c}assert.equal(quoted,false);row.push(field);rows.push(row);return rows}
let groups=0
async function check(name,run){if(process.argv[2]&&!name.includes(process.argv[2]))return;await run();groups++;console.log('PASS',name)}

await check('initial hydration URL priority and explicit early edit, unrelated query/hash/state',async()=>{
  const f=await fixture({query:'c=temperature&f=degC&t=degF&v=-40&p=6',hydrated:false})
  try{assert.equal(by(f.parent,'id','uc-value').props.value,'1');assert.equal(f.writes.length,0);f.parent.setHydrated(true);await f.sync();await f.click(f.parent,'data-unit-copy','main');assert.equal(f.copied.at(-1),'-40');assert.equal(by(f.parent,'id','uc-value').props.value,'-40');assert.ok(f.writes.every(w=>w.state===f.historyState));assert.deepEqual(f.parent.window.location.searchParams.getAll('foreign'),['a','b']);assert.equal(f.parent.window.location.hash,'#retained')}finally{f.close()}
  const early=await fixture({query:'v=999',hydrated:false})
  try{await early.edit(early.parent,'uc-value','13');early.parent.setHydrated(true);await early.sync();assert.equal(by(early.parent,'id','uc-value').props.value,'13');assert.equal(early.parent.window.location.searchParams.get('v'),'13')}finally{early.close()}
})
await check('real child retained after collapse; batch draft never enters URL or recent eight',async()=>{
  const recent=Array.from({length:8},(_,i)=>({c:'length',f:'m',t:'cm',v:String(i+21)})),f=await fixture({storage:{'unitConverter.recent':JSON.stringify(recent),'unitConverter.favorites':'synthetic untouched'}})
  try{f.parent.tick(1500);await f.sync();const bytes=f.parent.stored.get('unitConverter.recent'),url=f.parent.window.location.href;assert.equal(JSON.parse(bytes).length,8);assert.equal(JSON.parse(bytes)[0].v,'7.5');await f.open();const child=f.batch;await f.edit(child,'unit-batch-input','2\n\nwrong\n-0.5');await f.click(child,'data-unit-batch-run');await f.click(f.parent,'data-unit-batch-toggle');assert.equal(by(f.parent,'id','unit-batch-panel').props.hidden,true);await f.open();assert.equal(f.batch,child);assert.equal(by(child,'id','unit-batch-input').props.value,'2\n\nwrong\n-0.5');assert.equal(by(child,'data-unit-batch-result').props['data-unit-batch-stale'],false);f.parent.tick(1500);await f.sync();assert.equal(f.parent.stored.get('unitConverter.recent'),bytes);assert.equal(f.parent.window.location.href,url);assert.equal(f.parent.stored.get('unitConverter.favorites'),'synthetic untouched');assert.equal(f.scrolls.length,2)}finally{f.close()}
})
await check('favorite/pair changes preserve single value and old batch snapshot until explicit run',async()=>{
  const f=await fixture()
  try{await f.open();await f.edit(f.batch,'unit-batch-input','2\n4');await f.click(f.batch,'data-unit-batch-run');f.parent.find(n=>n.type==='FavoritePort').props.onLoad({c:'css',f:'rem',t:'px',p:6,rb:18});await f.sync();assert.equal(by(f.parent,'id','uc-value').props.value,'7.5');assert.equal(by(f.batch,'data-unit-batch-result').props['data-unit-batch-stale'],true);await f.click(f.batch,'data-unit-batch-copy');let rows=records(f.copied.at(-1),'\t');assert.equal(rows[1][3],'200');assert.equal(rows[1][4],'cm');await f.click(f.batch,'data-unit-batch-run');await f.click(f.batch,'data-unit-batch-copy');rows=records(f.copied.at(-1),'\t');assert.deepEqual(rows.slice(1).map(r=>r[3]),['36','72']);assert.equal(rows[1][7],'18');await f.click(f.parent,'data-unit-swap');assert.equal(by(f.parent,'id','uc-value').props.value,'135');await f.click(f.batch,'data-unit-batch-run');await f.click(f.batch,'data-unit-batch-copy');assert.equal(records(f.copied.at(-1),'\t')[1][3],'0.111111')}finally{f.close()}
})
await check('1000 rows full CSV/TSV independent parse and edit after run preserves every original row',async()=>{
  const f=await fixture()
  try{await f.open();const source=Array.from({length:1000},(_,i)=>String(i-500));source[2]='';source[6]='bad';source[11]='2\t3';await f.edit(f.batch,'unit-batch-input',source.join('\r\n')+'\r\n');await f.click(f.batch,'data-unit-batch-run');assert.equal(f.batch.all().filter(n=>Object.hasOwn(n.props,'data-unit-batch-line')).length,200);await f.edit(f.batch,'unit-batch-input','not rerun');assert.equal(by(f.batch,'data-unit-batch-result').props['data-unit-batch-stale'],true);await f.click(f.batch,'data-unit-batch-csv');const csv=await f.downloads.at(-1).blob.text();const bytes=new Uint8Array(await f.downloads.at(-1).blob.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);const rows=records(csv,',');assert.equal(rows.length,1001);assert.ok(rows.every(row=>row.length===8));for(let i=0;i<1000;i++){assert.equal(rows[i+1][0],String(i+1));assert.equal(rows[i+1][1],source[i]?`'${source[i]}`:'');assert.equal(rows[i+1][3],[2,6,11].includes(i)?'':String((i-500)*100));assert.equal(rows[i+1][4],'cm')}await f.click(f.batch,'data-unit-batch-copy');assert.deepEqual(records(f.copied.at(-1),'\t'),rows);assert.equal(f.downloads.at(-1).filename,'unit-conversion-batch.csv')}finally{f.close()}
})
await check('single/row/batch/actual ShareResult link all directed copy pairs suppress old fallback',async()=>{
  const f=await fixture()
  try{await f.open();await f.click(f.batch,'data-unit-batch-run');const actions=[()=>f.click(f.parent,'data-unit-copy','main'),()=>f.click(f.parent,'data-unit-copy','m'),()=>f.click(f.batch,'data-unit-batch-copy'),()=>f.shareAction('copy')];for(let old=0;old<4;old++)for(let next=0;next<4;next++){if(old===next)continue;f.copyMode('wait');await actions[old]();const pending=f.pendingCopies.shift();f.copyMode('ok');await actions[next]();pending.reject(Error('old'));await f.sync();assert.equal(f.fallbacks.length,0);assert.equal(f.parent.all().some(n=>n.type==='RecoveryPort'),false);assert.equal(f.share.all().some(n=>Object.hasOwn(n.props,'data-share-recovery')),false)}assert.equal(f.pendingCopies.length,0)}finally{f.close()}
})
await check('actual PNG pending is invalidated by CSV/source edit and a fresh PNG remains downloadable',async()=>{
  const f=await fixture()
  try{await f.open();await f.click(f.batch,'data-unit-batch-run');await f.shareAction('save');const old=f.pendingImages.shift();await f.click(f.batch,'data-unit-batch-csv');old.resolve(new Blob(['old png']));await f.sync();assert.deepEqual(f.downloads.map(row=>row.filename),['unit-conversion-batch.csv']);await f.shareAction('save');const edited=f.pendingImages.shift();await f.edit(f.batch,'unit-batch-input','8');edited.resolve(new Blob(['edited png']));await f.sync();assert.equal(f.downloads.length,1);await f.shareAction('save');f.pendingImages.shift().resolve(new Blob(['fresh png']));await f.sync();assert.equal(f.downloads.at(-1).filename,'toolhub-result.png');assert.equal(await f.downloads.at(-1).blob.text(),'fresh png');f.close();assert.equal(f.blobs.size,0);assert.equal(new Set(f.revoked).size,f.revoked.length)}finally{f.close()}
})
await check('ABA/old timer/manual recovery target and stale close do not corrupt a newer copy',async()=>{
  const f=await fixture()
  try{await f.open();await f.click(f.batch,'data-unit-batch-run');await f.click(f.parent,'data-unit-copy','main');assert.equal(by(f.parent,'data-unit-copy','main').props['data-unit-copied'],true);await f.edit(f.parent,'uc-value','8');f.parent.tick(2000);await f.edit(f.parent,'uc-value','7.5');assert.equal(by(f.parent,'data-unit-copy','main').props['data-unit-copied'],false);f.copyMode('wait');await f.click(f.batch,'data-unit-batch-copy');const old=f.pendingCopies.shift();await f.locale('en');await f.locale('ko');old.reject(Error('locale old'));await f.sync();assert.equal(f.fallbacks.length,0);f.copyMode('no');await f.click(f.batch,'data-unit-batch-copy');const recovery=f.parent.find(n=>n.type==='BatchPort').props.recovery;assert.ok(recovery);const expected=f.copied.at(-1);assert.equal(recovery.props.text,expected);const manual=await componentHarness('src/components/UnitCopyRecovery.tsx',{messages:f.messages,props:recovery.props});try{manual.render();assert.equal(by(manual,'data-unit-copy-manual').props.value,expected);by(manual,'data-unit-copy-select').props.onClick();manual.render();assert.ok(manual.text().includes(f.messages.unitConverter.batchCopy.selectionFailed))}finally{manual.cleanup()}f.copyMode('ok');recovery.props.onRetry();await f.sync();recovery.props.onClose();await f.sync();assert.equal(f.parent.find(n=>n.type==='BatchPort').props.copyState.status,'copied')}finally{f.close()}
})
await check('traditional no-pair guard and unmount after Strict replay invalidate pending native work',async()=>{
  const f=await fixture()
  try{await f.open();await f.click(f.parent,'data-unit-category','traditional');assert.equal(by(f.batch,'data-unit-batch-run').props.disabled,true);const pick=f.parent.all().find(n=>n.props.role==='button'&&walk(n).some(x=>String(x.props?.['data-unit-copy']??'').startsWith('trad.')));assert.ok(pick);pick.props.onClick();await f.sync();assert.equal(by(f.batch,'data-unit-batch-run').props.disabled,false);await f.click(f.batch,'data-unit-batch-run');f.parent.replayEffects();f.batch.replayEffects();f.share.replayEffects();await f.sync();f.copyMode('wait');await f.click(f.batch,'data-unit-batch-copy');const old=f.pendingCopies.shift();await f.shareAction('save');const image=f.pendingImages.shift();f.close();old.reject(Error('unmounted'));image.resolve(new Blob(['late']));await settleTurn();await settleTurn();assert.equal(f.fallbacks.length,0);assert.equal(f.downloads.length,0)}finally{f.close()}
})
console.log(`Independent unit parent: ${groups} groups passed`)
