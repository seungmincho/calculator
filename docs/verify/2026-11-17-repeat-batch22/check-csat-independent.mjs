import assert from 'node:assert/strict'
import fs from 'node:fs'
import { webcrypto } from 'node:crypto'
import { componentHarness, text } from '../2026-11-17-repeat-batch19/component-harness.cjs'
import { summarizeCsatRawGrades } from '../../../src/utils/csatGradeSummary.ts'
import { evaluateCsatDirectGoal, emptyCsatDirectGrades } from '../../../src/utils/csatDirectGrades.ts'
import { evaluateCsatGoal } from '../../../src/utils/csatGoals.ts'
import { gradeOf, INQ_SOC, INQ_SCI } from '../../../src/utils/csatGrade.ts'

const base = { examYear: 2027, referenceYear: 2026, scores: { kor: '84', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41' }, selection: { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics' } }
const recordKey = 'toolhub-csat-score-records-v1', goalKey = 'toolhub-csat-goals-v1'
const timestamp = '2026-11-17T00:00:00.000Z'
const goal = { id: 'goal-a', name: '저장 목표', areas: 2, maxSum: 4, createdAt: timestamp, updatedAt: timestamp }
const recordsRaw = JSON.stringify({ version: 1, revision: 'record-revision', records: [{ id: 'score-a', name: '원점수 보존', createdAt: timestamp, snapshot: base }] })
const goalRaw = goals => JSON.stringify({ version: 1, revision: 'goal-revision', goals })
const clone = value => structuredClone(value)
const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const messages = lang => merge(JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch22/translations-csat-direct.json', 'utf8'))[lang])
const component = (h, name) => h.find(node => typeof node.type === 'function' && node.type.name === name)
let groups = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
const flush = () => new Promise(resolve => setImmediate(resolve))

await check('Six raw fields independently distinguish missing, true zero and invalid forms', () => {
  let cases = 0
  for (const field of Object.keys(base.scores)) for (const value of ['', '0', '00', 'abc', '-1', '101', '84.5', ' 0', '1e1']) {
    const snapshot = clone(base); snapshot.scores[field] = value
    const result = summarizeCsatRawGrades(snapshot), row = result.rows.find(row => row.id === field)
    const expected = value === '' ? 'missing' : ['0', '00'].includes(value) ? 'valid' : 'invalid'
    assert.equal(row.status, expected)
    if (expected !== 'valid') { assert.equal(row.grade, null); assert.equal(row.est, null); assert.equal(row.score, null); assert.equal(row.next, null) }
    else { assert.equal(row.score, 0); assert.equal(row.grade, 9) }
    if (expected !== 'valid') {
      assert.equal(result.averages.all === null, field !== 'hist')
      assert.equal(result.averages.noEng === null, field !== 'hist' && field !== 'eng')
    }
    assert.equal(snapshot.scores[field], value); cases++
  }
  console.log(`  ${cases} raw validity cases`)
})

await check('Complete input retains the original arithmetic and duplicate inquiries distinguish score conflicts', () => {
  const r2 = value => Math.round(value * 100) / 100
  for (const score of ['0', '35', '70', '100']) for (const inquiry of ['0', '25', '50']) {
    const snapshot = clone(base); snapshot.scores = { kor: score, math: score, eng: score, hist: '0', inq1: inquiry, inq2: inquiry }
    const summary = summarizeCsatRawGrades(snapshot)
    const k = gradeOf('korLm', Number(score)), m = gradeOf('mathProb', Number(score)), e = gradeOf('english', Number(score))
    const q = (gradeOf('society', Number(inquiry)) + gradeOf('ethics', Number(inquiry))) / 2
    assert.equal(summary.averages.all, r2((k + m + e + q) / 4)); assert.equal(summary.averages.noEng, r2((k + m + q) / 3))
  }
  for (const [a, b, conflict] of [['44', '45', true], ['44', '044', false], ['', '44', false]]) {
    const snapshot = clone(base); snapshot.selection.inq2 = 'society'; snapshot.scores.inq1 = a; snapshot.scores.inq2 = b
    const result = summarizeCsatRawGrades(snapshot)
    assert.equal(result.duplicateInquiry, true); assert.equal(result.inquiryConflict, conflict)
    if (conflict || a === '') assert.deepEqual(result.averages, { all: null, noEng: null })
  }
})

await check('Direct and raw adapters agree on valid grades and retain one inquiry area under incomplete/duplicate input', () => {
  for (const subject of [...INQ_SOC, ...INQ_SCI]) for (const points of [0, 25, 50]) {
    const snapshot = clone(base); snapshot.selection.inq1 = subject; snapshot.scores.inq1 = String(points); snapshot.scores.inq2 = ''
    const raw = summarizeCsatRawGrades(snapshot)
    const direct = emptyCsatDirectGrades()
    for (const field of ['kor', 'math', 'eng', 'inq1']) direct.grades[field] = String(raw.rows.find(row => row.id === field).grade)
    direct.inquiry.inq1 = subject
    for (const areas of [2, 3, 4]) {
      const goal = { areas, maxSum: areas * 3 }, a = evaluateCsatGoal(snapshot, goal), b = evaluateCsatDirectGoal(direct, goal)
      assert.equal(a.sum, b.sum); assert.equal(a.status, b.status); assert.deepEqual(a.used.map(area => area.id), b.used.map(area => area.id))
    }
  }
  const direct = emptyCsatDirectGrades(); direct.grades.kor = '1'; direct.grades.inq1 = '2'; direct.grades.inq2 = '2'; direct.inquiry = { inq1: 'society', inq2: 'society' }
  assert.equal(evaluateCsatDirectGoal(direct, { areas: 3, maxSum: 9 }).status, 'needsInput')
  assert.equal(evaluateCsatDirectGoal(direct, { areas: 2, maxSum: 4 }).available.length, 2)
  direct.grades.inq2 = '3'
  assert.equal(evaluateCsatDirectGoal(direct, { areas: 2, maxSum: 4 }).available.length, 1)
  direct.inquiry.inq1 = 'english'; direct.inquiry.inq2 = ''
  assert.deepEqual(evaluateCsatDirectGoal(direct, { areas: 2, maxSum: 4 }).missingSubjects, ['inq1', 'inq2'])
})

await check('Actual parent row/hero/share/table agree for all raw fields and retain URL raw spelling', async () => {
  const t = messages('ko')
  for (const field of Object.keys(base.scores)) for (const value of ['', '0', 'wrong']) {
    const query = new URLSearchParams({ [field]: value, utm_source: 'keep', minN: '4', minSum: '7' })
    const h = await componentHarness('src/components/CsatGrade.tsx', { messages: t, url: `https://toolhub.ai.kr/csat-grade/?${query}#kept`, storage: { [recordKey]: recordsRaw }, hydrated: false })
    h.render(); assert.equal(component(h, 'CsatScoreRecords').props.ready, false)
    assert.equal(h.window.location.searchParams.get(field), value)
    h.setHydrated(true)
    const current = component(h, 'CsatScoreRecords').props.current, summary = summarizeCsatRawGrades(clone(current))
    const row = h.find(node => node.props['data-csat-score-field'] === field)
    const status = value === '' ? 'missing' : value === '0' ? 'valid' : 'invalid'
    assert.equal(row.props['data-csat-score-state'], status)
    const hero = text(h.find(node => node.props['data-csat-hero-grade'] === field))
    assert.equal(hero, status === 'valid' ? '9' : t.csatGrade.rawSummary[status])
    const headline = text(h.find(node => node.props['data-csat-average'] === 'all'))
    assert.equal(h.find(node => node.type === 'ShareResult').props.card.headline, headline)
    if (summary.averages.all !== null) assert.equal(headline, `${summary.averages.all.toFixed(2)}등급`)
    assert.equal(h.window.location.searchParams.get(field), value); assert.equal(h.window.location.hash, '#kept'); assert.equal(h.window.location.searchParams.get('utm_source'), 'keep')
    assert.equal(h.stored.get(recordKey), recordsRaw)
    const cut = summary.rows.find(row => row.id === field).cut
    h.find(node => node.type === 'select' && node.props['aria-label'] === t.csatGrade.subject).props.onChange({ target: { value: cut } }); h.render()
    const highlighted = h.all().filter(node => node.type === 'tr' && node.props.className?.includes('bg-primary-soft'))
    assert.equal(highlighted.length, status === 'valid' ? 1 : 0)
    h.cleanup()
  }
})

async function nestedFixture() {
  const translations = messages('ko'), stored = new Map([[recordKey, recordsRaw], [goalKey, goalRaw([goal])]])
  let writes = 0
  const storagePort = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => { writes++; stored.set(key, value) } }
  const globals = { crypto: webcrypto }
  const parent = await componentHarness('src/components/CsatGrade.tsx', { messages: translations, globals, storagePort, url: 'https://toolhub.ai.kr/csat-grade/?kor=&eng=0&minN=3&minSum=7#kept' })
  parent.render()
  const goals = await componentHarness('src/components/CsatGoalConditions.tsx', { messages: translations, globals, storagePort, props: component(parent, 'CsatGoalConditions').props })
  goals.render(); goals.tick(0)
  const direct = await componentHarness('src/components/CsatDirectGradePanel.tsx', { messages: translations, storagePort, props: component(goals, 'CsatDirectGradePanel').props })
  direct.render()
  const sync = () => { parent.render(); goals.setProps(component(parent, 'CsatGoalConditions').props); direct.setProps(component(goals, 'CsatDirectGradePanel').props) }
  const button = (h, label) => { const node = h.button(label); assert.equal(!!node.props.disabled, false); node.props.onClick(); sync() }
  return { parent, goals, direct, stored, translations, sync, button, writes: () => writes,
    choose(field, value) { direct.find(node => node.props['data-direct-grade'] === field).props.onChange({ target: { value } }); sync() },
    setGoal(field, value) { goals.find(node => node.props.id === `csat-goal-${field}`).props.onChange({ target: { value } }); sync() },
    status() { return direct.find(node => node.props['data-direct-goal'] === goal.id).props['data-direct-status'] },
    cleanup() { direct.cleanup(); goals.cleanup(); parent.cleanup() },
  }
}

await check('Actual goal CRUD updates the same mounted direct panel without touching raw records or URL', async () => {
  const f = await nestedFixture(), t = f.translations.csatGrade
  const raw = clone(component(f.parent, 'CsatScoreRecords').props.current), url = f.parent.window.location.href
  f.button(f.direct, t.directGrades.open); f.choose('kor', '1'); f.choose('math', '2')
  assert.equal(f.status(), 'within'); assert.equal(f.writes(), 0)
  f.button(f.goals, t.goals.edit); f.setGoal('areas', '3'); f.setGoal('max', '7')
  f.button(f.goals, t.goals.update); f.button(f.goals, t.goals.confirm.updateAction); await flush(); f.sync()
  assert.equal(f.status(), 'needsInput'); assert.equal(f.direct.find(node => node.props['data-direct-grade'] === 'kor').props.value, '1')
  f.choose('eng', '2'); assert.equal(f.status(), 'within')
  f.button(f.goals, t.goals.delete); f.button(f.goals, t.goals.confirm.deleteAction); await flush(); f.sync()
  assert.equal(f.direct.all().filter(node => Object.hasOwn(node.props, 'data-direct-goal')).length, 0)
  f.setGoal('name', '새 목표'); f.setGoal('areas', '2'); f.setGoal('max', '2')
  f.button(f.goals, t.goals.save); f.button(f.goals, t.goals.confirm.saveAction); await flush(); f.sync()
  assert.equal(f.direct.find(node => Object.hasOwn(node.props, 'data-direct-goal')).props['data-direct-status'], 'over')
  assert.equal(f.direct.find(node => node.props['data-direct-grade'] === 'eng').props.value, '2')
  assert.equal(f.stored.get(recordKey), recordsRaw); assert.deepEqual(clone(component(f.parent, 'CsatScoreRecords').props.current), raw); assert.equal(f.parent.window.location.href, url)
  assert.equal(f.writes(), 3); f.cleanup()
})

await check('Conflict, refresh, corrupt storage, locale and raw-record restore preserve direct draft and separate outputs', async () => {
  const f = await nestedFixture(), t = f.translations.csatGrade
  f.button(f.direct, t.directGrades.open); f.choose('kor', '1'); f.choose('math', '2')
  const latest = goalRaw([{ ...goal, maxSum: 2 }]); f.stored.set(goalKey, latest)
  f.goals.window.dispatch('storage', { key: goalKey, newValue: latest }); f.sync()
  assert.equal(f.direct.all().filter(node => Object.hasOwn(node.props, 'data-direct-goal')).length, 0)
  assert.equal(f.direct.find(node => node.props['data-direct-grade'] === 'math').props.value, '2')
  f.button(f.goals, t.goals.refresh); assert.equal(f.status(), 'over')
  f.button(f.direct, t.directGrades.close)
  f.stored.set(goalKey, '{bad'); f.button(f.goals, t.goals.refresh)
  assert.equal(component(f.goals, 'CsatDirectGradePanel').props.blocked, true)
  f.stored.set(goalKey, latest); f.button(f.goals, t.goals.refresh)
  f.translations.csatGrade = messages('en').csatGrade; f.sync()
  f.button(f.direct, f.translations.csatGrade.directGrades.open)
  assert.equal(f.direct.find(node => node.props['data-direct-grade'] === 'kor').props.value, '1'); assert.equal(f.status(), 'over')
  const restored = clone(base); restored.scores.kor = '0'; restored.scores.math = ''
  component(f.parent, 'CsatScoreRecords').props.onRestore(restored); f.sync()
  assert.equal(f.direct.find(node => node.props['data-direct-grade'] === 'kor').props.value, '1'); assert.equal(f.status(), 'over')
  assert.equal(f.parent.window.location.searchParams.get('kor'), '0'); assert.equal(f.parent.window.location.searchParams.get('math'), '')
  assert.equal(f.stored.get(recordKey), recordsRaw); assert.equal(f.writes(), 0)
  assert.ok(!f.parent.window.location.searchParams.has('directGrades')); f.cleanup()
})

console.log(`Independent CSAT direct/raw verification: ${groups} groups passed`)
