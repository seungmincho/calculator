const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{build}=require('esbuild')
const {installMinimalDom}=require('./minimal-dom.cjs')
const dom=installMinimalDom(),React=require('react'),{createRoot}=require('react-dom/client'),{act,createElement:h}=React
const drain=()=>new Promise(resolve=>setImmediate(resolve))
let groups=0
;(async()=>{
  for(const [kind,namespace]of[['registry','csatGrade'],['direct','fuelCalculator']]){
    const source=`export {LanguageProvider,useLanguage} from './src/contexts/LanguageContext';
      ${kind==='registry'?"import './src/lib/i18n/ns/csatGrade';export {useTranslations} from './src/lib/i18n';":"export {useTranslations} from './src/lib/i18n/fuelCalculator';"}`
    const built=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'fail-initial-en-import',setup(builder){builder.onLoad({filter:/\.json$/},args=>/[\\/]messages[\\/]generated[\\/]en[\\/]/.test(args.path)?{loader:'js',contents:"globalThis.__reviewInitialEnglishLoads++; throw new Error('injected sticky import failure'); export default {}"}:undefined)}}]})
    const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports);const api=module.exports
    const originalFetch=global.fetch;global.__reviewInitialEnglishLoads=0;const fetched=[]
    global.fetch=async(url,options)=>{assert.match(url,/^\/i18n\/en\/(?:ns\/)?\w+\.[0-9a-f]{16}\.json$/);assert.equal(options.cache,'no-store');fetched.push(url);return new Response(fs.readFileSync(path.join(process.cwd(),'public',url.slice(1)),'utf8'))}
    dom.window.localStorage={getItem:()=>null,setItem(){}};dom.window.location.pathname='/';let control,text
    function Probe(){control=api.useLanguage();text=api.useTranslations(namespace)('title');return null}
    const root=createRoot(dom.document.createElement('div'))
    try{
      await act(async()=>{root.render(h(api.LanguageProvider,null,h(Probe)));await drain()})
      assert.equal(global.__reviewInitialEnglishLoads,0);assert.equal(fetched.length,0)
      const ko=JSON.parse(fs.readFileSync('messages/ko.json','utf8'))[namespace].title,en=JSON.parse(fs.readFileSync('messages/en.json','utf8'))[namespace].title
      assert.equal(text,ko);await act(async()=>{control.changeLanguage('en');await drain()})
      assert.ok(global.__reviewInitialEnglishLoads>0);assert.equal(fetched.length,0);assert.equal(text,ko)
      const importCount=global.__reviewInitialEnglishLoads
      await act(async()=>{control.changeLanguage('en');await drain()})
      assert.equal(text,en);assert.equal(global.__reviewInitialEnglishLoads,importCount)
      assert.equal(fetched.length,kind==='registry'?1:2)
      assert.ok(fetched.some(url=>url.startsWith(`/i18n/en/ns/${namespace}.`)))
      if(kind==='direct')assert.ok(fetched.some(url=>url.startsWith('/i18n/en/shared.')))
      const fetchCount=fetched.length;await act(async()=>control.changeLanguage('ko'));await act(async()=>control.changeLanguage('en'));assert.equal(text,en);assert.equal(fetched.length,fetchCount)
      groups++;console.log(`PASS Actual generated ${kind} initial import fails; explicit hashed JSON retry recovers and caches`)
    }finally{await act(async()=>root.unmount());global.fetch=originalFetch;delete global.__reviewInitialEnglishLoads}
  }
  console.log(`Independent generated fallback React: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
