import assert from 'node:assert/strict'
import { gradeOf, cutsFor } from '../src/utils/csatGrade.ts'
import type { CsatScoreSnapshot } from '../src/utils/csatScoreRecords.ts'
import { evaluateCsatGoal } from '../src/utils/csatGoals.ts'
import {
  DEFAULT_MIN_RULE, evaluateMinimum, areaGrades, isValidRule, ruleExtrasToQuery, ruleExtrasFromQuery, type MinimumRule,
} from '../src/utils/csatMinimum.ts'

const snap = (scores: Partial<CsatScoreSnapshot['scores']> = {}, selection: Partial<CsatScoreSnapshot['selection']> = {}): CsatScoreSnapshot => ({
  examYear: 2027, referenceYear: 2026,
  scores: { kor: '84', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41', ...scores },
  selection: { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics', ...selection },
})
const set = cutsFor(2026)
const s = snap()
const g = { kor: gradeOf('korLm', 84, set), math: gradeOf('mathProb', 80, set), eng: 2, inq1: gradeOf('society', 44, set), inq2: gradeOf('ethics', 41, set) }
const rule = (r: Partial<MinimumRule>): MinimumRule => ({ ...DEFAULT_MIN_RULE, ...r })

// 기본 규칙 = 기존 수능최저 계산(evaluateCsatGoal)과 같은 합
for (const areas of [2, 3, 4]) for (const maxSum of [areas, 7, areas * 9]) {
  const a = evaluateMinimum(s, rule({ areas, maxSum }))
  const b = evaluateCsatGoal(s, { areas, maxSum })
  assert.equal(a.sum, b.sum, `기본 ${areas}합 합계`)
  assert.equal(a.status, b.status, `기본 ${areas}합 상태 (상한 ${maxSum})`)
}

// 탐구 평균 방식
const avg = (g.inq1 + g.inq2) / 2
assert.equal(areaGrades(s, 'top1').inq!.grade, Math.min(g.inq1, g.inq2))
assert.equal(areaGrades(s, 'avg').inq!.grade, avg)
assert.equal(areaGrades(s, 'avgFloor').inq!.grade, Math.floor(avg))
assert.equal(areaGrades(s, 'avgRound').inq!.grade, Math.round(avg))
const odd = snap({ inq1: '50', inq2: '44' }) // 2026 사회문화 50=1등급, 생윤 44 → 2등급대
const oi = areaGrades(odd, 'avg').inq!.grade
if (!Number.isInteger(oi)) {
  assert.equal(areaGrades(odd, 'avgFloor').inq!.grade, Math.floor(oi), '평균 절사')
  assert.equal(areaGrades(odd, 'avgRound').inq!.grade, Math.round(oi), '평균 반올림')
}
// 탐구 1과목만 있으면 평균 방식은 입력 필요
assert.equal(areaGrades(snap({ inq2: '' }), 'avg').inq, undefined)
assert.equal(areaGrades(snap({ inq2: '' }), 'top1').inq!.grade, g.inq1)
// 같은 과목 두 칸은 한 과목 → 평균 불가
assert.equal(areaGrades(snap({ inq2: '44' }, { inq2: 'society' }), 'avg').inq, undefined)

// 필수 영역: 수학 필수 3합
const req = evaluateMinimum(s, rule({ areas: 3, maxSum: 27, required: ['math'] }))
assert.ok(req.used.some(a => a.id === 'math'), '필수 수학 포함')
assert.equal(req.used.length, 3)
// 반영 영역에서 영어 제외(국수탐 중 2합)
const noEng = evaluateMinimum(s, rule({ areas: 2, maxSum: 18, pool: ['kor', 'math', 'inq'] }))
assert.ok(!noEng.used.some(a => a.id === 'eng'), '영어 제외')
assert.equal(noEng.sum, [g.kor, g.math, Math.min(g.inq1, g.inq2)].sort((a, b) => a - b).slice(0, 2).reduce((x, y) => x + y, 0))
// 필수 영역이 비면 입력 필요
assert.equal(evaluateMinimum(snap({ math: '' }), rule({ required: ['math'], maxSum: 27 })).status, 'needsInput')

// 한국사 기준: 42점 = 1등급
const h1 = evaluateMinimum(s, rule({ areas: 4, maxSum: 36, hist: 1 }))
assert.deepEqual(h1.hist, { max: 1, grade: 1, ok: true })
assert.equal(h1.status, 'within')
const h2 = evaluateMinimum(snap({ hist: '20' }), rule({ areas: 4, maxSum: 36, hist: 4 }))
assert.equal(h2.hist!.ok, false)
assert.equal(h2.status, 'over', '합은 충족해도 한국사 미달이면 미충족')
assert.equal(evaluateMinimum(snap({ hist: '' }), rule({ areas: 4, maxSum: 36, hist: 4 })).status, 'needsInput')

// 잘못된 규칙
assert.equal(isValidRule(rule({ pool: ['kor', 'math'], areas: 3, maxSum: 9 })), false, '영역 수 > 반영 영역')
assert.equal(isValidRule(rule({ required: ['eng'], pool: ['kor', 'math', 'inq'] })), false, '필수 ⊄ 반영')
assert.equal(evaluateMinimum(s, rule({ areas: 3, maxSum: 2 })).status, 'invalidCondition')

// URL: 기본값은 키 없음, 왕복
assert.deepEqual(ruleExtrasToQuery(DEFAULT_MIN_RULE), { minInq: null, minPool: null, minReq: null, minHist: null })
const custom = rule({ inq: 'avgFloor', pool: ['kor', 'math', 'inq'], required: ['math'], hist: 4 })
const q = ruleExtrasToQuery(custom)
assert.deepEqual(q, { minInq: 'avgFloor', minPool: 'kmi', minReq: 'm', minHist: '4' })
assert.deepEqual(ruleExtrasFromQuery(k => q[k] ?? null), { inq: 'avgFloor', pool: ['kor', 'math', 'inq'], required: ['math'], hist: 4 })
assert.deepEqual(ruleExtrasFromQuery(() => 'zz'), { inq: 'top1', pool: DEFAULT_MIN_RULE.pool, required: [], hist: null }, '잘못된 값은 기본')

console.log('csat-minimum ok')
