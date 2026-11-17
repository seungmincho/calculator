const assert=require('node:assert/strict')
const {componentHarness}=require('./component-harness.cjs')
const entry='src/components/LunarConverter.tsx'
class FixedDate extends Date {constructor(...args){super(...(args.length?args:[2026,10,17,12,0,0]))}static now(){return new Date(2026,10,17,12,0,0).getTime()}}
const panel=h=>h.find(node=>typeof node.type==='function'&&node.type.name==='LunarAnniversaryCalendar').props
const clone=value=>JSON.parse(JSON.stringify(value))
let groups=0
async function check(name,run){await run();groups++;console.log(`PASS ${name}`)}
;(async()=>{
  await check('Parent shares the existing lunar source and current-lunar-year window while retaining table copy and D-day',async()=>{
    const copied=[]
    const h=await componentHarness(entry,{props:{},globals:{Date:FixedDate},url:'https://toolhub.ai.kr/lunar-converter/?ly=2025&lm=6&ld=10&leap=1',navigator:{clipboard:{writeText:async value=>{copied.push(value)}}}});h.render()
    assert.deepEqual(clone(panel(h).spec),{year:2025,month:6,day:10,isLeap:true})
    assert.equal(panel(h).startLunarYear,2026)
    assert.deepEqual(clone(panel(h).today),{year:2026,month:11,day:17})
    assert.ok(h.all().some(node=>node.type==='ShareResult'))
    const share=h.find(node=>node.type==='ShareResult')
    assert.ok(share.props.card.rows.some(row=>row.label==='yearly.next'&&/D-\d+/.test(row.value)))
    for(const button of h.all().filter(node=>node.type==='button'&&node.props['aria-label']==='copy'))await button.props.onClick()
    assert.ok(copied.some(value=>value.includes('2026')&&value.includes('2036')&&value.includes('2026.07.23')))
    h.cleanup()
  })
  await check('Existing mode conversion and share URL re-entry preserve the export source and year window',async()=>{
    const setup={props:{},globals:{Date:FixedDate},url:'https://toolhub.ai.kr/lunar-converter/?ly=2025&lm=6&ld=10&leap=1'}
    const h=await componentHarness(entry,setup);h.render();const original=clone(panel(h))
    h.button('mode.solarToLunar').props.onClick();h.render()
    assert.deepEqual(clone(panel(h)),original)
    const fresh=await componentHarness(entry,{...setup,url:h.window.location.href});fresh.render()
    assert.deepEqual(clone(panel(fresh)),original)
    assert.equal(new URL(h.window.location.href).searchParams.has('title'),false)
    h.cleanup();fresh.cleanup()
  })
  console.log(`Independent lunar integration: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
