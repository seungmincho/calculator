import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base='http://127.0.0.1:3039', out=resolve('docs/verify/2026-11-16-voice-meeting'), only=process.argv[2]
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome'}), results=[]
const button=(page,name)=>page.getByRole('button',{name,exact:true})
const blank=()=>({title:'기존 주간 회의',date:'2026-11-16',time:'10:00',location:'회의실',locationType:'offline',organizer:'',attendees:[],agenda:[],discussions:[{id:'old',speaker:'',content:'원래 토의'}],actions:[],decisions:'원래 결정',nextMeeting:'',notes:'보존할 메모'})
const payload=()=>({source:'voice-memo',id:'test-handoff',name:'새 음성 메모',transcript:'보고서를 검토합니다. 배포를 결정했습니다. 견적서를 요청해 주세요. 불필요한 문장입니다.',createdAt:Date.now()})
const data=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('meetingMinutes_auto')))
function wav() {
  const b=Buffer.alloc(64044); b.write('RIFF'); b.writeUInt32LE(64036,4); b.write('WAVEfmt ',8); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(16000,24); b.writeUInt32LE(32000,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(64000,40)
  return {name:'주간 회의.wav',mimeType:'audio/wav',buffer:b}
}
async function run(name, fn, options={}) {
  if(only && !name.includes(only)) return
  const context=await browser.newContext({viewport:{width:options.width??1280,height:900},serviceWorkers:'block',acceptDownloads:true}), errors=[], external=[]
  await context.route('**/*', route=>{if(!route.request().url().startsWith(base)){external.push(route.request().url());return route.abort()}return route.continue()})
  context.on('page',page=>{
    page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(120000)
    page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&/hydration|didn't match/i.test(m.text()))errors.push(m.text())});page.on('dialog',dialog=>dialog.accept())
  })
  const page=await context.newPage()
  const open=async(path='/meeting-minutes/?from=voice')=>{await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.locator('main h1').first().waitFor()}
  try {await fn({page,context,open,external});assert.deepEqual(errors,[]);assert.equal(external.filter(url=>/huggingface|web-llm|transformers|mlc-ai/i.test(url)).length,0);results.push({name,pass:true})}
  catch(error){results.push({name,pass:false,error:error.message});await context.pages().at(-1).screenshot({path:resolve(out,name+'-failed.png'),fullPage:true}).catch(()=>{})}
  finally{await context.close()}
  console.log(JSON.stringify(results.at(-1)))
}
async function seed(context, incoming=payload(), saved=blank()) {
  await context.addInitScript(({incoming,saved})=>{
    if(!localStorage.getItem('__seed')){localStorage.setItem('meetingMinutes_auto',typeof saved==='string'?saved:JSON.stringify(saved));localStorage.setItem('__seed','1')}
    if(incoming && !sessionStorage.getItem('__seedSource')){sessionStorage.setItem('toolhub-voice-meeting-v1',JSON.stringify(incoming));sessionStorage.setItem('__seedSource','1')}
  },{incoming,saved})
}
async function choose(page,n,kind) {
  await page.getByLabel(`문장 ${n} 선택`,{exact:true}).check()
  if(kind)await page.getByRole('group',{name:`문장 ${n}의 추가 위치`,exact:true}).getByRole('button',{name:kind,exact:true}).click()
}
try {
  await run('voice-new-tab-preserves-audio-append-edit-save-export',async({page,context,open})=>{
    await seed(context,null);await open('/voice-memo/')
    await page.getByText('저장한 메모를 불러오고 있어요…',{exact:true}).waitFor({state:'hidden'})
    await page.getByLabel('오디오 파일 가져오기',{exact:true}).setInputFiles(wav())
    await page.getByLabel('전사문',{exact:true}).fill(payload().transcript)
    const popup=page.waitForEvent('popup');await button(page,'회의록으로 정리 (새 탭)').click();const meeting=await popup
    await meeting.waitForURL('**/meeting-minutes/?from=voice');await meeting.getByRole('heading',{name:'음성 메모에서 회의록으로',exact:true}).waitFor()
    assert.equal(await meeting.evaluate(()=>window.opener),null)
    assert.ok(page.url().includes('/voice-memo/'));assert.equal(await page.getByTestId('voice-memo-item').count(),1)
    assert.equal(await page.getByLabel('전사문',{exact:true}).inputValue(),payload().transcript)
    assert.ok(!decodeURIComponent(meeting.url()).includes('보고서'));assert.deepEqual(await data(meeting),blank())
    await choose(meeting,1,'토의');await choose(meeting,2,'결정 사항');await choose(meeting,3,'할 일')
    await meeting.getByLabel('문장 3 수정',{exact:true}).fill('견적서 2건 요청')
    await button(meeting,'선택한 3개 추가하고 저장').click();await meeting.getByText('선택한 문장을 회의록에 추가하고',{exact:false}).waitFor()
    let stored=await data(meeting);assert.equal(stored.title,blank().title);assert.equal(stored.discussions.length,2);assert.equal(stored.decisions,'원래 결정\n배포를 결정했습니다.')
    assert.equal(stored.actions[0].task,'견적서 2건 요청');assert.equal(stored.actions[0].assignee,'');assert.equal(stored.actions[0].dueDate,'');assert.ok(!JSON.stringify(stored).includes('불필요한 문장'))
    assert.equal(await meeting.evaluate(()=>sessionStorage.getItem('toolhub-voice-meeting-v1')),null)
    assert.equal(new URL(meeting.url()).searchParams.get('from'),null)
    await meeting.getByPlaceholder('담당자',{exact:true}).fill('민수');await meeting.getByLabel('기한',{exact:true}).fill('2026-11-20')
    await meeting.locator('#meeting-actions select').selectOption('done')
    await meeting.waitForFunction(()=>JSON.parse(localStorage.getItem('meetingMinutes_auto')).actions[0]?.status==='done')
    await button(meeting,'저장 슬롯').click();await meeting.getByLabel('저장 이름 입력 후 Enter',{exact:true}).fill('주간 회의 저장본');await button(meeting,'저장').click()
    await meeting.getByText('이름을 붙여 회의록을 저장했어요.',{exact:true}).waitFor()
    await meeting.reload({waitUntil:'domcontentloaded'});await meeting.getByPlaceholder('업무 내용',{exact:true}).waitFor()
    assert.equal(await meeting.getByText('가져올 글이 없거나',{exact:false}).count(),0)
    stored=await data(meeting);assert.equal(stored.discussions.length,2);assert.equal(stored.actions.length,1);assert.equal(stored.actions[0].assignee,'민수')
    await meeting.getByLabel('회의 제목',{exact:true}).fill('<script>alert(1)</script>')
    const download=meeting.waitForEvent('download');await button(meeting,'HTML').click();const html=readFileSync(await(await download).path(),'utf8')
    assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'))
    await meeting.getByLabel('회의 제목',{exact:true}).fill('주간 회의 정리')
    await meeting.waitForFunction(()=>JSON.parse(localStorage.getItem('meetingMinutes_auto')).title==='주간 회의 정리')
    await button(meeting,'미리보기').click();await meeting.screenshot({path:resolve(out,'meeting-preview.png'),animations:'disabled'})
  })
  await run('quota-failure-retains-selection-and-existing-draft',async({page,context,open})=>{
    await seed(context);await context.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='meetingMinutes_auto' && localStorage.getItem('__seed'))throw new DOMException('quota','QuotaExceededError');return set.call(this,key,value)}})
    await open();await choose(page,3,'할 일');await button(page,'선택한 1개 추가하고 저장').click()
    await page.getByRole('alert').filter({hasText:'기기에 저장하지 못했습니다'}).waitFor()
    assert.ok(await page.getByLabel('문장 3 선택',{exact:true}).isChecked());assert.deepEqual(await data(page),blank());assert.ok(await page.evaluate(()=>!!sessionStorage.getItem('toolhub-voice-meeting-v1')))
  })
  await run('newer-tab-draft-is-not-overwritten',async({page,context,open})=>{
    await seed(context);await open();await choose(page,1)
    await page.evaluate(()=>{const newer=JSON.parse(localStorage.getItem('meetingMinutes_auto'));newer.title='다른 탭에서 수정';localStorage.setItem('meetingMinutes_auto',JSON.stringify(newer))})
    await button(page,'선택한 1개 추가하고 저장').click();await page.getByRole('alert').filter({hasText:'다른 탭'}).waitFor()
    assert.equal((await data(page)).title,'다른 탭에서 수정');assert.equal((await data(page)).discussions.length,1)
  })
  await run('malformed-storage-and-expired-source-fail-closed',async({page,context,open})=>{
    await seed(context,{...payload(),createdAt:Date.now()-11*60000},'not-json');await open()
    await page.getByRole('alert').filter({hasText:'기존 저장 내용'}).waitFor();await page.getByText('가져올 글이 없거나',{exact:false}).waitFor()
    await page.getByLabel('회의 제목',{exact:true}).fill('새 입력');await page.waitForTimeout(1100)
    assert.equal(await page.evaluate(()=>localStorage.getItem('meetingMinutes_auto')),'not-json');assert.equal(await page.locator('#meeting-import-title').count(),0)
  })
  await run('duplicate-source-id-cannot-append-after-reload',async({page,context,open})=>{
    const incoming=payload();await seed(context,incoming);await open();await choose(page,2,'결정 사항');await button(page,'선택한 1개 추가하고 저장').click()
    await page.getByText('선택한 문장을 회의록에 추가하고',{exact:false}).waitFor();await page.evaluate(source=>sessionStorage.setItem('toolhub-voice-meeting-v1',JSON.stringify(source)),incoming)
    await page.goto(base+'/meeting-minutes/?from=voice',{waitUntil:'domcontentloaded'});await page.getByText('이미 이 회의록에 추가한 메모입니다.',{exact:false}).waitFor()
    assert.equal((await data(page)).decisions,'원래 결정\n배포를 결정했습니다.');assert.equal(await page.locator('#meeting-import-title').count(),0)
  })
  await run('popup-blocked-retains-unsaved-voice-memo',async({page,context,open})=>{
    await context.addInitScript(()=>{window.open=()=>null});await open('/voice-memo/')
    await page.getByText('저장한 메모를 불러오고 있어요…',{exact:true}).waitFor({state:'hidden'});await page.getByLabel('오디오 파일 가져오기',{exact:true}).setInputFiles(wav())
    await page.getByLabel('전사문',{exact:true}).fill('원래 메모를 보존합니다.');await button(page,'회의록으로 정리 (새 탭)').click()
    await page.getByRole('alert').filter({hasText:'새 탭이 차단됐어요'}).waitFor();assert.equal(await page.getByLabel('전사문',{exact:true}).inputValue(),'원래 메모를 보존합니다.');assert.equal(context.pages().length,1)
  })
  await run('mobile-320-dark-import-and-action-editing',async({page,context,open})=>{
    await seed(context);await context.addInitScript(()=>localStorage.setItem('theme','dark'));await open()
    await choose(page,1,'토의');await choose(page,3,'할 일')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await page.locator('[aria-labelledby="meeting-import-title"]').screenshot({path:resolve(out,'mobile-import.png')})
    await button(page,'선택한 2개 추가하고 저장').click();await page.getByPlaceholder('담당자',{exact:true}).fill('담당 확인')
    await page.locator('#meeting-actions').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    assert.ok(await page.getByPlaceholder('업무 내용',{exact:true}).evaluate(el=>getComputedStyle(el).fontSize==='16px'))
    await page.screenshot({path:resolve(out,'mobile-actions.png')})
    await button(page,'미리보기').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    assert.ok(!/import\.(title|hint)|storage\.(saved|unsaved)/.test(await page.locator('main').innerText()))
  },{width:320})
} finally {await browser.close();writeFileSync(resolve(out,only?'results-'+only+'.json':'results.json'),JSON.stringify(results,null,2))}
if(results.some(result=>!result.pass))process.exitCode=1
