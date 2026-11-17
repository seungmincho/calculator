const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')
const entry='src/components/CsatGrade.tsx'
const panel=h=>h.find(node=>typeof node.type==='function' && node.type.name==='CsatScoreRecords').props
const clone=value=>JSON.parse(JSON.stringify(value))
let groups=0
async function check(name,run){await run();groups++;console.log(`PASS ${name}`)}
;(async()=>{
  await check('A restored record keeps empty strings distinct from zero through the actual URL and a fresh visit',async()=>{
    const h=await componentHarness(entry,{ url:'https://toolhub.ai.kr/csat-grade/?minN=4&minSum=9&campaign=review#saved' });h.render()
    const snapshot={ examYear:2025,referenceYear:2024,scores:{kor:'',math:'0',eng:'',hist:'00',inq1:'',inq2:'50'},selection:{kor:'hj',math:'geo',inq1:'bio2',inq2:'law'} }
    panel(h).onRestore(snapshot);h.render()
    const url=new URL(h.window.location.href)
    for(const [field,value] of Object.entries(snapshot.scores))assert.equal(url.searchParams.get(field),value)
    assert.equal(url.searchParams.get('minN'),'4');assert.equal(url.searchParams.get('minSum'),'9')
    assert.equal(url.searchParams.get('campaign'),'review');assert.equal(url.hash,'#saved')
    const fresh=await componentHarness(entry,{ hydrated:false,url:url.href });fresh.render()
    assert.equal(fresh.window.location.href,url.href);fresh.setHydrated(true)
    assert.deepEqual(clone(panel(fresh).current.scores),snapshot.scores)
    assert.deepEqual(clone(panel(fresh).current.selection),snapshot.selection)
    assert.equal(panel(fresh).current.examYear,2027);assert.equal(panel(fresh).current.referenceYear,2026)
    h.cleanup();fresh.cleanup()
  })
  await check('An absent score, explicit blank, actual zero and legacy blank retain separate meanings',async()=>{
    for(const [query,field,expected] of [
      ['','kor','84'],['?kor=','kor',''],['?kor=0','kor','0'],['?subject=english&score=','eng',''],['?subject=mathCalc&score=0','math','0'],
    ]){
      const h=await componentHarness(entry,{ hydrated:false,url:'https://toolhub.ai.kr/csat-grade/'+query });h.render();h.setHydrated(true)
      assert.equal(panel(h).current.scores[field],expected)
      assert.equal(new URL(h.window.location.href).searchParams.get(field),expected)
      h.cleanup()
    }
  })
  console.log(`CSAT empty URL fix: ${groups} independent groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
