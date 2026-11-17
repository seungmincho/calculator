import assert from 'node:assert/strict'
import { CUTS, INQ_SOC, INQ_SCI, gradeOf, bestSum } from '../src/utils/csatGrade.ts'
import { evaluateCsatGoal } from '../src/utils/csatGoals.ts'
import { evaluateCsatGradeAreas } from '../src/utils/csatGradeGoalEvaluation.ts'
import { emptyCsatDirectGrades, evaluateCsatDirectGoal, isCsatDirectGrade } from '../src/utils/csatDirectGrades.ts'
import { summarizeCsatRawGrades } from '../src/utils/csatGradeSummary.ts'
import type { CsatScoreSnapshot } from '../src/utils/csatScoreRecords.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log(`PASS ${name}`) }
const condition = { areas: 4, maxSum: 9 }
const snapshot = (): CsatScoreSnapshot => ({ examYear: 2027, referenceYear: 2026, scores: { kor: '84', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41' }, selection: { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics' } })

check('Direct grades accept only one-character grades 1–9 and never treat missing as grade 9', () => {
  for (let grade = 1; grade <= 9; grade++) assert.equal(isCsatDirectGrade(String(grade)), true)
  for (const value of ['', '0', '10', '1.0', '1e0', '01', ' 1', '1 ', '-1', 'NaN', 'Infinity', 1, null]) assert.equal(isCsatDirectGrade(value), false)
  const result = evaluateCsatDirectGoal(emptyCsatDirectGrades(), condition)
  assert.equal(result.status, 'needsInput'); assert.equal(result.sum, null); assert.equal(result.available.length, 0)
})
check('Partial input can meet a two-area goal but cannot fabricate a three- or four-area sum', () => {
  const input = emptyCsatDirectGrades(); input.grades.kor = '1'; input.grades.eng = '2'
  assert.equal(evaluateCsatDirectGoal(input, { areas: 2, maxSum: 3 }).status, 'within')
  assert.equal(evaluateCsatDirectGoal(input, { areas: 2, maxSum: 2 }).over, 1)
  for (const areas of [3, 4]) { const result = evaluateCsatDirectGoal(input, { areas, maxSum: areas * 9 }); assert.equal(result.sum, null); assert.equal(result.status, 'needsInput') }
  assert.deepEqual(evaluateCsatDirectGoal(input, { areas: 2, maxSum: 3 }).used.map(area => area.subject), ['kor', 'eng'])
})
check('Inquiry needs an allowed subject, excludes invalid grades, and identifies one valid subject', () => {
  const input = emptyCsatDirectGrades(); input.grades.inq1 = '2'
  assert.deepEqual(evaluateCsatDirectGoal(input, condition).missingSubjects, ['inq1'])
  input.inquiry.inq1 = 'english'
  assert.equal(evaluateCsatDirectGoal(input, condition).available.length, 0)
  for (const subject of [...INQ_SOC, ...INQ_SCI]) {
    input.inquiry.inq1 = subject
    assert.equal(evaluateCsatDirectGoal(input, condition).singleInquiry?.subject, subject)
  }
  input.grades.inq1 = '2.1'; assert.deepEqual(evaluateCsatDirectGoal(input, condition).invalidFields, ['inq1'])
})
check('Inquiry duplicates agree as one area, conflict as no area, and ties retain the first actual subject', () => {
  const input = emptyCsatDirectGrades(); input.grades.inq1 = '2'; input.grades.inq2 = '2'; input.inquiry = { inq1: 'society', inq2: 'society' }
  let result = evaluateCsatDirectGoal(input, condition)
  assert.equal(result.available.length, 1); assert.equal(result.duplicateInquiry, true); assert.equal(result.singleInquiry?.field, 'inq1')
  input.grades.inq2 = '3'; result = evaluateCsatDirectGoal(input, condition)
  assert.equal(result.inquiryConflict, true); assert.equal(result.available.length, 0)
  input.inquiry.inq2 = 'ethics'; input.grades.inq2 = '2'; result = evaluateCsatDirectGoal(input, condition)
  assert.equal(result.available[0].subject, 'society'); assert.equal(result.available.length, 1)
  input.grades.inq2 = '1'; assert.equal(evaluateCsatDirectGoal(input, condition).available[0].subject, 'ethics')
})
check('Invalid conditions never produce a sum and grade aggregation preserves original metadata without mutation', () => {
  const areas = [{ id: 'kor', grade: 2, label: 'Korean' }, { id: 'math', grade: 1, label: 'Math' }]
  const before = JSON.stringify(areas)
  const result = evaluateCsatGradeAreas(areas, { areas: 2, maxSum: 3 })
  assert.equal(result.used[0], areas[1]); assert.equal(result.used[0].label, 'Math'); assert.equal(JSON.stringify(areas), before)
  for (const value of [{ areas: 1, maxSum: 4 }, { areas: 4, maxSum: 3 }, { areas: 4, maxSum: 37 }, { areas: 3, maxSum: 3.5 }, { areas: NaN, maxSum: 9 }]) assert.equal(evaluateCsatGradeAreas(areas, value).status, 'invalidCondition')
})
check('Every four-area grade combination matches the existing bestSum for 2/3/4 areas', () => {
  for (let kor = 1; kor <= 9; kor++) for (let math = 1; math <= 9; math++) for (let eng = 1; eng <= 9; eng++) for (let inq = 1; inq <= 9; inq++) {
    const areas = [{ id: 'kor', grade: kor }, { id: 'math', grade: math }, { id: 'eng', grade: eng }, { id: 'inq', grade: inq }]
    for (const count of [2, 3, 4]) assert.equal(evaluateCsatGradeAreas(areas, { areas: count, maxSum: 9 }).sum, bestSum({ kor, math, eng, hist: 9, inq1: inq, inq2: inq }, count))
  }
})
check('Raw and direct adapters match sums/status/used fields at actual subject cut boundaries', () => {
  for (const subject of [...INQ_SOC, ...INQ_SCI]) for (const cut of CUTS[subject].cuts) {
    const raw = snapshot(); raw.selection.inq1 = subject; raw.selection.inq2 = subject; raw.scores.inq1 = String(cut.raw); raw.scores.inq2 = String(cut.raw)
    const input = emptyCsatDirectGrades()
    input.grades = { kor: String(gradeOf('korLm', 84)), math: String(gradeOf('mathProb', 80)), eng: String(gradeOf('english', 85)), inq1: String(cut.grade), inq2: String(cut.grade) }
    input.inquiry = { inq1: subject, inq2: subject }
    for (const areas of [2, 3, 4]) {
      const target = { areas, maxSum: areas * 2 }, actual = evaluateCsatGoal(raw, target), direct = evaluateCsatDirectGoal(input, target)
      assert.equal(direct.sum, actual.sum); assert.equal(direct.status, actual.status); assert.deepEqual(direct.used.map(area => area.field), actual.used.map(area => area.field))
    }
  }
})
check('Complete raw inputs retain existing grades and average numbers', () => {
  const result = summarizeCsatRawGrades(snapshot())
  assert.deepEqual(result.rows.map(row => row.grade), [2, 3, 2, 1, 1, 3])
  assert.deepEqual(result.averages, { all: 2.25, noEng: 2.33 })
})
check('Raw empty and invalid inputs have no grade, estimates or next-cut claims, while actual zero is valid', () => {
  for (const value of ['', ' ', '-1', '101', '1.5', '1e1', 'NaN']) {
    const raw = snapshot(); raw.scores.kor = value
    const result = summarizeCsatRawGrades(raw), row = result.rows[0]
    assert.equal(row.status, value === '' ? 'missing' : 'invalid'); assert.equal(row.grade, null); assert.equal(row.est, null); assert.equal(row.next, null)
    assert.deepEqual(result.averages, { all: null, noEng: null })
  }
  for (const value of ['0', '00', '000']) { const raw = snapshot(); raw.scores.kor = value; const row = summarizeCsatRawGrades(raw).rows[0]; assert.equal(row.status, 'valid'); assert.equal(row.score, 0); assert.equal(row.grade, 9) }
})
check('Missing Korean history blocks neither average; missing or invalid English blocks only the full average', () => {
  const raw = snapshot(); raw.scores.hist = ''
  assert.deepEqual(summarizeCsatRawGrades(raw).averages, { all: 2.25, noEng: 2.33 })
  for (const value of ['', '-1', '101']) { raw.scores.eng = value; assert.deepEqual(summarizeCsatRawGrades(raw).averages, { all: null, noEng: 2.33 }) }
})
check('Both inquiry slots are required for averages, and duplicate conflicting raw scores block even equal grades', () => {
  const raw = snapshot(); raw.scores.inq2 = ''
  assert.deepEqual(summarizeCsatRawGrades(raw).averages, { all: null, noEng: null })
  raw.selection.inq2 = 'society'; raw.scores.inq2 = '45'
  let result = summarizeCsatRawGrades(raw)
  assert.equal(result.rows[4].grade, result.rows[5].grade); assert.equal(result.inquiryConflict, true); assert.deepEqual(result.averages, { all: null, noEng: null })
  raw.scores.inq2 = '44'; result = summarizeCsatRawGrades(raw)
  assert.equal(result.duplicateInquiry, true); assert.equal(result.inquiryConflict, false); assert.deepEqual(result.averages, { all: 2, noEng: 2 })
})
console.log(`${groups} direct-grade and raw-summary groups passed`)
