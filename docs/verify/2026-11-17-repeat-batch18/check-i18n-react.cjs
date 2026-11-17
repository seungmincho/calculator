const assert=require('node:assert/strict')
const fs=require('node:fs')
const {buildSync}=require('esbuild')
const {installMinimalDom}=require('./minimal-dom.cjs')
const dom=installMinimalDom()
const React=require('react'),{createRoot}=require('react-dom/client'),{renderToString}=require('react-dom/server')
const {act,createElement:h}=React
const source=`export {registerMessages,useTranslations as useRegistry} from './src/lib/i18n';
export {createLazyEnTranslations} from './src/lib/i18n/lazyTranslations';
export {LanguageProvider,useLanguage,initialLanguage} from './src/contexts/LanguageContext';
export {loadTranslationFallback} from './src/lib/i18n/translationFetch';
export {getActiveTranslationFailureCount,retryActiveTranslations} from './src/lib/i18n/translationResource';`
const compiled=buildSync({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',external:['react','react/jsx-runtime'],jsx:'automatic'}).outputFiles[0].text
function freshApi(){const module={exports:{}};new Function('require','module','exports',compiled)(require,module,module.exports);return module.exports}
function storage(value=null,{getBlocked=false,setBlocked=false}={}){let saved=value;return{getItem(){if(getBlocked)throw Error('blocked read');return saved},setItem(_key,next){if(setBlocked)throw Error('blocked write');saved=next}}}
function environment(saved=null,pathname='/',options={}){dom.window.localStorage=storage(saved,options);dom.window.location.pathname=pathname;dom.window.location.href=`https://toolhub.ai.kr${pathname}`}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
const drain=()=>new Promise(resolve=>setImmediate(resolve))
let groups=0,parity=0
async function check(name,run){if(process.argv[2]&&!name.includes(process.argv[2]))return;await run();groups++;console.log(`PASS ${name}`)}
async function mount(api,Component){const root=createRoot(dom.document.createElement('div'));await act(async()=>{root.render(h(api.LanguageProvider,null,h(Component)));await drain()});return{root,async render(){await act(async()=>root.render(h(api.LanguageProvider,null,h(Component))))},async close(){await act(async()=>root.unmount())}}}
function paths(object,prefix=''){return Object.entries(object).flatMap(([key,value])=>{const name=prefix?`${prefix}.${key}`:key;return[[name,value],...(value&&typeof value==='object'&&!Array.isArray(value)?paths(value,name):[])]})}
;(async()=>{
  await check('Real React SSR preserves all registered KO lookup/raw/interpolation semantics without a Provider',async()=>{
    environment('en');const api=freshApi(),ko=JSON.parse(fs.readFileSync('messages/ko.json','utf8'))
    let loads=0;function Missing(){assert.equal(api.useRegistry('not_registered')('title'),'title');return null}renderToString(h(Missing))
    const loader=async()=>{loads++;return{}}
    api.registerMessages(ko,loader);api.registerMessages(ko,loader)
    function Probe({namespace}){
      const t=api.useRegistry(namespace),messages=namespace?ko[namespace]:ko
      for(const[key,value]of paths(messages)){
        assert.equal(t(key),typeof value==='string'?value:key);assert.equal(JSON.stringify(t.raw(key)),JSON.stringify(value))
        const vars={count:0,amount:123,year:2026,name:'테스트'}
        const expected=typeof value==='string'?value.replace(/\{(\w+)\}/g,(_,part)=>vars[part]!=null?String(vars[part]):`{${part}}`):key
        assert.equal(t(key,vars),expected);parity++
      }
      assert.equal(t('missing.key'),'missing.key');assert.equal(t.raw('missing.key'),undefined);return null
    }
    renderToString(h(React.Fragment,null,[undefined,...Object.keys(ko)].map((namespace,index)=>h(Probe,{namespace,key:index}))))
    renderToString(h(api.LanguageProvider,null,h(Probe,{namespace:'csatGrade'})));assert.equal(loads,0)
  })
  await check('Registry KO makes no EN request, shared consumers dedupe, and unrelated resources keep t and input stable',async()=>{
    environment();const api=freshApi(),a=deferred(),b=deferred();let callsA=0,callsB=0,control,showB=false,refs={}
    api.registerMessages({reviewA:{label:'한국어 A'}},()=>{callsA++;return a.promise});api.registerMessages({reviewB:{label:'한국어 B'}},()=>{callsB++;return b.promise})
    function Probe({id}){const t=api.useRegistry(id),[input,setInput]=React.useState('초안');refs[id]={t,input,setInput,text:t('label')};return null}
    function App(){control=api.useLanguage();return h(React.Fragment,null,h(Probe,{id:'reviewA',key:'a'}),h(Probe,{id:'reviewA',key:'a2'}),showB&&h(Probe,{id:'reviewB',key:'b'}))}
    const mounted=await mount(api,App);assert.equal(callsA,0);assert.equal(callsB,0)
    await act(async()=>refs.reviewA.setInput('내 원고'));await act(async()=>control.changeLanguage('en'))
    assert.equal(callsA,1);assert.equal(callsB,0);const waiting=refs.reviewA.t;await mounted.render();assert.equal(refs.reviewA.t,waiting)
    await act(async()=>{a.resolve({reviewA:{label:'English A'}});await drain()});assert.equal(refs.reviewA.text,'English A');assert.equal(refs.reviewA.input,'내 원고')
    const ready=refs.reviewA.t;showB=true;await mounted.render();assert.equal(callsB,1);assert.equal(refs.reviewA.t,ready)
    await act(async()=>{b.resolve({reviewB:{label:'English B'}});await drain()});assert.equal(refs.reviewA.t,ready);assert.equal(refs.reviewA.input,'내 원고')
    await act(async()=>api.registerMessages({irrelevant:{label:'다른 등록'}}));assert.equal(refs.reviewA.t,ready);await mounted.close()
  })
  await check('Failure remains KO with a stable t and no automatic retry; reselecting EN explicitly retries',async()=>{
    environment();const api=freshApi();let calls=0,control,t,text
    api.registerMessages({reviewFail:{label:'한국어'}},()=>{calls++;return calls===1?Promise.reject(Error('offline')):Promise.resolve({reviewFail:{label:'English'}})})
    function App(){control=api.useLanguage();t=api.useRegistry('reviewFail');text=t('label');return null}
    const mounted=await mount(api,App);await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(calls,1);assert.equal(text,'한국어');assert.equal(api.getActiveTranslationFailureCount(),1)
    const failed=t;await mounted.render();await mounted.render();assert.equal(calls,1);assert.equal(t,failed)
    await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(calls,2);assert.equal(text,'English');assert.equal(api.getActiveTranslationFailureCount(),0);await mounted.close()
  })
  await check('Registry HMR rejects obsolete completion and late EN responses cannot reverse a KO choice',async()=>{
    environment();const api=freshApi(),old=deferred(),fresh=deferred();let control,text,input,setInput
    api.registerMessages({reviewHot:{label:'KO1'}},()=>old.promise)
    function App(){control=api.useLanguage();const t=api.useRegistry('reviewHot');[input,setInput]=React.useState('draft');text=t('label');return null}
    const mounted=await mount(api,App);await act(async()=>{setInput('preserved');control.changeLanguage('en')})
    await act(async()=>api.registerMessages({reviewHot:{label:'KO2'}},()=>fresh.promise));assert.equal(text,'KO2')
    await act(async()=>{old.resolve({reviewHot:{label:'obsolete EN1'}});await drain()});assert.equal(text,'KO2')
    await act(async()=>control.changeLanguage('ko'));await act(async()=>{fresh.resolve({reviewHot:{label:'EN2'}});await drain()})
    assert.equal(control.language,'ko');assert.equal(text,'KO2');assert.equal(input,'preserved')
    await act(async()=>control.changeLanguage('en'));assert.equal(text,'EN2');await mounted.close()
  })
  await check('Replacing a direct scoped factory preserves React hook state and uses the new KO/EN catalogue',async()=>{
    environment();const api=freshApi();let useMessages=api.createLazyEnTranslations({demo:{label:'KO1'}},async()=>({demo:{label:'EN1'}})),control,text,input,setInput
    function App(){control=api.useLanguage();const t=useMessages('demo');text=t('label');[input,setInput]=React.useState('draft');return null}
    const mounted=await mount(api,App);await act(async()=>setInput('typed'))
    useMessages=api.createLazyEnTranslations({demo:{label:'KO2'}},async()=>({demo:{label:'EN2'}}));await mounted.render();assert.equal(text,'KO2')
    await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(text,'EN2')
    useMessages=api.createLazyEnTranslations({demo:{label:'KO3'}},async()=>({demo:{label:'EN3'}}));await mounted.render();assert.equal(text,'EN3');assert.equal(input,'typed')
    await act(async()=>control.changeLanguage('ko'));assert.equal(text,'KO3');await mounted.close()
  })
  await check('Stored EN begins with KO; invalid values and blocked storage keep memory selection usable',async()=>{
    for(const test of [{saved:'en',path:'/',want:'en'},{saved:'invalid',path:'/energy-voucher/',want:'ko'},{saved:null,path:'/enneagram/',want:'ko'},{saved:null,path:'/env-editor/',want:'ko'},{saved:null,path:'/en/tools/',want:'en'},{saved:'ko',path:'/en/',want:'ko'},{saved:null,path:'/',want:'ko',blocked:true}]){
      environment(test.saved,test.path,{getBlocked:test.blocked,setBlocked:test.blocked});const api=freshApi(),observed=[];let control
      function App(){control=api.useLanguage();observed.push({...control});return null}
      const mounted=await mount(api,App);assert.equal(observed[0].language,'ko');assert.equal(observed[0].isInitialized,false);assert.equal(control.language,test.want);assert.equal(control.isInitialized,true)
      await act(async()=>control.changeLanguage('en'));assert.equal(control.language,'en');await act(async()=>control.changeLanguage('invalid'));assert.equal(control.language,'en');await mounted.close()
    }
  })
  await check('An explicit early selection wins over queued storage restoration; unmounted failure stays inactive',async()=>{
    environment('ko');const api=freshApi(),pending=deferred();let control
    api.registerMessages({reviewUnmount:{label:'한국어'}},()=>pending.promise)
    function App(){control=api.useLanguage();api.useRegistry('reviewUnmount');React.useLayoutEffect(()=>control.changeLanguage('en'),[]);return null}
    const mounted=await mount(api,App);assert.equal(control.language,'en');await mounted.close()
    await act(async()=>{pending.reject(Error('late failure'));await drain()});assert.equal(api.getActiveTranslationFailureCount(),0)
  })
  await check('A delayed new EN consumer does not implicitly retry a previously failed shared resource',async()=>{
    environment();const api=freshApi();let calls=0,control,showExtra=false
    api.registerMessages({reviewDelayed:{label:'한국어'}},()=>{calls++;return Promise.reject(Error('offline'))})
    function Consumer(){api.useRegistry('reviewDelayed');return null}
    function App(){control=api.useLanguage();return h(React.Fragment,null,h(Consumer,{key:'first'}),showExtra&&h(Consumer,{key:'extra'}))}
    const mounted=await mount(api,App)
    try{
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(calls,1)
      showExtra=true;await mounted.render();assert.equal(calls,1,'new EN consumer must not implicitly retry a failed resource')
      await act(async()=>control.changeLanguage('ko'))
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(calls,2,'KO-to-EN explicitly retries the active failed resource once')
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(calls,3,'reselecting EN remains an explicit retry')
    }finally{await mounted.close()}
  })
  await check('Registry failed-import retry context reaches JSON fallback, can fail again, and then caches success',async()=>{
    environment();const api=freshApi();let control,text,imports=0,fetches=0
    const originalFetch=global.fetch,url='/i18n/en/ns/reviewRetryBridge.1234567890abcdef.json'
    global.fetch=async(input,options)=>{fetches++;assert.equal(input,url);assert.equal(options.cache,'no-store');return fetches===1?new Response('offline',{status:503}):new Response(JSON.stringify({reviewRetryBridge:{label:'Recovered EN'}}))}
    api.registerMessages({reviewRetryBridge:{label:'한국어'}},context=>{if(context?.retry)return api.loadTranslationFallback(url,['reviewRetryBridge']);imports++;return Promise.reject(Error('sticky import cache failure'))})
    function App(){control=api.useLanguage();text=api.useRegistry('reviewRetryBridge')('label');return null}
    const mounted=await mount(api,App)
    try{
      assert.equal(imports,0);assert.equal(fetches,0)
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(imports,1);assert.equal(fetches,0);assert.equal(text,'한국어')
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(fetches,1);assert.equal(text,'한국어');assert.equal(api.getActiveTranslationFailureCount(),1)
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(fetches,2);assert.equal(imports,1);assert.equal(text,'Recovered EN');assert.equal(api.getActiveTranslationFailureCount(),0)
      await act(async()=>control.changeLanguage('ko'));await act(async()=>control.changeLanguage('en'));assert.equal(fetches,2);assert.equal(imports,1);assert.equal(text,'Recovered EN')
    }finally{await mounted.close();global.fetch=originalFetch}
  })
  await check('Direct scoped factory forwards failed-only retry context without requesting JSON on initial EN selection',async()=>{
    environment();const api=freshApi();let control,text,imports=0,fetches=0
    const originalFetch=global.fetch,url='/i18n/en/ns/reviewDirectRetry.1234567890abcdef.json'
    global.fetch=async()=>{fetches++;return new Response(JSON.stringify({reviewDirectRetry:{label:'Direct EN'}}))}
    const useMessages=api.createLazyEnTranslations({reviewDirectRetry:{label:'직접 KO'}},context=>{if(context?.retry)return api.loadTranslationFallback(url,['reviewDirectRetry']);imports++;return Promise.reject(Error('sticky import cache'))})
    function App(){control=api.useLanguage();text=useMessages('reviewDirectRetry')('label');return null}
    const mounted=await mount(api,App)
    try{
      assert.equal(imports,0);assert.equal(fetches,0)
      await act(async()=>{control.changeLanguage('en');await drain()});assert.equal(imports,1);assert.equal(fetches,0);assert.equal(text,'직접 KO')
      await act(async()=>{await api.retryActiveTranslations();await drain()});assert.equal(fetches,1);assert.equal(text,'Direct EN');assert.equal(imports,1)
    }finally{await mounted.close();global.fetch=originalFetch}
  })
  console.log(`Independent actual React i18n: ${groups} groups passed; ${parity} registered KO parity paths`)
})().catch(error=>{console.error(error);process.exitCode=1})
