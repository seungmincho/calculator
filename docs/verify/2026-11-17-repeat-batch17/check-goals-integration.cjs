const assert=require('node:assert/strict')
const fs=require('node:fs')
const {componentHarness}=require('./component-harness.cjs')
const entry='src/components/CsatGrade.tsx',child='src/components/CsatGoalConditions.tsx'
const get=(h,name)=>h.find(node=>typeof node.type==='function'&&node.type.name===name).props
const clone=value=>JSON.parse(JSON.stringify(value))
const blank='kor=&math=&eng=&hist=50&inq1=&inq2='
let groups=0
async function check(name,run){await run();groups++;console.log(`PASS ${name}`)}
;(async()=>{
  await check('Incoming blank query waits for URL restore and gives consistent input-needed minimum, hero and share text',async()=>{
    const url=`https://toolhub.ai.kr/csat-grade/?${blank}&minN=3&minSum=7`,h=await componentHarness(entry,{url,hydrated:false});h.render()
    assert.equal(get(h,'CsatGoalConditions').ready,false);assert.equal(h.window.location.href,url);h.setHydrated(true)
    assert.equal(get(h,'CsatGoalConditions').ready,true);const result=get(h,'CsatGoalEvaluationView').result
    assert.equal(result.status,'needsInput');assert.equal(result.available.length,0);assert.equal(result.sum,null)
    assert.match(h.text(),/u.heroSub.*goals.needsInputShort/);assert.match(h.find(node=>node.type==='ShareResult').props.text,/goals.needsInputShort/)
    assert.equal(new URL(h.window.location.href).searchParams.get('kor'),'');h.cleanup()
  })
  await check('Partial scores, one valid inquiry and a restored score record update every goal surface without saving conditions to URL',async()=>{
    const h=await componentHarness(entry,{url:`https://toolhub.ai.kr/csat-grade/?${blank}&minN=2&minSum=3&campaign=test#result`});h.render()
    const records=get(h,'CsatScoreRecords'),snapshot=clone(records.current);snapshot.scores.kor='100';snapshot.scores.eng='85'
    records.onRestore(snapshot);h.render();let result=get(h,'CsatGoalEvaluationView').result
    assert.equal(result.status,'within');assert.equal(result.sum,3);assert.deepEqual(clone(result.used.map(area=>area.id)),['kor','eng'])
    assert.match(h.text(),/u.heroSub.*goals.needsInputShort/)
    snapshot.scores.inq2='50';get(h,'CsatScoreRecords').onRestore(snapshot);h.render();result=get(h,'CsatGoalEvaluationView').result
    assert.equal(result.sum,2);assert.equal(result.singleInquiry.field,'inq2');assert.match(h.text(),/u.heroSub.*"s3":4/)
    const q=new URL(h.window.location.href);assert.equal(q.searchParams.get('campaign'),'test');assert.equal(q.hash,'#result');assert.ok(![...q.searchParams.keys()].some(key=>/goals|goalName/.test(key)))
    assert.deepEqual(clone(get(h,'CsatGoalConditions').current),clone(get(h,'CsatScoreRecords').current));h.cleanup()
  })
  await check('Conflicting duplicate inquiry yields the same missing-area result in saved and one-off conditions',async()=>{
    const h=await componentHarness(entry,{url:'https://toolhub.ai.kr/csat-grade/?inq1Type=society&inq2Type=society&inq1=44&inq2=43&minN=4&minSum=36'});h.render()
    const minimum=clone(get(h,'CsatGoalEvaluationView').result);assert.equal(minimum.status,'needsInput');assert.equal(minimum.inquiryConflict,true)
    const goal={id:'g1',name:'네 영역',areas:4,maxSum:36,createdAt:'2026-11-17T00:00:00.000Z',updatedAt:'2026-11-17T00:00:00.000Z'}
    const panel=await componentHarness(child,{props:get(h,'CsatGoalConditions'),storage:{'toolhub-csat-goals-v1':JSON.stringify({version:1,revision:'r1',goals:[goal]})}});panel.render();panel.tick(0)
    assert.deepEqual(clone(get(panel,'CsatGoalEvaluationView').result),minimum);panel.cleanup();h.cleanup()
  })
  await check('Actual shared evaluation view translates scope, used subjects and conflict in both languages',async()=>{
    const h=await componentHarness(entry,{url:'https://toolhub.ai.kr/csat-grade/?inq1Type=society&inq2Type=society&inq1=44&inq2=43&minN=4&minSum=36'});h.render();const result=get(h,'CsatGoalEvaluationView').result
    for(const locale of ['ko','en']){
      const messages=JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8'))
      const view=await componentHarness(child,{exportName:'CsatGoalEvaluationView',props:{result},messages});view.render()
      assert.equal(view.find(node=>node.props['data-goal-status']).props['data-goal-status'],'needsInput')
      assert.equal(view.all().filter(node=>node.props['data-goal-area']).length,3);assert.ok(!view.text().includes('goals.'));assert.ok(view.text().includes(messages.csatGrade.goals.inquiryConflict));view.cleanup()
    }
    h.cleanup()
  })
  console.log(`Independent goals integration: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
