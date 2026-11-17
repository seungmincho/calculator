import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import * as conversion from '../../../src/utils/imageConvert.ts'
import { formatBytes, savingsPct } from '../../../src/utils/imageCompress.ts'

const hostPath=new URL('../2026-11-17-repeat-batch19/component-harness.cjs',import.meta.url)
const anchor='    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); timers.clear() },'
const shared=fs.readFileSync(hostPath,'utf8')
assert.ok(shared.includes(anchor))
const adapted=shared.replace("const contents = fs.readFileSync(entry, 'utf8')", "const contents = (setup.source ?? fs.readFileSync(entry, 'utf8'))").replace(anchor,`    replayEffects() { for (const [index] of effects) hooks[index].cleanup?.(); for (const [index,pending] of effects) hooks[index].cleanup=pending.effect(); return render() },\n`+anchor)
const hostModule={exports:{}}
vm.runInThisContext('(function(require,module,exports){'+adapted+'\n})',{filename:'conversion-parent-host.cjs'})(createRequire(hostPath),hostModule,hostModule.exports)
const {componentHarness}=hostModule.exports
const source=fs.readFileSync('src/components/ImageConverter.tsx','utf8'),loader="(await import('jszip')).default"
assert.ok(source.includes(loader))
const patch=JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch56/translations-image-conversion-queue.json','utf8'))
export const by=(host,key,value)=>host.find(n=>value===undefined?Object.hasOwn(n.props??{},key):n.props?.[key]===value)
const turn=()=>new Promise(resolve=>setImmediate(resolve))
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
export async function conversionFixture({url='https://toolhub.ai.kr/image-converter/?foreign=a&foreign=b#keep',encoders={webp:true,avif:true}}={}){
  const language={value:'ko'},catalog={}
  for(const locale of ['ko','en']){catalog[locale]=JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8'));Object.assign(catalog[locale].imageConverter,patch[locale].imageConverter)}
  const translate=ns=>{const lookup=key=>key.split('.').reduce((node,part)=>node?.[part],catalog[language.value][ns]);const t=(key,vars={})=>{const text=lookup(key);assert.equal(typeof text,'string',ns+'.'+key);return text.replace(/\{(\w+)\}/g,(_all,name)=>String(vars[name]??`{${name}}`))};t.raw=lookup;return t}
  const calls=[],reads=[],archives=[],downloads=[],urls=new Map(),revoked=[],writes=[],timers=[]
  let active=0,maximum=0,holdHeaders=false,urlId=0,closed=false,downloadThrows=false
  class Zip {entries=[];file(name,blob){this.entries.push({name,blob})}generateAsync(){const item=deferred();archives.push({...item,entries:this.entries});return item.promise}}
  class URLPort extends URL {static createObjectURL(blob){const url=`blob:convert-${++urlId}`;urls.set(url,blob);return url}static revokeObjectURL(url){revoked.push(url);urls.delete(url)}}
  const document={body:{appendChild(){}},createElement(){return{remove(){},click(){if(downloadThrows)throw Error('download denied');downloads.push({name:this.download,blob:urls.get(this.href)})}}}}
  const parent=await componentHarness('src/components/ImageConverter.tsx',{source:source.replace(loader,"require('jszip').default"),url,document,globals:{URL:URLPort},modules:{
    '@/lib/i18n':{useTranslations:translate},'@/components/GuideSection':{__esModule:true,default:'GuidePort'},'@/components/MobileResultLink':{__esModule:true,default:'MobilePort'},
    '@/utils/imageCompress':{detectEncoders:async()=>encoders,formatBytes,savingsPct},
    '@/utils/imageConvert':{...conversion,convertImage(file,options){const task=deferred();active++;maximum=Math.max(maximum,active);calls.push({...task,file,options:{...options}});return task.promise.finally(()=>active--)}},jszip:{default:Zip},
  }})
  const state={wave:56},replace=parent.window.history.replaceState;parent.window.history.state=state;parent.window.history.replaceState=(next,title,href)=>{writes.push({state:next,href});replace(next,title,href)}
  const schedule=parent.context.setTimeout;parent.context.setTimeout=(callback,delay)=>{timers.push({callback,delay});return schedule(callback,delay)};parent.window.setTimeout=parent.context.setTimeout
  const sync=async()=>{for(let i=0;i<4;i++){await turn();if(!closed)parent.render()}}
  const makeFile=(name,type='image/png',size)=>{const file=new File(['synthetic image fixture'],name,{type});if(size!==undefined)Object.defineProperty(file,'size',{value:size});const original=file.slice.bind(file);file.slice=(...args)=>holdHeaders?{arrayBuffer(){const item=deferred();reads.push({...item,file});return item.promise}}:original(...args);return file}
  parent.render();await sync()
  return {parent,calls,reads,archives,downloads,urls,revoked,writes,state,timers,makeFile,sync,get maximum(){return maximum},
    async start(){parent.tick(0);await sync()},async tick(){parent.tick(250);await sync()},
    async click(key,value){by(parent,key,value).props.onClick();await sync()},async setting(key,value){by(parent,key).props.onChange({target:{value:String(value)}});await sync()},
    async add(files){by(parent,'data-conversion-input').props.onChange({target:{files:files.map(file=>typeof file==='string'?makeFile(file):file),value:'selected'}});await sync()},
    async settle(index,kind='ok'){const task=calls[index];assert.ok(task,`missing task ${index}`);if(kind==='ok')task.resolve({blob:new Blob([`converted:${task.file.name}:${task.options.format}:${task.options.quality}:${task.options.bg}`],{type:`image/${task.options.format}`}),width:4,height:3,srcWidth:4,srcHeight:3,downscaled:false});else task.reject(Error(kind));await sync()},
    holdHeaders(value){holdHeaders=value},downloadThrows(value){downloadThrows=value},
    async pop(href){replace(state,'',href);parent.window.dispatch('popstate');await sync()},async locale(value){language.value=value;await sync()},
    close(){if(closed)return;closed=true;parent.cleanup()},
  }
}

