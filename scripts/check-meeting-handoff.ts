import assert from 'node:assert/strict'
import { parseMeetingHandoff, meetingSentences, MEETING_HANDOFF_TTL } from '../src/utils/meetingHandoff.ts'
import { appendMeetingExcerpts, parseMeetingData, parseMeetingSlots, meetingStorageWrite, formatForExport, type MeetingData } from '../src/utils/meetingMinutes.ts'

const empty = (): MeetingData => ({ title: '기존 회의', date: '2026-11-16', time: '10:00', location: '', locationType: 'offline', organizer: '', attendees: [], agenda: [], discussions: [{ id: 'old', speaker: '팀장', content: '기존 토의' }], actions: [], decisions: '기존 결정', nextMeeting: '', notes: '기존 메모' })
const now = 1700000000000, handoff = { source: 'voice-memo', id: 'memo-1', name: '녹음 메모', transcript: '보고서 초안을 검토합니다. 금요일에 배포합니다. 견적을 확인해 주세요.', createdAt: now }
const checks: [string, () => void][] = [
  ['valid handoff and expiration boundary', () => { assert.ok(parseMeetingHandoff(JSON.stringify(handoff), now + MEETING_HANDOFF_TTL)); assert.equal(parseMeetingHandoff(JSON.stringify(handoff), now + MEETING_HANDOFF_TTL + 1), null) }],
  ['reject malformed, future, oversize and wrong source', () => { for(const value of [null, '{', '{}', JSON.stringify({...handoff, source:'other'}), JSON.stringify({...handoff, createdAt:now+1}), JSON.stringify({...handoff, transcript:'가'.repeat(12001)})]) assert.equal(parseMeetingHandoff(value,now),null) }],
  ['sentence boundaries preserve decimals and Korean text', () => assert.deepEqual(meetingSentences('예산은 3.14억입니다. 다음 안건입니다!\n이 문장도 확인해요.'), ['예산은 3.14억입니다.', '다음 안건입니다!', '이 문장도 확인해요.'])],
  ['long unpunctuated transcript remains intact', () => { const text='가'.repeat(12000); const chunks=meetingSentences(text); assert.equal(chunks.join(''),text); assert.ok(chunks.every(text=>text.length<=1000)) }],
  ['append selected kinds without inventing speaker, assignee or deadline', () => {
    const data=empty(), snapshot=JSON.stringify(data); let id=0
    const result=appendMeetingExcerpts(data,handoff,[{kind:'discussion',text:'새 토의'}, {kind:'decision',text:'새 결정'}, {kind:'action',text:'견적 확인'}],()=>`new-${++id}`)
    assert.equal(result.title, '기존 회의'); assert.equal(result.decisions,'기존 결정\n새 결정'); assert.equal(result.notes,'기존 메모')
    assert.equal(result.discussions[1].speaker,''); assert.deepEqual(result.actions[0],{id:'new-2',task:'견적 확인',assignee:'',dueDate:'',status:'pending'})
    assert.equal(JSON.stringify(data),snapshot)
  }],
  ['empty title uses source name and same source cannot be imported twice', () => { const result=appendMeetingExcerpts({...empty(),title:''},handoff,[{kind:'action',text:'확인'}]); assert.equal(result.title,handoff.name); assert.throws(()=>appendMeetingExcerpts(result,handoff,[{kind:'action',text:'확인'}]),/alreadyImported/) }],
  ['selection limits reject before mutation', () => { const data=empty(); for(const entries of [[],[{kind:'action',text:' '}],Array.from({length:101},()=>({kind:'action',text:'A'})),[{kind:'action',text:'가'.repeat(12001)}]]) assert.throws(()=>appendMeetingExcerpts(data,handoff,entries as never)); assert.equal(data.actions.length,0) }],
  ['old storage remains valid and malformed data fails closed', () => { assert.deepEqual(parseMeetingData(JSON.stringify(empty())),empty()); assert.equal(parseMeetingData(null),null); for(const raw of ['{}','[]','{',JSON.stringify({...empty(),actions:[{id:'x',task:'x'}]})]) assert.throws(()=>parseMeetingData(raw)) }],
  ['named slots reject invalid and duplicate names', () => { assert.equal(parseMeetingSlots(JSON.stringify([{name:'첫 회의',data:empty()}])).length,1); assert.throws(()=>parseMeetingSlots('[{}]')); assert.throws(()=>parseMeetingSlots(JSON.stringify([{name:'a',data:empty()},{name:'a',data:empty()}]))) }],
  ['storage conflict and quota preserve newer data', () => {
    let raw='newer'; const store={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value}}
    assert.throws(()=>meetingStorageWrite(store,'key','mine','older'),/conflict/); assert.equal(raw,'newer')
    meetingStorageWrite(store,'key','mine','newer'); assert.equal(raw,'mine')
    assert.throws(()=>meetingStorageWrite({...store,setItem:()=>{throw Error('quota')}},'key','lost','mine')); assert.equal(raw,'mine')
  }],
  ['HTML output escapes text in every user-controlled context', () => {
    const attack='<img src=x onerror=alert(1)><script>alert(1)</script>&"', data=empty()
    data.title=data.location=data.organizer=data.decisions=data.notes=attack
    data.attendees=[{id:'a',name:attack,role:attack,status:'present'}]
    data.agenda=[{id:'a',title:attack,notes:attack,duration:attack}]
    data.actions=[{id:'a',task:attack,assignee:attack,dueDate:attack,status:'pending'}]
    data.discussions=[{id:'a',content:attack,speaker:attack}]
    const html=formatForExport(data,'html',key=>key)
    assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('&amp;&quot;'))
    assert.ok(formatForExport(data,'text',key=>key).includes(attack), 'plain text stays literal')
  }],
]
for(const [name,fn] of checks) { fn(); console.log('PASS '+name) }
console.log(`Meeting handoff: ${checks.length} checks passed`)
