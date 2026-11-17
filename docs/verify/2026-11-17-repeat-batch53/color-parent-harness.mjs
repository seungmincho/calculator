import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch53/translations-color-converter.json', 'utf8'))
const turn = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
export const by = (host,key,value) => host.find(node => value === undefined ? Object.hasOwn(node.props ?? {},key) : node.props?.[key] === value)
export async function colorFixture({url='https://toolhub.ai.kr/color-converter/?source=a&source=b#keep'}={}) {
  const language={value:'ko',display:'ko'}, catalog={}
  for(const locale of ['ko','en']) { catalog[locale]=JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8')); Object.assign(catalog[locale].colorConverter,patch[locale].colorConverter) }
  const translate=namespace => {const lookup=key=>key.split('.').reduce((node,part)=>node?.[part],catalog[language.display][namespace]);const t=(key,vars={})=>{const value=lookup(key);assert.equal(typeof value,'string',`${namespace}.${key}`);return value.replace(/\{(\w+)\}/g,(_all,name)=>String(vars[name]??`{${name}}`))};t.raw=lookup;return t}
  const copied=[],pending=[],images=[],files=[],urls=new Map(),revoked=[],selections=[]
  let mode='ok',legacyResult=false,legacyCalls=0,selectionThrows=false,selectionHook=null,nextUrl=0,random=0.5,share=null,closed=false
  class Element {value='';style={};isConnected=true;focus(){if(selectionThrows)throw Error('focus denied');selectionHook?.()} select(){} setSelectionRange(start,end){selections.push({start,end})} remove(){} click(){files.push({name:this.download,blob:urls.get(this.href)})}}
  const document={activeElement:new Element(),body:{appendChild(){}},createElement:()=>new Element(),execCommand(){legacyCalls++;return legacyResult}}
  class ObjectURL extends URL {static createObjectURL(blob){const key=`blob:color-${++nextUrl}`;urls.set(key,blob);return key}static revokeObjectURL(key){revoked.push(key);urls.delete(key)}}
  const navigator={clipboard:{writeText(text){copied.push(text);if(mode==='no')return Promise.reject(Error('denied'));if(mode==='wait'){const item=deferred();pending.push(item);return item.promise}return Promise.resolve()}}}
  const modules={'@/lib/i18n':{useTranslations:translate},'@/contexts/LanguageContext':{useOptionalLanguage:()=>({language:language.value})},'@/components/MobileResultLink':{__esModule:true,default:'MobilePort'}}
  const fakeMath=Object.create(Math);fakeMath.random=()=>random
  const parent=await componentHarness('src/components/ColorConverter.tsx',{url,document,navigator,modules,globals:{URL:ObjectURL,HTMLElement:Element,Math:fakeMath},beforeEffects(tree){const visit=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return}if(value.props?.id==='color-copy-manual')value.props.ref.current=new Element();visit(value.props?.children)};visit(tree)}})
  const writes=[],historyState={wave:53},replace=parent.window.history.replaceState
  parent.window.history.state=historyState;parent.window.history.replaceState=(state,title,href)=>{writes.push({state,href});replace(state,title,href)}
  const timers=[],schedule=parent.context.setTimeout
  parent.context.setTimeout=(callback,delay)=>{timers.push({callback,delay});return schedule(callback,delay)}
  parent.window.setTimeout=parent.context.setTimeout
  async function sync(){for(let i=0;i<3;i++){await turn();parent.render();const props=parent.all().find(node=>node.type==='ShareResult')?.props
    if(props){if(!share){share=await componentHarness('src/components/ShareResult.tsx',{props,url:parent.window.location.href,document,navigator,globals:{URL:ObjectURL,HTMLElement:Element},modules:{'@/lib/i18n/shared':{useTranslations:translate},'@/utils/shareCard':{renderShareCard(card){const item=deferred();images.push({...item,card});return item.promise}}}});share.render()}else share.setProps(props)}else if(share){share.cleanup();share=null}
  }}
  parent.render();await sync()
  return {parent,get share(){return share},copied,pending,images,files,urls,revoked,selections,writes,historyState,timers,sync,
    async start(){parent.tick(0);await sync()},async edit(value){by(parent,'id','color-hex').props.onChange({target:{value}});await sync()},
    async click(key,value){by(parent,key,value).props.onClick();await sync()},async channel(key,value){by(parent,'data-color-channel',key).props.onChange({target:{value:String(value)}});await sync()},
    async picker(value){by(parent,'data-color-picker').props.onChange({target:{value}});await sync()},
    async shareAction(action){by(parent,'data-color-share-boundary').props.onClickCapture();by(share,'data-share-action',action).props.onClick();await sync()},
    async pop(href){replace(historyState,'',href);parent.window.dispatch('popstate');await sync()},async locale(value,display=value){language.value=value;language.display=display;await sync()},
    mode(value){mode=value},legacy(value){legacyResult=value},get legacyCalls(){return legacyCalls},random(value){random=value},selectionThrows(value){selectionThrows=value},selectionHook(value){selectionHook=value},
    close(){if(closed)return;closed=true;share?.cleanup();parent.cleanup()},
  }
}
