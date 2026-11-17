import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const patch=JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch44/translations-running.json','utf8'))
const turn=()=>new Promise(resolve=>setImmediate(resolve))
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
export const by=(host,key,value)=>host.find(node=>value===undefined?Object.hasOwn(node.props??{},key):node.props?.[key]===value)
export async function runningFixture({url='https://toolhub.ai.kr/running-pace/?foreign=a&foreign=b#keep',hydrated=true}={}) {
  const language={value:'ko',display:'ko'},catalog={}
  for(const locale of ['ko','en']){catalog[locale]=JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8'));catalog[locale].runningPace.comparison=patch[locale].runningPace.comparison}
  const translate=namespace=>(key,vars={})=>{const value=key.split('.').reduce((node,part)=>node?.[part],catalog[language.display][namespace]);assert.equal(typeof value,'string',`${namespace}.${key}`);return value.replace(/\{(\w+)\}/g,(_all,name)=>String(vars[name]??`{${name}}`))}
  const copied=[],pendingCopies=[],images=[],files=[],prints=[],frames=new Map(),allFrames=[],urls=new Map(),revoked=[]
  let copyMode='ok',legacyResult=false,legacyCalls=0,frameId=0,urlId=0,printThrows=false,selectionThrows=false,share=null,child=null,printHost=null,closed=false,parent
  class Element {value='';style={};isConnected=true;focus(){if(selectionThrows)throw Error('focus denied')}select(){}setSelectionRange(){}remove(){}click(){files.push({name:this.download,blob:urls.get(this.href)})}}
  const document={activeElement:new Element(),body:{appendChild(){}},createElement:()=>new Element(),execCommand(){legacyCalls++;return legacyResult}}
  class ObjectURL extends URL {static createObjectURL(blob){const key=`blob:running-${++urlId}`;urls.set(key,blob);return key}static revokeObjectURL(key){revoked.push(key);urls.delete(key)}}
  const navigator={clipboard:{writeText(text){copied.push(text);if(copyMode==='no')return Promise.reject(Error('denied'));if(copyMode==='wait'){const item=deferred();pendingCopies.push(item);return item.promise}return Promise.resolve()}}}
  const modules={'@/lib/i18n/runningPace':{useTranslations:translate},'@/contexts/LanguageContext':{useOptionalLanguage:()=>({language:language.value})},'@/components/MobileResultLink':{__esModule:true,default:'MobilePort'}}
  parent=await componentHarness('src/components/RunningPaceCalculator.tsx',{url,hydrated,document,navigator,globals:{URL:ObjectURL,HTMLElement:Element},modules:{...modules,'@/components/RunningPaceComparison':{__esModule:true,default:'ComparisonPort'},'@/components/RunningPacePrint':{__esModule:true,default:'PrintPort'}},window:{requestAnimationFrame(callback){const id=++frameId;frames.set(id,callback);allFrames.push(callback);return id},cancelAnimationFrame(id){frames.delete(id)},print(){if(printThrows)throw Error('print denied');prints.push({snapshot:parent.find(node=>node.type==='PrintPort').props.snapshot,rows:printHost?.all().filter(node=>Object.hasOwn(node.props,'data-running-print-row')).length})}},beforeEffects(tree){const visit=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return}if(value.props?.id==='running-copy-manual')value.props.ref.current=new Element();visit(value.props?.children)};visit(tree)}})
  const writes=[],historyState={wave:44},replace=parent.window.history.replaceState
  parent.window.history.state=historyState
  parent.window.history.replaceState=(state,title,href)=>{writes.push({state,href});replace(state,title,href)}
  async function sync(){for(let i=0;i<3;i++){await turn();parent.render();const cp=parent.find(node=>node.type==='ComparisonPort').props;if(!child){child=await componentHarness('src/components/RunningPaceComparison.tsx',{props:cp,modules});child.render()}else child.setProps(cp)
    const sp=parent.all().find(node=>node.type==='ShareResult')?.props
    if(sp){if(!share){share=await componentHarness('src/components/ShareResult.tsx',{props:sp,url:parent.window.location.href,document,navigator,globals:{URL:ObjectURL,HTMLElement:Element},modules:{'@/lib/i18n/shared':{useTranslations:translate},'@/utils/shareCard':{renderShareCard(card){const item=deferred();images.push({...item,card});return item.promise}}}});share.render()}else{share.window.history.replaceState(null,'',parent.window.location.href);share.setProps(sp)}}else if(share){share.cleanup();share=null}
    const pp=parent.all().find(node=>node.type==='PrintPort')?.props;if(pp){if(!printHost){printHost=await componentHarness('src/components/RunningPacePrint.tsx',{props:pp});printHost.render()}else printHost.setProps(pp)}else if(printHost){printHost.cleanup();printHost=null}
  }}
  parent.render();await sync()
  async function start(){parent.tick(0);await sync()}
  async function click(host,key,value){by(host,key,value).props.onClick();await sync()}
  async function edit(host,id,value){by(host,'id',id).props.onChange({target:{value}});await sync()}
  async function shareAction(action){by(parent,'data-running-share-boundary').props.onClickCapture();by(share,'data-share-action',action).props.onClick();await sync()}
  return {parent,get child(){return child},get share(){return share},get printHost(){return printHost},copied,pendingCopies,images,files,prints,frames,allFrames,urls,revoked,writes,historyState,start,sync,click,edit,shareAction,
    copyMode(value){copyMode=value},legacy(value){legacyResult=value},get legacyCalls(){return legacyCalls},selectionThrows(value){selectionThrows=value},printThrows(value){printThrows=value},
    async locale(value,display=value){language.value=value;language.display=display;await sync()},
    async pop(href){replace(historyState,'',href);parent.window.dispatch('popstate');await sync()},
    async frame(){for(const [id,callback] of [...frames]){frames.delete(id);callback()}await sync()},
    async afterPrint(){parent.window.dispatch('afterprint');await sync()},
    close(){if(closed)return;closed=true;share?.cleanup();child?.cleanup();printHost?.cleanup();parent.cleanup()},
  }
}
