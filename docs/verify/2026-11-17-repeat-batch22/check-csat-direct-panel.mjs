import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const patch = JSON.parse(readFileSync('docs/verify/2026-11-17-repeat-batch22/translations-csat-direct.json', 'utf8'))
const messages = locale => {
  const original = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
  return { csatGrade: { ...original.csatGrade, ...patch[locale].csatGrade } }
}
const goal = { id: 'goal-one', name: '내 목표', areas: 2, maxSum: 5, createdAt: '2026-11-17T00:00:00.000Z', updatedAt: '2026-11-17T00:00:00.000Z' }
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
async function fixture() {
  const translations = messages('ko')
  const props = { goals: [goal], ready: true, blocked: false }
  const h = await componentHarness('src/components/CsatDirectGradePanel.tsx', { props, messages: translations, url: 'https://toolhub.ai.kr/csat-grade/?kor=84#saved', storage: { 'toolhub-csat-score-records-v1': 'original record bytes', 'toolhub-csat-goals-v1': 'original goal bytes' } })
  h.render()
  const field = id => h.find(node => node.props['data-direct-grade'] === id)
  const choose = (id, value) => { field(id).props.onChange({ target: { value } }); h.render() }
  return { h, props, translations, field, choose }
}

await check('The explicit panel starts empty and opening or editing it never writes original records or URLs', async () => {
  const f = await fixture(), url = f.h.window.location.href, before = JSON.stringify([...f.h.stored])
  assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-direct-grade')).length, 0)
  f.h.button(f.translations.csatGrade.directGrades.open).props.onClick(); f.h.render()
  const fields = f.h.all().filter(node => Object.hasOwn(node.props, 'data-direct-grade'))
  assert.equal(fields.length, 5); assert.ok(fields.every(field => field.props.value === ''))
  assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'needsInput')
  f.choose('kor', '2'); f.choose('math', '3')
  assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'within')
  assert.equal(f.h.window.location.href, url); assert.equal(JSON.stringify([...f.h.stored]), before); f.h.cleanup()
})
await check('Collapse, goal updates/deletion, blocked refresh and KO/EN changes preserve direct inputs', async () => {
  const f = await fixture()
  f.h.button(f.translations.csatGrade.directGrades.open).props.onClick(); f.h.render(); f.choose('kor', '1'); f.choose('eng', '3')
  f.h.button(f.translations.csatGrade.directGrades.close).props.onClick(); f.h.render()
  f.h.setProps({ ...f.props, goals: [{ ...goal, areas: 3, maxSum: 7 }] })
  f.h.button(f.translations.csatGrade.directGrades.open).props.onClick(); f.h.render()
  assert.equal(f.field('kor').props.value, '1'); assert.equal(f.field('eng').props.value, '3')
  assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'needsInput')
  f.h.setProps({ ...f.props, blocked: true })
  assert.equal(f.h.all().filter(node => Object.hasOwn(node.props, 'data-direct-goal')).length, 0); assert.equal(f.field('eng').props.value, '3')
  f.translations.csatGrade = messages('en').csatGrade; f.h.render(); assert.equal(f.field('kor').props.value, '1')
  f.h.setProps({ ...f.props, goals: [] }); assert.equal(f.field('eng').props.value, '3')
  f.h.setProps(f.props); assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'within')
  f.h.button(f.translations.csatGrade.directGrades.reset).props.onClick(); f.h.render(); assert.equal(f.field('kor').props.value, ''); f.h.cleanup()
})
await check('Inquiry subject requirements and conflicting grades show exclusions instead of a fabricated goal sum', async () => {
  const f = await fixture()
  f.h.button(f.translations.csatGrade.directGrades.open).props.onClick(); f.h.render(); f.choose('kor', '1'); f.choose('inq1', '1')
  assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'needsInput')
  assert.match(f.h.text(), /탐구 과목을 선택/)
  const subject = field => f.h.find(node => node.props['data-direct-inquiry'] === field)
  subject('inq1').props.onChange({ target: { value: 'society' } }); f.h.render()
  assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'within')
  subject('inq2').props.onChange({ target: { value: 'society' } }); f.h.render(); f.choose('inq2', '2')
  assert.equal(f.h.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'], 'needsInput'); assert.match(f.h.text(), /서로 다른 등급/)
  f.h.cleanup()
})
console.log(`${groups} standalone direct-grade panel groups passed`)
