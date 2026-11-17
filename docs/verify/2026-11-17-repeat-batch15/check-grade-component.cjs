const assert = require('node:assert/strict')
const fs = require('node:fs')
const { componentHarness } = require('./component-harness.cjs')
const entry = 'src/components/CsatGrade.tsx'
const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch15/translations-grade.json', 'utf8'))
const merge = (base, changes) => {
  for (const [key, value] of Object.entries(changes)) {
    base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value
  }
  return base
}
let groups = 0
let now = Date.parse('2026-11-17T14:59:59Z')
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }

;(async () => {
  for (const locale of ['ko', 'en']) {
    const messages = merge(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), patch[locale])
    const setup = { messages, globals: { Date: ClockDate }, url: 'https://toolhub.ai.kr/csat-grade/?kor=84&math=80&eng=90&hist=40&inq1=44&inq2=41&korSel=lm&mathSel=prob&inq1Type=society&inq2Type=ethics' }
    const estimate = locale === 'ko' ? /추정/ : /estimate/i
    const absolute = locale === 'ko' ? /절대평가/ : /absolute/i
    await check(`${locale}: current exam and prior reference year are visible and included in share output`, async () => {
      const h = await componentHarness(entry, setup); h.render()
      assert.match(h.text(), /2026/); assert.match(h.text(), /2027/)
      const share = h.find(node => node.type === 'ShareResult').props
      assert.match(share.card.label, /2026/); assert.match(share.card.label, estimate)
      assert.match(share.card.sub, /2027/); assert.match(share.card.sub, absolute)
      assert.match(share.text, /2026/); assert.match(share.text, /2027/); assert.match(share.text, estimate)
      share.card.rows.slice(0, 2).forEach(row => assert.match(row.value, estimate))
      share.card.rows.slice(2, 4).forEach(row => assert.match(row.value, absolute))
      assert.match(share.card.rows[4].value, estimate)
      h.cleanup()
    })
    await check(`${locale}: absolute tables remove relative standard-score and percentile columns`, async () => {
      const h = await componentHarness(entry, setup); h.render()
      const select = () => h.find(node => node.type === 'select' && node.props.value === 'korLm')
      assert.match(h.find(node => node.type === 'caption').props.children, /2026/)
      select().props.onChange({ target: { value: 'english' } }); h.render()
      assert.match(h.find(node => node.type === 'caption').props.children, /2027/)
      assert.match(h.find(node => node.type === 'caption').props.children, absolute)
      assert.equal(h.all().filter(node => node.type === 'th').length, 3)
      const scores = h.all().filter(node => node.type === 'tr').slice(1).map(row => row.props.children.filter(Boolean)[1].props.children)
      assert.deepEqual(scores, [90,80,70,60,50,40,30,20,0])
      h.cleanup()
    })
    await check(`${locale}: input changes keep reference labels and recover through existing share URL`, async () => {
      const h = await componentHarness(entry, setup); h.render()
      h.find(node => node.props.id === 'csat-eng').props.onChange({ target: { value: '89' } }); h.render()
      const share = h.find(node => node.type === 'ShareResult').props
      assert.match(share.card.rows[2].value, /2/); assert.match(share.card.rows[2].value, absolute)
      assert.equal(new URL(h.window.location.href).searchParams.get('eng'), '89')
      const restored = await componentHarness(entry, { ...setup, url: h.window.location.href }); restored.render()
      assert.equal(restored.find(node => node.props.id === 'csat-eng').props.value, '89')
      assert.equal(restored.find(node => node.type === 'ShareResult').props.card.headline, share.card.headline)
      h.cleanup(); restored.cleanup()
    })
  }
  await check('Grade headline also switches at KST midnight and never switches the reference year', async () => {
    now = Date.parse('2026-11-17T14:59:59Z')
    const h = await componentHarness(entry, { globals: { Date: ClockDate } }); h.render(); h.tick(0)
    assert.match(h.text(), /D-2/)
    now = Date.parse('2026-11-17T15:00:00Z'); h.tick(60000)
    assert.match(h.text(), /D-1/)
    assert.match(h.find(node => node.type === 'ShareResult').props.card.label, /2026/)
    h.cleanup()
  })
  console.log(`Independent CSAT grade: ${groups} component groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
