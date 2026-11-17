import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { calculateRunning } from '../../../src/utils/runningPace.ts'
import { runningClockFields } from '../../../src/utils/runningPaceComparison.ts'

const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch44/translations-running.json','utf8'))
const goal = (seconds, id) => ({ id, ...runningClockFields(seconds) })
async function fixture(locale='ko') {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8')).runningPace
  messages.comparison = patch[locale].runningPace.comparison
  const t = (key, vars={}) => { const value=key.split('.').reduce((node, part)=>node?.[part],messages); assert.equal(typeof value,'string',key); return value.replace(/\{(\w+)\}/g,(_m,name)=>String(vars[name])) }
  let props, h; const exports=[]
  props={distanceKm:10, splitKm:5, currentResult:calculateRunning(10,'time',3000,5), goals:[],onChange(update){props={...props,goals:update(props.goals)};h.setProps(props)},onExport(format,snapshot){exports.push({format,snapshot})}}
  h=await componentHarness('src/components/RunningPaceComparison.tsx',{props,modules:{'@/lib/i18n/runningPace':{useTranslations:()=>t},'@/components/MobileResultLink':{__esModule:true,default:'MobileResultLink'}}});h.render()
  return {h,exports,get props(){return props},set(patch){props={...props,...patch};h.setProps(props)},action(value){return h.find(n=>n.props?.['data-running-goal-action']===value)}}
}
let groups=0
async function check(label,run){await run();groups++;console.log('PASS',label)}
await check('explicit add/edit/remove caps at three and keeps blank invalid rows through distance changes',async()=>{
  const f=await fixture()
  try{
    f.action('addCurrent').props.onClick();assert.equal(f.props.goals[0].minutes,'50')
    f.action('addBlank').props.onClick();assert.equal(f.props.goals[1].minutes,'')
    const blank=f.props.goals[1].id
    assert.equal(f.h.find(n=>n.props?.['data-running-export']==='csv').props.disabled,true)
    const field=f.h.find(n=>n.props?.id?.includes(blank)&&n.props['data-running-goal-field']==='minutes');field.props.onChange({target:{value:'55'}})
    assert.equal(f.props.goals[1].minutes,'55');assert.equal(f.h.find(n=>n.props?.['data-running-export']==='csv').props.disabled,false)
    const oldAdd=f.action('addCurrent').props.onClick;oldAdd();oldAdd();assert.equal(f.props.goals.length,3);assert.equal(f.action('addCurrent').props.disabled,true)
    const before=JSON.stringify(f.props.goals);f.set({distanceKm:21.0975,splitKm:1,currentResult:calculateRunning(21.0975,'pace',340,1)});assert.equal(JSON.stringify(f.props.goals),before)
    const staleEdit=field.props.onChange;f.h.find(n=>n.props?.['data-running-goal']===blank).props.children.at(-1).props.onClick();assert.equal(f.props.goals.length,2);staleEdit({target:{value:'1'}});assert.equal(f.props.goals.length,2)
  }finally{f.h.cleanup()}
})
await check('500-row preview is paged while all export actions receive full immutable snapshots',async()=>{
  const f=await fixture()
  try{
    f.set({distanceKm:500,splitKm:1,goals:[goal(359999,'a'),goal(200000,'b'),goal(100000,'c')]})
    assert.equal(f.h.find(n=>n.type==='tbody').props.children.length,50)
    f.h.find(n=>n.props?.['data-running-page']==='next').props.onClick();f.h.render();assert.equal(f.h.find(n=>n.type==='tbody').props.children[0].key,51)
    for(const format of ['csv','tsv','print'])f.h.find(n=>n.props?.['data-running-export']===format).props.onClick()
    assert.deepEqual(f.exports.map(item=>item.format),['csv','tsv','print']);assert.ok(f.exports.every(item=>item.snapshot.splits.length===500))
    assert.deepEqual(f.exports[0].snapshot.splits.at(-1).elapsedSeconds,[359999,200000,100000]);f.set({goals:[goal(30,'a')]});assert.equal(f.exports[0].snapshot.goals[0].finishSeconds,359999)
  }finally{f.h.cleanup()}
})
await check('KO/EN direct lazy scope keys, import boundaries, mobile tokens and current-finish range reason',async()=>{
  for(const locale of ['ko','en']){
    const f=await fixture(locale)
    try{
      f.set({currentResult:calculateRunning(500,'pace',5999,1)});assert.equal(f.action('addCurrent').props.disabled,true);assert.ok(f.h.text().includes('99:59:59'))
      f.set({currentResult:calculateRunning(0.0001,'pace',1,1)});assert.equal(f.action('addCurrent').props.disabled,true)
      f.action('addBlank').props.onClick();assert.ok(f.h.all().filter(n=>n.type==='input').every(n=>n.props.className.includes('text-base')))
      assert.ok(f.h.all().filter(n=>n.type==='button').every(n=>n.props.className.includes('min-h-11')))
    }finally{f.h.cleanup()}
  }
  const parent=fs.readFileSync('src/components/RunningPaceCalculator.tsx','utf8');assert.equal(parent.includes('RunningPaceComparison'),true)
  const scoped=fs.readFileSync('src/lib/i18n/runningPace.ts','utf8');assert.ok(scoped.includes('context?.retry'));assert.ok(scoped.includes('retryCatalogs.runningPace'))
})
console.log(`Running child: ${groups} groups passed`)
