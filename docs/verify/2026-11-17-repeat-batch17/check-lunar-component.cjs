const assert=require('node:assert/strict')
const {webcrypto}=require('node:crypto')
const {componentHarness}=require('./component-harness.cjs')
const entry='src/components/LunarAnniversaryCalendar.tsx'
const props={spec:{month:6,day:10,isLeap:true},startLunarYear:2025,today:{year:2026,month:11,day:17}}
const flush=async h=>{for(let i=0;i<100;i++){await new Promise(resolve=>setTimeout(resolve,1));h.render();if(!h.text().includes('calendarExport.preparing'))return}throw new Error('Export did not settle')}
let groups=0
async function check(name,run){await run();groups++;console.log(`PASS ${name}`)}
async function harness(options={}){
  const files=new Map(),clicks=[],revoked=[],pending=[]
  class FileURL extends URL {
    static createObjectURL(blob){const url=`blob:review-${files.size}`;files.set(url,blob);return url}
    static revokeObjectURL(url){revoked.push(url)}
  }
  const crypto=options.delayed?{subtle:{digest:(algorithm,data)=>new Promise((resolve,reject)=>pending.push({algorithm,data,resolve,reject}))}}:webcrypto
  const document={body:{appendChild(){}},createElement(tag){assert.equal(tag,'a');return{href:'',download:'',click(){if(options.failClick)throw new Error('blocked');clicks.push({href:this.href,download:this.download})},remove(){}}}}
  const h=await componentHarness(entry,{globals:{URL:FileURL,crypto},document,props,...options});h.render()
  return{h,files,clicks,revoked,async release(fail=false,unmounted=false){for(const job of pending.splice(0)){if(fail)job.reject(new Error('digest failed'));else job.resolve(await webcrypto.subtle.digest(job.algorithm,job.data))}if(unmounted)await new Promise(resolve=>setImmediate(resolve));else await flush(h)}}
}
function title(h,value='가족 생일'){h.find(node=>node.type==='input'&&node.props.type!=='checkbox').props.onChange({target:{value}});h.render()}
function select(h,year){h.find(node=>node.type==='input'&&node.props.type==='checkbox'&&node.props['aria-label'].includes(`"year":${year},`)).props.onChange();h.render()}
function download(h){h.button('calendarExport.download').props.onClick();h.render()}
;(async()=>{
  await check('No automatic selection or file; explicit download contains only selected dates and releases its object URL',async()=>{
    const {h,files,clicks,revoked}=await harness()
    assert.equal(h.all().filter(node=>node.type==='input'&&node.props.type==='checkbox'&&node.props.checked).length,0)
    assert.equal(h.button('calendarExport.download').props.disabled,true);assert.equal(clicks.length,0)
    title(h,'기념일, 이름; 😀');select(h,2025);select(h,2026);download(h);await flush(h)
    assert.equal(clicks.length,1);assert.equal(clicks[0].download,'lunar-anniversary-2025-2026.ics')
    const ics=await files.get(clicks[0].href).text()
    assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2)
    assert.match(ics,/DTSTART;VALUE=DATE:20250803/);assert.match(ics,/DTSTART;VALUE=DATE:20260723/)
    assert.match(ics.replace(/\r\n /g,''),/yearly.leapFallback/)
    assert.match(h.text(),/calendarExport.downloaded\{"count":2\}/)
    assert.equal(h.stored.size,0);assert.equal(h.window.location.search,'')
    h.tick(1000);assert.deepEqual(revoked,[clicks[0].href]);h.cleanup()
  })
  await check('Unavailable years are disabled and select-all includes only the last supported occurrence',async()=>{
    const {h}=await harness({props:{spec:{month:11,day:18,isLeap:false},startLunarYear:2050,today:null}})
    const boxes=h.all().filter(node=>node.type==='input'&&node.props.type==='checkbox')
    assert.equal(boxes.length,11);assert.equal(boxes.filter(node=>!node.props.disabled).length,1)
    h.button('calendarExport.selectAll').props.onClick();h.render()
    assert.equal(h.all().filter(node=>node.type==='input'&&node.props.checked).length,1)
    assert.match(h.text(),/2050-12-31/);h.cleanup()
  })
  await check('Changing the source before digest completion cancels the old file and selection',async()=>{
    const {h,clicks,release}=await harness({delayed:true});title(h);select(h,2025);download(h)
    h.setProps({...props,spec:{month:1,day:1,isLeap:false}})
    await release()
    assert.equal(clicks.length,0);assert.equal(h.all().filter(node=>node.type==='input'&&node.props.checked).length,0)
    assert.doesNotMatch(h.text(),/calendarExport.downloaded/);h.cleanup()
  })
  await check('A late error from an obsolete request and completion after unmount remain silent',async()=>{
    const one=await harness({delayed:true});title(one.h);select(one.h,2026);download(one.h)
    one.h.setProps({...props,startLunarYear:2026});await one.release(true)
    assert.equal(one.clicks.length,0);assert.doesNotMatch(one.h.text(),/calendarExport.errors.download/);one.h.cleanup()
    const two=await harness({delayed:true});title(two.h);select(two.h,2026);download(two.h);two.h.cleanup()
    await two.release(false,true);assert.equal(two.clicks.length,0)
  })
  await check('Repeated clicks start one export; current download failure has an error and still releases the object URL',async()=>{
    const one=await harness({delayed:true});title(one.h);select(one.h,2026)
    const action=one.h.button('calendarExport.download').props.onClick;action();action();one.h.render();await one.release()
    assert.equal(one.clicks.length,1);one.h.cleanup()
    const two=await harness({failClick:true});title(two.h);select(two.h,2026);download(two.h);await flush(two.h)
    assert.equal(two.clicks.length,0);assert.match(two.h.text(),/calendarExport.errors.download/)
    assert.equal(two.files.size,1);two.h.tick(1000);assert.equal(two.revoked.length,1);two.h.cleanup()
  })
  console.log(`Independent lunar component: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
