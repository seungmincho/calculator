import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { componentHarness, text } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const original = JSON.parse(readFileSync('messages/ko.json', 'utf8'))
const patch = JSON.parse(readFileSync('docs/verify/2026-11-17-repeat-batch22/translations-csat-direct.json', 'utf8')).ko
const messages = { csatGrade: { ...original.csatGrade, ...patch.csatGrade } }
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log(`PASS ${name}`) }
async function fixture(query = '') {
  const stored = { 'toolhub-csat-score-records-v1': 'existing record bytes', 'toolhub-csat-goals-v1': 'existing goal bytes' }
  const h = await componentHarness('src/components/CsatGrade.tsx', { messages, url: `https://toolhub.ai.kr/csat-grade/?campaign=keep&${query}#kept`, storage: stored })
  h.render()
  return {
    h, stored,
    row: id => h.find(node => node.props['data-csat-score-field'] === id),
    hero: () => text(h.find(node => node.props['data-csat-average'] === 'all')),
    noEnglish: () => text(h.find(node => node.props['data-csat-average'] === 'noEnglish')),
    share: () => h.find(node => node.type === 'ShareResult').props,
    input: id => h.find(node => node.type === 'input' && node.props.id === `csat-${id}`),
    current: () => h.find(node => typeof node.type === 'function' && node.type.name === 'CsatScoreRecords').props.current,
  }
}

await check('Absent, blank, actual zero and invalid URL scores remain distinct in input, rows, hero and share payloads', async () => {
  for (const [query, score, status, expected] of [['', '84', 'valid', '2.25등급'], ['kor=', '', 'missing', '입력 필요'], ['kor=0', '0', 'valid', '4.00등급'], ['kor=abc', 'abc', 'invalid', '입력 확인 필요'], ['kor=-1', '-1', 'invalid', '입력 확인 필요']]) {
    const f = await fixture(query)
    assert.equal(f.current().scores.kor, score); assert.equal(f.input('kor').props.value, score)
    assert.equal(f.row('kor').props['data-csat-score-state'], status); assert.equal(f.hero(), expected); assert.equal(f.share().card.headline, expected)
    if (status !== 'valid') {
      assert.equal(f.share().card.rows[0].value, status === 'missing' ? '미입력' : '입력 확인')
      assert.ok(!/0점|9등급|보간|상위/.test(text(f.row('kor'))))
      assert.ok(!f.h.all().some(node => node.type === 'tr' && node.props.className?.includes('bg-primary-soft')))
    } else if (score === '0') { assert.match(f.share().card.rows[0].value, /9등급/); assert.match(f.share().card.rows[0].value, /0점/) }
    assert.equal(f.h.window.location.hash, '#kept'); assert.equal(f.h.window.location.searchParams.get('campaign'), 'keep')
    assert.deepEqual(Object.fromEntries(f.h.stored), f.stored); f.h.cleanup()
  }
})
await check('Legacy score links retain blank, zero and invalid values with their elective mapping', async () => {
  for (const [value, status] of [['', 'missing'], ['0', 'valid'], ['nonsense', 'invalid']]) {
    const f = await fixture(`subject=mathCalc&score=${value}`)
    assert.equal(f.current().selection.math, 'calc'); assert.equal(f.current().scores.math, value)
    assert.equal(f.row('math').props['data-csat-score-state'], status)
    assert.equal(f.h.window.location.searchParams.get('math'), value); assert.equal(f.h.window.location.searchParams.has('subject'), false); f.h.cleanup()
  }
})
await check('History blanks retain both averages while English blanks only block the full average and shared headline', async () => {
  const history = await fixture('hist=')
  assert.equal(history.hero(), '2.25등급'); assert.match(history.noEnglish(), /2.33등급/); assert.equal(history.share().card.rows[3].value, '미입력'); history.h.cleanup()
  const english = await fixture('eng=')
  assert.equal(english.hero(), '입력 필요'); assert.match(english.noEnglish(), /2.33등급/); assert.equal(english.share().card.rows[2].value, '미입력')
  assert.match(english.share().text, /평균: 입력 필요/); assert.ok(!english.share().text.includes('입력 필요등급')); english.h.cleanup()
})
await check('Conflicting duplicate inquiry scores block averages even for matching grades; agreeing inputs keep old numbers and warning', async () => {
  const conflict = await fixture('inq1Type=society&inq2Type=society&inq1=44&inq2=45')
  assert.equal(conflict.hero(), '입력 확인 필요'); assert.match(conflict.noEnglish(), /입력 확인 필요/); assert.match(conflict.h.text(), /서로 다른 점수를 입력해 평균 계산을 보류/); conflict.h.cleanup()
  const duplicate = await fixture('inq1Type=society&inq2Type=society&inq1=44&inq2=44')
  assert.equal(duplicate.hero(), '2.00등급'); assert.match(duplicate.h.text(), /한 과목·한 영역/); duplicate.h.cleanup()
})
await check('Typing decimals and out-of-range scores preserves the exact draft and withholds estimated results', async () => {
  const f = await fixture()
  for (const value of ['84.5', '101', '-2', '', '0']) {
    f.input('kor').props.onChange({ target: { value } }); f.h.render()
    assert.equal(f.current().scores.kor, value); assert.equal(f.h.window.location.searchParams.get('kor'), value)
    assert.equal(f.row('kor').props['data-csat-score-state'], value === '' ? 'missing' : value === '0' ? 'valid' : 'invalid')
  }
  assert.deepEqual(Object.fromEntries(f.h.stored), f.stored); f.h.cleanup()
})
console.log(`${groups} raw-summary parent groups passed`)
