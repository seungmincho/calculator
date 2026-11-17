const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')
const entry = 'src/components/CsatGrade.tsx'
const panel = h => h.find(node => typeof node.type === 'function' && node.type.name === 'CsatScoreRecords').props
const input = (h, id) => h.find(node => node.props.id === `csat-${id}`)
const clone = value => JSON.parse(JSON.stringify(value))
const old = { examYear:2025, referenceYear:2024, scores:{ kor:'', math:'050', eng:'0', hist:'40', inq1:'50', inq2:'45' }, selection:{ kor:'hj',math:'geo',inq1:'bio2',inq2:'law' } }
let groups=0
async function check(name,run) { await run();groups++;console.log(`PASS ${name}`) }
;(async()=>{
  await check('Share URL restores before saved-record actions and marks its origin once',async()=>{
    const url='https://toolhub.ai.kr/csat-grade/?kor=99&math=75&korSel=hj&mathSel=calc&minN=4&minSum=9'
    const h=await componentHarness(entry,{ hydrated:false,url });h.render()
    assert.equal(panel(h).ready,false);assert.equal(panel(h).fromLink,false);assert.equal(h.window.location.href,url)
    h.setHydrated(true)
    assert.equal(panel(h).ready,true);assert.equal(panel(h).fromLink,true)
    assert.equal(panel(h).current.scores.kor,'99');assert.equal(panel(h).current.scores.math,'75')
    assert.equal(panel(h).current.selection.kor,'hj');assert.equal(panel(h).current.selection.math,'calc')
    h.cleanup()
  })
  await check('Loading past scores preserves current basis and minimum conditions while retaining empty and leading-zero strings',async()=>{
    const h=await componentHarness(entry,{ url:'https://toolhub.ai.kr/csat-grade/?minN=4&minSum=9' });h.render()
    const snapshot=clone(old);panel(h).onRestore(snapshot);h.render()
    assert.deepEqual(clone(panel(h).current.scores),old.scores)
    assert.deepEqual(clone(panel(h).current.selection),old.selection)
    assert.equal(panel(h).current.examYear,2027);assert.equal(panel(h).current.referenceYear,2026)
    assert.equal(input(h,'kor').props.value,'');assert.equal(input(h,'math').props.value,'050')
    assert.equal(h.button('u.nSum{"n":4}').props['aria-pressed'],true)
    assert.equal(h.find(node=>node.props['aria-label']==='u.minSumAria').props.value,9)
    assert.match(h.find(node=>node.type==='ShareResult').props.card.label,/2026/)
    snapshot.scores.math='99';assert.equal(panel(h).current.scores.math,'050')
    h.cleanup()
  })
  await check('Local edits do not retroactively become an incoming shared link',async()=>{
    const h=await componentHarness(entry,{ url:'https://toolhub.ai.kr/csat-grade/' });h.render()
    assert.equal(panel(h).fromLink,false)
    input(h,'eng').props.onChange({ target:{ value:'99' } });h.render()
    assert.equal(new URL(h.window.location.href).searchParams.get('eng'),'99')
    assert.equal(panel(h).fromLink,false);h.cleanup()
  })
  await check('A complete loaded record keeps normal share URL round trips and current reference labels',async()=>{
    const h=await componentHarness(entry,{ url:'https://toolhub.ai.kr/csat-grade/?minN=2&minSum=5' });h.render()
    const snapshot={ ...old,scores:{ ...old.scores,kor:'87' } };panel(h).onRestore(snapshot);h.render()
    const newer=await componentHarness(entry,{ hydrated:false,url:h.window.location.href });newer.render();newer.setHydrated(true)
    assert.deepEqual(clone(panel(newer).current),clone(panel(h).current))
    assert.equal(newer.find(node=>node.props['aria-label']==='u.minSumAria').props.value,5)
    assert.equal(newer.button('u.nSum{"n":2}').props['aria-pressed'],true)
    assert.equal(newer.find(node=>node.type==='ShareResult').props.card.headline,h.find(node=>node.type==='ShareResult').props.card.headline)
    assert.match(newer.find(node=>node.type==='ShareResult').props.card.label,/2026/)
    h.cleanup();newer.cleanup()
  })
  console.log(`Independent CSAT integration: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
