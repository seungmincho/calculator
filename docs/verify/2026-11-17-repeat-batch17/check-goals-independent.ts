import assert from 'node:assert/strict'
import { CUTS, gradeOf } from '../../../src/utils/csatGrade.ts'
import { evaluateCsatGoal, parseCsatGoals, saveCsatGoal, writeCsatGoals, type CsatGoalStore } from '../../../src/utils/csatGoals.ts'
import type { CsatScoreSnapshot } from '../../../src/utils/csatScoreRecords.ts'
let groups=0
function check(name:string,run:()=>void){if(process.argv[2]&&!name.includes(process.argv[2]))return;run();groups++;console.log(`PASS ${name}`)}
const base:CsatScoreSnapshot={examYear:2027,referenceYear:2026,scores:{kor:'84',math:'80',eng:'85',hist:'42',inq1:'44',inq2:'41'},selection:{kor:'lm',math:'prob',inq1:'society',inq2:'ethics'}}
check('Independent arithmetic oracle covers every four-area grade combination and exact threshold',()=>{
  const keys=['korLm','mathProb','english','society'] as const
  for(let a=0;a<9;a++)for(let b=0;b<9;b++)for(let c=0;c<9;c++)for(let d=0;d<9;d++){
    const indexes=[a,b,c,d], current=structuredClone(base)
    const raws=keys.map((key,i)=>CUTS[key].cuts[indexes[i]].raw)
    ;(['kor','math','eng','inq1'] as const).forEach((field,i)=>current.scores[field]=String(raws[i]));current.scores.inq2=''
    const grades=keys.map((key,i)=>gradeOf(key,raws[i])).sort((x,y)=>x-y)
    for(const areas of [2,3,4]){
      const sum=grades.slice(0,areas).reduce((x,y)=>x+y,0)
      const r=evaluateCsatGoal(current,{areas,maxSum:sum})
      assert.equal(r.sum,sum);assert.equal(r.status,'within');assert.equal(r.over,0)
      assert.equal(new Set(r.used.map(item=>item.id)).size,areas)
      if(sum>areas){const over=evaluateCsatGoal(current,{areas,maxSum:sum-1});assert.equal(over.status,'over');assert.equal(over.over,1)}
    }
  }
})
check('Malformed raw input never contributes while real zero and surviving inquiry remain explicit',()=>{
  for(const raw of [' ','-1','1.1','1e1','101','Infinity','NaN']){
    const current=structuredClone(base);current.scores={kor:raw,math:'',eng:'0',hist:'50',inq1:'',inq2:'0'}
    const r=evaluateCsatGoal(current,{areas:3,maxSum:27})
    assert.equal(r.status,'needsInput');assert.equal(r.sum,null);assert.deepEqual(r.invalidFields,['kor'])
    assert.deepEqual(r.available.map(item=>item.id),['eng','inq']);assert.equal(r.singleInquiry?.field,'inq2')
  }
})
check('A duplicate inquiry conflict cannot produce a four-area result and equal numeric strings restore one area',()=>{
  const current=structuredClone(base);current.selection.inq2='society';current.scores.inq1='044';current.scores.inq2='43'
  const conflict=evaluateCsatGoal(current,{areas:4,maxSum:36})
  assert.equal(conflict.inquiryConflict,true);assert.equal(conflict.status,'needsInput');assert.ok(conflict.used.every(item=>item.id!=='inq'))
  current.scores.inq2='44';const same=evaluateCsatGoal(current,{areas:4,maxSum:36})
  assert.equal(same.inquiryConflict,false);assert.equal(same.status,'within');assert.equal(same.available.filter(item=>item.id==='inq').length,1)
})
check('Strict stored shape excludes score data and readback uncertainty never claims rollback',()=>{
  const empty:CsatGoalStore={version:1,revision:'empty',goals:[]}
  const next=saveCsatGoal(empty,{name:'목표',areas:3,maxSum:7},'g1','r1','2026-11-17T00:00:00.000Z')
  for(const mutated of [{...next,scores:base.scores},{...next,goals:[{...next.goals[0],snapshot:base}]},{...next,version:2}])assert.equal(parseCsatGoals(JSON.stringify(mutated)).ok,false)
  let raw:string|null=null,writes=0,readback=false
  const storage={getItem(){if(readback)throw new Error('read denied');return raw},setItem(_key:string,value:string){writes++;raw=value;readback=true}}
  assert.deepEqual(writeCsatGoals(storage,null,next),{ok:false,error:'unverified'});assert.equal(writes,1);assert.equal(raw,JSON.stringify(next))
})
check('Inquiry allowlist rejects known non-inquiry CUTS identifiers',()=>{
  const current=structuredClone(base);current.selection.inq1='english';current.selection.inq2='korLm'
  const result=evaluateCsatGoal(current,{areas:4,maxSum:36})
  assert.deepEqual(result.invalidFields,['inq1','inq2']);assert.equal(result.available.length,3);assert.equal(result.status,'needsInput')
})
console.log(`Independent CSAT goals: ${groups} domain groups passed`)
