const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')
const entry = 'src/components/GradeCalculator.tsx'
const clone = value => JSON.parse(JSON.stringify(value))
const panel = h => h.find(node => typeof node.type === 'function' && node.type.name === 'GradeSavedRecords').props
const fields = (h, field) => h.all().filter(node => node.type === 'input' && node.props['aria-label'] === `subjects.${field}`)
const share = h => h.find(node => node.type === 'ShareResult').props
const settle = async h => { await Promise.resolve(); h.render() }
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
;(async () => {
  await check('The incoming URL wins before record actions are enabled', async () => {
    const url = 'https://toolhub.ai.kr/grade-calculator/?y=2024&sys=9&s=' + encodeURIComponent('같은 과목~4~1~7~96|같은 과목~2.5~5~1~100')
    const h = await componentHarness(entry, { url }); h.render()
    assert.equal(panel(h).ready, false); assert.equal(h.window.location.href, url)
    await settle(h)
    assert.equal(panel(h).ready, true)
    assert.deepEqual(clone(panel(h).current), { entryYear: 2024, system: 9, rows: [
      { name: '같은 과목', units: '4', rank: '1', ties: '7', total: '96' },
      { name: '같은 과목', units: '2.5', rank: '5', ties: '1', total: '100' },
    ] })
    assert.match(share(h).card.headline, /^2\.00/)
    h.cleanup()
  })
  await check('Explicit restore preserves blank and malformed original strings and excludes them from the average', async () => {
    const h = await componentHarness(entry); h.render(); await settle(h)
    const snapshot = { entryYear: 2024, system: 9, rows: [
      { name: '동일 과목', units: ' 2.5 ', rank: '01', ties: '7', total: '96' },
      { name: '동일 과목', units: '2abc', rank: '2', ties: '', total: '100' },
      { name: '', units: '', rank: '', ties: '', total: '' },
    ] }
    panel(h).onRestore(snapshot); h.render()
    assert.deepEqual(clone(panel(h).current), snapshot)
    assert.equal(fields(h, 'units')[1].props.value, '2abc')
    assert.equal(fields(h, 'rank')[2].props.value, '')
    assert.match(share(h).card.sub, /"count":1,"units":2\.5/)
    assert.match(share(h).card.headline, /^2\.00/)
    snapshot.rows[0].rank = '80'
    assert.equal(panel(h).current.rows[0].rank, '01')
    h.cleanup()
  })
  await check('Restored duplicate rows get independent identities through edit, removal and new additions', async () => {
    const h = await componentHarness(entry); h.render(); await settle(h)
    h.button('subjects.add').props.onClick(); h.render()
    const snapshot = { entryYear: 2025, system: 5, rows: [
      { name: '첫 과목', units: '4', rank: '5', ties: '1', total: '100' },
      { name: '둘째 과목', units: '2', rank: '10', ties: '1', total: '200' },
    ] }
    panel(h).onRestore(snapshot); h.render()
    assert.match(h.text(), /table.titleFor\{"subject":"첫 과목","total":100\}/)
    fields(h, 'name')[1].props.onChange({ target: { value: '첫 과목' } }); h.render()
    fields(h, 'rank')[1].props.onChange({ target: { value: '30' } }); h.render()
    assert.deepEqual(clone(panel(h).current.rows.map(row => row.rank)), ['5','30'])
    h.all().filter(node => node.type === 'button' && node.props['aria-label'] === 'subjects.remove')[0].props.onClick(); h.render()
    assert.equal(panel(h).current.rows.length, 1); assert.equal(panel(h).current.rows[0].rank, '30')
    h.button('subjects.add').props.onClick(); h.render()
    fields(h, 'rank')[1].props.onChange({ target: { value: '45' } }); h.render()
    assert.deepEqual(clone(panel(h).current.rows.map(row => row.rank)), ['30','45'])
    h.button('input.reset').props.onClick(); h.render()
    assert.equal(panel(h).current.rows.length, 1); assert.equal(panel(h).current.rows[0].rank, '')
    h.cleanup()
  })
  await check('A valid restored record keeps the existing tie calculation and share-link result', async () => {
    const h = await componentHarness(entry); h.render(); await settle(h)
    const snapshot = { entryYear: 2024, system: 9, rows: [
      { name: '수학', units: '4', rank: '1', ties: '7', total: '96' },
      { name: '영어', units: '2', rank: '1', ties: '1', total: '100' },
    ] }
    panel(h).onRestore(snapshot); h.render()
    assert.match(share(h).card.headline, /^1\.67/)
    const restored = await componentHarness(entry, { url: h.window.location.href }); restored.render(); await settle(restored)
    assert.deepEqual(clone(panel(restored).current), snapshot)
    assert.equal(share(restored).card.headline, share(h).card.headline)
    h.cleanup(); restored.cleanup()
  })
  console.log(`Independent grade integration: ${groups} groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
