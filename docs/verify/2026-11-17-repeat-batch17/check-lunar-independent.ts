import assert from 'node:assert/strict'
import { createLunarAnniversaryCalendar, selectLunarCalendarOccurrences, type LunarAnniversarySpec, type LunarCalendarOccurrence } from '../../../src/utils/lunarAnniversaryCalendar.ts'
import { lunarAnniversary } from '../../../src/utils/lunarCalendar.ts'

type Event = Record<string,string>
function readIcs(ics:string):Event[] {
  assert.ok(ics.endsWith('\r\n')); assert.equal(ics.replaceAll('\r\n','').includes('\n'),false)
  const physical=ics.split('\r\n'); const logical:string[]=[]
  for(const line of physical) {
    assert.ok(Buffer.byteLength(line,'utf8')<=75)
    assert.equal(Buffer.from(line).toString('utf8'),line)
    if (/^[ \t]/.test(line)) { assert.ok(logical.length); logical[logical.length-1]+=line.slice(1) }
    else if(line) logical.push(line)
  }
  const events:Event[]=[]; const stack:string[]=[]; let current:Event|null=null
  for(const line of logical) {
    const split=line.indexOf(':'); assert.ok(split>0)
    const key=line.slice(0,split),value=line.slice(split+1)
    if(key==='BEGIN') { assert.ok((value==='VCALENDAR' && stack.length===0) || (value==='VEVENT' && stack.join('/')==='VCALENDAR')); stack.push(value); if(value==='VEVENT') current={}; continue }
    if(key==='END') { assert.equal(stack.pop(),value); if(value==='VEVENT'){assert.ok(current);events.push(current);current=null};continue }
    if(current){assert.equal(Object.hasOwn(current,key),false);current[key]=value}
  }
  assert.deepEqual(stack,[])
  assert.doesNotMatch(ics,/(?:^|\r\n)(?:RRULE|RDATE|TZID|METHOD|VALARM)[:;]/)
  return events
}
function decode(value:string):string {
  let result=''
  for(let i=0;i<value.length;i++) {
    if(value[i]!=='\\'){result+=value[i];continue}
    const next=value[++i];assert.ok(['n','N',',',';','\\'].includes(next));result+=next==='n'||next==='N'?'\n':next
  }
  return result
}
const describe=(row:LunarCalendarOccurrence)=>JSON.stringify({ year:row.lunarYear,leapFallback:row.leapFallback,dayFallback:row.dayFallback })
const stamp=new Date('2026-11-17T00:00:00.000Z')
let groups=0
async function check(name:string,run:()=>void|Promise<void>){await run();groups++;console.log(`PASS ${name}`)}

await check('Independent ICS reader preserves 16 existing-engine occurrences and their adjustment flags',async()=>{
  const specs:LunarAnniversarySpec[]=[{month:1,day:1,isLeap:false},{month:2,day:30,isLeap:false},{month:6,day:10,isLeap:true},{month:12,day:30,isLeap:false}]
  for(const spec of specs){
    const years=[2049,2026,1900,2025]
    const events=readIcs(await createLunarAnniversaryCalendar({...spec,title:'검증 기념일',lunarYears:years},describe,stamp))
    assert.equal(events.length,4)
    for(const [index,year] of [1900,2025,2026,2049].entries()){
      const expected=lunarAnniversary(year,spec.month,spec.day,spec.isLeap);assert.ok(expected)
      const date=`${expected.solar.year}-${String(expected.solar.month).padStart(2,'0')}-${String(expected.solar.day).padStart(2,'0')}`
      const next=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10)
      assert.equal(events[index]['DTSTART;VALUE=DATE'],date.replaceAll('-',''))
      assert.equal(events[index]['DTEND;VALUE=DATE'],next.replaceAll('-',''))
      assert.deepEqual(JSON.parse(decode(events[index].DESCRIPTION)),{year,leapFallback:expected.leapFallback,dayFallback:expected.dayFallback})
    }
    assert.deepEqual(years,[2049,2026,1900,2025])
  }
})
await check('The final supported solar date has an exclusive next-year end; one unavailable year rejects the entire file',async()=>{
  const input={month:11,day:18,isLeap:false,title:'연말',lunarYears:[2050]}
  const events=readIcs(await createLunarAnniversaryCalendar(input,describe,stamp))
  assert.equal(events[0]['DTSTART;VALUE=DATE'],'20501231');assert.equal(events[0]['DTEND;VALUE=DATE'],'20510101')
  await assert.rejects(createLunarAnniversaryCalendar({...input,day:19,lunarYears:[2049,2050]},describe,stamp),{code:'outOfRange'})
  assert.throws(()=>selectLunarCalendarOccurrences(input,[2025,2025]),{code:'duplicate'})
  assert.throws(()=>selectLunarCalendarOccurrences(input,[]),{code:'empty'})
})
await check('Unfolding and TEXT decoding retain Korean, emoji and attempted property injection as plain text',async()=>{
  const title='한😀,;\\'.repeat(10)+'\r\nBEGIN:VEVENT'
  const description='설명😀,;\\\r\nEND:VEVENT\nBEGIN:VEVENT\rSUMMARY:가짜'.repeat(30)
  const events=readIcs(await createLunarAnniversaryCalendar({month:6,day:10,isLeap:true,title,lunarYears:[2026]},()=>description,stamp))
  assert.equal(events.length,1);assert.equal(decode(events[0].SUMMARY),title.replaceAll('\r\n','\n'))
  assert.equal(decode(events[0].DESCRIPTION),description.replace(/\r\n|\r/g,'\n'))
  assert.deepEqual(Object.keys(events[0]).sort(),['DESCRIPTION','DTEND;VALUE=DATE','DTSTAMP','DTSTART;VALUE=DATE','SUMMARY','UID'].sort())
})
await check('The in-flight snapshot is immutable and event identity is independent of locale, order and clock',async()=>{
  const input={month:6,day:10,isLeap:true,title:'기념일',lunarYears:[2025,2026]}
  const pending=createLunarAnniversaryCalendar(input,describe,stamp)
  input.month=1;input.title='새 제목';input.lunarYears.splice(0,2,2030)
  const old=readIcs(await pending)
  const same=readIcs(await createLunarAnniversaryCalendar({month:6,day:10,isLeap:true,title:'기념일',lunarYears:[2026,2025]},()=> 'English description',new Date('2027-01-01T00:00:00Z')))
  assert.deepEqual(old.map(event=>event.UID),same.map(event=>event.UID))
  assert.equal(new Set(old.map(event=>event.UID)).size,2)
  assert.equal(decode(old[0].SUMMARY),'기념일')
})
console.log(`Independent lunar calendar: ${groups} domain groups passed`)
