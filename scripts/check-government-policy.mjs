// Pure financial boundary checks against official 2026 tables.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {calculatePrograms,getMedianIncome,HOUSING_RENT_2026} from '../src/utils/welfarePolicy.ts'
const args=process.argv.slice(2),report=resolve(args[args.indexOf('--result')+1]),results=[]
const base={householdSize:1,monthlyIncome:0,incomeBasis:'assessed',region:'seoul',totalAssets:0,age:30,housingType:'monthly',monthlyRent:100,deposit:0,hasMinorChildren:true,childrenCount:1,isSingleParent:true,isDisabled:true,isOver65:false}
const program=(id,changes={})=>calculatePrograms({...base,...changes}).find(r=>r.id===id)
function check(name,fn){try{fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',message:error.message})}}
const medians=[2564238,4199292,5359036,6494738,7556719,8555952]
const thresholds={livelihood:[820556,1343773,1714892,2078316,2418150,2737905],medical:[1025695,1679717,2143614,2597895,3022688,3422381],housing:[1230834,2015660,2572337,3117474,3627225,4106857],education:[1282119,2099646,2679518,3247369,3778360,4277976]}
for(let size=1;size<=6;size++){
 check(`median-${size}`,()=>assert.equal(getMedianIncome(size),medians[size-1]))
 for(const [id,values] of Object.entries(thresholds))check(`${id}-${size}-income-boundary`,()=>{
  const threshold=values[size-1]
  const at=program(id,{householdSize:size,monthlyIncome:threshold/10000})
  const over=program(id,{householdSize:size,monthlyIncome:(threshold+1)/10000})
  assert.equal(at.threshold,threshold)
  assert.notEqual(at.status,'ineligible')
  assert.equal(over.status,'ineligible')
  if(id==='livelihood')assert.equal(at.monthlyAmount,0)
 })
}
const rents={seoul:[369000,414000,492000,571000,591000,699000],gyeonggi:[300000,335000,401000,463000,479000,568000],metro:[247000,275000,327000,381000,394000,463000],other:[212000,238000,283000,329000,340000,402000]}
for(const [region,values] of Object.entries(rents))for(let size=1;size<=6;size++)check(`rent-${region}-${size}`,()=>{
 assert.equal(HOUSING_RENT_2026[region][size-1],values[size-1])
 assert.equal(program('housing',{region,householdSize:size,monthlyIncome:0,monthlyRent:100}).monthlyAmount,values[size-1])
})
check('gross-income-never-becomes-assessed-income',()=>{
 for(const id of Object.keys(thresholds)){const r=program(id,{incomeBasis:'gross',monthlyIncome:1000,totalAssets:50000});assert.equal(r.status,'borderline');assert.equal(r.monthlyAmount,null)}
})
check('deposit-included-in-monthly-lease',()=>assert.equal(program('housing',{monthlyRent:10,deposit:1000}).monthlyAmount,133333))
check('jeonse-ignores-hidden-monthly-rent',()=>assert.equal(program('housing',{housingType:'jeonse',monthlyRent:999,deposit:3000}).monthlyAmount,100000))
check('housing-income-contribution',()=>assert.equal(program('housing',{monthlyIncome:100,monthlyRent:40}).monthlyAmount,315166))
check('housing-no-region-no-estimate',()=>assert.equal(program('housing',{region:'unknown'}).monthlyAmount,null))
check('owner-repair-not-monthly-cash',()=>assert.equal(program('housing',{housingType:'own'}).monthlyAmount,null))
check('zero-rent-and-deposit-excluded',()=>assert.equal(program('housing',{monthlyRent:0,deposit:0}).status,'ineligible'))
check('housing-five-times-exception',()=>assert.equal(program('housing',{monthlyRent:185}).monthlyAmount,10000))
check('tax-assets-240-million-boundary',()=>{
 for(const id of ['eitc','childCredit']){assert.equal(program(id,{totalAssets:23999}).status,'borderline');assert.equal(program(id,{totalAssets:24000}).status,'ineligible')}
})
check('no-invented-amount-or-household-division',()=>{
 for(const id of ['eitc','childCredit','basicPension','education','youthRent','singleParent','youthSavings','emergency','disabilityPension']){
  assert.equal(program(id,{householdSize:6,monthlyIncome:1000,age:65,isOver65:true}).monthlyAmount,null)
 }
})
check('pension-income-is-not-median-70-percent',()=>assert.equal(program('basicPension',{age:65,monthlyIncome:1000}).status,'borderline'))
for(const age of [15,39])check(`savings-new-2026-age-${age}`,()=>assert.equal(program('youthSavings',{age}).status,'borderline'))
for(const age of [14,40])check(`savings-age-excluded-${age}`,()=>assert.equal(program('youthSavings',{age}).status,'ineligible'))
check('older-student-not-excluded-by-child-flag',()=>{assert.equal(program('education',{hasMinorChildren:false}).status,'borderline');assert.equal(program('singleParent',{hasMinorChildren:false}).status,'borderline')})
check('all-twelve-programs-present',()=>assert.equal(new Set(calculatePrograms(base).map(r=>r.id)).size,12))
mkdirSync(resolve(report,'..'),{recursive:true});writeFileSync(report,JSON.stringify({at:new Date().toISOString(),results},null,2))
console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL')}))
process.exitCode=results.some(r=>r.status==='FAIL')?1:0
