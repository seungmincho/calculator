const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')
const entry = 'src/components/CsatGrade.tsx'
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
const input = (h, id) => h.find(node => node.props.id === `csat-${id}`)
const plainTree = h => JSON.stringify(h.render())
;(async () => {
  await check('Nondefault incoming query renders defaults first without changing address, then restores every field', async () => {
    const url = 'https://toolhub.ai.kr/csat-grade/?kor=91&math=72&eng=95&hist=35&inq1=47&inq2=38&korSel=hj&mathSel=calc&inq1Type=law&inq2Type=bio2&minN=4&minSum=9&campaign=review#results'
    const initial = await componentHarness(entry, { hydrated: false })
    const h = await componentHarness(entry, { hydrated: false, url })
    assert.equal(plainTree(h), plainTree(initial))
    assert.equal(h.window.location.href, url)
    const state = { marker: 'existing Next history state' }; h.window.history.state = state
    const replace = h.window.history.replaceState; const writes = []
    h.window.history.replaceState = (...args) => { writes.push(args); return replace(...args) }
    h.setHydrated(true)
    for (const [id, value] of Object.entries({ kor:'91', math:'72', eng:'95', hist:'35', inq1:'47', inq2:'38' })) assert.equal(input(h, id).props.value, value)
    assert.deepEqual(h.all().filter(node => node.type === 'select').slice(0,4).map(node => node.props.value), ['hj','calc','law','bio2'])
    assert.equal(h.find(node => node.props['aria-label'] === 'u.minSumAria').props.value, 9)
    assert.equal(h.button('u.nSum{"n":4}').props['aria-pressed'], true)
    assert.equal(h.window.location.href, url)
    assert.equal(writes.length, 0)
    input(h, 'eng').props.onChange({ target: { value: '89' } }); h.render()
    assert.equal(writes.length, 1); assert.equal(writes[0][0], state)
    assert.equal(h.window.location.search.includes('campaign=review'), true)
    assert.equal(h.window.location.hash, '#results')
    h.cleanup(); initial.cleanup()
  })
  await check('Legacy query restores after hydration before normalization removes old keys', async () => {
    const url = 'https://toolhub.ai.kr/csat-grade/?subject=mathCalc&score=98&inq1Type=sci'
    const h = await componentHarness(entry, { hydrated: false, url }); h.render()
    assert.equal(input(h, 'math').props.value, '80'); assert.equal(h.window.location.href, url)
    h.setHydrated(true)
    assert.equal(input(h, 'math').props.value, '98')
    assert.deepEqual(h.all().filter(node => node.type === 'select').slice(0,4).map(node => node.props.value), ['lm','calc','earth1','ethics'])
    assert.equal(h.window.location.search.includes('subject='), false)
    assert.equal(h.window.location.search.includes('score='), false)
    assert.equal(new URL(h.window.location.href).searchParams.get('math'), '98')
    h.cleanup()
  })
  await check('The initial query is restored only once and later input remains editable', async () => {
    const h = await componentHarness(entry, { hydrated: false, url: 'https://toolhub.ai.kr/csat-grade/?eng=99&korSel=unknown&minN=8&minSum=-1' }); h.render(); h.setHydrated(true)
    assert.equal(input(h, 'eng').props.value, '99')
    assert.equal(h.all().filter(node => node.type === 'select')[0].props.value, 'lm')
    assert.equal(h.find(node => node.props['aria-label'] === 'u.minSumAria').props.value, 7)
    input(h, 'eng').props.onChange({ target: { value: '78' } }); h.render(); h.setHydrated(true)
    assert.equal(input(h, 'eng').props.value, '78')
    assert.equal(new URL(h.window.location.href).searchParams.get('eng'), '78')
    h.cleanup()
  })
  console.log(`CSAT hydration fix: ${groups} independent groups passed`)
})().catch(error => { console.error(error); process.exitCode = 1 })
