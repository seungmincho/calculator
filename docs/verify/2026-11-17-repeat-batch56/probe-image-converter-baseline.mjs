import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import * as conversion from '../../../src/utils/imageConvert.ts'
import { formatBytes, savingsPct, uniqueNames } from '../../../src/utils/imageCompress.ts'

// Actual parent; only its dynamic JSZip loader is adapted to the controlled VM I/O port.
const hostPath=new URL('../2026-11-17-repeat-batch19/component-harness.cjs',import.meta.url)
const hostSource=fs.readFileSync(hostPath,'utf8').replace("const contents = fs.readFileSync(entry, 'utf8')", "const contents = (setup.source ?? fs.readFileSync(entry, 'utf8'))")
const hostModule={exports:{}}
vm.runInThisContext('(function(require,module,exports){'+hostSource+'\n})',{filename:'image-converter-baseline-host.cjs'})(createRequire(hostPath),hostModule,hostModule.exports)
const {componentHarness}=hostModule.exports
const source=fs.readFileSync('src/components/ImageConverter.tsx','utf8')
const loader="(await import('jszip')).default"
assert.ok(source.includes(loader))
const turn=()=>new Promise(resolve=>setImmediate(resolve))
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
const file=name=>new File(['synthetic fixture'],name,{type:'image/png'})
const findings=[]
async function fixture(){
  const conversions=[],reads=[],zips=[],downloads=[],revoked=[],urls=new Map(),writes=[]
  let holdReads=false,urlId=0,active=0,maxActive=0,closed=false
  class Zip{entries=[];file(name,blob){this.entries.push({name,blob})}generateAsync(){const item=deferred();zips.push({...item,entries:this.entries});return item.promise}}
  class URLPort extends URL{static createObjectURL(blob){const url=`blob:baseline-${++urlId}`;urls.set(url,blob);return url}static revokeObjectURL(url){revoked.push(url);urls.delete(url)}}
  const document={createElement(){return{click(){downloads.push({name:this.download,blob:urls.get(this.href)})}}}}
  const parent=await componentHarness('src/components/ImageConverter.tsx',{source:source.replace(loader,"require('jszip').default"),url:'https://toolhub.ai.kr/image-converter/?foreign=a&foreign=b#keep',messages:JSON.parse(fs.readFileSync('messages/ko.json','utf8')),document,globals:{URL:URLPort},modules:{
    '@/components/GuideSection':{__esModule:true,default:'GuidePort'},
    '@/utils/imageCompress':{detectEncoders:async()=>({webp:true,avif:true}),formatBytes,savingsPct,uniqueNames},
    '@/utils/imageConvert':{...conversion,readHead(f){if(!holdReads)return Promise.resolve(new Uint8Array([137,80,78,71]));const item=deferred();reads.push({...item,file:f});return item.promise},convertImage(f,options){const item=deferred();active++;maxActive=Math.max(active,maxActive);conversions.push({...item,file:f,options:{...options}});return item.promise.finally(()=>active--)}},
    jszip:{default:Zip},
  }})
  const state={baseline:56},replace=parent.window.history.replaceState;parent.window.history.state=state;parent.window.history.replaceState=(next,title,href)=>{writes.push({state:next,href});replace(next,title,href)}
  const sync=async()=>{for(let i=0;i<4;i++){await turn();if(!closed)parent.render()}}
  parent.render();await sync()
  const button=label=>parent.button(label)
  return{parent,reads,conversions,zips,downloads,revoked,urls,writes,state,sync,get maxActive(){return maxActive},
    async add(names){parent.find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:names.map(file),value:'chosen'}});await sync()},
    holdReads(value){holdReads=value},async reset(){button('초기화').props.onClick();await sync()},async format(label){parent.find(n=>n.type==='button'&&n.props.children===label&&Object.hasOwn(n.props,'aria-pressed')).props.onClick();await sync()},
    async settle(task,kind='ok'){if(kind==='ok')task.resolve({blob:new Blob([`output ${task.file.name}`],{type:`image/${task.options.format}`}),width:2,height:2,srcWidth:2,srcHeight:2,downscaled:false});else task.reject(Error(kind));await sync()},
    async tick(){parent.tick(250);await sync()},async zip(){const b=parent.all().find(n=>n.type==='button'&&JSON.stringify(n.props.children).includes('ZIP'));assert.ok(b);b.props.onClick();await sync()},
    close(){if(closed)return;closed=true;parent.cleanup()},
  }
}
async function observe(name,run){const result=await run();findings.push({scenario:name,...result});console.log('OBSERVED',name)}
await observe('normal sequential conversion and unique ZIP entries',async()=>{const f=await fixture();try{await f.add(['a.png','a.png']);assert.equal(f.conversions.length,1);await f.settle(f.conversions[0]);assert.equal(f.conversions.length,2);await f.settle(f.conversions[1]);assert.equal(f.maxActive,1);assert.equal(f.parent.all().filter(n=>n.type==='img').length,2);await f.zip();assert.deepEqual(f.zips[0].entries.map(e=>e.name),['a.jpg','a (2).jpg']);f.zips[0].resolve(new Blob(['ZIP port bytes']));await f.sync();assert.equal(f.downloads.length,1);return{normal:true,conversions:2,maxActive:f.maxActive,zipNames:f.zips[0].entries.map(e=>e.name)}}finally{f.close()}})
await observe('pending header read adds files after explicit reset',async()=>{const f=await fixture();try{await f.add(['existing.png']);await f.settle(f.conversions[0]);f.holdReads(true);await f.add(['late.png']);await f.reset();assert.equal(f.parent.all().filter(n=>n.type==='li'&&n.props.className?.includes('flex items-center')).length,0);f.reads[0].resolve(new Uint8Array([137,80,78,71]));await f.sync();assert.ok(f.parent.text().includes('late.png'));assert.equal(f.conversions.length,2);return{defect:true,resetEmpty:true,lateItemAdded:true,newConversionStarted:true}}finally{f.close()}})
await observe('failed new setting removes and revokes previous successful output',async()=>{const f=await fixture();try{await f.add(['a.png']);await f.settle(f.conversions[0]);const previous=f.parent.find(n=>n.type==='img').props.src;await f.format('PNG');await f.tick();await f.settle(f.conversions[1],'encode');assert.equal(f.parent.all().filter(n=>n.type==='img').length,0);assert.ok(f.revoked.includes(previous));return{defect:true,previousSuccessfulOutputRetained:false,previousUrlRevoked:true}}finally{f.close()}})
await observe('during250ms displayed PNG setting still offers completed JPG output',async()=>{const f=await fixture();try{await f.add(['a.png']);await f.settle(f.conversions[0]);await f.format('PNG');assert.equal(f.parent.find(n=>n.type==='button'&&n.props.children==='PNG'&&Object.hasOwn(n.props,'aria-pressed')).props['aria-pressed'],true);const output=f.parent.find(n=>n.type==='a'&&n.props.download==='a.jpg');assert.ok(output);const total=f.parent.all().find(n=>n.type==='button'&&JSON.stringify(n.props.children).includes('다운로드'));assert.ok(total);assert.equal(total.props.disabled,false);return{defect:true,displayedFormat:'png',downloadFormat:'jpeg',allDownloadEnabled:true,conversionsBeforeDebounce:f.conversions.length}}finally{f.close()}})
await observe('ZIP already started still downloads after reset settings and unmount',async()=>{const cases=[];for(const transition of ['reset','settings','unmount']){const f=await fixture();try{await f.add(['a.png','b.png']);await f.settle(f.conversions[0]);await f.settle(f.conversions[1]);await f.zip();if(transition==='reset')await f.reset();if(transition==='settings')await f.format('PNG');if(transition==='unmount')f.close();f.zips[0].resolve(new Blob(['old ZIP']));await f.sync();assert.equal(f.downloads.length,1);cases.push({transition,downloadsAfterTransition:1})}finally{f.close()}}return{observed:true,cases,policyNote:'unmount is a lifecycle defect; reset/settings cancellation policy must be explicit in the new contract'}})
await observe('debounced URL writer discards foreign duplicate query hash and history state',async()=>{const f=await fixture();try{await f.tick();assert.equal(f.parent.window.location.searchParams.getAll('foreign').length,0);assert.equal(f.parent.window.location.hash,'');assert.equal(f.writes.at(-1).state,null);return{defect:true,foreignValuesKept:0,hashKept:false,historyStatePassed:null}}finally{f.close()}})
const report={actualParent:true,controlledIO:true,nativeBrowser:false,realImageDecode:false,sourceSha256:createHash('sha256').update(source).digest('hex'),sourceFile:'src/components/ImageConverter.tsx',findings}
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch56/before-fix.json',JSON.stringify(report,null,2)+'\n')
console.log(`Image converter baseline: ${findings.length} groups observed`)


