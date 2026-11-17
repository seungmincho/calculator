const assert = require('node:assert/strict')
const { componentHarness, text } = require('./component-harness.cjs')
const entry = 'src/components/CsatDday.tsx'
let now = Date.parse('2026-11-17T03:00:00Z')
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
const setup = { globals: { Date: ClockDate }, rawTranslations: { weekdays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] } }
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }

;(async () => {
  await check('First-screen guidance and existing main sections remain mounted', async () => {
    const h = await componentHarness(entry, { ...setup, hydrated: false, url: 'https://toolhub.ai.kr/csat-dday/?name=%ED%99%8D%EA%B8%B8%EB%8F%99' }); h.render()
    const children = h.all().filter(node => typeof node.type === 'function').map(node => node.type.name)
    assert.deepEqual(children, ['ExamEssentials','Hero','Checklist','Schedule','AnswerSheet','Timeline','Cheer','Guide'])
    const cheer = () => h.find(node => typeof node.type === 'function' && node.type.name === 'Cheer')
    assert.equal(cheer().props.name, '')
    h.setHydrated(true); assert.equal(cheer().props.name, '홍길동')
    cheer().props.setName('수정한 이름'); h.render(); assert.equal(cheer().props.name, '수정한 이름')
    h.cleanup()
  })
  await check('Arrival is 08:10 and all shortcut targets remain local anchors', async () => {
    const h = await componentHarness(entry, { ...setup, namedExport: 'ExamEssentials' }); h.render()
    assert.match(h.text(), /08:10/)
    assert.match(h.text(), /2026-11-17/)
    const links = h.all().filter(node => node.type === 'a')
    assert.deepEqual(links.filter(node => node.props.href.startsWith('#')).map(node => node.props.href), ['#csat-checklist','#csat-schedule','#csat-practice'])
    assert.ok(links.every(node => !node.props.onClick))
    h.cleanup()
  })
  await check('Real Hero moves from D-2 to D-1 at KST midnight', async () => {
    now = Date.parse('2026-11-17T14:59:59Z')
    const h = await componentHarness(entry, { ...setup, namedExport: 'Hero' }); h.render()
    assert.match(h.text(), /D-2/)
    now = Date.parse('2026-11-17T15:00:00Z'); h.tick(1000)
    assert.match(h.text(), /D-1/); assert.doesNotMatch(h.text(), /D-2/)
    h.cleanup(); now = Date.parse('2026-11-17T03:00:00Z')
  })
  await check('Six explicit practice links preserve subject labels and minute presets', async () => {
    const h = await componentHarness(entry, { ...setup, namedExport: 'Schedule' }); h.render()
    const links = h.all().filter(node => node.type === 'a' && node.props.href?.startsWith('/timer/'))
    assert.equal(links.length, 6)
    assert.deepEqual(links.map(node => node.props.href), ['/timer/?m=80','/timer/?m=100','/timer/?m=70','/timer/?m=30','/timer/?m=30','/timer/?m=40'])
    for (const [index, key] of ['kor','math','eng','hist','inq1','lang2'].entries()) {
      assert.match(text(links[index]), new RegExp(`practice.subjects.${key}`))
      assert.equal(links[index].props.onClick, undefined)
    }
    assert.ok(h.all().some(node => node.props.id === 'csat-practice'))
    h.cleanup()
  })
  await check('Checklist restores existing key and toggles only an explicit item', async () => {
    const original = JSON.stringify({ admitCard: true, watch: true })
    const h = await componentHarness(entry, { ...setup, hydrated: false, namedExport: 'Checklist', storage: { 'csatDday.checklist': original } }); h.render()
    assert.equal(h.stored.get('csatDday.checklist'), original)
    assert.equal(h.find(node => node.type === 'input' && node.props.type === 'checkbox').props.checked, false)
    h.setHydrated(true)
    assert.equal(h.stored.get('csatDday.checklist'), original)
    const boxes = h.all().filter(node => node.type === 'input' && node.props.type === 'checkbox')
    assert.equal(boxes[0].props.checked, true); assert.equal(boxes[1].props.checked, false)
    boxes[1].props.onChange(); h.render()
    assert.deepEqual(JSON.parse(h.stored.get('csatDday.checklist')), { admitCard: true, watch: true, idCard: true })
    h.cleanup()
  })
  await check('Answer sheet retains stored answers and selected subject; print remains explicit', async () => {
    const sheet = { a: { kor: ['3','2'], math: ['5'] }, s: { kor: '언어와 매체', math: '미적분' } }
    const original = JSON.stringify(sheet); let prints = 0
    const h = await componentHarness(entry, { ...setup, hydrated: false, namedExport: 'AnswerSheet', storage: { 'csatDday.sheet': original }, window: { print() { prints++ } } }); h.render()
    assert.equal(h.stored.get('csatDday.sheet'), original)
    assert.equal(h.find(node => node.type === 'input' && node.props['aria-label'] === 'sheet.qLabel{"q":1}').props.value, '')
    h.setHydrated(true)
    assert.equal(h.stored.get('csatDday.sheet'), original)
    assert.equal(h.find(node => node.type === 'input' && node.props['aria-label'] === 'sheet.qLabel{"q":1}').props.value, '3')
    assert.equal(h.find(node => node.type === 'input' && node.props['aria-label'] === 'sheet.selectPlaceholder').props.value, '언어와 매체')
    const printed = h.find(node => typeof node.type === 'function' && node.type.name === 'PrintSheet')
    assert.deepEqual(JSON.parse(JSON.stringify(printed.props.sheet)), sheet)
    assert.equal(prints, 0); h.button('sheet.print').props.onClick(); assert.equal(prints, 1)
    h.cleanup()
    const p = await componentHarness(entry, { ...setup, namedExport: 'PrintSheet', props: { sheet } }); p.render()
    assert.match(p.text(), /sheet.printScope/); assert.match(p.text(), /언어와 매체/)
    p.cleanup()
  })
  await check('Calendar export preserves dates and provides current per-event descriptions', async () => {
    const h = await componentHarness(entry, { ...setup, namedExport: 'Timeline' }); h.render()
    const calendar = h.find(node => node.type === 'AddToCalendar').props
    assert.equal(calendar.file, 'csat-2027-schedule.ics')
    assert.equal(calendar.events.length, 10)
    assert.equal(calendar.events[0].date, '2026-11-19')
    assert.equal(calendar.events[1].date, '2026-12-11')
    assert.ok(calendar.events.every(event => event.description))
    assert.ok(calendar.events.every(event => event.description.includes('timeline.note')))
    h.cleanup()
  })
  console.log(`Independent CSAT D-day: ${groups} component groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
